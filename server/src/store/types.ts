import {
  SupplierFollowUp,
  SupplierOrganization,
  SupplierOrganizationDetail,
  SupplierOrganizationsQuery,
  SupplierOrganizationsResult,
} from '../data/supplierOrganizations';

export type {
  SupplierFollowUp,
  SupplierOrganization,
  SupplierOrganizationDetail,
  SupplierOrganizationsQuery,
  SupplierOrganizationsResult,
};

export type Role = 'admin' | 'customer' | 'seller';
/** Sourcing model a fournisseur offers a product under. */
export type ProductCategory = 'dropshipping' | 'wholesale' | 'white_label' | 'fulfillment';
export const PRODUCT_CATEGORIES: ProductCategory[] = ['dropshipping', 'wholesale', 'white_label', 'fulfillment'];

export interface WholesaleTier {
  min: number;
  max: number;
  price: number;
}
export type OrderStatus = 'draft' | 'ready' | 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'retour';

export interface PickSampleBatch {
  batch_code: string;
  quantity: number;
}

export interface PickRecord {
  inventory_name: string;
  inventory_code: string;
  batch_code: string | null;
  quantity: number;
}

export interface PickSample {
  inventory_id: number;
  inventory_name: string;
  inventory_code: string;
  available: number;
  batches: PickSampleBatch[];
}

export interface PickPlanItem {
  product_id: number;
  product_name: string;
  product_image: string | null;
  fournisseur_name: string;
  quantity: number;
  picked: number;
  remaining: number;
  samples: PickSample[];
  picks: PickRecord[];
}

export interface PickPlan {
  order_id: number;
  order_number: string;
  status: OrderStatus;
  complete: boolean;
  coverable: boolean;
  items: PickPlanItem[];
}

export interface OrderPickabilityRow {
  order_id: number;
  status: OrderStatus;
  coverable: boolean;
  picked: number;
  needed: number;
}
/** The barcode/QR scan actions a chef can perform while fulfilling a commande. */
export type ScanAction = 'confirm' | 'shipping' | 'retour';
export type PaymentStatus = 'unpaid' | 'paid';
export type PayoutStatus = 'pending' | 'paid' | 'cancelled';

export interface DbUser {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  photo: string | null;
  /** CIN card number (national identity) of the user. */
  cin: string | null;
  created_at: string;
}

export interface DbUserPublic {
  id: number;
  name: string;
  email: string;
  role: Role;
  photo: string | null;
  cin: string | null;
  created_at: string;
}

export interface DbProduct {
  id: number;
  fournisseur_id: number;
  name: string;
  description: string | null;
  price: number;
  cost_price: number;
  /** Sourcing model: how a dropshipper can buy this product (dropship, bulk, or private label). */
  category: ProductCategory;
  /** Every marketplace offer this product is listed under (a product can be both dropshipping and wholesale). */
  offers?: ProductCategory[];
  /** Retail/catalog category (e.g. "Fashion", "Phone & Tablet"). */
  retail_category?: string | null;
  /** Package dimensions in mm and weight in grams. */
  height?: number | null;
  length?: number | null;
  width?: number | null;
  weight?: number | null;
  stock: number;
  /** Hidden company/warehouse stock ("in my house"), never exposed via public product routes.
   *  This is the RETOUR pool — only returned (+ initial seed) units; dropshippers claim it at order time. */
  house_stock?: number;
  /** Units the chef has stored in inventory for unshipped open orders (fulfillment).
   *  NOT part of the dropshipper-consumable pool; released back from `committed_stock` when an order ships. */
  committed_stock?: number;
  sku: string | null;
  barcode: string | null;
  image_url: string | null;
  video_url: string | null;
  images: string[];
  videos: string[];
  keywords?: string[];
  specifications?: { k: string; v: string }[];
  wholesale_tiers?: WholesaleTier[];
  is_active: boolean;
  moderation_status: 'pending' | 'approved' | 'refused' | 'hidden';
  moderation_note: string | null;
  rating: number;
  rating_count: number;
  created_at: string;
}

export interface ProductWithSupplier extends DbProduct {
  fournisseur_name: string;
  stats?: ProductStats;
}

export interface StockingProduct extends ProductWithSupplier {
  supplier_email: string | null;
  supplier_phone: string | null;
  supplier_org_name: string | null;
  supplier_city: string | null;
  supplier_account_manager: string | null;
}

export interface ProductStats {
  created: number;
  confirmed: number;
  returns: number;
  profit: number;
}

export interface SupplierOffer {
  product_id: number;
  fournisseur_id: number;
  fournisseur_name: string;
  price: number;
  cost_price: number;
  stock: number;
  rating: number;
  rating_count: number;
  is_active: boolean;
  created: number;
  confirmed: number;
  returns: number;
  profit: number;
  total_products: number;
  score: number;
}

export interface TrendingItem {
  key: string;
  name: string;
  image_url: string | null;
  rating: number;
  rating_count: number;
  offers: number;
  created: number;
  confirmed: number;
  returns: number;
  profit: number;
  score: number;
  best: {
    product_id: number;
    fournisseur_id: number;
    fournisseur_name: string;
    price: number;
    cost_price: number;
    stock: number;
  };
}

export type ConversationType = 'team' | 'staff' | 'product';

export interface ConversationParticipant {
  id: number;
  name: string;
  role: Role;
  photo: string | null;
}

export interface Conversation {
  id: number;
  type: ConversationType;
  title: string;
  participants: ConversationParticipant[];
  last_message: {
    sender_id: number;
    sender_name: string;
    body: string;
    image_url: string | null;
    created_at: string;
  } | null;
  unread: number;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_name: string;
  sender_role: Role;
  body: string;
  image_url: string | null;
  created_at: string;
}

export interface DbOrder {
  id: number;
  order_number: string;
  /** Unique scannable barcode for this commande (generated on creation). */
  barcode: string | null;
  /** Manual agency-zone override for stock shipments (Zone Tunis/Sousse/Sfax/Eljem). */
  shipment_zone?: string | null;
  /** Which marketplace offer the commande was created from (decides which stocking page it appears on). */
  order_type: 'dropshipping' | 'wholesale' | 'fulfillment';
  dropshipper_id: number;
  fournisseur_id: number;
  customer_name: string | null;
  customer_phone: string | null;
  governorate: string | null;
  city: string | null;
  shipping_address: string | null;
  delivery_company: string | null;
  delivery_status: string | null;
  locality_id: number | null;
  telephone2: string | null;
  commentaire: string | null;
  est_fragile: string;
  ouvrir_colis: string;
  /** Manually-entered "nombre d'article" chosen at creation (printed on the delivery paper). */
  nombre_article: number | null;
  /** Whether this commande is an exchange (échange) created from an approved échange request. */
  nombre_echange: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: string | null;
  total: number;
  total_cost: number;
  profit: number;
  /** Platform commission (3% of total), charged when the commande is delivered. */
  commission: number;
  /** When the chef scanned/confirmed this commande (one-time scan step). */
  confirmed_at: string | null;
  /** Who confirmed this order (confirmateur user id, or null if chef confirmed directly). */
  confirmed_by: number | null;
  confirmed_by_name: string | null;
  /** When the chef scanned it as shipped (one-time scan step). */
  shipped_at: string | null;
  /** When it was delivered (auto-finalized 12h after shipping if no retour). */
  delivered_at: string | null;
  /** When the chef scanned a retour. */
  returned_at: string | null;
  /** When the returned units were stored back into suppliers inventory. */
  return_stored_at?: string | null;
  /** When auto-delivery happens if no retour was scanned (shipped_at + 12h). */
  auto_deliver_at: string | null;
  created_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  product_image: string | null;
  quantity: number;
  price: number;
  cost: number;
  /** The supplier that owns this product (a commande can mix several suppliers). */
  fournisseur_id: number;
  fournisseur_name: string;
  /** Quantity of this item claimed from the retour pool at order creation. */
  house_qty?: number;
  /** Quantity of this item requested from the supplier (needs fulfillment). */
  supplier_qty?: number;
}

export interface TrackStep {
  id: number;
  order_id: number;
  carrier: string | null;
  tracking_number: string | null;
  status: string | null;
  detail: string | null;
  updated_at: string;
}

export interface OrderFull extends DbOrder {
  dropshipper_name: string;
  /** CIN card number of the dropshipper who placed the commande (printed on the shipping paper). */
  dropshipper_cin: string | null;
  fournisseur_name: string;
  items: OrderItem[];
  tracking: TrackStep[];
}

export interface DbRating {
  id: number;
  product_id: number;
  user_id: number;
  score: number;
  comment: string | null;
  created_at: string;
}

export interface DbTicket {
  id: number;
  user_id: number;
  email: string;
  type: string;
  message: string;
  status: 'open' | 'answered' | 'closed';
  answer: string | null;
  assigned_to: number | null;
  created_at: string;
}

export interface TicketFull extends DbTicket {
  user_name: string;
  user_email: string;
  assigned_to_name: string | null;
}

export type ReturnType = 'retour' | 'echange';
export type ReturnStatus = 'pending' | 'approved' | 'rejected' | 'processed';

export type ReturnApprovalStatus = 'approved' | 'waiting' | 'rejected';
export type ExchangeDeliveryStatus = 'packed' | 'awaiting_packaging' | 'ready_for_pickup' | 'picked_up' | 'on_its_way' | 'at_carrier_facility' | 'delivered' | 'returning_to_sender' | 'returned_to_sender' | 'canceled';
export type ReturnDeliveryStatus = 'awaiting_arrival' | 'packed' | 'ready_for_pickup' | 'picked_up' | 'on_its_way' | 'delivered' | 'returning_to_sender' | 'returned_to_sender' | 'return_delivered' | 'canceled';

export interface ReturnRequest {
  id: number;
  order_id: number;
  order_number: string;
  dropshipper_id: number;
  dropshipper_name: string;
  type: ReturnType;
  reason: string;
  attachments: string[];
  status: ReturnStatus;
  reply: string | null;
  created_at: string;
  // Falcon chef "Returns & Exchanges" columns (nullable so older rows map cleanly).
  created_by: string | null;
  retailer_name: string | null;
  retailer_code: string | null;
  retailer_premium: boolean;
  return_address: string | null;
  destination_warehouse: string | null;
  product_name: string | null;
  product_variation: string | null;
  product_qty: number | null;
  approval_status: ReturnApprovalStatus | null;
  exchange_delivery_status: ExchangeDeliveryStatus | null;
  exchange_shipment_id: number | null;
  return_delivery_status: ReturnDeliveryStatus | null;
  dispute_status: 'unresolved' | null;
  accepted_at: string | null;
  received_at: string | null;
  inspection: boolean;
  delivery_type: string | null;
  process_type: string | null;
  carrier: string | null;
  governorate: string | null;
  city: string | null;
}

export interface RetourOrderSummary {
  order_id: number;
  order_number: string;
  dropshipper_name: string | null;
  governorate: string | null;
  city: string | null;
  delivery_company: string | null;
  created_at: string;
  items: { product_name: string; quantity: number }[];
}

export interface TransferShipment {
  id: number;
  gid: string;
  client_id: number;
  ship_to_name: string;
  ship_to_code: string;
  account_manager: string;
  business_developer: string;
  account_incubator: string | null;
  ship_to: string;
  created_at: string;
  delivered_at: string | null;
  status: 'rejected' | 'delivered' | 'packed';
  product_name: string;
  product_variation: string | null;
  pack_units: number;
  product_qty: number;
  deposit_amount: number | null;
  deposit_status: 'failed' | 'pending' | 'successful';
  payment_amount: number | null;
  payment_status: 'failed' | 'pending' | 'successful';
  received_units: number;
  total_units: number;
  carrier_logo: string;
  tracking_number: string | null;
}

export interface PickupRequest {
  id: number;
  gid: string;
  follow_up_status: string;
  warehouse: string;
  address: string;
  phone_masked: string;
  phone_full: string;
  related_label: string;
  related_type: 'shipments' | 'stock';
  processed_by: string | null;
  carrier: {
    state: 'none' | 'created' | 'unsupported';
    reference: string | null;
    date_label: string | null;
  };
  status: 'Pending';
  pickup_date: string;
  from_time: string;
  to_time: string;
}

export interface Manifest {
  id: number;
  gid: string;
  manifest_ref: string;
  fulfiller_name: string;
  fulfiller_code: string;
  carrier_logo: string;
  warehouse: string;
  supplier_name: string | null;
  delivery_company: string | null;
  date: string;
  status: 'not_uploaded';
  shipments: number;
}

export interface ManifestItem {
  id: number;
  manifest_id: number;
  order_id: number;
  order_number: string;
  customer_name: string | null;
  governorate: string | null;
  city: string | null;
  status: string;
  product_name: string;
  product_variation: string | null;
  quantity: number;
  unit_price: number;
  created_at: string;
  delivered_at: string | null;
}

export interface ManifestDetail extends Manifest {
  items: ManifestItem[];
}

export type PackingBinType = 'box' | 'flatpolybag' | 'crate' | 'container' | 'pallet' | 'vehicle';

export interface PackingBin {
  id: number;
  name: string;
  reference: string | null;
  price: number;
  cost: number;
  type: PackingBinType;
  image: string | null;
  active: boolean;
  created_at: string;
}

export interface PackingBinsQuery {
  page: number;
  per_page: number;
  q?: string;
}

export interface PackingBinsResult {
  rows: PackingBin[];
  total: number;
  page: number;
  per_page: number;
}

export type TxEntityType = 'service' | 'carrier' | 'retailer';
export type TxStatus = 'pending' | 'successful';

export interface Transaction {
  id: number;
  gid: string;
  summary: string;
  shipment_id: string | null;
  shipment_display: string | null;
  created_at: string;
  updated_at: string;
  status: TxStatus;
  amount: number;
  payment_method: string;
  cash_pickup_location: string | null;
  from_type: TxEntityType;
  from_name: string;
  from_code: string | null;
  to_type: TxEntityType;
  to_name: string;
  to_code: string | null;
  follow_up: null;
  bulk: null;
}

export interface TransactionsResult {
  transactions: Transaction[];
  total: number;
}

export type ReviewStatus = 'Pending' | 'Approved' | 'Rejected';

export interface ReconciliationReview {
  id: number;
  created_at: string;
  type: string;
  variance: number;
  current_variance: number;
  status: ReviewStatus;
  comment: string | null;
  reviewed_by: string | null;
  cashier_session: string;
  location: string;
}

export type SellerStatus =
  | 'Uncompleted registration'
  | 'Complete registration'
  | 'Email Verified'
  | 'Has 0 subscriptions'
  | 'Has 0 orders'
  | 'Has 0 advance deposits'
  | 'Balance 0.000 TND';

export interface SellerOrganization {
  id: number;
  code: string;
  account_manager: string | null;
  business_developer?: string | null;
  owner_name: string;
  owner_photo?: string | null;
  org_name: string | null;
  phone: string;
  email: string;
  tags: string[];
  joined_at: string;
  last_seen_at: string;
  onboarding: { label: SellerStatus; ok: boolean }[];
  documents: 'none' | 'review';
  follow_up_new: boolean;
  follow_up?: SupplierFollowUp | null;
  source: string;
  is_main_retailer: boolean;
  plus_membership: boolean;
  account_status?: string;
  allow_marketplace?: boolean;
  dropshipping_eligible?: boolean;
  doc_files?: Record<string, string>;
  doc_statuses?: Record<string, string>;
}

export interface SellerOrganizationsQuery {
  page: number;
  per_page: number;
  q?: string;
  search_field?: string;
  sort?: string;
  dir?: 'asc' | 'desc';
  statuses?: string[];
  sources?: string[];
  main_retailer?: boolean;
  plus_membership?: boolean;
}

export interface SellerOrganizationsResult {
  rows: SellerOrganization[];
  total: number;
  filters: { statuses: string[]; sources: string[] };
  page: number;
  per_page: number;
}

export interface SellerSignupInput {
  owner_name: string;
  email: string;
  shop_name?: string | null;
  phone?: string | null;
  tags?: string[];
}

export interface UpdateSellerOrgManagersInput {
  account_manager?: string | null;
  business_developer?: string | null;
}

export interface CreateSupplierOrganizationInput {
  company_name: string;
  tax_id: string;
  company_description?: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  business_developer?: string | null;
}

export interface SupplierFollowUpPatch {
  meeting?: SupplierFollowUp['meeting'];
  tags?: string[];
  note?: string | null;
  scheduled_at?: string | null;
  confirmed?: boolean;
  outcome?: string | null;
  attachments?: string[] | null;
}

export interface UpdateSupplierOrgFlagsInput {
  account_status?: 'active' | 'registration_uncompleted' | 'inactive';
  allow_marketplace?: boolean;
  dropshipping_eligible?: boolean;
  account_manager?: string | null;
  business_developer?: string | null;
  doc_files?: Record<string, string>;
  doc_statuses?: Record<string, string>;
}

export type StockRefillStatus = 'Pending' | 'Confirmed' | 'Approved' | 'In preparation' | 'Ready' | 'Shipped' | 'Completed' | 'Rejected';

export interface StockRefillRequestItem {
  id: number;
  request_id: number;
  product_name: string;
  color: string | null;
  image_url: string | null;
  expected_incoming: number;
  supplier_stock: number;
  our_stock: number;
  period_consumption: number;
  qty_non_confirmed: number;
  qty_required_orders: number;
  qty_to_request: number;
  qty_picked: number;
  unit_price: number;
}

export interface StockRefillRequestItemInput {
  product_name: string;
  color?: string | null;
  image_url?: string | null;
  expected_incoming?: number;
  supplier_stock?: number;
  our_stock?: number;
  period_consumption?: number;
  qty_non_confirmed?: number;
  qty_required_orders?: number;
  qty_to_request?: number;
  qty_picked?: number;
  unit_price?: number;
}

export interface StockRefillBatchRef {
  position: number;
  batch_code: string;
  quantity: number;
}

export interface StockBatchLookupRow {
  batch_code: string;
  product_name: string;
  color: string | null;
  supplier: string;
  request_id: number;
  quantity: number;
  inventory_name: string | null;
}

export interface StockRefillRequest {
  id: number;
  supplier: string;
  products: number;
  storage_request: string | null;
  reservation: string | null;
  date: string;
  status: StockRefillStatus;
  items: StockRefillRequestItem[];
  batches?: StockRefillBatchRef[];
}

export interface StockRefillRequestsQuery {
  page: number;
  per_page: number;
  q?: string;
  status?: string;
  supplier?: string;
}

export interface StockRefillRequestsResult {
  rows: StockRefillRequest[];
  total: number;
  filters: { statuses: StockRefillStatus[] };
  page: number;
  per_page: number;
}

export interface SaveStockRefillRequestInput {
  supplier: string;
  products: number;
  storage_request?: string | null;
  reservation?: string | null;
  date?: string | null;
  status?: StockRefillStatus;
  items?: StockRefillRequestItemInput[];
}

export interface StorageRequest {
  id: number;
  gid: string;
  client: string;
  related_refill_id: number | null;
  failed_qc: number;
  products: number;
  discrepancies: string | null;
  status: 'Pending' | 'Confirmed';
  created_at: string;
}

export interface StorageRequestsQuery {
  page: number;
  per_page: number;
  q?: string;
}

export interface StorageRequestsResult {
  rows: StorageRequest[];
  total: number;
  page: number;
  per_page: number;
}

export interface PickupListSupplier {
  supplier: string;
  request_count: number;
  total_qty_to_request: number;
  items: StockRefillRequestItem[];
}

export interface StockRefillPickupListResult {
  suppliers: PickupListSupplier[];
}

export const SHIPMENT_ZONES = ['Tunis', 'Sousse', 'Sfax', 'Eljem'] as const;
export type ShipmentZone = (typeof SHIPMENT_ZONES)[number];

export interface StockReturnItem {
  order_id: number;
  order_number: string;
  customer_name: string | null;
  product_id: number;
  product_name: string;
  image_url: string | null;
  supplier_id: number;
  supplier_name: string;
  /** Overall returned quantity for this commande line. */
  quantity: number;
  /** Units already stored back into suppliers inventory. */
  stored_qty: number;
  /** quantity - stored_qty */
  pending: number;
  created_at: string;
}

export interface StoreStockReturnsInput {
  supplier_id: number;
  inventory_id: number;
}

export interface StockReturnsStoreResult {
  stored_units: number;
  products: number;
  inventory_name: string;
}

export interface StockReturnScanInput {
  code: string;
  inventory_id: number;
}

export interface StockReturnScanResult {
  product_name: string;
  supplier_name: string;
  stored_units: number;
  remaining_pending: number;
  inventory_name: string;
}

export interface StockShipmentItem {
  product_id: number;
  product_name: string;
  image_url: string | null;
  quantity: number;
}

export interface StockShipmentOrder {
  id: number;
  order_number: string;
  barcode: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  governorate: string | null;
  city: string | null;
  status: OrderStatus;
  zone: ShipmentZone | null;
  auto_zone: ShipmentZone | null;
  zone_override: boolean;
  items: StockShipmentItem[];
  total_units: number;
  dropshipper_name: string | null;
  fournisseur_name: string | null;
}

export interface ShipmentRow {
  id: number;
  order_number: string;
  order_type: string;
  dropshipper_name: string | null;
  dropshipper_phone: string | null;
  fournisseur_name: string | null;
  fulfiller: string | null;
  warehouse: string | null;
  created_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
  returned_at: string | null;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  governorate: string | null;
  city: string | null;
  product_name: string;
  product_variation: string | null;
  quantity: number;
  image_url: string | null;
  total: number;
  total_cost: number;
  tracking: { carrier: string | null; tracking_number: string | null }[];
}

export const ORDER_PICK_STATUSES = ['unconfirmed', 'confirmed', 'shipped', 'cancelled', 'return'] as const;
export type OrderPickStatus = (typeof ORDER_PICK_STATUSES)[number];

export const ZONE_COLORS: Record<string, { bg: string; text: string; ring: string; label: string }> = {
  Tunis:   { bg: 'bg-sky-100',    text: 'text-sky-700',    ring: 'ring-sky-300',    label: 'Zone Tunis' },
  Sousse:  { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-300', label: 'Zone Sousse' },
  Sfax:    { bg: 'bg-amber-100',   text: 'text-amber-700',   ring: 'ring-amber-300',   label: 'Zone Sfax' },
  Eljem:   { bg: 'bg-violet-100',  text: 'text-violet-700',  ring: 'ring-violet-300',  label: 'Zone Eljem' },
};
export const DEFAULT_ZONE_COLOR = { bg: 'bg-slate-100', text: 'text-slate-600', ring: 'ring-slate-300', label: 'Unassigned' };

export interface OrderPickRow {
  id: number;
  order_id: number;
  order_number: string;
  barcode: string | null;
  dropshipper_name: string | null;
  destinator: string | null;
  destination: string | null;
  governorate: string | null;
  agence: ShipmentZone | null;
  delivery_company: string | null;
  delivery_status: string | null;
  total: number;
  created_at: string;
  arrive_at: string;
  status: OrderPickStatus;
  items: StockShipmentItem[];
}

export interface ProductSubscription {
  id: number;
  product_name: string;
  product_emoji: string;
  supplier_name: string;
  supplier_code: string;
  retailer_name: string;
  retailer_code: string;
  premium: 'crown' | 'bolt' | null;
  cost: number;
  price: number;
  profit_fee: number;
  allow_when_oos: boolean;
  price_constraint: boolean;
  units_sold: number;
  started_at: string;
  price_updates: number;
}

export interface SubscriptionPatch {
  price?: number | null;
  cost?: number | null;
  profit_fee?: number | null;
  allow_when_oos?: boolean;
  price_constraint?: boolean;
}

export interface SubscriptionsQuery {
  page: number;
  per_page: number;
  q?: string;
  products?: string[];
  suppliers?: string[];
  retailers?: string[];
  cost_min?: number;
  cost_max?: number;
  price_min?: number;
  price_max?: number;
  oos?: boolean;
  started?: 'day' | 'week' | 'month';
  sort?: string;
  dir?: 'asc' | 'desc';
}

export interface ProductSubscriptionsResult {
  rows: ProductSubscription[];
  total: number;
  filters: { suppliers: string[]; retailers: string[]; products: string[] };
  page: number;
  per_page: number;
}

export type CollectionStatus = 'Active' | 'Inactive' | 'Draft';

export interface Collection {
  id: number;
  title: string;
  description: string;
  products: number;
  created_at: string;
  status: CollectionStatus;
  is_active: boolean;
  marketplace_sort_rank: number | null;
}

export interface CollectionsResult {
  collections: Collection[];
  total: number;
}

export type CatalogOfferType = 'dropshipping' | 'wholesale' | 'white_label';

export interface CollectionProduct {
  id: number;
  name: string;
  emoji: string;
  image_url: string | null;
  eligible_to_marketplace: boolean;
  offer_type: CatalogOfferType;
}

export interface CollectionProductItem extends CollectionProduct {
  added_by: string | null;
  added_at: string;
}

export interface CollectionDetail extends Collection {
  product_items: CollectionProductItem[];
}

export interface CollectionInput {
  title: string;
  description?: string | null;
  is_active?: boolean;
  marketplace_sort_rank?: number | null;
  product_ids?: number[];
}

export interface ProductUpdate {
  id: number;
  product_id: number;
  changed_field: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface SavedProductView {
  id: number;
  saved_at: string;
  /** The dropshipper's own selling price override, or null to use the supplier price. */
  my_price: number | null;
  /** Which marketplace offer this product was saved under (dropshipping or wholesale). */
  offer_type: 'dropshipping' | 'wholesale';
  product: ProductWithSupplier;
  updates: ProductUpdate[];
}

export interface CreateUserInput {
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  photo?: string | null;
  cin?: string | null;
}

export interface CreateProductInput {
  fournisseur_id: number;
  name: string;
  description?: string | null;
  price: number;
  cost_price: number;
  category?: ProductCategory;
  /** Marketplace offers this product supports (defaults to [category]). */
  offers?: ProductCategory[];
  retail_category?: string | null;
  height?: number | null;
  length?: number | null;
  width?: number | null;
  weight?: number | null;
  stock: number;
  sku?: string | null;
  barcode?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  images?: string[] | null;
  videos?: string[] | null;
  keywords?: string[] | null;
  specifications?: { k: string; v: string }[] | null;
  wholesale_tiers?: WholesaleTier[] | null;
}

export interface OrderItemInput {
  product_id: number;
  quantity: number;
}

export interface CreateOrderInput {
  order_number: string;
  dropshipper_id: number;
  fournisseur_id: number;
  customer_name?: string | null;
  customer_phone?: string | null;
  shipping_address?: string | null;
  governorate?: string | null;
  city?: string | null;
  payment_method: string;
  items: OrderItemInput[];
  /** Offer type chosen at creation time (defaults to dropshipping). */
  offer_type?: 'dropshipping' | 'wholesale' | 'fulfillment';
  /** Whole-commande "Price (including VAT)" typed by the supplier. When set, it replaces the per-product prices and becomes the commande total. */
  manual_price?: number;
  locality_id?: number | null;
  telephone2?: string | null;
  commentaire?: string | null;
  est_fragile?: string;
  ouvrir_colis?: string;
  /** Manually-entered "nombre d'article" chosen at creation (printed on the delivery paper). */
  nombre_article?: number | null;
  /** Exchange (échange) commande created from an approved échange request. */
  nombre_echange?: string;
}

/** An item where the company house stock could not cover the full quantity, so the supplier was asked to make it ready. */
export interface StockRequestItem {
  product_id: number;
  product_name: string;
  quantity: number;
  house_available: number;
  fournisseur_id: number;
}

export interface CreateOrderResult {
  order: OrderFull;
  requestedFromSupplier: StockRequestItem[];
}

export interface AppNotification {
  id: number;
  user_id: number;
  type: 'stock_request' | 'new_product';
  title: string;
  body: string;
  product_id: number | null;
  image_url?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface CreateNotificationInput {
  user_id: number;
  type: AppNotification['type'];
  title: string;
  body: string;
  product_id?: number | null;
  image_url?: string | null;
}

export type ApiKeyStatus = 'active' | 'revoked';

export interface ApiKey {
  id: number;
  user_id: number;
  name: string;
  /** Short public identifier shown in the dashboard (never the secret). */
  prefix: string;
  /** SHA-256 hex digest of the secret — the secret itself is only returned once at creation. */
  token_hash: string;
  status: ApiKeyStatus;
  last_used_at: string | null;
  created_at: string;
}

export interface CreateApiKeyResult {
  /** The actual secret. Only returned this once — it is stored hashed. */
  plaintext: string;
  key: ApiKey;
}

export type StaffActivityType =
  | 'ticket_reply'
  | 'chat_reply'
  | 'order_confirm'
  | 'return_process'
  | 'product_moderate'
  | 'pick_create'
  | 'pick_scan'
  | 'refill_create'
  | 'refill_update'
  | 'followup'
  | 'command_create'
  | 'command_forward';

export interface StaffActivityInput {
  user_id: number;
  user_name: string;
  role: string;
  activity_type: StaffActivityType;
  /** Short human-readable context shown in the dashboard timeline. */
  label?: string | null;
  /** Id of the underlying entity (order, ticket, product, conversation…). */
  ref_id?: number | null;
  quantity?: number | null;
  /** Response/processing time in seconds (used for speed scoring). */
  duration_seconds?: number | null;
}

export interface StaffActivityRow extends StaffActivityInput {
  id: number;
  created_at: string;
}

export interface ListOrdersOpts {
  role: Role;
  userId: number;
}

export interface ListProductsOpts {
  q?: string;
  fournisseurId?: number;
  activeOnly?: boolean;
  hideIneligible?: boolean;
  /** Categories to hide from the result (e.g. marketplace should hide fulfillment products). */
  excludeCategories?: ProductCategory[];
}

export interface ListTicketsOpts {
  role: Role;
  userId: number;
}

export interface ListReturnsOpts {
  role: Role;
  userId: number;
}

export type PayoutMethod = 'manual' | 'flouci' | 'bank' | 'd17';

export interface Payout {
  id: number;
  recipient_id: number;
  recipient_name: string;
  recipient_role: 'seller' | 'customer';
  amount: number;
  period: string | null;
  status: PayoutStatus;
  notes: string | null;
  method: PayoutMethod | null;
  flouci_payment_id: string | null;
  flouci_link: string | null;
  flouci_status: string | null;
  flouci_tracking_id: string | null;
  created_at: string;
  paid_at: string | null;
}

export interface CreatePayoutInput {
  recipient_id: number;
  recipient_role: 'seller' | 'customer';
  amount: number;
  period?: string | null;
  notes?: string | null;
  method?: PayoutMethod | null;
  flouci_payment_id?: string | null;
  flouci_link?: string | null;
  flouci_status?: string | null;
  flouci_tracking_id?: string | null;
}

export type ServiceInscriptionStatus = 'pending' | 'confirmed' | 'rejected';

export interface ServiceInscription {
  id: number;
  user_id: number;
  user_name: string | null;
  email: string | null;
  service: string;
  status: ServiceInscriptionStatus;
  amount: number;
  notes: string | null;
  confirmed_by: string | null;
  created_at: string;
  confirmed_at: string | null;
  orders_count?: number;
}

export interface CreateServiceInscriptionInput {
  user_id: number;
  service: string;
  amount: number;
  notes?: string | null;
}

export interface FlouciWallet {
  user_id: number;
  identifier: string;
  created_at: string;
  updated_at: string;
}

export interface SupplierFinanceRow {
  id: number;
  name: string;
  email: string;
  total_orders: number;
  total_products: number;
  earned: number;
  paid: number;
  owed: number;
}

export interface DropshipperFinanceRow {
  id: number;
  name: string;
  email: string;
  total_orders: number;
  total_sales: number;
  profit: number;
  paid: number;
  owed: number;
}

/** A delivered commande's 3% platform commission. */
export interface PlatformCommissionRow {
  id: number;
  order_number: string;
  dropshipper_id: number;
  dropshipper_name: string;
  total: number;
  commission: number;
  delivered_at: string | null;
}

export interface PlatformEarnings {
  total: number;
  orders: PlatformCommissionRow[];
}

/** One product a fournisseur must restock because house stock cannot cover current demand. */
export interface FulfillmentItem {
  product_id: number;
  product_name: string;
  image_url: string | null;
  demanded: number;
  house: number;
  missing: number;
}

export interface FulfillmentGroup {
  fournisseur_id: number;
  fournisseur_name: string;
  total_demand: number;
  total_house: number;
  total_missing: number;
  items: FulfillmentItem[];
}

export interface Inventory {
  id: number;
  code: string;
  name: string;
  location: string | null;
  capacity: number;
  used: number;
  item_count: number;
  created_at: string;
}

export interface InventoryItem {
  product_id: number;
  product_name: string;
  image_url: string | null;
  quantity: number;
}

export interface InventoryDetail extends Inventory {
  items: InventoryItem[];
}

export interface SupplierWarehouse {
  id: number;
  fournisseur_id: number | null;
  owner_name: string | null;
  name: string;
  phone1: string;
  phone2: string;
  country: string;
  location: string;
  address1: string;
  address2: string;
  created_at: string;
}

export interface CreateSupplierWarehouseInput {
  fournisseur_id?: number | null;
  name: string;
  phone1?: string;
  phone2?: string;
  country?: string;
  location?: string;
  address1?: string;
  address2?: string;
}

export interface FulfillmentAllocationDetail {
  inventory_id: number;
  inventory_name: string;
  product_id: number;
  product_name: string;
  quantity: number;
}

export interface FulfillmentAllocationResult {
  allocations: FulfillmentAllocationDetail[];
  leftover: { product_id: number; product_name: string; quantity: number }[];
}

export interface Store {
  findUserByEmail(email: string): Promise<DbUser | null>;
  findOrderByCode(code: string): Promise<OrderFull | null>;
  scanOrder(id: number, action: ScanAction, confirmedBy?: number | null): Promise<OrderFull>;
  finalizeAutoDeliveries(): Promise<number>;
  findUserById(id: number): Promise<DbUser | null>;
  createUser(input: CreateUserInput): Promise<DbUser>;
  listUsers(): Promise<DbUserPublic[]>;
  updateUser(id: number, patch: { name?: string; role?: Role; photo?: string | null; cin?: string | null }): Promise<void>;
  deleteUser(id: number): Promise<void>;

  listProducts(opts?: ListProductsOpts): Promise<ProductWithSupplier[]>;
  listStockingProducts(q?: string): Promise<StockingProduct[]>;
  moderateProduct(id: number, status: 'approved' | 'refused' | 'hidden', note?: string | null): Promise<void>;
  getProduct(id: number): Promise<DbProduct | null>;
  createProduct(input: CreateProductInput): Promise<DbProduct>;
  updateProduct(id: number, patch: Partial<CreateProductInput> & { is_active?: boolean }): Promise<void>;
  nextBarcode(): Promise<string>;
  deleteProduct(id: number): Promise<void>;
  setStock(id: number, stock: number): Promise<void>;
  updateRating(id: number, avg: number, count: number): Promise<void>;
  insertRating(input: { product_id: number; user_id: number; score: number; comment?: string | null }): Promise<void>;
  getProductRatings(productId: number): Promise<{ avg: number; count: number }>;

  listOrders(opts: ListOrdersOpts): Promise<OrderFull[]>;
  getOrder(id: number): Promise<OrderFull | null>;
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
  updateOrderStatus(id: number, status: OrderStatus): Promise<void>;
  setDeliveryCompany(id: number, deliveryCompany: string | null): Promise<void>;
  setDeliveryStatus(id: number, deliveryStatus: string): Promise<void>;
  setOrderBarcode(id: number, barcode: string): Promise<void>;
  /** Permanently remove a commande (frees its claimed retour-pool and committed stock). */
  deleteOrder(id: number): Promise<void>;
  updatePayment(id: number, payment_status: PaymentStatus, method?: string | null): Promise<void>;
  addTracking(order_id: number, data: { carrier: string; tracking_number: string; status: string; detail?: string }): Promise<void>;

  listNotifications(userId: number): Promise<AppNotification[]>;
  notificationUnread(userId: number): Promise<number>;
  markNotificationsRead(userId: number): Promise<void>;
  createNotification(input: CreateNotificationInput): Promise<void>;

  createApiKey(userId: number, name: string): Promise<CreateApiKeyResult>;
  listApiKeys(userId: number): Promise<ApiKey[]>;
  revokeApiKey(userId: number, keyId: number): Promise<void>;
  touchApiKey(keyId: number): Promise<void>;
  findUserByApiKey(plaintext: string): Promise<{ user: DbUserPublic; keyId: number } | null>;

  getIntegrationSetting(companyId: string): Promise<{ company_id: string; api_key: string; enabled: boolean }>;
  getAllIntegrationSettings(): Promise<Record<string, { api_key: string; enabled: boolean }>>;
  setIntegrationSetting(companyId: string, apiKey: string, enabled: boolean): Promise<void>;

  /** Write an audited staff action (feeds the staff team dashboard). */
  logStaffActivity(input: StaffActivityInput): Promise<void>;
  /** List staff activity audit rows, optionally filtered to one user. */
  listStaffActivity(opts?: { userId?: number; limit?: number }): Promise<StaffActivityRow[]>;

  listTickets(opts: ListTicketsOpts): Promise<TicketFull[]>;
  createTicket(input: { user_id: number; email: string; type: string; message: string; assigned_to?: number | null }): Promise<void>;
  replyTicket(id: number, answer: string, status: DbTicket['status']): Promise<void>;

  saveProduct(dropshipper_id: number, product_id: number, offer_type?: 'dropshipping' | 'wholesale'): Promise<void>;
  setSavedProductPrice(dropshipper_id: number, product_id: number, price: number | null): Promise<void>;
  removeSavedProduct(dropshipper_id: number, product_id: number): Promise<void>;
  listSavedProducts(dropshipper_id: number): Promise<SavedProductView[]>;
  logProductUpdate(product_id: number, field: string, oldValue: unknown, newValue: unknown): Promise<void>;

  createReturnRequest(input: { dropshipper_id: number; order_id: number; type: ReturnType; reason: string; attachments?: string[]; autoApproved?: boolean }): Promise<void>;
  listReturnRequests(opts: ListReturnsOpts): Promise<ReturnRequest[]>;
  listRetourOrdersForChef(excludeOrderIds: Set<number>): Promise<RetourOrderSummary[]>;
  getReturnOrderProducts(orderIds: number[]): Promise<Map<number, { product_name: string; quantity: number }[]>>;
  updateReturnRequest(id: number, patch: {
    status?: ReturnStatus;
    reply?: string | null;
    approval_status?: ReturnApprovalStatus | null;
    delivery_type?: string | null;
    process_type?: string | null;
    carrier?: string | null;
    return_delivery_status?: ReturnDeliveryStatus | null;
    exchange_delivery_status?: ExchangeDeliveryStatus | null;
  }): Promise<void>;

  listTransferShipments(): Promise<TransferShipment[]>;
  listChefShipments(): Promise<ShipmentRow[]>;
  getChefShipment(id: number): Promise<ShipmentRow | null>;
  listPickupRequests(): Promise<PickupRequest[]>;
  listManifests(): Promise<Manifest[]>;
  getManifest(id: number): Promise<ManifestDetail | null>;
  searchPackingBins(query: PackingBinsQuery): Promise<PackingBinsResult>;
  getPackingBin(id: number): Promise<PackingBin | null>;
  createPackingBin(input: { name: string; reference?: string | null; price?: number; cost?: number; type: PackingBinType; image?: string | null; active?: boolean }): Promise<PackingBin>;
  updatePackingBin(id: number, input: { name?: string; reference?: string | null; price?: number; cost?: number; type?: PackingBinType; image?: string | null; active?: boolean }): Promise<PackingBin | null>;
  deletePackingBin(id: number): Promise<boolean>;
  listTransactions(): Promise<TransactionsResult>;
  listReconciliationReviews(): Promise<ReconciliationReview[]>;
  listSellerOrganizations(query: SellerOrganizationsQuery): Promise<SellerOrganizationsResult>;
  getSellerOrganization(id: number): Promise<SellerOrganization | null>;
  createSellerSignup(input: SellerSignupInput): Promise<SellerOrganization>;
  updateSellerOrganizationTags(id: number, tags: string[]): Promise<SellerOrganization | null>;
  updateSellerOrganizationFlags(id: number, patch: { account_status?: string; allow_marketplace?: boolean; dropshipping_eligible?: boolean }): Promise<SellerOrganization | null>;
  updateSellerOrganizationManagers(id: number, patch: UpdateSellerOrgManagersInput): Promise<SellerOrganization | null>;
  updateSellerOrganizationOnboarding(id: number, status: string): Promise<SellerOrganization | null>;
  setSellerFollowUp(id: number, followUp: SupplierFollowUp | null): Promise<SellerOrganization | null>;
  updateSellerFollowUp(id: number, patch: SupplierFollowUpPatch, actorName: string): Promise<SellerOrganization | null>;
  findSellerOrganizationByEmail(email: string): Promise<SellerOrganization | null>;
  listStaffUsers(): Promise<{ id: number; name: string; role: string }[]>;
  listSupplierOrganizations(query: SupplierOrganizationsQuery): Promise<SupplierOrganizationsResult>;
  createSupplierOrganization(input: CreateSupplierOrganizationInput): Promise<SupplierOrganization>;
  getSupplierOrganizationDetail(id: number): Promise<SupplierOrganizationDetail | null>;
  updateSupplierOrganizationFlags(id: number, patch: UpdateSupplierOrgFlagsInput): Promise<SupplierOrganizationDetail | null>;
  updateSupplierOrganizationLabels(id: number, labels: string[]): Promise<SupplierOrganizationDetail | null>;
  listStockRefillRequests(query: StockRefillRequestsQuery): Promise<StockRefillRequestsResult>;
  getStockRefillRequest(id: number): Promise<StockRefillRequest | null>;
  getStockRefillPickupList(): Promise<StockRefillPickupListResult>;
  createStockRefillRequest(input: SaveStockRefillRequestInput): Promise<StockRefillRequest>;
  updateStockRefillRequest(id: number, input: SaveStockRefillRequestInput): Promise<StockRefillRequest | null>;
  deleteStockRefillRequest(id: number): Promise<boolean>;
  listStorageRequests(query: StorageRequestsQuery): Promise<StorageRequestsResult>;
  getStorageRequest(id: number): Promise<StorageRequest | null>;
  getBatchesByCode(code: string): Promise<StockBatchLookupRow[]>;
  getOrderPickPlan(orderId: number): Promise<PickPlan | null>;
  scanOrderPick(orderId: number, productId: number, inventoryId: number, batchCode: string | null): Promise<PickPlan | null>;
  listOrdersPickability(): Promise<OrderPickabilityRow[]>;
  listWholesaleOrders(): Promise<OrderFull[]>;
  listCancelledOrders(): Promise<OrderFull[]>;
  listStockReturns(): Promise<StockReturnItem[]>;
  storeStockReturns(input: StoreStockReturnsInput): Promise<StockReturnsStoreResult>;
  scanStockReturn(input: StockReturnScanInput): Promise<StockReturnScanResult>;
  listStockShipments(): Promise<StockShipmentOrder[]>;
  setStockShipmentZone(orderId: number, zone: ShipmentZone | null): Promise<void>;
  listOrderPicks(): Promise<OrderPickRow[]>;
  createOrderPick(orderId: number): Promise<OrderPickRow | null>;
  scanOrderPickStatus(orderId: number): Promise<OrderPickRow | null>;
  findSupplierOrgByEmail(email: string): Promise<{ allow_marketplace: boolean; dropshipping_eligible: boolean; account_status: string; labels: string[] } | null>;
  setSupplierFollowUp(id: number, followUp: SupplierFollowUp | null): Promise<SupplierOrganization | null>;
  updateSupplierFollowUp(id: number, patch: SupplierFollowUpPatch, actorName: string): Promise<SupplierOrganization | null>;
  listProductSubscriptions(query: SubscriptionsQuery): Promise<ProductSubscriptionsResult>;
  getProductSubscription(id: number): Promise<ProductSubscription | null>;
  updateProductSubscription(id: number, patch: SubscriptionPatch): Promise<ProductSubscription | null>;
  listCollections(): Promise<CollectionsResult>;
  getCollection(id: number): Promise<CollectionDetail | null>;
  createCollection(input: CollectionInput, actor: string): Promise<CollectionDetail>;
  updateCollection(id: number, input: CollectionInput, actor: string): Promise<CollectionDetail | null>;
  addProductToCollection(collectionId: number, productId: number, actor: string): Promise<CollectionDetail>;
  removeProductFromCollection(collectionId: number, productId: number, actor: string): Promise<CollectionDetail>;
  listCollectionCatalog(): Promise<CollectionProduct[]>;

  supplierFinance(): Promise<SupplierFinanceRow[]>;
  dropshipperFinance(): Promise<DropshipperFinanceRow[]>;
  platformEarnings(): Promise<PlatformEarnings>;
  listPayouts(): Promise<Payout[]>;
  listPayoutsForRecipient(recipientId: number, recipientRole: 'seller' | 'customer'): Promise<Payout[]>;
  getPayoutById(id: number): Promise<Payout | null>;
  getPayoutByFlouciPaymentId(paymentId: string): Promise<Payout | null>;
  createPayout(input: CreatePayoutInput): Promise<number>;
  updatePayoutStatus(id: number, status: PayoutStatus): Promise<void>;
  updatePayoutFlouciStatus(id: number, flouciStatus: string): Promise<void>;
  getFlouciWallet(userId: number): Promise<FlouciWallet | null>;
  setFlouciWallet(userId: number, identifier: string): Promise<void>;
  clearFlouciWallet(userId: number): Promise<void>;

  createServiceInscription(input: CreateServiceInscriptionInput): Promise<ServiceInscription>;
  getServiceInscription(id: number): Promise<ServiceInscription | null>;
  getLatestServiceInscription(userId: number, service: string): Promise<ServiceInscription | null>;
  listConfirmedServiceInscriptions(): Promise<ServiceInscription[]>;
  confirmServiceInscription(id: number, confirmedBy: number): Promise<ServiceInscription | null>;
  listServiceDraftOrders(userId: number): Promise<OrderFull[]>;
  listServiceCommandes(userId: number): Promise<OrderFull[]>;

  fulfillmentReport(): Promise<FulfillmentGroup[]>;

  listInventories(): Promise<Inventory[]>;
  getInventory(id: number): Promise<InventoryDetail | null>;
  getInventoryByCode(code: string): Promise<InventoryDetail | null>;
  createInventory(input: { name: string; location?: string | null; capacity: number }): Promise<Inventory>;
  deleteInventory(id: number): Promise<void>;
  addInventoryStock(inventoryId: number, productId: number, quantity: number): Promise<void>;
  allocateFulfillmentToInventory(fournisseurId: number, inventoryId?: number): Promise<FulfillmentAllocationResult>;

  listSupplierWarehouses(): Promise<SupplierWarehouse[]>;
  createSupplierWarehouse(input: CreateSupplierWarehouseInput): Promise<SupplierWarehouse>;

  trendingProducts(limit?: number): Promise<TrendingItem[]>;
  productSuppliers(productId: number): Promise<SupplierOffer[]>;

  ensureTeamConversation(): Promise<number>;
  ensureStaffConversation(userId: number, peerRole: 'admin'): Promise<number>;
  ensureSupplierConversation(userId: number, supplierId: number): Promise<number>;
  listConversations(userId: number, role: Role): Promise<Conversation[]>;
  listChatMessages(conversationId: number, userId: number): Promise<ChatMessage[]>;
  sendChatMessage(conversationId: number, senderId: number, input: { body: string; image_url?: string | null }): Promise<ChatMessage>;
  markConversationRead(conversationId: number, userId: number): Promise<void>;
  chatUnread(userId: number, role: Role): Promise<number>;
  /** Persist an uploaded file's bytes so they survive server restarts (Render wipes local disk). */
  saveUploadFile(name: string, data: Buffer, contentType: string): Promise<void>;
  getUploadFile(name: string): Promise<{ data: Buffer; contentType: string } | null>;
  raw<T>(sql: string, params?: unknown[]): Promise<T[]>;
}

export class StockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StockError';
  }
}

export type OrderScanErrorCode = 'not_found' | 'conflict' | 'invalid_state';

/** Raised by store.scanOrder for invalid/repeat scans. Mapped to 404/409/400 by the error handler. */
export class OrderScanError extends Error {
  constructor(public code: OrderScanErrorCode, message: string) {
    super(message);
    this.name = 'OrderScanError';
  }
}
