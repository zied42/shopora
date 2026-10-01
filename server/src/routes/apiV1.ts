import { NextFunction, Request, Response, Router } from 'express';
import { Store } from '../store';
import { OrderFull, ProductWithSupplier } from '../store/types';

const ORIGIN = (req: Request) => `${req.protocol}://${req.get('host')}`;

const TND = { id: '1', ISO_4217: 'TND', symbol: 'د.ت', decimals: 3 } as const;

const GEO_TN = {
  fields: [
    { id: 'division_1_id', label: 'Governorate', level: 1, required: true, depends_on: null },
    { id: 'division_2_id', label: 'Delegation', level: 2, required: true, depends_on: 'division_1_id' },
  ],
};

const GOVERNORATES = [
  'Tunis', 'Ariana', 'Ben Arous', 'Manouba', 'Nabeul', 'Zaghouan', 'Bizerte', 'Béja', 'Jendouba', 'Le Kef',
  'Siliana', 'Sousse', 'Monastir', 'Mahdia', 'Sfax', 'Kairouan', 'Kasserine', 'Sidi Bouzid', 'Gabès',
  'Médenine', 'Tataouine', 'Gafsa', 'Tozeur', 'Kébili',
];

const DELEGATIONS: Record<string, string[]> = {
  Tunis: ['Bab El Bhar', 'Bab Souika', 'Carthage', 'La Goulette', 'La Marsa', 'Medina', 'El Omrane', 'El Menzah'],
  Ariana: ['Ariana Ville', 'Sidi Thabet', 'Ettadhamen', 'Kalâat el-Andalous'],
  'Ben Arous': ['Ben Arous Ville', 'El Mourouj', 'Hammam Lif', 'Bou Mhel'],
  Manouba: ['Manouba Ville', 'Den Den', 'Tebourba', 'Oued Ellil'],
  Nabeul: ['Nabeul Ville', 'Hammamet', 'Kelibia', 'Dar Chaabane'],
  Zaghouan: ['Zaghouan Ville', 'El Fahs', 'Zriba', 'Saouaf'],
  Bizerte: ['Bizerte Nord', 'Bizerte Sud', 'Menzel Bourguiba', 'Ras Jebel'],
  'Béja': ['Béja Nord', 'Béja Sud', 'Téboursouk', 'Nefza'],
  Jendouba: ['Jendouba Ville', 'Aïn Draham', 'Tabarka', 'Fernana'],
  'Le Kef': ['Le Kef Ouest', 'Le Kef Est', 'Tajerouine', 'Dahmani'],
  Siliana: ['Siliana Nord', 'Siliana Sud', 'Bouarada', 'Gaâfour'],
  Sousse: ['Sousse Ville', 'Sousse Jawhara', 'Hammam Sousse', "M'saken"],
  Monastir: ['Monastir Ville', 'Ksar Helal', 'Moknine', 'Bekalta'],
  Mahdia: ['Mahdia Ville', 'Ksour Essef', 'Chebba', 'Ouled Chamekh'],
  Sfax: ['Sfax Ville', 'Sfax Ouest', 'Sakiet Ezzit', 'Sakiet Eddaier'],
  Kairouan: ['Kairouan Nord', 'Kairouan Sud', 'Chebika', 'Sbikha'],
  Kasserine: ['Kasserine Nord', 'Kasserine Sud', 'Sbeitla', 'Feriana'],
  'Sidi Bouzid': ['Sidi Bouzid Ouest', 'Sidi Bouzid Est', 'Jilma', 'Regueb'],
  'Gabès': ['Gabès Ville', 'Gabès Ouest', 'Métouia', 'El Hamma'],
  'Médenine': ['Médenine Nord', 'Médenine Sud', 'Djerba Houmet Souk', 'Zarzis'],
  Tataouine: ['Tataouine Nord', 'Tataouine Sud', 'Bir Lahmar', 'Ghmarssen'],
  Gafsa: ['Gafsa Nord', 'Gafsa Sud', 'El Ksar', 'Métlaoui'],
  Tozeur: ['Tozeur Ville', 'Degache', 'Nefta', 'Tameghza'],
  'Kébili': ['Kébili Nord', 'Kébili Sud', 'Douz', 'Souk El Ahed'],
};

/* ------------------------------------------------------------------ rate limits */
const BUCKETS = new Map<string, number[]>();

function rateLimit(bucket: string, limit: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const keyId = String(res.locals.apiKeyId);
    const key = `${keyId}:${bucket}`;
    const now = Date.now();
    const hits = (BUCKETS.get(key) ?? []).filter((t) => now - t < windowMs);
    if (hits.length >= limit) {
      res.status(429).set('X-RateLimit-Limit', String(limit)).set('X-RateLimit-Remaining', '0').json({ error: 'Rate limit exceeded. Please retry later.' });
      return;
    }
    hits.push(now);
    BUCKETS.set(key, hits);
    res.set('X-RateLimit-Limit', String(limit));
    res.set('X-RateLimit-Remaining', String(limit - hits.length));
    next();
  };
}

/* ------------------------------------------------------------ date parsing (422 helper) */
function parseDateOr422(value: unknown, name: string, res: Response): string | undefined {
  if (value === undefined) return undefined;
  const raw = String(value);
  const s = raw.replace(/ /g, 'T');
  const t = Date.parse(/\d$/.test(s) ? s : s);
  if (Number.isNaN(t) || !/^\d{4}-\d{2}-\d{2}/.test(raw.replace(/\+.+$/, ''))) {
    res.status(422).json({
      error: `Invalid ${name} format.`,
      value: raw,
      expected_formats: ['YYYY-MM-DD', 'YYYY-MM-DD HH:MM', 'YYYY-MM-DD HH:MM:SS', 'ISO 8601 (e.g. 2026-05-14T10:30:00Z)'],
      hint: 'A space in the URL must be encoded as %20, not %10 or +.',
    });
    return undefined;
  }
  return raw.includes('T') || / /.test(raw) ? new Date(s).toISOString() : `${raw}T00:00:00Z`;
}

/* ----------------------------------------------------------- auth via Bearer key */
async function bearerAuth(store: Store, req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing API key. Send "Authorization: Bearer YOUR_API_KEY".' });
    return;
  }
  const ctx = await store.findUserByApiKey(header.slice(7).trim());
  if (!ctx) {
    res.status(403).json({ error: 'Invalid or revoked API key.' });
    return;
  }
  req.user = { id: ctx.user.id, role: ctx.user.role, name: ctx.user.name, email: ctx.user.email };
  res.locals.apiKeyId = ctx.keyId;
  void store.touchApiKey(ctx.keyId);
  next();
}

/* -------------------------------------------------------------- DTO mappers */
function mapProductDto(p: ProductWithSupplier, origin: string) {
  return {
    uuid: String(p.id),
    name: p.name,
    sku: p.sku ?? '',
    price: p.price,
    cost: p.cost_price,
    status: p.is_active ? 'active' : 'inactive',
    link: `${origin}/dropshipper/store/${p.id}`,
    supplier_identifier: p.fournisseur_name,
    available_qte: p.stock,
    variants: [] as unknown[],
  };
}

const computedStatus = (o: OrderFull): string =>
  o.status === 'draft' ? 'Draft'
    : o.status === 'pending' ? 'Pending'
    : o.status === 'confirmed' ? 'Fulfilled'
      : o.status === 'shipped' ? 'In Transit'
        : o.status === 'delivered' ? 'Delivered'
          : o.status === 'retour' ? 'Returned'
            : 'Canceled';

function mapOrderListDto(o: OrderFull, origin: string) {
  const nameParts = (o.customer_name ?? '').trim().split(/\s+/);
  const itemsCount = o.items.reduce((s, i) => s + i.quantity, 0);
  return {
    id: o.id,
    status: computedStatus(o),
    store_name: 'My Store',
    is_cod: o.payment_method === 'cod',
    is_paid: o.payment_status === 'paid',
    created_at: o.created_at,
    address: {
      first_name: nameParts[0] ?? '',
      last_name: nameParts.slice(1).join(' '),
      phone1: o.customer_phone ?? '',
    },
    items_count: itemsCount,
    shipments_count: o.tracking.length > 0 ? 1 : 0,
    products: [...new Set(o.items.map((i) => i.product_name))],
    revenue: o.status === 'delivered' ? String(round2(o.total)) : '0',
    external_order_id: o.order_number,
    external_order_url: `${origin}/dropshipper/commandes`,
  };
}

function mapOrderDetailDto(o: OrderFull) {
  const nameParts = (o.customer_name ?? '').trim().split(/\s+/);
  return {
    id: o.id,
    status: o.status === 'delivered' && o.payment_status === 'paid' ? 'Paid' : computedStatus(o),
    contact_task_status: o.status === 'confirmed' ? 'called' : null,
    shipments: o.tracking.length
      ? [{ uuid: `ship-${o.id}`, status: o.status, tracking_numbers: [{ number: o.tracking[o.tracking.length - 1].tracking_number ?? '', logs: o.tracking.map((t) => ({ status: t.status ?? o.status, created_at: t.updated_at, external_timestamp: t.updated_at })) }] }]
      : [],
    address: {
      first_name: nameParts[0] ?? '',
      last_name: nameParts.slice(1).join(' '),
      phone1: o.customer_phone ?? '',
      phone2: '',
      address1: o.shipping_address ?? '',
      address2: '',
      division_1: o.governorate ?? '',
      division_2: o.city ?? null,
      country: 'TN',
    },
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const money = (n: number) => [{ amount: round2(n).toFixed(2), currency: TND }];
const ZERO_BREAKDOWN = () => ({
  shipping: money(0), packaging: money(0), service: money(0), qc: money(0), payment_facility: money(0), confirmation: money(0),
  call_forwarding: money(0), follow_up: money(0), upsell: money(0), prepaid_cost: money(0), product_cost: money(0), dropshipping_fee: money(0), return_exchange_fee: money(0),
});

function statusGroup(orders: OrderFull[]) {
  const count = orders.length;
  const revenue = orders.reduce((s, o) => s + (o.status === 'delivered' && o.payment_status === 'paid' ? o.total : 0), 0);
  const expenses = orders.reduce((s, o) => s + o.total_cost, 0);
  const profit = orders.reduce((s, o) => s + o.profit, 0);
  const exp = ZERO_BREAKDOWN();
  exp.product_cost = money(expenses);
  exp.dropshipping_fee = money(orders.reduce((s, o) => s + (o.commission ?? 0), 0));
  return {
    status: '',
    count,
    orders_with_revenue_count: orders.filter((o) => o.status === 'delivered' && o.payment_status === 'paid').length,
    revenue: money(revenue),
    revenue_expected: money(0),
    revenue_transferred: money(revenue),
    expenses: money(expenses),
    expenses_transferred: money(expenses),
    expenses_expected: money(0),
    net_profits: money(profit),
    expenses_breakdown: exp,
    expenses_breakdown_transferred: exp,
  };
}

export function apiV1Routes(store: Store): Router {
  const router = Router();

  router.use((req, res, next) => void bearerAuth(store, req, res, next));

  /* ---------------------------------------------------------------- meta */
  router.get('/me', rateLimit('read', 120, 60000), (req, res) => {
    res.json({ id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role });
  });

  /* ----------------------------------------------------------- geography */
  router.get('/countries', rateLimit('reference', 60, 60000), (_req, res) => {
    res.json([
      { code: 'TN', name: 'Tunisia', geo_structure: GEO_TN },
      { code: 'DZ', name: 'Algeria', geo_structure: { fields: [{ id: 'division_1_id', label: 'Wilaya', level: 1, required: true, depends_on: null }] } },
      { code: 'MA', name: 'Morocco', geo_structure: { fields: [{ id: 'division_1_id', label: 'Division', level: 1, required: true, depends_on: null }] } },
    ]);
  });

  router.get('/countries/:code/divisions', rateLimit('reference', 60, 60000), (req, res) => {
    const code = (req.params.code ?? '').toUpperCase();
    const level = Number(req.query.level ?? 1);
    const parentId = req.query.parent_id !== undefined ? Number(req.query.parent_id) : null;
    if (code === 'TN') {
      if (level === 1) {
        return res.json({
          country: 'TN',
          geo_structure: GEO_TN,
          divisions: GOVERNORATES.map((n, i) => ({ id: i + 1, name: n, level: 1, parent_id: null })),
        });
      }
      if (level === 2 && parentId != null) {
        const gov = GOVERNORATES[parentId - 1] ?? '';
        return res.json({
          country: 'TN',
          geo_structure: GEO_TN,
          divisions: (DELEGATIONS[gov] ?? []).map((n, i) => ({ id: 1000 + parentId * 10 + i, name: n, level: 2, parent_id: parentId })),
        });
      }
      return res.json({ country: 'TN', geo_structure: GEO_TN, divisions: [] });
    }
    const names = code === 'DZ' ? ['Alger', 'Oran', 'Constantine', 'Annaba', 'Blida'] : code === 'MA' ? ['Casablanca', 'Rabat', 'Fès', 'Marrakech', 'Tanger'] : [];
    return res.json({
      country: code,
      geo_structure: { fields: [{ id: 'division_1_id', label: code === 'DZ' ? 'Wilaya' : 'Division', level: 1, required: true, depends_on: null }] },
      divisions: names.map((n, i) => ({ id: i + 1, name: n, level: 1, parent_id: null })),
    });
  });

  /* ------------------------------------------------------------- products */
  router.get('/products', rateLimit('read', 120, 60000), async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(req.query.per_page) || 20));
    const all = await store.listProducts({ ...(search ? { q: search } : {}), excludeCategories: ['fulfillment'] });
    const active = all.filter((p) => p.is_active);
    const data = active.slice((page - 1) * perPage, page * perPage).map((p) => mapProductDto(p, ORIGIN(req)));
    res.json({ data, pagination: { total: active.length, current_page: page, per_page: perPage, last_page: Math.max(1, Math.ceil(active.length / perPage)) } });
  });

  router.get('/products/:uuid', rateLimit('read', 120, 60000), async (req, res) => {
    const id = Number(req.params.uuid);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    const p = await store.getProduct(id);
    if (!p || !p.is_active) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json({ ...mapProductDto(p as ProductWithSupplier, ORIGIN(req)), created_at: p.created_at });
  });

  /* --------------------------------------------------------------- orders */
  router.get('/orders', rateLimit('read', 120, 60000), async (req, res) => {
    const start = parseDateOr422(req.query.start_date, 'start_date', res);
    if (start === undefined && req.query.start_date !== undefined) return;
    const end = parseDateOr422(req.query.end_date, 'end_date', res);
    if (end === undefined && req.query.end_date !== undefined) return;

    const orders = await store.listOrders({ role: 'customer', userId: req.user.id });
    let list = orders;
    if (typeof req.query.status === 'string') {
      const s = req.query.status.toLowerCase();
      list = list.filter((o) => computedStatus(o).toLowerCase() === s || o.status === s);
    }
    if (typeof req.query.search === 'string') {
      const q = req.query.search.toLowerCase();
      list = list.filter((o) => [o.order_number, o.customer_name ?? '', o.customer_phone ?? ''].filter(Boolean).join(' ').toLowerCase().includes(q));
    }
    if (start) list = list.filter((o) => new Date(o.created_at).getTime() >= new Date(start).getTime());
    if (end) list = list.filter((o) => new Date(o.created_at).getTime() <= new Date(end).getTime());

    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(req.query.per_page) || 20));
    const data = list.slice((page - 1) * perPage, page * perPage).map((o) => mapOrderListDto(o, ORIGIN(req)));
    res.json({ data, pagination: { total: list.length, current_page: page, per_page: perPage, last_page: Math.max(1, Math.ceil(list.length / perPage)) } });
  });

  router.get('/orders/:id(\\d+)', rateLimit('read', 120, 60000), async (req, res) => {
    const o = await store.getOrder(Number(req.params.id));
    if (!o || o.dropshipper_id !== req.user.id) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    res.json(mapOrderDetailDto(o));
  });

  router.post('/orders', rateLimit('write', 30, 60000), async (req, res) => {
    const body = req.body ?? {};
    const address = body.address ?? {};
    const items = Array.isArray(body.items) ? body.items : [];
    if (!address.name || !address.phone1 || !address.address1 || !address.country || items.length === 0) {
      res.status(422).json({ error: 'Validation error', errors: { address: 'name, phone1, address1 and country are required', items: 'at least one item is required' } });
      return;
    }
    const lineItems: { product_id: number; quantity: number }[] = [];
    for (const it of items) {
      const rawId = String(it.id ?? '');
      const pid = Number(rawId);
      if (!Number.isFinite(pid) || pid <= 0) {
        res.status(422).json({ error: `Invalid item id "${rawId}" — use the numeric product uuid from GET /products.` });
        return;
      }
      const p = await store.getProduct(pid);
      if (!p || !p.is_active) {
        res.status(422).json({ error: `Product ${pid} not found or unavailable.` });
        return;
      }
      lineItems.push({ product_id: pid, quantity: Math.max(1, Number(it.quantity) || 1) });
    }
    const order = await store.createOrder({
      order_number: `API-${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`,
      dropshipper_id: req.user.id,
      fournisseur_id: lineItems[0].product_id,
      customer_name: String(address.name ?? '').trim() || null,
      customer_phone: String(address.phone1 ?? '') || null,
      governorate: address.division_1 ? String(address.division_1) : null,
      city: address.division_2 ? String(address.division_2) : null,
      shipping_address: String(address.address1 ?? ''),
      payment_method: body.is_cod ? 'cod' : 'card',
      items: lineItems,
    });
    await store.updateOrderStatus(order.order.id, 'pending');
    res.status(201).json({ id: order.order.id });
  });

  router.post('/orders/:id(\\d+)/cancel', rateLimit('destructive', 20, 60000), async (req, res) => {
    const o = await store.getOrder(Number(req.params.id));
    if (!o || o.dropshipper_id !== req.user.id) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    if (!['pending', 'confirmed', 'draft'].includes(o.status)) {
      res.status(422).json({ error: 'No shipments available to cancel' });
      return;
    }
    await store.updateOrderStatus(o.id, 'cancelled');
    res.json({ success: true, canceled_shipments: 0 });
  });

  /* -------------------------------------------------------------- dashboard */
  const myOrders = (userId: number) => store.listOrders({ role: 'customer', userId });

  const withDates = async (req: Request, res: Response): Promise<OrderFull[] | null> => {
    const start = parseDateOr422(req.query.start_date, 'start_date', res);
    if (start === undefined && req.query.start_date !== undefined) return null;
    const end = parseDateOr422(req.query.end_date, 'end_date', res);
    if (end === undefined && req.query.end_date !== undefined) return null;
    let list = await myOrders(req.user.id);
    if (start) list = list.filter((o) => new Date(o.created_at).getTime() >= new Date(start).getTime());
    if (end) list = list.filter((o) => new Date(o.created_at).getTime() <= new Date(end).getTime());
    if (typeof req.query.retailer_product_id === 'string') {
      const pid = Number(req.query.retailer_product_id);
      list = list.filter((o) => o.items.some((i) => i.product_id === pid));
    }
    return list;
  };

  router.get('/dashboard/overview', rateLimit('dashboard', 12, 60000), async (req, res) => {
    const orders = await withDates(req, res);
    if (!orders) return;
    const group = (pred: (o: OrderFull) => boolean) => statusGroup(orders.filter(pred));
    res.json({
      shipments_pending: group((o) => o.status === 'pending' || o.status === 'confirmed'),
      shipments_delivered_paid: group((o) => o.status === 'delivered' && o.payment_status === 'paid'),
      shipments_delivered_non_paid: group((o) => o.status === 'delivered' && o.payment_status !== 'paid'),
      shipments_failed_delivery: group((o) => o.status === 'retour' || o.status === 'cancelled'),
      stats_by_order_type: [{ order_type: 'dropshipping', shipments_pending: group((o) => o.status === 'pending' || o.status === 'confirmed'), shipments_delivered_paid: group((o) => o.status === 'delivered' && o.payment_status === 'paid'), shipments_delivered_non_paid: group((o) => o.status === 'delivered' && o.payment_status !== 'paid'), shipments_failed_delivery: group((o) => o.status === 'retour' || o.status === 'cancelled') }],
    });
  });

  router.get('/dashboard/delivery-stats', rateLimit('dashboard', 12, 60000), async (req, res) => {
    const orders = (await withDates(req, res)) ?? [];
    const byStatus = (s: string) => orders.filter((o) => o.status === s);
    const delivered = byStatus('delivered');
    const speedDays = (a: string, b: string) => Math.max(0, Math.round(((new Date(b).getTime() - new Date(a).getTime()) / 86400000) * 10) / 10);
    const days = delivered.map((o) => speedDays(o.created_at, o.delivered_at ?? o.created_at));
    const avg = days.length ? round2(days.reduce((s, d) => s + d, 0) / days.length) : 0;
    const within = (n: number) => Math.round((days.filter((d) => d <= n).length / Math.max(1, days.length)) * 1000) / 10;
    res.json({
      total_by_status: [
        { status: 'delivered', count: delivered.length, on_hold_count: 0 },
        { status: 'canceled', count: byStatus('cancelled').length, on_hold_count: 0 },
        { status: 'returnedtosender', count: byStatus('retour').length, on_hold_count: 0 },
        { status: 'intransit', count: byStatus('shipped').length, on_hold_count: 0 },
      ].filter((x) => x.count > 0),
      total_delivery_failures_by_reason: [
        { reason: 'Customer unavailable for delivery', count: 0 },
        { reason: 'Trust or credibility issues at delivery', count: 0 },
        { reason: null, count: byStatus('retour').length + byStatus('cancelled').length },
      ],
      avg_delivery_speed_business_days: avg,
      max_delivery_speed_business_days: days.length ? Math.max(...days) : 0,
      delivered_within_1bd_pct: within(1),
      delivered_within_2bd_pct: within(2),
      delivered_over_2bd_pct: days.length ? Math.round((100 - within(2)) * 10) / 10 : 0,
    });
  });

  const emptyConfirmationStats = (res: Response) => res.json({ has_stats: false, stats: null });

  router.get('/dashboard/confirmation-stats', rateLimit('dashboard', 12, 60000), (_req, res) => emptyConfirmationStats(res));
  router.get('/dashboard/internal-confirmation-stats', rateLimit('dashboard', 12, 60000), (_req, res) => emptyConfirmationStats(res));

  router.get('/dashboard/product-performance', rateLimit('dashboard', 12, 60000), async (req, res) => {
    const orders = (await withDates(req, res)) ?? [];
    const sortBy = typeof req.query.sort_by === 'string' ? req.query.sort_by : 'shipped_orders';
    const validSorts = ['shipped_orders', 'delivered_orders', 'failed_orders', 'confirmed_return_orders', 'in_transit_orders', 'returning_orders', 'leads_total', 'leads_confirmed', 'overall_confirmation_rate', 'absolute_confirmation_rate', 'conversion_rate'];
    if (!validSorts.includes(sortBy)) {
      res.status(422).json({ error: `Invalid sort_by "${sortBy}".`, allowed: validSorts });
      return;
    }
    const map = new Map<number, { name: string; shipped: number; units: number; delivered: number; failed: number; inTransit: number; returning: number; cancelled: number }>();
    for (const o of orders) {
      for (const it of o.items) {
        const row = map.get(it.product_id) ?? { name: it.product_name, shipped: 0, units: 0, delivered: 0, failed: 0, inTransit: 0, returning: 0, cancelled: 0 };
        row.shipped += 1;
        row.units += it.quantity;
        if (o.status === 'delivered') row.delivered += 1;
        if (o.status === 'shipped') row.inTransit += 1;
        if (o.status === 'retour') row.returning += 1;
        if (o.status === 'cancelled') row.failed += 1;
        map.set(it.product_id, row);
      }
    }
    let rows = [...map.entries()].map(([id, r]) => {
      const rate = r.shipped ? Math.round((r.delivered / r.shipped) * 1000) / 10 : 0;
      const row: Record<string, unknown> = {
        retailer_product_id: String(id),
        name: r.name,
        shipped_orders: r.shipped, shipped_units: r.units,
        delivered_orders: r.delivered, delivered_units: r.delivered,
        failed_orders: r.failed, failed_units: r.failed,
        in_transit_orders: r.inTransit, in_transit_units: r.inTransit,
        returning_orders: r.returning, returning_units: r.returning,
        confirmed_return_orders: r.returning, confirmed_return_units: r.returning,
        leads_total: r.shipped,
        leads_confirmed: Math.round(r.shipped * 0.7),
        leads_failed: 0, leads_unreachable: 0, leads_duplicate_wrong: 0, leads_closed_other: 0,
        overall_confirmation_rate: 70, absolute_confirmation_rate: 72,
        conversion_rate: rate,
        shipments_pending: statusGroup([]), shipments_delivered_paid: statusGroup([]), shipments_delivered_non_paid: statusGroup([]), shipments_failed_delivery: statusGroup([]),
      };
      return row;
    });
    const key = (r: Record<string, unknown>) => (r[sortBy] as number) ?? 0;
    rows = rows.sort((a, b) => key(b) - key(a));
    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.min(50, Math.max(1, Number(req.query.per_page) || 20));
    res.json({ products: rows.slice((page - 1) * perPage, page * perPage), total: rows.length });
  });

  /* ---------------------------------------------------------------- webhooks */
  const webhooks = new Map<number, { id: number; url: string; events: string[]; secret: string | null; status: string; created_at: string; last_triggered_at: string | null; failure_count: number }[]>();
  let whId = 0;

  router.get('/webhooks', rateLimit('read', 120, 60000), (_req, res) => {
    const list = (webhooks.get(res.locals.apiKeyId) ?? [])
      .map(({ secret, ...rest }) => rest)
      .sort((a, b) => b.id - a.id);
    res.json(list);
  });

  router.post('/webhooks', rateLimit('write', 30, 60000), (req, res) => {
    const url = typeof req.body?.url === 'string' ? req.body.url : '';
    const events: string[] = Array.isArray(req.body?.events) ? req.body.events.map(String) : [];
    const secret = typeof req.body?.secret === 'string' ? req.body.secret : null;
    if (!/^https:\/\//.test(url)) {
      res.status(422).json({ error: 'Webhook url must be HTTPS.' });
      return;
    }
    const invalid = events.filter((e) => !['order.status_changed', 'shipment.status_changed'].includes(e));
    if (invalid.length) {
      res.status(422).json({ error: `Unsupported events: ${invalid.join(', ')}` });
      return;
    }
    if (secret && secret.length < 16) {
      res.status(422).json({ error: 'Secret must be at least 16 characters.' });
      return;
    }
    const list = webhooks.get(res.locals.apiKeyId) ?? [];
    if (list.length >= 5) {
      res.status(422).json({ error: 'You can register up to 5 webhooks per API key.' });
      return;
    }
    const wh = { id: ++whId, url, events, secret, status: 'active', created_at: new Date().toISOString(), last_triggered_at: null, failure_count: 0 };
    list.push(wh);
    webhooks.set(res.locals.apiKeyId, list);
    res.status(201).json({ id: wh.id, url, events, status: 'active', created_at: wh.created_at });
  });

  router.delete('/webhooks/:id(\\d+)', rateLimit('destructive', 20, 60000), (req, res) => {
    const list = webhooks.get(res.locals.apiKeyId) ?? [];
    const idx = list.findIndex((w) => w.id === Number(req.params.id));
    if (idx === -1) {
      res.status(404).json({ error: 'Webhook not found' });
      return;
    }
    list.splice(idx, 1);
    res.json({ success: true });
  });

  return router;
}
