import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiErrorMessage, ExchangeDeliveryStatus, getReturnDetail, ReturnDeliveryStatus, ReturnDetail, ReturnTimelineItem, updateChefReturn } from '../../lib/api';
import { Spinner } from '../../components/ui';
import { AddNoteModal, Avatar, CheckIcon, ClockIcon, EyeIcon, FilterOverlay } from './ui';
import ReturnTicketModal from './ReturnTicketModal';

/* ═══════════════════════════ local icons ═══════════════════════════ */

function Icon({ d, size = 12, className = '' }: { d: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="currentColor" aria-hidden="true" className={className}>
      <path d={d} />
    </svg>
  );
}

const D_INFO = 'M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0S0 114.6 0 256S114.6 512 256 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-144c-17.7 0-32-14.3-32-32s14.3-32 32-32s32 14.3 32 32s-14.3 32-32 32z';
const D_SWAP =
  'M422.6 278.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L434.7 176H64c-17.7 0-32-14.3-32-32s14.3-32 32-32H434.7L377.4 54.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l112 112c12.5 12.5 12.5 32.8 0 45.3l-112 112zm-269.3 224l-112-112c-12.5-12.5-12.5-32.8 0-45.3l112-112c12.5-12.5 32.8-12.5 45.3 0s12.5 32.8 0 45.3L141.3 336H512c17.7 0 32 14.3 32 32s-14.3 32-32 32H141.3l57.4 57.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0z';
const D_USER =
  'M224 256c70.7 0 128-57.3 128-128S294.7 0 224 0S96 57.3 96 128s57.3 128 128 128zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512H418.3c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304H178.3z';
const D_MAP =
  'M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z';
const D_WAREHOUSE =
  'M0 488V171.3c0-26.2 15.9-49.7 40.2-59.4L308.1 4.8c7.6-3.1 16.1-3.1 23.8 0L599.8 111.9c24.3 9.7 40.2 33.3 40.2 59.4V488c0 13.3-10.7 24-24 24H568c-13.3 0-24-10.7-24-24V224c0-17.7-14.3-32-32-32H128c-17.7 0-32 14.3-32 32V488c0 13.3-10.7 24-24 24H24c-13.3 0-24-10.7-24-24zm488 24l-336 0c-13.3 0-24-10.7-24-24V432H512l0 56c0 13.3-10.7 24-24 24zM128 400V336H512v64H128zm0-96V224H512l0 80H128z';
const D_MAGNIFY =
  'M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352c79.5 0 144-64.5 144-144s-64.5-144-144-144S64 128.5 64 208s64.5 144 144 144z';
const D_CARET = 'M137.4 374.6c12.5 12.5 32.8 12.5 45.3 0l128-128c9.2-9.2 11.9-22.9 6.9-34.9s-16.6-19.8-29.6-19.8L32 192c-12.9 0-24.6 7.8-29.6 19.8s-2.2 25.7 6.9 34.9l128 128z';
const D_CARET_LEFT = 'M9.4 278.6c-12.5-12.5-12.5-32.8 0-45.3l128-128c9.2-9.2 22.9-11.9 34.9-6.9s19.8 16.6 19.8 29.6l0 256c0 12.9-7.8 24.6-19.8 29.6s-25.7 2.2-34.9-6.9l-128-128z';
const D_TICKET =
  'M64 64C28.7 64 0 92.7 0 128v80c26.5 0 48 21.5 48 48s-21.5 48-48 48v80c0 35.3 28.7 64 64 64H512c35.3 0 64-28.7 64-64V304c-26.5 0-48-21.5-48-48s21.5-48 48-48V128c0-35.3-28.7-64-64-64H64zm64 96l0 192H448V160H128zm-32 0c0-17.7 14.3-32 32-32H448c17.7 0 32 14.3 32 32V352c0 17.7-14.3 32-32 32H128c-17.7 0-32-14.3-32-32V160z';
const D_NOTE =
  'M469.3 19.3l23.4 23.4c25 25 25 65.5 0 90.5l-56.4 56.4L322.3 75.7l56.4-56.4c25-25 65.5-25 90.5 0zM44.9 353.2L299.7 98.3 413.7 212.3 158.8 467.1c-6.7 6.7-15.1 11.6-24.2 14.2l-104 29.7c-8.4 2.4-17.4 .1-23.6-6.1s-8.5-15.2-6.1-23.6l29.7-104c2.6-9.2 7.5-17.5 14.2-24.2z';
const D_CHECK_CIRCLE =
  'M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0S0 114.6 0 256S114.6 512 256 512zM369 209L241 337c-12.5 12.5-32.8 12.5-45.3 0l-65-65c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L223 262l83-83c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0z';
const D_BOXES =
  'M256 48c0-26.5 21.5-48 48-48H592c26.5 0 48 21.5 48 48V464c0 26.5-21.5 48-48 48H381.3c1.8-5 2.7-10.4 2.7-16V253.3c18.6-6.6 32-24.4 32-45.3V176c0-26.5-21.5-48-48-48H256V48zM571.3 347.3c6.2-6.2 6.2-16.4 0-22.6l-64-64c-6.2-6.2-16.4-6.2-22.6 0l-64 64c-6.2 6.2-6.2 16.4 0 22.6s16.4 6.2 22.6 0L480 310.6V432c0 8.8 7.2 16 16 16s16-7.2 16-16V310.6l36.7 36.7c6.2 6.2 16.4 6.2 22.6 0zM0 176c0-8.8 7.2-16 16-16H368c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H16c-8.8 0-16-7.2-16-16V176zm352 80V480c0 17.7-14.3 32-32 32H64c-17.7 0-32-14.3-32-32V256H352zM144 320c-8.8 0-16 7.2-16 16s7.2 16 16 16h96c8.8 0 16-7.2 16-16s-7.2-16-16-16H144z';
const D_TRUCK =
  'M48 0C21.5 0 0 21.5 0 48V368c0 26.5 21.5 48 48 48H64c0 53 43 96 96 96s96-43 96-96H384c0 53 43 96 96 96s96-43 96-96H544c17.7 0 32-14.3 32-32s-14.3-32-32-32V288 256 237.3c0-17-6.7-33.3-18.7-45.3L512 114.7c-12-12-28.3-18.7-45.3-18.7H416V48c0-26.5-21.5-48-48-48H48zM416 160h50.7L544 237.3V256H416V160zM208 416c0 26.5-21.5 48-48 48s-48-21.5-48-48s21.5-48 48-48s48 21.5 48 48zm272 48c-26.5 0-48-21.5-48-48s21.5-48 48-48s48 21.5 48 48s-21.5 48-48 48z';
const D_TRUCK_RAMP =
  'M640 0V400c0 61.9-50.1 112-112 112c-61 0-110.5-48.7-112-109.3L48.4 502.9c-17.1 4.6-34.6-5.4-39.3-22.5s5.4-34.6 22.5-39.3L352 353.8V64c0-35.3 28.7-64 64-64H640zM576 400c0-26.5-21.5-48-48-48s-48 21.5-48 48s21.5 48 48 48s48-21.5 48-48zM23.1 207.7c-4.6-17.1 5.6-34.6 22.6-39.2l46.4-12.4 20.7 77.3c2.3 8.5 11.1 13.6 19.6 11.3l30.9-8.3c8.5-2.3 13.6-11.1 11.3-19.6l-20.7-77.3 46.4-12.4c17.1-4.6 34.6 5.6 39.2 22.6l41.4 154.5c4.6 17.1-5.6 34.6-22.6 39.2L103.7 384.9c-17.1 4.6-34.6-5.6-39.2-22.6L23.1 207.7z';
const D_STORE =
  'M547.6 103.8L490.3 13.1C485.2 5 476.1 0 466.4 0H109.6C99.9 0 90.8 5 85.7 13.1L28.3 103.8c-29.6 46.8-3.4 111.9 51.9 119.4c4 .5 8.1 .8 12.1 .8c26.1 0 49.3-11.4 65.2-29c15.9 17.6 39.1 29 65.2 29c26.1 0 49.3-11.4 65.2-29c15.9 17.6 39.1 29 65.2 29c26.2 0 49.3-11.4 65.2-29c16 17.6 39.1 29 65.2 29c4.1 0 8.1-.3 12.1-.8c55.5-7.4 81.8-72.5 52.1-119.4zM499.7 254.9l-.1 0c-5.3 .7-10.7 1.1-16.2 1.1c-12.4 0-24.3-1.9-35.4-5.3V384H128V250.6c-11.2 3.5-23.2 5.4-35.6 5.4c-5.5 0-11-.4-16.3-1.1l-.1 0c-4.1-.6-8.1-1.3-12-2.3V384v64c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V384 252.6c-4 1-8 1.8-12.3 2.3z';
const D_EXCLAMATION =
  'M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0S0 114.6 0 256S114.6 512 256 512zm0-384c13.3 0 24 10.7 24 24V264c0 13.3-10.7 24-24 24s-24-10.7-24-24V152c0-13.3 10.7-24 24-24zm32 224c0 17.7-14.3 32-32 32s-32-14.3-32-32s14.3-32 32-32s32 14.3 32 32z';
const D_TRIANGLE =
  'M256 32c14.2 0 27.3 7.5 34.5 19.8l216 368c7.3 12.4 7.3 27.7 .2 40.1S486.3 480 472 480H40c-14.3 0-27.6-7.7-34.7-20.1s-7-27.8 .2-40.1l216-368C228.7 39.5 241.8 32 256 32zm0 128c-13.3 0-24 10.7-24 24V296c0 13.3 10.7 24 24 24s24-10.7 24-24V184c0-13.3-10.7-24-24-24zm32 224c0-17.7-14.3-32-32-32s-32 14.3-32 32s14.3 32 32 32s32-14.3 32-32z';
const D_FILE =
  'M64 0C28.7 0 0 28.7 0 64V448c0 35.3 28.7 64 64 64H320c35.3 0 64-28.7 64-64V160H256c-17.7 0-32-14.3-32-32V0H64zM256 0V128H384L256 0zM112 256H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16z';
const D_MONEY =
  'M0 112.5V422.3c0 18 10.1 35 27 41.3c87 32.5 174 10.3 261-11.9c79.8-20.3 159.6-40.7 239.3-18.9c23 6.3 48.7-9.5 48.7-33.4V89.7c0-18-10.1-35-27-41.3C462 15.9 375 38.1 288 60.3C208.2 80.6 128.4 100.9 48.7 79.1C25.6 72.8 0 88.6 0 112.5zM288 352c-44.2 0-80-43-80-96s35.8-96 80-96s80 43 80 96s-35.8 96-80 96zM64 352c35.3 0 64 28.7 64 64H64V352zm64-208c0 35.3-28.7 64-64 64V144h64zM512 304v64H448c0-35.3 28.7-64 64-64zM448 96h64v64c-35.3 0-64-28.7-64-64z';

/* ═══════════════════════════ helpers ═══════════════════════════ */

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad2 = (n: number) => String(n).padStart(2, '0');

function fmtShort(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${pad2(d.getDate())} ${MON[d.getMonth()]} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function maskPhone(p: string | null): string {
  if (!p) return '—';
  const m = p.match(/(\d+)$/);
  const tail = m ? m[1].slice(-2) : '';
  return `+216 ** *** *${tail}`;
}

function PhoneReveal({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button type="button" title={show ? 'Hide phone number' : 'Show phone number'} onClick={onToggle} className="inline-flex cursor-pointer items-center text-slate-400 transition hover:text-sky-600">
      <EyeIcon />
    </button>
  );
}

/* ═══════════════════════════ pills ═══════════════════════════ */

type PillTone = 'success' | 'info' | 'warning' | 'danger';

const PILL_TONES: Record<PillTone, string> = {
  success: 'from-emerald-400 to-emerald-500',
  info: 'from-sky-400 to-sky-500',
  warning: 'from-amber-400 to-amber-500',
  danger: 'from-rose-400 to-rose-500',
};

function timelineIcon(key: string): ReactNode {
  switch (key) {
    case 'delivered':
      return <CheckIcon />;
    case 'out':
    case 'transit':
    case 'picked':
      return <Icon d={D_TRUCK} size={11} />;
    case 'origin':
    case 'destination':
      return <Icon d={D_MAP} size={11} />;
    default:
      return <Icon d={D_BOXES} size={11} />;
  }
}

/* ═══════════════════════════ editable pill ═══════════════════════════ */

const APPROVAL_OPTIONS: { key: 'approved' | 'waiting' | 'rejected'; label: string; tone: PillTone }[] = [
  { key: 'approved', label: 'Approved', tone: 'success' },
  { key: 'waiting', label: 'Pending', tone: 'warning' },
  { key: 'rejected', label: 'Rejected', tone: 'danger' },
];

const DELIVERY_TYPE_OPTIONS = ['SHOPORA Handle the pickup', 'Self Delivery', 'Prepaid Label'];

const PROCESS_TYPE_OPTIONS = ['SWAP & RETURN', 'DIRECT RETURN'];

const RETURN_STATUS_OPTIONS: { key: ReturnDeliveryStatus; label: string }[] = [
  { key: 'awaiting_arrival', label: 'Awaiting products arrival to fulfillment center' },
  { key: 'packed', label: 'Packed' },
  { key: 'ready_for_pickup', label: 'Ready for pickup' },
  { key: 'picked_up', label: 'Picked Up' },
  { key: 'on_its_way', label: 'On its way' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'returning_to_sender', label: 'Returning to sender' },
  { key: 'returned_to_sender', label: 'Returned to sender' },
  { key: 'return_delivered', label: 'Return delivered' },
  { key: 'canceled', label: 'Canceled' },
];

const CARRIER_OPTIONS = ['First Delivery', 'Tunisian Post', 'SHOPORA', 'Aramex', 'DHL', 'UPS'];

const EXCHANGE_STATUS_OPTIONS: { key: ExchangeDeliveryStatus; label: string }[] = [
  { key: 'awaiting_packaging', label: 'Awaiting packaging' },
  { key: 'packed', label: 'Packed' },
  { key: 'ready_for_pickup', label: 'Ready for pickup' },
  { key: 'picked_up', label: 'Picked Up' },
  { key: 'on_its_way', label: 'On its way' },
  { key: 'at_carrier_facility', label: 'At carrier facility' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'returning_to_sender', label: 'Returning to sender' },
  { key: 'returned_to_sender', label: 'Returned to sender' },
  { key: 'canceled', label: 'Canceled' },
];

type ReturnDeliveryKey = ReturnDeliveryStatus;

function EditablePill<T extends string>({
  value,
  display,
  tone,
  icon,
  options,
  onSelect,
  titleOptions,
}: {
  value: T;
  display: string;
  tone: PillTone;
  icon: ReactNode;
  options: { key: T; label: string }[];
  onSelect: (v: T) => void;
  titleOptions?: string;
}) {
  const [open, setOpen] = useState<{ pos: { left: number; top: number } } | null>(null);
  return (
    <>
      <button
        type="button"
        title={titleOptions ?? 'Click to edit'}
        onClick={(e) => {
          e.stopPropagation();
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          setOpen((cur) => (cur ? null : { pos: { left: Math.max(8, Math.min(rect.left, window.innerWidth - 270)), top: rect.bottom + 4 } }));
        }}
        className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b px-2.5 py-0.5 text-[11px] font-bold text-white/90 shadow-sm ${PILL_TONES[tone]}`}
      >
        <span className="opacity-80">{icon}</span>
        <span className="whitespace-nowrap">{display}</span>
        <Icon d={D_CARET} size={9} className="opacity-80" />
      </button>
      {open && (
        <FilterOverlay pos={open.pos} width={262} onClose={() => setOpen(null)}>
          <div className="max-h-[320px] overflow-y-auto p-1.5">
            {options.map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => {
                  setOpen(null);
                  onSelect(o.key);
                }}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs font-semibold transition hover:bg-slate-100 ${
                  o.key === value ? 'bg-sky-50 text-sky-700' : 'text-slate-700'
                }`}
              >
                <span>{o.label}</span>
                {o.key === value && <CheckIcon />}
              </button>
            ))}
          </div>
        </FilterOverlay>
      )}
    </>
  );
}

/* ═══════════════════════════ page ═══════════════════════════ */

export default function ChefReturnDetail() {
  const { id } = useParams<{ id: string }>();
  const returnId = Number(id);
  const [ret, setRet] = useState<ReturnDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notesOpen, setNotesOpen] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [tab, setTab] = useState('overview');
  const [showPhone, setShowPhone] = useState(false);

  useEffect(() => {
    setLoading(true);
    getReturnDetail(returnId)
      .then(setRet)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [returnId]);

  const refresh = () => getReturnDetail(returnId).then(setRet).catch((e) => alert(apiErrorMessage(e)));
  const apply = (patch: Parameters<typeof updateChefReturn>[1]) => {
    updateChefReturn(returnId, patch)
      .then(refresh)
      .catch((e) => alert(apiErrorMessage(e)));
  };
  const applyProcess = (processType: string) => {
    const isSwap = processType.toUpperCase().includes('SWAP');
    updateChefReturn(returnId, {
      process_type: processType,
      exchange_delivery_status: isSwap ? 'packed' : null,
    })
      .then(refresh)
      .catch((e) => alert(apiErrorMessage(e)));
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!ret) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h5 className="text-base font-bold text-slate-900">Return not found</h5>
        <p className="mt-1 text-sm text-slate-500">This return does not exist.</p>
        <Link to="/chef/returns" className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">
          ← Back to returns
        </Link>
      </div>
    );
  }

  const typeLabel = ret.type === 'replacement' ? 'Exchange' : 'Product return';
  const disputeTone: PillTone = ret.dispute_status ? 'warning' : 'success';
  const disputeLabel = ret.dispute_status ? 'Unresolved' : 'Resolved';
  const exchangeDelivered = ret.exchange_delivery_label === 'Delivered';

  const createdName = ret.created_by ?? 'Seller';
  const [first, ...rest] = createdName.split(' ').filter(Boolean);
  const last = rest.join(' ');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Icon d={D_CHECK_CIRCLE} size={12} /> },
    { id: 'inspection', label: 'Inspection', icon: <Icon d={D_MAGNIFY} size={12} /> },
    {
      id: 'exchange',
      label: 'Exchange Items',
      icon: (
        <>
          <Icon d={D_SWAP} size={12} />
          {!exchangeDelivered && <Icon d={D_TRIANGLE} size={10} className="text-amber-500" />}
        </>
      ),
    },
    { id: 'transactions', label: 'Transactions', icon: <Icon d={D_MONEY} size={12} /> },
    { id: 'ticket', label: 'Ticket', icon: <Icon d={D_TICKET} size={12} /> },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-2 py-4 sm:px-4">
      <Link to="/chef/returns" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-sky-600 transition hover:underline">
        ← Back to returns
      </Link>

      {/* ── main card ── */}
      <div
        className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        style={{ backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(56,152,236,0.08), transparent 45%)' }}
      >
        <div className="grid gap-x-8 gap-y-4 p-4 md:grid-cols-2">
          {/* ── left column ── */}
          <div className="min-w-0">
            <h5 className="mb-0 flex items-center gap-1 text-lg font-bold text-slate-900">
              {typeLabel} - Order return #{String(Number(ret.gid))}
              <Icon d={D_INFO} size={14} className="text-slate-300" />
            </h5>

            <div className="my-2 flex flex-wrap gap-x-2 text-xs text-slate-700">
              <span className="inline-flex items-center gap-1">
                <Icon d={D_USER} size={11} className="text-slate-400" />
                <a href="/chef/returns" onClick={(e) => e.preventDefault()} className="inline-flex items-center gap-1 font-semibold text-sky-600 hover:underline">
                  {ret.retailer_name}
                </a>
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                <ClockIcon className="text-slate-400" />
                {fmtShort(ret.created_at)}
              </span>
            </div>

            {/* status rows */}
            <div className="mt-3 space-y-1.5 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <strong className="me-1 shrink-0">Approval status:</strong>
                <EditablePill
                  value={ret.approval_status}
                  display={ret.approval_status === 'approved' ? 'Approved' : ret.approval_status === 'rejected' ? 'Rejected' : 'Pending'}
                  tone={ret.approval_status === 'approved' ? 'success' : ret.approval_status === 'rejected' ? 'danger' : 'warning'}
                  icon={ret.approval_status === 'approved' ? <CheckIcon /> : <ClockIcon />}
                  titleOptions="Approved / Pending / Rejected"
                  options={APPROVAL_OPTIONS}
                  onSelect={(v) => apply({ approval_status: v })}
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <strong className="me-1 shrink-0">Delivery type:</strong>
                <EditablePill
                  value={ret.delivery_type as string}
                  display={ret.delivery_type}
                  tone="info"
                  icon={<Icon d={D_TRUCK_RAMP} size={11} />}
                  titleOptions="SHOPORA Handle the pickup / Self Delivery / Prepaid Label"
                  options={DELIVERY_TYPE_OPTIONS.map((o) => ({ key: o, label: o }))}
                  onSelect={(v) => apply({ delivery_type: v })}
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <strong className="me-1 shrink-0">Process Type:</strong>
                <EditablePill
                  value={ret.process_type as string}
                  display={ret.process_type}
                  tone="info"
                  icon={<Icon d={D_SWAP} size={11} />}
                  titleOptions="SWAP & RETURN / DIRECT RETURN"
                  options={PROCESS_TYPE_OPTIONS.map((o) => ({ key: o, label: o }))}
                  onSelect={(v) => applyProcess(v)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <strong className="me-1 shrink-0">Delivery status:</strong>
                <EditablePill
                  value={ret.return_delivery_status as ReturnDeliveryKey}
                  display={ret.return_delivery_label}
                  tone={
                    ret.return_delivery_status === 'delivered' || ret.return_delivery_status === 'return_delivered'
                      ? 'success'
                      : ret.return_delivery_status === 'canceled' || ret.return_delivery_status === 'returning_to_sender' || ret.return_delivery_status === 'returned_to_sender'
                      ? 'danger'
                      : 'warning'
                  }
                  icon={<Icon d={D_TRUCK} size={11} />}
                  titleOptions="Select a delivery status"
                  options={RETURN_STATUS_OPTIONS}
                  onSelect={(v) => apply({ return_delivery_status: v })}
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <strong className="me-1 shrink-0">Exchange delivery status:</strong>
                <EditablePill
                  value={(ret.exchange_delivery_status ?? 'awaiting_packaging') as ExchangeDeliveryStatus}
                  display={EXCHANGE_STATUS_OPTIONS.find((o) => o.key === ret.exchange_delivery_status)?.label ?? '—'}
                  tone={
                    ret.exchange_delivery_status === 'delivered'
                      ? 'success'
                      : ret.exchange_delivery_status === 'canceled' || ret.exchange_delivery_status === 'returning_to_sender' || ret.exchange_delivery_status === 'returned_to_sender'
                      ? 'danger'
                      : 'info'
                  }
                  icon={<Icon d={D_SWAP} size={11} />}
                  titleOptions="Select the exchange delivery status"
                  options={EXCHANGE_STATUS_OPTIONS}
                  onSelect={(v) => apply({ exchange_delivery_status: v })}
                />
              </div>
            </div>

            {/* carrier + fulfillment */}
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center gap-1.5">
                <strong className="me-1 shrink-0">Carrier account:</strong>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-[9px] font-bold text-brand-700">
                  {ret.carrier_name
                    .split(/\s+/)
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
                <EditablePill
                  value={(ret.carrier && ret.carrier !== '—' ? ret.carrier : ret.carrier_name) as string}
                  display={ret.carrier && ret.carrier !== '—' ? ret.carrier : ret.carrier_name}
                  tone="info"
                  icon={<Icon d={D_TRUCK} size={11} />}
                  titleOptions="Carrier account (delivery company)"
                  options={CARRIER_OPTIONS.map((o) => ({ key: o, label: o }))}
                  onSelect={(v) => apply({ carrier: v })}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <strong className="me-1 shrink-0">Fulfilled at:</strong>
                <span className={ret.fulfilled_at ? 'font-semibold text-slate-700' : 'text-slate-400'}>{ret.fulfilled_at ? fmtShort(ret.fulfilled_at) : 'Not fulfilled yet'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <strong className="me-1 shrink-0">Fulfilled by:</strong>
                <Icon d={D_WAREHOUSE} size={12} className="text-slate-400" />
                <span className="font-semibold text-slate-700">{ret.fulfilled_by ?? 'Not fulfilled yet'}</span>
              </div>
              {ret.inspection && (
                <div className="flex items-center gap-1.5">
                  <strong className="me-1 shrink-0">Inspection by:</strong>
                  <Icon d={D_WAREHOUSE} size={12} className="text-slate-400" />
                  <span className="font-semibold text-slate-700">{ret.inspection_by ?? 'Not inspected yet'}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <strong className="me-1 shrink-0">Tracking Number:</strong>
                <span className={ret.tracking_number ? 'font-semibold text-slate-700' : 'text-slate-400'}>{ret.tracking_number ?? ''}</span>
              </div>
            </div>

            {/* addresses */}
            <div className="mt-3 space-y-2">
              <AddressBox title="Order address" name={ret.customer_name} phone={ret.customer_phone_full} showPhone={showPhone} onToggle={() => setShowPhone((v) => !v)} lines={ret.address_lines} />
              <AddressBox title="Return address" name={ret.customer_name} phone={ret.customer_phone_full} showPhone={showPhone} onToggle={() => setShowPhone((v) => !v)} lines={ret.address_lines} />
            </div>

            {/* order links */}
            <div className="mt-3 space-y-1.5 text-xs">
              <div className="flex items-center gap-1">
                <strong className="me-1">Order:</strong>
                <span className="text-slate-600">#{String(Number(ret.order_gid))}</span>
              </div>
              {ret.order_shipment_gid && (
                <div className="flex items-center gap-1">
                  <strong className="me-1">Order shipments:</strong>
                  <a href="/chef/shipments" onClick={(e) => e.preventDefault()} className="inline-flex items-center gap-1 font-semibold text-sky-600 hover:underline">
                    <Icon d={D_BOXES} size={11} /> Shipment #{String(Number(ret.order_shipment_gid))}
                  </a>
                </div>
              )}
              {ret.exchange_shipment_gid && (
                <div className="flex items-start gap-1">
                  <strong className="me-1 shrink-0">Combined exchange shipments:</strong>
                  <div className="flex flex-col gap-1">
                    <a href="/chef/shipments" onClick={(e) => e.preventDefault()} className="inline-flex items-center gap-1 font-semibold text-sky-600 hover:underline">
                      <Icon d={D_BOXES} size={11} /> Shipment #{String(Number(ret.exchange_shipment_gid))}
                    </a>
                    <span className="inline-flex items-center gap-1 self-start rounded bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      <Icon d={D_TRUCK} size={10} />
                      <span className="max-w-[200px] text-wrap leading-snug">{ret.exchange_delivery_label}</span>
                      <Icon d={D_INFO} size={10} className="text-sky-500" />
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── right column ── */}
          <div className="flex flex-col md:items-end">
            <div className="flex w-full flex-col items-end">
              <button
                type="button"
                title="Resolved / Unresolved"
                className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-b px-2 py-0.5 text-[11px] font-bold text-white/90 shadow-sm ${PILL_TONES[disputeTone]}`}
              >
                <Icon d={D_CARET_LEFT} size={9} className="opacity-80" />
                <span className="whitespace-nowrap">{disputeLabel}</span>
              </button>

              <button
                type="button"
                className="my-2 w-full rounded-md bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2 text-xs font-bold text-white transition hover:from-emerald-600 hover:to-emerald-700"
              >
                Mark as received
              </button>
              <button
                type="button"
                onClick={() => setNotesOpen(true)}
                className="my-1 flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <Icon d={D_NOTE} size={12} />
                Notes
              </button>
              <button
                type="button"
                onClick={() => setTicketOpen(true)}
                className="my-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <Icon d={D_TICKET} size={12} />
                Internal Ticket
              </button>
            </div>

            <div className="my-2 flex w-full items-center gap-1.5 text-xs">
              <strong className="me-1 shrink-0">Destination:</strong>
              <Icon d={D_WAREHOUSE} size={12} className="text-slate-400" />
              <span className="font-semibold text-slate-700">{ret.destination_warehouse ?? '—'}</span>
            </div>
            <div className="my-2 flex w-full items-center gap-1.5 text-xs">
              <strong className="me-1 shrink-0">Received at:</strong>
              <span className={ret.received_at ? 'font-semibold text-slate-700' : 'text-slate-400'}>{ret.received_at ? fmtShort(ret.received_at) : 'Not received yet'}</span>
            </div>

            <div className="my-2 flex w-full items-center gap-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs">
              <span className="shrink-0 text-slate-700">Created by:</span>
              <Avatar name={createdName} size="h-10 w-10 text-[11px]" />
              <div className="min-w-0 flex-1 leading-tight">
                <h6 className="mb-0 whitespace-nowrap text-sm font-bold text-slate-900">{first || createdName}</h6>
                <p className="mb-0 whitespace-nowrap text-[11px] text-slate-500">{last || ' '}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── blocked payment alert ── */}
      {!exchangeDelivered && (
        <div role="alert" className="mb-3 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
            <Icon d={D_EXCLAMATION} size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <h6 className="mb-1 text-sm font-bold text-amber-900">Payment release is blocked: the combined exchange shipment is not delivered</h6>
            <p className="mb-2 text-xs text-amber-800">
              An exchange that is not delivered means its return has not been returned. What came back is the exchange shipment items, not the items the customer returned, so
              no refund or supplier payment can be released on this return.
            </p>
            {ret.exchange_shipment_gid ? (
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                <a href="/chef/shipments" onClick={(e) => e.preventDefault()} className="font-semibold text-amber-900 underline">
                  Exchange shipment #{String(Number(ret.exchange_shipment_gid))}
                </a>
                <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">{ret.exchange_delivery_label}</span>
              </div>
            ) : null}
            <p className="mb-0 text-xs text-amber-800">If this exchange was in fact delivered, its status has to be corrected to Delivered first. Contact the logistics manager.</p>
          </div>
        </div>
      )}

      {/* ── tabs card ── */}
      <div className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-2 py-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold transition ${
                tab === t.id ? 'border-sky-500 text-sky-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && <OverviewTab ret={ret} />}
        {tab === 'inspection' && <EmptyTab label="Inspection" />}
        {tab === 'exchange' && <EmptyTab label="Exchange items" />}
        {tab === 'transactions' && <EmptyTab label="Transactions" />}
        {tab === 'ticket' && <EmptyTab label="Ticket" />}
      </div>

      {notesOpen && <AddNoteModal onClose={() => setNotesOpen(false)} />}
      {ticketOpen && <ReturnTicketModal gid={ret.gid} onClose={() => setTicketOpen(false)} />}
    </div>
  );
}

/* ═══════════════════════════ sub-components ═══════════════════════════ */

function EmptyTab({ label }: { label: string }) {
  return (
    <div className="px-4 py-16 text-center text-sm text-slate-400">No {label.toLowerCase()} records found.</div>
  );
}

function AddressBox({
  title,
  name,
  phone,
  showPhone,
  onToggle,
  lines,
}: {
  title: string;
  name: string;
  phone: string;
  showPhone: boolean;
  onToggle: () => void;
  lines: string[];
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs leading-snug">
      <h5 className="mb-1 flex items-center gap-1 text-[11px] font-bold text-slate-700">
        <Icon d={D_MAP} size={11} className="text-slate-500" />
        {title}
      </h5>
      <div className="my-1">
        <span className="font-semibold text-slate-800">
          {name} / <span dir="ltr" className="font-normal text-slate-600">{showPhone ? phone : maskPhone(phone)}</span>
        </span>{' '}
        <PhoneReveal show={showPhone} onToggle={onToggle} />
      </div>
      <div className="space-y-0.5">
        {lines.map((line) => (
          <div key={line} className="text-[11px] text-slate-500">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

function OverviewTab({ ret }: { ret: ReturnDetail }) {
  const product = ret.products[0];
  const exchangeDelivered = ret.exchange_delivery_label === 'Delivered';

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-brand-600 text-white">
            <tr>
              <th className="px-3 py-2.5 font-semibold" colSpan={2}>
                Product
              </th>
              <th className="px-3 py-2.5 text-center font-semibold">Shipment</th>
              <th className="px-3 py-2.5 text-center font-semibold">Status</th>
              <th className="px-3 py-2.5 text-center font-semibold">Report</th>
              <th className="px-3 py-2.5 text-center font-semibold">Payment releases</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="px-3 py-2 align-middle" colSpan={2}>
                <div className="flex items-center">
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                    <Icon d={D_BOXES} size={18} />
                  </span>
                  <div className="ms-2 min-w-0">
                    <div className="truncate text-sm font-bold text-slate-900">{product?.name ?? '—'}</div>
                    {product?.variation && <div className="text-[11px] text-slate-500">{product.variation}</div>}
                  </div>
                </div>
              </td>
              <td className="px-3 py-2 text-center align-middle">
                <div className="flex flex-col items-center gap-1">
                  <a href="/chef/returns" onClick={(e) => e.preventDefault()} className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:underline">
                    <Icon d={D_STORE} size={11} /> {ret.retailer_name}
                  </a>
                  {ret.order_shipment_gid ? (
                    <a href="/chef/shipments" onClick={(e) => e.preventDefault()} className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:underline">
                      <Icon d={D_BOXES} size={11} /> Shipment #{String(Number(ret.order_shipment_gid))}
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-400">—</span>
                  )}
                </div>
              </td>
              <td className="px-3 py-2 text-center align-middle">
                <div className="flex flex-col items-center gap-1">
                  <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">Not recieved</span>
                  <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">No status yet</span>
                </div>
              </td>
              <td className="px-3 py-2 text-center align-middle">
                <a href="/chef/returns" onClick={(e) => e.preventDefault()} className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:underline">
                  <EyeIcon /> <span className="ms-1">View report</span>
                </a>
              </td>
              <td className="px-3 py-2 text-center align-middle">
                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    disabled={!exchangeDelivered}
                    className={`rounded-md px-3 py-1.5 text-[11px] font-bold transition ${
                      exchangeDelivered ? 'bg-sky-600 text-white hover:bg-sky-700' : 'cursor-not-allowed bg-slate-100 text-slate-400'
                    }`}
                  >
                    Release new payment
                  </button>
                  {!exchangeDelivered && <span className="text-[11px] font-semibold text-rose-600">Exchange shipment not delivered</span>}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* order logs */}
      <div className="border-t border-slate-100 px-4 pb-6 pt-4">
        <div className="mb-2 flex items-start gap-2">
          <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-sky-700">
            <Icon d={D_FILE} size={12} />
          </span>
          <div>
            <h5 className="mb-0 text-sm font-bold text-slate-900">Order logs</h5>
            <p className="mb-0 text-xs text-slate-500">You can monitor all the changes that happened to this order from here.</p>
          </div>
        </div>

        <div className="mt-2 space-y-1">
          {ret.exchange_shipment_gid ? (
            ret.exchange_timeline.map((item: ReturnTimelineItem) => (
              <div
                key={item.id}
                className={`flex min-h-[44px] items-center rounded-md px-2 py-1 transition ${
                  item.completed ? 'bg-sky-50/70' : 'bg-slate-50 opacity-50 grayscale'
                }`}
              >
                <span className={`mr-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${item.completed ? 'bg-sky-100 text-sky-700' : 'bg-slate-200 text-slate-400'}`}>
                  {timelineIcon(item.key)}
                </span>
                <span className={`min-w-0 flex-1 text-xs font-semibold ${item.completed ? 'text-slate-800' : 'text-slate-500'}`}>{item.title}</span>
              </div>
            ))
          ) : (
            <div className="rounded-md bg-slate-50 px-3 py-4 text-center text-xs text-slate-400">
              No exchange shipment linked yet — order logs will appear once the exchange shipment is created.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}