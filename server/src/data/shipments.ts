export type ShipmentStatusIcon = 'clock' | 'truck' | 'dropbox';

export interface Shipment {
  id: number;
  gid: string;
  order_type: string;
  account_incubators: string[];
  account_managers: string[];
  business_developers: string[];
  retailer_name: string | null;
  retailer_phone: string | null;
  suppliers: string[];
  fulfiller: string | null;
  warehouse: string | null;
  created_at: string;
  updated_at: string;
  fullfillable_at: string | null;
  prepared_at: string | null;
  picked_up_at: string | null;
  first_carrier_attempt_at: string | null;
  last_carrier_attempt_at: string | null;
  delivery_issue_resolved_at: string | null;
  delivery_issue_reason: string | null;
  attempt_count: number;
  delivered_at: string | null;
  last_carrier_update_at: string | null;
  expected_shipping_date_from: string | null;
  expected_shipping_date_to: string | null;
  expected_delivery_date_from: string | null;
  expected_delivery_date_to: string | null;
  delivery_verified_at: string | null;
  delivery_verified_by: string | null;
  marked_delivered_post_verification: boolean;
  carrier_refunded: boolean;
  client_refunded: boolean;
  cod_settlement_status: string | null;
  cod_settlement_at: string | null;
  receivables_status: string | null;
  carrier_cod_payment_amount: number | null;
  carrier_cod_payment_status: string | null;
  address: string | null;
  status: string;
  status_icon: ShipmentStatusIcon;
  status_detail: string | null;
  customer_name: string | null;
  customer_call: boolean;
  tracking_numbers: string[];
  product_name: string;
  product_variation: string | null;
  quantity: number;
  image_url: string | null;
  cost: number;
  cod_amount: number;
}

export const SHIPMENT_ORDER_TYPES = [
  'Dropshipping',
  'Wholesale order',
  'Reservation order',
  'Wholesale & reservation orders',
  'Fulfillment',
  'Of wholesale bought products',
  'Of reserved products',
  'Confirmation orders',
  'Exchanges',
  'Non-COD orders',
  'Late Fulfillment',
  'Delivery Verification',
  'Delivery Verification - Claims',
  'From Integration',
] as const;

export const SHIPMENT_STATUSES = [
  'Pending',
  'Awaiting packaging',
  'Shipped',
  'Delivery Issue',
  'Delivered',
] as const;

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const MIN = 60_000;
export const HOUR = 60 * MIN;

/** Local date `daysAgo` days back at hh:mm plus an offset. */
export function at(daysAgo: number, h: number, m: number, addMins = 0): string {
  const now = new Date();
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, h, m, 0, 0);
  return new Date(t.getTime() + addMins * MIN).toISOString();
}

export function pad(n: number, len: number): string {
  return String(n).padStart(len, '0');
}

/** Deterministic short org code like Falcon's LZ118 / FV711 / YW254. */
export function codeFor(seed: string): string {
  let h = 7;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const n = (h % 900) + 100;
  return letters[h % 26] + letters[(h >> 5) % 26] + n;
}

export const RETAILERS: { name: string; phone: string }[] = [
  { name: 'My Shopping', phone: '+216 22 111 222' },
  { name: 'Infinity retail route', phone: '+216 55 333 444' },
  { name: 'Kontiza shop', phone: '+216 28 555 666' },
  { name: 'Miss Rihab', phone: '+216 93 777 888' },
  { name: 'Gsm+', phone: '+216 27 999 000' },
  { name: 'Noor Pharma', phone: '+216 50 123 456' },
  { name: 'TAWBA STORE', phone: '+216 98 654 321' },
  { name: 'Store 4 Eljem 2', phone: '+216 20 135 246' },
  { name: 'Aura Herbs', phone: '+216 40 246 135' },
  { name: 'ZOLTEC', phone: '+216 50 975 310' },
];

export const CUSTOMERS = [
  'وليد الماجري',
  'سعاد سعاد',
  'Mouhamed Omran',
  'Ayari Chayma',
  'Gaith Ben Salah',
  'Ali Trabelsi',
  'Ismail Remadi',
  'Omar Ben Salma',
  'Helmi Gharbi',
  'Ahmed Jlassi',
  'Sarra Mansour',
  'Mehdi Kacem',
  'Nour El Houda',
  'Oussama Saidi',
];

export const SUPPLIERS = ['Raouf', 'Aura Herbs', 'Store 4 Eljem', 'Gsm+', 'Noor Pharma', 'Tunisian Market', 'Maison Du Gadget', 'Beauty Lab', 'Sté Tarek Verre', 'Sotraleg', 'Atelier Cuir', 'Pep Electronics', 'Verre & Déco', 'Céramique El Aouina', 'Ets Bouzid', 'Bio Terre', 'Textile Nord', 'Sfax Import', 'GDH Distribution'];

export const FULFILLERS = ['Shipper Express', 'YesFulfil', 'Dropful Tunis', 'Pack & Send'];

export const WAREHOUSES = ['Agence Tunis', 'Agence El Jem', 'Agence Medenine', 'Agence Sfax'];

export const INCUBATORS = ['Incubateurs ME', 'ME - Digital', 'ME - Traditional'];

export const MANAGERS = ['Lina Khelifi', 'Saif Trading', 'Rim Bouazizi', 'Mohamed Amine'];

export const DEVELOPERS = ['Amina Ennet', 'Osama Dhieb', 'Salma Grira'];

export const ADDRESSES = [
  'Tunis, El Menzah 6, Rue 6182',
  'Sousse, El Kantaoui, Imm A',
  'Sfax, Route de l’Aéroport, Km 3',
  'Bizerte, Avenue Habib Bourguiba',
  'Nabeul, Dar Chaabane, Rue des Jasmins',
  'Gabès, Cité El Amel, Bloc B',
  'Ariana, Ezzahra, Residence Nour',
  'Monastir, Zone Touristique, Imm Mars',
];

export const PRODUCTS: { name: string; variation: string }[] = [
  { name: 'Robe Été Fleurie', variation: 'Taille: M / Couleur: Blanc' },
  { name: 'Chargeur Sans Fil 15W', variation: 'Couleur: Noir' },
  { name: 'Montre Connectée X8', variation: 'Bracelet: Silicone / Couleur: Noir' },
  { name: 'Sérum Vitamine C', variation: 'Format: 30ml' },
  { name: 'Sac à Main Cuir', variation: 'Couleur: Marron' },
  { name: 'Porte-Bébé Confort', variation: 'Capacité: 0-2 ans' },
  { name: 'Lampe LED Pro', variation: 'Puissance: 20W / Blanc froid' },
  { name: 'Coffret Parfum Noble', variation: 'Format: 100ml' },
  { name: 'Sneakers Sport Homme', variation: 'Pointure: 42 / Blanc' },
  { name: 'Tapis Yoga 8mm', variation: 'Couleur: Violet' },
];

export const TOOLS = ['🛒', '🗒️', '🏬', '⚡', '📦', '☎️', '🔁', '⏰', '🛠️', '🛍️'];

export function buildShipments(): Shipment[] {
  const rand = mulberry32(20260819);
  const shipments: Shipment[] = [];
  const now = new Date();

  const make = (id: number, seed: {
    order_type: string;
    status: string;
    createdDaysAgo: number;
    createdHour: number;
    retailer: { name: string; phone: string };
    suppliers: string[];
    attempt_count: number;
    cod: number;
    cost: number;
    product: { name: string; variation: string };
    tracking: string[];
  }): Shipment => {
    const created = new Date(now.getTime() - seed.createdDaysAgo * 24 * HOUR - seed.createdHour * HOUR);
    const iso = created.toISOString();
    const status = seed.status;

    const sd: Record<string, { icon: ShipmentStatusIcon; text: string }> = {
      Pending:
        rand() < 0.5
          ? { icon: 'truck', text: 'Awaiting products arrival to fulfillment center' }
          : { icon: 'dropbox', text: 'Awaiting packaging' },
      'Awaiting packaging': { icon: 'dropbox', text: 'Awaiting packaging' },
      Shipped: { icon: 'truck', text: 'In transit to destination' },
      'Delivery Issue': { icon: 'clock', text: 'Delivery issue reported' },
      Delivered: { icon: 'clock', text: 'Delivered successfully' },
    };
    const statusMeta = sd[status] ?? { icon: 'clock' as ShipmentStatusIcon, text: status };

    const incubators = [INCUBATORS[Math.floor(rand() * INCUBATORS.length)] ?? INCUBATORS[0]!];
    const managers = [MANAGERS[Math.floor(rand() * MANAGERS.length)] ?? MANAGERS[0]!];
    if (managers.length === 1 && rand() < 0.3) {
      const extra = MANAGERS.find((m) => m !== managers[0]);
      if (extra) managers.push(extra);
    }
    const devs = [DEVELOPERS[Math.floor(rand() * DEVELOPERS.length)] ?? DEVELOPERS[0]!];

    const expectShippingFrom = new Date(created.getTime() + 6 * HOUR).toISOString();
    const expectShippingTo = new Date(created.getTime() + 18 * HOUR).toISOString();
    const expectDelivFrom = new Date(created.getTime() + 2 * 24 * HOUR).toISOString();
    const expectDelivTo = new Date(created.getTime() + 5 * 24 * HOUR).toISOString();
    const preparedAt = seed.attempt_count >= 0 ? new Date(created.getTime() + 8 * HOUR).toISOString() : null;
    const pickedUp = new Date(created.getTime() + 22 * HOUR);
    const firstAttempt = new Date(created.getTime() + 2 * 24 * HOUR + 4 * HOUR);
    const lastAttempt = new Date(firstAttempt.getTime() + seed.attempt_count * 26 * HOUR);
    const delivered = new Date(lastAttempt.getTime() + 3 * HOUR);
    const isoFirst = firstAttempt.toISOString();
    const isoLast = lastAttempt.toISOString();
    const isoDelivered = delivered.toISOString();
    const updated = status === 'Delivered' ? isoDelivered : status === 'Pending' ? iso : isoLast;

    const codSettled = status !== 'Pending';
    const verifiedBy = status === 'Delivered' ? (rand() < 0.5 ? 'Chef Fulfilment' : 'Carrier Portal') : null;

    return {
      id,
      gid: pad(id, 8),
      order_type: seed.order_type,
      account_incubators: incubators,
      account_managers: managers,
      business_developers: devs,
      retailer_name: seed.retailer.name,
      retailer_phone: seed.retailer.phone,
      suppliers: seed.suppliers,
      fulfiller: FULFILLERS[Math.floor(rand() * FULFILLERS.length)] ?? null,
      warehouse: WAREHOUSES[Math.floor(rand() * WAREHOUSES.length)] ?? null,
      created_at: iso,
      updated_at: updated,
      fullfillable_at: new Date(created.getTime() + 2 * HOUR).toISOString(),
      prepared_at: preparedAt,
      picked_up_at: pickedUp.toISOString(),
      first_carrier_attempt_at: isoFirst,
      last_carrier_attempt_at: isoLast,
      delivery_issue_resolved_at: null,
      delivery_issue_reason: status === 'Delivery Issue' ? 'Customer not reachable' : null,
      attempt_count: seed.attempt_count,
      delivered_at: status === 'Delivered' ? isoDelivered : null,
      last_carrier_update_at: updated,
      expected_shipping_date_from: expectShippingFrom,
      expected_shipping_date_to: expectShippingTo,
      expected_delivery_date_from: expectDelivFrom,
      expected_delivery_date_to: expectDelivTo,
      delivery_verified_at: verifiedBy ? isoDelivered : null,
      delivery_verified_by: verifiedBy,
      marked_delivered_post_verification: verifiedBy === 'Carrier Portal',
      carrier_refunded: status === 'Delivery Issue' && rand() < 0.4,
      client_refunded: status === 'Delivery Issue' && rand() < 0.3,
      cod_settlement_status: codSettled ? (rand() < 0.7 ? 'Settled' : 'Pending') : null,
      cod_settlement_at: codSettled ? isoDelivered : null,
      receivables_status: rand() < 0.8 ? 'Collected' : 'Pending',
      carrier_cod_payment_amount: seed.cod ? Math.round(seed.cod * 0.92) : null,
      carrier_cod_payment_status:
        status === 'Pending' || status === 'Awaiting packaging' ? 'Pending' : rand() < 0.5 ? 'Paid' : 'Pending',
      address: ADDRESSES[Math.floor(rand() * ADDRESSES.length)] ?? null,
      status,
      status_icon: statusMeta.icon,
      status_detail: statusMeta.text,
      customer_name: CUSTOMERS[Math.floor(rand() * CUSTOMERS.length)] ?? null,
      customer_call: rand() < 0.5,
      tracking_numbers: seed.tracking,
      product_name: seed.product.name,
      product_variation: seed.product.variation,
      quantity: 1 + Math.floor(rand() * 3),
      image_url: null,
      cost: seed.cost,
      cod_amount: seed.cod,
    };
  };

  let seq = 563010;
  for (let i = 0; i < 54; i++) {
    const order_type = SHIPMENT_ORDER_TYPES[Math.floor(rand() * SHIPMENT_ORDER_TYPES.length)] ?? 'Dropshipping';
    const statusRoll = rand();
    const status =
      statusRoll < 0.5 ? 'Pending' : statusRoll < 0.7 ? 'Awaiting packaging' : statusRoll < 0.84 ? 'Shipped' : statusRoll < 0.93 ? 'Delivery Issue' : 'Delivered';

    const supplierCount = 1 + Math.floor(rand() * 2);
    const suppliers: string[] = [];
    for (let s = 0; s < supplierCount; s++) {
      const pick = SUPPLIERS[Math.floor(rand() * SUPPLIERS.length)];
      if (pick && !suppliers.includes(pick)) suppliers.push(pick);
    }

    const product = PRODUCTS[Math.floor(rand() * PRODUCTS.length)] ?? PRODUCTS[0]!;
    const cost = Math.round((20 + rand() * 150) * 1000) / 1000;
    const cod = Math.round((cost * (1.2 + rand() * 0.8)) * 1000) / 1000;

    const shipped = status === 'Shipped' || status === 'Delivered' || status === 'Delivery Issue';
    const tracking: string[] = [];
    if (shipped) {
      const trackingCount = 1 + Math.floor(rand() * 2);
      for (let t = 0; t < trackingCount; t++) {
        tracking.push(`TUN${pad(seq - 400 + i * 3 + t, 8)}`);
      }
    }

    shipments.push(
      make(seq - i, {
        order_type,
        status,
        createdDaysAgo: 14 + Math.floor(rand() * 40),
        createdHour: Math.floor(rand() * 12),
        retailer: RETAILERS[Math.floor(rand() * RETAILERS.length)] ?? RETAILERS[0]!,
        suppliers: suppliers.length ? suppliers : [SUPPLIERS[0]!],
        attempt_count: status === 'Pending' ? 0 : 1 + Math.floor(rand() * 3),
        cod,
        cost,
        product,
        tracking,
      })
    );
  }

  shipments.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return shipments;
}