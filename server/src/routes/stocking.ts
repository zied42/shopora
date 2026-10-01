import { Router } from 'express';
import { z } from 'zod';
import { ah, requireAuth, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/error';
import { Store } from '../store';
import { isShipmentZone } from '../store/shipmentZones';
import { buildChefTickets, createChefTicket, updateChefTicket } from '../data/chefTickets';
import { logStaffActivity } from '../lib/staffActivity';

const STATUSES = ['Pending', 'Confirmed', 'Approved', 'In preparation', 'Ready', 'Shipped', 'Completed', 'Rejected'] as const;

const itemSchema = z.object({
  product_name: z.string().trim().min(1, 'Product name is required').max(255),
  color: z.string().trim().max(100).nullable().optional(),
  image_url: z.string().trim().max(500).nullable().optional(),
  expected_incoming: z.number().int().min(0).optional(),
  supplier_stock: z.number().int().min(0).optional(),
  our_stock: z.number().int().min(0).optional(),
  period_consumption: z.number().int().min(0).optional(),
  qty_non_confirmed: z.number().int().min(0).optional(),
  qty_required_orders: z.number().int().min(0).optional(),
  qty_to_request: z.number().int().min(0).optional(),
  qty_picked: z.number().int().min(0).optional(),
  unit_price: z.number().min(0).optional(),
});

const saveSchema = z.object({
  supplier: z.string().trim().min(1, 'Supplier is required').max(200),
  products: z.number().int().min(0).max(100000),
  storage_request: z.string().trim().max(50).nullable().optional(),
  reservation: z.string().trim().max(50).nullable().optional(),
  date: z.string().optional().nullable(),
  status: z.enum(STATUSES).optional(),
  items: z.array(itemSchema).max(200).optional(),
});

export function stockingRoutes(store: Store): Router {
  const router = Router();
  router.use(requireAuth, requireRole('admin'));

  router.get('/products', ah(async (req, res) => {
    const q = typeof req.query.q === 'string' && req.query.q ? req.query.q : undefined;
    const rows = await store.listStockingProducts(q);
    res.json({ success: true, data: rows });
  }));

  router.post('/products/:id(\\d+)/moderate', validateBody(z.object({
    status: z.enum(['approved', 'refused', 'hidden']),
    note: z.string().max(2000).optional().nullable(),
  })), ah(async (req, res) => {
    const id = Number(req.params.id);
    const product = await store.getProduct(id);
    await store.moderateProduct(id, req.body.status, req.body.note ?? null);
    logStaffActivity(store, req.user, {
      activity_type: 'product_moderate',
      label: `Product #${id} → ${req.body.status}`,
      ref_id: id,
      quantity: 1,
    });
    if (req.body.status === 'approved' && product) {
      const dropshippers = (await store.listUsers()).filter((u) => u.role === 'customer');
      await Promise.all(dropshippers.map((d) => store.createNotification({
        user_id: d.id,
        type: 'new_product',
        title: 'New product available',
        body: `"${product.name}" has been approved and is now available in the store.`,
        product_id: product.id,
        image_url: product.image_url,
      })));
    }
    res.json({ success: true, data: { ok: true } });
  }));

  router.get('/stock-refill-pickup-list', ah(async (_req, res) => {
    const result = await store.getStockRefillPickupList();
    res.json({ success: true, data: result });
  }));

  router.get('/stock-refill-requests', ah(async (req, res) => {    const q = req.query;
    const result = await store.listStockRefillRequests({
      page: Math.max(1, Number(q.page) || 1),
      per_page: Math.max(1, Math.min(200, Number(q.per_page) || 10)),
      q: typeof q.q === 'string' && q.q ? q.q : undefined,
      status: typeof q.status === 'string' && q.status ? q.status : undefined,
      supplier: typeof q.supplier === 'string' && q.supplier ? q.supplier : undefined,
    });
    res.json({ success: true, data: result });
  }));

  router.get('/storage-requests', ah(async (req, res) => {
    const q = req.query;
    const result = await store.listStorageRequests({
      page: Math.max(1, Number(q.page) || 1),
      per_page: Math.max(1, Math.min(200, Number(q.per_page) || 10)),
      q: typeof q.q === 'string' && q.q ? q.q : undefined,
    });
    res.json({ success: true, data: result });
  }));

  router.get('/storage-requests/:id(\\d+)', ah(async (req, res) => {
    const row = await store.getStorageRequest(Number(req.params.id));
    if (!row) {
      res.status(404).json({ success: false, error: 'Storage request not found' });
      return;
    }
    res.json({ success: true, data: row });
  }));

  router.get('/orders-pickability', ah(async (_req, res) => {
    const rows = await store.listOrdersPickability();
    res.json({ success: true, data: rows });
  }));

  router.get('/wholesale-orders', ah(async (_req, res) => {
    const rows = await store.listWholesaleOrders();
    res.json({ success: true, data: rows });
  }));

  router.get('/cancelled-orders', ah(async (_req, res) => {
    const rows = await store.listCancelledOrders();
    res.json({ success: true, data: rows });
  }));

  router.get('/stock-returns', ah(async (_req, res) => {
    const rows = await store.listStockReturns();
    res.json({ success: true, data: rows });
  }));

  router.post('/stock-returns/store', validateBody(z.object({
    supplier_id: z.number().int().positive(),
    inventory_id: z.number().int().positive(),
  })), ah(async (req, res) => {
    const result = await store.storeStockReturns({ supplier_id: req.body.supplier_id, inventory_id: req.body.inventory_id });
    res.json({ success: true, data: result });
  }));

  router.post('/stock-returns/scan', validateBody(z.object({
    code: z.string().min(1),
    inventory_id: z.number().int().positive(),
  })), ah(async (req, res) => {
    const result = await store.scanStockReturn({ code: req.body.code, inventory_id: req.body.inventory_id });
    res.json({ success: true, data: result });
  }));

  router.get('/stock-shipments', ah(async (_req, res) => {
    const rows = await store.listStockShipments();
    res.json({ success: true, data: rows });
  }));

  router.post('/stock-shipments/:id(\\d+)/zone', validateBody(z.object({ zone: z.string().nullable() })), ah(async (req, res) => {
    const zone = req.body.zone === null || req.body.zone === '' ? null : req.body.zone;
    if (zone !== null && !isShipmentZone(zone)) {
      res.status(422).json({ success: false, error: 'Invalid zone' });
      return;
    }
    await store.setStockShipmentZone(Number(req.params.id), zone);
    res.json({ success: true, data: { zone } });
  }));

  router.get('/picks', ah(async (_req, res) => {
    const rows = await store.listOrderPicks();
    res.json({ success: true, data: rows });
  }));

  router.post('/picks/:orderId(\\d+)', ah(async (req, res) => {
    const orderId = Number(req.params.orderId);
    const row = await store.createOrderPick(orderId);
    if (!row) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }
    logStaffActivity(store, req.user, {
      activity_type: 'pick_create',
      label: `Pick for order #${orderId}`,
      ref_id: orderId,
      quantity: 1,
    });
    res.json({ success: true, data: row });
  }));

  router.post('/picks/:orderId(\\d+)/scan', ah(async (req, res) => {
    const orderId = Number(req.params.orderId);
    const row = await store.scanOrderPickStatus(orderId);
    if (!row) {
      res.status(404).json({ success: false, error: 'Order not found in picks' });
      return;
    }
    logStaffActivity(store, req.user, {
      activity_type: 'pick_scan',
      label: `Pick scanned for order #${orderId}`,
      ref_id: orderId,
      quantity: 1,
    });
    res.json({ success: true, data: row });
  }));

  router.get('/orders/:id(\\d+)/pick-plan', ah(async (req, res) => {
    const plan = await store.getOrderPickPlan(Number(req.params.id));
    if (!plan) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }
    res.json({ success: true, data: plan });
  }));

  router.post('/orders/:id(\\d+)/pick-scan', validateBody(z.object({
    product_id: z.number().int().positive(),
    inventory_id: z.number().int().positive(),
    batch_code: z.string().trim().max(40).nullable().optional(),
  })), ah(async (req, res) => {
    try {
      const plan = await store.scanOrderPick(
        Number(req.params.id),
        req.body.product_id,
        req.body.inventory_id,
        req.body.batch_code ?? null
      );
      if (!plan) {
        res.status(404).json({ success: false, error: 'Order not found' });
        return;
      }
      logStaffActivity(store, req.user, {
        activity_type: 'pick_scan',
        label: `Item ${req.body.product_id} scanned for order #${req.params.id}`,
        ref_id: Number(req.params.id),
        quantity: 1,
      });
      res.json({ success: true, data: plan });
    } catch (err) {
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  }));

  router.get('/stock-refill-requests/:id(\\d+)', ah(async (req, res) => {
    const row = await store.getStockRefillRequest(Number(req.params.id));
    if (!row) {
      res.status(404).json({ success: false, error: 'Stock refill request not found' });
      return;
    }
    res.json({ success: true, data: row });
  }));

  router.post('/stock-refill-requests', validateBody(saveSchema), ah(async (req, res) => {
    const row = await store.createStockRefillRequest(req.body);
    const refillId = (row as { id?: number })?.id;
    logStaffActivity(store, req.user, {
      activity_type: 'refill_create',
      label: `Refill request${refillId ? ` #${refillId}` : ''} created (${req.body.items?.length ?? 0} items)`,
      ref_id: refillId ?? null,
      quantity: 1,
    });
    res.status(201).json({ success: true, data: row });
  }));

  router.put('/stock-refill-requests/:id(\\d+)', validateBody(saveSchema), ah(async (req, res) => {
    const refillId = Number(req.params.id);
    const row = await store.updateStockRefillRequest(refillId, req.body);
    if (!row) {
      res.status(404).json({ success: false, error: 'Stock refill request not found' });
      return;
    }
    logStaffActivity(store, req.user, {
      activity_type: 'refill_update',
      label: `Refill request #${refillId} updated`,
      ref_id: refillId,
      quantity: 1,
    });
    res.json({ success: true, data: row });
  }));

  router.delete('/stock-refill-requests/:id(\\d+)', ah(async (req, res) => {
    const ok = await store.deleteStockRefillRequest(Number(req.params.id));
    if (!ok) {
      res.status(404).json({ success: false, error: 'Stock refill request not found' });
      return;
    }
    res.json({ success: true, data: { ok: true } });
  }));

  router.get('/tickets', ah(async (_req, res) => {
    const all = await buildChefTickets();
    res.json({ success: true, data: { tickets: all.tickets, stats: all.stats } });
  }));

  router.post('/tickets', validateBody(z.object({
    author_name: z.string().trim().min(1),
    owner_names: z.array(z.string().trim().min(1)).default([]),
    subject: z.string().trim().min(1),
    description: z.string().trim().default(''),
    department: z.string().trim().default('Commercial'),
    priority: z.enum(['urgent', 'high', 'medium']).default('medium'),
    related_to: z.string().nullable().default(null),
  })), ah(async (req, res) => {
    const input = {
      authorName: req.body.author_name,
      ownerNames: req.body.owner_names,
      subject: req.body.subject,
      description: req.body.description,
      department: req.body.department,
      priority: req.body.priority,
      relatedTo: req.body.related_to,
    };
    const ticket = await createChefTicket(input);
    res.json({ success: true, data: ticket });
  }));

  router.patch('/tickets/:id(\\d+)', validateBody(z.object({
    status: z.enum(['resolved', 'unresolved']).optional(),
    priority: z.enum(['urgent', 'high', 'medium']).optional(),
  })), ah(async (req, res) => {
    const updated = await updateChefTicket(Number(req.params.id), req.body);
    if (!updated) { res.status(404).json({ success: false, error: 'Ticket not found' }); return; }
    res.json({ success: true, data: updated });
  }));

  router.get('/dashboard', ah(async (_req, res) => {
    const [refill, pickup, picks, returns, shipments, storage] = await Promise.all([
      store.listStockRefillRequests({ page: 1, per_page: 200 }),
      store.getStockRefillPickupList(),
      store.listOrderPicks(),
      store.listStockReturns(),
      store.listStockShipments(),
      store.listStorageRequests({ page: 1, per_page: 200 }),
    ]);

    const statusCounts: Record<string, number> = {};
    let refillQtyToRequest = 0;
    for (const r of refill.rows) {
      statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
      for (const it of r.items ?? []) refillQtyToRequest += it.qty_to_request ?? 0;
    }

    const pickCounts: Record<string, number> = { total: picks.length };
    for (const p of picks) pickCounts[p.status] = (pickCounts[p.status] ?? 0) + 1;

    const byDropshipper: Record<string, { unconfirmed: number; confirmed: number; shipped: number; return: number; cancelled: number; value: number }> = {};
    const byDay: Record<string, { unconfirmed: number; confirmed: number; shipped: number; return: number; cancelled: number; total: number; value: number }> = {};
    let shippedValue = 0;
    let confirmedValue = 0;
    for (const p of picks) {
      const name = p.dropshipper_name ?? 'Unknown';
      const d = byDropshipper[name] ?? { unconfirmed: 0, confirmed: 0, shipped: 0, return: 0, cancelled: 0, value: 0 };
      d[p.status] = (d[p.status] ?? 0) + 1;
      d.value += p.total;
      byDropshipper[name] = d;

      const day = (p.created_at ?? '').slice(0, 10);
      const dd = byDay[day] ?? { unconfirmed: 0, confirmed: 0, shipped: 0, return: 0, cancelled: 0, total: 0, value: 0 };
      dd[p.status] = (dd[p.status] ?? 0) + 1;
      dd.total += 1;
      dd.value += p.total;
      byDay[day] = dd;

      if (p.status === 'shipped') shippedValue += p.total;
      if (p.status === 'confirmed' || p.status === 'shipped') confirmedValue += p.total;
    }

    let returnPendingUnits = 0;
    for (const r of returns) returnPendingUnits += r.pending ?? 0;

    let exchanges = 0;
    let delivered = 0;
    let returnsDelivered = 0;
    for (const p of picks) {
      const ds = p.delivery_status ?? '';
      if (ds === 'echange') exchanges++;
      if (ds === 'livre') delivered++;
      if (ds === 'retour_expediteur' || ds.startsWith('retour') || ds.startsWith('rtn')) returnsDelivered++;
    }

    const storageStatusCounts: Record<string, number> = {};
    let storageQty = 0;
    for (const s of storage.rows) {
      storageStatusCounts[s.status] = (storageStatusCounts[s.status] ?? 0) + 1;
      storageQty += s.products ?? 0;
    }

    res.json({
      success: true,
      data: {
        refill: {
          total: refill.rows.length,
          statusCounts,
          pickupSuppliers: pickup.suppliers.length,
          totalQtyToRequest: refillQtyToRequest,
        },
        picks: { ...pickCounts, readyToConfirm: pickCounts.unconfirmed ?? 0 },
        returns: { total: returns.length, pendingUnits: returnPendingUnits },
        storage: { total: storage.rows.length, statusCounts: storageStatusCounts, quantity: storageQty },
        delivery: { exchanges, delivered, returnsDelivered },
        flow: {
          confirmedValue,
          shippedValue,
          confirmed: pickCounts.confirmed ?? 0,
          shipped: pickCounts.shipped ?? 0,
          returnCount: pickCounts.return ?? 0,
        },
        byDropshipper: Object.entries(byDropshipper)
          .map(([name, v]) => ({ name, ...v }))
          .sort((a, b) => b.value - a.value),
        byDay: Object.entries(byDay)
          .map(([day, v]) => ({ day, ...v }))
          .sort((a, b) => a.day.localeCompare(b.day))
          .slice(-14),
        recent: picks
          .slice()
          .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
          .slice(0, 8)
          .map((p) => ({
            order_number: p.order_number,
            dropshipper_name: p.dropshipper_name,
            status: p.status,
            total: p.total,
            created_at: p.created_at,
          })),
      },
    });
  }));

  return router;
}
