import { useState } from 'react';
import { apiErrorMessage, apiUpload } from '../../lib/api';

const DOC_FIELDS = [
  { key: 'cin_front', label: 'CIN front page', icon: 'id-card', span: 'lg:col-span-6' },
  { key: 'cin_back', label: 'CIN back page', icon: 'credit-card', span: 'lg:col-span-6' },
  { key: 'patente', label: 'Patente', icon: 'file', span: 'lg:col-span-4' },
  { key: 'rne', label: 'Registre national des sociétés (RNE)', icon: 'file', span: 'lg:col-span-4' },
  { key: 'contract', label: 'Contract', icon: 'file', span: 'lg:col-span-4' },
];

const DOC_STATUS_OPTIONS = ['Initialed', 'In review', 'Approved', 'Rejected'];

export interface OrgDocs {
  id: number;
  doc_files?: Record<string, string>;
  doc_statuses?: Record<string, string>;
}

function DocIcon({ name }: { name: string }) {
  if (name === 'id-card') {
    return (
      <svg width="18" height="18" viewBox="0 0 576 512" fill="currentColor" aria-hidden="true">
        <path d="M0 96l576 0c0-35.3-28.7-64-64-64H64C28.7 32 0 60.7 0 96zm0 32V416c0 35.3 28.7 64 64 64H512c35.3 0 64-28.7 64-64V128H0zM64 405.3c0-29.5 23.9-53.3 53.3-53.3H234.7c29.5 0 53.3 23.9 53.3 53.3c0 5.9-4.8 10.7-10.7 10.7H74.7c-5.9 0-10.7-4.8-10.7-10.7zM176 320c-35.3 0-64-28.7-64-64s28.7-64 64-64s64 28.7 64 64s-28.7 64-64 64zM352 208c0-8.8 7.2-16 16-16H496c8.8 0 16 7.2 16 16s-7.2 16-16 16H368c-8.8 0-16-7.2-16-16zm0 64c0-8.8 7.2-16 16-16H496c8.8 0 16 7.2 16 16s-7.2 16-16 16H368c-8.8 0-16-7.2-16-16zm0 64c0-8.8 7.2-16 16-16H496c8.8 0 16 7.2 16 16s-7.2 16-16 16H368c-8.8 0-16-7.2-16-16z" />
      </svg>
    );
  }
  if (name === 'credit-card') {
    return (
      <svg width="18" height="18" viewBox="0 0 576 512" fill="currentColor" aria-hidden="true">
        <path d="M168 336C181.3 336 192 346.7 192 360C192 373.3 181.3 384 168 384H120C106.7 384 96 373.3 96 360C96 346.7 106.7 336 120 336H168zM360 336C373.3 336 384 346.7 384 360C384 373.3 373.3 384 360 384H248C234.7 384 224 373.3 224 360C224 346.7 234.7 336 248 336H360zM512 32C547.3 32 576 60.65 576 96V416C576 451.3 547.3 480 512 480H64C28.65 480 0 451.3 0 416V96C0 60.65 28.65 32 64 32H512zM512 80H64C55.16 80 48 87.16 48 96V128H528V96C528 87.16 520.8 80 512 80zM528 224H48V416C48 424.8 55.16 432 64 432H512C520.8 432 528 424.8 528 416V224z" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
      <path d="M365.3 93.38l-74.63-74.64C278.6 6.742 262.3 0 245.4 0L64-.0001c-35.35 0-64 28.65-64 64l.0065 384c0 35.34 28.65 64 64 64H320c35.2 0 64-28.8 64-64V138.6C384 121.7 377.3 105.4 365.3 93.38zM336 448c0 8.836-7.164 16-16 16H64.02c-8.838 0-16-7.164-16-16L48 64.13c0-8.836 7.164-16 16-16h160L224 128c0 17.67 14.33 32 32 32h79.1V448zM96 280C96 293.3 106.8 304 120 304h144C277.3 304 288 293.3 288 280S277.3 256 264 256h-144C106.8 256 96 266.8 96 280zM264 352h-144C106.8 352 96 362.8 96 376s10.75 24 24 24h144c13.25 0 24-10.75 24-24S277.3 352 264 352z" />
    </svg>
  );
}

function EyeSlashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 640 512" fill="currentColor" aria-hidden="true">
      <path d="M38.8 5.1C28.4-3.1 13.3-1.2 5.1 9.2S-1.2 34.7 9.2 42.9l592 464c10.4 8.2 25.5 6.3 33.7-4.1s6.3-25.5-4.1-33.7L525.6 386.7c39.6-40.6 66.4-86.1 79.9-118.4c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C465.5 68.8 400.8 32 320 32c-68.2 0-125 26.3-169.3 60.8L38.8 5.1zM223.1 149.5C248.6 126.2 282.7 112 320 112c79.5 0 144 64.5 144 144c0 24.9-6.3 48.3-17.4 68.7L408 294.5c5.2-11.8 8-24.8 8-38.5c0-53-43-96-96-96c-2.8 0-5.6.1-8.4.4c5.3 9.3 8.4 20.1 8.4 31.6c0 10.2-2.4 19.8-6.6 28.3l-90.3-70.8zm223.1 298L373 389.9c-16.4 6.5-34.3 10.1-53 10.1c-79.5 0-144-64.5-144-144c0-6.9.5-13.6 1.4-20.2L83.1 161.5C60.3 191.2 44 220.8 34.5 243.7c-3.3 7.9-3.3 16.7 0 24.6c14.9 35.7 46.2 87.7 93 131.1C174.5 443.2 239.2 480 320 480c47.8 0 89.9-12.9 126.2-32.5z" />
    </svg>
  );
}

export function DocumentsTab({
  docFiles,
  docStatuses,
  onSaveFlags,
}: {
  docFiles: Record<string, string>;
  docStatuses: Record<string, string>;
  onSaveFlags: (patch: { doc_files?: Record<string, string>; doc_statuses?: Record<string, string> }) => Promise<unknown> | unknown;
}) {
  const [editing, setEditing] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, string>>(() =>
    Object.fromEntries(DOC_FIELDS.map((d) => [d.key, docStatuses[d.key] ?? 'Initialed']))
  );
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ key: string; url: string; label: string } | null>(null);

  const isImage = (url: string) => /\.(jpe?g|png|gif|webp)(\?.*)?$/i.test(url);

  const saveStatus = async (key: string, value: string) => {
    const next = { ...statuses, [key]: value };
    setStatuses(next);
    try {
      await onSaveFlags({ doc_statuses: next, doc_files: docFiles });
    } catch (e) {
      alert(apiErrorMessage(e));
    }
  };

  const saveFile = async (key: string, file: File) => {
    setUploadingKey(key);
    try {
      const url = await apiUpload(file);
      const nextFiles = { ...docFiles, [key]: url };
      await onSaveFlags({ doc_statuses: statuses, doc_files: nextFiles });
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setUploadingKey(null);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex justify-end px-4 pt-4">
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          {editing ? (
            <svg width="13" height="13" viewBox="0 0 576 512" fill="currentColor" aria-hidden="true">
              <path d="M288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4C142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1c3.3-7.9 3.3-16.7 0-24.6-14.9-35.7-46.2-87.7-93-131.1C433.5 68.8 368.8 32 288 32zM432 256c0 79.5-64.5 144-144 144s-144-64.5-144-144s64.5-144 144-144s144 64.5 144 144zM288 192c0 35.3-28.7 64-64 64c-11.5 0-22.3-3-31.6-8.4c-.2 2.8-.4 5.5-.4 8.4c0 53 43 96 96 96s96-43 96-96s-43-96-96-96c-2.8 0-5.6.1-8.4.4c5.3 9.3 8.4 20.1 8.4 31.6z" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
              <path d="M362.7 19.3L314.3 67.7 444.3 197.7l48.4-48.4c25-25 25-65.5 0-90.5L453.3 19.3c-25-25-65.5-25-90.5 0zm-71 71L58.6 323.5c-10.4 10.4-18 23.3-22.2 37.4L1 481.2C-1.5 489.7.8 498.8 7 505s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L421.7 220.3 291.7 90.3z" />
            </svg>
          )}
          <span className="ms-1.5">{editing ? 'Review documents' : 'Edit documents'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 p-4 lg:grid-cols-12">
        {DOC_FIELDS.map((f) => {
          const url = docFiles[f.key];
          return (
            <div key={f.key} className={`mb-3 ${f.span}`}>
              <div className="flex flex-col border border-slate-200 rounded-xl">
                <div className="bg-gradient-to-b from-slate-100 to-slate-50 rounded-t-xl">
                  <div className="flex items-center justify-center gap-2 py-2 text-slate-800">
                    <DocIcon name={f.icon} />
                    <p className="mb-0 text-[11px] font-semibold">{f.label}</p>
                  </div>
                </div>
                {editing ? (
                  <div className="flex flex-col items-center justify-center p-4" style={{ minHeight: 130 }}>
                    <label className="flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-4 text-center transition hover:border-brand-300 hover:bg-brand-50/40">
                      {uploadingKey === f.key ? (
                        <span className="text-[11px] font-semibold text-brand-600">Uploading…</span>
                      ) : url ? (
                        <span className="flex max-w-full items-center gap-2 truncate text-[11px] font-semibold text-emerald-700">
                          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                          <span className="truncate">Saved — click to replace</span>
                        </span>
                      ) : (
                        <>
                          <svg width="34" height="34" viewBox="0 0 512 512" className="mb-2 text-slate-300" fill="currentColor" aria-hidden="true">
                            <path d="M152 120c-26.51 0-48 21.49-48 48s21.49 48 48 48s48-21.49 48-48S178.5 120 152 120zM447.1 32h-384C28.65 32-.0091 60.65-.0091 96v320c0 35.35 28.65 64 63.1 64h384c35.35 0 64-28.65 64-64V96C511.1 60.65 483.3 32 447.1 32zM463.1 409.3l-136.8-185.9C323.8 218.4 318.1 216 312 216c-6.113 0-11.82 2.401-15.18 7.088L219.1 331.3l-15.24-21.16C200.6 305.5 194.9 303 188.9 303c-6.121 0-11.82 2.396-15.24 7.092L88 458c-5 6.623-3.641 16.5 3.003 21.47C95.13 481.2 100.1 484 105.6 484h352c6 0 11.13-2.484 15.1-6.508C482.1 472 483.1 461.2 478 453.5z" />
                          </svg>
                          <p className="mb-1 text-[11px] text-slate-500">
                            Drag &amp; Drop or <span className="font-semibold text-brand-600">Browse</span>
                          </p>
                          <p className="mb-0 text-[10px] text-slate-400">image/jpeg, image/png, application/pdf</p>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,application/pdf"
                        className="hidden"
                        disabled={uploadingKey !== null}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void saveFile(f.key, file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <div
                    className={`flex flex-col items-center justify-center p-4 ${url ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                    style={{ minHeight: 130 }}
                    onClick={() => {
                      if (url) setPreview({ key: f.key, url, label: f.label });
                    }}
                  >
                    {url ? (
                      isImage(url) ? (
                        <img src={url} alt={f.label} className="mb-2 max-h-16 max-w-full rounded object-contain" />
                      ) : (
                        <div className="mb-2 text-slate-400">
                          <DocIcon name="file" />
                        </div>
                      )
                    ) : (
                      <div className="mb-2 text-slate-300">
                        <EyeSlashIcon />
                      </div>
                    )}
                    <div className="my-2" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={statuses[f.key]}
                        onChange={(e) => void saveStatus(f.key, e.target.value)}
                        className="w-36 rounded-xl border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 outline-none transition focus:border-brand-500"
                      >
                        {DOC_STATUS_OPTIONS.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>
                    {url && (
                      <span className="mb-1 text-[10px] font-semibold text-brand-600">Click to preview</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 p-4"
          onClick={() => setPreview(null)}
        >
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">{preview.label}</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{statuses[preview.key]}</span>
              </div>
              <button
                onClick={() => setPreview(null)}
                className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex max-h-[70vh] min-h-[320px] items-center justify-center overflow-auto bg-slate-50 p-4">
              {isImage(preview.url) ? (
                <img src={preview.url} alt={preview.label} className="max-h-[60vh] max-w-full rounded object-contain" />
              ) : (
                <a
                  href={preview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-3 text-slate-500"
                >
                  <DocIcon name="file" />
                  <span className="text-xs font-semibold text-brand-600">Open PDF in new tab</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
