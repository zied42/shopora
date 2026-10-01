import { at, codeFor, mulberry32, pad, MANAGERS, DEVELOPERS, FULFILLERS, WAREHOUSES, PRODUCTS } from './shipments';

export type TransferStatus = 'rejected' | 'delivered' | 'packed';
export type PaymentBadge = 'failed' | 'pending' | 'successful';

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
  status: TransferStatus;
  product_name: string;
  product_variation: string | null;
  pack_units: number;
  product_qty: number;
  deposit_amount: number | null;
  deposit_status: PaymentBadge;
  payment_amount: number | null;
  payment_status: PaymentBadge;
  received_units: number;
  total_units: number;
  carrier_logo: string;
  tracking_number: string | null;
}

export const DEPOT_ADDRESSES = [
  'Sidi Bou Saïd, Route de la Corniche',
  'La Soukra, Rue de la République',
  'Megrine, Avenue Habib Bourguiba',
  'Kairouan, Cité El Ghazala',
  'Zarzis, Boulevard du 7 Novembre',
  'Tozeur, Avenue Farhat Hached',
];

export function buildTransferShipments(): TransferShipment[] {
  const rand = mulberry32(20260819);
  const list: TransferShipment[] = [];
  const count = 127;

  for (let i = 0; i < count; i++) {
    const id = 127 - i;
    const clientRoll = rand();
    const client_id = clientRoll < 0.7 ? 1 : clientRoll < 0.85 ? 23 : 24;
    const org = FULFILLERS[Math.floor(rand() * FULFILLERS.length)] ?? FULFILLERS[0]!;
    const product = PRODUCTS[Math.floor(rand() * PRODUCTS.length)] ?? PRODUCTS[0]!;
    const dayAgo = 1 + Math.floor(i / 9);
    const created = at(dayAgo, 9 + Math.floor(rand() * 8), Math.floor(rand() * 60));

    const statusRoll = rand();
    const status: TransferStatus = statusRoll < 0.3 ? 'rejected' : statusRoll < 0.62 ? 'delivered' : 'packed';
    const delivered_at = status === 'delivered' ? at(dayAgo - 1 - Math.floor(rand() * 3), 10 + Math.floor(rand() * 8), Math.floor(rand() * 60)) : null;

    const active = status !== 'rejected';
    const depositAmount = active ? Math.round((90 + rand() * 260) * 1000) / 1000 : null;
    const paymentAmount = active && depositAmount !== null ? Math.round(depositAmount * (0.6 + rand() * 0.4) * 1000) / 1000 : null;
    const deposit_status: PaymentBadge = !active ? 'failed' : status === 'delivered' ? 'successful' : rand() < 0.55 ? 'successful' : 'pending';
    const payment_status: PaymentBadge = !active ? 'failed' : rand() < 0.4 ? 'pending' : 'successful';

    const packUnits = 2 + Math.floor(rand() * 3);
    const productQty = 1 + Math.floor(rand() * 6);
    const totalUnits = productQty;
    const receivedUnits = status === 'delivered' ? totalUnits : 0;

    const carrierLogos = ['aram', 'shipper', 'intigo', 'xdelivery', 'first', 'abm', 'jax', 'goodex'];
    const tracking = status === 'delivered' || rand() < 0.55 ? `TN${pad(400 + Math.floor(rand() * 90000), 6)}HX` : null;

    list.push({
      id,
      gid: pad(id, 3),
      client_id,
      ship_to_name: org,
      ship_to_code: codeFor('org_' + org),
      account_manager: MANAGERS[Math.floor(rand() * MANAGERS.length)] ?? MANAGERS[0]!,
      business_developer: DEVELOPERS[Math.floor(rand() * DEVELOPERS.length)] ?? DEVELOPERS[0]!,
      account_incubator: null,
      ship_to: DEPOT_ADDRESSES[Math.floor(rand() * DEPOT_ADDRESSES.length)]!,
      created_at: created,
      delivered_at,
      status,
      product_name: product.name,
      product_variation: product.variation,
      pack_units: packUnits,
      product_qty: productQty,
      deposit_amount: depositAmount,
      deposit_status,
      payment_amount: paymentAmount,
      payment_status,
      received_units: receivedUnits,
      total_units: totalUnits,
      carrier_logo: carrierLogos[Math.floor(rand() * carrierLogos.length)]!,
      tracking_number: tracking,
    });
  }

  list.sort((a, b) => b.id - a.id);
  return list;
}