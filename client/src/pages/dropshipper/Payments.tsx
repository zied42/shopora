import { FormEvent, useEffect, useState } from 'react';
import { apiDelete, apiErrorMessage, apiGet, apiPost, money, Payout, timeFmt } from '../../lib/api';
import { Badge, Button, ButtonGhost, Card, Input, PageHeader, Spinner } from '../../components/ui';

interface Wallet {
  user_id: number;
  identifier: string;
  created_at: string;
  updated_at: string;
}

interface FlouciData {
  payouts: Payout[];
  wallet: Wallet | null;
  integration: { enabled: boolean; has_key: boolean };
}

interface MethodCard {
  id: 'flouci' | 'bank' | 'd17';
  name: string;
  logo: string;
  description: string;
  active: boolean;
}

const METHODS: MethodCard[] = [
  { id: 'flouci', name: 'Flouci', logo: '/flouci.png', description: 'Online wallet. Link your account to receive payouts directly to it.', active: true },
  { id: 'bank', name: 'Bank', logo: '', description: 'Receive payouts to your bank account. Coming soon.', active: false },
  { id: 'd17', name: 'D17', logo: '', description: 'D17 payout service. Coming soon.', active: false },
];

export default function DsPayments() {
  const [data, setData] = useState<FlouciData | null>(null);
  const [loading, setLoading] = useState(true);
  const [identifier, setIdentifier] = useState('');
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState<number | null>(null);

  const load = () =>
    apiGet<FlouciData>('/flouci/payouts')
      .then(setData)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));

  useEffect(() => {
    setLoading(true);
    void load();
  }, []);

  const linkWallet = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPost('/flouci/wallet', { identifier: identifier.trim() });
      setIdentifier('');
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const unlinkWallet = async () => {
    setSaving(true);
    try {
      await apiDelete('/flouci/wallet');
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const verify = async (id: number) => {
    setVerifying(id);
    try {
      await apiPost(`/flouci/payouts/${id}/verify`);
      await load();
    } catch (err) {
      alert(apiErrorMessage(err));
    } finally {
      setVerifying(null);
    }
  };

  const wallet = data?.wallet ?? null;
  const integration = data?.integration ?? { enabled: false, has_key: false };
  const payouts = data?.payouts ?? [];

  return (
    <div className="space-y-4">
      <PageHeader title="Payments" subtitle="Choose how you receive payments and follow your payouts" />

      {/* Payment methods */}
      <div className="grid gap-3 md:grid-cols-3">
        {METHODS.map((m) => {
          const isFlouci = m.id === 'flouci';
          const connected = isFlouci && !!wallet;
          return (
            <div
              key={m.id}
              className={`relative rounded-xl border-2 p-4 transition ${
                isFlouci
                  ? connected
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-brand-200 bg-white'
                  : 'border-slate-200 bg-white opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {m.logo ? (
                    <img src={m.logo} alt={m.name} className="h-9 w-9 rounded-lg bg-white object-contain ring-1 ring-slate-200" />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-lg">💳</span>
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{m.name}</h4>
                    <p className="text-[11px] text-slate-500 leading-snug">{m.description}</p>
                  </div>
                </div>
              </div>
              <div className="mt-3">
                {isFlouci ? (
                  <Badge tone={connected ? 'green' : 'amber'}>{integration.enabled && integration.has_key ? (connected ? 'Active · linked' : 'Active') : 'Active'}</Badge>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                    Coming soon
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Flouci wallet */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/flouci.png" alt="Flouci" className="h-9 w-9 rounded-lg bg-white object-contain ring-1 ring-slate-200" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Link your Flouci account</h3>
              <p className="text-xs text-slate-500">Once linked, the admin can send your payments directly to this Flouci wallet.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {wallet ? <Badge tone="green">Linked</Badge> : <Badge tone="amber">Not linked</Badge>}
          </div>
        </div>

        {!integration.enabled && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Flouci is not active yet on this platform. Wait for the admin to enable it before linking your account.
          </p>
        )}

        {wallet ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Linked Flouci account</p>
              <p className="text-sm font-semibold text-slate-800">{wallet.identifier}</p>
            </div>
            <ButtonGhost className="!px-3 !py-1.5 !text-xs" onClick={unlinkWallet} disabled={saving}>
              Unlink
            </ButtonGhost>
          </div>
        ) : (
          integration.enabled && (
            <form onSubmit={linkWallet} className="mt-4 flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[220px]">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Flouci account / wallet ID</label>
                <Input
                  className="mt-1"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. your Flouci public key or phone number"
                  required
                />
              </div>
              <Button type="submit" disabled={saving || identifier.trim().length < 3}>
                {saving ? 'Linking...' : 'Link account'}
              </Button>
            </form>
          )
        )}
      </Card>

      {/* Payouts */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h6 className="text-sm font-bold text-slate-800">Payments received</h6>
          <span className="text-[11px] text-slate-500">
            {payouts.filter((p) => p.status === 'paid').length} paid · {payouts.filter((p) => p.status === 'pending').length} pending
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10"><Spinner /></div>
        ) : payouts.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            No payments yet. When the admin sends you a payment it will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">#</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                  <th className="px-3 py-3">Period</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Method</th>
                  <th className="px-3 py-3">Link</th>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium text-slate-500">#{p.id}</td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums">{money(p.amount)}</td>
                    <td className="px-3 py-3 text-slate-500">{p.period ?? '—'}</td>
                    <td className="px-3 py-3">
                      {p.status === 'pending' && p.method === 'flouci' ? (
                        <Badge tone="amber">{p.flouci_status ?? 'pending'}</Badge>
                      ) : (
                        <Badge tone={p.status === 'paid' ? 'green' : 'red'}>{p.status}</Badge>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-500">{p.method ?? 'manual'}</td>
                    <td className="px-3 py-3">
                      {p.flouci_link ? (
                        <a href={p.flouci_link} target="_blank" rel="noreferrer" className="text-xs font-semibold text-brand-600 hover:underline">
                          Open link ↗
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-slate-500">{timeFmt(p.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      {p.method === 'flouci' && p.status === 'pending' && (
                        <ButtonGhost className="!px-2.5 !py-1 !text-[11px]" onClick={() => verify(p.id)} disabled={verifying === p.id}>
                          {verifying === p.id ? '...' : 'Verify'}
                        </ButtonGhost>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}