import { useEffect, useMemo, useState } from 'react';
import { apiErrorMessage, apiGet, confirmServiceInscription, RealTransaction, TransactionsResult, money, timeFmt } from '../../lib/api';
import { Card, EmptyState, PageHeader, Spinner } from '../../components/ui';

const TYPE_META: Record<string, { label: string; tone: string; icon: string }> = {
  order: { label: 'Order revenue', tone: 'bg-emerald-50 text-emerald-700', icon: '💰' },
  cost: { label: 'Supplier cost', tone: 'bg-rose-50 text-rose-700', icon: '🏭' },
  payout: { label: 'Payout', tone: 'bg-amber-50 text-amber-700', icon: '💸' },
  inscription: { label: 'Inscription', tone: 'bg-violet-50 text-violet-700', icon: '📝' },
};

export default function ChefTransactions() {
  const [data, setData] = useState<TransactionsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [q, setQ] = useState('');

  useEffect(() => {
    apiGet<TransactionsResult>('/chef/transactions')
      .then(setData)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const txs = useMemo(() => {
    if (!data) return [];
    let list = data.transactions as RealTransaction[];
    if (filter !== 'all') list = list.filter((t) => t.type === filter);
    const qq = q.trim().toLowerCase();
    if (qq) list = list.filter((t) => t.summary.toLowerCase().includes(qq) || t.entity_name.toLowerCase().includes(qq));
    return list;
  }, [data, filter, q]);

  const refresh = () => {
    apiGet<TransactionsResult>('/chef/transactions')
      .then(setData)
      .catch((e) => alert(apiErrorMessage(e)));
  };

  const handleConfirm = async (t: RealTransaction) => {
    try {
      await confirmServiceInscription(t.id);
      refresh();
    } catch (e) {
      alert(apiErrorMessage(e));
    }
  };

  const totals = useMemo(() => {
    if (!data) return { revenue: 0, cost: 0, payout: 0 };
    const list = data.transactions as RealTransaction[];
    return {
      revenue: list.filter((t) => t.type === 'order').reduce((s, t) => s + Number(t.amount), 0),
      cost: list.filter((t) => t.type === 'cost').reduce((s, t) => s + Math.abs(Number(t.amount)), 0),
      payout: list.filter((t) => t.type === 'payout').reduce((s, t) => s + Math.abs(Number(t.amount)), 0),
    };
  }, [data]);

  if (loading) return <div className="py-20 text-center"><Spinner /></div>;

  return (
    <div>
      <PageHeader title="Transactions" subtitle={`${data?.total ?? 0} financial transactions`} />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="p-4 text-center">
          <p className="text-lg">💰</p>
          <p className="text-xl font-extrabold text-emerald-600">{money(totals.revenue)}</p>
          <p className="text-xs text-slate-500">Order revenue</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-lg">🏭</p>
          <p className="text-xl font-extrabold text-rose-600">{money(totals.cost)}</p>
          <p className="text-xs text-slate-500">Supplier costs</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-lg">💸</p>
          <p className="text-xl font-extrabold text-amber-600">{money(totals.payout)}</p>
          <p className="text-xs text-slate-500">Payouts</p>
        </Card>
      </div>

      <div className="mb-4 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
          {['all', 'order', 'cost', 'payout', 'inscription'].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {f === 'all' ? 'All' : TYPE_META[f].label}
            </button>
          ))}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-brand-500 sm:w-52" />
      </div>

      {txs.length === 0 ? (
        <Card><EmptyState icon="📋" title="No transactions" hint="Transactions will appear here as orders are delivered and payouts are made." /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Summary</th>
                  <th className="px-4 py-2.5">Entity</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {txs.map((t, i) => {
                  const meta = TYPE_META[t.type] ?? TYPE_META.order;
                  const pendingInscription = t.type === 'inscription' && t.status === 'pending';
                  return (
                    <tr key={`${t.type}-${t.id}-${i}`} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${meta.tone}`}>
                          {meta.icon} {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-800">{t.summary}</td>
                      <td className="px-4 py-2.5 text-slate-600">{t.entity_name}</td>
                      <td className={`px-4 py-2.5 text-right font-bold ${Number(t.amount) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {Number(t.amount) >= 0 ? '+' : ''}{money(t.amount)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">{timeFmt(t.created_at)}</td>
                      <td className="px-4 py-2.5">
                        {t.type === 'inscription' ? (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${t.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {t.status === 'confirmed' ? '✅ Confirmed' : '⏳ Waiting'}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {pendingInscription && (
                          <button
                            type="button"
                            onClick={() => handleConfirm(t)}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-emerald-700"
                          >
                            Confirm
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
