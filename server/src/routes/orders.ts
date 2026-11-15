import { Router } from 'express';
import { z } from 'zod';
import { ah, requireAuth, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/error';
import { Store } from '../store';
import { OrderFull, Role } from '../store/types';
import { logStaffActivity } from '../lib/staffActivity';
import { partnerId } from '../lib/partnerId';
import { isCustomerRole, isSupplierRole } from '../store/roles';

const itemSchema = z.object({ product_id: z.number().int().positive(), quantity: z.number().int().min(1) });

const createOrderSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_phone: z.string().optional().nullable(),
  telephone2: z.string().optional().nullable(),
  governorate: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  shipping_address: z.string().min(3, 'Shipping address is required'),
  payment_method: z.enum(['flouci', 'cod']),
  items: z.array(itemSchema).min(1, 'At least one item is required').max(100),
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

const paymentSchema = z.object({ status: z.enum(['paid', 'unpaid']) });

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
  const forRole = (role: Role, o: OrderFull): OrderFull => {
    if (isCustomerRole(role)) return { ...o, barcode: null, fournisseur_name: partnerId('fournisseur', o.fournisseur_id), items: o.items.map((i) => ({ ...i, fournisseur_name: partnerId('fournisseur', i.fournisseur_id) })) };
    if (isSupplierRole(role)) return { ...o, barcode: null, dropshipper_name: partnerId('dropshipper', o.dropshipper_id), dropshipper_cin: null };
    return o;
  };
  const ownsSupplierOrder = (o: OrderFull, userId: number) => o.items.length > 0 && o.items.every((i) => i.fournisseur_id === userId);
  const ownsOrder = (role: Role, order: OrderFull, userId: number) => isCustomerRole(role)
    ? order.dropshipper_id === userId
    : isSupplierRole(role) ? ownsSupplierOrder(order, userId) : role === 'admin' || role === 'chef' || role === 'support' || role === 'stocking' || role === 'confirmateur';

  router.get('/', ah(async (req, res) => {
    const orders = await store.listOrders({ role: req.user.role, userId: req.user.id });
    res.json({ success: true, data: orders.map((o) => forRole(req.user.role, o)) });
  }));

  router.post('/', requireRole('customer', 'dropshipper', 'admin', 'support', 'fournisseur', 'seller'), validateBody(createOrderSchema), ah(async (req, res) => {
    const { items, payment_method } = req.body;

    if (req.body.manual_price !== undefined && req.user.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Only an admin can set a manual order total' });
      return;
    }

    let dropshipperId = req.user.id;
    let dropshipperName = req.user.name;
    if (req.body.dropshipper_id !== undefined) {
      if (isCustomerRole(req.user.role) || isSupplierRole(req.user.role)) {
        res.status(403).json({ success: false, error: 'You can only create commandes for yourself' });
        return;
      }
      const target = await store.findUserById(req.body.dropshipper_id);
      if (!target || !isCustomerRole(target.role)) {
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
      if (!p.is_active) {
        res.status(400).json({ success: false, error: `"${p.name}" is currently unavailable` });
        return;
      }
      if (isCustomerRole(req.user.role) && (p.moderation_status !== 'approved' || (p.offers ?? [p.category]).includes('fulfillment'))) {
        res.status(400).json({ success: false, error: `"${p.name}" is not available in the marketplace` });
        return;
      }
      if (isSupplierRole(req.user.role) && p.fournisseur_id !== req.user.id) {
        res.status(403).json({ success: false, error: 'You can only create commandes for your own products' });
        return;
      }
      if (fournisseurId === null) fournisseurId = p.fournisseur_id;
      else if (fournisseurId !== p.fournisseur_id) {
        res.status(400).json({ success: false, error: 'A commande can contain products from one supplier only' });
        return;
      }
    }
    if (fournisseurId === null) {
      res.status(400).json({ success: false, error: 'No valid items' });
      return;
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
      manual_price: req.body.manual_price,
      offer_type: req.body.offer_type,
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
    if (req.body.manual_price !== undefined) {
      logStaffActivity(store, req.user, {
        activity_type: 'order_price_override',
        label: `Applied a manual total to order ${order_number}`,
        ref_id: result.order.id,
        quantity: 1,
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
    const canView = ownsOrder(req.user.role, order, req.user.id);
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

  router.patch('/:id(\\d+)/status', requireRole('admin', 'chef', 'fournisseur', 'seller', 'customer', 'dropshipper'), validateBody(statusSchema), ah(async (req, res) => {
    const id = Number(req.params.id);
    const order = await store.getOrder(id);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }
    if (order.payment_method === 'flouci' && order.payment_status !== 'paid' && ['confirmed', 'shipped', 'delivered'].includes(req.body.status)) {
      res.status(409).json({ success: false, error: 'Verify the Flouci payment before confirming or fulfilling this order' });
      return;
    }
    if (isSupplierRole(req.user.role) && !ownsSupplierOrder(order, req.user.id)) {
      res.status(403).json({ success: false, error: 'You can only update commandes containing your products' });
      return;
    }
    if (isCustomerRole(req.user.role)) {
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
    if (isSupplierRole(req.user.role)) {
      const allowed = order.status === 'draft'
        ? ['pending', 'cancelled'].includes(req.body.status)
        : order.status === 'pending'
          ? ['confirmed', 'cancelled'].includes(req.body.status)
          : order.status === 'confirmed'
            ? req.body.status === 'shipped'
            : order.status === 'shipped' && req.body.status === 'delivered';
      if (!allowed) {
        res.status(409).json({ success: false, error: 'This status transition is not allowed for the supplier role' });
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

  router.patch('/:id(\\d+)/delivery-company', requireRole('admin', 'chef', 'stocking', 'fournisseur', 'seller'), ah(async (req, res) => {
    const id = Number(req.params.id);
    const schema = z.object({ delivery_company: z.string().trim().min(1).max(80).nullable() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ success: false, error: 'Invalid delivery company' }); return; }
    const order = await store.getOrder(id);
    if (!order) { res.status(404).json({ success: false, error: 'Order not found' }); return; }
    if (isSupplierRole(req.user.role) && !ownsSupplierOrder(order, req.user.id)) { res.status(403).json({ success: false, error: 'You can only update commandes containing your products' }); return; }
    const { delivery_company } = parsed.data;
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
    if (isCustomerRole(req.user.role)) {
      if (order.dropshipper_id !== req.user.id) {
        res.status(403).json({ success: false, error: 'You can only delete your own commandes' });
        return;
      }
      if (order.status !== 'draft') {
        res.status(409).json({ success: false, error: 'This commande was already sent to the chef — it can no longer be deleted' });
        return;
      }
    } else if (!['admin', 'chef', 'support'].includes(req.user.role) && !(isSupplierRole(req.user.role) && ownsSupplierOrder(order, req.user.id)) ) {
      res.status(403).json({ success: false, error: 'You cannot delete this commande' });
      return;
    } else if (req.user.role !== 'admin' && req.user.role !== 'chef' && order.status !== 'pending' && order.status !== 'draft') {
      res.status(409).json({ success: false, error: 'Only commandes that have not been confirmed or shipped can be deleted' });
      return;
    }
    await store.deleteOrder(id);
    res.json({ success: true, data: { deleted: id } });
  }));

  router.patch('/:id(\\d+)/payment', requireRole('admin'), validateBody(paymentSchema), ah(async (req, res) => {
    const id = Number(req.params.id);
    const order = await store.getOrder(id);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }
    if (order.payment_method !== 'cod') {
      res.status(409).json({ success: false, error: 'Online payments can only be reconciled after provider verification' });
      return;
    }
    await store.updatePayment(id, req.body.status);
    logStaffActivity(store, req.user, {
      activity_type: 'payment_reconcile',
      label: `Reconciled payment for order ${order.order_number}: ${req.body.status ?? 'paid'}`,
      ref_id: id,
      quantity: 1,
    });
    const updated = await store.getOrder(id);
    res.json({ success: true, data: forRole(req.user.role, updated!) });
  }));

  router.post('/:id(\\d+)/tracking', requireRole('admin', 'fournisseur', 'seller'), validateBody(trackingSchema), ah(async (req, res) => {
    const id = Number(req.params.id);
    const order = await store.getOrder(id);
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }
    if (isSupplierRole(req.user.role) && !ownsSupplierOrder(order, req.user.id)) { res.status(403).json({ success: false, error: 'You can only track commandes containing your products' }); return; }
    await store.addTracking(id, { carrier: req.body.carrier, tracking_number: req.body.tracking_number, status: req.body.status, detail: req.body.detail ?? null });
    const updated = await store.getOrder(id);
    res.json({ success: true, data: forRole(req.user.role, updated!) });
  }));

  /** Confirmation service inscription — dropshippers apply, staff confirm later. */
  router.get('/confirmation-service/status', requireRole('customer', 'dropshipper'), ah(async (req, res) => {
    const row = await store.getLatestServiceInscription(req.user.id, 'confirmation');
    res.json({ success: true, data: row });
  }));

  router.post('/confirmation-service/apply', requireRole('customer', 'dropshipper'), ah(async (req, res) => {
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
