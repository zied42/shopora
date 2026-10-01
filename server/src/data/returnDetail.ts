import { mulberry32, pad, CUSTOMERS, WAREHOUSES, FULFILLERS } from './shipments';
import { buildReturns, ChefReturn, ChefExchangeDelivery } from './returns';

export type ReturnDeliveryLabel =
  | 'Awaiting products arrival to fulfillment center'
  | 'Delivered'
  | 'Canceled';

export interface ReturnTimelineItem {
  id: number;
  key: string;
  title: string;
  completed: boolean;
}

export interface ReturnDetail extends ChefReturn {
  customer_name: string;
  customer_phone: string;
  customer_phone_full: string;
  address_lines: string[];
  delivery_type: string;
  process_type: string;
  return_delivery_label: ReturnDeliveryLabel;
  exchange_delivery_label: string;
  carrier_name: string;
  fulfilled_at: string | null;
  fulfilled_by: string | null;
  inspection_by: string | null;
  tracking_number: string | null;
  order_id: number;
  order_gid: string;
  order_shipment_id: number | null;
  order_shipment_gid: string | null;
  exchange_shipment_id: number | null;
  exchange_shipment_gid: string | null;
  exchange_timeline: ReturnTimelineItem[];
}

const CARRIERS = ['First Delivery', 'Shipper Delivery', 'Aramex Tunis', 'Bosta'];

const EXCHANGE_LEVEL: Record<ChefExchangeDelivery, number> = {
  awaiting_packaging: 0,
  at_carrier_facility: 6,
  on_its_way: 8,
  delivered: 10,
};

function exchangeTimeline(gid: string | null, status: ChefExchangeDelivery): ReturnTimelineItem[] {
  const ref = gid ? `#${gid}` : '#-----';
  const defs: { key: string; title: string }[] = [
    { key: 'arrived_qc', title: `The required products for shipment ${ref} has arrived to our fulfillment center and passed quality control` },
    { key: 'awaiting_fulfill', title: `Shipment ${ref} is awaiting to be fulfilled` },
    { key: 'prepared', title: `Shipment ${ref} has been prepared and is ready to be shipped` },
    { key: 'ready_pickup', title: `Shipment ${ref} has been marked as ready for pickup by the carrier` },
    { key: 'picked', title: `Shipment ${ref} has been picked up by the carrier` },
    { key: 'origin', title: `Shipment ${ref} has arrived at the carrier origin facility` },
    { key: 'transit', title: `Shipment ${ref} is in transit to the destination facility` },
    { key: 'destination', title: `Shipment ${ref} has arrived at carrier destination facility` },
    { key: 'out', title: `Shipment ${ref} is out for delivery` },
    { key: 'delivered', title: `Shipment ${ref} has been delivered to the customer` },
  ];
  const level = EXCHANGE_LEVEL[status] ?? 0;
  return defs
    .map((def, i) => ({ id: i, key: def.key, title: def.title, completed: i + 1 <= level }))
    .reverse();
}

export function buildReturnDetail(id: number): ReturnDetail | null {
  const r = buildReturns().returns.find((x) => x.id === id);
  if (!r) return null;

  const rand = mulberry32(id);
  const customer = CUSTOMERS[Math.floor(rand() * CUSTOMERS.length)] ?? CUSTOMERS[0]!;
  const lastTwo = Math.floor(rand() * 100);
  const customerPhone = `+216 ** *** *${pad(lastTwo, 2)}`;
  const customerPhoneFull = `+216 ${pad(1 + Math.floor(rand() * 9), 1)}${pad(Math.floor(rand() * 10), 1)} ${pad(
    Math.floor(rand() * 900) + 100,
    3
  )} ${pad(Math.floor(rand() * 10), 1)}${pad(lastTwo, 2)}`;

  const warehouse = WAREHOUSES[Math.floor(rand() * WAREHOUSES.length)] ?? 'Agence Tunis';
  const fulfiller = FULFILLERS[Math.floor(rand() * FULFILLERS.length)] ?? 'Shipper Express';
  const point = `${warehouse} - ${fulfiller}`;
  const carrier = CARRIERS[Math.floor(rand() * CARRIERS.length)] ?? CARRIERS[0]!;

  const shipped = r.exchange_delivery_status === 'on_its_way' || r.exchange_delivery_status === 'delivered';
  const fulfilled_at = r.exchange_delivery_status === 'delivered' ? (r.received_at ?? r.accepted_at) : null;
  const fulfilled_by = shipped || r.exchange_delivery_status === 'at_carrier_facility' ? point : null;
  const inspection_by = r.inspection && (shipped || r.exchange_delivery_status === 'at_carrier_facility') ? point : null;
  const tracking_number = shipped ? `TN${pad(100000 + Math.floor(rand() * 899999), 6)}` : null;

  const order_id = 1200 + Math.floor(rand() * 800);
  const order_shipment_id = rand() < 0.7 ? 560000 + Math.floor(rand() * 9000) : null;
  const exchange_shipment_gid = r.exchange_shipment_id != null ? pad(r.exchange_shipment_id, 6) : null;

  const return_delivery_label: ReturnDeliveryLabel =
    r.return_delivery_status === 'delivered' ? 'Delivered' : r.return_delivery_status === 'canceled' ? 'Canceled' : 'Awaiting products arrival to fulfillment center';

  const exchange_delivery_label =
    r.exchange_delivery_status === 'delivered'
      ? 'Delivered'
      : r.exchange_delivery_status === 'on_its_way'
        ? 'On its way'
        : r.exchange_delivery_status === 'at_carrier_facility'
          ? 'At carrier facility'
          : 'Awaiting packaging';

  return {
    ...r,
    customer_name: customer,
    customer_phone: customerPhone,
    customer_phone_full: customerPhoneFull,
    address_lines: r.address.split(',').map((p) => p.trim()).filter(Boolean),
    delivery_type: 'Shipper Handle the Pickup',
    process_type: r.type === 'replacement' ? 'SWAP & RETURN' : 'PRODUCT RETURN',
    return_delivery_label,
    exchange_delivery_label,
    carrier_name: carrier,
    fulfilled_at,
    fulfilled_by,
    inspection_by,
    tracking_number,
    order_id,
    order_gid: pad(order_id, 4),
    order_shipment_id,
    order_shipment_gid: order_shipment_id != null ? pad(order_shipment_id, 6) : null,
    exchange_shipment_id: r.exchange_shipment_id,
    exchange_shipment_gid: exchange_shipment_gid,
    exchange_timeline: exchangeTimeline(exchange_shipment_gid, r.exchange_delivery_status),
  };
}