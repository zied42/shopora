import { FormEvent, useState } from 'react';
import { apiErrorMessage, apiUpload, chefOrgApi, supportOrgApi, SupplierFollowUp } from '../../lib/api';
import { XmarkIcon } from './ui';

const OUTCOMES: { value: string; hint: string; cls: string }[] = [
  { value: 'Completed', hint: 'Meeting happened', cls: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
  { value: 'Cancelled', hint: 'Lead cancelled', cls: 'border-rose-300 bg-rose-50 text-rose-700' },
  { value: 'Rescheduled', hint: 'Moved to new date', cls: 'border-amber-300 bg-amber-50 text-amber-700' },
  { value: 'No Show', hint: 'Lead did not show up', cls: 'border-slate-300 bg-slate-100 text-slate-600' },
];

const fileName = (url: string) => url.split('/').pop() ?? url;

interface Props {
  orgId: number;
  initial: SupplierFollowUp;
  kind?: 'supplier' | 'seller';
  base?: 'chef' | 'support';
  onClose: () => void;
  onSaved: (f: SupplierFollowUp) => void;
}

export default function ConfirmMeetingModal({ orgId, initial, kind = 'supplier', base = 'chef', onClose, onSaved }: Props) {
  const api = base === 'support' ? supportOrgApi : chefOrgApi;
  const [outcome, setOutcome] = useState(initial.outcome ?? '');
  const [note, setNote] = useState(initial.note ?? '');
  const [files, setFiles] = useState<File[]>([]);
  const [attachments, setAttachments] = useState<string[]>(initial.attachments ?? []);
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
      setFiles((f) => [...f, ...Array.from(list)]);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (url: string) => setAttachments((a) => a.filter((x) => x !== url));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!outcome) {
      setError('Select an outcome');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const org = kind === 'seller'
        ? await api.updateSellerFollowUp(orgId, {
            confirmed: true,
            outcome,
            note: note.trim() || null,
            attachments,
          })
        : await api.updateSupplierFollowUp(orgId, {
            confirmed: true,
            outcome,
            note: note.trim() || null,
            attachments,
          });
      if (org.follow_up) onSaved(org.follow_up);
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl" noValidate>
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h5 className="mb-0 text-sm font-bold text-slate-900">Edit Meeting Confirmation</h5>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 transition hover:text-slate-600">
            <XmarkIcon />
          </button>
        </div>
        <div className="px-4 py-4">
          <div className="mb-3">
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">Meeting Type</label>
            <input disabled type="text" value={initial.meeting} className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-500" />
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">Outcome *</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {OUTCOMES.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setOutcome(o.value)}
                  className={`rounded-xl border px-3 py-2 text-left transition ${outcome === o.value ? o.cls : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                >
                  <div className="text-xs font-semibold text-slate-800">{o.value}</div>
                  <div className="text-[10px] text-slate-500">{o.hint}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">Notes</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Add notes about the meeting..."
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-brand-500 focus:bg-white"
            />
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">Proof Attachments</label>
            <small className="mb-2 block text-[10px] text-slate-400">Upload photos, documents, or other proof of the meeting</small>
            <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-[11px] font-semibold text-slate-500 transition hover:border-brand-500 hover:text-brand-600">
              {uploading ? 'Uploading…' : 'Drag & Drop files or Browse'}
              <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => { void pickFiles(e.target.files); e.currentTarget.value = ''; }} />
            </label>
            {!!files.length && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {files.map((f, i) => (
                  <span key={`${f.name}-${i}`} className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600">
                    {f.name}
                    <button type="button" onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))} className="font-bold opacity-60 hover:opacity-100">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {!!attachments.length && (
            <div className="mb-3">
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">Existing Attachments</label>
              <div className="flex flex-wrap gap-1.5">
                {attachments.map((url) => (
                  <span key={url} className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px]">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">{fileName(url)}</a>
                    <button type="button" onClick={() => removeAttachment(url)} className="font-bold text-slate-400 hover:text-rose-600">×</button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">{error}</div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100">
            Cancel
          </button>
          <button type="submit" disabled={saving || uploading} className="rounded-xl bg-brand-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? 'Updating…' : 'Update'}
          </button>
        </div>
      </form>
    </div>
  );
}
