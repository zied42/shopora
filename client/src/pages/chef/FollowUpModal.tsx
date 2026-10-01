import { FormEvent, useState } from 'react';
import { apiErrorMessage, apiUpload, chefOrgApi, SupplierFollowUp, supportOrgApi } from '../../lib/api';
import { FOLLOW_UP_TONES, XmarkIcon } from './ui';

const MEETING_OPTIONS = [
  'Called',
  'Recall',
  'Busy',
  'Unreachable',
  'Not Qualified',
  'Follow Up',
  'Face to Face Meeting',
  'Online Meeting',
];

const TAG_OPTIONS: { name: string; cls: string }[] = [
  { name: 'Account activation', cls: 'border-violet-200 bg-violet-50 text-violet-700' },
  { name: 'Pickup', cls: 'border-sky-200 bg-sky-50 text-sky-700' },
  { name: 'Product recommendation', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  { name: 'Reclamation', cls: 'border-rose-200 bg-rose-50 text-rose-700' },
  { name: 'Recurring follow up', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  { name: 'Shipment related', cls: 'border-sky-200 bg-sky-50 text-sky-700' },
  { name: 'Stock availability', cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  { name: 'Ticket', cls: 'border-sky-200 bg-sky-50 text-sky-700' },
  { name: 'Warning', cls: 'border-amber-200 bg-amber-50 text-amber-700' },
];

const toLocalInput = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

interface Props {
  orgId: number;
  initial: SupplierFollowUp | null;
  meeting: string;
  kind?: 'supplier' | 'seller';
  base?: 'chef' | 'support';
  onClose: () => void;
  onSaved: (f: SupplierFollowUp) => void;
}

export default function FollowUpModal({ orgId, initial, meeting: initialMeeting, kind = 'supplier', base = 'chef', onClose, onSaved }: Props) {
  const api = base === 'support' ? supportOrgApi : chefOrgApi;
  const [meeting, setMeeting] = useState(initial?.meeting ?? initialMeeting);
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [note, setNote] = useState(initial?.note ?? '');
  const [scheduledAt, setScheduledAt] = useState(initial?.scheduled_at ? toLocalInput(initial.scheduled_at) : '');
  const [attachments, setAttachments] = useState<string[]>(initial?.attachments ?? []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    setUploading(true);
    setError(null);
    try {
      const urls: string[] = [];
      for (const f of Array.from(list)) urls.push(await apiUpload(f));
      setAttachments((a) => [...a, ...urls]);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const toggleTag = (name: string) =>
    setTags((t) => (t.includes(name) ? t.filter((x) => x !== name) : [...t, name]));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const payload = {
        meeting,
        tags,
        note: note.trim() || null,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        attachments,
      };
      const org = initial
        ? kind === 'seller'
          ? await api.updateSellerFollowUp(orgId, payload)
          : await api.updateSupplierFollowUp(orgId, payload)
        : kind === 'seller'
          ? await api.createSellerFollowUp(orgId, payload)
          : await api.createSupplierFollowUp(orgId, payload);
      if (org.follow_up) onSaved(org.follow_up);
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl" noValidate>
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h5 className="mb-0 flex items-center gap-2 text-sm font-bold text-slate-900">
            Status:
            <span className={`inline-flex items-center justify-center rounded-lg bg-gradient-to-b px-3 py-1.5 text-[11px] font-bold text-white ${FOLLOW_UP_TONES[meeting] ?? 'from-slate-400 to-slate-600'}`}>
              {meeting}
            </span>
          </h5>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 transition hover:text-slate-600">
            <XmarkIcon />
          </button>
        </div>
        <div className="px-4 py-4">
          <div className="mb-3">
            <div className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Select Tag</div>
            <div className="grid grid-cols-2 gap-2">
              {TAG_OPTIONS.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  onClick={() => toggleTag(t.name)}
                  className={`cursor-pointer rounded border px-2.5 py-1.5 text-left text-[10px] font-semibold transition ${t.cls} ${tags.includes(t.name) ? 'ring-2 ring-sky-400' : 'opacity-80 hover:opacity-100'}`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">Meeting:</label>
            <select
              value={meeting}
              onChange={(e) => setMeeting(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
            >
              {MEETING_OPTIONS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">Notes:</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="Type your message"
              className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">Select date &amp; time:</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">Attachments</label>
            <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-[11px] font-semibold text-slate-500 transition hover:border-sky-400 hover:text-sky-600">
              {uploading ? 'Uploading…' : 'Attach an image'}
              <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => { void pickFiles(e.target.files); e.currentTarget.value = ''; }} />
            </label>
            {!!attachments.length && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {attachments.map((url) => (
                  <span key={url} className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px]">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">{url.split('/').pop() ?? url}</a>
                    <button type="button" onClick={() => setAttachments((a) => a.filter((x) => x !== url))} className="font-bold text-slate-400 hover:text-rose-600">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">{error}</div>
          )}

          <button type="submit" disabled={saving} className="w-full rounded-lg bg-sky-600 py-2 text-xs font-bold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? 'Saving…' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
}
