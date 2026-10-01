import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  apiErrorMessage,
  CatalogOfferType,
  CollectionDetail,
  CollectionProduct,
  CollectionProductItem,
  createCollection,
  getCollectionCatalog,
  getCollectionDetail,
  updateCollection,
} from '../../lib/api';
import { Spinner } from '../../components/ui';
import { SearchIcon, clockSlot } from './ui';

type EligibleFilter = 'all' | 'eligible' | 'not';
type OfferFilter = 'all' | CatalogOfferType;

const OFFER_LABEL: Record<CatalogOfferType, string> = {
  dropshipping: 'Dropshipping',
  wholesale: 'Wholesale',
  white_label: 'White label',
};

const OFFER_TONE: Record<CatalogOfferType, string> = {
  dropshipping: 'bg-sky-50 text-sky-700',
  wholesale: 'bg-violet-50 text-violet-700',
  white_label: 'bg-amber-50 text-amber-700',
};

export default function CollectionEditor() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id && id !== 'create';
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [featured, setFeatured] = useState(true);
  const [rank, setRank] = useState('');
  const [items, setItems] = useState<CollectionProductItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  const [catalog, setCatalog] = useState<CollectionProduct[]>([]);
  const [pickerQ, setPickerQ] = useState('');
  const [eligible, setEligible] = useState<EligibleFilter>('all');
  const [offer, setOffer] = useState<OfferFilter>('all');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getCollectionCatalog()
      .then(setCatalog)
      .catch((e) => alert(apiErrorMessage(e)));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    getCollectionDetail(Number(id))
      .then((d: CollectionDetail) => {
        setTitle(d.title);
        setDescription(d.description ?? '');
        setFeatured(d.is_active ?? d.status === 'Active');
        setRank(d.marketplace_sort_rank != null ? String(d.marketplace_sort_rank) : '');
        setItems(d.product_items ?? []);
      })
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerQ('');
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const catalogSet = useMemo(() => new Set(items.map((i) => i.id)), [items]);

  const catalogList = useMemo(() => {
    const query = pickerQ.trim().toLowerCase();
    return catalog.filter((p) => {
      if (catalogSet.has(p.id)) return false;
      if (query && !p.name.toLowerCase().includes(query)) return false;
      if (eligible === 'eligible' && !p.eligible_to_marketplace) return false;
      if (eligible === 'not' && p.eligible_to_marketplace) return false;
      if (offer !== 'all' && p.offer_type !== offer) return false;
      return true;
    });
  }, [catalog, pickerQ, eligible, offer, catalogSet]);

  const addProduct = (p: CollectionProduct) => {
    if (catalogSet.has(p.id)) return;
    const item: CollectionProductItem = {
      id: p.id,
      name: p.name,
      emoji: p.emoji,
      image_url: p.image_url,
      eligible_to_marketplace: p.eligible_to_marketplace,
      offer_type: p.offer_type,
      added_by: 'You',
      added_at: new Date().toISOString(),
    };
    setItems((prev) => [...prev, item]);
  };

  const removeProduct = (pid: number) => setItems((prev) => prev.filter((i) => i.id !== pid));

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Title is required');
      return;
    }
    setSaving(true);
    const body = {
      title: title.trim(),
      description: description.trim() || null,
      is_active: featured,
      marketplace_sort_rank: rank.trim() ? Number(rank.trim()) : null,
      product_ids: items.map((i) => i.id),
    };
    try {
      if (isEdit) await updateCollection(Number(id), body);
      else await createCollection(body);
      navigate('/chef/products-collections');
    } catch (e) {
      alert(apiErrorMessage(e));
      setSaving(false);
    }
  };

  const inputCls =
    'w-full rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white';

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3.5">
            <h5 className="mb-1 text-base font-bold text-slate-900">{isEdit ? 'Edit collection' : 'Create collection'}</h5>
            <p className="mb-0 text-xs text-slate-500">{isEdit ? `Modify collection #${id}` : 'Add a new product collection to the marketplace'}</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : (
            <div className="space-y-5 px-5 py-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-900">Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="Collection title" />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-900">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className={`${inputCls} resize-none`}
                  placeholder="Short description of this collection"
                />
              </div>

              <div className="flex items-start justify-between rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3">
                <div>
                  <div className="text-xs font-semibold text-slate-900">Feature this collection on marketplace</div>
                  <p className="mb-0 mt-0.5 text-[11px] text-slate-500">Show this collection in the marketplace homepage sections when active.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={featured}
                  onClick={() => setFeatured((v) => !v)}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${featured ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition ${featured ? 'translate-x-4' : 'translate-x-1'}`} />
                </button>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-900">Marketplace sort rank</label>
                <input
                  type="number"
                  min={0}
                  value={rank}
                  onChange={(e) => setRank(e.target.value)}
                  className={inputCls}
                  placeholder="e.g. 1"
                />
                <p className="mb-0 mt-1 text-[11px] text-slate-500">Higher numbers mean the collection appears later in marketplace sections. Leave empty for auto.</p>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="border-b border-slate-100 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <h6 className="mb-0 text-xs font-semibold text-slate-900">Products in this collection</h6>
                    <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700">
                      {items.length} Product{items.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>

                {items.length > 0 && (
                  <div className="border-b border-slate-100 px-4 py-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-sky-600">Selected</span>
                    </div>
                    <div className="max-h-48 overflow-auto rounded-lg border border-sky-200 bg-sky-50/30">
                      <table className="w-full border-collapse">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-sky-100">
                            <th className="px-3 py-2 text-left text-[10px] font-semibold text-sky-900">Product</th>
                            <th className="px-3 py-2 text-left text-[10px] font-semibold text-sky-900">Offer type</th>
                            <th className="px-3 py-2 text-center text-[10px] font-semibold text-sky-900">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item) => (
                            <tr key={item.id} className="border-b border-sky-100 last:border-b-0 bg-white/60">
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  {item.image_url ? (
                                    <img src={item.image_url} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
                                  ) : (
                                    <span className="text-base leading-none">{item.emoji}</span>
                                  )}
                                  <div>
                                    <div className="text-xs font-bold text-slate-800">{item.name}</div>
                                    <div className="mt-0.5 text-[10px] text-slate-400">
                                      Added {clockSlot(item.added_at)}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${OFFER_TONE[item.offer_type]}`}>
                                  {OFFER_LABEL[item.offer_type]}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeProduct(item.id)}
                                  title="Remove"
                                  className="inline-flex items-center rounded-md border border-red-200 bg-red-50 p-1 text-red-500 transition hover:bg-red-100"
                                >
                                  <svg width="11" height="11" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true">
                                    <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="px-4 py-3">
                  <label className="mb-1.5 block text-xs font-semibold text-slate-900">Add new product:</label>
                  <div ref={pickerRef} className="relative">
                    <div className="relative">
                      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={pickerQ}
                        onChange={(e) => setPickerQ(e.target.value)}
                        placeholder="Search products"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-3 text-xs text-slate-700 outline-none transition focus:border-sky-400 focus:bg-white"
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Eligible to marketplace</span>
                        {(['all', 'eligible', 'not'] as EligibleFilter[]).map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => setEligible(f)}
                            className={`rounded-md px-2 py-1 text-[10px] font-semibold transition ${
                              eligible === f ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {f === 'all' ? 'All' : f === 'eligible' ? 'Eligible' : 'Not eligible'}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Offer type</span>
                        {(['all', 'dropshipping', 'wholesale', 'white_label'] as OfferFilter[]).map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => setOffer(f)}
                            className={`rounded-md px-2 py-1 text-[10px] font-semibold transition ${
                              offer === f ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {f === 'all' ? 'All' : OFFER_LABEL[f]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-slate-200">
                      <table className="w-full border-collapse">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-slate-100 dark:bg-slate-100">
                            <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-900">Product</th>
                            <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-900">Marketplace</th>
                            <th className="px-3 py-2 text-left text-[10px] font-semibold text-slate-900">Offer type</th>
                            <th className="px-3 py-2 text-center text-[10px] font-semibold text-slate-900">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {catalogList.map((p) => (
                              <tr key={p.id} className="border-b border-slate-100 last:border-b-0 odd:bg-slate-50/40">
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    {p.image_url ? (
                                      <img src={p.image_url} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
                                    ) : (
                                      <span className="text-base leading-none">{p.emoji}</span>
                                    )}
                                    <div className="text-xs font-bold text-slate-800">{p.name}</div>
                                  </div>
                                </td>
                                <td className="px-3 py-2">
                                  {p.eligible_to_marketplace ? (
                                    <span className="inline-flex rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Eligible</span>
                                  ) : (
                                    <span className="inline-flex rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">Not eligible</span>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${OFFER_TONE[p.offer_type]}`}>
                                    {OFFER_LABEL[p.offer_type]}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => addProduct(p)}
                                    title="Add"
                                    className="inline-flex items-center rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-semibold text-sky-700 transition hover:bg-sky-100"
                                  >
                                    Add
                                  </button>
                                </td>
                              </tr>
                          ))}
                          {catalogList.length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-3 py-8 text-center text-xs text-slate-400">
                                No products match the current filters
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-3 pt-1">
                <Link to="/chef/products-collections" className="text-xs font-semibold text-sky-600 hover:text-sky-700">
                  Cancel
                </Link>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-60"
                >
                  {saving ? <Spinner /> : null}
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

