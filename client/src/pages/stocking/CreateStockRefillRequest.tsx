import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiErrorMessage, createStockRefillRequest, getStockRefillPickupList, StockRefillRequestItem } from '../../lib/api';
import { Button, PageHeader, Spinner } from '../../components/ui';
import { CheckIcon } from '../chef/ui';

interface RowItem extends StockRefillRequestItem {
  qtyToRequest: number;
}

interface RowSupplier {
  supplier: string;
  requestCount: number;
  include: boolean;
  items: RowItem[];
}

const HEADERS = [
  'Product',
  'Expected\nincoming\nquantity',
  'Supplier\nstock',
  'Our stock',
  'Selected period\nconsumption',
  'Quantity for\nnon\nconfirmed\norders',
  'Quantity\nrequired for\norders',
  'Quantity\nto request',
];

const COL_WIDTHS = ['26%', '11%', '11%', '10%', '13%', '13%', '10%', '11%'];

export default function CreateStockRefillRequest() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<RowSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getStockRefillPickupList()
      .then((r) => {
        if (!alive) return;
        setSuppliers(
          r.suppliers.map((g) => ({
            supplier: g.supplier,
            requestCount: g.request_count,
            include: false,
            items: g.items.map((it) => ({ ...it, qtyToRequest: it.qty_to_request })),
          }))
        );
      })
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const toggleInclude = (idx: number) =>
    setSuppliers((ss) => ss.map((s, i) => (i === idx ? { ...s, include: !s.include } : s)));

  const setQty = (sid: string, idx: number, v: string) =>
    setSuppliers((ss) =>
      ss.map((s) =>
        s.supplier === sid
          ? { ...s, items: s.items.map((p, i) => (i === idx ? { ...p, qtyToRequest: Math.max(0, Number(v) || 0) } : p)) }
          : s
      )
    );

  const onSelect = (v: string) => {
    setSelected(v);
    const idx = Number(v);
    if (!Number.isNaN(idx)) cardRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const submit = async () => {
    const chosen = suppliers.filter((s) => s.include);
    if (chosen.length === 0) {
      alert('Please select at least one supplier.');
      return;
    }
    setSubmitting(true);
    try {
      for (const s of chosen) {
        await createStockRefillRequest({
          supplier: s.supplier,
          products: s.items.reduce((acc, p) => acc + (Number(p.qtyToRequest) || 0), 0),
          date: new Date().toISOString(),
          status: 'Ready',
          items: s.items.map((p) => ({
            product_name: p.product_name,
            color: p.color,
            image_url: p.image_url,
            expected_incoming: Number(p.expected_incoming) || 0,
            supplier_stock: Number(p.supplier_stock) || 0,
            our_stock: Number(p.our_stock) || 0,
            period_consumption: Number(p.period_consumption) || 0,
            qty_non_confirmed: Number(p.qty_non_confirmed) || 0,
            qty_required_orders: Number(p.qty_required_orders) || 0,
            qty_to_request: Number(p.qtyToRequest) || 0,
            qty_picked: 0,
            unit_price: Number(p.unit_price) || 0,
          })),
        });
      }
      navigate('/stocking/stock-refill-requests');
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="Generate stock refill pick up list"
        subtitle="Select suppliers to include and adjust quantities to request — pick up lists are generated per supplier"
        actions={
          <>
            <select
              value={selected}
              onChange={(e) => onSelect(e.target.value)}
              disabled={loading}
              className={`h-10 w-[300px] rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 ${selected ? 'text-slate-700' : 'text-slate-400'}`}
            >
              <option value="">Select supplier</option>
              {suppliers.map((s, i) => (
                <option key={i} value={String(i)}>
                  {s.supplier}
                </option>
              ))}
            </select>
            <Button type="button" onClick={submit} disabled={submitting || loading}>
              {submitting ? 'Saving…' : 'Save'}
            </Button>
            <button
              type="button"
              aria-label="Close"
              onClick={() => navigate('/stocking/stock-refill-requests')}
              className="rounded-lg p-1 text-2xl leading-none text-slate-400 transition hover:text-slate-600"
            >
              ×
            </button>
          </>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : suppliers.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
          <div className="text-base font-semibold text-slate-500">There is Not Any Product Here</div>
          <div className="mt-1 text-xs text-slate-400">Stock refill requests you create will appear here as pick up lists.</div>
        </div>
      ) : (
        /* SUPPLIER CARDS */
        suppliers.map((s, si) => (
          <div
            key={si}
            ref={(el) => {
              cardRefs.current[si] = el;
            }}
            className="mb-[38px] scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="flex min-h-[105px] items-start justify-between bg-slate-50 px-[30px] py-[21px]">
              <div>
                <div className="text-xl font-bold text-slate-800">
                  {s.supplier}
                  <span className="ml-1.5 text-[11px] font-normal text-slate-400">
                    {s.requestCount} order{s.requestCount > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="mt-2 text-xs leading-[19px] text-slate-500">
                  {s.items.length} product{s.items.length > 1 ? 's' : ''} to take • total quantity {s.items.reduce((a, p) => a + (Number(p.qtyToRequest) || 0), 0)}
                </div>
              </div>
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-lg font-medium text-brand-600">
                <input type="checkbox" checked={s.include} onChange={() => toggleInclude(si)} className="peer sr-only" />
                <span
                  className={`flex h-[22px] w-[22px] items-center justify-center rounded-md border-2 transition ${s.include ? 'border-brand-600 bg-brand-600' : 'border-slate-300 bg-white'}`}
                >
                  {s.include && <CheckIcon className="text-white" />}
                </span>
                Include
              </label>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[1000px] table-fixed border-collapse">
                <colgroup>
                  {COL_WIDTHS.map((w, i) => (
                    <col key={i} style={{ width: w }} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    {HEADERS.map((h, i) => (
                      <th
                        key={i}
                        className={`border-b border-r border-slate-200 bg-slate-50/80 px-2 py-4 text-xs font-semibold leading-5 text-slate-500 last:border-r-0 ${i === 0 ? 'pl-6 text-left' : 'text-center'}`}
                      >
                        {h.split('\n').map((line, j) => (
                          <span key={j}>
                            {j > 0 && <br />}
                            {line}
                          </span>
                        ))}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {s.items.map((p, pi) => (
                    <tr key={p.id} className="transition hover:bg-brand-50/40">
                      <td className="border-r border-slate-100 p-3 pl-[30px] text-left align-middle">
                        <div className="flex items-center gap-6">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.product_name} className="h-[105px] w-[105px] shrink-0 rounded object-contain" />
                          ) : (
                            <div className="h-[105px] w-[105px] shrink-0 rounded bg-slate-100" />
                          )}
                          <div>
                            <div className="text-base font-bold leading-5 text-slate-800">{p.product_name}</div>
                            {p.color && <div className="mt-2 text-[13px] text-slate-500">Color: {p.color}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="border-r border-slate-100 p-3 text-center align-middle text-[17px] font-semibold text-slate-700">{p.expected_incoming}</td>
                      <td className="border-r border-slate-100 p-3 text-center align-middle text-[17px] font-semibold text-slate-700">{p.supplier_stock}</td>
                      <td className="border-r border-slate-100 p-3 text-center align-middle text-[17px] font-semibold text-slate-700">{p.our_stock}</td>
                      <td className="border-r border-slate-100 p-3 text-center align-middle text-[17px] font-semibold text-slate-700">{p.period_consumption}</td>
                      <td className="border-r border-slate-100 p-3 text-center align-middle text-[17px] font-semibold text-slate-700">{p.qty_non_confirmed}</td>
                      <td className="border-r border-slate-100 p-3 text-center align-middle text-[17px] font-semibold text-slate-700">{p.qty_required_orders}</td>
                      <td className="p-3 text-center align-middle">
                        <input
                          type="number"
                          min={0}
                          value={p.qtyToRequest}
                          onChange={(e) => setQty(s.supplier, pi, e.target.value)}
                          className="h-[55px] w-16 rounded-xl border border-slate-300 text-center text-[17px] text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
