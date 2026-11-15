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
