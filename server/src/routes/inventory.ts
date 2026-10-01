import { Router } from 'express';
import { ah, requireAuth, requireRole } from '../middleware/auth';
import { Store } from '../store';

export function inventoryRoutes(store: Store): Router {
  const router = Router();

  router.get('/by-code/:code', ah(async (req, res) => {
    const inventory = await store.getInventoryByCode(req.params.code);
    if (!inventory) res.status(404).json({ success: false, error: 'Inventory not found' });
    else res.json({ success: true, data: inventory });
  }));

  router.use(requireAuth);

  router.get('/', ah(async (req, res) => {
    res.json({ success: true, data: await store.listInventories() });
  }));

  router.get('/:id', ah(async (req, res) => {
    const inventory = await store.getInventory(Number(req.params.id));
    if (!inventory) res.status(404).json({ success: false, error: 'Inventory not found' });
    else res.json({ success: true, data: inventory });
  }));

  router.post('/', requireRole('admin'), ah(async (req, res) => {
    const name = String(req.body.name ?? '').trim();
    const capacity = Number(req.body.capacity ?? 50);
    if (!name) { res.status(400).json({ success: false, error: 'Name is required' }); return; }
    if (!Number.isFinite(capacity) || capacity < 1) { res.status(400).json({ success: false, error: 'Capacity must be a positive number' }); return; }
    const inventory = await store.createInventory({ name, location: req.body.location ?? null, capacity });
    res.status(201).json({ success: true, data: inventory });
  }));

  router.delete('/:id', requireRole('admin'), ah(async (req, res) => {
    await store.deleteInventory(Number(req.params.id));
    res.json({ success: true, data: { ok: true } });
  }));

  router.post('/:id/stock', requireRole('admin'), ah(async (req, res) => {
    const productId = Number(req.body.product_id);
    const quantity = Number(req.body.quantity);
    if (!Number.isFinite(productId) || productId < 1) { res.status(400).json({ success: false, error: 'A valid product id is required' }); return; }
    if (!Number.isFinite(quantity) || quantity < 1) { res.status(400).json({ success: false, error: 'Quantity must be a positive number' }); return; }
    try {
      await store.addInventoryStock(Number(req.params.id), productId, quantity);
      res.json({ success: true, data: await store.getInventory(Number(req.params.id)) });
    } catch (err) {
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  }));

  return router;
}