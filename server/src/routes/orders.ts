import { Router } from 'express';
import { z } from 'zod';
import { ah, requireAuth, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/error';
import { Store } from '../store';
import { OrderFull, Role } from '../store/types';
import { logStaffActivity } from '../lib/staffActivity';

const itemSchema = z.object({ product_id: z.number().int().positive(), quantity: z.number().int().min(1) });

const createOrderSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_phone: z.string().optional().nullable(),
  telephone2: z.string().optional().nullable(),
  governorate: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  shipping_address: z.string().min(3, 'Shipping address is required'),
  payment_method: z.enum(['stripe', 'paypal', 'cod']),
  items: z.array(itemSchema).min(1, 'At least one item is required'),
  offer_type: z.enum(['dropshipping', 'wholesale', 'fulfillment']).optional(),
  dropshipper_id: z.number().int().positive().optional(),
  locality_id: z.number().int().positive().optional().nullable(),
  commentaire: z.string().optional().nullable(),
  est_fragile: z.enum(['oui', 'non']).optional(),
  ouvrir_colis: z.enum(['oui', 'non']).optional(),
  nombre_article: z.number().int().min(1).optional(),
  nombre_echange: z.enum(['oui', 'non']).optional(),
  manual_price: z.number().positive().optional(),
});

const statusSchema = z.object({ status: z.enum(['draft', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled']) });

const paymentSchema = z.object({ status: z.enum(['paid', 'unpaid']).optional(), method: z.enum(['stripe', 'paypal', 'cod']).optional() });

const trackingSchema = z.object({
  carrier: z.string().min(1),
  tracking_number: z.string().min(1),
  status: z.string().min(1),
  detail: z.string().optional().nullable(),
});

const CONFIRMATION_SERVICE_FEE = 29;

export function orderRoutes(store: Store): Router {
  const router = Router();
  router.use(requireAuth);

  /** Hide the commande scan barcode from dropshippers and suppliers — only staff (chef/support/admin) use scans. */
  const forRole = (role: Role, o: OrderFull): OrderFull => (role === 'customer' || role === 'seller' ? { ...o, barcode: null } : o);

  /** A fournisseur manages a commande only when every item in it is theirs (i.e. a single-supplier commande). */
  const isOwnSupplier = (o: OrderFull, userId: number) => o.items.length > 0 && o.items.every((i) => i.fournisseur_id === userId);

  router.get('/', ah(async (req, res) => {
    const orders = await store.listOrders({ role: req.user.role, userId: req.user.id });
    res.json({ success: true, data: orders.map((o) => forRole(req.user.role, o)) });
  }));

  router.post('/', requireRole('customer', 'admin', 'seller'), validateBody(createOrderSchema), ah(async (req, res) => {
    const { items, payment_method } = req.body;

    let dropshipperId = req.user.id;
    let dropshipperName = req.user.name;
    if (req.body.dropshipper_id !== undefined) {
      if (req.user.role === 'customer') {
        res.status(403).json({ success: false, error: 'You can only create commandes for yourself' });
        return;
      }
      const target = await store.findUserById(req.body.dropshipper_id);
      if (!target || target.role !== 'customer') {
        res.status(400).json({ success: false, error: 'Invalid dropshipper' });
        return;
      }
      dropshipperId = target.id;
      dropshipperName = target.name;
    }

    let fournisseurId: number | null = null;
    for (const it of items) {
      const p = await store.getProduct(it.product_id);
      if (!p) {
        res.status(400).json({ success: false, error: `Product ${it.product_id} not found` });
        return;
      }
      if (!p.is_active && !(req.user.role === 'seller' && p.fournisseur_id === req.user.id)) {
        res.status(400).json({ success: false, error: `"${p.name}" is currently unavailable` });
        return;
      }
      if (fournisseurId === null) fournisseurId = p.fournisseur_id;
    }
    if (fournisseurId === null) {
      res.status(400).json({ success: false, error: 'No valid items' });
      return;
    }

    if (req.user.role === 'seller') {
      for (const it of items) {
        const p = await store.getProduct(it.product_id);
        if (!p || p.fournisseur_id !== req.user.id || !(p.offers ?? [p.category]).includes('fulfillment')) {
          res.status(403).json({ success: false, error: 'You can only create fulfillment orders for your own fulfillment products' });
          return;
        }
      }
      req.body.offer_type = 'fulfillment';
    }

    const order_number = `D42-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
    let result = await store.createOrder({
      order_number,
      dropshipper_id: dropshipperId,
      fournisseur_id: fournisseurId,
      customer_name: req.body.customer_name,
      customer_phone: req.body.customer_phone ?? null,
      telephone2: req.body.telephone2 ?? null,
      governorate: req.body.governorate ?? null,
      city: req.body.city ?? null,
      shipping_address: req.body.shipping_address,
      payment_method,
      items,
      offer_type: req.body.offer_type,
      manual_price: req.body.manual_price,
      locality_id: req.body.locality_id ?? null,
      commentaire: req.body.commentaire ?? null,
      est_fragile: req.body.est_fragile ?? 'non',
      ouvrir_colis: req.body.ouvrir_colis ?? 'non',
      nombre_article: req.body.nombre_article ?? null,
      nombre_echange: req.body.nombre_echange ?? 'non',
    });
    if (req.user.role === 'admin') {
      logStaffActivity(store, req.user, {
        activity_type: 'command_create',
        label: `Created commande ${order_number} for ${dropshipperName}`,
        ref_id: result.order.id,
      });
    }
    res.status(201).json({ success: true, data: forRole(req.user.role, result.order), requestedFromSupplier: result.requestedFromSupplier });
  }));

  router.get('/:id(\\d+)', ah(async (req, res) => {
    const order = await store.getOrder(Number(req.params.id));
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }
    const canView = req.user.role === 'admin' || order.dropshipper_id === req.user.id || order.items.some((i) => i.fournisseur_id === req.user.id);
    if (!canView) {
      res.status(403).json({ success: false, error: 'You cannot view this order' });
      return;
    }
    if (order.status === 'draft' && req.user.role !== 'admin' && order.dropshipper_id !== req.user.id) {
      res.status(403).json({ success: false, error: 'This commande is still a draft and has not been sent to the chef yet' });
      return;
    }
    res.json({ success: true, data: forRole(req.user.role, order) });
  }));

  router.patch('/:id(\\d+)/status', requireRole('seller', 'admin', 'customer'), validateBody(statusSchema), ah(async (req, res) => {
    const id = Number(req.params.id);
    const order = await store.getOrder(id);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }
    const isOwnSupplierLocal = (o: OrderFull) => isOwnSupplier(o, req.user.id);
    if (req.user.role === 'seller' && !isOwnSupplierLocal(order)) {
      res.status(403).json({ success: false, error: 'You can only update your own orders' });
      return;
    }
    if (req.user.role === 'seller' && order.status === 'draft' && order.dropshipper_id === req.user.id && req.body.status !== 'pending' && req.body.status !== 'cancelled') {
      res.status(409).json({ success: false, error: 'A draft commande can only be sent to the chef, cancelled or deleted' });
      return;
    }
    if (req.user.role === 'customer') {
      if (order.dropshipper_id !== req.user.id) {
        res.status(403).json({ success: false, error: 'You can only update your own commandes' });
        return;
      }
      const cancellable = ['draft', 'pending', 'confirmed', 'ready'].includes(order.status);
      const allowed =
        req.body.status === 'cancelled'
          ? cancellable
          : order.status === 'draft' && req.body.status === 'pending';
      if (!allowed) {
        res.status(409).json({
          success: false,
          error:
            req.body.status === 'cancelled'
              ? 'This commande can no longer be cancelled'
              : order.status === 'draft'
                ? 'A draft commande can only be sent to the chef or deleted'
                : 'This commande was already sent to the chef — you can no longer change it',
        });
        return;
      }
    }
    if (order.payment_method === 'cod' && req.body.status === 'delivered') {
      await store.updatePayment(id, 'paid');
    }
    await store.updateOrderStatus(id, req.body.status);
    const updated = await store.getOrder(id);
    res.json({ success: true, data: forRole(req.user.role, updated!) });
  }));

  router.patch('/:id(\\d+)/delivery-company', requireRole('seller', 'admin'), ah(async (req, res) => {
    const id = Number(req.params.id);
    const { delivery_company } = req.body as { delivery_company: string | null };
    await store.setDeliveryCompany(id, delivery_company ?? null);
    const updated = await store.getOrder(id);
    res.json({ success: true, data: forRole(req.user.role, updated!) });
  }));

  router.delete('/:id(\\d+)', ah(async (req, res) => {
    const id = Number(req.params.id);
    const order = await store.getOrder(id);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }
    if (req.user.role === 'customer') {
      if (order.dropshipper_id !== req.user.id) {
        res.status(403).json({ success: false, error: 'You can only delete your own commandes' });
        return;
      }
      if (order.status !== 'draft') {
        res.status(409).json({ success: false, error: 'This commande was already sent to the chef — it can no longer be deleted' });
        return;
      }
    } else if (req.user.role === 'seller') {
      if (order.dropshipper_id !== req.user.id) {
        res.status(403).json({ success: false, error: 'You can only delete your own commandes' });
        return;
      }
      if (order.status !== 'draft') {
        res.status(409).json({ success: false, error: 'This commande was already sent to the chef — it can no longer be deleted' });
        return;
      }
    } else if (req.user.role !== 'admin' && order.status !== 'pending' && order.status !== 'draft') {
      res.status(409).json({ success: false, error: 'Only commandes that have not been confirmed or shipped can be deleted' });
      return;
    }
    await store.deleteOrder(id);
    res.json({ success: true, data: { deleted: id } });
  }));

  router.post('/:id(\\d+)/pay', requireRole('customer', 'admin'), validateBody(paymentSchema), ah(async (req, res) => {
    const id = Number(req.params.id);
    const order = await store.getOrder(id);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }
    if (req.user.role === 'customer' && order.dropshipper_id !== req.user.id) {
      res.status(403).json({ success: false, error: 'You can only pay for your own orders' });
      return;
    }
    await store.updatePayment(id, 'paid', req.body.method ?? order.payment_method ?? 'stripe');
    const updated = await store.getOrder(id);
    res.json({ success: true, data: forRole(req.user.role, updated!) });
  }));

  router.patch('/:id(\\d+)/payment', requireRole('admin', 'seller'), validateBody(paymentSchema), ah(async (req, res) => {
    const id = Number(req.params.id);
    const order = await store.getOrder(id);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }
    if (req.user.role === 'seller' && !isOwnSupplier(order, req.user.id)) {
      res.status(403).json({ success: false, error: 'You can only manage your own orders' });
      return;
    }
    await store.updatePayment(id, req.body.status ?? 'paid', req.body.method ?? null);
    const updated = await store.getOrder(id);
    res.json({ success: true, data: forRole(req.user.role, updated!) });
  }));

  router.post('/:id(\\d+)/tracking', requireRole('seller', 'admin'), validateBody(trackingSchema), ah(async (req, res) => {
    const id = Number(req.params.id);
    const order = await store.getOrder(id);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }
    if (req.user.role === 'seller' && !isOwnSupplier(order, req.user.id)) {
      res.status(403).json({ success: false, error: 'You can only add tracking to your own orders' });
      return;
    }
    await store.addTracking(id, { carrier: req.body.carrier, tracking_number: req.body.tracking_number, status: req.body.status, detail: req.body.detail ?? null });
    const updated = await store.getOrder(id);
    res.json({ success: true, data: forRole(req.user.role, updated!) });
  }));

  /** Confirmation service inscription — dropshippers apply, staff confirm later. */
  router.get('/confirmation-service/status', requireRole('customer'), ah(async (req, res) => {
    const row = await store.getLatestServiceInscription(req.user.id, 'confirmation');
    res.json({ success: true, data: row });
  }));

  router.post('/confirmation-service/apply', requireRole('customer'), ah(async (req, res) => {
    const existing = await store.getLatestServiceInscription(req.user.id, 'confirmation');
    if (existing && existing.status !== 'rejected') {
      res.status(400).json({ success: false, error: existing.status === 'pending' ? 'You already have a pending application' : 'The service is already active' });
      return;
    }
    const row = await store.createServiceInscription({ user_id: req.user.id, service: 'confirmation', amount: CONFIRMATION_SERVICE_FEE, notes: 'Confirmation service application' });
    res.status(201).json({ success: true, data: row });
  }));

  return router;
}
