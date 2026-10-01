import { at, mulberry32, RETAILERS } from './shipments';
import { retailCode } from './returns';

export type TxEntityType = 'service' | 'carrier' | 'retailer';
export type TxStatus = 'pending' | 'successful';

export interface Transaction {
  id: number;
  gid: string;
  summary: string;
  /** Related shipment uuid (when the transaction is tied to a shipment). */
  shipment_id: string | null;
  /** Human display of the shipment, e.g. "#579692". */
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

/** Total transaction count shown in the Falcon footer (all time). */
export const TRANSACTION_TOTAL = 4579026;

type Entity = { type: TxEntityType; name: string; code: string | null };

const SERVICE: Entity = { type: 'service', name: 'Service', code: null };

const CARRIERS: { name: string }[] = [
  { name: 'X Delivery' },
  { name: 'Aramex' },
  { name: 'Shipper' },
  { name: 'Intigo' },
  { name: 'First Delivery' },
  { name: 'ABM Delivery' },
  { name: 'JAX Delivery' },
  { name: 'Goodex' },
];

const PAYMENT_METHODS = ['Cash on Delivery', 'Stripe', 'PayPal', 'Bank transfer'];
const CASH_LOCATIONS = ['Agence Tunis', 'Agence Sousse', 'Agence Sfax'];

interface SummaryDef {
  summary: string;
  linked: boolean;
  amount: number | ((rand: number) => number);
  paid: (r: () => number) => boolean;
}

const SUMMARY_FEES: SummaryDef[] = [
  { summary: 'Shipment revenue', linked: true, amount: (r) => Math.round((30 + r * 16) * 1000) / 1000, paid: () => false },
  { summary: 'Carrier shipment payment', linked: true, amount: (r) => Math.round((30 + r * 16) * 1000) / 1000, paid: () => false },
  { summary: 'Order confirmation service', linked: false, amount: 2, paid: (r) => r() < 0.4 },
  { summary: 'Follow-up service fee', linked: false, amount: 1, paid: (r) => r() < 0.4 },
  { summary: 'Packing Materials Cost', linked: true, amount: 0.56, paid: (r) => r() < 0.75 },
  { summary: 'Shipping fee', linked: true, amount: 7, paid: (r) => r() < 0.75 },
  { summary: 'Logistics Handling Charge', linked: true, amount: 1.2, paid: (r) => r() < 0.75 },
];

/** Deterministic uuid-ish shipment id like Falcon's /shipments/<uuid>. */
function uuid(rand: () => number): string {
  const seg = (len: number) => {
    let s = '';
    for (let i = 0; i < len; i++) s += '0123456789abcdef'[Math.floor(rand() * 16)];
    return s;
  };
  return `${seg(8)}-${seg(4)}-4${seg(3)}-${'89ab'[Math.floor(rand() * 4)]}${seg(3)}-${seg(12)}`;
}

export interface TransactionsResult {
  transactions: Transaction[];
  total: number;
}

export function buildTransactions(): TransactionsResult {
  const rand = mulberry32(20260819);
  const transactions: Transaction[] = [];
  const shipments = 630;
  let id = shipments * SUMMARY_FEES.length;

  for (let si = 0; si < shipments; si++) {
    const retailer = RETAILERS[Math.floor(rand() * RETAILERS.length)] ?? RETAILERS[0]!;
    const retailerEntity: Entity = { type: 'retailer', name: retailer.name, code: retailCode(retailer.name) };
    const carrier = CARRIERS[Math.floor(rand() * CARRIERS.length)] ?? CARRIERS[0]!;
    const carrierEntity: Entity = { type: 'carrier', name: carrier.name, code: null };
    const dayAgo = 1 + Math.floor(si / 90);
    const hour = 8 + Math.floor(rand() * 11);
    const minute = Math.floor(rand() * 60);
    const created = at(dayAgo, hour, minute);
    const updated = rand() < 0.72 ? created : at(Math.max(0, dayAgo - 1), hour, minute);
    const shipmentId = uuid(rand);
    const shipmentDisplay = `#${579692 - si}`;
    const revenue = Math.round((30 + rand() * 16) * 1000) / 1000;
    const revenuePaid = rand() < 0.55;
    const paymentMethod = PAYMENT_METHODS[Math.floor(rand() * PAYMENT_METHODS.length)] ?? PAYMENT_METHODS[0]!;
    const cashLocation = rand() < 0.45 ? (CASH_LOCATIONS[Math.floor(rand() * CASH_LOCATIONS.length)] ?? null) : null;

    const push = (gid: number, summary: string, amount: number, status: TxStatus, from: Entity, to: Entity, linked: boolean) => {
      transactions.push({
        id: gid,
        gid: String(gid),
        summary,
        shipment_id: linked ? shipmentId : null,
        shipment_display: linked ? shipmentDisplay : null,
        created_at: created,
        updated_at: updated,
        status,
        amount,
        payment_method: paymentMethod,
        cash_pickup_location: cashLocation,
        from_type: from.type,
        from_name: from.name,
        from_code: from.code,
        to_type: to.type,
        to_name: to.name,
        to_code: to.code,
        follow_up: null,
        bulk: null,
      });
    };

    const revenueStatus: TxStatus = revenuePaid ? 'successful' : 'pending';
    push(id, 'Shipment revenue', revenue, revenueStatus, SERVICE, retailerEntity, true);
    id -= 1;
    push(id, 'Carrier shipment payment', revenue, revenueStatus, carrierEntity, SERVICE, true);
    id -= 1;

    for (const def of SUMMARY_FEES.slice(2)) {
      const amount = typeof def.amount === 'function' ? def.amount(rand()) : def.amount;
      const status: TxStatus = def.paid(rand) ? 'successful' : 'pending';
      push(id, def.summary, amount, status, retailerEntity, SERVICE, def.linked);
      id -= 1;
    }
  }

  return { transactions, total: TRANSACTION_TOTAL };
}