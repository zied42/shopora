import { useEffect, useState } from 'react';
import { apiErrorMessage, getSellerDashboard, SellerDashboardData, money, DashboardPeriod } from '../../lib/api';
import { Spinner } from '../../components/ui';

const PERIODS: DashboardPeriod[] = ['day', 'week', 'month', 'quarter', 'year'];

export default function SellerIncubationDashboard() {
  const [period, setPeriod] = useState<DashboardPeriod>('month');
  const [data, setData] = useState<SellerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    getSellerDashboard(period)
      .then(setData)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => {
    if (selectedId == null) return;
    setLoading(true);
    getSellerDashboard(period, selectedId)
      .then(setData)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const sellers = data?.sellers ?? [];
  const selected = data?.selected ?? null;
  const filtered = search ? sellers.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())) : sellers;
  const ranked = [...sellers].sort((a, b) => b.profit - a.profit);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Seller Incubation Dashboard</h1>
        <div className="flex gap-1 rounded-full bg-slate-100 p-1">
          {PERIODS.map((p) => (
            <button key={p} onClick={() => { setPeriod(p); setSelectedId(null); }}
              className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition ${period === p ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : (
        <>
          <div className="relative min-w-[280px] max-w-sm">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">Select Seller</label>
            <input type="text" placeholder="Search sellers..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm transition placeholder:text-slate-400 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200" />
            {search && filtered.length > 0 && (
              <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                <li className={`cursor-pointer px-4 py-2.5 text-sm transition hover:bg-sky-50 ${selectedId == null ? 'bg-sky-50 font-medium text-sky-700' : 'text-slate-700'}`}
                  onClick={() => { setSelectedId(null); setSearch(''); }}>
                  All Sellers
                </li>
                {filtered.map((s) => (
                  <li key={s.id}
                    className={`cursor-pointer px-4 py-2.5 text-sm transition hover:bg-sky-50 ${selectedId === s.id ? 'bg-sky-50 font-medium text-sky-700' : 'text-slate-700'}`}
                    onClick={() => { setSelectedId(s.id); setSearch(s.name); }}>
                    {s.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selected && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-3.5">
                <h2 className="text-lg font-semibold text-slate-900">{selected.name} — Performance</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-5">
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Revenue</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{money(selected.revenue)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Profit</p>
                  <p className="mt-1 text-lg font-bold text-emerald-600">{money(selected.profit)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Orders</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{selected.orders}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Items</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{selected.items}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Margin</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{selected.revenue > 0 ? ((selected.profit / selected.revenue) * 100).toFixed(1) : '0'}%</p>
                </div>
              </div>
            </div>
          )}

          {selected && selected.byDay.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-3.5">
                <h2 className="text-lg font-semibold text-slate-900">{selected.name} — Daily Breakdown</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead><tr className="bg-slate-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-900">Day</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-900">Revenue</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-900">Profit</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-900">Orders</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {selected.byDay.map((d, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-5 py-3 text-sm font-medium text-slate-700">{d.day}</td>
                        <td className="px-5 py-3 text-right text-sm text-slate-700">{money(d.revenue)}</td>
                        <td className="px-5 py-3 text-right text-sm font-medium text-emerald-600">{money(d.profit)}</td>
                        <td className="px-5 py-3 text-right text-sm text-slate-700">{d.orders}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-3.5">
              <h2 className="text-lg font-semibold text-slate-900">All Sellers — Ranked by Profit</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead><tr className="bg-slate-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-900">#</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-900">Name</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-900">Revenue</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-900">Profit</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-900">Orders</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-900">Items</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-900">Margin %</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {ranked.map((s, i) => (
                    <tr key={s.id} onClick={() => { setSelectedId(s.id); setSearch(s.name); }}
                      className={`cursor-pointer transition hover:bg-slate-50 ${selectedId === s.id ? 'bg-sky-50 ring-1 ring-sky-300' : ''}`}>
                      <td className="px-5 py-3 text-sm font-bold text-slate-500">{i + 1}</td>
                      <td className="px-5 py-3 text-sm font-medium text-slate-900">{s.name}</td>
                      <td className="px-5 py-3 text-right text-sm text-slate-700">{money(s.revenue)}</td>
                      <td className="px-5 py-3 text-right text-sm font-medium text-emerald-600">{money(s.profit)}</td>
                      <td className="px-5 py-3 text-right text-sm text-slate-700">{s.orders}</td>
                      <td className="px-5 py-3 text-right text-sm text-slate-700">{s.items}</td>
                      <td className="px-5 py-3 text-right text-sm text-slate-700">{s.revenue > 0 ? ((s.profit / s.revenue) * 100).toFixed(1) : '0'}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
