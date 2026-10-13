import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

export interface AdminSession {
  token: string;
  userId: string;
  email: string;
  role: 'master_owner' | 'admin';
  createdAt: number;
  expiresAt: number;
}

// In-memory active sessions store
const activeSessions: Map<string, AdminSession> = new Map();

// Session validity: 24 hours
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export function createMasterOwnerSession(email: string): AdminSession {
  const token = `VEND_${crypto.randomBytes(24).toString('hex')}`;
  const now = Date.now();
  const session: AdminSession = {
    token,
    userId: 'USR_MASTER_OWNER_01',
    email,
    role: 'master_owner',
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS
  };
  activeSessions.set(token, session);
  return session;
}

export function validateSession(token: string): AdminSession | null {
  if (!token) return null;
  const session = activeSessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }
  return session;
}

export function revokeSession(token: string): boolean {
  return activeSessions.delete(token);
}

/**
 * Express middleware to enforce Master Owner privileges
 */
export function requireMasterOwner(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['x-admin-token']) {
    token = String(req.headers['x-admin-token']).trim();
  }

  // Also support admin PIN transitionally if provided and matches settings
  const adminPinHeader = req.headers['x-admin-pin'] || req.query.adminPin;
  if (adminPinHeader) {
    // Check against configured secure master owner PIN
    const envPin = process.env.MASTER_OWNER_PIN;
    if (envPin && adminPinHeader === envPin) {
      return next();
    }
  }

  const session = validateSession(token);
  if (!session || session.role !== 'master_owner') {
    return res.status(401).json({
      error: 'Acesso restrito ao Master Owner. Autenticação administrativa necessária.',
      code: 'UNAUTHORIZED_MASTER_OWNER'
    });
  }

  // Attach session to request
  (req as any).adminSession = session;
  next();
}
