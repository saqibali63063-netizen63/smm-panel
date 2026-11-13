import { Router } from 'express';
import type { Request, Response } from 'express';
import { db, hashPassword, verifyPassword, generateReferralCode, allocateNextOrderId, getGlobalTheme } from '../db.js';
import { createSession, removeSession, requireAuth, type AuthRequest } from '../auth.js';
import { isSimDetailsCategoryName, validateSimDetailsInput, validateDeliveryContact } from '../simDetails.js';

export const userRouter = Router();

// ==========================================
// PUBLIC & AUTHENTICATION ENDPOINTS
// ==========================================

// Public Global Website Theme (Admin controlled)
userRouter.get('/theme', (_req: Request, res: Response) => {
  return res.json({ theme: getGlobalTheme() });
});

// Register
userRouter.post('/auth/register', (req: Request, res: Response) => {
  const { username, email, password, referral_code } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required.' });
  }

  const cleanUser = String(username).trim();
  const cleanEmail = String(email).trim().toLowerCase();

  if (cleanUser.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  // Check existing
  const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(cleanEmail, cleanUser) as any;
  if (existing) {
    return res.status(400).json({ error: 'An account with that email or username already exists.' });
  }

  // Check referrer if provided
  let referrerId: number | null = null;
  if (referral_code) {
    const refUser = db.prepare('SELECT id FROM users WHERE referral_code = ?').get(String(referral_code).trim().toUpperCase()) as any;
    if (refUser) {
      referrerId = refUser.id;
    }
  }

  const passwordHash = hashPassword(password);
  const userReferralCode = generateReferralCode();
  const now = new Date().toISOString();

  try {
    const result = db.prepare(`
      INSERT INTO users (email, username, password_hash, role, balance, spent, status, referral_code, referred_by, created_at)
      VALUES (?, ?, ?, 'user', 0.0, 0.0, 'active', ?, ?, ?)
    `).run(cleanEmail, cleanUser, passwordHash, userReferralCode, referrerId, now);

    const userId = Number(result.lastInsertRowid);
    const token = createSession(userId);

    const user = {
      id: userId,
      email: cleanEmail,
      username: cleanUser,
      role: 'user',
      balance: 0.0,
      spent: 0.0,
      status: 'active',
      referral_code: userReferralCode,
      created_at: now,
      timezone: 'Asia/Karachi',
      currency: 'PKR'
    };

    return res.status(201).json({ token, user, message: 'Account registered successfully!' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

// Login
userRouter.post('/auth/login', (req: Request, res: Response) => {
  const { emailOrUsername, password } = req.body;

  if (!emailOrUsername || !password) {
    return res.status(400).json({ error: 'Please provide username/email and password.' });
  }

  const term = String(emailOrUsername).trim().toLowerCase();
  const user = db.prepare(`
    SELECT * FROM users
    WHERE LOWER(email) = ? OR LOWER(username) = ?
  `).get(term, term) as any;

  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username/email or password.' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ error: 'Account suspended. Contact support for assistance.' });
  }

  const token = createSession(user.id);

  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      balance: user.balance,
      spent: user.spent,
      status: user.status,
      referral_code: user.referral_code,
      created_at: user.created_at,
      timezone: user.timezone,
      currency: user.currency
    },
    message: 'Login successful'
  });
});

// Get Current User (/auth/me)
userRouter.get('/auth/me', requireAuth, (req: AuthRequest, res: Response) => {
  // Fresh lookup for real-time balance
  const user = db.prepare(`
    SELECT id, email, username, role, balance, spent, status, referral_code, created_at, timezone, currency
    FROM users
    WHERE id = ?
  `).get(req.user!.id) as any;

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json({ user });
});

// Logout
userRouter.post('/auth/logout', requireAuth, (req: AuthRequest, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    removeSession(authHeader.substring(7).trim());
  }
  return res.json({ message: 'Logged out successfully' });
});

// Forgot Password (Simulated secure token / reset link generator)
userRouter.post('/auth/forgot-password', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email address is required.' });

  const user = db.prepare('SELECT id, email, username FROM users WHERE LOWER(email) = ?').get(String(email).trim().toLowerCase()) as any;
  if (!user) {
    // Return friendly generic response for security
    return res.json({
      success: true,
      message: 'If that email exists in our system, a password reset instruction has been sent.'
    });
  }

  const resetPin = Math.floor(100000 + Math.random() * 900000).toString();
  // Store pin in settings or memory simulation
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(`reset_${user.id}`, `${resetPin}:${Date.now() + 15 * 60000}`);

  return res.json({
    success: true,
    message: 'Reset instructions have been sent to your email.',
    // In preview sandbox we supply the verification PIN directly so the tester can test immediately:
    demoPinNotice: `[DEMO MODE PIN: ${resetPin}]`
  });
});

// Reset Password with verification PIN
userRouter.post('/auth/reset-password', (req: Request, res: Response) => {
  const { email, pin, newPassword } = req.body;
  if (!email || !pin || !newPassword) {
    return res.status(400).json({ error: 'Email, PIN, and new password are required.' });
  }

  const user = db.prepare('SELECT id, email FROM users WHERE LOWER(email) = ?').get(String(email).trim().toLowerCase()) as any;
  if (!user) return res.status(400).json({ error: 'Invalid reset request.' });

  const record = db.prepare('SELECT value FROM settings WHERE key = ?').get(`reset_${user.id}`) as any;
  if (!record) return res.status(400).json({ error: 'No active password reset request found.' });

  const [storedPin, expiry] = record.value.split(':');
  if (storedPin !== String(pin).trim() || Date.now() > Number(expiry)) {
    return res.status(400).json({ error: 'Invalid or expired verification PIN.' });
  }

  const newHash = hashPassword(newPassword);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, user.id);
  db.prepare('DELETE FROM settings WHERE key = ?').run(`reset_${user.id}`);

  return res.json({ success: true, message: 'Password has been reset successfully! You can now log in.' });
});

// Update Profile
userRouter.put('/auth/profile', requireAuth, (req: AuthRequest, res: Response) => {
  const { timezone, currency } = req.body;
  const user = req.user!;

  db.prepare(`
    UPDATE users
    SET timezone = COALESCE(?, timezone),
        currency = COALESCE(?, currency)
    WHERE id = ?
  `).run(timezone || null, currency || null, user.id);

  return res.json({ success: true, message: 'Profile updated successfully.' });
});

// Change Password
userRouter.post('/auth/change-password', requireAuth, (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user!.id;

  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as any;
  if (!verifyPassword(currentPassword, user.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  const newHash = hashPassword(newPassword);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, userId);

  return res.json({ success: true, message: 'Password changed successfully.' });
});

// ==========================================
// SERVICES & CATEGORIES (PUBLIC & AUTH)
// ==========================================

userRouter.get('/services', (req: Request, res: Response) => {
  const categories = db.prepare(`
    SELECT * FROM categories
    WHERE status = 'active'
    ORDER BY sort_order ASC, name ASC
  `).all() as any[];

  const services = db.prepare(`
    SELECT s.*, c.name as category_name
    FROM services s
    JOIN categories c ON s.category_id = c.id
    WHERE s.status = 'active'
    ORDER BY c.sort_order ASC, s.id ASC
  `).all() as any[];

  return res.json({ categories, services });
});

userRouter.get('/services/favorites', requireAuth, (req: AuthRequest, res: Response) => {
  const favorites = db.prepare(`
    SELECT service_id FROM user_favorites WHERE user_id = ?
  `).all(req.user!.id) as any[];

  return res.json({ favorites: favorites.map(f => f.service_id) });
});

userRouter.post('/services/favorites/toggle', requireAuth, (req: AuthRequest, res: Response) => {
  const { service_id } = req.body;
  const userId = req.user!.id;

  const existing = db.prepare('SELECT 1 FROM user_favorites WHERE user_id = ? AND service_id = ?').get(userId, service_id);
  if (existing) {
    db.prepare('DELETE FROM user_favorites WHERE user_id = ? AND service_id = ?').run(userId, service_id);
    return res.json({ favorited: false });
  } else {
    db.prepare('INSERT INTO user_favorites (user_id, service_id) VALUES (?, ?)').run(userId, service_id);
    return res.json({ favorited: true });
  }
});

// ==========================================
// ORDER SYSTEM
// ==========================================

// Get user orders with search, status filter, and pagination
userRouter.get('/orders', requireAuth, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const status = (req.query.status || 'all').toString();
  const search = (req.query.search || '').toString().trim().toLowerCase();

  let query = `
    SELECT o.*, 
           COALESCE(s.name, 'Service #' || o.service_id) as service_name, 
           s.category_id as category_id,
           COALESCE(c.name, 'General') as category_name, 
           COALESCE(s.refill_supported, 0) as refill_supported, 
           COALESCE(s.cancel_supported, 0) as cancel_supported
    FROM orders o
    LEFT JOIN services s ON o.service_id = s.id
    LEFT JOIN categories c ON s.category_id = c.id
    WHERE o.user_id = ?

  `;
  const params: any[] = [userId];

  if (status && status !== 'all') {
    query += ` AND LOWER(o.status) = ?`;
    params.push(status.toLowerCase());
  }

  if (search) {
    query += ` AND (LOWER(s.name) LIKE ? OR LOWER(o.link) LIKE ? OR LOWER(COALESCE(o.delivery_contact, '')) LIKE ? OR CAST(o.id AS TEXT) LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ` ORDER BY o.id DESC LIMIT 200`;

  const orders = db.prepare(query).all(...params) as any[];
  return res.json({ orders });
});

// Create New Order
userRouter.post('/orders', requireAuth, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { service_id, link, quantity, delivery_contact } = req.body;

  const sId = parseInt(service_id, 10);
  const parsedQty = parseInt(quantity, 10);
  const cleanLink = (link || '').trim();
  const cleanDeliveryContact = (delivery_contact || '').trim();

  if (!sId || !cleanLink) {
    return res.status(400).json({ error: 'Please provide valid service and target input.' });
  }

  // Fetch current service along with its category identifier & name
  const service = db.prepare(`
    SELECT s.*, c.name as category_name
    FROM services s
    LEFT JOIN categories c ON s.category_id = c.id
    WHERE s.id = ? AND s.status = 'active'
  `).get(sId) as any;

  if (!service) {
    return res.status(404).json({ error: 'Selected service is currently unavailable.' });
  }

  const isSimDetails = isSimDetailsCategoryName(service.category_name);

  let finalTargetInput = cleanLink;
  let finalDeliveryContact: string | null = null;
  let finalQuantity = parsedQty;
  let charge = 0;

  if (isSimDetails) {
    // 1. Validate Service Target: Pakistani Mobile Number or CNIC
    const simCheck = validateSimDetailsInput(cleanLink);
    if (!simCheck.valid) {
      return res.status(400).json({ error: simCheck.error });
    }
    finalTargetInput = simCheck.normalized;

    // 2. Validate Required Delivery Contact: Email or Pakistani WhatsApp Number
    const deliveryCheck = validateDeliveryContact(cleanDeliveryContact);
    if (!deliveryCheck.valid) {
      return res.status(400).json({ error: deliveryCheck.error });
    }
    finalDeliveryContact = deliveryCheck.normalized;

    // 3. SIM Details pricing: fixed per one order / per one number (quantity = 1)
    finalQuantity = 1;
    charge = parseFloat(Number(service.rate_per_1000).toFixed(2));
  } else {
    // Standard SMM category pricing (per 1000 units)
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

  // Pre-check user balance for clear error response
  const userCheck = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId) as any;
  if (!userCheck || userCheck.balance < charge) {
    return res.status(400).json({
      error: `Insufficient balance. Required: Rs ${charge.toFixed(2)}, Available: Rs ${(userCheck?.balance || 0).toFixed(2)}. Please Add Funds.`
    });
  }

  const now = new Date().toISOString();

  // Atomic transaction prevents concurrent race conditions or duplicate balance deductions
  db.exec('BEGIN IMMEDIATE TRANSACTION');
  try {
    const deductRes = db.prepare(`
      UPDATE users
      SET balance = ROUND(balance - ?, 2),
          spent = ROUND(spent + ?, 2)
      WHERE id = ? AND balance >= ?
    `).run(charge, charge, userId, charge);

    if (deductRes.changes !== 1) {
      db.exec('ROLLBACK');
      const freshUser = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId) as any;
      return res.status(400).json({
        error: `Insufficient balance. Required: Rs ${charge.toFixed(2)}, Available: Rs ${(freshUser?.balance || 0).toFixed(2)}. Please Add Funds.`
      });
    }

    const updatedUser = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId) as any;
    const newBalance = updatedUser.balance;

    const orderId = allocateNextOrderId();

    db.prepare(`
      INSERT INTO orders (id, user_id, service_id, link, delivery_contact, quantity, charge, start_count, remains, status, mode, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'Pending', 'Manual', ?, ?)
    `).run(orderId, userId, service.id, finalTargetInput, finalDeliveryContact, finalQuantity, charge, finalQuantity, now, now);

    db.prepare(`
      INSERT INTO transactions (user_id, type, amount, balance_after, description, reference_id, created_at)
      VALUES (?, 'order', ?, ?, ?, ?, ?)
    `).run(userId, -charge, newBalance, `Order #${orderId} - ${service.name}`, `ORD-${orderId}`, now);

    db.exec('COMMIT');

    return res.status(201).json({
      success: true,
      order_id: orderId,
      charge,
      balance: newBalance,
      message: `Order #${orderId} submitted successfully!`
    });
  } catch (err: any) {
    try { db.exec('ROLLBACK'); } catch {}
    return res.status(500).json({ error: 'Order placement failed: ' + err.message });
  }
});

// Mass Order Submission
userRouter.post('/orders/mass', requireAuth, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { mass_data } = req.body;

  if (!mass_data || typeof mass_data !== 'string') {
    return res.status(400).json({ error: 'Please enter mass order details in format: service_id | quantity | link' });
  }

  const lines = mass_data.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return res.status(400).json({ error: 'No order rows found.' });
  }

  const results: any[] = [];
  let user = db.prepare('SELECT balance, spent FROM users WHERE id = ?').get(userId) as any;

  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split('|').map(p => p.trim());
    if (parts.length < 3) {
      results.push({ line: i + 1, error: 'Invalid row format. Use: service_id | quantity | link' });
      continue;
    }

    const sId = parseInt(parts[0], 10);
    const qty = parseInt(parts[1], 10);
    const link = parts[2];

    const service = db.prepare(`
      SELECT s.*, c.name as category_name
      FROM services s
      LEFT JOIN categories c ON s.category_id = c.id
      WHERE s.id = ? AND s.status = 'active'
    `).get(sId) as any;
    if (!service) {
      results.push({ line: i + 1, error: `Service ID ${sId} not found or inactive` });
      continue;
    }

    let finalQty = qty;
    let finalDelivery: string | null = null;
    let charge = 0;

    if (isSimDetailsCategoryName(service.category_name)) {
      const simCheck = validateSimDetailsInput(link);
      if (!simCheck.valid) {
        results.push({ line: i + 1, error: simCheck.error });
        continue;
      }
      const deliveryCheck = validateDeliveryContact(parts[3] || '');
      if (!deliveryCheck.valid) {
        results.push({ line: i + 1, error: `SIM Details requires delivery contact (4th column): ${deliveryCheck.error}` });
        continue;
      }
      finalDelivery = deliveryCheck.normalized;
      finalQty = 1;
      charge = parseFloat(Number(service.rate_per_1000).toFixed(2));
    } else {
      if (qty < service.min_quantity || qty > service.max_quantity) {
        results.push({ line: i + 1, error: `Quantity must be ${service.min_quantity}-${service.max_quantity}` });
        continue;
      }
      charge = parseFloat(((qty / 1000) * service.rate_per_1000).toFixed(2));
    }

    if (user.balance < charge) {
      results.push({ line: i + 1, error: `Insufficient funds (Requires Rs ${charge})` });
      continue;
    }

    const now = new Date().toISOString();

    db.exec('BEGIN IMMEDIATE TRANSACTION');
    try {
      const deductRes = db.prepare(`
        UPDATE users
        SET balance = ROUND(balance - ?, 2),
            spent = ROUND(spent + ?, 2)
        WHERE id = ? AND balance >= ?
      `).run(charge, charge, userId, charge);

      if (deductRes.changes !== 1) {
        db.exec('ROLLBACK');
        const freshUser = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId) as any;
        user.balance = freshUser?.balance || 0;
        results.push({ line: i + 1, error: `Insufficient funds (Requires Rs ${charge})` });
        continue;
      }

      const updatedUser = db.prepare('SELECT balance, spent FROM users WHERE id = ?').get(userId) as any;
      const newBal = updatedUser.balance;
      const newSpent = updatedUser.spent;

      const oId = allocateNextOrderId();
      db.prepare(`
        INSERT INTO orders (id, user_id, service_id, link, delivery_contact, quantity, charge, start_count, remains, status, mode, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'Pending', 'Manual', ?, ?)
      `).run(oId, userId, service.id, link, finalDelivery, finalQty, charge, finalQty, now, now);

      db.prepare(`
        INSERT INTO transactions (user_id, type, amount, balance_after, description, reference_id, created_at)
        VALUES (?, 'order', ?, ?, ?, ?, ?)
      `).run(userId, -charge, newBal, `Mass Order #${oId} - ${service.name}`, `ORD-${oId}`, now);

      db.exec('COMMIT');

      user.balance = newBal;
      user.spent = newSpent;

      results.push({ line: i + 1, success: true, order_id: oId, charge });
    } catch (e: any) {
      try { db.exec('ROLLBACK'); } catch {}
      results.push({ line: i + 1, error: e.message });
    }
  }

  return res.json({ results, updated_balance: user.balance });
});

// Refill Order Request
userRouter.post('/orders/:id/refill', requireAuth, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const orderId = parseInt(req.params.id, 10);

  const order = db.prepare(`
    SELECT o.id, o.status, s.refill_supported
    FROM orders o
    JOIN services s ON o.service_id = s.id
    WHERE o.id = ? AND o.user_id = ?
  `).get(orderId, userId) as any;

  if (!order) return res.status(404).json({ error: 'Order not found.' });
  if (!order.refill_supported) return res.status(400).json({ error: 'Refill is not supported for this service.' });

  db.prepare(`
    UPDATE orders
    SET refill_status = 'Requested', updated_at = ?
    WHERE id = ?
  `).run(new Date().toISOString(), orderId);

  return res.json({ success: true, message: `Refill request submitted for Order #${orderId}. Our server is checking drops.` });
});

// Cancel Order Request
userRouter.post('/orders/:id/cancel', requireAuth, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const orderId = parseInt(req.params.id, 10);

  const order = db.prepare('SELECT id, status FROM orders WHERE id = ? AND user_id = ?').get(orderId, userId) as any;
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  if (order.status !== 'Pending') {
    return res.status(400).json({ error: 'Only pending orders can be canceled prior to server processing.' });
  }

  // Process cancel and refund
  const fullOrder = db.prepare('SELECT charge FROM orders WHERE id = ?').get(orderId) as any;
  const user = db.prepare('SELECT balance, spent FROM users WHERE id = ?').get(userId) as any;
  const refundAmount = fullOrder.charge;
  const now = new Date().toISOString();
  const newBalance = user.balance + refundAmount;
  const newSpent = Math.max(0, user.spent - refundAmount);

  db.exec('BEGIN TRANSACTION');
  try {
    db.prepare("UPDATE orders SET status = 'Canceled', updated_at = ? WHERE id = ?").run(now, orderId);
    db.prepare('UPDATE users SET balance = ?, spent = ? WHERE id = ?').run(newBalance, newSpent, userId);
    db.prepare(`
      INSERT INTO transactions (user_id, type, amount, balance_after, description, reference_id, created_at)
      VALUES (?, 'refund', ?, ?, ?, ?, ?)
    `).run(userId, refundAmount, newBalance, `Refund for Canceled Order #${orderId}`, `REF-${orderId}`, now);
    db.exec('COMMIT');

    return res.json({ success: true, message: `Order #${orderId} canceled and Rs ${refundAmount.toFixed(2)} refunded to your balance.` });
  } catch (err: any) {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: 'Cancellation failed: ' + err.message });
  }
});

// ==========================================
// PAYMENT / ADD FUNDS SYSTEM
// ==========================================

// Get payment accounts info
userRouter.get('/payments/methods', (req: Request, res: Response) => {
  const settingsRows = db.prepare(`
    SELECT key, value FROM settings
    WHERE key LIKE 'easypaisa_%'
       OR key LIKE 'jazzcash_%'
       OR key LIKE 'bank_%'
       OR key LIKE 'usdt_%'
       OR key IN ('usd_pkr_rate', 'min_deposit_pkr', 'site_name', 'currency_code')
  `).all() as any[];

  const config: Record<string, string> = {};
  for (const row of settingsRows) {
    config[row.key] = row.value;
  }

  return res.json(config);
});

// Get user payment requests
userRouter.get('/payments/requests', requireAuth, (req: AuthRequest, res: Response) => {
  const requests = db.prepare(`
    SELECT * FROM payment_requests
    WHERE user_id = ?
    ORDER BY id DESC
  `).all(req.user!.id) as any[];

  return res.json({ requests });
});

// Submit manual deposit request
userRouter.post('/payments/requests', requireAuth, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { method, network, amount, trx_id, sender_account, screenshot_url } = req.body;

  const amt = parseFloat(amount);
  const cleanTrx = (trx_id || '').trim();

  if (!method || isNaN(amt) || amt <= 0 || !cleanTrx) {
    return res.status(400).json({ error: 'Payment method, amount, and Transaction ID (TRX ID) are required.' });
  }

  if (method === 'USDT' && !network) {
    return res.status(400).json({ error: 'Please specify the USDT network (BEP20 or TRC20).' });
  }

  // Check minimum deposit
  const minDepositRow = db.prepare("SELECT value FROM settings WHERE key = 'min_deposit_pkr'").get() as any;
  const minDeposit = minDepositRow ? parseFloat(minDepositRow.value) : 100;
  if (amt < minDeposit) {
    return res.status(400).json({ error: `Minimum deposit amount is Rs ${minDeposit}.` });
  }

  // Check if TRX ID already submitted
  const existingTrx = db.prepare('SELECT id FROM payment_requests WHERE trx_id = ?').get(cleanTrx) as any;
  if (existingTrx) {
    return res.status(400).json({ error: 'This Transaction ID (TRX ID) has already been submitted.' });
  }

  const now = new Date().toISOString();
  try {
    const result = db.prepare(`
      INSERT INTO payment_requests (user_id, method, network, amount, trx_id, sender_account, screenshot_url, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(userId, method, network || null, amt, cleanTrx, sender_account || '', screenshot_url || '', now);

    return res.status(201).json({
      success: true,
      request_id: Number(result.lastInsertRowid),
      message: 'Deposit request submitted successfully! An administrator will verify and approve your balance shortly.'
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to submit payment request: ' + err.message });
  }
});

// ==========================================
// TRANSACTIONS & REFERRALS
// ==========================================

// Get user transaction history
userRouter.get('/transactions', requireAuth, (req: AuthRequest, res: Response) => {
  const transactions = db.prepare(`
    SELECT * FROM transactions
    WHERE user_id = ?
    ORDER BY id DESC
    LIMIT 100
  `).all(req.user!.id) as any[];

  return res.json({ transactions });
});

// Get referral details & earnings
userRouter.get('/referrals', requireAuth, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const user = req.user!;

  const refPercentRow = db.prepare("SELECT value FROM settings WHERE key = 'referral_percent'").get() as any;
  const commissionRate = refPercentRow ? parseFloat(refPercentRow.value) : 5.0;

  const referredUsers = db.prepare(`
    SELECT id, username, email, created_at, spent
    FROM users
    WHERE referred_by = ?
    ORDER BY id DESC
  `).all(userId) as any[];

  const totalReferrals = referredUsers.length;
  const totalSpentByReferrals = referredUsers.reduce((sum, u) => sum + (u.spent || 0), 0);
  const totalCommissionEarned = parseFloat(((totalSpentByReferrals * commissionRate) / 100).toFixed(2));

  return res.json({
    referral_code: user.referral_code,
    commission_rate: commissionRate,
    total_referrals: totalReferrals,
    total_earnings: totalCommissionEarned,
    referred_users: referredUsers.map(u => ({
      id: u.id,
      username: u.username.substring(0, 3) + '***',
      created_at: u.created_at,
      contribution: parseFloat(((u.spent * commissionRate) / 100).toFixed(2))
    }))
  });
});

// ==========================================
// SUPPORT TICKETS
// ==========================================

// List tickets
userRouter.get('/tickets', requireAuth, (req: AuthRequest, res: Response) => {
  const tickets = db.prepare(`
    SELECT * FROM support_tickets
    WHERE user_id = ?
    ORDER BY updated_at DESC
  `).all(req.user!.id) as any[];

  return res.json({ tickets });
});

// Create ticket
userRouter.post('/tickets', requireAuth, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { subject, category, priority, order_id, message } = req.body;

  if (!subject || !message) {
    return res.status(400).json({ error: 'Subject and initial message are required.' });
  }

  const now = new Date().toISOString();
  db.exec('BEGIN TRANSACTION');
  try {
    const result = db.prepare(`
      INSERT INTO support_tickets (user_id, subject, category, priority, order_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'open', ?, ?)
    `).run(userId, subject, category || 'Order', priority || 'normal', order_id ? Number(order_id) : null, now, now);

    const ticketId = Number(result.lastInsertRowid);

    db.prepare(`
      INSERT INTO ticket_messages (ticket_id, sender_id, sender_role, message, created_at)
      VALUES (?, ?, 'user', ?, ?)
    `).run(ticketId, userId, message, now);

    db.exec('COMMIT');

    return res.status(201).json({ success: true, ticket_id: ticketId, message: 'Ticket opened successfully.' });
  } catch (err: any) {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: 'Ticket creation failed: ' + err.message });
  }
});

// Get ticket details and messages
userRouter.get('/tickets/:id', requireAuth, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const ticketId = parseInt(req.params.id, 10);

  const ticket = db.prepare(`
    SELECT * FROM support_tickets
    WHERE id = ? AND (user_id = ? OR ? = 'admin')
  `).get(ticketId, userId, req.user!.role) as any;

  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const messages = db.prepare(`
    SELECT tm.*, u.username as sender_username
    FROM ticket_messages tm
    JOIN users u ON tm.sender_id = u.id
    WHERE tm.ticket_id = ?
    ORDER BY tm.id ASC
  `).all(ticketId) as any[];

  return res.json({ ticket, messages });
});

// Reply to ticket
userRouter.post('/tickets/:id/messages', requireAuth, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const role = req.user!.role;
  const ticketId = parseInt(req.params.id, 10);
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message cannot be empty.' });
  }

  const ticket = db.prepare(`
    SELECT * FROM support_tickets
    WHERE id = ? AND (user_id = ? OR ? = 'admin')
  `).get(ticketId, userId, role) as any;

  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

  const now = new Date().toISOString();
  const nextStatus = role === 'admin' ? 'answered' : 'open';

  db.exec('BEGIN TRANSACTION');
  try {
    db.prepare(`
      INSERT INTO ticket_messages (ticket_id, sender_id, sender_role, message, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(ticketId, userId, role, message.trim(), now);

    db.prepare(`
      UPDATE support_tickets
      SET status = ?, updated_at = ?
      WHERE id = ?
    `).run(nextStatus, now, ticketId);

    db.exec('COMMIT');

    return res.json({ success: true, message: 'Reply sent successfully.' });
  } catch (err: any) {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: 'Failed to send reply: ' + err.message });
  }
});

// Close ticket
userRouter.put('/tickets/:id/close', requireAuth, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const ticketId = parseInt(req.params.id, 10);

  const ticket = db.prepare(`
    SELECT * FROM support_tickets
    WHERE id = ? AND (user_id = ? OR ? = 'admin')
  `).get(ticketId, userId, req.user!.role) as any;

  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });

  db.prepare(`
    UPDATE support_tickets
    SET status = 'closed', updated_at = ?
    WHERE id = ?
  `).run(new Date().toISOString(), ticketId);

  return res.json({ success: true, message: 'Ticket closed successfully.' });
});

// ==========================================
// ANNOUNCEMENTS & PLATFORM STATS
// ==========================================

userRouter.get('/announcements', (req: Request, res: Response) => {
  const announcements = db.prepare(`
    SELECT * FROM announcements
    WHERE active = 1
    ORDER BY id DESC
  `).all() as any[];

  return res.json({ announcements });
});

userRouter.get('/stats', (req: Request, res: Response) => {
  const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get() as any;
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
  const activeServices = db.prepare("SELECT COUNT(*) as count FROM services WHERE status = 'active'").get() as any;

  return res.json({
    total_orders_served: 284190 + (totalOrders.count || 0),
    registered_users: 14200 + (totalUsers.count || 0),
    active_services: activeServices.count || 0,
    satisfaction_rate: '99.4%'
  });
});

// Public contact form
userRouter.post('/contact', (req: Request, res: Response) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  // Record into audit log or store message
  return res.json({
    success: true,
    message: 'Thank you for reaching out! Our Pakistani support team will reply to your email within 2-4 hours.'
  });
});
