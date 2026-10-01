import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ThemeToggle } from './ui';

const FEATURES: { title: string; desc: string }[] = [
  { title: 'Integrated flows', desc: 'Order, ship, return and reconcile in one place.' },
  { title: 'Real-time visibility', desc: 'Live stock, prices and delivery tracking across your network.' },
  { title: 'Built for growth', desc: 'Tools for dropshippers, suppliers and internal teams.' },
];

export default function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-[#111633] lg:flex lg:w-[44%] lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3 p-10">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/20">
            <img src="/shopora-icon.svg" alt="Shopora" className="h-8 w-8 object-contain" />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight text-white">SHOPORA</p>
            <p className="text-xs font-medium uppercase tracking-widest text-slate-400">Commerce platform</p>
          </div>
        </div>

        <div className="relative z-10 px-10 pb-4">
          <h2 className="max-w-md text-3xl font-bold leading-tight text-white">
            Run your commerce, everything in sync.
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-300">
            A single workspace for dropshippers, suppliers and the teams that support them across the full order lifecycle.
          </p>
        </div>

        <div className="relative z-10 space-y-5 px-10 pb-10">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-500/20 ring-1 ring-brand-400/30">
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-brand-300" fill="currentColor">
                  <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm3.6 5.6-3.9 4.4a.9.9 0 0 1-1.3.02L4.4 8.45a.9.9 0 1 1 1.3-1.26l1.36 1.4 3.3-3.7a.9.9 0 1 1 1.24 1.1Z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{f.title}</p>
                <p className="text-xs leading-relaxed text-slate-400">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>

        {/* Mobile brand header */}
        <div className="mb-6 flex items-center gap-3 lg:hidden">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/20">
            <img src="/shopora-icon.svg" alt="Shopora" className="h-8 w-8 object-contain" />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">SHOPORA</p>
            <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">Commerce platform</p>
          </div>
        </div>

        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40 sm:p-10">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
            {subtitle && <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{subtitle}</p>}
            <div className="mt-7">{children}</div>
          </div>
          <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
            <Link to="/" className="transition hover:text-slate-600 dark:hover:text-slate-300">Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
