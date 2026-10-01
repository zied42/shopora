import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckIcon } from './ui';

const TEMPLATE_COLUMNS = [
  { column: 'Name', required: 'No', example: 'John Doe' },
  { column: 'Phone', required: 'Yes', example: '+21620123456' },
  { column: 'Phone 2', required: 'No', example: '+21698765432' },
  { column: 'Phone 3', required: 'No', example: '+213779140049' },
  { column: 'Email', required: 'No', example: 'john@email.com' },
  { column: 'Link', required: 'No', example: 'https://facebook.com/page' },
  { column: 'Link 2', required: 'No', example: 'https://instagram.com/page' },
  { column: 'Link 3', required: 'No', example: 'https://tiktok.com/@page' },
  { column: 'Description', required: 'No', example: 'Sells electronics online' },
  { column: 'Country Code', required: 'No', example: 'TN' },
  { column: 'Region', required: 'No', example: 'Tunis' },
  { column: 'Potential Type', required: 'No', example: 'retailer' },
  { column: 'Source', required: 'No', example: 'referral' },
  { column: 'Notes', required: 'No', example: 'Interested in products' },
];

const UTMS = [
  { param: 'utm_source', placeholder: 'e.g. facebook' },
  { param: 'utm_medium', placeholder: 'e.g. cpc' },
  { param: 'utm_campaign', placeholder: 'e.g. spring_sale' },
  { param: 'utm_term', placeholder: 'e.g. perfume' },
  { param: 'utm_content', placeholder: 'e.g. ad_variant_1' },
];

export default function ChefLeadImport() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [utmsOpen, setUtmsOpen] = useState(false);
  const [draftUtms, setDraftUtms] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState<string | null>(null);

  const downloadTemplate = () => {
    const header = TEMPLATE_COLUMNS.map((c) => c.column).join(',');
    const sample = ['John Doe', '+21620123456', '', '', 'john@email.com', 'https://facebook.com/page', '', '', 'Sells electronics online', 'TN', 'Tunis', 'retailer', 'referral', 'Interested in products']
      .map((v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v))
      .join(',');
    const blob = new Blob(['\uFEFF' + header + '\n' + sample + '\n'], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const pickFile = () => fileRef.current?.click();

  const submit = () => {
    alert('Import queued (fixture — no persistence)');
    navigate('/chef/leads/list');
  };

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition focus:border-brand-500';
  const utmsActive = Object.values(draftUtms).some(Boolean);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h5 className="mb-0 text-base font-bold text-slate-900">Import Leads</h5>
      </div>
      <div className="p-5">
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setUtmsOpen((o) => !o)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 transition hover:text-brand-700"
          >
            <span className={`inline-block transition-transform ${utmsOpen ? 'rotate-90' : ''}`}>▸</span>
            Default UTMs for this batch
            <span className="text-[10px] font-normal text-slate-400">(optional)</span>
            {utmsActive && !utmsOpen && (
              <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
                set
              </span>
            )}
          </button>
        </div>

        {utmsOpen && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {UTMS.map((u) => (
                <div key={u.param}>
                  <label className="mb-1 block text-[10px] font-semibold text-slate-500">{u.param}</label>
                  <input
                    value={draftUtms[u.param] ?? ''}
                    onChange={(e) => setDraftUtms((cur) => ({ ...cur, [u.param]: e.target.value }))}
                    placeholder={u.placeholder}
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          className={
            utmsOpen
              ? 'border border-dashed border-slate-300 p-5 text-center transition hover:border-brand-500'
              : 'border border-dashed border-slate-300 p-5 text-center transition'
          }
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) setFileName(f.name);
          }}
        >
          <p className="mb-3 text-sm text-slate-500">Upload an Excel or CSV file with leads data</p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setFileName(f ? f.name : null);
            }}
          />
          <button
            type="button"
            onClick={pickFile}
            className="mx-auto block max-w-[400px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition hover:border-brand-500 focus:border-brand-500"
          >
            {fileName ? (
              <span className="flex items-center justify-center gap-2">
                <CheckIcon className="text-emerald-600" />
                <span className="truncate">{fileName}</span>
              </span>
            ) : (
              <span>Choose a file...</span>
            )}
          </button>
          {fileName && (
            <p className="mt-2 text-[11px] text-slate-400">
              {fileName.replace(/^.+\./, '').toUpperCase()} file ready. Click{' '}
              <button type="button" className="text-brand-600 underline" onClick={() => setFileName(null)}>
                remove
              </button>{' '}
              to pick another.
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={downloadTemplate} className="text-xs font-semibold text-brand-600 underline-offset-2 transition hover:text-brand-700 hover:underline">
            Download Template
          </button>
        </div>

        <div className="mt-4">
          <h6 className="mb-2 text-sm font-semibold text-slate-800">Template Columns:</h6>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-50/80">
                  <th className="px-3 py-2 text-[11px] font-semibold text-slate-900">Column</th>
                  <th className="px-3 py-2 text-[11px] font-semibold text-slate-900">Required</th>
                  <th className="px-3 py-2 text-[11px] font-semibold text-slate-900">Example</th>
                </tr>
              </thead>
              <tbody>
                {TEMPLATE_COLUMNS.map((c, i) => (
                  <tr key={c.column} className={i % 2 ? 'bg-slate-50/40' : ''}>
                    <td className="border-t border-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">{c.column}</td>
                    <td className="border-t border-slate-100 px-3 py-2 text-xs text-slate-600">
                      {c.required === 'Yes' ? (
                        <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                          Yes
                          <span className="text-rose-400">*</span>
                        </span>
                      ) : (
                        <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">No</span>
                      )}
                    </td>
                    <td className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500">{c.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/chef/leads/list')}
            className="rounded-xl border border-slate-300 bg-white px-6 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!fileName}
            onClick={submit}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-6 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Import Leads
          </button>
        </div>
      </div>
    </div>
  );
}