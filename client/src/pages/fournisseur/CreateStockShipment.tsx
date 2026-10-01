import { useEffect, useState } from 'react';
import { apiErrorMessage, apiGet, Product } from '../../lib/api';
import { AppFooter, Button, PageHeader, Select, Spinner } from '../../components/ui';

interface Row {
  productId: number | null;
  qty: string;
}

const AGENCIES = ['DHL', 'Yalidine', 'Aramex'];

export default function CreateStockShipment() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([{ productId: null, qty: '' }]);
  const [agency, setAgency] = useState('');
  const [pickup, setPickup] = useState<boolean | null>(null);

  useEffect(() => {
    apiGet<Product[]>('/products').then(setProducts).catch((e) => alert(apiErrorMessage(e))).finally(() => setLoading(false));
  }, []);

  const setRow = (i: number, patch: Partial<Row>) => setRows((prev) => prev.map((r, x) => (x === i ? { ...r, ...patch } : r)));

  const addRow = () => setRows((prev) => [...prev, { productId: null, qty: '' }]);

  const removeRow = (i: number) => setRows((prev) => (prev.length > 1 ? prev.filter((_, x) => x !== i) : [{ productId: null, qty: '' }]));

  const submit = () => {
    const filled = rows.filter((r) => r.productId != null && Number(r.qty) > 0);
    if (filled.length === 0) return alert('Add at least one product with a quantity greater than 0');
    if (!agency) return alert('Please select an agency');
    if (pickup === null) return alert('Please choose how the products will reach the fulfillment center');
    alert('Request submitted — stock transfer processing is not available yet.');
  };

  return (
    <div>
      <PageHeader
        title="Create stock shipment"
        subtitle="Tell us which products to move to our fulfillment center and how they will arrive."
      />

      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-brand-100 bg-brand-50 p-4">
        <span className="text-2xl leading-none">ℹ️</span>
        <div>
          <h5 className="mb-1 font-bold text-brand-700">Place your products in our fulfillment center &amp; Let Us Handle the Fulfillment</h5>
          <p className="text-xs text-brand-700/90">Place your products in our fulfillment center for free. We'll prepare, package, and deliver your e-commerce orders to your customers</p>
          <p className="mt-1 text-xs text-brand-600/80">Enjoy hassle-free fulfillment that saves you time and stress. Our fast, reliable team handles every order with precision, no mistakes, no delays.</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-3">
          <h5 className="text-base font-bold text-slate-900">Create request</h5>
        </div>

        <div className="p-5">
          <h5 className="mb-3 font-bold text-slate-900">Products</h5>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            {loading ? (
              <Spinner />
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80 text-left text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3 text-center" style={{ width: '20%' }}>Quantity</th>
                    <th className="px-4 py-3" style={{ width: '0.1%' }} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r, i) => (
                    <tr key={i} className="transition hover:bg-brand-50/40">
                      <td className="px-4 py-3">
                        <select
                          value={r.productId ?? ''}
                          onChange={(e) => setRow(i, { productId: e.target.value ? Number(e.target.value) : null })}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                        >
                          <option value="">Select...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.sku ? `(${p.sku})` : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          value={r.qty}
                          onChange={(e) => setRow(i, { qty: e.target.value })}
                          placeholder="0"
                          className="w-28 rounded-xl border border-slate-300 bg-white px-3 py-2 text-center text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(i)}
                          title="Remove"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-rose-300 text-rose-500 transition hover:bg-rose-50"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <button
            type="button"
            onClick={addRow}
            className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 bg-slate-50 py-3 text-xs font-semibold text-slate-600 transition hover:border-brand-500 hover:bg-brand-50"
          >
            <span className="text-sm">➕</span> Add another product
          </button>

          <h5 className="mb-3 mt-6 font-bold text-slate-900">Agency &amp; Delivery</h5>

          <div className="md:w-1/2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Agency <span className="text-rose-500">*</span>
            </label>
            <Select value={agency} onChange={(e) => setAgency(e.target.value)}>
              <option value="">Select...</option>
              {AGENCIES.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </Select>
          </div>

          <p className="mb-2 mt-6 text-sm font-medium text-slate-700">
            Do you need us to pick up the products from your location? <span className="text-rose-500">*</span>
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {(
              [
                { label: 'No, I will deliver the products to our fulfillment center myself', val: false },
                { label: 'Yes, I need you to pick up the products from my location', val: true },
              ] as { label: string; val: boolean }[]
            ).map((opt) => (
              <button
                key={String(opt.val)}
                type="button"
                onClick={() => setPickup(opt.val)}
                className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
                  pickup === opt.val ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                }`}
              >
                <span className="text-sm font-medium text-slate-700">{opt.label}</span>
                <input type="radio" checked={pickup === opt.val} onChange={() => setPickup(opt.val)} className="h-4 w-4 accent-brand-600" />
              </button>
            ))}
          </div>

          <Button type="button" onClick={submit} className="mt-5 w-full py-2">
            Submit
          </Button>
        </div>
      </div>
      <AppFooter />
    </div>
  );
}