import { useLocation } from 'react-router-dom';
import { AppFooter } from '../../components/ui';

function titleFromPath(p: string) {
  const part = p.split('/').filter(Boolean).pop() ?? '';
  return part.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ChefPlaceholder() {
  const { pathname } = useLocation();
  const title = titleFromPath(pathname);

  return (
    <div>
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-orange-50 text-3xl">👨‍🍳</div>
        <h5 className="mt-4 text-base font-bold text-slate-900">{title || 'Chef'}</h5>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">This page is under construction.</p>
      </div>
      <AppFooter />
    </div>
  );
}