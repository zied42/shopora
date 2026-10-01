import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiErrorMessage, apiGet, InventoryDetail } from '../lib/api';
import { Badge, Spinner, ThemeToggle } from '../components/ui';

export default function PublicInventory() {
  const { code } = useParams<{ code: string }>();
  const logo = '/shopora.svg';
  const [inv, setInv] = useState<InventoryDetail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError('');
    apiGet<InventoryDetail>(`/inventory/by-code/${code ?? ''}`)
      .then(setInv)
      .catch((e) => setError(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [code]);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <img src={logo} alt="SHOPORA" className="h-12 w-24 object-contain" />
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Inventory</span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {loading ? (
          <div className="rounded-2xl bg-white p-10 shadow-sm"><Spinner /></div>
        ) : error ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-3xl">🧭</p>
            <p className="mt-3 text-lg font-bold text-slate-800">Inventory not found</p>
            <p className="mt-1 text-sm text-slate-500">{error}</p>
            <p className="mt-2 text-xs text-slate-400">Check that the QR code links to the exact inventory code.</p>
          </div>
        ) : inv ? (
          <div>
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{inv.code}</p>
              <h1 className="mt-1 text-2xl font-extrabold text-slate-900">{inv.name}</h1>
              <p className="mt-1 text-sm text-slate-500">{inv.location ?? 'No location specified'}</p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <span className="rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-700">{inv.item_count} product line{inv.item_count === 1 ? '' : 's'}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">{inv.used}/{inv.capacity} units stored</span>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4">
                <p className="text-sm font-bold text-slate-800">Products in this location</p>
              </div>
              {inv.items.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-slate-400">This inventory location is currently empty.</p>
              ) : (
                <div className="divide-y divide-slate-50">
                  {inv.items.map((it) => (
                    <div key={it.product_id} className="flex items-center gap-4 px-6 py-4">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                        {it.image_url ? <img src={it.image_url} alt={it.product_name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-2xl text-slate-300">📦</div>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{it.product_name}</p>
                        <p className="text-xs text-slate-400">Product #{it.product_id}</p>
                      </div>
                      <Badge tone="blue"><b>{it.quantity}</b> unit{it.quantity === 1 ? '' : 's'}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </main>

      <footer className="mx-auto max-w-3xl px-4 pb-8 text-center text-[11px] text-slate-400">
        SHOPORA — company warehouse inventory
      </footer>
    </div>
  );
}
