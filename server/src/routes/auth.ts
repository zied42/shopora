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
  password: z.string().min(6, 'Password must be at least 6 characters'),
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

  router.post('/register', validateBody(registerSchema), ah(async (req, res) => {
    const { name, email, password, role } = req.body;
    const existing = await store.findUserByEmail(email);
    if (existing) {
      res.status(409).json({ success: false, error: 'An account with this email already exists' });
      return;
    }
    const user = await store.createUser({ name, email, password_hash: bcrypt.hashSync(password, 10), role: role ?? 'customer', cin: req.body.cin ?? null });
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

  router.post('/login', validateBody(loginSchema), ah(async (req, res) => {
    const { email, password, portal } = req.body;
    const user = await store.findUserByEmail(email);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
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
