import { useEffect, useRef, useState } from 'react';
import { apiErrorMessage, chefOrgApi, SellerNotification, SellerOrganization, supportOrgApi } from '../../lib/api';
import { Spinner } from '../../components/ui';
import { Pagination, XmarkIcon } from './ui';

function rel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins < 1 ? 'just now' : `${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days <= 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const CHANNEL_TONE: Record<string, string> = {
  Email: 'bg-sky-50 text-sky-700',
  'Web push': 'bg-violet-50 text-violet-700',
  SMS: 'bg-emerald-50 text-emerald-700',
};

export function NotificationHistoryModal({ org, base = 'chef', onClose }: { org: SellerOrganization; base?: 'chef' | 'support'; onClose: () => void }) {
  const api = base === 'support' ? supportOrgApi : chefOrgApi;
  const [rows, setRows] = useState<SellerNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [channels, setChannels] = useState<string[]>([]);
  const [channel, setChannel] = useState('all');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page + 1), per_page: String(pageSize) });
    if (channel !== 'all') params.set('channel', channel);
    api.getSellerNotifications(org.id, params)
      .then((r) => {
        setRows(r.rows);
        setTotal(r.total);
        setChannels(r.filters.channels);
      })
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [org.id, channel, page, pageSize]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl" role="document">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h5 className="mb-0 text-sm font-bold text-slate-900">Notifications History</h5>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">#{org.id}</span>
            <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 transition hover:text-slate-600">
              <XmarkIcon />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
          <label className="text-xs font-semibold text-slate-700">Filter by Channel</label>
          <select
            value={channel}
            onChange={(e) => {
              setChannel(e.target.value);
              setPage(0);
            }}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none transition focus:border-sky-400"
          >
            <option value="all">All channels</option>
            {channels.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {loading ? (
            <Spinner />
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  {['Name', 'Data', 'Channel', 'Created At'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-[11px] font-semibold text-slate-900">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((n, i) => (
                  <tr key={n.id} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
                    <td className="px-3 py-2.5 text-xs font-semibold text-slate-800">{n.name}</td>
                    <td className="max-w-[260px] px-3 py-2.5 text-[11px] text-slate-600">{n.data}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${CHANNEL_TONE[n.channel] ?? 'bg-slate-100 text-slate-600'}`}>
                        {n.channel}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[11px] text-slate-500">{rel(n.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && rows.length === 0 && <div className="flex justify-center py-14 text-xs text-slate-400">No results found</div>}
        </div>

        <Pagination page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={total} />
      </div>
    </div>
  );
}

/* ── Send Notification modal ─────────────────────────────────────────── */

const NOTIFICATION_CHANNELS = ['E-Mail', 'SMS', 'Web push'] as const;

const GENERAL_TEMPLATES = [
  { title: 'New product available', body: 'Hello, a new product matching your interests is now available in the store.' },
  { title: 'Order confirmed', body: 'Your order has been confirmed and is being prepared for shipping.' },
  { title: 'Balance statement', body: 'Your balance statement for this period is now available for download.' },
  { title: 'Late fulfillment', body: 'One of your shipments is at risk of being fulfilled late.' },
  { title: 'Promo code', body: 'A new promotional code has been generated for your store.' },
];

const MAIL_TEMPLATES = [
  { title: 'Price constraint set', body: 'A price constraint has been applied to one of your product subscriptions.' },
  { title: 'OOS allowance', body: 'Selling is now allowed for your product even when it is out of stock.' },
  { title: 'Registration completed', body: 'Your registration process has been completed successfully.' },
  { title: 'Documents under review', body: 'Some of your uploaded documents are currently under review by the team.' },
];

function FormatIcon({ children, tag }: { children: React.ReactNode; tag: string }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        document.execCommand(tag);
      }}
      className="flex h-7 w-7 items-center justify-center rounded border border-slate-200 bg-white text-xs font-bold text-slate-600 transition hover:bg-slate-50"
    >
      {children}
    </button>
  );
}

export function SendNotificationModal({ recipients, onClose }: { recipients: string[]; onClose: () => void }) {
  const [channel, setChannel] = useState<string>('E-Mail');
  const [chips, setChips] = useState<string[]>(recipients);
  const [draft, setDraft] = useState('');
  const [subject, setSubject] = useState('');
  const [empty, setEmpty] = useState(true);
  const editorRef = useRef<HTMLDivElement>(null);
  const [chipsError, setChipsError] = useState('');

  const setMessage = (html: string) => {
    if (editorRef.current) {
      editorRef.current.innerHTML = html;
      setEmpty(false);
    }
  };

  const addChip = () => {
    const v = draft.trim();
    if (!v) return;
    if (!chips.includes(v)) setChips((c) => [...c, v]);
    setDraft('');
    setChipsError('');
  };

  const removeChip = (v: string) => setChips((c) => c.filter((x) => x !== v));

  const pickTemplate = (t: { title: string; body: string }) => {
    setSubject(t.title);
    setMessage(`<p>${t.body}</p>`);
  };

  const send = () => {
    const all = [...chips, draft.trim()].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
    if (all.length === 0) {
      setChipsError('Add at least one recipient.');
      return;
    }
    setChips(all);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl" role="document">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h5 className="mb-0 text-sm font-bold text-slate-900">Send Notifications</h5>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 transition hover:text-slate-600">
            <XmarkIcon />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-auto lg:flex-row">
          <div className="w-full shrink-0 border-b border-slate-100 lg:w-64 lg:border-b-0 lg:border-r">
            <div className="px-3 pt-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">General</div>
            <div className="space-y-0.5 px-2 py-1">
              {GENERAL_TEMPLATES.map((t) => (
                <button
                  key={t.title}
                  type="button"
                  onClick={() => pickTemplate(t)}
                  className={`block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition hover:bg-sky-50 hover:text-sky-700 ${subject === t.title ? 'bg-sky-50 text-sky-700' : 'text-slate-700'}`}
                >
                  {t.title}
                </button>
              ))}
            </div>
            <div className="px-3 pt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Templates Mails</div>
            <div className="space-y-0.5 px-2 py-1">
              {MAIL_TEMPLATES.map((t) => (
                <button
                  key={t.title}
                  type="button"
                  onClick={() => pickTemplate(t)}
                  className={`block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold transition hover:bg-sky-50 hover:text-sky-700 ${subject === t.title ? 'bg-sky-50 text-sky-700' : 'text-slate-700'}`}
                >
                  {t.title}
                </button>
              ))}
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-4 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs font-semibold text-slate-900">Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none transition focus:border-sky-400"
              >
                {NOTIFICATION_CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-900">Recipients</label>
              <div className="mt-1 flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 outline-none transition focus-within:border-sky-400">
                {chips.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-medium text-sky-700">
                    {c}
                    <button type="button" onClick={() => removeChip(c)} aria-label={`Remove ${c}`} className="text-sky-400 transition hover:text-sky-600">
                      <XmarkIcon />
                    </button>
                  </span>
                ))}
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      addChip();
                    }
                  }}
                  placeholder={chips.length === 0 ? 'Add a recipient then press Enter' : 'Add another recipient'}
                  className="min-w-[140px] flex-1 border-0 bg-transparent py-0.5 text-xs text-slate-800 outline-none"
                />
              </div>
              {chipsError && <p className="mt-1 text-[11px] text-rose-600">{chipsError}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-900">Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Notification subject"
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-sky-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-900">Message</label>
              <div className="mt-1 overflow-hidden rounded-lg border border-slate-200">
                <div className="flex items-center gap-1 border-b border-slate-100 bg-slate-50 px-2 py-1.5">
                  <FormatIcon tag="bold">B</FormatIcon>
                  <FormatIcon tag="italic">I</FormatIcon>
                  <FormatIcon tag="underline">U</FormatIcon>
                  <FormatIcon tag="insertUnorderedList">List</FormatIcon>
                </div>
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => setEmpty((e.currentTarget.innerText ?? '').trim().length === 0)}
                  className={`relative min-h-[140px] px-3 py-2 text-xs leading-relaxed text-slate-800 outline-none ${empty ? 'before:pointer-events-none before:absolute before:text-slate-400 before:content-["Write_your_message..."]' : ''}`}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={send}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-sky-700"
          >
            Send Notification
          </button>
        </div>
      </div>
    </div>
  );
}