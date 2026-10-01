export const LEADS_TOTAL = 0;

export type LeadSource = 'organic' | 'manual' | 'import' | 'referral' | 'paid' | 'other' | 'social_media' | 'directory' | 'event' | 'competition_data';
export type LeadType = 'retailer' | 'supplier' | 'unknown' | 'retailer_supplier';
export type LeadStatus = 'New' | 'Contacted' | 'Trial' | 'Closed Won' | 'Closed Lost' | 'No Answer' | 'Opt Out';

export interface LeadFollowUp {
  agent: string;
  avatar: string | null;
  type: string | null;
  at: string | null;
  confirmed: boolean;
  note: string | null;
  history: number;
}

export interface SalesAgent {
  name: string;
  avatar: string | null;
}

export interface Lead {
  id: number;
  gid: string;
  name: string;
  phone_full: string;
  phone_masked: string;
  email: string | null;
  link: string | null;
  link2: string | null;
  link3: string | null;
  review: string | null;
  location: string | null;
  source: LeadSource;
  type: LeadType;
  status: LeadStatus;
  est_mv: number | null;
  organization: { name: string; code: string; kind: LeadType } | null;
  has_order: boolean;
  has_withdrawal: boolean;
  orders_30d: number;
  labels: string[];
  sales_agent: SalesAgent | null;
  created_by: string | null;
  follow_up: LeadFollowUp | null;
  notes_count: number;
  last_submitted_at: string;
  created_at: string;
  last_follow_up_at: string | null;
}

export interface LeadsQuery {
  page: number;
  per_page: number;
  q?: string;
  sort?: string;
  dir?: string;
  source?: string;
  type?: string;
  status?: string;
  location?: string;
  has_order?: string;
}

export interface LeadsResult {
  rows: Lead[];
  total: number;
  page: number;
  per_page: number;
}

export const SOURCES: LeadSource[] = ['organic', 'manual', 'import', 'referral', 'paid', 'social_media', 'directory', 'event', 'competition_data', 'other'];
export const TYPES: LeadType[] = ['retailer', 'supplier', 'unknown', 'retailer_supplier'];
export const STATUSES: LeadStatus[] = ['New', 'Contacted', 'Trial', 'Closed Won', 'Closed Lost', 'No Answer', 'Opt Out'];

export const AVATARS: Record<string, string> = {
  'Ali Boussaid': 'https://cdn.shipper.network/storage/shipper-network-service-tunisia/uploads/user-avatar/9725765/69aac637176dc-1772799543.png',
  'Sirine Amri': 'https://cdn.shipper.network/storage/shipper-network-service-tunisia/uploads/user-avatar/9881763/69c44587ca922-1774470535.png',
  'Amal Warteni': 'https://cdn.shipper.network/storage/shipper-network-service-tunisia/uploads/user-avatar/9207317/696e089e3d16f-1768818846.png',
};

export const SALES_AGENTS = [
  { name: 'Ali Boussaid', avatar: AVATARS['Ali Boussaid'] },
  { name: 'Sirine Amri', avatar: AVATARS['Sirine Amri'] },
  { name: 'Amal Warteni', avatar: AVATARS['Amal Warteni'] },
];

export function searchLeads(query: LeadsQuery): LeadsResult {
  return { rows: [], total: 0, page: query.page, per_page: query.per_page };
}

export const COUNTRY_OPTIONS = [
  { id: 227, name: 'Tunisia', dial: '+216', code: 'TN' },
  { id: 75, name: 'France', dial: '+33', code: 'FR' },
  { id: 3, name: 'Algeria', dial: '+213', code: 'DZ' },
  { id: 147, name: 'Morocco', dial: '+212', code: 'MA' },
  { id: 226, name: 'Turkey', dial: '+90', code: 'TR' },
  { id: 177, name: 'Saudi Arabia', dial: '+966', code: 'SA' },
  { id: 225, name: 'UAE', dial: '+971', code: 'AE' },
  { id: 60, name: 'Egypt', dial: '+20', code: 'EG' },
  { id: 74, name: 'Germany', dial: '+49', code: 'DE' },
  { id: 78, name: 'Italy', dial: '+39', code: 'IT' },
  { id: 168, name: 'Qatar', dial: '+974', code: 'QA' },
  { id: 180, name: 'Spain', dial: '+34', code: 'ES' },
  { id: 72, name: 'Belgium', dial: '+32', code: 'BE' },
  { id: 204, name: 'Switzerland', dial: '+41', code: 'CH' },
  { id: 71, name: 'Canada', dial: '+1', code: 'CA' },
  { id: 216, name: 'United States', dial: '+1', code: 'US' },
  { id: 211, name: 'United Kingdom', dial: '+44', code: 'GB' },
  { id: 125, name: 'Libya', dial: '+218', code: 'LY' },
  { id: 30, name: 'China', dial: '+86', code: 'CN' },
];

export const FULFILLMENT_LOCATIONS = [
  'Tunis > Tunis',
  'Tunis > La Marsa',
  'Tunis > Le Bardo',
  'Ariana > Ariana',
  'Ben Arous > Radès',
  'Ben Arous > Megrine',
  'Nabeul > Hammamet',
  'Nabeul > Dar Chaâbane',
  'Sousse > Sousse City',
  'Sousse > Msaken',
  'Monastir > Monastir',
  'Mahdia > Mahdia',
  'Sfax > Sfax Ville',
  'Kairouan > Kairouan',
  'Bizerte > Bizerte',
  'Zaghouan > Zaghouan',
  'Manouba > La Manouba',
];

export interface LeadsOptions {
  sources: LeadSource[];
  types: LeadType[];
  statuses: LeadStatus[];
  locations: (string | null)[];
  agents: SalesAgent[];
  countries: { id: number; name: string; dial: string; code: string }[];
  total: number;
}

export function getLeadsOptions(): LeadsOptions {
  return {
    sources: [...SOURCES],
    types: [...TYPES],
    statuses: [...STATUSES],
    locations: [],
    agents: SALES_AGENTS.map((a) => ({ ...a })),
    countries: [...COUNTRY_OPTIONS],
    total: LEADS_TOTAL,
  };
}
