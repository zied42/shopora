import { Router } from 'express';
import { z } from 'zod';
import { ah, requireAuth, requireRole } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/error';
import { Store } from '../store';

const productSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional().nullable(),
  price: z.number().positive('Price must be positive'),
  cost_price: z.number().min(0).optional(),
  category: z.enum(['dropshipping', 'wholesale', 'white_label', 'fulfillment']).optional(),
  offers: z.array(z.enum(['dropshipping', 'wholesale', 'white_label', 'fulfillment'])).optional(),
  retail_category: z.string().max(255).optional().nullable(),
  height: z.coerce.number().min(0).optional().nullable(),
  length: z.coerce.number().min(0).optional().nullable(),
  width: z.coerce.number().min(0).optional().nullable(),
  weight: z.coerce.number().min(0).optional().nullable(),
  stock: z.number().int().min(0),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
  video_url: z.string().optional().nullable(),
  images: z.array(z.string()).optional(),
  videos: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  specifications: z.array(z.object({ k: z.string(), v: z.string() })).optional(),
  wholesale_tiers: z.array(z.object({ min: z.number().min(0), max: z.number().min(0), price: z.number().min(0) })).optional(),
});

const patchProductSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  price: z.number().positive().optional(),
  cost_price: z.number().min(0).optional(),
  category: z.enum(['dropshipping', 'wholesale', 'white_label', 'fulfillment']).optional(),
  offers: z.array(z.enum(['dropshipping', 'wholesale', 'white_label', 'fulfillment'])).optional(),
  retail_category: z.string().max(255).optional().nullable(),
  height: z.coerce.number().min(0).optional().nullable(),
  length: z.coerce.number().min(0).optional().nullable(),
  width: z.coerce.number().min(0).optional().nullable(),
  weight: z.coerce.number().min(0).optional().nullable(),
  stock: z.number().int().min(0).optional(),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  image_url: z.string().optional().nullable(),
  video_url: z.string().optional().nullable(),
  images: z.array(z.string()).optional(),
  videos: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  specifications: z.array(z.object({ k: z.string(), v: z.string() })).optional(),
  wholesale_tiers: z.array(z.object({ min: z.number().min(0), max: z.number().min(0), price: z.number().min(0) })).optional(),
  is_active: z.boolean().optional(),
});

const stockSchema = z.object({ stock: z.number().int().min(0) });

const ratingSchema = z.object({
  score: z.number().int().min(1).max(5),
  comment: z.string().optional().nullable(),
});

const listQuerySchema = z.object({
  q: z.string().optional(),
});

export function productRoutes(store: Store): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/', validateQuery(listQuerySchema), ah(async (req, res) => {
    const isFournisseur = req.user.role === 'seller';
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    const products = await store.listProducts({
      q,
      fournisseurId: isFournisseur ? req.user.id : undefined,
      activeOnly: req.user.role === 'customer',
      hideIneligible: !isFournisseur,
      excludeCategories: isFournisseur ? undefined : ['fulfillment'],
    });
    res.json({ success: true, data: products });
  }));

  router.get('/saved', ah(async (req, res) => {
    const saved = await store.listSavedProducts(req.user.id);
    res.json({ success: true, data: saved });
  }));

  router.get('/trending', ah(async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const data = await store.trendingProducts(limit);
    res.json({ success: true, data });
  }));

  router.get('/:id(\\d+)/suppliers', ah(async (req, res) => {
    const id = Number(req.params.id);
    const p = await store.getProduct(id);
    if (!p) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }
    const suppliers = await store.productSuppliers(id);
    res.json({ success: true, data: suppliers });
  }));

  /** Invoices are derived from the current user's delivered commandes that include this product. */
  router.get('/:id(\\d+)/invoices', ah(async (req, res) => {
    const id = Number(req.params.id);
    const p = await store.getProduct(id);
    if (!p) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }
    const orders = await store.listOrders({ role: req.user.role, userId: req.user.id });
    const invoices = orders
      .filter((o) => o.status === 'delivered')
      .map((o) => {
        const items = o.items.filter((i) => i.product_id === id);
        if (items.length === 0) return null;
        const qty = items.reduce((s, i) => s + i.quantity, 0);
        const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
        return {
          id: o.id,
          invoice_number: `INV-${o.order_number}`,
          order_number: o.order_number,
          delivered_at: o.delivered_at ?? o.created_at,
          customer_name: o.customer_name,
          city: o.city,
          governorate: o.governorate,
          payment_method: o.payment_method,
          payment_status: o.payment_status,
          quantity: qty,
          total: Math.round(total * 100) / 100,
          commission: o.commission ?? 0,
          items: items.map((i) => ({ product_id: i.product_id, product_name: i.product_name, quantity: i.quantity, price: i.price, cost: i.cost })),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    res.json({ success: true, data: invoices });
  }));

  router.delete('/saved/:productId(\\d+)', ah(async (req, res) => {
    await store.removeSavedProduct(req.user.id, Number(req.params.productId));
    res.json({ success: true, data: { ok: true } });
  }));

  const myPriceSchema = z.object({ my_price: z.number().min(0).nullable() });

  router.post('/saved/:productId(\\d+)/price', validateBody(myPriceSchema), ah(async (req, res) => {
    const productId = Number(req.params.productId);
    const saved = await store.listSavedProducts(req.user.id);
    if (!saved.some((s) => s.product.id === productId)) {
      res.status(404).json({ success: false, error: 'Product not in your saved products' });
      return;
    }
    await store.setSavedProductPrice(req.user.id, productId, req.body.my_price);
    res.json({ success: true, data: { ok: true } });
  }));

  const saveSchema = z.object({ offer_type: z.enum(['dropshipping', 'wholesale']).optional() });

  router.post('/:id(\\d+)/save', validateBody(saveSchema), ah(async (req, res) => {
    const id = Number(req.params.id);
    const p = await store.getProduct(id);
    if (!p) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }
    await store.saveProduct(req.user.id, id, req.body.offer_type);
    res.status(201).json({ success: true, data: { saved: true } });
  }));

  router.get('/:id(\\d+)', ah(async (req, res) => {
    const p = await store.getProduct(Number(req.params.id));
    if (!p) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }
    res.json({ success: true, data: p });
  }));

  router.get('/my-supplier-org', requireRole('seller'), ah(async (req, res) => {
    const users = await store.listUsers();
    const user = users.find((u) => u.id === req.user.id);
    if (!user) { res.json({ success: true, data: null }); return; }
    const org = await store.findSupplierOrgByEmail(user.email);
    res.json({ success: true, data: org });
  }));

  router.post('/', requireRole('seller', 'admin'), validateBody(productSchema), ah(async (req, res) => {
    const barcode = req.body.barcode ?? await store.nextBarcode();
    const product = await store.createProduct({
      ...req.body,
      cost_price: req.body.price,
      fournisseur_id: req.user.role === 'seller' ? req.user.id : req.body.fournisseur_id ?? req.user.id,
      barcode,
    });
    res.status(201).json({ success: true, data: product });
  }));

  router.patch('/:id(\\d+)', requireRole('seller', 'admin'), validateBody(patchProductSchema), ah(async (req, res) => {
    const id = Number(req.params.id);
    const product = await store.getProduct(id);
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }
    if (req.user.role === 'seller' && product.fournisseur_id !== req.user.id) {
      res.status(403).json({ success: false, error: 'You can only edit your own products' });
      return;
    }
    if (req.user.role === 'seller' && 'is_active' in req.body && product.moderation_status !== 'approved') {
      res.status(403).json({ success: false, error: 'You can only toggle visibility after the product is approved' });
      return;
    }
    const fields = ['name', 'price', 'cost_price', 'category', 'retail_category', 'stock', 'sku', 'barcode', 'is_active', 'height', 'length', 'width', 'weight'];
    const prev = product as unknown as Record<string, unknown>;
    const next = req.body as Record<string, unknown>;
    for (const f of fields) {
      if (f in req.body) {
        void store.logProductUpdate(id, f, prev[f], next[f]);
      }
    }
    await store.updateProduct(id, { ...req.body, cost_price: req.body.price ?? product.cost_price });
    const updated = await store.getProduct(id);
    res.json({ success: true, data: updated });
  }));

  router.delete('/:id(\\d+)', requireRole('seller', 'admin'), ah(async (req, res) => {
    const id = Number(req.params.id);
    const product = await store.getProduct(id);
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }
    if (req.user.role === 'seller' && product.fournisseur_id !== req.user.id) {
      res.status(403).json({ success: false, error: 'You can only delete your own products' });
      return;
    }
    await store.deleteProduct(id);
    res.json({ success: true, data: { ok: true } });
  }));

  router.post('/:id(\\d+)/stock', requireRole('seller', 'admin'), validateBody(stockSchema), ah(async (req, res) => {
    const id = Number(req.params.id);
    const product = await store.getProduct(id);
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }
    if (req.user.role === 'seller' && product.fournisseur_id !== req.user.id) {
      res.status(403).json({ success: false, error: 'You can only manage your own products' });
      return;
    }
    void store.logProductUpdate(id, 'stock', product.stock, req.body.stock);
    await store.setStock(id, req.body.stock);
    const updated = await store.getProduct(id);
    res.json({ success: true, data: updated });
  }));

  router.post('/:id(\\d+)/rating', requireRole('customer'), validateBody(ratingSchema), ah(async (req, res) => {
    const id = Number(req.params.id);
    const product = await store.getProduct(id);
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }
    await store.insertRating({ product_id: id, user_id: req.user.id, score: req.body.score, comment: req.body.comment ?? null });
    const agg = await store.getProductRatings(id);
    await store.updateRating(id, agg.avg, agg.count);
    const updated = await store.getProduct(id);
    res.status(201).json({ success: true, data: updated });
  }));

  return router;
}
