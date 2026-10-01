import { FormEvent, useEffect, useState } from 'react';
import { apiErrorMessage, apiGet, apiPatch, apiPost, DropshipperFinanceRow, money, Payout, PlatformEarnings, SupplierFinanceRow, timeFmt } from '../../lib/api';
import { Badge, Button, ButtonGhost, Card, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner, Textarea } from '../../components/ui';

type Tab = 'fournisseurs' | 'dropshippers' | 'platform' | 'payouts';

const TABS: { id: Tab; label: string }[] = [
  { id: 'fournisseurs', label: 'Supplier payments' },
  { id: 'dropshippers', label: 'Dropshipper payments' },
  { id: 'platform', label: 'Platform 3%' },
  { id: 'payouts', label: 'Payout history' },
];

const STATUS_TONE: Record<string, 'amber' | 'green' | 'red'> = { pending: 'amber', paid: 'green', cancelled: 'red' };

interface PayTarget {
  recipient_id: number;
  recipient_role: 'seller' | 'customer';
  recipient_name: string;
  amount: number;
}

export default function ChefDashboard() {
  const [tab, setTab] = useState<Tab>('fournisseurs');
  const [suppliers, setSuppliers] = useState<SupplierFinanceRow[]>([]);
  const [drops, setDrops] = useState<DropshipperFinanceRow[]>([]);
  const [platform, setPlatform] = useState<PlatformEarnings | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [payTarget, setPayTarget] = useState<PayTarget | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([apiGet<SupplierFinanceRow[]>('/chef/suppliers'), apiGet<DropshipperFinanceRow[]>('/chef/dropshippers'), apiGet<PlatformEarnings>('/chef/platform-earnings'), apiGet<Payout[]>('/chef/payouts')])
      .then(([s, d, p, po]) => {
        setSuppliers(s);
        setDrops(d);
        setPlatform(p);
        setPayouts(po);
      })
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const totals = (() => {
    const supOwed = suppliers.reduce((s, x) => s + x.owed, 0);
    const supPaid = suppliers.reduce((s, x) => s + x.paid, 0);
    const dsOwed = drops.reduce((s, x) => s + x.owed, 0);
    const dsPaid = drops.reduce((s, x) => s + x.paid, 0);
    return { supOwed, supPaid, dsOwed, dsPaid };
  })();

  return (
    <div>
      <PageHeader title="Payments" subtitle="Track what suppliers and dropshippers are owed, and pay them weekly" />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Fournisseurs owed" value={money(totals.supOwed)} tone="text-rose-600" icon="🏭" />
        <SummaryCard label="Paid to fournisseurs" value={money(totals.supPaid)} tone="text-emerald-600" icon="✅" />
        <SummaryCard label="Dropshippers owed" value={money(totals.dsOwed)} tone="text-rose-600" icon="🛍️" />
        <SummaryCard label="Paid to dropshippers" value={money(totals.dsPaid)} tone="text-emerald-600" icon="✅" />
      </div>

      <div className="mb-5 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${tab === t.id ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {t.label}
          </button>
        ))}
        <ButtonGhost onClick={load}>Refresh</ButtonGhost>
      </div>

      {loading ? (
        <Spinner />
      ) : tab === 'fournisseurs' ? (
        <FinanceTable
          head={['Fournisseur', 'Products', 'Orders', 'Earned', 'Paid', 'Owed', '']}
          rows={suppliers.map((s) => ({
            name: s.name,
            email: s.email,
            cells: [s.total_products, s.total_orders, money(s.earned), money(s.paid), money(s.owed)],
            owed: s.owed,
            pay: () => setPayTarget({ recipient_id: s.id, recipient_role: 'seller', recipient_name: s.name, amount: s.owed }),
          }))}
        />
      ) : tab === 'dropshippers' ? (
        <FinanceTable
          head={['Dropshipper', 'Orders', 'Sales', 'Profit', 'Paid', 'Owed', '']}
          rows={drops.map((d) => ({
            name: d.name,
            email: d.email,
            cells: [d.total_orders, money(d.total_sales), money(d.profit), money(d.paid), money(d.owed)],
            owed: d.owed,
            pay: () => setPayTarget({ recipient_id: d.id, recipient_role: 'customer', recipient_name: d.name, amount: d.owed }),
          }))}
        />
      ) : tab === 'platform' ? (
        <div className="space-y-4">
          <Card className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <p className="text-sm text-slate-500">Platform earning — 3% of every delivered order</p>
              <p className="text-2xl font-extrabold text-brand-700">{money(platform?.total ?? 0)}</p>
            </div>
            <p className="text-xs text-slate-400">{platform?.orders.length ?? 0} delivered commandes</p>
          </Card>
          {!platform || platform.orders.length === 0 ? (
            <Card><EmptyState icon="💸" title="No platform earnings yet" hint="Once commandes are delivered, your 3% share of each one will appear here." /></Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3">Order</th>
                    <th className="px-3 py-3">Dropshipper</th>
                    <th className="px-3 py-3 text-right">Total</th>
                    <th className="px-3 py-3 text-right">Platform 3%</th>
                    <th className="px-5 py-3">Delivered</th>
                  </tr>
                </thead>
                <tbody>
                  {platform.orders.map((o) => (
                    <tr key={o.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                      <td className="px-5 py-3 font-mono text-xs font-semibold text-brand-700">{o.order_number}</td>
                      <td className="px-3 py-3 text-slate-600">{o.dropshipper_name}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{money(o.total)}</td>
                      <td className="px-3 py-3 text-right font-semibold tabular-nums text-brand-600">{money(o.commission)}</td>
                      <td className="px-5 py-3 text-slate-500">{o.delivered_at ? timeFmt(o.delivered_at) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      ) : tab === 'payouts' ? (
        <PayoutTable payouts={payouts} onChanged={load} />
      ) : null}

      {payTarget && <PayModal target={payTarget} onClose={() => setPayTarget(null)} onDone={() => { setPayTarget(null); load(); }} />}
    </div>
  );
}

function SummaryCard({ label, value, tone, icon }: { label: string; value: string; tone: string; icon: string }) {
  return (
    <Card className="px-5 py-4">
      <p className="flex items-center gap-2 text-xs text-slate-500"><span>{icon}</span> {label}</p>
      <p className={`mt-1 text-xl font-bold ${tone}`}>{value}</p>
    </Card>
  );
}

interface TableRow {
  name: string;
  email: string;
  cells: (string | number)[];
  owed: number;
  pay: () => void;
}

function FinanceTable({ head, rows }: { head: string[]; rows: TableRow[] }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="px-5 py-3">Name</th>
            {head.slice(1).map((h, i) => (
              <th key={i} className="px-3 py-3 text-right">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name + r.email} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
              <td className="px-5 py-3">
                <p className="font-medium text-slate-800">{r.name}</p>
                <p className="text-xs text-slate-400">{r.email}</p>
              </td>
              {r.cells.map((c, i) => (
                <td key={i} className={`px-3 py-3 tabular-nums ${i === r.cells.length - 1 ? 'font-bold text-rose-600' : 'text-slate-600'}`}>{c}</td>
              ))}
              <td className="px-3 py-3 text-right">
                <Button className="px-3 py-1.5 text-xs" disabled={r.owed <= 0} onClick={r.pay}>Pay</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function PayoutTable({ payouts, onChanged }: { payouts: Payout[]; onChanged: () => void }) {
  const setStatus = async (p: Payout, status: Payout['status']) => {
    try {
      await apiPatch(`/chef/payouts/${p.id}`, { status });
      onChanged();
    } catch (e) {
      alert(apiErrorMessage(e));
    }
  };

  const verifyFlouci = async (p: Payout) => {
    try {
      await apiPost(`/flouci/payouts/${p.id}/verify`);
      onChanged();
    } catch (e) {
      alert(apiErrorMessage(e));
    }
  };

  if (payouts.length === 0) {
    return <Card><EmptyState icon="💶" title="No payouts yet" hint="Payments you make will appear here." /></Card>;
  }

  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="px-5 py-3">Recipient</th>
            <th className="px-3 py-3">Role</th>
            <th className="px-3 py-3 text-right">Amount</th>
            <th className="px-3 py-3">Method</th>
            <th className="px-3 py-3">Period</th>
            <th className="px-3 py-3">Status</th>
            <th className="px-3 py-3">Date</th>
            <th className="px-5 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {payouts.map((p) => (
            <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
              <td className="px-5 py-3 font-medium text-slate-800">{p.recipient_name}</td>
              <td className="px-3 py-3 text-slate-500">{p.recipient_role}</td>
              <td className="px-3 py-3 text-right font-semibold tabular-nums">{money(p.amount)}</td>
              <td className="px-3 py-3">
                {p.method === 'flouci' ? (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-slate-600">Flouci</span>
                    {p.flouci_link && (
                      <a href={p.flouci_link} target="_blank" rel="noreferrer" className="text-[10px] text-brand-600 hover:underline">Open link ↗</a>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-slate-500">{p.method ?? 'manual'}</span>
                )}
              </td>
              <td className="px-3 py-3 text-slate-500">{p.period ?? '—'}</td>
              <td className="px-3 py-3">
                {p.status === 'pending' && p.method === 'flouci' ? (
                  <Badge tone="amber">{p.flouci_status ?? 'pending'}</Badge>
                ) : (
                  <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
                )}
              </td>
              <td className="px-3 py-3 text-slate-500">{timeFmt(p.created_at)}</td>
              <td className="px-5 py-3 text-right">
                {p.status === 'paid' && (
                  <ButtonGhost className="px-3 py-1.5 text-xs" onClick={() => setStatus(p, 'cancelled')}>Cancel</ButtonGhost>
                )}
                {p.status === 'pending' && p.method === 'flouci' && (
                  <ButtonGhost className="px-3 py-1.5 text-xs" onClick={() => verifyFlouci(p)}>Verify</ButtonGhost>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function PayModal({ target, onClose, onDone }: { target: PayTarget; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState(String(target.amount || 0));
  const [period, setPeriod] = useState(() => {
    const d = new Date();
    const start = new Date(d);
    start.setDate(d.getDate() - d.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const iso = (x: Date) => x.toISOString().slice(0, 10);
    return `${iso(start)} → ${iso(end)}`;
  });
  const [notes, setNotes] = useState('');
  const [method, setMethod] = useState<'manual' | 'flouci'>('manual');
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiPost<{ ok: boolean; payout_id?: number; link?: string }>('/chef/payouts', {
        recipient_id: target.recipient_id,
        recipient_role: target.recipient_role,
        amount: Number(amount),
        period: period || null,
        notes: notes || null,
        method,
      });
      setSent(res.link ?? null);
      onDone();
    } catch (err) {
      alert(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Pay ${target.recipient_name}`}>
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-xl bg-slate-50 p-4 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Current balance owed</span><span className="font-bold text-rose-600">{money(target.amount)}</span></div>
        </div>
        <Field label="Amount (TND)"><Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required /></Field>
        <Field label="Payment method">
          <Select value={method} onChange={(e) => setMethod(e.target.value as 'manual' | 'flouci')}>
            <option value="manual">Manual / Cash</option>
            {target.recipient_role === 'customer' && <option value="flouci">Flouci (wallet)</option>}
          </Select>
        </Field>
        <Field label="Period"><Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="Weekly period, e.g. 2026-08-10 → 2026-08-16" /></Field>
        <Field label="Notes (optional)"><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>

        {sent ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
            <p className="font-semibold text-emerald-700">Flouci payment created 🎉</p>
            <p className="mt-1 text-xs text-emerald-600">The dropshipper can complete this link to receive the payment in his Flouci wallet. It stays pending until verified.</p>
            <a href={sent} target="_blank" rel="noreferrer" className="mt-2 inline-block break-all text-xs font-semibold text-brand-700 underline">{sent}</a>
            <div className="mt-3 flex justify-end gap-2">
              <Button type="button" onClick={onClose}>Done</Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <ButtonGhost type="button" onClick={onClose}>Cancel</ButtonGhost>
            <Button type="submit" disabled={saving || Number(amount) <= 0}>{saving ? 'Paying...' : 'Confirm payment'}</Button>
          </div>
        )}
      </form>
    </Modal>
  );
}
