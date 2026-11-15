import { useLocation } from 'react-router-dom';
import { AppFooter } from '../../components/ui';

function titleFromPath(p: string) {
  const part = p.split('/').filter(Boolean).pop() ?? '';
  return part.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function StockingPlaceholder() {
  const { pathname } = useLocation();
  const title = titleFromPath(pathname);

  return (
    <div>
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-100 to-sky-50 text-3xl">🗃️</div>
        <h5 className="mt-4 text-base font-bold text-slate-900">{title || 'Stocking'}</h5>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">This page is under construction.</p>
        <p className="mt-2 font-mono text-[11px] text-slate-400">{pathname}</p>
      </div>
      <AppFooter />
    </div>
  );
}
