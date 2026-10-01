import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { z } from 'zod';
import { ah, requireAuth, requireRole, signToken } from '../middleware/auth';
import { validateBody } from '../middleware/error';
import { Store } from '../store';
import { ExchangeDeliveryStatus, OrderItem, PackingBinType, ProductCategory, ProductWithSupplier, ReturnApprovalStatus, ReturnDeliveryStatus, SellerOrganizationsQuery } from '../store/types';
import { inferShipmentZone } from '../store/shipmentZones';
import { buildChefTickets, createChefTicket, updateChefTicket } from '../data/chefTickets';
import { buildShipments } from '../data/shipments';
import { buildShipmentDetail } from '../data/shipmentDetail';
import { logStaffActivity } from '../lib/staffActivity';
import { randomUUID } from 'crypto';
import { env } from '../config/env';
import { flouciGeneratePayment } from '../services/flouci';

import { buildTransferShipments } from '../data/transferShipments';
import { buildPickupRequests } from '../data/pickupRequests';
import { buildTransactions } from '../data/transactions';
import { buildReconciliationReviews } from '../data/reconciliationReviews';
import { SupplierOrganizationsQuery } from '../data/supplierOrganizations';
import { getBinsCatalog, searchBinsInventories, BinsInventoryQuery } from '../data/binsInventory';
import { getLeadsOptions, LeadsQuery, searchLeads } from '../data/leads';
import { PACKING_BIN_TYPES } from '../data/packingBins';
import { FindProductsQuery, getFindProductDetail, searchFindProducts } from '../data/findProducts';
import { searchSellerNotifications } from '../data/notificationHistory';
import { searchProductSubscriptions, SubscriptionsQuery } from '../data/productSubscriptions';

function splitArr(v: unknown): string[] {
  if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean);
  if (Array.isArray(v)) return v.flatMap((x) => splitArr(x));
  return [];
}

const payoutSchema = z.object({
  recipient_id: z.number().int().positive(),
  recipient_role: z.enum(['seller', 'customer']),
  amount: z.number().positive('Amount must be positive'),
  period: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  method: z.enum(['manual', 'flouci', 'bank', 'd17']).optional(),
});

const statusSchema = z.object({ status: z.enum(['pending', 'paid', 'cancelled']) });

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

const supplierFlagsPatchSchema = z.object({
  account_status: z.enum(['active', 'registration_uncompleted', 'inactive']).optional(),
  allow_marketplace: z.boolean().optional(),
  dropshipping_eligible: z.boolean().optional(),
  account_manager: z.string().trim().max(100).nullable().optional(),
  business_developer: z.string().trim().max(100).nullable().optional(),
  doc_files: z.record(z.string()).optional(),
  doc_statuses: z.record(z.string()).optional(),
});

const subscriptionPatchSchema = z.object({
  price: z.number().min(0).nullable().optional(),
  cost: z.number().min(0).nullable().optional(),
  profit_fee: z.number().min(0).nullable().optional(),
  allow_when_oos: z.boolean().optional(),
  price_constraint: z.boolean().optional(),
});

const collectionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(500).optional().nullable(),
  is_active: z.boolean().optional(),
  marketplace_sort_rank: z.number().int().min(0).max(100000).nullable().optional(),
  product_ids: z.array(z.number().int().positive()).optional(),
});

const scanSchema = z.object({
  code: z.string().min(1, 'Scan a commande code'),
  action: z.enum(['confirm', 'shipping', 'retour']),
});

const RETURN_DELIVERY_LABELS: Record<ReturnDeliveryStatus, string> = {
  awaiting_arrival: 'Awaiting products arrival to fulfillment center',
  packed: 'Packed',
  ready_for_pickup: 'Ready for pickup',
  picked_up: 'Picked Up',
  on_its_way: 'On its way',
  delivered: 'Delivered',
  returning_to_sender: 'Returning to sender',
  returned_to_sender: 'Returned to sender',
  return_delivered: 'Return delivered',
  canceled: 'Canceled',
};

function retDeliveryLabel(s: ReturnDeliveryStatus | null | undefined): string {
  return s ? RETURN_DELIVERY_LABELS[s] : 'Awaiting products arrival to fulfillment center';
}

const EXCHANGE_DELIVERY_LABELS: Record<ExchangeDeliveryStatus, string> = {
  awaiting_packaging: 'Awaiting packaging',
  packed: 'Packed',
  ready_for_pickup: 'Ready for pickup',
  picked_up: 'Picked Up',
  on_its_way: 'On its way',
  at_carrier_facility: 'At carrier facility',
  delivered: 'Delivered',
  returning_to_sender: 'Returning to sender',
  returned_to_sender: 'Returned to sender',
  canceled: 'Canceled',
};

function exchLabel(s: ExchangeDeliveryStatus | null | undefined): string {
  return s ? EXCHANGE_DELIVERY_LABELS[s] : '—';
}

/* ═══════════════ real supplier (fournisseur) products ═══════════════ */

type ChefSPStatus = 'Active' | 'In Review' | 'Declined' | 'Inactive';

function spStatus(m: string | undefined): ChefSPStatus {
  switch (m) {
    case 'approved': return 'Active';
    case 'refused': return 'Declined';
    default: return 'In Review';
  }
}

function isHidden(p: Pick<ProductWithSupplier, 'is_active' | 'moderation_status'>): boolean {
  return !p.is_active || p.moderation_status === 'hidden';
}

function offerKeys(cat: ProductCategory | undefined, offers: ProductCategory[] | undefined): ProductCategory[] {
  const arr: ProductCategory[] = offers && offers.length ? offers : (cat ? [cat] : ['dropshipping']);
  return [...new Set(arr)];
}

function pImg(p: ProductWithSupplier): string | null {
  return p.images && p.images.length ? p.images[0] : (p.image_url ?? null);
}

export function mapSupplierRow(p: ProductWithSupplier) {
  return {
    id: p.id,
    gid: String(p.id).padStart(5, '0'),
    name: p.name,
    emoji: '',
    image_url: pImg(p),
    visible: !isHidden(p),
    offer_type: offerKeys(p.category, p.offers),
    status: spStatus(p.moderation_status),
    shipping: p.is_active ? 'Can be shipped' : 'Cannot ship',
    product_labels: [] as string[],
    collection_ids: [] as number[],
    supplier_id: p.fournisseur_id,
    supplier_name: p.fournisseur_name,
    supplier_labels: [] as string[],
    created_at: p.created_at,
  };
}

function mapSupplierDetail(p: ProductWithSupplier) {
  const images = p.images && p.images.length ? p.images.slice() : (p.image_url ? [p.image_url] : []);
  const videos = p.videos && p.videos.length ? p.videos.slice() : (p.video_url ? [p.video_url] : []);
  let wholesale: { min: number; max: number } | null = null;
  if (p.wholesale_tiers && p.wholesale_tiers.length) {
    const prices = p.wholesale_tiers.map((t) => Number(t.price)).filter(Number.isFinite);
    if (prices.length) wholesale = { min: Math.min(...prices), max: Math.max(...prices) };
  }
  const declined = spStatus(p.moderation_status) === 'Declined';
  return {
    id: p.id,
    gid: String(p.id).padStart(5, '0'),
    name: p.name,
    emoji: '',
    image_url: images[0] ?? null,
    video_url: videos[0] ?? null,
    images,
    videos,
    visible: !isHidden(p),
    offer_type: offerKeys(p.category, p.offers),
    status: spStatus(p.moderation_status),
    shipping: p.is_active ? 'Can be shipped' : 'Cannot ship',
    product_labels: [] as string[],
    collection_ids: [] as number[],
    supplier_id: p.fournisseur_id,
    supplier_name: p.fournisseur_name,
    supplier_labels: [] as string[],
    created_at: p.created_at,
    offer_types: (p.offers && p.offers.length ? p.offers : [p.category]) as ProductCategory[],
    description: p.description ?? null,
    marketplace_price: Number(p.price),
    supplier_price: Number(p.cost_price),
    product_value: p.cost_price != null ? Number(p.cost_price) : null,
    wholesale,
    categories: p.retail_category ? p.retail_category.split(/[,;]/).map((s) => s.trim()).filter(Boolean) : [] as string[],
    platform_commission_pct: 3,
    tags: p.keywords ?? [] as string[],
    fulfillers: [] as { name: string; warehouse: string; quantity: number }[],
    weight_g: Number(p.weight ?? 0),
    length_mm: Number(p.length ?? 0),
    width_mm: Number(p.width ?? 0),
    height_mm: Number(p.height ?? 0),
    vat_pct: 19,
    media_count: Math.max(images.length, videos.length),
    real_video: videos.length > 0,
    real_image: images.length > 0,
    updated_at: p.created_at,
    activated_at: spStatus(p.moderation_status) === 'Active' ? p.created_at : null,
    activated_by: spStatus(p.moderation_status) === 'Active' ? p.fournisseur_name : null,
    decline_reasons: declined ? [{ reason: p.moderation_note ?? 'Product declined', note: p.moderation_note ?? null }] : null,
    variations: [] as { emoji: string; variant: string; stock: number; price: number; vat_pct: number; weight_g: number; dimensions: string; recommended_selling_price: number }[],
    service_user_score: 0,
    recommended_selling_price: Number(p.price),
    stock: { warehouses: [] as { name: string; brought: number; in_orders: number; in_warehouse: number }[], movements: [] as { direction: 'in' | 'out'; warehouse: string; label: string; qty: number; at: string }[] },
  };
}

export function chefRoutes(store: Store): Router {
  const router = Router();
  router.use(requireAuth, requireRole('admin'));

  router.get('/tickets', ah(async (req, res) => {
    const me = req.user?.id ? await store.findUserById(req.user.id) : null;
    const all = await buildChefTickets(me?.name || '');
    res.json({ success: true, data: { tickets: all.tickets, stats: all.stats } });
  }));

  router.patch('/tickets/:id(\\d+)', validateBody(z.object({
    status: z.enum(['resolved', 'unresolved']).optional(),
    priority: z.enum(['urgent', 'high', 'medium']).optional(),
  })), ah(async (req, res) => {
    const updated = await updateChefTicket(Number(req.params.id), req.body);
    if (!updated) { res.status(404).json({ success: false, error: 'Ticket not found' }); return; }
    res.json({ success: true, data: updated });
  }));

  router.post('/tickets', validateBody(z.object({
    author_name: z.string().min(1),
    owner_names: z.array(z.string()).default([]),
    subject: z.string().min(1),
    description: z.string().default(''),
    department: z.string().default('All'),
    priority: z.enum(['urgent', 'high', 'medium']).default('medium'),
    related_to: z.string().nullable().default(null),
  })), ah(async (req, res) => {
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

  router.get('/shipments', ah(async (_req, res) => {
    const rows = await store.listChefShipments();
    const shipments = rows.map((r) => ({
      id: r.id,
      gid: String(r.id).padStart(8, '0'),
      order_type: r.order_type,
      account_incubators: [] as string[],
      account_managers: [] as string[],
      business_developers: [] as string[],
      retailer_name: r.dropshipper_name ?? r.customer_name ?? '—',
      retailer_phone: r.dropshipper_phone ?? r.customer_phone ?? null,
      suppliers: r.fournisseur_name ? [r.fournisseur_name] : [],
      fulfiller: r.fulfiller,
      warehouse: r.warehouse,
      created_at: r.created_at,
      updated_at: r.shipped_at ?? r.created_at,
      fullfillable_at: null as string | null,
      prepared_at: null as string | null,
      picked_up_at: r.shipped_at,
      first_carrier_attempt_at: null as string | null,
      last_carrier_attempt_at: null as string | null,
      delivery_issue_resolved_at: null as string | null,
      delivery_issue_reason: null as string | null,
      attempt_count: r.status === 'retour' ? 1 : r.status === 'delivered' ? 1 : 0,
      delivered_at: r.delivered_at,
      last_carrier_update_at: r.shipped_at ?? r.created_at,
      expected_shipping_date_from: null as string | null,
      expected_shipping_date_to: null as string | null,
      expected_delivery_date_from: null as string | null,
      expected_delivery_date_to: null as string | null,
      delivery_verified_at: r.delivered_at,
      delivery_verified_by: r.delivered_at ? 'Chef Fulfilment' : null,
      marked_delivered_post_verification: false,
      carrier_refunded: false,
      client_refunded: r.status === 'retour',
      cod_settlement_status: r.status === 'delivered' ? 'Settled' : null,
      cod_settlement_at: r.delivered_at,
      receivables_status: null as string | null,
      carrier_cod_payment_amount: null as number | null,
      carrier_cod_payment_status: null as string | null,
      address: [r.city, r.governorate].filter(Boolean).join(', ') || null,
      status: r.status === 'shipped' ? 'Shipped' : r.status === 'delivered' ? 'Delivered' : r.status === 'retour' ? 'Delivery Issue' : r.status,
      status_icon: (r.status === 'shipped' ? 'truck' : r.status === 'retour' ? 'clock' : 'dropbox') as 'clock' | 'truck' | 'dropbox',
      status_detail: r.status === 'shipped' ? 'In transit to destination' : r.status === 'delivered' ? 'Delivered successfully' : 'Delivery issue reported',
      customer_name: r.customer_name,
      customer_call: false,
      tracking_numbers: r.tracking.map((t) => t.tracking_number).filter(Boolean) as string[],
      product_name: r.product_name,
      product_variation: r.product_variation,
      quantity: r.quantity,
      image_url: r.image_url,
      cost: r.total_cost,
      cod_amount: r.total,
    }));
    res.json({ success: true, data: { shipments } });
  }));

  router.get('/shipments/:id', ah(async (req, res) => {
    const r = await store.getChefShipment(Number(req.params.id));
    if (!r) {
      res.status(404).json({ success: false, message: 'Shipment not found' });
      return;
    }
    const shipment = {
      id: r.id,
      gid: String(r.id).padStart(8, '0'),
      order_type: r.order_type,
      account_incubators: [] as string[],
      account_managers: [] as string[],
      business_developers: [] as string[],
      retailer_name: r.dropshipper_name ?? r.customer_name ?? '—',
      retailer_phone: r.dropshipper_phone ?? r.customer_phone ?? null,
      suppliers: r.fournisseur_name ? [r.fournisseur_name] : [],
      fulfiller: r.fulfiller,
      warehouse: r.warehouse,
      created_at: r.created_at,
      updated_at: r.shipped_at ?? r.created_at,
      fullfillable_at: null as string | null,
      prepared_at: null as string | null,
      picked_up_at: r.shipped_at,
      first_carrier_attempt_at: null as string | null,
      last_carrier_attempt_at: null as string | null,
      delivery_issue_resolved_at: null as string | null,
      delivery_issue_reason: null as string | null,
      attempt_count: r.status === 'retour' ? 1 : r.status === 'delivered' ? 1 : 0,
      delivered_at: r.delivered_at,
      last_carrier_update_at: r.shipped_at ?? r.created_at,
      expected_shipping_date_from: null as string | null,
      expected_shipping_date_to: null as string | null,
      expected_delivery_date_from: null as string | null,
      expected_delivery_date_to: null as string | null,
      delivery_verified_at: r.delivered_at,
      delivery_verified_by: r.delivered_at ? 'Chef Fulfilment' : null,
      marked_delivered_post_verification: false,
      carrier_refunded: false,
      client_refunded: r.status === 'retour',
      cod_settlement_status: r.status === 'delivered' ? 'Settled' : null,
      cod_settlement_at: r.delivered_at,
      receivables_status: null as string | null,
      carrier_cod_payment_amount: null as number | null,
      carrier_cod_payment_status: null as string | null,
      address: [r.city, r.governorate].filter(Boolean).join(', ') || null,
      status: r.status === 'shipped' ? 'Shipped' : r.status === 'delivered' ? 'Delivered' : r.status === 'retour' ? 'Delivery Issue' : r.status,
      status_icon: (r.status === 'shipped' ? 'truck' : r.status === 'retour' ? 'clock' : 'dropbox') as 'clock' | 'truck' | 'dropbox',
      status_detail: r.status === 'shipped' ? 'In transit to destination' : r.status === 'delivered' ? 'Delivered successfully' : 'Delivery issue reported',
      customer_name: r.customer_name,
      customer_phone: r.customer_phone,
      customer_phone_full: r.customer_phone,
      customer_call: false,
      tracking_numbers: r.tracking.map((t) => t.tracking_number).filter(Boolean) as string[],
      product_name: r.product_name,
      product_variation: r.product_variation,
      quantity: r.quantity,
      image_url: r.image_url,
      cost: r.total_cost,
      cod_amount: r.total,
      confirmed_by: null as string | null,
      fulfilled_by: null as string | null,
      fulfilled_at: r.delivered_at,
      carrier_name: r.tracking[0]?.carrier ?? null,
      tracking_number: r.tracking[0]?.tracking_number ?? null,
      timeline: [
        r.created_at && { id: 1, key: 'created', title: 'Commande created', completed: true, at: r.created_at },
        r.shipped_at && { id: 2, key: 'shipped', title: 'Shipped', completed: true, at: r.shipped_at },
        r.delivered_at && { id: 3, key: 'delivered', title: 'Delivered', completed: true, at: r.delivered_at },
        r.returned_at && { id: 4, key: 'returned', title: 'Returned', completed: true, at: r.returned_at },
      ].filter(Boolean) as Array<{ id: number; key: string; title: string; completed: boolean; at: string }>,
    };
    res.json({ success: true, data: { shipment } });
  }));

  router.get('/returns', ah(async (_req, res) => {
    const rows = await store.listReturnRequests({ role: 'admin', userId: 0 });
    const existingOrderIds = new Set(rows.map((r) => r.order_id));
    const orderProducts = await store.getReturnOrderProducts(rows.map((r) => r.order_id));
    const retourOrders = await store.listRetourOrdersForChef(existingOrderIds);
    const returns = [
      ...rows.map((r) => {
        const products = (orderProducts.get(r.order_id) ?? []).map((p) => ({ name: p.product_name, variation: '', quantity: p.quantity }));
        if (products.length === 0 && r.product_name) {
          products.push({ name: r.product_name, variation: r.product_variation ?? '', quantity: r.product_qty ?? 1 });
        }
        return {
          id: r.id,
          gid: String(r.id).padStart(4, '0'),
          created_by: r.created_by,
          type: r.type === 'echange' ? 'replacement' as const : 'product_return' as const,
          retailer_name: r.retailer_name ?? r.dropshipper_name ?? '—',
          retailer_code: r.retailer_code ?? '—',
          retailer_premium: r.retailer_premium,
          address: r.return_address ?? '—',
          destination_warehouse: inferShipmentZone(r.governorate, r.city),
          products,
          approval_status: r.approval_status ?? 'waiting' as const,
          exchange_delivery_status: (r.exchange_delivery_status as ExchangeDeliveryStatus | null) ?? null,
          exchange_shipment_id: r.exchange_shipment_id,
          return_delivery_status: r.return_delivery_status ?? 'awaiting_arrival' as const,
          delivery_type: r.delivery_type ?? 'Self Delivery',
          process_type: r.process_type ?? (r.type === 'echange' ? 'SWAP & RETURN' : 'DIRECT RETURN'),
          carrier: r.carrier ?? '—',
          dispute_status: r.dispute_status,
          created_at: r.created_at,
          accepted_at: r.accepted_at,
          received_at: r.received_at,
          inspection: r.inspection,
          reason: r.reason ?? null,
          reply: r.reply ?? null,
          attachments: r.attachments ?? [],
        };
      }),
      ...retourOrders.map((o) => ({
        id: o.order_id,
        gid: `O${String(o.order_id).padStart(4, '0')}`,
        created_by: o.dropshipper_name ?? '—',
        type: 'product_return' as const,
        retailer_name: o.dropshipper_name ?? '—',
        retailer_code: '—',
        retailer_premium: false,
        address: [o.city, o.governorate].filter(Boolean).join(', ') || '—',
        destination_warehouse: inferShipmentZone(o.governorate, o.city),
        products: o.items.map((i) => ({ name: i.product_name, variation: '', quantity: i.quantity })),
        approval_status: 'waiting' as const,
        exchange_delivery_status: null as ExchangeDeliveryStatus | null,
        exchange_shipment_id: null as number | null,
        return_delivery_status: 'awaiting_arrival' as const,
        delivery_type: 'Self Delivery',
        process_type: 'DIRECT RETURN',
        carrier: o.delivery_company ?? '—',
        dispute_status: null as string | null,
        created_at: o.created_at,
        accepted_at: null as string | null,
        received_at: null as string | null,
        inspection: false,
        reason: null,
        reply: null,
        attachments: [],
      })),
    ];
    res.json({ success: true, data: { returns } });
  }));

  router.get('/returns/:id', ah(async (req, res) => {
    const rows = await store.listReturnRequests({ role: 'admin', userId: req.user.id });
    const r = rows.find((x) => x.id === Number(req.params.id));
    if (r) {
      const orderProducts = await store.getReturnOrderProducts([r.order_id]);
      const products = (orderProducts.get(r.order_id) ?? []).map((p) => ({ name: p.product_name, variation: '', quantity: p.quantity }));
      if (products.length === 0 && r.product_name) {
        products.push({ name: r.product_name, variation: r.product_variation ?? '', quantity: r.product_qty ?? 1 });
      }
      const ret = {
        id: r.id,
        gid: String(r.id).padStart(4, '0'),
        created_by: r.created_by,
        type: r.type === 'echange' ? 'replacement' as const : 'product_return' as const,
        retailer_name: r.retailer_name ?? r.dropshipper_name ?? '—',
        retailer_code: r.retailer_code ?? '—',
        retailer_premium: r.retailer_premium,
        address: r.return_address ?? '—',
        destination_warehouse: inferShipmentZone(r.governorate, r.city),
        products,
        approval_status: r.approval_status ?? 'waiting' as const,
        exchange_delivery_status: (r.exchange_delivery_status as ExchangeDeliveryStatus | null) ?? null,
        return_delivery_status: r.return_delivery_status ?? 'awaiting_arrival' as const,
        dispute_status: r.dispute_status,
        created_at: r.created_at,
        accepted_at: r.accepted_at,
        received_at: r.received_at,
        inspection: r.inspection,
        customer_name: r.dropshipper_name ?? '—',
        customer_phone: '—',
        customer_phone_full: '—',
        address_lines: r.return_address ? [r.return_address] : [],
        delivery_type: r.delivery_type ?? 'Self Delivery',
        carrier: r.carrier ?? '—',
        process_type: r.process_type ?? (r.type === 'echange' ? 'SWAP & RETURN' : 'DIRECT RETURN'),
        return_delivery_label: retDeliveryLabel(r.return_delivery_status),
        exchange_delivery_label: exchLabel(r.exchange_delivery_status),
        carrier_name: r.carrier ?? 'Tunisian Post',
        fulfilled_at: r.received_at,
        fulfilled_by: inferShipmentZone(r.governorate, r.city),
        inspection_by: r.inspection ? inferShipmentZone(r.governorate, r.city) : null,
        tracking_number: null as string | null,
        order_id: r.order_id,
        order_gid: String(r.order_id).padStart(4, '0'),
        order_shipment_id: null as number | null,
        order_shipment_gid: null as string | null,
        exchange_shipment_id: r.exchange_shipment_id,
        exchange_shipment_gid: r.exchange_shipment_id ? String(r.exchange_shipment_id).padStart(4, '0') : null,
        exchange_timeline: [] as Array<{ id: number; key: string; title: string; completed: boolean }>,
      };
      res.json({ success: true, data: ret });
      return;
    }
    const retourOrders = await store.listRetourOrdersForChef(new Set());
    const o = retourOrders.find((x) => x.order_id === Number(req.params.id));
    if (!o) { res.status(404).json({ success: false, message: 'Return not found' }); return; }
    const ret = {
      id: o.order_id,
      gid: `O${String(o.order_id).padStart(4, '0')}`,
      created_by: o.dropshipper_name ?? '—',
      type: 'product_return' as const,
      retailer_name: o.dropshipper_name ?? '—',
      retailer_code: '—',
      retailer_premium: false,
      address: [o.city, o.governorate].filter(Boolean).join(', ') || '—',
      destination_warehouse: null as string | null,
      products: o.items.map((i) => ({ name: i.product_name, variation: '', quantity: i.quantity })),
      approval_status: 'waiting' as const,
      exchange_delivery_status: null as ExchangeDeliveryStatus | null,
      return_delivery_status: 'awaiting_arrival' as const,
      dispute_status: null as string | null,
      created_at: o.created_at,
      accepted_at: null as string | null,
      received_at: null as string | null,
      inspection: false,
      customer_name: o.dropshipper_name ?? '—',
      customer_phone: '—',
      customer_phone_full: '—',
      address_lines: [[o.city, o.governorate].filter(Boolean).join(', ')],
      delivery_type: 'Self Delivery',
      carrier: o.delivery_company ?? '—',
      process_type: 'DIRECT RETURN',
      return_delivery_label: 'Awaiting products arrival to fulfillment center' as const,
      exchange_delivery_label: '—',
      carrier_name: o.delivery_company ?? 'Tunisian Post',
      fulfilled_at: null as string | null,
      fulfilled_by: null as string | null,
      inspection_by: null as string | null,
      tracking_number: null as string | null,
      order_id: o.order_id,
      order_gid: String(o.order_id).padStart(4, '0'),
      order_shipment_id: null as number | null,
      order_shipment_gid: null as string | null,
      exchange_shipment_id: null as number | null,
      exchange_shipment_gid: null as string | null,
      exchange_timeline: [] as Array<{ id: number; key: string; title: string; completed: boolean }>,
    };
    res.json({ success: true, data: ret });
  }));

  router.patch('/returns/:id', ah(async (req, res) => {
    const id = Number(req.params.id);
    const body = req.body ?? {};
    const rows = await store.listReturnRequests({ role: 'admin', userId: req.user.id });
    const r = rows.find((x) => x.id === id);
    if (!r) { res.status(404).json({ success: false, message: 'Return not found' }); return; }
    const patch: { approval_status?: ReturnApprovalStatus | null; delivery_type?: string | null; process_type?: string | null; carrier?: string | null; return_delivery_status?: ReturnDeliveryStatus | null; exchange_delivery_status?: ExchangeDeliveryStatus | null } = {};
    if (body.approval_status !== undefined) patch.approval_status = body.approval_status ? String(body.approval_status) as ReturnApprovalStatus : null;
    if (body.delivery_type !== undefined) patch.delivery_type = body.delivery_type ? String(body.delivery_type) : null;
    if (body.process_type !== undefined) patch.process_type = body.process_type ? String(body.process_type) : null;
    if (body.carrier !== undefined) patch.carrier = body.carrier ? String(body.carrier) : null;
    if (body.return_delivery_status !== undefined) patch.return_delivery_status = body.return_delivery_status ? String(body.return_delivery_status) as ReturnDeliveryStatus : null;
    if (body.exchange_delivery_status !== undefined) patch.exchange_delivery_status = body.exchange_delivery_status ? String(body.exchange_delivery_status) as ExchangeDeliveryStatus : null;
    await store.updateReturnRequest(id, patch);
    res.json({ success: true });
  }));
  router.get('/pickup-requests', ah(async (req, res) => {
    const q = req.query;
    const search = typeof q.q === 'string' && q.q ? q.q : undefined;
    const statusFilter = typeof q.status === 'string' && q.status ? q.status : undefined;

    const refillRows = await store.raw<{
      id: number;
      supplier: string;
      products: number;
      date: string;
      storage_request: string | null;
      reservation: string | null;
    }>(
      `SELECT r.id, r.supplier, r.products, r.date, r.storage_request, r.reservation
       FROM stock_refill_requests r
       ${search ? 'WHERE r.supplier LIKE ? OR r.id LIKE ?' : ''}
       ORDER BY r.id DESC`,
      search ? [`%${search}%`, `%${search}%`] : []
    );

    const refillIds = refillRows.map((r) => r.id);
    const storageRows = refillIds.length
      ? await store.raw<{
          related_refill_id: number;
          status: string;
        }>(
          `SELECT related_refill_id, status FROM storage_requests WHERE related_refill_id IN (${refillIds.map(() => '?').join(',')})`,
          refillIds
        )
      : [];
    const storageByRefill = new Map(storageRows.map((s) => [s.related_refill_id, s.status]));

    let pickups = refillRows.map((r) => {
      const storageStatus = storageByRefill.get(r.id);
      const chefStatus = storageStatus === 'Confirmed' ? 'Ready' : 'Pending';
      return {
        id: r.id,
        title: r.supplier,
        products: r.products,
        status: chefStatus,
        date: r.date,
        storage_request: r.storage_request,
        reservation: r.reservation,
      };
    });

    if (statusFilter) {
      pickups = pickups.filter((p) => p.status === statusFilter);
    }

    res.json({ success: true, data: { pickups } });
  }));

  router.get('/manifests', ah(async (_req, res) => {
    const manifests = await store.listManifests();
    res.json({ success: true, data: { manifests } });
  }));

  router.get('/manifests/grouped', ah(async (_req, res) => {
    const groups = await store.raw<{
      supplier_id: number; supplier_name: string; delivery_company: string;
      order_count: number; shipped_count: number; delivered_count: number;
      total_products: number; total_qty: number;
    }>(`
      SELECT
        u.id AS supplier_id,
        u.name AS supplier_name,
        COALESCE(o.delivery_company, 'Unknown') AS delivery_company,
        COUNT(DISTINCT o.id) AS order_count,
        SUM(CASE WHEN o.status = 'shipped' THEN 1 ELSE 0 END) AS shipped_count,
        SUM(CASE WHEN o.status = 'delivered' THEN 1 ELSE 0 END) AS delivered_count,
        COUNT(DISTINCT oi.product_id) AS total_products,
        COALESCE(SUM(oi.quantity), 0) AS total_qty
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      JOIN users u ON u.id = p.fournisseur_id
      WHERE o.status IN ('shipped', 'delivered')
        AND o.delivery_company IS NOT NULL
        AND o.delivery_company <> ''
      GROUP BY u.id, u.name, o.delivery_company
      ORDER BY u.name, o.delivery_company
    `);
    res.json({ success: true, data: { groups } });
  }));

  router.get('/manifests/group/:supplierId/:delivery', ah(async (req, res) => {
    const supplierId = Number(req.params.supplierId);
    const delivery = req.params.delivery;
    if (!supplierId || !delivery) { res.status(400).json({ success: false, error: 'Invalid params' }); return; }

    const supplier = await store.raw<{ id: number; name: string }>(
      'SELECT id, name FROM users WHERE id = ?', [supplierId]
    );
    const supplierName = supplier[0]?.name ?? 'Unknown';

    const orders = await store.raw<{
      order_id: number; order_number: string; customer_name: string | null;
      governorate: string | null; city: string | null; status: string;
      created_at: string; shipped_at: string | null; delivered_at: string | null;
      product_id: number; product_name: string; product_image: string | null;
      quantity: number; price: number; cost: number;
    }>(`
      SELECT o.id AS order_id, o.order_number, o.customer_name, o.governorate, o.city,
             o.status, o.created_at, o.shipped_at, o.delivered_at,
             oi.product_id, p.name AS product_name, p.image_url AS product_image,
             oi.quantity, oi.price, oi.cost
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      WHERE p.fournisseur_id = ?
        AND o.delivery_company = ?
        AND o.status IN ('shipped', 'delivered')
      ORDER BY o.id, p.name
    `, [supplierId, delivery]);

    const orderMap = new Map<number, {
      order_id: number; order_number: string; customer_name: string | null;
      governorate: string | null; city: string | null; status: string;
      created_at: string; shipped_at: string | null; delivered_at: string | null;
      products: { product_id: number; product_name: string; product_image: string | null; quantity: number; price: number; cost: number }[];
    }>();

    for (const r of orders) {
      if (!orderMap.has(r.order_id)) {
        orderMap.set(r.order_id, {
          order_id: r.order_id, order_number: r.order_number, customer_name: r.customer_name,
          governorate: r.governorate, city: r.city, status: r.status,
          created_at: r.created_at, shipped_at: r.shipped_at, delivered_at: r.delivered_at,
          products: [],
        });
      }
      orderMap.get(r.order_id)!.products.push({
        product_id: r.product_id, product_name: r.product_name, product_image: r.product_image,
        quantity: r.quantity, price: r.price, cost: r.cost,
      });
    }

    res.json({
      success: true,
      data: {
        supplier_id: supplierId,
        supplier_name: supplierName,
        delivery_company: delivery,
        orders: Array.from(orderMap.values()),
        summary: {
          total_orders: orderMap.size,
          total_products: orders.length,
          total_qty: orders.reduce((s, r) => s + r.quantity, 0),
        },
      },
    });
  }));

  router.get('/manifests/pdf/:supplierId/:delivery', ah(async (req, res) => {
    const supplierId = Number(req.params.supplierId);
    const delivery = req.params.delivery;
    if (!supplierId || !delivery) { res.status(400).json({ success: false, error: 'Invalid params' }); return; }

    const supplier = await store.raw<{ id: number; name: string }>(
      'SELECT id, name FROM users WHERE id = ?', [supplierId]
    );
    const supplierName = supplier[0]?.name ?? 'Unknown';

    const orders = await store.raw<{
      order_id: number; order_number: string; customer_name: string | null;
      governorate: string | null; city: string | null; status: string;
      created_at: string; shipped_at: string | null;
      product_name: string; quantity: number; price: number; cost: number;
      barcode: string | null; sku: string | null; product_id: number;
    }>(`
      SELECT o.id AS order_id, o.order_number, o.customer_name, o.governorate, o.city,
             o.status, o.created_at, o.shipped_at,
             p.name AS product_name, oi.quantity, oi.price, oi.cost,
             p.barcode, p.sku, p.id AS product_id
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      WHERE p.fournisseur_id = ?
        AND o.delivery_company = ?
        AND o.status IN ('shipped', 'delivered')
      ORDER BY o.id, p.name
    `, [supplierId, delivery]);

    // Build flat product rows: { code, designation }
    const rows: { code: string; designation: string }[] = [];
    for (const r of orders) {
      const code = r.barcode || r.sku || String(r.product_id);
      const designation = `${r.quantity} x ${r.product_name}`;
      rows.push({ code, designation });
    }

    // PDF setup — A4, no default margin
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=manifest-${supplierName.replace(/\s+/g, '_')}-${delivery}.pdf`);
    doc.pipe(res);

    const PAGE_W = 595.28;  // A4 width in points
    const PAGE_H = 841.89;  // A4 height in points
    const PAD_L = 22.68;    // 8mm
    const PAD_R = 22.68;
    const PAD_T = 31.18;    // 11mm
    const PAD_B = 22.68;    // 8mm
    const CONTENT_W = PAGE_W - PAD_L - PAD_R;

    // Table column widths
    const COL_CODE_W = CONTENT_W * 0.165;
    const COL_DESIGN_W = CONTENT_W * 0.835;

    // Row height ~9.2mm = ~26 points
    const ROW_H = 26;
    // Header row height ~8mm = ~22.68 points
    const THEAD_H = 22.68;
    // Available height for rows on first page
    const HEADER_ZONE_H = 107; // ~38mm for top header zone
    const FIRST_PAGE_BODY_TOP = PAD_T + HEADER_ZONE_H + 8; // after header + small gap
    const FIRST_PAGE_ROWS = Math.floor((PAGE_H - PAD_B - FIRST_PAGE_BODY_TOP - THEAD_H) / ROW_H);
    // Subsequent pages
    const NEXT_PAGE_BODY_TOP = PAD_T + 4; // small top padding
    const NEXT_PAGE_ROWS = Math.floor((PAGE_H - PAD_B - NEXT_PAGE_BODY_TOP - THEAD_H) / ROW_H);

    const today = new Date().toISOString().slice(0, 10);

    // Split rows into pages
    const pages: { code: string; designation: string }[][] = [];
    let remaining = [...rows];
    // First page
    const first = remaining.splice(0, FIRST_PAGE_ROWS);
    if (first.length > 0) pages.push(first);
    // Subsequent pages
    while (remaining.length > 0) {
      const chunk = remaining.splice(0, NEXT_PAGE_ROWS);
      pages.push(chunk);
    }
    // If no rows, still produce one empty page
    if (pages.length === 0) pages.push([]);

    for (let pi = 0; pi < pages.length; pi++) {
      if (pi > 0) doc.addPage({ size: 'A4', margin: 0 });

      const pageRows = pages[pi];
      const isFirst = pi === 0;
      const bodyTop = isFirst ? FIRST_PAGE_BODY_TOP : NEXT_PAGE_BODY_TOP;

      // ── HEADER (first page only) ──
      if (isFirst) {
        // Title
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#111111');
        doc.text('Manifest / Bon de sortie', PAD_L, PAD_T, { width: CONTENT_W });

        // Date (top-right)
        doc.font('Helvetica').fontSize(7).fillColor('#555555');
        doc.text(`Date: ${today}`, PAD_L, PAD_T, { width: CONTENT_W, align: 'right' });

        // SHOPORA logo (big green italic, like the template's "Shipper")
        doc.font('Helvetica-Bold').fontSize(29).fillColor('#164d0d');
        doc.text('SHOPORA', PAD_L, PAD_T + 28, {
          width: CONTENT_W,
          continued: false,
        });
        // ® mark
        const shoporaW = doc.widthOfString('SHOPORA');
        doc.font('Helvetica').fontSize(6).fillColor('#164d0d');
        doc.text('®', PAD_L + shoporaW + 1, PAD_T + 28, { continued: false });

        // Delivery company (right side)
        const deliveryRightX = PAGE_W - PAD_R - 170; // ~60mm from right
        doc.font('Helvetica-Bold').fontSize(17).fillColor('#4d9d3b');
        doc.text(delivery.toUpperCase(), deliveryRightX, PAD_T + 25, { width: 170 });

        // Delivery subtitle fields
        doc.font('Helvetica').fontSize(6).fillColor('#555555');
        doc.text('Nom du livreur:', deliveryRightX, PAD_T + 45, { width: 170, continued: true });
        doc.fillColor('#c04a49').text(' ........................', { continued: false });
        doc.font('Helvetica').fontSize(6).fillColor('#555555');
        doc.text('Numéro de la voiture:', deliveryRightX, PAD_T + 55, { width: 170, continued: true });
        doc.fillColor('#c04a49').text(' ....................', { continued: false });

        // Header rule
        doc.moveTo(PAD_L, PAD_T + HEADER_ZONE_H).lineTo(PAGE_W - PAD_R, PAD_T + HEADER_ZONE_H)
          .lineWidth(0.5).strokeColor('#d4dce0').stroke();
      }

      // ── TABLE ──
      // Table header
      const theadY = bodyTop;
      doc.rect(PAD_L, theadY, CONTENT_W, THEAD_H).fill('#f8f9fa');
      doc.font('Helvetica').fontSize(6.5).fillColor('#8c969b');
      doc.text('CODE', PAD_L + 4, theadY + 7, { width: COL_CODE_W - 8, align: 'center' });
      doc.text('DESIGNATION', PAD_L + COL_CODE_W + 4, theadY + 7, { width: COL_DESIGN_W - 8, align: 'center' });
      // Header bottom border
      doc.moveTo(PAD_L, theadY + THEAD_H).lineTo(PAGE_W - PAD_R, theadY + THEAD_H)
        .lineWidth(0.5).strokeColor('#cfd8dc').stroke();

      // Table rows
      for (let ri = 0; ri < pageRows.length; ri++) {
        const row = pageRows[ri];
        const rowY = theadY + THEAD_H + ri * ROW_H;

        // Row background (alternating)
        if (ri % 2 === 0) {
          doc.rect(PAD_L, rowY, CONTENT_W, ROW_H).fill('#ffffff');
        } else {
          doc.rect(PAD_L, rowY, CONTENT_W, ROW_H).fill('#fafbfc');
        }

        // Cell borders
        doc.rect(PAD_L, rowY, COL_CODE_W, ROW_H).lineWidth(0.3).strokeColor('#d5dde0').stroke();
        doc.rect(PAD_L + COL_CODE_W, rowY, COL_DESIGN_W, ROW_H).lineWidth(0.3).strokeColor('#d5dde0').stroke();

        // CODE text
        doc.font('Helvetica').fontSize(6.7).fillColor('#465158');
        doc.text(row.code, PAD_L + 5, rowY + 7, { width: COL_CODE_W - 10, height: ROW_H - 14 });

        // DESIGNATION text
        doc.text(row.designation, PAD_L + COL_CODE_W + 5, rowY + 7, { width: COL_DESIGN_W - 10, height: ROW_H - 14 });
      }
    }

    doc.end();
  }));

  router.get('/supplier-conversations', ah(async (_req, res) => {
    const convs = await store.raw<{
      id: number; type: string; title: string; created_at: string;
      supplier_id: number; supplier_name: string;
      dropshipper_name: string | null;
      last_sender_id: number | null; last_sender_name: string | null;
      last_body: string | null; last_image_url: string | null; last_created_at: string | null;
      message_count: number;
    }>(`
      SELECT c.id, c.type, c.title, c.created_at,
             SUBSTRING_INDEX(SUBSTRING_INDEX(c.title, ':', -1), ':', 1) AS supplier_id,
             su.name AS supplier_name,
             ds.dropshipper_name,
             lm.sender_id AS last_sender_id, lu.name AS last_sender_name,
             lm.body AS last_body, lm.image_url AS last_image_url, lm.created_at AS last_created_at,
             (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = c.id) AS message_count
      FROM conversations c
      LEFT JOIN users su ON su.id = CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(c.title, ':', -1), ':', 1) AS UNSIGNED)
      LEFT JOIN (
        SELECT cp.conversation_id, u.name AS dropshipper_name
        FROM conversation_participants cp
        JOIN users u ON u.id = cp.user_id
        WHERE u.role = 'customer'
      ) ds ON ds.conversation_id = c.id
      LEFT JOIN chat_messages lm ON lm.id = (
        SELECT id FROM chat_messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1
      )
      LEFT JOIN users lu ON lu.id = lm.sender_id
      WHERE c.title LIKE 'supplier:%'
      ORDER BY COALESCE(lm.created_at, c.created_at) DESC
    `);
    res.json({ success: true, data: { conversations: convs } });
  }));

  router.get('/supplier-conversations/:id/messages', ah(async (req, res) => {
    const convId = Number(req.params.id);
    if (!convId) { res.status(400).json({ success: false, error: 'Invalid id' }); return; }
    const msgs = await store.raw<{
      id: number; conversation_id: number; sender_id: number; body: string | null;
      image_url: string | null; created_at: string; sender_name: string; sender_role: string;
    }>(`
      SELECT m.id, m.conversation_id, m.sender_id, m.body, m.image_url, m.created_at,
             u.name AS sender_name, u.role AS sender_role
      FROM chat_messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.conversation_id = ?
      ORDER BY m.id ASC
    `, [convId]);
    res.json({ success: true, data: { messages: msgs } });
  }));

  router.get('/transactions', ah(async (_req, res) => {
    const orderTx = await store.raw<{
      id: number; type: string; summary: string; amount: number; created_at: string;
      entity_name: string; entity_role: string; order_number: string;
    }>(`
      SELECT o.id, 'order' AS type,
        CONCAT(o.order_number, ' — ', o.customer_name) AS summary,
        o.total AS amount, o.delivered_at AS created_at,
        u.name AS entity_name, 'dropshipper' AS entity_role, o.order_number
      FROM orders o JOIN users u ON u.id = o.dropshipper_id
      WHERE o.status IN ('delivered','shipped') AND o.delivered_at IS NOT NULL
      ORDER BY o.delivered_at DESC LIMIT 200
    `);
    const costTx = await store.raw<{
      id: number; type: string; summary: string; amount: number; created_at: string;
      entity_name: string; entity_role: string;
    }>(`
      SELECT o.id, 'cost' AS type,
        CONCAT('Supplier cost — ', p.name) AS summary,
        ROUND(oi.cost * oi.quantity, 2) AS amount, o.delivered_at AS created_at,
        u.name AS entity_name, 'fournisseur' AS entity_role
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      JOIN users u ON u.id = p.fournisseur_id
      WHERE o.status IN ('delivered','shipped') AND o.delivered_at IS NOT NULL
      ORDER BY o.delivered_at DESC LIMIT 200
    `);
    const payoutTx = await store.raw<{
      id: number; type: string; summary: string; amount: number; created_at: string;
      entity_name: string; entity_role: string;
    }>(`
      SELECT p.id, 'payout' AS type,
        CONCAT('Payout to ', u.name) AS summary,
        p.amount, p.created_at,
        u.name AS entity_name, p.recipient_role AS entity_role
      FROM payouts p JOIN users u ON u.id = p.recipient_id
      ORDER BY p.created_at DESC LIMIT 200
    `);
    const inscriptionTx = await store.raw<{
      id: number; type: string; summary: string; amount: number; created_at: string;
      entity_name: string; entity_role: string; status: string;
    }>(`
      SELECT i.id, 'inscription' AS type,
        CONCAT('Confirmation service — ', u.name) AS summary,
        i.amount, i.created_at,
        u.name AS entity_name, 'dropshipper' AS entity_role, i.status
      FROM service_inscriptions i JOIN users u ON u.id = i.user_id
      ORDER BY i.created_at DESC LIMIT 200
    `);
    const all = [...orderTx, ...costTx.map((r) => ({ ...r, amount: -Math.abs(Number(r.amount)) })), ...payoutTx.map((r) => ({ ...r, amount: -Math.abs(Number(r.amount)) })), ...inscriptionTx.map((r) => ({ ...r, amount: Math.abs(Number(r.amount)) }))];
    all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json({ success: true, data: { transactions: all, total: all.length } });
  }));

  router.post('/service-inscriptions/:id(\\d+)/confirm', ah(async (req, res) => {
    const row = await store.confirmServiceInscription(Number(req.params.id), req.user.id);
    if (!row) {
      res.status(404).json({ success: false, error: 'Inscription not found' });
      return;
    }
    res.json({ success: true, data: row });
  }));

  router.get('/reconciliation-reviews', ah(async (_req, res) => {
    const suppliers = await store.raw<{
      id: number; name: string; email: string; earned: number; paid: number; owed: number; total_orders: number; total_products: number;
    }>(`
      SELECT u.id, u.name, u.email,
        (SELECT COUNT(DISTINCT sp.product_id) FROM saved_products sp JOIN products p ON p.id = sp.product_id WHERE p.fournisseur_id = u.id) AS total_products,
        (SELECT COUNT(DISTINCT o.id) FROM orders o JOIN order_items oi ON oi.order_id = o.id JOIN products p ON p.id = oi.product_id WHERE p.fournisseur_id = u.id AND o.status = 'delivered') AS total_orders,
        COALESCE((SELECT ROUND(SUM(p.price * oi.quantity), 2) FROM orders o JOIN order_items oi ON oi.order_id = o.id JOIN products p ON p.id = oi.product_id WHERE p.fournisseur_id = u.id AND o.status = 'delivered'), 0) AS earned
      FROM users u WHERE u.role = 'seller' ORDER BY earned DESC
    `);
    const supplierPaid = await store.raw<{ recipient_id: number; paid: number }>(`
      SELECT recipient_id, COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS paid
      FROM payouts WHERE recipient_role = 'seller' GROUP BY recipient_id
    `);
    const dropshippers = await store.raw<{
      id: number; name: string; email: string; profit: number; paid: number; owed: number; total_orders: number; total_sales: number;
    }>(`
      SELECT u.id, u.name, u.email,
        COUNT(o.id) AS total_orders,
        COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total ELSE 0 END), 0) AS total_sales,
        COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.profit ELSE 0 END), 0) AS profit
      FROM users u LEFT JOIN orders o ON o.dropshipper_id = u.id
      WHERE u.role = 'customer' GROUP BY u.id, u.name, u.email ORDER BY profit DESC
    `);
    const dsPaid = await store.raw<{ recipient_id: number; paid: number }>(`
      SELECT recipient_id, COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS paid
      FROM payouts WHERE recipient_role = 'customer' GROUP BY recipient_id
    `);
    const paidMap = new Map<number, number>();
    for (const r of [...supplierPaid, ...dsPaid]) paidMap.set(Number(r.recipient_id), Number(r.paid));
    const supplierRows = suppliers.map((s) => ({ ...s, earned: Number(s.earned), paid: paidMap.get(Number(s.id)) ?? 0, owed: Math.max(0, Number(s.earned) - (paidMap.get(Number(s.id)) ?? 0)) }));
    const dsRows = dropshippers.map((d) => ({ ...d, profit: Number(d.profit), paid: paidMap.get(Number(d.id)) ?? 0, owed: Math.max(0, Number(d.profit) - (paidMap.get(Number(d.id)) ?? 0)) }));
    res.json({ success: true, data: { suppliers: supplierRows, dropshippers: dsRows } });
  }));

  router.get('/seller-organizations', ah(async (req, res) => {
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

  const sellerTagsSchema = z.object({ tags: z.array(z.string().trim().min(1).max(80)).max(30) });

  router.get('/seller-organizations-staff', ah(async (_req, res) => {
    const users = await store.listUsers();
    const staff = users
      .filter((u) => u.role === 'admin')
      .map((u) => ({ id: u.id, name: u.name, role: u.role }));
    res.json({ success: true, data: staff });
  }));

  const sellerManagersSchema = z.object({
    account_manager: z.string().trim().max(120).nullable().optional(),
    business_developer: z.string().trim().max(120).nullable().optional(),
  });

  router.patch('/seller-organizations/:id(-?\\d+)/managers', validateBody(sellerManagersSchema), ah(async (req, res) => {
    const org = await store.updateSellerOrganizationManagers(Number(req.params.id), req.body);
    if (!org) {
      res.status(404).json({ success: false, error: 'Seller organization not found' });
      return;
    }
    res.json({ success: true, data: org });
  }));

  router.post('/seller-organizations/:id(-?\\d+)/follow-up', validateBody(followUpCreateSchema), ah(async (req, res) => {
    const user = await store.findUserById(req.user.id);
    const name = user?.name?.trim() || req.user.email || 'Chef';
    const autoConfirmed = AUTO_CONFIRMED_MEETINGS.includes(req.body.meeting as string);
    const followUp = {
      person: name,
      label: (req.body.tags?.[0] as string | undefined) ?? (req.body.meeting as string),
      note: req.body.note ?? null,
      meeting: req.body.meeting,
      scheduled_at: req.body.scheduled_at ?? new Date().toISOString(),
      confirmed: autoConfirmed,
      by: name,
      tags: req.body.tags ?? [],
      attachments: req.body.attachments ?? [],
      ...(autoConfirmed ? { outcome: 'Confirmed' } : {}),
    };
    let id = Number(req.params.id);
    let org = await store.getSellerOrganization(id);
    if (!org && id < 0) {
      const targetUser = await store.findUserById(Math.abs(id));
      if (targetUser) {
        org = await store.createSellerSignup({
          owner_name: targetUser.name,
          email: targetUser.email,
          phone: null,
          shop_name: null,
          tags: [],
        });
        id = org.id;
      }
    }
    if (!org) {
      res.status(404).json({ success: false, error: 'Seller organization not found' });
      return;
    }
    const updated = await store.setSellerFollowUp(id, followUp);
    logStaffActivity(store, req.user, {
      activity_type: 'followup',
      label: `Seller follow-up (${followUp.meeting}) — ${org.owner_name}`,
      ref_id: id,
      quantity: 1,
    });
    res.json({ success: true, data: updated });
  }));

  router.patch('/seller-organizations/:id(-?\\d+)/follow-up', validateBody(followUpPatchSchema), ah(async (req, res) => {
    const user = await store.findUserById(req.user.id);
    const name = user?.name?.trim() || req.user.email || 'Chef';
    let id = Number(req.params.id);
    let org = await store.getSellerOrganization(id);
    if (!org && id < 0) {
      const targetUser = await store.findUserById(Math.abs(id));
      if (targetUser) {
        org = await store.createSellerSignup({
          owner_name: targetUser.name,
          email: targetUser.email,
          phone: null,
          shop_name: null,
          tags: [],
        });
        id = org.id;
      }
    }
    if (!org) {
      res.status(404).json({ success: false, error: 'Seller organization not found' });
      return;
    }
    const updated = await store.updateSellerFollowUp(id, req.body, name);
    if (!updated) {
      res.status(404).json({ success: false, error: 'No follow up to update for this seller organization' });
      return;
    }
    res.json({ success: true, data: updated });
  }));

  router.patch('/seller-organizations/:id(-?\\d+)/tags', validateBody(sellerTagsSchema), ah(async (req, res) => {
    const org = await store.updateSellerOrganizationTags(Number(req.params.id), req.body.tags);
    if (!org) {
      res.status(404).json({ success: false, error: 'Seller organization not found' });
      return;
    }
    res.json({ success: true, data: org });
  }));

  router.patch('/seller-organizations/:id(-?\\d+)/flags', ah(async (req, res) => {
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

  router.patch('/seller-organizations/:id(-?\\d+)/onboarding', ah(async (req, res) => {
    const { status } = req.body;
    if (typeof status !== 'string' || !status) {
      res.status(400).json({ success: false, error: 'status is required' });
      return;
    }
    let id = Number(req.params.id);
    let org = await store.getSellerOrganization(id);
    if (!org && id < 0) {
      const targetUser = await store.findUserById(Math.abs(id));
      if (targetUser) {
        org = await store.createSellerSignup({
          owner_name: targetUser.name,
          email: targetUser.email,
          phone: null,
          shop_name: null,
          tags: [],
        });
        id = org.id;
      }
    }
    if (!org) {
      res.status(404).json({ success: false, error: 'Seller organization not found' });
      return;
    }
    const updated = await store.updateSellerOrganizationOnboarding(id, status);
    res.json({ success: true, data: updated });
  }));

  router.get('/seller-organizations/:id(-?\\d+)/notifications', ah(async (req, res) => {
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

  router.get('/seller-organizations/:id(-?\\d+)', ah(async (req, res) => {
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

  router.get('/supplier-organizations', ah(async (req, res) => {
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

  router.post('/supplier-organizations', validateBody(createSupplierSchema), ah(async (req, res) => {
    const user = await store.findUserById(req.user.id);
    const actorName = user?.name?.trim() || req.user.email || 'Chef';
    try {
      const org = await store.createSupplierOrganization({ ...req.body, business_developer: actorName });
      res.status(201).json({ success: true, data: org });
    } catch (e) {
      if (e instanceof Error && /already exists/i.test(e.message)) {
        res.status(409).json({ success: false, error: e.message });
        return;
      }
      throw e;
    }
  }));

  router.post('/supplier-organizations/:id(\\d+)/follow-up', validateBody(followUpCreateSchema), ah(async (req, res) => {
    const user = await store.findUserById(req.user.id);
    const name = user?.name?.trim() || req.user.email || 'Chef';
    const autoConfirmed = AUTO_CONFIRMED_MEETINGS.includes(req.body.meeting as string);
    const followUp = {
      person: name,
      label: (req.body.tags?.[0] as string | undefined) ?? (req.body.meeting as string),
      note: req.body.note ?? null,
      meeting: req.body.meeting,
      scheduled_at: req.body.scheduled_at ?? new Date().toISOString(),
      confirmed: autoConfirmed,
      by: name,
      tags: req.body.tags ?? [],
      attachments: req.body.attachments ?? [],
      ...(autoConfirmed ? { outcome: 'Confirmed' } : {}),
    };
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

  router.patch('/supplier-organizations/:id(\\d+)/follow-up', validateBody(followUpPatchSchema), ah(async (req, res) => {
    const user = await store.findUserById(req.user.id);
    const name = user?.name?.trim() || req.user.email || 'Chef';
    const org = await store.updateSupplierFollowUp(Number(req.params.id), req.body, name);
    if (!org) {
      res.status(404).json({ success: false, error: 'No follow up to update for this supplier organization' });
      return;
    }
    res.json({ success: true, data: org });
  }));

  router.get('/supplier-organizations/:id(\\d+)', ah(async (req, res) => {
    const org = await store.getSupplierOrganizationDetail(Number(req.params.id));
    if (!org) {
      res.status(404).json({ success: false, error: 'Supplier organization not found' });
      return;
    }
    res.json({ success: true, data: org });
  }));

  router.get('/supplier-organizations/:id(\\d+)/products', ah(async (req, res) => {
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

  router.post('/seller-organizations/:id(-?\\d+)/access', ah(async (req, res) => {
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

  router.post('/supplier-organizations/:id(\\d+)/access', ah(async (req, res) => {
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

  router.patch('/supplier-organizations/:id(\\d+)/flags', validateBody(supplierFlagsPatchSchema), ah(async (req, res) => {
    const org = await store.updateSupplierOrganizationFlags(Number(req.params.id), req.body);
    if (!org) {
      res.status(404).json({ success: false, error: 'Supplier organization not found' });
      return;
    }
    res.json({ success: true, data: org });
  }));

  const supplierTagsSchema = z.object({ labels: z.array(z.string().trim().min(1).max(80)).max(30) });

  router.patch('/supplier-organizations/:id(\\d+)/labels', validateBody(supplierTagsSchema), ah(async (req, res) => {
    const org = await store.updateSupplierOrganizationLabels(Number(req.params.id), req.body.labels);
    if (!org) {
      res.status(404).json({ success: false, error: 'Supplier organization not found' });
      return;
    }
    res.json({ success: true, data: org });
  }));

  router.get('/team-members', ah(async (_req, res) => {
    const users = await store.listUsers();
    const members = users.filter((u) => u.role === 'admin');
    res.json({ success: true, data: members });
  }));

  router.get('/products', ah(async (req, res) => {
    const q = req.query;
    const page = Math.max(1, Number(q.page) || 1);
    const perPage = Math.max(1, Math.min(1000, Number(q.per_page) || 10));
    const search = typeof q.q === 'string' && q.q ? q.q : undefined;
    const all = await store.listProducts(search ? { q: search } : {});
    let filtered = all;
    const statuses = splitArr(q.statuses);
    const offers = splitArr(q.offers);
    const vis = typeof q.visibility === 'string' && (q.visibility === 'visible' || q.visibility === 'hidden') ? q.visibility : undefined;
    if (statuses.length) filtered = filtered.filter((p) => statuses.includes(spStatus(p.moderation_status)));
    if (offers.length) filtered = filtered.filter((p) => offers.some((o) => p.offers?.includes(o as ProductCategory) || p.category === o));
    if (vis) filtered = filtered.filter((p) => (vis === 'visible') === !isHidden(p));
    const rows = filtered.map(mapSupplierRow);
    const filters = {
      statuses: ['Active', 'In Review', 'Declined'],
      offers: ['dropshipping', 'wholesale', 'white_label'],
      shippings: ['Can be shipped', 'Cannot ship'],
    };
    const total = rows.length;
    const start = (page - 1) * perPage;
    const pageRows = rows.slice(start, start + perPage);
    res.json({ success: true, data: { rows: pageRows, total, filters, page, per_page: perPage } });
  }));

  router.get('/products/:id(\\d+)', ah(async (req, res) => {
    const product = await store.getProduct(Number(req.params.id));
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }
    res.json({ success: true, data: mapSupplierDetail(product as ProductWithSupplier) });
  }));

  router.get('/products/:id(\\d+)/supplier-org', ah(async (req, res) => {
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

  router.post('/products/:id(\\d+)/moderate', validateBody(z.object({
    status: z.enum(['approved', 'refused', 'hidden', 'pending']),
    note: z.string().max(2000).optional().nullable(),
  })), ah(async (req, res) => {
    const id = Number(req.params.id);
    const product = await store.getProduct(id);
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }
    await store.moderateProduct(id, req.body.status, req.body.note ?? null);
    if (req.body.status === 'approved') {
      const dropshippers = (await store.listUsers()).filter((u) => u.role === 'customer');
      await Promise.all(dropshippers.map((d) => store.createNotification({
        user_id: d.id,
        type: 'new_product',
        title: 'New product available',
        body: `"${product.name}" has been approved and is now available in the store.`,
        product_id: product.id,
      })));
    }
    res.json({ success: true, data: { id, status: req.body.status } });
  }));

  router.patch('/products/:id(\\d+)', validateBody(z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional().nullable(),
    price: z.number().positive().optional(),
    offers: z.array(z.enum(['dropshipping', 'wholesale', 'white_label'])).optional(),
    image_url: z.string().optional().nullable(),
    video_url: z.string().optional().nullable(),
    images: z.array(z.string()).optional(),
    videos: z.array(z.string()).optional(),
  })), ah(async (req, res) => {
    const id = Number(req.params.id);
    const product = await store.getProduct(id);
    if (!product) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }
    const patch: Record<string, unknown> = { ...req.body };
    if ('price' in patch) patch.cost_price = patch.price;
    await store.updateProduct(id, patch as unknown as Parameters<typeof store.updateProduct>[1]);
    const updated = await store.getProduct(id);
    res.json({ success: true, data: mapSupplierDetail(updated as ProductWithSupplier) });
  }));

  router.get('/bins', ah(async (req, res) => {
    const q = req.query;
    const n = (v: unknown): number | undefined => {
      if (typeof v !== 'string' || v === '') return undefined;
      const x = Number(v);
      return Number.isFinite(x) ? x : undefined;
    };
    const query: BinsInventoryQuery = {
      page: Math.max(1, Number(q.page) || 1),
      per_page: Math.max(1, Math.min(1000, Number(q.per_page) || 10)),
      q: typeof q.q === 'string' && q.q ? q.q : undefined,
      qte_min: n(q.qte_min),
      qte_max: n(q.qte_max),
    };
    res.json({ success: true, data: searchBinsInventories(query) });
  }));

  router.get('/bins/catalog', ah(async (_req, res) => {
    res.json({ success: true, data: getBinsCatalog() });
  }));

  router.get('/leads', ah(async (req, res) => {
    const q = req.query;
    const query: LeadsQuery = {
      page: Math.max(1, Number(q.page) || 1),
      per_page: Math.max(1, Math.min(1000, Number(q.per_page) || 10)),
      q: typeof q.q === 'string' && q.q ? q.q : undefined,
      sort: typeof q.sort === 'string' && q.sort ? q.sort : 'last_submitted_at',
      dir: typeof q.dir === 'string' && q.dir === 'asc' ? 'asc' : 'desc',
      source: typeof q.source === 'string' && q.source ? q.source : undefined,
      type: typeof q.type === 'string' && q.type ? q.type : undefined,
      status: typeof q.status === 'string' && q.status ? q.status : undefined,
      location: typeof q.location === 'string' && q.location ? q.location : undefined,
      has_order: typeof q.has_order === 'string' && q.has_order ? q.has_order : undefined,
    };
    res.json({ success: true, data: searchLeads(query) });
  }));

  router.get('/leads/options', ah(async (_req, res) => {
    res.json({ success: true, data: getLeadsOptions() });
  }));

  router.get('/packing/bins', ah(async (req, res) => {
    const q = req.query;
    const query = {
      page: Math.max(1, Number(q.page) || 1),
      per_page: Math.max(1, Math.min(1000, Number(q.per_page) || 10)),
      q: typeof q.q === 'string' && q.q ? q.q : undefined,
    };
    res.json({ success: true, data: await store.searchPackingBins(query) });
  }));

  router.post('/packing/bins', ah(async (req, res) => {
    const b = req.body;
    const bin = await store.createPackingBin({
      name: String(b.name || '').trim(),
      reference: b.reference ? String(b.reference).trim() : null,
      price: Number(b.price) || 0,
      cost: Number(b.cost) || 0,
      type: (b.type || 'box') as PackingBinType,
      image: b.image ? String(b.image) : null,
      active: b.active !== false,
    });
    res.status(201).json({ success: true, data: bin });
  }));

  router.get('/packing/bins/options', ah(async (_req, res) => {
    res.json({ success: true, data: { types: PACKING_BIN_TYPES } });
  }));

  router.get('/packing/bins/:id', ah(async (req, res) => {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ success: false, error: 'Invalid id' }); return; }
    const bin = await store.getPackingBin(id);
    if (!bin) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    res.json({ success: true, data: bin });
  }));

  router.post('/packing/bins/:id', ah(async (req, res) => {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ success: false, error: 'Invalid id' }); return; }
    const b = req.body;
    const bin = await store.updatePackingBin(id, {
      name: b.name !== undefined ? String(b.name).trim() : undefined,
      reference: b.reference !== undefined ? (b.reference ? String(b.reference).trim() : null) : undefined,
      price: b.price !== undefined ? Number(b.price) : undefined,
      cost: b.cost !== undefined ? Number(b.cost) : undefined,
      type: b.type !== undefined ? (b.type as PackingBinType) : undefined,
      image: b.image !== undefined ? (b.image ? String(b.image) : null) : undefined,
      active: b.active !== undefined ? Boolean(b.active) : undefined,
    });
    if (!bin) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    res.json({ success: true, data: bin });
  }));

  router.delete('/packing/bins/:id', ah(async (req, res) => {
    const id = Number(req.params.id);
    if (!id) { res.status(400).json({ success: false, error: 'Invalid id' }); return; }
    const bin = await store.getPackingBin(id);
    if (!bin) { res.status(404).json({ success: false, error: 'Not found' }); return; }
    await store.deletePackingBin(id);
    res.json({ success: true, data: { deleted: true } });
  }));

  router.get('/warehouse/owners', ah(async (_req, res) => {
    const users = await store.listUsers();
    const owners = users
      .filter((u) => u.role === 'seller' || u.role === 'customer')
      .map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role }));
    res.json({ success: true, data: owners });
  }));

  router.get('/warehouses', ah(async (_req, res) => {
    const warehouses = await store.listSupplierWarehouses();
    res.json({ success: true, data: warehouses });
  }));

  router.post('/warehouses', validateBody(z.object({
    fournisseur_id: z.number().int().positive().optional().nullable(),
    name: z.string().trim().min(1, 'Warehouse name is required').max(160),
    phone1: z.string().trim().max(50).optional().nullable(),
    phone2: z.string().trim().max(50).optional().nullable(),
    country: z.string().trim().max(80).optional().nullable(),
    location: z.string().trim().max(200).optional().nullable(),
    address1: z.string().trim().max(255).optional().nullable(),
    address2: z.string().trim().max(255).optional().nullable(),
  })), ah(async (req, res) => {
    const b = req.body;
    const warehouse = await store.createSupplierWarehouse({
      fournisseur_id: b.fournisseur_id ?? null,
      name: b.name,
      phone1: b.phone1 ?? '',
      phone2: b.phone2 ?? '',
      country: b.country ?? 'Tunisia',
      location: b.location ?? '',
      address1: b.address1 ?? '',
      address2: b.address2 ?? '',
    });
    res.status(201).json({ success: true, data: warehouse });
  }));

  router.get('/find-products', ah(async (req, res) => {
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

  router.get('/find-products/:uuid', ah(async (req, res) => {
    const p = await getFindProductDetail(req.params.uuid);
    if (!p) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, data: p });
  }));

  router.get('/subscriptions', ah(async (req, res) => {
    const q = req.query;
    const page = Math.max(1, Number(q.page) || 1);
    const perPage = Math.max(1, Math.min(1000, Number(q.per_page) || 20));
    const search = typeof q.q === 'string' && q.q ? q.q : undefined;
    const sortCol = typeof q.sort === 'string' ? q.sort : undefined;
    const sortDir = q.dir === 'asc' ? 'ASC' : 'DESC';

    let where = 'WHERE 1=1';
    const params: unknown[] = [];

    if (search) {
      where += ' AND (p.name LIKE ? OR sup.name LIKE ? OR u.name LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like);
    }

    const countRow = await store.raw<{ total: number }>(
      `SELECT COUNT(*) AS total FROM saved_products sp
       JOIN products p ON p.id = sp.product_id
       JOIN users u ON u.id = sp.dropshipper_id
       JOIN users sup ON sup.id = p.fournisseur_id
       ${where}`, params
    );
    const countRows = countRow as unknown as { total: number }[];
    const total = countRows[0]?.total ?? 0;

    const sortMap: Record<string, string> = {
      product: 'p.name',
      supplier: 'sup.name',
      retailer: 'u.name',
      cost: 'p.cost_price',
      price: 'COALESCE(sp.my_price, p.price)',
      type: 'sp.offer_type',
      saved: 'sp.created_at',
    };
    const orderClause = sortCol && sortMap[sortCol] ? `ORDER BY ${sortMap[sortCol]} ${sortDir}` : 'ORDER BY sp.created_at DESC';

    const rows = await store.raw<{
      id: number;
      saved_at: string;
      my_price: number | null;
      offer_type: string;
      product_name: string;
      product_image: string | null;
      product_price: number;
      cost_price: number;
      supplier_name: string;
      dropshipper_name: string;
      product_category: string;
    }>(
      `SELECT sp.id, sp.created_at AS saved_at, sp.my_price, sp.offer_type,
              p.name AS product_name, p.image_url AS product_image,
              p.price AS product_price, p.cost_price, p.category AS product_category,
              sup.name AS supplier_name,
              u.name AS dropshipper_name
       FROM saved_products sp
       JOIN products p ON p.id = sp.product_id
       JOIN users u ON u.id = sp.dropshipper_id
       JOIN users sup ON sup.id = p.fournisseur_id
       ${where}
       ${orderClause}
       LIMIT ? OFFSET ?`,
      [...params, perPage, (page - 1) * perPage]
    );

    res.json({
      success: true,
      data: {
        subscriptions: rows.map((r) => ({
          id: r.id,
          product_name: r.product_name,
          product_image: r.product_image,
          supplier_name: r.supplier_name,
          retailer_name: r.dropshipper_name,
          cost: Number(r.cost_price),
          price: r.my_price != null ? Number(r.my_price) : Number(r.product_price),
          my_price: r.my_price != null ? Number(r.my_price) : null,
          offer_type: r.product_category,
          saved_at: r.saved_at,
        })),
        total,
        page,
        per_page: perPage,
      }
    });
  }));

  router.get('/subscriptions/:id(\\d+)', ah(async (req, res) => {
    const data = await store.getProductSubscription(Number(req.params.id));
    if (!data) {
      res.status(404).json({ success: false, error: 'Subscription not found' });
      return;
    }
    res.json({ success: true, data });
  }));

  router.put('/subscriptions/:id(\\d+)', validateBody(subscriptionPatchSchema), ah(async (req, res) => {
    const data = await store.updateProductSubscription(Number(req.params.id), req.body);
    if (!data) {
      res.status(404).json({ success: false, error: 'Subscription not found' });
      return;
    }
    res.json({ success: true, data });
  }));

  router.get('/collections', ah(async (_req, res) => {
    const data = await store.listCollections();
    res.json({ success: true, data });
  }));

  router.get('/collections/catalog', ah(async (_req, res) => {
    const data = await store.listCollectionCatalog();
    res.json({ success: true, data });
  }));

  router.get('/collections/:id(\\d+)', ah(async (req, res) => {
    const data = await store.getCollection(Number(req.params.id));
    if (!data) {
      res.status(404).json({ success: false, error: 'Collection not found' });
      return;
    }
    res.json({ success: true, data });
  }));

  router.post('/collections', validateBody(collectionSchema), ah(async (req, res) => {
    const user = req.user;
    const actor = user?.name ?? user?.email ?? 'chef';
    const data = await store.createCollection(req.body, actor);
    res.status(201).json({ success: true, data });
  }));

  router.put('/collections/:id(\\d+)', validateBody(collectionSchema), ah(async (req, res) => {
    const user = req.user;
    const actor = user?.name ?? user?.email ?? 'chef';
    const data = await store.updateCollection(Number(req.params.id), req.body, actor);
    if (!data) {
      res.status(404).json({ success: false, error: 'Collection not found' });
      return;
    }
    res.json({ success: true, data });
  }));

  router.post('/collections/:id(\\d+)/products', ah(async (req, res) => {
    const collectionId = Number(req.params.id);
    const productId = Number(req.body?.product_id);
    if (!Number.isFinite(collectionId) || !Number.isFinite(productId)) {
      res.status(400).json({ success: false, error: 'Invalid collection or product id' });
      return;
    }
    const detail = await store.getCollection(collectionId);
    if (!detail) {
      res.status(404).json({ success: false, error: 'Collection not found' });
      return;
    }
    const existingIds = (detail.product_items ?? []).map((i) => i.id);
    if (existingIds.includes(productId)) {
      res.json({ success: true, data: detail, message: 'Product already in collection' });
      return;
    }
    const user = req.user;
    const actor = user?.name ?? user?.email ?? 'chef';
    const data = await store.addProductToCollection(collectionId, productId, actor);
    res.json({ success: true, data });
  }));

  router.delete('/collections/:id(\\d+)/products', ah(async (req, res) => {
    const collectionId = Number(req.params.id);
    const productId = Number(req.body?.product_id ?? req.query?.product_id);
    if (!Number.isFinite(collectionId) || !Number.isFinite(productId)) {
      res.status(400).json({ success: false, error: 'Invalid collection or product id' });
      return;
    }
    const detail = await store.getCollection(collectionId);
    if (!detail) {
      res.status(404).json({ success: false, error: 'Collection not found' });
      return;
    }
    const existingIds = (detail.product_items ?? []).map((i) => i.id);
    if (!existingIds.includes(productId)) {
      res.json({ success: true, data: detail, message: 'Product not in collection' });
      return;
    }
    const user = req.user;
    const actor = user?.name ?? user?.email ?? 'chef';
    const data = await store.removeProductFromCollection(collectionId, productId, actor);
    res.json({ success: true, data });
  }));

  router.get('/suppliers', ah(async (_req, res) => {
    const data = await store.supplierFinance();
    res.json({ success: true, data });
  }));

  router.get('/dropshippers', ah(async (_req, res) => {
    const data = await store.dropshipperFinance();
    res.json({ success: true, data });
  }));

  router.get('/platform-earnings', ah(async (_req, res) => {
    const data = await store.platformEarnings();
    res.json({ success: true, data });
  }));

  router.get('/payouts', ah(async (_req, res) => {
    const data = await store.listPayouts();
    res.json({ success: true, data });
  }));

  router.get('/fulfillment', ah(async (_req, res) => {
    const data = await store.fulfillmentReport();
    res.json({ success: true, data });
  }));

  router.post('/scan', validateBody(scanSchema), ah(async (req, res) => {
    const order = await store.findOrderByCode(req.body.code);
    if (!order) {
      res.status(404).json({ success: false, error: 'No commande matches this code' });
      return;
    }
    const updated = await store.scanOrder(order.id, req.body.action);
    res.json({ success: true, data: updated });
  }));

  router.post('/fulfillment/:id(\\d+)/allocate', validateBody(z.object({ inventory_id: z.number().int().positive().optional() })), ah(async (req, res) => {
    const data = await store.allocateFulfillmentToInventory(Number(req.params.id), req.body.inventory_id);
    res.json({ success: true, data });
  }));

  router.post('/payouts', validateBody(payoutSchema), ah(async (req, res) => {
    const { recipient_id, recipient_role, method } = req.body;
    const user = await store.findUserById(recipient_id);
    if (!user) {
      res.status(404).json({ success: false, error: 'Recipient not found' });
      return;
    }
    if (user.role !== recipient_role) {
      res.status(400).json({ success: false, error: `User is not a ${recipient_role}` });
      return;
    }

    if (method === 'flouci') {
      if (recipient_role !== 'customer') {
        res.status(400).json({ success: false, error: 'Flouci payments are only available for dropshippers' });
        return;
      }
      const wallet = await store.getFlouciWallet(recipient_id);
      if (!wallet) {
        res.status(400).json({ success: false, error: 'Dropshipper has not linked a Flouci account' });
        return;
      }
      const cfg = await store.getIntegrationSetting('flouci');
      if (!cfg.enabled || !cfg.api_key || !cfg.api_key.includes(':')) {
        res.status(400).json({ success: false, error: 'Flouci integration is not configured' });
        return;
      }
      const amount = Number(req.body.amount);
      const trackingId = `payout_${Date.now()}_${randomUUID().slice(0, 8)}`;
      const successLink = `${env.WEB_BASE_URL}/dropshipper/payments?status=success`;
      const failLink = `${env.WEB_BASE_URL}/dropshipper/payments?status=fail`;
      const webhook = `${env.API_BASE_URL}/api/flouci/webhook`;
      let generated;
      try {
        generated = await flouciGeneratePayment(cfg.api_key, {
          amount,
          developerTrackingId: trackingId,
          acceptCard: true,
          successLink,
          failLink,
          webhook,
        });
      } catch (err) {
        res.status(502).json({ success: false, error: (err as Error)?.message ?? 'Flouci API error' });
        return;
      }
      const payoutId = await store.createPayout({
        recipient_id,
        recipient_role,
        amount,
        period: req.body.period ?? null,
        notes: req.body.notes ?? null,
        method: 'flouci',
        flouci_payment_id: generated.payment_id,
        flouci_link: generated.link,
        flouci_status: 'PENDING',
        flouci_tracking_id: trackingId,
      });
      res.status(201).json({ success: true, data: { ok: true, payout_id: payoutId, link: generated.link, payment_id: generated.payment_id } });
      return;
    }

    await store.createPayout({ ...req.body, method: method ?? 'manual' });
    res.status(201).json({ success: true, data: { ok: true } });
  }));

  router.patch('/payouts/:id(\\d+)', validateBody(statusSchema), ah(async (req, res) => {
    await store.updatePayoutStatus(Number(req.params.id), req.body.status);
    res.json({ success: true, data: { ok: true } });
  }));

  // ─── Dashboard Endpoints ──────────────────────────────────────────

  function parsePeriod(q: Record<string, unknown>): { start: string; end: string; label: string } {
    const now = new Date();
    const period = typeof q.period === 'string' ? q.period : 'month';
    const start = new Date(now);
    if (period === 'day') start.setDate(now.getDate() - 1);
    else if (period === 'week') start.setDate(now.getDate() - 7);
    else if (period === 'month') start.setMonth(now.getMonth() - 1);
    else if (period === 'quarter') start.setMonth(now.getMonth() - 3);
    else if (period === 'year') start.setFullYear(now.getFullYear() - 1);
    else start.setMonth(now.getMonth() - 1);
    return { start: start.toISOString().slice(0, 10), end: now.toISOString().slice(0, 10), label: period };
  }

  router.get('/overview', ah(async (req, res) => {
    const { start, end } = parsePeriod(req.query as Record<string, unknown>);
    const orders = await store.listOrders({ role: 'admin', userId: req.user!.id });
    const periodOrders = orders.filter((o) => {
      const d = o.created_at.slice(0, 10);
      return d >= start && d <= end;
    });
    const paid = periodOrders.filter((o) => o.payment_status === 'paid');
    const delivered = periodOrders.filter((o) => o.status === 'delivered');
    const cancelled = periodOrders.filter((o) => o.status === 'cancelled');
    const revenue = paid.reduce((s, o) => s + Number(o.total), 0);
    const cost = paid.reduce((s, o) => s + Number(o.total_cost), 0);
    const profit = paid.reduce((s, o) => s + Number(o.profit), 0);
    const commission = paid.reduce((s, o) => s + Number(o.commission), 0);

    const daily: Record<string, { revenue: number; profit: number; orders: number }> = {};
    for (const o of paid) {
      const day = o.created_at.slice(0, 10);
      if (!daily[day]) daily[day] = { revenue: 0, profit: 0, orders: 0 };
      daily[day].revenue += Number(o.total);
      daily[day].profit += Number(o.profit);
      daily[day].orders += 1;
    }
    const revenueByDay = Object.entries(daily).sort(([a], [b]) => a.localeCompare(b)).map(([day, v]) => ({ day, ...v }));

    const weekly: Record<string, { revenue: number; profit: number; orders: number }> = {};
    for (const o of paid) {
      const d = new Date(o.created_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      if (!weekly[key]) weekly[key] = { revenue: 0, profit: 0, orders: 0 };
      weekly[key].revenue += Number(o.total);
      weekly[key].profit += Number(o.profit);
      weekly[key].orders += 1;
    }
    const revenueByWeek = Object.entries(weekly).sort(([a], [b]) => a.localeCompare(b)).map(([day, v]) => ({ day, ...v }));

    const monthly: Record<string, { revenue: number; profit: number; orders: number }> = {};
    for (const o of paid) {
      const key = o.created_at.slice(0, 7);
      if (!monthly[key]) monthly[key] = { revenue: 0, profit: 0, orders: 0 };
      monthly[key].revenue += Number(o.total);
      monthly[key].profit += Number(o.profit);
      monthly[key].orders += 1;
    }
    const revenueByMonth = Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({ month, ...v }));

    res.json({
      success: true,
      data: {
        period: { start, end },
        totals: {
          revenue: Math.round(revenue * 1000) / 1000,
          cost: Math.round(cost * 1000) / 1000,
          profit: Math.round(profit * 1000) / 1000,
          commission: Math.round(commission * 1000) / 1000,
          orders: periodOrders.length,
          paid: paid.length,
          delivered: delivered.length,
          cancelled: cancelled.length,
          unpaid: periodOrders.filter((o) => o.payment_status === 'unpaid').length,
        },
        revenueByDay,
        revenueByWeek,
        revenueByMonth,
      },
    });
  }));

  router.get('/performance-dashboard', ah(async (req, res) => {
    const { start, end } = parsePeriod(req.query as Record<string, unknown>);
    const orders = await store.listOrders({ role: 'admin', userId: req.user!.id });
    const period = orders.filter((o) => o.created_at.slice(0, 10) >= start && o.created_at.slice(0, 10) <= end);
    const paid = period.filter((o) => o.payment_status === 'paid');

    const byStatus: Record<string, number> = {};
    for (const o of period) byStatus[o.status] = (byStatus[o.status] || 0) + 1;

    const byType: Record<string, { count: number; revenue: number; profit: number }> = {};
    for (const o of paid) {
      const t = o.order_type;
      if (!byType[t]) byType[t] = { count: 0, revenue: 0, profit: 0 };
      byType[t].count += 1;
      byType[t].revenue += Number(o.total);
      byType[t].profit += Number(o.profit);
    }

    const avgOrderValue = paid.length ? paid.reduce((s, o) => s + Number(o.total), 0) / paid.length : 0;
    const avgProfit = paid.length ? paid.reduce((s, o) => s + Number(o.profit), 0) / paid.length : 0;

    const byDay: Record<string, { count: number; revenue: number }> = {};
    for (const o of paid) {
      const d = o.created_at.slice(0, 10);
      if (!byDay[d]) byDay[d] = { count: 0, revenue: 0 };
      byDay[d].count += 1;
      byDay[d].revenue += Number(o.total);
    }

    res.json({
      success: true,
      data: {
        period: { start, end },
        totals: {
          orders: period.length,
          revenue: Math.round(paid.reduce((s, o) => s + Number(o.total), 0) * 1000) / 1000,
          profit: Math.round(paid.reduce((s, o) => s + Number(o.profit), 0) * 1000) / 1000,
          avgOrderValue: Math.round(avgOrderValue * 1000) / 1000,
          avgProfit: Math.round(avgProfit * 1000) / 1000,
          conversionRate: period.length ? Math.round((paid.length / period.length) * 10000) / 100 : 0,
        },
        byStatus,
        byType,
        byDay: Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([day, v]) => ({ day, ...v })),
      },
    });
  }));

  router.get('/products-dashboard', ah(async (req, res) => {
    const { start, end } = parsePeriod(req.query as Record<string, unknown>);
    const orders = await store.listOrders({ role: 'admin', userId: req.user!.id });
    const paid = orders.filter((o) => o.payment_status === 'paid' && o.created_at.slice(0, 10) >= start && o.created_at.slice(0, 10) <= end);

    const productMap: Record<number, { name: string; image: string | null; revenue: number; profit: number; qty: number; orders: number }> = {};
    for (const o of paid) {
      for (const item of o.items) {
        const pid = item.product_id;
        if (!productMap[pid]) productMap[pid] = { name: item.product_name, image: item.product_image, revenue: 0, profit: 0, qty: 0, orders: 0 };
        productMap[pid].revenue += item.price * item.quantity;
        productMap[pid].profit += (item.price - item.cost) * item.quantity;
        productMap[pid].qty += item.quantity;
        productMap[pid].orders += 1;
      }
    }

    const products = Object.entries(productMap)
      .map(([id, v]) => ({ id: Number(id), ...v, revenue: Math.round(v.revenue * 1000) / 1000, profit: Math.round(v.profit * 1000) / 1000 }))
      .sort((a, b) => b.revenue - a.revenue);

    res.json({ success: true, data: { period: { start, end }, products } });
  }));

  router.get('/supplier-incubation-dashboard', ah(async (req, res) => {
    const { start, end } = parsePeriod(req.query as Record<string, unknown>);
    const supplierId = typeof req.query.supplier_id === 'string' ? Number(req.query.supplier_id) : undefined;
    const orders = await store.listOrders({ role: 'admin', userId: req.user!.id });
    const paid = orders.filter((o) => o.status === 'delivered' && o.created_at.slice(0, 10) >= start && o.created_at.slice(0, 10) <= end);

    const products = await store.raw<{ id: number; price: number }>('SELECT id, price FROM products');
    const priceMap = new Map<number, number>(products.map((p) => [Number(p.id), Number(p.price)]));

    const unitPrice = (item: OrderItem): number => (priceMap.has(item.product_id) ? priceMap.get(item.product_id)! : item.cost);

    const supplierMap: Record<number, { name: string; revenue: number; profit: number; orders: number; items: number }> = {};
    for (const o of paid) {
      for (const item of o.items) {
        const sid = item.fournisseur_id;
        if (!supplierMap[sid]) supplierMap[sid] = { name: item.fournisseur_name, revenue: 0, profit: 0, orders: 0, items: 0 };
        const unit = unitPrice(item);
        supplierMap[sid].revenue += unit * item.quantity;
        supplierMap[sid].profit += unit * item.quantity;
        supplierMap[sid].items += item.quantity;
      }
      const sid = o.fournisseur_id;
      if (!supplierMap[sid]) supplierMap[sid] = { name: o.fournisseur_name, revenue: 0, profit: 0, orders: 0, items: 0 };
      supplierMap[sid].orders += 1;
    }

    const suppliers = Object.entries(supplierMap)
      .map(([id, v]) => ({ id: Number(id), ...v, revenue: Math.round(v.revenue * 1000) / 1000, profit: Math.round(v.profit * 1000) / 1000 }))
      .sort((a, b) => b.profit - a.profit);

    let selected = null;
    if (supplierId) {
      const sOrders = paid.filter((o) => o.fournisseur_id === supplierId);
      const daily: Record<string, { revenue: number; profit: number; orders: number }> = {};
      for (const o of sOrders) {
        const d = o.created_at.slice(0, 10);
        if (!daily[d]) daily[d] = { revenue: 0, profit: 0, orders: 0 };
        const sum = o.items.reduce((acc, item) => {
          if (item.fournisseur_id !== supplierId) return acc;
          const unit = unitPrice(item);
          acc.revenue += unit * item.quantity;
          acc.profit += unit * item.quantity;
          return acc;
        }, { revenue: 0, profit: 0 });
        daily[d].revenue += sum.revenue;
        daily[d].profit += sum.profit;
        daily[d].orders += 1;
      }
      const supplier = supplierMap[supplierId];
      selected = {
        id: supplierId,
        ...supplier,
        byDay: Object.entries(daily).sort(([a], [b]) => a.localeCompare(b)).map(([day, v]) => ({ day, ...v })),
      };
    }

    res.json({ success: true, data: { period: { start, end }, suppliers, selected } });
  }));

  router.get('/seller-incubation-dashboard', ah(async (req, res) => {
    const { start, end } = parsePeriod(req.query as Record<string, unknown>);
    const sellerId = typeof req.query.seller_id === 'string' ? Number(req.query.seller_id) : undefined;
    const orders = await store.listOrders({ role: 'admin', userId: req.user!.id });
    const paid = orders.filter((o) => o.status === 'delivered' && o.created_at.slice(0, 10) >= start && o.created_at.slice(0, 10) <= end);

    const sellerMap: Record<number, { name: string; revenue: number; profit: number; orders: number; items: number }> = {};
    for (const o of paid) {
      const did = o.dropshipper_id;
      if (!sellerMap[did]) sellerMap[did] = { name: o.dropshipper_name, revenue: 0, profit: 0, orders: 0, items: 0 };
      sellerMap[did].revenue += Number(o.total);
      sellerMap[did].profit += Number(o.profit);
      sellerMap[did].orders += 1;
      for (const item of o.items) sellerMap[did].items += item.quantity;
    }

    const sellers = Object.entries(sellerMap)
      .map(([id, v]) => ({ id: Number(id), ...v, revenue: Math.round(v.revenue * 1000) / 1000, profit: Math.round(v.profit * 1000) / 1000 }))
      .sort((a, b) => b.profit - a.profit);

    let selected = null;
    if (sellerId) {
      const sOrders = paid.filter((o) => o.dropshipper_id === sellerId);
      const daily: Record<string, { revenue: number; profit: number; orders: number }> = {};
      for (const o of sOrders) {
        const d = o.created_at.slice(0, 10);
        if (!daily[d]) daily[d] = { revenue: 0, profit: 0, orders: 0 };
        daily[d].revenue += Number(o.total);
        daily[d].profit += Number(o.profit);
        daily[d].orders += 1;
      }
      const seller = sellerMap[sellerId];
      selected = {
        id: sellerId,
        ...seller,
        byDay: Object.entries(daily).sort(([a], [b]) => a.localeCompare(b)).map(([day, v]) => ({ day, ...v })),
      };
    }

    res.json({ success: true, data: { period: { start, end }, sellers, selected } });
  }));

  return router;
}
