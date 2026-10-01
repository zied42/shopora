import { Router } from 'express';
import { z } from 'zod';
import { ah, requireAuth, requireRole, signToken } from '../middleware/auth';
import { validateBody } from '../middleware/error';
import { Store } from '../store';
import { SellerOrganizationsQuery } from '../store/types';
import { SupplierOrganizationsQuery } from '../data/supplierOrganizations';
import { addMessageToTicket, buildChefTickets, createChefTicket, getChefTicket, updateChefTicket } from '../data/chefTickets';
import { FindProductsQuery, getFindProductDetail, searchFindProducts } from '../data/findProducts';
import { searchSellerNotifications } from '../data/notificationHistory';
import { logStaffActivity, secondsSince } from '../lib/staffActivity';
import { mapSupplierRow } from './chef';

const createSchema = z.object({
  email: z.string().email('Invalid email').optional(),
  type: z.string().min(1, 'Type of service is required'),
  message: z.string().min(5, 'Please describe your issue'),
});

const replySchema = z.object({
  answer: z.string().min(1, 'Answer is required'),
  status: z.enum(['open', 'answered', 'closed', 'unresolved', 'resolved']),
  msg_type: z.enum(['normal', 'resolution_request']).optional(),
});

const chefTicketCreateSchema = z.object({
  author_name: z.string().min(1),
  owner_names: z.array(z.string()).default([]),
  subject: z.string().min(1),
  description: z.string().default(''),
  department: z.string().default('Commercial'),
  priority: z.enum(['urgent', 'high', 'medium']).default('medium'),
  related_to: z.string().nullable().default(null),
});

const chefTicketPatchSchema = z.object({
  status: z.enum(['resolved', 'unresolved']).optional(),
  priority: z.enum(['urgent', 'high', 'medium']).optional(),
});

const PRODUCT_REF_RE = /\[Product #(\d+):/;

async function resolveProductAccountManager(store: Store, message: string): Promise<string | null> {
  const m = message.match(PRODUCT_REF_RE);
  if (!m) return null;
  const product = await store.getProduct(Number(m[1]));
  if (!product?.fournisseur_id) return null;
  const supplier = await store.findUserById(product.fournisseur_id);
  if (!supplier?.email) return null;
  const orgs = await store.listSupplierOrganizations({ page: 1, per_page: 1, q: supplier.email, search_field: 'email' });
  return orgs.rows[0]?.account_manager ?? null;
}

export function supportRoutes(store: Store): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/', ah(async (req, res) => {
    const tickets = await store.listTickets({ role: req.user.role, userId: req.user.id });
    res.json({ success: true, data: tickets });
  }));

  router.get('/find-products', requireRole('admin'), ah(async (req, res) => {
    const q = req.query;
    const num = (v: unknown): number | undefined => {
      if (typeof v !== 'string' || v === '') return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };
    const query: FindProductsQuery = {
      page: Math.max(1, Number(q.page) || 1),
      per_page: Math.max(1, Math.min(1000, Number(q.per_page) || 10)),
      q: typeof q.q === 'string' && q.q ? q.q : undefined,
      sort: typeof q.sort === 'string' && q.sort ? q.sort : undefined,
      type: typeof q.type === 'string' && q.type ? q.type : undefined,
      in_stock: typeof q.in_stock === 'string' && q.in_stock ? q.in_stock : undefined,
      category: typeof q.category === 'string' && q.category ? q.category : undefined,
      collections: typeof q.collections === 'string' && q.collections ? q.collections : undefined,
      shipper_express: typeof q.shipper_express === 'string' && q.shipper_express ? q.shipper_express : undefined,
      high_rating: typeof q.high_rating === 'string' && q.high_rating ? q.high_rating : undefined,
      reliable_fulfillment: typeof q.reliable_fulfillment === 'string' && q.reliable_fulfillment ? q.reliable_fulfillment : undefined,
      price_min: num(q.price_min),
      price_max: num(q.price_max),
      rating_min: num(q.rating_min),
      rating_max: num(q.rating_max),
      quantity_min: num(q.quantity_min),
      quantity_max: num(q.quantity_max),
    };
    res.json({ success: true, data: await searchFindProducts(query) });
  }));

  router.get('/find-products/:uuid', requireRole('admin'), ah(async (req, res) => {
    const p = await getFindProductDetail(req.params.uuid);
    if (!p) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: p });
  }));

  router.get('/products/:id(\\d+)/supplier-org', requireRole('admin'), ah(async (req, res) => {
    const product = await store.getProduct(Number(req.params.id));
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }
    const user = await store.findUserById(product.fournisseur_id);
    if (!user) {
      res.json({ success: true, data: null });
      return;
    }
    const orgs = await store.listSupplierOrganizations({ page: 1, per_page: 1, search_field: 'email', q: user.email });
    res.json({ success: true, data: orgs.rows[0] ?? null });
  }));

  router.get('/collections', requireRole('admin'), ah(async (_req, res) => {
    const data = await store.listCollections();
    res.json({ success: true, data });
  }));

  router.get('/tickets', requireRole('admin'), ah(async (req, res) => {
    const me = req.user?.id ? await store.findUserById(req.user.id) : null;
    const all = await buildChefTickets(me?.name || '');
    res.json({ success: true, data: { tickets: all.tickets, stats: all.stats } });
  }));

  router.post('/tickets', requireRole('admin'), validateBody(chefTicketCreateSchema), ah(async (req, res) => {
    const b = req.body;
    const ticket = await createChefTicket({
      authorName: b.author_name,
      ownerNames: b.owner_names,
      subject: b.subject,
      description: b.description,
      department: b.department,
      priority: b.priority,
      relatedTo: b.related_to,
    });
    res.json({ success: true, data: ticket });
  }));

  router.patch('/tickets/:id(\\d+)', requireRole('admin'), validateBody(chefTicketPatchSchema), ah(async (req, res) => {
    const updated = await updateChefTicket(Number(req.params.id), req.body);
    if (!updated) {
      res.status(404).json({ success: false, error: 'Ticket not found' });
      return;
    }
    res.json({ success: true, data: updated });
  }));

  router.post('/', validateBody(createSchema), ah(async (req, res) => {
    let assignedTo: number | null = null;

    const staff = await store.listStaffUsers();

    const productManager = await resolveProductAccountManager(store, req.body.message);
    if (productManager) {
      const manager = staff.find((s) => s.name === productManager);
      if (manager) assignedTo = manager.id;
    }

    const creator = await store.findUserById(req.user.id);
    let sellerOrg = null;
    if (creator) {
      sellerOrg = await store.findSellerOrganizationByEmail(creator.email);
    }
    if (assignedTo == null && sellerOrg?.account_manager) {
      const manager = staff.find((s) => s.name === sellerOrg.account_manager);
      if (manager) assignedTo = manager.id;
    }

    if (assignedTo == null && staff.length > 0) {
      const pick = staff[Math.floor(Math.random() * staff.length)];
      assignedTo = pick.id;
      if (creator && sellerOrg) {
        await store.updateSellerOrganizationManagers(sellerOrg.id, { account_manager: pick.name });
      }
    }

    await store.createTicket({
      user_id: req.user.id,
      email: req.body.email ?? '',
      type: req.body.type,
      message: req.body.message,
      assigned_to: assignedTo,
    });
    res.status(201).json({ success: true, data: { ok: true } });
  }));

  router.patch('/:id(\\d+)', requireRole('admin'), validateBody(replySchema), ah(async (req, res) => {
    const ticketId = Number(req.params.id);
    const tickets = await store.listTickets({ role: req.user.role, userId: req.user.id });
    const target = tickets.find((t) => t.id === ticketId);
    const supportStatus = req.body.status === 'resolved' ? 'closed' : 'answered';
    await store.replyTicket(ticketId, req.body.answer, supportStatus);
    const staff = await store.listStaffUsers();
    const staffUser = staff.find((s) => s.id === req.user.id);
    const staffName = staffUser?.name ?? req.user.name ?? 'Staff';
    const chefTicket = await getChefTicket(ticketId);
    if (chefTicket) {
      await addMessageToTicket(ticketId, staffName, 'SHOPORA Network Service Tunisia- TI460', req.body.answer, req.body.msg_type ?? 'normal');
    }
    logStaffActivity(store, req.user, {
      activity_type: 'ticket_reply',
      label: `Ticket #${ticketId}${target ? ` (${target.type})` : ''}`,
      ref_id: ticketId,
      quantity: 1,
      duration_seconds: target ? secondsSince(target.created_at) : null,
    });
    const updated = tickets.find((t) => t.id === ticketId);
    res.json({ success: true, data: updated });
  }));


  // ── Seller & supplier organizations (mirror of chef) ──────────────────

  const FOLLOW_UP_MEETINGS = ['Called', 'Recall', 'Busy', 'Unreachable', 'Not Qualified', 'Follow Up', 'Face to Face Meeting', 'Online Meeting'] as const;
  const AUTO_CONFIRMED_MEETINGS: readonly string[] = ['Called', 'Face to Face Meeting', 'Online Meeting'];

  const followUpCreateSchema = z.object({
    meeting: z.enum(FOLLOW_UP_MEETINGS),
    tags: z.array(z.string().trim().min(1).max(50)).max(9).optional(),
    note: z.string().max(2000).optional().nullable(),
    scheduled_at: z.string().optional().nullable(),
    attachments: z.array(z.string().max(500)).max(10).optional(),
  });

  const followUpPatchSchema = z.object({
    meeting: z.enum(FOLLOW_UP_MEETINGS).optional(),
    tags: z.array(z.string().trim().min(1).max(50)).max(9).optional(),
    note: z.string().max(2000).optional().nullable(),
    scheduled_at: z.string().optional().nullable(),
    confirmed: z.boolean().optional(),
    outcome: z.string().max(200).optional().nullable(),
    attachments: z.array(z.string().max(500)).max(10).optional().nullable(),
  });

  const sellerTagsSchema = z.object({ tags: z.array(z.string().trim().min(1).max(80)).max(30) });
  const sellerManagersSchema = z.object({
    account_manager: z.string().trim().max(120).nullable().optional(),
    business_developer: z.string().trim().max(120).nullable().optional(),
  });
  const createSupplierSchema = z.object({
    company_name: z.string().trim().min(1, 'Company name is required').max(200),
    tax_id: z.string().trim().min(1, 'Tax Id is required').max(20),
    company_description: z.string().max(2000).optional().nullable(),
    first_name: z.string().trim().min(1, 'First name is required').max(100),
    last_name: z.string().trim().min(1, 'Last name is required').max(100),
    email: z.string().trim().email('Invalid email address').max(150),
    phone: z.string().trim().min(1, 'Phone number is required').max(50),
    password: z.string().min(6, 'Password must be at least 6 characters').max(100),
  });
  const supplierFlagsPatchSchema = z.object({
    account_status: z.enum(['active', 'registration_uncompleted', 'inactive']).optional(),
    allow_marketplace: z.boolean().optional(),
    dropshipping_eligible: z.boolean().optional(),
    account_manager: z.string().trim().max(100).nullable().optional(),
    business_developer: z.string().trim().max(100).nullable().optional(),
    doc_files: z.record(z.string()).optional(),
    doc_statuses: z.record(z.string()).optional(),
  });

  function splitArr(v: unknown): string[] {
    if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean);
    if (Array.isArray(v)) return v.flatMap((x) => splitArr(x));
    return [];
  }

  const followUpActorName = async (store: Store, req: { user: { id: number; email?: string } }): Promise<string> => {
    const user = await store.findUserById(req.user.id);
    return user?.name?.trim() || req.user.email || 'Staff';
  };

  const sellerFollowUpPayload = (b: z.infer<typeof followUpCreateSchema>, name: string) => {
    const autoConfirmed = AUTO_CONFIRMED_MEETINGS.includes(b.meeting as string);
    return {
      person: name,
      label: (b.tags?.[0] as string | undefined) ?? (b.meeting as string),
      note: b.note ?? null,
      meeting: b.meeting,
      scheduled_at: b.scheduled_at ?? new Date().toISOString(),
      confirmed: autoConfirmed,
      by: name,
      tags: b.tags ?? [],
      attachments: b.attachments ?? [],
      ...(autoConfirmed ? { outcome: 'Confirmed' } : {}),
    };
  };

  const getOrCreateSellerOrg = async (store: Store, id: number): Promise<{ org: NonNullable<Awaited<ReturnType<Store['getSellerOrganization']>>>; id: number } | null> => {
    let orgId = id;
    let org = await store.getSellerOrganization(orgId);
    if (!org && orgId < 0) {
      const targetUser = await store.findUserById(Math.abs(orgId));
      if (targetUser) {
        org = await store.createSellerSignup({
          owner_name: targetUser.name,
          email: targetUser.email,
          phone: null,
          shop_name: null,
          tags: [],
        });
        orgId = org.id;
      }
    }
    return org ? { org, id: orgId } : null;
  };

  router.get('/seller-organizations', requireRole('admin'), ah(async (req, res) => {
    const q = req.query;
    const query: SellerOrganizationsQuery = {
      page: Math.max(1, Number(q.page) || 1),
      per_page: Math.max(1, Math.min(1000, Number(q.per_page) || 10)),
      q: typeof q.q === 'string' && q.q ? q.q : undefined,
      search_field: typeof q.search_field === 'string' && q.search_field ? q.search_field : undefined,
      sort: typeof q.sort === 'string' && q.sort ? q.sort : undefined,
      dir: q.dir === 'asc' ? 'asc' : 'desc',
      statuses: splitArr(q.statuses),
      sources: splitArr(q.sources),
      main_retailer: q.main_retailer === '1' ? true : undefined,
      plus_membership: q.plus_membership === '1' ? true : undefined,
    };
    res.json({ success: true, data: await store.listSellerOrganizations(query) });
  }));

  router.get('/seller-organizations-staff', requireRole('admin'), ah(async (_req, res) => {
    const users = await store.listUsers();
    const staff = users
      .filter((u) => u.role === 'admin')
      .map((u) => ({ id: u.id, name: u.name, role: u.role }));
    res.json({ success: true, data: staff });
  }));

  router.get('/team-members', requireRole('admin'), ah(async (_req, res) => {
    const users = await store.listUsers();
    const members = users.filter((u) => u.role === 'admin');
    res.json({ success: true, data: members });
  }));

  router.patch('/seller-organizations/:id(-?\\d+)/managers', requireRole('admin'), validateBody(sellerManagersSchema), ah(async (req, res) => {
    const org = await store.updateSellerOrganizationManagers(Number(req.params.id), req.body);
    if (!org) {
      res.status(404).json({ success: false, error: 'Seller organization not found' });
      return;
    }
    res.json({ success: true, data: org });
  }));

  router.post('/seller-organizations/:id(-?\\d+)/follow-up', requireRole('admin'), validateBody(followUpCreateSchema), ah(async (req, res) => {
    const name = await followUpActorName(store, req);
    const followUp = sellerFollowUpPayload(req.body, name);
    const found = await getOrCreateSellerOrg(store, Number(req.params.id));
    if (!found) {
      res.status(404).json({ success: false, error: 'Seller organization not found' });
      return;
    }
    const updated = await store.setSellerFollowUp(found.id, followUp);
    logStaffActivity(store, req.user, {
      activity_type: 'followup',
      label: `Seller follow-up (${followUp.meeting}) — ${found.org.owner_name}`,
      ref_id: found.id,
      quantity: 1,
    });
    res.json({ success: true, data: updated });
  }));

  router.patch('/seller-organizations/:id(-?\\d+)/follow-up', requireRole('admin'), validateBody(followUpPatchSchema), ah(async (req, res) => {
    const name = await followUpActorName(store, req);
    const found = await getOrCreateSellerOrg(store, Number(req.params.id));
    if (!found) {
      res.status(404).json({ success: false, error: 'Seller organization not found' });
      return;
    }
    const updated = await store.updateSellerFollowUp(found.id, req.body, name);
    if (!updated) {
      res.status(404).json({ success: false, error: 'No follow up to update for this seller organization' });
      return;
    }
    res.json({ success: true, data: updated });
  }));

  router.patch('/seller-organizations/:id(-?\\d+)/tags', requireRole('admin'), validateBody(sellerTagsSchema), ah(async (req, res) => {
    const org = await store.updateSellerOrganizationTags(Number(req.params.id), req.body.tags);
    if (!org) {
      res.status(404).json({ success: false, error: 'Seller organization not found' });
      return;
    }
    res.json({ success: true, data: org });
  }));

  router.patch('/seller-organizations/:id(-?\\d+)/flags', requireRole('admin'), ah(async (req, res) => {
    const id = Number(req.params.id);
    const patch: Record<string, unknown> = {};
    if (req.body.account_status !== undefined) patch.account_status = req.body.account_status;
    if (req.body.allow_marketplace !== undefined) patch.allow_marketplace = req.body.allow_marketplace;
    if (req.body.dropshipping_eligible !== undefined) patch.dropshipping_eligible = req.body.dropshipping_eligible;
    if (req.body.doc_files !== undefined) patch.doc_files = req.body.doc_files;
    if (req.body.doc_statuses !== undefined) patch.doc_statuses = req.body.doc_statuses;
    if (!Object.keys(patch).length) { res.status(400).json({ success: false, error: 'No fields to update' }); return; }
    const org = await store.updateSellerOrganizationFlags(id, patch);
    if (!org) { res.status(404).json({ success: false, error: 'Seller organization not found' }); return; }
    res.json({ success: true, data: org });
  }));

  router.patch('/seller-organizations/:id(-?\\d+)/onboarding', requireRole('admin'), ah(async (req, res) => {
    const { status } = req.body;
    if (typeof status !== 'string' || !status) {
      res.status(400).json({ success: false, error: 'status is required' });
      return;
    }
    const found = await getOrCreateSellerOrg(store, Number(req.params.id));
    if (!found) {
      res.status(404).json({ success: false, error: 'Seller organization not found' });
      return;
    }
    const updated = await store.updateSellerOrganizationOnboarding(found.id, status);
    res.json({ success: true, data: updated });
  }));

  router.get('/seller-organizations/:id(-?\\d+)/notifications', requireRole('admin'), ah(async (req, res) => {
    const q = req.query;
    const orgId = Number(req.params.id);
    const exists = await store.getSellerOrganization(orgId);
    const data = searchSellerNotifications({
      org_id: exists ? orgId : null,
      page: Math.max(1, Number(q.page) || 1),
      per_page: Math.max(1, Math.min(1000, Number(q.per_page) || 10)),
      channel: typeof q.channel === 'string' && q.channel ? q.channel : undefined,
    });
    res.json({ success: true, data });
  }));

  router.get('/seller-organizations/:id(-?\\d+)', requireRole('admin'), ah(async (req, res) => {
    const id = Number(req.params.id);
    let org = await store.getSellerOrganization(id);
    if (!org && id < 0) {
      const user = await store.findUserById(Math.abs(id));
      if (user && user.role === 'customer') {
        org = {
          id: -user.id,
          code: `USR-${String(user.id).padStart(6, '0')}`,
          account_manager: null,
          business_developer: null,
          owner_name: user.name,
          org_name: null,
          phone: '',
          email: user.email,
          tags: [],
          joined_at: new Date(user.created_at).toISOString(),
          last_seen_at: new Date(user.created_at).toISOString(),
          onboarding: [],
          documents: 'none',
          follow_up_new: false,
          follow_up: null,
          source: 'Signup',
          is_main_retailer: false,
          plus_membership: false,
        };
      }
    }
    if (!org) {
      res.status(404).json({ success: false, error: 'Seller organization not found' });
      return;
    }
    res.json({ success: true, data: org });
  }));

  router.post('/seller-organizations/:id(-?\\d+)/access', requireRole('admin'), ah(async (req, res) => {
    const id = Number(req.params.id);
    let user = null;
    if (id < 0) {
      user = await store.findUserById(Math.abs(id));
    } else {
      const org = await store.getSellerOrganization(id);
      if (org?.email) user = await store.findUserByEmail(org.email);
    }
    if (!user || user.role !== 'customer') {
      res.status(404).json({ success: false, error: 'No linked seller login account found for this organization' });
      return;
    }
    const impersonationToken = signToken({ id: user.id, role: 'customer' });
    res.json({
      success: true,
      data: {
        token: impersonationToken,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      },
    });
  }));

  router.get('/supplier-organizations', requireRole('admin'), ah(async (req, res) => {
    const q = req.query;
    const query: SupplierOrganizationsQuery = {
      page: Math.max(1, Number(q.page) || 1),
      per_page: Math.max(1, Math.min(1000, Number(q.per_page) || 10)),
      q: typeof q.q === 'string' && q.q ? q.q : undefined,
      search_field: typeof q.search_field === 'string' && q.search_field ? q.search_field : undefined,
      sort: typeof q.sort === 'string' && q.sort ? q.sort : undefined,
      dir: q.dir === 'asc' ? 'asc' : 'desc',
      statuses: splitArr(q.statuses),
      sources: splitArr(q.sources),
      main_type: q.main_type === '1' ? true : undefined,
    };
    res.json({ success: true, data: await store.listSupplierOrganizations(query) });
  }));

  router.post('/supplier-organizations', requireRole('admin'), validateBody(createSupplierSchema), ah(async (req, res) => {
    const name = await followUpActorName(store, req);
    try {
      const org = await store.createSupplierOrganization({ ...req.body, business_developer: name });
      res.status(201).json({ success: true, data: org });
    } catch (e) {
      if (e instanceof Error && /already exists/i.test(e.message)) {
        res.status(409).json({ success: false, error: e.message });
        return;
      }
      throw e;
    }
  }));

  router.post('/supplier-organizations/:id(\\d+)/follow-up', requireRole('admin'), validateBody(followUpCreateSchema), ah(async (req, res) => {
    const name = await followUpActorName(store, req);
    const followUp = sellerFollowUpPayload(req.body, name);
    const org = await store.setSupplierFollowUp(Number(req.params.id), followUp);
    if (!org) {
      res.status(404).json({ success: false, error: 'Supplier organization not found' });
      return;
    }
    logStaffActivity(store, req.user, {
      activity_type: 'followup',
      label: `Supplier follow-up (${followUp.meeting}) — ${org.owner_name}`,
      ref_id: Number(req.params.id),
      quantity: 1,
    });
    res.json({ success: true, data: org });
  }));

  router.patch('/supplier-organizations/:id(\\d+)/follow-up', requireRole('admin'), validateBody(followUpPatchSchema), ah(async (req, res) => {
    const name = await followUpActorName(store, req);
    const org = await store.updateSupplierFollowUp(Number(req.params.id), req.body, name);
    if (!org) {
      res.status(404).json({ success: false, error: 'No follow up to update for this supplier organization' });
      return;
    }
    res.json({ success: true, data: org });
  }));

  router.get('/supplier-organizations/:id(\\d+)', requireRole('admin'), ah(async (req, res) => {
    const org = await store.getSupplierOrganizationDetail(Number(req.params.id));
    if (!org) {
      res.status(404).json({ success: false, error: 'Supplier organization not found' });
      return;
    }
    res.json({ success: true, data: org });
  }));

  router.get('/supplier-organizations/:id(\\d+)/products', requireRole('admin'), ah(async (req, res) => {
    const org = await store.getSupplierOrganizationDetail(Number(req.params.id));
    if (!org) {
      res.status(404).json({ success: false, error: 'Supplier organization not found' });
      return;
    }
    const user = await store.findUserByEmail(org.email);
    if (!user || user.role !== 'seller') {
      res.json({ success: true, data: { rows: [], total: 0, page: 1, per_page: Number(req.query.per_page) || 10 } });
      return;
    }
    const q = req.query;
    const page = Math.max(1, Number(q.page) || 1);
    const perPage = Math.max(1, Math.min(1000, Number(q.per_page) || 10));
    const search = typeof q.q === 'string' && q.q ? q.q : undefined;
    const all = await store.listProducts({ fournisseurId: user.id, ...(search ? { q: search } : {}) });
    const rows = all.map(mapSupplierRow);
    const total = rows.length;
    const start = (page - 1) * perPage;
    res.json({ success: true, data: { rows: rows.slice(start, start + perPage), total, page, per_page: perPage } });
  }));

  router.post('/supplier-organizations/:id(\\d+)/access', requireRole('admin'), ah(async (req, res) => {
    const org = await store.getSupplierOrganizationDetail(Number(req.params.id));
    if (!org) {
      res.status(404).json({ success: false, error: 'Supplier organization not found' });
      return;
    }
    let user = await store.findUserByEmail(org.email);
    if (!user || user.role !== 'seller') {
      res.status(404).json({ success: false, error: 'No linked supplier login account found for this organization' });
      return;
    }
    const impersonationToken = signToken({ id: user.id, role: 'seller' });
    res.json({
      success: true,
      data: {
        token: impersonationToken,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      },
    });
  }));

  router.patch('/supplier-organizations/:id(\\d+)/flags', requireRole('admin'), validateBody(supplierFlagsPatchSchema), ah(async (req, res) => {
    const org = await store.updateSupplierOrganizationFlags(Number(req.params.id), req.body);
    if (!org) {
      res.status(404).json({ success: false, error: 'Supplier organization not found' });
      return;
    }
    res.json({ success: true, data: org });
  }));

  const supplierTagsSchema = z.object({ labels: z.array(z.string().trim().min(1).max(80)).max(30) });

  router.patch('/supplier-organizations/:id(\\d+)/labels', requireRole('admin'), validateBody(supplierTagsSchema), ah(async (req, res) => {
    const org = await store.updateSupplierOrganizationLabels(Number(req.params.id), req.body.labels);
    if (!org) {
      res.status(404).json({ success: false, error: 'Supplier organization not found' });
      return;
    }
    res.json({ success: true, data: org });
  }));

  router.get('/services', requireRole('admin'), ah(async (_req, res) => {
    const rows = await store.listConfirmedServiceInscriptions();
    res.json({ success: true, data: rows });
  }));

  router.get('/services/:id(\\d+)', requireRole('admin'), ah(async (req, res) => {
    const row = await store.getServiceInscription(Number(req.params.id));
    if (!row) {
      res.status(404).json({ success: false, error: 'Service not found' });
      return;
    }
    res.json({ success: true, data: row });
  }));

  router.get('/services/:id(\\d+)/drafts', requireRole('admin'), ah(async (req, res) => {
    const row = await store.getServiceInscription(Number(req.params.id));
    if (!row) {
      res.status(404).json({ success: false, error: 'Service not found' });
      return;
    }
    const drafts = await store.listServiceDraftOrders(row.user_id);
    res.json({ success: true, data: drafts });
  }));

  router.get('/services/:id(\\d+)/commandes', requireRole('admin'), ah(async (req, res) => {
    const row = await store.getServiceInscription(Number(req.params.id));
    if (!row) {
      res.status(404).json({ success: false, error: 'Service not found' });
      return;
    }
    const commandes = await store.listServiceCommandes(row.user_id);
    res.json({ success: true, data: commandes });
  }));

  router.post('/services/drafts/:id(\\d+)/send-to-chef', requireRole('admin'), ah(async (req, res) => {
    const order = await store.getOrder(Number(req.params.id));
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }
    if (order.status !== 'draft') {
      res.status(400).json({ success: false, error: `Commande is not a draft (${order.status})` });
      return;
    }
    const inscription = await store.getLatestServiceInscription(order.dropshipper_id, 'confirmation');
    if (!inscription || inscription.status !== 'confirmed') {
      res.status(403).json({ success: false, error: 'This commande is not linked to a confirmed service inscription' });
      return;
    }
    await store.updateOrderStatus(Number(req.params.id), 'pending');
    const updated = await store.getOrder(Number(req.params.id));
    logStaffActivity(store, req.user, {
      activity_type: 'command_forward',
      label: `Sent commande ${order.order_number} to chef`,
      ref_id: order.id,
    });
    res.json({ success: true, data: updated });
  }));


  return router;
}
