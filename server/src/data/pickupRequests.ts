import { at, mulberry32, pad, WAREHOUSES, ADDRESSES } from './shipments';

export interface PickupRequestCarrier {
  state: 'none' | 'created' | 'unsupported';
  reference: string | null;
  /** Human label like `19 Aug 2026`. */
  date_label: string | null;
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
  carrier: PickupRequestCarrier;
  status: 'Pending';
  pickup_date: string;
  from_time: string;
  to_time: string;
}

const CARRIER_LOGOS = ['aram', 'shipper', 'intigo', 'xdelivery', 'first', 'abm', 'jax', 'goodex'];

/** Format a localized clock value like Falcon (`9:00 AM`, `12:00 AM`, `6:00 PM`). */
export function clock12(hour: number, minute: number): string {
  const suffix = hour < 12 ? 'AM' : 'PM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${pad(minute, 2)} ${suffix}`;
}

/** Format a date label like `19 Aug 2026`. */
function dateLabel(iso: string): string {
  const d = new Date(iso);
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function maskPhone(full: string): string {
  const digits = full.replace(/\D/g, '');
  const tail = digits.slice(-4);
  return `+216 ** *** ${tail.slice(0, 2)}${tail.slice(2)}`;
}

export function buildPickupRequests(): PickupRequest[] {
  const rand = mulberry32(20260819);
  const list: PickupRequest[] = [];
  const count = 117;

  for (let i = 0; i < count; i++) {
    const id = 6890 - i;
    const warehouse = WAREHOUSES[Math.floor(rand() * WAREHOUSES.length)] ?? WAREHOUSES[0]!;
    const address = ADDRESSES[Math.floor(rand() * ADDRESSES.length)]!;
    const dayAgo = 1 + Math.floor(i / 8);
    const pickupDate = at(dayAgo, 10, 0);
    const fromHour = 8 + Math.floor(rand() * 3);
    const toHour = 14 + Math.floor(rand() * 6);
    const sameTime = rand() < 0.05;
    const fromTime = clock12(fromHour, rand() < 0.5 ? 0 : 30);
    const toTime = sameTime ? fromTime : clock12(toHour, rand() < 0.5 ? 0 : 30);

    const phoneDigits = String(22000000 + Math.floor(rand() * 99800000)).padStart(8, '0');
    const phoneFull = '+216' + phoneDigits;

    const isStock = rand() < 0.2;
    const shipmentCount = 1 + Math.floor(rand() * 8);

    const carrierRoll = rand();
    const carrier: PickupRequestCarrier =
      carrierRoll < 0.42
        ? { state: 'none', reference: null, date_label: null }
        : carrierRoll < 0.8
          ? { state: 'created', reference: 'H' + pad(100000 + Math.floor(rand() * 800000), 6), date_label: dateLabel(pickupDate) }
          : { state: 'unsupported', reference: null, date_label: null };

    const processedBy = carrier.state === 'created' ? CARRIER_LOGOS[Math.floor(rand() * CARRIER_LOGOS.length)]! : null;

    list.push({
      id,
      gid: pad(id, 4),
      follow_up_status: 'New',
      warehouse,
      address,
      phone_masked: maskPhone(phoneFull),
      phone_full: phoneFull,
      related_label: isStock ? `${1 + Math.floor(rand() * 3)} Stock Shipments` : `${shipmentCount} Shipments`,
      related_type: isStock ? 'stock' : 'shipments',
      processed_by: processedBy,
      carrier,
      status: 'Pending',
      pickup_date: pickupDate,
      from_time: fromTime,
      to_time: toTime,
    });
  }

  list.sort((a, b) => b.id - a.id);
  return list;
}