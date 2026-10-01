import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import {
  ApiKey,
  AppNotification,
  ChatMessage,
  Conversation,
  ConversationParticipant,
  CreateNotificationInput,
  CreateOrderInput,
  CreateOrderResult,
  DbOrder,
  DbProduct,
  DbRating,
  DbTicket,
  DbUser,
  FulfillmentGroup,
  FulfillmentAllocationDetail,
  Inventory,
  InventoryDetail,
  Manifest,
  ManifestDetail,
  ManifestItem,
  OrderFull,
  OrderItem,
  PickupRequest,
  ProductCategory,
  ProductStats,
  ProductUpdate,
  ProductWithSupplier,
  StockingProduct,
  ReturnRequest,
  SavedProductView,
  StockRequestItem,
  StockShipmentItem,
  StockShipmentOrder,
  ShipmentZone,
  ShipmentRow,
  OrderPickRow,
  OrderPickStatus,
  Store,
  SupplierOffer,
  TicketFull,
  TrackStep,
  TransferShipment,
  Transaction,
  TransactionsResult,
  OrderItemInput,
  Payout,
  TrendingItem,
  ScanAction,
  OrderScanError,
  Collection,
  CollectionDetail,
  CollectionInput,
  CollectionProduct,
  CollectionProductItem,
  ReconciliationReview,
  CreateSupplierOrganizationInput,
  SupplierFollowUpPatch,
  UpdateSupplierOrgFlagsInput,
 StockRefillRequest,
 StockRefillRequestsQuery,
 StockRefillRequestsResult,
 StorageRequestsQuery,
 StorageRequestsResult,
 StorageRequest,
 StockBatchLookupRow,
 PickPlan,
 OrderPickabilityRow,
  SellerOrganization,
  SellerSignupInput,
  StockReturnItem,
  StockReturnsStoreResult,
  StockReturnScanInput,
  StockReturnScanResult,
  StoreStockReturnsInput,
  UpdateSellerOrgManagersInput,
  PackingBin,
  PackingBinsQuery,
  PackingBinsResult,
  SupplierWarehouse,
  CreateSupplierWarehouseInput,
  StaffActivityInput,
  StaffActivityRow,
  StaffActivityType,
  ServiceInscription,
} from './types';
import { StockError } from './types';
import { inferShipmentZone, isShipmentZone, addBusinessDays } from './shipmentZones';
import { normName, productTrendScore, supplierOfferScore, resolveWholesalePrice } from './shared';
import { allocateMissingIntoInventories, InventoryFreeSpace, MissingForAllocation } from './shared';
import { at, mulberry32, MANAGERS } from '../data/shipments';
import { buildManifests } from '../data/manifests';
import { buildPickupRequests } from '../data/pickupRequests';
import { buildTransferShipments } from '../data/transferShipments';
import { buildTransactions, TRANSACTION_TOTAL } from '../data/transactions';
import { buildReconciliationReviews } from '../data/reconciliationReviews';
import { searchSellerOrganizations, SELLER_ORGANIZATIONS_TOTAL } from '../data/sellerOrganizations';
import {
  getSupplierOrganization,
  getSupplierOrganizationDetail,
  searchSupplierOrganizations,

  SupplierFollowUp,
  SupplierOrganization,
  SupplierOrganizationDetail,
  SupplierOrganizationsQuery,
  SupplierOrganizationsResult,
} from '../data/supplierOrganizations';
import {
  searchProductSubscriptions,
  getProductSubscription,
  updateProductSubscription,
  PRODUCT_SUBSCRIPTIONS_TOTAL,
  SubscriptionPatch,
} from '../data/productSubscriptions';
import {
  buildCollections,
  CollectionSeedDetail,
} from '../data/collections';
import { catalogProduct, CATALOG } from '../data/collectionCatalog';
import { buildLiveSupplierOnboarding } from './live';
const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
const round2 = (n: number) => Math.round(n * 100) / 100;

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

const toTime = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ');
const addHours = (iso: string, hours: number): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  d.setHours(d.getHours() + hours);
  return toTime(d);
};
const parseTime = (v: string | null | undefined): number | null => {
  if (!v) return null;
  const t = new Date(v).getTime();
  return isNaN(t) ? null : t;
};

export function createMemoryStore(): Store {
  let uid = 0;
  let pid = 0;
  let oid = 0;
  let oiid = 0;
  let tid = 0;
  let rid = 0;
  let tkid = 0;
  let suid = 0;
  let puid = 0;
  let rtid = 0;
  let cid = 0;
  let cmid = 0;
  let nid = 0;

  const users: DbUser[] = [];
  const products: DbProduct[] = [];
  const orders: OrderFull[] = [];
  const ratings: DbRating[] = [];
  const tickets: DbTicket[] = [];
  const savedProducts: { id: number; dropshipper_id: number; product_id: number; my_price: number | null; offer_type: 'dropshipping' | 'wholesale'; created_at: string }[] = [];
  const productUpdates: ProductUpdate[] = [];
  const returns: ReturnRequest[] = [];
  const transferShipments: TransferShipment[] = buildTransferShipments().slice(0, 40);
  const pickupRequests: PickupRequest[] = buildPickupRequests().slice(0, 40);
  const manifests: Manifest[] = buildManifests().slice(0, 200);
  const packingBins: PackingBin[] = [];
  let packingBinSeq = 0;
  const transactions: Transaction[] = buildTransactions().transactions;
  const reconciliationReviews: ReconciliationReview[] = buildReconciliationReviews().reviews;
  const sellerOrganizationCount = SELLER_ORGANIZATIONS_TOTAL;
  const extraSellerOrgs: SellerOrganization[] = [];
  const extraSupplierOrgs: SupplierOrganization[] = [];
  const productSubscriptionCount = PRODUCT_SUBSCRIPTIONS_TOTAL;
  const collectionsSeed = buildCollections();
  const collections: Collection[] = collectionsSeed.collections;
  const collectionDetails = new Map<number, CollectionSeedDetail>(Object.entries(collectionsSeed.details).map(([k, v]) => [Number(k), v]));

  const buildItemsFor = (ids: number[]): CollectionProductItem[] => {
    const rand = mulberry32(99);
    return ids.map((pid, idx) => {
      const p = catalogProduct(pid);
      const item: CollectionProductItem = {
        ...p,
        image_url: null,
        added_by: rand() < 0.55 ? null : MANAGERS[idx % MANAGERS.length] ?? null,
        added_at: at(2 + (idx % 20), 8 + (idx % 10), (idx * 13) % 60),
      };
      return item;
    });
  };

  const collectionItems = new Map<number, CollectionProductItem[]>(
    Object.entries(collectionsSeed.details).map(([k, v]) => [
      Number(k),
      buildItemsFor(v.product_ids),
    ]),
  );
  const catalogProducts: CollectionProduct[] = CATALOG.map((p) => ({ ...p, image_url: null }));

  const buildDetail = (c: Collection): CollectionDetail | null => {
    const detail = collectionDetails.get(c.id);
    if (!detail) return null;
    return {
      ...c,
      product_items: collectionItems.get(c.id) ?? [],
    };
  };
  const payouts: Payout[] = [];
  const flouciWallets: { user_id: number; identifier: string; created_at: string; updated_at: string }[] = [];
  const inscriptions: ServiceInscription[] = [];
  const conversations: { id: number; type: 'team' | 'staff' | 'product'; title: string | null; participants: { user_id: number; last_read_message_id: number }[]; created_at: string }[] = [];
  const chatMessages: ChatMessage[] = [];
  const notifications: AppNotification[] = [];
  const apiKeys: ApiKey[] = [];
  const integrationSettingsMap: Record<string, { api_key: string; enabled: boolean }> = {};
  const staffActivity: StaffActivityRow[] = [];
  const uploads = new Map<string, { data: Buffer; contentType: string }>();
  let said = 0;
  const inventories: {
    id: number;
    code: string;
    name: string;
    location: string | null;
    capacity: number;
    created_at: string;
    items: { product_id: number; quantity: number }[];
  }[] = [];
  let iid = 0;
  let akid = 0;

  const supplierWarehouses: SupplierWarehouse[] = [];
  let swid = 0;

  const supplierLabelOverrides = new Map<number, string[]>();

  const hydrateSupplierOrg = (row: SupplierOrganization): SupplierOrganization => {
    const labels = supplierLabelOverrides.get(row.id);
    const u = users.find((x) => x.email.toLowerCase() === row.email.toLowerCase());
    let onboarding = row.onboarding;
    if (u && u.role === 'seller') {
      onboarding = buildLiveSupplierOnboarding({
        added: products.filter((p) => p.fournisseur_id === u.id).length,
        activeProducts: products.filter((p) => p.fournisseur_id === u.id && p.is_active && p.moderation_status === 'approved').length,
        warehouses: supplierWarehouses.filter((w) => w.fournisseur_id === u.id).length,
        subscriptions: 0,
      });
    }
    return labels ? { ...row, onboarding, labels, owner_photo: u?.photo ?? row.owner_photo ?? null } : { ...row, onboarding, owner_photo: u?.photo ?? row.owner_photo ?? null };
  };

  const getReturnLedger = (): { order_id: number; product_id: number; inventory_id: number; quantity: number }[] => {
    const g = globalThis as unknown as { __returnLedger?: { order_id: number; product_id: number; inventory_id: number; quantity: number }[] };
    if (!g.__returnLedger) g.__returnLedger = [];
    return g.__returnLedger;
  };

  const sha256 = (t: string) => createHash('sha256').update(t).digest('hex');
  const newApiToken = () => `sk_live_${randomBytes(24).toString('hex')}`;

  const hash = (p: string) => bcrypt.hashSync(p, 10);

  function seed() {
    const admin = { id: ++uid, name: 'Amine Admin', email: 'admin@demo.com', password_hash: hash('password'), role: 'admin' as const, photo: null, cin: null, created_at: now() };
    const chef = { id: ++uid, name: 'Mohamed Admin', email: 'chef@demo.com', password_hash: hash('password'), role: 'admin' as const, photo: null, cin: null, created_at: now() };
    const support = { id: ++uid, name: 'Salma Admin', email: 'support@demo.com', password_hash: hash('password'), role: 'admin' as const, photo: null, cin: null, created_at: now() };
    const stocking = { id: ++uid, name: 'Rania Admin', email: 'stocking@demo.com', password_hash: hash('password'), role: 'admin' as const, photo: null, cin: null, created_at: now() };
    const confirmateur = { id: ++uid, name: 'Khalil Admin', email: 'confirmateur@demo.com', password_hash: hash('password'), role: 'admin' as const, photo: null, cin: null, created_at: now() };
    const dropshipper = { id: ++uid, name: 'Sarah Customer', email: 'dropshipper@demo.com', password_hash: hash('password'), role: 'customer' as const, photo: null, cin: '04678123', created_at: now() };
    const fournisseurA = { id: ++uid, name: 'Karim Seller', email: 'fournisseur@demo.com', password_hash: hash('password'), role: 'seller' as const, photo: null, cin: null, created_at: now() };
    const fournisseurB = { id: ++uid, name: 'Lina Seller', email: 'lina@demo.com', password_hash: hash('password'), role: 'seller' as const, photo: null, cin: null, created_at: now() };
    users.push(admin, chef, support, stocking, confirmateur, dropshipper, fournisseurA, fournisseurB);

    // Seed sample staff activity so the team dashboard is populated in demo mode.
    {
      const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
      const mk = (s: { id: number; name: string; role: string }, type: StaffActivityType, label: string, minutes: number, ref: number, duration: number | null = null) =>
        staffActivity.push({ id: ++said, user_id: s.id, user_name: s.name, role: s.role, activity_type: type, label, ref_id: ref, quantity: 1, duration_seconds: duration, created_at: minutesAgo(minutes) });
      const rand = mulberry32(4242);
      const staffSeeds = [
        { u: admin, types: [['ticket_reply', 26] as const, ['chat_reply', 40] as const, ['return_process', 14] as const, ['product_moderate', 9] as const, ['followup', 12] as const] },
        { u: chef, types: [['followup', 34] as const, ['ticket_reply', 12] as const, ['chat_reply', 28] as const, ['product_moderate', 18] as const] },
        { u: support, types: [['ticket_reply', 64] as const, ['chat_reply', 52] as const, ['return_process', 22] as const] },
        { u: stocking, types: [['pick_scan', 120] as const, ['pick_create', 48] as const, ['refill_create', 16] as const, ['refill_update', 20] as const, ['product_moderate', 7] as const, ['chat_reply', 15] as const] },
        { u: confirmateur, types: [['order_confirm', 88] as const, ['chat_reply', 10] as const] },
      ];
      const labels: Record<StaffActivityType, string> = {
        ticket_reply: 'Replied to ticket', chat_reply: 'Team chat message', order_confirm: 'Confirmed commande',
        return_process: 'Processed return', product_moderate: 'Moderated product', pick_create: 'Created pick',
        pick_scan: 'Scanned pick item', refill_create: 'Created refill request', refill_update: 'Updated refill request', followup: 'Supplier follow-up', command_create: 'Created commande', command_forward: 'Sent commande to chef',
      };
      for (const s of staffSeeds) {
        for (const [type, count] of s.types) {
          for (let i = 0; i < count; i++) {
            const minutes = Math.floor(rand() * 30 * 24 * 60);
            const isSpeed = type === 'ticket_reply';
            const duration = isSpeed ? Math.round(120 + rand() * (54 * 60)) : null;
            mk(s.u, type, labels[type], minutes, 1000 + Math.floor(rand() * 8999), duration);
          }
        }
      }
    }

    const prod = (
      fournisseur_id: number,
      name: string,
      description: string,
      price: number,
      cost_price: number,
      stock: number,
      sku: string,
      barcode: string,
      img: string,
      category: ProductCategory = 'dropshipping'
    ): DbProduct => ({
      id: ++pid,
      fournisseur_id,
      name,
      description,
      price,
      cost_price,
      category,
      offers: [category],
      stock,
      sku,
      barcode,
      image_url: img,
      video_url: null,
      images: [img],
      videos: [],
      is_active: true,
      moderation_status: 'approved' as const,
      moderation_note: null,
      rating: Math.round((4 + Math.random()) * 10) / 10,
      rating_count: Math.floor(Math.random() * 20) + 1,
      created_at: now(),
    });

    const P = [
      prod(fournisseurA.id, 'Wireless Bluetooth Earbuds', 'Noise-cancelling wireless earbuds with charging case, 30h battery.', 39.9, 39.9, 120, 'SKU-EAR-001', '619111222333', 'https://picsum.photos/seed/earbuds/600/600'),
      prod(fournisseurA.id, 'Smart Watch Fitness Tracker', 'Waterproof smart watch with heart rate monitor and GPS.', 59.9, 59.9, 80, 'SKU-WAT-002', '619111222334', 'https://picsum.photos/seed/watch/600/600'),
      prod(fournisseurA.id, 'LED Ring Light 10"', 'Professional ring light with tripod and phone holder for content creators.', 45.0, 45.0, 60, 'SKU-RNG-003', '619111222335', 'https://picsum.photos/seed/ringlight/600/600'),
      prod(fournisseurB.id, 'Smartphone Gimbal Stabilizer', '3-axis handheld gimbal stabilizer for vlogging.', 89.0, 89.0, 45, 'SKU-GIM-004', '619111222336', 'https://picsum.photos/seed/gimbal/600/600', 'wholesale'),
      prod(fournisseurB.id, 'Portable Power Bank 20000mAh', 'Fast-charging 20000mAh power bank with dual USB + Type-C.', 32.0, 32.0, 200, 'SKU-PWR-005', '619111222337', 'https://picsum.photos/seed/powerbank/600/600', 'wholesale'),
      prod(fournisseurB.id, 'Wireless Mechanical Keyboard', 'RGB backlit wireless mechanical keyboard, hot-swappable.', 69.0, 69.0, 75, 'SKU-KEY-006', '619111222338', 'https://picsum.photos/seed/keyboard/600/600', 'wholesale'),
      prod(fournisseurA.id, 'Mini Projector 4K', 'Portable mini projector, 4K support, HDMI + USB, home cinema.', 129.0, 129.0, 30, 'SKU-PRJ-007', '619111222339', 'https://picsum.photos/seed/projector/600/600', 'white_label'),
      prod(fournisseurA.id, 'LED Strip Lights RGB', '16ft RGB LED strip lights with app control and music sync.', 24.0, 24.0, 300, 'SKU-LED-008', '619111222340', 'https://picsum.photos/seed/ledstrip/600/600'),
    ];
    P[0].house_stock = 1;
    P[7].house_stock = 1;
    P[4].offers = ['dropshipping', 'wholesale'];
    P[5].offers = ['dropshipping', 'wholesale'];
    products.push(...P);

    const inv = (code: string, name: string, location: string | null, items: { product_id: number; quantity: number }[]) => {
      inventories.push({ id: ++iid, code, name, location, capacity: 50, created_at: now(), items });
    };
    inv('INV-01A', 'inventory 1', 'Ariana warehouse', [{ product_id: P[0].id, quantity: 2 }, { product_id: P[7].id, quantity: 2 }]);
    inv('INV-02B', 'inventory 2', 'Sousse warehouse', [{ product_id: P[2].id, quantity: 3 }]);
    inv('INV-03C', 'inventory 3', 'Sfax warehouse', [{ product_id: P[4].id, quantity: 5 }]);
    inv('INV-04D', 'inventory 4', 'Bizerte warehouse', []);

    const mkWh = (fournisseur_id: number | null, name: string, location: string) => {
      const owner = users.find((u) => u.id === fournisseur_id);
      supplierWarehouses.push({
        id: ++swid,
        fournisseur_id,
        owner_name: owner?.name ?? null,
        name,
        phone1: '+216 22 000 001',
        phone2: '',
        country: 'Tunisia',
        location,
        address1: '',
        address2: '',
        created_at: now(),
      });
    };
    mkWh(fournisseurA.id, 'Karim Fulfillment Hub', 'Tunis > Tunis');
    mkWh(fournisseurB.id, 'Lina Stock Depot', 'Sousse > Sousse City');
    mkWh(fournisseurA.id, 'Karim Wholesale Store', 'Ariana > Ariana');
    mkWh(null, 'Agence Sfax', 'Sfax > Sfax Ville');

    const mkOrder = (
      dropshipper_id: number,
      fournisseur_id: number,
      name: string,
      phone: string,
      gov: string,
      city: string,
      addr: string,
      status: OrderFull['status'],
      payment: OrderFull['payment_status'],
      method: string,
      items: { product_id: number; quantity: number }[],
      daysAgo: number
    ) => {
      const oi: OrderItem[] = items.map((it) => {
        const p = products.find((x) => x.id === it.product_id)!;
        const sup = users.find((u) => u.id === p.fournisseur_id);
        return { id: ++oiid, order_id: 0, product_id: p.id, product_name: p.name, product_image: p.image_url, quantity: it.quantity, price: p.price, cost: p.cost_price, fournisseur_id: p.fournisseur_id, fournisseur_name: sup?.name ?? 'Unknown' };
      });
      const order = fullOrder(
        {
          id: ++oid,
          order_number: `D42-${String(1000 + oid)}`,
          barcode: null,
          dropshipper_id,
          fournisseur_id,
          customer_name: name,
          customer_phone: phone,
          governorate: gov,
          city,
          shipping_address: addr,
          delivery_company: null,
          delivery_status: null,
          locality_id: null,
          telephone2: null,
          commentaire: null,
          est_fragile: 'non',
          ouvrir_colis: 'non',
          nombre_article: items.reduce((s, it) => s + it.quantity, 0),
          nombre_echange: 'non',
          status,
          order_type: 'dropshipping',
          payment_status: payment,
          payment_method: method,
          total: 0,
          total_cost: 0,
          profit: 0,
          commission: 0,
          confirmed_at: null,
          confirmed_by: null,
          confirmed_by_name: null,
          shipped_at: null,
          delivered_at: null,
          returned_at: null,
          auto_deliver_at: null,
          created_at: now(),
        },
        oi
      );
      orders.push(order);
    };

    mkOrder(dropshipper.id, fournisseurA.id, 'Omar B', '+216 22 010 101', 'Tunis', 'Tunis', '12 Rue Habib Bourguiba, Tunis', 'delivered', 'paid', 'stripe', [{ product_id: P[0].id, quantity: 2 }, { product_id: P[7].id, quantity: 1 }], 6);
    mkOrder(dropshipper.id, fournisseurA.id, 'Yasmine K', '+216 22 010 202', 'Sousse', 'Sousse', '45 Avenue Habib Thameur, Sousse', 'shipped', 'paid', 'paypal', [{ product_id: P[2].id, quantity: 1 }], 3);
    mkOrder(dropshipper.id, fournisseurB.id, 'Rami T', '+216 22 010 303', 'Sfax', 'Sfax', '8 Boulevard, Sfax', 'confirmed', 'unpaid', 'cod', [{ product_id: P[4].id, quantity: 2 }, { product_id: P[5].id, quantity: 1 }], 1);
    mkOrder(dropshipper.id, fournisseurA.id, 'Nadia M', '+216 22 010 404', 'Nabeul', 'Hammamet', '23 Avenue Habib Bourguiba, Hammamet', 'pending', 'unpaid', 'cod', [{ product_id: P[6].id, quantity: 1 }], 0);

    // seed tracking steps for shipped/delivered orders
    const addTrack = (orderId: number, carrier: string, tracking_number: string, status: string, detail: string) => {
      const o = orders.find((x) => x.id === orderId)!;
      o.tracking.push({ id: ++tkid, order_id: orderId, carrier, tracking_number, status, detail, updated_at: now() });
    };
    addTrack(orders[0].id, 'DHL', 'DHL-ALG-88231', 'Delivered', 'Delivered to recipient');
    addTrack(orders[0].id, 'DHL', 'DHL-ALG-88231', 'Shipped', 'Package handed to carrier');
    addTrack(orders[1].id, 'Yalidine', 'YLD-55410', 'Shipped', 'In transit - sorting center');

    ratings.push(
      { id: ++rid, product_id: P[0].id, user_id: dropshipper.id, score: 5, comment: 'Fast delivery and great quality.', created_at: now() },
      { id: ++rid, product_id: P[4].id, user_id: dropshipper.id, score: 4, comment: 'Good value for money.', created_at: now() }
    );

    tickets.push(
      { id: ++tid, user_id: dropshipper.id, email: 'dropshipper@demo.com', type: 'Commande', message: "I can't see the tracking number for one of my commands.", status: 'answered', answer: 'The supplier just added it — check the order detail page.', assigned_to: null, created_at: now() },
      { id: ++tid, user_id: dropshipper.id, email: 'dropshipper@demo.com', type: 'Paiement', message: 'My payment with COD was not confirmed yet.', status: 'open', answer: null, assigned_to: null, created_at: now() }
    );

    savedProducts.push(
      { id: ++suid, dropshipper_id: dropshipper.id, product_id: P[0].id, my_price: null, offer_type: 'dropshipping', created_at: now() },
      { id: ++suid, dropshipper_id: dropshipper.id, product_id: P[1].id, my_price: null, offer_type: 'dropshipping', created_at: now() },
      { id: ++suid, dropshipper_id: dropshipper.id, product_id: P[4].id, my_price: null, offer_type: 'wholesale', created_at: now() }
    );

    productUpdates.push(
      { id: ++puid, product_id: P[0].id, changed_field: 'price', old_value: '42.00', new_value: '39.90', created_at: now() },
      { id: ++puid, product_id: P[0].id, changed_field: 'stock', old_value: '100', new_value: '120', created_at: now() },
      { id: ++puid, product_id: P[4].id, changed_field: 'price', old_value: '35.00', new_value: '32.00', created_at: now() },
      { id: ++puid, product_id: P[1].id, changed_field: 'stock', old_value: '90', new_value: '80', created_at: now() }
    );

    returns.push(
      { id: ++rtid, order_id: orders[0].id, order_number: orders[0].order_number, dropshipper_id: dropshipper.id, dropshipper_name: dropshipper.name, type: 'retour', reason: 'Product arrived damaged', attachments: [], status: 'approved', reply: 'Return accepted — send it back and you will be refunded.', created_at: now(),
        created_by: 'Seller', retailer_name: 'My Shopping', retailer_code: 'MJ-1148', retailer_premium: false, return_address: 'Tunis, El Menzah 6, Rue 6182', destination_warehouse: 'Agence Tunis', product_name: 'Wireless Bluetooth Earbuds', product_variation: 'Couleur: Noir', product_qty: 1, approval_status: 'approved', exchange_delivery_status: 'on_its_way', exchange_shipment_id: 560042, return_delivery_status: 'awaiting_arrival', dispute_status: null, accepted_at: null, received_at: null, inspection: true, delivery_type: 'Self Delivery', process_type: 'DIRECT RETURN', carrier: orders[0].delivery_company ?? null, governorate: orders[0].governorate, city: orders[0].city }
    );
  }

  function userPublic(u: DbUser) {
    return { id: u.id, name: u.name, email: u.email, role: u.role, photo: u.photo, cin: u.cin, created_at: u.created_at };
  }

  function decorateProduct(p: DbProduct): ProductWithSupplier {
    const sup = users.find((u) => u.id === p.fournisseur_id);
    return { ...clone(p), fournisseur_name: sup?.name ?? 'Unknown' };
  }

  function productStatsOf(productId: number): ProductStats {
    let created = 0;
    let confirmed = 0;
    let profit = 0;
    for (const o of orders) {
      const item = o.items.find((i) => i.product_id === productId);
      if (!item || o.status === 'cancelled') continue;
      created++;
      if (o.status === 'confirmed' || o.status === 'shipped' || o.status === 'delivered') confirmed++;
      profit += (item.price - item.cost) * item.quantity;
    }
    const returnCount = returns.filter((r) => {
      const o = orders.find((x) => x.id === r.order_id);
      return !!o && o.items.some((i) => i.product_id === productId);
    }).length;
    return { created, confirmed, returns: returnCount, profit: round2(profit) };
  }

  /** Platform takes 3% of the total on delivery; the dropshipper's profit is reduced by it. */
  function applyDeliveryCommission(o: OrderFull): void {
    if (o.status !== 'delivered') return;
    if (o.commission == null || o.commission === 0) {
      o.commission = round2(o.total * 0.03);
      o.profit = round2(o.total - o.total_cost - o.commission);
    }
  }

  /** Remaining units the chef/supplier still owe a product across all unshipped open orders.
   *  demand − (claimed from retour pool) − (already stored/committed for those orders). */
  function remainingToProvide(productId: number): number {
    let demand = 0;
    let claimed = 0;
    for (const o of orders) {
      if (!['pending', 'confirmed'].includes(o.status)) continue;
      for (const it of o.items) {
        if (it.product_id === productId) {
          demand += it.quantity;
          claimed += it.house_qty ?? 0;
        }
      }
    }
    const committed = products.find((x) => x.id === productId)?.committed_stock ?? 0;
    return Math.max(0, demand - claimed - committed);
  }

  /** When an order ships, the fulfillment units stored for it leave the inventories and drop out of committed_stock. */
  function releaseCommittedForOrder(orderId: number): void {
    const o = orders.find((x) => x.id === orderId);
    if (!o) return;
    for (const it of o.items) {
      const supplier = it.supplier_qty ?? 0;
      if (supplier <= 0) continue;
      const pid = it.product_id;
      let remaining = supplier;
      for (const inv of inventories.slice().sort((a, b) => a.id - b.id)) {
        if (remaining <= 0) break;
        const slot = inv.items.find((x) => x.product_id === pid);
        if (!slot || slot.quantity <= 0) continue;
        const take = Math.min(slot.quantity, remaining);
        slot.quantity -= take;
        remaining -= take;
      }
      const prod = products.find((x) => x.id === pid);
      if (prod) prod.committed_stock = Math.max(0, (prod.committed_stock ?? 0) - supplier);
    }
  }

  /** Put the retour-pool units a commande claimed back into the pool (used when a pending commande is cancelled). */
  function restorePoolForOrder(o: OrderFull): void {
    for (const it of o.items) {
      const claimed = it.house_qty ?? 0;
      if (claimed <= 0) continue;
      const p = products.find((x) => x.id === it.product_id);
      if (p) p.house_stock = (p.house_stock ?? 0) + claimed;
    }
  }

  /** Only when a commande is finally confirmed do the chef + involved fournisseurs learn how many units to make ready. */
  function notifyStockRequestsForOrder(o: OrderFull): void {
    const items = o.items.filter((it) => (it.supplier_qty ?? 0) > 0);
    if (items.length === 0) return;
    const ds = users.find((u) => u.id === o.dropshipper_id);
    const dropshipperName = ds?.name ?? 'A dropshipper';
    const chefs = users.filter((u) => u.role === 'admin');
    for (const it of items) {
      const totalToProvide = remainingToProvide(it.product_id);
      const title = '📦 Products to make ready';
      const body = `Dropshippers need ${totalToProvide} × "${it.product_name}" (${it.supplier_qty ?? 0} from ${dropshipperName}'s commande) but retour/house stock can't cover it — please make ${totalToProvide} ready for the chef to pick up.`;
      notifications.push({ id: ++nid, user_id: it.fournisseur_id, type: 'stock_request', title, body, product_id: it.product_id, is_read: false, created_at: now() });
      for (const c of chefs) {
        notifications.push({ id: ++nid, user_id: c.id, type: 'stock_request', title, body, product_id: it.product_id, is_read: false, created_at: now() });
      }
    }
  }

  function decorateOrder(o: OrderFull): OrderFull {
    const d = users.find((u) => u.id === o.dropshipper_id);
    const supplierNames = [...new Set(o.items.map((i) => i.fournisseur_name).filter(Boolean))];
    const fournisseur_name = supplierNames.length > 1 ? supplierNames.join(' & ') : (supplierNames[0] ?? 'Unknown');
    const shipped_at = o.shipped_at ?? null;
    const delivered_at = o.delivered_at ?? null;
    const auto_deliver_at = shipped_at && !delivered_at ? addHours(shipped_at, 12) : null;
    return {
      ...clone(o),
      auto_deliver_at,
      dropshipper_name: d?.name ?? 'Unknown',
      dropshipper_cin: d?.cin ?? null,
      fournisseur_name,
      items: [...o.items].map((i) => ({ ...i })),
      tracking: [...o.tracking].map((t) => ({ ...t })),
    };
  }

  function fullOrder(base: DbOrder, items: OrderItem[]): OrderFull {
    const total = round2(items.reduce((s, i) => s + i.price * i.quantity, 0));
    const total_cost = round2(items.reduce((s, i) => s + i.cost * i.quantity, 0));
    const barcode = base.barcode ?? `D42-CMD-${String(base.id).padStart(6, '0')}`;
    const created = base.created_at;
    let confirmed_at = base.confirmed_at ?? null;
    let shipped_at = base.shipped_at ?? null;
    let delivered_at = base.delivered_at ?? null;
    if (base.status === 'confirmed' && !confirmed_at) confirmed_at = created;
    if (base.status === 'shipped') { if (!confirmed_at) confirmed_at = created; if (!shipped_at) shipped_at = created; }
    if (base.status === 'delivered') { if (!confirmed_at) confirmed_at = created; if (!shipped_at) shipped_at = created; if (!delivered_at) delivered_at = created; }
    return {
      ...base,
      barcode,
      total,
      total_cost,
      profit: round2(total - total_cost),
      confirmed_at,
      shipped_at,
      delivered_at,
      returned_at: base.returned_at ?? null,
      auto_deliver_at: shipped_at ? addHours(shipped_at, 12) : null,
      dropshipper_name: '',
      dropshipper_cin: null,
      fournisseur_name: '',
      items: items.map((i) => ({ ...i })),
      tracking: [],
    };
  }

  seed();

  function invDetailOf(i: { id: number; code: string; name: string; location: string | null; capacity: number; created_at: string; items: { product_id: number; quantity: number }[] }): InventoryDetail {
    const items = i.items
      .map((it) => {
        const p = products.find((x) => x.id === it.product_id);
        return { product_id: it.product_id, product_name: p?.name ?? 'Unknown product', image_url: p?.image_url ?? null, quantity: it.quantity };
      })
      .sort((a, b) => b.quantity - a.quantity);
    return {
      id: i.id,
      code: i.code,
      name: i.name,
      location: i.location,
      capacity: i.capacity,
      used: i.items.reduce((s, it) => s + it.quantity, 0),
      item_count: i.items.length,
      created_at: i.created_at,
      items,
    };
  }

  return {
    async findUserByEmail(email) {
      return clone(users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null);
    },
    async findUserById(id) {
      return clone(users.find((u) => u.id === id) ?? null);
    },
    async createUser(input) {
      const u: DbUser = { id: ++uid, name: input.name, email: input.email, password_hash: input.password_hash, role: input.role, photo: input.photo ?? null, cin: input.cin ?? null, created_at: now() };
      users.push(u);
      return clone(u);
    },
    async listUsers() {
      return users.map(userPublic);
    },
    async updateUser(id, patch) {
      const u = users.find((x) => x.id === id);
      if (!u) return;
      if (patch.name !== undefined) u.name = patch.name;
      if (patch.role !== undefined) u.role = patch.role;
      if (patch.photo !== undefined) u.photo = patch.photo;
      if (patch.cin !== undefined) u.cin = patch.cin ?? null;
    },
    async deleteUser(id) {
      const i = users.findIndex((x) => x.id === id);
      if (i >= 0) users.splice(i, 1);
    },

    async listProducts(opts) {
      let list = clone(products);
      if (opts?.fournisseurId) list = list.filter((p) => p.fournisseur_id === opts.fournisseurId);
      if (opts?.activeOnly) list = list.filter((p) => p.is_active && p.moderation_status === 'approved');
      if (opts?.excludeCategories?.length) {
        const ex = opts.excludeCategories;
        list = list.filter((p) => {
          const offers = p.offers ?? [p.category];
          return !ex.some((c) => p.category === c || offers.includes(c));
        });
      }
      // hideIneligible not implemented for memory store (dev only)
      if (opts?.q) {
        const q = opts.q.toLowerCase();
        list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q) || (p.barcode ?? '').toLowerCase().includes(q));
      }
      return list.sort((a, b) => b.id - a.id).map((p) => {
        const d = decorateProduct(p);
        d.stats = productStatsOf(p.id);
        return d;
      });
    },
    async listStockingProducts(q) {
      let list = clone(products);
      if (q) {
        const ql = q.toLowerCase();
        list = list.filter((p) => p.name.toLowerCase().includes(ql) || (p.sku ?? '').toLowerCase().includes(ql) || (p.barcode ?? '').toLowerCase().includes(ql));
      }
      const orgRes = searchSupplierOrganizations({ page: 1, per_page: 2000 });
      const orgByEmail = new Map(orgRes.rows.map((o) => [o.email, o]));
      return list.sort((a, b) => b.id - a.id).map((p) => {
        const d = decorateProduct(p) as StockingProduct;
        d.stats = productStatsOf(p.id);
        const u = users.find((u) => u.id === p.fournisseur_id);
        const org = orgByEmail.get(u?.email ?? '');
        d.supplier_email = u?.email ?? null;
        d.supplier_phone = org?.phone_full ?? null;
        d.supplier_org_name = org?.org_name ?? null;
        d.supplier_city = org?.city ?? null;
        d.supplier_account_manager = org?.account_manager ?? null;
        return d;
      });
    },
    async moderateProduct(id, status, note) {
      const p = products.find((x) => x.id === id);
      if (!p) return;
      p.is_active = status === 'approved';
      p.moderation_status = status;
      p.moderation_note = note ?? null;
    },
    async getProduct(id) {
      return clone(products.find((p) => p.id === id) ?? null);
    },
    async createProduct(input) {
      const images = input.images ?? (input.image_url ? [input.image_url] : []);
      const videos = input.videos ?? (input.video_url ? [input.video_url] : []);
      const p: DbProduct = {
        id: ++pid,
        fournisseur_id: input.fournisseur_id,
        name: input.name,
        description: input.description ?? null,
        price: input.price,
        cost_price: input.cost_price,
        category: input.category ?? 'dropshipping',
        offers: input.offers?.length ? input.offers : [input.category ?? 'dropshipping'],
        retail_category: input.retail_category ?? null,
        height: input.height ?? null,
        length: input.length ?? null,
        width: input.width ?? null,
        weight: input.weight ?? null,
        stock: input.stock,
        sku: input.sku ?? null,
        barcode: input.barcode ?? null,
        image_url: images[0] ?? null,
        video_url: videos[0] ?? null,
        images,
        videos,
        keywords: input.keywords ?? [],
        specifications: input.specifications ?? [],
        wholesale_tiers: input.wholesale_tiers ?? [],
        is_active: false,
        moderation_status: 'pending' as const,
        moderation_note: null,
        rating: 0,
        rating_count: 0,
        created_at: now(),
      };
      products.push(p);
      return clone(p);
    },
    async updateProduct(id, patch) {
      const p = products.find((x) => x.id === id);
      if (!p) return;
      if (patch.name !== undefined) p.name = patch.name;
      if (patch.description !== undefined) p.description = patch.description ?? null;
      if (patch.price !== undefined) p.price = patch.price;
      if (patch.cost_price !== undefined) p.cost_price = patch.cost_price;
      if (patch.category !== undefined) p.category = patch.category;
      if (patch.offers !== undefined) p.offers = patch.offers.length ? patch.offers : [p.category];
      if (patch.retail_category !== undefined) p.retail_category = patch.retail_category ?? null;
      if (patch.height !== undefined) p.height = patch.height ?? null;
      if (patch.length !== undefined) p.length = patch.length ?? null;
      if (patch.width !== undefined) p.width = patch.width ?? null;
      if (patch.weight !== undefined) p.weight = patch.weight ?? null;
      if (patch.stock !== undefined) p.stock = patch.stock;
      if (patch.sku !== undefined) p.sku = patch.sku ?? null;
      if (patch.barcode !== undefined) p.barcode = patch.barcode ?? null;
      if (patch.images !== undefined) {
        p.images = patch.images ?? [];
        p.image_url = p.images[0] ?? null;
      }
      if (patch.videos !== undefined) {
        p.videos = patch.videos ?? [];
        p.video_url = p.videos[0] ?? null;
      }
      if (patch.keywords !== undefined) p.keywords = patch.keywords ?? [];
      if (patch.specifications !== undefined) p.specifications = patch.specifications ?? [];
      if (patch.wholesale_tiers !== undefined) p.wholesale_tiers = patch.wholesale_tiers ?? [];
      if (patch.is_active !== undefined) p.is_active = !!patch.is_active;
    },
    async nextBarcode() {
      const max = products.reduce((m, p) => Math.max(m, Number(p.barcode) || 0), 2000000000000);
      return String(max + 1);
    },
    async deleteProduct(id) {
      const i = products.findIndex((x) => x.id === id);
      if (i >= 0) products.splice(i, 1);
    },
    async setStock(id, stock) {
      const p = products.find((x) => x.id === id);
      if (p) p.stock = Math.max(0, stock);
    },
    async updateRating(id, avg, count) {
      const p = products.find((x) => x.id === id);
      if (p) {
        p.rating = round2(avg);
        p.rating_count = count;
      }
    },
    async insertRating(input) {
      ratings.push({ id: ++rid, product_id: input.product_id, user_id: input.user_id, score: input.score, comment: input.comment ?? null, created_at: now() });
    },
    async getProductRatings(productId) {
      const rs = ratings.filter((r) => r.product_id === productId);
      const avg = rs.length ? rs.reduce((s, r) => s + r.score, 0) / rs.length : 0;
      return { avg: round2(avg), count: rs.length };
    },

    async listOrders(opts) {
      await this.finalizeAutoDeliveries();
      let list = clone(orders);
      if (opts.role === 'customer') list = list.filter((o) => o.dropshipper_id === opts.userId);
      if (opts.role === 'seller') list = list.filter((o) => o.items.some((it) => products.find((p) => p.id === it.product_id)?.fournisseur_id === opts.userId));
      if (opts.role === 'seller') list = list.filter((o) => o.status !== 'draft' || o.dropshipper_id === opts.userId);
      else if (opts.role !== 'customer' && opts.role !== 'admin') list = list.filter((o) => o.status !== 'draft');
      return list.sort((a, b) => b.id - a.id).map(decorateOrder);
    },
    async getOrder(id) {
      await this.finalizeAutoDeliveries();
      const o = orders.find((x) => x.id === id);
      return o ? decorateOrder(o) : null;
    },
    async findOrderByCode(code) {
      await this.finalizeAutoDeliveries();
      const c = String(code).trim();
      const o = orders.find((x) => x.barcode === c || x.order_number === c);
      return o ? decorateOrder(o) : null;
    },
    async finalizeAutoDeliveries() {
      let changed = 0;
      for (const o of orders) {
        if (o.status !== 'shipped' || !o.shipped_at) continue;
        const shipped = parseTime(o.shipped_at);
        if (shipped !== null && Date.now() >= shipped + 12 * 3600 * 1000) {
          o.status = 'delivered';
          o.delivered_at = o.delivered_at ?? now();
          o.auto_deliver_at = null;
          if (o.payment_method === 'cod') o.payment_status = 'paid';
          applyDeliveryCommission(o);
          changed++;
        }
      }
      return changed;
    },
    async scanOrder(id, action: ScanAction, confirmedBy?: number | null) {
      await this.finalizeAutoDeliveries();
      const o = orders.find((x) => x.id === id);
      if (!o) throw new OrderScanError('not_found', 'Commande not found');
      if (action === 'confirm') {
        if (o.confirmed_at) throw new OrderScanError('conflict', 'This commande was already confirmed — a step can only be scanned once');
        if (o.status !== 'pending') throw new OrderScanError('conflict', `Cannot confirm a commande that is "${o.status}"`);
        o.status = 'confirmed';
        o.confirmed_at = now();
        o.confirmed_by = confirmedBy ?? null;
      } else if (action === 'shipping') {
        if (o.shipped_at) throw new OrderScanError('conflict', 'This commande was already marked shipped — a step can only be scanned once');
        if (o.status !== 'confirmed') throw new OrderScanError('invalid_state', 'Commande must be confirmed before it can be shipped');
        o.status = 'shipped';
        o.shipped_at = now();
        o.auto_deliver_at = addHours(o.shipped_at, 12);
        releaseCommittedForOrder(o.id);
      } else if (action === 'retour') {
        if (o.returned_at) throw new OrderScanError('conflict', 'This commande was already returned');
        if (o.status !== 'shipped') throw new OrderScanError('invalid_state', 'A retour is only possible after the commande has been shipped');
        o.status = 'retour';
        o.returned_at = now();
        o.auto_deliver_at = null;
        o.profit = round2(o.profit - 3);
        for (const it of o.items) {
          const p = products.find((x) => x.id === it.product_id);
          if (p) p.house_stock = (p.house_stock ?? 0) + it.quantity;
        }
        const ds = users.find((u) => u.id === o.dropshipper_id);
        returns.push({ id: ++rtid, order_id: o.id, order_number: o.order_number, dropshipper_id: o.dropshipper_id, dropshipper_name: ds?.name ?? 'Unknown', type: 'retour', reason: 'Retour scanné par le chef', attachments: [], status: 'processed', reply: 'Returned — the products were put back into house stock.', created_at: now(),
        created_by: null, retailer_name: null, retailer_code: null, retailer_premium: false, return_address: null, destination_warehouse: null, product_name: null, product_variation: null, product_qty: null, approval_status: null, exchange_delivery_status: null, exchange_shipment_id: null, return_delivery_status: null, dispute_status: null, accepted_at: null, received_at: null, inspection: false, delivery_type: null, process_type: null, carrier: o.delivery_company ?? null, governorate: o.governorate, city: o.city });
      }
      return decorateOrder(o);
    },
    async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
      const oi: OrderItem[] = [];
      const requestedFromSupplier: StockRequestItem[] = [];
      let firstFournisseurId = 0;
      for (const it of input.items) {
        const p = products.find((x) => x.id === it.product_id);
        if (!p) throw new Error(`Product ${it.product_id} not found`);
        if (!p.is_active && p.fournisseur_id !== input.dropshipper_id) throw new Error(`Product "${p.name}" is not available`);
        if (p.moderation_status === 'hidden') throw new Error(`Product "${p.name}" is hidden and cannot be ordered`);
        if (!firstFournisseurId) firstFournisseurId = p.fournisseur_id;
        const houseStock = p.house_stock ?? 0;
        const takeFromHouse = Math.min(it.quantity, houseStock);
        const fromSupplier = it.quantity - takeFromHouse;
        if (fromSupplier > 0 && p.stock < fromSupplier) {
          throw new StockError(`"${p.name}" only has ${p.stock} in supplier stock — not enough to provide the ${fromSupplier} units this commande needs.`);
        }
        p.house_stock = houseStock - takeFromHouse;
        if (fromSupplier > 0) {
          requestedFromSupplier.push({ product_id: p.id, product_name: p.name, quantity: fromSupplier, house_available: houseStock, fournisseur_id: p.fournisseur_id });
        }
        const sup = users.find((u) => u.id === p.fournisseur_id);
        const saved = savedProducts.find((s) => s.dropshipper_id === input.dropshipper_id && s.product_id === p.id);
        let price: number;
        if (input.offer_type === 'wholesale') {
          const tierPrice = resolveWholesalePrice(p.wholesale_tiers, it.quantity);
          price = tierPrice != null ? tierPrice : (saved?.my_price != null ? saved.my_price : p.price);
        } else {
          price = saved?.my_price != null ? saved.my_price : p.price;
        }
        oi.push({ id: ++oiid, order_id: 0, product_id: p.id, product_name: p.name, product_image: p.image_url, quantity: it.quantity, price, cost: p.cost_price, fournisseur_id: p.fournisseur_id, fournisseur_name: sup?.name ?? 'Unknown', house_qty: takeFromHouse, supplier_qty: fromSupplier });
      }

      // Whole-commande manual price: override per-line prices with a uniform unit price so the total equals the entered amount
      if (input.manual_price != null && input.manual_price > 0) {
        const totalQty = oi.reduce((s, it) => s + it.quantity, 0) || 1;
        const target = round2(input.manual_price);
        const unit = round2(target / totalQty);
        let assignedSum = 0;
        for (let i = 0; i < oi.length; i++) {
          const isLast = i === oi.length - 1;
          if (isLast) {
            const remaining = round2(target - assignedSum);
            const remQty = oi[i].quantity;
            oi[i] = { ...oi[i], price: round2(remaining / remQty) };
          } else {
            oi[i] = { ...oi[i], price: unit };
            assignedSum += round2(unit * oi[i].quantity);
          }
        }
      }

      const order = fullOrder(
        {
          id: ++oid,
          order_number: input.order_number,
          barcode: null,
          dropshipper_id: input.dropshipper_id,
          fournisseur_id: firstFournisseurId,
          customer_name: input.customer_name ?? null,
          customer_phone: input.customer_phone ?? null,
          governorate: input.governorate ?? null,
          city: input.city ?? null,
          shipping_address: input.shipping_address ?? null,
          delivery_company: null,
          delivery_status: null,
          locality_id: null,
          telephone2: null,
          commentaire: null,
          est_fragile: 'non',
          ouvrir_colis: 'non',
          nombre_article: input.nombre_article ?? null,
          nombre_echange: input.nombre_echange ?? 'non',
          status: 'draft',
          order_type: input.offer_type === 'fulfillment' ? 'fulfillment' : input.offer_type === 'wholesale' ? 'wholesale' : 'dropshipping',
          payment_status: input.payment_method === 'cod' ? 'unpaid' : 'paid',
          payment_method: input.payment_method,
          total: 0,
          total_cost: 0,
          profit: 0,
          commission: 0,
          confirmed_at: null,
          confirmed_by: null,
          confirmed_by_name: null,
          shipped_at: null,
          delivered_at: null,
          returned_at: null,
          auto_deliver_at: null,
          created_at: now(),
        },
        oi
      );
      if (input.manual_price != null && input.manual_price > 0) order.total = round2(input.manual_price);
      orders.push(order);
      return { order: decorateOrder(order), requestedFromSupplier };
    },
    async updateOrderStatus(id, status) {
      const o = orders.find((x) => x.id === id);
      if (!o) return;
      const prev = o.status;
      if (status === 'pending') {
        if (prev !== 'draft') return;
        o.status = 'pending';
        notifyStockRequestsForOrder(o);
        return;
      }
      if (status === 'confirmed') {
        if (prev !== 'pending') return;
        o.status = 'confirmed';
        o.confirmed_at = o.confirmed_at ?? now();
        return;
      }
      if (status === 'cancelled') {
        if (prev === 'pending' || prev === 'draft') {
          restorePoolForOrder(o);
          releaseCommittedForOrder(o.id);
        }
        o.status = 'cancelled';
        const picks: Array<{ order_id: number; status: OrderPickStatus; arrive_at: string; created_at: string }> = (globalThis as unknown as { __orderPicks?: Array<{ order_id: number; status: OrderPickStatus; arrive_at: string; created_at: string }> }).__orderPicks ?? [];
        for (const p of picks) {
          if (p.order_id === id && (p.status === 'unconfirmed' || p.status === 'confirmed')) p.status = 'cancelled';
        }
        return;
      }
      o.status = status;
      if (status === 'delivered') {
        o.delivered_at = o.delivered_at ?? now();
        o.auto_deliver_at = null;
        if (o.payment_method === 'cod') o.payment_status = 'paid';
        applyDeliveryCommission(o);
      }
    },
    async deleteOrder(id) {
      const idx = orders.findIndex((x) => x.id === id);
      if (idx === -1) return;
      const o = orders[idx];
      restorePoolForOrder(o);
      releaseCommittedForOrder(o.id);
      orders.splice(idx, 1);
    },
    async setDeliveryCompany(id, deliveryCompany) {
      const o = orders.find((x) => x.id === id);
      if (o) o.delivery_company = deliveryCompany;
    },
    async setDeliveryStatus(id, deliveryStatus) {
      const o = orders.find((x) => x.id === id);
      if (o) o.delivery_status = deliveryStatus;
    },
    async setOrderBarcode(id, barcode) {
      const o = orders.find((x) => x.id === id);
      if (o) o.barcode = barcode;
    },
    async updatePayment(id, payment_status, method) {
      const o = orders.find((x) => x.id === id);
      if (o) {
        o.payment_status = payment_status;
        if (method) o.payment_method = method;
      }
    },
    async addTracking(order_id, data) {
      const o = orders.find((x) => x.id === order_id);
      if (!o) throw new Error('Order not found');
      o.tracking.push({ id: ++tkid, order_id, carrier: data.carrier, tracking_number: data.tracking_number, status: data.status, detail: data.detail ?? null, updated_at: now() });
      if (data.status.toLowerCase() === 'shipped' && o.status === 'confirmed') {
        o.status = 'shipped';
        o.shipped_at = o.shipped_at ?? now();
        o.auto_deliver_at = addHours(o.shipped_at, 12);
        releaseCommittedForOrder(o.id);
      }
      if (data.status.toLowerCase() === 'delivered' && o.status === 'shipped') {
        o.status = 'delivered';
        o.delivered_at = o.delivered_at ?? now();
        o.auto_deliver_at = null;
        if (o.payment_method === 'cod') o.payment_status = 'paid';
        applyDeliveryCommission(o);
      }
    },

    async listTickets(opts) {
      let list = clone(tickets);
      if (opts.role !== 'admin') {
        list = list.filter((t) => t.user_id === opts.userId);
      }
      return list
        .sort((a, b) => b.id - a.id)
        .map((t) => {
          const u = users.find((x) => x.id === t.user_id);
          const a = t.assigned_to != null ? users.find((x) => x.id === t.assigned_to) : null;
          return { ...t, user_name: u?.name ?? 'Unknown', user_email: u?.email ?? '', assigned_to_name: a?.name ?? null } as TicketFull;
        });
    },
    async createTicket(input) {
      tickets.push({ id: ++tid, user_id: input.user_id, email: input.email, type: input.type, message: input.message, status: 'open', answer: null, assigned_to: input.assigned_to ?? null, created_at: now() });
    },
    async replyTicket(id, answer, status) {
      const t = tickets.find((x) => x.id === id);
      if (t) {
        t.answer = answer;
        t.status = status;
      }
    },

    async saveProduct(dropshipper_id, product_id, offer_type) {
      const exists = savedProducts.find((s) => s.dropshipper_id === dropshipper_id && s.product_id === product_id);
      if (!exists) savedProducts.push({ id: ++suid, dropshipper_id, product_id, my_price: null, offer_type: offer_type === 'wholesale' ? 'wholesale' : 'dropshipping', created_at: now() });
      else exists.offer_type = offer_type === 'wholesale' ? 'wholesale' : 'dropshipping';
    },
    async setSavedProductPrice(dropshipper_id, product_id, price) {
      const s = savedProducts.find((x) => x.dropshipper_id === dropshipper_id && x.product_id === product_id);
      if (s) s.my_price = price;
    },
    async removeSavedProduct(dropshipper_id, product_id) {
      const i = savedProducts.findIndex((s) => s.dropshipper_id === dropshipper_id && s.product_id === product_id);
      if (i >= 0) savedProducts.splice(i, 1);
    },
    async listSavedProducts(dropshipper_id) {
      const mine = savedProducts.filter((s) => s.dropshipper_id === dropshipper_id).sort((a, b) => b.id - a.id);
      const out: SavedProductView[] = [];
      for (const s of mine) {
        const p = products.find((x) => x.id === s.product_id);
        if (!p) continue;
        out.push({
          id: s.id,
          saved_at: s.created_at,
          my_price: s.my_price,
          offer_type: s.offer_type,
          product: decorateProduct(p),
          updates: productUpdates
            .filter((u) => u.product_id === p.id)
            .sort((a, b) => b.id - a.id)
            .map((u) => clone(u)) as ProductUpdate[],
        });
      }
      return out;
    },
    async logProductUpdate(product_id, field, oldValue, newValue) {
      const stringify = (v: unknown) => (v === null || v === undefined ? null : String(v));
      const oldV = stringify(oldValue);
      const newV = stringify(newValue);
      if (oldV === newV) return;
      productUpdates.push({ id: ++puid, product_id, changed_field: field, old_value: oldV, new_value: newV, created_at: now() });
    },

    async createReturnRequest(input) {
      const order = orders.find((o) => o.id === input.order_id);
      const ds = users.find((u) => u.id === input.dropshipper_id);
      returns.push({
        id: ++rtid,
        order_id: input.order_id,
        order_number: order?.order_number ?? `#${input.order_id}`,
        dropshipper_id: input.dropshipper_id,
        dropshipper_name: ds?.name ?? 'Unknown',
        type: input.type,
        reason: input.reason,
        attachments: input.attachments ?? [],
        status: input.autoApproved ? 'approved' : 'pending',
        reply: null,
        created_at: now(),
        created_by: null,
        retailer_name: null,
        retailer_code: null,
        retailer_premium: false,
        return_address: null,
        destination_warehouse: null,
        product_name: null,
        product_variation: null,
        product_qty: null,
        approval_status: input.autoApproved ? 'approved' : 'waiting',
        exchange_delivery_status: input.type === 'echange' ? 'packed' : null,
        exchange_shipment_id: null,
        return_delivery_status: 'awaiting_arrival',
        dispute_status: null,
        accepted_at: null,
        received_at: null,
        inspection: false,
        delivery_type: 'Self Delivery',
        process_type: input.type === 'echange' ? 'SWAP & RETURN' : 'DIRECT RETURN',
        carrier: (order?.delivery_company as string | null) ?? null,
        governorate: order?.governorate ?? null,
        city: order?.city ?? null,
      });
      for (const it of order?.items ?? []) {
        const p = products.find((x) => x.id === it.product_id);
        if (p) p.house_stock = (p.house_stock ?? 0) + 1;
      }
    },
    async listReturnRequests(opts) {
      let list = clone(returns);
      if (opts.role === 'customer') list = list.filter((r) => r.dropshipper_id === opts.userId);
      else if (opts.role === 'seller') {
        const orderIds = new Set(orders.filter((o) => o.items.some((i) => i.fournisseur_id === opts.userId)).map((o) => o.id));
        list = list.filter((r) => orderIds.has(r.order_id));
      }
      return list.sort((a, b) => b.id - a.id);
    },
    async listRetourOrdersForChef(excludeOrderIds) {
      return orders
        .filter((o) => o.status === 'retour' && !excludeOrderIds.has(o.id))
        .sort((a, b) => b.id - a.id)
        .map((o) => {
          const ds = users.find((u) => u.id === o.dropshipper_id);
          return {
            order_id: o.id,
            order_number: o.order_number,
            dropshipper_name: ds?.name ?? null,
            governorate: o.governorate,
            city: o.city,
            delivery_company: o.delivery_company ?? null,
            created_at: o.created_at,
            items: o.items.map((i) => ({ product_name: i.product_name, quantity: i.quantity })),
          };
        });
    },
    async getReturnOrderProducts(orderIds) {
      const map = new Map<number, { product_name: string; quantity: number }[]>();
      for (const oid of orderIds) {
        const o = orders.find((x) => x.id === oid);
        if (o) map.set(oid, o.items.map((i) => ({ product_name: i.product_name, quantity: i.quantity })));
      }
      return map;
    },
    async updateReturnRequest(id, patch) {
      const r = returns.find((x) => x.id === id);
      if (r) {
        if (patch.status !== undefined) r.status = patch.status;
        if (patch.reply !== undefined) r.reply = patch.reply;
        if (patch.approval_status !== undefined) {
          r.approval_status = patch.approval_status;
          r.status = patch.approval_status === 'approved' ? 'approved' : patch.approval_status === 'rejected' ? 'rejected' : 'pending';
        }
        if (patch.delivery_type !== undefined) r.delivery_type = patch.delivery_type;
        if (patch.process_type !== undefined) r.process_type = patch.process_type;
        if (patch.carrier !== undefined) r.carrier = patch.carrier;
        if (patch.return_delivery_status !== undefined) r.return_delivery_status = patch.return_delivery_status;
        if (patch.exchange_delivery_status !== undefined) r.exchange_delivery_status = patch.exchange_delivery_status;
      }
    },

    async listTransferShipments() {
      return clone(transferShipments);
    },
    async listPickupRequests() {
      return clone(pickupRequests);
    },
    async listManifests() {
      return clone(manifests);
    },
    async getManifest(id: number) {
      const m = manifests.find((x) => x.id === id);
      if (!m) return null;
      return { ...clone(m), items: [] } as ManifestDetail;
    },
    async searchPackingBins(query: PackingBinsQuery): Promise<PackingBinsResult> {
      const q = (query.q ?? '').trim().toLowerCase();
      let matches = packingBins;
      if (q) matches = matches.filter((r) => `${r.name} ${r.reference} ${r.type}`.toLowerCase().includes(q));
      const total = matches.length;
      const start = (query.page - 1) * query.per_page;
      return { rows: clone(matches.slice(start, start + query.per_page)), total, page: query.page, per_page: query.per_page };
    },
    async createPackingBin(input) {
      const bin: PackingBin = { id: ++packingBinSeq, name: input.name, reference: input.reference ?? null, price: input.price ?? 0, cost: input.cost ?? 0, type: input.type, image: input.image ?? null, active: input.active ?? true, created_at: new Date().toISOString() };
      packingBins.unshift(bin);
      return clone(bin);
    },
    async getPackingBin(id: number) {
      return clone(packingBins.find((b) => b.id === id) ?? null);
    },
    async updatePackingBin(id: number, input) {
      const bin = packingBins.find((b) => b.id === id);
      if (!bin) return null;
      if (input.name !== undefined) bin.name = input.name;
      if (input.reference !== undefined) bin.reference = input.reference;
      if (input.price !== undefined) bin.price = input.price;
      if (input.cost !== undefined) bin.cost = input.cost;
      if (input.type !== undefined) bin.type = input.type;
      if (input.image !== undefined) bin.image = input.image;
      if (input.active !== undefined) bin.active = input.active;
      return clone(bin);
    },
    async deletePackingBin(id: number) {
      const idx = packingBins.findIndex((b) => b.id === id);
      if (idx === -1) return false;
      packingBins.splice(idx, 1);
      return true;
    },
    async listTransactions(): Promise<TransactionsResult> {
      return { transactions: clone(transactions), total: TRANSACTION_TOTAL };
    },
    async listReconciliationReviews() {
      return clone(reconciliationReviews);
    },
    async listSellerOrganizations(query) {
      void sellerOrganizationCount;
      return searchSellerOrganizations(query);
    },
    async getSellerOrganization(id: number) {
      return extraSellerOrgs.find((o) => o.id === id) ?? null;
    },
    async createSellerSignup(input: SellerSignupInput): Promise<SellerOrganization> {
      const now = new Date().toISOString();
      const org: SellerOrganization = {
        id: sellerOrganizationCount + extraSellerOrgs.length + 1,
        code: `SLR-${Math.floor(Math.random() * 900000 + 100000)}`,
        account_manager: null,
        business_developer: null,
        owner_name: input.owner_name,
        owner_photo: null,
        org_name: input.shop_name ?? null,
        phone: input.phone ?? '',
        email: input.email,
        tags: [...(input.tags ?? [])],
        joined_at: now,
        last_seen_at: now,
        onboarding: [],
        documents: 'none',
        follow_up_new: true,
        source: 'Signup',
        is_main_retailer: false,
        plus_membership: false,
        doc_files: {},
        doc_statuses: {},
      };
      extraSellerOrgs.push(org);
      return clone(org);
    },
    async updateSellerOrganizationTags(id: number, tags: string[]) {
      const org = extraSellerOrgs.find((o) => o.id === id);
      if (!org) return null;
      org.tags = [...tags];
      return clone(org);
    },
    async updateSellerOrganizationFlags(id: number, patch: { account_status?: string; allow_marketplace?: boolean; dropshipping_eligible?: boolean; doc_files?: Record<string, string>; doc_statuses?: Record<string, string> }) {
      const org = extraSellerOrgs.find((o) => o.id === id);
      if (!org) return null;
      if (patch.account_status !== undefined) org.account_status = patch.account_status;
      if (patch.allow_marketplace !== undefined) org.allow_marketplace = patch.allow_marketplace;
      if (patch.dropshipping_eligible !== undefined) org.dropshipping_eligible = patch.dropshipping_eligible;
      if (patch.doc_files !== undefined) org.doc_files = patch.doc_files;
      if (patch.doc_statuses !== undefined) org.doc_statuses = patch.doc_statuses;
      return clone(org);
    },
    async updateSellerOrganizationManagers(id: number, patch: UpdateSellerOrgManagersInput) {
      const org = extraSellerOrgs.find((o) => o.id === id);
      if (!org) return null;
      if (patch.account_manager !== undefined) org.account_manager = patch.account_manager;
      if (patch.business_developer !== undefined) org.business_developer = patch.business_developer;
      return clone(org);
    },
    async updateSellerOrganizationOnboarding(id: number, status: string): Promise<SellerOrganization | null> {
      const org = extraSellerOrgs.find((o) => o.id === id);
      if (!org) return null;
      org.onboarding = org.onboarding.map((item) => ({ ...item, ok: item.label === status }));
      return clone(org);
    },
    async setSellerFollowUp(id: number, followUp: SupplierFollowUp | null): Promise<SellerOrganization | null> {
      const org = extraSellerOrgs.find((o) => o.id === id);
      if (!org) return null;
      org.follow_up = followUp ? clone(followUp) : null;
      return clone(org);
    },
    async updateSellerFollowUp(id: number, patch: SupplierFollowUpPatch, actorName: string): Promise<SellerOrganization | null> {
      const org = extraSellerOrgs.find((o) => o.id === id);
      if (!org?.follow_up) return null;
      const next: SupplierFollowUp = { ...org.follow_up };
      if (patch.meeting !== undefined) next.meeting = patch.meeting;
      if (patch.note !== undefined) next.note = patch.note;
      if (patch.scheduled_at) next.scheduled_at = patch.scheduled_at;
      if (patch.confirmed !== undefined) next.confirmed = patch.confirmed;
      if (patch.outcome !== undefined) next.outcome = patch.outcome ?? undefined;
      if (patch.attachments !== undefined) next.attachments = patch.attachments ?? undefined;
      if (patch.tags !== undefined) {
        next.tags = [...patch.tags];
        next.label = patch.tags[0] ?? next.meeting;
      } else if (patch.meeting !== undefined && !next.tags?.length) {
        next.label = next.meeting;
      }
      if (patch.confirmed) next.by = actorName;
      org.follow_up = clone(next);
      return clone(org);
    },
    async findSellerOrganizationByEmail(email: string) {
      const all = [...searchSellerOrganizations({ page: 1, per_page: 1000 }).rows, ...extraSellerOrgs];
      return all.find((o) => o.email === email) ?? null;
    },
    async listStaffUsers() {
      return users.filter((u) => u.role === 'admin').map((u) => ({ id: u.id, name: u.name, role: u.role }));
    },
    async listSupplierOrganizations(query: SupplierOrganizationsQuery): Promise<SupplierOrganizationsResult> {
      const res = searchSupplierOrganizations(query);
      if (!extraSupplierOrgs.length) return { ...res, rows: res.rows.map(hydrateSupplierOrg) };
      const total = res.total + extraSupplierOrgs.length;
      let rows = res.rows.map(hydrateSupplierOrg);
      if (query.page === 1 && !query.q && !query.statuses?.length && !query.sources?.length) {
        rows = [...extraSupplierOrgs.map(hydrateSupplierOrg), ...rows].slice(0, query.per_page);
      }
      return { ...res, rows, total };
    },
    async createSupplierOrganization(input: CreateSupplierOrganizationInput): Promise<SupplierOrganization> {
      const nowIso = new Date().toISOString();
      const email = input.email.toLowerCase();
      if (users.some((u) => u.email.toLowerCase() === email)) throw new Error('A user account with this email already exists');
      users.push({ id: ++uid, name: `${input.first_name} ${input.last_name}`.trim(), email, password_hash: hash(input.password), role: 'seller' as const, photo: null, cin: null, created_at: nowIso });
      const row: SupplierOrganization = {
        id: 900001 + extraSupplierOrgs.length,
        code: `SO${1000 + extraSupplierOrgs.length}`,
        account_manager: null,
        owner_name: `${input.first_name} ${input.last_name}`.trim(),
        owner_photo: null,
        org_name: input.company_name,
        city: '',
        email: input.email.toLowerCase(),
        phone: '+216 ** *** **',
        phone_full: input.phone,
        tax_id: input.tax_id,
        registration_pct: 55,
        rne_code: String(Math.floor(100000 + Math.random() * 900000)),
        main_type_supplier: true,
        onboarding: [
          { label: 'Active', ok: true },
          { label: 'Has 0 added products', ok: false },
          { label: 'Has 0 active products', ok: false },
          { label: 'Has packing material', ok: false },
          { label: 'Has 0 active warehouses', ok: false },
          { label: 'Has active subscriptions', ok: false },
        ],
        documents: null,
        follow_up: null,
        source: 'Not attributed',
        labels: [],
        joined_at: nowIso,
        last_seen_at: nowIso,
      };
      extraSupplierOrgs.push(row);
      return clone(hydrateSupplierOrg(row));
    },
    async setSupplierFollowUp(id: number, followUp: SupplierFollowUp | null): Promise<SupplierOrganization | null> {
      const extra = extraSupplierOrgs.find((r) => r.id === id);
      if (extra) {
        extra.follow_up = followUp ? clone(followUp) : null;
        return clone(hydrateSupplierOrg(extra));
      }
      const base = getSupplierOrganization(id);
      if (!base) return null;
      return hydrateSupplierOrg({ ...base, follow_up: followUp ? clone(followUp) : null });
    },
    async updateSupplierFollowUp(id: number, patch: SupplierFollowUpPatch, actorName: string): Promise<SupplierOrganization | null> {
      const extra = extraSupplierOrgs.find((r) => r.id === id);
      const base = extra ?? getSupplierOrganization(id);
      if (!base?.follow_up) return null;
      const next: SupplierFollowUp = { ...base.follow_up };
      if (patch.meeting !== undefined) next.meeting = patch.meeting;
      if (patch.note !== undefined) next.note = patch.note;
      if (patch.scheduled_at) next.scheduled_at = patch.scheduled_at;
      if (patch.confirmed !== undefined) next.confirmed = patch.confirmed;
      if (patch.outcome !== undefined) next.outcome = patch.outcome ?? undefined;
      if (patch.attachments !== undefined) next.attachments = patch.attachments ?? undefined;
      if (patch.tags !== undefined) {
        next.tags = [...patch.tags];
        next.label = patch.tags[0] ?? next.meeting;
      } else if (patch.meeting !== undefined && !next.tags?.length) {
        next.label = next.meeting;
      }
      if (patch.confirmed) next.by = actorName;
      if (extra) extra.follow_up = clone(next);
      return hydrateSupplierOrg({ ...(extra ?? base), follow_up: clone(next) });
    },
    async getSupplierOrganizationDetail(id: number): Promise<SupplierOrganizationDetail | null> {
      const extra = extraSupplierOrgs.find((r) => r.id === id);
      if (extra) {
        const row = hydrateSupplierOrg(extra);
        return {
          ...row,
          about: null,
          role: 'supplier',
          entity_type: 'business',
          national_id: null,
          vat_code: null,
          branch_number: null,
          legal_name: null,
          related_seller: null,
          affiliated_by: null,
          call_schedule: false,
          orders_prep_average_time: null,
          fulfillment_rate: null,
          on_time_fulfillment_rate: null,
          allow_marketplace: false,
          dropshipping_eligible: false,
          account_status: 'active' as const,
          business_developer: null,
          doc_files: {},
          doc_statuses: {},
        };
      }
      const base = getSupplierOrganizationDetail(id);
      if (!base) return null;
      const labels = supplierLabelOverrides.get(id);
      const u = users.find((x) => x.email.toLowerCase() === base.email.toLowerCase());
      if (u && u.role === 'seller') {
        base.onboarding = buildLiveSupplierOnboarding({
          added: products.filter((p) => p.fournisseur_id === u.id).length,
          activeProducts: products.filter((p) => p.fournisseur_id === u.id && p.is_active && p.moderation_status === 'approved').length,
          warehouses: supplierWarehouses.filter((w) => w.fournisseur_id === u.id).length,
          subscriptions: 0,
        });
      }
      return labels ? { ...base, labels } : base;
    },
    async updateSupplierOrganizationFlags(id: number, patch: UpdateSupplierOrgFlagsInput): Promise<SupplierOrganizationDetail | null> {
      const cur = await this.getSupplierOrganizationDetail(id);
      if (!cur) return null;
      return {
        ...cur,
        account_status: patch.account_status ?? cur.account_status,
        allow_marketplace: patch.allow_marketplace ?? cur.allow_marketplace,
        dropshipping_eligible: patch.dropshipping_eligible ?? cur.dropshipping_eligible,
        account_manager: patch.account_manager !== undefined ? patch.account_manager : cur.account_manager,
        business_developer: patch.business_developer !== undefined ? patch.business_developer : cur.business_developer,
        doc_files: patch.doc_files ?? cur.doc_files,
        doc_statuses: patch.doc_statuses ?? cur.doc_statuses,
      };
    },
    async updateSupplierOrganizationLabels(id: number, labels: string[]): Promise<SupplierOrganizationDetail | null> {
      supplierLabelOverrides.set(id, [...labels]);
      return this.getSupplierOrganizationDetail(id);
    },
    async listStockRefillRequests(query: StockRefillRequestsQuery): Promise<StockRefillRequestsResult> {
      void query;
      return { rows: [], total: 0, filters: { statuses: ['Pending'] }, page: 1, per_page: 10 };
    },
    async getStockRefillPickupList() {
      return { suppliers: [] };
    },
    async createStockRefillRequest(): Promise<StockRefillRequest> {
      throw new Error('Stock refill requests require MySQL storage');
    },
    async getStockRefillRequest(): Promise<StockRefillRequest | null> {
      return null;
    },
    async updateStockRefillRequest(): Promise<StockRefillRequest | null> {
      return null;
    },
    async deleteStockRefillRequest(): Promise<boolean> {
      return false;
    },
    async listStorageRequests(query: StorageRequestsQuery): Promise<StorageRequestsResult> {
      void query;
      return { rows: [], total: 0, page: 1, per_page: 10 };
    },
    async getStorageRequest(): Promise<StorageRequest | null> {
      return null;
    },
    async getBatchesByCode(): Promise<StockBatchLookupRow[]> {
      return [];
    },
    async getOrderPickPlan(): Promise<PickPlan | null> {
      return null;
    },
    async scanOrderPick(): Promise<PickPlan | null> {
      return null;
    },
    async listOrdersPickability(): Promise<OrderPickabilityRow[]> {
      return [];
    },
    async listWholesaleOrders(): Promise<OrderFull[]> {
      return clone(orders.filter((o) => o.order_type === 'wholesale'));
    },
    async listCancelledOrders(): Promise<OrderFull[]> {
      return clone(orders.filter((o) => o.status === 'cancelled').sort((a, b) => b.id - a.id));
    },
    async listStockReturns(): Promise<StockReturnItem[]> {
      const ledger = getReturnLedger();
      const out: StockReturnItem[] = [];
      for (const o of orders) {
        if (o.status !== 'retour') continue;
        for (const it of o.items) {
          const storedQty = ledger.filter((l) => l.order_id === o.id && l.product_id === it.product_id).reduce((s, l) => s + l.quantity, 0);
          out.push({
            order_id: o.id,
            order_number: o.order_number,
            customer_name: o.customer_name,
            product_id: it.product_id,
            product_name: it.product_name,
            image_url: it.product_image,
            supplier_id: it.fournisseur_id,
            supplier_name: it.fournisseur_name || 'Unknown supplier',
            quantity: it.quantity,
            stored_qty: storedQty,
            pending: Math.max(0, it.quantity - storedQty),
            created_at: o.created_at,
          });
        }
      }
      return clone(out).sort((a, b) => a.supplier_name.localeCompare(b.supplier_name) || a.product_name.localeCompare(b.product_name));
    },
    async storeStockReturns(input: StoreStockReturnsInput): Promise<StockReturnsStoreResult> {
      const inv = inventories.find((i) => i.id === input.inventory_id);
      if (!inv) throw new Error('Inventory location not found');
      const all = await this.listStockReturns();
      const pendingLines = all.filter((r) => r.supplier_id === input.supplier_id && r.pending > 0);
      if (pendingLines.length === 0) throw new Error('No pending returned products for this supplier');
      const totalUnits = pendingLines.reduce((s, r) => s + r.pending, 0);
      const used = inv.items.reduce((s, i) => s + i.quantity, 0);
      const free = inv.capacity - used;
      if (totalUnits > free) throw new Error(`Not enough space in ${inv.name}: ${totalUnits} units to store but only ${free} free`);
      const ledger = getReturnLedger();
      for (const line of pendingLines) {
        const existing = ledger.find((l) => l.order_id === line.order_id && l.product_id === line.product_id && l.inventory_id === input.inventory_id);
        if (existing) existing.quantity += line.pending;
        else ledger.push({ order_id: line.order_id, product_id: line.product_id, inventory_id: input.inventory_id, quantity: line.pending });
        const invItem = inv.items.find((i) => i.product_id === line.product_id);
        if (invItem) invItem.quantity += line.pending;
        else inv.items.push({ product_id: line.product_id, quantity: line.pending });
      }
      return { stored_units: totalUnits, products: pendingLines.length, inventory_name: inv.name };
    },
    async scanStockReturn(input: StockReturnScanInput): Promise<StockReturnScanResult> {
      const code = input.code.trim();
      if (!code) throw new Error('Empty scan');
      const inv = inventories.find((i) => i.id === input.inventory_id);
      if (!inv) throw new Error('Inventory location not found');
      const prod = products.find((p) => p.barcode === code || p.sku === code || String(p.id) === code.replace(/^.*?(\d+)\s*$/, '$1'));
      if (!prod) throw new Error('Unknown product — this QR/barcode does not match any product');
      const all = await this.listStockReturns();
      const line = all.filter((r) => r.product_id === prod.id && r.pending > 0).sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
      if (!line) throw new Error(`No pending returned units of "${prod.name}"`);
      const used = inv.items.reduce((s, i) => s + i.quantity, 0);
      if (inv.capacity - used < 1) throw new Error(`Not enough space in ${inv.name} — location is full`);
      const ledger = getReturnLedger();
      const existing = ledger.find((l) => l.order_id === line.order_id && l.product_id === prod.id && l.inventory_id === input.inventory_id);
      if (existing) existing.quantity += 1;
      else ledger.push({ order_id: line.order_id, product_id: prod.id, inventory_id: input.inventory_id, quantity: 1 });
      const invItem = inv.items.find((i) => i.product_id === prod.id);
      if (invItem) invItem.quantity += 1;
      else inv.items.push({ product_id: prod.id, quantity: 1 });
      const remainingPending = (await this.listStockReturns()).filter((r) => r.product_id === prod.id).reduce((s, r) => s + r.pending, 0);
      return {
        product_name: prod.name,
        supplier_name: line.supplier_name,
        stored_units: 1,
        remaining_pending: remainingPending,
        inventory_name: inv.name,
      };
    },
    async listStockShipments(): Promise<StockShipmentOrder[]> {
      const eligible = orders.filter((o) => o.status === 'ready' || o.status === 'confirmed' || o.status === 'retour');
      return eligible.map((o) => {
        const autoZone = inferShipmentZone(o.governorate, o.city);
        const override = isShipmentZone(o.shipment_zone) ? o.shipment_zone : null;
        const items: StockShipmentItem[] = o.items.map((i) => ({
          product_id: i.product_id,
          product_name: i.product_name,
          image_url: i.product_image,
          quantity: i.quantity,
        }));
        const ds = users.find((u) => u.id === o.dropshipper_id);
        const fn = users.find((u) => o.items.length > 0 && o.items.every((i) => i.fournisseur_id === u.id));
        return {
          id: o.id,
          order_number: o.order_number,
          barcode: o.barcode,
          customer_name: o.customer_name,
          customer_phone: o.customer_phone,
          governorate: o.governorate,
          city: o.city,
          status: o.status,
          zone: override ?? autoZone,
          auto_zone: autoZone,
          zone_override: override !== null,
          items,
          total_units: items.reduce((s, it) => s + it.quantity, 0),
          dropshipper_name: ds?.name ?? null,
          fournisseur_name: fn?.name ?? null,
        };
      });
    },
    async setStockShipmentZone(orderId: number, zone: ShipmentZone | null): Promise<void> {
      const order = orders.find((o) => o.id === orderId);
      if (order) order.shipment_zone = zone;
    },
    async listChefShipments(): Promise<ShipmentRow[]> {
      return orders
        .filter((o) => o.status === 'shipped' || o.status === 'delivered' || o.status === 'retour')
        .sort((a, b) => b.id - a.id)
        .map((o) => {
          const ds = users.find((u) => u.id === o.dropshipper_id);
          const fn = users.find((u) => o.items.length > 0 && o.items.every((i) => i.fournisseur_id === u.id));
          const it = o.items[0];
          return {
            id: o.id,
            order_number: o.order_number,
            order_type: o.order_type ?? 'dropshipping',
            dropshipper_name: ds?.name ?? null,
            dropshipper_phone: null,
            fournisseur_name: fn?.name ?? null,
            fulfiller: null,
            warehouse: null,
            created_at: o.created_at,
            shipped_at: o.shipped_at ?? null,
            delivered_at: o.delivered_at ?? null,
            returned_at: o.returned_at ?? null,
            status: o.status,
            customer_name: o.customer_name,
            customer_phone: o.customer_phone,
            governorate: o.governorate,
            city: o.city,
            product_name: it?.product_name ?? '',
            product_variation: null,
            quantity: it?.quantity ?? 0,
            image_url: it?.product_image ?? null,
            total: o.total,
            total_cost: o.total_cost,
            tracking: o.tracking.map((t) => ({ carrier: t.carrier, tracking_number: t.tracking_number })),
          };
        });
    },
    async getChefShipment(id: number): Promise<ShipmentRow | null> {
      const o = orders.find((x) => x.id === id);
      if (!o) return null;
      const ds = users.find((u) => u.id === o.dropshipper_id);
      const fn = users.find((u) => o.items.length > 0 && o.items.every((i) => i.fournisseur_id === u.id));
      const it = o.items[0];
      return {
        id: o.id,
        order_number: o.order_number,
        order_type: o.order_type ?? 'dropshipping',
        dropshipper_name: ds?.name ?? null,
        dropshipper_phone: null,
        fournisseur_name: fn?.name ?? null,
        fulfiller: null,
        warehouse: null,
        created_at: o.created_at,
        shipped_at: o.shipped_at ?? null,
        delivered_at: o.delivered_at ?? null,
        returned_at: o.returned_at ?? null,
        status: o.status,
        customer_name: o.customer_name,
        customer_phone: o.customer_phone,
        governorate: o.governorate,
        city: o.city,
        product_name: it?.product_name ?? '',
        product_variation: null,
        quantity: it?.quantity ?? 0,
        image_url: it?.product_image ?? null,
        total: o.total,
        total_cost: o.total_cost,
        tracking: o.tracking.map((t) => ({ carrier: t.carrier, tracking_number: t.tracking_number })),
      };
    },
    async listOrderPicks(): Promise<OrderPickRow[]> {
      const picks: Array<{ order_id: number; status: OrderPickStatus; arrive_at: string; created_at: string }> = (globalThis as unknown as { __orderPicks?: Array<{ order_id: number; status: OrderPickStatus; arrive_at: string; created_at: string }> }).__orderPicks ?? [];
      return picks.map((p) => {
        const o = orders.find((x) => x.id === p.order_id);
        if (!o) return null;
        const autoZone = inferShipmentZone(o.governorate, o.city);
        const override = isShipmentZone(o.shipment_zone) ? o.shipment_zone : null;
        const items: StockShipmentItem[] = o.items.map((i) => ({ product_id: i.product_id, product_name: i.product_name, image_url: i.product_image, quantity: i.quantity }));
        return {
          id: p.order_id,
          order_id: p.order_id,
          order_number: o.order_number,
          barcode: o.barcode,
          dropshipper_name: (users.find((u) => u.id === o.dropshipper_id)?.name) ?? null,
          destinator: o.customer_name,
          destination: o.city,
          governorate: o.governorate,
          agence: (override ?? autoZone) as ShipmentZone | null,
          delivery_company: o.delivery_company ?? null,
          delivery_status: o.delivery_status ?? null,
          total: o.total,
          created_at: o.created_at,
          arrive_at: p.arrive_at,
          status: p.status,
          items,
        };
      }).filter(Boolean) as OrderPickRow[];
    },
    async createOrderPick(orderId: number): Promise<OrderPickRow | null> {
      const picks: Array<{ order_id: number; status: OrderPickStatus; arrive_at: string; created_at: string }> = (globalThis as unknown as { __orderPicks?: Array<{ order_id: number; status: OrderPickStatus; arrive_at: string; created_at: string }> }).__orderPicks ?? [];
      if (!picks.find((p) => p.order_id === orderId)) {
        const o = orders.find((x) => x.id === orderId);
        if (!o) return null;
        const arriveAt = addBusinessDays(new Date(o.created_at), 2);
        picks.push({ order_id: orderId, status: 'unconfirmed', arrive_at: arriveAt.toISOString().slice(0, 10), created_at: o.created_at });
        (globalThis as unknown as { __orderPicks: typeof picks }).__orderPicks = picks;
      }
      return (await this.listOrderPicks()).find((r) => r.order_id === orderId) ?? null;
    },
    async scanOrderPickStatus(orderId: number): Promise<OrderPickRow | null> {
      const o = orders.find((x) => x.id === orderId);
      if (!o) return null;
      if (o.status === 'cancelled') throw new Error('This commande is cancelled');
      const picks: Array<{ order_id: number; status: OrderPickStatus; arrive_at: string; created_at: string }> = (globalThis as unknown as { __orderPicks?: Array<{ order_id: number; status: OrderPickStatus; arrive_at: string; created_at: string }> }).__orderPicks ?? [];
      const pick = picks.find((p) => p.order_id === orderId);
      if (!pick) return null;
      if (pick.status === 'cancelled') throw new Error('This commande is cancelled');
      if (pick.status === 'unconfirmed') pick.status = 'confirmed';
      else if (pick.status === 'confirmed') pick.status = 'shipped';
      else if (pick.status === 'shipped') pick.status = 'return';
      if (pick.status === 'return') {
        const o2 = orders.find((x) => x.id === orderId);
        if (o2) o2.status = 'retour';
      }
      return (await this.listOrderPicks()).find((r) => r.order_id === orderId) ?? null;
    },
    async findSupplierOrgByEmail(email: string): Promise<{ allow_marketplace: boolean; dropshipping_eligible: boolean; account_status: string; labels: string[] } | null> {
      const org = (globalThis as unknown as { __supplierOrgs?: Array<{ email: string; allow_marketplace: boolean; dropshipping_eligible: boolean; account_status: string; labels?: string[] }> }).__supplierOrgs?.find((o) => o.email === email);
      return org
        ? { allow_marketplace: org.allow_marketplace, dropshipping_eligible: org.dropshipping_eligible, account_status: org.account_status, labels: Array.isArray(org.labels) ? org.labels : [] }
        : null;
    },
    async listProductSubscriptions(query) {
      void productSubscriptionCount;
      return searchProductSubscriptions(query);
    },
    async getProductSubscription(id) {
      return getProductSubscription(id);
    },
    async updateProductSubscription(id, patch: SubscriptionPatch) {
      return updateProductSubscription(id, patch);
    },
    async listCollections() {
      return { collections: clone(collections), total: collections.length };
    },
    async getCollection(id) {
      const c = collections.find((x) => x.id === id);
      if (!c) return null;
      return buildDetail(c);
    },
    async createCollection(input, actor) {
      const nextId = Math.max(0, ...collections.map((c) => c.id)) + 1;
      const nowIso = new Date().toISOString();
      const isActive = input.is_active ?? false;
      const ids = input.product_ids ?? [];
      const entry: Collection = {
        id: nextId,
        title: input.title,
        description: input.description ?? '',
        products: ids.length,
        created_at: nowIso,
        status: isActive ? 'Active' : 'Draft',
        is_active: isActive,
        marketplace_sort_rank: input.marketplace_sort_rank ?? null,
      };
      collections.push(entry);
      collectionDetails.set(nextId, {
        is_active: isActive,
        marketplace_sort_rank: input.marketplace_sort_rank ?? null,
        product_ids: ids,
      });
      collectionItems.set(nextId, buildItemsFor(ids));
      return buildDetail(entry)!;
    },
    async updateCollection(id, input, actor) {
      const idx = collections.findIndex((x) => x.id === id);
      if (idx < 0) return null;
      const prev = collections[idx]!;
      const ids = input.product_ids;
      const updated: Collection = {
        ...prev,
        title: input.title ?? prev.title,
        description: input.description ?? prev.description,
        is_active: input.is_active ?? prev.is_active,
        status: input.is_active ?? prev.is_active ? 'Active' : 'Draft',
        marketplace_sort_rank: input.marketplace_sort_rank !== undefined ? input.marketplace_sort_rank : prev.marketplace_sort_rank,
      };
      if (ids) {
        updated.products = ids.length;
        collectionItems.set(id, buildItemsFor(ids));
      }
      collections[idx] = updated;
      return buildDetail(updated);
    },
    async addProductToCollection(collectionId: number, productId: number, _actor: string): Promise<CollectionDetail> {
      const c = collections.find((x) => x.id === collectionId);
      if (!c) throw new Error('Collection not found');
      const existing = collectionItems.get(collectionId) ?? [];
      if (!existing.some((i) => i.id === productId)) {
        const p = catalogProducts.find((x) => x.id === productId);
        if (p) {
          existing.push({
            id: p.id,
            name: p.name,
            emoji: p.emoji,
            image_url: p.image_url,
            eligible_to_marketplace: p.eligible_to_marketplace,
            offer_type: p.offer_type,
            added_by: null,
            added_at: new Date().toISOString(),
          });
          collectionItems.set(collectionId, existing);
          c.products = existing.length;
        }
      }
      return buildDetail(c)!;
    },
    async removeProductFromCollection(collectionId: number, productId: number, _actor: string): Promise<CollectionDetail> {
      const c = collections.find((x) => x.id === collectionId);
      if (!c) throw new Error('Collection not found');
      const existing = collectionItems.get(collectionId) ?? [];
      const next = existing.filter((i) => i.id !== productId);
      collectionItems.set(collectionId, next);
      c.products = next.length;
      return buildDetail(c)!;
    },
    async listCollectionCatalog() {
      return clone(catalogProducts);
    },

    async supplierFinance() {
      const fournisseurs = users.filter((u) => u.role === 'seller');
      return fournisseurs.map((f) => {
        let total_orders = 0;
        let earned = 0;
        for (const o of orders) {
          if (o.status === 'cancelled') continue;
          const mine = o.items.filter((it) => products.find((p) => p.id === it.product_id)?.fournisseur_id === f.id);
          if (mine.length > 0) total_orders++;
          if (o.status === 'delivered') earned += round2(mine.reduce((s, it) => s + (products.find((p) => p.id === it.product_id)?.price ?? it.cost) * it.quantity, 0));
        }
        earned = round2(earned);
        const paid = round2(payouts.filter((p) => p.recipient_id === f.id && p.recipient_role === 'seller' && p.status === 'paid').reduce((s, p) => s + p.amount, 0));
        return { id: f.id, name: f.name, email: f.email, total_orders, total_products: products.filter((p) => p.fournisseur_id === f.id).length, earned, paid, owed: round2(earned - paid) };
      }).sort((a, b) => b.earned - a.earned);
    },
    async platformEarnings() {
      const rows = orders
        .filter((o) => o.status === 'delivered')
        .map((o) => {
          applyDeliveryCommission(o);
          const d = users.find((u) => u.id === o.dropshipper_id);
          return {
            id: o.id,
            order_number: o.order_number,
            dropshipper_id: o.dropshipper_id,
            dropshipper_name: d?.name ?? 'Unknown',
            total: o.total,
            commission: o.commission,
            delivered_at: o.delivered_at ?? null,
          };
        })
        .sort((a, b) => new Date(b.delivered_at ?? 0).getTime() - new Date(a.delivered_at ?? 0).getTime());
      return { total: round2(rows.reduce((s, r) => s + r.commission, 0)), orders: rows };
    },
    async dropshipperFinance() {
      const drops = users.filter((u) => u.role === 'customer');
      return drops.map((d) => {
        const mine = orders.filter((o) => o.dropshipper_id === d.id && o.status === 'delivered');
        const total_sales = round2(mine.reduce((s, o) => s + o.total, 0));
        const profit = round2(mine.reduce((s, o) => s + o.profit, 0));
        const paid = round2(payouts.filter((p) => p.recipient_id === d.id && p.recipient_role === 'customer' && p.status === 'paid').reduce((s, p) => s + p.amount, 0));
        return { id: d.id, name: d.name, email: d.email, total_orders: mine.length, total_sales, profit, paid, owed: round2(profit - paid) };
      }).sort((a, b) => b.profit - a.profit);
    },
    async listPayouts() {
      return clone(payouts).sort((a, b) => b.id - a.id);
    },
    async listPayoutsForRecipient(recipientId, recipientRole) {
      return clone(payouts.filter((p) => p.recipient_id === recipientId && p.recipient_role === recipientRole)).sort((a, b) => b.id - a.id);
    },
    async getPayoutByFlouciPaymentId(paymentId) {
      return clone(payouts.find((p) => p.flouci_payment_id === paymentId) ?? null);
    },
    async getPayoutById(id) {
      return clone(payouts.find((p) => p.id === id) ?? null);
    },
    async createPayout(input) {
      const recipient = users.find((u) => u.id === input.recipient_id);
      payouts.push({
        id: ++rtid,
        recipient_id: input.recipient_id,
        recipient_name: recipient?.name ?? 'Unknown',
        recipient_role: input.recipient_role,
        amount: round2(input.amount),
        period: input.period ?? null,
        status: input.method === 'flouci' ? 'pending' : 'paid',
        notes: input.notes ?? null,
        method: input.method ?? 'manual',
        flouci_payment_id: input.flouci_payment_id ?? null,
        flouci_link: input.flouci_link ?? null,
        flouci_status: input.flouci_status ?? null,
        flouci_tracking_id: input.flouci_tracking_id ?? null,
        created_at: now(),
        paid_at: input.method === 'flouci' ? null : now(),
      });
      return rtid;
    },
    async updatePayoutStatus(id, status) {
      const p = payouts.find((x) => x.id === id);
      if (p) {
        p.status = status;
        p.paid_at = status === 'paid' ? now() : null;
      }
    },
    async updatePayoutFlouciStatus(id, flouciStatus) {
      const p = payouts.find((x) => x.id === id);
      if (p) {
        p.flouci_status = flouciStatus;
        if (flouciStatus === 'SUCCESS') {
          p.status = 'paid';
          p.paid_at = now();
        }
      }
    },
    async getFlouciWallet(userId) {
      const w = flouciWallets.find((x) => x.user_id === userId);
      return w ? { ...w } : null;
    },
    async setFlouciWallet(userId, identifier) {
      const w = flouciWallets.find((x) => x.user_id === userId);
      if (w) {
        w.identifier = identifier;
        w.updated_at = now();
      } else {
        flouciWallets.push({ user_id: userId, identifier, created_at: now(), updated_at: now() });
      }
    },
    async clearFlouciWallet(userId) {
      const i = flouciWallets.findIndex((x) => x.user_id === userId);
      if (i >= 0) flouciWallets.splice(i, 1);
    },

    async createServiceInscription(input) {
      const r = {
        id: ++rtid,
        user_id: input.user_id,
        user_name: users.find((u) => u.id === input.user_id)?.name ?? null,
        email: users.find((u) => u.id === input.user_id)?.email ?? null,
        service: input.service,
        status: 'pending' as const,
        amount: round2(input.amount),
        notes: input.notes ?? null,
        confirmed_by: null,
        created_at: now(),
        confirmed_at: null,
      };
      inscriptions.push(r);
      return r;
    },

    async getServiceInscription(id) {
      const r = inscriptions.find((x) => x.id === id);
      return r ? clone(r) : null;
    },

    async getLatestServiceInscription(userId, service) {
      const r = [...inscriptions].reverse().find((x) => x.user_id === userId && x.service === service);
      return r ? clone(r) : null;
    },

    async listConfirmedServiceInscriptions() {
      return inscriptions
        .filter((x) => x.status === 'confirmed')
        .map((x) => ({ ...clone(x), orders_count: orders.filter((o) => o.dropshipper_id === x.user_id).length }))
        .sort((a, b) => (b.confirmed_at ?? '').localeCompare(a.confirmed_at ?? ''));
    },

    async confirmServiceInscription(id, confirmedBy) {
      const r = inscriptions.find((x) => x.id === id);
      if (!r) return null;
      r.status = 'confirmed';
      r.confirmed_by = users.find((u) => u.id === confirmedBy)?.name ?? 'Staff';
      r.confirmed_at = now();
      return clone(r);
    },

    async listServiceDraftOrders(userId) {
      const list = await this.listOrders({ role: 'customer', userId });
      return list.filter((o) => o.status === 'draft');
    },

    async listServiceCommandes(userId) {
      const list = await this.listOrders({ role: 'customer', userId });
      return list;
    },

    async fulfillmentReport() {
      const demand = new Map<number, number>();
      const claimed = new Map<number, number>();
      for (const o of orders) {
        if (!['pending', 'confirmed'].includes(o.status)) continue;
        for (const it of o.items) {
          demand.set(it.product_id, (demand.get(it.product_id) ?? 0) + it.quantity);
          claimed.set(it.product_id, (claimed.get(it.product_id) ?? 0) + (it.house_qty ?? 0));
        }
      }
      const groups = new Map<number, FulfillmentGroup>();
      for (const p of products) {
        const demanded = demand.get(p.id) ?? 0;
        if (demanded <= 0) continue;
        const house = claimed.get(p.id) ?? 0;
        const committed = p.committed_stock ?? 0;
        const missing = Math.max(0, demanded - house - committed);
        if (missing <= 0) continue;
        const sup = users.find((u) => u.id === p.fournisseur_id);
        let g = groups.get(p.fournisseur_id);
        if (!g) {
          g = { fournisseur_id: p.fournisseur_id, fournisseur_name: sup?.name ?? 'Unknown', total_demand: 0, total_house: 0, total_missing: 0, items: [] };
          groups.set(p.fournisseur_id, g);
        }
        g.items.push({ product_id: p.id, product_name: p.name, image_url: p.image_url, demanded, house, missing });
        g.total_demand += demanded;
        g.total_house += house;
        g.total_missing += missing;
      }
      return [...groups.values()].sort((a, b) => b.total_missing - a.total_missing);
    },

    async listInventories() {
      return inventories.map((i) => ({
        id: i.id,
        code: i.code,
        name: i.name,
        location: i.location,
        capacity: i.capacity,
        used: i.items.reduce((s, it) => s + it.quantity, 0),
        item_count: i.items.length,
        created_at: i.created_at,
      }));
    },

    async getInventory(id: number) {
      const i = inventories.find((x) => x.id === id);
      return i ? invDetailOf(i) : null;
    },

    async getInventoryByCode(code: string) {
      const i = inventories.find((x) => x.code === code);
      return i ? invDetailOf(i) : null;
    },

    async createInventory(input: { name: string; location?: string | null; capacity: number }) {
      const code = `INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const inv = { id: ++iid, code, name: input.name, location: input.location ?? null, capacity: input.capacity, created_at: now(), items: [] };
      inventories.push(inv);
      return { id: inv.id, code, name: input.name, location: inv.location, capacity: inv.capacity, used: 0, item_count: 0, created_at: inv.created_at };
    },

    async deleteInventory(id: number) {
      const idx = inventories.findIndex((x) => x.id === id);
      if (idx >= 0) inventories.splice(idx, 1);
    },

    async addInventoryStock(inventoryId: number, productId: number, quantity: number) {
      const inv = inventories.find((x) => x.id === inventoryId);
      if (!inv) throw new Error('Inventory not found');
      const used = inv.items.reduce((s, it) => s + it.quantity, 0);
      if (used + quantity > inv.capacity) {
        throw new Error(`Inventory "${inv.name}" is full (${used}/${inv.capacity} units used)`);
      }
      const existing = inv.items.find((it) => it.product_id === productId);
      if (existing) existing.quantity += quantity;
      else inv.items.push({ product_id: productId, quantity });
    },

    async allocateFulfillmentToInventory(fournisseurId: number, inventoryId?: number) {
      const missing: MissingForAllocation[] = [];
      for (const p of products) {
        if (p.fournisseur_id !== fournisseurId) continue;
        const missingQty = remainingToProvide(p.id);
        if (missingQty > 0) missing.push({ product_id: p.id, product_name: p.name, quantity: missingQty });
      }
      if (missing.length === 0) return { allocations: [], leftover: [] };

      if (inventoryId != null) {
        const inv = inventories.find((i) => i.id === inventoryId);
        if (!inv) throw new Error('Inventory not found');
        const used = inv.items.reduce((s, it) => s + it.quantity, 0);
        const totalMissing = missing.reduce((s, m) => s + m.quantity, 0);
        const free = inv.capacity - used;
        if (free < totalMissing) {
          throw new Error(`Inventory "${inv.name}" has only ${free} free unit(s), but the fulfillment needs ${totalMissing}. Pick a different inventory.`);
        }
        const allocations: FulfillmentAllocationDetail[] = [];
        for (const m of missing) {
          if (m.quantity <= 0) continue;
          await this.addInventoryStock(inv.id, m.product_id, m.quantity);
          allocations.push({ inventory_id: inv.id, inventory_name: inv.name, product_id: m.product_id, product_name: m.product_name, quantity: m.quantity });
        }
        for (const m of missing) {
          const prod = products.find((x) => x.id === m.product_id);
          if (prod) {
            prod.committed_stock = (prod.committed_stock ?? 0) + m.quantity;
            prod.stock = Math.max(0, prod.stock - m.quantity);
          }
        }
        return { allocations, leftover: [] };
      }

      const spaces: InventoryFreeSpace[] = inventories.map((i) => ({
        id: i.id,
        name: i.name,
        capacity: i.capacity,
        used: i.items.reduce((s, it) => s + it.quantity, 0),
      }));

      const { allocations, leftover } = allocateMissingIntoInventories(missing, spaces);
      for (const a of allocations) {
        await this.addInventoryStock(a.inventory_id, a.product_id, a.quantity);
      }
      const byProduct = new Map<number, number>();
      for (const a of allocations) byProduct.set(a.product_id, (byProduct.get(a.product_id) ?? 0) + a.quantity);
      for (const [productId, qty] of byProduct) {
        const prod = products.find((x) => x.id === productId);
        if (prod) {
          prod.committed_stock = (prod.committed_stock ?? 0) + qty;
          prod.stock = Math.max(0, prod.stock - qty);
        }
      }
      return { allocations, leftover };
    },

    async listSupplierWarehouses() {
      return supplierWarehouses
        .map((w) => ({ ...w }))
        .sort((a, b) => b.id - a.id);
    },

    async createSupplierWarehouse(input: CreateSupplierWarehouseInput) {
      const owner = input.fournisseur_id != null ? users.find((u) => u.id === input.fournisseur_id) : undefined;
      const w: SupplierWarehouse = {
        id: ++swid,
        fournisseur_id: input.fournisseur_id ?? null,
        owner_name: owner?.name ?? null,
        name: input.name,
        phone1: input.phone1 ?? '',
        phone2: input.phone2 ?? '',
        country: input.country ?? 'Tunisia',
        location: input.location ?? '',
        address1: input.address1 ?? '',
        address2: input.address2 ?? '',
        created_at: now(),
      };
      supplierWarehouses.push(w);
      return { ...w };
    },

    async trendingProducts(limit = 20) {
      const groups = new Map<string, DbProduct[]>();
      for (const prod of products) {
        const key = normName(prod.name);
        const arr = groups.get(key);
        if (arr) arr.push(prod);
        else groups.set(key, [prod]);
      }
      const items: TrendingItem[] = [];
      for (const [key, list] of groups) {
        const stats = new Map(list.map((p) => [p.id, productStatsOf(p.id)]));
        let best = list[0];
        for (const o of list) {
          if (stats.get(o.id)!.profit > stats.get(best.id)!.profit || (stats.get(o.id)!.profit === stats.get(best.id)!.profit && o.rating > best.rating)) best = o;
        }
        const offers = new Set(list.map((o) => o.fournisseur_id)).size;
        const sup = users.find((u) => u.id === best.fournisseur_id);
        const created = list.reduce((s, o) => s + stats.get(o.id)!.created, 0);
        const confirmed = list.reduce((s, o) => s + stats.get(o.id)!.confirmed, 0);
        const returns = list.reduce((s, o) => s + stats.get(o.id)!.returns, 0);
        const profit = round2(list.reduce((s, o) => s + stats.get(o.id)!.profit, 0));
        items.push({
          key,
          name: best.name,
          image_url: best.image_url,
          rating: best.rating,
          rating_count: best.rating_count,
          offers,
          created,
          confirmed,
          returns,
          profit,
          score: productTrendScore(created, confirmed, returns, best.rating, offers, profit),
          best: { product_id: best.id, fournisseur_id: best.fournisseur_id, fournisseur_name: sup?.name ?? 'Unknown', price: best.price, cost_price: best.cost_price, stock: best.stock },
        });
      }
      items.sort((a, b) => b.score - a.score);
      return items.slice(0, limit);
    },

    async productSuppliers(productId) {
      const found = products.find((p) => p.id === productId);
      if (!found) return [];
      const key = normName(found.name);
      const supCount = new Map<number, number>();
      for (const p of products) supCount.set(p.fournisseur_id, (supCount.get(p.fournisseur_id) ?? 0) + 1);
      const offers: SupplierOffer[] = [];
      for (const prod of products) {
        if (normName(prod.name) !== key) continue;
        const s = productStatsOf(prod.id);
        const total_products = supCount.get(prod.fournisseur_id) ?? 0;
        const sup = users.find((u) => u.id === prod.fournisseur_id);
        offers.push({
          product_id: prod.id,
          fournisseur_id: prod.fournisseur_id,
          fournisseur_name: sup?.name ?? 'Unknown',
          price: prod.price,
          cost_price: prod.cost_price,
          stock: prod.stock,
          rating: prod.rating,
          rating_count: prod.rating_count,
          is_active: prod.is_active,
          created: s.created,
          confirmed: s.confirmed,
          returns: s.returns,
          profit: s.profit,
          total_products,
          score: supplierOfferScore(s.created, s.confirmed, s.returns, prod.rating, s.profit, total_products),
        });
      }
      offers.sort((a, b) => b.score - a.score || b.rating - a.rating);
      return offers;
    },

    async ensureTeamConversation() {
      const teams = conversations.filter((c) => c.type === 'team');
      let conv = teams[0];
      if (!conv) {
        conv = { id: ++cid, type: 'team', title: 'Support team', participants: [], created_at: now() };
        conversations.push(conv);
      } else if (teams.length > 1) {
        for (const extra of teams.slice(1)) {
          for (const m of chatMessages.filter((m) => m.conversation_id === extra.id)) m.conversation_id = conv.id;
          for (const p of extra.participants) {
            if (!conv.participants.some((x) => x.user_id === p.user_id)) conv.participants.push({ user_id: p.user_id, last_read_message_id: 0 });
          }
          conversations.splice(conversations.indexOf(extra), 1);
        }
      }
      for (const u of users.filter((x) => x.role === 'admin')) {
        if (!conv.participants.some((p) => p.user_id === u.id)) conv.participants.push({ user_id: u.id, last_read_message_id: 0 });
      }
      return conv.id;
    },

    async ensureStaffConversation(userId, peerRole) {
      const peer = users.find((u) => u.role === peerRole);
      if (!peer) throw new Error(`No ${peerRole} account exists`);
      const conv = conversations.find((c) => c.type === 'staff' && c.participants.some((p) => p.user_id === userId) && c.participants.some((p) => p.user_id === peer.id));
      if (conv) return conv.id;
      const newConv = { id: ++cid, type: 'staff' as const, title: null, participants: [{ user_id: userId, last_read_message_id: 0 }, { user_id: peer.id, last_read_message_id: 0 }], created_at: now() };
      conversations.push(newConv);
      return newConv.id;
    },

    async ensureSupplierConversation(userId, supplierId) {
      const title = `supplier:${supplierId}`;
      const conv = conversations.find((c) => c.type === 'staff' && c.title === title && c.participants.some((p) => p.user_id === userId) && c.participants.some((p) => p.user_id === supplierId));
      if (conv) return conv.id;
      const newConv = { id: ++cid, type: 'staff' as const, title, participants: [{ user_id: userId, last_read_message_id: 0 }, { user_id: supplierId, last_read_message_id: 0 }], created_at: now() };
      conversations.push(newConv);
      return newConv.id;
    },

    async listConversations(userId, role) {
    if (role === 'admin') await this.ensureTeamConversation();
    const mine = conversations.filter((c) => c.participants.some((p) => p.user_id === userId));
      const out: Conversation[] = [];
      for (const c of mine) {
        const parts: ConversationParticipant[] = c.participants.map((p) => {
          const u = users.find((x) => x.id === p.user_id);
          return { id: p.user_id, name: u?.name ?? 'Unknown', role: u?.role ?? 'customer', photo: u?.photo ?? null };
        });
        const my = c.participants.find((p) => p.user_id === userId)!;
        const msgs = chatMessages.filter((m) => m.conversation_id === c.id).sort((a, b) => a.id - b.id);
        const last = msgs[msgs.length - 1];
        const unread = msgs.filter((m) => m.id > my.last_read_message_id && m.sender_id !== userId).length;
        let title = '';
        if (c.type === 'team') title = c.title ?? 'Support team';
        else if ((c.title ?? '').startsWith('supplier:')) {
          const peer = parts.find((p) => p.id !== userId);
          title = peer ? `Chat with ${peer.name}` : 'Supplier chat';
        }
        else {
          const peer = parts.find((p) => p.id !== userId);
          title = peer ? `${peer.name} · ${peer.role}` : 'Conversation';
        }
        out.push({
          id: c.id,
          type: c.type,
          title,
          participants: parts,
          last_message: last ? { sender_id: last.sender_id, sender_name: last.sender_name, body: last.body, image_url: last.image_url, created_at: last.created_at } : null,
          unread,
        });
      }
      out.sort((a, b) => (b.last_message?.created_at ?? '') < (a.last_message?.created_at ?? '') ? -1 : 1);
      return out;
    },

    async listChatMessages(conversationId, userId) {
      const conv = conversations.find((c) => c.id === conversationId);
      if (!conv || !conv.participants.some((p) => p.user_id === userId)) throw new Error('You are not part of this conversation');
      return chatMessages.filter((m) => m.conversation_id === conversationId).sort((a, b) => a.id - b.id);
    },

    async sendChatMessage(conversationId, senderId, input) {
      const conv = conversations.find((c) => c.id === conversationId);
      if (!conv || !conv.participants.some((p) => p.user_id === senderId)) throw new Error('You are not part of this conversation');
      const sender = users.find((u) => u.id === senderId)!;
      const msg: ChatMessage = {
        id: ++cmid,
        conversation_id: conversationId,
        sender_id: senderId,
        sender_name: sender.name,
        sender_role: sender.role as ChatMessage['sender_role'],
        body: input.body,
        image_url: input.image_url ?? null,
        created_at: now(),
      };
      chatMessages.push(msg);
      return clone(msg);
    },

    async markConversationRead(conversationId, userId) {
      const conv = conversations.find((c) => c.id === conversationId);
      if (!conv) return;
      const p = conv.participants.find((x) => x.user_id === userId);
      if (!p) return;
      const max = chatMessages.filter((m) => m.conversation_id === conversationId).reduce((s, m) => Math.max(s, m.id), 0);
      p.last_read_message_id = max;
    },

    async chatUnread(userId) {
      let total = 0;
      for (const c of conversations) {
        const p = c.participants.find((x) => x.user_id === userId);
        if (!p) continue;
        total += chatMessages.filter((m) => m.conversation_id === c.id && m.id > p.last_read_message_id && m.sender_id !== userId).length;
      }
      return total;
    },

    async listNotifications(userId) {
      return clone(notifications.filter((n) => n.user_id === userId).sort((a, b) => b.id - a.id).slice(0, 50));
    },
    async notificationUnread(userId) {
      return notifications.filter((n) => n.user_id === userId && !n.is_read).length;
    },
    async markNotificationsRead(userId) {
      for (const n of notifications) if (n.user_id === userId) n.is_read = true;
    },
    async createNotification(input: CreateNotificationInput) {
      notifications.push({ id: ++nid, user_id: input.user_id, type: input.type, title: input.title, body: input.body, product_id: input.product_id ?? null, image_url: input.image_url ?? null, is_read: false, created_at: now() });
    },
    async createApiKey(userId, name) {
      const plaintext = newApiToken();
      const key: ApiKey = { id: ++akid, user_id: userId, name: name || 'Default key', prefix: plaintext.slice(0, 19), token_hash: sha256(plaintext), status: 'active', last_used_at: null, created_at: now() };
      apiKeys.push(key);
      return { plaintext, key: clone(key) };
    },
    async listApiKeys(userId) {
      return clone(apiKeys.filter((k) => k.user_id === userId).sort((a, b) => b.id - a.id));
    },
    async revokeApiKey(userId, keyId) {
      const k = apiKeys.find((x) => x.id === keyId && x.user_id === userId);
      if (k) k.status = 'revoked';
    },
    async touchApiKey(keyId) {
      const k = apiKeys.find((x) => x.id === keyId);
      if (k) k.last_used_at = now();
    },
    async findUserByApiKey(plaintext) {
      const k = apiKeys.find((x) => x.token_hash === sha256(plaintext));
      if (!k || k.status !== 'active') return null;
      const u = users.find((x) => x.id === k.user_id);
      if (!u) return null;
      return { user: userPublic(u), keyId: k.id };
    },

    async getIntegrationSetting(companyId: string) {
      const cfg = integrationSettingsMap[companyId];
      if (!cfg) return { company_id: companyId, api_key: '', enabled: false };
      return { company_id: companyId, api_key: cfg.api_key, enabled: cfg.enabled };
    },

    async getAllIntegrationSettings() {
      return { ...integrationSettingsMap };
    },

    async setIntegrationSetting(companyId: string, apiKey: string, enabled: boolean) {
      integrationSettingsMap[companyId] = { api_key: apiKey, enabled };
    },

    async logStaffActivity(input: StaffActivityInput) {
      staffActivity.push({
        id: ++said,
        created_at: new Date().toISOString(),
        user_id: input.user_id,
        user_name: input.user_name,
        role: input.role,
        activity_type: input.activity_type,
        label: input.label ?? null,
        ref_id: input.ref_id ?? null,
        quantity: input.quantity ?? null,
        duration_seconds: input.duration_seconds ?? null,
      });
    },

    async listStaffActivity(opts?: { userId?: number; limit?: number }) {
      let rows = staffActivity.slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      if (opts?.userId) rows = rows.filter((r) => r.user_id === opts.userId);
      if (opts?.limit) rows = rows.slice(0, opts.limit);
      return rows;
    },

    async raw<T>(_sql: string, _params?: unknown[]): Promise<T[]> {
      return [];
    },

    async saveUploadFile(name: string, data: Buffer, contentType: string): Promise<void> {
      uploads.set(name, { data, contentType });
    },

    async getUploadFile(name: string): Promise<{ data: Buffer; contentType: string } | null> {
      return uploads.get(name) ?? null;
    },
  };
}

export type { TrackStep, OrderItem };
