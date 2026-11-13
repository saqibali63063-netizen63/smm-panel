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
  getBackupsDirectory,
  getUploadsDirectory,
  getOrderSequenceInfo,
  setNextOrderId,
  allocateNextOrderId,
  getGlobalTheme,
  setGlobalTheme,
  type ThemeMode
} from '../db.js';
import { requireAdmin, type AuthRequest } from '../auth.js';
import { isSimDetailsCategoryName, validateSimDetailsInput, validateDeliveryContact } from '../simDetails.js';



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
    SELECT o.id, o.charge, o.quantity, o.status, o.created_at, o.link, u.username,
           COALESCE(s.name, 'Service #' || o.service_id) as service_name,
           COALESCE(c.name, 'General') as category_name
    FROM orders o
    JOIN users u ON o.user_id = u.id
    LEFT JOIN services s ON o.service_id = s.id
    LEFT JOIN categories c ON s.category_id = c.id
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
    SELECT id, email, username, role, balance, spent, status, referral_code, created_at, timezone, currency
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
    SELECT o.*, u.username, u.email, 
           COALESCE(s.name, 'Service #' || o.service_id) as service_name, 
           s.category_id as category_id,
           COALESCE(c.name, 'General') as category_name
    FROM orders o
    JOIN users u ON o.user_id = u.id
    LEFT JOIN services s ON o.service_id = s.id
    LEFT JOIN categories c ON s.category_id = c.id

  `;
  const params: any[] = [];
  const conditions: string[] = [];

  if (status && status !== 'all') {
    conditions.push('LOWER(o.status) = ?');
    params.push(status.toLowerCase());
  }

  if (search) {
    conditions.push("(LOWER(s.name) LIKE ? OR LOWER(o.link) LIKE ? OR LOWER(COALESCE(o.delivery_contact, '')) LIKE ? OR LOWER(u.username) LIKE ? OR CAST(o.id AS TEXT) LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
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

// Admin-created Order (uses exact same Next Order ID sequence)
adminRouter.post('/orders', (req: AuthRequest, res: Response) => {
  const adminId = req.user!.id;
  const { user_id, service_id, link, quantity, delivery_contact, deduct_balance, status } = req.body;

  const targetUserId = parseInt(user_id, 10);
  const sId = parseInt(service_id, 10);
  const parsedQty = parseInt(quantity, 10);
  const cleanLink = (link || '').trim();
  const cleanDeliveryContact = (delivery_contact || '').trim();
  const shouldDeduct = deduct_balance !== false;
  const validStatuses = ['Pending', 'In progress', 'Completed', 'Processing'];
  const initialStatus = status && validStatuses.includes(status) ? status : 'Pending';

  if (!targetUserId || !sId || !cleanLink) {
    return res.status(400).json({ error: 'Client user, service, and target input are required.' });
  }

  const targetUser = db.prepare('SELECT id, username, balance, spent FROM users WHERE id = ?').get(targetUserId) as any;
  if (!targetUser) {
    return res.status(404).json({ error: 'Target user not found.' });
  }

  const service = db.prepare(`
    SELECT s.*, c.name as category_name
    FROM services s
    LEFT JOIN categories c ON s.category_id = c.id
    WHERE s.id = ?
  `).get(sId) as any;

  if (!service) {
    return res.status(404).json({ error: 'Selected service not found.' });
  }

  const isSimDetails = isSimDetailsCategoryName(service.category_name);
  let finalTargetInput = cleanLink;
  let finalDeliveryContact: string | null = null;
  let finalQuantity = parsedQty;
  let charge = 0;

  if (isSimDetails) {
    const simCheck = validateSimDetailsInput(cleanLink);
    if (!simCheck.valid) {
      return res.status(400).json({ error: simCheck.error });
    }
    finalTargetInput = simCheck.normalized;

    const deliveryCheck = validateDeliveryContact(cleanDeliveryContact);
    if (!deliveryCheck.valid) {
      return res.status(400).json({ error: deliveryCheck.error });
    }
    finalDeliveryContact = deliveryCheck.normalized;
    finalQuantity = 1;
    charge = parseFloat(Number(service.rate_per_1000).toFixed(2));
  } else {
    if (!parsedQty || isNaN(parsedQty) || parsedQty <= 0) {
      return res.status(400).json({ error: 'Please provide a valid quantity.' });
    }
    if (parsedQty < service.min_quantity || parsedQty > service.max_quantity) {
      return res.status(400).json({
        error: `Quantity for this service must be between ${service.min_quantity.toLocaleString()} and ${service.max_quantity.toLocaleString()}.`
      });
    }
    charge = parseFloat(((parsedQty / 1000) * service.rate_per_1000).toFixed(2));
  }

  const now = new Date().toISOString();

  db.exec('BEGIN IMMEDIATE TRANSACTION');
  try {
    let newBalance = targetUser.balance;
    if (shouldDeduct) {
      const deductRes = db.prepare(`
        UPDATE users
        SET balance = ROUND(balance - ?, 2),
            spent = ROUND(spent + ?, 2)
        WHERE id = ? AND balance >= ?
      `).run(charge, charge, targetUserId, charge);

      if (deductRes.changes !== 1) {
        db.exec('ROLLBACK');
        const freshUser = db.prepare('SELECT balance FROM users WHERE id = ?').get(targetUserId) as any;
        return res.status(400).json({
          error: `Client has insufficient balance. Required: Rs ${charge.toFixed(2)}, Available: Rs ${(freshUser?.balance || 0).toFixed(2)}.`
        });
      }

      const updated = db.prepare('SELECT balance FROM users WHERE id = ?').get(targetUserId) as any;
      newBalance = updated.balance;
    }

    const orderId = allocateNextOrderId();
    const remains = initialStatus === 'Completed' ? 0 : finalQuantity;

    db.prepare(`
      INSERT INTO orders (id, user_id, service_id, link, delivery_contact, quantity, charge, start_count, remains, status, mode, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'Manual', ?, ?)
    `).run(orderId, targetUserId, service.id, finalTargetInput, finalDeliveryContact, finalQuantity, shouldDeduct ? charge : 0, remains, initialStatus, now, now);

    if (shouldDeduct) {
      db.prepare(`
        INSERT INTO transactions (user_id, type, amount, balance_after, description, reference_id, created_at)
        VALUES (?, 'order', ?, ?, ?, ?, ?)
      `).run(targetUserId, -charge, newBalance, `Admin Order #${orderId} - ${service.name}`, `ORD-${orderId}`, now);
    }

    logAudit(adminId, 'admin_create_order', 'order', String(orderId), `Created Order #${orderId} for user ${targetUser.username} (Deducted: ${shouldDeduct ? `Rs ${charge}` : 'Rs 0'})`);
    db.exec('COMMIT');

    return res.status(201).json({
      success: true,
      order_id: orderId,
      charge: shouldDeduct ? charge : 0,
      message: `Order #${orderId} created for ${targetUser.username}!`
    });
  } catch (err: any) {
    try { db.exec('ROLLBACK'); } catch {}
    return res.status(500).json({ error: 'Admin order creation failed: ' + err.message });
  }
});

// ==========================================
// CATEGORY & SERVICE MANAGEMENT
// ==========================================

// ==========================================
// CATEGORY MANAGEMENT
// ==========================================

// Get all categories with service counts (ordered by sort_order)
adminRouter.get('/categories', (req: AuthRequest, res: Response) => {
  const categories = db.prepare(`
    SELECT c.*, COUNT(s.id) as service_count
    FROM categories c
    LEFT JOIN services s ON s.category_id = c.id
    GROUP BY c.id
    ORDER BY c.sort_order ASC, c.id ASC
  `).all() as any[];
  return res.json({ categories });
});

// Add Category
adminRouter.post('/categories', (req: AuthRequest, res: Response) => {
  const { name, icon, image_url, description, sort_order, status } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Category name is required.' });
  }

  // Determine sort order
  let finalSort = Number(sort_order);
  if (isNaN(finalSort)) {
    const maxSort = db.prepare('SELECT MAX(sort_order) as max_sort FROM categories').get() as any;
    finalSort = (maxSort?.max_sort || 0) + 1;
  }

  try {
    const resCat = db.prepare(`
      INSERT INTO categories (name, icon, image_url, description, sort_order, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      String(name).trim(),
      icon ? String(icon).trim() : 'Globe',
      image_url ? String(image_url).trim() : null,
      description ? String(description).trim() : '',
      finalSort,
      status === 'inactive' ? 'inactive' : 'active'
    );

    const newId = Number(resCat.lastInsertRowid);
    logAudit(req.user!.id, 'create_category', 'category', String(newId), `Created category "${name.trim()}"`);
    return res.status(201).json({ success: true, id: newId, message: 'Category created successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create category: ' + err.message });
  }
});

// Update Category
adminRouter.put('/categories/:id', (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid category ID.' });

  const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as any;
  if (!existing) return res.status(404).json({ error: 'Category not found.' });

  const { name, icon, image_url, description, sort_order, status } = req.body;

  if (name !== undefined && !String(name).trim()) {
    return res.status(400).json({ error: 'Category name cannot be empty.' });
  }

  const finalName = name !== undefined ? String(name).trim() : existing.name;
  const finalIcon = icon !== undefined ? String(icon).trim() : existing.icon;
  const finalImage = image_url !== undefined ? (image_url ? String(image_url).trim() : null) : existing.image_url;
  const finalDesc = description !== undefined ? String(description).trim() : (existing.description || '');
  const finalSort = sort_order !== undefined ? Number(sort_order) : existing.sort_order;
  const finalStatus = status !== undefined ? String(status) : existing.status;

  try {
    db.prepare(`
      UPDATE categories
      SET name = ?,
          icon = ?,
          image_url = ?,
          description = ?,
          sort_order = ?,
          status = ?
      WHERE id = ?
    `).run(finalName, finalIcon, finalImage, finalDesc, finalSort, finalStatus, id);

    logAudit(req.user!.id, 'edit_category', 'category', String(id), `Updated category "${finalName}"`);
    return res.json({ success: true, message: 'Category updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update category: ' + err.message });
  }
});

// Reorder Categories (Persistent Drag-and-Drop)
adminRouter.post('/categories/reorder', (req: AuthRequest, res: Response) => {
  const { order } = req.body; // Array of { id: number, sort_order: number } or [id1, id2, ...]
  if (!Array.isArray(order) || order.length === 0) {
    return res.status(400).json({ error: 'Valid category order array is required.' });
  }

  const updateStmt = db.prepare('UPDATE categories SET sort_order = ? WHERE id = ?');
  db.exec('BEGIN TRANSACTION');
  try {
    for (let i = 0; i < order.length; i++) {
      const item = order[i];
      const catId = typeof item === 'object' && item !== null ? Number(item.id) : Number(item);
      const sortVal = typeof item === 'object' && item !== null && item.sort_order !== undefined
        ? Number(item.sort_order)
        : (i + 1);

      if (!isNaN(catId)) {
        updateStmt.run(sortVal, catId);
      }
    }
    db.exec('COMMIT');
    logAudit(req.user!.id, 'reorder_categories', 'category', 'all', `Reordered ${order.length} categories`);
    return res.json({ success: true, message: 'Category order saved permanently.' });
  } catch (err: any) {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: 'Failed to save category order: ' + err.message });
  }
});

// Upload Category Image / Logo
adminRouter.post('/categories/upload-icon', (req: AuthRequest, res: Response) => {
  const { image_data, filename } = req.body;
  if (!image_data || typeof image_data !== 'string') {
    return res.status(400).json({ error: 'Base64 image data is required.' });
  }

  try {
    const uploadsDir = getUploadsDirectory();
    // Detect format
    let ext = 'png';
    if (image_data.startsWith('data:image/jpeg') || image_data.startsWith('data:image/jpg')) ext = 'jpg';
    else if (image_data.startsWith('data:image/webp')) ext = 'webp';
    else if (image_data.startsWith('data:image/svg')) ext = 'svg';

    const cleanBase64 = image_data.replace(/^data:image\/[a-z0-9+-]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    if (buffer.length < 50) {
      return res.status(400).json({ error: 'Invalid or corrupt image file.' });
    }

    const uniqueName = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const targetPath = path.join(uploadsDir, uniqueName);

    fs.writeFileSync(targetPath, buffer);
    const publicUrl = `/uploads/categories/${uniqueName}`;

    return res.json({ success: true, url: publicUrl, message: 'Category image uploaded successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to save image: ' + err.message });
  }
});

// Delete Category
adminRouter.delete('/categories/:id', (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid category ID.' });

  const count = db.prepare('SELECT COUNT(*) as count FROM services WHERE category_id = ?').get(id) as any;
  const isForce = req.query.force === 'true';

  if (count.count > 0 && !isForce) {
    return res.status(400).json({
      error: `Cannot delete category because it contains ${count.count} active services. Please delete or reassign services first.`,
      service_count: count.count
    });
  }

  db.exec('BEGIN TRANSACTION');
  try {
    if (isForce && count.count > 0) {
      // Reassign services to another category if exists, or remove category reference
      const otherCat = db.prepare('SELECT id FROM categories WHERE id != ? LIMIT 1').get(id) as any;
      if (otherCat) {
        db.prepare('UPDATE services SET category_id = ? WHERE category_id = ?').run(otherCat.id, id);
      }
    }
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    db.exec('COMMIT');
    logAudit(req.user!.id, 'delete_category', 'category', String(id), `Deleted category #${id}`);
    return res.json({ success: true, message: 'Category deleted successfully.' });
  } catch (err: any) {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: 'Failed to delete category: ' + err.message });
  }
});

// ==========================================
// SERVICE MANAGEMENT (COMPREHENSIVELY FIXED & EXPANDED)
// ==========================================

// Get all services (Admin View: includes inactive, with category names)
adminRouter.get('/services', (req: AuthRequest, res: Response) => {
  const services = db.prepare(`
    SELECT s.*, c.name as category_name, c.sort_order as category_sort
    FROM services s
    LEFT JOIN categories c ON s.category_id = c.id
    ORDER BY c.sort_order ASC, s.id ASC
  `).all() as any[];

  const categories = db.prepare(`
    SELECT c.*, COUNT(s.id) as service_count
    FROM categories c
    LEFT JOIN services s ON s.category_id = c.id
    GROUP BY c.id
    ORDER BY c.sort_order ASC, c.id ASC
  `).all() as any[];

  return res.json({ services, categories });
});

// Add Service with strict server-side validation
adminRouter.post('/services', (req: AuthRequest, res: Response) => {
  const {
    category_id,
    name,
    type,
    rate_per_1000,
    min_quantity,
    max_quantity,
    description,
    refill_supported,
    cancel_supported,
    status
  } = req.body;

  // 1. Validate Service Name
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Service name is required.' });
  }

  // 2. Validate Category ID
  const catId = Number(category_id);
  if (isNaN(catId)) {
    return res.status(400).json({ error: 'Please select a valid category.' });
  }
  const catExists = db.prepare('SELECT id FROM categories WHERE id = ?').get(catId);
  if (!catExists) {
    return res.status(400).json({ error: 'The selected category does not exist.' });
  }

  // 3. Validate Rate
  const rate = parseFloat(rate_per_1000);
  if (isNaN(rate) || rate <= 0) {
    return res.status(400).json({ error: 'Rate per 1000 must be a valid positive number.' });
  }

  // 4. Validate Quantities
  const minQty = parseInt(min_quantity, 10);
  if (isNaN(minQty) || minQty < 1) {
    return res.status(400).json({ error: 'Minimum quantity must be at least 1.' });
  }

  const maxQty = parseInt(max_quantity, 10);
  if (isNaN(maxQty) || maxQty < minQty) {
    return res.status(400).json({ error: 'Maximum quantity must be greater than or equal to minimum quantity.' });
  }

  try {
    const resServ = db.prepare(`
      INSERT INTO services (category_id, name, type, rate_per_1000, min_quantity, max_quantity, description, refill_supported, cancel_supported, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      catId,
      String(name).trim(),
      type ? String(type).trim() : 'Default',
      rate,
      minQty,
      maxQty,
      description ? String(description).trim() : '',
      refill_supported ? 1 : 0,
      cancel_supported ? 1 : 0,
      status === 'inactive' ? 'inactive' : 'active'
    );

    const newId = Number(resServ.lastInsertRowid);
    logAudit(req.user!.id, 'create_service', 'service', String(newId), `Created service #${newId} (${name})`);
    return res.status(201).json({ success: true, id: newId, message: 'Service created successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create service: ' + err.message });
  }
});

// Update Service
adminRouter.put('/services/:id', (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid service ID.' });

  const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(id) as any;
  if (!existing) {
    return res.status(404).json({ error: `Service #${id} was not found.` });
  }

  const {
    category_id,
    name,
    type,
    rate_per_1000,
    min_quantity,
    max_quantity,
    description,
    refill_supported,
    cancel_supported,
    status
  } = req.body;

  // Validation
  if (name !== undefined && !String(name).trim()) {
    return res.status(400).json({ error: 'Service name cannot be empty.' });
  }

  const finalCatId = category_id !== undefined ? Number(category_id) : existing.category_id;
  const catExists = db.prepare('SELECT id FROM categories WHERE id = ?').get(finalCatId);
  if (!catExists) {
    return res.status(400).json({ error: `Category #${finalCatId} does not exist.` });
  }

  const finalRate = rate_per_1000 !== undefined ? parseFloat(rate_per_1000) : existing.rate_per_1000;
  if (isNaN(finalRate) || finalRate <= 0) {
    return res.status(400).json({ error: 'Rate per 1000 must be a valid positive number.' });
  }

  const finalMin = min_quantity !== undefined ? parseInt(min_quantity, 10) : existing.min_quantity;
  if (isNaN(finalMin) || finalMin < 1) {
    return res.status(400).json({ error: 'Minimum quantity must be at least 1.' });
  }

  const finalMax = max_quantity !== undefined ? parseInt(max_quantity, 10) : existing.max_quantity;
  if (isNaN(finalMax) || finalMax < finalMin) {
    return res.status(400).json({ error: 'Maximum quantity must be greater than or equal to minimum quantity.' });
  }

  const finalName = name !== undefined ? String(name).trim() : existing.name;
  const finalType = type !== undefined ? String(type).trim() : existing.type;
  const finalDesc = description !== undefined ? String(description) : (existing.description || '');
  const finalRefill = refill_supported !== undefined ? (refill_supported ? 1 : 0) : existing.refill_supported;
  const finalCancel = cancel_supported !== undefined ? (cancel_supported ? 1 : 0) : existing.cancel_supported;
  const finalStatus = status !== undefined ? String(status) : existing.status;

  try {
    db.prepare(`
      UPDATE services
      SET category_id = ?,
          name = ?,
          type = ?,
          rate_per_1000 = ?,
          min_quantity = ?,
          max_quantity = ?,
          description = ?,
          refill_supported = ?,
          cancel_supported = ?,
          status = ?
      WHERE id = ?
    `).run(
      finalCatId,
      finalName,
      finalType,
      finalRate,
      finalMin,
      finalMax,
      finalDesc,
      finalRefill,
      finalCancel,
      finalStatus,
      id
    );

    logAudit(req.user!.id, 'edit_service', 'service', String(id), `Updated service #${id} (${finalName})`);

    const updated = db.prepare(`
      SELECT s.*, c.name as category_name
      FROM services s
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE s.id = ?
    `).get(id);

    return res.json({
      success: true,
      message: `Service #${id} updated successfully.`,
      service: updated
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update service: ' + err.message });
  }
});

// Bulk Enable/Disable Services
adminRouter.post('/services/bulk-status', (req: AuthRequest, res: Response) => {
  const { ids, status } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Please select at least one service.' });
  }
  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Must be active or inactive.' });
  }

  db.exec('BEGIN TRANSACTION');
  try {
    const stmt = db.prepare('UPDATE services SET status = ? WHERE id = ?');
    for (const id of ids) {
      stmt.run(status, Number(id));
    }
    db.exec('COMMIT');
    logAudit(req.user!.id, 'bulk_status_services', 'service', ids.join(','), `Updated ${ids.length} services to ${status}`);
    return res.json({ success: true, message: `Successfully marked ${ids.length} services as ${status}.` });
  } catch (err: any) {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: 'Bulk status update failed: ' + err.message });
  }
});

// Bulk Reassign Category
adminRouter.post('/services/bulk-category', (req: AuthRequest, res: Response) => {
  const { ids, category_id } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Please select at least one service.' });
  }
  const cat = db.prepare('SELECT id, name FROM categories WHERE id = ?').get(Number(category_id)) as any;
  if (!cat) {
    return res.status(400).json({ error: 'Selected category does not exist.' });
  }

  db.exec('BEGIN TRANSACTION');
  try {
    const stmt = db.prepare('UPDATE services SET category_id = ? WHERE id = ?');
    for (const id of ids) {
      stmt.run(cat.id, Number(id));
    }
    db.exec('COMMIT');
    logAudit(req.user!.id, 'bulk_category_services', 'service', ids.join(','), `Moved ${ids.length} services to category "${cat.name}"`);
    return res.json({ success: true, message: `Successfully moved ${ids.length} services to ${cat.name}.` });
  } catch (err: any) {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: 'Bulk category update failed: ' + err.message });
  }
});

// Bulk Delete Services (Preserves historical orders & users)
adminRouter.post('/services/bulk-delete', (req: AuthRequest, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Please select at least one service to delete.' });
  }

  db.exec('BEGIN TRANSACTION');
  try {
    const stmt = db.prepare('DELETE FROM services WHERE id = ?');
    for (const id of ids) {
      stmt.run(Number(id));
    }
    db.exec('COMMIT');
    logAudit(req.user!.id, 'bulk_delete_services', 'service', ids.join(','), `Deleted ${ids.length} services`);
    return res.json({ success: true, message: `Successfully deleted ${ids.length} services.` });
  } catch (err: any) {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: 'Bulk delete failed: ' + err.message });
  }
});

// Delete Single Service
adminRouter.delete('/services/:id', (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid service ID.' });

  db.prepare('DELETE FROM services WHERE id = ?').run(id);
  logAudit(req.user!.id, 'delete_service', 'service', String(id), `Deleted service #${id}`);
  return res.json({ success: true, message: 'Service deleted successfully' });
});

// Delete ALL Services (Strict Confirmation "DELETE ALL", preserves historical orders, users, balances, transactions)
adminRouter.post('/services/delete-all', (req: AuthRequest, res: Response) => {
  const { confirmation } = req.body;
  if (confirmation !== 'DELETE ALL') {
    return res.status(400).json({ error: 'Confirmation string must be exactly "DELETE ALL".' });
  }

  const countRow = db.prepare('SELECT COUNT(*) as count FROM services').get() as any;
  const count = countRow?.count || 0;

  db.exec('BEGIN TRANSACTION');
  try {
    // Only delete services records; orders, transactions, users, balances, categories remain 100% intact
    db.prepare('DELETE FROM services').run();
    db.exec('COMMIT');
    logAudit(req.user!.id, 'delete_all_services', 'service', 'all', `Deleted all ${count} services from catalog`);
    return res.json({
      success: true,
      message: `All ${count} services have been removed from the catalog. Historical orders and customer records remain completely intact.`
    });
  } catch (err: any) {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: 'Failed to delete all services: ' + err.message });
  }
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
// ORDER NUMBERING SEQUENCE & GLOBAL THEME
// ==========================================
adminRouter.get('/order-sequence', (_req: AuthRequest, res: Response) => {
  return res.json(getOrderSequenceInfo());
});

adminRouter.put('/order-sequence', (req: AuthRequest, res: Response) => {
  const adminId = req.user!.id;
  const rawNextId = req.body?.next_order_id;
  const parsed = Number(rawNextId);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return res.status(400).json({ error: 'Next Order ID must be a positive whole number (minimum 1).' });
  }

  const info = getOrderSequenceInfo();
  const collision = db.prepare('SELECT id FROM orders WHERE id = ?').get(parsed) as any;
  if (collision || (info.max_order_id > 0 && parsed <= info.max_order_id)) {
    return res.status(400).json({
      error: `Next Order ID must be greater than your latest existing Order ID (#${info.max_order_id}). Recommended: #${info.max_order_id + 1} or higher.`
    });
  }

  setNextOrderId(parsed);
  logAudit(adminId, 'update_next_order_id', 'settings', 'next_order_id', `Set Next Order ID to #${parsed}`);

  return res.json({
    success: true,
    ...getOrderSequenceInfo(),
    message: `Next Order ID updated to #${parsed}. All newly created orders will start from #${parsed}.`
  });
});

adminRouter.get('/theme', (_req: AuthRequest, res: Response) => {
  return res.json({ theme: getGlobalTheme() });
});

adminRouter.put('/theme', (req: AuthRequest, res: Response) => {
  const adminId = req.user!.id;
  const { theme } = req.body;

  if (!theme || !['midnight', 'crystal', 'neon'].includes(theme)) {
    return res.status(400).json({ error: 'Valid theme must be midnight, crystal, or neon.' });
  }

  setGlobalTheme(theme as ThemeMode);
  logAudit(adminId, 'update_global_theme', 'settings', 'global_theme', `Applied global website theme: ${theme}`);

  return res.json({
    success: true,
    theme,
    message: `Global website theme changed to ${theme}. All visitors and users now see this theme.`
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

