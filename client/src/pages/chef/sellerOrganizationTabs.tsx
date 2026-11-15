import { useState } from 'react';
import {
  BoxIcon,
  CarrierLogo,
  CheckIcon,
  CheckRow,
  ClockIcon,
  FileCircleXmarkIcon,
  FilterOverlay,
  FunnelIcon,
  HeartCrackIcon,
  Pagination,
  PersonRow,
  PhoneIcon,
  RotateIcon,
  SearchIcon,
  TableColumnsIcon,
  ThContent,
  XmarkIcon,
  dateOnly,
  tnd,
} from './ui';

/* ═══════════════════════════ local icons ═══════════════════════════ */

function CaretDownIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 320 512" fill="currentColor" aria-hidden="true">
      <path d="M137.4 374.6c12.5 12.5 32.8 12.5 45.3 0l128-128c9.2-9.2 11.9-22.9 6.9-34.9s-16.6-19.8-29.6-19.8L32 192c-12.9 0-24.6 7.8-29.6 19.8s-2.2 25.7 6.9 34.9l128 128z" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M0 416c0 17.7 14.3 32 32 32h54.7c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H233.3c-12.3-28.3-40.5-48-73.3-48s-61 19.7-73.3 48H32c-17.7 0-32 14.3-32 32zm0-192c0 17.7 14.3 32 32 32h198.7c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H377.3c-12.3-28.3-40.5-48-73.3-48s-61 19.7-73.3 48H32c-17.7 0-32 14.3-32 32zm384-128c0 17.7-14.3 32-32 32s-32-14.3-32-32V64c0-17.7 14.3-32 32-32s32 14.3 32 32v32zm-224 0c0 17.7-14.3 32-32 32s-32-14.3-32-32V64c0-17.7 14.3-32 32-32s32 14.3 32 32v32z" />
    </svg>
  );
}

function HashIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="11" height="11" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M181.3 32.4c17.4 2.9 29.2 19.4 26.3 36.8L198.1 128h153.8l10.3-61.2c2.9-17.4 19.4-29.2 36.8-26.3s29.2 19.4 26.3 36.8L414.8 128H448c17.7 0 32 14.3 32 32s-14.3 32-32 32h-48.6l-19.4 115.2h51c17.7 0 32 14.3 32 32s-14.3 32-32 32h-65.2l-10.8 64.4c-2.9 17.4-19.4 29.2-36.8 26.3s-29.2-19.4-26.3-36.8l9.9-58.8H202.5l-10.8 64.4c-2.9 17.4-19.4 29.2-36.8 26.3s-29.2-19.4-26.3-36.8l9.9-58.8H64c-17.7 0-32-14.3-32-32s14.3-32 32-32h68.6l19.4-115.2H96c-17.7 0-32-14.3-32-32s14.3-32 32-32h42.6l10-59.6c2.9-17.4 19.4-29.2 36.8-26.3zM219.5 147.2L199 262.4h153.8l20.5-115.2H219.5z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true">
      <path d="M224 256c70.7 0 128-57.3 128-128S294.7 0 224 0S96 57.3 96 128s57.3 128 128 128zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512H418.3c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304H178.3z" />
    </svg>
  );
}

function BarcodeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M24 32C10.7 32 0 42.7 0 56V456c0 13.3 10.7 24 24 24H40c13.3 0 24-10.7 24-24V56c0-13.3-10.7-24-24-24H24zm88 0c-8.8 0-16 7.2-16 16V464c0 8.8 7.2 16 16 16s16-7.2 16-16V48c0-8.8-7.2-16-16-16zm72 0c-13.3 0-24 10.7-24 24V456c0 13.3 10.7 24 24 24h16c13.3 0 24-10.7 24-24V56c0-13.3-10.7-24-24-24H184zm96 0c-13.3 0-24 10.7-24 24V456c0 13.3 10.7 24 24 24h16c13.3 0 24-10.7 24-24V56c0-13.3-10.7-24-24-24H280zM448 56V456c0 13.3 10.7 24 24 24h16c13.3 0 24-10.7 24-24V56c0-13.3-10.7-24-24-24H472c-13.3 0-24 10.7-24 24zm-64-8V464c0 8.8 7.2 16 16 16s16-7.2 16-16V48c0-8.8-7.2-16-16-16s-16 7.2-16 16z" />
    </svg>
  );
}

function IdCardIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <rect x="2" y="9.5" width="20" height="1.8" opacity="0.4" />
      <circle cx="7.5" cy="13.2" r="1.7" fill="#fff" />
      <rect x="5" y="15" width="5" height="1.4" rx="0.7" fill="#fff" />
      <rect x="11.5" y="12" width="6" height="1.6" rx="0.8" fill="#fff" />
      <rect x="11.5" y="14.8" width="8" height="1.6" rx="0.8" fill="#fff" />
    </svg>
  );
}

function CreditCardIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="2" y="4.5" width="20" height="15" rx="2" />
      <rect x="2" y="9.5" width="20" height="2" opacity="0.4" />
      <rect x="4.5" y="12.5" width="4" height="2.6" rx="0.8" fill="#fff" opacity="0.9" />
      <rect x="10" y="13.4" width="6" height="1.4" rx="0.7" fill="#fff" />
      <rect x="10" y="15.4" width="7.5" height="1.4" rx="0.7" fill="#fff" />
    </svg>
  );
}

function FileLinesIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="4" y="2.5" width="16" height="19" rx="2" />
      <rect x="7" y="7" width="10" height="1.5" rx="0.75" fill="#fff" />
      <rect x="7" y="10" width="10" height="1.5" rx="0.75" fill="#fff" />
      <rect x="7" y="13" width="7" height="1.5" rx="0.75" fill="#fff" />
    </svg>
  );
}

/* ═══════════════════════════ Documents tab ══════════════════════════ */

type DocStatus = 'initialed' | 'under-review' | 'valid' | 'rejected';

const DOC_LABEL: Record<DocStatus, string> = {
  initialed: 'initialed',
  'under-review': 'Under review',
  valid: 'Valid',
  rejected: 'Rejected',
};

const DOC_BTN_CLS: Record<DocStatus, string> = {
  initialed: 'border-slate-200 bg-white text-slate-700',
  'under-review': 'border-transparent bg-gradient-to-r from-amber-500 to-amber-600 text-white',
  valid: 'border-transparent bg-gradient-to-r from-emerald-500 to-emerald-600 text-white',
  rejected: 'border-transparent bg-gradient-to-r from-rose-500 to-rose-600 text-white',
};

const DOC_DOT_CLS: Record<DocStatus, string> = {
  initialed: 'bg-slate-400',
  'under-review': 'bg-amber-200',
  valid: 'bg-emerald-200',
  rejected: 'bg-rose-200',
};

type DocDef = { id: string; title: string; icon: React.ReactNode };

const DOCS: DocDef[] = [
  { id: 'cin-front', title: 'CIN front page', icon: <IdCardIcon /> },
  { id: 'cin-back', title: 'CIN back page', icon: <CreditCardIcon /> },
  { id: 'patente', title: 'Patente', icon: <FileLinesIcon /> },
  { id: 'rne', title: 'Registre national des soci\u00e9t\u00e9s (RNE)', icon: <FileLinesIcon /> },
  { id: 'contract', title: 'Contract', icon: <FileLinesIcon /> },
];

function DocOption({ status, selected, onPick, cls }: { status: DocStatus; selected: boolean; onPick: () => void; cls: string }) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={`flex w-full items-center justify-between bg-gradient-to-r px-3 py-2 text-[11px] font-semibold text-white transition ${cls}`}
    >
      <span className="flex items-center gap-1.5">
        <span className={`inline-block h-2 w-2 rounded-full ${selected ? 'bg-white' : 'bg-white/60'}`} />
        {DOC_LABEL[status]}
      </span>
      {selected && <CheckIcon className="h-3 w-3" />}
    </button>
  );
}

function DocCard({
  title,
  icon,
  open,
  status,
  onToggle,
  onPick,
}: {
  title: string;
  icon: React.ReactNode;
  open: boolean;
  status: DocStatus;
  onToggle: () => void;
  onPick: (s: DocStatus) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
        {icon}
        {title}
      </label>
      <div className="flex justify-center py-5">
        <div className="flex h-[70px] w-[70px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-300">
          <FileCircleXmarkIcon className="h-7 w-7" />
        </div>
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={onToggle}
          className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-[11px] font-semibold transition ${DOC_BTN_CLS[status]}`}
        >
          <span className="flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-full ${DOC_DOT_CLS[status]}`} />
            {DOC_LABEL[status]}
          </span>
          <CaretDownIcon />
        </button>
        {open && (
          <div className="absolute left-0 top-full z-30 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
            <DocOption
              status="under-review"
              selected={status === 'under-review'}
              onPick={() => onPick('under-review')}
              cls="from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 rounded-t-lg"
            />
            <DocOption
              status="valid"
              selected={status === 'valid'}
              onPick={() => onPick('valid')}
              cls="from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500"
            />
            <DocOption
              status="rejected"
              selected={status === 'rejected'}
              onPick={() => onPick('rejected')}
              cls="from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 rounded-b-lg"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function DocumentsTab() {
  const [statuses, setStatuses] = useState<Record<string, DocStatus>>(() => Object.fromEntries(DOCS.map((d) => [d.id, 'initialed' as DocStatus])));
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div>
      <div className="flex justify-end px-4 pt-3">
        <button
          type="button"
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Edit documents
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
        {DOCS.slice(0, 2).map((d) => (
          <DocCard
            key={d.id}
            title={d.title}
            icon={d.icon}
            open={openId === d.id}
            status={statuses[d.id]}
            onToggle={() => setOpenId((cur) => (cur === d.id ? null : d.id))}
            onPick={(s) => {
              setStatuses((prev) => ({ ...prev, [d.id]: s }));
              setOpenId(null);
            }}
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 px-4 pb-4 md:grid-cols-3">
        {DOCS.slice(2).map((d) => (
          <DocCard
            key={d.id}
            title={d.title}
            icon={d.icon}
            open={openId === d.id}
            status={statuses[d.id]}
            onToggle={() => setOpenId((cur) => (cur === d.id ? null : d.id))}
            onPick={(s) => {
              setStatuses((prev) => ({ ...prev, [d.id]: s }));
              setOpenId(null);
            }}
          />
        ))}
      </div>
      <div className="px-4 pb-4">
        <button
          type="button"
          className="w-full rounded-lg bg-brand-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-700"
        >
          Save
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════ AQs tab ════════════════════════════════ */

export function AqsTab() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
        <h5 className="mb-0 text-sm font-bold text-slate-900">Assigned Questionnaires</h5>
        <div className="ms-auto flex items-center gap-1.5">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search questionaires"
              className="w-[190px] rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-7 pr-2 text-xs text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
            />
            <SearchIcon className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          <button type="button" className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50">
            <FunnelIcon className="mr-1 text-sky-600" />
            Filter
          </button>
          <button type="button" className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:bg-slate-50">
            <SlidersIcon />
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100">
              {['ID', 'Questionnaire', 'Trigger Event', 'Answered at', 'Created at'].map((h, i) => (
                <th key={h} className="whitespace-nowrap px-3 py-2 text-[11px] font-semibold text-slate-900">
                  <span className="flex items-center gap-1">
                    {h}
                    {i > 0 && (
                      <span className="text-sky-600">
                        <svg width="9" height="9" viewBox="0 0 320 512" fill="currentColor" aria-hidden="true">
                          <path d="M137.4 41.4c12.5-12.5 32.8-12.5 45.3 0l128 128c9.2 9.2 11.9 22.9 6.9 34.9s-16.6 19.8-29.6 19.8H32c-12.9 0-24.6-7.8-29.6-19.8s-2.2-25.7 6.9-34.9l128-128zm0 429.3l-128-128c-9.2-9.2-11.9-22.9-6.9-34.9s16.6-19.8 29.6-19.8H288c12.9 0 24.6 7.8 29.6 19.8s2.2 25.7-6.9 34.9l-128 128c-12.5 12.5-32.8 12.5-45.3 0z" />
                        </svg>
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="whitespace-nowrap border-b border-slate-50 bg-slate-50/40 transition">
              <td className="px-3 py-2 font-mono text-[11px] font-semibold text-sky-600">#45307</td>
              <td className="px-3 py-2 text-[11px] font-semibold text-slate-800">Retailer Onboarding (V2)</td>
              <td className="px-3 py-2 text-[11px] text-slate-400">—</td>
              <td className="px-3 py-2 text-[11px] text-slate-400">—</td>
              <td className="px-3 py-2 text-[11px] tabular-nums text-slate-600">20 Aug 2026</td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={1} />
    </div>
  );
}

/* ═══════════════════════════ tab pagination footer ══════════════════ */

function TabPagination({
  page,
  setPage,
  pageSize,
  setPageSize,
  from,
  to,
  total,
}: {
  page: number;
  setPage: (n: number) => void;
  pageSize: number;
  setPageSize: (n: number) => void;
  from: number;
  to: number;
  total: number;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages - 1);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
      <div className="flex items-center text-xs text-slate-600">
        <p className="mb-0 mr-2 whitespace-nowrap">Rows per page:</p>
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(0);
          }}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-brand-500"
        >
          {[5, 10, 20, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <p className="mb-0 ml-2 whitespace-nowrap text-[11px] text-slate-500">
          Showing: {from} to {to} of {total}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPage(Math.max(0, current - 1))}
          disabled={current === 0}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => setPage(Math.min(totalPages - 1, current + 1))}
          disabled={current >= totalPages - 1}
          className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

type ColDef = { id: string; label: string; funnel?: boolean; sort?: boolean; center?: boolean; end?: boolean };

/* ═══════════════════════════ Transfer shipments tab ══════════════════ */

const TS_SCOPES = [
  { id: 'id', label: 'Search Transfer shipments by #ID', icon: <HashIcon className="text-slate-400" /> },
  { id: 'org', label: 'Search Transfer shipments by Organization', icon: <UserIcon /> },
  { id: 'phone', label: 'Search Transfer shipments by Phone', icon: <PhoneIcon className="text-slate-400" /> },
  { id: 'tracking', label: 'Search Transfer shipments by Tracking number', icon: <BarcodeIcon /> },
] as const;

type TsScope = (typeof TS_SCOPES)[number]['id'];

type PaidStatus = 'failed' | 'pending' | 'successful';

type TsRow = {
  gid: number;
  client: string;
  shipToName: string;
  shipToCode: string;
  manager: string;
  developer: string;
  incubator: string;
  shipTo: string;
  created: string;
  delivered: string | null;
  status: 'rejected' | 'delivered' | 'packed';
  productQty: number;
  productName: string;
  packUnits: number;
  depositAmount: number;
  depositStatus: PaidStatus;
  paymentAmount: number;
  paymentStatus: PaidStatus;
  receivedUnits: number;
  totalUnits: number;
  carrier: 'aram' | 'shipper' | 'intigo' | null;
  tracking: string | null;
};

const TS_ROWS: TsRow[] = [
  { gid: 127, client: '1', shipToName: 'abdou shop', shipToCode: 'AN2970', manager: 'Rahma Hleli', developer: 'Amal Warteni', incubator: 'D\u00e9p\u00f4t 1 Le Kef', shipTo: 'abdou shop', created: '2026-08-20T09:12:00', delivered: null, status: 'rejected', productQty: 2, productName: 'seop 24 x 30', packUnits: 24, depositAmount: 46, depositStatus: 'failed', paymentAmount: 46, paymentStatus: 'failed', receivedUnits: 0, totalUnits: 100, carrier: 'aram', tracking: '900700145429725' },
  { gid: 126, client: '2', shipToName: 'yassine store', shipToCode: 'YK1188', manager: 'Yassine Gharbi', developer: 'Nadia Ben Salah', incubator: 'D\u00e9p\u00f4t 2 Sousse', shipTo: 'yassine store', created: '2026-08-18T14:30:00', delivered: '2026-08-20T08:02:00', status: 'delivered', productQty: 3, productName: 'Coca Cola 1L', packUnits: 12, depositAmount: 63, depositStatus: 'successful', paymentAmount: 63, paymentStatus: 'successful', receivedUnits: 36, totalUnits: 36, carrier: 'shipper', tracking: 'SHPR2398745' },
  { gid: 125, client: '3', shipToName: 'ghazi shop', shipToCode: 'GH2103', manager: 'Ghazi Trabelsi', developer: 'Amal Warteni', incubator: 'D\u00e9p\u00f4t 1 Le Kef', shipTo: 'ghazi shop', created: '2026-08-17T11:20:00', delivered: null, status: 'packed', productQty: 1, productName: 'Pampers New Baby 60', packUnits: 4, depositAmount: 39, depositStatus: 'pending', paymentAmount: 39, paymentStatus: 'pending', receivedUnits: 0, totalUnits: 100, carrier: 'intigo', tracking: 'INT4592310' },
  { gid: 124, client: '4', shipToName: 'sana market', shipToCode: 'SN3301', manager: 'Rahma Hleli', developer: 'Nadia Ben Salah', incubator: 'D\u00e9p\u00f4t 3 Gabes', shipTo: 'sana market', created: '2026-08-16T15:45:00', delivered: '2026-08-18T17:10:00', status: 'delivered', productQty: 5, productName: 'Savon de Marseille', packUnits: 24, depositAmount: 22, depositStatus: 'successful', paymentAmount: 22, paymentStatus: 'failed', receivedUnits: 200, totalUnits: 200, carrier: 'aram', tracking: 'AEX8871123' },
  { gid: 123, client: '5', shipToName: 'med boutique', shipToCode: 'MB2207', manager: 'Med Yassine', developer: 'Amal Warteni', incubator: 'D\u00e9p\u00f4t 4 Bizerte', shipTo: 'med boutique', created: '2026-08-15T10:05:00', delivered: null, status: 'rejected', productQty: 2, productName: 'T-shirt X-Kid', packUnits: 50, depositAmount: 55, depositStatus: 'failed', paymentAmount: 55, paymentStatus: 'failed', receivedUnits: 0, totalUnits: 100, carrier: 'shipper', tracking: 'SHPR8854120' },
  { gid: 122, client: '6', shipToName: 'aziz top', shipToCode: 'AZ9912', manager: 'Ghazi Trabelsi', developer: 'Rahma Hleli', incubator: 'D\u00e9p\u00f4t 1 Le Kef', shipTo: 'aziz top', created: '2026-08-14T12:40:00', delivered: null, status: 'packed', productQty: 4, productName: 'Omo Wash 2kg', packUnits: 10, depositAmount: 28, depositStatus: 'pending', paymentAmount: 28, paymentStatus: 'pending', receivedUnits: 0, totalUnits: 100, carrier: 'intigo', tracking: null },
  { gid: 121, client: '7', shipToName: 'nour express', shipToCode: 'NR8845', manager: 'Rahma Hleli', developer: 'Amal Warteni', incubator: 'D\u00e9p\u00f4t 2 Sousse', shipTo: 'nour express', created: '2026-08-13T09:55:00', delivered: '2026-08-15T16:22:00', status: 'delivered', productQty: 1, productName: 'Set 3 Serviettes', packUnits: 6, depositAmount: 12, depositStatus: 'successful', paymentAmount: 12, paymentStatus: 'successful', receivedUnits: 6, totalUnits: 6, carrier: 'aram', tracking: 'AEX1123766' },
  { gid: 120, client: '8', shipToName: 'lina store', shipToCode: 'LN7766', manager: 'Yassine Gharbi', developer: 'Nadia Ben Salah', incubator: 'D\u00e9p\u00f4t 5 Tunis', shipTo: 'lina store', created: '2026-08-12T13:15:00', delivered: null, status: 'rejected', productQty: 2, productName: 'Bonbon assorti 1kg', packUnits: 40, depositAmount: 19, depositStatus: 'failed', paymentAmount: 19, paymentStatus: 'failed', receivedUnits: 0, totalUnits: 100, carrier: 'shipper', tracking: 'SHPR9920112' },
  { gid: 119, client: '9', shipToName: 'hassen tech', shipToCode: 'HT2210', manager: 'Med Yassine', developer: 'Rahma Hleli', incubator: 'D\u00e9p\u00f4t 4 Bizerte', shipTo: 'hassen tech', created: '2026-08-11T08:30:00', delivered: null, status: 'packed', productQty: 6, productName: 'Sachet Soussou 1kg', packUnits: 20, depositAmount: 31, depositStatus: 'pending', paymentAmount: 31, paymentStatus: 'pending', receivedUnits: 0, totalUnits: 100, carrier: 'intigo', tracking: 'INT9027140' },
  { gid: 118, client: '10', shipToName: 'family shop', shipToCode: 'FM3309', manager: 'Rahma Hleli', developer: 'Amal Warteni', incubator: 'D\u00e9p\u00f4t 1 Le Kef', shipTo: 'family shop', created: '2026-08-10T17:05:00', delivered: '2026-08-12T10:48:00', status: 'delivered', productQty: 3, productName: 'Couscous 5kg', packUnits: 8, depositAmount: 18, depositStatus: 'successful', paymentAmount: 18, paymentStatus: 'successful', receivedUnits: 24, totalUnits: 24, carrier: 'aram', tracking: 'AEX4471288' },
];

const TS_COLS: ColDef[] = [
  { id: 'gid', label: 'GID', funnel: true, sort: true },
  { id: 'client', label: 'Client ID', funnel: true },
  { id: 'shipToOrg', label: 'Ship To Organization', funnel: true, sort: true },
  { id: 'manager', label: 'Account Manager', funnel: true },
  { id: 'developer', label: 'Business Developer', funnel: true },
  { id: 'incubator', label: 'Account Incubator', funnel: true },
  { id: 'shipTo', label: 'Ship To', funnel: true, sort: true },
  { id: 'created', label: 'Created at', funnel: true, sort: true },
  { id: 'delivered', label: 'Delivered at', funnel: true, sort: true },
  { id: 'status', label: 'Status', funnel: true },
  { id: 'products', label: 'Product(s)', funnel: true },
  { id: 'depositAmount', label: 'Deposit amount', sort: true, center: true },
  { id: 'depositStatus', label: 'Deposit status', funnel: true },
  { id: 'paymentAmount', label: 'Payment amount', sort: true, center: true },
  { id: 'paymentStatus', label: 'Payment status', funnel: true },
  { id: 'received', label: 'Received', funnel: true },
  { id: 'carrier', label: 'Carrier', funnel: true, center: true },
  { id: 'tracking', label: 'Tracking number', sort: true },
  { id: 'toolbar', label: 'Toolbar', end: true },
];

const PAID_META: Record<PaidStatus, { cls: string; icon: React.ReactNode; text: string }> = {
  failed: { cls: 'bg-rose-50 text-rose-700', icon: <XmarkIcon className="mr-1 inline text-rose-600" />, text: 'Failed' },
  pending: { cls: 'bg-amber-50 text-amber-700', icon: <ClockIcon className="mr-1 inline text-amber-600" />, text: 'Pending' },
  successful: { cls: 'bg-emerald-50 text-emerald-700', icon: <CheckIcon className="mr-1 inline text-emerald-600" />, text: 'Successful' },
};

function PaidBadge({ v }: { v: PaidStatus }) {
  const meta = PAID_META[v];
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold ${meta.cls}`}>
      {meta.icon}
      {meta.text}
    </span>
  );
}

function TsStatusBadge({ s }: { s: TsRow['status'] }) {
  if (s === 'rejected') {
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
        <HeartCrackIcon className="mr-1 inline text-rose-600" />
        Rejected
      </span>
    );
  }
  if (s === 'delivered') {
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
        <CheckIcon className="mr-1 inline text-emerald-600" />
        Delivered
      </span>
    );
  }
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">
      <BoxIcon className="mr-1 inline text-sky-600" />
      Packed
    </span>
  );
}

export function TransferShipmentsTab() {
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<TsScope>('id');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [cols, setCols] = useState<Record<string, boolean>>(() => Object.fromEntries(TS_COLS.map((c) => [c.id, true])) as Record<string, boolean>);
  const [colsOpen, setColsOpen] = useState<{ left: number; top: number } | null>(null);

  const scopeLabel = TS_SCOPES.find((s) => s.id === scope) ?? TS_SCOPES[0];
  const total = 127;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages - 1);

  const q = search.trim().toLowerCase();
  const filtered = TS_ROWS.filter((r) => {
    if (!q) return true;
    const hay =
      scope === 'id'
        ? String(r.gid)
        : scope === 'org'
          ? `${r.shipToName} ${r.shipToCode}`
          : scope === 'phone'
            ? ''
            : (r.tracking ?? '');
    return hay.toLowerCase().includes(q);
  });

  const pageRows = filtered.slice(current * pageSize, current * pageSize + pageSize);
  const from = filtered.length === 0 ? 1 : current * pageSize + 1;
  const to = Math.min(filtered.length > 0 ? total : 0, (current + 1) * pageSize);
  const colCount = TS_COLS.filter((c) => cols[c.id]).length;

  const openPop = (setter: React.Dispatch<React.SetStateAction<{ left: number; top: number } | null>>) => (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setter((cur) => (cur ? null : { left: Math.max(8, Math.min(rect.left, window.innerWidth - 270)), top: rect.bottom + 4 }));
  };

  return (
    <div>
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
        <h5 className="mb-0 w-full whitespace-nowrap text-base font-bold text-slate-900 lg:w-auto">Transfer Shipments</h5>

        <form className="flex w-full items-center overflow-hidden rounded-lg border border-slate-300 sm:w-auto" onSubmit={(e) => e.preventDefault()}>
          <div className="relative">
            <button
              type="button"
              onClick={() => setScopeOpen((o) => !o)}
              title={scopeLabel.label}
              className="flex h-full items-center bg-sky-50 px-2.5 py-2 text-sky-600 transition hover:bg-sky-100"
            >
              <HashIcon className="text-sky-600" />
            </button>
            {scopeOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setScopeOpen(false)} />
                <div className="absolute left-0 top-full z-50 mt-1 w-60 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
                  {TS_SCOPES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setScope(s.id);
                        setScopeOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${
                        scope === s.id ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {s.icon}
                      {s.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="relative">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              type="search"
              placeholder="Search"
              className="w-[220px] border-transparent bg-white py-2 pl-2 pr-8 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand-500"
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
              <SearchIcon />
            </span>
          </div>
        </form>

        <div className="flex w-full flex-wrap items-center gap-2 md:ml-auto md:w-auto">
          <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100">
            <RotateIcon />
            <span className="hidden sm:inline">Sync all</span>
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={openPop(setColsOpen)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <TableColumnsIcon />
              Columns
            </button>
          </div>
        </div>
      </div>

      {/* table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[2500px] text-left text-xs">
          <thead>
            <tr className="whitespace-nowrap border-b border-slate-200 bg-slate-100 align-middle text-xs text-slate-800">
              {TS_COLS.filter((c) => cols[c.id]).map((c) => (
                <th key={c.id} className={`whitespace-nowrap px-3 py-2.5 ${c.center ? 'text-center' : ''} ${c.end ? 'text-right' : ''}`}>
                  <ThContent funnel={c.funnel} sort={c.sort} label={c.label} center={c.center} end={c.end} title="Toggle SortBy" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr className="whitespace-nowrap border-b border-slate-50">
                <td colSpan={colCount} className="px-4 py-16 text-center text-sm text-slate-400">
                  No transfer shipments match your filters.
                </td>
              </tr>
            ) : (
              pageRows.map((t) => (
                <tr key={t.gid} className="whitespace-nowrap border-b border-slate-50 align-middle transition odd:bg-slate-50/40 hover:bg-slate-100/50">
                  {cols.client && (
                    <td className="px-3 py-2">
                      <span className="font-mono text-[11px] text-slate-700">#{t.client}</span>
                    </td>
                  )}
                  {cols.manager && (
                    <td className="px-3 py-2">
                      <PersonRow name={t.manager} />
                    </td>
                  )}
                  {cols.developer && (
                    <td className="px-3 py-2">
                      <PersonRow name={t.developer} />
                    </td>
                  )}
                  {cols.incubator && (
                    <td className="px-3 py-2">
                      <PersonRow name={t.incubator} />
                    </td>
                  )}
                  {cols.created && (
                    <td className="px-3 py-2">
                      <span className="text-[11px] tabular-nums text-slate-800">{dateOnly(t.created)}</span>
                    </td>
                  )}
                  {cols.delivered && (
                    <td className="px-3 py-2">
                      {t.delivered ? (
                        <span className="text-[11px] tabular-nums text-slate-800">{dateOnly(t.delivered)}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  )}
                  {cols.status && (
                    <td className="px-3 py-2">
                      <TsStatusBadge s={t.status} />
                    </td>
                  )}
                  {cols.products && (
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col items-center">
                          <span className="mb-0.5 flex h-4 min-w-4 items-center justify-center rounded bg-sky-100 px-1 text-[9px] font-bold leading-none text-sky-700">
                            x{t.productQty}
                          </span>
                          <span className="block h-10 w-10 rounded border border-slate-200 bg-white" style={{ backgroundImage: 'linear-gradient(135deg,#e2e8f0,#f8fafc)' }} />
                        </div>
                      </div>
                    </td>
                  )}
                  {cols.depositAmount && (
                    <td className="px-3 py-2 text-center text-[11px] font-bold tabular-nums text-slate-900">
                      {tnd(t.depositAmount)}
                    </td>
                  )}
                  {cols.depositStatus && (
                    <td className="px-3 py-2">
                      <PaidBadge v={t.depositStatus} />
                    </td>
                  )}
                  {cols.paymentAmount && (
                    <td className="px-3 py-2 text-center text-[11px] font-bold tabular-nums text-slate-900">
                      {tnd(t.paymentAmount)}
                    </td>
                  )}
                  {cols.paymentStatus && (
                    <td className="px-3 py-2">
                      <PaidBadge v={t.paymentStatus} />
                    </td>
                  )}
                  {cols.received && (
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-800">
                          {t.receivedUnits} / {t.totalUnits}
                        </span>
                        {t.receivedUnits >= t.totalUnits ? (
                          <span className="inline-flex items-center whitespace-nowrap rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                            <CheckIcon className="mr-1 inline text-emerald-600" />
                            Fully received
                          </span>
                        ) : (
                          <span className="inline-flex items-center whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                            Not received
                          </span>
                        )}
                      </div>
                    </td>
                  )}
                  {cols.carrier && (
                    <td className="px-3 py-2 text-center">
                      <CarrierLogo logo={t.carrier} height={18} />
                    </td>
                  )}
                  
                  {cols.toolbar && (
                    <td className="px-3 py-2 text-right">
                      <button type="button" title="View transfer shipment" className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:bg-slate-50">
                        <svg width="12" height="12" viewBox="0 0 576 512" fill="currentColor" aria-hidden="true">
                          <path d="M288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4C142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C433.5 68.8 368.8 32 288 32zM432 256c0 79.5-64.5 144-144 144s-144-64.5-144-144s64.5-144 144-144s144 64.5 144 144zM288 192c0 35.3-28.7 64-64 64c-11.5 0-22.3-3-31.6-8.4c-.2 2.8-.4 5.5-.4 8.4c0 53 43 96 96 96s96-43 96-96s-43-96-96-96c-2.8 0-5.6 .1-8.4 .4c5.3 9.3 8.4 20.1 8.4 31.6z" />
                        </svg>
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <TabPagination
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
        from={from}
        to={to}
        total={total}
      />

      {/* columns popover */}
      {colsOpen && (
        <FilterOverlay pos={colsOpen} width={260} onClose={() => setColsOpen(null)}>
          <div>
            <div className="px-3 pt-2">
              <h6 className="text-center text-[11px] font-bold uppercase tracking-wide text-slate-500">Showing columns</h6>
            </div>
            <div className="my-1.5 h-px bg-slate-100" />
            <div className="max-h-[280px] overflow-y-auto px-2">
              {TS_COLS.map((c) => (
                <CheckRow
                  key={c.id}
                  checked={cols[c.id]}
                  disabled={c.id === 'toolbar'}
                  onChange={() => setCols((prev) => ({ ...prev, [c.id]: !prev[c.id] }))}
                >
                  <span className={`ml-2 text-[11px] font-medium ${c.id === 'toolbar' ? 'text-slate-400' : 'text-slate-700'}`}>{c.label}</span>
                </CheckRow>
              ))}
            </div>
            <div className="my-1 h-px bg-slate-100" />
            <div className="px-3 pb-2 text-center">
              <button
                type="button"
                onClick={() => setCols(Object.fromEntries(TS_COLS.map((c) => [c.id, true])) as Record<string, boolean>)}
                className="text-xs font-semibold text-sky-600 hover:underline"
              >
                Reset to default
              </button>
            </div>
          </div>
        </FilterOverlay>
      )}
    </div>
  );
}
