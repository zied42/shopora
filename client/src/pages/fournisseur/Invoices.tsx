import { useState } from 'react';
import { AppFooter, PageHeader } from '../../components/ui';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const COLUMNS: string[][] = [];
for (let i = 0; i < MONTHS.length; i += 4) COLUMNS.push(MONTHS.slice(i, i + 4));

export default function Invoices() {
  const [year, setYear] = useState('2026');
  const [open, setOpen] = useState(false);
  const [decade, setDecade] = useState(2020);

  const years: number[] = [];
  for (let y = decade; y < decade + 10; y++) years.push(y);

  return (
    <div>
      <PageHeader title="Invoices" subtitle="Monitor your monthly invoices" />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-lg">🧾</span>
          <p className="text-sm text-slate-500">We generate a monthly invoice for your transactions with us</p>
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
          For year:
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm outline-none transition hover:bg-slate-50 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              {year} 📅
            </button>
            {open && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                  <div className="mb-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setDecade((d) => d - 10)}
                      className="rounded-xl border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                      ◀
                    </button>
                    <span className="text-xs font-semibold text-slate-800">{decade} – {decade + 9}</span>
                    <button
                      type="button"
                      onClick={() => setDecade((d) => d + 10)}
                      className="rounded-xl border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                      ▶
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {years.map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => { setYear(String(y)); setOpen(false); }}
                        className={`rounded-xl px-2 py-1.5 text-xs font-medium transition ${String(y) === year ? 'bg-brand-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {COLUMNS.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-4">
            {col.map((m) => (
              <div key={m} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base text-slate-400">📅</span>
                    <div>
                      <h6 className="font-semibold text-slate-800">{m}</h6>
                      <p className="text-xs text-slate-400">Monthly statement</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500">Unavailable</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <AppFooter />
    </div>
  );
}