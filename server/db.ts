import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import path from 'node:path';

const DB_PATH = path.resolve(process.cwd(), 'pakservices.db');
export const db = new DatabaseSync(DB_PATH);

// Helper for hashing passwords securely with salt
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === key;
  } catch {
    return false;
  }
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateApiKey(): string {
  return 'pak_' + crypto.randomBytes(24).toString('hex');
}

export function generateReferralCode(): string {
  return 'PAK' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Initialize tables
export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      balance REAL NOT NULL DEFAULT 0.0,
      spent REAL NOT NULL DEFAULT 0.0,
      status TEXT NOT NULL DEFAULT 'active',
      api_key TEXT UNIQUE,
      referral_code TEXT UNIQUE NOT NULL,
      referred_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL,
      timezone TEXT DEFAULT 'Asia/Karachi',
      currency TEXT DEFAULT 'PKR',
      theme TEXT DEFAULT 'midnight'
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      name TEXT NOT NULL,
      type TEXT DEFAULT 'Default',
      rate_per_1000 REAL NOT NULL,
      min_quantity INTEGER NOT NULL DEFAULT 10,
      max_quantity INTEGER NOT NULL DEFAULT 100000,
      description TEXT,
      provider_id INTEGER REFERENCES providers(id),
      provider_service_id TEXT,
      refill_supported INTEGER DEFAULT 1,
      cancel_supported INTEGER DEFAULT 0,
      dripfeed_supported INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      service_id INTEGER NOT NULL REFERENCES services(id),
      link TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      charge REAL NOT NULL,
      start_count INTEGER DEFAULT 0,
      remains INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending',
      mode TEXT DEFAULT 'Manual',
      provider_order_id TEXT,
      refill_status TEXT DEFAULT 'None',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      balance_after REAL NOT NULL,
      description TEXT NOT NULL,
      reference_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      method TEXT NOT NULL,
      amount REAL NOT NULL,
      trx_id TEXT NOT NULL,
      sender_account TEXT,
      screenshot_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      admin_notes TEXT,
      created_at TEXT NOT NULL,
      processed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS support_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      subject TEXT NOT NULL,
      category TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'normal',
      order_id INTEGER,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ticket_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL REFERENCES support_tickets(id),
      sender_id INTEGER NOT NULL REFERENCES users(id),
      sender_role TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS providers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      api_url TEXT NOT NULL,
      api_key TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      balance TEXT DEFAULT '0.00',
      currency TEXT DEFAULT 'USD',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      provider_id INTEGER,
      action TEXT NOT NULL,
      request_payload TEXT,
      response_payload TEXT,
      status_code INTEGER,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT,
      details TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_favorites (
      user_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      PRIMARY KEY (user_id, service_id)
    );
  `);

  try {
    db.exec(`ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'midnight';`);
  } catch {}

  try {
    db.exec(`ALTER TABLE payment_requests ADD COLUMN network TEXT;`);
  } catch {}

  seedInitialData();
}

function seedInitialData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    const now = new Date().toISOString();
    
    // Seed Admin
    const adminHash = hashPassword('admin123');
    const adminApiKey = generateApiKey();
    db.prepare(`
      INSERT INTO users (email, username, password_hash, role, balance, spent, status, api_key, referral_code, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('admin@pakservices.com', 'admin', adminHash, 'admin', 50000.0, 0.0, 'active', adminApiKey, 'PAKADMIN', now);

    // Seed Demo User
    const userHash = hashPassword('user123');
    const userApiKey = generateApiKey();
    db.prepare(`
      INSERT INTO users (email, username, password_hash, role, balance, spent, status, api_key, referral_code, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('user@pakservices.com', 'demo_reseller', userHash, 'user', 4500.0, 1250.0, 'active', userApiKey, 'PAKRESELL', now);

    // Seed Demo Transaction
    db.prepare(`
      INSERT INTO transactions (user_id, type, amount, balance_after, description, reference_id, created_at)
      VALUES (2, 'deposit', 5000.0, 5000.0, 'Initial JazzCash Deposit - Welcome Credit', 'TRX-98218731', ?)
    `).run(now);

    db.prepare(`
      INSERT INTO transactions (user_id, type, amount, balance_after, description, reference_id, created_at)
      VALUES (2, 'order', -500.0, 4500.0, 'Order #101 - Instagram High Quality Followers', 'ORD-101', ?)
    `).run(now);
  }

  const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (categoryCount.count === 0) {
    const categories = [
      { name: 'Instagram', icon: 'Instagram', sort_order: 1 },
      { name: 'TikTok', icon: 'Video', sort_order: 2 },
      { name: 'YouTube', icon: 'Youtube', sort_order: 3 },
      { name: 'Facebook', icon: 'Facebook', sort_order: 4 },
      { name: 'Telegram', icon: 'Send', sort_order: 5 },
      { name: 'Twitter/X', icon: 'Twitter', sort_order: 6 },
      { name: 'Spotify', icon: 'Music', sort_order: 7 },
      { name: 'Website Traffic', icon: 'Globe', sort_order: 8 }
    ];

    const insertCat = db.prepare('INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)');
    for (const cat of categories) {
      insertCat.run(cat.name, cat.icon, cat.sort_order);
    }

    // Seed Services
    const initialServices = [
      // Instagram (Category 1)
      { cat: 1, name: 'Instagram Followers [HQ Real - 30 Days Refill - Non-Drop]', rate: 299.0, min: 50, max: 100000, desc: 'High quality worldwide accounts with profile pictures and posts. Instant start, speed 10K-30K/day. 30 days refill button enabled.' },
      { cat: 1, name: 'Instagram Pakistani Followers [Organic Target - Active]', rate: 750.0, min: 100, max: 20000, desc: '100% targeted Pakistani audiences. Realistic usernames and bio descriptions. Good for local brands and influencers.' },
      { cat: 1, name: 'Instagram Likes [Instant - Super Fast - High Retention]', rate: 45.0, min: 50, max: 50000, desc: 'Instant delivery starts within 60 seconds. Guaranteed delivery with zero drop.' },
      { cat: 1, name: 'Instagram Reels Views [Viral Boost - High Watch Time]', rate: 15.0, min: 100, max: 1000000, desc: 'Boosts Instagram algorithm reach and Explore page visibility. Speed 500K/day.' },
      { cat: 1, name: 'Instagram Custom Comments [Positive English/Urdu]', rate: 850.0, min: 10, max: 5000, desc: 'Enter 1 comment per line. Realistic verified-looking active accounts.' },

      // TikTok (Category 2)
      { cat: 2, name: 'TikTok Video Views [For You Page FYP Algorithm Trigger]', rate: 12.0, min: 1000, max: 5000000, desc: 'Instant start. High retention views that push videos onto the TikTok FYP recommendation engine.' },
      { cat: 2, name: 'TikTok Followers [Organic Mixed - 30 Days Guarantee]', rate: 380.0, min: 50, max: 50000, desc: 'Start: 0-1 hour. Non-drop followers to unlock TikTok LIVE studio and bio link permissions.' },
      { cat: 2, name: 'TikTok Likes [Fast Delivery - Zero Drop]', rate: 95.0, min: 50, max: 100000, desc: 'Real user accounts, high engagement metrics.' },
      { cat: 2, name: 'TikTok Shares & Saves [Combo Boost]', rate: 65.0, min: 100, max: 50000, desc: 'Essential signal for TikTok algorithm to rank videos on top hashtags.' },

      // YouTube (Category 3)
      { cat: 3, name: 'YouTube Monetization WatchTime [4000 Hours Package - 15min+ Video]', rate: 4200.0, min: 1000, max: 4000, desc: 'Requires video length of 15-60 minutes. 100% safe for channel monetization compliance. Lifetime warranty.' },
      { cat: 3, name: 'YouTube Subscribers [Non-Drop - Real Active - Lifetime Refill]', rate: 1150.0, min: 50, max: 10000, desc: 'Natural delivery curve of 100-300 subs/day to keep channel safe from YouTube cleanups.' },
      { cat: 3, name: 'YouTube Views [High Retention - Suggested Videos]', rate: 290.0, min: 500, max: 200000, desc: 'View duration 3-8 minutes. Traffic source from YouTube Suggested and Browse features.' },
      { cat: 3, name: 'YouTube Likes [Instant - 100% Safe]', rate: 120.0, min: 50, max: 50000, desc: 'High quality YouTube likes from clean IP residential pools.' },

      // Facebook (Category 4)
      { cat: 4, name: 'Facebook Page Likes & Followers [Non-Drop - Global]', rate: 480.0, min: 100, max: 50000, desc: 'Increases both Page Likes and Followers simultaneously. Good for business trust.' },
      { cat: 4, name: 'Facebook Video Views [3-Second Monetizable]', rate: 40.0, min: 500, max: 500000, desc: 'Great for Facebook in-stream ads eligibility requirements (60,000 minutes).' },
      { cat: 4, name: 'Facebook Post Reactions [Love, Care, Wow, Haha Mix]', rate: 110.0, min: 50, max: 10000, desc: 'Specify reaction type or default mix. Fast start.' },

      // Telegram (Category 5)
      { cat: 5, name: 'Telegram Channel Members [Non-Drop - 60 Days Refill]', rate: 220.0, min: 50, max: 50000, desc: 'High quality worldwide members. Zero drop guarantee for 60 days.' },
      { cat: 5, name: 'Telegram Post Views [Last 10 Posts - Auto Speed]', rate: 25.0, min: 100, max: 100000, desc: 'Distributes views across recent 10 messages in your public channel.' },

      // Twitter/X (Category 6)
      { cat: 6, name: 'Twitter/X Followers [Global High Quality - Fast Start]', rate: 580.0, min: 100, max: 25000, desc: 'Fast delivery, clean accounts with profile images and banners.' },
      { cat: 6, name: 'Twitter/X Retweets & Likes [Engagement Combo]', rate: 320.0, min: 50, max: 10000, desc: 'Instant boost to trending tweets.' },

      // Spotify (Category 7)
      { cat: 7, name: 'Spotify Track Plays [Premium USA/UK Streams - Royalty Eligible]', rate: 190.0, min: 1000, max: 500000, desc: 'Real streams eligible for distributor royalties (Distrokid, TuneCore, CDBaby).' },
      { cat: 7, name: 'Spotify Monthly Listeners [Algorithm Trigger]', rate: 390.0, min: 500, max: 50000, desc: 'Increases monthly active listener count to trigger Spotify Radio and Discover Weekly.' },

      // Website Traffic (Category 8)
      { cat: 8, name: 'Website Targeted Traffic [Pakistan Visitors - Low Bounce - AdSense Safe]', rate: 140.0, min: 1000, max: 100000, desc: 'Real Pakistani IP residential visitors. Time on site 1-3 minutes. Google Analytics trackable.' },
      { cat: 8, name: 'Website Global Traffic [USA/Europe Tier 1 - High Duration]', rate: 95.0, min: 1000, max: 1000000, desc: 'Tier 1 traffic from search engines (Organic keywords referrers).' }
    ];

    const insertServ = db.prepare(`
      INSERT INTO services (category_id, name, type, rate_per_1000, min_quantity, max_quantity, description, refill_supported, cancel_supported)
      VALUES (?, ?, 'Default', ?, ?, ?, ?, 1, 0)
    `);

    for (const s of initialServices) {
      insertServ.run(s.cat, s.name, s.rate, s.min, s.max, s.desc);
    }
  }

  // Seed sample provider
  const provCount = db.prepare('SELECT COUNT(*) as count FROM providers').get() as { count: number };
  if (provCount.count === 0) {
    db.prepare(`
      INSERT INTO providers (name, api_url, api_key, status, balance, currency, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('Global SMM Master Gateway', 'https://api.globalsmm.demo/v2', 'prov_live_sec_8917238129', 'active', '384.20', 'USD', new Date().toISOString());
  }

  // Seed initial settings
  const settingsList = [
    { key: 'site_name', value: 'PakServices' },
    { key: 'site_tagline', value: 'Premier SMM Reseller Panel & Growth Engine' },
    { key: 'currency_code', value: 'PKR' },
    { key: 'usd_pkr_rate', value: '280.0' },
    { key: 'referral_percent', value: '5.0' },
    
    // Easypaisa
    { key: 'easypaisa_enabled', value: '1' },
    { key: 'easypaisa_number', value: '0312-3456789' },
    { key: 'easypaisa_title', value: 'PakServices / Muhammad Ali' },
    { key: 'easypaisa_qr', value: '' },
    { key: 'easypaisa_instructions', value: 'Send exact funds via Easypaisa App or *786#. After transferring, enter the 11-digit TID and upload your screenshot.' },
    
    // JazzCash
    { key: 'jazzcash_enabled', value: '1' },
    { key: 'jazzcash_number', value: '0300-9876543' },
    { key: 'jazzcash_title', value: 'PakServices / Muhammad Ali' },
    { key: 'jazzcash_qr', value: '' },
    { key: 'jazzcash_instructions', value: 'Send exact funds via JazzCash App or *786#. After transferring, enter the 12-digit TID and upload your screenshot.' },
    
    // Bank Transfer
    { key: 'bank_enabled', value: '1' },
    { key: 'bank_name', value: 'Meezan Bank Limited' },
    { key: 'bank_account_number', value: '0102-010203040506' },
    { key: 'bank_account_title', value: 'PakServices Digital Technologies SMC-Pvt Ltd' },
    { key: 'bank_iban', value: 'PK45MEZN0001020102030405' },
    { key: 'bank_branch', value: 'Main Commercial Branch Karachi' },
    { key: 'bank_qr', value: '' },
    { key: 'bank_instructions', value: 'Transfer funds using your bank app via Raast ID, 1Link, or IBFT. Enter bank reference number and upload receipt.' },
    
    // USDT Global & Networks (BEP20 & TRC20 independent)
    { key: 'usdt_enabled', value: '1' },
    { key: 'usdt_bep20_enabled', value: '1' },
    { key: 'usdt_bep20_address', value: '0x88923a41b2c4e511796b4f74d06a92849b21f92e' },
    { key: 'usdt_bep20_qr', value: '' },
    { key: 'usdt_bep20_instructions', value: 'Transfer USDT only via BNB Smart Chain (BEP20). Funds sent on wrong networks cannot be recovered.' },
    
    { key: 'usdt_trc20_enabled', value: '1' },
    { key: 'usdt_trc20_address', value: 'TXnp9zR8XqW3kmLgP7bK2m9vT5rQ1j8sF' },
    { key: 'usdt_trc20_qr', value: '' },
    { key: 'usdt_trc20_instructions', value: 'Transfer USDT only via TRON (TRC20) network. Ensure transaction is confirmed before submitting hash.' },
    
    { key: 'support_whatsapp', value: '+92 312 3456789' },
    { key: 'support_telegram', value: '@PakServicesOfficial' },
    { key: 'support_email', value: 'support@pakservices.com' },
    { key: 'min_deposit_pkr', value: '100' }
  ];

  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const set of settingsList) {
    insertSetting.run(set.key, set.value);
  }

  // Seed announcements
  const annCount = db.prepare('SELECT COUNT(*) as count FROM announcements').get() as { count: number };
  if (annCount.count === 0) {
    db.prepare(`
      INSERT INTO announcements (title, content, type, active, created_at)
      VALUES (?, ?, ?, 1, ?)
    `).run(
      'Instant Auto-Approvals for Easypaisa & JazzCash Deposits!',
      'Our payment gateway verification queue is actively monitored 24/7. Submit your 11-digit TRX ID after sending funds to get credited within 2-5 minutes.',
      'success',
      new Date().toISOString()
    );

    db.prepare(`
      INSERT INTO announcements (title, content, type, active, created_at)
      VALUES (?, ?, ?, 1, ?)
    `).run(
      'Instagram Algorithm Update Notice',
      'All Instagram Non-Drop servers have been upgraded to the newest API protocol. High-speed delivery with guaranteed 30-day refill is fully restored.',
      'info',
      new Date().toISOString()
    );
  }

  // Seed initial orders for demo user
  const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders').get() as { count: number };
  if (orderCount.count === 0) {
    const now = new Date();
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const twoDaysAgo = new Date(Date.now() - 172800000).toISOString();

    db.prepare(`
      INSERT INTO orders (id, user_id, service_id, link, quantity, charge, start_count, remains, status, mode, created_at, updated_at)
      VALUES (101, 2, 1, 'https://instagram.com/pak_influencer_hub', 1000, 299.0, 1420, 0, 'Completed', 'Auto', ?, ?)
    `).run(twoDaysAgo, twoDaysAgo);

    db.prepare(`
      INSERT INTO orders (id, user_id, service_id, link, quantity, charge, start_count, remains, status, mode, created_at, updated_at)
      VALUES (102, 2, 6, 'https://tiktok.com/@growth_creator/video/7381920192', 10000, 120.0, 850, 2400, 'In progress', 'Auto', ?, ?)
    `).run(yesterday, yesterday);

    db.prepare(`
      INSERT INTO orders (id, user_id, service_id, link, quantity, charge, start_count, remains, status, mode, created_at, updated_at)
      VALUES (103, 2, 11, 'https://youtube.com/@TechTalkPakistan', 100, 115.0, 310, 100, 'Pending', 'Manual', ?, ?)
    `).run(now.toISOString(), now.toISOString());

    // Seed Demo Support Ticket
    db.prepare(`
      INSERT INTO support_tickets (id, user_id, subject, category, priority, order_id, status, created_at, updated_at)
      VALUES (501, 2, 'Speed inquiry on Order #102 TikTok Views', 'Order', 'normal', 102, 'answered', ?, ?)
    `).run(yesterday, now.toISOString());

    db.prepare(`
      INSERT INTO ticket_messages (ticket_id, sender_id, sender_role, message, created_at)
      VALUES (501, 2, 'user', 'Hi PakServices support, how long will it take for the remaining 2.4k views on order #102 to finish delivering?', ?)
    `).run(yesterday);

    db.prepare(`
      INSERT INTO ticket_messages (ticket_id, sender_id, sender_role, message, created_at)
      VALUES (501, 1, 'admin', 'Hello! Our high-speed server delivers TikTok views gradually to simulate natural viral discovery. It will complete within 30-45 minutes. Thank you for choosing PakServices!', ?)
    `).run(now.toISOString());

    // Seed Demo Payment Request
    db.prepare(`
      INSERT INTO payment_requests (user_id, method, amount, trx_id, sender_account, status, admin_notes, created_at, processed_at)
      VALUES (2, 'JazzCash', 5000.0, 'TRX-98218731', '03001234567', 'approved', 'Verified and credited via JazzCash SMS receipt.', ?, ?)
    `).run(twoDaysAgo, twoDaysAgo);

    db.prepare(`
      INSERT INTO payment_requests (user_id, method, amount, trx_id, sender_account, status, admin_notes, created_at)
      VALUES (2, 'Easypaisa', 1500.0, 'TRX-99882211', '03129876543', 'pending', 'Awaiting verification', ?)
    `).run(now.toISOString());
  }
}
