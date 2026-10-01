import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiErrorMessage, apiGet, money, Product } from '../../lib/api';
import { AppFooter, Spinner } from '../../components/ui';
import PriceUpdateModal from '../../components/PriceUpdateModal';

type Tab = 'description' | 'specifications' | 'reviews';

export default function ProductPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [img, setImg] = useState(0);
  const [tab, setTab] = useState<Tab>('description');
  const [priceOpen, setPriceOpen] = useState(false);

  const load = () =>
    apiGet<Product>(`/products/${id}`)
      .then(setProduct)
      .catch((e) => alert(apiErrorMessage(e)));

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [id]);

  const images = product?.images.length ? product.images : product?.image_url ? [product.image_url] : [];
  const netRevenue = product ? product.price * 0.97 : 0;
  const rating = product?.rating ?? 0;

  const renderStars = () => {
    const pct = Math.round((rating / 5) * 100);
    return (
      <span className="inline-flex items-center" title={`${rating.toFixed(1)} / 5`}>
        <span className="relative inline-block text-amber-300">
          {'★★★★★'}
          <span className="absolute left-0 top-0 overflow-hidden whitespace-nowrap text-amber-500" style={{ width: `${pct}%` }}>
            {'★★★★★'}
          </span>
        </span>
        <span className="ml-1.5 text-xs text-slate-500">({product?.rating_count ?? 0})</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="py-20">
        <Spinner />
        <AppFooter />
      </div>
    );
  }

  if (!product) {
    return (
      <div>
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-500">
          Product not found.
          <button type="button" onClick={() => navigate('/fournisseur/products')} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            ← Back to products
          </button>
        </div>
        <AppFooter />
      </div>
    );
  }

  return (
    <div>
      {/* Status banner */}
      <div className="mb-2 overflow-hidden rounded-xl border border-slate-200">
        <div className={`flex flex-wrap items-center justify-between gap-3 border-l-4 px-4 py-3 ${product.is_active ? 'border-emerald-400 bg-emerald-50' : 'border-amber-400 bg-amber-50'}`}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{product.is_active ? '📋' : '⚠️'}</span>
            <div>
              <p className={`font-bold ${product.is_active ? 'text-emerald-700' : 'text-amber-700'}`}>
                {product.is_active ? 'Product is active' : 'Product is hidden'}
              </p>
              <p className="text-xs text-slate-600">
                {product.is_active ? 'Product is active and eligible for display in market' : 'Product is hidden from the marketplace'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPriceOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-amber-950 hover:bg-amber-300"
          >
            💲 Update the price
          </button>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <Link to="/fournisseur/products" className="text-xs font-medium text-slate-500 hover:text-brand-600">← Back to my products</Link>
        <span className="text-xs text-slate-400">SKU: {product.sku ?? '—'}</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-6 p-5 lg:grid-cols-5">
          {/* Images */}
          <div className="lg:col-span-2">
            {images.length === 0 ? (
              <div className="flex h-72 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 text-4xl text-slate-300">📦</div>
            ) : (
              <>
                <div className="relative flex h-72 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  <img src={images[img]} alt={product.name} className="max-h-72 max-w-full object-contain" />
                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setImg((img - 1 + images.length) % images.length)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-xs shadow hover:bg-white"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={() => setImg((img + 1) % images.length)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-xs shadow hover:bg-white"
                      >
                        ›
                      </button>
                    </>
                  )}
                </div>
                {images.length > 1 && (
                  <div className="mt-2 flex gap-2 overflow-x-auto">
                    {images.map((u, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setImg(i)}
                        className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 ${i === img ? 'border-brand-500' : 'border-slate-200'}`}
                      >
                        <img src={u} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col justify-start lg:col-span-3">
            <h4 className="text-xl font-bold text-slate-900">{product.name}</h4>
            <div className="mb-3 text-sm">{renderStars()}</div>

            <h4 className="text-lg font-bold text-amber-600">{money(product.price)} TND</h4>
            <h4 className="text-lg font-bold text-emerald-600">{money(netRevenue)} TND <span className="text-xs font-medium text-slate-500">— Net Revenue</span></h4>
            <p className="mt-1 text-xs text-slate-500">Platform Commission: 3%</p>

            <p className="mt-1 text-xs text-slate-600">
              Categories: <span className="italic text-slate-500">{product.retail_category || '—'}</span>
            </p>

            {!!product.keywords?.length && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
                <span className="mr-1">Keywords:</span>
                {product.keywords.map((k) => (
                  <span key={k} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">{k}</span>
                ))}
              </div>
            )}

            <div className="mt-2 space-y-1 text-xs text-slate-700">
              <p>Stock: <strong className="text-brand-600">{product.stock}</strong></p>
              <p>Weight (GR): <strong>{product.weight != null ? product.weight : '—'}</strong></p>
              <p>
                Package dimensions L x W x H (MM):{' '}
                <strong>
                  {product.length && product.width && product.height ? `${product.length} × ${product.width} × ${product.height}` : '—'}
                </strong>
              </p>
              <p>VAT: <strong>19%</strong></p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-slate-200 px-5 pt-0">
          <div className="flex gap-1 border-b border-slate-200 text-sm">
            {(
              [
                { id: 'description' as Tab, label: 'Description' },
                { id: 'specifications' as Tab, label: 'Specifications' },
                { id: 'reviews' as Tab, label: 'Product reviews' },
              ]
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-3 py-2.5 text-xs font-semibold transition ${tab === t.id ? 'border-b-2 border-brand-600 text-brand-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'description' && (
            <div className="py-4 text-sm text-slate-700">
              {product.description ? <p className="whitespace-pre-wrap">{product.description}</p> : <p className="text-slate-400">No description for this product.</p>}
            </div>
          )}

          {tab === 'specifications' && (
            <div className="py-4">
              {product.specifications?.length ? (
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-slate-100">
                      {product.specifications.map((s, i) => (
                        <tr key={i}>
                          <td className="w-1/3 bg-slate-50 px-4 py-2 font-medium text-slate-600">{s.k}</td>
                          <td className="px-4 py-2 text-slate-700">{s.v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-10 text-center text-sm text-slate-400">No specifications for this product</div>
              )}
            </div>
          )}

          {tab === 'reviews' && (
            <div className="py-4">
              {product.rating_count > 0 ? (
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-extrabold text-slate-900">{rating.toFixed(1)}</span>
                  <div>
                    <div className="text-sm">{renderStars()}</div>
                    <p className="text-xs text-slate-500">{product.rating_count} review(s)</p>
                  </div>
                </div>
              ) : (
                <div className="py-10 text-center text-sm text-slate-400">No reviews for this product</div>
              )}
            </div>
          )}
        </div>
      </div>
      {priceOpen && (
        <PriceUpdateModal
          product={product}
          onClose={() => setPriceOpen(false)}
          onDone={() => {
            setPriceOpen(false);
            load();
            alert('Price updated successfully.');
          }}
        />
      )}
      <AppFooter />
    </div>
  );
}