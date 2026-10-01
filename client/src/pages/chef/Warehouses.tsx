import { useEffect, useState } from 'react';
import {
  apiErrorMessage,
  createSupplierWarehouse,
  getWarehouseOwners,
  listSupplierWarehouses,
  SupplierWarehouse,
  WarehouseOwnerOption,
} from '../../lib/api';
import { Badge, Button, Card, EmptyState, PageHeader, Spinner } from '../../components/ui';

export default function ChefWarehouses() {
  const [warehouses, setWarehouses] = useState<SupplierWarehouse[]>([]);
  const [owners, setOwners] = useState<WarehouseOwnerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [fournisseurId, setFournisseurId] = useState<number | null>(null);
  const [location, setLocation] = useState('');
  const [phone1, setPhone1] = useState('');
  const [phone2, setPhone2] = useState('');
  const [country, setCountry] = useState('Tunisia');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([listSupplierWarehouses(), getWarehouseOwners()])
      .then(([whs, ow]) => {
        setWarehouses(whs);
        setOwners(ow);
      })
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const resetForm = () => {
    setName('');
    setFournisseurId(null);
    setLocation('');
    setPhone1('');
    setPhone2('');
    setCountry('Tunisia');
    setAddress1('');
    setAddress2('');
  };

  const submit = async () => {
    if (!name.trim()) return alert('Warehouse name is required');
    setSubmitting(true);
    try {
      await createSupplierWarehouse({
        fournisseur_id: fournisseurId,
        name: name.trim(),
        location: location.trim(),
        phone1: phone1.trim(),
        phone2: phone2.trim(),
        country,
        address1: address1.trim(),
        address2: address2.trim(),
      });
      setShowForm(false);
      resetForm();
      load();
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const input = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100';

  return (
    <div>
      <PageHeader
        title="Warehouses"
        subtitle="All supplier warehouses and their owners"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={load} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">🔄 Refresh</button>
            <button onClick={() => { setShowForm((v) => !v); if (!showForm) resetForm(); }} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">
              {showForm ? '✕ Cancel' : '➕ Add Warehouse'}
            </button>
          </div>
        }
      />

      {showForm && (
        <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
            <h5 className="text-base font-bold text-slate-900">New warehouse</h5>
          </div>
          <div className="p-5">
            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-slate-700">Warehouse name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={input} />
            </div>
            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-slate-700">Owner supplier (optional)</label>
              <select
                value={fournisseurId ?? ''}
                onChange={(e) => setFournisseurId(e.target.value ? Number(e.target.value) : null)}
                className={input}
              >
                <option value="">— No owner —</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>{o.name} ({o.email})</option>
                ))}
              </select>
            </div>
            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Location</label>
                <input value={location} onChange={(e) => setLocation(e.target.value)} className={input} placeholder="e.g. Tunis > Tunis" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Country</label>
                <select value={country} onChange={(e) => setCountry(e.target.value)} className={input}>
                  <option value="Tunisia">Tunisia</option>
                </select>
              </div>
            </div>
            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Phone 1</label>
                <input value={phone1} onChange={(e) => setPhone1(e.target.value)} className={input} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Phone 2</label>
                <input value={phone2} onChange={(e) => setPhone2(e.target.value)} className={input} />
              </div>
            </div>
            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-slate-700">Address 1</label>
              <input value={address1} onChange={(e) => setAddress1(e.target.value)} className={input} />
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">Address 2</label>
              <input value={address2} onChange={(e) => setAddress2(e.target.value)} className={input} />
            </div>
            <Button type="button" onClick={submit} disabled={submitting} className="py-2">
              {submitting ? 'Saving…' : 'Save warehouse'}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : warehouses.length === 0 ? (
        <Card><EmptyState icon="🏭" title="No warehouses yet" hint="Create the first warehouse to get started." /></Card>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-semibold">Warehouse</th>
                  <th className="px-5 py-3 font-semibold">Owner</th>
                  <th className="px-5 py-3 font-semibold">Location</th>
                  <th className="px-5 py-3 font-semibold">Contact</th>
                  <th className="px-5 py-3 font-semibold">Country</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {warehouses.map((w) => (
                  <tr key={w.id} className="transition hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-lg">🏭</span>
                        <span className="font-semibold text-slate-900">{w.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {w.owner_name ? (
                        <Badge tone="green">{w.owner_name}</Badge>
                      ) : (
                        <Badge tone="blue">SHOPORA</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-700">{w.location || '—'}</td>
                    <td className="px-5 py-3 text-slate-700">{w.phone1 || '—'}</td>
                    <td className="px-5 py-3 text-slate-700">{w.country}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
