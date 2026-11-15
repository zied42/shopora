import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { Role } from '../store/types';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user: AuthUser;
    }
  }
}

export function signToken(u: { id: number; role: Role }) {
  return jwt.sign({ id: u.id, role: u.role }, env.JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { id: number; role: Role } {
  const payload = jwt.verify(token, env.JWT_SECRET) as { id?: unknown; role?: unknown };
  const role = normalizeRole(payload.role);
  if (!Number.isInteger(payload.id) || !role) throw new Error('Invalid token claims');
  return { id: payload.id as number, role };
}

/** Validate every role supported by Shopora and the original Lunexa portals. */
function normalizeRole(role: unknown): Role | null {
  if (
    role === 'admin' || role === 'support' || role === 'chef' || role === 'stocking' ||
    role === 'confirmateur' || role === 'dropshipper' || role === 'fournisseur' ||
    role === 'customer' || role === 'seller'
  ) return role;
  return null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // createApp validates bearer sessions against the current persisted account first.
  if (req.user) { next(); return; }
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    console.warn('[security] authentication_failed', { method: req.method, path: req.path });
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  try {
    const payload = verifyToken(header.slice(7));
    req.user = { id: payload.id, role: payload.role, name: '', email: '' };
    next();
  } catch {
    console.warn('[security] authentication_failed', { method: req.method, path: req.path });
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      console.warn('[security] authorization_denied', { method: req.method, path: req.path, userId: req.user?.id ?? null });
      res.status(403).json({ success: false, error: 'You do not have permission to perform this action' });
      return;
    }
    next();
  };
}

export const ah =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
