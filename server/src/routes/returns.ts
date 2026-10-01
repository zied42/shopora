import { Router } from 'express';
import { z } from 'zod';
import { ah, requireAuth, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/error';
import { Store } from '../store';
import { logStaffActivity } from '../lib/staffActivity';

const createSchema = z.object({
  order_id: z.number().int().positive(),
  type: z.enum(['retour', 'echange']),
  reason: z.string().min(3, 'Please describe the reason'),
  attachments: z.array(z.string()).optional(),
});

const patchSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'processed']).optional(),
  reply: z.string().nullable().optional(),
});

export function returnRoutes(store: Store): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/', ah(async (req, res) => {
    const returns = await store.listReturnRequests({ role: req.user.role, userId: req.user.id });
    res.json({ success: true, data: returns });
  }));

  router.post('/', requireRole('customer', 'seller', 'admin'), validateBody(createSchema), ah(async (req, res) => {
    const order = await store.getOrder(req.body.order_id);
    if (!order) {
      res.status(404).json({ success: false, error: 'Commande not found' });
      return;
    }
    if (req.user.role === 'customer' && order.dropshipper_id !== req.user.id) {
      res.status(403).json({ success: false, error: 'You can only request a return for your own commandes' });
      return;
    }
    if (req.user.role === 'seller' && (order.items.length === 0 || !order.items.every((item) => item.fournisseur_id === req.user.id))) {
      res.status(403).json({ success: false, error: 'You can only request returns for orders containing your products' });
      return;
    }
    if (req.body.type === 'echange' && order.status !== 'delivered') {
      res.status(400).json({ success: false, error: 'An échange can only be requested for a delivered commande' });
      return;
    }
    await store.createReturnRequest({
      dropshipper_id: order.dropshipper_id,
      order_id: order.id,
      type: req.body.type,
      reason: req.body.reason,
      attachments: req.body.attachments,
      autoApproved: req.user.role === 'seller' && req.body.type === 'echange',
    });
    res.status(201).json({ success: true, data: { ok: true } });
  }));

  router.patch('/:id(\\d+)', requireRole('admin'), validateBody(patchSchema), ah(async (req, res) => {
    const returnId = Number(req.params.id);
    await store.updateReturnRequest(returnId, { status: req.body.status, reply: req.body.reply });
    logStaffActivity(store, req.user, {
      activity_type: 'return_process',
      label: `Return #${returnId} → ${req.body.status ?? 'updated'}`,
      ref_id: returnId,
      quantity: 1,
    });
    const returns = await store.listReturnRequests({ role: 'admin', userId: -1 });
    const updated = returns.find((r) => r.id === returnId);
    res.json({ success: true, data: updated });
  }));

  return router;
}
