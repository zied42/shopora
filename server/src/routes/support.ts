import { Router } from 'express';
import { z } from 'zod';
import { ah, requireAuth, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/error';
import { Store } from '../store';

const createTicketSchema = z.object({
  type: z.string().trim().min(1).max(80),
  message: z.string().trim().min(5).max(5000),
});

const replySchema = z.object({
  answer: z.string().trim().min(1).max(5000),
  status: z.enum(['open', 'answered', 'closed']),
});

export function supportRoutes(store: Store): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/', ah(async (req, res) => {
    const tickets = await store.listTickets({ role: req.user.role, userId: req.user.id });
    res.json({ success: true, data: tickets });
  }));

  router.post('/', validateBody(createTicketSchema), ah(async (req, res) => {
    await store.createTicket({
      user_id: req.user.id,
      email: req.user.email,
      type: req.body.type,
      message: req.body.message,
    });
    res.status(201).json({ success: true, data: { ok: true } });
  }));

  router.patch('/:id(\\d+)', requireRole('admin'), validateBody(replySchema), ah(async (req, res) => {
    const ticketId = Number(req.params.id);
    const tickets = await store.listTickets({ role: 'admin', userId: req.user.id });
    if (!tickets.some((ticket) => ticket.id === ticketId)) {
      res.status(404).json({ success: false, error: 'Ticket not found' });
      return;
    }
    await store.replyTicket(ticketId, req.body.answer, req.body.status);
    const updated = (await store.listTickets({ role: 'admin', userId: req.user.id })).find((ticket) => ticket.id === ticketId);
    res.json({ success: true, data: updated });
  }));

  return router;
}
