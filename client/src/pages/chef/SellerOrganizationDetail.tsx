import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiErrorMessage, chefOrgApi, OrgApiBundle, SellerOrganization, SupplierFollowUp, supportOrgApi, TeamMember } from '../../lib/api';
import { Spinner } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { AddNoteModal, Avatar, CheckIcon, EyeIcon, FunnelIcon, Pagination, PhoneIcon, SearchIcon, SellerLabelItem, SellerLabelsMenu, SortIcon } from './ui';
import { SendNotificationModal } from './notifications';
import { SupplierFollowUpCard } from './SupplierOrganizations';
import FollowUpModal from './FollowUpModal';
import ConfirmMeetingModal from './ConfirmMeetingModal';
import ChefShipments from './Shipments';
import { DocumentsTab } from './DocumentsTab';

const SELLER_LABELS: SellerLabelItem[] = [
  { name: 'verified seller', tone: 'success' },
  { name: 'wholesale', tone: 'info' },
  { name: 'brand', tone: 'primary' },
  { name: 'active', tone: 'success' },
  { name: 'lead seller', tone: 'primary' },
  { name: 'lead seller contacted', tone: 'info' },
  { name: 'partnership request', tone: 'info' },
  { name: 'on hold', tone: 'warning' },
  { name: 'non serious', tone: 'danger' },
];

function labelToneCls(name: string, labels: SellerLabelItem[]): string {
  const hit = labels.find((l) => l.name === name);
  if (!hit) return 'border-slate-200 bg-white text-slate-600';
  switch (hit.tone) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'info':
      return 'border-sky-200 bg-sky-50 text-sky-700';
    case 'danger':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    case 'primary':
      return 'border-violet-200 bg-violet-50 text-violet-700';
  }
}

const TABS = [
  { label: 'Products', icon: '👕' },
  { label: 'Documents', icon: '📄' },
  { label: 'AQs', icon: '📋' },
  { label: 'Shipments', icon: '🚚' },
  { label: 'Transfer shipments', icon: '🚛' },
  { label: 'Tickets', icon: '🎫' },
  { label: 'Transactions', icon: '💶' },
  { label: 'Sales', icon: '🛍️' },
  { label: 'Balance', icon: '💰' },
  { label: 'Warehouses', icon: '🏢' },
  { label: 'Extra orders', icon: '📦' },
  { label: 'Notifications history', icon: '🕘' },
  { label: 'Integrations', icon: '🧩' },
  { label: 'Affiliate Programs', icon: '📣' },
];

function dateFmt(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function DotUnderline() {
  return (
    <span className="ms-1 inline-flex align-middle text-slate-400">
      <svg width="8" height="8" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
        <path d="M362.7 19.3L314.3 67.7 444.3 197.7l48.4-48.4c25-25 25-65.5 0-90.5L453.3 19.3c-25-25-65.5-25-90.5 0zm-71 71L58.6 323.5c-10.4 10.4-18 23.3-22.2 37.4L1 481.2C-1.5 489.7.8 498.8 7 505s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L421.7 220.3 291.7 90.3z" />
      </svg>
    </span>
  );
}

function SearchBtn() {
  return (
    <button type="button" className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50">
      <FunnelIcon className="mr-1" /> Filter
    </button>
  );
}

function EyeSlashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 640 512" fill="currentColor" aria-hidden="true">
      <path d="M38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2S-1.2 34.7 9.2 42.9l592 464c10.4 8.2 25.5 6.3 33.7-4.1s6.3-25.5-4.1-33.7L525.6 386.7c39.6-40.6 66.4-86.1 79.9-118.4c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C465.5 68.8 400.8 32 320 32c-68.2 0-125 26.3-169.3 60.8L38.8 5.1zM223.1 149.5C248.6 126.2 282.7 112 320 112c79.5 0 144 64.5 144 144c0 24.9-6.3 48.3-17.4 68.7L408 294.5c5.2-11.8 8-24.8 8-38.5c0-53-43-96-96-96c-2.8 0-5.6.1-8.4.4c5.3 9.3 8.4 20.1 8.4 31.6c0 10.2-2.4 19.8-6.6 28.3l-90.3-70.8zm223.1 298L373 389.9c-16.4 6.5-34.3 10.1-53 10.1c-79.5 0-144-64.5-144-144c0-6.9.5-13.6 1.4-20.2L83.1 161.5C60.3 191.2 44 220.8 34.5 243.7c-3.3 7.9-3.3 16.7 0 24.6c14.9 35.7 46.2 87.7 93 131.1C174.5 443.2 239.2 480 320 480c47.8 0 89.9-12.9 126.2-32.5z" />
    </svg>
  );
}

function CaretDownIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 320 512" fill="currentColor" aria-hidden="true">
      <path d="M137.4 374.6c12.5 12.5 32.8 12.5 45.3 0l128-128c9.2-9.2 11.9-22.9 6.9-34.9s-16.6-19.8-29.6-19.8L32 192c-12.9 0-24.6 7.8-29.6 19.8s-2.2 25.7 6.9 34.9l128 128z" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="ms-1" width="9" height="9" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
      <path d="M342.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L274.7 256 105.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z" />
    </svg>
  );
}

function ArrowRightToBracketIcon() {
  return (
    <svg className="me-1" width="12" height="12" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M352 96l64 0c17.7 0 32 14.3 32 32l0 256c0 17.7-14.3 32-32 32l-64 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l64 0c53 0 96-43 96-96l0-256c0-53-43-96-96-96l-64 0c-17.7 0-32 14.3-32 32s14.3 32 32 32zm-9.4 182.6c12.5-12.5 12.5-32.8 0-45.3l-128-128c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L242.7 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l210.7 0-73.4 73.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l128-128z" />
    </svg>
  );
}

function PaperPlaneIcon() {
  return (
    <svg className="me-1" width="12" height="12" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M498.1 5.6c10.1 7 15.4 19.1 13.5 31.2l-64 416c-1.5 9.7-7.4 18.2-16 23s-18.9 5.4-28 1.6L277.3 424.9l-40.1 74.5c-5.2 9.7-16.3 14.6-27 11.9S192 499 192 488V392c0-5.3 1.8-10.5 5.1-14.7L362.4 164.7c2.5-7.1-6.5-14.3-13-8.4L170.4 318.2l-32 28.9c-9.2 8.3-22.3 10.6-33.8 5.8l-85-35.4C8.4 312.8.8 302.2.1 290s5.5-23.7 16.1-29.8l448-256c10.7-6.1 23.9-5.5 34 1.4z" />
    </svg>
  );
}

function FolderOpenIcon() {
  return (
    <svg className="me-1.5" width="12" height="12" viewBox="0 0 576 512" fill="currentColor" aria-hidden="true">
      <path d="M88.7 223.8L0 375.8V96C0 60.7 28.7 32 64 32H181.5c17 0 33.3 6.7 45.3 18.7l26.5 26.5c12 12 28.3 18.7 45.3 18.7H416c35.3 0 64 28.7 64 64v32H144c-22.8 0-43.8 12.1-55.3 31.8zm27.6 16.1C122.1 230 132.6 224 144 224H544c11.5 0 22 6.1 27.7 16.1s5.7 22.2-.1 32.1l-112 192C453.9 474 443.4 480 432 480H32c-11.5 0-22-6.1-27.7-16.1s-5.7-22.2.1-32.1l112-192z" />
    </svg>
  );
}

function EllipsisIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true">
      <path d="M120 256c0 30.9-25.1 56-56 56s-56-25.1-56-56s25.1-56 56-56s56 25.1 56 56zm160 0c0 30.9-25.1 56-56 56s-56-25.1-56-56s25.1-56 56-56s56 25.1 56 56zm104 56c-30.9 0-56-25.1-56-56s25.1-56 56-56s56 25.1 56 56s-25.1 56-56 56z" />
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

function PlusIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true">
      <path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32V224H48c-17.7 0-32 14.3-32 32s14.3 32 32 32H192V432c0 17.7 14.3 32 32 32s32-14.3 32-32V288H400c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V80z" />
    </svg>
  );
}

function DetailRow({ label, children, nowrap = false }: { label: string; children: React.ReactNode; nowrap?: boolean }) {
  return (
    <tr className="mb-2 align-top">
      <td className={`whitespace-nowrap pe-2 text-[11px] font-semibold text-slate-500 ${nowrap ? 'whitespace-nowrap' : ''}`}>{label}</td>
      <td className="pb-1.5 text-[11px] font-semibold text-slate-800">{children}</td>
    </tr>
  );
}

type StatusOption = { value: string; label: string; tone: string };

const STATUS_TONE_ACTIVE = 'from-emerald-400 to-emerald-600';
const STATUS_TONE_WARNING = 'from-amber-400 to-amber-600';
const STATUS_TONE_DANGER = 'from-rose-400 to-rose-600';

function StatusPill({ options, value, onSelect }: { options: StatusOption[]; value: string; onSelect?: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  const cur = options.find((o) => o.value === value) ?? options[0];
  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ left: r.left, top: r.bottom + 2, width: r.width });
    }
    setOpen((o) => !o);
  };
  return (
    <div className="w-full">
      <button
        ref={btnRef}
        type="button"
        title="Change status"
        onClick={toggle}
        className={`flex w-full items-center justify-between gap-2 rounded-lg bg-gradient-to-b px-2 py-1.5 text-[11px] font-semibold text-white transition hover:brightness-105 ${cur.tone}`}
      >
        <span className="whitespace-nowrap px-1">{cur.label}</span>
        <span className="px-2">
          <CaretDownIcon />
        </span>
      </button>
      {open && pos && (
        <div
          ref={menuRef}
          style={{ left: pos.left, top: pos.top, width: pos.width }}
          className="fixed z-[80] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          {options.map((o, i) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                setOpen(false);
                if (o.value !== value) onSelect?.(o.value);
              }}
              className={`flex w-full items-center justify-between px-3 py-2 text-[11px] font-semibold text-white bg-gradient-to-b transition hover:brightness-110 ${o.tone} ${
                i === 0 ? 'rounded-t-lg' : ''
              } ${i === options.length - 1 ? 'rounded-b-lg' : 'border-b border-white/20'}`}
            >
              <span className="whitespace-nowrap">{o.label}</span>
              {o.value === value && <CheckIcon />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MemberPicker({ anchor, current, onPick, onClose, base = 'chef' }: { anchor: HTMLElement; current: string | null; onPick: (name: string | null) => void; onClose: () => void; base?: 'chef' | 'support' }) {
  const api = base === 'support' ? supportOrgApi : chefOrgApi;
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [q, setQ] = useState('');
  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    api.listTeamMembers()
      .then(setMembers)
      .catch(() => setMembers([]));
  }, []);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && !anchor.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [onClose, anchor]);
  const filtered = (members ?? []).filter((m) => m.name.toLowerCase().includes(q.trim().toLowerCase()));
  const rect = anchor.getBoundingClientRect();
  const left = Math.max(8, Math.min(rect.left - 40, window.innerWidth - 296));
  return (
    <div
      ref={menuRef}
      style={{ left, top: rect.bottom + 4 }}
      className="fixed z-[80] w-[280px] overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-xl"
    >
      <div className="border-b border-slate-100 px-3 py-2 text-xs font-bold text-slate-800">Select Member</div>
      <div className="px-3 py-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search team member"
          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-[11px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </div>
      <ul className="mb-0 max-h-[280px] list-none overflow-y-auto p-0">
        {members === null ? (
          <li className="px-3 py-3 text-center text-[11px] text-slate-400">Loading…</li>
        ) : (
          <>
            <li>
              <button
                type="button"
                onClick={() => {
                  onPick(null);
                  onClose();
                }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left transition hover:bg-slate-100 ${current === null ? 'bg-sky-50' : ''}`}
              >
                <Avatar name="Unassigned" size="h-8 w-8 text-[9px]" />
                <span className="flex-1 truncate text-[11px] font-semibold text-slate-700">Unassigned</span>
                {current === null && <CheckIcon />}
              </button>
            </li>
            {filtered.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(m.name);
                    onClose();
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left transition hover:bg-slate-100 ${current === m.name ? 'bg-sky-50' : ''}`}
                >
                  <Avatar name={m.name} size="h-8 w-8 text-[9px]" />
                  <span className="flex-1 truncate text-[11px] font-semibold text-slate-700">{m.name}</span>
                  {current === m.name && <CheckIcon />}
                </button>
              </li>
            ))}
            {members !== null && filtered.length === 0 && q.trim() !== '' && (
              <li className="px-3 py-2 text-center text-[11px] text-slate-400">No members found</li>
            )}
          </>
        )}
      </ul>
    </div>
  );
}

export default function ChefSellerOrganizationDetail({ base = 'chef' }: { base?: 'chef' | 'support' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const api: OrgApiBundle = base === 'support' ? supportOrgApi : chefOrgApi;
  const [org, setOrg] = useState<SellerOrganization | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPhone, setShowPhone] = useState(false);
  const [tab, setTab] = useState('Products');
  const [q, setQ] = useState('');
  const [sendOpen, setSendOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [fuModal, setFuModal] = useState<{ orgId: number; initial: SupplierFollowUp | null; meeting: string } | null>(null);
  const [cfModal, setCfModal] = useState<{ orgId: number; initial: SupplierFollowUp } | null>(null);
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const [amAnchor, setAmAnchor] = useState<HTMLElement | null>(null);
  const [bdPickerOpen, setBdPickerOpen] = useState(false);
  const [bdAnchor, setBdAnchor] = useState<HTMLElement | null>(null);
  const [allLabels, setAllLabels] = useState<SellerLabelItem[]>(() => SELLER_LABELS);
  const [labelMenu, setLabelMenu] = useState<{ pos: { left: number; top: number } } | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const { impersonate } = useAuth();
  const [accessing, setAccessing] = useState(false);

  const handleAccess = async () => {
    if (accessing || !org) return;
    setAccessing(true);
    try {
      const data = await api.accessSellerOrganization(org.id);
      impersonate(data.token, data.user);
      window.location.href = '/dropshipper';
    } catch (e) {
      alert(apiErrorMessage(e));
      setAccessing(false);
    }
  };

  useEffect(() => {
    const n = Number(id);
    if (!Number.isFinite(n) || n === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api.getSellerOrganization(n)
      .then(setOrg)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner />;

  if (!org) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="text-4xl">🔍</div>
        <p className="text-sm font-semibold text-slate-600">Seller organization not found</p>
        <button
          type="button"
          onClick={() => navigate(`/${base}/seller-organizations`)}
          className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-sky-700"
        >
          Back to Suppliers
        </button>
      </div>
    );
  }

  const maskedPhone = (show: boolean) => (show ? org.phone_full ?? org.phone : org.phone);

  const patchManager = (patch: { account_manager?: string | null; business_developer?: string | null }) => {
    api.updateSellerOrganizationManagers(org.id, patch)
      .then(setOrg)
      .catch((e) => alert(apiErrorMessage(e)));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-2">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBtn />
          <button type="button" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50">
            <EyeSlashIcon />
          </button>
          <div className="relative w-full sm:w-[550px]">
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) navigate(`/${base}/seller-organizations/${e.target.value}`);
              }}
              className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-2 pr-8 text-[11px] text-slate-600 outline-none transition focus:border-sky-400"
            >
              <option value="" disabled>
                No pre set
              </option>
              <option value={org.id.toString()}>{org.org_name}</option>
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
              <CaretDownIcon />
            </span>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-600">
          <span className="lh-sm">
            <span className="me-2 font-semibold text-slate-700">Organization statuses:</span>
          </span>
          <span className="flex items-center whitespace-nowrap">
            <span className="me-1 font-semibold text-slate-700">Sort by:</span>
            <SortIcon />
            <span className="ms-1">Last seen at</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/${base}/seller-organizations/${org.id + 2}`)}
          className="inline-flex items-center rounded-lg bg-emerald-500 px-5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
        >
          Next
          <ChevronRightIcon />
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-gradient-to-b from-slate-100 to-slate-50 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <Avatar name={org.org_name ?? org.owner_name} size="h-16 w-16 text-lg border-2 border-slate-300" img={org.owner_photo} />
            <h3 className="mb-0 text-lg font-bold text-amber-500">
              {org.org_name ?? org.owner_name} - seller - {org.code}
            </h3>
          </div>
          <div className="ms-auto flex flex-wrap items-center gap-1">
            <span className="me-1 inline-flex items-center">
              <span className="text-sm">{maskedPhone(showPhone)}</span>
              <button type="button" title="Show phone number" onClick={() => setShowPhone((s) => !s)} className="ms-2 cursor-pointer text-slate-400 transition hover:text-sky-600">
                {showPhone ? <EyeSlashIcon /> : <EyeIcon />}
              </button>
            </span>
            <button type="button" className="m-1 rounded-lg bg-sky-600 p-1.5 text-white transition hover:bg-sky-700">
              <PhoneIcon />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <button type="button" onClick={handleAccess} disabled={accessing} className="me-1 my-1 rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-1.5 text-[11px] font-semibold text-cyan-700 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60">
              <ArrowRightToBracketIcon />
              {accessing ? 'Accessing…' : 'Access'}
            </button>
            <button
              type="button"
              onClick={() => setSendOpen(true)}
              className="me-1 my-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100"
            >
              <PaperPlaneIcon />
              Send Notification
            </button>
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="min-w-0">
              <table className="mt-1 w-full">
                <tbody>
                  <DetailRow label="Name:">
                    <span className="text-sky-600">{org.owner_name}</span>
                  </DetailRow>
                  <DetailRow label="Phone:">
                    <span className="inline-flex items-center">
                      <span>{maskedPhone(showPhone)}</span>
                      <button type="button" title="Show phone number" onClick={() => setShowPhone((s) => !s)} className="ms-1.5 text-slate-400 transition hover:text-sky-600">
                        {showPhone ? <EyeSlashIcon /> : <EyeIcon />}
                      </button>
                    </span>
                    <span className="mx-1 text-slate-400">/</span>
                    <span className="inline-flex items-center">
                      <span>{maskedPhone(showPhone)}</span>
                      <button type="button" title="Show phone number" onClick={() => setShowPhone((s) => !s)} className="ms-1.5 text-slate-400 transition hover:text-sky-600">
                        {showPhone ? <EyeSlashIcon /> : <EyeIcon />}
                      </button>
                    </span>
                  </DetailRow>
                  <DetailRow label="Email:">{org.email}</DetailRow>
                </tbody>
              </table>
              <div className="mt-2 flex items-center">
                <span className="pe-2 text-[11px] font-semibold text-slate-500">Incubator:</span>
                <span className="text-[11px] text-slate-400">No user assigned</span>
                <span className="ms-3 inline-flex cursor-pointer items-start text-slate-400 transition hover:text-sky-600">
                  <DotUnderline />
                  <span className="ms-0.5 flex items-center text-[11px]">Edit</span>
                </span>
              </div>
              <div className="relative mt-2 flex items-center">
                <span className="pe-2 text-[11px] font-semibold text-slate-500">Account manager:</span>
                {org.account_manager ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                    <Avatar name={org.account_manager as string} size="h-6 w-6 text-[8px]" />
                    {org.account_manager}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">No user assigned</span>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    if (memberPickerOpen) setMemberPickerOpen(false);
                    else {
                      setAmAnchor(e.currentTarget);
                      setMemberPickerOpen(true);
                    }
                  }}
                  className="ms-3 inline-flex cursor-pointer items-center text-slate-400 transition hover:text-sky-600"
                >
                  <DotUnderline />
                  <span className="ms-0.5 text-[11px]">Edit</span>
                </button>
                {memberPickerOpen && amAnchor && (
                  <MemberPicker
                    base={base}
                    anchor={amAnchor}
                    current={org.account_manager ?? null}
                    onPick={(name) => patchManager({ account_manager: name })}
                    onClose={() => setMemberPickerOpen(false)}
                  />
                )}
              </div>
              <div className="relative mt-2 flex items-center">
                <span className="pe-2 text-[11px] font-semibold text-slate-500">Business developer:</span>
                {org.business_developer ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                    <Avatar name={org.business_developer as string} size="h-6 w-6 text-[8px]" />
                    {org.business_developer}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400">No user assigned</span>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    if (bdPickerOpen) setBdPickerOpen(false);
                    else {
                      setBdAnchor(e.currentTarget);
                      setBdPickerOpen(true);
                    }
                  }}
                  className="ms-3 inline-flex cursor-pointer items-center text-slate-400 transition hover:text-sky-600"
                >
                  <DotUnderline />
                  <span className="ms-0.5 text-[11px]">Edit</span>
                </button>
                {bdPickerOpen && bdAnchor && (
                  <MemberPicker
                    base={base}
                    anchor={bdAnchor}
                    current={org.business_developer ?? null}
                    onPick={(name) => patchManager({ business_developer: name })}
                    onClose={() => setBdPickerOpen(false)}
                  />
                )}
              </div>
            </div>

            <div className="min-w-0">
              <table className="mt-1 w-full">
                <tbody>
                  <DetailRow label="Role:">
                    <span className="mx-1 text-sky-600">seller</span>
                  </DetailRow>
                  <DetailRow label="Email:">{org.email}</DetailRow>
                  <DetailRow label="Source:">{org.source}</DetailRow>
                  <DetailRow label="Joined at:">{dateFmt(org.joined_at)}</DetailRow>
                  <DetailRow label="Last seen at:">{dateFmt(org.last_seen_at)}</DetailRow>
                </tbody>
              </table>
            </div>

            <div className="min-w-0">
              <table className="mt-1 w-full">
                <tbody>
                  <DetailRow label="Main retailer:" nowrap>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${org.is_main_retailer ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                      {org.is_main_retailer ? 'Yes' : 'No'}
                    </span>
                  </DetailRow>
                  <DetailRow label="Plus membership:">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${org.plus_membership ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-500'}`}>
                      {org.plus_membership ? 'Active' : 'Inactive'}
                    </span>
                  </DetailRow>
                  <DetailRow label="Tags:">
                    {org.tags.length > 0 ? org.tags.map((t) => (
                      <span key={t} className="me-1 inline-flex items-center rounded-full bg-slate-100 px-1.5 py-px text-[10px] font-medium text-slate-600">{t}</span>
                    )) : <span className="text-slate-400">—</span>}
                  </DetailRow>
                </tbody>
              </table>
            </div>
          </div>

          <hr className="my-4 border-slate-100" />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-7">
              <div>
                <div className="mb-1 flex w-full items-center">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-sm">⚙️</span>
                  <h6 className="ms-1.5 mb-0 text-xs font-bold text-slate-800">Account status</h6>
                </div>
                <StatusPill
                  value={org.account_status ?? 'active'}
                  onSelect={(v) => {
                    api.updateSellerOrganizationOnboarding(org.id, v)
                      .then(setOrg)
                      .catch((e) => alert(apiErrorMessage(e)));
                  }}
                  options={[
                    { value: 'active', label: 'Active', tone: STATUS_TONE_ACTIVE },
                    { value: 'suspended', label: 'Suspended', tone: STATUS_TONE_DANGER },
                    { value: 'pending', label: 'Pending review', tone: STATUS_TONE_WARNING },
                  ]}
                />
              </div>
              <div>
                <div className="mb-1 flex w-full items-center">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-sm">📋</span>
                  <h6 className="ms-1.5 mb-0 text-xs font-bold text-slate-800">Documents</h6>
                </div>
                <div className="flex w-full items-center rounded-lg bg-slate-100 px-2 py-2 text-[11px] text-slate-600">
                  <FolderOpenIcon />
                  {org.documents === 'review' ? 'Documents under review' : 'No document was uploaded'}
                </div>
              </div>
              <div>
                <div className="mb-1 flex w-full items-center">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-sm">🏷️</span>
                  <h6 className="ms-1.5 mb-0 text-xs font-bold text-slate-800">Allow products on marketplace</h6>
                </div>
                <StatusPill
                  value={org.allow_marketplace ? 'yes' : 'no'}
                  onSelect={(v) => {
                    api.patchSellerOrganizationFlags(org.id, { allow_marketplace: v === 'yes' })
                      .then(setOrg)
                      .catch((e) => alert(apiErrorMessage(e)));
                  }}
                  options={[
                    { value: 'yes', label: 'Yes', tone: STATUS_TONE_ACTIVE },
                    { value: 'no', label: 'No', tone: STATUS_TONE_WARNING },
                  ]}
                />
              </div>
              <div>
                <div className="mb-1 flex w-full items-center">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-sm">🛒</span>
                  <h6 className="ms-1.5 mb-0 text-xs font-bold text-slate-800">Allowed to sell dropshipping</h6>
                </div>
                <StatusPill
                  value={org.dropshipping_eligible ? 'yes' : 'no'}
                  onSelect={(v) => {
                    api.patchSellerOrganizationFlags(org.id, { dropshipping_eligible: v === 'yes' })
                      .then(setOrg)
                      .catch((e) => alert(apiErrorMessage(e)));
                  }}
                  options={[
                    { value: 'yes', label: 'Yes', tone: STATUS_TONE_ACTIVE },
                    { value: 'no', label: 'No', tone: STATUS_TONE_WARNING },
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-5">
              <div>
                <div className="mb-3 flex w-full items-center">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-sm">🔖</span>
                  <h6 className="ms-1.5 mb-0 text-xs font-bold text-slate-800">Labels</h6>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {org.tags?.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setLabelMenu({ pos: { left: Math.max(8, Math.min(rect.right - 400, window.innerWidth - 400 - 8)), top: rect.bottom + 4 } });
                      }}
                      className={`inline-flex items-center whitespace-nowrap rounded-full border px-1.5 py-px text-[10px] font-semibold transition hover:brightness-95 ${labelToneCls(t, allLabels)}`}
                    >
                      {t}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setLabelMenu((cur) =>
                        cur ? null : { pos: { left: Math.max(8, Math.min(rect.right - 400, window.innerWidth - 400 - 8)), top: rect.bottom + 4 } }
                      );
                    }}
                    className="inline-flex rounded-full border border-slate-200 bg-white p-1 text-slate-500 transition hover:bg-slate-50"
                  >
                    <PlusIcon />
                  </button>
                </div>
              </div>
              <div>
                <div className="mb-3 flex w-full items-center">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-sm">📣</span>
                  <h6 className="ms-1.5 mb-0 text-xs font-bold text-slate-800">Acquisition</h6>
                </div>
                <span className="inline-flex flex-wrap items-center gap-1">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{org.source}</span>
                </span>
                {org.source === 'Not attributed' && (
                  <div className="mt-2 text-[11px] text-slate-500">Signup captured no campaign data and no onboarding answer.</div>
                )}
              </div>
              <div className="sm:col-span-2">
                <div className="mb-3 flex w-full items-center">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-sm">📝</span>
                  <h6 className="ms-1.5 mb-0 text-xs font-bold text-slate-800">Follow Up Status</h6>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <SupplierFollowUpCard
                    f={org.follow_up ?? null}
                    onCreate={(m) => setFuModal({ orgId: org.id, initial: null, meeting: m })}
                    onStatusPick={(m) => org.follow_up && setFuModal({ orgId: org.id, initial: org.follow_up, meeting: m })}
                    onConfirmMeeting={() => org.follow_up && setCfModal({ orgId: org.id, initial: org.follow_up })}
                    onEditFollowUp={() => org.follow_up && setFuModal({ orgId: org.id, initial: org.follow_up, meeting: org.follow_up.meeting })}
                    onEditConfirmation={() => org.follow_up && setCfModal({ orgId: org.id, initial: org.follow_up })}
                  />
                  <button type="button" onClick={() => setNoteOpen(true)} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100">
                    Notes
                  </button>
                  <button type="button" onClick={() => setNoteOpen(true)} className="rounded-lg border border-amber-200 bg-amber-50 p-1 text-amber-700 transition hover:bg-amber-100">
                    <PlusIcon />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-nowrap gap-0">
          {TABS.map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() => setTab(t.label)}
              className={`flex items-center gap-2 border-r border-slate-100 px-3 py-2.5 transition ${
                tab === t.label ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="text-sm leading-none">{t.icon}</span>
              <span className="whitespace-nowrap text-xs font-semibold">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {tab === 'Products' ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
            <h5 className="mb-0 text-sm font-bold text-slate-900">{tab}</h5>
            <div className="ms-auto flex items-center gap-1.5">
              <div className="relative">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search"
                  className="rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-7 pr-2 text-xs text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
                />
                <SearchIcon className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
              <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50">
                <FunnelIcon className="mr-1" />
                Filter
              </button>
              <button type="button" className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:bg-slate-50">
                <EllipsisIcon />
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
                  {['GID', 'Product', 'Status', 'Shipping status', 'Product Labels', 'Collections', 'Created at', 'Toolbar'].map((h) => (
                    <th
                      key={h}
                      className={`whitespace-nowrap px-3 py-2 text-[11px] font-semibold text-slate-900 ${h === 'Toolbar' ? 'text-right' : 'text-left'}`}
                    >
                      {h}
                      {h !== 'Shipping status' && h !== 'Toolbar' && (
                        <span className="ms-1 text-sky-600">
                          <SortIcon />
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={8} className="px-3 py-2">
                    <div className="flex items-center justify-center" style={{ height: 90 }}>
                      <span className="text-xs text-slate-400">No results found</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <Pagination page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={0} />
        </div>
      ) : tab === 'Shipments' ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <ChefShipments key={String(org.id + '_ship')} defaultSupplier={org.org_name ?? org.owner_name} />
        </div>
      ) : tab === 'Documents' ? (
        <DocumentsTab
          docFiles={org.doc_files ?? {}}
          docStatuses={org.doc_statuses ?? {}}
          onSaveFlags={(patch) => api.patchSellerOrganizationFlags(org.id, patch).then(setOrg)}
        />
      ) : (
        <div className="flex justify-center rounded-2xl border border-slate-200 bg-white py-12 text-xs text-slate-400">No results found</div>
      )}

      {sendOpen && <SendNotificationModal recipients={[org.email]} onClose={() => setSendOpen(false)} />}
      {noteOpen && <AddNoteModal onClose={() => setNoteOpen(false)} />}
      {fuModal && (
        <FollowUpModal
          base={base}
          orgId={fuModal.orgId}
          initial={fuModal.initial}
          meeting={fuModal.meeting}
          onClose={() => setFuModal(null)}
          onSaved={(fu) => setOrg((o) => (o ? { ...o, follow_up: fu } : o))}
        />
      )}
      {cfModal && (
        <ConfirmMeetingModal
          base={base}
          orgId={cfModal.orgId}
          initial={cfModal.initial}
          onClose={() => setCfModal(null)}
          onSaved={(fu) => setOrg((o) => (o ? { ...o, follow_up: fu } : o))}
        />
      )}
      {labelMenu && (
        <SellerLabelsMenu
          pos={labelMenu.pos}
          labels={allLabels}
          selected={org.tags ?? []}
          onToggle={(name) => {
            const next = org.tags.includes(name) ? org.tags.filter((l: string) => l !== name) : [...org.tags, name];
            setOrg((o) => (o ? { ...o, tags: next } : o));
            api.updateSellerOrganizationTags(org.id, next)
              .then((updated) => { if (updated) setOrg(updated); })
              .catch((e) => alert(apiErrorMessage(e)));
          }}
          onCreate={(name) => {
            const next = org.tags.includes(name) ? org.tags : [...org.tags, name];
            setOrg((o) => (o ? { ...o, tags: next } : o));
            api.updateSellerOrganizationTags(org.id, next)
              .then((updated) => { if (updated) setOrg(updated); })
              .catch((e) => alert(apiErrorMessage(e)));
            setAllLabels((ls) => (ls.some((l) => l.name === name) ? ls : [...ls, { name, tone: 'primary' }]));
          }}
          onClose={() => setLabelMenu(null)}
        />
      )}
    </div>
  );
}