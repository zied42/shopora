import { useEffect, useState } from 'react';
import { apiErrorMessage, getPerformanceDashboard, PerformanceData, money, DashboardPeriod } from '../../lib/api';
import { Spinner } from '../../components/ui';

const PERIODS: { id: DashboardPeriod; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'quarter', label: 'Quarter' },
  { id: 'year', label: 'Year' },
];

const STATUS_TONE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-sky-100 text-sky-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-rose-100 text-rose-700',
};

const TYPE_LABELS: Record<string, string> = {
  dropshipping: 'Dropshipping',
  wholesale: 'Wholesale',
  white_label: 'White Label',
};

export default function PerformanceDashboard() {
  const [period, setPeriod] = useState<DashboardPeriod>('month');
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getPerformanceDashboard(period)
      .then(setData)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [period]);

  const t = data?.totals;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Performance Dashboard</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {data ? `${data.period.start} – ${data.period.end}` : 'Loading…'}
          </p>
        </div>
        <div className="flex gap-1.5 rounded-xl bg-slate-100 p-1">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
                period === p.id ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading || !data ? (
        <Spinner />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Total Orders" value={String(t!.orders)} />
            <StatCard label="Revenue" value={money(t!.revenue)} />
            <StatCard label="Profit" value={money(t!.profit)} />
            <StatCard label="Avg Order Value" value={money(t!.avgOrderValue)} />
            <StatCard label="Avg Profit" value={money(t!.avgProfit)} />
            <StatCard label="Conversion Rate" value={`${t!.conversionRate.toFixed(1)}%`} />
          </div>

          <Card title="Orders by Status">
            <StatusTable byStatus={data.byStatus} total={t!.orders} />
          </Card>

          <Card title="Orders by Type">
            <TypeTable byType={data.byType} />
          </Card>

          <Card title="Revenue by Day">
            <DayTable byDay={data.byDay} />
          </Card>
        </>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-3.5">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      <div>{children}</div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function StatusTable({ byStatus, total }: { byStatus: Record<string, number>; total: number }) {
  const rows = Object.entries(byStatus).sort((a, b) => b[1] - a[1]);

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-slate-100">
          <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
          <th className="px-5 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Count</th>
          <th className="px-5 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-slate-500">% of Total</th>
          <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Share</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map(([status, count]) => (
          <tr key={status} className="hover:bg-slate-50/60">
            <td className="px-5 py-3">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_TONE[status] ?? 'bg-slate-100 text-slate-600'}`}>
                {status}
              </span>
            </td>
            <td className="px-5 py-3 text-right text-sm font-medium text-slate-900">{count}</td>
            <td className="px-5 py-3 text-right text-sm text-slate-600">{total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'}%</td>
            <td className="px-5 py-3">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-sky-500"
                  style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
                />
              </div>
            </td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-400">No data for this period</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function TypeTable({ byType }: { byType: Record<string, { count: number; revenue: number; profit: number }> }) {
  const rows = Object.entries(byType).sort((a, b) => b[1].revenue - a[1].revenue);

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-slate-100">
          <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Type</th>
          <th className="px-5 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Orders</th>
          <th className="px-5 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Revenue</th>
          <th className="px-5 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Profit</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map(([type, info]) => (
          <tr key={type} className="hover:bg-slate-50/60">
            <td className="px-5 py-3 text-sm font-medium text-slate-900">{TYPE_LABELS[type] ?? type}</td>
            <td className="px-5 py-3 text-right text-sm text-slate-900">{info.count}</td>
            <td className="px-5 py-3 text-right text-sm text-slate-900">{money(info.revenue)}</td>
            <td className="px-5 py-3 text-right text-sm text-slate-900">{money(info.profit)}</td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-400">No data for this period</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function DayTable({ byDay }: { byDay: { day: string; count: number; revenue: number }[] }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-slate-100">
          <th className="px-5 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Day</th>
          <th className="px-5 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Orders</th>
          <th className="px-5 py-2.5 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Revenue</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {byDay.map((row) => (
          <tr key={row.day} className="hover:bg-slate-50/60">
            <td className="px-5 py-3 text-sm font-medium text-slate-900">{row.day}</td>
            <td className="px-5 py-3 text-right text-sm text-slate-900">{row.count}</td>
            <td className="px-5 py-3 text-right text-sm text-slate-900">{money(row.revenue)}</td>
          </tr>
        ))}
        {byDay.length === 0 && (
          <tr>
            <td colSpan={3} className="px-5 py-8 text-center text-sm text-slate-400">No data for this period</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
