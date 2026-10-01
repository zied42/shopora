import { Router } from 'express';
import { ah, requireAuth } from '../middleware/auth';
import { Store } from '../store';

export function apiKeyRoutes(store: Store): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/', ah(async (req, res) => {
    res.json({ success: true, data: await store.listApiKeys(req.user.id) });
  }));

  router.post('/', ah(async (req, res) => {
    const name = typeof req.body?.name === 'string' && req.body.name.trim() ? req.body.name.trim() : 'Default key';
    const result = await store.createApiKey(req.user.id, name);
    res.status(201).json({ success: true, data: result });
  }));

  router.delete('/:id(\\d+)', ah(async (req, res) => {
    await store.revokeApiKey(req.user.id, Number(req.params.id));
    res.json({ success: true, data: { ok: true } });
  }));

  return router;
}