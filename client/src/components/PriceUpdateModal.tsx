import { useState } from 'react';
import { apiErrorMessage, apiPatch, money, Product } from '../lib/api';
import { Button, ButtonGhost, Field, Input, Modal } from './ui';

type ConstraintType = 'set_min' | 'set_max' | 'set_fixed' | 'set_range';

export default function PriceUpdateModal({ product, onClose, onDone }: { product: Product; onClose: () => void; onDone: () => void }) {
  const [price, setPrice] = useState('');
  const [constraint, setConstraint] = useState<'no' | 'yes'>('no');
  const [constraintType, setConstraintType] = useState<ConstraintType>('set_min');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [scope, setScope] = useState<'marketplace' | 'all'>('all');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(price);
    if (!Number.isFinite(val) || val <= 0) return alert('Enter a valid new price');
    setSaving(true);
    try {
      await apiPatch(`/products/${product.id}`, { price: val });
      onDone();
    } catch (err) {
      alert(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const image = product.images[0] ?? product.image_url ?? '';

  const radio = (checked: boolean) => (
    <span className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${checked ? 'border-brand-600' : 'border-slate-300'}`}>
      {checked && <span className="h-2 w-2 rounded-full bg-brand-600" />}
    </span>
  );

  const constraintLabel =
    constraintType === 'set_min' ? 'Minimum price' : constraintType === 'set_max' ? 'Maximum price' : constraintType === 'set_fixed' ? 'Fixed price' : 'Minimum price';

  return (
    <Modal open onClose={onClose} title="Update the product price">
      <form onSubmit={submit} className="space-y-4">
        <div className="py-2 text-center text-sm font-bold text-slate-800">{product.name}</div>
        {image && (
          <div
            className="h-56 w-full rounded-lg"
            style={{ backgroundImage: `url(${image})`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}
          />
        )}
        <div>
          <label className="mb-2 flex items-center gap-1 text-sm font-semibold text-slate-800">
            Do you want to set a constraint on marketers selling price for this product?
            <svg className="h-4 w-4 text-brand-600" viewBox="0 0 512 512" fill="currentColor">
              <path d="M256 0C114.6 0 0 114.6 0 256s114.6 256 256 256s256-114.6 256-256S397.4 0 256 0zM256 400c-18 0-32-14-32-32s13.1-32 32-32c17.1 0 32 14 32 32S273.1 400 256 400zM325.1 258L280 286V288c0 13-11 24-24 24S232 301 232 288V272c0-8 4-16 12-21l57-34C308 213 312 206 312 198C312 186 301.1 176 289.1 176h-51.1C225.1 176 216 186 216 198c0 13-11 24-24 24s-24-11-24-24C168 159 199 128 237.1 128h51.1C329 128 360 159 360 198C360 222 347 245 325.1 258z" />
            </svg>
          </label>
          <div className="flex gap-4">
            {(
              [
                { label: 'No', val: 'no' as const },
                { label: 'Yes', val: 'yes' as const },
              ]
            ).map((opt) => {
              const active = constraint === opt.val;
              return (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setConstraint(opt.val)}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition ${active ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  {radio(active)}
                  {opt.label}
                </button>
              );
            })}
          </div>

          {constraint === 'yes' && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Price constraint type:">
                <select
                  value={constraintType}
                  onChange={(e) => setConstraintType(e.target.value as ConstraintType)}
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                >
                  <option value="set_min">Minimum price</option>
                  <option value="set_max">Maximum price</option>
                  <option value="set_fixed">Fixed price</option>
                  <option value="set_range">Price range</option>
                </select>
              </Field>
              <Field label={`${constraintLabel}:`}>
                <Input inputMode="decimal" placeholder="0.000" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
              </Field>
              {constraintType === 'set_range' && (
                <Field label="Maximum price:">
                  <Input inputMode="decimal" placeholder="0.000" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
                </Field>
              )}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-3 py-2 text-center">Current price</th>
                <th className="px-3 py-2 text-center">New price</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-3 py-2">
                  <Input value={`TND ${money(product.price)}`} disabled />
                </td>
                <td className="px-3 py-2">
                  <Input type="number" min="0" step="0.001" placeholder="10.000 TND" value={price} onChange={(e) => setPrice(e.target.value)} required autoFocus />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="space-y-1.5">
          {(
            [
              { label: 'Only update the marketplace price', val: 'marketplace' as const },
              { label: 'Update the price for the marketplace and the current subscriptions', val: 'all' as const },
            ]
          ).map((opt) => {
            const active = scope === opt.val;
            return (
              <button
                key={opt.val}
                type="button"
                onClick={() => setScope(opt.val)}
                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium transition ${active ? 'border-brand-500 bg-brand-50 text-slate-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                {radio(active)}
                {opt.label}
              </button>
            );
          })}
        </div>

        {scope === 'all' && (
          <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <span className="text-lg">⚠️</span>
            <div className="flex-1 text-xs text-amber-800">
              <p>
                This will update the price displayed in the marketplace and the price for the retailers that are currently subscribed to this product
                <span className="ml-1 font-bold underline">0 subscriptions</span>
              </p>
              <p className="mt-2 font-bold text-rose-600">What should I know and do before creating price updates for current subscriptions?</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                <li>After creating the price update, the retailers have the right to keep on ordering the product with the old price for the next 48 hours.</li>
                <li>Try to avoid increasing the price by more than 10% of the current rate. High spikes in prices will make your subscribers decline the price updates and unsubscribe automatically.</li>
                <li>Your subscribed retailers are your customers and your sales partners. As you treat them well, they will be more motivated to work with you on other products.</li>
              </ul>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <ButtonGhost type="button" onClick={onClose}>Cancel</ButtonGhost>
          <Button type="submit" disabled={saving}>{saving ? 'Updating...' : 'Update my product price'}</Button>
        </div>
      </form>
    </Modal>
  );
}