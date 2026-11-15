import { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { apiErrorMessage, apiGet, Inventory, InventoryDetail, inventoryUrl } from '../../lib/api';
import { Badge, Card, EmptyState, PageHeader, Spinner } from '../../components/ui';

function ProgressBar({ used, capacity }: { used: number; capacity: number }) {
  const pct = Math.min(100, Math.round((used / capacity) * 100));
  const tone = pct >= 100 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-semibold text-slate-500">{used}/{capacity} units</span>
    </div>
  );
}

export default function ChefInventory() {
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [details, setDetails] = useState<Record<number, InventoryDetail>>({});
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiGet<Inventory[]>('/inventory')
      .then((list) => {
        setInventories(list);
        Promise.all(
          list.map((inv) =>
            apiGet<InventoryDetail>(`/inventory/${inv.id}`)
              .then((d) => ({ id: inv.id, d }))
              .catch(() => null)
          )
        ).then((rows) => {
          const map: Record<number, InventoryDetail> = {};
          for (const r of rows) if (r) map[r.id] = r.d;
          setDetails(map);
        });
      })
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle="All available physical inventory — scan a location's QR code to see everything stored there"
        actions={
          <button onClick={load} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">🔄 Refresh</button>
        }
      />

      {loading ? (
        <Spinner />
      ) : inventories.length === 0 ? (
        <Card><EmptyState icon="🗄️" title="No inventory locations yet" hint="Ask the admin to create inventory locations." /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {inventories.map((inv) => (
            <Card key={inv.id} className="flex flex-col p-4">
              <div className="flex items-start gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <QRCodeCanvas value={inventoryUrl(inv.code)} size={96} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">{inv.name}</p>
                  <p className="text-[11px] text-slate-500">{inv.location ?? 'No location specified'}</p>
                  <p className="mt-1 font-mono text-[11px] text-brand-600">{inv.code}</p>
                  <div className="mt-2"><ProgressBar used={inv.used} capacity={inv.capacity} /></div>
                </div>
              </div>
              <div className="mt-3 border-t border-slate-100 pt-3">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Contents ({inv.item_count})</p>
                {!details[inv.id] || details[inv.id].items.length === 0 ? (
                  <p className="text-xs text-slate-400">Nothing stored in this location yet.</p>
                ) : (
                  <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
                    {details[inv.id].items.map((it) => (
                      <div key={it.product_id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5">
                        <div className="h-7 w-7 shrink-0 overflow-hidden rounded bg-white">
                          {it.image_url ? <img src={it.image_url} alt={it.product_name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-slate-300">📦</div>}
                        </div>
                        <p className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">{it.product_name}</p>
                        <Badge tone="blue"><b>{it.quantity}</b></Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-slate-400">
        Capacity is 50 units per location. The QR code opens a public page listing that inventory's products — anyone can scan it without logging in.
      </p>
    </div>
  );
}