import { useEffect, useState } from 'react';
import { apiErrorMessage, apiGet, apiPost, FulfillmentAllocationResult, FulfillmentGroup, Inventory } from '../../lib/api';
import { Card, EmptyState, Modal, PageHeader, Spinner, Select } from '../../components/ui';

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${tone}`}>{value}</p>
    </Card>
  );
}

export default function ChefFulfillment() {
  const [groups, setGroups] = useState<FulfillmentGroup[]>([]);
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState<number | null>(null);
  const [result, setResult] = useState<FulfillmentAllocationResult | null>(null);
  const [resultFor, setResultFor] = useState<string>('');
  const [err, setErr] = useState('');
  const [picks, setPicks] = useState<Record<number, number>>({});

  const load = () => {
    setLoading(true);
    Promise.all([apiGet<FulfillmentGroup[]>('/chef/fulfillment'), apiGet<Inventory[]>('/inventory')])
      .then(([g, inv]) => {
        setGroups(g);
        setInventories(inv);
        setPicks((prev) => {
          const next = { ...prev };
          for (const grp of g) {
            if (next[grp.fournisseur_id] == null) {
              const first = availableInventories(inv, grp.total_missing)[0];
              if (first) next[grp.fournisseur_id] = first.id;
            }
          }
          return next;
        });
      })
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const availableInventories = (inv: Inventory[], need: number) =>
    inv.filter((i) => i.capacity - i.used >= need).sort((a, b) => a.id - b.id);

  const allocate = async (g: FulfillmentGroup) => {
    const invId = picks[g.fournisseur_id];
    if (invId == null) {
      setErr('Pick an inventory first');
      return;
    }
    const inv = inventories.find((i) => i.id === invId);
    setAllocating(g.fournisseur_id);
    setErr('');
    try {
      const res = await apiPost<FulfillmentAllocationResult>(`/chef/fulfillment/${g.fournisseur_id}/allocate`, { inventory_id: invId });
      setResult(res);
      setResultFor(`${inv?.name ?? 'inventory'} → ${g.fournisseur_name}`);
      setPicks((prev) => {
        const next = { ...prev };
        delete next[g.fournisseur_id];
        return next;
      });
      load();
    } catch (e) {
      setErr(apiErrorMessage(e));
      load();
    } finally {
      setAllocating(null);
    }
  };

  const totals = groups.reduce(
    (s, g) => ({ missing: s.missing + g.total_missing, house: s.house + g.total_house, demand: s.demand + g.total_demand }),
    { missing: 0, house: 0, demand: 0 }
  );

  return (
    <div>
      <PageHeader
        title="Fulfillment stocks"
        subtitle="Products dropshippers need that retour/house stock can't cover — the chef picks which inventory to store the missing units in (fulfilled stock is committed to its orders, never re-sold)"
        actions={
          <button onClick={load} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">🔄 Refresh</button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="To take from suppliers" value={totals.missing} tone="text-rose-600" />
        <Stat label="Total demand" value={totals.demand} tone="text-slate-900" />
        <Stat label="Covered from returns" value={totals.house} tone="text-emerald-600" />
        <Stat label="Suppliers affected" value={groups.length} tone="text-brand-600" />
      </div>

      {loading ? (
        <Spinner />
      ) : groups.length === 0 ? (
        <Card><EmptyState icon="✅" title="Nothing to fulfill" hint="Every product dropshippers need is covered by house stock. Great job!" /></Card>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => {
            const opts = availableInventories(inventories, g.total_missing);
            const pick = picks[g.fournisseur_id];
            return (
              <div key={g.fournisseur_id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-slate-100 bg-slate-50 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-base shadow-sm">🏭</span>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{g.fournisseur_name}</p>
                      <p className="text-[11px] text-slate-500">Supplier #{g.fournisseur_id}</p>
                    </div>
                  </div>
                  <div className="ml-auto flex flex-wrap items-center gap-4 text-sm">
                    <span className="text-slate-500">Demand <b className="text-slate-800">{g.total_demand}</b></span>
                    <span className="text-slate-500">Retour <b className="text-emerald-600">{g.total_house}</b></span>
                    <span className="rounded-full bg-rose-100 px-3 py-1 font-bold text-rose-700">Take from supplier: {g.total_missing}</span>
                  </div>
                </div>

                <div className="divide-y divide-slate-50">
                  {g.items.map((it) => (
                    <div key={it.product_id} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                        {it.image_url ? <img src={it.image_url} alt={it.product_name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xl text-slate-300">📦</div>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{it.product_name}</p>
                        <p className="text-xs text-slate-500">needed {it.demanded} · retour {it.house}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-extrabold text-rose-600">+{it.missing}</p>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">take from supplier</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-white px-5 py-4">
                  <label className="text-sm font-semibold text-slate-700">Store the {g.total_missing} missing unit(s) into:</label>
                  {opts.length === 0 ? (
                    <p className="text-sm font-semibold text-rose-600">No inventory has enough free space for all {g.total_missing} units.</p>
                  ) : (
                    <>
                      <Select value={pick ?? ''} onChange={(e) => setPicks((p) => ({ ...p, [g.fournisseur_id]: Number(e.target.value) }))} className="min-w-56 flex-1">
                        {opts.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.name} — {inv.capacity - inv.used} free of {inv.capacity}
                          </option>
                        ))}
                      </Select>
                      <button
                        onClick={() => allocate(g)}
                        disabled={allocating !== null || pick == null}
                        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
                      >
                        {allocating === g.fournisseur_id ? 'Storing…' : `＋ Store here (${g.total_missing})`}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {err && (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-700">{err}</div>
      )}

      <p className="mt-6 text-xs text-slate-400">
        Demand = quantity on pending / confirmed / shipped commandes. House = returned products already in the company warehouse. Missing = demand − house.
        Inventories that are already full won't appear in the dropdown — pick one with enough room and the missing units go there. Once an inventory is full it stops
        being offered, so you can spread the fulfillment across several locations one by one.
      </p>

      <Modal open={!!result} onClose={() => setResult(null)} title={`Stock stored in inventory — ${resultFor}`} wide>
        {result && (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              ✅ {result.allocations.reduce((s, a) => s + a.quantity, 0)} unit(s) placed in the chosen inventory.
            </div>

            {result.allocations.length === 0 ? (
              <p className="text-sm text-slate-500">No units could be placed.</p>
            ) : (
              <div className="space-y-3">
                {result.allocations.map((a) => (
                  <div key={a.inventory_id + '-' + a.product_id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-800">🗄️ {a.inventory_name}</p>
                    <p className="mt-1 flex items-center justify-between text-sm text-slate-600">
                      <span>{a.product_name}</span>
                      <span className="font-bold text-brand-600">+{a.quantity}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}