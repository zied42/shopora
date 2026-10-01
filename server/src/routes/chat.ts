import { Router } from 'express';
import { z } from 'zod';
import { ah, requireAuth, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/error';
import { Store } from '../store';
import { logStaffActivity } from '../lib/staffActivity';

const sendSchema = z.object({
  body: z.string().max(4000).default(''),
  image_url: z.string().optional().nullable(),
}).refine((v) => v.body.trim().length > 0 || !!v.image_url, { message: 'Message or image is required' });

const ensureSchema = z.object({ peer_role: z.enum(['admin']) });
const ensureSupplierSchema = z.object({ supplier_id: z.number().int().positive() });

export function chatRoutes(store: Store): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/conversations', ah(async (req, res) => {
    const data = await store.listConversations(req.user.id, req.user.role);
    res.json({ success: true, data });
  }));

  router.get('/unread', ah(async (req, res) => {
    const n = await store.chatUnread(req.user.id, req.user.role);
    res.json({ success: true, data: { count: n } });
  }));

  router.post('/ensure', requireRole('admin'), validateBody(ensureSchema), ah(async (req, res) => {
    const id = await store.ensureStaffConversation(req.user.id, req.body.peer_role);
    res.status(201).json({ success: true, data: { id } });
  }));

  router.post('/ensure-team', requireRole('admin'), ah(async (_req, res) => {
    const id = await store.ensureTeamConversation();
    res.status(201).json({ success: true, data: { id } });
  }));

  router.post('/ensure-supplier', requireRole('customer', 'seller'), validateBody(ensureSupplierSchema), ah(async (req, res) => {
    const id = await store.ensureSupplierConversation(req.user.id, req.body.supplier_id);
    res.status(201).json({ success: true, data: { id } });
  }));

  router.get('/:id(\\d+)/messages', ah(async (req, res) => {
    const data = await store.listChatMessages(Number(req.params.id), req.user.id);
    res.json({ success: true, data });
  }));

  router.post('/:id(\\d+)/messages', validateBody(sendSchema), ah(async (req, res) => {
    const msg = await store.sendChatMessage(Number(req.params.id), req.user.id, req.body);
    const staffRoles = ['admin'];
    if (staffRoles.includes(req.user.role)) {
      logStaffActivity(store, req.user, {
        activity_type: 'chat_reply',
        label: `Conversation #${req.params.id}`,
        ref_id: Number(req.params.id),
        quantity: 1,
      });
    }
    res.status(201).json({ success: true, data: msg });
  }));

  router.post('/:id(\\d+)/read', ah(async (req, res) => {
    await store.markConversationRead(Number(req.params.id), req.user.id);
    res.json({ success: true, data: { ok: true } });
  }));

  return router;
}
