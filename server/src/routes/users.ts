import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { ah, requireAuth, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/error';
import { Store } from '../store';

const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(12, 'Password must be at least 12 characters'),
  role: z.enum(['admin', 'customer']),
  cin: z.string().max(50).optional().nullable(),
});

const patchUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(['admin', 'customer']).optional(),
  photo: z.string().nullable().optional(),
  cin: z.string().max(50).optional().nullable(),
});

export function userRoutes(store: Store): Router {
  const router = Router();
  router.use(requireAuth, requireRole('admin'));

  router.get('/', ah(async (_req, res) => {
    const users = await store.listUsers();
    res.json({ success: true, data: users });
  }));

  router.post('/', validateBody(createUserSchema), ah(async (req, res) => {
    const { name, email, password, role } = req.body;
    const existing = await store.findUserByEmail(email);
    if (existing) {
      res.status(409).json({ success: false, error: 'An account with this email already exists' });
      return;
    }
    const user = await store.createUser({ name, email, password_hash: bcrypt.hashSync(password, 10), role, cin: req.body.cin ?? null });
    res.status(201).json({ success: true, data: user });
  }));

  router.patch('/:id(\\d+)', validateBody(patchUserSchema), ah(async (req, res) => {
    await store.updateUser(Number(req.params.id), req.body);
    res.json({ success: true, data: { ok: true } });
  }));

  router.delete('/:id(\\d+)', ah(async (req, res) => {
    const id = Number(req.params.id);
    if (id === req.user.id) {
      res.status(400).json({ success: false, error: 'You cannot delete your own account' });
      return;
    }
    await store.deleteUser(id);
    res.json({ success: true, data: { ok: true } });
  }));

  return router;
}
