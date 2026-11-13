import express, { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import dotenv from "dotenv";
import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
// server/db.ts
function resolveDatabasePath() {
	if (process.env.DATABASE_PATH && process.env.DATABASE_PATH.trim()) {
		const customPath = path.resolve(process.env.DATABASE_PATH.trim());
		const dir = path.dirname(customPath);
		if (!fs.existsSync(dir)) try {
			fs.mkdirSync(dir, { recursive: true });
		} catch (e) {
			console.warn("Could not create custom DATABASE_PATH directory:", e);
		}
		const localDefault = path.resolve(process.cwd(), "pakservices.db");
		if (!fs.existsSync(customPath) && fs.existsSync(localDefault)) try {
			fs.copyFileSync(localDefault, customPath);
			console.log(`📦 Safely migrated existing database to persistent path: ${customPath}`);
		} catch (e) {
			console.error("Failed to migrate database to persistent path:", e);
		}
		return customPath;
	}
	if (process.env.DATA_DIR && process.env.DATA_DIR.trim()) {
		const dir = path.resolve(process.env.DATA_DIR.trim());
		if (!fs.existsSync(dir)) try {
			fs.mkdirSync(dir, { recursive: true });
		} catch (e) {
			console.warn("Could not create DATA_DIR:", e);
		}
		const targetPath = path.join(dir, "pakservices.db");
		const localDefault = path.resolve(process.cwd(), "pakservices.db");
		if (!fs.existsSync(targetPath) && fs.existsSync(localDefault)) try {
			fs.copyFileSync(localDefault, targetPath);
			console.log(`📦 Safely migrated existing database to DATA_DIR: ${targetPath}`);
		} catch (e) {
			console.error("Failed to migrate database to DATA_DIR:", e);
		}
		return targetPath;
	}
	const parentStorage = path.resolve(process.cwd(), "..", "pakservices_storage");
	if (fs.existsSync(parentStorage)) {
		const parentDb = path.join(parentStorage, "pakservices.db");
		const localDefault = path.resolve(process.cwd(), "pakservices.db");
		if (!fs.existsSync(parentDb) && fs.existsSync(localDefault)) try {
			fs.copyFileSync(localDefault, parentDb);
		} catch {}
		return parentDb;
	}
	return path.resolve(process.cwd(), "pakservices.db");
}
var DB_PATH = resolveDatabasePath();
console.log(`📁 Connected to database: ${DB_PATH}`);
var db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA busy_timeout = 5000;");
function getGlobalTheme() {
	const val = db.prepare("SELECT value FROM settings WHERE key = 'global_theme'").get()?.value;
	if (val === "midnight" || val === "crystal" || val === "neon") return val;
	return "midnight";
}
function setGlobalTheme(theme) {
	db.prepare(`
    INSERT INTO settings (key, value) VALUES ('global_theme', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(theme);
	return theme;
}
function getOrderSequenceInfo() {
	const stats = db.prepare("SELECT COALESCE(MAX(id), 0) as max_id, COUNT(*) as total FROM orders").get();
	const row = db.prepare("SELECT value FROM settings WHERE key = 'next_order_id'").get();
	let nextId = row ? parseInt(row.value, 10) : stats.max_id + 1;
	if (!Number.isInteger(nextId) || nextId < 1) nextId = stats.max_id + 1;
	const existsStmt = db.prepare("SELECT 1 FROM orders WHERE id = ?");
	while (existsStmt.get(nextId)) nextId++;
	return {
		next_order_id: nextId,
		max_order_id: stats.max_id || 0,
		total_orders: stats.total || 0
	};
}
function setNextOrderId(nextId) {
	db.prepare(`
    INSERT INTO settings (key, value) VALUES ('next_order_id', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(String(nextId));
	return nextId;
}
function allocateNextOrderId() {
	const row = db.prepare("SELECT value FROM settings WHERE key = 'next_order_id'").get();
	const maxRow = db.prepare("SELECT COALESCE(MAX(id), 0) as max_id FROM orders").get();
	let candidate = row ? parseInt(row.value, 10) : maxRow.max_id + 1;
	if (!Number.isInteger(candidate) || candidate < 1) candidate = maxRow.max_id + 1;
	const existsStmt = db.prepare("SELECT 1 FROM orders WHERE id = ?");
	while (existsStmt.get(candidate)) candidate++;
	db.prepare(`
    INSERT INTO settings (key, value) VALUES ('next_order_id', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(String(candidate + 1));
	return candidate;
}
function hashPassword(password) {
	const salt = crypto.randomBytes(16).toString("hex");
	return `${salt}:${crypto.pbkdf2Sync(password, salt, 1e3, 64, "sha512").toString("hex")}`;
}
function verifyPassword(password, storedHash) {
	try {
		const [salt, key] = storedHash.split(":");
		if (!salt || !key) return false;
		return crypto.pbkdf2Sync(password, salt, 1e3, 64, "sha512").toString("hex") === key;
	} catch {
		return false;
	}
}
function generateToken() {
	return crypto.randomBytes(32).toString("hex");
}
function generateReferralCode() {
	return "PAK" + crypto.randomBytes(4).toString("hex").toUpperCase();
}
function getBackupsDirectory() {
	const baseDir = path.dirname(DB_PATH);
	const backupDir = path.join(baseDir, "backups");
	if (!fs.existsSync(backupDir)) try {
		fs.mkdirSync(backupDir, { recursive: true });
	} catch {
		const cwdBackups = path.resolve(process.cwd(), "backups");
		if (!fs.existsSync(cwdBackups)) try {
			fs.mkdirSync(cwdBackups, { recursive: true });
		} catch {}
		return cwdBackups;
	}
	return backupDir;
}
function createDatabaseBackup(label = "snapshot") {
	try {
		if (!fs.existsSync(DB_PATH)) return {
			success: false,
			filename: "",
			path: "",
			size: 0
		};
		if (fs.statSync(DB_PATH).size === 0) return {
			success: false,
			filename: "",
			path: "",
			size: 0
		};
		const backupDir = getBackupsDirectory();
		const filename = `pakservices_${label}_${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}.db`;
		const targetPath = path.join(backupDir, filename);
		try {
			db.exec("PRAGMA wal_checkpoint(PASSIVE);");
		} catch {}
		fs.copyFileSync(DB_PATH, targetPath);
		const backupStat = fs.statSync(targetPath);
		console.log(`🛡️ Database Backup preserved: ${filename} (${(backupStat.size / 1024).toFixed(1)} KB)`);
		try {
			const files = fs.readdirSync(backupDir).filter((f) => f.startsWith("pakservices_") && f.endsWith(".db")).map((f) => ({
				name: f,
				time: fs.statSync(path.join(backupDir, f)).mtimeMs
			})).sort((a, b) => b.time - a.time);
			if (files.length > 20) for (const oldFile of files.slice(20)) try {
				fs.unlinkSync(path.join(backupDir, oldFile.name));
			} catch {}
		} catch {}
		return {
			success: true,
			filename,
			path: targetPath,
			size: backupStat.size
		};
	} catch (err) {
		console.error("Failed to create database backup:", err);
		return {
			success: false,
			filename: "",
			path: "",
			size: 0
		};
	}
}
function listDatabaseBackups() {
	try {
		const backupDir = getBackupsDirectory();
		if (!fs.existsSync(backupDir)) return [];
		return fs.readdirSync(backupDir).filter((f) => f.startsWith("pakservices_") && f.endsWith(".db")).map((f) => {
			const full = path.join(backupDir, f);
			const stat = fs.statSync(full);
			return {
				filename: f,
				size: stat.size,
				sizeFormatted: `${(stat.size / 1024).toFixed(1)} KB`,
				createdAt: stat.mtime.toISOString()
			};
		}).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
	} catch {
		return [];
	}
}
function getDatabaseStats() {
	try {
		let size = 0;
		let exists = false;
		if (fs.existsSync(DB_PATH)) {
			exists = true;
			size = fs.statSync(DB_PATH).size;
		}
		const users = db.prepare("SELECT COUNT(*) as count FROM users").get();
		const orders = db.prepare("SELECT COUNT(*) as count FROM orders").get();
		const transactions = db.prepare("SELECT COUNT(*) as count FROM transactions").get();
		const payments = db.prepare("SELECT COUNT(*) as count FROM payment_requests").get();
		const services = db.prepare("SELECT COUNT(*) as count FROM services").get();
		const settings = db.prepare("SELECT COUNT(*) as count FROM settings").get();
		const revenue = db.prepare("SELECT SUM(amount) as total FROM payment_requests WHERE status = 'approved'").get();
		const backups = listDatabaseBackups();
		return {
			exists,
			path: DB_PATH,
			size_bytes: size,
			size_formatted: `${(size / 1024).toFixed(1)} KB`,
			is_custom_path: Boolean(process.env.DATABASE_PATH || process.env.DATA_DIR),
			storage_type: process.env.DATABASE_PATH || process.env.DATA_DIR ? "Persistent Custom Path" : "Default Directory Path",
			users_count: users?.count || 0,
			orders_count: orders?.count || 0,
			transactions_count: transactions?.count || 0,
			payments_count: payments?.count || 0,
			services_count: services?.count || 0,
			settings_count: settings?.count || 0,
			total_revenue: revenue?.total || 0,
			total_backups: backups.length,
			latest_backup: backups[0] || null
		};
	} catch (err) {
		return {
			exists: false,
			path: DB_PATH,
			error: err.message
		};
	}
}
function exportDatabaseJson() {
	const users = db.prepare("SELECT id, email, username, role, balance, spent, status, referral_code, created_at, timezone, currency, theme FROM users").all();
	const orders = db.prepare("SELECT * FROM orders").all();
	const transactions = db.prepare("SELECT * FROM transactions").all();
	const payment_requests = db.prepare("SELECT * FROM payment_requests").all();
	const services = db.prepare("SELECT * FROM services").all();
	const categories = db.prepare("SELECT * FROM categories").all();
	const providers = db.prepare("SELECT id, name, api_url, status, balance, currency, created_at FROM providers").all();
	const settings = db.prepare("SELECT * FROM settings").all();
	const announcements = db.prepare("SELECT * FROM announcements").all();
	return {
		export_timestamp: (/* @__PURE__ */ new Date()).toISOString(),
		database_path: DB_PATH,
		counts: {
			users: users.length,
			orders: orders.length,
			transactions: transactions.length,
			payments: payment_requests.length,
			services: services.length
		},
		data: {
			users,
			orders,
			transactions,
			payment_requests,
			services,
			categories,
			providers,
			settings,
			announcements
		}
	};
}
function initDb() {
	try {
		if (fs.existsSync(DB_PATH) && fs.statSync(DB_PATH).size > 0) createDatabaseBackup("startup");
	} catch (backupErr) {
		console.warn("Startup backup skipped:", backupErr);
	}
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
	try {
		db.exec(`ALTER TABLE categories ADD COLUMN description TEXT;`);
	} catch {}
	try {
		db.exec(`ALTER TABLE categories ADD COLUMN image_url TEXT;`);
	} catch {}
	try {
		if (!db.prepare(`PRAGMA table_info(orders)`).all().some((c) => c.name === "delivery_contact")) db.exec(`ALTER TABLE orders ADD COLUMN delivery_contact TEXT;`);
	} catch {}
	seedInitialData();
}
function getUploadsDirectory() {
	const baseDir = process.env.DATA_DIR || path.dirname(DB_PATH);
	const uploadsDir = path.join(baseDir, "uploads", "categories");
	if (!fs.existsSync(uploadsDir)) try {
		fs.mkdirSync(uploadsDir, { recursive: true });
	} catch {
		const cwdUploads = path.resolve(process.cwd(), "uploads", "categories");
		if (!fs.existsSync(cwdUploads)) try {
			fs.mkdirSync(cwdUploads, { recursive: true });
		} catch {}
		return cwdUploads;
	}
	return uploadsDir;
}
function seedInitialData() {
	if (db.prepare("SELECT COUNT(*) as count FROM users").get().count > 0 || process.env.DISABLE_SEED === "true") {
		ensureDefaultSettings();
		return;
	}
	const now = (/* @__PURE__ */ new Date()).toISOString();
	const adminHash = hashPassword("admin123");
	db.prepare(`
      INSERT INTO users (email, username, password_hash, role, balance, spent, status, referral_code, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run("admin@pakservices.com", "admin", adminHash, "admin", 5e4, 0, "active", "PAKADMIN", now);
	const userHash = hashPassword("user123");
	db.prepare(`
      INSERT INTO users (email, username, password_hash, role, balance, spent, status, referral_code, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run("user@pakservices.com", "demo_reseller", userHash, "user", 4500, 1250, "active", "PAKRESELL", now);
	db.prepare(`
      INSERT INTO transactions (user_id, type, amount, balance_after, description, reference_id, created_at)
      VALUES (2, 'deposit', 5000.0, 5000.0, 'Initial JazzCash Deposit - Welcome Credit', 'TRX-98218731', ?)
    `).run(now);
	db.prepare(`
      INSERT INTO transactions (user_id, type, amount, balance_after, description, reference_id, created_at)
      VALUES (2, 'order', -500.0, 4500.0, 'Order #101 - Instagram High Quality Followers', 'ORD-101', ?)
    `).run(now);
	const nowOrd = /* @__PURE__ */ new Date();
	const yesterday = (/* @__PURE__ */ new Date(Date.now() - 864e5)).toISOString();
	const twoDaysAgo = (/* @__PURE__ */ new Date(Date.now() - 1728e5)).toISOString();
	db.prepare(`
      INSERT INTO orders (id, user_id, service_id, link, quantity, charge, start_count, remains, status, mode, created_at, updated_at)
      VALUES (101, 2, 1, 'https://instagram.com/pak_influencer_hub', 1000, 299.0, 1420, 0, 'Completed', 'Manual', ?, ?)
    `).run(twoDaysAgo, twoDaysAgo);
	db.prepare(`
      INSERT INTO orders (id, user_id, service_id, link, quantity, charge, start_count, remains, status, mode, created_at, updated_at)
      VALUES (102, 2, 6, 'https://tiktok.com/@growth_creator/video/7381920192', 10000, 120.0, 850, 2400, 'In progress', 'Manual', ?, ?)
    `).run(yesterday, yesterday);
	db.prepare(`
      INSERT INTO orders (id, user_id, service_id, link, quantity, charge, start_count, remains, status, mode, created_at, updated_at)
      VALUES (103, 2, 11, 'https://youtube.com/@TechTalkPakistan', 100, 115.0, 310, 100, 'Pending', 'Manual', ?, ?)
    `).run(nowOrd.toISOString(), nowOrd.toISOString());
	db.prepare(`
      INSERT INTO support_tickets (id, user_id, subject, category, priority, order_id, status, created_at, updated_at)
      VALUES (501, 2, 'Speed inquiry on Order #102 TikTok Views', 'Order', 'normal', 102, 'answered', ?, ?)
    `).run(yesterday, nowOrd.toISOString());
	db.prepare(`
      INSERT INTO ticket_messages (ticket_id, sender_id, sender_role, message, created_at)
      VALUES (501, 2, 'user', 'Hi PakServices support, how long will it take for the remaining 2.4k views on order #102 to finish delivering?', ?)
    `).run(yesterday);
	db.prepare(`
      INSERT INTO ticket_messages (ticket_id, sender_id, sender_role, message, created_at)
      VALUES (501, 1, 'admin', 'Hello! Our high-speed server delivers TikTok views gradually to simulate natural viral discovery. It will complete within 30-45 minutes. Thank you for choosing PakServices!', ?)
    `).run(nowOrd.toISOString());
	db.prepare(`
      INSERT INTO payment_requests (user_id, method, amount, trx_id, sender_account, status, admin_notes, created_at, processed_at)
      VALUES (2, 'JazzCash', 5000.0, 'TRX-98218731', '03001234567', 'approved', 'Verified and credited via JazzCash SMS receipt.', ?, ?)
    `).run(twoDaysAgo, twoDaysAgo);
	db.prepare(`
      INSERT INTO payment_requests (user_id, method, amount, trx_id, sender_account, status, admin_notes, created_at)
      VALUES (2, 'Easypaisa', 1500.0, 'TRX-99882211', '03129876543', 'pending', 'Awaiting verification', ?)
    `).run(nowOrd.toISOString());
	ensureDefaultSettings();
}
function ensureDefaultSettings() {
	if (db.prepare("SELECT COUNT(*) as count FROM categories").get().count === 0) {
		const categories = [
			{
				name: "Instagram",
				icon: "Instagram",
				sort_order: 1
			},
			{
				name: "TikTok",
				icon: "Video",
				sort_order: 2
			},
			{
				name: "YouTube",
				icon: "Youtube",
				sort_order: 3
			},
			{
				name: "Facebook",
				icon: "Facebook",
				sort_order: 4
			},
			{
				name: "Telegram",
				icon: "Send",
				sort_order: 5
			},
			{
				name: "Twitter/X",
				icon: "Twitter",
				sort_order: 6
			},
			{
				name: "Spotify",
				icon: "Music",
				sort_order: 7
			},
			{
				name: "Website Traffic",
				icon: "Globe",
				sort_order: 8
			}
		];
		const insertCat = db.prepare("INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)");
		for (const cat of categories) insertCat.run(cat.name, cat.icon, cat.sort_order);
		const initialServices = [
			{
				cat: 1,
				name: "Instagram Followers [HQ Real - 30 Days Refill - Non-Drop]",
				rate: 299,
				min: 50,
				max: 1e5,
				desc: "High quality worldwide accounts with profile pictures and posts. Instant start, speed 10K-30K/day. 30 days refill button enabled."
			},
			{
				cat: 1,
				name: "Instagram Pakistani Followers [Organic Target - Active]",
				rate: 750,
				min: 100,
				max: 2e4,
				desc: "100% targeted Pakistani audiences. Realistic usernames and bio descriptions. Good for local brands and influencers."
			},
			{
				cat: 1,
				name: "Instagram Likes [Instant - Super Fast - High Retention]",
				rate: 45,
				min: 50,
				max: 5e4,
				desc: "Instant delivery starts within 60 seconds. Guaranteed delivery with zero drop."
			},
			{
				cat: 1,
				name: "Instagram Reels Views [Viral Boost - High Watch Time]",
				rate: 15,
				min: 100,
				max: 1e6,
				desc: "Boosts Instagram algorithm reach and Explore page visibility. Speed 500K/day."
			},
			{
				cat: 1,
				name: "Instagram Custom Comments [Positive English/Urdu]",
				rate: 850,
				min: 10,
				max: 5e3,
				desc: "Enter 1 comment per line. Realistic verified-looking active accounts."
			},
			{
				cat: 2,
				name: "TikTok Video Views [For You Page FYP Algorithm Trigger]",
				rate: 12,
				min: 1e3,
				max: 5e6,
				desc: "Instant start. High retention views that push videos onto the TikTok FYP recommendation engine."
			},
			{
				cat: 2,
				name: "TikTok Followers [Organic Mixed - 30 Days Guarantee]",
				rate: 380,
				min: 50,
				max: 5e4,
				desc: "Start: 0-1 hour. Non-drop followers to unlock TikTok LIVE studio and bio link permissions."
			},
			{
				cat: 2,
				name: "TikTok Likes [Fast Delivery - Zero Drop]",
				rate: 95,
				min: 50,
				max: 1e5,
				desc: "Real user accounts, high engagement metrics."
			},
			{
				cat: 2,
				name: "TikTok Shares & Saves [Combo Boost]",
				rate: 65,
				min: 100,
				max: 5e4,
				desc: "Essential signal for TikTok algorithm to rank videos on top hashtags."
			},
			{
				cat: 3,
				name: "YouTube Monetization WatchTime [4000 Hours Package - 15min+ Video]",
				rate: 4200,
				min: 1e3,
				max: 4e3,
				desc: "Requires video length of 15-60 minutes. 100% safe for channel monetization compliance. Lifetime warranty."
			},
			{
				cat: 3,
				name: "YouTube Subscribers [Non-Drop - Real Active - Lifetime Refill]",
				rate: 1150,
				min: 50,
				max: 1e4,
				desc: "Natural delivery curve of 100-300 subs/day to keep channel safe from YouTube cleanups."
			},
			{
				cat: 3,
				name: "YouTube Views [High Retention - Suggested Videos]",
				rate: 290,
				min: 500,
				max: 2e5,
				desc: "View duration 3-8 minutes. Traffic source from YouTube Suggested and Browse features."
			},
			{
				cat: 3,
				name: "YouTube Likes [Instant - 100% Safe]",
				rate: 120,
				min: 50,
				max: 5e4,
				desc: "High quality YouTube likes from clean IP residential pools."
			},
			{
				cat: 4,
				name: "Facebook Page Likes & Followers [Non-Drop - Global]",
				rate: 480,
				min: 100,
				max: 5e4,
				desc: "Increases both Page Likes and Followers simultaneously. Good for business trust."
			},
			{
				cat: 4,
				name: "Facebook Video Views [3-Second Monetizable]",
				rate: 40,
				min: 500,
				max: 5e5,
				desc: "Great for Facebook in-stream ads eligibility requirements (60,000 minutes)."
			},
			{
				cat: 4,
				name: "Facebook Post Reactions [Love, Care, Wow, Haha Mix]",
				rate: 110,
				min: 50,
				max: 1e4,
				desc: "Specify reaction type or default mix. Fast start."
			},
			{
				cat: 5,
				name: "Telegram Channel Members [Non-Drop - 60 Days Refill]",
				rate: 220,
				min: 50,
				max: 5e4,
				desc: "High quality worldwide members. Zero drop guarantee for 60 days."
			},
			{
				cat: 5,
				name: "Telegram Post Views [Last 10 Posts - Auto Speed]",
				rate: 25,
				min: 100,
				max: 1e5,
				desc: "Distributes views across recent 10 messages in your public channel."
			},
			{
				cat: 6,
				name: "Twitter/X Followers [Global High Quality - Fast Start]",
				rate: 580,
				min: 100,
				max: 25e3,
				desc: "Fast delivery, clean accounts with profile images and banners."
			},
			{
				cat: 6,
				name: "Twitter/X Retweets & Likes [Engagement Combo]",
				rate: 320,
				min: 50,
				max: 1e4,
				desc: "Instant boost to trending tweets."
			},
			{
				cat: 7,
				name: "Spotify Track Plays [Premium USA/UK Streams - Royalty Eligible]",
				rate: 190,
				min: 1e3,
				max: 5e5,
				desc: "Real streams eligible for distributor royalties (Distrokid, TuneCore, CDBaby)."
			},
			{
				cat: 7,
				name: "Spotify Monthly Listeners [Algorithm Trigger]",
				rate: 390,
				min: 500,
				max: 5e4,
				desc: "Increases monthly active listener count to trigger Spotify Radio and Discover Weekly."
			},
			{
				cat: 8,
				name: "Website Targeted Traffic [Pakistan Visitors - Low Bounce - AdSense Safe]",
				rate: 140,
				min: 1e3,
				max: 1e5,
				desc: "Real Pakistani IP residential visitors. Time on site 1-3 minutes. Google Analytics trackable."
			},
			{
				cat: 8,
				name: "Website Global Traffic [USA/Europe Tier 1 - High Duration]",
				rate: 95,
				min: 1e3,
				max: 1e6,
				desc: "Tier 1 traffic from search engines (Organic keywords referrers)."
			}
		];
		const insertServ = db.prepare(`
      INSERT INTO services (category_id, name, type, rate_per_1000, min_quantity, max_quantity, description, refill_supported, cancel_supported)
      VALUES (?, ?, 'Default', ?, ?, ?, ?, 1, 0)
    `);
		for (const s of initialServices) insertServ.run(s.cat, s.name, s.rate, s.min, s.max, s.desc);
	}
	const maxOrderRow = db.prepare("SELECT COALESCE(MAX(id), 0) as max_id FROM orders").get();
	const settingsList = [
		{
			key: "site_name",
			value: "PakServices"
		},
		{
			key: "site_tagline",
			value: "Premier SMM Reseller Panel & Growth Engine"
		},
		{
			key: "currency_code",
			value: "PKR"
		},
		{
			key: "usd_pkr_rate",
			value: "280.0"
		},
		{
			key: "referral_percent",
			value: "5.0"
		},
		{
			key: "global_theme",
			value: "midnight"
		},
		{
			key: "next_order_id",
			value: String(Math.max(1, (maxOrderRow?.max_id || 0) + 1))
		},
		{
			key: "easypaisa_enabled",
			value: "1"
		},
		{
			key: "easypaisa_number",
			value: "0312-3456789"
		},
		{
			key: "easypaisa_title",
			value: "PakServices / Muhammad Ali"
		},
		{
			key: "easypaisa_qr",
			value: ""
		},
		{
			key: "easypaisa_instructions",
			value: "Send exact funds via Easypaisa App or *786#. After transferring, enter the 11-digit TID and upload your screenshot."
		},
		{
			key: "jazzcash_enabled",
			value: "1"
		},
		{
			key: "jazzcash_number",
			value: "0300-9876543"
		},
		{
			key: "jazzcash_title",
			value: "PakServices / Muhammad Ali"
		},
		{
			key: "jazzcash_qr",
			value: ""
		},
		{
			key: "jazzcash_instructions",
			value: "Send exact funds via JazzCash App or *786#. After transferring, enter the 12-digit TID and upload your screenshot."
		},
		{
			key: "bank_enabled",
			value: "1"
		},
		{
			key: "bank_name",
			value: "Meezan Bank Limited"
		},
		{
			key: "bank_account_number",
			value: "0102-010203040506"
		},
		{
			key: "bank_account_title",
			value: "PakServices Digital Technologies SMC-Pvt Ltd"
		},
		{
			key: "bank_iban",
			value: "PK45MEZN0001020102030405"
		},
		{
			key: "bank_branch",
			value: "Main Commercial Branch Karachi"
		},
		{
			key: "bank_qr",
			value: ""
		},
		{
			key: "bank_instructions",
			value: "Transfer funds using your bank app via Raast ID, 1Link, or IBFT. Enter bank reference number and upload receipt."
		},
		{
			key: "usdt_enabled",
			value: "1"
		},
		{
			key: "usdt_bep20_enabled",
			value: "1"
		},
		{
			key: "usdt_bep20_address",
			value: "0x88923a41b2c4e511796b4f74d06a92849b21f92e"
		},
		{
			key: "usdt_bep20_qr",
			value: ""
		},
		{
			key: "usdt_bep20_instructions",
			value: "Transfer USDT only via BNB Smart Chain (BEP20). Funds sent on wrong networks cannot be recovered."
		},
		{
			key: "usdt_trc20_enabled",
			value: "1"
		},
		{
			key: "usdt_trc20_address",
			value: "TXnp9zR8XqW3kmLgP7bK2m9vT5rQ1j8sF"
		},
		{
			key: "usdt_trc20_qr",
			value: ""
		},
		{
			key: "usdt_trc20_instructions",
			value: "Transfer USDT only via TRON (TRC20) network. Ensure transaction is confirmed before submitting hash."
		},
		{
			key: "support_whatsapp",
			value: "+92 341 7208670"
		},
		{
			key: "support_telegram",
			value: "@PakServicesOfficial"
		},
		{
			key: "support_email",
			value: "support@pakservices.com"
		},
		{
			key: "min_deposit_pkr",
			value: "100"
		}
	];
	const insertSetting = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
	for (const set of settingsList) insertSetting.run(set.key, set.value);
	if (db.prepare("SELECT COUNT(*) as count FROM announcements").get().count === 0) {
		db.prepare(`
      INSERT INTO announcements (title, content, type, active, created_at)
      VALUES (?, ?, ?, 1, ?)
    `).run("Instant Auto-Approvals for Easypaisa & JazzCash Deposits!", "Our payment gateway verification queue is actively monitored 24/7. Submit your 11-digit TRX ID after sending funds to get credited within 2-5 minutes.", "success", (/* @__PURE__ */ new Date()).toISOString());
		db.prepare(`
      INSERT INTO announcements (title, content, type, active, created_at)
      VALUES (?, ?, ?, 1, ?)
    `).run("Instagram Algorithm Update Notice", "All Instagram Non-Drop servers have been upgraded to the newest API protocol. High-speed delivery with guaranteed 30-day refill is fully restored.", "info", (/* @__PURE__ */ new Date()).toISOString());
	}
}
// server/auth.ts
function createSession(userId) {
	const token = generateToken();
	const now = /* @__PURE__ */ new Date();
	const expiresAt = new Date(now.getTime() + 2592e6).toISOString();
	db.prepare(`
    INSERT INTO sessions (token, user_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(token, userId, now.toISOString(), expiresAt);
	return token;
}
function removeSession(token) {
	db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}
function getUserByToken(token) {
	if (!token) return null;
	const session = db.prepare(`
    SELECT s.expires_at, u.id, u.email, u.username, u.role, u.balance, u.spent, u.status, u.referral_code, u.created_at, u.timezone, u.currency
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ?
  `).get(token);
	if (!session) return null;
	if (new Date(session.expires_at) < /* @__PURE__ */ new Date()) {
		db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
		return null;
	}
	if (session.status !== "active") return null;
	return {
		id: session.id,
		email: session.email,
		username: session.username,
		role: session.role,
		balance: session.balance,
		spent: session.spent,
		status: session.status,
		referral_code: session.referral_code,
		created_at: session.created_at,
		timezone: session.timezone,
		currency: session.currency
	};
}
function requireAuth(req, res, next) {
	const authHeader = req.headers.authorization;
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		res.status(401).json({ error: "Authentication required. Please log in." });
		return;
	}
	const user = getUserByToken(authHeader.substring(7).trim());
	if (!user) {
		res.status(401).json({ error: "Session expired or invalid. Please sign in again." });
		return;
	}
	req.user = user;
	next();
}
function requireAdmin(req, res, next) {
	requireAuth(req, res, () => {
		if (req.user?.role !== "admin") {
			res.status(403).json({ error: "Access denied. Administrator privileges required." });
			return;
		}
		next();
	});
}
// server/simDetails.ts
var SIM_DETAILS_CATEGORY_NAME = "sim details";
function isSimDetailsCategoryName(categoryName) {
	return (categoryName || "").trim().toLowerCase() === SIM_DETAILS_CATEGORY_NAME;
}
function validateSimDetailsInput(rawInput) {
	const trimmed = (rawInput || "").trim();
	if (!trimmed) return {
		valid: false,
		normalized: "",
		error: "Please enter a valid Pakistani Mobile Number or CNIC."
	};
	if (/[a-zA-Z:/@.]/.test(trimmed)) return {
		valid: false,
		normalized: trimmed,
		error: "Invalid format. Enter an 11-digit Pakistani Mobile Number (e.g. 03001234567) or 13-digit CNIC (e.g. 3520212345671 or 35202-1234567-1)."
	};
	if (/^\d{5}-\d{7}-\d$/.test(trimmed)) {
		const digits = trimmed.replace(/-/g, "");
		if (/^0+$/.test(digits)) return {
			valid: false,
			normalized: trimmed,
			error: "Please enter a valid 13-digit Pakistani CNIC number."
		};
		return {
			valid: true,
			normalized: trimmed,
			type: "cnic"
		};
	}
	if (/^\d{13}$/.test(trimmed)) {
		if (/^0+$/.test(trimmed)) return {
			valid: false,
			normalized: trimmed,
			error: "Please enter a valid 13-digit Pakistani CNIC number."
		};
		return {
			valid: true,
			normalized: trimmed,
			type: "cnic"
		};
	}
	if (/^03\d{2}[-\s]?\d{7}$/.test(trimmed) || /^(\+92|92)3\d{9}$/.test(trimmed)) return {
		valid: true,
		normalized: trimmed,
		type: "mobile"
	};
	return {
		valid: false,
		normalized: trimmed,
		error: "Invalid Mobile Number or CNIC. Enter an 11-digit mobile number (e.g. 03001234567) or 13-digit CNIC (e.g. 3520212345671 or 35202-1234567-1)."
	};
}
function validateDeliveryContact(rawInput) {
	const trimmed = (rawInput || "").trim();
	if (!trimmed) return {
		valid: false,
		normalized: "",
		error: "Delivery Email or WhatsApp Number is required."
	};
	if (trimmed.includes("@") || /[a-zA-Z]/.test(trimmed)) {
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) return {
			valid: false,
			normalized: trimmed,
			error: "Please enter a valid Email address (e.g. name@example.com) or a Pakistani WhatsApp number (e.g. 03001234567)."
		};
		return {
			valid: true,
			normalized: trimmed,
			type: "email"
		};
	}
	const compact = trimmed.replace(/[\s-]/g, "");
	if (/^(03\d{9}|(\+92|92)3\d{9})$/.test(compact)) return {
		valid: true,
		normalized: trimmed,
		type: "whatsapp"
	};
	return {
		valid: false,
		normalized: trimmed,
		error: "Please enter a valid Pakistani WhatsApp number (e.g. 03001234567 or +923001234567) or a valid Email address."
	};
}
// server/routes/user.ts
var userRouter = Router();
userRouter.get("/theme", (_req, res) => {
	return res.json({ theme: getGlobalTheme() });
});
userRouter.post("/auth/register", (req, res) => {
	const { username, email, password, referral_code } = req.body;
	if (!username || !email || !password) return res.status(400).json({ error: "Username, email, and password are required." });
	const cleanUser = String(username).trim();
	const cleanEmail = String(email).trim().toLowerCase();
	if (cleanUser.length < 3) return res.status(400).json({ error: "Username must be at least 3 characters." });
	if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });
	if (db.prepare("SELECT id FROM users WHERE email = ? OR username = ?").get(cleanEmail, cleanUser)) return res.status(400).json({ error: "An account with that email or username already exists." });
	let referrerId = null;
	if (referral_code) {
		const refUser = db.prepare("SELECT id FROM users WHERE referral_code = ?").get(String(referral_code).trim().toUpperCase());
		if (refUser) referrerId = refUser.id;
	}
	const passwordHash = hashPassword(password);
	const userReferralCode = generateReferralCode();
	const now = (/* @__PURE__ */ new Date()).toISOString();
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
			role: "user",
			balance: 0,
			spent: 0,
			status: "active",
			referral_code: userReferralCode,
			created_at: now,
			timezone: "Asia/Karachi",
			currency: "PKR"
		};
		return res.status(201).json({
			token,
			user,
			message: "Account registered successfully!"
		});
	} catch (err) {
		return res.status(500).json({ error: "Registration failed: " + err.message });
	}
});
userRouter.post("/auth/login", (req, res) => {
	const { emailOrUsername, password } = req.body;
	if (!emailOrUsername || !password) return res.status(400).json({ error: "Please provide username/email and password." });
	const term = String(emailOrUsername).trim().toLowerCase();
	const user = db.prepare(`
    SELECT * FROM users
    WHERE LOWER(email) = ? OR LOWER(username) = ?
  `).get(term, term);
	if (!user || !verifyPassword(password, user.password_hash)) return res.status(401).json({ error: "Invalid username/email or password." });
	if (user.status !== "active") return res.status(403).json({ error: "Account suspended. Contact support for assistance." });
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
		message: "Login successful"
	});
});
userRouter.get("/auth/me", requireAuth, (req, res) => {
	const user = db.prepare(`
    SELECT id, email, username, role, balance, spent, status, referral_code, created_at, timezone, currency
    FROM users
    WHERE id = ?
  `).get(req.user.id);
	if (!user) return res.status(404).json({ error: "User not found" });
	return res.json({ user });
});
userRouter.post("/auth/logout", requireAuth, (req, res) => {
	const authHeader = req.headers.authorization;
	if (authHeader && authHeader.startsWith("Bearer ")) removeSession(authHeader.substring(7).trim());
	return res.json({ message: "Logged out successfully" });
});
userRouter.post("/auth/forgot-password", (req, res) => {
	const { email } = req.body;
	if (!email) return res.status(400).json({ error: "Email address is required." });
	const user = db.prepare("SELECT id, email, username FROM users WHERE LOWER(email) = ?").get(String(email).trim().toLowerCase());
	if (!user) return res.json({
		success: true,
		message: "If that email exists in our system, a password reset instruction has been sent."
	});
	const resetPin = Math.floor(1e5 + Math.random() * 9e5).toString();
	db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(`reset_${user.id}`, `${resetPin}:${Date.now() + 9e5}`);
	return res.json({
		success: true,
		message: "Reset instructions have been sent to your email.",
		demoPinNotice: `[DEMO MODE PIN: ${resetPin}]`
	});
});
userRouter.post("/auth/reset-password", (req, res) => {
	const { email, pin, newPassword } = req.body;
	if (!email || !pin || !newPassword) return res.status(400).json({ error: "Email, PIN, and new password are required." });
	const user = db.prepare("SELECT id, email FROM users WHERE LOWER(email) = ?").get(String(email).trim().toLowerCase());
	if (!user) return res.status(400).json({ error: "Invalid reset request." });
	const record = db.prepare("SELECT value FROM settings WHERE key = ?").get(`reset_${user.id}`);
	if (!record) return res.status(400).json({ error: "No active password reset request found." });
	const [storedPin, expiry] = record.value.split(":");
	if (storedPin !== String(pin).trim() || Date.now() > Number(expiry)) return res.status(400).json({ error: "Invalid or expired verification PIN." });
	const newHash = hashPassword(newPassword);
	db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newHash, user.id);
	db.prepare("DELETE FROM settings WHERE key = ?").run(`reset_${user.id}`);
	return res.json({
		success: true,
		message: "Password has been reset successfully! You can now log in."
	});
});
userRouter.put("/auth/profile", requireAuth, (req, res) => {
	const { timezone, currency } = req.body;
	const user = req.user;
	db.prepare(`
    UPDATE users
    SET timezone = COALESCE(?, timezone),
        currency = COALESCE(?, currency)
    WHERE id = ?
  `).run(timezone || null, currency || null, user.id);
	return res.json({
		success: true,
		message: "Profile updated successfully."
	});
});
userRouter.post("/auth/change-password", requireAuth, (req, res) => {
	const { currentPassword, newPassword } = req.body;
	const userId = req.user.id;
	if (!verifyPassword(currentPassword, db.prepare("SELECT password_hash FROM users WHERE id = ?").get(userId).password_hash)) return res.status(400).json({ error: "Current password is incorrect." });
	if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: "New password must be at least 6 characters." });
	const newHash = hashPassword(newPassword);
	db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newHash, userId);
	return res.json({
		success: true,
		message: "Password changed successfully."
	});
});
userRouter.get("/services", (req, res) => {
	const categories = db.prepare(`
    SELECT * FROM categories
    WHERE status = 'active'
    ORDER BY sort_order ASC, name ASC
  `).all();
	const services = db.prepare(`
    SELECT s.*, c.name as category_name
    FROM services s
    JOIN categories c ON s.category_id = c.id
    WHERE s.status = 'active'
    ORDER BY c.sort_order ASC, s.id ASC
  `).all();
	return res.json({
		categories,
		services
	});
});
userRouter.get("/services/favorites", requireAuth, (req, res) => {
	const favorites = db.prepare(`
    SELECT service_id FROM user_favorites WHERE user_id = ?
  `).all(req.user.id);
	return res.json({ favorites: favorites.map((f) => f.service_id) });
});
userRouter.post("/services/favorites/toggle", requireAuth, (req, res) => {
	const { service_id } = req.body;
	const userId = req.user.id;
	if (db.prepare("SELECT 1 FROM user_favorites WHERE user_id = ? AND service_id = ?").get(userId, service_id)) {
		db.prepare("DELETE FROM user_favorites WHERE user_id = ? AND service_id = ?").run(userId, service_id);
		return res.json({ favorited: false });
	} else {
		db.prepare("INSERT INTO user_favorites (user_id, service_id) VALUES (?, ?)").run(userId, service_id);
		return res.json({ favorited: true });
	}
});
userRouter.get("/orders", requireAuth, (req, res) => {
	const userId = req.user.id;
	const status = (req.query.status || "all").toString();
	const search = (req.query.search || "").toString().trim().toLowerCase();
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
	const params = [userId];
	if (status && status !== "all") {
		query += ` AND LOWER(o.status) = ?`;
		params.push(status.toLowerCase());
	}
	if (search) {
		query += ` AND (LOWER(s.name) LIKE ? OR LOWER(o.link) LIKE ? OR LOWER(COALESCE(o.delivery_contact, '')) LIKE ? OR CAST(o.id AS TEXT) LIKE ?)`;
		params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
	}
	query += ` ORDER BY o.id DESC LIMIT 200`;
	const orders = db.prepare(query).all(...params);
	return res.json({ orders });
});
userRouter.post("/orders", requireAuth, (req, res) => {
	const userId = req.user.id;
	const { service_id, link, quantity, delivery_contact } = req.body;
	const sId = parseInt(service_id, 10);
	const parsedQty = parseInt(quantity, 10);
	const cleanLink = (link || "").trim();
	const cleanDeliveryContact = (delivery_contact || "").trim();
	if (!sId || !cleanLink) return res.status(400).json({ error: "Please provide valid service and target input." });
	const service = db.prepare(`
    SELECT s.*, c.name as category_name
    FROM services s
    LEFT JOIN categories c ON s.category_id = c.id
    WHERE s.id = ? AND s.status = 'active'
  `).get(sId);
	if (!service) return res.status(404).json({ error: "Selected service is currently unavailable." });
	const isSimDetails = isSimDetailsCategoryName(service.category_name);
	let finalTargetInput = cleanLink;
	let finalDeliveryContact = null;
	let finalQuantity = parsedQty;
	let charge = 0;
	if (isSimDetails) {
		const simCheck = validateSimDetailsInput(cleanLink);
		if (!simCheck.valid) return res.status(400).json({ error: simCheck.error });
		finalTargetInput = simCheck.normalized;
		const deliveryCheck = validateDeliveryContact(cleanDeliveryContact);
		if (!deliveryCheck.valid) return res.status(400).json({ error: deliveryCheck.error });
		finalDeliveryContact = deliveryCheck.normalized;
		finalQuantity = 1;
		charge = parseFloat(Number(service.rate_per_1000).toFixed(2));
	} else {
		if (!parsedQty || isNaN(parsedQty) || parsedQty <= 0) return res.status(400).json({ error: "Please provide a valid quantity." });
		if (parsedQty < service.min_quantity || parsedQty > service.max_quantity) return res.status(400).json({ error: `Quantity for this service must be between ${service.min_quantity.toLocaleString()} and ${service.max_quantity.toLocaleString()}.` });
		charge = parseFloat((parsedQty / 1e3 * service.rate_per_1000).toFixed(2));
	}
	const userCheck = db.prepare("SELECT balance FROM users WHERE id = ?").get(userId);
	if (!userCheck || userCheck.balance < charge) return res.status(400).json({ error: `Insufficient balance. Required: Rs ${charge.toFixed(2)}, Available: Rs ${(userCheck?.balance || 0).toFixed(2)}. Please Add Funds.` });
	const now = (/* @__PURE__ */ new Date()).toISOString();
	db.exec("BEGIN IMMEDIATE TRANSACTION");
	try {
		if (db.prepare(`
      UPDATE users
      SET balance = ROUND(balance - ?, 2),
          spent = ROUND(spent + ?, 2)
      WHERE id = ? AND balance >= ?
    `).run(charge, charge, userId, charge).changes !== 1) {
			db.exec("ROLLBACK");
			const freshUser = db.prepare("SELECT balance FROM users WHERE id = ?").get(userId);
			return res.status(400).json({ error: `Insufficient balance. Required: Rs ${charge.toFixed(2)}, Available: Rs ${(freshUser?.balance || 0).toFixed(2)}. Please Add Funds.` });
		}
		const newBalance = db.prepare("SELECT balance FROM users WHERE id = ?").get(userId).balance;
		const orderId = allocateNextOrderId();
		db.prepare(`
      INSERT INTO orders (id, user_id, service_id, link, delivery_contact, quantity, charge, start_count, remains, status, mode, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'Pending', 'Manual', ?, ?)
    `).run(orderId, userId, service.id, finalTargetInput, finalDeliveryContact, finalQuantity, charge, finalQuantity, now, now);
		db.prepare(`
      INSERT INTO transactions (user_id, type, amount, balance_after, description, reference_id, created_at)
      VALUES (?, 'order', ?, ?, ?, ?, ?)
    `).run(userId, -charge, newBalance, `Order #${orderId} - ${service.name}`, `ORD-${orderId}`, now);
		db.exec("COMMIT");
		return res.status(201).json({
			success: true,
			order_id: orderId,
			charge,
			balance: newBalance,
			message: `Order #${orderId} submitted successfully!`
		});
	} catch (err) {
		try {
			db.exec("ROLLBACK");
		} catch {}
		return res.status(500).json({ error: "Order placement failed: " + err.message });
	}
});
userRouter.post("/orders/mass", requireAuth, (req, res) => {
	const userId = req.user.id;
	const { mass_data } = req.body;
	if (!mass_data || typeof mass_data !== "string") return res.status(400).json({ error: "Please enter mass order details in format: service_id | quantity | link" });
	const lines = mass_data.split("\n").map((l) => l.trim()).filter(Boolean);
	if (lines.length === 0) return res.status(400).json({ error: "No order rows found." });
	const results = [];
	let user = db.prepare("SELECT balance, spent FROM users WHERE id = ?").get(userId);
	for (let i = 0; i < lines.length; i++) {
		const parts = lines[i].split("|").map((p) => p.trim());
		if (parts.length < 3) {
			results.push({
				line: i + 1,
				error: "Invalid row format. Use: service_id | quantity | link"
			});
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
    `).get(sId);
		if (!service) {
			results.push({
				line: i + 1,
				error: `Service ID ${sId} not found or inactive`
			});
			continue;
		}
		let finalQty = qty;
		let finalDelivery = null;
		let charge = 0;
		if (isSimDetailsCategoryName(service.category_name)) {
			const simCheck = validateSimDetailsInput(link);
			if (!simCheck.valid) {
				results.push({
					line: i + 1,
					error: simCheck.error
				});
				continue;
			}
			const deliveryCheck = validateDeliveryContact(parts[3] || "");
			if (!deliveryCheck.valid) {
				results.push({
					line: i + 1,
					error: `SIM Details requires delivery contact (4th column): ${deliveryCheck.error}`
				});
				continue;
			}
			finalDelivery = deliveryCheck.normalized;
			finalQty = 1;
			charge = parseFloat(Number(service.rate_per_1000).toFixed(2));
		} else {
			if (qty < service.min_quantity || qty > service.max_quantity) {
				results.push({
					line: i + 1,
					error: `Quantity must be ${service.min_quantity}-${service.max_quantity}`
				});
				continue;
			}
			charge = parseFloat((qty / 1e3 * service.rate_per_1000).toFixed(2));
		}
		if (user.balance < charge) {
			results.push({
				line: i + 1,
				error: `Insufficient funds (Requires Rs ${charge})`
			});
			continue;
		}
		const now = (/* @__PURE__ */ new Date()).toISOString();
		db.exec("BEGIN IMMEDIATE TRANSACTION");
		try {
			if (db.prepare(`
        UPDATE users
        SET balance = ROUND(balance - ?, 2),
            spent = ROUND(spent + ?, 2)
        WHERE id = ? AND balance >= ?
      `).run(charge, charge, userId, charge).changes !== 1) {
				db.exec("ROLLBACK");
				user.balance = db.prepare("SELECT balance FROM users WHERE id = ?").get(userId)?.balance || 0;
				results.push({
					line: i + 1,
					error: `Insufficient funds (Requires Rs ${charge})`
				});
				continue;
			}
			const updatedUser = db.prepare("SELECT balance, spent FROM users WHERE id = ?").get(userId);
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
			db.exec("COMMIT");
			user.balance = newBal;
			user.spent = newSpent;
			results.push({
				line: i + 1,
				success: true,
				order_id: oId,
				charge
			});
		} catch (e) {
			try {
				db.exec("ROLLBACK");
			} catch {}
			results.push({
				line: i + 1,
				error: e.message
			});
		}
	}
	return res.json({
		results,
		updated_balance: user.balance
	});
});
userRouter.post("/orders/:id/refill", requireAuth, (req, res) => {
	const userId = req.user.id;
	const orderId = parseInt(req.params.id, 10);
	const order = db.prepare(`
    SELECT o.id, o.status, s.refill_supported
    FROM orders o
    JOIN services s ON o.service_id = s.id
    WHERE o.id = ? AND o.user_id = ?
  `).get(orderId, userId);
	if (!order) return res.status(404).json({ error: "Order not found." });
	if (!order.refill_supported) return res.status(400).json({ error: "Refill is not supported for this service." });
	db.prepare(`
    UPDATE orders
    SET refill_status = 'Requested', updated_at = ?
    WHERE id = ?
  `).run((/* @__PURE__ */ new Date()).toISOString(), orderId);
	return res.json({
		success: true,
		message: `Refill request submitted for Order #${orderId}. Our server is checking drops.`
	});
});
userRouter.post("/orders/:id/cancel", requireAuth, (req, res) => {
	const userId = req.user.id;
	const orderId = parseInt(req.params.id, 10);
	const order = db.prepare("SELECT id, status FROM orders WHERE id = ? AND user_id = ?").get(orderId, userId);
	if (!order) return res.status(404).json({ error: "Order not found." });
	if (order.status !== "Pending") return res.status(400).json({ error: "Only pending orders can be canceled prior to server processing." });
	const fullOrder = db.prepare("SELECT charge FROM orders WHERE id = ?").get(orderId);
	const user = db.prepare("SELECT balance, spent FROM users WHERE id = ?").get(userId);
	const refundAmount = fullOrder.charge;
	const now = (/* @__PURE__ */ new Date()).toISOString();
	const newBalance = user.balance + refundAmount;
	const newSpent = Math.max(0, user.spent - refundAmount);
	db.exec("BEGIN TRANSACTION");
	try {
		db.prepare("UPDATE orders SET status = 'Canceled', updated_at = ? WHERE id = ?").run(now, orderId);
		db.prepare("UPDATE users SET balance = ?, spent = ? WHERE id = ?").run(newBalance, newSpent, userId);
		db.prepare(`
      INSERT INTO transactions (user_id, type, amount, balance_after, description, reference_id, created_at)
      VALUES (?, 'refund', ?, ?, ?, ?, ?)
    `).run(userId, refundAmount, newBalance, `Refund for Canceled Order #${orderId}`, `REF-${orderId}`, now);
		db.exec("COMMIT");
		return res.json({
			success: true,
			message: `Order #${orderId} canceled and Rs ${refundAmount.toFixed(2)} refunded to your balance.`
		});
	} catch (err) {
		db.exec("ROLLBACK");
		return res.status(500).json({ error: "Cancellation failed: " + err.message });
	}
});
userRouter.get("/payments/methods", (req, res) => {
	const settingsRows = db.prepare(`
    SELECT key, value FROM settings
    WHERE key LIKE 'easypaisa_%'
       OR key LIKE 'jazzcash_%'
       OR key LIKE 'bank_%'
       OR key LIKE 'usdt_%'
       OR key IN ('usd_pkr_rate', 'min_deposit_pkr', 'site_name', 'currency_code')
  `).all();
	const config = {};
	for (const row of settingsRows) config[row.key] = row.value;
	return res.json(config);
});
userRouter.get("/payments/requests", requireAuth, (req, res) => {
	const requests = db.prepare(`
    SELECT * FROM payment_requests
    WHERE user_id = ?
    ORDER BY id DESC
  `).all(req.user.id);
	return res.json({ requests });
});
userRouter.post("/payments/requests", requireAuth, (req, res) => {
	const userId = req.user.id;
	const { method, network, amount, trx_id, sender_account, screenshot_url } = req.body;
	const amt = parseFloat(amount);
	const cleanTrx = (trx_id || "").trim();
	if (!method || isNaN(amt) || amt <= 0 || !cleanTrx) return res.status(400).json({ error: "Payment method, amount, and Transaction ID (TRX ID) are required." });
	if (method === "USDT" && !network) return res.status(400).json({ error: "Please specify the USDT network (BEP20 or TRC20)." });
	const minDepositRow = db.prepare("SELECT value FROM settings WHERE key = 'min_deposit_pkr'").get();
	const minDeposit = minDepositRow ? parseFloat(minDepositRow.value) : 100;
	if (amt < minDeposit) return res.status(400).json({ error: `Minimum deposit amount is Rs ${minDeposit}.` });
	if (db.prepare("SELECT id FROM payment_requests WHERE trx_id = ?").get(cleanTrx)) return res.status(400).json({ error: "This Transaction ID (TRX ID) has already been submitted." });
	const now = (/* @__PURE__ */ new Date()).toISOString();
	try {
		const result = db.prepare(`
      INSERT INTO payment_requests (user_id, method, network, amount, trx_id, sender_account, screenshot_url, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(userId, method, network || null, amt, cleanTrx, sender_account || "", screenshot_url || "", now);
		return res.status(201).json({
			success: true,
			request_id: Number(result.lastInsertRowid),
			message: "Deposit request submitted successfully! An administrator will verify and approve your balance shortly."
		});
	} catch (err) {
		return res.status(500).json({ error: "Failed to submit payment request: " + err.message });
	}
});
userRouter.get("/transactions", requireAuth, (req, res) => {
	const transactions = db.prepare(`
    SELECT * FROM transactions
    WHERE user_id = ?
    ORDER BY id DESC
    LIMIT 100
  `).all(req.user.id);
	return res.json({ transactions });
});
userRouter.get("/referrals", requireAuth, (req, res) => {
	const userId = req.user.id;
	const user = req.user;
	const refPercentRow = db.prepare("SELECT value FROM settings WHERE key = 'referral_percent'").get();
	const commissionRate = refPercentRow ? parseFloat(refPercentRow.value) : 5;
	const referredUsers = db.prepare(`
    SELECT id, username, email, created_at, spent
    FROM users
    WHERE referred_by = ?
    ORDER BY id DESC
  `).all(userId);
	const totalReferrals = referredUsers.length;
	const totalSpentByReferrals = referredUsers.reduce((sum, u) => sum + (u.spent || 0), 0);
	const totalCommissionEarned = parseFloat((totalSpentByReferrals * commissionRate / 100).toFixed(2));
	return res.json({
		referral_code: user.referral_code,
		commission_rate: commissionRate,
		total_referrals: totalReferrals,
		total_earnings: totalCommissionEarned,
		referred_users: referredUsers.map((u) => ({
			id: u.id,
			username: u.username.substring(0, 3) + "***",
			created_at: u.created_at,
			contribution: parseFloat((u.spent * commissionRate / 100).toFixed(2))
		}))
	});
});
userRouter.get("/tickets", requireAuth, (req, res) => {
	const tickets = db.prepare(`
    SELECT * FROM support_tickets
    WHERE user_id = ?
    ORDER BY updated_at DESC
  `).all(req.user.id);
	return res.json({ tickets });
});
userRouter.post("/tickets", requireAuth, (req, res) => {
	const userId = req.user.id;
	const { subject, category, priority, order_id, message } = req.body;
	if (!subject || !message) return res.status(400).json({ error: "Subject and initial message are required." });
	const now = (/* @__PURE__ */ new Date()).toISOString();
	db.exec("BEGIN TRANSACTION");
	try {
		const result = db.prepare(`
      INSERT INTO support_tickets (user_id, subject, category, priority, order_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'open', ?, ?)
    `).run(userId, subject, category || "Order", priority || "normal", order_id ? Number(order_id) : null, now, now);
		const ticketId = Number(result.lastInsertRowid);
		db.prepare(`
      INSERT INTO ticket_messages (ticket_id, sender_id, sender_role, message, created_at)
      VALUES (?, ?, 'user', ?, ?)
    `).run(ticketId, userId, message, now);
		db.exec("COMMIT");
		return res.status(201).json({
			success: true,
			ticket_id: ticketId,
			message: "Ticket opened successfully."
		});
	} catch (err) {
		db.exec("ROLLBACK");
		return res.status(500).json({ error: "Ticket creation failed: " + err.message });
	}
});
userRouter.get("/tickets/:id", requireAuth, (req, res) => {
	const userId = req.user.id;
	const ticketId = parseInt(req.params.id, 10);
	const ticket = db.prepare(`
    SELECT * FROM support_tickets
    WHERE id = ? AND (user_id = ? OR ? = 'admin')
  `).get(ticketId, userId, req.user.role);
	if (!ticket) return res.status(404).json({ error: "Ticket not found" });
	const messages = db.prepare(`
    SELECT tm.*, u.username as sender_username
    FROM ticket_messages tm
    JOIN users u ON tm.sender_id = u.id
    WHERE tm.ticket_id = ?
    ORDER BY tm.id ASC
  `).all(ticketId);
	return res.json({
		ticket,
		messages
	});
});
userRouter.post("/tickets/:id/messages", requireAuth, (req, res) => {
	const userId = req.user.id;
	const role = req.user.role;
	const ticketId = parseInt(req.params.id, 10);
	const { message } = req.body;
	if (!message || !message.trim()) return res.status(400).json({ error: "Message cannot be empty." });
	if (!db.prepare(`
    SELECT * FROM support_tickets
    WHERE id = ? AND (user_id = ? OR ? = 'admin')
  `).get(ticketId, userId, role)) return res.status(404).json({ error: "Ticket not found." });
	const now = (/* @__PURE__ */ new Date()).toISOString();
	const nextStatus = role === "admin" ? "answered" : "open";
	db.exec("BEGIN TRANSACTION");
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
		db.exec("COMMIT");
		return res.json({
			success: true,
			message: "Reply sent successfully."
		});
	} catch (err) {
		db.exec("ROLLBACK");
		return res.status(500).json({ error: "Failed to send reply: " + err.message });
	}
});
userRouter.put("/tickets/:id/close", requireAuth, (req, res) => {
	const userId = req.user.id;
	const ticketId = parseInt(req.params.id, 10);
	if (!db.prepare(`
    SELECT * FROM support_tickets
    WHERE id = ? AND (user_id = ? OR ? = 'admin')
  `).get(ticketId, userId, req.user.role)) return res.status(404).json({ error: "Ticket not found." });
	db.prepare(`
    UPDATE support_tickets
    SET status = 'closed', updated_at = ?
    WHERE id = ?
  `).run((/* @__PURE__ */ new Date()).toISOString(), ticketId);
	return res.json({
		success: true,
		message: "Ticket closed successfully."
	});
});
userRouter.get("/announcements", (req, res) => {
	const announcements = db.prepare(`
    SELECT * FROM announcements
    WHERE active = 1
    ORDER BY id DESC
  `).all();
	return res.json({ announcements });
});
userRouter.get("/stats", (req, res) => {
	const totalOrders = db.prepare("SELECT COUNT(*) as count FROM orders").get();
	const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get();
	const activeServices = db.prepare("SELECT COUNT(*) as count FROM services WHERE status = 'active'").get();
	return res.json({
		total_orders_served: 284190 + (totalOrders.count || 0),
		registered_users: 14200 + (totalUsers.count || 0),
		active_services: activeServices.count || 0,
		satisfaction_rate: "99.4%"
	});
});
userRouter.post("/contact", (req, res) => {
	const { name, email, subject, message } = req.body;
	if (!name || !email || !message) return res.status(400).json({ error: "Name, email, and message are required." });
	return res.json({
		success: true,
		message: "Thank you for reaching out! Our Pakistani support team will reply to your email within 2-4 hours."
	});
});
// server/routes/admin.ts
var adminRouter = Router();
adminRouter.use(requireAdmin);
function logAudit(adminId, action, targetType, targetId, details) {
	try {
		db.prepare(`
      INSERT INTO audit_logs (admin_id, action, target_type, target_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(adminId, action, targetType, targetId, details, (/* @__PURE__ */ new Date()).toISOString());
	} catch (e) {}
}
adminRouter.get("/overview", (req, res) => {
	const usersCount = db.prepare("SELECT COUNT(*) as count FROM users").get();
	const ordersCount = db.prepare("SELECT COUNT(*) as count FROM orders").get();
	const pendingOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'Pending'").get();
	const pendingPayments = db.prepare("SELECT COUNT(*) as count FROM payment_requests WHERE status = 'pending'").get();
	const openTickets = db.prepare("SELECT COUNT(*) as count FROM support_tickets WHERE status = 'open'").get();
	const revenueTotal = db.prepare("SELECT SUM(amount) as total FROM payment_requests WHERE status = 'approved'").get();
	const spentTotal = db.prepare("SELECT SUM(charge) as total FROM orders WHERE status != 'Canceled'").get();
	const recentOrders = db.prepare(`
    SELECT o.id, o.charge, o.quantity, o.status, o.created_at, o.link, u.username,
           COALESCE(s.name, 'Service #' || o.service_id) as service_name,
           COALESCE(c.name, 'General') as category_name
    FROM orders o
    JOIN users u ON o.user_id = u.id
    LEFT JOIN services s ON o.service_id = s.id
    LEFT JOIN categories c ON s.category_id = c.id
    ORDER BY o.id DESC LIMIT 6
  `).all();
	const recentPayments = db.prepare(`
    SELECT p.*, u.username
    FROM payment_requests p
    JOIN users u ON p.user_id = u.id
    ORDER BY p.id DESC LIMIT 6
  `).all();
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
adminRouter.get("/users", (req, res) => {
	const search = (req.query.search || "").toString().trim().toLowerCase();
	let query = `
    SELECT id, email, username, role, balance, spent, status, referral_code, created_at, timezone, currency
    FROM users
  `;
	const params = [];
	if (search) {
		query += ` WHERE LOWER(username) LIKE ? OR LOWER(email) LIKE ? OR CAST(id AS TEXT) LIKE ?`;
		params.push(`%${search}%`, `%${search}%`, `%${search}%`);
	}
	query += ` ORDER BY id DESC LIMIT 150`;
	const users = db.prepare(query).all(...params);
	return res.json({ users });
});
adminRouter.post("/users/:id/balance", (req, res) => {
	const adminId = req.user.id;
	const targetUserId = parseInt(req.params.id, 10);
	const { action, amount, reason } = req.body;
	const amt = parseFloat(amount);
	if (isNaN(amt) || amt <= 0) return res.status(400).json({ error: "Please enter a valid positive amount." });
	const user = db.prepare("SELECT id, username, balance, spent FROM users WHERE id = ?").get(targetUserId);
	if (!user) return res.status(404).json({ error: "User not found." });
	let newBalance = user.balance;
	let txType = "admin_adjustment";
	let txDesc = reason || "Admin Balance Adjustment";
	if (action === "add") {
		newBalance += amt;
		txType = "deposit";
		txDesc = `Admin Credit: ${txDesc}`;
	} else if (action === "deduct") {
		newBalance = Math.max(0, newBalance - amt);
		txDesc = `Admin Deduction: ${txDesc}`;
	} else return res.status(400).json({ error: "Invalid action. Must be \"add\" or \"deduct\"." });
	const now = (/* @__PURE__ */ new Date()).toISOString();
	db.exec("BEGIN TRANSACTION");
	try {
		db.prepare("UPDATE users SET balance = ? WHERE id = ?").run(newBalance, targetUserId);
		db.prepare(`
      INSERT INTO transactions (user_id, type, amount, balance_after, description, reference_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(targetUserId, txType, action === "add" ? amt : -amt, newBalance, txDesc, `ADM-${adminId}`, now);
		logAudit(adminId, `balance_${action}`, "user", String(targetUserId), `Changed balance by ${amt} PKR. New balance: ${newBalance}. Reason: ${reason}`);
		db.exec("COMMIT");
		return res.json({
			success: true,
			new_balance: newBalance,
			message: `User balance updated to Rs ${newBalance.toFixed(2)}.`
		});
	} catch (err) {
		db.exec("ROLLBACK");
		return res.status(500).json({ error: "Failed to update balance: " + err.message });
	}
});
adminRouter.put("/users/:id/status", (req, res) => {
	const adminId = req.user.id;
	const targetUserId = parseInt(req.params.id, 10);
	const { status, role } = req.body;
	if (targetUserId === adminId && status === "suspended") return res.status(400).json({ error: "You cannot suspend your own admin account." });
	db.prepare(`
    UPDATE users
    SET status = COALESCE(?, status),
        role = COALESCE(?, role)
    WHERE id = ?
  `).run(status || null, role || null, targetUserId);
	logAudit(adminId, "update_user_status", "user", String(targetUserId), `Status: ${status}, Role: ${role}`);
	return res.json({
		success: true,
		message: "User status updated successfully."
	});
});
adminRouter.get("/orders", (req, res) => {
	const status = (req.query.status || "all").toString();
	const search = (req.query.search || "").toString().trim().toLowerCase();
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
	const params = [];
	const conditions = [];
	if (status && status !== "all") {
		conditions.push("LOWER(o.status) = ?");
		params.push(status.toLowerCase());
	}
	if (search) {
		conditions.push("(LOWER(s.name) LIKE ? OR LOWER(o.link) LIKE ? OR LOWER(COALESCE(o.delivery_contact, '')) LIKE ? OR LOWER(u.username) LIKE ? OR CAST(o.id AS TEXT) LIKE ?)");
		params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
	}
	if (conditions.length > 0) query += " WHERE " + conditions.join(" AND ");
	query += " ORDER BY o.id DESC LIMIT 200";
	const orders = db.prepare(query).all(...params);
	return res.json({ orders });
});
adminRouter.put("/orders/:id/status", (req, res) => {
	const adminId = req.user.id;
	const orderId = parseInt(req.params.id, 10);
	const { status, start_count, remains } = req.body;
	const validStatuses = [
		"Pending",
		"In progress",
		"Completed",
		"Processing",
		"Partial",
		"Canceled"
	];
	if (!status || !validStatuses.includes(status)) return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(", ")}` });
	const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
	if (!order) return res.status(404).json({ error: "Order not found." });
	const now = (/* @__PURE__ */ new Date()).toISOString();
	if (status === "Canceled" && order.status !== "Canceled") {
		const user = db.prepare("SELECT balance, spent FROM users WHERE id = ?").get(order.user_id);
		const refund = order.charge;
		const newBal = user.balance + refund;
		const newSpent = Math.max(0, user.spent - refund);
		db.exec("BEGIN TRANSACTION");
		try {
			db.prepare("UPDATE orders SET status = ?, remains = 0, updated_at = ? WHERE id = ?").run(status, now, orderId);
			db.prepare("UPDATE users SET balance = ?, spent = ? WHERE id = ?").run(newBal, newSpent, order.user_id);
			db.prepare(`
        INSERT INTO transactions (user_id, type, amount, balance_after, description, reference_id, created_at)
        VALUES (?, 'refund', ?, ?, ?, ?, ?)
      `).run(order.user_id, refund, newBal, `Refund for Canceled Order #${orderId}`, `REF-${orderId}`, now);
			logAudit(adminId, "cancel_order_refund", "order", String(orderId), `Refunded Rs ${refund} to user #${order.user_id}`);
			db.exec("COMMIT");
			return res.json({
				success: true,
				message: `Order #${orderId} marked Canceled and Rs ${refund} refunded to user.`
			});
		} catch (e) {
			db.exec("ROLLBACK");
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
  `).run(status, start_count !== void 0 ? Number(start_count) : null, remains !== void 0 ? Number(remains) : null, now, orderId);
	logAudit(adminId, "update_order_status", "order", String(orderId), `Status changed to ${status}`);
	return res.json({
		success: true,
		message: `Order #${orderId} updated to ${status}.`
	});
});
adminRouter.post("/orders", (req, res) => {
	const adminId = req.user.id;
	const { user_id, service_id, link, quantity, delivery_contact, deduct_balance, status } = req.body;
	const targetUserId = parseInt(user_id, 10);
	const sId = parseInt(service_id, 10);
	const parsedQty = parseInt(quantity, 10);
	const cleanLink = (link || "").trim();
	const cleanDeliveryContact = (delivery_contact || "").trim();
	const shouldDeduct = deduct_balance !== false;
	const initialStatus = status && [
		"Pending",
		"In progress",
		"Completed",
		"Processing"
	].includes(status) ? status : "Pending";
	if (!targetUserId || !sId || !cleanLink) return res.status(400).json({ error: "Client user, service, and target input are required." });
	const targetUser = db.prepare("SELECT id, username, balance, spent FROM users WHERE id = ?").get(targetUserId);
	if (!targetUser) return res.status(404).json({ error: "Target user not found." });
	const service = db.prepare(`
    SELECT s.*, c.name as category_name
    FROM services s
    LEFT JOIN categories c ON s.category_id = c.id
    WHERE s.id = ?
  `).get(sId);
	if (!service) return res.status(404).json({ error: "Selected service not found." });
	const isSimDetails = isSimDetailsCategoryName(service.category_name);
	let finalTargetInput = cleanLink;
	let finalDeliveryContact = null;
	let finalQuantity = parsedQty;
	let charge = 0;
	if (isSimDetails) {
		const simCheck = validateSimDetailsInput(cleanLink);
		if (!simCheck.valid) return res.status(400).json({ error: simCheck.error });
		finalTargetInput = simCheck.normalized;
		const deliveryCheck = validateDeliveryContact(cleanDeliveryContact);
		if (!deliveryCheck.valid) return res.status(400).json({ error: deliveryCheck.error });
		finalDeliveryContact = deliveryCheck.normalized;
		finalQuantity = 1;
		charge = parseFloat(Number(service.rate_per_1000).toFixed(2));
	} else {
		if (!parsedQty || isNaN(parsedQty) || parsedQty <= 0) return res.status(400).json({ error: "Please provide a valid quantity." });
		if (parsedQty < service.min_quantity || parsedQty > service.max_quantity) return res.status(400).json({ error: `Quantity for this service must be between ${service.min_quantity.toLocaleString()} and ${service.max_quantity.toLocaleString()}.` });
		charge = parseFloat((parsedQty / 1e3 * service.rate_per_1000).toFixed(2));
	}
	const now = (/* @__PURE__ */ new Date()).toISOString();
	db.exec("BEGIN IMMEDIATE TRANSACTION");
	try {
		let newBalance = targetUser.balance;
		if (shouldDeduct) {
			if (db.prepare(`
        UPDATE users
        SET balance = ROUND(balance - ?, 2),
            spent = ROUND(spent + ?, 2)
        WHERE id = ? AND balance >= ?
      `).run(charge, charge, targetUserId, charge).changes !== 1) {
				db.exec("ROLLBACK");
				const freshUser = db.prepare("SELECT balance FROM users WHERE id = ?").get(targetUserId);
				return res.status(400).json({ error: `Client has insufficient balance. Required: Rs ${charge.toFixed(2)}, Available: Rs ${(freshUser?.balance || 0).toFixed(2)}.` });
			}
			newBalance = db.prepare("SELECT balance FROM users WHERE id = ?").get(targetUserId).balance;
		}
		const orderId = allocateNextOrderId();
		const remains = initialStatus === "Completed" ? 0 : finalQuantity;
		db.prepare(`
      INSERT INTO orders (id, user_id, service_id, link, delivery_contact, quantity, charge, start_count, remains, status, mode, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'Manual', ?, ?)
    `).run(orderId, targetUserId, service.id, finalTargetInput, finalDeliveryContact, finalQuantity, shouldDeduct ? charge : 0, remains, initialStatus, now, now);
		if (shouldDeduct) db.prepare(`
        INSERT INTO transactions (user_id, type, amount, balance_after, description, reference_id, created_at)
        VALUES (?, 'order', ?, ?, ?, ?, ?)
      `).run(targetUserId, -charge, newBalance, `Admin Order #${orderId} - ${service.name}`, `ORD-${orderId}`, now);
		logAudit(adminId, "admin_create_order", "order", String(orderId), `Created Order #${orderId} for user ${targetUser.username} (Deducted: ${shouldDeduct ? `Rs ${charge}` : "Rs 0"})`);
		db.exec("COMMIT");
		return res.status(201).json({
			success: true,
			order_id: orderId,
			charge: shouldDeduct ? charge : 0,
			message: `Order #${orderId} created for ${targetUser.username}!`
		});
	} catch (err) {
		try {
			db.exec("ROLLBACK");
		} catch {}
		return res.status(500).json({ error: "Admin order creation failed: " + err.message });
	}
});
adminRouter.get("/categories", (req, res) => {
	const categories = db.prepare(`
    SELECT c.*, COUNT(s.id) as service_count
    FROM categories c
    LEFT JOIN services s ON s.category_id = c.id
    GROUP BY c.id
    ORDER BY c.sort_order ASC, c.id ASC
  `).all();
	return res.json({ categories });
});
adminRouter.post("/categories", (req, res) => {
	const { name, icon, image_url, description, sort_order, status } = req.body;
	if (!name || !String(name).trim()) return res.status(400).json({ error: "Category name is required." });
	let finalSort = Number(sort_order);
	if (isNaN(finalSort)) finalSort = (db.prepare("SELECT MAX(sort_order) as max_sort FROM categories").get()?.max_sort || 0) + 1;
	try {
		const resCat = db.prepare(`
      INSERT INTO categories (name, icon, image_url, description, sort_order, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(String(name).trim(), icon ? String(icon).trim() : "Globe", image_url ? String(image_url).trim() : null, description ? String(description).trim() : "", finalSort, status === "inactive" ? "inactive" : "active");
		const newId = Number(resCat.lastInsertRowid);
		logAudit(req.user.id, "create_category", "category", String(newId), `Created category "${name.trim()}"`);
		return res.status(201).json({
			success: true,
			id: newId,
			message: "Category created successfully."
		});
	} catch (err) {
		return res.status(500).json({ error: "Failed to create category: " + err.message });
	}
});
adminRouter.put("/categories/:id", (req, res) => {
	const id = parseInt(req.params.id, 10);
	if (isNaN(id)) return res.status(400).json({ error: "Invalid category ID." });
	const existing = db.prepare("SELECT * FROM categories WHERE id = ?").get(id);
	if (!existing) return res.status(404).json({ error: "Category not found." });
	const { name, icon, image_url, description, sort_order, status } = req.body;
	if (name !== void 0 && !String(name).trim()) return res.status(400).json({ error: "Category name cannot be empty." });
	const finalName = name !== void 0 ? String(name).trim() : existing.name;
	const finalIcon = icon !== void 0 ? String(icon).trim() : existing.icon;
	const finalImage = image_url !== void 0 ? image_url ? String(image_url).trim() : null : existing.image_url;
	const finalDesc = description !== void 0 ? String(description).trim() : existing.description || "";
	const finalSort = sort_order !== void 0 ? Number(sort_order) : existing.sort_order;
	const finalStatus = status !== void 0 ? String(status) : existing.status;
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
		logAudit(req.user.id, "edit_category", "category", String(id), `Updated category "${finalName}"`);
		return res.json({
			success: true,
			message: "Category updated successfully."
		});
	} catch (err) {
		return res.status(500).json({ error: "Failed to update category: " + err.message });
	}
});
adminRouter.post("/categories/reorder", (req, res) => {
	const { order } = req.body;
	if (!Array.isArray(order) || order.length === 0) return res.status(400).json({ error: "Valid category order array is required." });
	const updateStmt = db.prepare("UPDATE categories SET sort_order = ? WHERE id = ?");
	db.exec("BEGIN TRANSACTION");
	try {
		for (let i = 0; i < order.length; i++) {
			const item = order[i];
			const catId = typeof item === "object" && item !== null ? Number(item.id) : Number(item);
			const sortVal = typeof item === "object" && item !== null && item.sort_order !== void 0 ? Number(item.sort_order) : i + 1;
			if (!isNaN(catId)) updateStmt.run(sortVal, catId);
		}
		db.exec("COMMIT");
		logAudit(req.user.id, "reorder_categories", "category", "all", `Reordered ${order.length} categories`);
		return res.json({
			success: true,
			message: "Category order saved permanently."
		});
	} catch (err) {
		db.exec("ROLLBACK");
		return res.status(500).json({ error: "Failed to save category order: " + err.message });
	}
});
adminRouter.post("/categories/upload-icon", (req, res) => {
	const { image_data, filename } = req.body;
	if (!image_data || typeof image_data !== "string") return res.status(400).json({ error: "Base64 image data is required." });
	try {
		const uploadsDir = getUploadsDirectory();
		let ext = "png";
		if (image_data.startsWith("data:image/jpeg") || image_data.startsWith("data:image/jpg")) ext = "jpg";
		else if (image_data.startsWith("data:image/webp")) ext = "webp";
		else if (image_data.startsWith("data:image/svg")) ext = "svg";
		const cleanBase64 = image_data.replace(/^data:image\/[a-z0-9+-]+;base64,/, "");
		const buffer = Buffer.from(cleanBase64, "base64");
		if (buffer.length < 50) return res.status(400).json({ error: "Invalid or corrupt image file." });
		const uniqueName = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
		const targetPath = path.join(uploadsDir, uniqueName);
		fs.writeFileSync(targetPath, buffer);
		const publicUrl = `/uploads/categories/${uniqueName}`;
		return res.json({
			success: true,
			url: publicUrl,
			message: "Category image uploaded successfully."
		});
	} catch (err) {
		return res.status(500).json({ error: "Failed to save image: " + err.message });
	}
});
adminRouter.delete("/categories/:id", (req, res) => {
	const id = parseInt(req.params.id, 10);
	if (isNaN(id)) return res.status(400).json({ error: "Invalid category ID." });
	const count = db.prepare("SELECT COUNT(*) as count FROM services WHERE category_id = ?").get(id);
	const isForce = req.query.force === "true";
	if (count.count > 0 && !isForce) return res.status(400).json({
		error: `Cannot delete category because it contains ${count.count} active services. Please delete or reassign services first.`,
		service_count: count.count
	});
	db.exec("BEGIN TRANSACTION");
	try {
		if (isForce && count.count > 0) {
			const otherCat = db.prepare("SELECT id FROM categories WHERE id != ? LIMIT 1").get(id);
			if (otherCat) db.prepare("UPDATE services SET category_id = ? WHERE category_id = ?").run(otherCat.id, id);
		}
		db.prepare("DELETE FROM categories WHERE id = ?").run(id);
		db.exec("COMMIT");
		logAudit(req.user.id, "delete_category", "category", String(id), `Deleted category #${id}`);
		return res.json({
			success: true,
			message: "Category deleted successfully."
		});
	} catch (err) {
		db.exec("ROLLBACK");
		return res.status(500).json({ error: "Failed to delete category: " + err.message });
	}
});
adminRouter.get("/services", (req, res) => {
	const services = db.prepare(`
    SELECT s.*, c.name as category_name, c.sort_order as category_sort
    FROM services s
    LEFT JOIN categories c ON s.category_id = c.id
    ORDER BY c.sort_order ASC, s.id ASC
  `).all();
	const categories = db.prepare(`
    SELECT c.*, COUNT(s.id) as service_count
    FROM categories c
    LEFT JOIN services s ON s.category_id = c.id
    GROUP BY c.id
    ORDER BY c.sort_order ASC, c.id ASC
  `).all();
	return res.json({
		services,
		categories
	});
});
adminRouter.post("/services", (req, res) => {
	const { category_id, name, type, rate_per_1000, min_quantity, max_quantity, description, refill_supported, cancel_supported, status } = req.body;
	if (!name || !String(name).trim()) return res.status(400).json({ error: "Service name is required." });
	const catId = Number(category_id);
	if (isNaN(catId)) return res.status(400).json({ error: "Please select a valid category." });
	if (!db.prepare("SELECT id FROM categories WHERE id = ?").get(catId)) return res.status(400).json({ error: "The selected category does not exist." });
	const rate = parseFloat(rate_per_1000);
	if (isNaN(rate) || rate <= 0) return res.status(400).json({ error: "Rate per 1000 must be a valid positive number." });
	const minQty = parseInt(min_quantity, 10);
	if (isNaN(minQty) || minQty < 1) return res.status(400).json({ error: "Minimum quantity must be at least 1." });
	const maxQty = parseInt(max_quantity, 10);
	if (isNaN(maxQty) || maxQty < minQty) return res.status(400).json({ error: "Maximum quantity must be greater than or equal to minimum quantity." });
	try {
		const resServ = db.prepare(`
      INSERT INTO services (category_id, name, type, rate_per_1000, min_quantity, max_quantity, description, refill_supported, cancel_supported, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(catId, String(name).trim(), type ? String(type).trim() : "Default", rate, minQty, maxQty, description ? String(description).trim() : "", refill_supported ? 1 : 0, cancel_supported ? 1 : 0, status === "inactive" ? "inactive" : "active");
		const newId = Number(resServ.lastInsertRowid);
		logAudit(req.user.id, "create_service", "service", String(newId), `Created service #${newId} (${name})`);
		return res.status(201).json({
			success: true,
			id: newId,
			message: "Service created successfully."
		});
	} catch (err) {
		return res.status(500).json({ error: "Failed to create service: " + err.message });
	}
});
adminRouter.put("/services/:id", (req, res) => {
	const id = parseInt(req.params.id, 10);
	if (isNaN(id)) return res.status(400).json({ error: "Invalid service ID." });
	const existing = db.prepare("SELECT * FROM services WHERE id = ?").get(id);
	if (!existing) return res.status(404).json({ error: `Service #${id} was not found.` });
	const { category_id, name, type, rate_per_1000, min_quantity, max_quantity, description, refill_supported, cancel_supported, status } = req.body;
	if (name !== void 0 && !String(name).trim()) return res.status(400).json({ error: "Service name cannot be empty." });
	const finalCatId = category_id !== void 0 ? Number(category_id) : existing.category_id;
	if (!db.prepare("SELECT id FROM categories WHERE id = ?").get(finalCatId)) return res.status(400).json({ error: `Category #${finalCatId} does not exist.` });
	const finalRate = rate_per_1000 !== void 0 ? parseFloat(rate_per_1000) : existing.rate_per_1000;
	if (isNaN(finalRate) || finalRate <= 0) return res.status(400).json({ error: "Rate per 1000 must be a valid positive number." });
	const finalMin = min_quantity !== void 0 ? parseInt(min_quantity, 10) : existing.min_quantity;
	if (isNaN(finalMin) || finalMin < 1) return res.status(400).json({ error: "Minimum quantity must be at least 1." });
	const finalMax = max_quantity !== void 0 ? parseInt(max_quantity, 10) : existing.max_quantity;
	if (isNaN(finalMax) || finalMax < finalMin) return res.status(400).json({ error: "Maximum quantity must be greater than or equal to minimum quantity." });
	const finalName = name !== void 0 ? String(name).trim() : existing.name;
	const finalType = type !== void 0 ? String(type).trim() : existing.type;
	const finalDesc = description !== void 0 ? String(description) : existing.description || "";
	const finalRefill = refill_supported !== void 0 ? refill_supported ? 1 : 0 : existing.refill_supported;
	const finalCancel = cancel_supported !== void 0 ? cancel_supported ? 1 : 0 : existing.cancel_supported;
	const finalStatus = status !== void 0 ? String(status) : existing.status;
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
    `).run(finalCatId, finalName, finalType, finalRate, finalMin, finalMax, finalDesc, finalRefill, finalCancel, finalStatus, id);
		logAudit(req.user.id, "edit_service", "service", String(id), `Updated service #${id} (${finalName})`);
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
	} catch (err) {
		return res.status(500).json({ error: "Failed to update service: " + err.message });
	}
});
adminRouter.post("/services/bulk-status", (req, res) => {
	const { ids, status } = req.body;
	if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "Please select at least one service." });
	if (!["active", "inactive"].includes(status)) return res.status(400).json({ error: "Invalid status. Must be active or inactive." });
	db.exec("BEGIN TRANSACTION");
	try {
		const stmt = db.prepare("UPDATE services SET status = ? WHERE id = ?");
		for (const id of ids) stmt.run(status, Number(id));
		db.exec("COMMIT");
		logAudit(req.user.id, "bulk_status_services", "service", ids.join(","), `Updated ${ids.length} services to ${status}`);
		return res.json({
			success: true,
			message: `Successfully marked ${ids.length} services as ${status}.`
		});
	} catch (err) {
		db.exec("ROLLBACK");
		return res.status(500).json({ error: "Bulk status update failed: " + err.message });
	}
});
adminRouter.post("/services/bulk-category", (req, res) => {
	const { ids, category_id } = req.body;
	if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "Please select at least one service." });
	const cat = db.prepare("SELECT id, name FROM categories WHERE id = ?").get(Number(category_id));
	if (!cat) return res.status(400).json({ error: "Selected category does not exist." });
	db.exec("BEGIN TRANSACTION");
	try {
		const stmt = db.prepare("UPDATE services SET category_id = ? WHERE id = ?");
		for (const id of ids) stmt.run(cat.id, Number(id));
		db.exec("COMMIT");
		logAudit(req.user.id, "bulk_category_services", "service", ids.join(","), `Moved ${ids.length} services to category "${cat.name}"`);
		return res.json({
			success: true,
			message: `Successfully moved ${ids.length} services to ${cat.name}.`
		});
	} catch (err) {
		db.exec("ROLLBACK");
		return res.status(500).json({ error: "Bulk category update failed: " + err.message });
	}
});
adminRouter.post("/services/bulk-delete", (req, res) => {
	const { ids } = req.body;
	if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: "Please select at least one service to delete." });
	db.exec("BEGIN TRANSACTION");
	try {
		const stmt = db.prepare("DELETE FROM services WHERE id = ?");
		for (const id of ids) stmt.run(Number(id));
		db.exec("COMMIT");
		logAudit(req.user.id, "bulk_delete_services", "service", ids.join(","), `Deleted ${ids.length} services`);
		return res.json({
			success: true,
			message: `Successfully deleted ${ids.length} services.`
		});
	} catch (err) {
		db.exec("ROLLBACK");
		return res.status(500).json({ error: "Bulk delete failed: " + err.message });
	}
});
adminRouter.delete("/services/:id", (req, res) => {
	const id = parseInt(req.params.id, 10);
	if (isNaN(id)) return res.status(400).json({ error: "Invalid service ID." });
	db.prepare("DELETE FROM services WHERE id = ?").run(id);
	logAudit(req.user.id, "delete_service", "service", String(id), `Deleted service #${id}`);
	return res.json({
		success: true,
		message: "Service deleted successfully"
	});
});
adminRouter.post("/services/delete-all", (req, res) => {
	const { confirmation } = req.body;
	if (confirmation !== "DELETE ALL") return res.status(400).json({ error: "Confirmation string must be exactly \"DELETE ALL\"." });
	const count = db.prepare("SELECT COUNT(*) as count FROM services").get()?.count || 0;
	db.exec("BEGIN TRANSACTION");
	try {
		db.prepare("DELETE FROM services").run();
		db.exec("COMMIT");
		logAudit(req.user.id, "delete_all_services", "service", "all", `Deleted all ${count} services from catalog`);
		return res.json({
			success: true,
			message: `All ${count} services have been removed from the catalog. Historical orders and customer records remain completely intact.`
		});
	} catch (err) {
		db.exec("ROLLBACK");
		return res.status(500).json({ error: "Failed to delete all services: " + err.message });
	}
});
adminRouter.get("/payments", (req, res) => {
	const status = (req.query.status || "all").toString();
	const method = (req.query.method || "all").toString();
	const network = (req.query.network || "all").toString();
	let query = `
    SELECT p.*, u.username, u.email, u.balance as current_user_balance
    FROM payment_requests p
    JOIN users u ON p.user_id = u.id
    WHERE 1=1
  `;
	const params = [];
	if (status && status !== "all") {
		query += ` AND p.status = ?`;
		params.push(status.toLowerCase());
	}
	if (method && method !== "all") {
		query += ` AND LOWER(p.method) = ?`;
		params.push(method.toLowerCase());
	}
	if (network && network !== "all") {
		query += ` AND LOWER(p.network) = ?`;
		params.push(network.toLowerCase());
	}
	query += ` ORDER BY p.id DESC LIMIT 150`;
	const payments = db.prepare(query).all(...params);
	return res.json({ payments });
});
adminRouter.post("/payments/:id/process", (req, res) => {
	const adminId = req.user.id;
	const requestId = parseInt(req.params.id, 10);
	const { action, notes } = req.body;
	if (action !== "approve" && action !== "reject") return res.status(400).json({ error: "Action must be \"approve\" or \"reject\"." });
	const paymentReq = db.prepare("SELECT * FROM payment_requests WHERE id = ?").get(requestId);
	if (!paymentReq) return res.status(404).json({ error: "Payment request not found." });
	if (paymentReq.status !== "pending") return res.status(400).json({ error: `Payment request has already been ${paymentReq.status}.` });
	const now = (/* @__PURE__ */ new Date()).toISOString();
	const user = db.prepare("SELECT id, balance, username FROM users WHERE id = ?").get(paymentReq.user_id);
	if (action === "approve") {
		const creditAmount = paymentReq.amount;
		const newBalance = user.balance + creditAmount;
		db.exec("BEGIN TRANSACTION");
		try {
			db.prepare(`
        UPDATE payment_requests
        SET status = 'approved', admin_notes = ?, processed_at = ?
        WHERE id = ?
      `).run(notes || "Payment verified and approved.", now, requestId);
			db.prepare("UPDATE users SET balance = ? WHERE id = ?").run(newBalance, user.id);
			const methodLabel = paymentReq.network ? `${paymentReq.method} (${paymentReq.network})` : paymentReq.method;
			db.prepare(`
        INSERT INTO transactions (user_id, type, amount, balance_after, description, reference_id, created_at)
        VALUES (?, 'deposit', ?, ?, ?, ?, ?)
      `).run(user.id, creditAmount, newBalance, `${methodLabel} Deposit Approved (TRX: ${paymentReq.trx_id})`, `TRX-${paymentReq.trx_id}`, now);
			logAudit(adminId, "approve_payment", "payment_request", String(requestId), `Approved Rs ${creditAmount} for user ${user.username} via ${methodLabel}`);
			db.exec("COMMIT");
			return res.json({
				success: true,
				message: `Deposit request #${requestId} approved! Rs ${creditAmount.toFixed(2)} added to ${user.username}'s balance.`
			});
		} catch (err) {
			db.exec("ROLLBACK");
			return res.status(500).json({ error: "Failed to approve payment: " + err.message });
		}
	} else {
		db.prepare(`
      UPDATE payment_requests
      SET status = 'rejected', admin_notes = ?, processed_at = ?
      WHERE id = ?
    `).run(notes || "Transaction ID not verified with bank/wallet gateway.", now, requestId);
		logAudit(adminId, "reject_payment", "payment_request", String(requestId), `Rejected deposit request. Note: ${notes}`);
		return res.json({
			success: true,
			message: `Deposit request #${requestId} rejected.`
		});
	}
});
adminRouter.get("/tickets", (req, res) => {
	const status = (req.query.status || "all").toString();
	let query = `
    SELECT t.*, u.username, u.email
    FROM support_tickets t
    JOIN users u ON t.user_id = u.id
  `;
	const params = [];
	if (status && status !== "all") {
		query += ` WHERE t.status = ?`;
		params.push(status.toLowerCase());
	}
	query += ` ORDER BY t.updated_at DESC LIMIT 150`;
	const tickets = db.prepare(query).all(...params);
	return res.json({ tickets });
});
adminRouter.get("/order-sequence", (_req, res) => {
	return res.json(getOrderSequenceInfo());
});
adminRouter.put("/order-sequence", (req, res) => {
	const adminId = req.user.id;
	const rawNextId = req.body?.next_order_id;
	const parsed = Number(rawNextId);
	if (!Number.isInteger(parsed) || parsed < 1) return res.status(400).json({ error: "Next Order ID must be a positive whole number (minimum 1)." });
	const info = getOrderSequenceInfo();
	if (db.prepare("SELECT id FROM orders WHERE id = ?").get(parsed) || info.max_order_id > 0 && parsed <= info.max_order_id) return res.status(400).json({ error: `Next Order ID must be greater than your latest existing Order ID (#${info.max_order_id}). Recommended: #${info.max_order_id + 1} or higher.` });
	setNextOrderId(parsed);
	logAudit(adminId, "update_next_order_id", "settings", "next_order_id", `Set Next Order ID to #${parsed}`);
	return res.json({
		success: true,
		...getOrderSequenceInfo(),
		message: `Next Order ID updated to #${parsed}. All newly created orders will start from #${parsed}.`
	});
});
adminRouter.get("/theme", (_req, res) => {
	return res.json({ theme: getGlobalTheme() });
});
adminRouter.put("/theme", (req, res) => {
	const adminId = req.user.id;
	const { theme } = req.body;
	if (!theme || ![
		"midnight",
		"crystal",
		"neon"
	].includes(theme)) return res.status(400).json({ error: "Valid theme must be midnight, crystal, or neon." });
	setGlobalTheme(theme);
	logAudit(adminId, "update_global_theme", "settings", "global_theme", `Applied global website theme: ${theme}`);
	return res.json({
		success: true,
		theme,
		message: `Global website theme changed to ${theme}. All visitors and users now see this theme.`
	});
});
adminRouter.get("/settings", (req, res) => {
	const settingsRows = db.prepare("SELECT key, value FROM settings").all();
	const settings = {};
	for (const r of settingsRows) settings[r.key] = r.value;
	return res.json({ settings });
});
adminRouter.put("/settings", (req, res) => {
	const updates = req.body;
	const adminId = req.user.id;
	const insertOrUpdate = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);
	for (const [k, v] of Object.entries(updates)) insertOrUpdate.run(k, String(v));
	logAudit(adminId, "update_settings", "settings", "all", `Updated ${Object.keys(updates).length} keys`);
	return res.json({
		success: true,
		message: "Settings saved successfully."
	});
});
adminRouter.post("/announcements", (req, res) => {
	const { title, content, type } = req.body;
	if (!title || !content) return res.status(400).json({ error: "Title and content are required." });
	const resAnn = db.prepare(`
    INSERT INTO announcements (title, content, type, active, created_at)
    VALUES (?, ?, ?, 1, ?)
  `).run(title.trim(), content.trim(), type || "info", (/* @__PURE__ */ new Date()).toISOString());
	return res.status(201).json({
		success: true,
		id: Number(resAnn.lastInsertRowid),
		message: "Announcement published."
	});
});
adminRouter.delete("/announcements/:id", (req, res) => {
	const id = parseInt(req.params.id, 10);
	db.prepare("DELETE FROM announcements WHERE id = ?").run(id);
	return res.json({
		success: true,
		message: "Announcement deleted."
	});
});
adminRouter.get("/audit-logs", (req, res) => {
	const logs = db.prepare(`
    SELECT a.*, u.username as admin_username
    FROM audit_logs a
    JOIN users u ON a.admin_id = u.id
    ORDER BY a.id DESC LIMIT 100
  `).all();
	return res.json({ logs });
});
adminRouter.get("/export/:type", (req, res) => {
	const type = req.params.type;
	if (type === "orders") {
		const orders = db.prepare(`
      SELECT o.id, u.username, s.name as service, o.link, o.quantity, o.charge, o.status, o.created_at
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN services s ON o.service_id = s.id
      ORDER BY o.id DESC
    `).all();
		let csv = "ID,Username,Service,Link,Quantity,Charge (PKR),Status,Created At\n";
		for (const o of orders) csv += `${o.id},"${o.username}","${o.service.replace(/"/g, "\"\"")}","${o.link.replace(/"/g, "\"\"")}",${o.quantity},${o.charge},"${o.status}","${o.created_at}"\n`;
		res.setHeader("Content-Type", "text/csv");
		res.setHeader("Content-Disposition", "attachment; filename=\"pakservices_orders.csv\"");
		return res.send(csv);
	}
	if (type === "transactions") {
		const txs = db.prepare(`
      SELECT t.id, u.username, t.type, t.amount, t.balance_after, t.description, t.created_at
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.id DESC
    `).all();
		let csv = "ID,Username,Type,Amount (PKR),Balance After,Description,Created At\n";
		for (const t of txs) csv += `${t.id},"${t.username}","${t.type}",${t.amount},${t.balance_after},"${t.description.replace(/"/g, "\"\"")}","${t.created_at}"\n`;
		res.setHeader("Content-Type", "text/csv");
		res.setHeader("Content-Disposition", "attachment; filename=\"pakservices_transactions.csv\"");
		return res.send(csv);
	}
	return res.status(400).json({ error: "Invalid export type." });
});
adminRouter.get("/database/status", (req, res) => {
	const stats = getDatabaseStats();
	return res.json({ stats });
});
adminRouter.post("/database/backup", (req, res) => {
	const adminId = req.user.id;
	const result = createDatabaseBackup("manual_admin");
	if (result.success) {
		logAudit(adminId, "manual_backup", "database", "pakservices.db", `Created backup ${result.filename} (${(result.size / 1024).toFixed(1)} KB)`);
		return res.json({
			success: true,
			message: `Database backup created successfully: ${result.filename}`,
			backup: result
		});
	} else return res.status(500).json({ error: "Failed to create database backup snapshot." });
});
adminRouter.get("/database/backups", (req, res) => {
	const backups = listDatabaseBackups();
	return res.json({ backups });
});
adminRouter.get("/database/download", (req, res) => {
	if (!fs.existsSync(DB_PATH)) return res.status(404).json({ error: "Database file not found on server." });
	try {
		db.exec("PRAGMA wal_checkpoint(PASSIVE);");
	} catch {}
	const dateStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
	res.setHeader("Content-Type", "application/vnd.sqlite3");
	res.setHeader("Content-Disposition", `attachment; filename="pakservices_database_live_${dateStr}.db"`);
	return fs.createReadStream(DB_PATH).pipe(res);
});
adminRouter.get("/database/download-backup/:filename", (req, res) => {
	const filename = path.basename(req.params.filename);
	const backupDir = getBackupsDirectory();
	const filePath = path.join(backupDir, filename);
	if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Requested backup file not found." });
	res.setHeader("Content-Type", "application/vnd.sqlite3");
	res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
	return fs.createReadStream(filePath).pipe(res);
});
adminRouter.get("/database/export-json", (req, res) => {
	const fullJson = exportDatabaseJson();
	const dateStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
	res.setHeader("Content-Type", "application/json");
	res.setHeader("Content-Disposition", `attachment; filename="pakservices_full_export_${dateStr}.json"`);
	return res.send(JSON.stringify(fullJson, null, 2));
});
adminRouter.post("/database/restore", (req, res) => {
	const adminId = req.user.id;
	const { filename, file_base64 } = req.body;
	try {
		createDatabaseBackup("pre_restore_safety");
		if (filename) {
			const sanitizedFilename = path.basename(filename);
			const backupDir = getBackupsDirectory();
			const sourcePath = path.join(backupDir, sanitizedFilename);
			if (!fs.existsSync(sourcePath)) return res.status(404).json({ error: "Selected backup file does not exist." });
			fs.copyFileSync(sourcePath, DB_PATH);
			logAudit(adminId, "restore_database", "database", sanitizedFilename, `Restored database from snapshot ${sanitizedFilename}`);
			return res.json({
				success: true,
				message: `Database successfully restored from ${sanitizedFilename}.`
			});
		}
		if (file_base64) {
			const buffer = Buffer.from(file_base64.replace(/^data:.*,/, ""), "base64");
			if (buffer.length < 100) return res.status(400).json({ error: "Uploaded file is invalid or too small." });
			if (!buffer.subarray(0, 16).toString("utf-8").startsWith("SQLite format 3")) return res.status(400).json({ error: "Uploaded file is not a valid SQLite database file." });
			fs.writeFileSync(DB_PATH, buffer);
			logAudit(adminId, "restore_database", "database", "uploaded_file", `Restored database from uploaded .db file (${(buffer.length / 1024).toFixed(1)} KB)`);
			return res.json({
				success: true,
				message: "Database successfully restored from uploaded file."
			});
		}
		return res.status(400).json({ error: "Either filename or file_base64 must be provided." });
	} catch (err) {
		return res.status(500).json({ error: "Restore failed: " + err.message });
	}
});
// server.ts
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
var isProduction = process.env.NODE_ENV === "production";
async function startServer() {
	const app = express();
	initDb();
	console.log("✅ SQLite database initialized and pre-seeded.");
	try {
		const uploadsCategoryDir = getUploadsDirectory();
		const uploadsBase = path.dirname(uploadsCategoryDir);
		app.use("/uploads", express.static(uploadsBase));
		app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
	} catch (e) {
		console.warn("Could not bind uploads directory:", e);
	}
	app.use(express.json({ limit: "15mb" }));
	app.use(express.urlencoded({
		extended: true,
		limit: "15mb"
	}));
	app.use("/api", userRouter);
	app.use("/api/admin", adminRouter);
	app.get("/api/health", (req, res) => {
		res.json({
			status: "ok",
			service: "PakServices SMM Engine",
			timestamp: (/* @__PURE__ */ new Date()).toISOString()
		});
	});
	app.use("/api", (_req, res) => {
		res.status(404).json({ error: "API endpoint not found" });
	});
	if (!isProduction) {
		const vite = await createServer({
			server: {
				middlewareMode: true,
				hmr: process.env.DISABLE_HMR !== "true",
				watch: process.env.DISABLE_HMR === "true" ? null : {}
			},
			appType: "spa"
		});
		app.use(vite.middlewares);
	} else {
		const distPath = path.resolve(__dirname, "dist");
		if (fs.existsSync(distPath)) {
			app.use(express.static(distPath));
			app.get("*", (req, res) => {
				res.sendFile(path.resolve(distPath, "index.html"));
			});
		}
	}
	app.listen(PORT, "0.0.0.0", () => {
		console.log(`🚀 PakServices SMM Panel running on http://0.0.0.0:${PORT}`);
	});
}
startServer().catch((err) => {
	console.error("Fatal server startup failure:", err);
	process.exit(1);
});
export {};
