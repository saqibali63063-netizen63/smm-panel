import type { Request, Response, NextFunction } from 'express';
import { db, generateToken } from './db.js';

export interface AuthenticatedUser {
  id: number;
  email: string;
  username: string;
  role: 'admin' | 'user';
  balance: number;
  spent: number;
  status: string;
  referral_code: string;
  created_at: string;
  timezone: string;
  currency: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export function createSession(userId: number): string {
  const token = generateToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
  
  db.prepare(`
    INSERT INTO sessions (token, user_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(token, userId, now.toISOString(), expiresAt);

  return token;
}

export function removeSession(token: string): void {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export function getUserByToken(token: string): AuthenticatedUser | null {
  if (!token) return null;
  
  const session = db.prepare(`
    SELECT s.expires_at, u.id, u.email, u.username, u.role, u.balance, u.spent, u.status, u.referral_code, u.created_at, u.timezone, u.currency
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ?
  `).get(token) as any;

  if (!session) return null;

  if (new Date(session.expires_at) < new Date()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }

  if (session.status !== 'active') {
    return null;
  }

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

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }

  const token = authHeader.substring(7).trim();
  const user = getUserByToken(token);

  if (!user) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }

  req.user = user;
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
      return;
    }
    next();
  });
}
