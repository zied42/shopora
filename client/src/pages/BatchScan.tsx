import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiErrorMessage, getBatchByCode, BatchScanInfo } from '../lib/api';

export default function BatchScan() {
  const { code } = useParams();
  const [batch, setBatch] = useState<BatchScanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    getBatchByCode(code)
      .then((b) => alive && setBatch(b))
      .catch((e) => alive && setError(apiErrorMessage(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [code]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        {loading && <p className="text-center text-sm text-slate-500">Looking up batch…</p>}

        {!loading && error && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-lg">
            <div className="text-5xl">❌</div>
            <h1 className="mt-3 text-base font-bold text-slate-800">Batch not found</h1>
            <p className="mt-1 text-xs text-slate-500">{error}</p>
            <p className="mt-2 font-mono text-[11px] text-slate-400">{code}</p>
          </div>
        )}

        {!loading && !error && batch && (
          <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
            <div className="bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">Stock Management — Batch scan</p>
              <h1 className="mt-0.5 text-xl font-extrabold tracking-wide text-white">{batch.batch_code}</h1>
            </div>
            <div className="space-y-4 px-6 py-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Product</p>
                <p className="mt-0.5 flex items-center gap-2 text-base font-bold text-slate-800">📦 {batch.product_name}</p>
                {batch.color && <p className="mt-1 text-sm text-slate-600">Color: <strong className="text-slate-800">{batch.color}</strong></p>}
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Fournisseur (supplier)</p>
                <p className="mt-0.5 flex items-center gap-2 text-base font-bold text-brand-700">🏭 {batch.supplier}</p>
              </div>

              <div className="flex gap-3">
                <div className="flex-1 rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Quantity</p>
                  <p className="text-lg font-extrabold text-slate-800">{batch.quantity}</p>
                </div>
                <div className="flex-1 rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Refill request</p>
                  <p className="text-lg font-extrabold text-slate-800">#{batch.request_id}</p>
                </div>
              </div>

              {batch.locations.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Stored in</p>
                  <div className="space-y-1.5">
                    {batch.locations.map((l, i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm">
                        <span className="font-medium text-slate-700">🗄️ {l.inventory_name}</span>
                        <span className="font-bold text-brand-600">{l.quantity} u</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <p className="border-t border-slate-100 px-6 py-3 text-center text-[10px] text-slate-400">
              Scan a batch QR code to see its product and supplier
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
