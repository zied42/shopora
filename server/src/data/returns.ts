import { at, mulberry32, pad, RETAILERS, WAREHOUSES, CUSTOMERS, ADDRESSES, PRODUCTS } from './shipments';

export type ChefReturnType = 'replacement' | 'product_return';
export type ChefReturnApproval = 'approved' | 'waiting';
export type ChefExchangeDelivery = 'awaiting_packaging' | 'at_carrier_facility' | 'on_its_way' | 'delivered';
export type ChefReturnDelivery = 'awaiting_arrival' | 'canceled' | 'delivered';

export interface ChefReturnProduct {
  name: string;
  variation: string | null;
  quantity: number;
}

export interface ChefReturn {
  id: number;
  gid: string;
  created_by: string | null;
  type: ChefReturnType;
  retailer_name: string;
  retailer_code: string;
  retailer_premium: boolean;
  address: string;
  destination_warehouse: string | null;
  products: ChefReturnProduct[];
  approval_status: ChefReturnApproval;
  exchange_delivery_status: ChefExchangeDelivery;
  exchange_shipment_id: number | null;
  return_delivery_status: ChefReturnDelivery;
  dispute_status: 'unresolved' | null;
  created_at: string;
  accepted_at: string | null;
  received_at: string | null;
  inspection: boolean;
}

const CREATORS = [...CUSTOMERS, 'Ahmed Ben Romdhane', 'Mariem Zribi', 'Hadil Sassi', 'Yosra Mallat', 'Khalil Bouzid'];

/** Deterministic code like Falcon's retail codes (e.g. `MJ-1148`). */
export function retailCode(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  return letters[h % 26] + letters[(h >> 6) % 26] + '-' + (h % 9000 + 1000);
}

export interface ReturnsResult {
  returns: ChefReturn[];
}

export function buildReturns(): ReturnsResult {
  const rand = mulberry32(20260819);
  const returns: ChefReturn[] = [];
  const count = 3309;

  for (let i = 0; i < count; i++) {
    const id = 9248 - i;
    const retailer = RETAILERS[Math.floor(rand() * RETAILERS.length)] ?? RETAILERS[0]!;
    const creator = CUSTOMERS[Math.floor(rand() * CUSTOMERS.length)] ?? CREATORS[0]!;
    const incomingType: ChefReturnType = rand() < 0.5 ? 'replacement' : 'product_return';
    const product = PRODUCTS[Math.floor(rand() * PRODUCTS.length)] ?? PRODUCTS[0]!;
    const dayAgo = 1 + Math.floor(i / 6);
    const created = at(dayAgo, 8 + Math.floor(rand() * 10), Math.floor(rand() * 60));

    // Approval drives the rest of the workflow (waiting rows stay early in the pipeline).
    const waiting = rand() < 0.34;
    const approval: ChefReturnApproval = waiting ? 'waiting' : 'approved';

    let exchange: ChefExchangeDelivery = 'awaiting_packaging';
    if (!waiting) {
      const roll = rand();
      exchange = roll < 0.34 ? 'awaiting_packaging' : roll < 0.58 ? 'at_carrier_facility' : roll < 0.84 ? 'on_its_way' : 'delivered';
    }

    let retDelivery: ChefReturnDelivery = 'awaiting_arrival';
    const cancelled = !waiting && rand() < 0.08;
    const deliveredBack = !waiting && rand() < 0.22;
    if (cancelled) retDelivery = 'canceled';
    else if (deliveredBack) retDelivery = 'delivered';

    const accepted_at = waiting ? null : new Date(new Date(created).getTime() + (2 + Math.floor(rand() * 40) * 3) * 3600_000).toISOString();
    const received_at = retDelivery === 'delivered' ? (accepted_at ? new Date(new Date(accepted_at).getTime() + (1 + Math.floor(rand() * 6)) * 86400_000).toISOString() : null) : null;
    const exchangeShipment = !waiting && (exchange !== 'awaiting_packaging' || rand() < 0.4) ? 560000 + Math.floor(rand() * 9000) : null;
    const dispute = incomingType === 'product_return' && !waiting && rand() < 0.09 ? 'unresolved' : null;

    returns.push({
      id,
      gid: pad(id, 4),
      created_by: incomingType === 'replacement' ? creator : 'Seller',
      type: incomingType,
      retailer_name: retailer.name,
      retailer_code: retailCode(retailer.name),
      retailer_premium: rand() < 0.35,
      address: ADDRESSES[Math.floor(rand() * ADDRESSES.length)]!,
      destination_warehouse: rand() < 0.7 ? (WAREHOUSES[Math.floor(rand() * WAREHOUSES.length)] ?? null) : null,
      products: [
        {
          name: product.name,
          variation: product.variation,
          quantity: 1 + Math.floor(rand() * 3),
        },
      ],
      approval_status: approval,
      exchange_delivery_status: exchange,
      exchange_shipment_id: exchangeShipment,
      return_delivery_status: retDelivery,
      dispute_status: dispute,
      created_at: created,
      accepted_at,
      received_at,
      inspection: incomingType === 'product_return' && !waiting,
    });
  }

  returns.sort((a, b) => b.id - a.id);
  return { returns };
}