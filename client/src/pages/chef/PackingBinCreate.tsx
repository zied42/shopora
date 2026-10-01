import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiErrorMessage, createPackingBin, getPackingBinOptions, PackingBinType } from '../../lib/api';
import BinImageUpload from '../../components/BinImageUpload';

function InfoField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr>
      <td className="w-1/2 border border-slate-200 bg-slate-50/60 px-3 py-2 align-middle text-xs font-semibold text-slate-700">{label}</td>
      <td className="w-1/2 border border-slate-200 bg-white px-3 py-2">{children}</td>
    </tr>
  );
}

function PlusIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true">
      <path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32V224H48c-17.7 0-32 14.3-32 32s14.3 32 32 32H192V432c0 17.7 14.3 32 32 32s32-14.3 32-32V288H400c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V80z" />
    </svg>
  );
}

const inputCls = 'w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100';
const centerInputCls = `${inputCls} text-center`;

export default function ChefPackingBinCreate() {
  const navigate = useNavigate();
  const [types, setTypes] = useState<PackingBinType[]>(['box', 'flatpolybag', 'crate', 'container', 'pallet', 'vehicle']);

  const [name, setName] = useState('');
  const [reference, setReference] = useState('');
  const [cost, setCost] = useState('');
  const [price, setPrice] = useState('');
  const [type, setType] = useState('');
  const [innerW, setInnerW] = useState('');
  const [innerL, setInnerL] = useState('');
  const [innerH, setInnerH] = useState('');
  const [weight, setWeight] = useState('');
  const [outerW, setOuterW] = useState('');
  const [outerL, setOuterL] = useState('');
  const [outerH, setOuterH] = useState('');
  const [maxWeight, setMaxWeight] = useState('');
  const [unitsPerPack, setUnitsPerPack] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPackingBinOptions()
      .then((o) => setTypes(o.types.map((t) => t.value)))
      .catch(() => {});
  }, []);

  const valid = name.trim().length > 0 && type.length > 0;

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await createPackingBin({
        name: name.trim(),
        reference: reference.trim() || null,
        cost: Number(cost) || 0,
        price: Number(price) || 0,
        type: type as PackingBinType,
        image: imageUrl.trim() || null,
      });
      navigate('/chef/bins-inventory');
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
        <h5 className="mb-0 text-base font-bold text-slate-900">Create bin</h5>
      </div>
      <div className="p-5">
        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Information:</label>
        <table className="mt-2 w-full border-collapse">
          <tbody>
            <InfoField label="Name:">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bin name" className={inputCls} />
            </InfoField>
            <InfoField label="Reference:">
              <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Reference name" className={inputCls} />
            </InfoField>
            <InfoField label="Cost:">
              <input inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.300 TND" className={centerInputCls} />
            </InfoField>
            <InfoField label="Price:">
              <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.600 TND" className={centerInputCls} />
            </InfoField>
            <InfoField label="Type:">
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                <option value="" disabled>
                  Select Bin type
                </option>
                {types.map((t) => (
                  <option key={t} value={t}>
                    {t === 'flatpolybag' ? 'Flat poly bag' : t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </InfoField>
          </tbody>
        </table>

        <div className="mt-5">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Dimensions:</label>
          <div className="mt-2 grid grid-cols-1 gap-4 md:grid-cols-2">
            <table className="w-full border-collapse">
              <tbody>
                <InfoField label="Inner Width:">
                  <input inputMode="decimal" value={innerW} onChange={(e) => setInnerW(e.target.value)} style={{ minWidth: 90 }} className={centerInputCls} />
                </InfoField>
                <InfoField label="Inner Length:">
                  <input inputMode="decimal" value={innerL} onChange={(e) => setInnerL(e.target.value)} style={{ minWidth: 90 }} className={centerInputCls} />
                </InfoField>
                <InfoField label="Inner Height:">
                  <input inputMode="decimal" value={innerH} onChange={(e) => setInnerH(e.target.value)} style={{ minWidth: 90 }} className={centerInputCls} />
                </InfoField>
                <InfoField label="Weight:">
                  <input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} style={{ minWidth: 90 }} className={centerInputCls} />
                </InfoField>
              </tbody>
            </table>
            <table className="w-full border-collapse">
              <tbody>
                <InfoField label="Outer Width:">
                  <input inputMode="decimal" value={outerW} onChange={(e) => setOuterW(e.target.value)} style={{ minWidth: 90 }} className={centerInputCls} />
                </InfoField>
                <InfoField label="Outer Length:">
                  <input inputMode="decimal" value={outerL} onChange={(e) => setOuterL(e.target.value)} style={{ minWidth: 90 }} className={centerInputCls} />
                </InfoField>
                <InfoField label="Outer Height:">
                  <input inputMode="decimal" value={outerH} onChange={(e) => setOuterH(e.target.value)} style={{ minWidth: 90 }} className={centerInputCls} />
                </InfoField>
                <InfoField label="Max Weight:">
                  <input inputMode="decimal" value={maxWeight} onChange={(e) => setMaxWeight(e.target.value)} style={{ minWidth: 90 }} className={centerInputCls} />
                </InfoField>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-5">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Pack information:</label>
          <table className="mt-2 w-full border-collapse">
            <tbody>
              <InfoField label="Units per pack:">
                <input type="number" min={0} value={unitsPerPack} onChange={(e) => setUnitsPerPack(e.target.value)} className={inputCls} />
              </InfoField>
            </tbody>
          </table>
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setUnitsPerPack((v) => (v === '' ? '1' : String(Number(v) + 1)))}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <PlusIcon />
              Add pack
            </button>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Bin image</label>
          <BinImageUpload value={imageUrl} onChange={setImageUrl} />
        </div>

        <div className="mt-4">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Description</label>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputCls} mt-1 resize-none`} />
        </div>
      </div>

      <div className="flex justify-end border-t border-slate-100 bg-slate-50/40 px-5 py-3">
        <button
          type="button"
          disabled={!valid || saving}
          onClick={submit}
          className="rounded-xl bg-brand-600 px-6 py-2 text-xs font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? 'Saving...' : 'Submit'}
        </button>
      </div>
    </div>
  );
}