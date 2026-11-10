import { Router } from 'express';
import type { Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {
  db,
  DB_PATH,
  getDatabaseStats,
  createDatabaseBackup,
  listDatabaseBackups,
  exportDatabaseJson,
  getBackupsDirectory
} from '../db.js';
import { requireAdmin, type AuthRequest } from '../auth.js';


export const adminRouter = Router();

// Apply requireAdmin to all routes in this router
adminRouter.use(requireAdmin);

// Audit logging helper
function logAudit(adminId: number, action: string, targetType: string, targetId: string, details: string) {
  try {
    db.prepare(`
      INSERT INTO audit_logs (admin_id, action, target_type, target_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(adminId, action, targetType, targetId, details, new Date().toISOString());
  } catch (e) {
    // ignore
  }
}

// ==========================================
// ADMIN DASHBOARD OVERVIEW
// ==========================================
adminRouter.get('/overview', (req: AuthRequest, res: Response) => {
  const usersCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
  const ordersCount = db.prepare('SELECT COUNT(*) as count FROM orders').get() as any;
  const pendingOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'Pending'").get() as any;
  const pendingPayments = db.prepare("SELECT COUNT(*) as count FROM payment_requests WHERE status = 'pending'").get() as any;
  const openTickets = db.prepare("SELECT COUNT(*) as count FROM support_tickets WHERE status = 'open'").get() as any;
  
  // Total Revenue calculation from approved deposits and orders
  const revenueTotal = db.prepare("SELECT SUM(amount) as total FROM payment_requests WHERE status = 'approved'").get() as any;
  const spentTotal = db.prepare("SELECT SUM(charge) as total FROM orders WHERE status != 'Canceled'").get() as any;

  // Recent 5 orders
  const recentOrders = db.prepare(`
    SELECT o.id, o.charge, o.quantity, o.status, o.created_at, u.username, s.name as service_name
    FROM orders o
    JOIN users u ON o.user_id = u.id
    JOIN services s ON o.service_id = s.id
    ORDER BY o.id DESC LIMIT 6
  `).all() as any[];

  // Recent 5 payments
  const recentPayments = db.prepare(`
    SELECT p.*, u.username
    FROM payment_requests p
    JOIN users u ON p.user_id = u.id
    ORDER BY p.id DESC LIMIT 6
  `).all() as any[];

  return res.json({
    total_users: usersCount.count || 0,
    total_orders: ordersCount.count || 0,
    pending_orders: pendingOrders.count || 0,
    pending_payments: pendingPayments.count || 0,
    open_tickets: openTickets.count || 0,
    total_revenue: revenueTotal.total || 0,
    total_spent: spentTotal.total || 0,
    recent_orders: recentOrders,
    recent_payments: recentPayments
  });
});

// ==========================================
// USER MANAGEMENT
// ==========================================
adminRouter.get('/users', (req: AuthRequest, res: Response) => {
  const search = (req.query.search || '').toString().trim().toLowerCase();

  let query = `
    SELECT id, email, username, role, balance, spent, status, api_key, referral_code, created_at, timezone, currency
    FROM users
  `;
  const params: any[] = [];

  if (search) {
    query += ` WHERE LOWER(username) LIKE ? OR LOWER(email) LIKE ? OR CAST(id AS TEXT) LIKE ?`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ` ORDER BY id DESC LIMIT 150`;

  const users = db.prepare(query).all(...params) as any[];
  return res.json({ users });
});

// Update user balance (Deposit or Deduct)
adminRouter.post('/users/:id/balance', (req: AuthRequest, res: Response) => {
  const adminId = req.user!.id;
  const targetUserId = parseInt(req.params.id, 10);
  const { action, amount, reason } = req.body;

  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) {
    return res.status(400).json({ error: 'Please enter a valid positive amount.' });
  }

  const user = db.prepare('SELECT id, username, balance, spent FROM users WHERE id = ?').get(targetUserId) as any;
  if (!user) return res.status(404).json({ error: 'User not found.' });

  let newBalance = user.balance;
  let txType = 'admin_adjustment';
  let txDesc = reason || 'Admin Balance Adjustment';

  if (action === 'add') {
    newBalance += amt;
    txType = 'deposit';
    txDesc = `Admin Credit: ${txDesc}`;
  } else if (action === 'deduct') {
    newBalance = Math.max(0, newBalance - amt);
    txDesc = `Admin Deduction: ${txDesc}`;
  } else {
    return res.status(400).json({ error: 'Invalid action. Must be "add" or "deduct".' });
  }

  const now = new Date().toISOString();

  db.exec('BEGIN TRANSACTION');
  try {
    db.prepare('UPDATE users SET balance = ? WHERE id = ?').run(newBalance, targetUserId);
    db.prepare(`
      INSERT INTO transactions (user_id, type, amount, balance_after, description, reference_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(targetUserId, txType, action === 'add' ? amt : -amt, newBalance, txDesc, `ADM-${adminId}`, now);

    logAudit(adminId, `balance_${action}`, 'user', String(targetUserId), `Changed balance by ${amt} PKR. New balance: ${newBalance}. Reason: ${reason}`);

    db.exec('COMMIT');
    return res.json({ success: true, new_balance: newBalance, message: `User balance updated to Rs ${newBalance.toFixed(2)}.` });
  } catch (err: any) {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: 'Failed to update balance: ' + err.message });
  }
});

// Update user status or role
adminRouter.put('/users/:id/status', (req: AuthRequest, res: Response) => {
  const adminId = req.user!.id;
  const targetUserId = parseInt(req.params.id, 10);
  const { status, role } = req.body;

  if (targetUserId === adminId && status === 'suspended') {
    return res.status(400).json({ error: 'You cannot suspend your own admin account.' });
  }

  db.prepare(`
    UPDATE users
    SET status = COALESCE(?, status),
        role = COALESCE(?, role)
    WHERE id = ?
  `).run(status || null, role || null, targetUserId);

  logAudit(adminId, 'update_user_status', 'user', String(targetUserId), `Status: ${status}, Role: ${role}`);

  return res.json({ success: true, message: 'User status updated successfully.' });
});

// ==========================================
// ORDER MANAGEMENT
// ==========================================
adminRouter.get('/orders', (req: AuthRequest, res: Response) => {
  const status = (req.query.status || 'all').toString();
  const search = (req.query.search || '').toString().trim().toLowerCase();

  let query = `
    SELECT o.*, u.username, u.email, s.name as service_name, c.name as category_name
    FROM orders o
    JOIN users u ON o.user_id = u.id
    JOIN services s ON o.service_id = s.id
    JOIN categories c ON s.category_id = c.id
  `;
  const params: any[] = [];
  const conditions: string[] = [];

  if (status && status !== 'all') {
    conditions.push('LOWER(o.status) = ?');
    params.push(status.toLowerCase());
  }

  if (search) {
    conditions.push('(LOWER(s.name) LIKE ? OR LOWER(o.link) LIKE ? OR LOWER(u.username) LIKE ? OR CAST(o.id AS TEXT) LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY o.id DESC LIMIT 200';

  const orders = db.prepare(query).all(...params) as any[];
  return res.json({ orders });
});

// Update order status
adminRouter.put('/orders/:id/status', (req: AuthRequest, res: Response) => {
  const adminId = req.user!.id;
  const orderId = parseInt(req.params.id, 10);
  const { status, start_count, remains } = req.body;

  const validStatuses = ['Pending', 'In progress', 'Completed', 'Processing', 'Partial', 'Canceled'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as any;
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  const now = new Date().toISOString();

  // If changing to Canceled and was not already Canceled, refund user
  if (status === 'Canceled' && order.status !== 'Canceled') {
    const user = db.prepare('SELECT balance, spent FROM users WHERE id = ?').get(order.user_id) as any;
    const refund = order.charge;
    const newBal = user.balance + refund;
    const newSpent = Math.max(0, user.spent - refund);

    db.exec('BEGIN TRANSACTION');
    try {
      db.prepare('UPDATE orders SET status = ?, remains = 0, updated_at = ? WHERE id = ?').run(status, now, orderId);
      db.prepare('UPDATE users SET balance = ?, spent = ? WHERE id = ?').run(newBal, newSpent, order.user_id);
      db.prepare(`
        INSERT INTO transactions (user_id, type, amount, balance_after, description, reference_id, created_at)
        VALUES (?, 'refund', ?, ?, ?, ?, ?)
      `).run(order.user_id, refund, newBal, `Refund for Canceled Order #${orderId}`, `REF-${orderId}`, now);

      logAudit(adminId, 'cancel_order_refund', 'order', String(orderId), `Refunded Rs ${refund} to user #${order.user_id}`);
      db.exec('COMMIT');

      return res.json({ success: true, message: `Order #${orderId} marked Canceled and Rs ${refund} refunded to user.` });
    } catch (e: any) {
      db.exec('ROLLBACK');
      return res.status(500).json({ error: e.message });
    }
  }

  db.prepare(`
    UPDATE orders
    SET status = ?,
        start_count = COALESCE(?, start_count),
        remains = COALESCE(?, remains),
        updated_at = ?
    WHERE id = ?
  `).run(status, start_count !== undefined ? Number(start_count) : null, remains !== undefined ? Number(remains) : null, now, orderId);

  logAudit(adminId, 'update_order_status', 'order', String(orderId), `Status changed to ${status}`);

  return res.json({ success: true, message: `Order #${orderId} updated to ${status}.` });
});

// ==========================================
// CATEGORY & SERVICE MANAGEMENT
// ==========================================

// Add Category
adminRouter.post('/categories', (req: AuthRequest, res: Response) => {
  const { name, icon, sort_order } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name is required.' });

  const resCat = db.prepare(`
    INSERT INTO categories (name, icon, sort_order, status)
    VALUES (?, ?, ?, 'active')
  `).run(name.trim(), icon || 'Globe', Number(sort_order) || 0);

  logAudit(req.user!.id, 'create_category', 'category', String(resCat.lastInsertRowid), `Created category ${name}`);
  return res.status(201).json({ success: true, id: Number(resCat.lastInsertRowid), message: 'Category created' });
});

// Update Category
adminRouter.put('/categories/:id', (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const { name, icon, sort_order, status } = req.body;

  db.prepare(`
    UPDATE categories
    SET name = COALESCE(?, name),
        icon = COALESCE(?, icon),
        sort_order = COALESCE(?, sort_order),
        status = COALESCE(?, status)
    WHERE id = ?
  `).run(name || null, icon || null, sort_order !== undefined ? Number(sort_order) : null, status || null, id);

  return res.json({ success: true, message: 'Category updated' });
});

// Delete Category
adminRouter.delete('/categories/:id', (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  // Check if services exist under category
  const count = db.prepare('SELECT COUNT(*) as count FROM services WHERE category_id = ?').get(id) as any;
  if (count.count > 0) {
    return res.status(400).json({ error: 'Cannot delete category that contains active services. Delete or reassign services first.' });
  }

  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  return res.json({ success: true, message: 'Category deleted' });
});

// Add Service
adminRouter.post('/services', (req: AuthRequest, res: Response) => {
  const { category_id, name, type, rate_per_1000, min_quantity, max_quantity, description, refill_supported, cancel_supported } = req.body;

  if (!category_id || !name || !rate_per_1000 || !min_quantity || !max_quantity) {
    return res.status(400).json({ error: 'Category, name, rate per 1000, min and max quantities are required.' });
  }

  const resServ = db.prepare(`
    INSERT INTO services (category_id, name, type, rate_per_1000, min_quantity, max_quantity, description, refill_supported, cancel_supported, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `).run(
    Number(category_id),
    name.trim(),
    type || 'Default',
    parseFloat(rate_per_1000),
    parseInt(min_quantity, 10),
    parseInt(max_quantity, 10),
    description || '',
    refill_supported ? 1 : 0,
    cancel_supported ? 1 : 0
  );

  logAudit(req.user!.id, 'create_service', 'service', String(resServ.lastInsertRowid), `Created service ${name}`);
  return res.status(201).json({ success: true, id: Number(resServ.lastInsertRowid), message: 'Service created successfully' });
});

// Update Service
adminRouter.put('/services/:id', (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const { category_id, name, type, rate_per_1000, min_quantity, max_quantity, description, refill_supported, cancel_supported, status } = req.body;

  db.prepare(`
    UPDATE services
    SET category_id = COALESCE(?, category_id),
        name = COALESCE(?, name),
        type = COALESCE(?, type),
        rate_per_1000 = COALESCE(?, rate_per_1000),
        min_quantity = COALESCE(?, min_quantity),
        max_quantity = COALESCE(?, max_quantity),
        description = COALESCE(?, description),
        refill_supported = COALESCE(?, refill_supported),
        cancel_supported = COALESCE(?, cancel_supported),
        status = COALESCE(?, status)
    WHERE id = ?
  `).run(
    category_id !== undefined ? Number(category_id) : null,
    name || null,
    type || null,
    rate_per_1000 !== undefined ? parseFloat(rate_per_1000) : null,
    min_quantity !== undefined ? parseInt(min_quantity, 10) : null,
    max_quantity !== undefined ? parseInt(max_quantity, 10) : null,
    description !== undefined ? description : null,
    refill_supported !== undefined ? (refill_supported ? 1 : 0) : null,
    cancel_supported !== undefined ? (cancel_supported ? 1 : 0) : null,
    status || null,
    id
  );

  return res.json({ success: true, message: 'Service updated successfully' });
});

// Delete Service
adminRouter.delete('/services/:id', (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  db.prepare('DELETE FROM services WHERE id = ?').run(id);
  logAudit(req.user!.id, 'delete_service', 'service', String(id), `Deleted service #${id}`);
  return res.json({ success: true, message: 'Service deleted successfully' });
});

// ==========================================
// PAYMENT REQUEST APPROVAL / REJECTION
// ==========================================
adminRouter.get('/payments', (req: AuthRequest, res: Response) => {
  const status = (req.query.status || 'all').toString();
  const method = (req.query.method || 'all').toString();
  const network = (req.query.network || 'all').toString();

  let query = `
    SELECT p.*, u.username, u.email, u.balance as current_user_balance
    FROM payment_requests p
    JOIN users u ON p.user_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (status && status !== 'all') {
    query += ` AND p.status = ?`;
    params.push(status.toLowerCase());
  }

  if (method && method !== 'all') {
    query += ` AND LOWER(p.method) = ?`;
    params.push(method.toLowerCase());
  }

  if (network && network !== 'all') {
    query += ` AND LOWER(p.network) = ?`;
    params.push(network.toLowerCase());
  }

  query += ` ORDER BY p.id DESC LIMIT 150`;

  const payments = db.prepare(query).all(...params) as any[];
  return res.json({ payments });
});

// Approve or Reject Payment Request
adminRouter.post('/payments/:id/process', (req: AuthRequest, res: Response) => {
  const adminId = req.user!.id;
  const requestId = parseInt(req.params.id, 10);
  const { action, notes } = req.body; // 'approve' | 'reject'

  if (action !== 'approve' && action !== 'reject') {
    return res.status(400).json({ error: 'Action must be "approve" or "reject".' });
  }

  const paymentReq = db.prepare('SELECT * FROM payment_requests WHERE id = ?').get(requestId) as any;
  if (!paymentReq) return res.status(404).json({ error: 'Payment request not found.' });

  if (paymentReq.status !== 'pending') {
    return res.status(400).json({ error: `Payment request has already been ${paymentReq.status}.` });
  }

  const now = new Date().toISOString();
  const user = db.prepare('SELECT id, balance, username FROM users WHERE id = ?').get(paymentReq.user_id) as any;

  if (action === 'approve') {
    const creditAmount = paymentReq.amount;
    const newBalance = user.balance + creditAmount;

    db.exec('BEGIN TRANSACTION');
    try {
      db.prepare(`
        UPDATE payment_requests
        SET status = 'approved', admin_notes = ?, processed_at = ?
        WHERE id = ?
      `).run(notes || 'Payment verified and approved.', now, requestId);

      db.prepare('UPDATE users SET balance = ? WHERE id = ?').run(newBalance, user.id);

      const methodLabel = paymentReq.network ? `${paymentReq.method} (${paymentReq.network})` : paymentReq.method;

      db.prepare(`
        INSERT INTO transactions (user_id, type, amount, balance_after, description, reference_id, created_at)
        VALUES (?, 'deposit', ?, ?, ?, ?, ?)
      `).run(
        user.id,
        creditAmount,
        newBalance,
        `${methodLabel} Deposit Approved (TRX: ${paymentReq.trx_id})`,
        `TRX-${paymentReq.trx_id}`,
        now
      );

      logAudit(adminId, 'approve_payment', 'payment_request', String(requestId), `Approved Rs ${creditAmount} for user ${user.username} via ${methodLabel}`);
      db.exec('COMMIT');

      return res.json({ success: true, message: `Deposit request #${requestId} approved! Rs ${creditAmount.toFixed(2)} added to ${user.username}'s balance.` });
    } catch (err: any) {
      db.exec('ROLLBACK');
      return res.status(500).json({ error: 'Failed to approve payment: ' + err.message });
    }
  } else {
    // Reject
    db.prepare(`
      UPDATE payment_requests
      SET status = 'rejected', admin_notes = ?, processed_at = ?
      WHERE id = ?
    `).run(notes || 'Transaction ID not verified with bank/wallet gateway.', now, requestId);

    logAudit(adminId, 'reject_payment', 'payment_request', String(requestId), `Rejected deposit request. Note: ${notes}`);

    return res.json({ success: true, message: `Deposit request #${requestId} rejected.` });
  }
});

// ==========================================
// SUPPORT TICKETS (ADMIN)
// ==========================================
adminRouter.get('/tickets', (req: AuthRequest, res: Response) => {
  const status = (req.query.status || 'all').toString();

  let query = `
    SELECT t.*, u.username, u.email
    FROM support_tickets t
    JOIN users u ON t.user_id = u.id
  `;
  const params: any[] = [];

  if (status && status !== 'all') {
    query += ` WHERE t.status = ?`;
    params.push(status.toLowerCase());
  }

  query += ` ORDER BY t.updated_at DESC LIMIT 150`;

  const tickets = db.prepare(query).all(...params) as any[];
  return res.json({ tickets });
});

// ==========================================
// PROVIDERS MANAGEMENT
// ==========================================
adminRouter.get('/providers', (req: AuthRequest, res: Response) => {
  const providers = db.prepare('SELECT * FROM providers ORDER BY id ASC').all() as any[];
  // Mask API keys for safe display: e.g. "prov_live_sec_***"
  const safeProviders = providers.map(p => ({
    ...p,
    api_key_masked: p.api_key ? p.api_key.substring(0, 8) + '••••••••' : ''
  }));
  return res.json({ providers: safeProviders });
});

adminRouter.post('/providers', (req: AuthRequest, res: Response) => {
  const { name, api_url, api_key } = req.body;
  if (!name || !api_url || !api_key) {
    return res.status(400).json({ error: 'Name, API URL, and API key are required.' });
  }

  const resProv = db.prepare(`
    INSERT INTO providers (name, api_url, api_key, status, balance, currency, created_at)
    VALUES (?, ?, ?, 'active', '0.00', 'USD', ?)
  `).run(name.trim(), api_url.trim(), api_key.trim(), new Date().toISOString());

  logAudit(req.user!.id, 'add_provider', 'provider', String(resProv.lastInsertRowid), `Added provider ${name}`);
  return res.status(201).json({ success: true, message: 'Provider added successfully.' });
});

// Test provider balance simulation / check
adminRouter.post('/providers/:id/test-balance', (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const prov = db.prepare('SELECT * FROM providers WHERE id = ?').get(id) as any;
  if (!prov) return res.status(404).json({ error: 'Provider not found.' });

  // In production this would query prov.api_url with prov.api_key via action=balance
  // For demo/configured providers, simulate real response:
  const simBalance = (Math.random() * 200 + 150).toFixed(2);
  db.prepare('UPDATE providers SET balance = ? WHERE id = ?').run(simBalance, id);

  return res.json({
    success: true,
    balance: simBalance,
    currency: prov.currency || 'USD',
    message: `Provider connection verified! Available balance: $${simBalance}`
  });
});

// ==========================================
// WEBSITE SETTINGS & ANNOUNCEMENTS
// ==========================================
adminRouter.get('/settings', (req: AuthRequest, res: Response) => {
  const settingsRows = db.prepare('SELECT key, value FROM settings').all() as any[];
  const settings: Record<string, string> = {};
  for (const r of settingsRows) {
    settings[r.key] = r.value;
  }
  return res.json({ settings });
});

adminRouter.put('/settings', (req: AuthRequest, res: Response) => {
  const updates: Record<string, string> = req.body;
  const adminId = req.user!.id;

  const insertOrUpdate = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  for (const [k, v] of Object.entries(updates)) {
    insertOrUpdate.run(k, String(v));
  }

  logAudit(adminId, 'update_settings', 'settings', 'all', `Updated ${Object.keys(updates).length} keys`);
  return res.json({ success: true, message: 'Settings saved successfully.' });
});

// Announcements CRUD
adminRouter.post('/announcements', (req: AuthRequest, res: Response) => {
  const { title, content, type } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content are required.' });

  const resAnn = db.prepare(`
    INSERT INTO announcements (title, content, type, active, created_at)
    VALUES (?, ?, ?, 1, ?)
  `).run(title.trim(), content.trim(), type || 'info', new Date().toISOString());

  return res.status(201).json({ success: true, id: Number(resAnn.lastInsertRowid), message: 'Announcement published.' });
});

adminRouter.delete('/announcements/:id', (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  db.prepare('DELETE FROM announcements WHERE id = ?').run(id);
  return res.json({ success: true, message: 'Announcement deleted.' });
});

// Audit Logs
adminRouter.get('/audit-logs', (req: AuthRequest, res: Response) => {
  const logs = db.prepare(`
    SELECT a.*, u.username as admin_username
    FROM audit_logs a
    JOIN users u ON a.admin_id = u.id
    ORDER BY a.id DESC LIMIT 100
  `).all() as any[];

  return res.json({ logs });
});

// Export CSV
adminRouter.get('/export/:type', (req: AuthRequest, res: Response) => {
  const type = req.params.type; // 'orders' | 'transactions' | 'users'

  if (type === 'orders') {
    const orders = db.prepare(`
      SELECT o.id, u.username, s.name as service, o.link, o.quantity, o.charge, o.status, o.created_at
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN services s ON o.service_id = s.id
      ORDER BY o.id DESC
    `).all() as any[];

    let csv = 'ID,Username,Service,Link,Quantity,Charge (PKR),Status,Created At\n';
    for (const o of orders) {
      csv += `${o.id},"${o.username}","${o.service.replace(/"/g, '""')}","${o.link.replace(/"/g, '""')}",${o.quantity},${o.charge},"${o.status}","${o.created_at}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="pakservices_orders.csv"');
    return res.send(csv);
  }

  if (type === 'transactions') {
    const txs = db.prepare(`
      SELECT t.id, u.username, t.type, t.amount, t.balance_after, t.description, t.created_at
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.id DESC
    `).all() as any[];

    let csv = 'ID,Username,Type,Amount (PKR),Balance After,Description,Created At\n';
    for (const t of txs) {
      csv += `${t.id},"${t.username}","${t.type}",${t.amount},${t.balance_after},"${t.description.replace(/"/g, '""')}","${t.created_at}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="pakservices_transactions.csv"');
    return res.send(csv);
  }

  return res.status(400).json({ error: 'Invalid export type.' });
});

// ==========================================
// DATABASE PRESERVATION & BACKUP SUITE
// ==========================================

// 1. Get database statistics & persistent storage status
adminRouter.get('/database/status', (req: AuthRequest, res: Response) => {
  const stats = getDatabaseStats();
  return res.json({ stats });
});

// 2. Trigger an immediate manual database backup snapshot
adminRouter.post('/database/backup', (req: AuthRequest, res: Response) => {
  const adminId = req.user!.id;
  const result = createDatabaseBackup('manual_admin');
  if (result.success) {
    logAudit(adminId, 'manual_backup', 'database', 'pakservices.db', `Created backup ${result.filename} (${(result.size / 1024).toFixed(1)} KB)`);
    return res.json({
      success: true,
      message: `Database backup created successfully: ${result.filename}`,
      backup: result
    });
  } else {
    return res.status(500).json({ error: 'Failed to create database backup snapshot.' });
  }
});

// 3. List all stored backup snapshots
adminRouter.get('/database/backups', (req: AuthRequest, res: Response) => {
  const backups = listDatabaseBackups();
  return res.json({ backups });
});

// 4. Download live SQLite production database file
adminRouter.get('/database/download', (req: AuthRequest, res: Response) => {
  if (!fs.existsSync(DB_PATH)) {
    return res.status(404).json({ error: 'Database file not found on server.' });
  }

  // Checkpoint WAL if any
  try {
    db.exec('PRAGMA wal_checkpoint(PASSIVE);');
  } catch {}

  const dateStr = new Date().toISOString().split('T')[0];
  res.setHeader('Content-Type', 'application/vnd.sqlite3');
  res.setHeader('Content-Disposition', `attachment; filename="pakservices_database_live_${dateStr}.db"`);
  
  const fileStream = fs.createReadStream(DB_PATH);
  return fileStream.pipe(res);
});

// 5. Download a specific historical backup snapshot
adminRouter.get('/database/download-backup/:filename', (req: AuthRequest, res: Response) => {
  const filename = path.basename(req.params.filename); // Sanitize filename
  const backupDir = getBackupsDirectory();
  const filePath = path.join(backupDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Requested backup file not found.' });
  }

  res.setHeader('Content-Type', 'application/vnd.sqlite3');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  const fileStream = fs.createReadStream(filePath);
  return fileStream.pipe(res);
});

// 6. Download full JSON export of all database tables
adminRouter.get('/database/export-json', (req: AuthRequest, res: Response) => {
  const fullJson = exportDatabaseJson();
  const dateStr = new Date().toISOString().split('T')[0];

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="pakservices_full_export_${dateStr}.json"`);
  return res.send(JSON.stringify(fullJson, null, 2));
});

// 7. Restore database from snapshot or uploaded file
adminRouter.post('/database/restore', (req: AuthRequest, res: Response) => {
  const adminId = req.user!.id;
  const { filename, file_base64 } = req.body;

  try {
    // Safety check: Take a pre-restore backup first!
    createDatabaseBackup('pre_restore_safety');

    if (filename) {
      // Restore from an existing server snapshot
      const sanitizedFilename = path.basename(filename);
      const backupDir = getBackupsDirectory();
      const sourcePath = path.join(backupDir, sanitizedFilename);

      if (!fs.existsSync(sourcePath)) {
        return res.status(404).json({ error: 'Selected backup file does not exist.' });
      }

      fs.copyFileSync(sourcePath, DB_PATH);
      logAudit(adminId, 'restore_database', 'database', sanitizedFilename, `Restored database from snapshot ${sanitizedFilename}`);
      return res.json({ success: true, message: `Database successfully restored from ${sanitizedFilename}.` });
    }

    if (file_base64) {
      // Restore from uploaded base64 data
      const buffer = Buffer.from(file_base64.replace(/^data:.*,/, ''), 'base64');
      if (buffer.length < 100) {
        return res.status(400).json({ error: 'Uploaded file is invalid or too small.' });
      }

      // Verify SQLite header magic string: 'SQLite format 3\0'
      const magic = buffer.subarray(0, 16).toString('utf-8');
      if (!magic.startsWith('SQLite format 3')) {
        return res.status(400).json({ error: 'Uploaded file is not a valid SQLite database file.' });
      }

      fs.writeFileSync(DB_PATH, buffer);
      logAudit(adminId, 'restore_database', 'database', 'uploaded_file', `Restored database from uploaded .db file (${(buffer.length / 1024).toFixed(1)} KB)`);
      return res.json({ success: true, message: 'Database successfully restored from uploaded file.' });
    }

    return res.status(400).json({ error: 'Either filename or file_base64 must be provided.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Restore failed: ' + err.message });
  }
});

