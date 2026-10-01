import { useEffect, useState } from 'react';
import { apiErrorMessage, getOverview, OverviewData, money, DashboardPeriod } from '../../lib/api';
import { PageHeader, Spinner } from '../../components/ui';

const PERIODS: { id: DashboardPeriod; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'quarter', label: 'Quarter' },
  { id: 'year', label: 'Year' },
];

export default function Overview() {
  const [period, setPeriod] = useState<DashboardPeriod>('week');
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getOverview(period)
      .then(setData)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [period]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Financial Overview"
        subtitle="Full transparency — revenue, costs, profit and commissions"
        actions={
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  period === p.id ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white hover:text-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      {loading ? (
        <Spinner />
      ) : data ? (
        <>
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-5">
            <Stat label="Total Revenue" value={money(data.totals.revenue)} accent="emerald" />
            <Stat label="Total Cost" value={money(data.totals.cost)} accent="rose" />
            <Stat label="Net Profit" value={money(data.totals.profit)} accent={data.totals.profit >= 0 ? 'emerald' : 'rose'} />
            <Stat label="Commission" value={money(data.totals.commission)} accent="sky" />
            <Stat label="Total Orders" value={String(data.totals.orders)} accent="indigo" />
          </div>

          <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
            <MiniStat label="Paid" value={money(data.totals.paid)} />
            <MiniStat label="Delivered" value={String(data.totals.delivered)} />
            <MiniStat label="Cancelled" value={String(data.totals.cancelled)} />
            <MiniStat label="Unpaid" value={money(data.totals.unpaid)} danger />
          </div>

          <Section title="Revenue by Day">
            <RevenueTable
              rows={data.revenueByDay.map((r) => ({ label: r.day, revenue: r.revenue, profit: r.profit, orders: r.orders }))}
              empty="No daily data for this period"
            />
          </Section>

          <Section title="Revenue by Week">
            <RevenueTable
              rows={data.revenueByWeek.map((r) => ({ label: r.day, revenue: r.revenue, profit: r.profit, orders: r.orders }))}
              empty="No weekly data for this period"
            />
          </Section>

          <Section title="Revenue by Month">
            <RevenueTable
              rows={data.revenueByMonth.map((r) => ({ label: r.month, revenue: r.revenue, profit: r.profit, orders: r.orders }))}
              empty="No monthly data for this period"
            />
          </Section>
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  const tones: Record<string, string> = {
    emerald: 'text-emerald-600',
    rose: 'text-rose-600',
    sky: 'text-brand-600',
    indigo: 'text-indigo-600',
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-bold tabular-nums ${tones[accent] ?? 'text-slate-800'}`}>{value}</p>
    </div>
  );
}

function MiniStat({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
      <p className="text-[11px] font-medium text-slate-500">{label}</p>
      <p className={`mt-0.5 text-base font-bold tabular-nums ${danger ? 'text-rose-600' : 'text-slate-800'}`}>{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-3.5">
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
      </div>
      {children}
    </div>
  );
}

interface RevenueRow {
  label: string;
  revenue: number;
  profit: number;
  orders: number;
}

function RevenueTable({ rows, empty }: { rows: RevenueRow[]; empty: string }) {
  if (rows.length === 0) {
    return <p className="px-5 py-6 text-center text-sm text-slate-400">{empty}</p>;
  }

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-slate-50/80 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <th className="px-5 py-2.5">Period</th>
          <th className="px-5 py-2.5 text-right">Revenue</th>
          <th className="px-5 py-2.5 text-right">Profit</th>
          <th className="px-5 py-2.5 text-right">Orders</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="border-t border-slate-100 hover:bg-brand-50/40">
            <td className="px-5 py-2.5 font-medium text-slate-700">{r.label}</td>
            <td className="px-5 py-2.5 text-right tabular-nums text-slate-800">{money(r.revenue)}</td>
            <td className={`px-5 py-2.5 text-right tabular-nums font-medium ${r.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {money(r.profit)}
            </td>
            <td className="px-5 py-2.5 text-right tabular-nums text-slate-600">{r.orders}</td>
          </tr>
        ))}
        <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
          <td className="px-5 py-2.5 text-slate-800">Total</td>
          <td className="px-5 py-2.5 text-right tabular-nums text-slate-800">{money(rows.reduce((s, r) => s + r.revenue, 0))}</td>
          <td className="px-5 py-2.5 text-right tabular-nums text-emerald-600">{money(rows.reduce((s, r) => s + r.profit, 0))}</td>
          <td className="px-5 py-2.5 text-right tabular-nums text-slate-600">{rows.reduce((s, r) => s + r.orders, 0)}</td>
        </tr>
      </tbody>
    </table>
  );
}
