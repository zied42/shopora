import { at, mulberry32, pad, MANAGERS, SUPPLIERS } from './shipments';
import { ownerAvatarFor } from './avatars';

export const SELLER_ORGANIZATIONS_TOTAL = 43_486;

export const SELLER_SOURCES = ['Word of mouth', 'Search', 'Facebook', 'TikTok', 'Instagram', 'Not attributed'];

export const SELLER_STATUSES = [
  'Uncompleted registration',
  'Complete registration',
  'Email Verified',
  'Has 0 subscriptions',
  'Has 0 orders',
  'Has 0 advance deposits',
  'Balance 0.000 TND',
] as const;

export type SellerStatus = (typeof SELLER_STATUSES)[number];

export interface SellerOrganization {
  id: number;
  code: string;
  account_manager: string | null;
  owner_name: string;
  owner_photo?: string | null;
  org_name: string | null;
  phone: string;
  phone_full?: string;
  email: string;
  tags: string[];
  joined_at: string;
  last_seen_at: string;
  onboarding: { label: SellerStatus; ok: boolean }[];
  documents: 'none' | 'review';
  follow_up_new: boolean;
  source: string;
  is_main_retailer: boolean;
  plus_membership: boolean;
  supplier: string;
}

const OWNER_NAMES = [
  'Khalil Gabsi',
  'Bechir Ben mahmoud',
  'Mayssa Zouaoui',
  'Mariem Hentati',
  'Rafaa Rjiba',
  'Yassine Omri',
  'Zeyneb Hamdi',
  'Lamis litayem',
  'Hichri Marwa',
  'Hamdi Ben amar',
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
  'Sonia Ben Ali',
  'Amine Bouazizi',
  'Fares Toumi',
  'Ines Gharbi',
  'Wassim Karray',
  'Rania Sassi',
  'Sami Jendoubi',
  'Houda Marzouki',
  'Anis Dridi',
  'Sirine Chabaane',
  'Montassar Oueslati',
];

const ORG_NAMES = [
  'naturéabio',
  'Shoper',
  'TN Digital',
  'loulou',
  'My Shopping',
  'Infinity retail route',
  'Kontiza shop',
  'TAWBA STORE',
  'Store 4 Eljem 2',
  'Miss Rihab',
  'Aura Herbs',
  'Beauty Home',
  'Electro Fix',
  'Casa Lumière',
  'Top Discount',
  'Mode&Co',
];

const TAG_POOL = [
  'Confirmation sale',
  'Meilleure vente',
  'Suivi commande',
  'Négociation prix',
  'Budget ok',
  'Prospection',
  'Relance',
  'Essai gratuit',
  'Bons payeurs',
  'Perte produit',
  'Plan d\'appel',
  'Incubation set',
];

const ACC_MANAGERS = [...MANAGERS, 'Nada Saidi', 'Youssef Belhaj', 'Ikram Baccouche', 'Aymen Jlassi', 'Chaima Tlili'];

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

function makeCode(i: number): string {
  const l1 = LETTERS[Math.floor(i / 26) % 24] ?? 'A';
  const l2 = LETTERS[i % 24] ?? 'A';
  const n = 1000 + ((i * 37) % 9000);
  return `${l1}${l2}${pad(n, 4)}`;
}

function makeRow(i: number): SellerOrganization {
  const rand = mulberry32(20260822 + i);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)] ?? arr[0]!;

  const owner = pick(OWNER_NAMES);
  const joinedAt = at(30 + Math.floor(rand() * 380), 8 + Math.floor(rand() * 11), Math.floor(rand() * 60));
  const seenAt = at(Math.floor(rand() * 30), Math.floor(rand() * 24), Math.floor(rand() * 60));

  const onboarding: { label: SellerStatus; ok: boolean }[] = [];
  if (rand() < 0.55) onboarding.push({ label: 'Uncompleted registration', ok: false });
  else onboarding.push({ label: 'Complete registration', ok: true });
  onboarding.push({ label: 'Email Verified', ok: true });
  if (rand() < 0.7) onboarding.push({ label: 'Has 0 subscriptions', ok: false });
  if (rand() < 0.65) onboarding.push({ label: 'Has 0 orders', ok: false });
  if (rand() < 0.6) onboarding.push({ label: 'Has 0 advance deposits', ok: false });
  if (rand() < 0.9) onboarding.push({ label: 'Balance 0.000 TND', ok: false });

  const tagCount = Math.floor(rand() * 4);
  const tags = new Set<string>();
  for (let t = 0; t < tagCount; t++) tags.add(pick(TAG_POOL));

  const lastTwo = Math.floor(rand() * 100);
  const phoneMask = `+216 ** *** *${pad(lastTwo, 2)}`;
  const phoneFull = `+216 ${pad(1 + Math.floor(rand() * 9), 1)}${pad(Math.floor(rand() * 10), 1)} ${pad(Math.floor(rand() * 900) + 100, 3)} ${pad(Math.floor(rand() * 10), 1)}${pad(lastTwo, 2)}`;

  return {
    id: 90630 + i * 2,
    code: makeCode(i),
    account_manager: rand() < 0.5 ? null : (ACC_MANAGERS[Math.floor(rand() * ACC_MANAGERS.length)] ?? null),
    owner_name: owner,
    owner_photo: ownerAvatarFor(owner),
    org_name: rand() < 0.6 ? (ORG_NAMES[Math.floor(rand() * ORG_NAMES.length)] ?? null) : null,
    phone: phoneMask,
    phone_full: phoneFull,
    email: `${owner.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '')}@gmail.com`,
    tags: Array.from(tags),
    joined_at: joinedAt,
    last_seen_at: seenAt,
    onboarding,
    documents: rand() < 0.3 ? 'review' : 'none',
    follow_up_new: rand() < 0.35,
    source: SELLER_SOURCES[Math.floor(rand() * SELLER_SOURCES.length)] ?? SELLER_SOURCES[0]!,
    is_main_retailer: rand() < 0.35,
    plus_membership: rand() < 0.3,
    supplier: SUPPLIERS[Math.floor(rand() * SUPPLIERS.length)] ?? SUPPLIERS[0]!,
  };
}

let cache: SellerOrganization[] | null = null;
function allRows(): SellerOrganization[] {
  if (!cache) cache = Array.from({ length: SELLER_ORGANIZATIONS_TOTAL }, (_, i) => makeRow(i));
  return cache;
}

export interface SellerOrganizationsQuery {
  page: number;
  per_page: number;
  q?: string;
  search_field?: string;
  sort?: string;
  dir?: 'asc' | 'desc';
  statuses?: string[];
  sources?: string[];
  main_retailer?: boolean;
  plus_membership?: boolean;
}

export interface SellerOrganizationsResult {
  rows: SellerOrganization[];
  total: number;
  filters: { statuses: string[]; sources: string[] };
  page: number;
  per_page: number;
}

const SORT_FIELDS: Record<string, (r: SellerOrganization) => string> = {
  name: (r) => r.org_name ?? r.owner_name,
  code: (r) => r.code,
  joined_at: (r) => r.joined_at,
  last_seen_at: (r) => r.last_seen_at,
  source: (r) => r.source,
  follow_up: (r) => (r.follow_up_new ? '1' : '0'),
  documents: (r) => (r.documents === 'review' ? '1' : '0'),
};

export function getSellerOrganization(id: number): SellerOrganization | null {
  return allRows().find((r) => r.id === id) ?? null;
}

export function searchSellerOrganizations(query: SellerOrganizationsQuery): SellerOrganizationsResult {
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
    if (query.main_retailer && !r.is_main_retailer) continue;
    if (query.plus_membership && !r.plus_membership) continue;
    if (q) {
      const hay = (() => {
        if (field === 'organization') return `${r.org_name ?? ''} ${r.code}`;
        if (field === 'phone') return r.phone;
        if (field === 'user') return r.owner_name;
        if (field === 'email') return r.email;
        return `${r.org_name ?? ''} ${r.owner_name} ${r.code} ${r.phone} ${r.email}`;
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

  return {
    rows: pageRows,
    total,
    filters: { statuses: [...SELLER_STATUSES] as string[], sources: [...SELLER_SOURCES] },
    page: query.page,
    per_page: query.per_page,
  };
}