import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiErrorMessage, chefOrgApi, OrgApiBundle, SellerOrganization, SellerStatus, SupplierFollowUp, supportOrgApi } from '../../lib/api';
import { Spinner } from '../../components/ui';
import { useTeamPhotos } from '../../hooks/useTeamPhotos';
import { AddNoteModal, Avatar, CheckRow, ClockIcon, EyeIcon, FilterOverlay, FunnelIcon, Pagination, PhoneIcon, RotateIcon, SearchIcon } from './ui';
import { NotificationHistoryModal, SendNotificationModal } from './notifications';
import { SupplierFollowUpCard } from './SupplierOrganizations';
import FollowUpModal from './FollowUpModal';
import ConfirmMeetingModal from './ConfirmMeetingModal';
import ManagerPickerModal from './ManagerPickerModal';

const SORT_OPTIONS = [
  { field: 'joined_at', dir: 'desc', label: 'Join date' },
  { field: 'last_seen_at', dir: 'desc', label: 'Last seen date' },
  { field: 'joined_at', dir: 'asc', label: 'Account activation date' },
  { field: 'follow_up', dir: 'desc', label: 'Organization follow ups' },
  { field: 'documents', dir: 'desc', label: 'Documents update' },
] as const;

const SEARCH_FIELDS = [
  { id: 'any', label: 'Any' },
  { id: 'organization', label: 'Organization name / code' },
  { id: 'phone', label: 'Phone number' },
  { id: 'user', label: 'User name' },
  { id: 'email', label: 'Email' },
] as const;

function EmployeeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true">
      <path d="M224 256c70.7 0 128-57.3 128-128S294.7 0 224 0S96 57.3 96 128s57.3 128 128 128zm0 32c-51 0-97 15.2-134 40.8C66.6 345.9 48 378 48 412.5V448c0 17.7 14.3 32 32 32H368c17.7 0 32-14.3 32-32v-35.5c0-34.5-18.6-66.6-42-123.7C321 303.2 275 288 224 288z" />
    </svg>
  );
}

function PaperPlaneIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M498.1 5.6c10.1 7 15.4 19.1 13.5 31.2l-64 416c-1.5 9.7-7.4 18.2-16 23s-18.9 5.4-28 1.6L284 427.7l-68.5 74.1c-8.9 9.7-22.9 12.9-35.2 8.1S160 493.2 160 480V396.4c0-4 1.5-7.9 4.2-10.8L331.8 202.8c5.8-6.3 5.6-16-.4-22s-15.7-6.4-22-.7L106 360.8 17.7 316.6C7.1 311.3.3 300.7 0 288.9s5.9-22.8 16.1-28.7l448-256c10.7-6.1 23.9-5.5 34 1.4z" />
    </svg>
  );
}

function ArrowRightIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true">
      <path d="M438.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L338.8 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l306.7 0L233.4 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160z" />
    </svg>
  );
}

function PencilIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M362.7 19.3L314.3 67.7 444.3 197.7l48.4-48.4c25-25 25-65.5 0-90.5L453.3 19.3c-25-25-65.5-25-90.5 0zm-71 71L58.6 323.5c-10.4 10.4-18 23.3-22.2 37.4L1 481.2C-1.5 489.7.8 498.8 7 505s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L421.7 220.3 291.7 90.3z" />
    </svg>
  );
}

function PlusIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="11" height="11" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true">
      <path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32V224H48c-17.7 0-32 14.3-32 32s14.3 32 32 32H192V432c0 17.7 14.3 32 32 32s32-14.3 32-32V288H400c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V80z" />
    </svg>
  );
}

function SlidersIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M0 416c0 17.7 14.3 32 32 32h54.7c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H233.3c-12.3-28.3-40.5-48-73.3-48s-61 19.7-73.3 48H32c-17.7 0-32 14.3-32 32zm0-192c0 17.7 14.3 32 32 32h198.7c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H377.3c-12.3-28.3-40.5-48-73.3-48s-61 19.7-73.3 48H32c-17.7 0-32 14.3-32 32zm384-128c0 17.7-14.3 32-32 32s-32-14.3-32-32V64c0-17.7 14.3-32 32-32s32 14.3 32 32v32zm-224 0c0 17.7-14.3 32-32 32s-32-14.3-32-32V64c0-17.7 14.3-32 32-32s32 14.3 32 32v32z" />
    </svg>
  );
}

function TagsIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M345 39.1L472.8 168.4c52.4 53 52.5 138.2 .4 191.4l-95.9 97c-2.4 2.4-4.9 4.7-7.5 6.8L352 480c-17.7 0-32-14.3-32-32s14.3-32 32-32l0-16.4c2-.9 3.9-2 5.7-3.4c.4-.4 .8-.7 1.1-1.1l96-97c21.3-21.5 21.3-56.2-.1-77.8L327 91.2c-21.5-21.7-56.4-21.8-78-.4l-96.5 96.8c-21.6 21.7-21.6 56.7 .1 78.3c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0c-46.5-46.5-46.6-121.9-.2-168.5L203.6 46c39-39.1 102.3-39.2 141.4-3.1zM0 229.5L0 80C0 53.5 21.5 32 48 32l149.5 0c17 0 33.3 6.7 45.3 18.7l168 168c25 25 25 65.5 0 90.5L277.3 442.7c-25 25-65.5 25-90.5 0l-168-168C6.7 262.7 0 246.5 0 229.5zM144 144a24 24 0 1 0 -48 0 24 24 0 1 0 48 0z" />
    </svg>
  );
}

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? '' : 's'} ago`;
  const y = Math.floor(mo / 12);
  return `${y} year${y === 1 ? '' : 's'} ago`;
}

function maskPhone(p: string): string {
  if (p.includes('*')) return p;
  const digits = p.replace(/[\s()-]+/g, '');
  if (digits.length < 6) return p;
  return `${digits.slice(0, 4)} ** *** *${digits.slice(-2)}`;
}

function tagCls(t: string): string {
  if (t.startsWith('intent:') || t.startsWith('commitment:')) return 'border-sky-200 bg-sky-50 text-sky-700';
  if (t.startsWith('budget:')) return 'border-rose-200 bg-rose-50 text-rose-600';
  if (t.startsWith('knows:')) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  return 'border-slate-200 bg-white text-slate-600';
}

function statusBadgeCls(label: SellerStatus, ok: boolean): string {
  if (label === 'Uncompleted registration') return 'bg-amber-50 text-amber-700';
  if (label === 'Complete registration') return 'bg-emerald-50 text-emerald-700';
  if (!ok) return 'bg-rose-50 text-rose-700';
  return 'bg-slate-100 text-slate-600';
}

const CENTERED = new Set(['account', 'onboarding', 'documents', 'follow', 'source']);

export default function ChefSellerOrganizations({ base = 'chef' }: { base?: 'chef' | 'support' }) {
  const navigate = useNavigate();
  const api: OrgApiBundle = base === 'support' ? supportOrgApi : chefOrgApi;
  const photoFor = useTeamPhotos(base === 'support' ? 'support' : 'chef');
  const [rows, setRows] = useState<SellerOrganization[]>([]);
  const [total, setTotal] = useState(0);
  const [statusOptions, setStatusOptions] = useState<string[]>([]);
  const [sourceOptions, setSourceOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [searchField, setSearchField] = useState('any');
  const [sort, setSort] = useState<(typeof SORT_OPTIONS)[number]>(SORT_OPTIONS[0]!);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [mainRetailer, setMainRetailer] = useState(false);
  const [plusMembership, setPlusMembership] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState<{ pos: { left: number; top: number } } | null>(null);
  const [statusDraft, setStatusDraft] = useState<string[]>([]);
  const [sourceDraft, setSourceDraft] = useState<string[]>([]);
  const [historyOrg, setHistoryOrg] = useState<SellerOrganization | null>(null);
  const [sendForm, setSendForm] = useState<{ org: SellerOrganization | null } | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [mgrEdit, setMgrEdit] = useState<SellerOrganization | null>(null);
const [fuModal, setFuModal] = useState<{ orgId: number; initial: SupplierFollowUp | null; meeting: string } | null>(null);
const [cfModal, setCfModal] = useState<{ orgId: number; initial: SupplierFollowUp } | null>(null);

  const toggleReveal = (id: number) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page + 1),
      per_page: String(pageSize),
      sort: sort.field,
      dir: sort.dir,
    });
    if (debouncedQ) params.set('q', debouncedQ);
    if (searchField !== 'any') params.set('search_field', searchField);
    if (statuses.length) params.set('statuses', statuses.join(','));
    if (sources.length) params.set('sources', sources.join(','));
    if (mainRetailer) params.set('main_retailer', '1');
    if (plusMembership) params.set('plus_membership', '1');
    api.searchSellerOrganizations(params)
      .then((r) => {
        setRows(r.rows);
        setTotal(r.total);
        setStatusOptions(r.filters.statuses);
        setSourceOptions(r.filters.sources);
        setSelected(new Set());
      })
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [debouncedQ, searchField, sort, statuses, sources, mainRetailer, plusMembership, page, pageSize]);

  const togglePop = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFiltersOpen((cur) =>
      cur ? null : { pos: { left: Math.max(8, Math.min(rect.left, window.innerWidth - 300)), top: rect.bottom + 4 } }
    );
  };

  const toggleSel = (id: number) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));

  const exportCsv = () => {
    const head = 'ID,Code,Account manager,Owner,Organization,Phone,Source,Onboarding';
    const lines = rows.map((r) =>
      [r.id, r.code, r.account_manager ?? '', r.owner_name, r.org_name ?? '', r.phone, r.source, r.onboarding.map((o) => o.label).join(';')].join(',')
    );
    const blob = new Blob([[head, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'seller-organizations.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const openFilters = (draftStatuses: string[], draftSources: string[]) => {
    setStatusDraft(draftStatuses);
    setSourceDraft(draftSources);
    setFiltersOpen({ pos: { left: 16, top: 140 } });
  };

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-100 px-4 py-3">
          <h5 className="mb-0 flex items-center gap-2 text-base font-bold text-slate-900">
            <span className="text-sky-600">
              <EmployeeIcon />
            </span>
            Seller organizations
          </h5>
          <div className="ms-auto flex flex-wrap items-center gap-3">
            <div className="relative flex items-center">
              <SearchIcon className="pointer-events-none absolute left-3 text-slate-400" />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(0);
                }}
                placeholder="Search"
                className="w-44 rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-8 pr-2 text-xs text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
              />
              <select
                value={searchField}
                onChange={(e) => {
                  setSearchField(e.target.value);
                  setPage(0);
                }}
                className="ml-1 rounded-lg border border-slate-200 bg-white px-1.5 py-1.5 text-[11px] text-slate-600 outline-none"
              >
                {SEARCH_FIELDS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={`${sort.field}:${sort.dir}`}
              onChange={(e) => {
                const o = SORT_OPTIONS.find((x) => `${x.field}:${x.dir}` === e.target.value);
                if (o) setSort(o);
                setPage(0);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600 outline-none"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={`${o.field}:${o.dir}`} value={`${o.field}:${o.dir}`}>
                  {o.label}
                </option>
              ))}
            </select>
            <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-slate-600">
              <input type="checkbox" checked={mainRetailer} onChange={(e) => { setMainRetailer(e.target.checked); setPage(0); }} className="h-3.5 w-3.5 accent-sky-600" />
              Show only main type retailer
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-slate-600">
              <input type="checkbox" checked={plusMembership} onChange={(e) => { setPlusMembership(e.target.checked); setPage(0); }} className="h-3.5 w-3.5 accent-sky-600" />
              Show only organization with Shipper plus membership
            </label>
            <button type="button" onClick={togglePop} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
              <FunnelIcon className="text-sky-600" />
              Filters
            </button>
            <button type="button" onClick={() => openFilters(statuses, sources)} title="Filters" className="inline-flex rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50">
              <SlidersIcon />
            </button>
            <button type="button" onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100">
              <FileExcelIcon />
              Export All
            </button>
            <button type="button" onClick={() => setSendForm({ org: null })} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100">
              <PaperPlaneIcon />
              Send Notification
            </button>
            <div className="relative">
              <button type="button" disabled className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-400">
                Assign
                <span className="text-[9px]">▼</span>
              </button>
            </div>
          </div>
          {filtersOpen && (
            <FilterOverlay pos={filtersOpen.pos} width={300} onClose={() => setFiltersOpen(null)}>
              <div>
                <div className="px-3 pt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Filters</div>
                <div className="mx-3 my-1 h-px bg-slate-100" />
                <div className="px-3 pb-1 text-[11px] font-semibold text-slate-600">Status</div>
                <div className="max-h-[180px] overflow-y-auto px-2 py-0.5">
                  {statusOptions.map((o) => (
                    <CheckRow key={o} checked={statusDraft.includes(o)} onChange={() => setStatusDraft((d) => (d.includes(o) ? d.filter((x) => x !== o) : [...d, o]))}>
                      <span className="ml-2 text-[11px] font-medium text-slate-700">{o}</span>
                    </CheckRow>
                  ))}
                </div>
                <div className="mx-3 my-1 h-px bg-slate-100" />
                <div className="px-3 pb-1 text-[11px] font-semibold text-slate-600">Source</div>
                <div className="max-h-[180px] overflow-y-auto px-2 py-0.5">
                  {sourceOptions.map((o) => (
                    <CheckRow key={o} checked={sourceDraft.includes(o)} onChange={() => setSourceDraft((d) => (d.includes(o) ? d.filter((x) => x !== o) : [...d, o]))}>
                      <span className="ml-2 text-[11px] font-medium text-slate-700">{o}</span>
                    </CheckRow>
                  ))}
                </div>
                <div className="my-1 h-px bg-slate-100" />
                <div className="flex items-center justify-between px-3 pb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStatusDraft([]);
                      setSourceDraft([]);
                    }}
                    className="text-[11px] font-semibold text-slate-400 transition hover:text-slate-600"
                  >
                    Clear all
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStatuses(statusDraft);
                      setSources(sourceDraft);
                      setPage(0);
                      setFiltersOpen(null);
                    }}
                    className="rounded-md bg-sky-500 px-4 py-1 text-[11px] font-bold text-white transition hover:bg-sky-600"
                  >
                    Save
                  </button>
                </div>
              </div>
            </FilterOverlay>
          )}
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
                  <th className="w-8 px-3 py-2.5">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-3.5 w-3.5 accent-sky-600" />
                  </th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-900">ID</th>
                  {[
                    { id: 'account', label: 'Account manager' },
                    { id: 'organization', label: 'Organization' },
                    { id: 'onboarding', label: 'Onboarding Status' },
                    { id: 'documents', label: 'Documents' },
                    { id: 'follow', label: 'Follow Up Status' },
                    { id: 'source', label: 'Source' },
                  ].map((c) => (
                    <th key={c.id} className={`px-3 py-2.5 text-[11px] font-semibold text-slate-900 ${CENTERED.has(c.id) ? 'text-center' : 'text-left'}`}>
                      {c.label}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-slate-900">Toolbar</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 transition hover:bg-slate-50/60">
                    <td className="px-3 py-2.5">
                      <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleSel(r.id)} className="h-3.5 w-3.5 accent-sky-600" />
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <div className="text-xs font-bold text-slate-900">#{r.id}</div>
                      <div className="text-[11px] text-slate-500">{r.code}</div>
                    </td>
                    <td className="px-3 py-2.5 text-center align-top">
                      {r.account_manager ? (
                        <div className="inline-flex items-center gap-1.5">
                          <Avatar name={r.account_manager} size="h-7 w-7 text-[9px]" img={r.account_manager ? photoFor(r.account_manager) : null} />
                          <div className="text-left">
                            <div className="text-xs font-semibold text-slate-800">{r.account_manager}</div>
                          </div>
                          <button
                            type="button"
                            title="Change account manager"
                            onClick={() => setMgrEdit(r)}
                            className="text-slate-400 transition hover:text-sky-600"
                          >
                            <PencilIcon />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div className="text-[11px] text-slate-500">No user assigned</div>
                          <button
                            type="button"
                            onClick={() => setMgrEdit(r)}
                            className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 transition hover:text-sky-700"
                          >
                            <PencilIcon />
                            Edit
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <div className="flex items-start gap-2.5">
                        <div className="relative shrink-0">
                          <Avatar name={r.org_name ?? r.owner_name} size="h-11 w-11 text-xs ring-2 ring-slate-100" img={r.owner_photo} />
                          <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${r.plus_membership ? 'bg-sky-500' : 'bg-emerald-500'}`} />
                          <span className={`absolute -bottom-0.5 left-0 h-3 w-3 rounded-full border-2 border-white ${r.is_main_retailer ? 'bg-amber-400' : 'bg-slate-300'}`} />
                        </div>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => navigate(`/${base}/seller-organizations/${r.id}`)}
                            className="text-xs font-semibold text-sky-600 transition hover:text-sky-700 hover:underline"
                          >
                            {r.org_name ?? `${r.owner_name}'s store`}
                          </button>
                          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                            <EmployeeIcon />
                            <span className="truncate">{r.owner_name}</span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500" title={new Date(r.joined_at).toLocaleString()}>
                            <ClockIcon className="shrink-0 text-slate-400" />
                            <span>joined {timeAgo(r.joined_at)}</span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                            <PhoneIcon className="shrink-0 text-slate-400" />
                            <span className="whitespace-nowrap">{revealed.has(r.id) ? r.phone_full ?? r.phone : maskPhone(r.phone_full ?? r.phone)}</span>
                            <button
                              type="button"
                              title={revealed.has(r.id) ? 'Hide phone' : 'Show phone'}
                              onClick={() => toggleReveal(r.id)}
                              className="text-slate-400 transition hover:text-sky-600"
                            >
                              <EyeIcon />
                            </button>
                          </div>
                          {r.tags.length > 0 && (
                            <div className="mt-1 flex flex-wrap items-center gap-1">
                              <TagsIcon className="shrink-0 text-slate-300" />
                              {r.tags.map((t) => (
                                <span key={t} className={`inline-flex items-center whitespace-nowrap rounded-full border px-1.5 py-px text-[10px] font-medium ${tagCls(t)}`}>
                                  Q:{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center align-top">
                      <div className="flex flex-col items-start gap-0.5">
                        {r.onboarding.map((o) => (
                          <span key={o.label} className={`inline-flex whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium ${statusBadgeCls(o.label, o.ok)}`}>
                            {o.label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center align-top">
                      {r.documents === 'review' ? (
                        <span className="cursor-pointer text-[11px] font-semibold text-sky-600 hover:text-sky-700">Documents under review</span>
                      ) : (
                        <span className="text-[11px] text-slate-400">No document was uploaded</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center align-top">
                      <div className="inline-flex items-center gap-1">
                        <SupplierFollowUpCard
                          f={r.follow_up ?? null}
                          photoFor={photoFor}
                          onCreate={(m) => setFuModal({ orgId: r.id, initial: null, meeting: m })}
                          onStatusPick={(m) => r.follow_up && setFuModal({ orgId: r.id, initial: r.follow_up, meeting: m })}
                          onConfirmMeeting={() => r.follow_up && setCfModal({ orgId: r.id, initial: r.follow_up })}
                          onEditFollowUp={() => r.follow_up && setFuModal({ orgId: r.id, initial: r.follow_up, meeting: r.follow_up.meeting })}
                          onEditConfirmation={() => r.follow_up && setCfModal({ orgId: r.id, initial: r.follow_up })}
                        />
                        <button type="button" className="inline-flex items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 transition hover:bg-slate-50">
                          Notes
                        </button>
                        <button type="button" onClick={() => setNoteOpen(true)} className="inline-flex items-center rounded border border-slate-200 bg-white p-1 text-slate-500 transition hover:bg-slate-50">
                          <PlusIcon />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center align-top">
                      <span className="inline-flex whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">{r.source}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center align-top">
                      <div className="flex justify-center gap-1.5 text-slate-400">
                        <button type="button" title="History" onClick={() => setHistoryOrg(r)} className="p-1 transition hover:text-sky-600">
                          <ClockIcon />
                        </button>
                        <button type="button" title="Message" onClick={() => setSendForm({ org: r })} className="p-1 transition hover:text-sky-600">
                          <PaperPlaneIcon />
                        </button>
                        <button type="button" title="Open" onClick={() => navigate(`/${base}/seller-organizations/${r.id}`)} className="p-1 transition hover:text-sky-600">
                          <ArrowRightIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <div className="flex justify-center py-14 text-xs text-slate-400">No results found</div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-500">
          <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
            <RotateIcon className="text-slate-400" />
            Refresh
          </button>
          <span className="ml-auto">{selected.size > 0 ? `${selected.size} selected` : ''}</span>
        </div>
        <Pagination page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={total} />
      </div>

      {historyOrg && <NotificationHistoryModal base={base} org={historyOrg} onClose={() => setHistoryOrg(null)} />}
      {sendForm && <SendNotificationModal recipients={sendForm.org ? [sendForm.org.email] : []} onClose={() => setSendForm(null)} />}
      {noteOpen && <AddNoteModal onClose={() => setNoteOpen(false)} />}
      {mgrEdit && (
        <ManagerPickerModal
          base={base}
          title={`Account manager — ${mgrEdit.org_name ?? mgrEdit.owner_name}`}
          current={mgrEdit.account_manager}
          onClose={() => setMgrEdit(null)}
          onPick={async (name) => {
            const updated = await api.updateSellerOrganizationManagers(mgrEdit.id, { account_manager: name });
            setRows((rs) => rs.map((r) => (r.id === mgrEdit.id ? { ...r, account_manager: updated.account_manager ?? null } : r)));
          }}
        />
      )}
      {fuModal && (
        <FollowUpModal
          base={base}
          orgId={fuModal.orgId}
          initial={fuModal.initial}
          meeting={fuModal.meeting}
          kind="seller"
          onClose={() => setFuModal(null)}
          onSaved={(f) => setRows((rs) => rs.map((r) => (r.id === fuModal.orgId ? { ...r, follow_up: f } : r)))}
        />
      )}
      {cfModal && (
        <ConfirmMeetingModal
          base={base}
          orgId={cfModal.orgId}
          initial={cfModal.initial}
          kind="seller"
          onClose={() => setCfModal(null)}
          onSaved={(f) => setRows((rs) => rs.map((r) => (r.id === cfModal.orgId ? { ...r, follow_up: f } : r)))}
        />
      )}
    </>
  );
}

function FileExcelIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
      <path d="M48 0C21.5 0 0 21.5 0 48V464c0 26.5 21.5 48 48 48H336c26.5 0 48-21.5 48-48V48c0-26.5-21.5-48-48-48H48zm64 120c0-4.4 3.6-8 8-8h64c4.4 0 8 3.6 8 8v64c0 4.4-3.6 8-8 8H120c-4.4 0-8-3.6-8-8v-64zm96 0c0-4.4 3.6-8 8-8h64c4.4 0 8 3.6 8 8v64c0 4.4-3.6 8-8 8h-64c-4.4 0-8-3.6-8-8v-64zm0 128c0-4.4 3.6-8 8-8h64c4.4 0 8 3.6 8 8v64c0 4.4-3.6 8-8 8h-64c-4.4 0-8-3.6-8-8v-64zm0 128c0-4.4 3.6-8 8-8h64c4.4 0 8 3.6 8 8v64c0 4.4-3.6 8-8 8h-64c-4.4 0-8-3.6-8-8v-64zm-96-96v64c0 4.4-3.6 8-8 8H120c-4.4 0-8-3.6-8-8v-64c0-4.4 3.6-8 8-8h64c4.4 0 8 3.6 8 8zm-8-184c4.4 0 8 3.6 8 8v64c0 4.4-3.6 8-8 8H120c-4.4 0-8-3.6-8-8v-64c0-4.4 3.6-8 8-8h64zm160-8h64c4.4 0 8 3.6 8 8v64c0 4.4-3.6 8-8 8h-64c-4.4 0-8-3.6-8-8v-64c0-4.4 3.6-8 8-8zm0 128h64c4.4 0 8 3.6 8 8v64c0 4.4-3.6 8-8 8h-64c-4.4 0-8-3.6-8-8v-64c0-4.4 3.6-8 8-8zm0 128h64c4.4 0 8 3.6 8 8v64c0 4.4-3.6 8-8 8h-64c-4.4 0-8-3.6-8-8v-64c0-4.4 3.6-8 8-8z" />
    </svg>
  );
}
