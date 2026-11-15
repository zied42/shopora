import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiErrorMessage, getLeadsOptions, Lead, LeadFollowUp, LeadsOptions, searchLeads } from '../../lib/api';
import { Spinner } from '../../components/ui';
import {
  CheckIcon,
  EyeIcon,
  FilterOverlay,
  FollowUpMenu,
  FunnelIcon,
  Pagination,
  PhoneIcon,
  RotateIcon,
  SearchIcon,
  TableColumnsIcon,
  XmarkIcon,
  SellerLabelItem,
  SellerLabelsMenu,
} from './ui';

/* ── local helpers ────────────────────────────────────────────────────── */

function PlusIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true">
      <path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32V224H48c-17.7 0-32 14.3-32 32s14.3 32 32 32H192V432c0 17.7 14.3 32 32 32s32-14.3 32-32V288H400c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V80z" />
    </svg>
  );
}

function HeadsetIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M256 32C141.1 32 48 125.1 48 240v80c0 26.5 21.5 48 48 48h48c17.7 0 32-14.3 32-32V288c0-17.7-14.3-32-32-32H96v-16c0-88.4 71.6-160 160-160s160 71.6 160 160v16H384c-17.7 0-32 14.3-32 32v128c0 17.7 14.3 32 32 32h16c0 26.5 21.5 48-48 48H272v-16H240v48c0 8.8 7.2 16 16 16H288c8.8 0 16-7.2 16-16v-32h16c44.2 0 80-35.8 80-80v-80c0-35.3-28.7-64-64-64H480V240c0-114.9-93.1-208-208-208H256zM48 352H96v80H96c-26.5 0-48-21.5-48-48v-32zm368 80V352h48v32c0 26.5-21.5 48-48 48h-16z" />
    </svg>
  );
}

function LinkIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="11" height="11" viewBox="0 0 640 512" fill="currentColor" aria-hidden="true">
      <path d="M579.8 267.7c56.5-56.5 56.5-148 0-204.5c-50-50-128.8-56.5-186.3-15.4l-1.6 1.1c-14.4 10.3-17.7 30.3-7.4 44.6s30.3 17.7 44.6 7.4l1.6-1.1c32.1-22.9 76-19.3 103.8 8.6c31.5 31.5 31.5 82.5 0 114L422.3 334.8c-31.5 31.5-82.5 31.5-114 0c-27.9-27.9-31.5-71.8-8.6-103.8l1.1-1.6c10.3-14.4 6.9-34.4-7.4-44.6s-34.4-6.9-44.6 7.4l-1.1 1.6C206.5 251.2 213 330 263 380c56.5 56.5 148 56.5 204.5 0L579.8 267.7zM60.2 244.3c-56.5 56.5-56.5 148 0 204.5c50 50 128.8 56.5 186.3 15.4l1.6-1.1c14.4-10.3 17.7-30.3 7.4-44.6s-30.3-17.7-44.6-7.4l-1.6 1.1c-32.1 22.9-76 19.3-103.8-8.6C74 372 74 321 105.5 289.5L217.7 177.2c31.5-31.5 82.5-31.5 114 0c27.9 27.9 31.5 71.8 8.6 103.8l-1.1 1.6c-10.3 14.4-6.9 34.4 7.4 44.6s34.4 6.9 44.6-7.4l1.1-1.6c28.4-40.2 21.9-119-28.1-169-56.5-56.5-148-56.5-204.5 0L60.2 244.3z" />
    </svg>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtD(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function fmtDay(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return `${MONTHS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/* ── badge tones (mirror Falcon) ─────────────────────────────────────── */

const SOURCE_TONE: Record<string, string> = {
  organic: 'bg-yellow-100 text-yellow-700',
  manual: 'bg-sky-100 text-sky-700',
  import: 'bg-violet-100 text-violet-700',
  referral: 'bg-emerald-100 text-emerald-700',
  paid: 'bg-rose-100 text-rose-700',
  other: 'bg-slate-100 text-slate-600',
  social_media: 'bg-teal-100 text-teal-700',
  directory: 'bg-indigo-100 text-indigo-700',
  event: 'bg-fuchsia-100 text-fuchsia-700',
  competition_data: 'bg-orange-100 text-orange-700',
};

const TYPE_TONE: Record<string, string> = {
  retailer: 'bg-sky-100 text-sky-700',
  supplier: 'bg-emerald-100 text-emerald-700',
  unknown: 'bg-slate-100 text-slate-600',
  retailer_supplier: 'bg-violet-100 text-violet-700',
};

const STATUS_TONE: Record<string, string> = {
  New: 'bg-slate-100 text-slate-600',
  Contacted: 'bg-sky-100 text-sky-700',
  Trial: 'bg-cyan-100 text-cyan-700',
  'Closed Won': 'bg-emerald-100 text-emerald-700',
  'Closed Lost': 'bg-rose-100 text-rose-700',
  'No Answer': 'bg-amber-100 text-amber-700',
  'Opt Out': 'bg-slate-200 text-slate-700',
};

const LABEL_TONES = [
  { cls: 'bg-slate-100 text-slate-700', tone: 'info' as const },
  { cls: 'bg-sky-100 text-sky-700', tone: 'info' as const },
  { cls: 'bg-emerald-100 text-emerald-700', tone: 'success' as const },
  { cls: 'bg-amber-100 text-amber-700', tone: 'warning' as const },
  { cls: 'bg-violet-100 text-violet-700', tone: 'primary' as const },
  { cls: 'bg-rose-100 text-rose-700', tone: 'danger' as const },
];

const DEFAULT_LABELS: SellerLabelItem[] = [
  { name: 'source: diagnosis form', tone: 'info' },
  { name: 'tunisien', tone: 'info' },
  { name: 'supplier', tone: 'success' },
  { name: 'retailer', tone: 'primary' },
  { name: 'fulfillment', tone: 'warning' },
  { name: 'follow up', tone: 'warning' },
  { name: 'win', tone: 'success' },
  { name: 'test ok', tone: 'success' },
  { name: 'over priced', tone: 'danger' },
];

function DummyAvatar({ name }: { name: string }) {
  const init = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">{init}</span>
  );
}

function AgentCell({ agent }: { agent: { name: string; avatar: string | null } | null }) {
  if (!agent) {
    return (
      <span className="flex items-center gap-1">
        <span className="text-[11px] font-semibold text-slate-400">Assign agent</span>
        <span className="inline-flex rounded-full bg-slate-100 p-1 text-slate-400">
          <PlusIcon />
        </span>
      </span>
    );
  }
  return (
    <span className="flex items-center rounded-xl border border-slate-200 bg-white p-1.5">
      <span className="relative shrink-0">
        {agent.avatar ? (
          <img src={agent.avatar} alt={agent.name} className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <DummyAvatar name={agent.name} />
        )}
        <span className="absolute -bottom-0.5 -left-0.5 block h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />
      </span>
      <span className="ms-2 text-[11px] font-semibold text-slate-700">{agent.name}</span>
    </span>
  );
}

function FollowUpCell({ fu }: { fu: LeadFollowUp | null }) {
  if (!fu) {
    return (
      <span className="flex items-center gap-1">
        <span className="text-[11px] font-semibold text-slate-400">New follow up</span>
        <span className="inline-flex rounded-full bg-slate-100 p-1 text-slate-400">
          <PlusIcon />
        </span>
      </span>
    );
  }
  return (
    <span className="block w-56 rounded-xl border border-slate-200 bg-white p-2 text-left">
      <span className="flex items-center">
        {fu.avatar ? <img src={fu.avatar} alt={fu.agent} className="h-6 w-6 rounded-full object-cover" /> : <DummyAvatar name={fu.agent} />}
        <span className="ms-2 flex flex-col leading-tight">
          <span className="text-[11px] font-semibold text-slate-800">{fu.agent}</span>
          <span className="text-[10px] text-slate-400">{fu.type}</span>
        </span>
      </span>
      {fu.note && <p className="mb-1 mt-1.5 truncate text-[10px] text-slate-500">{fu.note}</p>}
      <span className="mt-1.5 flex items-center justify-between">
        <span className="text-[10px] text-slate-500">{fmtDay(fu.at)}</span>
        <span
          className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold ${
            fu.confirmed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
          }`}
        >
          {fu.confirmed ? 'Confirmed' : 'Not Confirmed'}
        </span>
      </span>
    </span>
  );
}

function OrgBadge({ org }: { org: { name: string; code: string; kind: string } | null }) {
  if (!org) {
    return (
      <div className="flex items-center gap-1">
        <button type="button" className="text-[11px] font-semibold text-slate-400 transition hover:text-sky-600">
          Sync to organizer
        </button>
        <button type="button" className="inline-flex rounded-full bg-slate-100 p-1 text-slate-500">
          <LinkIcon />
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
        {org.name}
        <span className="text-[10px] font-normal text-emerald-500">- {org.code}</span>
      </span>
      <button type="button" title="Unlink" className="inline-flex rounded-full bg-slate-100 p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600">
        <XmarkIcon />
      </button>
    </div>
  );
}

function StatusBadge({ value, tone }: { value: string; tone: Record<string, string> }) {
  const cls = tone[value] ?? 'bg-slate-100 text-slate-600';
  return <span className={`inline-flex items-center whitespace-nowrap rounded px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{value}</span>;
}

/* ── columns ─────────────────────────────────────────────────────────── */

const COLUMNS = [
  { key: 'gid', label: 'GID' },
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'review', label: 'Review' },
  { key: 'email', label: 'Email' },
  { key: 'links', label: 'Links' },
  { key: 'location', label: 'Location' },
  { key: 'source', label: 'Source' },
  { key: 'type', label: 'Type' },
  { key: 'status', label: 'Status' },
  { key: 'est_mv', label: 'Est. MV' },
  { key: 'organization', label: 'Organization' },
  { key: 'has_order', label: 'Has Order' },
  { key: 'has_withdrawal', label: 'Has Withdrawal' },
  { key: 'orders30', label: 'Orders (30d)' },
  { key: 'labels', label: 'Labels' },
  { key: 'sales_agent', label: 'Sales Agent' },
  { key: 'created_by', label: 'Created By' },
  { key: 'follow_up', label: 'Follow Up' },
  { key: 'last_submitted', label: 'Last submitted' },
  { key: 'created_at', label: 'Created At' },
] as const;

type ColKey = (typeof COLUMNS)[number]['key'];

function GripVerticalIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 320 512" fill="currentColor" aria-hidden="true">
      <path d="M40 352c-22.1 0-40 17.9-40 40v48c0 22.1 17.9 40 40 40h48c22.1 0 40-17.9 40-40v-48c0-22.1-17.9-40-40-40H40zm192 0c-22.1 0-40 17.9-40 40v48c0 22.1 17.9 40 40 40h48c22.1 0 40-17.9 40-40v-48c0-22.1-17.9-40-40-40H232zM40 320h48c22.1 0 40-17.9 40-40v-48c0-22.1-17.9-40-40-40H40c-22.1 0-40 17.9-40 40v48c0 22.1 17.9 40 40 40zM232 192c-22.1 0-40 17.9-40 40v48c0 22.1 17.9 40 40 40h48c22.1 0 40-17.9 40-40v-48c0-22.1-17.9-40-40-40H232zM40 160h48c22.1 0 40-17.9 40-40V72c0-22.1-17.9-40-40-40H40C17.9 32 0 49.9 0 72v48c0 22.1 17.9 40 40 40zM232 32c-22.1 0-40 17.9-40 40v48c0 22.1 17.9 40 40 40h48c22.1 0 40-17.9 40-40V72c0-22.1-17.9-40-40-40H232z" />
    </svg>
  );
}

const SORT_OPTIONS = [
  { value: 'last_submitted_at', label: 'Last submitted' },
  { value: 'created_at', label: 'Created at' },
  { value: 'last_follow_up_at', label: 'Last follow up' },
];

/* ── page ────────────────────────────────────────────────────────────── */

const thCls = 'px-3 py-2.5 text-left text-[11px] font-semibold text-slate-900 whitespace-nowrap';

export default function ChefLeadsList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [options, setOptions] = useState<LeadsOptions | null>(null);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [sort, setSort] = useState('last_submitted_at');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [reload, setReload] = useState(0);

  const [filters, setFilters] = useState<{ source?: string; type?: string; status?: string; location?: string; has_order?: string }>({});
  const [filtersDraft, setFiltersDraft] = useState<{ source?: string; type?: string; status?: string; location?: string; has_order?: string }>({});
  const [filterOpen, setFilterOpen] = useState(false);

  const [cols, setCols] = useState<Record<ColKey, boolean>>(
    Object.fromEntries(COLUMNS.map((c) => [c.key, true])) as Record<ColKey, boolean>,
  );
  const [colsOpen, setColsOpen] = useState(false);
  const [colsPos, setColsPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const colsRef = useRef<HTMLDivElement>(null);

  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [localLabels, setLocalLabels] = useState<Record<number, string[]>>({});
  const [estEdits, setEstEdits] = useState<{ rowId: number; left: number; top: number; draft: string } | null>(null);
  const [labelMenu, setLabelMenu] = useState<{ rowId: number; left: number; top: number } | null>(null);
  const [followMenu, setFollowMenu] = useState<{ rowId: number; left: number; top: number } | null>(null);
  const [agentMenu, setAgentMenu] = useState<{ rowId: number; left: number; top: number } | null>(null);
  const [notesMenu, setNotesMenu] = useState<{ rowId: number; left: number; top: number } | null>(null);
  const [actionsMenu, setActionsMenu] = useState<{ rowId: number; left: number; top: number } | null>(null);
  const [statusMenu, setStatusMenu] = useState<{ rowId: number; left: number; top: number } | null>(null);
  const [selected, setSelected] = useState<Record<number, boolean>>({});

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getLeadsOptions().then(setOptions).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (colsRef.current && !colsRef.current.contains(e.target as Node)) setColsOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setEstEdits(null);
        setLabelMenu(null);
        setFollowMenu(null);
        setAgentMenu(null);
        setNotesMenu(null);
        setActionsMenu(null);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    setLoading(true);
    searchLeads({
      page: page + 1,
      per_page: pageSize,
      q: debouncedQ || undefined,
      sort,
      source: filters.source,
      type: filters.type,
      status: filters.status,
      location: filters.location,
      has_order: filters.has_order,
    })
      .then((r) => {
        setRows(r.rows);
        setTotal(r.total);
        setLocalLabels(Object.fromEntries(r.rows.map((x) => [x.id, x.labels])));
      })
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [debouncedQ, page, pageSize, sort, filters, reload]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const allSelected = useMemo(() => rows.length > 0 && rows.every((r) => selected[r.id]), [rows, selected]);

  const toggleRow = (id: number) => setSelected((cur) => ({ ...cur, [id]: !cur[id] }));
  const toggleAll = () => {
    if (allSelected) {
      const next = { ...selected };
      rows.forEach((r) => delete next[r.id]);
      setSelected(next);
    } else {
      const next = { ...selected };
      rows.forEach((r) => (next[r.id] = true));
      setSelected(next);
    }
  };

  const applyFilters = () => {
    setFilters(filtersDraft);
    setPage(0);
    setFilterOpen(false);
  };

  const clearFilters = () => {
    setFiltersDraft({});
    setFilters({});
    setPage(0);
    setFilterOpen(false);
  };

  const openMenu = (e: React.MouseEvent, setter: (v: { rowId: number; left: number; top: number } | null) => void, w = 260) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setter({ rowId: Number((e.currentTarget as HTMLElement).dataset.rid), left: Math.max(8, Math.min(rect.right - w, window.innerWidth - w - 8)), top: rect.top });
  };

  const openCols = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setColsOpen((o) => !o);
    if (!colsOpen) setColsPos({ left: Math.max(8, Math.min(rect.left, window.innerWidth - 260)), top: rect.bottom + 4 });
  };

  const toggleLabel = (name: string) => {
    if (!labelMenu) return;
    const rowId = labelMenu.rowId;
    setLocalLabels((cur) => {
      const has = (cur[rowId] ?? []).includes(name);
      return { ...cur, [rowId]: has ? (cur[rowId] ?? []).filter((x) => x !== name) : [...(cur[rowId] ?? []), name] };
    });
  };

  const createLabel = (name: string) => {
    if (!labelMenu) return;
    const rowId = labelMenu.rowId;
    setLocalLabels((cur) => ({ ...cur, [rowId]: [...(cur[rowId] ?? []), name] }));
  };

  const deleteRow = (rowId: number) => {
    setRows((rs) => rs.filter((r) => r.id !== rowId));
    setTotal((t) => Math.max(0, t - 1));
    setActionsMenu(null);
  };

  const applyEst = () => {
    if (!estEdits) return;
    const v = Number(estEdits.draft);
    if (!Number.isFinite(v) || v < 0) return;
    setRows((rs) => rs.map((r) => (r.id === estEdits.rowId ? { ...r, est_mv: v } : r)));
    setEstEdits(null);
  };

  const setStatus = (rowId: number, s: string) => {
    setRows((rs) => rs.map((r) => (r.id === rowId ? { ...r, status: s as Lead['status'] } : r)));
  };

  const labelTone = (name: string): string => {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    h %= 2;
    return LABEL_TONES[h]!.cls;
  };

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-100 px-4 py-3">
          <h5 className="mb-0 text-base font-bold text-slate-900">Leads</h5>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder="Search by name, phone, email..."
              className="w-64 rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-8 pr-2 text-xs text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(0);
            }}
            title="Sort"
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 outline-none transition focus:border-sky-400"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="ms-auto flex flex-wrap items-center gap-2">
            <button type="button" title="Create Lead" onClick={() => navigate('/chef/leads/create')} className="inline-flex rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50">
              <PlusIcon />
            </button>
            <button type="button" title="Import leads" onClick={() => navigate('/chef/leads/import')} className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
              <span className="me-1.5">⬇</span>Import
            </button>
            <div ref={colsRef} className="relative">
              <button type="button" onClick={openCols} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
                <TableColumnsIcon className="text-slate-500" />
                Columns
                <span className="text-[8px] text-slate-400">▼</span>
              </button>
              {colsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setColsOpen(false)} />
                  <div className="fixed z-50 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl" style={{ left: colsPos.left, top: colsPos.top, minWidth: 240 }} onClick={(e) => e.stopPropagation()}>
                    <div className="max-h-[400px] overflow-y-auto py-1">
                      {COLUMNS.map((c) => (
                        <label key={c.key} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs text-slate-700 transition hover:bg-slate-50">
                          <span className="text-slate-400">
                            <GripVerticalIcon />
                          </span>
                          <input
                            type="checkbox"
                            checked={cols[c.key]}
                            onChange={() => setCols((cur) => ({ ...cur, [c.key]: !cur[c.key] }))}
                            className="h-3.5 w-3.5 accent-sky-600"
                          />
                          {c.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <button type="button" title="Filter" onClick={() => setFilterOpen((o) => !o)} className="relative inline-flex rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50">
              <FunnelIcon className="text-sky-600" />
              {activeFilterCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-sky-600 text-[9px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button type="button" title="Refresh" onClick={() => setReload((n) => n + 1)} className="inline-flex rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50">
              <RotateIcon />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className={`${thCls} w-10`}>
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-3.5 w-3.5 accent-sky-600" />
                  </th>
                  {cols.gid && <th className={thCls}>GID</th>}
                  {cols.name && <th className={thCls}>Name</th>}
                  {cols.phone && <th className={thCls}>Phone</th>}
                  {cols.review && <th className={thCls}>Review</th>}
                  {cols.email && <th className={thCls}>Email</th>}
                  {cols.links && <th className={thCls}>Links</th>}
                  {cols.location && <th className={thCls}>Location</th>}
                  {cols.source && <th className={thCls}>Source</th>}
                  {cols.type && <th className={thCls}>Type</th>}
                  {cols.status && <th className={thCls}>Status</th>}
                  {cols.est_mv && <th className={thCls}>Est. MV</th>}
                  {cols.organization && <th className={thCls}>Organization</th>}
                  {cols.has_order && <th className={thCls}>Has Order</th>}
                  {cols.has_withdrawal && <th className={thCls}>Has Withdrawal</th>}
                  {cols.orders30 && <th className={thCls}>Orders (30d)</th>}
                  {cols.labels && <th className={thCls}>Labels</th>}
                  {cols.sales_agent && <th className={thCls}>Sales Agent</th>}
                  {cols.created_by && <th className={thCls}>Created By</th>}
                  {cols.follow_up && <th className={thCls}>Follow Up</th>}
                  {cols.last_submitted && <th className={thCls}>Last submitted</th>}
                  {cols.created_at && <th className={thCls}>Created At</th>}
                  <th className={`${thCls} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 align-top transition hover:bg-sky-50/40">
                    <td className="px-3 py-2.5">
                      <input type="checkbox" checked={!!selected[r.id]} onChange={() => toggleRow(r.id)} className="h-3.5 w-3.5 accent-sky-600" />
                    </td>
                    {cols.gid && (
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-sky-600">{r.gid}</td>
                    )}
                    {cols.name && (
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-slate-800">{r.name}</td>
                    )}
                    {cols.phone && (
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] tabular-nums text-slate-700">
                            {revealed[r.id] ? r.phone_full : r.phone_masked}
                          </span>
                          <button
                            type="button"
                            title={revealed[r.id] ? 'Hide number' : 'Show number'}
                            onClick={() => setRevealed((cur) => ({ ...cur, [r.id]: !cur[r.id] }))}
                            className="inline-flex rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                          >
                            <EyeIcon />
                          </button>
                          <a href={`tel:${r.phone_full}`} title="Call" className="inline-flex rounded-full bg-emerald-100 p-1 text-emerald-700 transition hover:bg-emerald-200">
                            <PhoneIcon />
                          </a>
                          <button type="button" title="VoIP" className="inline-flex rounded-full bg-sky-100 p-1 text-sky-700 transition hover:bg-sky-200">
                            <HeadsetIcon />
                          </button>
                        </div>
                      </td>
                    )}
                    {cols.review && <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-400">{r.review ?? '—'}</td>}
                    {cols.email && <td className="max-w-[180px] truncate px-3 py-2.5 text-[11px] text-slate-600">{r.email ?? '—'}</td>}
                    {cols.links && (
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          {(r.link || r.link2 || r.link3) ? (
                            <>
                              {[r.link, r.link2, r.link3]
                                .filter(Boolean)
                                .slice(0, 3)
                                .map((l, i) => (
                                  <a key={i} href={l!} target="_blank" rel="noreferrer" title={l!} className="inline-flex rounded p-1 text-sky-600 transition hover:bg-sky-50">
                                    <LinkIcon />
                                  </a>
                                ))}
                            </>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </div>
                      </td>
                    )}
                    {cols.location && <td className="whitespace-nowrap px-3 py-2.5 text-[11px] text-slate-600">{r.location ?? '—'}</td>}
                    {cols.source && (
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <StatusBadge value={r.source} tone={SOURCE_TONE} />
                      </td>
                    )}
                    {cols.type && (
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <StatusBadge value={r.type} tone={TYPE_TONE} />
                      </td>
                    )}
                    {cols.status && (
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <button type="button" className="relative" data-rid={r.id} onClick={(e) => openMenu(e, setStatusMenu)}>
                          <StatusBadge value={r.status} tone={STATUS_TONE} />
                        </button>
                      </td>
                    )}
                    {cols.est_mv && (
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <button
                          type="button"
                          data-rid={r.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setEstEdits({ rowId: r.id, left: Math.max(8, Math.min(rect.right - 170, window.innerWidth - 186)), top: rect.top, draft: r.est_mv != null ? String(r.est_mv) : '' });
                          }}
                          className="text-[11px] font-semibold text-slate-600 transition hover:text-sky-600"
                        >
                          {r.est_mv != null ? `${r.est_mv.toLocaleString('en-US')} TND` : '—'}
                        </button>
                      </td>
                    )}
                    {cols.organization && (
                      <td className="px-3 py-2.5">
                        <OrgBadge org={r.organization} />
                      </td>
                    )}
                    {cols.has_order && (
                      <td className="px-3 py-2.5">
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">{r.has_order ? 'Yes' : 'No'}</span>
                      </td>
                    )}
                    {cols.has_withdrawal && (
                      <td className="px-3 py-2.5">
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">{r.has_withdrawal ? 'Yes' : 'No'}</span>
                      </td>
                    )}
                    {cols.orders30 && (
                      <td className="whitespace-nowrap px-3 py-2.5 text-[11px] text-slate-600">{r.orders_30d || 0}</td>
                    )}
                    {cols.labels && (
                      <td className="px-3 py-2.5">
                        <div className="flex max-w-[220px] flex-wrap items-center gap-1">
                          {(localLabels[r.id] ?? []).map((l, i) => (
                            <span key={`${l}-${i}`} className={`inline-flex items-center gap-0.5 whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-semibold ${labelTone(l)}`}>
                              {l}
                              <button type="button" className="text-current/60 hover:text-current" aria-label="Remove label">
                                <XmarkIcon />
                              </button>
                            </span>
                          ))}
                          {localLabels[r.id]?.length === 0 && <span className="text-[11px] text-slate-300">—</span>}
                          <button
                            type="button"
                            title="Add label"
                            data-rid={r.id}
                            onClick={(e) => openMenu(e, setLabelMenu, 360)}
                            className="inline-flex rounded-full bg-slate-100 p-1 text-slate-500 transition hover:bg-slate-200"
                          >
                            <PlusIcon />
                          </button>
                        </div>
                      </td>
                    )}
                    {cols.sales_agent && (
                      <td className="px-3 py-2.5">
                        <button type="button" data-rid={r.id} onClick={(e) => openMenu(e, setAgentMenu)} className="block w-full text-left">
                          <AgentCell agent={r.sales_agent} />
                        </button>
                      </td>
                    )}
                    {cols.created_by && <td className="whitespace-nowrap px-3 py-2.5 text-[11px] text-slate-600">{r.created_by ?? '—'}</td>}
                    {cols.follow_up && (
                      <td className="px-3 py-2.5">
                        <button type="button" data-rid={r.id} onClick={(e) => openMenu(e, setFollowMenu)} className="block w-full text-left">
                          <FollowUpCell fu={r.follow_up} />
                        </button>
                      </td>
                    )}
                    {cols.last_submitted && <td className="whitespace-nowrap px-3 py-2.5 text-[11px] text-slate-600">{fmtD(r.last_submitted_at)}</td>}
                    {cols.created_at && <td className="whitespace-nowrap px-3 py-2.5 text-[11px] text-slate-600">{fmtD(r.created_at)}</td>}
                    <td className="whitespace-nowrap px-3 py-2.5 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button type="button" title="View" onClick={() => alert(`Lead ${r.gid} detail`)} className="inline-flex rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:bg-slate-50">
                          <EyeIcon />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          data-rid={r.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setActionsMenu({ rowId: r.id, left: Math.max(8, Math.min(rect.right - 160, window.innerWidth - 176)), top: rect.top });
                          }}
                          className="inline-flex rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={COLUMNS.length + 2} className="px-3 py-14 text-center text-xs text-slate-400">
                      No results found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={total} />
      </div>

      {/* status menu (per row) */}
      <div ref={menuRef}>
        {statusMenu && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setStatusMenu(null)} />
            <div
              className="fixed z-[70] w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
              style={{ left: statusMenu.left, top: statusMenu.top }}
              onClick={(e) => e.stopPropagation()}
            >
              {(options?.statuses ?? OPTION_STATUSES).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setStatus(statusMenu.rowId, s);
                    setStatusMenu(null);
                  }}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs text-slate-700 transition hover:bg-slate-50"
                >
                  {s}
                  {rows.find((r) => r.id === statusMenu.rowId)?.status === s && <CheckIcon className="text-sky-600" />}
                </button>
              ))}
            </div>
          </>
        )}

        {estEdits && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setEstEdits(null)} />
            <div className="fixed z-[70] w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-xl" style={{ left: estEdits.left, top: estEdits.top }} onClick={(e) => e.stopPropagation()}>
              <label className="text-[10px] font-semibold text-slate-500">Est. MV (TND)</label>
              <input
                type="number"
                min={0}
                autoFocus
                value={estEdits.draft}
                onChange={(e) => setEstEdits((cur) => (cur ? { ...cur, draft: e.target.value } : cur))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyEst();
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none transition focus:border-sky-400"
              />
              <button type="button" onClick={applyEst} className="mt-2 w-full rounded-lg bg-sky-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-sky-700">
                Set value
              </button>
            </div>
          </>
        )}

        {labelMenu && (
          <SellerLabelsMenu
            pos={{ left: labelMenu.left, top: labelMenu.top }}
            labels={DEFAULT_LABELS}
            selected={localLabels[labelMenu.rowId] ?? []}
            onToggle={toggleLabel}
            onCreate={createLabel}
            onClose={() => setLabelMenu(null)}
          />
        )}

        {followMenu && (
          <FollowUpMenu
            pos={{ left: followMenu.left, top: followMenu.top }}
            onClose={() => setFollowMenu(null)}
            onPick={(s) => {
              const rowId = followMenu.rowId;
              setRows((rs) =>
                rs.map((r) =>
                  r.id === rowId
                    ? {
                        ...r,
                        follow_up: { agent: options?.agents[0]?.name ?? 'Ali Boussaid', avatar: options?.agents[0]?.avatar ?? null, type: s, at: new Date().toISOString(), confirmed: false, note: null, history: r.follow_up?.history ?? 0 },
                      }
                    : r,
                ),
              );
            }}
          />
        )}

        {agentMenu && options && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setAgentMenu(null)} />
            <div className="fixed z-[70] w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl" style={{ left: agentMenu.left, top: agentMenu.top }} onClick={(e) => e.stopPropagation()}>
              <h6 className="mb-0 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Assign Sales Agent</h6>
              {options.agents.map((a) => (
                <button
                  key={a.name}
                  type="button"
                  onClick={() => {
                    setRows((rs) => rs.map((r) => (r.id === agentMenu.rowId ? { ...r, sales_agent: { name: a.name, avatar: a.avatar } } : r)));
                    setAgentMenu(null);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 transition hover:bg-slate-50"
                >
                  {a.avatar ? <img src={a.avatar} alt={a.name} className="h-6 w-6 rounded-full object-cover" /> : <DummyAvatar name={a.name} />}
                  {a.name}
                </button>
              ))}
            </div>
          </>
        )}

        {notesMenu && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setNotesMenu(null)} />
            <div className="fixed z-[70] w-64 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-xl" style={{ left: notesMenu.left, top: notesMenu.top }} onClick={(e) => e.stopPropagation()}>
              <div className="mb-2 flex items-center justify-between">
                <h6 className="mb-0 text-xs font-bold text-slate-800">Notes</h6>
                <button type="button" className="inline-flex rounded-full bg-slate-100 p-1 text-slate-500" aria-label="Add note">
                  <PlusIcon />
                </button>
              </div>
              <textarea rows={3} placeholder="Write a note..." className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800 outline-none transition focus:border-sky-400" />
              <button type="button" className="mt-2 w-full rounded-lg bg-sky-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-sky-700">
                Save note
              </button>
            </div>
          </>
        )}

        {actionsMenu && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setActionsMenu(null)} />
            <div className="fixed z-[70] w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl" style={{ left: actionsMenu.left, top: actionsMenu.top }} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => {
                  alert(`Lead ${rows.find((r) => r.id === actionsMenu.rowId)?.gid ?? ''} detail`);
                  setActionsMenu(null);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 transition hover:bg-slate-50"
              >
                <EyeIcon />
                View
              </button>
              <button
                type="button"
                onClick={() => deleteRow(actionsMenu.rowId)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-rose-600 transition hover:bg-rose-50"
              >
                <XmarkIcon />
                Delete
              </button>
            </div>
          </>
        )}
      </div>

      {filterOpen && (
        <FilterOverlay pos={{ left: 16, top: 140 }} width={300} onClose={() => setFilterOpen(false)}>
          <div>
            <div className="px-3 pt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Filter leads</div>
            <div className="mx-3 my-1 h-px bg-slate-100" />
            <div className="space-y-2 px-3 pb-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Source</label>
                <select
                  value={filtersDraft.source ?? ''}
                  onChange={(e) => setFiltersDraft((cur) => ({ ...cur, source: e.target.value || undefined }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-sky-400 focus:bg-white"
                >
                  <option value="">All sources</option>
                  {(options?.sources ?? OPTION_SOURCES).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Type</label>
                <select
                  value={filtersDraft.type ?? ''}
                  onChange={(e) => setFiltersDraft((cur) => ({ ...cur, type: e.target.value || undefined }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-sky-400 focus:bg-white"
                >
                  <option value="">All types</option>
                  {(options?.types ?? OPTION_TYPES).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Status</label>
                <select
                  value={filtersDraft.status ?? ''}
                  onChange={(e) => setFiltersDraft((cur) => ({ ...cur, status: e.target.value || undefined }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-sky-400 focus:bg-white"
                >
                  <option value="">All statuses</option>
                  {(options?.statuses ?? OPTION_STATUSES).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Location</label>
                <input
                  value={filtersDraft.location ?? ''}
                  onChange={(e) => setFiltersDraft((cur) => ({ ...cur, location: e.target.value || undefined }))}
                  placeholder="e.g. Sousse"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-sky-400 focus:bg-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Has Order</label>
                <select
                  value={filtersDraft.has_order ?? ''}
                  onChange={(e) => setFiltersDraft((cur) => ({ ...cur, has_order: e.target.value || undefined }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50/70 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-sky-400 focus:bg-white"
                >
                  <option value="">Any</option>
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </div>
            </div>
            <div className="my-2 h-px bg-slate-100" />
            <div className="flex items-center justify-between px-3 pb-2">
              <button type="button" onClick={clearFilters} className="text-[11px] font-semibold text-slate-400 transition hover:text-slate-600">
                Clear
              </button>
              <button type="button" onClick={applyFilters} className="rounded-md bg-sky-500 px-4 py-1 text-[11px] font-bold text-white transition hover:bg-sky-600">
                Apply
              </button>
            </div>
          </div>
        </FilterOverlay>
      )}
    </>
  );
}

function TrashIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true">
      <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z" />
    </svg>
  );
}

const OPTION_SOURCES: string[] = ['organic', 'manual', 'import'];
const OPTION_TYPES: string[] = ['retailer', 'supplier', 'unknown'];
const OPTION_STATUSES: string[] = ['New', 'Contacted', 'Trial', 'Closed Won', 'Closed Lost', 'No Answer', 'Opt Out'];