import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../db.js';
import { isSimDetailsCategoryName, validateSimDetailsInput, validateDeliveryContact } from '../simDetails.js';

export const apiV2Router = Router();

// Standard SMM Panel API v2 handler (supports both GET and POST)
async function handleSmmApi(req: Request, res: Response) {
  const params = { ...req.query, ...req.body };
  const key = (params.key || '').trim();
  const action = (params.action || '').trim().toLowerCase();

  // Log incoming request (never store raw CNIC/mobile/contact values if redacted)
  const logApi = (statusCode: number, responsePayload: any, userId?: number, redactLink = false) => {
    try {
      const safeParams = redactLink
        ? {
            ...params,
            ...(params.link ? { link: '***REDACTED***' } : {}),
            ...(params.delivery_contact ? { delivery_contact: '***REDACTED***' } : {})
          }
        : params;
      db.prepare(`
        INSERT INTO api_logs (user_id, action, request_payload, response_payload, status_code, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        userId || null,
        action || 'unknown',
        JSON.stringify(safeParams),
        JSON.stringify(responsePayload),
        statusCode,
        new Date().toISOString()
      );
    } catch {
      // quiet log error
    }
  };

  if (!key) {
    const errorResp = { error: 'API key is missing or invalid' };
    logApi(400, errorResp);
    return res.status(400).json(errorResp);
  }

  // Lookup user by API key
  const user = db.prepare(`
    SELECT id, email, username, balance, spent, status
    FROM users
    WHERE api_key = ?
  `).get(key) as any;

  if (!user || user.status !== 'active') {
    const errorResp = { error: 'Invalid API key or account is suspended' };
    logApi(403, errorResp);
    return res.status(403).json(errorResp);
  }

  // 1. ACTION: services
  if (action === 'services') {
    const services = db.prepare(`
      SELECT s.id as service, s.name, s.type, c.name as category, s.rate_per_1000 as rate,
             s.min_quantity as min, s.max_quantity as max, s.refill_supported as refill, s.cancel_supported as cancel
      FROM services s
      JOIN categories c ON s.category_id = c.id
      WHERE s.status = 'active'
      ORDER BY c.sort_order ASC, s.id ASC
    `).all() as any[];

    const formatted = services.map(s => ({
      service: s.service,
      name: s.name,
      type: s.type || 'Default',
      category: s.category,
      rate: s.rate.toFixed(2),
      min: String(s.min),
      max: String(s.max),
      refill: Boolean(s.refill),
      cancel: Boolean(s.cancel)
    }));

    logApi(200, { count: formatted.length }, user.id);
    return res.json(formatted);
  }

  // 2. ACTION: balance
  if (action === 'balance') {
    const resp = {
      balance: user.balance.toFixed(2),
      currency: 'PKR'
    };
    logApi(200, resp, user.id);
    return res.json(resp);
  }

  // 3. ACTION: add
  if (action === 'add') {
    const serviceId = parseInt(params.service, 10);
    const link = (params.link || '').trim();
    const quantity = parseInt(params.quantity, 10);

    if (!serviceId || !link || !quantity || isNaN(quantity) || quantity <= 0) {
      const errorResp = { error: 'Missing or invalid parameters (service, link, quantity required)' };
      logApi(400, errorResp, user.id);
      return res.status(400).json(errorResp);
    }

    const service = db.prepare(`
      SELECT s.id, s.name, s.rate_per_1000, s.min_quantity, s.max_quantity, s.status, c.name as category_name
      FROM services s
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE s.id = ? AND s.status = 'active'
    `).get(serviceId) as any;

    if (!service) {
      const errorResp = { error: 'Service not found or currently inactive' };
      logApi(404, errorResp, user.id);
      return res.status(404).json(errorResp);
    }

    const isSimDetails = isSimDetailsCategoryName(service.category_name);
    let finalTargetInput = link;
    let finalDeliveryContact: string | null = null;
    let finalQuantity = quantity;
    let charge = 0;

    if (isSimDetails) {
      const simCheck = validateSimDetailsInput(link);
      if (!simCheck.valid) {
        const errorResp = { error: simCheck.error };
        logApi(400, errorResp, user.id, true);
        return res.status(400).json(errorResp);
      }
      finalTargetInput = simCheck.normalized;

      if (params.delivery_contact) {
        const deliveryCheck = validateDeliveryContact(String(params.delivery_contact));
        if (!deliveryCheck.valid) {
          const errorResp = { error: deliveryCheck.error };
          logApi(400, errorResp, user.id, true);
          return res.status(400).json(errorResp);
        }
        finalDeliveryContact = deliveryCheck.normalized;
      }

      finalQuantity = 1;
      charge = parseFloat(Number(service.rate_per_1000).toFixed(2));
    } else {
      if (quantity < service.min_quantity || quantity > service.max_quantity) {
        const errorResp = {
          error: `Quantity must be between ${service.min_quantity} and ${service.max_quantity}`
        };
        logApi(400, errorResp, user.id, isSimDetails);
        return res.status(400).json(errorResp);
      }

      charge = parseFloat(((quantity / 1000) * service.rate_per_1000).toFixed(2));
    }

    if (user.balance < charge) {
      const errorResp = {
        error: `Insufficient balance. Required: ${charge} PKR, Available: ${user.balance.toFixed(2)} PKR`
      };
      logApi(400, errorResp, user.id, isSimDetails);
      return res.status(400).json(errorResp);
    }

    const now = new Date().toISOString();

    // Atomic transactional order creation and balance deduction
    db.exec('BEGIN IMMEDIATE TRANSACTION');
    try {
      const deductRes = db.prepare(`
        UPDATE users
        SET balance = ROUND(balance - ?, 2),
            spent = ROUND(spent + ?, 2)
        WHERE id = ? AND balance >= ?
      `).run(charge, charge, user.id, charge);

      if (deductRes.changes !== 1) {
        db.exec('ROLLBACK');
        const errorResp = { error: `Insufficient balance. Required: ${charge} PKR` };
        logApi(400, errorResp, user.id, isSimDetails);
        return res.status(400).json(errorResp);
      }

      const freshUser = db.prepare('SELECT balance FROM users WHERE id = ?').get(user.id) as any;
      const newBalance = freshUser.balance;

      const orderResult = db.prepare(`
        INSERT INTO orders (user_id, service_id, link, delivery_contact, quantity, charge, start_count, remains, status, mode, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'Pending', 'Auto', ?, ?)
      `).run(user.id, service.id, finalTargetInput, finalDeliveryContact, finalQuantity, charge, finalQuantity, now, now);

      const orderId = orderResult.lastInsertRowid;

      db.prepare(`
        INSERT INTO transactions (user_id, type, amount, balance_after, description, reference_id, created_at)
        VALUES (?, 'order', ?, ?, ?, ?, ?)
      `).run(user.id, -charge, newBalance, `API Order #${orderId} - ${service.name}`, `ORD-${orderId}`, now);

      db.exec('COMMIT');

      const successResp = { order: Number(orderId) };
      logApi(200, successResp, user.id, isSimDetails);
      return res.json(successResp);
    } catch (err: any) {
      try { db.exec('ROLLBACK'); } catch {}
      const errorResp = { error: 'Failed to create order: ' + err.message };
      logApi(500, errorResp, user.id, isSimDetails);
      return res.status(500).json(errorResp);
    }
  }

  // 4. ACTION: status
  if (action === 'status') {
    if (params.orders) {
      // Multiple orders status
      const orderIds = String(params.orders)
        .split(',')
        .map(id => parseInt(id.trim(), 10))
        .filter(Boolean);

      if (orderIds.length === 0) {
        return res.status(400).json({ error: 'Incorrect order ID' });
      }

      const placeholders = orderIds.map(() => '?').join(',');
      const rows = db.prepare(`
        SELECT id, charge, start_count, status, remains
        FROM orders
        WHERE id IN (${placeholders}) AND user_id = ?
      `).all(...orderIds, user.id) as any[];

      const result: Record<string, any> = {};
      for (const id of orderIds) {
        const found = rows.find(r => r.id === id);
        if (found) {
          result[String(id)] = {
            charge: found.charge.toFixed(2),
            start_count: String(found.start_count),
            status: found.status,
            remains: String(found.remains),
            currency: 'PKR'
          };
        } else {
          result[String(id)] = { error: 'Incorrect order ID' };
        }
      }

      logApi(200, result, user.id);
      return res.json(result);
    }

    const orderId = parseInt(params.order, 10);
    if (!orderId) {
      const errorResp = { error: 'Order ID is required' };
      logApi(400, errorResp, user.id);
      return res.status(400).json(errorResp);
    }

    const order = db.prepare(`
      SELECT charge, start_count, status, remains
      FROM orders
      WHERE id = ? AND user_id = ?
    `).get(orderId, user.id) as any;

    if (!order) {
      const errorResp = { error: 'Order not found' };
      logApi(404, errorResp, user.id);
      return res.status(404).json(errorResp);
    }

    const resp = {
      charge: order.charge.toFixed(2),
      start_count: String(order.start_count),
      status: order.status,
      remains: String(order.remains),
      currency: 'PKR'
    };
    logApi(200, resp, user.id);
    return res.json(resp);
  }

  // 5. ACTION: refill
  if (action === 'refill') {
    const orderId = parseInt(params.order, 10);
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    const order = db.prepare(`
      SELECT o.id, o.status, s.refill_supported
      FROM orders o
      JOIN services s ON o.service_id = s.id
      WHERE o.id = ? AND o.user_id = ?
    `).get(orderId, user.id) as any;

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!order.refill_supported) {
      return res.status(400).json({ error: 'Refill not supported for this service' });
    }

    db.prepare(`
      UPDATE orders
      SET refill_status = 'Requested', updated_at = ?
      WHERE id = ?
    `).run(new Date().toISOString(), orderId);

    const resp = { refill: orderId };
    logApi(200, resp, user.id);
    return res.json(resp);
  }

  // 6. ACTION: refill_status
  if (action === 'refill_status') {
    const refillId = parseInt(params.refill, 10);
    if (!refillId) {
      return res.status(400).json({ error: 'Refill ID is required' });
    }

    const order = db.prepare(`
      SELECT refill_status
      FROM orders
      WHERE id = ? AND user_id = ?
    `).get(refillId, user.id) as any;

    if (!order) {
      return res.status(404).json({ error: 'Refill ID not found' });
    }

    const resp = { status: order.refill_status || 'Completed' };
    logApi(200, resp, user.id);
    return res.json(resp);
  }

  // 7. ACTION: cancel
  if (action === 'cancel') {
    const orderIds = String(params.orders || params.order)
      .split(',')
      .map(id => parseInt(id.trim(), 10))
      .filter(Boolean);

    const result = orderIds.map(id => ({ order: id, cancel: { error: 'Cancel request sent to server' } }));
    logApi(200, result, user.id);
    return res.json(result);
  }

  const badAction = { error: 'Unknown action specified. Supported actions: services, add, status, refill, refill_status, cancel, balance' };
  logApi(400, badAction, user.id);
  return res.status(400).json(badAction);
}

apiV2Router.get('/', handleSmmApi);
apiV2Router.post('/', handleSmmApi);
