import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  addProductToCollection,
  apiErrorMessage,
  apiUpload,
  apiUploadVideo,
  ChefProductPatch,
  Collection,
  createChefTicket,
  createSupportTicket,
  getCollections,
  getFindProductDetail,
  getProductSupplierOrg,
  getSupplierProductDetail,
  getSupportCollections,
  getSupportFindProductDetail,
  getSupportProductSupplierOrg,
  moderateChefProduct,
  ModerateStatus,
  removeProductFromCollection,
  SupplierProductDetail,
  SupplierProductOffer,
  SupplierProductStatus,
  updateChefProduct,
} from '../../lib/api';
import { Modal, Spinner } from '../../components/ui';
import { Avatar, BanIcon, CheckIcon, HourglassIcon, XmarkIcon, clockSlot, slot, tnd, tileBg } from './ui';

type Tab = 'description' | 'specifications' | 'reviews' | 'stock';
type MenuType = 'labels' | 'collections' | 'shipping';

const LABEL_POOL: { name: string; tone: 'success' | 'info' | 'danger' | 'warning' }[] = [
  { name: 'win', tone: 'success' },
  { name: 'follow up', tone: 'info' },
  { name: 'test', tone: 'danger' },
  { name: 'test ok', tone: 'success' },
  { name: 'declined & unreachable => follow up', tone: 'warning' },
  { name: 'final', tone: 'danger' },
  { name: 'solve problem', tone: 'success' },
  { name: 'over priced', tone: 'danger' },
  { name: 'not ready', tone: 'danger' },
  { name: 'duplicated', tone: 'info' },
  { name: 'verified', tone: 'success' },
  { name: 'awaiting stock / price confirmation', tone: 'warning' },
  { name: 'need content', tone: 'warning' },
  { name: 'wrong content', tone: 'danger' },
  { name: 'model number is not available yet', tone: 'warning' },
  { name: 'mayar shop', tone: 'info' },
  { name: 'hafed', tone: 'info' },
  { name: 'casa decor', tone: 'info' },
  { name: 'smc', tone: 'info' },
  { name: 'hichem enzo', tone: 'info' },
  { name: 'fulfillment', tone: 'warning' },
  { name: 'product issue', tone: 'danger' },
  { name: 'scam', tone: 'danger' },
  { name: 'optmized', tone: 'success' },
  { name: 'ramadan', tone: 'info' },
  { name: 'aid sghir', tone: 'info' },
  { name: 'aid kbir', tone: 'info' },
  { name: 'mois du blanc', tone: 'info' },
  { name: 'voyage', tone: 'info' },
  { name: 'été', tone: 'info' },
  { name: 'sport', tone: 'info' },
  { name: 'voirure', tone: 'info' },
  { name: 'needs optimization', tone: 'warning' },
];

const LABEL_TONES: Record<string, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  info: 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100',
  danger: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
};

function labelTone(name: string): string {
  return LABEL_TONES[LABEL_POOL.find((l) => l.name === name)?.tone ?? ''] ?? 'border-slate-200 bg-slate-50 text-slate-600';
}

const SHIPPING_GROUPS = ['Standard Group', 'Express Group', 'Manually handled', 'Bulk / wholesale'];

const OFFER_TILE: Record<SupplierProductOffer, { icon: string; cls: string; label: string }> = {
  dropshipping: { icon: '🪂', cls: 'bg-sky-50 text-sky-700', label: 'Dropshipping' },
  wholesale: { icon: '📦', cls: 'bg-violet-50 text-violet-700', label: 'Wholesale' },
  white_label: { icon: '🏷️', cls: 'bg-amber-50 text-amber-700', label: 'White label' },
};

const STATUS_META: Record<SupplierProductStatus, { icon: string; tone: string; title: string; sub: string }> = {
  Active: {
    icon: '✅',
    tone: 'border-emerald-400 bg-emerald-50',
    title: 'Product is active',
    sub: 'Product is active and eligible for display in market',
  },
  'In Review': {
    icon: '⏳',
    tone: 'border-amber-400 bg-amber-50',
    title: 'Product under review',
    sub: 'This product is not eligible for display in market yet. Our team will review it soon and activate it.',
  },
  Declined: {
    icon: '⛔',
    tone: 'border-rose-400 bg-rose-50',
    title: 'Product declined',
    sub: 'This product is not eligible for display in market. Please fix the decline reasons below or contact our team.',
  },
  Inactive: {
    icon: '💤',
    tone: 'border-slate-300 bg-slate-50',
    title: 'Product inactive',
    sub: 'This product is hidden and not eligible for display in market.',
  },
};

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center">
      <span className="relative inline-block text-amber-300">
        {'★★★★★'}
        <span className="absolute left-0 top-0 overflow-hidden whitespace-nowrap text-amber-500" style={{ width: `${Math.round((n / 5) * 100)}%` }} />
      </span>
      <span className="ml-1.5 text-xs text-slate-500">(0)</span>
    </span>
  );
}

function PencilIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M362.7 19.3L314.3 67.7 444.3 197.7l48.4-48.4c25-25 25-65.5 0-90.5L453.3 19.3c-25-25-65.5-25-90.5 0zm-71 71L58.6 323.5c-10.4 10.4-18 23.3-22.2 37.4L1 481.2C-1.5 489.7.8 498.8 7 505s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L421.7 220.3 291.7 90.3z" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M448 80c8.8 0 16 7.2 16 16V415.8l-5-6.5-136-176c-4.5-5.9-11.6-9.3-19-9.3s-14.4 3.4-19 9.3L202 316.1l-30.5-42.7C167 267.5 159.7 264 152 264s-15 3.5-19.5 9.3L64 347.5V96c0-8.8 7.2-16 16-16H448zM0 81.7V96 416c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64C28.7 32 0 60.7 0 96 0 91.1 0 81.7 0 81.7zM160 192a48 48 0 1 0 96 0 48 48 0 1 0-96 0z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32V274.7l-73.4-73.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l128 128c12.5 12.5 32.8 12.5 45.3 0l128-128c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L288 274.7V32zM64 352c-35.3 0-64 28.7-64 64v32c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V416c0-35.3-28.7-64-64-64H346.5l-45.3 45.3c-25 25-65.5 25-90.5 0L165.5 352H64zm368 56a24 24 0 1 1 0 48 24 24 0 1 1 0-48z" />
    </svg>
  );
}

function SquareCheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true">
      <path d="M64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H384c35.3 0 64-28.7 64-64V96c0-35.3-28.7-64-64-64H64zm350.6 132.5c8.7-8.9 8.6-23.3-.3-32s-23.3-8.6-32 .3L278.6 238.4c-5.7 5.9-14.9 6-20.8.3L207.5 190c-9-8.6-23.4-8.3-32 .3s-8.3 23.4 .3 32l50.3 48.6c18.6 17.9 47.5 17.9 66 0l122.9-125.9z" />
    </svg>
  );
}

function DocLinesIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
      <path d="M64 0C28.7 0 0 28.7 0 64V448c0 35.3 28.7 64 64 64H320c35.3 0 64-28.7 64-64V160H256c-17.7 0-32-14.3-32-32V0H64zM256 0V128H384L256 0zM112 256H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16z" />
    </svg>
  );
}

function UserGroupIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 640 512" fill="currentColor" aria-hidden="true">
      <path d="M144 160a80 80 0 1 1 0 160 80 80 0 1 1 0-160zm368 0a80 80 0 1 1 0 160 80 80 0 1 1 0-160zM0 298.7C0 239.8 47.8 192 106.7 192h42.7c15.9 0 31 3.5 44.6 9.7c-1.3 7.2-1.9 14.7-1.9 22.3c0 38.2 16.8 72.5 43.3 96c-.2 0-.4 0-.7 0H21.3C9.6 320 0 310.4 0 298.7zM405.3 320c-.2 0-.4 0-.7 0c26.6-23.5 43.3-57.8 43.3-96c0-7.6-.7-15-1.9-22.3c13.6-6.3 28.7-9.7 44.6-9.7h42.7C592.2 192 640 239.8 640 298.7c0 11.8-9.6 21.3-21.3 21.3H405.3zM224 224a48 48 0 1 0 96 0 48 48 0 1 0-96 0zm192 0a48 48 0 1 0 96 0 48 48 0 1 0-96 0z" />
    </svg>
  );
}

function RotationIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M142.9 142.9c-17.5 17.5-30.1 38-37.8 59.8c-5.9 16.7-24.2 25.4-40.8 19.5s-25.4-24.2-19.5-40.8C55.6 150.7 73.2 122 105.1 93C192.6 5.5 334.4 5.5 421.9 93L448 119.1V64c0-17.7 14.3-32 32-32s32 14.3 32 32v128c0 17.7-14.3 32-32 32H352c-17.7 0-32-14.3-32-32s14.3-32 32-32h40.9L375 99.3c-62.5-62.5-163.8-62.5-226.3 0-8.5 8.5-16.3 17.7-23.5 27.9l17.6 17.6-.2 0zM368.5 368.5c-62.5 62.5-163.8 62.5-226.3 0l-.1-.1L113.1 352H176c17.7 0 32-14.3 32-32s-14.3-32-32-32H48c-17.7 0-32 14.3-32 32v128c0 17.7 14.3 32 32 32s32-14.3 32-32v-42.7L96.4 415c87.5 87.5 229.3 87.5 316.8 0c24.4-24.4 42.1-53.1 52.9-83.7c5.9-16.7-2.9-34.9-19.5-40.8s-34.9 2.9-40.8 19.5c-7.7 21.8-20.2 42.3-37.8 59.8z" />
    </svg>
  );
}

function Card({ title, children, sub }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <h5 className="mb-0 text-sm font-bold text-slate-900">{title}</h5>
        {sub && <p className="mb-0 mt-0.5 text-[11px] text-slate-500">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="align-top">
      <td className="whitespace-nowrap py-1.5 pe-2 text-[11px] font-semibold text-slate-500">{label}</td>
      <td className="py-1.5 text-[11px] font-semibold text-slate-800">{children}</td>
    </tr>
  );
}

function ValueBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center rounded-xl border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
      {value}
    </span>
  );
}

export default function ChefProductPreview({ basePath = '/chef/find-products', readonly = false }: { basePath?: string; readonly?: boolean }) {
  const { id, uuid } = useParams();
  const { user } = useAuth();
  const key = uuid ?? id;
  const navigate = useNavigate();
  const location = useLocation();
  const isFindProduct = location.pathname.startsWith(basePath);
  const backTo = isFindProduct ? basePath : '/chef/products';
  const getSupplierOrg = readonly ? getSupportProductSupplierOrg : getProductSupplierOrg;
  const getColls = readonly ? getSupportCollections : getCollections;
  const createTicket = readonly ? createSupportTicket : createChefTicket;
  const [detail, setDetail] = useState<SupplierProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('description');
  const [img, setImg] = useState(0);
  const [collections, setCollections] = useState<Collection[]>([]);

  const [labels, setLabels] = useState<string[]>([]);
  const [collIds, setCollIds] = useState<number[]>([]);
  const [shipGroups, setShipGroups] = useState<string[]>([]);
  const [menu, setMenu] = useState<{ type: MenuType; left: number; top: number } | null>(null);
  const [creatingLabel, setCreatingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState('');
  const [openDecline, setOpenDecline] = useState<number | null>(0);

  const [moderating, setModerating] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineNote, setDeclineNote] = useState('');

  const moderate = (status: ModerateStatus, note?: string | null) => {
    if (moderating || isFindProduct) return;
    setModerating(true);
    moderateChefProduct(Number(key), status, note ?? null)
      .then(() => {
        setDeclineOpen(false);
        setDeclineNote('');
        alert(`Product status updated to "${status}".`);
        load();
      })
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setModerating(false));
  };

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [updating, setUpdating] = useState(false);

  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaImages, setMediaImages] = useState<string[]>([]);
  const [mediaVideos, setMediaVideos] = useState<string[]>([]);
  const [mediaUploading, setMediaUploading] = useState(false);

  const [internalOpen, setInternalOpen] = useState(false);

  const [intPriority, setIntPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [intTitle, setIntTitle] = useState('');
  const [intDesc, setIntDesc] = useState('');
  const [intAssigneeSearch, setIntAssigneeSearch] = useState('');
  const [intAssignees, setIntAssignees] = useState<string[]>([]);
  const [intDept, setIntDept] = useState('All');
  const [intSaving, setIntSaving] = useState(false);
  const [intEntity, setIntEntity] = useState<{ name: string; code: string; type: string } | null>(null);
  const [intRelType, setIntRelType] = useState('Link');
  const [intRelInput, setIntRelInput] = useState('');

  useEffect(() => {
    if (internalOpen && detail) {
      getSupplierOrg(Number(key))
        .then((org) => {
          setIntEntity({ name: detail.supplier_name, code: '', type: 'supplier organization' });
          if (org) {
            const assignees: string[] = [];
            if (org.account_manager) assignees.push(org.account_manager);
            if (org.follow_up?.person && org.follow_up.person !== org.account_manager) assignees.push(org.follow_up.person);
            if (assignees.length) setIntAssignees(assignees);
          }
        })
        .catch(() => setIntEntity({ name: detail.supplier_name, code: '', type: 'supplier organization' }));
    }
  }, [internalOpen, detail?.supplier_name]);

  const openEdit = () => {
    if (!detail) return;
    setEditName(detail.name);
    setEditDesc(detail.description ?? '');
    setEditPrice(String(detail.marketplace_price ?? ''));
    setEditOpen(true);
  };

  const saveEdit = () => {
    if (!detail || updating) return;
    const patch: ChefProductPatch = {};
    if (editName.trim() && editName.trim() !== detail.name) patch.name = editName.trim();
    if ((editDesc ?? '') !== (detail.description ?? '')) patch.description = editDesc;
    const priceNum = Number(editPrice);
    if (editPrice.trim() && Number.isFinite(priceNum) && priceNum !== detail.marketplace_price) patch.price = priceNum;
    if (!Object.keys(patch).length) {
      setEditOpen(false);
      return;
    }
    setUpdating(true);
    updateChefProduct(Number(key), patch)
      .then(() => {
        alert('Product updated.');
        setEditOpen(false);
        load();
      })
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setUpdating(false));
  };

  const openMedia = () => {
    if (!detail) return;
    setMediaImages(detail.images ?? []);
    setMediaVideos(detail.videos ?? []);
    setMediaOpen(true);
  };

  const saveMedia = () => {
    if (!detail || updating) return;
    setUpdating(true);
    updateChefProduct(Number(key), {
      images: mediaImages,
      videos: mediaVideos,
      image_url: mediaImages[0] ?? null,
      video_url: mediaVideos[0] ?? null,
    })
      .then(() => {
        alert('Media updated.');
        setMediaOpen(false);
        load();
      })
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setUpdating(false));
  };

  const addMediaFile = async (file: File | undefined, kind: 'image' | 'video') => {
    if (!file) return;
    setMediaUploading(true);
    try {
      const url = kind === 'image' ? await apiUpload(file) : await apiUploadVideo(file);
      if (kind === 'image') setMediaImages((a) => [...a, url]);
      else setMediaVideos((a) => [...a, url]);
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setMediaUploading(false);
    }
  };

  const [whFilter, setWhFilter] = useState('All');
  const [singleRsp, setSingleRsp] = useState('');
  const [variantRsp, setVariantRsp] = useState<string[]>([]);

  const load = () => {
    setLoading(true);
    const req = isFindProduct && key
      ? (readonly ? getSupportFindProductDetail(key) : getFindProductDetail(key))
      : getSupplierProductDetail(Number(key));
    req
      .then((d) => {
        setDetail(d);
        setLabels(d.product_labels);
        setCollIds(d.collection_ids);
        setShipGroups(d.shipping === 'Can be shipped' ? ['Standard Group'] : []);
        setSingleRsp(d.variations.length ? '' : d.recommended_selling_price.toFixed(3));
        setVariantRsp(d.variations.map((v) => v.recommended_selling_price.toFixed(3)));
        setOpenDecline(d.decline_reasons?.length ? 0 : null);
      })
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [key]);

  useEffect(() => {
    getColls()
      .then((r) => setCollections(r.collections))
      .catch(() => {});
  }, []);

  const collMap = useMemo(() => new Map(collections.map((c) => [c.id, c.title])), [collections]);

  const openMenu = (e: React.MouseEvent, type: MenuType) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenu((cur) => (cur && cur.type === type ? null : { type, left: Math.max(8, Math.min(rect.left, window.innerWidth - 300)), top: rect.bottom + 4 }));
  };

  const meta = detail ? STATUS_META[detail.status] : null;
  if (loading) {
    return (
      <div className="py-20">
        <Spinner />
      </div>
    );
  }

  if (!detail || !meta) {
    return (
      <div>
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-500">
          Product not found.
          <button type="button" onClick={() => navigate(backTo)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            ← Back to {isFindProduct ? 'search products' : 'products'}
          </button>
        </div>
      </div>
    );
  }

  const totalBrought = detail.stock.warehouses.reduce((s, w) => s + w.brought, 0);
  const totalOrders = detail.stock.warehouses.reduce((s, w) => s + w.in_orders, 0);
  const totalWare = detail.stock.warehouses.reduce((s, w) => s + w.in_warehouse, 0);
  const visibleMoves = detail.stock.movements.filter((m) => whFilter === 'All' || m.warehouse === whFilter);
  const inMoves = visibleMoves.filter((m) => m.direction === 'in');
  const outMoves = visibleMoves.filter((m) => m.direction === 'out');

  const media: { src: string; isVideo: boolean }[] = [
    ...(detail.images ?? []).map((s) => ({ src: s, isVideo: false })),
    ...(detail.videos ?? []).map((s) => ({ src: s, isVideo: true })),
  ];
  const hasMedia = media.length > 0;
  const activeMedia = media[img];
  const goto = (i: number) => setImg(((i % media.length) + media.length) % media.length);

  const toggleLabel = (name: string) => setLabels((ls) => (ls.includes(name) ? ls.filter((x) => x !== name) : [...ls, name]));
  const toggleColl = (cid: number) => {
    const cur = collIds;
    const adding = !cur.includes(cid);
    const next = adding ? [...cur, cid] : cur.filter((x) => x !== cid);
    setCollIds(next);
    const productId = detail.id;
    const action = adding ? addProductToCollection(cid, productId) : removeProductFromCollection(cid, productId);
    action.catch((e) => {
      setCollIds(cur);
      alert(apiErrorMessage(e));
    });
  };
  const toggleShip = (name: string) => setShipGroups((gs) => (gs.includes(name) ? gs.filter((x) => x !== name) : [...gs, name]));
  const closeMenu = () => {
    setMenu(null);
    setCreatingLabel(false);
    setLabelDraft('');
  };
  const submitLabel = () => {
    const name = labelDraft.trim();
    if (!name) return;
    toggleLabel(name);
    setLabelDraft('');
    setCreatingLabel(false);
  };

  const headingActions =
    detail.status === 'In Review'
      ? (
        <>
          <button type="button" disabled={moderating} onClick={() => moderate('approved')} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-emerald-600 disabled:opacity-60">
            {moderating ? <Spinner /> : <SquareCheckIcon />}
            Publish
          </button>
          <button type="button" disabled={moderating} onClick={() => setDeclineOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-rose-600 disabled:opacity-60">
            <BanIcon />
            Decline
          </button>
          <button type="button" disabled={updating} onClick={openEdit} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
            <PencilIcon />
            Edit
          </button>
          <button type="button" disabled={moderating} onClick={() => moderate('pending')} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60">
            <HourglassIcon />
            Set to in review
          </button>
          <button type="button" disabled={updating} onClick={openMedia} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
            <ImageIcon />
            Edit images
          </button>
        </>
      )
      : (
        <>
          <button type="button" disabled={moderating} onClick={() => setDeclineOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-rose-600 disabled:opacity-60">
            <BanIcon />
            Decline
          </button>
          <button type="button" disabled={updating} onClick={openEdit} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
            <PencilIcon />
            Edit
          </button>
          <button type="button" disabled={moderating} onClick={() => moderate('pending')} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60">
            <HourglassIcon />
            Set to in review
          </button>
          <button type="button" disabled={updating} onClick={openMedia} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
            <ImageIcon />
            Edit images
          </button>
        </>
      );

  return (
    <div>
      {/* Status banner */}
      <div className="mb-3 overflow-hidden rounded-2xl border border-slate-200">
        <div className={`flex flex-wrap items-center justify-between gap-3 border-l-4 px-4 py-3 ${meta.tone}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{meta.icon}</span>
            <div>
              <p className={`mb-0 font-bold ${detail.status === 'Active' ? 'text-emerald-700' : detail.status === 'Declined' ? 'text-rose-700' : detail.status === 'Inactive' ? 'text-slate-600' : 'text-amber-700'}`}>
                {meta.title}
              </p>
              <p className="mb-0 text-xs text-slate-600">{meta.sub}</p>
            </div>
          </div>
          {detail.status === 'In Review' && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800">
              <HourglassIcon />
              Awaiting review
            </span>
          )}
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs">
          <Link to={backTo} className="font-semibold text-slate-500 transition hover:text-sky-600">
            {isFindProduct ? 'Search products' : 'Supplier products'}
          </Link>
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-slate-800">Preview #{detail.gid}</span>
        </div>
        <span className="text-[11px] text-slate-400">SKU: #{detail.gid}</span>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-12">
        {/* Left column — config + meta */}
        <div className="space-y-4 lg:col-span-3">
          <Card title="Product config">
            <div className="space-y-3 px-4 py-3">
              <div>
                <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                  Labels
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {labels.map((l) => (
                    <span key={l} className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-semibold ${labelTone(l)}`}>
                      {l}
                    </span>
                  ))}
                  {!readonly && (
                    <button type="button" onClick={(e) => openMenu(e, 'labels')} className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-amber-300 bg-amber-50 text-[11px] font-bold text-amber-600 transition hover:bg-amber-100">
                      +
                    </button>
                  )}
                </div>
              </div>
              <div>
                <div className="mb-1 text-[11px] font-semibold text-slate-600">Collections</div>
                <div className="flex flex-wrap items-center gap-1">
                  {collIds.map((cid) => (
                    <span key={cid} className="inline-flex max-w-[120px] truncate rounded bg-sky-50 px-1.5 py-0.5 text-[9px] font-semibold text-sky-700">
                      {collMap.get(cid) ?? `#${cid}`}
                    </span>
                  ))}
                  {collIds.length === 0 && <span className="text-[10px] text-slate-400">No collections</span>}
                  {!readonly && (
                    <button type="button" onClick={(e) => openMenu(e, 'collections')} className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-sky-300 bg-sky-50 text-[11px] font-bold text-sky-600 transition hover:bg-sky-100">
                      +
                    </button>
                  )}
                </div>
              </div>
              <div>
                <div className="mb-1 text-[11px] font-semibold text-slate-600">Shipping Groups</div>
                <div className="flex flex-wrap items-center gap-1">
                  {shipGroups.map((g) => (
                    <span key={g} className="inline-flex rounded bg-violet-50 px-1.5 py-0.5 text-[9px] font-semibold text-violet-700">
                      {g}
                    </span>
                  ))}
                  {shipGroups.length === 0 && <span className="text-[10px] text-slate-400">No shipping groups</span>}
                  {!readonly && (
                    <button type="button" onClick={(e) => openMenu(e, 'shipping')} className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-violet-300 bg-violet-50 text-[11px] font-bold text-violet-600 transition hover:bg-violet-100">
                      +
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card title="Metadata">
            <table className="w-full px-0">
              <tbody className="px-4">
                <tr>
                  <td className="px-0 pt-3">
                    <table className="w-full">
                      <tbody>
                        <MetaRow label="Created at">{clockSlot(detail.created_at)}</MetaRow>
                        <MetaRow label="Updated at">{clockSlot(detail.updated_at)}</MetaRow>
                        <MetaRow label="Activated at">
                          {detail.activated_at ? (
                            <>
                              {slot(detail.activated_at)}
                              {detail.activated_by && <span className="ms-1 text-slate-500">({detail.activated_by})</span>}
                            </>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </MetaRow>
                      </tbody>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td className="pb-3">
                    <hr className="mx-0 my-2 border-slate-100" />
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-500">Real video</span>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${detail.real_video ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {detail.real_video ? <CheckIcon /> : <BanIcon />}
                        {detail.real_video ? 'Uploaded' : 'Not provided'}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-500">Real image</span>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${detail.real_image ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {detail.real_image ? <CheckIcon /> : <BanIcon />}
                        {detail.real_image ? 'Uploaded' : 'Not provided'}
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </Card>
        </div>

        {/* Middle column — product info */}
        <div className="lg:col-span-6">
          <Card title={`Product preview #${detail.gid}`}>
            <div className="grid gap-5 p-4 md:grid-cols-2">
              {/* Carousel */}
              <div>
                <div className="relative flex h-56 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50" style={{ backgroundImage: !hasMedia ? tileBg(detail.emoji) : undefined, backgroundSize: 'cover' }}>
                  {media.length > 1 && (
                    <>
                      <button type="button" onClick={() => goto(img - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-xs shadow hover:bg-white">
                        ‹
                      </button>
                      <button type="button" onClick={() => goto(img + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-xs shadow hover:bg-white">
                        ›
                      </button>
                    </>
                  )}
                  {activeMedia ? (
                    activeMedia.isVideo ? (
                      <video key={activeMedia.src} src={activeMedia.src} controls className="h-full w-full object-contain" />
                    ) : (
                      <img key={activeMedia.src} src={activeMedia.src} alt={detail.name} className="h-full w-full object-contain" />
                    )
                  ) : (
                    <span className="text-6xl drop-shadow">{detail.emoji}</span>
                  )}
                </div>
                {hasMedia && (
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    {media.map((m, i) => (
                      <button
                        key={m.src + i}
                        type="button"
                        onClick={() => setImg(i)}
                        className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-white ${i === img ? 'border-sky-500 ring-1 ring-sky-500' : 'border-slate-200'}`}
                      >
                        {m.isVideo ? (
                          <video src={m.src} className="h-full w-full object-cover" muted preload="metadata" />
                        ) : (
                          <img src={m.src} alt="" className="h-full w-full object-cover" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
                <button type="button" className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50">
                  <DownloadIcon />
                  Download marketing content
                </button>
              </div>

              {/* Details */}
              <div>
                <h4 className="text-lg font-bold leading-snug text-slate-900">{detail.name}</h4>
                <div className="mt-1"><Stars n={0} /></div>

                <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-lg font-extrabold text-slate-900">{tnd(detail.marketplace_price)}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Platform</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 border-t border-slate-100 pt-1.5">
                    <span className="text-sm font-bold text-emerald-600">{tnd(detail.supplier_price)}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Supplier</span>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold text-slate-500">Product value (Refund cap)</span>
                  <ValueBadge value={detail.product_value == null ? 'No value' : tnd(detail.product_value)} />
                </div>

                <div className="mt-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Offer type</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {detail.offer_types.map((o) => (
                      <span key={o} className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold ${OFFER_TILE[o].cls}`}>
                        <span>{OFFER_TILE[o].icon}</span>
                        {OFFER_TILE[o].label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Wholesale Price</div>
                  {detail.wholesale ? (
                    <p className="mb-0 text-sm font-bold text-slate-800">
                      {tnd(detail.wholesale.max)} <span className="text-[10px] font-medium text-slate-400">to</span> {tnd(detail.wholesale.min)}
                    </p>
                  ) : (
                    <p className="mb-0 text-xs text-slate-400">Does not have wholesale price</p>
                  )}
                </div>

                <p className="mt-2 text-xs text-slate-600">
                  Categories: <span className="italic text-slate-500">{detail.categories.length ? detail.categories.join(', ') : '—'}</span>
                </p>
                <p className="text-xs text-slate-600">Platform Commission: <strong className="text-slate-800">{detail.platform_commission_pct}%</strong></p>

                {detail.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {detail.tags.map((t) => (
                      <span key={t} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-600">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Fulfillers + supplier + shipping */}
            <div className="border-t border-slate-100 px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Fulfillers</div>
              <table className="mt-1 w-full">
                <thead>
                  <tr className="text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    <th className="py-1">Fulfiller</th>
                    <th className="py-1">Warehouse</th>
                    <th className="py-1 text-right">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.fulfillers.map((f, fi) => (
                    <tr key={fi} className="border-t border-slate-50">
                      <td className="py-1.5 text-xs font-semibold text-slate-800">{f.name}</td>
                      <td className="py-1.5 text-xs text-slate-600">{f.warehouse}</td>
                      <td className="py-1.5 text-right text-xs font-semibold text-slate-800">{f.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 md:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Avatar name={detail.supplier_name} size="h-9 w-9 text-[11px]" />
                  <div>
                    {readonly ? (
                      <span className="block text-xs font-bold text-slate-800">{detail.supplier_name}</span>
                    ) : (
                      <button type="button" onClick={() => navigate(`/chef/supplier-organizations/${detail.supplier_id}`)} className="block text-xs font-bold text-slate-800 transition hover:text-sky-600">
                        {detail.supplier_name}
                      </button>
                    )}
                    <span className="text-[10px] text-slate-400">Supplier · {detail.supplier_id}</span>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-slate-600">
                  <p className="mb-0">Weight (GR): <strong className="text-slate-800">{detail.weight_g.toLocaleString('en-US')}</strong></p>
                  <p className="mb-0">
                    Package dimensions L x W x H (MM): <strong className="text-slate-800">{detail.length_mm} × {detail.width_mm} × {detail.height_mm}</strong>
                  </p>
                  <p className="mb-0">VAT: <strong className="text-slate-800">{detail.vat_pct}%</strong></p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Shipping status</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${detail.shipping === 'Can be shipped' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {detail.shipping === 'Can be shipped' ? <CheckIcon /> : <XmarkIcon />}
                  {detail.shipping}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right column — actions + decline report */}
        <div className="space-y-4 lg:col-span-3">
          <Card title="Actions">
            <div className="space-y-1 p-3">
              {!readonly && (
                <>
                  <button type="button" className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50">
                    <DocLinesIcon className="text-slate-400" />
                    Version history
                  </button>
                  <button type="button" className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50">
                    <UserGroupIcon className="text-slate-400" />
                    Create a copy
                  </button>
                  <button type="button" onClick={() => setInternalOpen(true)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50">
                    <DocLinesIcon className="text-slate-400" />
                    Internal Ticket
                  </button>
                  <button type="button" className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50">
                    <RotationIcon className="text-rose-400" />
                    Regenerate media conversions
                  </button>
                </>
              )}
              {readonly && (
                <button type="button" onClick={() => setInternalOpen(true)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50">
                  <DocLinesIcon className="text-slate-400" />
                  Internal Ticket
                </button>
              )}
            </div>
          </Card>

          {!readonly && (
            <Card title="Manage product">
              <div className="flex flex-wrap gap-2 p-3">
                {headingActions}
              </div>
            </Card>
          )}

          <Modal open={declineOpen} onClose={() => !moderating && setDeclineOpen(false)} title="Decline product" wide>
            <div className="p-4">
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Reason (optional)</label>
              <textarea
                value={declineNote}
                onChange={(e) => setDeclineNote(e.target.value)}
                rows={4}
                className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-sky-400"
                placeholder="Add a note for the supplier about why this product is declined…"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={moderating}
                  onClick={() => setDeclineOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={moderating}
                  onClick={() => moderate('refused', declineNote.trim() || null)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-rose-600 disabled:opacity-60"
                >
                  {moderating ? <Spinner /> : <BanIcon />}
                  Decline product
                </button>
              </div>
            </div>
          </Modal>

          <Modal open={editOpen} onClose={() => !updating && setEditOpen(false)} title="Edit product" wide>
            <div className="p-4">
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Product name</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-sky-400"
              />
              <label className="mb-1.5 mt-3 block text-xs font-semibold text-slate-700">Description</label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={4}
                className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-sky-400"
              />
              <label className="mb-1.5 mt-3 block text-xs font-semibold text-slate-700">Marketplace price (TND)</label>
              <input
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                type="number"
                min="0"
                step="0.001"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-sky-400"
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => setEditOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={updating}
                  onClick={saveEdit}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-sky-600 disabled:opacity-60"
                >
                  {updating ? <Spinner /> : <CheckIcon />}
                  Save changes
                </button>
              </div>
            </div>
          </Modal>

          <Modal open={mediaOpen} onClose={() => !updating && setMediaOpen(false)} title="Edit images & videos" wide>
            <div className="p-4">
              <div className="mb-1.5 block text-xs font-semibold text-slate-700">Images</div>
              <div className="flex flex-wrap gap-2">
                {mediaImages.map((src, i) => (
                  <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200">
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => setMediaImages((a) => a.filter((_, x) => x !== i))}
                      className="absolute right-0.5 top-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white hover:bg-rose-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {mediaImages.length === 0 && <span className="text-xs text-slate-400">No images.</span>}
              </div>
              <div className="mt-2">
                <input
                  type="file"
                  accept="image/*"
                  disabled={mediaUploading}
                  onChange={(e) => addMediaFile(e.target.files?.[0], 'image')}
                  className="block w-full text-xs text-slate-500 file:mr-2 file:rounded-md file:border-0 file:bg-sky-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-sky-700"
                />
              </div>

              <div className="mb-1.5 mt-4 block text-xs font-semibold text-slate-700">Videos</div>
              <div className="flex flex-wrap gap-2">
                {mediaVideos.map((src, i) => (
                  <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200">
                    <video src={src} muted className="h-full w-full object-cover" />
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => setMediaVideos((a) => a.filter((_, x) => x !== i))}
                      className="absolute right-0.5 top-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white hover:bg-rose-600"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {mediaVideos.length === 0 && <span className="text-xs text-slate-400">No videos.</span>}
              </div>
              <div className="mt-2">
                <input
                  type="file"
                  accept="video/*"
                  disabled={mediaUploading}
                  onChange={(e) => addMediaFile(e.target.files?.[0], 'video')}
                  className="block w-full text-xs text-slate-500 file:mr-2 file:rounded-md file:border-0 file:bg-sky-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-sky-700"
                />
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={updating || mediaUploading}
                  onClick={() => setMediaOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={updating || mediaUploading}
                  onClick={saveMedia}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-sky-600 disabled:opacity-60"
                >
                  {updating ? <Spinner /> : <CheckIcon />}
                  Save changes
                </button>
              </div>
            </div>
          </Modal>

          {internalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4" onClick={() => !intSaving && setInternalOpen(false)}>
              <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                {/* header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                      <svg className="me-1" width="12" height="12" viewBox="0 0 576 512" fill="currentColor" aria-hidden="true"><path d="M0 128C0 92.7 28.7 64 64 64H512c35.3 0 64 28.7 64 64v80c-26.5 0-48 21.5-48 48s21.5 48 48 48v80c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V304c26.5 0 48-21.5 48-48s-21.5-48-48-48V128z" /></svg>
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Create Internal Ticket</h3>
                      <p className="text-xs text-slate-500">Assign tasks to internal team members · {detail?.supplier_name ?? 'Unknown supplier'}</p>
                    </div>
                  </div>
                  <button onClick={() => setInternalOpen(false)} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                  </button>
                </div>

                {/* body */}
                <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-12">
                  {/* left column */}
                  <div className="space-y-4 md:col-span-7">
                    {/* priority */}
                    <div>
                      <p className="mb-2 text-xs font-semibold text-slate-600">Priority</p>
                      <div className="flex flex-wrap gap-2">
                        {([
                          { value: 'low' as const, label: 'Low', icon: '↓' },
                          { value: 'medium' as const, label: 'Medium', icon: null, svgPath: 'M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z' },
                          { value: 'high' as const, label: 'High', icon: '↑' },
                          { value: 'urgent' as const, label: 'Urgent', icon: '!' },
                        ]).map((p) => {
                          const active = intPriority === p.value;
                          return (
                            <button key={p.value} type="button" onClick={() => setIntPriority(p.value)}
                              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${active ? 'border-sky-400 bg-sky-50 text-sky-600 shadow-sm' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'}`}>
                              {p.svgPath ? (
                                <svg className="text-current" width="10" height="10" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true"><path d={p.svgPath} /></svg>
                              ) : null}
                              {p.label}
                              <span className="text-xs opacity-70">{p.icon}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* title */}
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Title <span className="text-rose-500">*</span></label>
                      <input value={intTitle} onChange={(e) => setIntTitle(e.target.value)} placeholder="Enter ticket title" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
                    </div>

                    {/* description */}
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                      <textarea value={intDesc} onChange={(e) => setIntDesc(e.target.value)} rows={3} placeholder="Describe what needs to be done" className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
                    </div>

                    {/* related entities */}
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-600">Related entities</p>
                        {intEntity && <span className="text-[11px] text-slate-400"><svg className="mr-1 inline" width="12" height="12" viewBox="0 0 640 512" fill="currentColor" aria-hidden="true"><path d="M579.8 267.7c56.5-56.5 56.5-148 0-204.5c-50-50-128.8-56.5-186.3-15.4l-1.6 1.1c-14.4 10.3-17.7 30.3-7.4 44.6s30.3 17.7 44.6 7.4l1.6-1.1c32.1-22.9 76-19.3 103.8 8.6c31.5 31.5 31.5 82.5 0 114L422.3 334.8c-31.5 31.5-82.5 31.5-114 0c-27.9-27.9-31.5-71.8-8.6-103.8l1.1-1.6c10.3-14.4 6.9-34.4-7.4-44.6s-34.4-6.9-44.6 7.4l-1.1 1.6C206.5 251.2 213 330 263 380c56.5 56.5 148 56.5 204.5 0L579.8 267.7zM60.2 244.3c-56.5 56.5-56.5 148 0 204.5c50 50 128.8 56.5 186.3 15.4l1.6-1.1c14.4-10.3 17.7-30.3 7.4-44.6s-30.3-17.7-44.6-7.4l-1.6 1.1c-32.1 22.9-76 19.3-103.8-8.6C74 372 74 321 105.5 289.5L217.7 177.2c31.5-31.5 82.5-31.5 114 0c27.9 27.9 31.5 71.8 8.6 103.9l-1.1 1.6c-10.3 14.4-6.9 34.4 7.4 44.6s34.4 6.9 44.6-7.4l1.1-1.6C433.5 260.8 427 182 377 132c-56.5-56.5-148-56.5-204.5 0L60.2 244.3z" /></svg>1 linked</span>}
                      </div>
                      <div className="flex flex-col gap-2">
                        {intEntity && (
                          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <span className="inline-flex shrink-0 items-center justify-center rounded-full font-bold h-8 w-8 border-2 border-slate-300 bg-sky-100 text-sky-700">{intEntity.name.charAt(0).toUpperCase()}</span>
                              <div className="min-w-0">
                                <span className="block truncate text-[11px] font-semibold text-slate-900" style={{ maxWidth: 200 }}>{intEntity.name}</span>
                                <div className="flex items-center gap-2">
                                  {intEntity.code && <span className="text-[10px] text-sky-600">{intEntity.code}</span>}
                                  <span className="rounded bg-sky-50 px-1 py-px text-[9px] font-semibold text-sky-700">{intEntity.type}</span>
                                </div>
                              </div>
                            </div>
                            <button type="button" onClick={() => setIntEntity(null)} className="shrink-0 p-1 text-slate-400 transition hover:text-rose-500" aria-label="Remove entity">
                              <svg width="11" height="11" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true"><path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z" /></svg>
                            </button>
                          </div>
                        )}
                        {!intEntity && (
                          <div className="mt-3">
                            <span className="mb-1 flex items-center text-[10px] font-semibold text-slate-500"><svg className="me-1" width="13" height="13" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352c79.5 0 144-64.5 144-144s-64.5-144-144-144S64 128.5 64 208s64.5 144 144 144z" /></svg>Find Relatable</span>
                            <div className="flex items-center gap-1">
                              <select value={intRelType} onChange={(e) => setIntRelType(e.target.value)} className="w-[80px] rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-700 outline-none focus:border-brand-500"><option>Link</option><option>ID</option></select>
                              <input value={intRelInput} onChange={(e) => setIntRelInput(e.target.value)} placeholder="Paste a link or enter an ID" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-[11px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
                              <button type="button" disabled={!intRelInput.trim()}
                                onClick={() => { if (!intRelInput.trim()) return; setIntEntity({ name: intRelInput.trim(), code: '', type: intRelType }); setIntRelInput(''); }}
                                className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg bg-sky-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-40">
                                <svg className="text-current" width="10" height="10" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true"><path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32V224H48c-17.7 0-32 14.3-32 32s14.3 32 32 32H192V432c0 17.7 14.3 32 32 32s32-14.3 32-32V288H400c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V80z" /></svg>
                                Add
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* right column */}
                  <div className="rounded-xl bg-slate-50 p-4 md:col-span-5">
                    <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <svg className="text-slate-500" width="14" height="14" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M399 384.2C376.9 345.8 335.4 320 288 320H224c-47.4 0-88.9 25.8-111 64.2c35.2 39.2 86.2 63.8 143 63.8s107.8-24.7 143-63.8zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zm256 16a72 72 0 1 0 0-144 72 72 0 1 0 0 144zm-12.4 16a152 152 0 0 0-128.3 74.4C81.4 325.7 64 292 64 256c0-106 86-192 192-192s192 86 192 192c0 36-17.4 69.7-51.3 90.4A152 152 0 0 0 268.4 288H243.6z" /></svg>
                      Assignees
                    </p>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><svg width="14" height="14" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0S0 114.6 0 256s114.6 256 256 256zm-16-192v64c0 17.7 14.3 32 32 32s32-14.3 32-32v-64h64c17.7 0 32-14.3 32-32s-14.3-32-32-32h-64V128c0-17.7-14.3-32-32-32s-32 14.3-32 32v64h-64c-17.7 0-32 14.3-32 32s14.3 32 32 32h64z" /></svg></span>
                      <input value={intAssigneeSearch} onChange={(e) => setIntAssigneeSearch(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const n = intAssigneeSearch.trim(); if (n && !intAssignees.includes(n)) setIntAssignees((a) => [...a, n]); setIntAssigneeSearch(''); } }}
                        placeholder="Add users" className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
                    </div>
                    <select value={intDept} onChange={(e) => setIntDept(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500">
                      <option value="All">All Dept</option>
                      <option value="Commercial">Commercial</option>
                      <option value="Technical">Technical</option>
                    </select>
                    <div className="mt-3 flex min-h-[88px] items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-white px-3 py-2">
                      {intAssignees.length === 0 ? (
                        <span className="text-xs text-slate-400">No assignees added yet</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {intAssignees.map((a) => (
                            <span key={a} className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700">
                              {a}
                              <button type="button" onClick={() => setIntAssignees((x) => x.filter((y) => y !== a))} className="ml-0.5 text-sky-500 hover:text-sky-700">×</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* footer */}
                <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
                  <button type="button" disabled={intSaving} onClick={() => setInternalOpen(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">Cancel</button>
                  <button type="button" disabled={intSaving || !intTitle.trim()}
                    onClick={async () => {
                      if (!intTitle.trim()) return;
                      setIntSaving(true);
                      try {
                        await createTicket({
                          author_name: user?.name ?? 'Chef',
                          owner_names: intAssignees,
                          subject: intTitle.trim(),
                          description: intDesc,
                          department: intDept,
                          priority: intPriority === 'low' ? 'medium' : intPriority,
                          related_to: intEntity ? `${intEntity.name} (${intEntity.code || 'N/A'})` : null,
                        });
                        setInternalOpen(false);
                        setIntTitle('');
                        setIntDesc('');
                        setIntAssignees([]);
                        setIntEntity(null);
                      } catch (err) {
                        alert(apiErrorMessage(err));
                      } finally {
                        setIntSaving(false);
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50">
                    <svg className="text-current" width="10" height="10" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true"><path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32V224H48c-17.7 0-32 14.3-32 32s14.3 32 32 32H192V432c0 17.7 14.3 32 32 32s32-14.3 32-32V288H400c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V80z" /></svg>
                    Create
                  </button>
                </div>
              </div>
            </div>
          )}

          {detail.status === 'Declined' && detail.decline_reasons?.length ? (
            <Card title="Decline report" sub="Here are the reasons for declining your product:">
              <div className="space-y-2 p-3">
                {detail.decline_reasons.map((r, i) => (
                  <div key={i} className="overflow-hidden rounded-lg border border-rose-200">
                    <button
                      type="button"
                      onClick={() => setOpenDecline(openDecline === i ? null : i)}
                      className="flex w-full items-center justify-between gap-2 bg-rose-50 px-3 py-2 text-left"
                    >
                      <span className="text-xs font-bold text-rose-700">{r.reason}</span>
                      <span className={`text-[10px] text-rose-400 transition ${openDecline === i ? 'rotate-180' : ''}`}>▼</span>
                    </button>
                    {openDecline === i && (
                      <div className="border-t border-rose-200 bg-white px-3 py-2 text-xs text-slate-600">
                        {r.note ?? 'No additional note provided by the reviewer.'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap border-b border-slate-100 px-2 pt-1">
          {(
            [
              { id: 'description' as Tab, label: 'Description' },
              { id: 'specifications' as Tab, label: 'Specifications' },
              { id: 'reviews' as Tab, label: 'Product reviews' },
              { id: 'stock' as Tab, label: 'Stock movements' },
            ]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`mb-0 px-3 py-2.5 text-xs font-semibold transition ${tab === t.id ? 'border-b-2 border-sky-600 text-sky-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {tab === 'description' && (
            <p className="mb-0 text-sm text-slate-700" dir="auto">
              {detail.description ?? 'No description for this product.'}
            </p>
          )}

          {tab === 'specifications' && (
            <div className="py-8 text-center text-sm text-slate-400">No specifications for this product</div>
          )}

          {tab === 'reviews' && (
            <div className="py-8 text-center text-sm text-slate-400">No reviews for this product</div>
          )}

          {tab === 'stock' && (
            <div>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {['All', ...detail.stock.warehouses.map((w) => w.name)].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWhFilter(w)}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${whFilter === w ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
                  >
                    {w}
                  </button>
                ))}
              </div>

              <div className="mb-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <p className="mb-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Brought to warehouse</p>
                  <p className="mb-0 mt-1 text-lg font-extrabold text-slate-900">{totalBrought}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <p className="mb-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">In orders</p>
                  <p className="mb-0 mt-1 text-lg font-extrabold text-slate-900">{totalOrders}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <p className="mb-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">In warehouse</p>
                  <p className="mb-0 mt-1 text-lg font-extrabold text-slate-900">{totalWare}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h6 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-emerald-700">In's</h6>
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    <table className="w-full">
                      <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        <tr>
                          <th className="px-2.5 py-1.5 text-left">Label</th>
                          <th className="px-2.5 py-1.5 text-left">Warehouse</th>
                          <th className="px-2.5 py-1.5 text-right">Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inMoves.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-2.5 py-6 text-center text-[11px] text-slate-400">No incoming movements</td>
                          </tr>
                        )}
                        {inMoves.map((m, mi) => (
                          <tr key={mi} className="border-t border-slate-100 text-xs">
                            <td className="px-2.5 py-1.5 font-semibold text-slate-800">{m.label}</td>
                            <td className="px-2.5 py-1.5 text-slate-600">{m.warehouse}</td>
                            <td className="px-2.5 py-1.5 text-right font-semibold text-emerald-700">+{m.qty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <h6 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-rose-700">Out's</h6>
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    <table className="w-full">
                      <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        <tr>
                          <th className="px-2.5 py-1.5 text-left">Label</th>
                          <th className="px-2.5 py-1.5 text-left">Warehouse</th>
                          <th className="px-2.5 py-1.5 text-right">Qty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outMoves.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-2.5 py-6 text-center text-[11px] text-slate-400">No outgoing movements</td>
                          </tr>
                        )}
                        {outMoves.map((m, mi) => (
                          <tr key={mi} className="border-t border-slate-100 text-xs">
                            <td className="px-2.5 py-1.5 font-semibold text-slate-800">{m.label}</td>
                            <td className="px-2.5 py-1.5 text-slate-600">{m.warehouse}</td>
                            <td className="px-2.5 py-1.5 text-right font-semibold text-rose-600">−{m.qty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <h6 className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-wide text-slate-500">Movements</h6>
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full">
                  <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-2.5 py-1.5 text-left">Label</th>
                      <th className="px-2.5 py-1.5 text-left">Direction</th>
                      <th className="px-2.5 py-1.5 text-left">Warehouse</th>
                      <th className="px-2.5 py-1.5 text-right">Qty</th>
                      <th className="px-2.5 py-1.5 text-right">At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleMoves.map((m, mi) => (
                      <tr key={mi} className="border-t border-slate-100 text-xs">
                        <td className="px-2.5 py-1.5 font-semibold text-slate-800">{m.label}</td>
                        <td className="px-2.5 py-1.5">
                          <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-semibold ${m.direction === 'in' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                            {m.direction === 'in' ? 'In' : 'Out'}
                          </span>
                        </td>
                        <td className="px-2.5 py-1.5 text-slate-600">{m.warehouse}</td>
                        <td className="px-2.5 py-1.5 text-right font-semibold text-slate-800">{m.qty}</td>
                        <td className="px-2.5 py-1.5 text-right text-slate-500">{slot(m.at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product configurations */}
      <Card title="Product configurations">
        <div className="p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-600">Service user score</label>
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
                <span className="text-sm font-extrabold text-slate-900">{detail.service_user_score}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${detail.service_user_score}%` }} />
                </div>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600">Recommended selling price (TND)</label>
              <div className="mt-1 flex gap-2">
                <input
                  value={singleRsp}
                  onChange={(e) => setSingleRsp(e.target.value)}
                  placeholder="0.000"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition focus:border-sky-400"
                />
                <button
                  type="button"
                  onClick={() => alert('Recommended selling price saved.')}
                  className="shrink-0 rounded-lg bg-sky-600 px-4 py-2 text-[11px] font-bold text-white transition hover:bg-sky-700"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>

          {detail.variations.length > 0 && (
            <div className="mt-4">
              <h6 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Variations</h6>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full">
                  <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-2.5 py-1.5 text-left">Variant</th>
                      <th className="px-2.5 py-1.5 text-left">Stock</th>
                      <th className="px-2.5 py-1.5 text-right">Price</th>
                      <th className="px-2.5 py-1.5 text-right">Recommended selling price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.variations.map((v, vi) => (
                      <tr key={vi} className="border-t border-slate-100 text-xs">
                        <td className="px-2.5 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-lg">{v.emoji}</span>
                            <span className="font-semibold text-slate-800">{v.variant}</span>
                          </div>
                        </td>
                        <td className="px-2.5 py-1.5 text-slate-600">{v.stock}</td>
                        <td className="px-2.5 py-1.5 text-right font-semibold text-slate-800">{tnd(v.price)}</td>
                        <td className="px-2.5 py-1.5 text-right">
                          <input
                            value={variantRsp[vi]}
                            onChange={(e) => setVariantRsp((rs) => rs.map((r, ri) => (ri === vi ? e.target.value : r)))}
                            className="w-24 rounded border border-slate-200 px-1.5 py-1 text-right text-xs text-slate-800 outline-none focus:border-sky-400"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Config dropdown */}
      {menu && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeMenu} />
          <div className="fixed z-50 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl" style={{ left: menu.left, top: menu.top }} onClick={(e) => e.stopPropagation()}>
            <h6 className="mb-0 px-3 pt-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {menu.type === 'labels' ? 'Select Label' : menu.type === 'collections' ? 'Select Collections' : 'Select Shipping Group'}
            </h6>
            <div className="my-1 h-px bg-slate-100" />
            <div className="grid max-h-[320px] grid-cols-2 content-start gap-2 overflow-y-auto p-3">
              {menu.type === 'labels' &&
                LABEL_POOL.map((l) => {
                  const on = labels.includes(l.name);
                  return (
                    <button
                      key={l.name}
                      type="button"
                      onClick={() => toggleLabel(l.name)}
                      className={`inline-flex min-w-0 items-center gap-1 rounded border px-2 py-1 text-left text-[10px] font-semibold transition ${LABEL_TONES[l.tone]} ${
                        on ? 'ring-2 ring-inset ring-slate-800' : ''
                      }`}
                    >
                      {on && <CheckIcon className="shrink-0" />}
                      <span className="truncate">{l.name}</span>
                    </button>
                  );
                })}
              {menu.type === 'collections' &&
                collections.map((c) => {
                  const on = collIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleColl(c.id)}
                      className={`inline-flex min-w-0 items-center gap-1 rounded border px-2 py-1 text-left text-[10px] font-semibold transition ${on ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                      {on && <CheckIcon className="shrink-0" />}
                      <span className="truncate">{c.title}</span>
                    </button>
                  );
                })}
              {menu.type === 'shipping' &&
                SHIPPING_GROUPS.map((g) => {
                  const on = shipGroups.includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleShip(g)}
                      className={`inline-flex min-w-0 items-center gap-1 rounded border px-2 py-1 text-left text-[10px] font-semibold transition ${on ? 'border-violet-300 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                      {on && <CheckIcon className="shrink-0" />}
                      <span className="truncate">{g}</span>
                    </button>
                  );
                })}
              {menu.type === 'collections' && collections.length === 0 && (
                <div className="col-span-2 py-6 text-center text-[11px] text-slate-400">Loading collections…</div>
              )}
              {menu.type === 'labels' && (
                <div className="col-span-2 flex gap-2">
                  {creatingLabel ? (
                    <div className="flex w-full items-center gap-2">
                      <input
                        autoFocus
                        value={labelDraft}
                        onChange={(e) => setLabelDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitLabel();
                        }}
                        placeholder="New label name..."
                        className="w-full rounded border border-slate-300 px-2 py-1 text-[11px] outline-none focus:border-slate-500"
                      />
                      <button type="button" onClick={submitLabel} className="shrink-0 rounded bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-slate-700">
                        Add
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCreatingLabel(true)}
                      className="block w-full rounded border border-slate-400 py-1 text-center text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Create label
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}