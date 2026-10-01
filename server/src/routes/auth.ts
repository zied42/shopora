import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { ah, requireAuth, signToken } from '../middleware/auth';
import { validateBody } from '../middleware/error';
import { Store } from '../store';
import { Role } from '../store/types';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
  role: z.enum(['customer', 'seller']).optional(),
  cin: z.string().max(50).optional().nullable(),
  shop_name: z.string().trim().max(160).optional().nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  questionnaire: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
  portal: z.enum(['front', 'staff']).optional(),
});

const updateMeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  photo: z.string().nullable().optional(),
});

const FRONT_ROLES: Role[] = ['customer', 'seller'];
const STAFF_ROLES: Role[] = ['admin'];

const publicUser = (u: { id: number; name: string; email: string; role: Role; photo: string | null; cin: string | null; created_at: string }) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  photo: u.photo,
  cin: u.cin,
  created_at: u.created_at,
});

export function authRoutes(store: Store): Router {
  const router = Router();

  const attempts = new Map<string, { count: number; resetAt: number }>();
  const throttle = (limit: number, windowMs: number, keyFor: (req: import('express').Request) => string) =>
    (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
      const now = Date.now();
      for (const [key, entry] of attempts) if (entry.resetAt <= now) attempts.delete(key);
      const key = keyFor(req);
      const entry = attempts.get(key);
      if (entry && entry.count >= limit) {
        res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
        res.status(429).json({ success: false, error: 'Too many authentication attempts. Try again later.' });
        return;
      }
      attempts.set(key, entry ? { ...entry, count: entry.count + 1 } : { count: 1, resetAt: now + windowMs });
      next();
    };

  router.post('/register', throttle(5, 15 * 60_000, (req) => req.ip ?? req.socket.remoteAddress ?? 'unknown'), validateBody(registerSchema), ah(async (req, res) => {
    const { name, email, password, role } = req.body;
    const existing = await store.findUserByEmail(email);
    if (existing) {
      res.status(409).json({ success: false, error: 'An account with this email already exists' });
      return;
    }
    const user = await store.createUser({ name, email, password_hash: await bcrypt.hash(password, 12), role: role ?? 'customer', cin: req.body.cin ?? null });
    if ((role ?? 'customer') === 'customer') {
      try {
        const org = await store.createSellerSignup({
          owner_name: name,
          email,
          shop_name: req.body.shop_name ?? null,
          phone: req.body.phone ?? null,
          tags: Array.isArray(req.body.questionnaire) ? req.body.questionnaire : [],
        });
        console.log(`[signup] New seller organization #${org.id} (${org.code}) for ${email}`);
      } catch (e) {
        console.error('[signup] Failed to create seller organization:', e);
      }
    }
    const token = signToken({ id: user.id, role: user.role });
    res.status(201).json({ success: true, data: { token, user: publicUser(user) } });
  }));

  router.post('/login', throttle(10, 15 * 60_000, (req) => `${req.ip ?? req.socket.remoteAddress ?? 'unknown'}:${String(req.body?.email ?? '').toLowerCase()}`), validateBody(loginSchema), ah(async (req, res) => {
    const { email, password, portal } = req.body;
    const user = await store.findUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }
    const isStaff = portal === 'staff';
    const allowedRoles = isStaff ? STAFF_ROLES : FRONT_ROLES;
    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({
        success: false,
        error: isStaff
          ? 'This login is reserved for admin accounts. Please use the customer or seller login.'
          : 'This login is reserved for customers and sellers. Please use the admin login.',
      });
      return;
    }
    const token = signToken({ id: user.id, role: user.role });
    res.json({ success: true, data: { token, user: publicUser(user) } });
  }));

  router.get('/me', requireAuth, ah(async (req, res) => {
    const user = await store.findUserById(req.user.id);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    res.json({ success: true, data: publicUser(user) });
  }));

  router.patch('/me', requireAuth, validateBody(updateMeSchema), ah(async (req, res) => {
    await store.updateUser(req.user.id, req.body);
    const user = await store.findUserById(req.user.id);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    res.json({ success: true, data: publicUser(user) });
  }));

  return router;
}
