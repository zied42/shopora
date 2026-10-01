import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiErrorMessage, deletePackingBin, getPackingBin, getPackingBinOptions, PackingBinType, updatePackingBin } from '../../lib/api';
import { Spinner } from '../../components/ui';
import BinImageUpload from '../../components/BinImageUpload';

function InfoField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr>
      <td className="w-1/2 border border-slate-200 bg-slate-50/60 px-3 py-2 align-middle text-xs font-semibold text-slate-700">{label}</td>
      <td className="w-1/2 border border-slate-200 bg-white px-3 py-2">{children}</td>
    </tr>
  );
}

const inputCls = 'w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100';
const centerInputCls = `${inputCls} text-center`;

export default function ChefPackingBinEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [types, setTypes] = useState<PackingBinType[]>(['box', 'flatpolybag', 'crate', 'container', 'pallet', 'vehicle']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [reference, setReference] = useState('');
  const [cost, setCost] = useState('');
  const [price, setPrice] = useState('');
  const [type, setType] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getPackingBinOptions()
      .then((o) => setTypes(o.types.map((t) => t.value)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getPackingBin(Number(id))
      .then((b) => {
        setName(b.name);
        setReference(b.reference || '');
        setCost(String(b.cost));
        setPrice(String(b.price));
        setType(b.type);
        setImageUrl(b.image || '');
      })
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [id]);

  const valid = name.trim().length > 0 && type.length > 0;

  const submit = async () => {
    if (!valid || !id) return;
    setSaving(true);
    try {
      await updatePackingBin(Number(id), {
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

  const remove = async () => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to remove this bin?')) return;
    setDeleting(true);
    try {
      await deletePackingBin(Number(id));
      navigate('/chef/bins-inventory');
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
        <h5 className="mb-0 text-base font-bold text-slate-900">Edit bin</h5>
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
                <option value="" disabled>Select Bin type</option>
                {types.map((t) => (
                  <option key={t} value={t}>
                    {t === 'flatpolybag' ? 'Flat poly bag' : t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </InfoField>
          </tbody>
        </table>

        <div className="mt-4">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Bin image</label>
          <BinImageUpload value={imageUrl} onChange={setImageUrl} />
        </div>
      </div>

      <div className="flex justify-between gap-3 border-t border-slate-100 bg-slate-50/40 px-5 py-3">
        <button
          type="button"
          disabled={deleting}
          onClick={remove}
          className="rounded-xl bg-rose-600 px-6 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {deleting ? 'Removing...' : 'Remove'}
        </button>
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
