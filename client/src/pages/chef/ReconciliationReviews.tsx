import { useEffect, useMemo, useState } from 'react';
import {
  apiErrorMessage, apiGet, apiPost, money,
  type ReconciliationSupplier, type ReconciliationDropshipper, type ReconciliationReviewsResult,
} from '../../lib/api';
import { Button, Card, EmptyState, Field, Modal, PageHeader, Spinner, Textarea } from '../../components/ui';

export default function ChefReconciliationReviews() {
  const [data, setData] = useState<ReconciliationReviewsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'suppliers' | 'dropshippers'>('suppliers');
  const [payTo, setPayTo] = useState<{ id: number; name: string; role: string; owed: number } | null>(null);

  const load = () => {
    setLoading(true);
    apiGet<ReconciliationReviewsResult>('/chef/reconciliation-reviews')
      .then(setData)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const totalSuppliersOwed = useMemo(() => data?.suppliers.reduce((s, r) => s + r.owed, 0) ?? 0, [data]);
  const totalDropshippersOwed = useMemo(() => data?.dropshippers.reduce((s, r) => s + r.owed, 0) ?? 0, [data]);

  if (loading) return <div className="py-20 text-center"><Spinner /></div>;

  return (
    <div>
      <PageHeader title="Reconciliation & Payments" subtitle="Suppliers and dropshippers you need to pay" />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card className="p-4 text-center">
          <p className="text-lg">🏭</p>
          <p className="text-xl font-extrabold text-brand-600">{data?.suppliers.length ?? 0} suppliers</p>
          <p className="text-xs text-slate-500">Total owed: <span className="font-bold text-rose-600">{money(totalSuppliersOwed)}</span></p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-lg">🛍️</p>
          <p className="text-xl font-extrabold text-emerald-600">{data?.dropshippers.length ?? 0} dropshippers</p>
          <p className="text-xs text-slate-500">Total owed: <span className="font-bold text-rose-600">{money(totalDropshippersOwed)}</span></p>
        </Card>
      </div>

      <div className="mb-4 flex flex-col gap-1 rounded-xl bg-slate-100 p-1 sm:flex-row">
        <button onClick={() => setTab('suppliers')} className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition ${tab === 'suppliers' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
          🏭 Suppliers ({data?.suppliers.length ?? 0})
        </button>
        <button onClick={() => setTab('dropshippers')} className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition ${tab === 'dropshippers' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
          🛍️ Dropshippers ({data?.dropshippers.length ?? 0})
        </button>
      </div>

      {tab === 'suppliers' ? (
        <SupplierTable rows={data?.suppliers ?? []} onPay={setPayTo} />
      ) : (
        <DropshipperTable rows={data?.dropshippers ?? []} onPay={setPayTo} />
      )}

      {payTo && <PayModal id={payTo.id} name={payTo.name} role={payTo.role} owed={payTo.owed} onClose={() => setPayTo(null)} onDone={() => { setPayTo(null); load(); }} />}
    </div>
  );
}

function SupplierTable({ rows, onPay }: { rows: ReconciliationSupplier[]; onPay: (v: { id: number; name: string; role: string; owed: number }) => void }) {
  if (rows.length === 0) return <Card><EmptyState icon="🏭" title="No suppliers" hint="Suppliers will appear here once they have products and orders." /></Card>;
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-2.5">Supplier</th>
              <th className="px-4 py-2.5 text-right">Products</th>
              <th className="px-4 py-2.5 text-right">Orders</th>
              <th className="px-4 py-2.5 text-right">Earned</th>
              <th className="px-4 py-2.5 text-right">Paid</th>
              <th className="px-4 py-2.5 text-right">Owed</th>
              <th className="px-4 py-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-2.5">
                  <p className="font-semibold text-slate-800">{r.name}</p>
                  <p className="text-xs text-slate-500">{r.email}</p>
                </td>
                <td className="px-4 py-2.5 text-right text-slate-600">{r.total_products}</td>
                <td className="px-4 py-2.5 text-right text-slate-600">{r.total_orders}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{money(r.earned)}</td>
                <td className="px-4 py-2.5 text-right text-emerald-600">{money(r.paid)}</td>
                <td className="px-4 py-2.5 text-right font-bold text-rose-600">{money(r.owed)}</td>
                <td className="px-4 py-2.5 text-right">
                  {r.owed > 0 && (
                    <Button onClick={() => onPay({ id: r.id, name: r.name, role: 'seller', owed: r.owed })} className="text-xs">
                      💸 Pay
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function DropshipperTable({ rows, onPay }: { rows: ReconciliationDropshipper[]; onPay: (v: { id: number; name: string; role: string; owed: number }) => void }) {
  if (rows.length === 0) return <Card><EmptyState icon="🛍️" title="No dropshippers" hint="Dropshippers will appear here once they place orders." /></Card>;
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-4 py-2.5">Dropshipper</th>
              <th className="px-4 py-2.5 text-right">Orders</th>
              <th className="px-4 py-2.5 text-right">Sales</th>
              <th className="px-4 py-2.5 text-right">Profit</th>
              <th className="px-4 py-2.5 text-right">Paid</th>
              <th className="px-4 py-2.5 text-right">Owed</th>
              <th className="px-4 py-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-2.5">
                  <p className="font-semibold text-slate-800">{r.name}</p>
                  <p className="text-xs text-slate-500">{r.email}</p>
                </td>
                <td className="px-4 py-2.5 text-right text-slate-600">{r.total_orders}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{money(r.total_sales)}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{money(r.profit)}</td>
                <td className="px-4 py-2.5 text-right text-emerald-600">{money(r.paid)}</td>
                <td className="px-4 py-2.5 text-right font-bold text-rose-600">{money(r.owed)}</td>
                <td className="px-4 py-2.5 text-right">
                  {r.owed > 0 && (
                    <Button onClick={() => onPay({ id: r.id, name: r.name, role: 'customer', owed: r.owed })} className="text-xs">
                      💸 Pay
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function PayModal({ id, name, role, owed, onClose, onDone }: { id: number; name: string; role: string; owed: number; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState(String(owed.toFixed(2)));
  const [period, setPeriod] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return alert('Enter a valid amount');
    setSaving(true);
    try {
      await apiPost('/chef/payouts', { recipient_id: id, recipient_role: role, amount: amt, period: period || null, notes: notes || null });
      onDone();
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Pay ${name}`}>
      <p className="mb-3 text-sm text-slate-600">Current balance owed: <span className="font-bold text-rose-600">{money(owed)}</span></p>
      <Field label="Amount (TND)">
        <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
      </Field>
      <Field label="Period (optional)">
        <input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="e.g. Sept 2026" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500" />
      </Field>
      <Field label="Notes (optional)">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </Field>
      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button onClick={onClose} className="bg-slate-100 text-slate-700 hover:bg-slate-200">Cancel</Button>
        <Button onClick={submit} disabled={saving}>{saving ? 'Processing…' : '💸 Confirm payment'}</Button>
      </div>
    </Modal>
  );
}
