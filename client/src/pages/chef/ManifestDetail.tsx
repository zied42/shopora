import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { apiErrorMessage, getManifestGroupDetail, ManifestGroupDetail, ManifestGroupOrder } from '../../lib/api';
import { Spinner } from '../../components/ui';
import { Avatar } from './ui';

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === 'delivered') return <span className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Delivered</span>;
  if (s === 'shipped') return <span className="inline-flex items-center rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">Shipped</span>;
  if (s === 'pending' || s === 'confirmed') return <span className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">{status}</span>;
  return <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{status}</span>;
}

function OrderRow({ order }: { order: ManifestGroupOrder }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr className="border-b border-slate-100 hover:bg-brand-50/40 transition cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <td className="px-3 py-2 font-mono text-[11px] font-semibold text-brand-700">#{order.order_number}</td>
        <td className="px-3 py-2 text-slate-700">{order.customer_name || '—'}</td>
        <td className="px-3 py-2"><StatusBadge status={order.status} /></td>
        <td className="px-3 py-2 text-slate-600">{new Date(order.created_at).toLocaleDateString()}</td>
        <td className="px-3 py-2 text-slate-600">{order.shipped_at ? new Date(order.shipped_at).toLocaleDateString() : '—'}</td>
        <td className="px-3 py-2 text-slate-600">{[order.governorate, order.city].filter(Boolean).join(', ') || '—'}</td>
        <td className="px-3 py-2 text-center font-semibold text-slate-800">{order.products.length}</td>
        <td className="px-3 py-2 text-center text-slate-400">
          <svg className={`h-3 w-3 inline transition-transform ${expanded ? 'rotate-90' : ''}`} viewBox="0 0 256 512" fill="currentColor">
            <path d="M118.6 53.6c9.4-9.4 24.6-9.4 33.9 0l192 192c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0L192 105.6 53.6 244.1c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l192-192z" />
          </svg>
        </td>
      </tr>
      {expanded && order.products.map((p) => (
        <tr key={p.product_id} className="border-b border-slate-50 bg-slate-50/30">
          <td className="px-3 py-1.5 pl-8 text-[10px] text-slate-500" colSpan={6}>
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-700">{p.product_name}</span>
              <span className="text-slate-400">x{p.quantity}</span>
              <span className="text-slate-400">@ {Number(p.price).toFixed(2)} TND</span>
            </div>
          </td>
          <td className="px-3 py-1.5 text-center text-[10px] font-semibold text-slate-700">{p.quantity}</td>
          <td className="px-3 py-1.5 text-center text-[10px] text-slate-500">{(p.quantity * Number(p.price)).toFixed(2)} TND</td>
        </tr>
      ))}
    </>
  );
}

export default function ChefManifestDetail() {
  const { supplierId, delivery } = useParams<{ supplierId: string; delivery: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ManifestGroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    if (!supplierId || !delivery) return;
    setLoading(true);
    getManifestGroupDetail(Number(supplierId), decodeURIComponent(delivery))
      .then(setData)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [supplierId, delivery]);

  const handleDownloadPdf = async () => {
    if (!data) return;
    setDownloadingPdf(true);
    try {
      const token = localStorage.getItem('d42_token');
      const res = await axios.get(`/api/chef/manifests/pdf/${data.supplier_id}/${encodeURIComponent(data.delivery_company)}`, {
        responseType: 'blob',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `manifest-${data.supplier_name.replace(/\s+/g, '_')}-${data.delivery_company}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) return <Spinner />;
  if (!data) return <div className="px-4 py-16 text-center text-sm text-slate-400">Not found.</div>;

  return (
    <div className="space-y-4">
      {/* breadcrumb */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/chef/manifests')} className="text-sm text-brand-600 hover:underline">&larr; Manifests</button>
        <h1 className="text-lg font-bold text-slate-900">Manifest — {data.supplier_name}</h1>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{data.delivery_company}</span>
      </div>

      {/* summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase text-slate-500">Supplier</div>
          <div className="mt-1 flex items-center gap-2">
            <Avatar name={data.supplier_name} size="h-8 w-8 text-xs border border-slate-200" />
            <span className="text-sm font-semibold text-slate-900">{data.supplier_name}</span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase text-slate-500">Delivery Company</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{data.delivery_company}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase text-slate-500">Shipped Orders</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{data.summary.total_orders}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase text-slate-500">Total Products / Qty</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{data.summary.total_products} products / {data.summary.total_qty} units</div>
        </div>
      </div>

      {/* PDF download */}
      <div className="flex items-center gap-2">
        <button onClick={handleDownloadPdf} disabled={downloadingPdf}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50">
          <svg className="h-3.5 w-3.5" viewBox="0 0 512 512" fill="currentColor"><path d="M288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4C142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C433.5 68.8 368.8 32 288 32zM432 256c0 79.5-64.5 144-144 144s-144-64.5-144-144s64.5-144 144-144s144 64.5 144 144zM288 400c0 35.3-28.7 64-64 64c-11.5 0-22.3-3-31.6-8.4c-.2 2.8-.4 5.5-.4 8.4c0 53 43 96 96 96s96-43 96-96c0-2.8-.1-5.6-.4-8.4c-9.3 5.4-20.1 8.4-31.6 8.4c-35.3 0-64-28.7-64-64z" /></svg>
          {downloadingPdf ? 'Generating...' : 'Download Manifest PDF'}
        </button>
      </div>

      {/* orders table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-2.5">
          <span className="text-xs font-semibold text-slate-700">Shipped Orders ({data.orders.length})</span>
        </div>
        {data.orders.length === 0 ? (
          <div className="px-4 py-16 text-center text-sm text-slate-400">No shipped orders found for this supplier + delivery company.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead>
                <tr className="whitespace-nowrap border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2.5 font-semibold">Order</th>
                  <th className="px-3 py-2.5 font-semibold">Customer</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 font-semibold">Ordered</th>
                  <th className="px-3 py-2.5 font-semibold">Shipped</th>
                  <th className="px-3 py-2.5 font-semibold">Destination</th>
                  <th className="px-3 py-2.5 text-center font-semibold">Items</th>
                  <th className="px-3 py-2.5 text-center font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((order) => (
                  <OrderRow key={order.order_id} order={order} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
