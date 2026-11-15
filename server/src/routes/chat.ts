import { Router } from 'express';
import { z } from 'zod';
import { ah, requireAuth, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/error';
import { Store } from '../store';
import { logStaffActivity } from '../lib/staffActivity';
import { partnerId, isPeerRole } from '../lib/partnerId';
import { ChatMessage, Conversation, ConversationParticipant, Role } from '../store/types';

/** Privacy: a participant's public partner ID (DRP-0001 / FRN-0001) when they are a peer. */
const peerName = (p: ConversationParticipant): string =>
  (p.role === 'dropshipper' || p.role === 'fournisseur') ? partnerId(p.role, p.id) : p.name;

/** Redact all peer names (participants, computed title, last sender) for dropshipper/fournisseur viewers. */
function redactConversation(viewerId: number, c: Conversation): Conversation {
  const participants = c.participants.map((p) => (p.id === viewerId ? p : { ...p, name: peerName(p) }));
  const peers = c.participants.filter((p) => p.id !== viewerId && (p.role === 'dropshipper' || p.role === 'fournisseur'));
  let title = c.title;
  for (const p of peers) {
    if (title.includes(p.name)) title = title.split(p.name).join(partnerId(p.role, p.id));
  }
  const lm = c.last_message;
  let last_message: Conversation['last_message'] = lm;
  if (lm && lm.sender_id !== viewerId) {
    const sender = c.participants.find((p) => p.id === lm.sender_id);
    if (sender && (sender.role === 'dropshipper' || sender.role === 'fournisseur')) {
      last_message = { ...lm, sender_name: partnerId(sender.role, sender.id) };
    }
  }
  return { ...c, title, participants, last_message };
}

/** Redact a message sender name when the viewer is a peer of the sender. */
const redactMessage = (viewerId: number, m: ChatMessage): ChatMessage =>
  (m.sender_id !== viewerId && (m.sender_role === 'dropshipper' || m.sender_role === 'fournisseur'))
    ? { ...m, sender_name: partnerId(m.sender_role, m.sender_id) }
    : m;

const sendSchema = z.object({
  body: z.string().max(4000).default(''),
  image_url: z.string().optional().nullable(),
}).refine((v) => v.body.trim().length > 0 || !!v.image_url, { message: 'Message or image is required' });

const ensureSchema = z.object({ peer_role: z.enum(['admin', 'chef']) });
const ensureSupplierSchema = z.object({ supplier_id: z.number().int().positive() });

export function chatRoutes(store: Store): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/conversations', ah(async (req, res) => {
    const role = req.user.role as Role;
    const data = await store.listConversations(req.user.id, role);
    res.json({ success: true, data: isPeerRole(role) ? data.map((c) => redactConversation(req.user.id, c)) : data });
  }));

  router.get('/unread', ah(async (req, res) => {
    const n = await store.chatUnread(req.user.id, req.user.role);
    res.json({ success: true, data: { count: n } });
  }));

  router.post('/ensure', requireRole('support'), validateBody(ensureSchema), ah(async (req, res) => {
    const id = await store.ensureStaffConversation(req.user.id, req.body.peer_role);
    res.status(201).json({ success: true, data: { id } });
  }));

  router.post('/ensure-team', requireRole('support'), ah(async (_req, res) => {
    const id = await store.ensureTeamConversation();
    res.status(201).json({ success: true, data: { id } });
  }));

  router.post('/ensure-supplier', requireRole('dropshipper', 'fournisseur'), validateBody(ensureSupplierSchema), ah(async (req, res) => {
    const id = await store.ensureSupplierConversation(req.user.id, req.body.supplier_id);
    res.status(201).json({ success: true, data: { id } });
  }));

  router.get('/:id(\\d+)/messages', ah(async (req, res) => {
    const data = await store.listChatMessages(Number(req.params.id), req.user.id);
    const role = req.user.role as Role;
    res.json({ success: true, data: isPeerRole(role) ? data.map((m) => redactMessage(req.user.id, m)) : data });
  }));

  router.post('/:id(\\d+)/messages', validateBody(sendSchema), ah(async (req, res) => {
    const msg = await store.sendChatMessage(Number(req.params.id), req.user.id, req.body);
    const staffRoles = ['admin', 'chef', 'support', 'stocking', 'confirmateur'];
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