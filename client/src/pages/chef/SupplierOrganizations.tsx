import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  apiErrorMessage,
  chefOrgApi,
  OrgApiBundle,
  SupplierFollowUp,
  SupplierOrganization,
  supportOrgApi,
  TeamMember,
} from '../../lib/api';
import { Spinner } from '../../components/ui';
import { useTeamPhotos } from '../../hooks/useTeamPhotos';
import { AddNoteModal, Avatar, CheckIcon, CheckRow, ClockIcon, EyeIcon, FilterOverlay, FollowUpMenu, FollowUpStatusButton, FOLLOW_UP_TONES, FunnelIcon, InfoIcon, MapPinIcon, Pagination, RotateIcon, SearchIcon, XmarkIcon } from './ui';
import { SendNotificationModal } from './notifications';
import CreateSupplierModal from './CreateSupplierModal';
import FollowUpModal from './FollowUpModal';
import ConfirmMeetingModal from './ConfirmMeetingModal';

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

const CENTERED = new Set(['account', 'onboarding', 'documents', 'follow']);

export function followUpFmt(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function NotesIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="11" height="11" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
      <path d="M64 0C28.7 0 0 28.7 0 64V448c0 35.3 28.7 64 64 64H320c35.3 0 64-28.7 64-64V160H256c-17.7 0-32-14.3-32-32V0H64zM256 0V128c0 8.8 7.2 16 16 16H384L256 0z" />
    </svg>
  );
}

export function SupplierFollowUpCard({
  f,
  onCreate,
  onStatusPick,
  onConfirmMeeting,
  onEditFollowUp,
  onEditConfirmation,
  photoFor,
}: {
  f: SupplierFollowUp | null;
  onCreate?: (m: string) => void;
  onStatusPick?: (m: string) => void;
  onConfirmMeeting?: () => void;
  onEditFollowUp?: () => void;
  onEditConfirmation?: () => void;
  photoFor?: (name: string) => string | null;
}) {
  const [menuPos, setMenuPos] = useState<{ left: number; top: number } | null>(null);
  if (!f) {
    return (
      <FollowUpStatusButton onPick={onCreate}>
        <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium text-slate-500">No follow up</span>
      </FollowUpStatusButton>
    );
  }
  const tone = FOLLOW_UP_TONES[f.meeting] ?? 'from-slate-400 to-slate-600';
  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos((cur) =>
      cur ? null : { left: Math.max(8, Math.min(rect.right - 252, window.innerWidth - 260)), top: rect.top }
    );
  };
  return (
    <div className="w-[250px] cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:border-slate-300">
      <div className="flex items-center gap-1.5 border-b border-slate-200 px-2 py-2">
        <Avatar name={f.person} size="h-6 w-6 text-[8px]" img={photoFor?.(f.person)} />
        <span className="truncate whitespace-nowrap text-[11px] font-semibold text-slate-700">{f.person}</span>
      </div>
      <div className="flex max-w-[190px] items-center gap-1 px-3 py-2 text-[11px] leading-tight text-slate-500">
        <NotesIcon />
        <span className="truncate">{f.label}</span>
      </div>
      <button
        type="button"
        title="Change status"
        onClick={openMenu}
        className={`flex w-full items-center justify-between gap-2 bg-gradient-to-b px-2 py-2 text-[11px] font-semibold text-white ${tone}`}
      >
        <span className="whitespace-nowrap">{f.meeting}</span>
        <span className="whitespace-nowrap">{followUpFmt(f.scheduled_at)}</span>
      </button>
      {f.confirmed ? (
        <div className="border-t border-slate-100 bg-slate-50 px-2 py-2">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 rounded bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
              <CheckIcon />
              Confirmed
            </span>
            <button type="button" onClick={onEditConfirmation} className="text-[10px] font-semibold text-sky-600 transition hover:text-sky-700">
              Edit
            </button>
          </div>
          <div className="space-y-0.5 text-[10px] leading-snug text-slate-500">
            <div><span className="font-bold">Outcome:</span> {f.outcome ?? '—'}</div>
            <div><span className="font-bold">By:</span> {f.by ?? f.person}</div>
            {f.note && <div><span className="font-bold">Notes:</span> {f.note}</div>}
            {!!f.tags?.length && <div><span className="font-bold">Tags:</span> {f.tags.join(', ')}</div>}
            {!!f.attachments?.length && (
              <div>
                <span className="font-bold">Attachments:</span>{' '}
                {f.attachments.map((a, i) => (
                  <span key={a}>
                    {i > 0 && ', '}
                    <a href={a} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">{a.split('/').pop() ?? a}</a>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="border-t border-slate-100 bg-slate-50 px-2 py-2">
          <div className="flex items-center justify-between">
            <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold text-white">Pending</span>
            <button type="button" onClick={onConfirmMeeting} className="text-[10px] font-semibold text-emerald-600 transition hover:text-emerald-700">
              Confirm Meeting
            </button>
            <button type="button" onClick={onEditFollowUp} className="text-[10px] font-semibold text-sky-600 transition hover:text-sky-700">
              Edit
            </button>
          </div>
        </div>
      )}
      {menuPos && (
        <FollowUpMenu
          pos={menuPos}
          onClose={() => setMenuPos(null)}
          onPick={(m) => {
            setMenuPos(null);
            onStatusPick?.(m);
          }}
        />
      )}
    </div>
  );
}

function WarehouseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 640 512" fill="currentColor" aria-hidden="true">
      <path d="M0 171.8V512H640V171.8L320 0 0 171.8zM560 512h-48V272H128v240H80V192h480v320zM176 320h288v32H176v-32zm0 64h288v32H176v-32zm0 64h288v32H176v-32z" />
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

function FileExcelIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
      <path d="M48 0C21.5 0 0 21.5 0 48V464c0 26.5 21.5 48 48 48H336c26.5 0 48-21.5 48-48V48c0-26.5-21.5-48-48-48H48zm64 120c0-4.4 3.6-8 8-8h64c4.4 0 8 3.6 8 8v64c0 4.4-3.6 8-8 8H120c-4.4 0-8-3.6-8-8v-64zm96 0c0-4.4 3.6-8 8-8h64c4.4 0 8 3.6 8 8v64c0 4.4-3.6 8-8 8h-64c-4.4 0-8-3.6-8-8v-64zm0 128c0-4.4 3.6-8 8-8h64c4.4 0 8 3.6 8 8v64c0 4.4-3.6 8-8 8h-64c-4.4 0-8-3.6-8-8v-64zm0 128c0-4.4 3.6-8 8-8h64c4.4 0 8 3.6 8 8v64c0 4.4-3.6 8-8 8h-64c-4.4 0-8-3.6-8-8v-64zm-96-96v64c0 4.4-3.6 8-8 8H120c-4.4 0-8-3.6-8-8v-64c0-4.4 3.6-8 8-8h64c4.4 0 8 3.6 8 8zm-8-184c4.4 0 8 3.6 8 8v64c0 4.4-3.6 8-8 8H120c-4.4 0-8-3.6-8-8v-64c0-4.4 3.6-8 8-8h64zm160-8h64c4.4 0 8 3.6 8 8v64c0 4.4-3.6 8-8 8h-64c-4.4 0-8-3.6-8-8v-64c0-4.4 3.6-8 8-8zm0 128h64c4.4 0 8 3.6 8 8v64c0 4.4-3.6 8-8 8h-64c-4.4 0-8-3.6-8-8v-64c0-4.4 3.6-8 8-8zm0 128h64c4.4 0 8 3.6 8 8v64c0 4.4-3.6 8-8 8h-64c-4.4 0-8-3.6-8-8v-64c0-4.4 3.6-8 8-8z" />
    </svg>
  );
}

function statusBadgeCls(label: string, ok: boolean): string {
  if (label === 'Active') return 'bg-emerald-50 text-emerald-700';
  if (ok) return 'bg-emerald-50 text-emerald-700';
  return 'bg-rose-50 text-rose-700';
}

function SupplierHistoryModal({ org, onClose }: { org: SupplierOrganization; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl" role="document">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h5 className="mb-0 text-sm font-bold text-slate-900">Notifications History</h5>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">#{org.id}</span>
            <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 transition hover:text-slate-600">
              <XmarkIcon />
            </button>
          </div>
        </div>
        <div className="flex justify-center py-16 text-xs text-slate-400">No notifications yet</div>
      </div>
    </div>
  );
}

function AssignManagerModal({ orgId, current, onClose, onSaved, base = 'chef' }: { orgId: number; current: string | null; onClose: () => void; onSaved: (name: string | null) => void; base?: 'chef' | 'support' }) {
  const membersApi: OrgApiBundle = base === 'support' ? supportOrgApi : chefOrgApi;
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [pick, setPick] = useState<string | null>(current);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    membersApi.listTeamMembers()
      .then(setMembers)
      .catch((e) => setError(apiErrorMessage(e)));
  }, []);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await membersApi.updateSupplierOrganizationFlags(orgId, { account_manager: pick });
      onSaved(pick);
      onClose();
    } catch (e) {
      setError(apiErrorMessage(e));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl" role="document">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h5 className="mb-0 text-sm font-bold text-slate-900">Assign Account Manager</h5>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 transition hover:text-slate-600">
            <XmarkIcon />
          </button>
        </div>
        <div className="max-h-[300px] overflow-y-auto py-1">
          {members === null ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setPick(null)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition ${pick === null ? 'bg-sky-50 font-semibold text-sky-700' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {pick === null ? <CheckIcon /> : <span className="w-[11px]" />}
                No user assigned
              </button>
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPick(m.name)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition ${pick === m.name ? 'bg-sky-50 text-sky-700' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  {pick === m.name ? <CheckIcon /> : <span className="w-[11px]" />}
                  <Avatar name={m.name} size="h-6 w-6 text-[8px]" img={m.photo} />
                  <span className="min-w-0 flex-1 truncate font-semibold">{m.name}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500">{m.role}</span>
                </button>
              ))}
              {members.length === 0 && <div className="py-6 text-center text-xs text-slate-400">No team members found</div>}
            </>
          )}
        </div>
        {error && <div className="mx-4 mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">{error}</div>}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={saving || members === null} className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChefSupplierOrganizations({ base = 'chef' }: { base?: 'chef' | 'support' }) {
  const navigate = useNavigate();
  const api: OrgApiBundle = base === 'support' ? supportOrgApi : chefOrgApi;
  const photoFor = useTeamPhotos(base === 'support' ? 'support' : 'chef');
  const [rows, setRows] = useState<SupplierOrganization[]>([]);
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
  const [mainType, setMainType] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState<{ pos: { left: number; top: number } } | null>(null);
  const [statusDraft, setStatusDraft] = useState<string[]>([]);
  const [sourceDraft, setSourceDraft] = useState<string[]>([]);
  const [historyOrg, setHistoryOrg] = useState<SupplierOrganization | null>(null);
  const [sendForm, setSendForm] = useState<{ org: SupplierOrganization | null } | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [fuModal, setFuModal] = useState<{ orgId: number; initial: SupplierFollowUp | null; meeting: string } | null>(null);
  const [cfModal, setCfModal] = useState<{ orgId: number; initial: SupplierFollowUp } | null>(null);
  const [amModal, setAmModal] = useState<{ orgId: number } | null>(null);

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
    if (mainType) params.set('main_type', '1');
    api.searchSupplierOrganizations(params)
      .then((r) => {
        setRows(r.rows);
        setTotal(r.total);
        setStatusOptions(r.filters.statuses);
        setSourceOptions(r.filters.sources);
        setSelected(new Set());
      })
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [debouncedQ, searchField, sort, statuses, sources, mainType, page, pageSize, refreshKey]);

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
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));

  const exportCsv = () => {
    const head = 'ID,Code,Account manager,Owner,Organization,Phone,Source,Onboarding';
    const lines = rows.map((r) =>
      [r.id, r.code, r.account_manager ?? '', r.owner_name, r.org_name, r.phone, r.source, r.onboarding.map((o) => o.label).join(';')].join(',')
    );
    const blob = new Blob([[head, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'supplier-organizations.csv';
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
              <WarehouseIcon />
            </span>
            Suppliers organizations
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
              <input type="checkbox" checked={mainType} onChange={(e) => { setMainType(e.target.checked); setPage(0); }} className="h-3.5 w-3.5 accent-sky-600" />
              Show only main type supplier
            </label>
            <button type="button" onClick={togglePop} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
              <FunnelIcon className="text-sky-600" />
              Filters
            </button>
            <button type="button" onClick={() => openFilters(statuses, sources)} title="Filters" className="inline-flex rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50">
              <SlidersIcon />
            </button>
            <button type="button" title="Refresh" onClick={() => setPage(0)} className="inline-flex rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50">
              <RotateIcon />
            </button>
            <button type="button" disabled className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-400">
              Assign Incubator
            </button>
            <button type="button" disabled className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-400">
              Assign Account Manager
            </button>
            <button type="button" disabled className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-400">
              Assign Business Developer
            </button>
            <button type="button" onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100">
              <FileExcelIcon />
              Export All
            </button>
            <button type="button" onClick={() => setSendForm({ org: null })} className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100">
              <PaperPlaneIcon />
              Send Notification
            </button>
            <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700">
              <PlusIcon />
              Create Supplier
            </button>
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
                    <td className="px-3 py-2.5 align-top">
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
                        </div>
                      ) : (
                        <div>
                          <div className="text-[11px] text-slate-500">No user assigned</div>
                          <button type="button" onClick={() => setAmModal({ orgId: r.id })} className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 transition hover:text-sky-700">
                            <PencilIcon />
                            Edit
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <div className="flex items-start gap-2.5">
                        <Avatar name={r.org_name} size="h-8 w-8 text-[10px]" img={r.owner_photo} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span onClick={() => navigate(`/${base}/supplier-organizations/${r.id}`)} className="cursor-pointer text-xs font-semibold text-sky-600 hover:text-sky-700">
                              {r.org_name}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                            <MapPinIcon className="text-slate-400" />
                            <span className="truncate">{r.city}</span>
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-500">{r.owner_name}</div>
                          <a href={`mailto:${r.email}`} className="mt-0.5 block truncate text-[11px] text-sky-600 hover:underline">
                            {r.email}
                          </a>
                          <div className="mt-0.5 flex items-center text-[11px] text-slate-500">
                            <span>{r.phone}</span>
                            <button type="button" title="Show phone" className="ml-1 text-slate-400 transition hover:text-sky-600">
                              <EyeIcon />
                            </button>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-slate-500">
                            <span className="whitespace-nowrap font-semibold text-sky-600">Tax: {r.tax_id}</span>
                            <span className="text-slate-400">·</span>
                            <span className="whitespace-nowrap">Registration: {r.registration_pct}%</span>
                            <span className="text-slate-400">·</span>
                            <span className="whitespace-nowrap text-sky-600">RNE: {r.rne_code}</span>
                            <span title="About" className="text-slate-400 transition hover:text-sky-600">
                              <InfoIcon />
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center align-top">
                      <div className="flex flex-col items-start gap-0.5">
                        {r.onboarding.map((o) => (
                          <span key={o.label} className={`inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium ${statusBadgeCls(o.label, o.ok)}`}>
                            {o.label !== 'Active' && (o.ok ? <CheckIcon /> : <XmarkIcon />)}
                            {o.label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center align-top">
                      {r.documents === 'missing' ? (
                        <span className="cursor-pointer text-[11px] font-semibold text-amber-600 hover:text-amber-700">Missing documents</span>
                      ) : r.documents === 'no_contract' ? (
                        <span className="text-[11px] text-slate-400">No contract was uploaded</span>
                      ) : (
                        <span className="text-[11px] text-slate-400">No document was uploaded</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center align-top">
                      <div className="inline-flex items-center gap-1">
                        <SupplierFollowUpCard
                          f={r.follow_up}
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
                      <div className="flex justify-center gap-1.5 text-slate-400">
                        <button type="button" title="History" onClick={() => setHistoryOrg(r)} className="p-1 transition hover:text-sky-600">
                          <ClockIcon />
                        </button>
                        <button type="button" title="Message" onClick={() => setSendForm({ org: r })} className="p-1 transition hover:text-sky-600">
                          <PaperPlaneIcon />
                        </button>
                        <button type="button" title="Open products" onClick={() => navigate(`/${base}/supplier-organizations/${r.id}`)} className="p-1 transition hover:text-sky-600">
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

        <Pagination page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={total} />
      </div>

      {historyOrg && <SupplierHistoryModal org={historyOrg} onClose={() => setHistoryOrg(null)} />}
      {sendForm && <SendNotificationModal recipients={sendForm.org ? [sendForm.org.email] : []} onClose={() => setSendForm(null)} />}
      {noteOpen && <AddNoteModal onClose={() => setNoteOpen(false)} />}
      {createOpen && <CreateSupplierModal base={base} onClose={() => setCreateOpen(false)} onCreated={() => { setPage(0); setRefreshKey((k) => k + 1); }} />}
      {amModal && (
        <AssignManagerModal
          base={base}
          orgId={amModal.orgId}
          current={rows.find((r) => r.id === amModal.orgId)?.account_manager ?? null}
          onClose={() => setAmModal(null)}
          onSaved={(name) =>
            setRows((rs) => rs.map((r) => (r.id === amModal.orgId ? { ...r, account_manager: name } : r)))
          }
        />
      )}
      {fuModal && (
        <FollowUpModal
          base={base}
          orgId={fuModal.orgId}
          initial={fuModal.initial}
          meeting={fuModal.meeting}
          onClose={() => setFuModal(null)}
          onSaved={(fu) => setRows((rs) => rs.map((r) => (r.id === fuModal.orgId ? { ...r, follow_up: fu } : r)))}
        />
      )}
      {cfModal && (
        <ConfirmMeetingModal
          base={base}
          orgId={cfModal.orgId}
          initial={cfModal.initial}
          onClose={() => setCfModal(null)}
          onSaved={(fu) => setRows((rs) => rs.map((r) => (r.id === cfModal.orgId ? { ...r, follow_up: fu } : r)))}
        />
      )}
    </>
  );
}