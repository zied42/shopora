import { Router } from 'express';
import { ah, requireAuth } from '../middleware/auth';
import { Store } from '../store';

export function notificationRoutes(store: Store): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/', ah(async (req, res) => {
    const data = await store.listNotifications(req.user.id);
    res.json({ success: true, data });
  }));

  router.get('/unread', ah(async (req, res) => {
    const count = await store.notificationUnread(req.user.id);
    res.json({ success: true, data: { count } });
  }));

  router.post('/read', ah(async (req, res) => {
    await store.markNotificationsRead(req.user.id);
    res.json({ success: true, data: { ok: true } });
  }));

  return router;
}
