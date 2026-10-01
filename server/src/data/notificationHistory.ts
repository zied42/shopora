import { at, mulberry32 } from './shipments';
import { getSellerOrganization } from './sellerOrganizations';

export const NOTIFICATION_CHANNELS = ['Email', 'Web push', 'SMS'] as const;

export interface SellerNotification {
  id: number;
  org_id: number;
  name: string;
  data: string;
  channel: string;
  created_at: string;
}

export interface SellerNotificationQuery {
  org_id: number | null;
  page: number;
  per_page: number;
  channel?: string;
}

export interface SellerNotificationResult {
  rows: SellerNotification[];
  total: number;
  filters: { channels: string[] };
  page: number;
  per_page: number;
}

const NOTIF_NAMES = [
  'Subscription activated',
  'Product subscription denied',
  'New subscription offer',
  'Price constraint set',
  'Allowed to sell when OOS',
  'Products under review',
  'New product available in store',
  'Late fulfillment warning',
  'Balance statement',
  'Registration completed',
  'Document verified',
  'Promo code created',
];

const NOTIF_DATA = [
  'Your product was accepted and is now available in the store.',
  'The requested product could not be reserved for this subscription.',
  'A new catalogue has been added to your subscription offer.',
  'A price constraint has been applied to one of your subscriptions.',
  'Selling is now allowed even when the product is out of stock.',
  'Some of your products are currently under review by the team.',
  'A new product matching your interests is now available.',
  'One of your shipments is at risk of being fulfilled late.',
  'Your account balance statement is available for download.',
  'Your registration process has been completed successfully.',
  'Your uploaded document has been reviewed and verified.',
  'A new promotional code has been generated for your store.',
];

let cache: SellerNotification[] | null = null;

function buildRows(): SellerNotification[] {
  const rows: SellerNotification[] = [];
  const days = [1, 2, 3, 5, 8, 13, 21];
  for (let orgIdx = 0; orgIdx < 2000; orgIdx++) {
    const rand = mulberry32(77001 + orgIdx);
    const org = getSellerOrganization(90630 + orgIdx * 2);
    if (!org) continue;
    const count = rand() < 0.4 ? 0 : 1 + Math.floor(rand() * 9);
    for (let k = 0; k < count; k++) {
      const channel = NOTIFICATION_CHANNELS[Math.floor(rand() * NOTIFICATION_CHANNELS.length)] ?? 'Email';
      rows.push({
        id: orgIdx * 100 + k + 1,
        org_id: org.id,
        name: NOTIF_NAMES[Math.floor(rand() * NOTIF_NAMES.length)] ?? NOTIF_NAMES[0]!,
        data: NOTIF_DATA[Math.floor(rand() * NOTIF_DATA.length)] ?? NOTIF_DATA[0]!,
        channel,
        created_at: at(days[Math.floor(rand() * days.length)] ?? 3, 8 + Math.floor(rand() * 11), Math.floor(rand() * 60)),
      });
    }
  }
  return rows;
}

function allRows(): SellerNotification[] {
  if (!cache) cache = buildRows();
  return cache;
}

export function searchSellerNotifications(query: SellerNotificationQuery): SellerNotificationResult {
  const rows = allRows();
  const channel = query.channel?.trim();
  const matches: SellerNotification[] = [];
  for (const n of rows) {
    if (query.org_id != null && n.org_id !== query.org_id) continue;
    if (channel && channel !== 'all' && n.channel !== channel) continue;
    matches.push(n);
  }
  matches.sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : b.id - a.id));
  const total = matches.length;
  const start = (query.page - 1) * query.per_page;
  return {
    rows: matches.slice(start, start + query.per_page),
    total,
    filters: { channels: [...NOTIFICATION_CHANNELS] as string[] },
    page: query.page,
    per_page: query.per_page,
  };
}