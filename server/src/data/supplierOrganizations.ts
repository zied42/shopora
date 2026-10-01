import { at, mulberry32, pad, MANAGERS } from './shipments';
import { ownerAvatarFor } from './avatars';

export const SUPPLIER_ORGANIZATIONS_TOTAL = 1590;

export const SUPPLIER_SOURCES = [
  'Referrals',
  'Search',
  'Facebook',
  'TikTok',
  'Instagram',
  'B2B partners',
  'Expo',
  'Not attributed',
];

export const SUPPLIER_STATUSES = [
  'Active',
  'Has added products',
  'Has active products',
  'Has packing material',
  'Has active warehouses',
  'Has active subscriptions',
];

export interface SupplierFollowUp {
  person: string;
  label: string;
  note: string | null;
  meeting: 'Called' | 'Recall' | 'Busy' | 'Unreachable' | 'Not Qualified' | 'Follow Up' | 'Face to Face Meeting' | 'Online Meeting';
  scheduled_at: string;
  confirmed: boolean;
  outcome?: string;
  by?: string;
  tags?: string[];
  attachments?: string[];
}

export interface SupplierOrganization {
  id: number;
  code: string;
  account_manager: string | null;
  owner_name: string;
  owner_photo?: string | null;
  org_name: string;
  city: string;
  email: string;
  phone: string;
  phone_full: string;
  tax_id: string;
  registration_pct: number;
  rne_code: string;
  main_type_supplier: boolean;
  onboarding: { label: string; ok: boolean }[];
  documents: 'no_document' | 'no_contract' | 'missing' | null;
  follow_up: SupplierFollowUp | null;
  source: string;
  labels: string[];
  joined_at: string;
  last_seen_at: string;
}

export interface SupplierOrganizationDetail extends SupplierOrganization {
  about: string | null;
  role: string;
  entity_type: string;
  national_id: string | null;
  vat_code: string | null;
  branch_number: string | null;
  legal_name: string | null;
  related_seller: { name: string; code: string } | null;
  affiliated_by: { name: string; code: string } | null;
  call_schedule: boolean;
  orders_prep_average_time: string | null;
  fulfillment_rate: number | null;
  on_time_fulfillment_rate: number | null;
  allow_marketplace: boolean;
  dropshipping_eligible: boolean;
  account_status: 'active' | 'registration_uncompleted' | 'inactive';
  business_developer: string | null;
  doc_files: Record<string, string>;
  doc_statuses: Record<string, string>;
}

const OWNER_NAMES = [
  'tarek jlassi',
  'Hedi Ben Ali',
  'Nizar Mahfoudh',
  'Walid Chemkhi',
  'Slim Gharbi',
  'Mohamed Ali Haddad',
  'Yosr Laabidi',
  'Aymen Mnasser',
  'Elies Bouzid',
  'Riadh Kacem',
  'Mounir Trabelsi',
  'Sonia Masmoudi',
  'Fethi Bouazizi',
  'Karim Sassi',
  'Amal Haddad',
  'Zied Ben salah',
  'Ghazi Naceur',
  'Leila Ayari',
  'Hamdi Chatti',
  'Insaf Dridi',
];

const ORG_NAMES = [
  'Sté Tarek Verre',
  'Maison Du Gadget',
  'Aura Herbs',
  'Store 4 Eljem',
  'Beauty Lab',
  'Sotraleg',
  'Atelier Cuir',
  'Pep Electronics',
  'Tunisian Market',
  'Verre & Déco',
  'Céramique El Aouina',
  'Ets Bouzid',
  'Bio Terre',
  'Textile Nord',
  'Sfax Import',
  'GDH Distribution',
];

const CITIES = [
  'Tunis, Tunisia',
  'Sousse, Tunisia',
  'Sfax, Tunisia',
  'Nabeul, Tunisia',
  'Bizerte, Tunisia',
  'Monastir, Tunisia',
  'Gabès, Tunisia',
  'Ariana, Tunisia',
  'Kairouan, Tunisia',
  'Medenine, Tunisia',
  'Béja, Tunisia',
  'Kasserine, Tunisia',
];

const FOLLOW_UP_LABELS = [
  'Account activation',
  'paiement encontre',
  'suivi commande',
  'relance',
  'prospection',
  'plan d\'appel',
  'confirmation',
  'négociation prix',
];

const FOLLOW_UP_NOTES = [
  'Client a demandé des échantillons.',
  'Attente des documents légaux.',
  'Suivi après première commande.',
  'Vérifier la disponibilité du stock.',
  'Demande de devis en gros.',
  null,
];

const OUTCOMES = [
  'Signed contract',
  'Ready to activate',
  'Product sample sent',
  'Waiting for docs',
  'Deal won',
];

const STAFF = [...MANAGERS, 'Nada Saidi', 'Youssef Belhaj', 'Ikram Baccouche', 'Aymen Jlassi', 'Chaima Tlili'];

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

function makeCode(i: number): string {
  const l1 = LETTERS[(i * 7) % 24] ?? 'A';
  const l2 = LETTERS[((i * 13) + 3) % 24] ?? 'A';
  const n = 1000 + ((i * 137) % 9000);
  return `${l1}${l2}${pad(n, 4)}`;
}

function makeRelCode(seed: string): string {
  let h = 7;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const n = (h % 900) + 100;
  return `${LETTERS[h % 24] ?? 'A'}${LETTERS[(h >> 5) % 24] ?? 'B'}${n}`;
}

function makeTaxId(rand: () => number): string {
  return `${pad(Math.floor(rand() * 9000000) + 1000000, 7)}${LETTERS[Math.floor(rand() * LETTERS.length)] ?? 'W'}`;
}

function makeFollowUp(rand: () => number, owner: string): SupplierFollowUp | null {
  if (rand() > 0.78) return null;
  const confirmed = rand() < 0.35;
  return {
    person: rand() < 0.5 ? owner : (STAFF[Math.floor(rand() * STAFF.length)] ?? STAFF[0]!),
    label: FOLLOW_UP_LABELS[Math.floor(rand() * FOLLOW_UP_LABELS.length)] ?? 'Account activation',
    note: FOLLOW_UP_NOTES[Math.floor(rand() * FOLLOW_UP_NOTES.length)] ?? null,
    meeting: (['Online Meeting', 'Face to Face Meeting', 'Follow Up'] as const)[Math.floor(rand() * 3)],
    scheduled_at: at(1 + Math.floor(rand() * 20), 8 + Math.floor(rand() * 11), Math.floor(rand() * 60)),
    confirmed,
    ...(confirmed ? { outcome: OUTCOMES[Math.floor(rand() * OUTCOMES.length)] ?? 'Signed contract', by: STAFF[Math.floor(rand() * STAFF.length)] ?? STAFF[0]! } : {}),
  };
}

function makeRow(i: number): SupplierOrganization {
  const rand = mulberry32(20260823 + i);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)] ?? arr[0]!;

  const owner = pick(OWNER_NAMES);
  const orgName = pick(ORG_NAMES);
  const city = pick(CITIES);
  const joinedAt = at(30 + Math.floor(rand() * 380), 8 + Math.floor(rand() * 11), Math.floor(rand() * 60));
  const seenAt = at(Math.floor(rand() * 30), Math.floor(rand() * 24), Math.floor(rand() * 60));

  const added = Math.floor(rand() * 4);
  const active = rand() < 0.3 ? 0 : 1 + Math.floor(rand() * 6);
  const warehouses = rand() < 0.4 ? 0 : 1 + Math.floor(rand() * 3);

  const onboarding: { label: string; ok: boolean }[] = [
    { label: 'Active', ok: true },
    { label: `Has ${added} added products`, ok: added > 0 },
    { label: `Has ${active} active products`, ok: active > 0 },
    { label: 'Has packing material', ok: rand() < 0.6 },
    { label: `Has ${warehouses} active warehouses`, ok: warehouses > 0 },
    { label: 'Has active subscriptions', ok: rand() < 0.4 },
  ];

  const lastTwo = Math.floor(rand() * 100);
  const phoneMask = `+216 ** *** *${pad(lastTwo, 2)}`;
  const phoneFull = `+216 ${pad(1 + Math.floor(rand() * 9), 1)}${pad(Math.floor(rand() * 10), 1)} ${pad(Math.floor(rand() * 900) + 100, 3)} ${pad(Math.floor(rand() * 10), 1)}${pad(lastTwo, 2)}`;

  const docRoll = rand();
  const documents = docRoll < 0.45 ? 'no_document' : docRoll < 0.7 ? 'no_contract' : docRoll < 0.9 ? 'missing' : null;

  return {
    id: 90715 + i * 2,
    code: makeCode(i),
    account_manager: rand() < 0.55 ? null : (STAFF[Math.floor(rand() * STAFF.length)] ?? null),
    owner_name: owner,
    owner_photo: ownerAvatarFor(owner),
    org_name: orgName,
    city,
    email: `${owner.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '')}@gmail.com`,
    phone: phoneMask,
    phone_full: phoneFull,
    tax_id: makeTaxId(rand),
    registration_pct: 55 + Math.floor(rand() * 45),
    rne_code: pad(Math.floor(rand() * 900000) + 100000, 6),
    main_type_supplier: rand() < 0.75,
    onboarding,
    documents,
    follow_up: makeFollowUp(rand, owner),
    source: SUPPLIER_SOURCES[Math.floor(rand() * SUPPLIER_SOURCES.length)] ?? SUPPLIER_SOURCES[0]!,
    labels: [],
    joined_at: joinedAt,
    last_seen_at: seenAt,
  };
}

let cache: SupplierOrganization[] | null = null;
function allRows(): SupplierOrganization[] {
  if (!cache) cache = Array.from({ length: SUPPLIER_ORGANIZATIONS_TOTAL }, (_, i) => makeRow(i));
  return cache;
}

export interface SupplierOrganizationsQuery {
  page: number;
  per_page: number;
  q?: string;
  search_field?: string;
  sort?: string;
  dir?: 'asc' | 'desc';
  statuses?: string[];
  sources?: string[];
  main_type?: boolean;
}

export interface SupplierOrganizationsResult {
  rows: SupplierOrganization[];
  total: number;
  filters: { statuses: string[]; sources: string[] };
  page: number;
  per_page: number;
}

const SORT_FIELDS: Record<string, (r: SupplierOrganization) => string> = {
  name: (r) => r.org_name,
  code: (r) => r.code,
  joined_at: (r) => r.joined_at,
  last_seen_at: (r) => r.last_seen_at,
  source: (r) => r.source,
  follow_up: (r) => (r.follow_up ? '1' : '0'),
  documents: (r) => (r.documents ? '1' : '0'),
};

export function getSupplierOrganization(id: number): SupplierOrganization | null {
  return allRows().find((r) => r.id === id) ?? null;
}

export function getSupplierOrganizationDetail(id: number): SupplierOrganizationDetail | null {
  const r = getSupplierOrganization(id);
  if (!r) return null;
  const rand = mulberry32(20260823 + (r.id - 90715) / 2);
  const relatedSeller = rand() < 0.7
    ? {
        name: r.org_name,
        code: makeRelCode(`RS${r.code}`),
      }
    : null;
  const affiliatedBy = rand() < 0.7
    ? {
        name: r.owner_name,
        code: makeRelCode(`AB${r.code}`),
      }
    : null;
  return {
    ...r,
    about: rand() < 0.6 ? r.org_name.toLowerCase() : null,
    role: 'supplier',
    entity_type: 'business',
    national_id: rand() < 0.3 ? pad(Math.floor(rand() * 10000000) + 1000000, 8) : null,
    vat_code: null,
    branch_number: null,
    legal_name: null,
    related_seller: relatedSeller,
    affiliated_by: affiliatedBy,
    call_schedule: rand() < 0.4,
    orders_prep_average_time: null,
    fulfillment_rate: rand() < 0.5 ? Math.floor(rand() * 40) + 60 : null,
    on_time_fulfillment_rate: rand() < 0.5 ? Math.floor(rand() * 40) + 55 : null,
    allow_marketplace: rand() < 0.6,
    dropshipping_eligible: false,
    account_status: 'active',
    business_developer: null,
    doc_files: {},
    doc_statuses: {},
  };
}

export function searchSupplierOrganizations(query: SupplierOrganizationsQuery): SupplierOrganizationsResult {
  const rows = allRows();
  const q = (query.q ?? '').trim().toLowerCase();
  const field = query.search_field || 'any';
  const statuses = query.statuses ?? [];
  const sources = query.sources ?? [];
  const sort = query.sort && SORT_FIELDS[query.sort] ? query.sort : 'joined_at';
  const dir = query.dir === 'asc' ? 1 : -1;

  const matches: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    if (statuses.length && !r.onboarding.some((o) => statuses.includes(o.label))) continue;
    if (sources.length && !sources.includes(r.source)) continue;
    if (query.main_type && !r.main_type_supplier) continue;
    if (q) {
      const hay = (() => {
        if (field === 'organization') return `${r.org_name} ${r.code}`;
        if (field === 'phone') return `${r.phone} ${r.phone_full}`;
        if (field === 'user') return r.owner_name;
        if (field === 'email') return r.email;
        return `${r.org_name} ${r.owner_name} ${r.code} ${r.phone} ${r.email}`;
      })().toLowerCase();
      if (!hay.includes(q)) continue;
    }
    matches.push(i);
  }

  const getVal = SORT_FIELDS[sort]!;
  matches.sort((a, b) => {
    const va = getVal!(rows[a]!);
    const vb = getVal!(rows[b]!);
    if (va < vb) return -dir;
    if (va > vb) return dir;
    return (rows[a]!.id - rows[b]!.id) * dir;
  });

  const total = matches.length;
  const start = (query.page - 1) * query.per_page;
  const pageRows = matches.slice(start, start + query.per_page).map((i) => rows[i]!);

  const statusOptions = Array.from(new Set(rows.flatMap((r) => r.onboarding.map((o) => o.label))));

  return {
    rows: pageRows,
    total,
    filters: { statuses: statusOptions, sources: [...SUPPLIER_SOURCES] },
    page: query.page,
    per_page: query.per_page,
  };
}