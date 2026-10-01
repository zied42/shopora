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

/** Accept existing sessions during the role migration, but issue only canonical roles. */
function normalizeRole(role: unknown): Role | null {
  if (role === 'admin' || role === 'customer' || role === 'seller') return role;
  if (role === 'dropshipper') return 'customer';
  if (role === 'fournisseur') return 'seller';
  if (role === 'chef' || role === 'support' || role === 'stocking' || role === 'confirmateur') return 'admin';
  return null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  try {
    const payload = verifyToken(header.slice(7));
    req.user = { id: payload.id, role: payload.role, name: '', email: '' };
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
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
