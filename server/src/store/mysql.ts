import mysql, { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import fs from 'node:fs';
import path from 'node:path';
import { logFd } from '../lib/logger';
import { mysqlSsl } from '../config/env';
import { uploadsDir } from '../lib/paths';
import {
  ApiKey,
  AppNotification,
  CreateNotificationInput,
  CreateOrderInput,
  CreateOrderResult,
  CreateProductInput,
  CreateUserInput,
  ChatMessage,
  Conversation,
  ConversationParticipant,
  DbProduct,
  DbTicket,
  DbUser,
  FulfillmentGroup,
  FulfillmentAllocationDetail,
  Inventory,
  WholesaleTier,
  InventoryDetail,
  Manifest,
  ManifestItem,
  ManifestDetail,
  PackingBin,
  PackingBinType,
  PackingBinsQuery,
  PackingBinsResult,
  OrderFull,
  OrderItem,
  OrderScanError,
  OrderStatus,
  PickPlan,
  PickPlanItem,
  PickSample,
  PickSampleBatch,
  OrderPickabilityRow,
  Payout,
  PickupRequest,
  ProductCategory,
  ProductStats,
  ProductWithSupplier,
  StockingProduct,
  ReturnApprovalStatus,
  ReturnRequest,
  ReturnDeliveryStatus,
  ExchangeDeliveryStatus,
  SavedProductView,
  StockRequestItem,
  Store,
  SupplierOffer,
  TicketFull,
  TransferShipment,
  Transaction,
  TransactionsResult,
  ReconciliationReview,
  SellerOrganization,
  SellerOrganizationsQuery,
  SellerOrganizationsResult,
  SellerSignupInput,
  UpdateSellerOrgManagersInput,
  ProductSubscription,
  SubscriptionsQuery,
  ProductSubscriptionsResult,
  Collection,
  CollectionsResult,
  CollectionDetail,
  CollectionInput,
  CollectionProduct,
  CollectionProductItem,
  CatalogOfferType,
  TrendingItem,
  CreateSupplierOrganizationInput,
  SupplierFollowUpPatch,
  UpdateSupplierOrgFlagsInput,
  SaveStockRefillRequestInput,
  StockRefillRequest,
  StockRefillRequestItem,
  StockRefillRequestsQuery,
  StockRefillRequestsResult,
  StockRefillStatus,
  StorageRequest,
  StorageRequestsQuery,
  StorageRequestsResult,
  StockBatchLookupRow,
  PickupListSupplier,
  StockRefillPickupListResult,
  StockShipmentItem,
  StockReturnItem,
  StockReturnsStoreResult,
  StockReturnScanInput,
  StockReturnScanResult,
  StoreStockReturnsInput,
  StockShipmentOrder,
  ShipmentZone,
  OrderPickRow,
  OrderPickStatus,
  ShipmentRow,
  SupplierWarehouse,
  CreateSupplierWarehouseInput,
  StaffActivityInput,
  StaffActivityRow,
  ServiceInscription,
  ServiceInscriptionStatus,
} from './types';
import { inferShipmentZone, isShipmentZone, addBusinessDays } from './shipmentZones';
import { StockError } from './types';
import { computeOrderFromItems, normName, productTrendScore, supplierOfferScore, allocateMissingIntoInventories, InventoryFreeSpace, MissingForAllocation, resolveWholesalePrice } from './shared';
import { buildManifests } from '../data/manifests';
import { buildPickupRequests } from '../data/pickupRequests';
import { buildTransferShipments } from '../data/transferShipments';
import { buildTransactions, TRANSACTION_TOTAL } from '../data/transactions';
import { buildReconciliationReviews } from '../data/reconciliationReviews';
import { searchSellerOrganizations, SELLER_STATUSES, SELLER_SOURCES } from '../data/sellerOrganizations';
import { fdCreateOrder, FdCreateOrderInput } from '../services/firstDelivery';
import {
  SUPPLIER_SOURCES,
  SUPPLIER_STATUSES,
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
  SubscriptionPatch,
} from '../data/productSubscriptions';
import { buildCollections } from '../data/collections';
import { catalogProduct, CATALOG } from '../data/collectionCatalog';
import { mulberry32, MANAGERS } from '../data/shipments';
import { buildLiveSupplierOnboarding, supplierOnboardingHas, SupplierLiveCounts } from './live';

export interface MysqlConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: boolean;
}

type Row<T> = T & RowDataPacket;

const round2 = (n: number) => Math.round(n * 100) / 100;
const round3 = (n: number) => Math.round(n * 1000) / 1000;
const b = (v: unknown): boolean => !!v;

function contentTypeFromFilename(name: string): string {
  const ext = path.extname(name).toLowerCase();
  if (ext === '.pdf') return 'application/pdf';
  if (['.mp4', '.webm', '.mov', '.ogg', '.m4v'].includes(ext)) return 'video/mp4';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.png') return 'image/png';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.bmp') return 'image/bmp';
  return 'application/octet-stream';
}

function parseJsonArray<T>(raw: unknown, fallback: T[]): T[] {
  try {
    const parsed = JSON.parse((raw as string) ?? '[]');
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function mapSellerOrgRow(r: Row<Record<string, unknown>>): SellerOrganization {
  return {
    id: Number(r.id),
    code: r.code as string,
    account_manager: (r.account_manager as string) ?? null,
    business_developer: (r.business_developer as string) ?? null,
    owner_name: r.owner_name as string,
    owner_photo: (r.owner_photo as string) ?? null,
    org_name: (r.org_name as string) ?? null,
    phone: r.phone as string,
    email: r.email as string,
    tags: parseJsonArray<string>(r.tags, []),
    joined_at: (r.joined_at as Date).toISOString(),
    last_seen_at: (r.last_seen_at as Date).toISOString(),
    onboarding: parseJsonArray<SellerOrganization['onboarding'][number]>(r.onboarding, []),
    documents: (r.documents as SellerOrganization['documents']) || 'none',
    follow_up_new: b(r.follow_up_new),
    follow_up: parseJsonCol<SupplierFollowUp | null>(r.follow_up, null),
    source: r.source as string,
    is_main_retailer: b(r.is_main_retailer),
    plus_membership: b(r.plus_membership),
    account_status: (r.account_status as string) ?? 'active',
    allow_marketplace: b(r.allow_marketplace),
    dropshipping_eligible: b(r.dropshipping_eligible),
    doc_files: parseJsonCol<Record<string, string>>(r.doc_files, {}),
    doc_statuses: parseJsonCol<Record<string, string>>(r.doc_statuses, {}),
  };
}

function mapSellerOrgRowFromJoin(r: Row<Record<string, unknown>>): SellerOrganization {
  const hasOrg = r.so_id != null;
  return {
    id: hasOrg ? Number(r.so_id) : -(Number(r.user_id)),
    code: (r.code as string) ?? `USR-${String(r.user_id).padStart(6, '0')}`,
    account_manager: (r.account_manager as string) ?? null,
    business_developer: (r.business_developer as string) ?? null,
    owner_name: hasOrg ? (r.owner_name as string) : (r.user_name as string),
    owner_photo: (r.user_photo as string) ?? null,
    org_name: (r.org_name as string) ?? null,
    phone: (r.phone as string) ?? '',
    email: (r.user_email as string) ?? (r.email as string) ?? '',
    tags: parseJsonArray<string>(r.tags, []),
    joined_at: hasOrg && r.joined_at ? (r.joined_at as Date).toISOString() : new Date(r.user_created_at as Date).toISOString(),
    last_seen_at: hasOrg && r.last_seen_at ? (r.last_seen_at as Date).toISOString() : new Date(r.user_created_at as Date).toISOString(),
    onboarding: parseJsonArray<SellerOrganization['onboarding'][number]>(r.onboarding, []),
    documents: (r.documents as SellerOrganization['documents']) || 'none',
    follow_up_new: b(r.follow_up_new),
    follow_up: parseJsonCol<SupplierFollowUp | null>(r.follow_up, null),
    source: (r.source as string) ?? 'Signup',
    is_main_retailer: b(r.is_main_retailer),
    plus_membership: b(r.plus_membership),
    account_status: (r.account_status as string) ?? 'active',
    allow_marketplace: b(r.allow_marketplace),
    dropshipping_eligible: b(r.dropshipping_eligible),
    doc_files: parseJsonCol<Record<string, string>>(r.doc_files, {}),
    doc_statuses: parseJsonCol<Record<string, string>>(r.doc_statuses, {}),
  };
}

const sha256 = (t: string) => createHash('sha256').update(t).digest('hex');
const newApiToken = () => `sk_live_${randomBytes(24).toString('hex')}`;
const toDbTime = (iso: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
};

const rowToCollection = (r: Row<Record<string, unknown>>): Collection => ({
  id: Number(r.id),
  title: r.title as string,
  description: (r.description as string) ?? '',
  products: Number(r.products),
  created_at: new Date(r.created_at as Date).toISOString(),
  status: ((r.status as Collection['status']) || 'Active') as Collection['status'],
  is_active: b(r.is_active),
  marketplace_sort_rank: r.marketplace_sort_rank == null ? null : Number(r.marketplace_sort_rank),
});

const rowToCollectionProductItem = (r: Row<Record<string, unknown>>): CollectionProductItem => ({
  id: Number(r.product_id),
  name: r.product_name as string,
  emoji: '📦',
  image_url: (r.product_emoji as string) || null,
  eligible_to_marketplace: b(r.eligible_to_marketplace),
  offer_type: (r.offer_type as CatalogOfferType) || 'dropshipping',
  added_by: (r.added_by as string) ?? null,
  added_at: new Date(r.added_at as Date).toISOString(),
});

const insertCollectionProducts = async (
  pool: Pool,
  collectionId: number,
  ids: number[],
): Promise<void> => {
  for (const pid of ids) {
    const [productRows] = await pool.query<Row<Record<string, unknown>>[]>(
      'SELECT id, name, COALESCE(image_url, \'\') AS emoji, category FROM products WHERE id = ?',
      [pid],
    );
    const p = productRows[0];
    if (!p) continue;
    await pool.execute(
      'INSERT IGNORE INTO collection_products (collection_id, product_id, product_name, product_emoji, eligible_to_marketplace, offer_type, added_by, added_at) VALUES (?,?,?,?,?,?,?,?)',
      [
        collectionId, Number(p.id), p.name, p.emoji, 1, (p.category as CatalogOfferType) || 'dropshipping',
        null,
        toDbTime(new Date().toISOString()),
      ],
    );
  }
};

const mapApiKey = (r: Row<Record<string, unknown>>): ApiKey => ({
  id: Number(r.id),
  user_id: Number(r.user_id),
  name: r.name as string,
  prefix: r.prefix as string,
  token_hash: r.token_hash as string,
  status: (r.status as ApiKey['status']) ?? 'active',
  last_used_at: r.last_used_at == null ? null : (r.last_used_at as Date).toISOString(),
  created_at: (r.created_at as Date).toISOString(),
});

const parseJsonCol = <T,>(v: unknown, dflt: T): T => {
  if (v == null) return dflt;
  if (typeof v === 'object') return v as T;
  try {
    return JSON.parse(String(v)) as T;
  } catch {
    return dflt;
  }
};

const dateIsoOrNow = (v: unknown): string => {
  const d = v instanceof Date ? v : new Date(String(v));
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

const refillItemRow = (r: Row<Record<string, unknown>>): StockRefillRequestItem => ({
  id: Number(r.id),
  request_id: Number(r.request_id),
  product_name: (r.product_name as string) ?? '',
  color: (r.color as string) ?? null,
  image_url: (r.image_url as string) ?? null,
  expected_incoming: Number(r.expected_incoming ?? 0),
  supplier_stock: Number(r.supplier_stock ?? 0),
  our_stock: Number(r.our_stock ?? 0),
  period_consumption: Number(r.period_consumption ?? 0),
  qty_non_confirmed: Number(r.qty_non_confirmed ?? 0),
  qty_required_orders: Number(r.qty_required_orders ?? 0),
  qty_to_request: Number(r.qty_to_request ?? 0),
  qty_picked: Number(r.qty_picked ?? 0),
  unit_price: round3(Number(r.unit_price ?? 0)),
});

const refillRow = (r: Row<Record<string, unknown>>, items: StockRefillRequestItem[] = []): StockRefillRequest => ({
  id: Number(r.id),
  supplier: r.supplier as string,
  products: Number(r.products ?? 0),
  storage_request: (r.storage_request as string) ?? null,
  reservation: (r.reservation as string) ?? null,
  date: dateIsoOrNow(r.date),
  status: (String(r.status) as StockRefillStatus) ?? 'Pending',
  items,
});

const storageRequestRow = (r: Row<Record<string, unknown>>): StorageRequest => ({
  id: Number(r.id),
  gid: r.gid as string,
  client: r.client as string,
  related_refill_id: r.related_refill_id === null || r.related_refill_id === undefined ? null : Number(r.related_refill_id),
  failed_qc: Number(r.failed_qc ?? 0),
  products: Number(r.products ?? 0),
  discrepancies: (r.discrepancies as string) ?? null,
  status: (String(r.status) as StorageRequest['status']) ?? 'Pending',
  created_at: dateIsoOrNow(r.created_at),
});

const rowToSupplierOrg = (r: Row<Record<string, unknown>>): SupplierOrganization => ({
  id: Number(r.id),
  code: (r.code as string) ?? '',
  account_manager: (r.account_manager as string) ?? null,
  owner_name: (r.owner_name as string) ?? '',
  owner_photo: (r._uphoto as string) ?? null,
  org_name: (r.org_name as string) ?? '',
  city: (r.city as string) ?? '',
  email: (r.email as string) ?? '',
  phone: (r.phone as string) ?? '',
  phone_full: (r.phone_full as string) ?? '',
  tax_id: (r.tax_id as string) ?? '',
  registration_pct: Number(r.registration_pct ?? 0),
  rne_code: (r.rne_code as string) ?? '',
  main_type_supplier: b(r.main_type_supplier),
  onboarding: parseJsonCol<{ label: string; ok: boolean }[]>(r.onboarding, []),
  documents: (r.documents as SupplierOrganization['documents']) ?? null,
  follow_up: parseJsonCol<SupplierFollowUp | null>(r.follow_up, null),
  source: (r.source as string) ?? '',
  labels: parseJsonCol<string[]>(r.labels, []),
  joined_at: dateIsoOrNow(r.joined_at),
  last_seen_at: dateIsoOrNow(r.last_seen_at),
});

const rowToSupplierOrgDetail = (r: Row<Record<string, unknown>>): SupplierOrganizationDetail => ({
  ...rowToSupplierOrg(r),
  about: (r.about as string) ?? null,
  role: (r.role as string) ?? 'supplier',
  entity_type: (r.entity_type as string) ?? 'business',
  national_id: (r.national_id as string) ?? null,
  vat_code: (r.vat_code as string) ?? null,
  branch_number: (r.branch_number as string) ?? null,
  legal_name: (r.legal_name as string) ?? null,
  related_seller: parseJsonCol<{ name: string; code: string } | null>(r.related_seller, null),
  affiliated_by: parseJsonCol<{ name: string; code: string } | null>(r.affiliated_by, null),
  call_schedule: b(r.call_schedule),
  orders_prep_average_time: (r.orders_prep_average_time as string) ?? null,
  fulfillment_rate: r.fulfillment_rate == null ? null : Number(r.fulfillment_rate),
  on_time_fulfillment_rate: r.on_time_fulfillment_rate == null ? null : Number(r.on_time_fulfillment_rate),
  allow_marketplace: b(r.allow_marketplace),
  dropshipping_eligible: b(r.dropshipping_eligible),
  account_status: ((): SupplierOrganizationDetail['account_status'] => {
    const v = String(r.account_status ?? 'active');
    return v === 'registration_uncompleted' || v === 'inactive' ? v : 'active';
  })(),
  business_developer: (r.business_developer as string) ?? null,
  doc_files: parseJsonCol<Record<string, string>>(r.doc_files, {}),
  doc_statuses: parseJsonCol<Record<string, string>>(r.doc_statuses, {}),
});

const SUPPLIER_CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const makeSupplierCode = (): string =>
  `${SUPPLIER_CODE_LETTERS[Math.floor(Math.random() * SUPPLIER_CODE_LETTERS.length)]}` +
  `${SUPPLIER_CODE_LETTERS[Math.floor(Math.random() * SUPPLIER_CODE_LETTERS.length)]}` +
  `${Math.floor(1000 + Math.random() * 9000)}`;

function sortSupplierOrgs(rows: SupplierOrganization[], field: string, dir: 1 | -1): void {
  const getVal = (r: SupplierOrganization): string => {
    switch (field) {
      case 'name': return r.org_name;
      case 'code': return r.code;
      case 'last_seen_at': return r.last_seen_at;
      case 'source': return r.source;
      case 'follow_up': return r.follow_up ? '1' : '0';
      case 'documents': return r.documents ? '1' : '0';
      default: return r.joined_at;
    }
  };
  rows.sort((a, b) => {
    const va = getVal(a);
    const vb = getVal(b);
    if (va < vb) return -dir;
    if (va > vb) return dir;
    return (a.id - b.id) * dir;
  });
}

const newSupplierOnboarding = (): { label: string; ok: boolean }[] => [
  { label: 'Active', ok: true },
  { label: 'Has 0 added products', ok: false },
  { label: 'Has 0 active products', ok: false },
  { label: 'Has packing material', ok: false },
  { label: 'Has 0 active warehouses', ok: false },
  { label: 'Has active subscriptions', ok: false },
];

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','customer','seller') NOT NULL DEFAULT 'customer',
  photo VARCHAR(500) NULL,
  cin VARCHAR(50) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS stock_refill_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supplier VARCHAR(200) NOT NULL,
  products INT NOT NULL DEFAULT 0,
  storage_request VARCHAR(50) NULL,
  reservation VARCHAR(50) NULL,
  date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('Pending','Confirmed','Approved','In preparation','Ready','Shipped','Completed','Rejected') NOT NULL DEFAULT 'Pending'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS storage_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gid VARCHAR(40) NOT NULL,
  client VARCHAR(200) NOT NULL,
  related_refill_id INT NULL,
  failed_qc INT NOT NULL DEFAULT 0,
  products INT NOT NULL DEFAULT 0,
  discrepancies VARCHAR(300) NULL,
  status ENUM('Pending','Confirmed') NOT NULL DEFAULT 'Pending',
  created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS stock_batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  batch_code VARCHAR(40) NOT NULL,
  request_id INT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  inventory_id INT NULL,
  product_id INT NULL,
  product_name VARCHAR(255) NOT NULL,
  color VARCHAR(100) NULL,
  supplier VARCHAR(200) NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  created_at DATETIME NULL,
  KEY idx_sb_code (batch_code),
  KEY idx_sb_request (request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_picks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  inventory_id INT NOT NULL,
  batch_code VARCHAR(40) NULL,
  quantity INT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_op_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS return_stored_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  inventory_id INT NULL,
  quantity INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_rsi_order (order_id),
  UNIQUE KEY uq_rsi_opi (order_id, product_id, inventory_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS stock_refill_request_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  request_id INT NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  color VARCHAR(100) NULL,
  image_url VARCHAR(500) NULL,
  expected_incoming INT NOT NULL DEFAULT 0,
  supplier_stock INT NOT NULL DEFAULT 0,
  our_stock INT NOT NULL DEFAULT 0,
  period_consumption INT NOT NULL DEFAULT 0,
  qty_non_confirmed INT NOT NULL DEFAULT 0,
  qty_required_orders INT NOT NULL DEFAULT 0,
  qty_to_request INT NOT NULL DEFAULT 0,
  qty_picked INT NOT NULL DEFAULT 0,
  unit_price DECIMAL(12,3) NOT NULL DEFAULT 0,
  CONSTRAINT fk_refill_items_request FOREIGN KEY (request_id) REFERENCES stock_refill_requests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fournisseur_id INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  category VARCHAR(30) NOT NULL DEFAULT 'dropshipping',
  offers VARCHAR(120) NULL,
  retail_category VARCHAR(255) NULL,
  height DECIMAL(10,2) NULL,
  length DECIMAL(10,2) NULL,
  width DECIMAL(10,2) NULL,
  weight DECIMAL(10,2) NULL,
  stock INT NOT NULL DEFAULT 0,
  house_stock INT NOT NULL DEFAULT 0,
  committed_stock INT NOT NULL DEFAULT 0,
  sku VARCHAR(100) NULL,
  barcode VARCHAR(100) NULL,
  image_url VARCHAR(500) NULL,
  video_url VARCHAR(500) NULL,
  images JSON NULL,
  videos JSON NULL,
  keywords JSON NULL,
  specifications JSON NULL,
  wholesale_tiers JSON NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 0,
  moderation_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  moderation_note TEXT NULL,
  rating DECIMAL(3,2) NOT NULL DEFAULT 0,
  rating_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_supplier FOREIGN KEY (fournisseur_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(50) NOT NULL UNIQUE,
  barcode VARCHAR(80) NULL,
  dropshipper_id INT NOT NULL,
  fournisseur_id INT NOT NULL,
  customer_name VARCHAR(120) NULL,
  customer_phone VARCHAR(80) NULL,
  governorate VARCHAR(50) NULL,
  city VARCHAR(100) NULL,
  shipping_address VARCHAR(500) NULL,
  status ENUM('draft','pending','confirmed','shipped','delivered','cancelled','retour') NOT NULL DEFAULT 'draft',
  order_type VARCHAR(20) NOT NULL DEFAULT 'dropshipping',
  payment_status ENUM('unpaid','paid') NOT NULL DEFAULT 'unpaid',
  payment_method VARCHAR(50) NULL,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
  profit DECIMAL(12,2) NOT NULL DEFAULT 0,
  commission DECIMAL(12,2) NOT NULL DEFAULT 0,
  confirmed_at TIMESTAMP NULL,
  confirmed_by INT NULL,
  shipped_at TIMESTAMP NULL,
  delivered_at TIMESTAMP NULL,
  returned_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_orders_ds FOREIGN KEY (dropshipper_id) REFERENCES users(id),
  CONSTRAINT fk_orders_sup FOREIGN KEY (fournisseur_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  house_qty INT NOT NULL DEFAULT 0,
  supplier_qty INT NOT NULL DEFAULT 0,
  price DECIMAL(10,2) NOT NULL,
  cost DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tracks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  carrier VARCHAR(120) NULL,
  tracking_number VARCHAR(200) NULL,
  status VARCHAR(120) NULL,
  detail TEXT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tracks_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ratings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  user_id INT NOT NULL,
  score INT NOT NULL,
  comment TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ratings_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_ratings_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS support_tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  email VARCHAR(255) NOT NULL,
  type VARCHAR(80) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('open','answered','closed') NOT NULL DEFAULT 'open',
  answer TEXT NULL,
  assigned_to INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tickets_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_tickets_assigned FOREIGN KEY (assigned_to) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS saved_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dropshipper_id INT NOT NULL,
  product_id INT NOT NULL,
  my_price DECIMAL(10,2) NULL,
  offer_type VARCHAR(20) NOT NULL DEFAULT 'dropshipping',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_saved (dropshipper_id, product_id),
  CONSTRAINT fk_saved_ds FOREIGN KEY (dropshipper_id) REFERENCES users(id),
  CONSTRAINT fk_saved_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS product_updates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  changed_field VARCHAR(80) NOT NULL,
  old_value VARCHAR(255) NULL,
  new_value VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS return_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  dropshipper_id INT NOT NULL,
  type ENUM('retour','echange') NOT NULL,
  reason TEXT NOT NULL,
  attachments TEXT NULL,
  status ENUM('pending','approved','rejected','processed') NOT NULL DEFAULT 'pending',
  reply TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(120) NULL,
  retailer_name VARCHAR(200) NULL,
  retailer_code VARCHAR(40) NULL,
  retailer_premium TINYINT(1) NOT NULL DEFAULT 0,
  return_address VARCHAR(300) NULL,
  destination_warehouse VARCHAR(120) NULL,
  product_name VARCHAR(200) NULL,
  product_variation VARCHAR(200) NULL,
  product_qty INT NULL,
  approval_status ENUM('approved','waiting') NULL,
  exchange_delivery_status ENUM('awaiting_packaging','at_carrier_facility','on_its_way','delivered') NULL,
  exchange_shipment_id INT NULL,
  return_delivery_status ENUM('awaiting_arrival','canceled','delivered') NULL,
  dispute_status VARCHAR(20) NULL,
  accepted_at TIMESTAMP NULL,
  received_at TIMESTAMP NULL,
  inspection TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_return_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_return_ds FOREIGN KEY (dropshipper_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS transfer_shipments (
  id INT NOT NULL PRIMARY KEY,
  gid VARCHAR(20) NOT NULL,
  client_id INT NOT NULL DEFAULT 1,
  ship_to_name VARCHAR(200) NOT NULL,
  ship_to_code VARCHAR(30) NOT NULL,
  account_manager VARCHAR(120) NOT NULL,
  business_developer VARCHAR(120) NOT NULL,
  account_incubator VARCHAR(120) NULL,
  ship_to VARCHAR(300) NOT NULL,
  created_at DATETIME NOT NULL,
  delivered_at DATETIME NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'packed',
  product_name VARCHAR(200) NOT NULL,
  product_variation VARCHAR(200) NULL,
  pack_units INT NOT NULL DEFAULT 1,
  product_qty INT NOT NULL DEFAULT 1,
  deposit_amount DECIMAL(12,3) NULL,
  deposit_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  payment_amount DECIMAL(12,3) NULL,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  received_units INT NOT NULL DEFAULT 0,
  total_units INT NOT NULL DEFAULT 0,
  carrier_logo VARCHAR(50) NOT NULL,
  tracking_number VARCHAR(80) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pickup_requests (
  id INT NOT NULL PRIMARY KEY,
  gid VARCHAR(20) NOT NULL,
  follow_up_status VARCHAR(30) NOT NULL DEFAULT 'New',
  warehouse VARCHAR(120) NOT NULL,
  address VARCHAR(300) NOT NULL,
  phone_masked VARCHAR(40) NOT NULL,
  phone_full VARCHAR(40) NOT NULL,
  related_label VARCHAR(80) NOT NULL,
  related_type VARCHAR(20) NOT NULL DEFAULT 'shipments',
  processed_by VARCHAR(50) NULL,
  carrier_state VARCHAR(20) NOT NULL DEFAULT 'none',
  carrier_reference VARCHAR(40) NULL,
  carrier_date_label VARCHAR(40) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending',
  pickup_date DATETIME NOT NULL,
  from_time VARCHAR(20) NOT NULL,
  to_time VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS manifests (
  id INT NOT NULL PRIMARY KEY,
  gid VARCHAR(20) NOT NULL,
  manifest_ref VARCHAR(20) NOT NULL,
  fulfiller_name VARCHAR(200) NOT NULL,
  fulfiller_code VARCHAR(30) NOT NULL,
  carrier_logo VARCHAR(50) NOT NULL,
  warehouse VARCHAR(120) NOT NULL,
  supplier_name VARCHAR(200) NULL,
  delivery_company VARCHAR(120) NULL,
  date DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'not_uploaded',
  shipments INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS manifest_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  manifest_id INT NOT NULL,
  order_id INT NOT NULL,
  order_number VARCHAR(50) NOT NULL,
  customer_name VARCHAR(120) NULL,
  governorate VARCHAR(50) NULL,
  city VARCHAR(100) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  product_name VARCHAR(200) NOT NULL,
  product_variation VARCHAR(200) NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  delivered_at TIMESTAMP NULL,
  INDEX idx_mi_manifest (manifest_id),
  INDEX idx_mi_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS transactions (
  id INT NOT NULL PRIMARY KEY,
  gid VARCHAR(20) NOT NULL,
  summary VARCHAR(80) NOT NULL,
  shipment_id VARCHAR(40) NULL,
  shipment_display VARCHAR(20) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  status VARCHAR(20) NOT NULL,
  amount DECIMAL(12,3) NOT NULL,
  payment_method VARCHAR(40) NOT NULL,
  cash_pickup_location VARCHAR(60) NULL,
  from_type VARCHAR(20) NOT NULL,
  from_name VARCHAR(160) NOT NULL,
  from_code VARCHAR(30) NULL,
  to_type VARCHAR(20) NOT NULL,
  to_name VARCHAR(160) NOT NULL,
  to_code VARCHAR(30) NULL,
  follow_up VARCHAR(20) NULL,
  bulk VARCHAR(20) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reconciliation_reviews (
  id INT NOT NULL PRIMARY KEY,
  created_at DATETIME NOT NULL,
  type VARCHAR(60) NOT NULL,
  variance DECIMAL(12,3) NOT NULL,
  current_variance DECIMAL(12,3) NOT NULL,
  status VARCHAR(20) NOT NULL,
  comment VARCHAR(200) NULL,
  reviewed_by VARCHAR(120) NULL,
  cashier_session VARCHAR(30) NOT NULL,
  location VARCHAR(60) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS seller_organizations (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL,
  account_manager VARCHAR(120) NULL,
  business_developer VARCHAR(120) NULL,
  owner_name VARCHAR(120) NOT NULL,
  org_name VARCHAR(160) NULL,
  phone VARCHAR(40) NOT NULL,
  phone_full VARCHAR(60) NULL,
  email VARCHAR(160) NOT NULL,
  city VARCHAR(100) NOT NULL DEFAULT '',
  tags VARCHAR(500) NULL,
  joined_at DATETIME NOT NULL,
  last_seen_at DATETIME NOT NULL,
  onboarding VARCHAR(500) NULL,
  documents VARCHAR(20) NOT NULL DEFAULT 'none',
  doc_files JSON NULL,
  doc_statuses JSON NULL,
  follow_up_new TINYINT(1) NOT NULL DEFAULT 0,
  follow_up JSON NULL,
  source VARCHAR(40) NOT NULL,
  is_main_retailer TINYINT(1) NOT NULL DEFAULT 0,
  plus_membership TINYINT(1) NOT NULL DEFAULT 0,
  account_status VARCHAR(30) NOT NULL DEFAULT 'active',
  allow_marketplace TINYINT(1) NOT NULL DEFAULT 0,
  dropshipping_eligible TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS product_subscriptions (
  id INT NOT NULL PRIMARY KEY,
  product_name VARCHAR(200) NOT NULL,
  product_emoji VARCHAR(16) NULL,
  supplier_name VARCHAR(120) NOT NULL,
  supplier_code VARCHAR(20) NOT NULL,
  retailer_name VARCHAR(120) NOT NULL,
  retailer_code VARCHAR(20) NOT NULL,
  premium VARCHAR(10) NULL,
  cost DECIMAL(12,3) NOT NULL,
  price DECIMAL(12,3) NOT NULL,
  profit_fee DECIMAL(8,3) NOT NULL,
  allow_when_oos TINYINT(1) NOT NULL DEFAULT 0,
  price_constraint TINYINT(1) NOT NULL DEFAULT 0,
  units_sold INT NOT NULL DEFAULT 0,
  started_at DATETIME NOT NULL,
  price_updates INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS collections (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description VARCHAR(500) NULL,
  products INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Active',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  marketplace_sort_rank INT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS collection_products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  collection_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(200) NOT NULL,
  product_emoji VARCHAR(500) NULL,
  eligible_to_marketplace TINYINT(1) NOT NULL DEFAULT 1,
  offer_type VARCHAR(20) NOT NULL DEFAULT 'dropshipping',
  added_by VARCHAR(100) NULL,
  added_at DATETIME NOT NULL,
  CONSTRAINT fk_cp_collection FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS payouts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  recipient_id INT NOT NULL,
  recipient_role ENUM('seller','customer') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  period VARCHAR(50) NULL,
  status ENUM('pending','paid','cancelled') NOT NULL DEFAULT 'pending',
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMP NULL,
  CONSTRAINT fk_payout_recipient FOREIGN KEY (recipient_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS service_inscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  service VARCHAR(40) NOT NULL DEFAULT 'confirmation',
  status ENUM('pending','confirmed','rejected') NOT NULL DEFAULT 'pending',
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes VARCHAR(255) NULL,
  confirmed_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP NULL,
  KEY idx_si_user (user_id),
  KEY idx_si_status (status),
  CONSTRAINT fk_si_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_si_staff FOREIGN KEY (confirmed_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('team','staff','product') NOT NULL DEFAULT 'staff',
  title VARCHAR(200) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS conversation_participants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  user_id INT NOT NULL,
  last_read_message_id INT NULL DEFAULT 0,
  UNIQUE KEY uq_participant (conversation_id, user_id),
  CONSTRAINT fk_part_conv FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_part_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  sender_id INT NOT NULL,
  body TEXT NULL,
  image_url VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_msg_conv FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_user FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(40) NOT NULL DEFAULT 'stock_request',
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  product_id INT NULL,
  image_url VARCHAR(500) NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS api_keys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(120) NOT NULL DEFAULT 'Default key',
  prefix VARCHAR(40) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  last_used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_apikey_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_apikey_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS inventories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  location VARCHAR(200) NULL,
  capacity INT NOT NULL DEFAULT 50,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS inventory_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inventory_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_inv_product (inventory_id, product_id),
  CONSTRAINT fk_inv_room FOREIGN KEY (inventory_id) REFERENCES inventories(id) ON DELETE CASCADE,
  CONSTRAINT fk_inv_product FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS supplier_warehouses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fournisseur_id INT NULL,
  name VARCHAR(160) NOT NULL,
  phone1 VARCHAR(50) NOT NULL DEFAULT '',
  phone2 VARCHAR(50) NOT NULL DEFAULT '',
  country VARCHAR(80) NOT NULL DEFAULT 'Tunisia',
  location VARCHAR(200) NOT NULL DEFAULT '',
  address1 VARCHAR(255) NOT NULL DEFAULT '',
  address2 VARCHAR(255) NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sw_owner FOREIGN KEY (fournisseur_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS supplier_organizations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL,
  account_manager VARCHAR(120) NULL,
  owner_name VARCHAR(160) NOT NULL DEFAULT '',
  org_name VARCHAR(200) NOT NULL DEFAULT '',
  city VARCHAR(100) NOT NULL DEFAULT '',
  email VARCHAR(190) NOT NULL,
  phone VARCHAR(60) NOT NULL DEFAULT '',
  phone_full VARCHAR(60) NULL,
  tax_id VARCHAR(80) NULL,
  rne_code VARCHAR(40) NULL,
  main_type_supplier TINYINT(1) NOT NULL DEFAULT 1,
  onboarding JSON NULL,
  documents JSON NULL,
  doc_files JSON NULL,
  doc_statuses JSON NULL,
  follow_up JSON NULL,
  source VARCHAR(120) NOT NULL DEFAULT '',
  labels JSON NULL,
  joined_at TIMESTAMP NULL,
  last_seen_at TIMESTAMP NULL,
  about TEXT NULL,
  password_hash VARCHAR(200) NOT NULL DEFAULT '',
  business_developer VARCHAR(160) NULL,
  registration_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
  role VARCHAR(30) NOT NULL DEFAULT 'supplier',
  entity_type VARCHAR(30) NOT NULL DEFAULT 'business',
  national_id VARCHAR(50) NULL,
  vat_code VARCHAR(50) NULL,
  branch_number VARCHAR(50) NULL,
  legal_name VARCHAR(200) NULL,
  related_seller JSON NULL,
  affiliated_by JSON NULL,
  call_schedule TINYINT(1) NOT NULL DEFAULT 0,
  orders_prep_average_time VARCHAR(60) NULL,
  fulfillment_rate DECIMAL(5,2) NULL,
  on_time_fulfillment_rate DECIMAL(5,2) NULL,
  allow_marketplace TINYINT(1) NOT NULL DEFAULT 0,
  dropshipping_eligible TINYINT(1) NOT NULL DEFAULT 1,
  account_status VARCHAR(30) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_supplier_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

function rowToPayout(p: Row<Record<string, unknown>>): Payout {
  return {
    id: Number(p.id),
    recipient_id: Number(p.recipient_id),
    recipient_name: p.recipient_name as string,
    recipient_role: p.recipient_role as Payout['recipient_role'],
    amount: Number(p.amount),
    period: (p.period as string) ?? null,
    status: p.status as Payout['status'],
    notes: (p.notes as string) ?? null,
    method: (p.method as Payout['method'] | null) ?? null,
    flouci_payment_id: (p.flouci_payment_id as string) ?? null,
    flouci_link: (p.flouci_link as string) ?? null,
    flouci_status: (p.flouci_status as string) ?? null,
    flouci_tracking_id: (p.flouci_tracking_id as string) ?? null,
    created_at: (p.created_at as Date).toISOString(),
    paid_at: p.paid_at ? (p.paid_at as Date).toISOString() : null,
  };
}

export async function createMysqlStore(cfg: MysqlConfig): Promise<Store> {
  const tls = mysqlSsl(cfg.host);

  const boot = await mysql.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    ssl: tls,
  });
  await boot.query(`CREATE DATABASE IF NOT EXISTS \`${cfg.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await boot.end();

  const pool: Pool = mysql.createPool({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: false,
    ssl: tls,
  });

  type Queryable = Pool | PoolConnection;

  async function row<T extends RowDataPacket>(db: Queryable, sql: string, params?: unknown[]): Promise<T | undefined> {
    const [rows] = await db.query<T[]>(sql, params);
    return rows[0];
  }

  const mapServiceInscriptionRow = (r: Row<Record<string, unknown>>): ServiceInscription => ({
    id: Number(r.id),
    user_id: Number(r.user_id),
    user_name: (r.user_name as string | null) ?? null,
    email: (r.email as string | null) ?? null,
    service: r.service as string,
    status: r.status as ServiceInscriptionStatus,
    amount: Number(r.amount),
    notes: (r.notes as string | null) ?? null,
    confirmed_by: (r.confirmed_by as string | null) ?? null,
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    confirmed_at: r.confirmed_at instanceof Date ? r.confirmed_at.toISOString() : (r.confirmed_at ? String(r.confirmed_at) : null),
    orders_count: r.orders_count !== undefined ? Number(r.orders_count) : undefined,
  });

  async function all<T extends RowDataPacket>(db: Queryable, sql: string, params?: unknown[]): Promise<T[]> {
    const [rows] = await db.query<T[]>(sql, params);
    return rows;
  }

  const invToRow = (r: Row<Record<string, unknown>>): Inventory => ({
    id: Number(r.id),
    code: r.code as string,
    name: r.name as string,
    location: (r.location as string) ?? null,
    capacity: Number(r.capacity),
    used: Number(r.used ?? 0),
    item_count: Number(r.item_count ?? 0),
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  });

  const uniqueCode = () =>
    `INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  async function inventoryDetail(db: Queryable, r: Row<Record<string, unknown>>): Promise<InventoryDetail> {
    const invId = Number(r.id);
    const items = await all<Row<Record<string, unknown>>>(db, `
      SELECT ii.product_id, p.name AS product_name, p.image_url, ii.quantity
      FROM inventory_items ii JOIN products p ON p.id = ii.product_id
      WHERE ii.inventory_id = ? AND ii.quantity > 0 ORDER BY ii.quantity DESC
    `, [invId]);
    const batchItems = await all<Row<Record<string, unknown>>>(db, `
      SELECT MIN(sb.product_name) AS product_name, SUM(sb.quantity) AS quantity, MIN(p.id) AS matched_product_id, MIN(p.image_url) AS image_url
      FROM stock_batches sb LEFT JOIN products p ON LOWER(TRIM(p.name)) = LOWER(TRIM(sb.product_name))
      WHERE sb.inventory_id = ? AND sb.quantity > 0
      GROUP BY LOWER(TRIM(sb.product_name))
      ORDER BY quantity DESC
    `, [invId]);
    const keyOf = (name: string) => name.trim().toLowerCase();
    const merged = new Map<string, { product_id: number; product_name: string; image_url: string | null; quantity: number }>();
    for (const i of items) {
      const k = keyOf(String(i.product_name));
      const cur = merged.get(k);
      if (cur) {
        cur.quantity += Number(i.quantity);
        if (!cur.image_url && i.image_url) cur.image_url = String(i.image_url);
      } else {
        merged.set(k, { product_id: Number(i.product_id), product_name: String(i.product_name), image_url: (i.image_url as string) ?? null, quantity: Number(i.quantity) });
      }
    }
    for (const b of batchItems) {
      const k = keyOf(String(b.product_name));
      const qty = Number(b.quantity ?? 0);
      const cur = merged.get(k);
      if (cur) {
        cur.quantity += qty;
        if (!cur.image_url && b.image_url) cur.image_url = String(b.image_url);
      } else {
        merged.set(k, {
          product_id: b.matched_product_id != null ? Number(b.matched_product_id) : -(merged.size + 1),
          product_name: String(b.product_name),
          image_url: (b.image_url as string) ?? null,
          quantity: qty,
        });
      }
    }
    const finalItems = [...merged.values()].filter((x) => x.quantity > 0).sort((a, b) => b.quantity - a.quantity || a.product_name.localeCompare(b.product_name));
    return {
      ...invToRow(r),
      used: finalItems.reduce((s, x) => s + x.quantity, 0),
      item_count: finalItems.length,
      items: finalItems,
    };
  }

  const parseArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

  async function attachBatches<T extends StockRefillRequest>(db: Queryable, base: T): Promise<T> {
    const rows = await all<Row<Record<string, unknown>>>(
      db,
      'SELECT position, batch_code, SUM(quantity) AS quantity FROM stock_batches WHERE request_id = ? GROUP BY position, batch_code ORDER BY position',
      [base.id]
    );
    return {
      ...base,
      batches: rows.map((b) => ({ position: Number(b.position), batch_code: b.batch_code as string, quantity: Number(b.quantity ?? 0) })),
    };
  }

  const implicitBatchCode = (inventoryId: number, productId: number) => `BTH-I${inventoryId}-P${productId}`;

  async function buildPickPlan(db: Queryable, orderId: number): Promise<PickPlan | null> {
    const o = await row<Row<Record<string, unknown>>>(db, 'SELECT id, order_number, status FROM orders WHERE id = ?', [orderId]);
    if (!o) return null;
    const itemRows = await all<Row<Record<string, unknown>>>(
      db,
      `SELECT oi.product_id, oi.quantity, p.name AS product_name, p.image_url, u.name AS fournisseur_name
       FROM order_items oi JOIN products p ON p.id = oi.product_id JOIN users u ON u.id = p.fournisseur_id
       WHERE oi.order_id = ? ORDER BY oi.id`,
      [orderId]
    );
    const pickRows = await all<Row<{ product_id: number; picked: number }>>(
      db,
      'SELECT product_id, SUM(quantity) AS picked FROM order_picks WHERE order_id = ? GROUP BY product_id',
      [orderId]
    );
    const pickedMap = new Map(pickRows.map((r) => [Number(r.product_id), Number(r.picked ?? 0)]));
    const pickDetailRows = await all<Row<Record<string, unknown>>>(
      db,
      `SELECT op.order_id, op.product_id, SUM(op.quantity) AS quantity, op.batch_code, i.name AS inv_name, i.code AS inv_code
       FROM order_picks op LEFT JOIN inventories i ON i.id = op.inventory_id
       WHERE op.order_id = ?
       GROUP BY op.order_id, op.product_id, op.inventory_id, op.batch_code, i.name, i.code
       ORDER BY MIN(op.id)`,
      [orderId]
    );
    const invRows = await all<Row<Record<string, unknown>>>(
      db,
      `SELECT ii.product_id, ii.quantity, i.id AS inv_id, i.name AS inv_name, i.code AS inv_code
       FROM inventory_items ii JOIN inventories i ON i.id = ii.inventory_id
       WHERE ii.quantity > 0 ORDER BY i.id, ii.quantity DESC`
    );
    const batchRows = await all<Row<Record<string, unknown>>>(
      db,
      `SELECT sb.inventory_id, sb.batch_code, sb.product_id, sb.product_name, sb.quantity, i.name AS inv_name, i.code AS inv_code
       FROM stock_batches sb JOIN inventories i ON i.id = sb.inventory_id
       WHERE sb.quantity > 0 AND sb.request_id >= 0
       ORDER BY sb.id`
    );

    let coverable = true;
    const items: PickPlanItem[] = itemRows.map((it) => {
      const pid = Number(it.product_id);
      const qty = Number(it.quantity);
      const picked = Math.min(qty, pickedMap.get(pid) ?? 0);
      const remaining = Math.max(0, qty - picked);
      const nameKey = String(it.product_name).trim().toLowerCase();
      interface InvAcc { inv_id: number; inv_name: string; inv_code: string; inv_qty: number; batches: PickSampleBatch[] }
      const acc = new Map<number, InvAcc>();
      for (const r of invRows) {
        if (Number(r.product_id) !== pid) continue;
        const iid = Number(r.inv_id);
        const cur = acc.get(iid) ?? { inv_id: iid, inv_name: r.inv_name as string, inv_code: r.inv_code as string, inv_qty: 0, batches: [] };
        cur.inv_qty += Number(r.quantity);
        acc.set(iid, cur);
      }
      for (const b of batchRows) {
        const bid = b.product_id == null ? null : Number(b.product_id);
        if (!((bid !== null && bid === pid) || (bid === null && String(b.product_name).trim().toLowerCase() === nameKey))) continue;
        const iid = Number(b.inventory_id);
        const cur = acc.get(iid) ?? { inv_id: iid, inv_name: b.inv_name as string, inv_code: b.inv_code as string, inv_qty: 0, batches: [] };
        cur.batches.push({ batch_code: String(b.batch_code), quantity: Number(b.quantity) });
        acc.set(iid, cur);
      }
      const samples: PickSample[] = [];
      for (const a of [...acc.values()].sort((x, y) => x.inv_id - y.inv_id)) {
        if (a.inv_qty > 0) {
          const batchedTotal = a.batches.reduce((s, b) => s + b.quantity, 0);
          const implicitQty = Math.max(0, a.inv_qty - batchedTotal);
          if (implicitQty > 0 || a.batches.length === 0) {
            a.batches.push({ batch_code: implicitBatchCode(a.inv_id, pid), quantity: implicitQty });
          }
        }
        const list = a.batches.filter((b) => b.quantity > 0).sort((x, y) => y.quantity - x.quantity);
        const avail = a.inv_qty + list.reduce((s, b) => s + b.quantity, 0);
        if (avail > 0 && list.length > 0) {
          samples.push({
            inventory_id: a.inv_id,
            inventory_name: a.inv_name,
            inventory_code: a.inv_code,
            available: avail,
            batches: list,
          });
        }
      }
      const totalAvail = samples.reduce((s, x) => s + x.available, 0);
      if (remaining > 0 && totalAvail < remaining) coverable = false;
      return {
        product_id: pid,
        product_name: it.product_name as string,
        product_image: (it.image_url as string) ?? null,
        fournisseur_name: (it.fournisseur_name as string) ?? '',
        quantity: qty,
        picked,
        remaining,
        samples,
        picks: pickDetailRows
          .filter((r) => Number(r.product_id) === pid)
          .map((r) => ({
            inventory_name: (r.inv_name as string) ?? '—',
            inventory_code: (r.inv_code as string) ?? '',
            batch_code: (r.batch_code as string) ?? null,
            quantity: Number(r.quantity ?? 1),
          })),
      };
    });

    return {
      order_id: Number(o.id),
      order_number: o.order_number as string,
      status: String(o.status) as OrderStatus,
      complete: items.every((i) => i.remaining === 0),
      coverable,
      items,
    };
  }
  const parseObjArr = (v: unknown): { k: string; v: string }[] => (Array.isArray(v) ? (v as { k: string; v: string }[]) : []);
  const parseTiers = (v: unknown): WholesaleTier[] =>
    Array.isArray(v) ? (v as WholesaleTier[]).filter((t) => Number.isFinite(Number(t.min)) && Number.isFinite(Number(t.max)) && Number.isFinite(Number(t.price))) : [];
  const parseOffers = (v: unknown, fallback: ProductCategory): ProductCategory[] => {
    const valid: ProductCategory[] = ['dropshipping', 'wholesale', 'white_label', 'fulfillment'];
    const raw = typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : Array.isArray(v) ? v : [];
    const list = raw.filter((x): x is ProductCategory => valid.includes(x as ProductCategory));
    return list.length ? list : [fallback];
  };
  const jstr = (v: unknown[] | undefined | null) => (Array.isArray(v) && v.length ? JSON.stringify(v) : null);

  const mapProduct = (p: Row<Record<string, unknown>>, withSupplier = false): ProductWithSupplier => {
    const images = parseArr(p.images);
    const videos = parseArr(p.videos);
    const out: ProductWithSupplier = {
      id: Number(p.id),
      fournisseur_id: Number(p.fournisseur_id),
      name: p.name as string,
      description: (p.description as string) ?? null,
      price: Number(p.price),
      cost_price: Number(p.cost_price),
      category: ((p.category as string) || 'dropshipping') as ProductCategory,
      offers: (() => { const cat = ((p.category as string) || 'dropshipping') as ProductCategory; const o = parseOffers(p.offers, cat); if (cat === 'white_label' && !o.includes('white_label')) o.push('white_label'); return o; })(),
      retail_category: (p.retail_category as string) ?? null,
      height: p.height === undefined || p.height === null ? null : Number(p.height),
      length: p.length === undefined || p.length === null ? null : Number(p.length),
      width: p.width === undefined || p.width === null ? null : Number(p.width),
      weight: p.weight === undefined || p.weight === null ? null : Number(p.weight),
      stock: Number(p.stock),
      house_stock: Number(p.house_stock ?? 0),
      committed_stock: Number(p.committed_stock ?? 0),
      sku: (p.sku as string) ?? null,
      barcode: (p.barcode as string) ?? null,
      image_url: images[0] ?? ((p.image_url as string) ?? null),
      video_url: videos[0] ?? ((p.video_url as string) ?? null),
      images,
      videos,
      keywords: parseArr(p.keywords),
      specifications: parseObjArr(p.specifications),
      wholesale_tiers: parseTiers(p.wholesale_tiers),
      is_active: b(p.is_active),
      moderation_status: (p.moderation_status as string || 'pending') as 'pending' | 'approved' | 'refused' | 'hidden',
      moderation_note: (p.moderation_note as string) ?? null,
      rating: Number(p.rating),
      rating_count: Number(p.rating_count),
      created_at: (p.created_at as Date).toISOString(),
      fournisseur_name: withSupplier ? (p.fournisseur_name as string) : '',
    };
    return out;
  };

  async function loadProductStats(): Promise<Map<number, ProductStats>> {
    const orderRows = await all<Row<Record<string, unknown>>>(pool, `
      SELECT oi.product_id AS product_id,
        COUNT(DISTINCT CASE WHEN o.status <> 'cancelled' THEN o.id END) AS created,
        COUNT(DISTINCT CASE WHEN o.status IN ('confirmed','shipped','delivered') THEN o.id END) AS confirmed,
        COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN (oi.price - oi.cost) * oi.quantity ELSE 0 END), 0) AS profit
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      GROUP BY oi.product_id
    `);
    const returnRows = await all<Row<Record<string, unknown>>>(pool, `
      SELECT oi.product_id AS product_id, COUNT(*) AS returns
      FROM return_requests rr
      JOIN orders o ON o.id = rr.order_id
      JOIN order_items oi ON oi.order_id = o.id
      GROUP BY oi.product_id
    `);
    const map = new Map<number, ProductStats>();
    for (const r of orderRows) {
      map.set(Number(r.product_id), { created: Number(r.created), confirmed: Number(r.confirmed), returns: 0, profit: Number(r.profit) });
    }
    for (const r of returnRows) {
      const pid = Number(r.product_id);
      const cur = map.get(pid) ?? { created: 0, confirmed: 0, returns: 0, profit: 0 };
      cur.returns = Number(r.returns);
      map.set(pid, cur);
    }
    return map;
  }

  const zeroStats = (): ProductStats => ({ created: 0, confirmed: 0, returns: 0, profit: 0 });

  async function productsWithStats(): Promise<ProductWithSupplier[]> {
    const stats = await loadProductStats();
    const rows = await all<Row<Record<string, unknown>>>(pool, 'SELECT p.*, u.name AS fournisseur_name FROM products p JOIN users u ON u.id = p.fournisseur_id');
    return rows.map((p) => {
      const prod = mapProduct(p, true);
      prod.stats = stats.get(prod.id) ?? zeroStats();
      return prod;
    });
  }

  async function seed() {
    const nRows = await all<Row<{ n: number }>>(pool, "SELECT COUNT(*) AS n FROM users");
    const wasEmpty = Number(nRows[0]?.n ?? 0) === 0;

    const hash = bcrypt.hashSync('password', 10);
    const insUser = async (name: string, email: string, role: string, cin: string | null = null) => {
      const existing = await all<Row<{ id: number }>>(pool, 'SELECT id FROM users WHERE email = ?', [email]);
      if (existing.length > 0) {
        if (cin) await pool.execute('UPDATE users SET cin = ? WHERE id = ? AND cin IS NULL', [cin, Number(existing[0].id)]);
        return Number(existing[0].id);
      }
      const [r] = await pool.execute('INSERT INTO users (name, email, password_hash, role, cin) VALUES (?,?,?,?,?)', [name, email, hash, role, cin]);
      return (r as mysql.ResultSetHeader).insertId;
    };
    await insUser('Amine Admin', 'admin@demo.com', 'admin');
    await insUser('Mohamed Admin', 'chef@demo.com', 'admin');
    await insUser('Salma Admin', 'support@demo.com', 'admin');
    const dropshipper_id = await insUser('Sarah Customer', 'dropshipper@demo.com', 'customer', '04678123');
    const a_id = await insUser('Karim Seller', 'fournisseur@demo.com', 'seller');
    const b_id = await insUser('Lina Seller', 'lina@demo.com', 'seller');

    const invRows = await all<Row<{ n: number }>>(pool, 'SELECT COUNT(*) AS n FROM inventories');
    if (Number(invRows[0]?.n ?? 0) === 0) {
      const defaults: [string, string, string][] = [
        ['INV-01A', 'inventory 1', 'Ariana warehouse'],
        ['INV-02B', 'inventory 2', 'Sousse warehouse'],
        ['INV-03C', 'inventory 3', 'Sfax warehouse'],
        ['INV-04D', 'inventory 4', 'Bizerte warehouse'],
      ];
      for (const [code, name, location] of defaults) {
        await pool.execute('INSERT INTO inventories (code, name, location, capacity) VALUES (?,?,?,?)', [code, name, location, 50]);
      }
    }

    const refillRows = await all<Row<{ n: number }>>(pool, 'SELECT COUNT(*) AS n FROM stock_refill_requests');
    if (Number(refillRows[0]?.n ?? 0) === 0) {
      const suppliers = [
        'Sté Tarek Verre', 'GC1203 — Test Supplier SARL', 'Textile Monastir', 'Chemi Nabeul',
        'Plastifoot Sfax', 'Bois & Déco Kairouan', 'Metaux Bizerte', 'Cosmet Djerba',
      ];
      const statuses: StockRefillStatus[] = ['Pending', 'Approved', 'In preparation', 'Ready', 'Shipped', 'Completed', 'Rejected'];
      for (let i = 1; i <= 26; i++) {
        const d = new Date(Date.now() - i * 36 * 3600 * 1000);
        await pool.execute(
          'INSERT INTO stock_refill_requests (supplier, products, storage_request, reservation, date, status) VALUES (?,?,?,?,?,?)',
          [
            suppliers[i % suppliers.length],
            5 + ((i * 7) % 40),
            i % 3 === 0 ? null : `SR-${2400 + i}`,
            i % 4 === 0 ? null : `RSV-${5100 + i}`,
            d.toISOString().slice(0, 19).replace('T', ' '),
            statuses[i % statuses.length],
          ]
        );
      }
    }

    const storageRows = await all<Row<{ n: number }>>(pool, 'SELECT COUNT(*) AS n FROM storage_requests');
    if (Number(storageRows[0]?.n ?? 0) === 0) {
      const clients = [
        'Nour Boutique', 'Medina Store', 'Sahab Décor', 'Yasmine Trade', 'El Félix Shop',
        'Carthage Mobiles', 'Sidi Bou Home', 'Gammarth Beauty', 'Ariana Tech', 'Soukra Kids',
      ];
      const discPool: (string | null)[] = [null, null, '2 cartons damaged', '-3 units vs manifest', '1 missing SKU', null, '+5 unexpected units'];
      const insStorage = async (sid: number, daysAgo: number) => {
        await pool.execute(
          'INSERT INTO storage_requests (id, gid, client, related_refill_id, failed_qc, products, discrepancies, status, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
          [
            sid,
            `SRG-${9000 + sid}`,
            clients[sid % clients.length],
            null,
            sid % 4 === 0 ? 1 + (sid % 3) : 0,
            6 + ((sid * 13) % 45),
            discPool[sid % discPool.length],
            'Pending',
            new Date(Date.now() - daysAgo * 36 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' '),
          ]
        );
      };
      for (let i = 1; i <= 26; i++) {
        if (i % 3 !== 0) await insStorage(2400 + i, i);
      }
      for (let id = 101; id <= 146; id++) {
        await insStorage(id, (id % 20) + 1);
      }
    }

    const itemSeedRows = await all<Row<{ n: number }>>(pool, 'SELECT COUNT(*) AS n FROM stock_refill_request_items');    if (Number(itemSeedRows[0]?.n ?? 0) === 0) {
      const demoItems: [string, string | null, number, number, number, number, number, number, number][] = [
        ['Appareil de nettoyage du visage', null, 0, 233, 7, 5, 5, 1, 4],
        ['Lampe de camping rétro', 'noir', 0, 0, 0, 7, 0, 7, 14],
        ['Miroir cosmétique LED', null, 0, 142, 0, 0, 0, 1, 1],
        ['Miroir cosmétique LED à la mode', null, 0, 285, 0, 1, 1, 1, 3],
        ['Montre électronique', null, 0, 120, 5, 4, 2, 3, 4],
        ['Casque audio sans fil', 'blanc', 12, 90, 15, 6, 4, 9, 11],
        ['Enceinte Bluetooth étanche', null, 0, 64, 8, 3, 2, 5, 7],
        ['Chargeur solaire portable', null, 20, 210, 22, 9, 7, 14, 16],
      ];
      const firstRequests = await all<Row<{ id: number }>>(
        pool,
        'SELECT id FROM stock_refill_requests ORDER BY id ASC LIMIT 8'
      );
      for (let i = 0; i < firstRequests.length; i++) {
        const [name, color, expIn, supStock, ourStock, consumption, nonConfirmed, required, toRequest] = demoItems[i % demoItems.length];
        await pool.execute(
          `INSERT INTO stock_refill_request_items
            (request_id, product_name, color, image_url, expected_incoming, supplier_stock, our_stock, period_consumption, qty_non_confirmed, qty_required_orders, qty_to_request)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [firstRequests[i]!.id, name, color, null, expIn, supStock, ourStock, consumption, nonConfirmed, required, toRequest]
        );
      }
    }

    // Always ensure manifests + manifest_items are seeded (independent of wasEmpty guard)
    const manifestCount = await row<Row<{ n: number }>>(pool, 'SELECT COUNT(*) AS n FROM manifests');
    if (Number(manifestCount?.n ?? 0) === 0) {
      const insManifestSeed = async (m: Manifest) => {
        await pool.execute('INSERT INTO manifests (id, gid, manifest_ref, fulfiller_name, fulfiller_code, carrier_logo, warehouse, supplier_name, delivery_company, date, status, shipments) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', [
          m.id, m.gid, m.manifest_ref, m.fulfiller_name, m.fulfiller_code, m.carrier_logo, m.warehouse, m.supplier_name, m.delivery_company, m.date, m.status, m.shipments,
        ]);
      };
      for (const m of buildManifests().slice(0, 30)) {
        try { await insManifestSeed(m); } catch {}
      }
    }
    const miCount = await row<Row<{ cnt: string }>>(pool, 'SELECT COUNT(*) AS cnt FROM manifest_items');
    if (Number(miCount?.cnt ?? 0) === 0) {
      const seedManifests = await all<Row<{ id: number }>>(pool, 'SELECT id FROM manifests ORDER BY id DESC LIMIT 10');
      const realOrders = await all<Row<Record<string, unknown>>>(pool,
        `SELECT o.id AS order_id, o.order_number, o.customer_name, o.governorate, o.city, o.status, o.delivery_company, o.created_at, o.delivered_at,
                oi.product_id, oi.quantity, oi.price, p.name AS product_name, p.image_url,
                u.name AS supplier_name
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         JOIN products p ON p.id = oi.product_id
         JOIN users u ON u.id = p.fournisseur_id
         WHERE o.status <> 'cancelled'
         ORDER BY o.id DESC LIMIT 80`
      );
      if (realOrders.length > 0 && seedManifests.length > 0) {
        for (let i = 0; i < realOrders.length; i++) {
          const r = realOrders[i];
          const manifestId = seedManifests[i % seedManifests.length].id;
          await pool.execute(
            'INSERT INTO manifest_items (manifest_id, order_id, order_number, customer_name, governorate, city, status, product_name, quantity, unit_price, created_at, delivered_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
            [manifestId, r.order_id, r.order_number, r.customer_name, r.governorate, r.city, r.status, r.product_name, r.quantity, r.price, r.created_at, r.delivered_at ?? null]
          );
        }
        await pool.execute('UPDATE manifests m SET shipments = (SELECT COUNT(DISTINCT mi.order_id) FROM manifest_items mi WHERE mi.manifest_id = m.id)');
      }
    }

    if (!wasEmpty) return; // existing DB: only backfill missing demo users, keep their data

    const prod = async (sup: number, name: string, desc: string, price: number, cost: number, stock: number, sku: string, code: string, img: string, category: ProductCategory = 'dropshipping') => {
      const [r] = await pool.execute(
        'INSERT INTO products (fournisseur_id, name, description, price, cost_price, category, offers, stock, sku, barcode, image_url, rating, rating_count) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [sup, name, desc, price, cost, category, category, stock, sku, code, img, Math.round((4 + Math.random()) * 10) / 10, Math.floor(Math.random() * 20) + 1]
      );
      return (r as mysql.ResultSetHeader).insertId;
    };

    const p1 = await prod(a_id, 'Wireless Bluetooth Earbuds', 'Noise-cancelling wireless earbuds with charging case, 30h battery.', 39.9, 39.9, 120, 'SKU-EAR-001', '619111222333', 'https://picsum.photos/seed/earbuds/600/600');
    const p2 = await prod(a_id, 'Smart Watch Fitness Tracker', 'Waterproof smart watch with heart rate monitor and GPS.', 59.9, 59.9, 80, 'SKU-WAT-002', '619111222334', 'https://picsum.photos/seed/watch/600/600');
    const p3 = await prod(a_id, 'LED Ring Light 10"', 'Professional ring light with tripod and phone holder for content creators.', 45.0, 45.0, 60, 'SKU-RNG-003', '619111222335', 'https://picsum.photos/seed/ringlight/600/600');
    const p4 = await prod(b_id, 'Smartphone Gimbal Stabilizer', '3-axis handheld gimbal stabilizer for vlogging.', 89.0, 89.0, 45, 'SKU-GIM-004', '619111222336', 'https://picsum.photos/seed/gimbal/600/600', 'wholesale');
    const p5 = await prod(b_id, 'Portable Power Bank 20000mAh', 'Fast-charging 20000mAh power bank with dual USB + Type-C.', 32.0, 32.0, 200, 'SKU-PWR-005', '619111222337', 'https://picsum.photos/seed/powerbank/600/600', 'wholesale');
    const p6 = await prod(b_id, 'Wireless Mechanical Keyboard', 'RGB backlit wireless mechanical keyboard, hot-swappable.', 69.0, 69.0, 75, 'SKU-KEY-006', '619111222338', 'https://picsum.photos/seed/keyboard/600/600', 'wholesale');
    const p7 = await prod(a_id, 'Mini Projector 4K', 'Portable mini projector, 4K support, HDMI + USB, home cinema.', 129.0, 129.0, 30, 'SKU-PRJ-007', '619111222339', 'https://picsum.photos/seed/projector/600/600', 'white_label');
    const p8 = await prod(a_id, 'LED Strip Lights RGB', '16ft RGB LED strip lights with app control and music sync.', 24.0, 24.0, 300, 'SKU-LED-008', '619111222340', 'https://picsum.photos/seed/ledstrip/600/600');

    const mkOrder = async (ds: number, sup: number, cust: string, phone: string, gov: string, city: string, addr: string, status: string, pay: string, method: string, items: [number, number][]) => {
      const [r] = await pool.execute('INSERT INTO orders (order_number, dropshipper_id, fournisseur_id, customer_name, customer_phone, governorate, city, shipping_address, status, payment_status, payment_method, total, total_cost, profit) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [
        `D42-${1000 + oidCounter++}`, ds, sup, cust, phone, gov, city, addr, status, pay, method, 0, 0, 0, // totals fixed below
      ]);
      const orderId = (r as mysql.ResultSetHeader).insertId;
      for (const [pid, qty] of items) {
        const pRows = await all<Row<{ price: number; cost_price: number }>>(pool, 'SELECT price, cost_price FROM products WHERE id = ?', [pid]);
        const p = pRows[0];
        await pool.execute('INSERT INTO order_items (order_id, product_id, quantity, price, cost) VALUES (?,?,?,?,?)', [orderId, pid, qty, Number(p.price), Number(p.cost_price)]);
      }
      const aggRows = await all<Row<{ total: string; cost: string }>>(pool, 
        'SELECT SUM(price*quantity) AS total, SUM(cost*quantity) AS cost FROM order_items WHERE order_id = ?',
        [orderId]
      );
      const agg = aggRows[0];
      await pool.execute('UPDATE orders SET total = ?, total_cost = ?, profit = ? WHERE id = ?', [Number(agg.total), Number(agg.cost), round2(Number(agg.total) - Number(agg.cost)), orderId]);
      return orderId;
    };
    let oidCounter = 1;

    const o1 = await mkOrder(dropshipper_id, a_id, 'Omar B', '+216 22 010 101', 'Tunis', 'Tunis', '12 Rue Habib Bourguiba, Tunis', 'delivered', 'paid', 'stripe', [[p1, 2], [p8, 1]]);
    const o2 = await mkOrder(dropshipper_id, a_id, 'Yasmine K', '+216 22 010 202', 'Sousse', 'Sousse', '45 Avenue Habib Thameur, Sousse', 'shipped', 'paid', 'paypal', [[p3, 1]]);
    const o3 = await mkOrder(dropshipper_id, b_id, 'Rami T', '+216 22 010 303', 'Sfax', 'Sfax', '8 Boulevard, Sfax', 'confirmed', 'unpaid', 'cod', [[p5, 2], [p6, 1]]);
    await mkOrder(dropshipper_id, a_id, 'Nadia M', '+216 22 010 404', 'Nabeul', 'Hammamet', '23 Avenue Habib Bourguiba, Hammamet', 'pending', 'unpaid', 'cod', [[p7, 1]]);

    await pool.execute("INSERT INTO tracks (order_id, carrier, tracking_number, status, detail) VALUES (?,?,?,?,?)", [o1, 'DHL', 'DHL-ALG-88231', 'Delivered', 'Delivered to recipient']);
    await pool.execute("INSERT INTO tracks (order_id, carrier, tracking_number, status, detail) VALUES (?,?,?,?,?)", [o1, 'DHL', 'DHL-ALG-88231', 'Shipped', 'Package handed to carrier']);
    await pool.execute("INSERT INTO tracks (order_id, carrier, tracking_number, status, detail) VALUES (?,?,?,?,?)", [o2, 'Yalidine', 'YLD-55410', 'Shipped', 'In transit - sorting center']);

    await pool.execute('INSERT INTO ratings (product_id, user_id, score, comment) VALUES (?,?,?,?)', [p1, dropshipper_id, 5, 'Fast delivery and great quality.']);
    await pool.execute('INSERT INTO ratings (product_id, user_id, score, comment) VALUES (?,?,?,?)', [p5, dropshipper_id, 4, 'Good value for money.']);

    await pool.execute('INSERT INTO support_tickets (user_id, email, type, message, status, answer) VALUES (?,?,?,?,?,?)', [dropshipper_id, 'dropshipper@demo.com', 'Commande', "I can't see the tracking number for one of my commands.", 'answered', 'The supplier just added it — check the order detail page.']);
    await pool.execute('INSERT INTO support_tickets (user_id, email, type, message, status) VALUES (?,?,?,?,?)', [dropshipper_id, 'dropshipper@demo.com', 'Paiement', 'My payment with COD was not confirmed yet.', 'open']);

    await pool.execute('INSERT INTO saved_products (dropshipper_id, product_id) VALUES (?,?)', [dropshipper_id, p1]);
    await pool.execute('INSERT INTO saved_products (dropshipper_id, product_id) VALUES (?,?)', [dropshipper_id, p2]);
    await pool.execute('INSERT INTO saved_products (dropshipper_id, product_id) VALUES (?,?)', [dropshipper_id, p5]);

    await pool.execute('INSERT INTO product_updates (product_id, changed_field, old_value, new_value) VALUES (?,?,?,?)', [p1, 'price', '42.00', '39.90']);
    await pool.execute('INSERT INTO product_updates (product_id, changed_field, old_value, new_value) VALUES (?,?,?,?)', [p1, 'stock', '100', '120']);
    await pool.execute('INSERT INTO product_updates (product_id, changed_field, old_value, new_value) VALUES (?,?,?,?)', [p5, 'price', '35.00', '32.00']);
    await pool.execute('INSERT INTO product_updates (product_id, changed_field, old_value, new_value) VALUES (?,?,?,?)', [p2, 'stock', '90', '80']);

    await pool.execute('INSERT INTO return_requests (order_id, dropshipper_id, type, reason, status, reply, created_by, retailer_name, retailer_code, return_address, destination_warehouse, product_name, product_variation, product_qty, approval_status, exchange_delivery_status, exchange_shipment_id, return_delivery_status, accepted_at, inspection) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [o1, dropshipper_id, 'retour', 'Product arrived damaged', 'approved', 'Return accepted — send it back and you will be refunded.', 'Seller', 'My Shopping', 'MJ-1148', 'Tunis, El Menzah 6, Rue 6182', 'Agence Tunis', 'Wireless Bluetooth Earbuds', 'Couleur: Noir', 1, 'approved', 'on_its_way', 560042, 'awaiting_arrival', null, 1]);

    const insTransfer = async (t: TransferShipment) => {
      await pool.execute('INSERT INTO transfer_shipments (id, gid, client_id, ship_to_name, ship_to_code, account_manager, business_developer, account_incubator, ship_to, created_at, delivered_at, status, product_name, product_variation, pack_units, product_qty, deposit_amount, deposit_status, payment_amount, payment_status, received_units, total_units, carrier_logo, tracking_number) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [
        t.id, t.gid, t.client_id, t.ship_to_name, t.ship_to_code, t.account_manager, t.business_developer, t.account_incubator, t.ship_to, toDbTime(t.created_at), toDbTime(t.delivered_at), t.status, t.product_name, t.product_variation, t.pack_units, t.product_qty, t.deposit_amount, t.deposit_status, t.payment_amount, t.payment_status, t.received_units, t.total_units, t.carrier_logo, t.tracking_number,
      ]);
    };
    const insPickup = async (p: PickupRequest) => {
      await pool.execute('INSERT INTO pickup_requests (id, gid, follow_up_status, warehouse, address, phone_masked, phone_full, related_label, related_type, processed_by, carrier_state, carrier_reference, carrier_date_label, status, pickup_date, from_time, to_time) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [
        p.id, p.gid, p.follow_up_status, p.warehouse, p.address, p.phone_masked, p.phone_full, p.related_label, p.related_type, p.processed_by, p.carrier.state, p.carrier.reference, p.carrier.date_label, p.status, toDbTime(p.pickup_date), p.from_time, p.to_time,
      ]);
    };
    const insManifest = async (m: Manifest) => {
      await pool.execute('INSERT INTO manifests (id, gid, manifest_ref, fulfiller_name, fulfiller_code, carrier_logo, warehouse, supplier_name, delivery_company, date, status, shipments) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)', [
        m.id, m.gid, m.manifest_ref, m.fulfiller_name, m.fulfiller_code, m.carrier_logo, m.warehouse, m.supplier_name, m.delivery_company, m.date, m.status, m.shipments,
      ]);
    };
    for (const t of buildTransferShipments().slice(0, 20)) {
      try {
        await insTransfer(t);
      } catch {
        // row already exists from a previous run
      }
    }
    for (const p of buildPickupRequests().slice(0, 20)) {
      try {
        await insPickup(p);
      } catch {
        // row already exists from a previous run
      }
    }
    const insTxn = async (t: Transaction) => {
      await pool.execute('INSERT INTO transactions (id, gid, summary, shipment_id, shipment_display, created_at, updated_at, status, amount, payment_method, cash_pickup_location, from_type, from_name, from_code, to_type, to_name, to_code, follow_up, bulk) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [
        t.id, t.gid, t.summary, t.shipment_id, t.shipment_display, toDbTime(t.created_at), toDbTime(t.updated_at), t.status, t.amount, t.payment_method, t.cash_pickup_location, t.from_type, t.from_name, t.from_code, t.to_type, t.to_name, t.to_code, t.follow_up, t.bulk,
      ]);
    };
    for (const tr of buildTransactions().transactions.slice(0, 50)) {
      try {
        await insTxn(tr);
      } catch {
        // row already exists from a previous run
      }
    }
    const insReview = async (x: ReconciliationReview) => {
      await pool.execute('INSERT INTO reconciliation_reviews (id, created_at, type, variance, current_variance, status, comment, reviewed_by, cashier_session, location) VALUES (?,?,?,?,?,?,?,?,?,?)', [
        x.id, toDbTime(x.created_at), x.type, x.variance, x.current_variance, x.status, x.comment, x.reviewed_by, x.cashier_session, x.location,
      ]);
    };
    for (const rv of buildReconciliationReviews().reviews.slice(0, 40)) {
      try {
        await insReview(rv);
      } catch {
        // row already exists from a previous run
      }
    }
    const insOrg = async (o: SellerOrganization) => {
      await pool.execute('INSERT INTO seller_organizations (id, code, account_manager, owner_name, org_name, phone, email, tags, joined_at, last_seen_at, onboarding, documents, follow_up_new, source, is_main_retailer, plus_membership) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [
        o.id, o.code, o.account_manager, o.owner_name, o.org_name, o.phone, o.email, JSON.stringify(o.tags), toDbTime(o.joined_at), toDbTime(o.last_seen_at), JSON.stringify(o.onboarding), o.documents, o.follow_up_new ? 1 : 0, o.source, o.is_main_retailer ? 1 : 0, o.plus_membership ? 1 : 0,
      ]);
    };
    for (const so of searchSellerOrganizations({ page: 1, per_page: 100 }).rows) {
      try {
        await insOrg(so);
      } catch {
        // row already exists from a previous run
      }
    }
    const insSub = async (s: ProductSubscription) => {
      await pool.execute('INSERT INTO product_subscriptions (id, product_name, product_emoji, supplier_name, supplier_code, retailer_name, retailer_code, premium, cost, price, profit_fee, allow_when_oos, price_constraint, units_sold, started_at, price_updates) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [
        s.id, s.product_name, s.product_emoji, s.supplier_name, s.supplier_code, s.retailer_name, s.retailer_code, s.premium, s.cost, s.price, s.profit_fee, s.allow_when_oos ? 1 : 0, s.price_constraint ? 1 : 0, s.units_sold, toDbTime(s.started_at), s.price_updates,
      ]);
    };
    for (const ps of searchProductSubscriptions({ page: 1, per_page: 200 }).rows) {
      try {
        await insSub(ps);
      } catch {
        // row already exists from a previous run
      }
    }
  }

  for (const stmt of SCHEMA.split(';').map((s) => s.trim()).filter(Boolean)) {
    await pool.query(stmt);
  }

  const backfillOrg = async () => {
    const [cnt] = await all<Row<{ n: number }>>(pool, 'SELECT COUNT(*) AS n FROM seller_organizations');
    if (Number(cnt[0]?.n ?? 0) > 0) return;
    for (const o of searchSellerOrganizations({ page: 1, per_page: 100 }).rows) {
      try {
        await pool.execute('INSERT INTO seller_organizations (id, code, account_manager, owner_name, org_name, phone, email, tags, joined_at, last_seen_at, onboarding, documents, follow_up_new, source, is_main_retailer, plus_membership) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [
          o.id, o.code, o.account_manager, o.owner_name, o.org_name, o.phone, o.email, JSON.stringify(o.tags), toDbTime(o.joined_at), toDbTime(o.last_seen_at), JSON.stringify(o.onboarding), o.documents, o.follow_up_new ? 1 : 0, o.source, o.is_main_retailer ? 1 : 0, o.plus_membership ? 1 : 0,
        ]);
      } catch {
        // row already exists
      }
    }
  };
  const backfillSub = async () => {
    const [cnt] = await all<Row<{ n: number }>>(pool, 'SELECT COUNT(*) AS n FROM product_subscriptions');
    if (Number(cnt[0]?.n ?? 0) > 0) return;
    for (const s of searchProductSubscriptions({ page: 1, per_page: 200 }).rows) {
      try {
        await pool.execute('INSERT INTO product_subscriptions (id, product_name, product_emoji, supplier_name, supplier_code, retailer_name, retailer_code, premium, cost, price, profit_fee, allow_when_oos, price_constraint, units_sold, started_at, price_updates) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [
          s.id, s.product_name, s.product_emoji, s.supplier_name, s.supplier_code, s.retailer_name, s.retailer_code, s.premium, s.cost, s.price, s.profit_fee, s.allow_when_oos ? 1 : 0, s.price_constraint ? 1 : 0, s.units_sold, toDbTime(s.started_at), s.price_updates,
        ]);
      } catch {
        // row already exists
      }
    }
  };
  await backfillOrg();
  await backfillSub();
  const supOrgCols = await all<Row<{ COLUMN_NAME: string }>>(pool, 'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?', [cfg.database, 'supplier_organizations']);
  const supOrgColSet = new Set(supOrgCols.map((c) => c.COLUMN_NAME));
  if (!supOrgColSet.has('doc_files')) {
    await pool.query('ALTER TABLE supplier_organizations ADD COLUMN doc_files JSON NULL AFTER documents');
  }
  if (!supOrgColSet.has('doc_statuses')) {
    await pool.query('ALTER TABLE supplier_organizations ADD COLUMN doc_statuses JSON NULL AFTER doc_files');
  }
  const SELLER_ORG_EXTRA: [string, string][] = [
    ['business_developer', 'VARCHAR(120) NULL AFTER account_manager'],
    ['phone_full', 'VARCHAR(60) NULL AFTER phone'],
    ['city', "VARCHAR(100) NOT NULL DEFAULT '' AFTER email"],
    ['doc_files', 'JSON NULL AFTER documents'],
    ['doc_statuses', 'JSON NULL AFTER doc_files'],
    ['account_status', "VARCHAR(30) NOT NULL DEFAULT 'active' AFTER plus_membership"],
    ['allow_marketplace', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER account_status'],
    ['dropshipping_eligible', 'TINYINT(1) NOT NULL DEFAULT 1 AFTER allow_marketplace'],
  ];
  for (const [col, def] of SELLER_ORG_EXTRA) {
    const hasCol = await all<Row<{ n: number }>>(pool, 'SELECT COUNT(*) AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?', [cfg.database, 'seller_organizations', col]);
    if (Number(hasCol[0]?.n ?? 0) === 0) {
      try {
        await pool.query(`ALTER TABLE seller_organizations ADD COLUMN ${col} ${def}`);
      } catch {
        // column added concurrently; ignore
      }
    }
  }
  const subCols = await all<Row<{ COLUMN_NAME: string }>>(pool, 'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?', [cfg.database, 'product_subscriptions']);
  const subColSet = new Set(subCols.map((c) => c.COLUMN_NAME));
  if (!subColSet.has('price_constraint')) {
    await pool.query('ALTER TABLE product_subscriptions ADD COLUMN price_constraint TINYINT(1) NOT NULL DEFAULT 0 AFTER allow_when_oos');
  }
  const refillStatusCol = await all<Row<{ COLUMN_TYPE: string }>>(pool, 'SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?', [cfg.database, 'stock_refill_requests', 'status']);
  if (refillStatusCol[0] && !String(refillStatusCol[0].COLUMN_TYPE).includes("'Confirmed'")) {
    await pool.query("ALTER TABLE stock_refill_requests MODIFY status ENUM('Pending','Confirmed','Approved','In preparation','Ready','Shipped','Completed','Rejected') NOT NULL DEFAULT 'Pending'");
  }
  const orderStatusCol = await all<Row<{ COLUMN_TYPE: string }>>(pool, 'SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?', [cfg.database, 'orders', 'status']);
  if (orderStatusCol[0] && !String(orderStatusCol[0].COLUMN_TYPE).includes("'ready'")) {
    await pool.query("ALTER TABLE orders MODIFY status ENUM('draft','ready','pending','confirmed','shipped','delivered','cancelled','retour') NOT NULL DEFAULT 'draft'");
  }
  const colCols = await all<Row<{ COLUMN_NAME: string }>>(pool, 'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?', [cfg.database, 'collections']);
  const colColSet = new Set(colCols.map((c) => c.COLUMN_NAME));
  if (!colColSet.has('is_active')) {
    await pool.query('ALTER TABLE collections ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER status');
  }
  if (!colColSet.has('marketplace_sort_rank')) {
    await pool.query('ALTER TABLE collections ADD COLUMN marketplace_sort_rank INT NULL AFTER is_active');
  }
  const colKey = await all<Row<{ EXTRA: string }>>(pool, "SELECT EXTRA FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = 'id'", [cfg.database, 'collections']);
  if (colKey.length > 0 && colKey[0] && colKey[0].EXTRA.toLowerCase() !== 'auto_increment') {
    await pool.query('ALTER TABLE collection_products DROP FOREIGN KEY fk_cp_collection');
    await pool.query('ALTER TABLE collections MODIFY id INT NOT NULL AUTO_INCREMENT');
    await pool.query('ALTER TABLE collection_products ADD CONSTRAINT fk_cp_collection FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE');
  }
  const backfillCol = async () => {
    const [cnt] = await all<Row<{ n: number }>>(pool, 'SELECT COUNT(*) AS n FROM collections');
    if (Number(cnt[0]?.n ?? 0) > 0) {
      for (const c of buildCollections().collections) {
        try {
          await pool.execute('UPDATE collections SET is_active = ?, marketplace_sort_rank = ? WHERE id = ?', [
            c.is_active ? 1 : 0, c.marketplace_sort_rank, c.id,
          ]);
        } catch {
          // column missing; ignored
        }
      }
      return;
    }
    for (const c of buildCollections().collections) {
      try {
        await pool.execute('INSERT INTO collections (id, title, description, products, created_at, status, is_active, marketplace_sort_rank) VALUES (?,?,?,?,?,?,?,?)', [
          c.id, c.title, c.description, c.products, toDbTime(c.created_at), c.status, c.is_active ? 1 : 0, c.marketplace_sort_rank,
        ]);
      } catch {
        // row already exists
      }
    }
  };
  await backfillCol();

  const collectionProductsBackfill = async () => {
    const [cnt] = await all<Row<{ n: number }>>(pool, 'SELECT COUNT(*) AS n FROM collection_products');
    if (Number(cnt[0]?.n ?? 0) > 0) return;
    const seed = buildCollections();
    const rand = mulberry32(99);
    for (const c of seed.collections) {
      const ids = seed.details[c.id]?.product_ids ?? [];
      for (const [idx, pid] of ids.entries()) {
        const p = catalogProduct(pid);
        try {
          await pool.execute(
            'INSERT IGNORE INTO collection_products (collection_id, product_id, product_name, product_emoji, eligible_to_marketplace, offer_type, added_by, added_at) VALUES (?,?,?,?,?,?,?,?)',
            [
              c.id, p.id, p.name, p.emoji, p.eligible_to_marketplace ? 1 : 0, p.offer_type,
              rand() < 0.55 ? null : MANAGERS[idx % MANAGERS.length] ?? null,
              toDbTime(new Date(Date.now() - (2 + (idx % 20)) * 86400000).toISOString()),
            ],
          );
        } catch {
          // row already exists
        }
      }
    }
  };
  await collectionProductsBackfill();

  const orderCols = await all<Row<{ COLUMN_NAME: string }>>(pool, 'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?', [cfg.database, 'orders']);
  const orderColSet = new Set(orderCols.map((c) => c.COLUMN_NAME));
  if (!orderColSet.has('governorate')) {
    await pool.query('ALTER TABLE orders ADD COLUMN governorate VARCHAR(50) NULL AFTER customer_phone');
    await pool.query('ALTER TABLE orders ADD COLUMN city VARCHAR(100) NULL AFTER governorate');
  }
  if (!orderColSet.has('barcode')) {
    await pool.query('ALTER TABLE orders ADD COLUMN barcode VARCHAR(80) NULL AFTER order_number');
  }
  if (!orderColSet.has('confirmed_at')) {
    await pool.query('ALTER TABLE orders ADD COLUMN confirmed_at TIMESTAMP NULL AFTER profit');
    await pool.query('ALTER TABLE orders ADD COLUMN confirmed_by INT NULL AFTER confirmed_at');
    await pool.query('ALTER TABLE orders ADD COLUMN shipped_at TIMESTAMP NULL AFTER confirmed_by');
    await pool.query('ALTER TABLE orders ADD COLUMN delivered_at TIMESTAMP NULL AFTER shipped_at');
    await pool.query('ALTER TABLE orders ADD COLUMN returned_at TIMESTAMP NULL AFTER delivered_at');
  }
  if (!orderColSet.has('commission')) {
    await pool.query('ALTER TABLE orders ADD COLUMN commission DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER profit');
    await pool.query("UPDATE orders SET commission = ROUND(total * 0.03, 2), profit = ROUND(total - total_cost - ROUND(total * 0.03, 2), 2) WHERE status = 'delivered'");
  }
  if (!orderColSet.has('shipment_zone')) {
    await pool.query("ALTER TABLE orders ADD COLUMN shipment_zone VARCHAR(20) NULL AFTER barcode");
  }
  if (!orderColSet.has('order_type')) {
    await pool.query("ALTER TABLE orders ADD COLUMN order_type VARCHAR(20) NOT NULL DEFAULT 'dropshipping' AFTER status");
    await pool.query(`UPDATE orders o SET o.order_type = 'wholesale' WHERE EXISTS (
      SELECT 1 FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = o.id AND p.category = 'wholesale')`);
  }
  if (!orderColSet.has('return_stored_at')) {
    await pool.query('ALTER TABLE orders ADD COLUMN return_stored_at DATETIME NULL AFTER returned_at');
  }
  if (!orderColSet.has('confirmed_by')) {
    await pool.query('ALTER TABLE orders ADD COLUMN confirmed_by INT NULL AFTER confirmed_at');
  }
  if (!orderColSet.has('delivery_company')) {
    await pool.query("ALTER TABLE orders ADD COLUMN delivery_company VARCHAR(60) NULL AFTER shipping_address");
  }
  if (!orderColSet.has('delivery_status')) {
    await pool.query("ALTER TABLE orders ADD COLUMN delivery_status VARCHAR(60) NULL AFTER delivery_company");
  }
  if (!orderColSet.has('locality_id')) {
    await pool.query("ALTER TABLE orders ADD COLUMN locality_id INT NULL AFTER delivery_status");
  }
  if (!orderColSet.has('telephone2')) {
    await pool.query("ALTER TABLE orders ADD COLUMN telephone2 VARCHAR(80) NULL AFTER customer_phone");
  }
  if (!orderColSet.has('commentaire')) {
    await pool.query("ALTER TABLE orders ADD COLUMN commentaire VARCHAR(500) NULL AFTER shipping_address");
  }
  if (!orderColSet.has('est_fragile')) {
    await pool.query("ALTER TABLE orders ADD COLUMN est_fragile VARCHAR(3) NOT NULL DEFAULT 'non' AFTER commentaire");
  }
  if (!orderColSet.has('ouvrir_colis')) {
    await pool.query("ALTER TABLE orders ADD COLUMN ouvrir_colis VARCHAR(3) NOT NULL DEFAULT 'non' AFTER est_fragile");
  }
  if (!orderColSet.has('nombre_article')) {
    await pool.query("ALTER TABLE orders ADD COLUMN nombre_article INT NULL AFTER ouvrir_colis");
  }
  if (!orderColSet.has('nombre_echange')) {
    await pool.query("ALTER TABLE orders ADD COLUMN nombre_echange VARCHAR(3) NOT NULL DEFAULT 'non' AFTER nombre_article");
  }
  const savedCols = await all<Row<{ COLUMN_NAME: string }>>(pool, 'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?', [cfg.database, 'saved_products']);
  const savedColSet = new Set(savedCols.map((c) => c.COLUMN_NAME));
  if (!savedColSet.has('my_price')) {
    await pool.query('ALTER TABLE saved_products ADD COLUMN my_price DECIMAL(10,2) NULL AFTER product_id');
  }
  if (!savedColSet.has('offer_type')) {
    await pool.query("ALTER TABLE saved_products ADD COLUMN offer_type VARCHAR(20) NOT NULL DEFAULT 'dropshipping' AFTER my_price");
  }
  try {
    const opCols = await all<Row<{ COLUMN_NAME: string }>>(pool, "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'order_picks'", [cfg.database]);
    const opColNames = new Set(opCols.map((c) => c.COLUMN_NAME));
    if (!opColNames.has('arrive_at') && opCols.length > 0) {
      await pool.query('DROP TABLE IF EXISTS order_picks');
      opColNames.clear();
    }
    if (opColNames.size === 0) {
      await pool.query(`CREATE TABLE IF NOT EXISTS order_picks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT NULL,
        inventory_id INT NULL,
        batch_code VARCHAR(40) NULL,
        quantity INT NOT NULL DEFAULT 0,
        status ENUM('unconfirmed','confirmed','shipped','cancelled','return') NOT NULL DEFAULT 'unconfirmed',
        arrive_at DATE NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_op_order (order_id),
        KEY idx_op_product (product_id),
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    } else {
      if (!opColNames.has('product_id')) await pool.query("ALTER TABLE order_picks ADD COLUMN product_id INT NULL AFTER order_id");
      if (!opColNames.has('inventory_id')) await pool.query("ALTER TABLE order_picks ADD COLUMN inventory_id INT NULL AFTER product_id");
      if (!opColNames.has('batch_code')) await pool.query("ALTER TABLE order_picks ADD COLUMN batch_code VARCHAR(40) NULL AFTER inventory_id");
      if (!opColNames.has('quantity')) await pool.query("ALTER TABLE order_picks ADD COLUMN quantity INT NOT NULL DEFAULT 0 AFTER batch_code");
      if (!opColNames.has('status')) await pool.query("ALTER TABLE order_picks ADD COLUMN status ENUM('unconfirmed','confirmed','shipped') NOT NULL DEFAULT 'unconfirmed' AFTER quantity");
      if (!opColNames.has('arrive_at')) await pool.query("ALTER TABLE order_picks ADD COLUMN arrive_at DATE NULL AFTER status");
      await pool.query("ALTER TABLE order_picks MODIFY COLUMN arrive_at DATE NULL").catch(() => {});
      await pool.query("ALTER TABLE order_picks MODIFY COLUMN status ENUM('unconfirmed','confirmed','shipped','cancelled','return') NOT NULL DEFAULT 'unconfirmed'").catch(() => {});
    }
  } catch {
    // table may already exist
  }
  try {
    await pool.query("ALTER TABLE orders MODIFY COLUMN status ENUM('draft','ready','pending','confirmed','shipped','delivered','cancelled','retour') NOT NULL DEFAULT 'draft'");
  } catch {
    // column may not exist yet on a fresh table
  }
  try {
    const sbCols = await all<Row<{ COLUMN_NAME: string }>>(pool, 'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?', [cfg.database, 'stock_batches']);
    if (sbCols.length > 0 && !sbCols.some((c) => c.COLUMN_NAME === 'product_id')) {
      await pool.query('ALTER TABLE stock_batches ADD COLUMN product_id INT NULL AFTER inventory_id');
    }
    if (sbCols.length > 0) {
      await pool.query(
        `UPDATE stock_batches sb JOIN products p ON LOWER(TRIM(p.name)) = LOWER(TRIM(sb.product_name))
         SET sb.product_id = p.id WHERE sb.product_id IS NULL`
      ).catch(() => {});
    }
  } catch {
    // table may not exist yet on a fresh database
  }

  const prodCols = await all<Row<{ COLUMN_NAME: string }>>(pool, 'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?', [cfg.database, 'products']);
  const prodColSet = new Set(prodCols.map((c) => c.COLUMN_NAME));
  if (!prodColSet.has('images')) {
    await pool.query('ALTER TABLE products ADD COLUMN images JSON NULL AFTER video_url');
    await pool.query('ALTER TABLE products ADD COLUMN videos JSON NULL AFTER images');
  }
  if (!prodColSet.has('category')) {
    await pool.query("ALTER TABLE products ADD COLUMN category VARCHAR(30) NOT NULL DEFAULT 'dropshipping' AFTER cost_price");
  }
  if (!prodColSet.has('offers')) {
    await pool.query("ALTER TABLE products ADD COLUMN offers VARCHAR(120) NULL AFTER category");
    await pool.query('UPDATE products SET offers = category WHERE offers IS NULL');
  }
  let houseStockAdded = false;
  if (!prodColSet.has('house_stock')) {
    await pool.query('ALTER TABLE products ADD COLUMN house_stock INT NOT NULL DEFAULT 0 AFTER stock');
    houseStockAdded = true;
  }
  if (houseStockAdded) {
    await pool.query(`
      UPDATE products p
      SET p.house_stock = (
        SELECT COUNT(*) FROM return_requests rr
        JOIN order_items oi ON oi.order_id = rr.order_id
        WHERE oi.product_id = p.id
      )
      WHERE p.house_stock = 0
    `);
  }
  if (!prodColSet.has('committed_stock')) {
    await pool.query('ALTER TABLE products ADD COLUMN committed_stock INT NOT NULL DEFAULT 0 AFTER house_stock');
  }
  if (!prodColSet.has('retail_category')) {
    await pool.query('ALTER TABLE products ADD COLUMN retail_category VARCHAR(255) NULL AFTER category');
  } else {
    await pool.query('ALTER TABLE products MODIFY COLUMN retail_category VARCHAR(255) NULL');
  }
  if (!prodColSet.has('height')) {
    await pool.query('ALTER TABLE products ADD COLUMN height DECIMAL(10,2) NULL AFTER retail_category');
    await pool.query('ALTER TABLE products ADD COLUMN length DECIMAL(10,2) NULL AFTER height');
    await pool.query('ALTER TABLE products ADD COLUMN width DECIMAL(10,2) NULL AFTER length');
    await pool.query('ALTER TABLE products ADD COLUMN weight DECIMAL(10,2) NULL AFTER width');
  }
  if (!prodColSet.has('keywords')) {
    await pool.query('ALTER TABLE products ADD COLUMN keywords JSON NULL AFTER videos');
    await pool.query('ALTER TABLE products ADD COLUMN specifications JSON NULL AFTER keywords');
  }
  if (!prodColSet.has('wholesale_tiers')) {
    await pool.query('ALTER TABLE products ADD COLUMN wholesale_tiers JSON NULL AFTER specifications');
  }
  if (!prodColSet.has('moderation_status')) {
    await pool.query("ALTER TABLE products ADD COLUMN moderation_status VARCHAR(20) NOT NULL DEFAULT 'pending' AFTER is_active");
    await pool.query("UPDATE products SET moderation_status = 'approved' WHERE is_active = 1");
  }
  if (!prodColSet.has('moderation_note')) {
    await pool.query('ALTER TABLE products ADD COLUMN moderation_note TEXT NULL AFTER moderation_status');
  }

  const itemCols = await all<Row<{ COLUMN_NAME: string }>>(pool, 'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?', [cfg.database, 'order_items']);
  const itemColSet = new Set(itemCols.map((c) => c.COLUMN_NAME));
  if (!itemColSet.has('house_qty')) {
    await pool.query('ALTER TABLE order_items ADD COLUMN house_qty INT NOT NULL DEFAULT 0 AFTER quantity');
  }
  if (!itemColSet.has('supplier_qty')) {
    await pool.query('ALTER TABLE order_items ADD COLUMN supplier_qty INT NOT NULL DEFAULT 0 AFTER house_qty');
    // one-time backfill: pre-existing rows predate the tiered model, so treat them as fully requested from the supplier
    await pool.query('UPDATE order_items SET supplier_qty = quantity WHERE supplier_qty = 0 AND quantity > 0');
  }

  const roleColumn = await all<Row<{ COLUMN_TYPE: string }>>(pool, 'SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?', [cfg.database, 'users', 'role']);
  if (roleColumn[0]?.COLUMN_TYPE.includes("'dropshipper'") || roleColumn[0]?.COLUMN_TYPE.includes("'fournisseur'") || roleColumn[0]?.COLUMN_TYPE.includes("'chef'")) {
    await pool.query("ALTER TABLE users MODIFY COLUMN role ENUM('admin','chef','support','dropshipper','fournisseur','stocking','confirmateur','customer','seller') NOT NULL DEFAULT 'customer'");
    await pool.query("UPDATE users SET role = CASE WHEN role IN ('chef','support','stocking','confirmateur') THEN 'admin' WHEN role = 'dropshipper' THEN 'customer' WHEN role = 'fournisseur' THEN 'seller' ELSE role END");
    await pool.query("ALTER TABLE users MODIFY COLUMN role ENUM('admin','customer','seller') NOT NULL DEFAULT 'customer'");
  }
  const payoutRoleColumn = await all<Row<{ COLUMN_TYPE: string }>>(pool, 'SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?', [cfg.database, 'payouts', 'recipient_role']);
  if (payoutRoleColumn[0]?.COLUMN_TYPE.includes("'dropshipper'") || payoutRoleColumn[0]?.COLUMN_TYPE.includes("'fournisseur'")) {
    await pool.query("ALTER TABLE payouts MODIFY COLUMN recipient_role ENUM('fournisseur','dropshipper','customer','seller') NOT NULL");
    await pool.query("UPDATE payouts SET recipient_role = CASE WHEN recipient_role = 'fournisseur' THEN 'seller' WHEN recipient_role = 'dropshipper' THEN 'customer' ELSE recipient_role END");
    await pool.query("ALTER TABLE payouts MODIFY COLUMN recipient_role ENUM('seller','customer') NOT NULL");
  }
  const userCols = await all<Row<{ COLUMN_NAME: string }>>(pool, 'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?', [cfg.database, 'users']);
  const userColSet = new Set(userCols.map((c) => c.COLUMN_NAME));
  if (!userColSet.has('cin')) {
    await pool.query('ALTER TABLE users ADD COLUMN cin VARCHAR(50) NULL AFTER photo');
  }

  const notifCols = await all<Row<{ COLUMN_NAME: string }>>(pool, 'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?', [cfg.database, 'notifications']);
  const notifColSet = new Set(notifCols.map((c) => c.COLUMN_NAME));
  if (!notifColSet.has('image_url')) {
    await pool.query('ALTER TABLE notifications ADD COLUMN image_url VARCHAR(500) NULL AFTER product_id');
  }

  const apiKeysCols = await all<Row<{ COLUMN_NAME: string }>>(pool, 'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?', [cfg.database, 'api_keys']);
  const apiKeysColSet = new Set(apiKeysCols.map((c) => c.COLUMN_NAME));
  if (!apiKeysColSet.has('last_used_at')) {
    await pool.query('ALTER TABLE api_keys ADD COLUMN last_used_at TIMESTAMP NULL AFTER status');
  }

  const retCols = await all<Row<{ COLUMN_NAME: string }>>(pool, 'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?', [cfg.database, 'return_requests']);
  const retColSet = new Set(retCols.map((c) => c.COLUMN_NAME));
  if (!retColSet.has('created_by')) {
    await pool.query('ALTER TABLE return_requests ADD COLUMN created_by VARCHAR(120) NULL AFTER created_at');
    await pool.query('ALTER TABLE return_requests ADD COLUMN retailer_name VARCHAR(200) NULL AFTER created_by');
    await pool.query('ALTER TABLE return_requests ADD COLUMN retailer_code VARCHAR(40) NULL AFTER retailer_name');
    await pool.query('ALTER TABLE return_requests ADD COLUMN retailer_premium TINYINT(1) NOT NULL DEFAULT 0 AFTER retailer_code');
    await pool.query('ALTER TABLE return_requests ADD COLUMN return_address VARCHAR(300) NULL AFTER retailer_premium');
    await pool.query('ALTER TABLE return_requests ADD COLUMN destination_warehouse VARCHAR(120) NULL AFTER return_address');
    await pool.query('ALTER TABLE return_requests ADD COLUMN product_name VARCHAR(200) NULL AFTER destination_warehouse');
    await pool.query('ALTER TABLE return_requests ADD COLUMN product_variation VARCHAR(200) NULL AFTER product_name');
    await pool.query('ALTER TABLE return_requests ADD COLUMN product_qty INT NULL AFTER product_variation');
    await pool.query("ALTER TABLE return_requests ADD COLUMN approval_status ENUM('approved','waiting') NULL AFTER product_qty");
    await pool.query("ALTER TABLE return_requests ADD COLUMN exchange_delivery_status ENUM('awaiting_packaging','at_carrier_facility','on_its_way','delivered') NULL AFTER approval_status");
    await pool.query('ALTER TABLE return_requests ADD COLUMN exchange_shipment_id INT NULL AFTER exchange_delivery_status');
    await pool.query("ALTER TABLE return_requests ADD COLUMN return_delivery_status ENUM('awaiting_arrival','canceled','delivered') NULL AFTER exchange_shipment_id");
    await pool.query('ALTER TABLE return_requests ADD COLUMN dispute_status VARCHAR(20) NULL AFTER return_delivery_status');
    await pool.query('ALTER TABLE return_requests ADD COLUMN accepted_at TIMESTAMP NULL AFTER dispute_status');
    await pool.query('ALTER TABLE return_requests ADD COLUMN received_at TIMESTAMP NULL AFTER accepted_at');
    await pool.query('ALTER TABLE return_requests ADD COLUMN inspection TINYINT(1) NOT NULL DEFAULT 0 AFTER received_at');
  }

  const retColsB = await all<Row<{ COLUMN_NAME: string }>>(pool, 'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?', [cfg.database, 'return_requests']);
  const retColSetB = new Set(retColsB.map((c) => c.COLUMN_NAME));
  if (!retColSetB.has('delivery_type')) {
    await pool.query('ALTER TABLE return_requests ADD COLUMN delivery_type VARCHAR(50) NULL AFTER inspection');
    await pool.query('ALTER TABLE return_requests ADD COLUMN process_type VARCHAR(50) NULL AFTER delivery_type');
    await pool.query('ALTER TABLE return_requests ADD COLUMN carrier VARCHAR(80) NULL AFTER process_type');
  }
  try {
    await pool.query("ALTER TABLE return_requests MODIFY approval_status ENUM('approved','waiting','rejected') NULL");
  } catch {}
  try {
    await pool.query("ALTER TABLE return_requests MODIFY return_delivery_status ENUM('awaiting_arrival','packed','ready_for_pickup','picked_up','on_its_way','delivered','returning_to_sender','returned_to_sender','return_delivered','canceled') NULL");
  } catch {}
  try {
    await pool.query("ALTER TABLE return_requests MODIFY exchange_delivery_status ENUM('packed','awaiting_packaging','ready_for_pickup','picked_up','on_its_way','at_carrier_facility','delivered','returning_to_sender','returned_to_sender','canceled') NULL");
  } catch {}
  try {
    await pool.query('ALTER TABLE support_tickets ADD COLUMN assigned_to INT NULL AFTER answer');
  } catch {}
  try {
    await pool.query('ALTER TABLE support_tickets ADD CONSTRAINT fk_tickets_assigned FOREIGN KEY (assigned_to) REFERENCES users(id)');
  } catch {}

  await seed();

  const mapUser = (r: Row<Record<string, unknown>>): DbUser => ({ id: Number(r.id), name: r.name as string, email: r.email as string, password_hash: r.password_hash as string, role: r.role as DbUser['role'], photo: (r.photo as string) ?? null, cin: (r.cin as string) ?? null, created_at: (r.created_at as Date).toISOString() });

  async function loadOrder(id: number, conn?: Queryable): Promise<OrderFull | null> {
    const db = conn ?? pool;
    const o = await row(db, 'SELECT o.*, ds.name AS dropshipper_name, ds.cin AS dropshipper_cin, c.name AS confirmed_by_name FROM orders o JOIN users ds ON ds.id = o.dropshipper_id LEFT JOIN users c ON c.id = o.confirmed_by WHERE o.id = ?', [id]) as unknown as Row<Record<string, unknown>> | undefined;
    if (!o) return null;
    const itemsRows = await all<Row<Record<string, unknown>>>(db, 
      'SELECT oi.id, oi.order_id, oi.product_id, oi.quantity, oi.house_qty, oi.supplier_qty, oi.price, oi.cost, p.name AS product_name, p.image_url AS product_image, p.fournisseur_id, u.name AS fournisseur_name FROM order_items oi JOIN products p ON p.id = oi.product_id JOIN users u ON u.id = p.fournisseur_id WHERE oi.order_id = ?',
      [id]
    );
    const trackRows = await all<Row<Record<string, unknown>>>(db, 
      'SELECT id, order_id, carrier, tracking_number, status, detail, updated_at FROM tracks WHERE order_id = ? ORDER BY id DESC',
      [id]
    );
    const asIso = (v: unknown): string | null => (v == null ? null : v instanceof Date ? v.toISOString() : String(v));
    const shippedAt = asIso(o.shipped_at);
    const deliveredAt = asIso(o.delivered_at);
    const shippedMs = shippedAt ? new Date(shippedAt).getTime() : null;
    const autoDeliver = shippedAt && !deliveredAt && shippedMs !== null && !isNaN(shippedMs) ? new Date(shippedMs + 12 * 3600 * 1000).toISOString() : null;
    const items = itemsRows.map((i) => ({ id: Number(i.id), order_id: Number(i.order_id), product_id: Number(i.product_id), product_name: i.product_name as string, product_image: (i.product_image as string) ?? null, quantity: Number(i.quantity), house_qty: Number(i.house_qty ?? 0), supplier_qty: Number(i.supplier_qty ?? 0), price: Number(i.price), cost: Number(i.cost), fournisseur_id: Number(i.fournisseur_id), fournisseur_name: i.fournisseur_name as string }));
    const supplierNames = [...new Set(items.map((i) => i.fournisseur_name).filter((n) => !!n))];
    const fournisseur_name = supplierNames.length > 1 ? supplierNames.join(' & ') : (supplierNames[0] ?? 'Unknown');
    const status = o.status as OrderFull['status'];
    let commission = Number(o.commission ?? 0);
    let profit = Number(o.profit);
    if (status === 'delivered' && commission === 0) {
      commission = round2((Number(o.total) * 3) / 100);
      profit = round2(Number(o.total) - Number(o.total_cost) - commission);
    }
    return {
      id: Number(o.id),
      order_number: o.order_number as string,
      barcode: (o.barcode as string) ?? null,
      dropshipper_id: Number(o.dropshipper_id),
      fournisseur_id: Number(o.fournisseur_id),
      customer_name: (o.customer_name as string) ?? null,
      customer_phone: (o.customer_phone as string) ?? null,
      governorate: (o.governorate as string) ?? null,
      city: (o.city as string) ?? null,
      shipping_address: (o.shipping_address as string) ?? null,
      delivery_company: (o.delivery_company as string) ?? null,
      delivery_status: (o.delivery_status as string) ?? null,
      locality_id: (o.locality_id as number) ?? null,
      telephone2: (o.telephone2 as string) ?? null,
      commentaire: (o.commentaire as string) ?? null,
      est_fragile: (o.est_fragile as string) ?? 'non',
      ouvrir_colis: (o.ouvrir_colis as string) ?? 'non',
      nombre_article: o.nombre_article == null ? null : Number(o.nombre_article),
      nombre_echange: (o.nombre_echange as string) ?? 'non',
      status,
      order_type: ((o.order_type as string) === 'wholesale' ? 'wholesale' : (o.order_type as string) === 'fulfillment' ? 'fulfillment' : 'dropshipping') as OrderFull['order_type'],
      payment_status: o.payment_status as OrderFull['payment_status'],
      payment_method: (o.payment_method as string) ?? null,
      total: Number(o.total),
      total_cost: Number(o.total_cost),
      profit,
      commission,
      confirmed_at: asIso(o.confirmed_at),
      confirmed_by: o.confirmed_by == null ? null : Number(o.confirmed_by),
      confirmed_by_name: (o.confirmed_by_name as string) ?? null,
      shipped_at: shippedAt,
      delivered_at: deliveredAt,
      returned_at: asIso(o.returned_at),
      auto_deliver_at: autoDeliver,
      created_at: (o.created_at as Date).toISOString(),
      dropshipper_name: o.dropshipper_name as string,
      dropshipper_cin: (o.dropshipper_cin as string) ?? null,
      fournisseur_name,
      items,
      tracking: trackRows.map((t) => ({ id: Number(t.id), order_id: Number(t.order_id), carrier: (t.carrier as string) ?? null, tracking_number: (t.tracking_number as string) ?? null, status: (t.status as string) ?? null, detail: (t.detail as string) ?? null, updated_at: (t.updated_at as Date).toISOString() })),
    };
  }

  /** When an order ships, fulfillment units stored for it leave the inventories and drop out of committed_stock. */
  async function releaseCommittedForOrder(db: Queryable, orderId: number): Promise<void> {
    const items = await all<Row<{ product_id: number; supplier_qty: number }>>(db, 'SELECT product_id, supplier_qty FROM order_items WHERE order_id = ?', [orderId]);
    for (const it of items) {
      const supplier = Number(it.supplier_qty ?? 0);
      if (supplier <= 0) continue;
      const pid = Number(it.product_id);
      let remaining = supplier;
      const slots = await all<Row<{ id: number; quantity: number }>>(db, `
        SELECT ii.id, ii.quantity
        FROM inventory_items ii JOIN inventories i ON i.id = ii.inventory_id
        WHERE ii.product_id = ? ORDER BY i.id
      `, [pid]);
      for (const slot of slots) {
        if (remaining <= 0) break;
        const qty = Number(slot.quantity);
        const take = Math.min(qty, remaining);
        if (take > 0) {
          if (take >= qty) {
            await db.execute('DELETE FROM inventory_items WHERE id = ?', [Number(slot.id)]);
          } else {
            await db.execute('UPDATE inventory_items SET quantity = quantity - ? WHERE id = ?', [take, Number(slot.id)]);
          }
          remaining -= take;
        }
      }
      await db.execute('UPDATE products SET committed_stock = GREATEST(0, COALESCE(committed_stock, 0) - ?) WHERE id = ?', [supplier, pid]);
    }
  }

  /** Remaining units the chef/supplier still owe a product across all unshipped open orders (demand − claimed − committed). */
  async function remainingToProvideMysql(db: Queryable, productId: number): Promise<number> {
    const r = await row<Row<{ dem: string; claimed: string }>>(db, `
      SELECT COALESCE(SUM(oi.quantity), 0) AS dem, COALESCE(SUM(oi.house_qty), 0) AS claimed
      FROM order_items oi JOIN orders o ON o.id = oi.order_id
      WHERE oi.product_id = ? AND o.status IN ('pending','confirmed')
    `, [productId]);
    const dem = Number(r?.dem ?? 0);
    const claimed = Number(r?.claimed ?? 0);
    const p = await all<Row<{ committed_stock: number }>>(db, 'SELECT committed_stock FROM products WHERE id = ?', [productId]);
    const committed = Number(p[0]?.committed_stock ?? 0);
    return Math.max(0, dem - claimed - committed);
  }

  /** Put the retour-pool units a commande claimed back into the pool (used when a pending commande is cancelled). */
  async function restorePoolForOrderMysql(db: Queryable, orderId: number): Promise<void> {
    const items = await all<Row<{ product_id: number; house_qty: number }>>(db, 'SELECT product_id, house_qty FROM order_items WHERE order_id = ? AND house_qty > 0', [orderId]);
    for (const it of items) {
      await db.execute('UPDATE products SET house_stock = COALESCE(house_stock, 0) + ? WHERE id = ?', [Number(it.house_qty), Number(it.product_id)]);
    }
  }

  /** Only when a commande is finally confirmed do the chef + involved fournisseurs learn how many units to make ready. */
  async function notifyStockRequestsMysql(db: Queryable, orderId: number): Promise<void> {
    const items = await all<Row<{ product_id: number; supplier_qty: number; product_name: string; fournisseur_id: number; dropshipper_name: string | null }>>(db, `
      SELECT oi.product_id, oi.supplier_qty, p.name AS product_name, p.fournisseur_id, u.name AS dropshipper_name
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      LEFT JOIN users u ON u.id = (SELECT dropshipper_id FROM orders WHERE id = oi.order_id)
      WHERE oi.order_id = ? AND oi.supplier_qty > 0
    `, [orderId]);
    if (items.length === 0) return;
    const chefRows = await all<Row<{ id: number }>>(db, "SELECT id FROM users WHERE role = 'admin'");
    for (const it of items) {
      const totalToProvide = await remainingToProvideMysql(db, Number(it.product_id));
      const title = '📦 Products to make ready';
      const body = `Dropshippers need ${totalToProvide} × "${it.product_name}" (${Number(it.supplier_qty)} from ${it.dropshipper_name ?? 'A dropshipper'}'s commande) but retour/house stock can't cover it — please make ${totalToProvide} ready for the chef to pick up.`;
      await db.execute('INSERT INTO notifications (user_id, type, title, body, product_id) VALUES (?,?,?,?,?)', [Number(it.fournisseur_id), 'stock_request', title, body, Number(it.product_id)]);
      for (const c of chefRows) {
        await db.execute('INSERT INTO notifications (user_id, type, title, body, product_id) VALUES (?,?,?,?,?)', [Number(c.id), 'stock_request', title, body, Number(it.product_id)]);
      }
    }
  }

  const store: Store = {
    async findUserByEmail(email) {
      const r = await row(pool, 'SELECT * FROM users WHERE email = ?', [email]);
      return r ? mapUser(r as Row<Record<string, unknown>>) : null;
    },
    async findUserById(id) {
      const r = await row(pool, 'SELECT * FROM users WHERE id = ?', [id]);
      return r ? mapUser(r as Row<Record<string, unknown>>) : null;
    },
    async createUser(input: CreateUserInput) {
      const [r] = await pool.execute('INSERT INTO users (name, email, password_hash, role, photo, cin) VALUES (?,?,?,?,?,?)', [input.name, input.email, input.password_hash, input.role, input.photo ?? null, input.cin ?? null]);
      const id = (r as mysql.ResultSetHeader).insertId;
      const created = await store.findUserById(id);
      return created!;
    },
    async listUsers() {
      const rows = await all<Row<Record<string, unknown>>>(pool, 'SELECT id, name, email, role, photo, cin, created_at FROM users ORDER BY id ASC');
      return rows.map((r) => ({ id: Number(r.id), name: r.name as string, email: r.email as string, role: r.role as DbUser['role'], photo: (r.photo as string) ?? null, cin: (r.cin as string) ?? null, created_at: (r.created_at as Date).toISOString() }));
    },
    async updateUser(id, patch) {
      const sets: string[] = [];
      const vals: any[] = [];
      if (patch.name !== undefined) { sets.push('name = ?'); vals.push(patch.name); }
      if (patch.role !== undefined) { sets.push('role = ?'); vals.push(patch.role); }
      if (patch.photo !== undefined) { sets.push('photo = ?'); vals.push(patch.photo); }
      if (patch.cin !== undefined) { sets.push('cin = ?'); vals.push(patch.cin ?? null); }
      if (sets.length) await pool.execute(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
    },
    async deleteUser(id) {
      await pool.execute('DELETE FROM users WHERE id = ?', [id]);
    },

    async listProducts(opts) {
      let sql = 'SELECT p.*, u.name AS fournisseur_name FROM products p JOIN users u ON u.id = p.fournisseur_id WHERE 1=1';
      const params: unknown[] = [];
      if (opts?.fournisseurId) { sql += ' AND p.fournisseur_id = ?'; params.push(opts.fournisseurId); }
      if (opts?.activeOnly) { sql += ' AND p.is_active = 1 AND p.moderation_status = "approved"'; }
      if (opts?.hideIneligible) { sql += ' AND (NOT EXISTS (SELECT 1 FROM supplier_organizations so WHERE CONVERT(so.email USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(u.email USING utf8mb4) COLLATE utf8mb4_unicode_ci AND so.allow_marketplace = 0))'; }
  if (opts?.excludeCategories?.length) {
    for (const c of opts.excludeCategories) {
      sql += ' AND p.category <> ? AND (p.offers IS NULL OR p.offers NOT LIKE ?)';
      params.push(c, `%${c}%`);
    }
  }
      if (opts?.q) { sql += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)'; params.push(`%${opts.q}%`, `%${opts.q}%`, `%${opts.q}%`); }
      sql += ' ORDER BY p.id DESC';
      const rows = await all<Row<Record<string, unknown>>>(pool, sql, params);
      const stats = await loadProductStats();
      return rows.map((p) => {
        const prod = mapProduct(p, true);
        prod.stats = stats.get(prod.id) ?? zeroStats();
        return prod;
      });
    },
    async listStockingProducts(q) {
      let sql = `SELECT p.*, u.name AS fournisseur_name, u.email AS u_email,
        so.phone_full AS s_phone, so.org_name AS s_org_name, so.city AS s_city, so.account_manager AS s_am
        FROM products p
        JOIN users u ON u.id = p.fournisseur_id
        LEFT JOIN supplier_organizations so ON CONVERT(so.email USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(u.email USING utf8mb4) COLLATE utf8mb4_unicode_ci
        WHERE 1=1`;
      const params: unknown[] = [];
      if (q) { sql += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ? OR u.name LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`); }
      sql += ' ORDER BY p.id DESC';
      const rows = await all<Row<Record<string, unknown>>>(pool, sql, params);
      const stats = await loadProductStats();
      return rows.map((p) => {
        const prod = mapProduct(p, true) as StockingProduct;
        prod.stats = stats.get(prod.id) ?? zeroStats();
        prod.supplier_email = (p.u_email as string) ?? null;
        prod.supplier_phone = (p.s_phone as string) ?? null;
        prod.supplier_org_name = (p.s_org_name as string) ?? null;
        prod.supplier_city = (p.s_city as string) ?? null;
        prod.supplier_account_manager = (p.s_am as string) ?? null;
        return prod;
      });
    },
    async moderateProduct(id, status, note) {
      const isActive = status === 'approved';
      await pool.execute('UPDATE products SET is_active = ?, moderation_status = ?, moderation_note = ? WHERE id = ?', [isActive ? 1 : 0, status, note ?? null, id]);
    },
    async getProduct(id) {
      const rows = await all<Row<Record<string, unknown>>>(pool, 'SELECT p.*, u.name AS fournisseur_name FROM products p JOIN users u ON u.id = p.fournisseur_id WHERE p.id = ?', [id]);
      const p = rows[0];
      if (!p) return null;
      return mapProduct(p, true);
    },
    async createProduct(input: CreateProductInput) {
      const images = input.images ?? (input.image_url ? [input.image_url] : []);
      const videos = input.videos ?? (input.video_url ? [input.video_url] : []);
      const cat = input.category ?? 'dropshipping';
      const offers = input.offers?.length ? input.offers : [cat];
      const [r] = await pool.execute('INSERT INTO products (fournisseur_id, name, description, price, cost_price, category, offers, retail_category, height, length, width, weight, stock, sku, barcode, image_url, video_url, images, videos, keywords, specifications, wholesale_tiers, is_active, moderation_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [
        input.fournisseur_id, input.name, input.description ?? null, input.price, input.cost_price, cat, offers.join(','),
        input.retail_category ?? null,
        input.height ?? null, input.length ?? null, input.width ?? null, input.weight ?? null, input.stock, input.sku ?? null, input.barcode ?? null,
        images[0] ?? null, videos[0] ?? null, jstr(images), jstr(videos), jstr(input.keywords), jstr(input.specifications), jstr(input.wholesale_tiers), 0, 'pending',
      ]);
      const id = (r as mysql.ResultSetHeader).insertId;
      return (await store.getProduct(id))!;
    },
    async updateProduct(id, patch) {
      const sets: string[] = [];
      const vals: any[] = [];
      const m: Record<string, unknown> = { name: patch.name, description: patch.description, price: patch.price, cost_price: patch.cost_price, category: patch.category, retail_category: patch.retail_category, height: patch.height, length: patch.length, width: patch.width, weight: patch.weight, stock: patch.stock, sku: patch.sku, barcode: patch.barcode, is_active: patch.is_active };
      if (patch.offers !== undefined) m.offers = patch.offers.length ? patch.offers.join(',') : patch.category ?? 'dropshipping';
      const images = patch.images !== undefined ? patch.images ?? [] : undefined;
      const videos = patch.videos !== undefined ? patch.videos ?? [] : undefined;
      if (images !== undefined) {
        m.images = jstr(images);
        m.image_url = images[0] ?? null;
      }
      if (videos !== undefined) {
        m.videos = jstr(videos);
        m.video_url = videos[0] ?? null;
      }
      if (patch.keywords !== undefined) m.keywords = jstr(patch.keywords);
      if (patch.specifications !== undefined) m.specifications = jstr(patch.specifications);
      if (patch.wholesale_tiers !== undefined) m.wholesale_tiers = jstr(patch.wholesale_tiers);
      for (const k of Object.keys(m)) {
        if (m[k] !== undefined) { sets.push(`${k} = ?`); vals.push(m[k]); }
      }
      if (sets.length) await pool.execute(`UPDATE products SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
    },
    async nextBarcode() {
      const rows = await all<Row<{ next: string | null }>>(pool, 'SELECT MAX(CAST(barcode AS UNSIGNED)) + 1 AS next FROM products');
      const next = Number(rows[0]?.next) || 2000000000000;
      return String(next);
    },
    async deleteProduct(id) {
      await pool.execute('DELETE FROM products WHERE id = ?', [id]);
    },
    async setStock(id, stock) {
      await pool.execute('UPDATE products SET stock = GREATEST(?, 0) WHERE id = ?', [stock, id]);
    },
    async updateRating(id, avg, count) {
      await pool.execute('UPDATE products SET rating = ?, rating_count = ? WHERE id = ?', [avg, count, id]);
    },
    async insertRating(input) {
      await pool.execute('INSERT INTO ratings (product_id, user_id, score, comment) VALUES (?,?,?,?)', [input.product_id, input.user_id, input.score, input.comment ?? null]);
    },
    async getProductRatings(productId) {
      const avgRows = await all<Row<{ avg: string | null; count: number }>>(pool, 'SELECT AVG(score) AS avg, COUNT(*) AS count FROM ratings WHERE product_id = ?', [productId]);
      const agg = avgRows[0];
      return { avg: Math.round((Number(agg?.avg) || 0) * 100) / 100, count: Number(agg?.count ?? 0) };
    },

    async listOrders(opts) {
      await this.finalizeAutoDeliveries();
      let sql = 'SELECT DISTINCT o.id FROM orders o WHERE 1=1';
      const params: unknown[] = [];
      if (opts.role === 'customer') { sql += ' AND o.dropshipper_id = ?'; params.push(opts.userId); }
      if (opts.role === 'seller') {
        sql += ' AND EXISTS (SELECT 1 FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = o.id AND p.fournisseur_id = ?)';
        params.push(opts.userId);
      }
      if (opts.role !== 'customer' && opts.role !== 'admin') {
        if (opts.role === 'seller') {
          sql += " AND (o.status <> 'draft' OR o.dropshipper_id = ?)";
          params.push(opts.userId);
        } else {
          sql += " AND o.status <> 'draft'";
        }
      }
      sql += ' ORDER BY o.id DESC';
      const rows = await all<Row<{ id: number }>>(pool, sql, params);
      const out: OrderFull[] = [];
      for (const r of rows) {
        const o = await loadOrder(Number(r.id));
        if (o) out.push(o);
      }
      return out;
    },
    async getOrder(id) {
      await this.finalizeAutoDeliveries();
      return loadOrder(id);
    },
    async finalizeAutoDeliveries() {
      const [r] = await pool.execute(`
        UPDATE orders
        SET status = 'delivered',
            delivered_at = COALESCE(delivered_at, NOW()),
            commission = ROUND(total * 0.03, 2),
            profit = ROUND(total - total_cost - ROUND(total * 0.03, 2), 2),
            payment_status = IF(payment_method = 'cod', 'paid', payment_status)
        WHERE status = 'shipped' AND shipped_at IS NOT NULL AND shipped_at < NOW() - INTERVAL 12 HOUR
      `);
      return (r as mysql.ResultSetHeader).affectedRows ?? 0;
    },
    async findOrderByCode(code: string) {
      const c = String(code).trim();
      const rows = await all<Row<{ id: number }>>(pool, 'SELECT id FROM orders WHERE barcode = ? OR order_number = ? LIMIT 1', [c, c]);
      if (!rows.length) return null;
      return loadOrder(Number(rows[0].id));
    },
    async scanOrder(id, action, confirmedBy?: number | null) {
      await this.finalizeAutoDeliveries();
      const o = await row(pool, 'SELECT id, status, confirmed_at, confirmed_by, shipped_at, returned_at, profit, dropshipper_id, payment_method FROM orders WHERE id = ?', [id]);
      if (!o) throw new OrderScanError('not_found', 'Commande not found');
      const status = o.status as OrderStatus;
      const confirmedAt = o.confirmed_at as Date | null;
      const shippedAt = o.shipped_at as Date | null;
      const returnedAt = o.returned_at as Date | null;

      if (action === 'confirm') {
        if (confirmedAt) throw new OrderScanError('conflict', 'This commande was already confirmed — a step can only be scanned once');
        if (status !== 'pending') throw new OrderScanError('conflict', `Cannot confirm a commande that is "${status}"`);
        await pool.execute("UPDATE orders SET status = 'confirmed', confirmed_at = NOW(), confirmed_by = ? WHERE id = ?", [confirmedBy ?? null, id]);
        await notifyStockRequestsMysql(pool, id);
      } else if (action === 'shipping') {
        if (shippedAt) throw new OrderScanError('conflict', 'This commande was already marked shipped — a step can only be scanned once');
        if (status !== 'confirmed') throw new OrderScanError('invalid_state', 'Commande must be confirmed before it can be shipped');
        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();
          await conn.execute("UPDATE orders SET status = 'shipped', shipped_at = NOW() WHERE id = ?", [id]);
          await releaseCommittedForOrder(conn, id);
          await conn.commit();
        } catch (e) {
          await conn.rollback();
          throw e;
        } finally {
          conn.release();
        }
        dispatchToDeliveryCompany(pool, id).catch((err) => console.error(`[first-delivery] dispatch failed for order ${id}:`, err?.message ?? err));
      } else if (action === 'retour') {
        if (returnedAt) throw new OrderScanError('conflict', 'This commande was already returned');
        if (status !== 'shipped') throw new OrderScanError('invalid_state', 'A retour is only possible after the commande has been shipped');
        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();
          await conn.execute("UPDATE orders SET status = 'retour', returned_at = NOW(), profit = ROUND(profit - 3, 2) WHERE id = ?", [id]);
          const items = await all<Row<{ product_id: number; quantity: number }>>(conn, 'SELECT product_id, quantity FROM order_items WHERE order_id = ?', [id]);
          for (const it of items) {
            await conn.execute('UPDATE products SET house_stock = COALESCE(house_stock, 0) + ? WHERE id = ?', [Number(it.quantity), Number(it.product_id)]);
          }
          await conn.execute("INSERT INTO return_requests (order_id, dropshipper_id, type, reason, status, reply) VALUES (?,?,?,?,?,?)", [id, Number(o.dropshipper_id), 'retour', 'Retour spanné par le chef', 'processed', 'Returned — the products were put back into house stock.']);
          await conn.commit();
        } catch (e) {
          await conn.rollback();
          throw e;
        } finally {
          conn.release();
        }
      }
      return (await loadOrder(id))!;
    },
    async createOrder(input: CreateOrderInput) {
      const conn = await pool.getConnection();
      const requestedFromSupplier: StockRequestItem[] = [];
      try {
        await conn.beginTransaction();
        let firstFournisseurId = 0;
        const claims = new Map<number, { house: number; sup: number }>();
        for (const it of input.items) {
          const prows = await all<Row<Record<string, unknown>>>(conn, 'SELECT id, name, stock, house_stock, is_active, fournisseur_id FROM products WHERE id = ?', [it.product_id]);
          const p = prows[0];
          if (!p) throw new Error(`Product ${it.product_id} not found`);
          if (!b(p.is_active) && Number(p.fournisseur_id) !== input.dropshipper_id) throw new Error(`Product "${p.name}" is not available`);
          if (!firstFournisseurId) firstFournisseurId = Number(p.fournisseur_id);
          const houseStock = Number(p.house_stock ?? 0);
          const takeFromHouse = Math.min(it.quantity, houseStock);
          const fromSupplier = it.quantity - takeFromHouse;
          claims.set(it.product_id, { house: takeFromHouse, sup: fromSupplier });
          if (fromSupplier > 0 && Number(p.stock) < fromSupplier) {
            throw new StockError(`"${p.name}" only has ${Number(p.stock)} in supplier stock — not enough to provide the ${fromSupplier} units this commande needs.`);
          }
          await conn.execute('UPDATE products SET house_stock = house_stock - ? WHERE id = ?', [takeFromHouse, it.product_id]);
          if (fromSupplier > 0) {
            requestedFromSupplier.push({ product_id: it.product_id, product_name: p.name as string, quantity: fromSupplier, house_available: houseStock, fournisseur_id: Number(p.fournisseur_id) });
          }
        }
        const [orderRes] = await conn.execute('INSERT INTO orders (order_number, dropshipper_id, fournisseur_id, customer_name, customer_phone, telephone2, governorate, city, shipping_address, status, order_type, payment_status, payment_method, locality_id, commentaire, est_fragile, ouvrir_colis, nombre_article, nombre_echange) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [
          input.order_number, input.dropshipper_id, firstFournisseurId, input.customer_name ?? null, input.customer_phone ?? null,
          input.telephone2 ?? null,
          input.governorate ?? null, input.city ?? null, input.shipping_address ?? null,
          'draft', input.offer_type === 'fulfillment' ? 'fulfillment' : input.offer_type === 'wholesale' ? 'wholesale' : 'dropshipping', input.payment_method === 'cod' ? 'unpaid' : 'paid', input.payment_method,
          input.locality_id ?? null, input.commentaire ?? null, input.est_fragile ?? 'non', input.ouvrir_colis ?? 'non', input.nombre_article ?? null, input.nombre_echange ?? 'non',
        ]);
        const orderId = (orderRes as mysql.ResultSetHeader).insertId;
        const resolvedItems: Array<{ product_id: number; quantity: number; claim: { house: number; sup: number }; price: number; cost: number }> = [];
for (const it of input.items) {
          const prows = await all<Row<{ price: number; cost_price: number; wholesale_tiers: unknown; moderation_status: string }>>(conn, 'SELECT price, cost_price, wholesale_tiers, moderation_status FROM products WHERE id = ?', [it.product_id]);
          if (prows[0] && prows[0].moderation_status === 'hidden') {
            throw new Error(`Product #${it.product_id} is hidden and cannot be ordered`);
          }
          const savedPriceRows = await all<Row<{ my_price: number | null }>>(conn, 'SELECT my_price FROM saved_products WHERE dropshipper_id = ? AND product_id = ?', [input.dropshipper_id, it.product_id]);
          const myPrice = savedPriceRows[0]?.my_price;
          let price: number;
          if (input.offer_type === 'wholesale') {
            const rawTiers = prows[0]?.wholesale_tiers;
            let tiers: unknown = null;
            if (typeof rawTiers === 'string') {
              try { tiers = rawTiers ? JSON.parse(rawTiers) : null; } catch { tiers = null; }
            } else {
              tiers = rawTiers;
            }
            const tierPrice = resolveWholesalePrice(parseTiers(tiers), it.quantity);
            price = tierPrice != null ? tierPrice : (myPrice != null ? Number(myPrice) : Number(prows[0].price));
          } else {
            price = myPrice != null ? Number(myPrice) : Number(prows[0].price);
          }
          const claim = claims.get(it.product_id) ?? { house: 0, sup: 0 };
          resolvedItems.push({ product_id: it.product_id, quantity: it.quantity, claim, price, cost: Number(prows[0].cost_price) });
        }

        // Whole-commande manual price: override per-line prices with a uniform unit price so the total equals the entered amount
        if (input.manual_price != null && input.manual_price > 0) {
          const totalQty = resolvedItems.reduce((s, i) => s + i.quantity, 0) || 1;
          const target = round2(input.manual_price);
          const unit = round2(target / totalQty);
          let assignedSum = 0;
          for (let i = 0; i < resolvedItems.length; i++) {
            const isLast = i === resolvedItems.length - 1;
            if (isLast) {
              const remaining = round2(target - assignedSum);
              const remQty = resolvedItems[i].quantity;
              resolvedItems[i] = { ...resolvedItems[i], price: round2(remaining / remQty) };
            } else {
              resolvedItems[i] = { ...resolvedItems[i], price: unit };
              assignedSum += round2(unit * resolvedItems[i].quantity);
            }
          }
        }

        for (const item of resolvedItems) {
          await conn.execute('INSERT INTO order_items (order_id, product_id, quantity, house_qty, supplier_qty, price, cost) VALUES (?,?,?,?,?,?,?)', [orderId, item.product_id, item.quantity, item.claim.house, item.claim.sup, item.price, item.cost]);
        }
        const aggRows = await all<Row<{ total: string; cost: string }>>(conn, 'SELECT SUM(price*quantity) AS total, SUM(cost*quantity) AS cost FROM order_items WHERE order_id = ?', [orderId]);
        const agg = aggRows[0];
        const orderTotal = input.manual_price != null && input.manual_price > 0 ? round2(input.manual_price) : Number(agg.total);
        await conn.execute('UPDATE orders SET total = ?, total_cost = ?, profit = ? WHERE id = ?', [orderTotal, Number(agg.cost), round2(orderTotal - Number(agg.cost)), orderId]);
        await conn.commit();
        const order = (await loadOrder(orderId, conn))!;
        return { order, requestedFromSupplier };
      } catch (e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
    },
    async updateOrderStatus(id, status) {
      if (status === 'delivered') {
        await pool.execute(`UPDATE orders SET status = 'delivered', delivered_at = COALESCE(delivered_at, NOW()), commission = ROUND(total * 0.03, 2), profit = ROUND(total - total_cost - ROUND(total * 0.03, 2), 2), payment_status = IF(payment_method = 'cod', 'paid', payment_status) WHERE id = ?`, [id]);
        return;
      }
      const prevRows = await all<Row<{ status: string }>>(pool, 'SELECT status FROM orders WHERE id = ?', [id]);
      const prev = prevRows[0]?.status;
      if (status === 'pending') {
        const rows = await all<Row<{ status: string }>>(pool, 'SELECT status FROM orders WHERE id = ?', [id]);
        if (rows[0]?.status !== 'draft') return;
        await pool.execute('UPDATE orders SET status = ? WHERE id = ?', ['pending', id]);
        await notifyStockRequestsMysql(pool, id);
        return;
      }
      if (status === 'confirmed') {
        await pool.execute("UPDATE orders SET status = 'confirmed', confirmed_at = COALESCE(confirmed_at, NOW()) WHERE id = ?", [id]);
        return;
      }
      if (status === 'cancelled') {
        const conn = await pool.getConnection();
        try {
          await conn.beginTransaction();
          if (prev === 'pending' || prev === 'draft') {
            await restorePoolForOrderMysql(conn, id);
            await releaseCommittedForOrder(conn, id);
          }
          await conn.execute("UPDATE orders SET status = 'cancelled' WHERE id = ?", [id]);
          await conn.execute("UPDATE order_picks SET status = 'cancelled' WHERE order_id = ? AND status IN ('unconfirmed','confirmed')", [id]);
          await conn.commit();
        } catch (e) {
          await conn.rollback();
          throw e;
        } finally {
          conn.release();
        }
        return;
      }
      await pool.execute('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
      if (status === 'shipped') {
        dispatchToDeliveryCompany(pool, id).catch((err) => console.error(`[first-delivery] dispatch failed for order ${id}:`, err?.message ?? err));
      }
    },
    async deleteOrder(id) {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        await restorePoolForOrderMysql(conn, id);
        await releaseCommittedForOrder(conn, id);
        await conn.execute('DELETE FROM orders WHERE id = ?', [id]);
        await conn.commit();
      } catch (e) {
        await conn.rollback();
        throw e;
      } finally {
        conn.release();
      }
    },
    async setDeliveryCompany(id, deliveryCompany) {
      await pool.execute('UPDATE orders SET delivery_company = ? WHERE id = ?', [deliveryCompany, id]);
    },
    async setDeliveryStatus(id, deliveryStatus) {
      await pool.execute('UPDATE orders SET delivery_status = ? WHERE id = ?', [deliveryStatus, id]);
    },
    async setOrderBarcode(id, barcode) {
      await pool.execute('UPDATE orders SET barcode = ? WHERE id = ?', [barcode, id]);
    },
    async updatePayment(id, payment_status, method) {
      if (method) await pool.execute('UPDATE orders SET payment_status = ?, payment_method = ? WHERE id = ?', [payment_status, method, id]);
      else await pool.execute('UPDATE orders SET payment_status = ? WHERE id = ?', [payment_status, id]);
    },
    async addTracking(order_id, data) {
      await pool.execute('INSERT INTO tracks (order_id, carrier, tracking_number, status, detail) VALUES (?,?,?,?,?)', [order_id, data.carrier, data.tracking_number, data.status, data.detail ?? null]);
      const low = data.status.toLowerCase();
      if (low === 'shipped') {
        const [upd] = await pool.execute("UPDATE orders SET status = 'shipped' WHERE id = ? AND status = 'confirmed'", [order_id]);
        if ((upd as mysql.ResultSetHeader).affectedRows > 0) await releaseCommittedForOrder(pool, order_id);
      }
      if (low === 'delivered') await pool.execute(`UPDATE orders SET status = 'delivered', delivered_at = COALESCE(delivered_at, NOW()), commission = ROUND(total * 0.03, 2), profit = ROUND(total - total_cost - ROUND(total * 0.03, 2), 2), payment_status = IF(payment_method = 'cod', 'paid', payment_status) WHERE id = ? AND status = 'shipped'`, [order_id]);
    },

    async listTickets(opts) {
      let sql = `SELECT t.*, u.name AS user_name, u.email AS user_email,
                 au.name AS assigned_to_name
                 FROM support_tickets t
                 JOIN users u ON u.id = t.user_id
                 LEFT JOIN users au ON au.id = t.assigned_to`;
      const params: unknown[] = [];
      if (opts.role !== 'admin') {
        sql += ' WHERE t.user_id = ?';
        params.push(opts.userId);
      }
      sql += ' ORDER BY t.id DESC';
      const rows = await all<Row<Record<string, unknown>>>(pool, sql, params);
      return rows.map((t): TicketFull => ({ id: Number(t.id), user_id: Number(t.user_id), email: t.email as string, type: t.type as string, message: t.message as string, status: t.status as DbTicket['status'], answer: (t.answer as string) ?? null, assigned_to: t.assigned_to != null ? Number(t.assigned_to) : null, created_at: (t.created_at as Date).toISOString(), user_name: t.user_name as string, user_email: t.user_email as string, assigned_to_name: (t.assigned_to_name as string) ?? null }));
    },
    async createTicket(input) {
      await pool.execute('INSERT INTO support_tickets (user_id, email, type, message, assigned_to) VALUES (?,?,?,?,?)', [input.user_id, input.email, input.type, input.message, input.assigned_to ?? null]);
    },
    async replyTicket(id, answer, status) {
      await pool.execute('UPDATE support_tickets SET answer = ?, status = ? WHERE id = ?', [answer, status, id]);
    },

    async saveProduct(dropshipper_id, product_id, offer_type) {
      await pool.execute(
        'INSERT INTO saved_products (dropshipper_id, product_id, offer_type) VALUES (?,?,?) ON DUPLICATE KEY UPDATE offer_type = VALUES(offer_type)',
        [dropshipper_id, product_id, offer_type === 'wholesale' ? 'wholesale' : 'dropshipping']
      );
    },
    async setSavedProductPrice(dropshipper_id, product_id, price) {
      await pool.execute('UPDATE saved_products SET my_price = ? WHERE dropshipper_id = ? AND product_id = ?', [price, dropshipper_id, product_id]);
    },
    async removeSavedProduct(dropshipper_id, product_id) {
      await pool.execute('DELETE FROM saved_products WHERE dropshipper_id = ? AND product_id = ?', [dropshipper_id, product_id]);
    },
    async listSavedProducts(dropshipper_id) {
      const savedRows = await all<Row<Record<string, unknown>>>(pool, 'SELECT id, created_at, product_id, my_price, offer_type FROM saved_products WHERE dropshipper_id = ? ORDER BY id DESC', [dropshipper_id]);
      const out: SavedProductView[] = [];
      for (const s of savedRows) {
        const pRows = await all<Row<Record<string, unknown>>>(pool, 'SELECT p.*, u.name AS fournisseur_name FROM products p JOIN users u ON u.id = p.fournisseur_id WHERE p.id = ?', [s.product_id]);
        const p = pRows[0];
        if (!p) continue;
        if (p.moderation_status === 'hidden') continue;
        const upd = await all<Row<Record<string, unknown>>>(pool, 'SELECT id, product_id, changed_field, old_value, new_value, created_at FROM product_updates WHERE product_id = ? ORDER BY id DESC', [s.product_id]);
        out.push({
          id: Number(s.id),
          saved_at: (s.created_at as Date).toISOString(),
          my_price: s.my_price != null ? Number(s.my_price) : null,
          offer_type: s.offer_type === 'wholesale' ? 'wholesale' : 'dropshipping',
          product: mapProduct(p, true),
          updates: upd.map((u) => ({ id: Number(u.id), product_id: Number(u.product_id), changed_field: u.changed_field as string, old_value: (u.old_value as string) ?? null, new_value: (u.new_value as string) ?? null, created_at: (u.created_at as Date).toISOString() })),
        });
      }
      return out;
    },
    async logProductUpdate(product_id, field, oldValue, newValue) {
      const stringify = (v: unknown) => (v === null || v === undefined ? null : String(v));
      const oldV = stringify(oldValue);
      const newV = stringify(newValue);
      if (oldV === newV) return;
      await pool.execute('INSERT INTO product_updates (product_id, changed_field, old_value, new_value) VALUES (?,?,?,?)', [product_id, field, oldV, newV]);
    },

    async createReturnRequest(input) {
      const ord = await row<Row<{ delivery_company: string | null }>>(pool, 'SELECT delivery_company FROM orders WHERE id = ?', [input.order_id]);
      const processType = input.type === 'echange' ? 'SWAP & RETURN' : 'DIRECT RETURN';
      const exchange = input.type === 'echange' ? 'packed' : null;
      const insert = 'INSERT INTO return_requests (order_id, dropshipper_id, type, reason, attachments, delivery_type, process_type, carrier, status, approval_status, return_delivery_status, exchange_delivery_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)';
      await pool.execute(insert, [input.order_id, input.dropshipper_id, input.type, input.reason, input.attachments && input.attachments.length ? JSON.stringify(input.attachments) : null, 'Self Delivery', processType, ord?.delivery_company ?? null, input.autoApproved ? 'approved' : 'pending', input.autoApproved ? 'approved' : 'waiting', 'awaiting_arrival', exchange]);
      const prodRows = await all<Row<{ product_id: number }>>(pool, 'SELECT oi.product_id FROM order_items oi WHERE oi.order_id = ?', [input.order_id]);
      for (const p of prodRows) {
        await pool.execute('UPDATE products SET house_stock = house_stock + 1 WHERE id = ?', [Number(p.product_id)]);
      }
    },
    async listReturnRequests(opts) {
      let sql = 'SELECT r.*, o.order_number, o.governorate, o.city, u.name AS dropshipper_name FROM return_requests r JOIN orders o ON o.id = r.order_id JOIN users u ON u.id = r.dropshipper_id';
      const params: unknown[] = [];
      if (opts.role === 'customer') { sql += ' WHERE r.dropshipper_id = ?'; params.push(opts.userId); }
      else if (opts.role === 'seller') { sql += ' WHERE EXISTS (SELECT 1 FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = r.order_id AND p.fournisseur_id = ?)'; params.push(opts.userId); }
      sql += ' ORDER BY r.id DESC';
      const rows = await all<Row<Record<string, unknown>>>(pool, sql, params);
      return rows.map((r): ReturnRequest => ({
        id: Number(r.id),
        order_id: Number(r.order_id),
        order_number: r.order_number as string,
        dropshipper_id: Number(r.dropshipper_id),
        dropshipper_name: r.dropshipper_name as string,
        type: r.type as ReturnRequest['type'],
        reason: r.reason as string,
        attachments: r.attachments ? JSON.parse(r.attachments as string) : [],
        status: r.status as ReturnRequest['status'],
        reply: (r.reply as string) ?? null,
        created_at: (r.created_at as Date).toISOString(),
        created_by: (r.created_by as string) ?? null,
        retailer_name: (r.retailer_name as string) ?? null,
        retailer_code: (r.retailer_code as string) ?? null,
        retailer_premium: b(r.retailer_premium),
        return_address: (r.return_address as string) ?? null,
        destination_warehouse: (r.destination_warehouse as string) ?? null,
        product_name: (r.product_name as string) ?? null,
        product_variation: (r.product_variation as string) ?? null,
        product_qty: r.product_qty == null ? null : Number(r.product_qty),
        approval_status: (r.approval_status as ReturnApprovalStatus) ?? null,
        exchange_delivery_status: (r.exchange_delivery_status as ExchangeDeliveryStatus) ?? null,
        exchange_shipment_id: r.exchange_shipment_id == null ? null : Number(r.exchange_shipment_id),
        return_delivery_status: (r.return_delivery_status as ReturnDeliveryStatus) ?? null,
        dispute_status: (r.dispute_status as 'unresolved' | null) ?? null,
        accepted_at: r.accepted_at == null ? null : (r.accepted_at as Date).toISOString(),
        received_at: r.received_at == null ? null : (r.received_at as Date).toISOString(),
        inspection: b(r.inspection),
        delivery_type: (r.delivery_type as string) ?? null,
        process_type: (r.process_type as string) ?? null,
        carrier: (r.carrier as string) ?? null,
        governorate: (r.governorate as string) ?? null,
        city: (r.city as string) ?? null,
      }));
    },
    async listRetourOrdersForChef(excludeOrderIds) {
      let sql = `SELECT o.id AS order_id, o.order_number, o.created_at, o.governorate, o.city, o.delivery_company,
                        ds.name AS dropshipper_name
                 FROM orders o
                 LEFT JOIN users ds ON ds.id = o.dropshipper_id
                 WHERE o.status = 'retour'`;
      const params: unknown[] = [];
      if (excludeOrderIds.size > 0) {
        const ph = [...excludeOrderIds].map(() => '?').join(',');
        sql += ` AND o.id NOT IN (${ph})`;
        params.push(...excludeOrderIds);
      }
      sql += ' ORDER BY o.id DESC';
      const orderRows = await all<Row<Record<string, unknown>>>(pool, sql, params);
      if (orderRows.length === 0) return [];
      const ids = orderRows.map((r) => Number(r.order_id));
      const placeholders = ids.map(() => '?').join(',');
      const itemRows = await all<Row<Record<string, unknown>>>(
        pool,
        `SELECT oi.order_id, oi.quantity, p.name AS product_name
         FROM order_items oi JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id IN (${placeholders}) ORDER BY oi.id`,
        ids
      );
      const itemsByOrder = new Map<number, { product_name: string; quantity: number }[]>();
      for (const r of itemRows) {
        const oid = Number(r.order_id);
        const list = itemsByOrder.get(oid) ?? [];
        list.push({ product_name: String(r.product_name ?? ''), quantity: Number(r.quantity ?? 0) });
        itemsByOrder.set(oid, list);
      }
      return orderRows.map((r) => ({
        order_id: Number(r.order_id),
        order_number: String(r.order_number ?? ''),
        dropshipper_name: (r.dropshipper_name as string) ?? null,
        governorate: (r.governorate as string) ?? null,
        city: (r.city as string) ?? null,
        delivery_company: (r.delivery_company as string) ?? null,
        created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at ?? ''),
        items: itemsByOrder.get(Number(r.order_id)) ?? [],
      }));
    },
    async getReturnOrderProducts(orderIds) {
      const map = new Map<number, { product_name: string; quantity: number }[]>();
      if (orderIds.length === 0) return map;
      const ph = orderIds.map(() => '?').join(',');
      const itemRows = await all<Row<Record<string, unknown>>>(
        pool,
        `SELECT oi.order_id, oi.quantity, p.name AS product_name
         FROM order_items oi JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id IN (${ph}) ORDER BY oi.id`,
        orderIds
      );
      for (const r of itemRows) {
        const oid = Number(r.order_id);
        const list = map.get(oid) ?? [];
        list.push({ product_name: String(r.product_name ?? ''), quantity: Number(r.quantity ?? 0) });
        map.set(oid, list);
      }
      return map;
    },
    async updateReturnRequest(id, patch) {
      const sets: string[] = [];
      const vals: any[] = [];
      if (patch.status !== undefined) { sets.push('status = ?'); vals.push(patch.status); }
      if (patch.reply !== undefined) { sets.push('reply = ?'); vals.push(patch.reply ?? null); }
      if (patch.approval_status !== undefined) {
        sets.push('approval_status = ?'); vals.push(patch.approval_status);
        sets.push('status = ?'); vals.push(patch.approval_status === 'approved' ? 'approved' : patch.approval_status === 'rejected' ? 'rejected' : 'pending');
      }
      if (patch.delivery_type !== undefined) { sets.push('delivery_type = ?'); vals.push(patch.delivery_type); }
      if (patch.process_type !== undefined) { sets.push('process_type = ?'); vals.push(patch.process_type); }
      if (patch.carrier !== undefined) { sets.push('carrier = ?'); vals.push(patch.carrier); }
      if (patch.return_delivery_status !== undefined) { sets.push('return_delivery_status = ?'); vals.push(patch.return_delivery_status); }
      if (patch.exchange_delivery_status !== undefined) { sets.push('exchange_delivery_status = ?'); vals.push(patch.exchange_delivery_status); }
      if (sets.length) await pool.execute(`UPDATE return_requests SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
    },

    async listTransferShipments() {
      const rows = await all<Row<Record<string, unknown>>>(pool, 'SELECT * FROM transfer_shipments ORDER BY created_at DESC');
      return rows.map((r): TransferShipment => ({
        id: Number(r.id),
        gid: r.gid as string,
        client_id: Number(r.client_id),
        ship_to_name: r.ship_to_name as string,
        ship_to_code: r.ship_to_code as string,
        account_manager: r.account_manager as string,
        business_developer: r.business_developer as string,
        account_incubator: (r.account_incubator as string) ?? null,
        ship_to: r.ship_to as string,
        created_at: (r.created_at as Date).toISOString(),
        delivered_at: r.delivered_at == null ? null : (r.delivered_at as Date).toISOString(),
        status: r.status as TransferShipment['status'],
        product_name: r.product_name as string,
        product_variation: (r.product_variation as string) ?? null,
        pack_units: Number(r.pack_units),
        product_qty: Number(r.product_qty),
        deposit_amount: r.deposit_amount == null ? null : Number(r.deposit_amount),
        deposit_status: r.deposit_status as TransferShipment['deposit_status'],
        payment_amount: r.payment_amount == null ? null : Number(r.payment_amount),
        payment_status: r.payment_status as TransferShipment['payment_status'],
        received_units: Number(r.received_units),
        total_units: Number(r.total_units),
        carrier_logo: r.carrier_logo as string,
        tracking_number: (r.tracking_number as string) ?? null,
      }));
    },
    async listPickupRequests() {
      const rows = await all<Row<Record<string, unknown>>>(pool, 'SELECT * FROM pickup_requests ORDER BY pickup_date DESC');
      return rows.map((r): PickupRequest => ({
        id: Number(r.id),
        gid: r.gid as string,
        follow_up_status: r.follow_up_status as string,
        warehouse: r.warehouse as string,
        address: r.address as string,
        phone_masked: r.phone_masked as string,
        phone_full: r.phone_full as string,
        related_label: r.related_label as string,
        related_type: r.related_type as PickupRequest['related_type'],
        processed_by: (r.processed_by as string) ?? null,
        carrier: {
          state: r.carrier_state as PickupRequest['carrier']['state'],
          reference: (r.carrier_reference as string) ?? null,
          date_label: (r.carrier_date_label as string) ?? null,
        },
        status: r.status as PickupRequest['status'],
        pickup_date: (r.pickup_date as Date).toISOString(),
        from_time: r.from_time as string,
        to_time: r.to_time as string,
      }));
    },
    async listManifests() {
      const rows = await all<Row<Record<string, unknown>>>(pool, 'SELECT * FROM manifests ORDER BY date DESC');
      return rows.map((r): Manifest => ({
        id: Number(r.id),
        gid: r.gid as string,
        manifest_ref: r.manifest_ref as string,
        fulfiller_name: r.fulfiller_name as string,
        fulfiller_code: r.fulfiller_code as string,
        carrier_logo: r.carrier_logo as string,
        warehouse: r.warehouse as string,
        supplier_name: (r.supplier_name as string) ?? null,
        delivery_company: (r.delivery_company as string) ?? null,
        date: r.date as string,
        status: r.status as Manifest['status'],
        shipments: Number(r.shipments),
      }));
    },
    async getManifest(id: number) {
      const mr = await row<Row<Record<string, unknown>>>(pool, 'SELECT * FROM manifests WHERE id = ?', [id]);
      if (!mr) return null;
      const manifest: Manifest = {
        id: Number(mr.id),
        gid: mr.gid as string,
        manifest_ref: mr.manifest_ref as string,
        fulfiller_name: mr.fulfiller_name as string,
        fulfiller_code: mr.fulfiller_code as string,
        carrier_logo: mr.carrier_logo as string,
        warehouse: mr.warehouse as string,
        supplier_name: (mr.supplier_name as string) ?? null,
        delivery_company: (mr.delivery_company as string) ?? null,
        date: mr.date as string,
        status: mr.status as Manifest['status'],
        shipments: Number(mr.shipments),
      };
      const items = await all<Row<Record<string, unknown>>>(pool, 'SELECT * FROM manifest_items WHERE manifest_id = ? ORDER BY id', [id]);
      return {
        ...manifest,
        items: items.map((r): ManifestItem => ({
          id: Number(r.id),
          manifest_id: Number(r.manifest_id),
          order_id: Number(r.order_id),
          order_number: r.order_number as string,
          customer_name: (r.customer_name as string) ?? null,
          governorate: (r.governorate as string) ?? null,
          city: (r.city as string) ?? null,
          status: r.status as string,
          product_name: r.product_name as string,
          product_variation: (r.product_variation as string) ?? null,
          quantity: Number(r.quantity),
          unit_price: Number(r.unit_price),
          created_at: (r.created_at as Date).toISOString(),
          delivered_at: r.delivered_at ? (r.delivered_at as Date).toISOString() : null,
        })),
      };
    },
    async searchPackingBins(query: PackingBinsQuery): Promise<PackingBinsResult> {
      const q = (query.q ?? '').trim();
      const where = q ? 'WHERE name LIKE ? OR reference LIKE ? OR type LIKE ?' : '';
      const params = q ? [`%${q}%`, `%${q}%`, `%${q}%`] : [];
      const countRow = await row<Row<Record<string, unknown>>>(pool, `SELECT COUNT(*) AS cnt FROM packing_bins ${where}`, params);
      const total = countRow ? Number(countRow.cnt) : 0;
      const start = (query.page - 1) * query.per_page;
      const rows = await all<Row<Record<string, unknown>>>(
        pool, `SELECT * FROM packing_bins ${where} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, query.per_page, start]
      );
      return {
        total,
        page: query.page,
        per_page: query.per_page,
        rows: rows.map((r): PackingBin => ({
          id: Number(r.id),
          name: r.name as string,
          reference: (r.reference as string) ?? null,
          price: Number(r.price),
          cost: Number(r.cost),
          type: r.type as PackingBinType,
          image: (r.image as string) ?? null,
          active: Boolean(r.active),
          created_at: (r.created_at as Date).toISOString(),
        })),
      };
    },
    async createPackingBin(input: { name: string; reference?: string | null; price?: number; cost?: number; type: PackingBinType; image?: string | null; active?: boolean }): Promise<PackingBin> {
      const [result] = await pool.execute('INSERT INTO packing_bins (name, reference, price, cost, type, image, active) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [input.name, input.reference ?? null, input.price ?? 0, input.cost ?? 0, input.type, input.image ?? null, input.active ?? true]) as any;
      const row2 = await row<Row<Record<string, unknown>>>(pool, 'SELECT * FROM packing_bins WHERE id = ?', [result.insertId]);
      const r = row2!;
      return {
        id: Number(r.id),
        name: r.name as string,
        reference: (r.reference as string) ?? null,
        price: Number(r.price),
        cost: Number(r.cost),
        type: r.type as PackingBinType,
        image: (r.image as string) ?? null,
        active: Boolean(r.active),
        created_at: (r.created_at as Date).toISOString(),
      };
    },
    async getPackingBin(id: number): Promise<PackingBin | null> {
      const r = await row<Row<Record<string, unknown>>>(pool, 'SELECT * FROM packing_bins WHERE id = ?', [id]);
      if (!r) return null;
      return {
        id: Number(r.id),
        name: r.name as string,
        reference: (r.reference as string) ?? null,
        price: Number(r.price),
        cost: Number(r.cost),
        type: r.type as PackingBinType,
        image: (r.image as string) ?? null,
        active: Boolean(r.active),
        created_at: (r.created_at as Date).toISOString(),
      };
    },
    async updatePackingBin(id: number, input: { name?: string; reference?: string | null; price?: number; cost?: number; type?: PackingBinType; image?: string | null; active?: boolean }): Promise<PackingBin | null> {
      const fields: string[] = [];
      const vals: unknown[] = [];
      if (input.name !== undefined) { fields.push('name = ?'); vals.push(input.name); }
      if (input.reference !== undefined) { fields.push('reference = ?'); vals.push(input.reference); }
      if (input.price !== undefined) { fields.push('price = ?'); vals.push(input.price); }
      if (input.cost !== undefined) { fields.push('cost = ?'); vals.push(input.cost); }
      if (input.type !== undefined) { fields.push('type = ?'); vals.push(input.type); }
      if (input.image !== undefined) { fields.push('image = ?'); vals.push(input.image); }
      if (input.active !== undefined) { fields.push('active = ?'); vals.push(input.active); }
      if (fields.length === 0) {
        const r = await row<Row<Record<string, unknown>>>(pool, 'SELECT * FROM packing_bins WHERE id = ?', [id]);
        return r ? { id: Number(r.id), name: r.name as string, reference: (r.reference as string) ?? null, price: Number(r.price), cost: Number(r.cost), type: r.type as PackingBinType, image: (r.image as string) ?? null, active: Boolean(r.active), created_at: (r.created_at as Date).toISOString() } : null;
      }
      vals.push(id);
      await pool.execute(`UPDATE packing_bins SET ${fields.join(', ')} WHERE id = ?`, vals as any);
      const r = await row<Row<Record<string, unknown>>>(pool, 'SELECT * FROM packing_bins WHERE id = ?', [id]);
      return r ? { id: Number(r.id), name: r.name as string, reference: (r.reference as string) ?? null, price: Number(r.price), cost: Number(r.cost), type: r.type as PackingBinType, image: (r.image as string) ?? null, active: Boolean(r.active), created_at: (r.created_at as Date).toISOString() } : null;
    },
    async deletePackingBin(id: number): Promise<boolean> {
      const [result] = await pool.execute('DELETE FROM packing_bins WHERE id = ?', [id]) as any;
      return (result.affectedRows ?? 0) > 0;
    },
    async listTransactions(): Promise<TransactionsResult> {
      const rows = await all<Row<Record<string, unknown>>>(pool, 'SELECT * FROM transactions ORDER BY created_at DESC, id DESC');
      return {
        total: TRANSACTION_TOTAL,
        transactions: rows.map((r): Transaction => ({
          id: Number(r.id),
          gid: r.gid as string,
          summary: r.summary as string,
          shipment_id: (r.shipment_id as string) ?? null,
          shipment_display: (r.shipment_display as string) ?? null,
          created_at: (r.created_at as Date).toISOString(),
          updated_at: (r.updated_at as Date).toISOString(),
          status: r.status as Transaction['status'],
          amount: Number(r.amount),
          payment_method: r.payment_method as string,
          cash_pickup_location: (r.cash_pickup_location as string) ?? null,
          from_type: r.from_type as Transaction['from_type'],
          from_name: r.from_name as string,
          from_code: (r.from_code as string) ?? null,
          to_type: r.to_type as Transaction['to_type'],
          to_name: r.to_name as string,
          to_code: (r.to_code as string) ?? null,
          follow_up: r.follow_up as null,
          bulk: r.bulk as null,
        })),
      };
    },
    async listReconciliationReviews() {
      const rows = await all<Row<Record<string, unknown>>>(pool, 'SELECT * FROM reconciliation_reviews ORDER BY created_at DESC');
      return rows.map((r): ReconciliationReview => ({
        id: Number(r.id),
        created_at: (r.created_at as Date).toISOString(),
        type: r.type as string,
        variance: Number(r.variance),
        current_variance: Number(r.current_variance),
        status: r.status as ReconciliationReview['status'],
        comment: (r.comment as string) ?? null,
        reviewed_by: (r.reviewed_by as string) ?? null,
        cashier_session: r.cashier_session as string,
        location: r.location as string,
      }));
    },
    async listSellerOrganizations(query: SellerOrganizationsQuery): Promise<SellerOrganizationsResult> {
      const conds: string[] = ['u.role = ?'];
      const params: unknown[] = ['customer'];
      if (query.statuses?.length) {
        conds.push(`(${query.statuses.map(() => 'so.onboarding LIKE ?').join(' OR ')})`);
        for (const s of query.statuses) params.push(`%"${s}"%`);
      }
      if (query.sources?.length) {
        conds.push(`so.source IN (${query.sources.map(() => '?').join(',')})`);
        params.push(...query.sources);
      }
      if (query.main_retailer) conds.push('so.is_main_retailer = 1');
      if (query.plus_membership) conds.push('so.plus_membership = 1');
      const q = (query.q ?? '').trim();
      if (q) {
        conds.push('(so.org_name LIKE ? OR u.name LIKE ? OR so.code LIKE ? OR so.phone LIKE ? OR u.email LIKE ?)');
        const like = `%${q}%`;
        params.push(like, like, like, like, like);
      }
      const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
      const sortMap: Record<string, string> = {
        name: 'so.org_name',
        code: 'so.code',
        joined_at: 'so.joined_at',
        last_seen_at: 'so.last_seen_at',
        source: 'so.source',
        follow_up: 'so.follow_up_new',
        documents: 'so.documents',
      };
      const sortCol = sortMap[query.sort ?? ''] ?? 'u.created_at';
      const dir = query.dir === 'asc' ? 'ASC' : 'DESC';
      const countRows = await all<Row<{ n: number }>>(
        pool,
        `SELECT COUNT(*) AS n FROM users u LEFT JOIN seller_organizations so ON so.email = u.email ${where}`,
        params
      );
      const total = Number(countRows[0]?.n ?? 0);
      const offset = (query.page - 1) * query.per_page;
      const data = await all<Row<Record<string, unknown>>>(
        pool,
        `         SELECT u.id AS user_id, u.name AS user_name, u.email AS user_email, u.photo AS user_photo, u.created_at AS user_created_at,
                so.id AS so_id, so.code, so.account_manager, so.business_developer, so.owner_name, so.org_name, so.phone, so.email,
                so.tags, so.joined_at, so.last_seen_at, so.onboarding, so.documents, so.follow_up_new, so.follow_up, so.source,
                so.is_main_retailer, so.plus_membership, so.account_status, so.allow_marketplace, so.dropshipping_eligible
         FROM users u
         LEFT JOIN seller_organizations so ON so.email = u.email
         ${where}
         ORDER BY ${sortCol} ${dir}, u.id DESC LIMIT ? OFFSET ?`,
        [...params, query.per_page, offset]
      );
      const rows = data.map((r) => mapSellerOrgRowFromJoin(r));
      return {
        rows,
        total,
        filters: { statuses: [...SELLER_STATUSES] as string[], sources: [...SELLER_SOURCES] },
        page: query.page,
        per_page: query.per_page,
      };
    },
    async getSellerOrganization(id: number): Promise<SellerOrganization | null> {
      const rows = await all<Row<Record<string, unknown>>>(pool, 'SELECT * FROM seller_organizations WHERE id = ?', [id]);
      return rows[0] ? mapSellerOrgRow(rows[0]) : null;
    },
    async createSellerSignup(input: SellerSignupInput): Promise<SellerOrganization> {
      const code = `SLR-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
      const onboarding = [...SELLER_STATUSES].map((label) => ({ label, ok: false }));
      const now = new Date();
      const [res] = await pool.execute(
        'INSERT INTO seller_organizations (code, account_manager, owner_name, org_name, phone, email, tags, joined_at, last_seen_at, onboarding, documents, follow_up_new, source, is_main_retailer, plus_membership) VALUES (?,NULL,?,?,?,?,?,?,?,?,"none",1,?,0,0)',
        [
          code,
          input.owner_name,
          input.shop_name ?? null,
          input.phone ?? '',
          input.email,
          JSON.stringify(input.tags ?? []),
          toDbTime(now.toISOString()),
          toDbTime(now.toISOString()),
          JSON.stringify(onboarding),
          'Signup',
        ]
      );
      const id = Number((res as { insertId: number }).insertId);
      const created = await this.getSellerOrganization(id);
      if (!created) throw new Error('Failed to create seller signup');
      return created;
    },
    async updateSellerOrganizationTags(id: number, tags: string[]): Promise<SellerOrganization | null> {
      await pool.execute('UPDATE seller_organizations SET tags = ? WHERE id = ?', [JSON.stringify(tags), id]);
      return this.getSellerOrganization(id);
    },
    async updateSellerOrganizationFlags(id: number, patch: { account_status?: string; allow_marketplace?: boolean; dropshipping_eligible?: boolean; doc_files?: Record<string, string>; doc_statuses?: Record<string, string> }): Promise<SellerOrganization | null> {
      const sets: string[] = [];
      const params: (string | number | boolean)[] = [];
      if (patch.account_status !== undefined) { sets.push('account_status = ?'); params.push(patch.account_status); }
      if (patch.allow_marketplace !== undefined) { sets.push('allow_marketplace = ?'); params.push(patch.allow_marketplace ? 1 : 0); }
      if (patch.dropshipping_eligible !== undefined) { sets.push('dropshipping_eligible = ?'); params.push(patch.dropshipping_eligible ? 1 : 0); }
      if (patch.doc_files !== undefined) { sets.push('doc_files = ?'); params.push(JSON.stringify(patch.doc_files)); }
      if (patch.doc_statuses !== undefined) { sets.push('doc_statuses = ?'); params.push(JSON.stringify(patch.doc_statuses)); }
      if (!sets.length) return this.getSellerOrganization(id);
      params.push(id);
      await pool.execute(`UPDATE seller_organizations SET ${sets.join(', ')} WHERE id = ?`, params);
      return this.getSellerOrganization(id);
    },
    async updateSellerOrganizationOnboarding(id: number, status: string): Promise<SellerOrganization | null> {
      const rows = await all<Row<{ onboarding: unknown }>>(pool, 'SELECT onboarding FROM seller_organizations WHERE id = ?', [id]);
      if (!rows[0]) return null;
      const items = parseJsonArray<{ label: string; ok: boolean }>(rows[0].onboarding, []);
      const updated = items.map((item) => ({ ...item, ok: item.label === status }));
      await pool.execute('UPDATE seller_organizations SET onboarding = ? WHERE id = ?', [JSON.stringify(updated), id]);
      return this.getSellerOrganization(id);
    },
    async updateSellerOrganizationManagers(id: number, patch: UpdateSellerOrgManagersInput): Promise<SellerOrganization | null> {
      const sets: string[] = [];
      const params: (string | number | null)[] = [];
      if (patch.account_manager !== undefined) {
        sets.push('account_manager = ?');
        params.push(patch.account_manager);
      }
      if (patch.business_developer !== undefined) {
        sets.push('business_developer = ?');
        params.push(patch.business_developer);
      }
      if (!sets.length) return this.getSellerOrganization(id);
      params.push(id);
      await pool.execute(`UPDATE seller_organizations SET ${sets.join(', ')} WHERE id = ?`, params);
      return this.getSellerOrganization(id);
    },
    async setSellerFollowUp(id: number, followUp: SupplierFollowUp | null): Promise<SellerOrganization | null> {
      await pool.query('UPDATE seller_organizations SET follow_up = ? WHERE id = ?', [followUp ? JSON.stringify(followUp) : null, id]);
      return this.getSellerOrganization(id);
    },
    async updateSellerFollowUp(id: number, patch: SupplierFollowUpPatch, actorName: string): Promise<SellerOrganization | null> {
      const curRows = await all<Row<{ follow_up: unknown }>>(pool, 'SELECT follow_up FROM seller_organizations WHERE id = ?', [id]);
      let cur = parseJsonCol<SupplierFollowUp | null>(curRows[0]?.follow_up, null);
      if (!cur) {
        cur = { person: actorName, label: patch.meeting ?? 'Follow Up', note: null, meeting: patch.meeting ?? 'Follow Up', scheduled_at: new Date().toISOString(), confirmed: false, tags: [] };
      }
      const next: SupplierFollowUp = { ...cur };
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
      await pool.query('UPDATE seller_organizations SET follow_up = ? WHERE id = ?', [JSON.stringify(next), id]);
      return this.getSellerOrganization(id);
    },
    async findSellerOrganizationByEmail(email: string): Promise<SellerOrganization | null> {
      const rows = await all<Row<Record<string, unknown>>>(pool, 'SELECT * FROM seller_organizations WHERE email = ? LIMIT 1', [email]);
      return rows[0] ? mapSellerOrgRow(rows[0]) : null;
    },
    async listStaffUsers() {
      const rows = await all<Row<Record<string, unknown>>>(pool, "SELECT id, name, role FROM users WHERE role = 'admin'");
      return rows.map((r) => ({ id: Number(r.id), name: r.name as string, role: r.role as string }));
    },
    async listSupplierOrganizations(query: SupplierOrganizationsQuery): Promise<SupplierOrganizationsResult> {
      const conds: string[] = [];
      const params: unknown[] = [];
      if (query.sources?.length) {
        conds.push(`source IN (${query.sources.map(() => '?').join(',')})`);
        params.push(...query.sources);
      }
      if (query.main_type) conds.push('main_type_supplier = 1');
      const q = (query.q ?? '').trim();
      if (q) {
        const field = query.search_field || 'any';
        const cols =
          field === 'organization' ? ['org_name', 'code']
          : field === 'phone' ? ['phone', 'phone_full']
          : field === 'user' ? ['owner_name']
          : field === 'email' ? ['email']
          : ['org_name', 'owner_name', 'code', 'phone', 'email'];
        conds.push(`(${cols.map((c) => `${c} LIKE ?`).join(' OR ')})`);
        const like = `%${q}%`;
        params.push(...cols.map(() => like));
      }
      const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
      const rawRows = await all<Row<Record<string, unknown>>>(
        pool,
        `SELECT s.*, u.id AS _uid, u.name AS _uname, u.photo AS _uphoto FROM supplier_organizations s
         LEFT JOIN users u ON u.email = s.email AND u.role = 'seller' ${where}`
      );

      const prodAgg = await all<Row<{ fournisseur_id: number; is_active: unknown; moderation_status: string; n: number }>>(
        pool,
        'SELECT fournisseur_id, is_active, moderation_status, COUNT(*) AS n FROM products GROUP BY fournisseur_id, is_active, moderation_status'
      );
      const addedMap = new Map<number, number>();
      const activeMap = new Map<number, number>();
      for (const p of prodAgg) {
        const fid = Number(p.fournisseur_id);
        addedMap.set(fid, (addedMap.get(fid) ?? 0) + Number(p.n));
        if (b(p.is_active) && p.moderation_status === 'approved') {
          activeMap.set(fid, (activeMap.get(fid) ?? 0) + Number(p.n));
        }
      }
      const whAgg = await all<Row<{ fournisseur_id: number; n: number }>>(
        pool,
        'SELECT fournisseur_id, COUNT(*) AS n FROM supplier_warehouses GROUP BY fournisseur_id'
      );
      const whMap = new Map<number, number>(whAgg.map((w) => [Number(w.fournisseur_id), Number(w.n)]));
      const subAgg = await all<Row<{ supplier_name: string; supplier_code: string; n: number }>>(
        pool,
        'SELECT supplier_name, supplier_code, COUNT(*) AS n FROM product_subscriptions GROUP BY supplier_name, supplier_code'
      );
      const subByName = new Map<string, number>();
      const subByCode = new Map<string, number>();
      for (const s of subAgg) {
        const name = String(s.supplier_name ?? '');
        const code = String(s.supplier_code ?? '');
        if (name) subByName.set(name, (subByName.get(name) ?? 0) + Number(s.n));
        if (code) subByCode.set(code, (subByCode.get(code) ?? 0) + Number(s.n));
      }

      const rows = rawRows.map((r) => {
        const org = rowToSupplierOrg(r);
        const uid = r._uid == null ? null : Number(r._uid);
        if (uid != null) {
          const counts: SupplierLiveCounts = {
            added: addedMap.get(uid) ?? 0,
            activeProducts: activeMap.get(uid) ?? 0,
            warehouses: whMap.get(uid) ?? 0,
            subscriptions: (subByName.get(String(r._uname ?? '')) ?? 0) + (subByCode.get(String(r.code ?? '')) ?? 0),
          };
          org.onboarding = buildLiveSupplierOnboarding(counts);
        }
        return org;
      });

      const statuses = query.statuses ?? [];
      const filtered = statuses.length
        ? rows.filter((r) => statuses.every((s) => supplierOnboardingHas(r.onboarding, s)))
        : rows;

      sortSupplierOrgs(filtered, query.sort ?? 'joined_at', query.dir === 'asc' ? 1 : -1);

      const total = filtered.length;
      const start = (query.page - 1) * query.per_page;
      return {
        rows: filtered.slice(start, start + query.per_page),
        total,
        filters: { statuses: [...SUPPLIER_STATUSES], sources: [...SUPPLIER_SOURCES] },
        page: query.page,
        per_page: query.per_page,
      };
    },
    async createSupplierOrganization(input: CreateSupplierOrganizationInput): Promise<SupplierOrganization> {
      const email = input.email.toLowerCase();
      const dupUser = await row<Row<{ n: number }>>(pool, 'SELECT COUNT(*) AS n FROM users WHERE email = ?', [email]);
      if (Number(dupUser?.[0]?.n)) throw new Error('A user account with this email already exists');
      let code = makeSupplierCode();
      for (let i = 0; i < 8; i++) {
        const dup = await all<Row<{ n: number }>>(pool, 'SELECT COUNT(*) AS n FROM supplier_organizations WHERE code = ?', [code]);
        if (!Number(dup[0]?.n)) break;
        code = makeSupplierCode();
      }
      const now = new Date().toISOString();
      const passwordHash = await bcrypt.hash(input.password, 10);
      const [ins] = await pool.query(
        `INSERT INTO supplier_organizations
          (code, owner_name, org_name, city, email, phone, phone_full, tax_id, rne_code, main_type_supplier, onboarding, source, labels, joined_at, last_seen_at, about, password_hash, business_developer)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          code,
          `${input.first_name} ${input.last_name}`.trim(),
          input.company_name,
          '',
          email,
          '+216 ** *** **',
          input.phone,
          input.tax_id,
          String(Math.floor(100000 + Math.random() * 900000)),
          1,
          JSON.stringify(newSupplierOnboarding()),
          'Not attributed',
          JSON.stringify([]),
          toDbTime(now),
          toDbTime(now),
          input.company_description ?? null,
          passwordHash,
          input.business_developer ?? null,
        ]
      );
      const insertId = Number((ins as { insertId?: number }).insertId ?? 0);
      const created = await row<Row<Record<string, unknown>>>(pool, 'SELECT * FROM supplier_organizations WHERE id = ?', [insertId]);
      if (!created) throw new Error('Supplier organization creation failed');
      await pool.execute('INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)', [
        `${input.first_name} ${input.last_name}`.trim(),
        email,
        passwordHash,
        'seller',
      ]);
      return rowToSupplierOrg(created);
    },
    async setSupplierFollowUp(id: number, followUp: SupplierFollowUp | null): Promise<SupplierOrganization | null> {
      await pool.query('UPDATE supplier_organizations SET follow_up = ? WHERE id = ?', [followUp ? JSON.stringify(followUp) : null, id]);
      const r = await row<Row<Record<string, unknown>>>(pool, 'SELECT * FROM supplier_organizations WHERE id = ?', [id]);
      return r ? rowToSupplierOrg(r) : null;
    },
    async updateSupplierFollowUp(id: number, patch: SupplierFollowUpPatch, actorName: string): Promise<SupplierOrganization | null> {
      const curRows = await all<Row<{ follow_up: unknown }>>(pool, 'SELECT follow_up FROM supplier_organizations WHERE id = ?', [id]);
      const cur = parseJsonCol<SupplierFollowUp | null>(curRows[0]?.follow_up, null);
      if (!cur) return null;
      const next: SupplierFollowUp = { ...cur };
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
      await pool.query('UPDATE supplier_organizations SET follow_up = ? WHERE id = ?', [JSON.stringify(next), id]);
      const r = await row<Row<Record<string, unknown>>>(pool, 'SELECT * FROM supplier_organizations WHERE id = ?', [id]);
      return r ? rowToSupplierOrg(r) : null;
    },
    async getSupplierOrganizationDetail(id: number): Promise<SupplierOrganizationDetail | null> {
      const r = await row<Row<Record<string, unknown>>>(pool, 'SELECT * FROM supplier_organizations WHERE id = ?', [id]);
      return r ? rowToSupplierOrgDetail(r) : null;
    },
    async getStockRefillPickupList(): Promise<StockRefillPickupListResult> {
      const rows = await all<Row<Record<string, unknown>>>(
        pool,
        `SELECT p.fournisseur_id, u.name AS fournisseur_name,
                p.id AS product_id, p.name AS product_name, p.image_url, p.stock AS supplier_stock, p.price AS unit_price,
                COUNT(DISTINCT o.id) AS order_count,
                COALESCE(SUM(CASE WHEN o.status = 'retour' THEN oi.quantity ELSE 0 END), 0) AS returned_qty,
                COALESCE(SUM(CASE WHEN o.status NOT IN ('draft','cancelled') AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN oi.quantity ELSE 0 END), 0) AS period_consumption,
                COALESCE(SUM(CASE WHEN o.status IN ('draft','pending') THEN oi.quantity ELSE 0 END), 0) AS non_confirmed,
                COALESCE(SUM(CASE WHEN o.status IN ('pending','confirmed','shipped') THEN oi.quantity ELSE 0 END), 0) AS required_qty,
                COALESCE((SELECT SUM(ri.qty_to_request) FROM stock_refill_request_items ri
                          JOIN stock_refill_requests rr ON rr.id = ri.request_id
                          WHERE rr.supplier = u.name
                            AND rr.status IN ('Pending','Confirmed','Approved','In preparation','Ready','Shipped')
                            AND LOWER(TRIM(ri.product_name)) = LOWER(TRIM(p.name))), 0) AS incoming_open
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         JOIN products p ON p.id = oi.product_id
         JOIN users u ON u.id = p.fournisseur_id
         WHERE o.status <> 'draft'
         GROUP BY p.fournisseur_id, u.name, p.id, p.name, p.image_url, p.stock, p.price
         ORDER BY p.fournisseur_id, p.id`
      );
      interface Group {
        supplier: string;
        request_count: number;
        total_qty_to_request: number;
        items: StockRefillRequestItem[];
        orderIds: Set<number>;
      }
      const groups = new Map<number, Group>();
      for (const row of rows) {
        const fid = Number(row.fournisseur_id);
        let g = groups.get(fid);
        if (!g) {
          g = { supplier: String(row.fournisseur_name ?? ''), request_count: 0, total_qty_to_request: 0, items: [], orderIds: new Set<number>() };
          groups.set(fid, g);
        }
        const productId = Number(row.product_id);
        const orderCount = Number(row.order_count ?? 0);
        if (!g.orderIds.has(productId)) {
          g.orderIds.add(productId);
          g.request_count += orderCount;
        }
        const ourStock = Number(row.returned_qty ?? 0);
        const required = Number(row.required_qty ?? 0);
        const incomingOpen = Number(row.incoming_open ?? 0);
        const qtyToRequest = Math.max(0, required - ourStock - incomingOpen);
        g.total_qty_to_request += qtyToRequest;
        g.items.push({
          id: productId,
          request_id: productId,
          product_name: String(row.product_name ?? ''),
          color: null,
          image_url: (row.image_url as string) ?? null,
          expected_incoming: 0,
          supplier_stock: Number(row.supplier_stock ?? 0),
          our_stock: ourStock,
          period_consumption: Number(row.period_consumption ?? 0),
          qty_non_confirmed: Number(row.non_confirmed ?? 0),
          qty_required_orders: required,
          qty_to_request: qtyToRequest,
          qty_picked: 0,
          unit_price: round3(Number(row.unit_price ?? 0)),
        });
      }
      return {
        suppliers: [...groups.values()]
          .map((g) => {
            const items = g.items.filter((it) => it.qty_to_request > 0);
            return {
              supplier: g.supplier,
              request_count: g.request_count,
              total_qty_to_request: items.reduce((s, it) => s + it.qty_to_request, 0),
              items,
            };
          })
          .filter((g) => g.items.length > 0),
      };
    },
    async listStockRefillRequests(query: StockRefillRequestsQuery): Promise<StockRefillRequestsResult> {      const where: string[] = [];
      const params: unknown[] = [];
      const q = (query.q ?? '').trim();
      if (q) {
        where.push('(supplier LIKE ? OR storage_request LIKE ? OR reservation LIKE ?)');
        params.push(`%${q}%`, `%${q}%`, `%${q}%`);
      }
      if (query.status) {
        where.push('status = ?');
        params.push(query.status);
      }
      if (query.supplier) {
        where.push('supplier = ?');
        params.push(query.supplier);
      }
      const clause = where.length ? ` WHERE ${where.join(' AND ')}` : '';
      const countRows = await all<Row<{ n: number }>>(pool, `SELECT COUNT(*) AS n FROM stock_refill_requests${clause}`, params);
      const offset = (query.page - 1) * query.per_page;
      const data = await all<Row<Record<string, unknown>>>(
        pool,
        `SELECT * FROM stock_refill_requests${clause} ORDER BY id DESC LIMIT ? OFFSET ?`,
        [...params, query.per_page, offset]
      );
      const rows = data.map((r) => refillRow(r));
      if (rows.length) {
        const ids = rows.map((r) => r.id);
        const placeholders = ids.map(() => '?').join(',');
        const itemRows = await all<Row<Record<string, unknown>>>(
          pool,
          `SELECT * FROM stock_refill_request_items WHERE request_id IN (${placeholders}) ORDER BY id`,
          ids
        );
        const byRequest = new Map<number, StockRefillRequestItem[]>();
        for (const ir of itemRows) {
          const item = refillItemRow(ir);
          const list = byRequest.get(item.request_id) ?? [];
          list.push(item);
          byRequest.set(item.request_id, list);
        }
        for (const r of rows) r.items = byRequest.get(r.id) ?? [];
      }
      return {
        rows,
        total: Number(countRows[0]?.n ?? 0),
        filters: { statuses: ['Pending', 'Approved', 'In preparation', 'Ready', 'Shipped', 'Completed', 'Rejected'] },
        page: query.page,
        per_page: query.per_page,
      };
    },
    async getStockRefillRequest(id: number): Promise<StockRefillRequest | null> {
      const r = await row<Row<Record<string, unknown>>>(pool, 'SELECT * FROM stock_refill_requests WHERE id = ?', [id]);
      if (!r) return null;
      const itemRows = await all<Row<Record<string, unknown>>>(
        pool,
        'SELECT * FROM stock_refill_request_items WHERE request_id = ? ORDER BY id',
        [id]
      );
      return attachBatches(pool, refillRow(r, itemRows.map(refillItemRow)));
    },
    async createStockRefillRequest(input: SaveStockRefillRequestInput): Promise<StockRefillRequest> {
      const [ins] = await pool.execute(
        'INSERT INTO stock_refill_requests (supplier, products, storage_request, reservation, date, status) VALUES (?,?,?,?,?,?)',
        [
          input.supplier,
          input.products,
          input.storage_request ?? null,
          input.reservation ?? null,
          input.date ? input.date.slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' '),
          input.status ?? 'Pending',
        ]
      );
      const insertId = Number((ins as { insertId?: number }).insertId ?? 0);
      if (input.items?.length) {
        for (const it of input.items) {
          await pool.execute(
            `INSERT INTO stock_refill_request_items
              (request_id, product_name, color, image_url, expected_incoming, supplier_stock, our_stock, period_consumption, qty_non_confirmed, qty_required_orders, qty_to_request, qty_picked, unit_price)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              insertId,
              it.product_name,
              it.color ?? null,
              it.image_url ?? null,
              it.expected_incoming ?? 0,
              it.supplier_stock ?? 0,
              it.our_stock ?? 0,
              it.period_consumption ?? 0,
              it.qty_non_confirmed ?? 0,
              it.qty_required_orders ?? 0,
              it.qty_to_request ?? 0,
              it.qty_picked ?? 0,
              it.unit_price ?? 0,
            ]
          );
        }
      }
      const r = await row<Row<Record<string, unknown>>>(pool, 'SELECT * FROM stock_refill_requests WHERE id = ?', [insertId]);
      if (!r) throw new Error('Stock refill request creation failed');
      const itemRows = await all<Row<Record<string, unknown>>>(
        pool,
        'SELECT * FROM stock_refill_request_items WHERE request_id = ? ORDER BY id',
        [insertId]
      );
      return attachBatches(pool, refillRow(r, itemRows.map(refillItemRow)));
    },
    async updateStockRefillRequest(id: number, input: SaveStockRefillRequestInput): Promise<StockRefillRequest | null> {
      const existing = await row<Row<Record<string, unknown>>>(pool, 'SELECT * FROM stock_refill_requests WHERE id = ?', [id]);
      if (!existing) return null;
      const prevStatus = String(existing.status);
      const newStatus: StockRefillStatus = prevStatus === 'Pending' ? 'Confirmed' : ((input.status as StockRefillStatus) ?? (prevStatus as StockRefillStatus));
      await pool.execute(
        'UPDATE stock_refill_requests SET supplier = ?, products = ?, storage_request = ?, reservation = ?, date = ?, status = ? WHERE id = ?',
        [
          input.supplier,
          input.products,
          input.storage_request ?? null,
          input.reservation ?? null,
          input.date ? input.date.slice(0, 19).replace('T', ' ') : new Date().toISOString().slice(0, 19).replace('T', ' '),
          newStatus,
          id,
        ]
      );
      const itemCount = input.items?.length ?? Number(existing.products ?? 0);
      const ownRows = await all<Row<{ id: number }>>(pool, 'SELECT id FROM storage_requests WHERE related_refill_id = ? LIMIT 1', [id]);
      if (ownRows.length) {
        await pool.execute('UPDATE storage_requests SET status = ?, client = ?, products = ? WHERE id = ?', [
          'Confirmed',
          input.supplier,
          itemCount,
          ownRows[0].id,
        ]);
      } else {
        const [insSr] = await pool.execute(
          "INSERT INTO storage_requests (gid, client, related_refill_id, failed_qc, products, discrepancies, status, created_at) VALUES (?,?,?,0,?,NULL,'Confirmed',NOW())",
          [`SRG-TMP-${id}`, input.supplier, id, itemCount]
        );
        const srInsertId = Number((insSr as { insertId?: number }).insertId ?? 0);
        if (srInsertId) {
          await pool.execute('UPDATE storage_requests SET gid = ? WHERE id = ?', [`SRG-${9000 + srInsertId}`, srInsertId]);
        }
      }
      const srMatch = input.storage_request ? String(input.storage_request).match(/(\d+)\s*$/) : null;
      if (srMatch) {
        await pool.execute('UPDATE storage_requests SET status = ? WHERE id = ?', ['Confirmed', Number(srMatch[1])]);
      }
      if (input.items !== undefined) {
        const oldItems = await all<Row<{ product_name: string; qty_picked: number }>>(pool, 'SELECT product_name, qty_picked FROM stock_refill_request_items WHERE request_id = ?', [id]);
        const oldPicked = new Map(oldItems.map((r) => [String(r.product_name).trim().toLowerCase(), Number(r.qty_picked ?? 0)]));
        await pool.execute('DELETE FROM stock_refill_request_items WHERE request_id = ?', [id]);
        for (const it of input.items) {
          await pool.execute(
            `INSERT INTO stock_refill_request_items
              (request_id, product_name, color, image_url, expected_incoming, supplier_stock, our_stock, period_consumption, qty_non_confirmed, qty_required_orders, qty_to_request, qty_picked, unit_price)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              id,
              it.product_name,
              it.color ?? null,
              it.image_url ?? null,
              it.expected_incoming ?? 0,
              it.supplier_stock ?? 0,
              it.our_stock ?? 0,
              it.period_consumption ?? 0,
              it.qty_non_confirmed ?? 0,
              it.qty_required_orders ?? 0,
              it.qty_to_request ?? 0,
              it.qty_picked ?? 0,
              it.unit_price ?? 0,
            ]
          );
        }

        // Stock picked units into free inventory space with batch codes
        const capRows = await all<Row<{ id: number; name: string; capacity: number; used: number }>>(pool, `
          SELECT i.id, i.name, i.capacity,
            COALESCE((SELECT SUM(ii.quantity) FROM inventory_items ii WHERE ii.inventory_id = i.id), 0)
            + COALESCE((SELECT SUM(sb.quantity) FROM stock_batches sb WHERE sb.inventory_id = i.id AND sb.request_id <> ?), 0) AS used
          FROM inventories i ORDER BY i.id
        `, [id]);
        const totalNeeded = input.items.reduce((s, it) => s + Math.max(0, Math.floor(it.qty_picked ?? 0)), 0);
        const totalFree = capRows.reduce((s, c) => s + Math.max(0, Number(c.capacity) - Number(c.used ?? 0)), 0);
        if (totalNeeded > totalFree) {
          throw new Error(`Not enough free inventory space: ${totalNeeded} picked unit(s) but only ${totalFree} free across all locations.`);
        }
        await pool.execute('DELETE FROM stock_batches WHERE request_id = ?', [id]);
        const prodIdRows = await all<Row<{ id: number; name: string }>>(pool, 'SELECT id, name FROM products');
        const prodIdByName = new Map(prodIdRows.map((p) => [String(p.name).trim().toLowerCase(), Number(p.id)]));
        let pos = 0;
        for (const it of input.items) {
          const qty = Math.max(0, Math.floor(it.qty_picked ?? 0));
          if (qty > 0) {
            const code = `BTH-${String(id).padStart(4, '0')}-${String(pos + 1).padStart(2, '0')}`;
            let remaining = qty;
            for (const c of capRows) {
              if (remaining <= 0) break;
              const free = Number(c.capacity) - Number(c.used ?? 0);
              if (free <= 0) continue;
              const take = Math.min(free, remaining);
              await pool.execute(
                'INSERT INTO stock_batches (batch_code, request_id, position, inventory_id, product_id, product_name, color, supplier, quantity, created_at) VALUES (?,?,?,?,?,?,?,?,?,NOW())',
                [code, id, pos, c.id, prodIdByName.get(String(it.product_name).trim().toLowerCase()) ?? null, it.product_name, it.color ?? null, input.supplier, take]
              );
              c.used = Number(c.used ?? 0) + take;
              remaining -= take;
            }
          }
          pos++;
        }
        // Decrease supplier's product stock by qty_picked
        for (const it of input.items) {
          const newPicked = Math.max(0, Math.floor(it.qty_picked ?? 0));
          const oldP = oldPicked.get(it.product_name.trim().toLowerCase()) ?? 0;
          const diff = newPicked - oldP;
          if (diff > 0) {
            await pool.execute(
              "UPDATE products SET stock = GREATEST(0, stock - ?) WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) AND fournisseur_id IN (SELECT id FROM users WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)))",
              [diff, it.product_name, input.supplier]
            );
          }
        }
      }
      const r = await row<Row<Record<string, unknown>>>(pool, 'SELECT * FROM stock_refill_requests WHERE id = ?', [id]);
      if (!r) return null;
      const itemRows = await all<Row<Record<string, unknown>>>(
        pool,
        'SELECT * FROM stock_refill_request_items WHERE request_id = ? ORDER BY id',
        [id]
      );
      return attachBatches(pool, refillRow(r, itemRows.map(refillItemRow)));
    },
    async deleteStockRefillRequest(id: number): Promise<boolean> {
      const [res] = await pool.execute('DELETE FROM stock_refill_requests WHERE id = ?', [id]);
      return Number((res as { affectedRows?: number }).affectedRows ?? 0) > 0;
    },
    async listStorageRequests(query: StorageRequestsQuery): Promise<StorageRequestsResult> {
      const conds: string[] = [];
      const params: unknown[] = [];
      const q = (query.q ?? '').trim();
      if (q) {
        conds.push('(gid LIKE ? OR client LIKE ? OR CAST(id AS CHAR) LIKE ?)');
        params.push(`%${q}%`, `%${q}%`, `%${q}%`);
      }
      const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
      const cntRows = await all<Row<{ n: number }>>(pool, `SELECT COUNT(*) AS n FROM storage_requests ${where}`, params);
      const total = Number(cntRows[0]?.n ?? 0);
      const offset = (query.page - 1) * query.per_page;
      const rows = await all<Row<Record<string, unknown>>>(
        pool,
        `SELECT * FROM storage_requests ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
        [...params, query.per_page, offset]
      );
      return { rows: rows.map(storageRequestRow), total, page: query.page, per_page: query.per_page };
    },
    async getStorageRequest(id: number): Promise<StorageRequest | null> {
      const rows = await all<Row<Record<string, unknown>>>(pool, 'SELECT * FROM storage_requests WHERE id = ? LIMIT 1', [id]);
      return rows.length ? storageRequestRow(rows[0]) : null;
    },
    async getBatchesByCode(code: string): Promise<StockBatchLookupRow[]> {
      const rows = await all<Row<Record<string, unknown>>>(pool, `
        SELECT sb.batch_code, sb.product_name, sb.color, sb.supplier, sb.request_id, sb.quantity, i.name AS inventory_name
        FROM stock_batches sb LEFT JOIN inventories i ON i.id = sb.inventory_id
        WHERE sb.batch_code = ? ORDER BY sb.id
      `, [code]);
      return rows.map((r) => ({
        batch_code: r.batch_code as string,
        product_name: r.product_name as string,
        color: (r.color as string) ?? null,
        supplier: r.supplier as string,
        request_id: Number(r.request_id),
        quantity: Number(r.quantity ?? 0),
        inventory_name: (r.inventory_name as string) ?? null,
      }));
    },
    async getOrderPickPlan(orderId: number): Promise<PickPlan | null> {
      return buildPickPlan(pool, orderId);
    },
    async scanOrderPick(orderId: number, productId: number, inventoryId: number, batchCode: string | null): Promise<PickPlan | null> {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const o = await row<Row<Record<string, unknown>>>(conn, 'SELECT status FROM orders WHERE id = ?', [orderId]);
        if (!o) throw new Error('Order not found');
        if (['cancelled', 'retour', 'delivered'].includes(String(o.status))) {
          throw new Error(`This commande is ${String(o.status)} and can no longer be picked`);
        }
        const item = await row<Row<{ quantity: number }>>(
          conn,
          'SELECT quantity FROM order_items WHERE order_id = ? AND product_id = ?',
          [orderId, productId]
        );
        if (!item) throw new Error('This product is not part of the commande');
        const pickedRows = await all<Row<{ picked: number }>>(
          conn,
          'SELECT COALESCE(SUM(quantity),0) AS picked FROM order_picks WHERE order_id = ? AND product_id = ?',
          [orderId, productId]
        );
        const remaining = Number(item.quantity) - Number(pickedRows[0]?.picked ?? 0);
        if (remaining <= 0) throw new Error('This product is already fully picked');

        const invItem = await row<Row<{ quantity: number }>>(
          conn,
          'SELECT quantity FROM inventory_items WHERE inventory_id = ? AND product_id = ?',
          [inventoryId, productId]
        );
        const invQty = invItem ? Number(invItem.quantity) : 0;
        const prodRow = await row<Row<Record<string, unknown>>>(
          conn,
          'SELECT p.name AS product_name, u.name AS supplier FROM products p JOIN users u ON u.id = p.fournisseur_id WHERE p.id = ?',
          [productId]
        );
        const productName = String(prodRow?.product_name ?? '');

        let code = batchCode?.trim() ?? '';
        let batch: Row<{ id: number; quantity: number }> | null = null;
        if (code) {
          batch = (await row<Row<{ id: number; quantity: number }>>(
            conn,
            'SELECT id, quantity FROM stock_batches WHERE batch_code = ? AND inventory_id = ? AND quantity > 0 ORDER BY id LIMIT 1',
            [code, inventoryId]
          )) ?? null;
          if (!batch && invQty > 0) {
            const stale = await row<Row<{ id: number }>>(
              conn,
              'SELECT id FROM stock_batches WHERE batch_code = ? AND inventory_id = ? ORDER BY id LIMIT 1',
              [code, inventoryId]
            );
            if (stale) {
              await conn.execute('UPDATE stock_batches SET quantity = ? WHERE id = ?', [invQty, stale.id]);
              batch = { id: stale.id, quantity: invQty } as unknown as Row<{ id: number; quantity: number }>;
            }
          }
          if (!batch && code === implicitBatchCode(inventoryId, productId)) {
            if (invQty <= 0) throw new Error('This inventory has no un-batched stock of this product left');
            await conn.execute(
              'INSERT INTO stock_batches (batch_code, request_id, position, inventory_id, product_id, product_name, color, supplier, quantity, created_at) VALUES (?, ?, 0, ?, ?, ?, NULL, ?, ?, NOW())',
              [code, -orderId, inventoryId, productId, productName, (prodRow?.supplier as string) ?? '', invQty]
            );
            batch = { id: 0, quantity: invQty } as unknown as Row<{ id: number; quantity: number }>;
          }
          if (!batch && invQty > 0) {
            code = implicitBatchCode(inventoryId, productId);
            await conn.execute(
              'INSERT INTO stock_batches (batch_code, request_id, position, inventory_id, product_id, product_name, color, supplier, quantity, created_at) VALUES (?, ?, 0, ?, ?, ?, NULL, ?, ?, NOW())',
              [code, -orderId, inventoryId, productId, productName, (prodRow?.supplier as string) ?? '', invQty]
            );
            batch = { id: 0, quantity: invQty } as unknown as Row<{ id: number; quantity: number }>;
          }
          if (!batch) throw new Error('Unknown or empty batch code for this inventory');
        } else {
          batch = (await row<Row<{ id: number; batch_code: string; quantity: number }>>(
            conn,
            'SELECT id, batch_code, quantity FROM stock_batches WHERE inventory_id = ? AND quantity > 0 AND request_id >= 0 AND LOWER(TRIM(product_name)) = LOWER(TRIM(?)) ORDER BY id LIMIT 1',
            [inventoryId, productName]
          )) ?? null;
          if (batch) {
            code = String(batch.batch_code);
          }
        }
        if (!batch && invQty > 0) {
          code = implicitBatchCode(inventoryId, productId);
          await conn.execute(
            'INSERT INTO stock_batches (batch_code, request_id, position, inventory_id, product_id, product_name, color, supplier, quantity, created_at) VALUES (?, ?, 0, ?, ?, ?, NULL, ?, ?, NOW())',
            [code, -orderId, inventoryId, productId, productName, (prodRow?.supplier as string) ?? '', invQty]
          );
          batch = { id: 0, quantity: invQty } as unknown as Row<{ id: number; quantity: number }>;
        }
        if (!batch && invQty <= 0) {
          throw new Error('This inventory no longer holds stock of this product');
        }
        if (batch && batch.id) {
          await conn.execute('UPDATE stock_batches SET quantity = GREATEST(0, quantity - 1) WHERE id = ?', [batch.id]);
        }
        await conn.execute('UPDATE inventory_items SET quantity = GREATEST(0, quantity - 1) WHERE inventory_id = ? AND product_id = ?', [inventoryId, productId]);
        await conn.execute(
          'INSERT INTO order_picks (order_id, product_id, inventory_id, batch_code, quantity) VALUES (?,?,?,?,1)',
          [orderId, productId, inventoryId, code || null]
        );

        const plan = await buildPickPlan(conn, orderId);
        if (plan?.complete && !['shipped', 'delivered', 'cancelled', 'retour'].includes(plan.status)) {
          await conn.execute("UPDATE orders SET status = 'ready' WHERE id = ?", [orderId]);
          await conn.commit();
          dispatchToDeliveryCompany(pool, orderId).catch((err) => console.error(`[first-delivery] auto-dispatch failed for order ${orderId}:`, err?.message ?? err));
          return buildPickPlan(pool, orderId);
        }
        await conn.commit();
        return plan;
      } catch (e) {
        try {
          await conn.rollback();
        } catch {
        }
        throw e;
      } finally {
        conn.release();
      }
    },
    async listOrdersPickability(): Promise<OrderPickabilityRow[]> {
      const orderRows = await all<Row<Record<string, unknown>>>(
        pool,
        `SELECT o.id, o.status, oi.product_id, oi.quantity, p.name AS product_name
         FROM orders o JOIN order_items oi ON oi.order_id = o.id JOIN products p ON p.id = oi.product_id
         WHERE o.status IN ('draft','ready','pending','confirmed') AND o.order_type = 'dropshipping'`
      );
      if (orderRows.length === 0) return [];
      const pickRows = await all<Row<{ order_id: number; product_id: number; picked: number }>>(
        pool,
        'SELECT order_id, product_id, SUM(quantity) AS picked FROM order_picks GROUP BY order_id, product_id'
      );
      const invRows = await all<Row<{ product_id: number; available: number }>>(
        pool,
        'SELECT product_id, SUM(quantity) AS available FROM inventory_items WHERE quantity > 0 GROUP BY product_id'
      );
      const batchRows = await all<Row<{ nk: string; q: number }>>(
        pool,
        'SELECT LOWER(TRIM(product_name)) AS nk, SUM(quantity) AS q FROM stock_batches WHERE quantity > 0 AND request_id >= 0 GROUP BY LOWER(TRIM(product_name))'
      );
      const pickMap = new Map(pickRows.map((r) => [`${r.order_id}:${r.product_id}`, Number(r.picked ?? 0)]));
      const invMap = new Map(invRows.map((r) => [Number(r.product_id), Number(r.available ?? 0)]));
      const batchMap = new Map(batchRows.map((r) => [String(r.nk), Number(r.q ?? 0)]));
      const byOrder = new Map<number, { status: OrderStatus; coverable: boolean; picked: number; needed: number }>();
      for (const r of orderRows) {
        const oid = Number(r.id);
        const pid = Number(r.product_id);
        const qty = Number(r.quantity);
        const picked = Math.min(qty, pickMap.get(`${oid}:${pid}`) ?? 0);
        const remaining = Math.max(0, qty - picked);
        const entry = byOrder.get(oid) ?? { status: String(r.status) as OrderStatus, coverable: true, picked: 0, needed: 0 };
        entry.picked += picked;
        entry.needed += qty;
        if (remaining > 0) {
          const avail = (invMap.get(pid) ?? 0) + (batchMap.get(String(r.product_name).trim().toLowerCase()) ?? 0);
          if (avail < remaining) entry.coverable = false;
        }
        byOrder.set(oid, entry);
      }
      return [...byOrder.entries()].map(([order_id, v]) => ({ order_id, status: v.status, coverable: v.coverable, picked: v.picked, needed: v.needed }));
    },
    async listWholesaleOrders(): Promise<OrderFull[]> {
      const rows = await all<Row<{ id: number }>>(
        pool,
        `SELECT o.id FROM orders o WHERE o.order_type = 'wholesale' ORDER BY o.id DESC`
      );
      const out: OrderFull[] = [];
      for (const r of rows) {
        const o = await loadOrder(Number(r.id));
        if (o) out.push(o);
      }
      return out;
    },
    async listCancelledOrders(): Promise<OrderFull[]> {
      const rows = await all<Row<{ id: number }>>(
        pool,
        `SELECT o.id FROM orders o WHERE o.status = 'cancelled' ORDER BY o.created_at DESC, o.id DESC`
      );
      const out: OrderFull[] = [];
      for (const r of rows) {
        const o = await loadOrder(Number(r.id));
        if (o) out.push(o);
      }
      return out;
    },
    async listStockReturns(): Promise<StockReturnItem[]> {
      const rows = await all<Row<Record<string, unknown>>>(
        pool,
        `SELECT o.id AS order_id, o.order_number, o.customer_name, o.created_at,
                oi.product_id, oi.quantity, p.name AS product_name, p.image_url,
                u.id AS supplier_id, u.name AS supplier_name,
                COALESCE(rs.stored_qty, 0) AS stored_qty
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         JOIN products p ON p.id = oi.product_id
         JOIN users u ON u.id = p.fournisseur_id
         LEFT JOIN (
           SELECT order_id, product_id, SUM(quantity) AS stored_qty
           FROM return_stored_items GROUP BY order_id, product_id
         ) rs ON rs.order_id = o.id AND rs.product_id = oi.product_id
         WHERE o.status = 'retour'
         ORDER BY u.name, p.name, o.created_at DESC`
      );
      return rows.map((r) => {
        const d = new Date(r.created_at as string);
        const quantity = Number(r.quantity ?? 0);
        const storedQty = Number(r.stored_qty ?? 0);
        return {
          order_id: Number(r.order_id),
          order_number: String(r.order_number ?? ''),
          customer_name: (r.customer_name as string) ?? null,
          product_id: Number(r.product_id),
          product_name: String(r.product_name ?? ''),
          image_url: (r.image_url as string) ?? null,
          supplier_id: Number(r.supplier_id),
          supplier_name: String(r.supplier_name ?? 'Unknown supplier'),
          quantity,
          stored_qty: storedQty,
          pending: Math.max(0, quantity - storedQty),
          created_at: Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString(),
        };
      });
    },
    async storeStockReturns(input: StoreStockReturnsInput): Promise<StockReturnsStoreResult> {
      const inv = await row<Row<{ name: string; capacity: number }>>(pool, 'SELECT name, capacity FROM inventories WHERE id = ?', [input.inventory_id]);
      if (!inv) throw new Error('Inventory location not found');
      const itemRows = await all<Row<{ order_id: number; product_id: number; pending: number }>>(
        pool,
        `SELECT o.id AS order_id, oi.product_id, oi.quantity - COALESCE(rs.stored_qty, 0) AS pending
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         JOIN products p ON p.id = oi.product_id
         LEFT JOIN (
           SELECT order_id, product_id, SUM(quantity) AS stored_qty
           FROM return_stored_items GROUP BY order_id, product_id
         ) rs ON rs.order_id = o.id AND rs.product_id = oi.product_id
         WHERE o.status = 'retour' AND p.fournisseur_id = ?
           AND oi.quantity - COALESCE(rs.stored_qty, 0) > 0
         ORDER BY o.id`,
        [input.supplier_id]
      );
      if (itemRows.length === 0) throw new Error('No pending returned products for this supplier');
      const totalUnits = itemRows.reduce((s, r) => s + Number(r.pending), 0);
      const usedRow = await row<Row<{ used: number }>>(pool, 'SELECT COALESCE(SUM(quantity),0) AS used FROM inventory_items WHERE inventory_id = ?', [input.inventory_id]);
      const free = Number(inv.capacity) - Number(usedRow?.used ?? 0);
      if (totalUnits > free) {
        throw new Error(`Not enough space in ${inv.name}: ${totalUnits} units to store but only ${free} free`);
      }
      for (const r of itemRows) {
        const qty = Number(r.pending);
        await pool.execute(
          'INSERT INTO return_stored_items (order_id, product_id, inventory_id, quantity) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)',
          [Number(r.order_id), Number(r.product_id), input.inventory_id, qty]
        );
        await pool.execute(
          'INSERT INTO inventory_items (inventory_id, product_id, quantity) VALUES (?,?,?) ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)',
          [input.inventory_id, Number(r.product_id), qty]
        );
      }
      return { stored_units: totalUnits, products: itemRows.length, inventory_name: String(inv.name) };
    },
    async scanStockReturn(input: StockReturnScanInput): Promise<StockReturnScanResult> {
      const code = input.code.trim();
      if (!code) throw new Error('Empty scan');
      const inv = await row<Row<{ name: string; capacity: number }>>(pool, 'SELECT name, capacity FROM inventories WHERE id = ?', [input.inventory_id]);
      if (!inv) throw new Error('Inventory location not found');

      let prod: Row<Record<string, unknown>> | null = null;

      // 0) Try matching as batch code (BTH-xxxx-xx) from stock_batches
      const cleanCode = code.replace(/^https?:\/\/[^/]+\/scan\/batch\//i, '');
      const batchRow = await row<Row<{ product_id: number }>>(
        pool,
        'SELECT product_id FROM stock_batches WHERE batch_code = ? LIMIT 1',
        [cleanCode]
      );
      if (batchRow) {
        prod = (await row<Row<Record<string, unknown>>>(
          pool,
          'SELECT p.id, p.name, u.id AS supplier_id, u.name AS supplier_name FROM products p JOIN users u ON u.id = p.fournisseur_id WHERE p.id = ? LIMIT 1',
          [Number(batchRow.product_id)]
        )) ?? null;
      }

      // 1) Try matching as product barcode
      if (!prod) {
        prod = (await row<Row<Record<string, unknown>>>(
          pool,
          'SELECT p.id, p.name, u.id AS supplier_id, u.name AS supplier_name FROM products p JOIN users u ON u.id = p.fournisseur_id WHERE p.barcode = ? LIMIT 1',
          [code]
        )) ?? null;
      }
      // 2) Try matching as product SKU
      if (!prod) {
        prod = (await row<Row<Record<string, unknown>>>(
          pool,
          'SELECT p.id, p.name, u.id AS supplier_id, u.name AS supplier_name FROM products p JOIN users u ON u.id = p.fournisseur_id WHERE p.sku = ? LIMIT 1',
          [code]
        )) ?? null;
      }
      // 3) Try extracting trailing digits and matching product ID
      if (!prod) {
        const digits = code.match(/(\d+)\s*$/)?.[1];
        if (digits) {
          prod = (await row<Row<Record<string, unknown>>>(
            pool,
            'SELECT p.id, p.name, u.id AS supplier_id, u.name AS supplier_name FROM products p JOIN users u ON u.id = p.fournisseur_id WHERE p.id = ? LIMIT 1',
            [Number(digits)]
          )) ?? null;
        }
      }
      if (!prod) throw new Error('Unknown product — this QR/barcode does not match any product');

      const line = await row<Row<{ order_id: number; pending: number }>>(
        pool,
        `SELECT o.id AS order_id, oi.quantity - COALESCE(rs.stored_qty, 0) AS pending
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         LEFT JOIN (
           SELECT order_id, product_id, SUM(quantity) AS stored_qty
           FROM return_stored_items GROUP BY order_id, product_id
         ) rs ON rs.order_id = o.id AND rs.product_id = oi.product_id
         WHERE o.status = 'retour' AND oi.product_id = ?
           AND oi.quantity - COALESCE(rs.stored_qty, 0) > 0
         ORDER BY o.created_at DESC LIMIT 1`,
        [Number(prod.id)]
      );
      if (!line) throw new Error(`No pending returned units of "${String(prod.name)}"`);

      const usedRow = await row<Row<{ used: number }>>(pool, 'SELECT COALESCE(SUM(quantity),0) AS used FROM inventory_items WHERE inventory_id = ?', [input.inventory_id]);
      if (Number(inv.capacity) - Number(usedRow?.used ?? 0) < 1) {
        throw new Error(`Not enough space in ${String(inv.name)} — location is full`);
      }

      await pool.execute(
        'INSERT INTO return_stored_items (order_id, product_id, inventory_id, quantity) VALUES (?,?,?,1) ON DUPLICATE KEY UPDATE quantity = quantity + 1',
        [Number(line.order_id), Number(prod.id), input.inventory_id]
      );
      await pool.execute(
        'INSERT INTO inventory_items (inventory_id, product_id, quantity) VALUES (?,?,1) ON DUPLICATE KEY UPDATE quantity = quantity + 1',
        [input.inventory_id, Number(prod.id)]
      );

      const remainingRow = await all<Row<{ pending: number }>>(
        pool,
        `SELECT SUM(oi.quantity - COALESCE(rs.stored_qty, 0)) AS pending
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         LEFT JOIN (
           SELECT order_id, product_id, SUM(quantity) AS stored_qty
           FROM return_stored_items GROUP BY order_id, product_id
         ) rs ON rs.order_id = o.id AND rs.product_id = oi.product_id
         WHERE o.status = 'retour' AND oi.product_id = ?`,
        [Number(prod.id)]
      );
      return {
        product_name: String(prod.name),
        supplier_name: String(prod.supplier_name ?? 'Unknown supplier'),
        stored_units: 1,
        remaining_pending: Math.max(0, Number(remainingRow[0]?.pending ?? 0)),
        inventory_name: String(inv.name),
      };
    },
    async listStockShipments(): Promise<StockShipmentOrder[]> {
      const orderRows = await all<Row<Record<string, unknown>>>(
        pool,
        `SELECT o.id, o.order_number, o.barcode, o.customer_name, o.customer_phone,
                o.governorate, o.city, o.status, o.shipment_zone,
                ds.name AS dropshipper_name, o.fournisseur_id,
                fn.name AS fournisseur_name
         FROM orders o
         LEFT JOIN users ds ON ds.id = o.dropshipper_id
         LEFT JOIN users fn ON fn.id = o.fournisseur_id
         WHERE o.status IN ('ready','confirmed','retour')
         ORDER BY FIELD(o.status,'ready','confirmed','retour'), o.id DESC`
      );
      if (orderRows.length === 0) return [];
      const ids = orderRows.map((r) => Number(r.id));
      const placeholders = ids.map(() => '?').join(',');
      const itemRows = await all<Row<Record<string, unknown>>>(
        pool,
        `SELECT oi.order_id, oi.product_id, oi.quantity, p.name AS product_name, p.image_url
         FROM order_items oi JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id IN (${placeholders}) ORDER BY oi.id`,
        ids
      );
      const itemsByOrder = new Map<number, StockShipmentItem[]>();
      for (const r of itemRows) {
        const oid = Number(r.order_id);
        const list = itemsByOrder.get(oid) ?? [];
        list.push({
          product_id: Number(r.product_id),
          product_name: String(r.product_name ?? ''),
          image_url: (r.image_url as string) ?? null,
          quantity: Number(r.quantity ?? 0),
        });
        itemsByOrder.set(oid, list);
      }
      return orderRows.map((r) => {
        const autoZone = inferShipmentZone(r.governorate as string | null, r.city as string | null);
        const overrideRaw = r.shipment_zone as string | null;
        const override = isShipmentZone(overrideRaw) ? overrideRaw : null;
        const items = itemsByOrder.get(Number(r.id)) ?? [];
        return {
          id: Number(r.id),
          order_number: String(r.order_number ?? ''),
          barcode: (r.barcode as string) ?? null,
          customer_name: (r.customer_name as string) ?? null,
          customer_phone: (r.customer_phone as string) ?? null,
          governorate: (r.governorate as string) ?? null,
          city: (r.city as string) ?? null,
          status: String(r.status) as OrderStatus,
          zone: override ?? autoZone,
          auto_zone: autoZone,
          zone_override: override !== null,
          items,
          total_units: items.reduce((s, it) => s + it.quantity, 0),
          dropshipper_name: (r.dropshipper_name as string) ?? null,
          fournisseur_name: (r.fournisseur_name as string) ?? null,
        };
      });
    },
    async setStockShipmentZone(orderId: number, zone: ShipmentZone | null): Promise<void> {
      await pool.query('UPDATE orders SET shipment_zone = ? WHERE id = ?', [zone, orderId]);
    },
    async listChefShipments(): Promise<ShipmentRow[]> {
      const orderRows = await all<Row<Record<string, unknown>>>(
        pool,
        `SELECT o.id, o.order_number, o.order_type, o.customer_name, o.customer_phone,
                o.governorate, o.city, o.status, o.total, o.total_cost,
                o.created_at, o.shipped_at, o.delivered_at, o.returned_at,
                ds.name AS dropshipper_name,
                fn.name AS fournisseur_name
         FROM orders o
         LEFT JOIN users ds ON ds.id = o.dropshipper_id
         LEFT JOIN users fn ON fn.id = o.fournisseur_id
         WHERE o.status IN ('shipped','delivered','retour')
         ORDER BY o.id DESC`
      );
      if (orderRows.length === 0) return [];
      const ids = orderRows.map((r) => Number(r.id));
      const placeholders = ids.map(() => '?').join(',');
      const itemRows = await all<Row<Record<string, unknown>>>(
        pool,
        `SELECT oi.order_id, oi.quantity, p.name AS product_name, p.image_url
         FROM order_items oi JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id IN (${placeholders}) ORDER BY oi.id LIMIT 1`,
        ids
      );
      const firstItem = new Map<number, { product_name: string; image_url: string | null; quantity: number }>();
      for (const r of itemRows) {
        const oid = Number(r.order_id);
        if (!firstItem.has(oid)) {
          firstItem.set(oid, { product_name: String(r.product_name ?? ''), image_url: (r.image_url as string) ?? null, quantity: Number(r.quantity ?? 0) });
        }
      }
      const trackingRows = await all<Row<Record<string, unknown>>>(
        pool,
        `SELECT order_id, carrier, tracking_number FROM tracks WHERE order_id IN (${placeholders})`,
        ids
      );
      const trackingByOrder = new Map<number, { carrier: string | null; tracking_number: string | null }[]>();
      for (const r of trackingRows) {
        const oid = Number(r.order_id);
        const list = trackingByOrder.get(oid) ?? [];
        list.push({ carrier: (r.carrier as string) ?? null, tracking_number: (r.tracking_number as string) ?? null });
        trackingByOrder.set(oid, list);
      }
      return orderRows.map((r) => {
        const oid = Number(r.id);
        const it = firstItem.get(oid);
        return {
          id: oid,
          order_number: String(r.order_number ?? ''),
          order_type: String(r.order_type ?? 'dropshipping'),
          dropshipper_name: (r.dropshipper_name as string) ?? null,
          dropshipper_phone: null,
          fournisseur_name: (r.fournisseur_name as string) ?? null,
          fulfiller: null as string | null,
          warehouse: null as string | null,
          created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at ?? ''),
          shipped_at: r.shipped_at ? (r.shipped_at instanceof Date ? r.shipped_at.toISOString() : String(r.shipped_at)) : null,
          delivered_at: r.delivered_at ? (r.delivered_at instanceof Date ? r.delivered_at.toISOString() : String(r.delivered_at)) : null,
          returned_at: r.returned_at ? (r.returned_at instanceof Date ? r.returned_at.toISOString() : String(r.returned_at)) : null,
          status: String(r.status ?? ''),
          customer_name: (r.customer_name as string) ?? null,
          customer_phone: (r.customer_phone as string) ?? null,
          governorate: (r.governorate as string) ?? null,
          city: (r.city as string) ?? null,
          product_name: it?.product_name ?? '',
          product_variation: null as string | null,
          quantity: it?.quantity ?? 0,
          image_url: it?.image_url ?? null,
          total: Number(r.total ?? 0),
          total_cost: Number(r.total_cost ?? 0),
          tracking: trackingByOrder.get(oid) ?? [],
        };
      });
    },
    async getChefShipment(id: number): Promise<ShipmentRow | null> {
      const o = await row<Row<Record<string, unknown>>>(
        pool,
        `SELECT o.id, o.order_number, o.order_type, o.customer_name, o.customer_phone,
                o.governorate, o.city, o.status, o.total, o.total_cost,
                o.created_at, o.shipped_at, o.delivered_at, o.returned_at,
                ds.name AS dropshipper_name,
                fn.name AS fournisseur_name
         FROM orders o
         LEFT JOIN users ds ON ds.id = o.dropshipper_id
         LEFT JOIN users fn ON fn.id = o.fournisseur_id
         WHERE o.id = ?`,
        [id]
      );
      if (!o) return null;
      const itemRows = await all<Row<Record<string, unknown>>>(
        pool,
        `SELECT oi.quantity, p.name AS product_name, p.image_url
         FROM order_items oi JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = ? ORDER BY oi.id`,
        [id]
      );
      const trackingRows = await all<Row<Record<string, unknown>>>(
        pool,
        `SELECT carrier, tracking_number FROM tracks WHERE order_id = ?`,
        [id]
      );
      const it = itemRows[0];
      return {
        id: Number(o.id),
        order_number: String(o.order_number ?? ''),
        order_type: String(o.order_type ?? 'dropshipping'),
        dropshipper_name: (o.dropshipper_name as string) ?? null,
        dropshipper_phone: null,
        fournisseur_name: (o.fournisseur_name as string) ?? null,
        fulfiller: null as string | null,
        warehouse: null as string | null,
        created_at: o.created_at instanceof Date ? o.created_at.toISOString() : String(o.created_at ?? ''),
        shipped_at: o.shipped_at ? (o.shipped_at instanceof Date ? o.shipped_at.toISOString() : String(o.shipped_at)) : null,
        delivered_at: o.delivered_at ? (o.delivered_at instanceof Date ? o.delivered_at.toISOString() : String(o.delivered_at)) : null,
        returned_at: o.returned_at ? (o.returned_at instanceof Date ? o.returned_at.toISOString() : String(o.returned_at)) : null,
        status: String(o.status ?? ''),
        customer_name: (o.customer_name as string) ?? null,
        customer_phone: (o.customer_phone as string) ?? null,
        governorate: (o.governorate as string) ?? null,
        city: (o.city as string) ?? null,
        product_name: it ? String(it.product_name ?? '') : '',
        product_variation: null as string | null,
        quantity: it ? Number(it.quantity ?? 0) : 0,
        image_url: it ? ((it.image_url as string) ?? null) : null,
        total: Number(o.total ?? 0),
        total_cost: Number(o.total_cost ?? 0),
        tracking: trackingRows.map((t) => ({ carrier: (t.carrier as string) ?? null, tracking_number: (t.tracking_number as string) ?? null })),
      };
    },
    async listOrderPicks(): Promise<OrderPickRow[]> {
      const rows = await all<Row<Record<string, unknown>>>(
        pool,
        `SELECT op.id, op.order_id, op.arrive_at, op.status AS pick_status, op.created_at AS pick_created,
                o.order_number, o.barcode, o.customer_name AS destinator, o.city AS destination, o.governorate,
                o.total, o.created_at, o.shipment_zone, o.delivery_company, o.delivery_status,
                u.name AS dropshipper_name
         FROM order_picks op
         JOIN orders o ON o.id = op.order_id
         LEFT JOIN users u ON u.id = o.dropshipper_id
         WHERE op.product_id IS NULL
         ORDER BY op.id DESC`
      );
      if (rows.length === 0) return [];
      const ids = rows.map((r) => Number(r.order_id));
      const placeholders = ids.map(() => '?').join(',');
      const itemRows = await all<Row<Record<string, unknown>>>(
        pool,
        `SELECT oi.order_id, oi.product_id, oi.quantity, p.name AS product_name, p.image_url
         FROM order_items oi JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id IN (${placeholders}) ORDER BY oi.id`,
        ids
      );
      const itemsByOrder = new Map<number, StockShipmentItem[]>();
      for (const r of itemRows) {
        const oid = Number(r.order_id);
        const list = itemsByOrder.get(oid) ?? [];
        list.push({ product_id: Number(r.product_id), product_name: String(r.product_name ?? ''), image_url: (r.image_url as string) ?? null, quantity: Number(r.quantity ?? 0) });
        itemsByOrder.set(oid, list);
      }
      return rows.map((r) => {
        const oid = Number(r.order_id);
        const overrideRaw = r.shipment_zone as string | null;
        const override = isShipmentZone(overrideRaw) ? overrideRaw : null;
        const autoZone = inferShipmentZone(r.governorate as string | null, r.destination as string | null);
        const items = itemsByOrder.get(oid) ?? [];
        return {
          id: Number(r.id),
          order_id: oid,
          order_number: String(r.order_number ?? ''),
          barcode: (r.barcode as string) ?? null,
          dropshipper_name: (r.dropshipper_name as string) ?? null,
          destinator: (r.destinator as string) ?? null,
          destination: (r.destination as string) ?? null,
          governorate: (r.governorate as string) ?? null,
          agence: (override ?? autoZone) as ShipmentZone | null,
          delivery_company: (r.delivery_company as string) ?? null,
          delivery_status: (r.delivery_status as string) ?? null,
          total: Number(r.total ?? 0),
          created_at: r.created_at ? new Date(r.created_at as string).toISOString() : '',
          arrive_at: r.arrive_at ? new Date(r.arrive_at as string).toISOString() : '',
          status: String(r.pick_status) as OrderPickStatus,
          items,
        };
      });
    },
    async createOrderPick(orderId: number): Promise<OrderPickRow | null> {
      const [exists] = await pool.query('SELECT id FROM order_picks WHERE order_id = ? AND product_id IS NULL', [orderId]);
      if ((exists as Row<Record<string, unknown>>[]).length > 0) {
        const list = await this.listOrderPicks();
        return list.find((r) => r.order_id === orderId) ?? null;
      }
      const [orderRows] = await pool.query('SELECT created_at FROM orders WHERE id = ?', [orderId]);
      const orderRow = (orderRows as Row<Record<string, unknown>>[])[0];
      if (!orderRow) return null;
      const created = new Date(orderRow.created_at as string);
      const arriveAt = addBusinessDays(created, 2);
      const arriveStr = arriveAt.toISOString().slice(0, 10);
      await pool.execute('INSERT INTO order_picks (order_id, arrive_at) VALUES (?, ?)', [orderId, arriveStr]);
      const list = await this.listOrderPicks();
      return list.find((r) => r.order_id === orderId) ?? null;
    },
    async scanOrderPickStatus(orderId: number): Promise<OrderPickRow | null> {
      const orderRows = await all<Row<{ status: string }>>(pool, 'SELECT status FROM orders WHERE id = ?', [orderId]);
      if (orderRows.length === 0) return null;
      if (String(orderRows[0].status) === 'cancelled') throw new Error('This commande is cancelled');
      const [rows] = await pool.query('SELECT id, status FROM order_picks WHERE order_id = ? AND product_id IS NULL', [orderId]);
      const pick = (rows as Row<Record<string, unknown>>[])[0];
      if (!pick) return null;
      const current = String(pick.status) as OrderPickStatus;
      if (current === 'cancelled') throw new Error('This commande is cancelled');
      let next: OrderPickStatus;
      if (current === 'unconfirmed') next = 'confirmed';
      else if (current === 'confirmed') next = 'shipped';
      else if (current === 'shipped') next = 'return';
      else return (await this.listOrderPicks()).find((r) => r.order_id === orderId) ?? null;
      await pool.execute('UPDATE order_picks SET status = ? WHERE order_id = ? AND product_id IS NULL', [next, orderId]);
      if (next === 'return') {
        await pool.execute("UPDATE orders SET status = 'retour' WHERE id = ?", [orderId]);
      }
      const list = await this.listOrderPicks();
      return list.find((r) => r.order_id === orderId) ?? null;
    },
async findSupplierOrgByEmail(email: string): Promise<{ allow_marketplace: boolean; dropshipping_eligible: boolean; account_status: string; labels: string[] } | null> {
      const r = await row(pool, "SELECT allow_marketplace, dropshipping_eligible, account_status, labels FROM supplier_organizations WHERE CONVERT(email USING utf8mb4) COLLATE utf8mb4_unicode_ci = CONVERT(? USING utf8mb4) COLLATE utf8mb4_unicode_ci LIMIT 1", [email]);
      if (!r) return null;
      return {
        allow_marketplace: Boolean(r.allow_marketplace),
        dropshipping_eligible: Boolean(r.dropshipping_eligible),
        account_status: String(r.account_status ?? 'active'),
        labels: parseJsonCol<string[]>(r.labels, []),
      };
    },
    async updateSupplierOrganizationFlags(id: number, patch: UpdateSupplierOrgFlagsInput): Promise<SupplierOrganizationDetail | null> {
      const sets: string[] = [];
      const params: unknown[] = [];
      if (patch.account_status !== undefined) {
        sets.push('account_status = ?');
        params.push(patch.account_status);
      }
      if (patch.allow_marketplace !== undefined) {
        sets.push('allow_marketplace = ?');
        params.push(patch.allow_marketplace ? 1 : 0);
      }
      if (patch.dropshipping_eligible !== undefined) {
        sets.push('dropshipping_eligible = ?');
        params.push(patch.dropshipping_eligible ? 1 : 0);
      }
      if (patch.account_manager !== undefined) {
        sets.push('account_manager = ?');
        params.push(patch.account_manager);
      }
      if (patch.business_developer !== undefined) {
        sets.push('business_developer = ?');
        params.push(patch.business_developer);
      }
      if (patch.doc_files !== undefined) {
        sets.push('doc_files = ?');
        params.push(JSON.stringify(patch.doc_files));
      }
      if (patch.doc_statuses !== undefined) {
        sets.push('doc_statuses = ?');
        params.push(JSON.stringify(patch.doc_statuses));
      }
      if (sets.length) {
        params.push(id);
        await pool.query(`UPDATE supplier_organizations SET ${sets.join(', ')} WHERE id = ?`, params);
      }
      const r = await row<Row<Record<string, unknown>>>(pool, 'SELECT * FROM supplier_organizations WHERE id = ?', [id]);
      return r ? rowToSupplierOrgDetail(r) : null;
    },
    async updateSupplierOrganizationLabels(id: number, labels: string[]): Promise<SupplierOrganizationDetail | null> {
      await pool.execute('UPDATE supplier_organizations SET labels = ? WHERE id = ?', [JSON.stringify(labels), id]);
      const r = await row<Row<Record<string, unknown>>>(pool, 'SELECT * FROM supplier_organizations WHERE id = ?', [id]);
      return r ? rowToSupplierOrgDetail(r) : null;
    },
    async listProductSubscriptions(query: SubscriptionsQuery): Promise<ProductSubscriptionsResult> {
      const conds: string[] = [];
      const params: unknown[] = [];
      if (query.products?.length) {
        conds.push(`product_name IN (${query.products.map(() => '?').join(',')})`);
        params.push(...query.products);
      }
      if (query.suppliers?.length) {
        conds.push(`supplier_name IN (${query.suppliers.map(() => '?').join(',')})`);
        params.push(...query.suppliers);
      }
      if (query.retailers?.length) {
        conds.push(`retailer_name IN (${query.retailers.map(() => '?').join(',')})`);
        params.push(...query.retailers);
      }
      if (query.cost_min !== undefined) {
        conds.push('cost >= ?');
        params.push(query.cost_min);
      }
      if (query.cost_max !== undefined) {
        conds.push('cost <= ?');
        params.push(query.cost_max);
      }
      if (query.price_min !== undefined) {
        conds.push('price >= ?');
        params.push(query.price_min);
      }
      if (query.price_max !== undefined) {
        conds.push('price <= ?');
        params.push(query.price_max);
      }
      if (query.oos !== undefined) conds.push(query.oos ? 'allow_when_oos = 0' : 'allow_when_oos = 1');
      if (query.started === 'day') conds.push('started_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)');
      if (query.started === 'week') conds.push('started_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)');
      if (query.started === 'month') conds.push('started_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)');
      const q = (query.q ?? '').trim();
      if (q) {
        conds.push('(product_name LIKE ? OR supplier_name LIKE ? OR retailer_name LIKE ?)');
        const like = `%${q}%`;
        params.push(like, like, like);
      }
      const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
      const sortMap: Record<string, string> = {
        cost: 'cost',
        price: 'price',
        profit_fee: 'profit_fee',
        units_sold: 'units_sold',
        allow_when_oos: 'allow_when_oos',
        product: 'product_name',
        supplier: 'supplier_name',
        retailer: 'retailer_name',
        started_at: 'started_at',
      };
      const sortCol = sortMap[query.sort ?? ''] ?? 'started_at';
      const dir = query.dir === 'asc' ? 'ASC' : 'DESC';
      const countRows = await all<Row<{ n: number }>>(pool, `SELECT COUNT(*) AS n FROM product_subscriptions ${where}`, params);
      const total = Number(countRows[0]?.n ?? 0);
      const offset = (query.page - 1) * query.per_page;
      const data = await all<Row<Record<string, unknown>>>(
        pool,
        `SELECT * FROM product_subscriptions ${where} ORDER BY ${sortCol} ${dir}, id DESC LIMIT ? OFFSET ?`,
        [...params, query.per_page, offset]
      );
      const rows = data.map((r): ProductSubscription => ({
        id: Number(r.id),
        product_name: r.product_name as string,
        product_emoji: (r.product_emoji as string) ?? '',
        supplier_name: r.supplier_name as string,
        supplier_code: r.supplier_code as string,
        retailer_name: r.retailer_name as string,
        retailer_code: r.retailer_code as string,
        premium: (r.premium as ProductSubscription['premium']) ?? null,
        cost: Number(r.cost),
        price: Number(r.price),
        profit_fee: Number(r.profit_fee),
        allow_when_oos: b(r.allow_when_oos),
        price_constraint: b(r.price_constraint),
        units_sold: Number(r.units_sold),
        started_at: (r.started_at as Date).toISOString(),
        price_updates: Number(r.price_updates),
      }));
      return {
        rows,
        total,
        filters: {
          suppliers: Array.from(new Set(rows.map((s) => s.supplier_name))),
          retailers: Array.from(new Set(rows.map((s) => s.retailer_name))),
          products: Array.from(new Set(rows.map((s) => s.product_name))),
        },
        page: query.page,
        per_page: query.per_page,
      };
    },
    async getProductSubscription(id): Promise<ProductSubscription | null> {
      return getProductSubscription(id);
    },
    async updateProductSubscription(id, patch: SubscriptionPatch): Promise<ProductSubscription | null> {
      return updateProductSubscription(id, patch);
    },
    async listCollections(): Promise<CollectionsResult> {
      const rows = await all<Row<Record<string, unknown>>>(pool, 'SELECT * FROM collections ORDER BY id DESC');
      return {
        total: rows.length,
        collections: rows.map((r) => rowToCollection(r)),
      };
    },
    async getCollection(id): Promise<CollectionDetail | null> {
      const rows = await all<Row<Record<string, unknown>>>(pool, 'SELECT * FROM collections WHERE id = ?', [id]);
      if (rows.length === 0) return null;
      const c = rowToCollection(rows[0]!);
      const productRows = await all<Row<Record<string, unknown>>>(
        pool,
        'SELECT * FROM collection_products WHERE collection_id = ? ORDER BY id ASC',
        [id],
      );
      return {
        ...c,
        product_items: productRows.map((r) => rowToCollectionProductItem(r)),
      };
    },
    async createCollection(input, _actor): Promise<CollectionDetail> {
      const nowIso = new Date().toISOString();
      const isActive = input.is_active ?? false;
      const ids = input.product_ids ?? [];
      const rank = input.marketplace_sort_rank ?? null;
      const [result] = await pool.execute(
        'INSERT INTO collections (title, description, products, created_at, status, is_active, marketplace_sort_rank) VALUES (?,?,?,?,?,?,?)',
        [input.title, input.description ?? '', ids.length, toDbTime(nowIso), isActive ? 'Active' : 'Draft', isActive ? 1 : 0, rank],
      );
      const nextId = Number((result as unknown as { insertId?: number }).insertId ?? 0);
      await insertCollectionProducts(pool, nextId, ids);
      const rows = await all<Row<Record<string, unknown>>>(pool, 'SELECT * FROM collections WHERE id = ?', [nextId]);
      const c = rowToCollection(rows[0]!);
      const productRows = await all<Row<Record<string, unknown>>>(
        pool,
        'SELECT * FROM collection_products WHERE collection_id = ? ORDER BY id ASC',
        [nextId],
      );
      return { ...c, product_items: productRows.map((r) => rowToCollectionProductItem(r)) };
    },
    async updateCollection(id, input, _actor): Promise<CollectionDetail | null> {
      const existing = await all<Row<Record<string, unknown>>>(pool, 'SELECT * FROM collections WHERE id = ?', [id]);
      if (existing.length === 0) return null;
      const prev = rowToCollection(existing[0]!);
      const title = input.title ?? prev.title;
      const description = input.description ?? prev.description;
      const isActive = input.is_active ?? prev.is_active;
      const rank = input.marketplace_sort_rank !== undefined ? input.marketplace_sort_rank : prev.marketplace_sort_rank;
      const ids = input.product_ids;
      await pool.execute(
        'UPDATE collections SET title = ?, description = ?, products = ?, status = ?, is_active = ?, marketplace_sort_rank = ? WHERE id = ?',
        [title, description, (ids ?? []).length, isActive ? 'Active' : 'Draft', isActive ? 1 : 0, rank, id],
      );
      if (ids) {
        await pool.execute('DELETE FROM collection_products WHERE collection_id = ?', [id]);
        await insertCollectionProducts(pool, id, ids);
      }
      const rows = await all<Row<Record<string, unknown>>>(pool, 'SELECT * FROM collections WHERE id = ?', [id]);
      const c = rowToCollection(rows[0]!);
      const productRows = await all<Row<Record<string, unknown>>>(
        pool,
        'SELECT * FROM collection_products WHERE collection_id = ? ORDER BY id ASC',
        [id],
      );
      return { ...c, product_items: productRows.map((r) => rowToCollectionProductItem(r)) };
    },
    async addProductToCollection(collectionId: number, productId: number, _actor: string): Promise<CollectionDetail> {
      const productRows = await all<Row<Record<string, unknown>>>(
        pool,
        'SELECT id, name, COALESCE(image_url, \'\') AS emoji, category FROM products WHERE id = ?',
        [productId],
      );
      const p = productRows[0];
      if (p) {
        await pool.execute(
          'INSERT IGNORE INTO collection_products (collection_id, product_id, product_name, product_emoji, eligible_to_marketplace, offer_type, added_by, added_at) VALUES (?,?,?,?,?,?,?,?)',
          [collectionId, Number(p.id), p.name, p.emoji, 1, (p.category as string) || 'dropshipping', null, toDbTime(new Date().toISOString())],
        );
        await pool.execute(
          'UPDATE collections SET products = (SELECT COUNT(*) FROM collection_products WHERE collection_id = ?) WHERE id = ?',
          [collectionId, collectionId],
        );
      }
      const rows = await all<Row<Record<string, unknown>>>(pool, 'SELECT * FROM collections WHERE id = ?', [collectionId]);
      const c = rowToCollection(rows[0]!);
      const cpRows = await all<Row<Record<string, unknown>>>(
        pool,
        'SELECT * FROM collection_products WHERE collection_id = ? ORDER BY id ASC',
        [collectionId],
      );
      return { ...c, product_items: cpRows.map((r) => rowToCollectionProductItem(r)) };
    },
    async removeProductFromCollection(collectionId: number, productId: number, _actor: string): Promise<CollectionDetail> {
      await pool.execute(
        'DELETE FROM collection_products WHERE collection_id = ? AND product_id = ?',
        [collectionId, productId],
      );
      await pool.execute(
        'UPDATE collections SET products = (SELECT COUNT(*) FROM collection_products WHERE collection_id = ?) WHERE id = ?',
        [collectionId, collectionId],
      );
      const rows = await all<Row<Record<string, unknown>>>(pool, 'SELECT * FROM collections WHERE id = ?', [collectionId]);
      const c = rowToCollection(rows[0]!);
      const cpRows = await all<Row<Record<string, unknown>>>(
        pool,
        'SELECT * FROM collection_products WHERE collection_id = ? ORDER BY id ASC',
        [collectionId],
      );
      return { ...c, product_items: cpRows.map((r) => rowToCollectionProductItem(r)) };
    },
    async listCollectionCatalog(): Promise<CollectionProduct[]> {
      const rows = await all<Row<Record<string, unknown>>>(
        pool,
        `SELECT id, name, image_url, category,
                moderation_status
         FROM products
         WHERE is_active = 1 AND moderation_status = 'approved'
         ORDER BY name`
      );
      return rows.map((r) => ({
        id: Number(r.id),
        name: r.name as string,
        emoji: '📦',
        image_url: (r.image_url as string) || null,
        eligible_to_marketplace: true,
        offer_type: (r.category as CatalogOfferType) || 'dropshipping',
      }));
    },

    async supplierFinance() {
      const rows = await all<Row<Record<string, unknown>>>(pool, `
        SELECT u.id, u.name, u.email,
          (SELECT COUNT(*) FROM products p WHERE p.fournisseur_id = u.id) AS total_products,
          (SELECT COUNT(DISTINCT o.id) FROM orders o JOIN order_items oi ON oi.order_id = o.id JOIN products p ON p.id = oi.product_id WHERE p.fournisseur_id = u.id AND o.status <> 'cancelled') AS total_orders,
          (SELECT ROUND(COALESCE(SUM(p.price * oi.quantity), 0), 2) FROM orders o JOIN order_items oi ON oi.order_id = o.id JOIN products p ON p.id = oi.product_id WHERE p.fournisseur_id = u.id AND o.status = 'delivered') AS earned
        FROM users u
        WHERE u.role = 'seller'
        ORDER BY earned DESC
      `);
      const payoutRows = await all<Row<Record<string, unknown>>>(pool, "SELECT recipient_id, COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS paid FROM payouts WHERE recipient_role = 'seller' GROUP BY recipient_id");
      const paidMap = new Map<number, number>(payoutRows.map((p) => [Number(p.recipient_id), Number(p.paid)]));
      return rows.map((r) => {
        const paid = paidMap.get(Number(r.id)) ?? 0;
        const earned = Number(r.earned);
        return { id: Number(r.id), name: r.name as string, email: r.email as string, total_orders: Number(r.total_orders), total_products: Number(r.total_products), earned, paid, owed: round2(earned - paid) };
      });
    },
    async platformEarnings() {
      const rows = await all<Row<Record<string, unknown>>>(pool, `
        SELECT o.id, o.order_number, o.dropshipper_id, ds.name AS dropshipper_name, o.total, o.commission, o.delivered_at
        FROM orders o JOIN users ds ON ds.id = o.dropshipper_id
        WHERE o.status = 'delivered'
        ORDER BY o.delivered_at DESC
      `);
      const orders = rows.map((r) => ({ id: Number(r.id), order_number: r.order_number as string, dropshipper_id: Number(r.dropshipper_id), dropshipper_name: r.dropshipper_name as string, total: Number(r.total), commission: Number(r.commission), delivered_at: r.delivered_at ? (r.delivered_at as Date).toISOString() : null }));
      return { total: round2(orders.reduce((s, o) => s + o.commission, 0)), orders };
    },
    async dropshipperFinance() {
      const rows = await all<Row<Record<string, unknown>>>(pool, `
        SELECT u.id, u.name, u.email,
          COUNT(o.id) AS total_orders,
          COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total ELSE 0 END), 0) AS total_sales,
          COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.profit ELSE 0 END), 0) AS profit
        FROM users u
        LEFT JOIN orders o ON o.dropshipper_id = u.id
        WHERE u.role = 'customer'
        GROUP BY u.id, u.name, u.email
        ORDER BY profit DESC
      `);
      const payoutRows = await all<Row<Record<string, unknown>>>(pool, "SELECT recipient_id, COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS paid FROM payouts WHERE recipient_role = 'customer' GROUP BY recipient_id");
      const paidMap = new Map<number, number>(payoutRows.map((p) => [Number(p.recipient_id), Number(p.paid)]));
      return rows.map((r) => {
        const paid = paidMap.get(Number(r.id)) ?? 0;
        const profit = Number(r.profit);
        return { id: Number(r.id), name: r.name as string, email: r.email as string, total_orders: Number(r.total_orders), total_sales: Number(r.total_sales), profit, paid, owed: round2(profit - paid) };
      });
    },
    async listPayouts() {
      const rows = await all<Row<Record<string, unknown>>>(pool, 'SELECT p.*, u.name AS recipient_name FROM payouts p JOIN users u ON u.id = p.recipient_id ORDER BY p.id DESC');
      return rows.map((p) => rowToPayout(p));
    },
    async listPayoutsForRecipient(recipientId, recipientRole) {
      const rows = await all<Row<Record<string, unknown>>>(pool, 'SELECT p.*, u.name AS recipient_name FROM payouts p JOIN users u ON u.id = p.recipient_id WHERE p.recipient_id = ? AND p.recipient_role = ? ORDER BY p.id DESC', [recipientId, recipientRole]);
      return rows.map((p) => rowToPayout(p));
    },
    async getPayoutByFlouciPaymentId(paymentId) {
      const r = await row<Row<Record<string, unknown>>>(pool, 'SELECT p.*, u.name AS recipient_name FROM payouts p JOIN users u ON u.id = p.recipient_id WHERE p.flouci_payment_id = ?', [paymentId]);
      return r ? rowToPayout(r) : null;
    },
    async getPayoutById(id) {
      const r = await row<Row<Record<string, unknown>>>(pool, 'SELECT p.*, u.name AS recipient_name FROM payouts p JOIN users u ON u.id = p.recipient_id WHERE p.id = ?', [id]);
      return r ? rowToPayout(r) : null;
    },
    async createPayout(input) {
      const method = input.method ?? 'manual';
      const startsPaid = method !== 'flouci';
      const [r] = await pool.execute(
        `INSERT INTO payouts (recipient_id, recipient_role, amount, period, status, notes, method, flouci_payment_id, flouci_link, flouci_status, flouci_tracking_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        [
          input.recipient_id,
          input.recipient_role,
          input.amount,
          input.period ?? null,
          startsPaid ? 'paid' : 'pending',
          input.notes ?? null,
          method,
          input.flouci_payment_id ?? null,
          input.flouci_link ?? null,
          input.flouci_status ?? null,
          input.flouci_tracking_id ?? null,
        ]
      );
      return Number((r as mysql.ResultSetHeader).insertId);
    },
    async updatePayoutStatus(id, status) {
      await pool.execute("UPDATE payouts SET status = ?, paid_at = IF(? = 'paid', NOW(), NULL) WHERE id = ?", [status, status, id]);
    },
    async updatePayoutFlouciStatus(id, flouciStatus) {
      await pool.execute(
        "UPDATE payouts SET flouci_status = ?, status = IF(? = 'SUCCESS', 'paid', status), paid_at = IF(? = 'SUCCESS', NOW(), paid_at) WHERE id = ?",
        [flouciStatus, flouciStatus, flouciStatus, id]
      );
    },
    async getFlouciWallet(userId) {
      const r = await row<Row<Record<string, unknown>>>(pool, 'SELECT user_id, identifier, created_at, updated_at FROM flouci_wallets WHERE user_id = ?', [userId]);
      if (!r) return null;
      return {
        user_id: Number(r.user_id),
        identifier: r.identifier as string,
        created_at: (r.created_at as Date).toISOString(),
        updated_at: (r.updated_at as Date).toISOString(),
      };
    },
    async setFlouciWallet(userId, identifier) {
      await pool.query(
        'INSERT INTO flouci_wallets (user_id, identifier) VALUES (?, ?) ON DUPLICATE KEY UPDATE identifier = VALUES(identifier)',
        [userId, identifier]
      );
    },
    async clearFlouciWallet(userId) {
      await pool.execute('DELETE FROM flouci_wallets WHERE user_id = ?', [userId]);
    },

    async createServiceInscription(input) {
      const [r] = await pool.execute('INSERT INTO service_inscriptions (user_id, service, amount, notes) VALUES (?,?,?,?)', [input.user_id, input.service, input.amount, input.notes ?? null]);
      const row = await this.getServiceInscription(Number((r as mysql.ResultSetHeader).insertId));
      if (!row) throw new Error('Failed to create inscription');
      return row;
    },

    async getServiceInscription(id) {
      const rows = await all<Row<Record<string, unknown>>>(pool, `
        SELECT i.id, i.user_id, u.name AS user_name, u.email, i.service, i.status, i.amount, i.notes,
          su.name AS confirmed_by, i.created_at, i.confirmed_at
        FROM service_inscriptions i
        JOIN users u ON u.id = i.user_id
        LEFT JOIN users su ON su.id = i.confirmed_by
        WHERE i.id = ?
      `, [id]);
      if (rows.length === 0) return null;
      return mapServiceInscriptionRow(rows[0]);
    },

    async getLatestServiceInscription(userId, service) {
      const rows = await all<Row<Record<string, unknown>>>(pool, `
        SELECT i.id, i.user_id, u.name AS user_name, u.email, i.service, i.status, i.amount, i.notes,
          su.name AS confirmed_by, i.created_at, i.confirmed_at
        FROM service_inscriptions i
        JOIN users u ON u.id = i.user_id
        LEFT JOIN users su ON su.id = i.confirmed_by
        WHERE i.user_id = ? AND i.service = ?
        ORDER BY i.id DESC LIMIT 1
      `, [userId, service]);
      if (rows.length === 0) return null;
      return mapServiceInscriptionRow(rows[0]);
    },

    async listConfirmedServiceInscriptions() {
      const rows = await all<Row<Record<string, unknown>>>(pool, `
        SELECT i.id, i.user_id, u.name AS user_name, u.email, i.service, i.status, i.amount, i.notes,
          MAX(i.confirmed_at) AS confirmed_at,
          (SELECT COUNT(*) FROM orders o WHERE o.dropshipper_id = i.user_id AND o.status = 'draft') AS orders_count
        FROM service_inscriptions i
        JOIN users u ON u.id = i.user_id
        WHERE i.status = 'confirmed'
        GROUP BY i.id, i.user_id, u.name, u.email, i.service, i.status, i.amount, i.notes
        ORDER BY confirmed_at DESC
      `);
      return rows.map(mapServiceInscriptionRow).map((r) => ({ ...r, orders_count: Number((r as unknown as Record<string, unknown> & { orders_count?: number }).orders_count ?? 0) }));
    },

    async confirmServiceInscription(id, confirmedBy) {
      await pool.execute("UPDATE service_inscriptions SET status = 'confirmed', confirmed_by = ?, confirmed_at = NOW() WHERE id = ?", [confirmedBy, id]);
      return this.getServiceInscription(id);
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
      const rows = await all<Row<Record<string, unknown>>>(pool, `
        SELECT oi.product_id, p.name AS product_name, p.image_url, p.committed_stock, p.fournisseur_id, u.name AS fournisseur_name,
          SUM(oi.quantity) AS demanded, SUM(oi.house_qty) AS claimed
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id AND o.status IN ('pending','confirmed')
        JOIN products p ON p.id = oi.product_id
        JOIN users u ON u.id = p.fournisseur_id
        GROUP BY oi.product_id, p.name, p.image_url, p.committed_stock, p.fournisseur_id, u.name
        ORDER BY demanded DESC
      `);
      const groups = new Map<number, FulfillmentGroup>();
      for (const r of rows) {
        const house = Number(r.claimed ?? 0);
        const committed = Number(r.committed_stock ?? 0);
        const demanded = Number(r.demanded);
        const missing = Math.max(0, demanded - house - committed);
        if (missing <= 0) continue;
        const fid = Number(r.fournisseur_id);
        let g = groups.get(fid);
        if (!g) {
          g = { fournisseur_id: fid, fournisseur_name: r.fournisseur_name as string, total_demand: 0, total_house: 0, total_missing: 0, items: [] };
          groups.set(fid, g);
        }
        g.items.push({ product_id: Number(r.product_id), product_name: r.product_name as string, image_url: (r.image_url as string) ?? null, demanded, house, missing });
        g.total_demand += demanded;
        g.total_house += house;
        g.total_missing += missing;
      }
      return [...groups.values()].sort((a, b) => b.total_missing - a.total_missing);
    },

    async listInventories() {
      const rows = await all<Row<Record<string, unknown>>>(pool, 'SELECT i.* FROM inventories i ORDER BY i.id');
      const details = await Promise.all(rows.map((r) => inventoryDetail(pool, r)));
      return details;
    },

    async getInventory(id: number) {
      const rows = await all<Row<Record<string, unknown>>>(pool, 'SELECT i.* FROM inventories i WHERE i.id = ?', [id]);
      if (!rows[0]) return null;
      return inventoryDetail(pool, rows[0]);
    },

    async getInventoryByCode(code: string) {
      const rows = await all<Row<Record<string, unknown>>>(pool, 'SELECT i.* FROM inventories i WHERE i.code = ?', [code]);
      if (!rows[0]) return null;
      return inventoryDetail(pool, rows[0]);
    },

    async createInventory(input: { name: string; location?: string | null; capacity: number }) {
      const code = uniqueCode();
      const [r] = await pool.execute('INSERT INTO inventories (code, name, location, capacity) VALUES (?,?,?,?)', [code, input.name, input.location ?? null, input.capacity]);
      return { id: (r as mysql.ResultSetHeader).insertId, code, name: input.name, location: input.location ?? null, capacity: input.capacity, used: 0, item_count: 0, created_at: new Date().toISOString() };
    },

    async deleteInventory(id: number) {
      await pool.execute('DELETE FROM inventories WHERE id = ?', [id]);
    },

    async addInventoryStock(inventoryId: number, productId: number, quantity: number) {
      const inv = await all<Row<{ name: string; capacity: number }>>(pool, 'SELECT name, capacity FROM inventories WHERE id = ?', [inventoryId]);
      if (!inv[0]) throw new Error('Inventory not found');
      const usedRows = await all<Row<{ used: number }>>(pool, `
        SELECT COALESCE((SELECT SUM(quantity) FROM inventory_items WHERE inventory_id = ?), 0)
             + COALESCE((SELECT SUM(quantity) FROM stock_batches WHERE inventory_id = ?), 0) AS used
      `, [inventoryId, inventoryId]);
      const capacity = Number(inv[0].capacity);
      const used = Number(usedRows[0].used ?? 0);
      if (used + quantity > capacity) {
        throw new Error(`Inventory "${inv[0].name}" is full (${used}/${capacity} units used)`);
      }
      const existing = await all<Row<{ id: number }>>(pool, 'SELECT id FROM inventory_items WHERE inventory_id = ? AND product_id = ?', [inventoryId, productId]);
      if (existing.length > 0) {
        await pool.execute('UPDATE inventory_items SET quantity = quantity + ? WHERE id = ?', [quantity, existing[0].id]);
      } else {
        await pool.execute('INSERT INTO inventory_items (inventory_id, product_id, quantity) VALUES (?,?,?)', [inventoryId, productId, quantity]);
      }
    },

    async allocateFulfillmentToInventory(fournisseurId: number, inventoryId?: number) {
      const demandRows = await all<Row<Record<string, unknown>>>(pool, `
        SELECT oi.product_id, p.name AS product_name, p.committed_stock, SUM(oi.quantity) AS demanded, SUM(oi.house_qty) AS claimed
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id AND o.status IN ('pending','confirmed')
        JOIN products p ON p.id = oi.product_id AND p.fournisseur_id = ?
        GROUP BY oi.product_id, p.name, p.committed_stock
        ORDER BY demanded DESC
      `, [fournisseurId]);
      const missing: MissingForAllocation[] = [];
      for (const r of demandRows) {
        const claimed = Number(r.claimed ?? 0);
        const committed = Number(r.committed_stock ?? 0);
        const missingQty = Math.max(0, Number(r.demanded) - claimed - committed);
        if (missingQty <= 0) continue;
        missing.push({ product_id: Number(r.product_id), product_name: r.product_name as string, quantity: missingQty });
      }
      if (missing.length === 0) return { allocations: [], leftover: [] };

      if (inventoryId != null) {
        const inv = await all<Row<Record<string, unknown>>>(pool, `
          SELECT i.*, COALESCE(SUM(ii.quantity), 0)
            + COALESCE((SELECT SUM(sb.quantity) FROM stock_batches sb WHERE sb.inventory_id = i.id), 0) AS used
          FROM inventories i LEFT JOIN inventory_items ii ON ii.inventory_id = i.id WHERE i.id = ? GROUP BY i.id
        `, [inventoryId]);
        if (inv.length === 0) throw new Error('Inventory not found');
        const totalMissing = missing.reduce((s, m) => s + m.quantity, 0);
        const free = Number(inv[0].capacity) - Number(inv[0].used ?? 0);
        if (free < totalMissing) {
          throw new Error(`Inventory "${inv[0].name}" has only ${free} free unit(s), but the fulfillment needs ${totalMissing}. Pick a different inventory.`);
        }
        const allocations: FulfillmentAllocationDetail[] = [];
        for (const m of missing) {
          if (m.quantity <= 0) continue;
          await this.addInventoryStock(inventoryId, m.product_id, m.quantity);
          allocations.push({ inventory_id: inventoryId, inventory_name: inv[0].name as string, product_id: m.product_id, product_name: m.product_name, quantity: m.quantity });
        }
        for (const m of missing) {
          await pool.execute('UPDATE products SET committed_stock = COALESCE(committed_stock, 0) + ?, stock = GREATEST(0, stock - ?) WHERE id = ?', [m.quantity, m.quantity, m.product_id]);
        }
        return { allocations, leftover: [] };
      }

      const spaceRows = await all<Row<Record<string, unknown>>>(pool, `
        SELECT i.id, i.name, i.capacity,
          COALESCE(SUM(ii.quantity), 0) + COALESCE((SELECT SUM(sb.quantity) FROM stock_batches sb WHERE sb.inventory_id = i.id), 0) AS used
        FROM inventories i LEFT JOIN inventory_items ii ON ii.inventory_id = i.id
        GROUP BY i.id ORDER BY i.id
      `);
      const spaces: InventoryFreeSpace[] = spaceRows.map((r) => ({ id: Number(r.id), name: r.name as string, capacity: Number(r.capacity), used: Number(r.used ?? 0) }));

      const { allocations, leftover } = allocateMissingIntoInventories(missing, spaces);
      for (const a of allocations) {
        await this.addInventoryStock(a.inventory_id, a.product_id, a.quantity);
      }
      const byProduct = new Map<number, number>();
      for (const a of allocations) byProduct.set(a.product_id, (byProduct.get(a.product_id) ?? 0) + a.quantity);
      for (const [productId, qty] of byProduct) {
        await pool.execute('UPDATE products SET committed_stock = COALESCE(committed_stock, 0) + ?, stock = GREATEST(0, stock - ?) WHERE id = ?', [qty, qty, productId]);
      }
      return { allocations, leftover };
    },

    async listSupplierWarehouses() {
      const rows = await all<Row<Record<string, unknown>>>(pool, `
        SELECT w.*, u.name AS owner_name
        FROM supplier_warehouses w
        LEFT JOIN users u ON u.id = w.fournisseur_id
        ORDER BY w.id DESC
      `);
      return rows.map((r): SupplierWarehouse => ({
        id: Number(r.id),
        fournisseur_id: r.fournisseur_id != null ? Number(r.fournisseur_id) : null,
        owner_name: (r.owner_name as string) ?? null,
        name: r.name as string,
        phone1: (r.phone1 as string) ?? '',
        phone2: (r.phone2 as string) ?? '',
        country: (r.country as string) ?? 'Tunisia',
        location: (r.location as string) ?? '',
        address1: (r.address1 as string) ?? '',
        address2: (r.address2 as string) ?? '',
        created_at: (r.created_at as Date).toISOString(),
      }));
    },

    async createSupplierWarehouse(input: CreateSupplierWarehouseInput) {
      const [r] = await pool.execute(
        'INSERT INTO supplier_warehouses (fournisseur_id, name, phone1, phone2, country, location, address1, address2) VALUES (?,?,?,?,?,?,?,?)',
        [input.fournisseur_id ?? null, input.name, input.phone1 ?? '', input.phone2 ?? '', input.country ?? 'Tunisia', input.location ?? '', input.address1 ?? '', input.address2 ?? '']
      );
      const id = (r as mysql.ResultSetHeader).insertId;
      const ownerRows = input.fournisseur_id != null
        ? await all<Row<{ name: string }>>(pool, 'SELECT name FROM users WHERE id = ?', [input.fournisseur_id])
        : [];
      return {
        id,
        fournisseur_id: input.fournisseur_id ?? null,
        owner_name: ownerRows[0]?.name ?? null,
        name: input.name,
        phone1: input.phone1 ?? '',
        phone2: input.phone2 ?? '',
        country: input.country ?? 'Tunisia',
        location: input.location ?? '',
        address1: input.address1 ?? '',
        address2: input.address2 ?? '',
        created_at: new Date().toISOString(),
      };
    },

    async trendingProducts(limit = 20) {
      const products = await productsWithStats();
      const groups = new Map<string, ProductWithSupplier[]>();
      for (const prod of products) {
        const key = normName(prod.name);
        const arr = groups.get(key);
        if (arr) arr.push(prod);
        else groups.set(key, [prod]);
      }
      const items: TrendingItem[] = [];
      for (const [key, list] of groups) {
        let best = list[0];
        for (const o of list) {
          if ((o.stats?.profit ?? 0) > (best.stats?.profit ?? 0) || ((o.stats?.profit ?? 0) === (best.stats?.profit ?? 0) && o.rating > best.rating)) best = o;
        }
        const offers = new Set(list.map((o) => o.fournisseur_id)).size;
        const created = list.reduce((s, o) => s + (o.stats?.created ?? 0), 0);
        const confirmed = list.reduce((s, o) => s + (o.stats?.confirmed ?? 0), 0);
        const returns = list.reduce((s, o) => s + (o.stats?.returns ?? 0), 0);
        const profit = round2(list.reduce((s, o) => s + (o.stats?.profit ?? 0), 0));
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
          best: { product_id: best.id, fournisseur_id: best.fournisseur_id, fournisseur_name: best.fournisseur_name, price: best.price, cost_price: best.cost_price, stock: best.stock },
        });
      }
      items.sort((a, b) => b.score - a.score);
      return items.slice(0, limit);
    },

    async productSuppliers(productId) {
      const pRows = await all<Row<Record<string, unknown>>>(pool, 'SELECT name FROM products WHERE id = ?', [productId]);
      const p = pRows[0];
      if (!p) return [];
      const key = normName(p.name as string);
      const supCountRows = await all<Row<Record<string, unknown>>>(pool, 'SELECT fournisseur_id, COUNT(*) AS n FROM products GROUP BY fournisseur_id');
      const supCount = new Map<number, number>(supCountRows.map((r) => [Number(r.fournisseur_id), Number(r.n)]));
      const offers: SupplierOffer[] = [];
      for (const prod of await productsWithStats()) {
        if (normName(prod.name) !== key) continue;
        const s = prod.stats ?? zeroStats();
        const total_products = supCount.get(prod.fournisseur_id) ?? 0;
        offers.push({
          product_id: prod.id,
          fournisseur_id: prod.fournisseur_id,
          fournisseur_name: prod.fournisseur_name,
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
      const teams = await all<Row<Record<string, unknown>>>(pool, "SELECT id FROM conversations WHERE type = 'team' ORDER BY id ASC");
      let id = teams.length ? Number(teams[0].id) : 0;
      if (!id) {
        const [r] = await pool.execute("INSERT INTO conversations (type, title) VALUES ('team', 'Support team')");
        id = (r as mysql.ResultSetHeader).insertId;
      } else if (teams.length > 1) {
        for (const extra of teams.slice(1)) {
          const extraId = Number(extra.id);
          await pool.execute('UPDATE chat_messages SET conversation_id = ? WHERE conversation_id = ?', [id, extraId]);
          await pool.execute('INSERT IGNORE INTO conversation_participants (conversation_id, user_id) SELECT ?, user_id FROM conversation_participants WHERE conversation_id = ?', [id, extraId]);
          await pool.execute('DELETE FROM conversation_participants WHERE conversation_id = ?', [extraId]);
          await pool.execute('DELETE FROM conversations WHERE id = ?', [extraId]);
        }
      }
      const supportRows = await all<Row<{ id: number }>>(pool, "SELECT id FROM users WHERE role = 'admin'");
      for (const s of supportRows) {
        await pool.execute('INSERT IGNORE INTO conversation_participants (conversation_id, user_id) VALUES (?,?)', [id, Number(s.id)]);
      }
      return id;
    },

    async ensureStaffConversation(userId, peerRole) {
      const peerRows = await all<Row<{ id: number }>>(pool, 'SELECT id FROM users WHERE role = ? ORDER BY id ASC LIMIT 1', [peerRole]);
      const peer = peerRows[0];
      if (!peer) throw new Error(`No ${peerRole} account exists`);
      const peerId = Number(peer.id);
      const rows = await all<Row<Record<string, unknown>>>(pool, `
        SELECT c.id FROM conversations c
        JOIN conversation_participants a ON a.conversation_id = c.id AND a.user_id = ?
        JOIN conversation_participants b ON b.conversation_id = c.id AND b.user_id = ?
        WHERE c.type = 'staff' ORDER BY c.id ASC LIMIT 1
      `, [userId, peerId]);
      if (rows.length) return Number(rows[0].id);
      const [r] = await pool.execute("INSERT INTO conversations (type) VALUES ('staff')");
      const convId = (r as mysql.ResultSetHeader).insertId;
      await pool.execute('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?,?)', [convId, userId]);
      await pool.execute('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?,?)', [convId, peerId]);
      return convId;
    },

    async ensureSupplierConversation(userId, supplierId) {
      const rows = await all<Row<Record<string, unknown>>>(pool, `
        SELECT c.id FROM conversations c
        JOIN conversation_participants a ON a.conversation_id = c.id AND a.user_id = ?
        JOIN conversation_participants b ON b.conversation_id = c.id AND b.user_id = ?
        WHERE c.type = 'staff' AND c.title = ? ORDER BY c.id ASC LIMIT 1
      `, [userId, supplierId, `supplier:${supplierId}`]);
      if (rows.length) return Number(rows[0].id);
      const [r] = await pool.execute("INSERT INTO conversations (type, title) VALUES ('staff', ?)", [`supplier:${supplierId}`]);
      const convId = (r as mysql.ResultSetHeader).insertId;
      await pool.execute('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?,?)', [convId, userId]);
      await pool.execute('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?,?)', [convId, supplierId]);
      return convId;
    },

    async listConversations(userId, role) {
      if (role === 'admin') await this.ensureTeamConversation();
      const sql = `SELECT c.* FROM conversations c JOIN conversation_participants cp ON cp.conversation_id = c.id WHERE cp.user_id = ? ORDER BY (SELECT MAX(id) FROM chat_messages m WHERE m.conversation_id = c.id) DESC`;
      const rows = await all<Row<Record<string, unknown>>>(pool, sql, [userId]);
      const out: Conversation[] = [];
      for (const c of rows) {
        const convId = Number(c.id);
        const type = c.type as Conversation['type'];
        const partRows = await all<Row<Record<string, unknown>>>(pool, `
          SELECT u.id, u.name, u.role, u.photo, cp.last_read_message_id
          FROM conversation_participants cp JOIN users u ON u.id = cp.user_id WHERE cp.conversation_id = ?
        `, [convId]);
        const parts = partRows.map((p): ConversationParticipant => ({ id: Number(p.id), name: p.name as string, role: p.role as ConversationParticipant['role'], photo: (p.photo as string) ?? null }));
        const my = partRows.find((p) => Number(p.id) === userId);
        const lastRead = my?.last_read_message_id == null ? 0 : Number(my.last_read_message_id);
        const lastRows = await all<Row<Record<string, unknown>>>(pool, 'SELECT m.id, m.sender_id, m.body, m.image_url, m.created_at, u.name AS sender_name FROM chat_messages m JOIN users u ON u.id = m.sender_id WHERE m.conversation_id = ? ORDER BY m.id DESC LIMIT 1', [convId]);
        const unreadRows = await all<Row<Record<string, unknown>>>(pool, 'SELECT COUNT(*) AS n FROM chat_messages WHERE conversation_id = ? AND id > ? AND sender_id <> ?', [convId, lastRead, userId]);
        let title = '';
        if (type === 'team') title = (c.title as string) ?? 'Support team';
        else if ((c.title as string)?.startsWith('supplier:')) {
          const peer = parts.find((p) => p.id !== userId);
          title = peer ? `Chat with ${peer.name}` : 'Supplier chat';
        }
        else {
          const peer = parts.find((p) => p.id !== userId);
          title = peer ? `${peer.name} · ${peer.role}` : 'Conversation';
        }
        out.push({
          id: convId,
          type,
          title,
          participants: parts,
          last_message: lastRows.length
            ? { sender_id: Number(lastRows[0].sender_id), sender_name: lastRows[0].sender_name as string, body: (lastRows[0].body as string) ?? '', image_url: (lastRows[0].image_url as string) ?? null, created_at: (lastRows[0].created_at as Date).toISOString() }
            : null,
          unread: Number(unreadRows[0]?.n ?? 0),
        });
      }
      out.sort((a, b) => (b.last_message ? b.last_message.created_at : '') < (a.last_message ? a.last_message.created_at : '') ? -1 : 1);
      return out;
    },

    async listChatMessages(conversationId, userId) {
      const ok = await all<Row<{ id: number }>>(pool, 'SELECT cp.user_id AS id FROM conversation_participants cp WHERE cp.conversation_id = ? AND cp.user_id = ?', [conversationId, userId]);
      if (!ok.length) throw new Error('You are not part of this conversation');
      const rows = await all<Row<Record<string, unknown>>>(pool, `
        SELECT m.id, m.conversation_id, m.sender_id, m.body, m.image_url, m.created_at, u.name AS sender_name, u.role AS sender_role
        FROM chat_messages m JOIN users u ON u.id = m.sender_id
        WHERE m.conversation_id = ? ORDER BY m.id ASC
      `, [conversationId]);
      return rows.map((m): ChatMessage => ({ id: Number(m.id), conversation_id: conversationId, sender_id: Number(m.sender_id), sender_name: m.sender_name as string, sender_role: m.sender_role as ChatMessage['sender_role'], body: (m.body as string) ?? '', image_url: (m.image_url as string) ?? null, created_at: (m.created_at as Date).toISOString() }));
    },

    async sendChatMessage(conversationId, senderId, input) {
      const ok = await all<Row<{ id: number }>>(pool, 'SELECT cp.user_id AS id FROM conversation_participants cp WHERE cp.conversation_id = ? AND cp.user_id = ?', [conversationId, senderId]);
      if (!ok.length) throw new Error('You are not part of this conversation');
      const [r] = await pool.execute('INSERT INTO chat_messages (conversation_id, sender_id, body, image_url) VALUES (?,?,?,?)', [conversationId, senderId, input.body, input.image_url ?? null]);
      const msgId = (r as mysql.ResultSetHeader).insertId;
      const rows = await all<Row<Record<string, unknown>>>(pool, `
        SELECT m.id, m.conversation_id, m.sender_id, m.body, m.image_url, m.created_at, u.name AS sender_name, u.role AS sender_role
        FROM chat_messages m JOIN users u ON u.id = m.sender_id WHERE m.id = ?
      `, [msgId]);
      return { id: Number(rows[0].id), conversation_id: conversationId, sender_id: Number(rows[0].sender_id), sender_name: rows[0].sender_name as string, sender_role: rows[0].sender_role as ChatMessage['sender_role'], body: (rows[0].body as string) ?? '', image_url: (rows[0].image_url as string) ?? null, created_at: (rows[0].created_at as Date).toISOString() };
    },

    async markConversationRead(conversationId, userId) {
      const rows = await all<Row<Record<string, unknown>>>(pool, 'SELECT MAX(id) AS n FROM chat_messages WHERE conversation_id = ?', [conversationId]);
      await pool.execute('UPDATE conversation_participants SET last_read_message_id = ? WHERE conversation_id = ? AND user_id = ?', [Number(rows[0]?.n ?? 0), conversationId, userId]);
    },

    async chatUnread(userId, role) {
      const sql = role === 'admin'
        ? 'SELECT COUNT(*) AS n FROM chat_messages m JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id WHERE cp.user_id = ? AND m.sender_id <> ? AND m.id > cp.last_read_message_id'
        : 'SELECT COUNT(*) AS n FROM chat_messages m JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id WHERE cp.user_id = ? AND m.sender_id <> ? AND m.id > cp.last_read_message_id';
      const rows = await all<Row<Record<string, unknown>>>(pool, sql, [userId, userId]);
      return Number(rows[0]?.n ?? 0);
    },

    async listNotifications(userId) {
      const rows = await all<Row<Record<string, unknown>>>(pool, 'SELECT id, user_id, type, title, body, product_id, image_url, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50', [userId]);
      return rows.map((n): AppNotification => ({ id: Number(n.id), user_id: Number(n.user_id), type: n.type as AppNotification['type'], title: n.title as string, body: n.body as string, product_id: n.product_id == null ? null : Number(n.product_id), image_url: (n.image_url as string) ?? null, is_read: b(n.is_read), created_at: (n.created_at as Date).toISOString() }));
    },
    async notificationUnread(userId) {
      const rows = await all<Row<Record<string, unknown>>>(pool, 'SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0', [userId]);
      return Number(rows[0]?.n ?? 0);
    },
    async markNotificationsRead(userId) {
      await pool.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
    },
    async createNotification(input: CreateNotificationInput) {
      await pool.execute('INSERT INTO notifications (user_id, type, title, body, product_id, image_url) VALUES (?,?,?,?,?,?)', [input.user_id, input.type, input.title, input.body, input.product_id ?? null, input.image_url ?? null]);
    },
    async createApiKey(userId, name) {
      const plaintext = newApiToken();
      const prefix = plaintext.slice(0, 19);
      const [res] = await pool.execute('INSERT INTO api_keys (user_id, name, prefix, token_hash) VALUES (?,?,?,?)', [userId, name || 'Default key', prefix, sha256(plaintext)]);
      const id = Number((res as { insertId: number }).insertId);
      const rows = await all<Row<Record<string, unknown>>>(pool, 'SELECT * FROM api_keys WHERE id = ?', [id]);
      return { plaintext, key: mapApiKey(rows[0]) };
    },
    async listApiKeys(userId) {
      const rows = await all<Row<Record<string, unknown>>>(pool, 'SELECT * FROM api_keys WHERE user_id = ? ORDER BY id DESC', [userId]);
      return rows.map(mapApiKey);
    },
    async revokeApiKey(userId, keyId) {
      await pool.execute("UPDATE api_keys SET status = 'revoked' WHERE id = ? AND user_id = ?", [keyId, userId]);
    },
    async touchApiKey(keyId) {
      await pool.execute('UPDATE api_keys SET last_used_at = NOW() WHERE id = ?', [keyId]);
    },
    async findUserByApiKey(plaintext) {
      const rows = await all<Row<Record<string, unknown>>>(pool, "SELECT id, user_id FROM api_keys WHERE token_hash = ? AND status = 'active'", [sha256(plaintext)]);
      if (!rows[0]) return null;
      const u = await row<Row<Record<string, unknown>>>(pool, 'SELECT id, name, email, role, photo, cin, created_at FROM users WHERE id = ?', [Number(rows[0].user_id)]);
      if (!u) return null;
      return {
        user: { id: Number(u.id), name: u.name as string, email: u.email as string, role: u.role as DbUser['role'], photo: (u.photo as string) ?? null, cin: (u.cin as string) ?? null, created_at: (u.created_at as Date).toISOString() },
        keyId: Number(rows[0].id),
      };
    },

    async getIntegrationSetting(companyId: string) {
      const r = await row<Row<{ company_id: string; api_key: string; enabled: number }>>(
        pool, 'SELECT company_id, api_key, enabled FROM integration_settings WHERE company_id = ?', [companyId]
      );
      if (!r) return { company_id: companyId, api_key: '', enabled: false };
      return { company_id: r.company_id, api_key: r.api_key, enabled: Boolean(r.enabled) };
    },

    async getAllIntegrationSettings() {
      const rows = await all<Row<{ company_id: string; api_key: string; enabled: number }>>(
        pool, 'SELECT company_id, api_key, enabled FROM integration_settings'
      );
      const result: Record<string, { api_key: string; enabled: boolean }> = {};
      for (const r of rows) {
        result[r.company_id] = { api_key: r.api_key, enabled: Boolean(r.enabled) };
      }
      return result;
    },

    async setIntegrationSetting(companyId: string, apiKey: string, enabled: boolean) {
      await pool.query(
        'INSERT INTO integration_settings (company_id, api_key, enabled) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE api_key = VALUES(api_key), enabled = VALUES(enabled)',
        [companyId, apiKey, enabled ? 1 : 0]
      );
    },

    async logStaffActivity(input: StaffActivityInput) {
      await pool.query(
        `INSERT INTO staff_activity (user_id, user_name, role, activity_type, label, ref_id, quantity, duration_seconds)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.user_id,
          input.user_name,
          input.role,
          input.activity_type,
          input.label ?? null,
          input.ref_id ?? null,
          input.quantity ?? null,
          input.duration_seconds ?? null,
        ]
      );
    },

    async listStaffActivity(opts?: { userId?: number; limit?: number }) {
      let sql = 'SELECT id, user_id, user_name, role, activity_type, label, ref_id, quantity, duration_seconds, created_at FROM staff_activity';
      const params: unknown[] = [];
      const conds: string[] = [];
      if (opts?.userId) {
        conds.push('user_id = ?');
        params.push(opts.userId);
      }
      if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
      sql += ' ORDER BY created_at DESC';
      if (opts?.limit) {
        sql += ' LIMIT ?';
        params.push(opts.limit);
      }
      const rows = await all<Row<Record<string, unknown>>>(pool, sql, params);
      return rows.map((r) => ({
        id: Number(r.id),
        user_id: Number(r.user_id),
        user_name: r.user_name as string,
        role: r.role as string,
        activity_type: r.activity_type as StaffActivityRow['activity_type'],
        label: (r.label as string) ?? null,
        ref_id: r.ref_id == null ? null : Number(r.ref_id),
        quantity: r.quantity == null ? null : Number(r.quantity),
        duration_seconds: r.duration_seconds == null ? null : Number(r.duration_seconds),
        created_at: new Date(r.created_at as Date).toISOString(),
      }));
    },

    async raw<T>(sql: string, params?: unknown[]): Promise<T[]> {
      return all(pool, sql, params) as unknown as Promise<T[]>;
    },

    async saveUploadFile(name: string, data: Buffer, contentType: string): Promise<void> {
      await pool.query(
        `INSERT INTO uploads (name, data, content_type) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE data = VALUES(data), content_type = VALUES(content_type)`,
        [name, data, contentType],
      );
    },

    async getUploadFile(name: string): Promise<{ data: Buffer; contentType: string } | null> {
      const r = await row<Row<Record<string, unknown>>>(pool, 'SELECT data, content_type FROM uploads WHERE name = ?', [name]);
      if (!r) return null;
      const data = Buffer.isBuffer(r.data) ? r.data : Buffer.from(String(r.data), 'binary');
      return { data, contentType: String(r.content_type ?? 'application/octet-stream') };
    },
  };

  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS integration_settings (
      company_id VARCHAR(60) NOT NULL,
      api_key VARCHAR(500) NOT NULL DEFAULT '',
      enabled TINYINT(1) NOT NULL DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (company_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch {
    // table may already exist
  }

  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS staff_activity (
      id BIGINT NOT NULL AUTO_INCREMENT,
      user_id BIGINT NOT NULL,
      user_name VARCHAR(120) NOT NULL,
      role VARCHAR(20) NOT NULL,
      activity_type VARCHAR(40) NOT NULL,
      label VARCHAR(255) NULL,
      ref_id BIGINT NULL,
      quantity INT NULL,
      duration_seconds INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_staff_activity_user (user_id, created_at),
      KEY idx_staff_activity_type (activity_type, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch {
    // table may already exist
  }

  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS uploads (
      name VARCHAR(255) NOT NULL,
      data LONGBLOB NOT NULL,
      content_type VARCHAR(120) NOT NULL DEFAULT 'application/octet-stream',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch {
    // table may already exist
  }

  /* One-time backfill: any file still sitting on the (ephemeral) local disk is
     copied into the persistent uploads table so it survives the next restart. */
  try {
    const dir = uploadsDir;
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isFile());
      for (const name of files) {
        const known = await row<Row<Record<string, unknown>>>(pool, 'SELECT 1 AS ok FROM uploads WHERE name = ?', [name]);
        if (known) continue;
        const data = fs.readFileSync(path.join(dir, name));
        await pool.query(
          'INSERT INTO uploads (name, data, content_type) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)',
          [name, data, contentTypeFromFilename(name)],
        );
      }
    }
  } catch {
    // migration is best-effort; fresh uploads are always persisted at write time
  }

  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS flouci_wallets (
      user_id INT NOT NULL,
      identifier VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id),
      CONSTRAINT fk_fw_user FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch {
    // table may already exist
  }

  const payoutCols = await all<Row<{ COLUMN_NAME: string }>>(pool, 'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?', [cfg.database, 'payouts']);
  const payoutColSet = new Set(payoutCols.map((c) => c.COLUMN_NAME));
  const PAYOUT_EXTRA: [string, string][] = [
    ['method', "VARCHAR(20) NULL DEFAULT 'manual' AFTER notes"],
    ['flouci_payment_id', 'VARCHAR(100) NULL AFTER method'],
    ['flouci_link', 'VARCHAR(500) NULL AFTER flouci_payment_id'],
    ['flouci_status', 'VARCHAR(30) NULL AFTER flouci_link'],
    ['flouci_tracking_id', 'VARCHAR(120) NULL AFTER flouci_status'],
  ];
  for (const [col, def] of PAYOUT_EXTRA) {
    if (payoutColSet.has(col)) continue;
    try {
      await pool.query(`ALTER TABLE payouts ADD COLUMN ${col} ${def}`);
    } catch {
      // column added concurrently; ignore
    }
  }

  async function dispatchToDeliveryCompany(db: Queryable, orderId: number): Promise<void> {
    const o = await row(db, 'SELECT id, delivery_company, customer_name, customer_phone, telephone2, governorate, city, shipping_address, total, locality_id, commentaire, est_fragile, ouvrir_colis, nombre_article, nombre_echange FROM orders WHERE id = ?', [orderId]);
    if (!o) return;
    const company = (o.delivery_company as string | null) ?? 'first-delivery';
    if (!o.delivery_company) {
      await pool.execute('UPDATE orders SET delivery_company = ? WHERE id = ?', ['first-delivery', orderId]);
    }
    if (company === 'first-delivery') {
      const cfgRow = await row(db, 'SELECT api_key FROM integration_settings WHERE company_id = ?', ['first-delivery']);
      if (!cfgRow || !cfgRow.api_key) {
        console.warn(`[first-delivery] skipping order ${orderId}: API key not configured or disabled`);
        return;
      }
      const items = await all(db, 'SELECT oi.quantity, p.name AS product_name FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ?', [orderId]);
      const clientName = (o.customer_name as string) || 'Client';
      const gov = (o.governorate as string) || '';
      const ville = (o.city as string) || '';
      const adresse = (o.shipping_address as string) || '';
      const tel = (o.customer_phone as string) || '';
      const prix = Number(o.total ?? 0);
      const designation = items.map((i) => i.product_name as string).join(', ') || 'Commande';
      const nombreArticle = o.nombre_article != null ? Number(o.nombre_article) : items.reduce((s, i) => s + Number(i.quantity ?? 1), 0);
      const commentaire = (o.commentaire as string) ?? items.map((i) => `${i.product_name} x${i.quantity}`).join(', ');
      const input: FdCreateOrderInput = {
        Client: { nom: clientName, locality_id: o.locality_id != null ? Number(o.locality_id) : undefined, gouvernerat: gov, ville, adresse, telephone: tel, telephone2: (o.telephone2 as string) || undefined },
        Produit: { prix, designation, nombreArticle, article: designation, commentaire, nombreEchange: (o.nombre_echange as string) === 'oui' ? 1 : 0, estFragile: (o.est_fragile as 'oui' | 'non') ?? 'non', ouvrirColis: (o.ouvrir_colis as 'oui' | 'non') ?? 'non' },
      };
      try {
        logFd('dispatch_request', { orderId, clientName, gov, ville, tel, prix, designation, nombreArticle, commentaire, estFragile: input.Produit.estFragile, ouvrirColis: input.Produit.ouvrirColis });
        const result = await fdCreateOrder(cfgRow.api_key as string, input);
        if (!result.isError) {
          const barCode = (result.result as { barCode?: string } | undefined)?.barCode;
          console.log(`[first-delivery] order ${orderId} dispatched → barCode=${barCode}`);
          logFd('dispatch_success', { orderId, barCode, message: result.message });
          if (barCode) {
            await pool.execute('UPDATE orders SET barcode = ? WHERE id = ?', [barCode, orderId]).catch(() => {});
          }
          await pool.execute("UPDATE orders SET delivery_status = 'en_attente' WHERE id = ? AND delivery_status IS NULL", [orderId]).catch(() => {});
        } else {
          console.error(`[first-delivery] order ${orderId} API error:`, result.message);
          logFd('dispatch_error', { orderId, message: result.message });
        }
      } catch (err: unknown) {
        console.error(`[first-delivery] order ${orderId} request failed:`, (err as Error)?.message ?? err);
        logFd('dispatch_error', { orderId, message: (err as Error)?.message ?? String(err) });
      }
    }
  }

  return store;
}
