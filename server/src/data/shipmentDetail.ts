import { buildShipments, mulberry32, pad, Shipment } from './shipments';

export interface ShipmentTimelineItem {
  id: number;
  key: string;
  title: string;
  completed: boolean;
  at: string | null;
}

export interface ShipmentDetail extends Shipment {
  confirmed_by: string;
  order_created_at: string;
  task_created_at: string;
  confirmed_created_at: string;
  warehouse_phone: string;
  warehouse_phone_full: string;
  fulfiller_phone: string;
  fulfiller_phone_full: string;
  customer_phone: string;
  customer_phone_full: string;
  carrier_name: string;
  carrier_account_id: string;
  pickup_request_id: string | null;
  pickup_note: string | null;
  timeline: ShipmentTimelineItem[];
}

const CONFIRMERS = ['Wided', 'Amine K', 'Senda', 'Mariem', 'Yassine'];

const CARRIERS = ['Shipper Delivery', 'YesPost Tunis', 'Aramex Tunis', 'Bosta'];

const STATUS_LEVEL: Record<string, number> = {
  Pending: 1,
  'Awaiting packaging': 1,
  Shipped: 6,
  'Delivery Issue': 6,
  Delivered: 9,
};

const HOUR = 60 * 60 * 1000;
const MIN = 60 * 1000;

function timelineKeyAt(created: number, level: number, key: string, s: Shipment): string | null {
  if (key === 'created') return s.created_at;
  if (key === 'prepared') return s.prepared_at;
  if (key === 'picked') return s.picked_up_at;
  if (key === 'out') return s.first_carrier_attempt_at;
  if (key === 'delivered') return s.delivered_at;
  const offsets: Record<string, number> = {
    readyPickup: 20 * HOUR,
    origin: 24 * HOUR,
    transit: 26 * HOUR,
    destination: 30 * HOUR,
  };
  const off = offsets[key];
  return off === undefined ? null : new Date(created + off).toISOString();
}

const TIMELINE_DEFS: { key: string; title: (gid: string) => string }[] = [
  { key: 'created', title: (gid) => `Shipment #${gid} has been created and is ready to be processed` },
  { key: 'prepared', title: (gid) => `Shipment #${gid} has been prepared and is ready to be shipped` },
  { key: 'readyPickup', title: (gid) => `Shipment #${gid} has been marked as ready for pickup by the carrier` },
  { key: 'picked', title: (gid) => `Shipment #${gid} has been picked up by the carrier` },
  { key: 'origin', title: (gid) => `Shipment #${gid} has arrived at the carrier origin facility` },
  { key: 'transit', title: (gid) => `Shipment #${gid} is in transit to the destination facility` },
  { key: 'destination', title: (gid) => `Shipment #${gid} has arrived at carrier destination facility` },
  { key: 'out', title: (gid) => `Shipment #${gid} is out for delivery` },
  { key: 'delivered', title: (gid) => `Shipment #${gid} has been delivered to the customer` },
];

export function buildShipmentDetail(id: number): ShipmentDetail | null {
  const s = buildShipments().find((x) => x.id === id);
  if (!s) return null;

  const rand = mulberry32(id);
  const created = new Date(s.created_at).getTime();
  const task = new Date(created + 1 * MIN).toISOString();
  const confirmed = new Date(created + 4 * MIN).toISOString();

  const lastTwo = Math.floor(rand() * 100);
  const warehousePhone = `+216 ** *** *${pad(lastTwo, 2)}`;
  const warehousePhoneFull = `+216 ${pad(1 + Math.floor(rand() * 9), 1)}${pad(Math.floor(rand() * 10), 1)} ${pad(
    Math.floor(rand() * 900) + 100,
    3
  )} ${pad(Math.floor(rand() * 10), 1)}${pad(lastTwo, 2)}`;

  const fulfillerLast = Math.floor(rand() * 100);
  const fulfillerPhone = `+216 ** *** *${pad(fulfillerLast, 2)}`;
  const fulfillerPhoneFull = `+216 ${pad(1 + Math.floor(rand() * 9), 1)}${pad(Math.floor(rand() * 10), 1)} ${pad(
    Math.floor(rand() * 900) + 100,
    3
  )} ${pad(Math.floor(rand() * 10), 1)}${pad(fulfillerLast, 2)}`;

  const customerLast = Math.floor(rand() * 100);
  const customerPhone = `+216 ** *** *${pad(customerLast, 2)}`;
  const customerPhoneFull = `+216 ${pad(1 + Math.floor(rand() * 9), 1)}${pad(Math.floor(rand() * 10), 1)} ${pad(
    Math.floor(rand() * 900) + 100,
    3
  )} ${pad(Math.floor(rand() * 10), 1)}${pad(customerLast, 2)}`;

  const carrier = CARRIERS[Math.floor(rand() * CARRIERS.length)] ?? CARRIERS[0]!;
  const pickup = rand() < 0.85 ? `Pickup Request #${2200 + Math.floor(rand() * 300)}` : null;

  const level = STATUS_LEVEL[s.status] ?? 1;
  const gid = s.gid;
  const timeline: ShipmentTimelineItem[] = TIMELINE_DEFS.map((def, i) => {
    const completed = i + 1 <= level;
    return {
      id: i,
      key: def.key,
      title: def.title(gid),
      completed,
      at: completed ? timelineKeyAt(created, level, def.key, s) : null,
    };
  }).reverse();

  return {
    ...s,
    confirmed_by: CONFIRMERS[Math.floor(rand() * CONFIRMERS.length)] ?? CONFIRMERS[0]!,
    order_created_at: s.created_at,
    task_created_at: task,
    confirmed_created_at: confirmed,
    warehouse_phone: warehousePhone,
    warehouse_phone_full: warehousePhoneFull,
    fulfiller_phone: fulfillerPhone,
    fulfiller_phone_full: fulfillerPhoneFull,
    customer_phone: customerPhone,
    customer_phone_full: customerPhoneFull,
    carrier_name: carrier,
    carrier_account_id: `#${100 + Math.floor(rand() * 900)}`,
    pickup_request_id: pickup,
    pickup_note: pickup ? 'Carrier does not support pickup request creation' : null,
    timeline,
  };
}