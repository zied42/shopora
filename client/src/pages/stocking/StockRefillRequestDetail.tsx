import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { apiErrorMessage, getStockRefillRequest, batchUrl, StockRefillRequest, StockRefillRequestItemInput, updateStockRefillRequest } from '../../lib/api';
import { ButtonGhost, PageHeader, Spinner } from '../../components/ui';
import { printBatchLabel } from './batchLabel';

const STATUS_TONES: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-700',
  Approved: 'bg-sky-50 text-sky-700',
  'In preparation': 'bg-violet-50 text-violet-700',
  Ready: 'bg-teal-50 text-teal-700',
  Shipped: 'bg-blue-50 text-blue-700',
  Completed: 'bg-emerald-50 text-emerald-700',
  Rejected: 'bg-rose-50 text-rose-700',
};

type DocKind = 'demande' | 'sortie';

const DOC_META: Record<DocKind, { title: string; badge: string; badgeCls: string; accent: string; headerCls: string; thumbChipCls: string }> = {
  demande: {
    title: 'Demande de recharge de stock',
    badge: 'Interne',
    badgeCls: 'border-slate-200 bg-slate-100 text-slate-600',
    accent: 'rgb(79 70 229)',
    headerCls: 'bg-gradient-to-r from-brand-600 to-brand-500',
    thumbChipCls: 'bg-brand-500',
  },
  sortie: {
    title: 'Bon de sortie',
    badge: 'Interne',
    badgeCls: 'border-slate-200 bg-slate-100 text-slate-600',
    accent: 'rgb(59 130 246)',
    headerCls: 'bg-gradient-to-r from-sky-500 to-sky-400',
    thumbChipCls: 'bg-sky-400',
  },
};

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function fmtPrice(n: number): string {
  const fixed = Math.abs(n % 1) > 0 ? n.toFixed(3) : String(n);
  return fixed.replace(/\.?0+$/, '').replace('.', ',');
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ── printable A4-style document ─────────────────────────────────────── */

function buildDocHtml(kind: DocKind, r: StockRefillRequest): string {
  const meta = DOC_META[kind];
  const ref = `${kind === 'demande' ? 'DEM' : 'BS'}-${String(r.id).padStart(6, '0')}`;
  const qtyOf = (it: StockRefillRequest['items'][number]) =>
    kind === 'demande' ? it.qty_to_request : it.qty_picked > 0 ? it.qty_picked : it.qty_to_request;
  const rows = r.items.map((it) => ({
    name: it.color ? `${it.product_name} — ${it.color}` : it.product_name,
    qty: qtyOf(it),
    price: it.unit_price,
    total: qtyOf(it) * it.unit_price,
  }));
  const totalHT = rows.reduce((s, x) => s + x.total, 0);
  const signers =
    kind === 'demande'
      ? ['Responsable stock', 'Validation direction']
      : ['Magasinier', 'Responsable logistique'];
  const bodyRows = rows.length
    ? rows
        .map(
          (x, i) => `<tr><td class="c">${String(i + 1).padStart(2, '0')}</td><td>${esc(x.name)}</td><td class="n">${x.qty}</td><td class="n">${fmtPrice(x.price)}</td><td class="n">${fmtPrice(x.total)}</td></tr>`,
        )
        .join('')
    : '<tr><td colspan="5" class="empty">Aucun produit</td></tr>';

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${meta.title} ${ref}</title><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:#eef1f4;padding:24px;display:flex;justify-content:center;color:#2f3a44}
.page{width:100%;max-width:720px;background:#fff;border-radius:10px;box-shadow:0 4px 24px rgba(0,0,0,.12);overflow:hidden}
.top{height:8px;background:${meta.accent}}
.head{display:flex;justify-content:space-between;align-items:flex-start;padding:24px 30px 18px}
.brand{display:flex;gap:11px;align-items:center}
.logo{width:42px;height:42px;border-radius:10px;background:${meta.accent};color:#fff;font-weight:800;font-size:16px;display:flex;align-items:center;justify-content:center}
.brand b{font-size:15px;color:#1f2937;display:block}
.brand span{font-size:10px;color:#94a3b8}
.docbox{text-align:right;border:1px solid color-mix(in srgb, ${meta.accent} 33%, transparent);background:color-mix(in srgb, ${meta.accent} 5%, transparent);border-radius:9px;padding:13px 17px}
.docbox h1{font-size:14px;letter-spacing:1.5px;text-transform:uppercase;color:${meta.accent};margin-bottom:5px}
.docbox .row{font-size:10.5px;color:#64748b;display:flex;gap:14px;justify-content:flex-end;margin-top:3px}
.docbox .row b{color:#334155;font-weight:600}
.parties{display:flex;gap:14px;padding:0 30px 4px}
.party{flex:1;border:1px solid #e2e8f0;border-radius:9px;padding:11px 14px}
.party span{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:#94a3b8;margin-bottom:5px}
.party b{font-size:12px;color:#1f2937}
.party small{display:block;font-size:10px;color:#7b8794;margin-top:2px}
table{width:calc(100% - 60px);margin:20px auto 0;border-collapse:collapse;font-size:11px}
thead th{background:#334155;color:#fff;padding:9px 10px;text-align:left;font-size:9.5px;text-transform:uppercase;letter-spacing:.6px}
thead th:first-child{border-radius:7px 0 0 0}
thead th:last-child{border-radius:0 7px 0 0}
th.n,td.n{text-align:right}
td{padding:8px 10px;border-bottom:1px solid #edf0f2;color:#3f4954}
tbody tr:nth-child(even) td{background:#f8fafc}
td.c{color:#a3aeb8;width:34px;font-size:10px}
td.empty{text-align:center;color:#a3aeb8;padding:22px}
.totals{width:250px;margin:14px 30px 0 auto;font-size:11.5px}
.totals .trow{display:flex;justify-content:space-between;padding:6px 12px;color:#5b6670}
.totals .grand{display:flex;justify-content:space-between;padding:10px 12px;border-radius:8px;background:${meta.accent};color:#fff;font-weight:700;font-size:12.5px;margin-top:4px}
.signs{display:flex;gap:40px;padding:36px 30px 8px}
.sig{flex:1;text-align:center}
.sig .box{height:62px;border:1px dashed #ccd5db;border-radius:8px;margin-bottom:7px}
.sig span{font-size:10px;color:#8894a0}
.foot{padding:14px 30px 22px;display:flex;justify-content:space-between;font-size:9px;color:#b6bfc7}
.printbtn{position:fixed;top:14px;right:16px;background:#111827;color:#fff;border:none;border-radius:8px;padding:9px 16px;font-size:12px;font-weight:600;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.25)}
@media print{body{background:#fff;padding:0}.page{box-shadow:none;border-radius:0}.printbtn{display:none}}
</style></head><body>
<button class="printbtn" onclick="window.print()">🖨 Imprimer / PDF</button>
<div class="page"><div class="top"></div>
<div class="head">
  <div class="brand"><div class="logo">SR</div><div><b>Stock Management</b><span>Gestion de stock &amp; recharge</span></div></div>
  <div class="docbox">
    <h1>${meta.title}</h1>
    <div class="row"><span>Référence</span><b>${ref}</b></div>
    <div class="row"><span>Date</span><b>${fmtDate(r.date)}</b></div>
    <div class="row"><span>Statut</span><b>${esc(r.status)}</b></div>
  </div>
</div>
<div class="parties">
  <div class="party"><span>Émetteur</span><b>Stock Management</b><small>Dépôt central — Tunisie</small></div>
  <div class="party"><span>Fournisseur</span><b>${esc(r.supplier)}</b><small>Demande de stockage #${r.storage_request ?? r.id}</small></div>
</div>
<table>
<thead><tr><th class="c">#</th><th>Désignation</th><th class="n">${kind === 'demande' ? 'Qté demandée' : 'Quantité sortie'}</th><th class="n">Prix unitaire</th><th class="n">Total HT</th></tr></thead>
<tbody>${bodyRows}</tbody>
</table>
<div class="totals">
  <div class="trow"><span>Total produits (${rows.length})</span><b>${fmtPrice(totalHT)} TND</b></div>
  <div class="trow"><span>TVA</span><b>—</b></div>
  <div class="grand"><span>TOTAL</span><span>${fmtPrice(totalHT)} TND</span></div>
</div>
<div class="signs">${signers.map((s) => `<div class="sig"><div class="box"></div><span>${s}</span></div>`).join('')}</div>
<div class="foot"><span>${ref}</span><span>Document généré automatiquement le ${fmtDateTime(new Date().toISOString())}</span></div>
</div></body></html>`;
}

/* ── card thumbnail ──────────────────────────────────────────────────── */

function DocThumb({ meta }: { meta: (typeof DOC_META)[DocKind] }) {
  return (
    <div className="w-[130px] overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm">
      <div className={`flex items-center justify-between px-2 py-1.5 ${meta.headerCls}`}>
        <span className="h-1.5 w-9 rounded-full bg-white/85" />
        <span className="h-1.5 w-5 rounded-full bg-white/60" />
      </div>
      <div className="space-y-[4px] px-2 pt-2 pb-1">
        <div className="h-[4px] w-3/4 rounded-full bg-slate-300" />
        <div className="h-[4px] w-1/2 rounded-full bg-slate-200" />
      </div>
      <div className="mx-2 mb-2 overflow-hidden rounded-sm border border-slate-200">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-1.5 border-b border-slate-100 px-1.5 py-[3px] last:border-b-0">
            <span className={`h-[5px] flex-1 rounded-full bg-slate-200`} />
            <span className={`h-[7px] w-6 rounded-full ${meta.thumbChipCls}`} />
          </div>
        ))}
      </div>
      <div className="flex justify-end px-2 pb-2">
        <span className={`inline-block h-[8px] w-12 rounded-full ${meta.thumbChipCls} opacity-80`} />
      </div>
    </div>
  );
}

function DocumentCard({ kind, subtitle, onPreview }: { kind: DocKind; subtitle: string; onPreview: () => void }) {
  const meta = DOC_META[kind];
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-800">{meta.title}</h3>
        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${meta.badgeCls}`}>{meta.badge}</span>
      </div>
      <p className="mb-2 text-[10px] font-medium text-slate-400">{subtitle}</p>
      <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <button type="button" onClick={onPreview} className="group flex flex-1 cursor-pointer items-center justify-center bg-slate-50 py-4 transition hover:bg-slate-100">
          <DocThumb meta={meta} />
        </button>
        <button
          type="button"
          onClick={onPreview}
          className="flex h-[26px] items-center justify-center gap-1.5 border-t border-slate-200 bg-white text-[10px] font-semibold transition hover:bg-brand-50/40"
          style={{ color: meta.accent }}
        >
          <span className="text-[11px]">◉</span>
          Preview document
        </button>
      </div>
    </div>
  );
}

/* ── page ────────────────────────────────────────────────────────────── */

export default function StockRefillRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState<StockRefillRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<{ kind: DocKind; html: string } | null>(null);

  useEffect(() => {
    const n = Number(id);
    if (!Number.isFinite(n) || n <= 0) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    getStockRefillRequest(n)
      .then((r) => {
        if (!alive) return;
        setRequest(r);
        setPicked(Object.fromEntries(r.items.map((it) => [it.id, it.qty_picked])));
      })
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  if (loading) return <Spinner />;

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        <div className="text-4xl">🔍</div>
        <p className="text-sm font-semibold text-slate-600">Stock refill request not found</p>
        <button
          type="button"
          onClick={() => navigate('/stocking/stock-refill-requests')}
          className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-700"
        >
          Back to Stock refill requests
        </button>
      </div>
    );
  }

  const setQtyPicked = (itemId: number, v: string) =>
    setPicked((prev) => ({ ...prev, [itemId]: Math.max(0, Number(v) || 0) }));

  const save = async () => {
    setSaving(true);
    try {
      await updateStockRefillRequest(request.id, {
        supplier: request.supplier,
        products: request.products,
        storage_request: request.storage_request,
        reservation: request.reservation,
        date: request.date,
        status: request.status,
        items: request.items.map(
          (it): StockRefillRequestItemInput => ({
            product_name: it.product_name,
            color: it.color,
            image_url: it.image_url,
            expected_incoming: it.expected_incoming,
            supplier_stock: it.supplier_stock,
            our_stock: it.our_stock,
            period_consumption: it.period_consumption,
            qty_non_confirmed: it.qty_non_confirmed,
            qty_required_orders: it.qty_required_orders,
            qty_to_request: it.qty_to_request,
            qty_picked: picked[it.id] ?? it.qty_picked,
            unit_price: it.unit_price,
          })
        ),
      });
      navigate('/stocking/stock-refill-requests');
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const openPreview = (kind: DocKind) => setPreview({ kind, html: buildDocHtml(kind, request) });

  const downloadOrPrint = () => {
    if (!preview) return;
    const w = window.open('', '_blank');
    if (!w) {
      alert('Please allow pop-ups to export the document as PDF.');
      return;
    }
    w.document.open();
    w.document.write(preview.html);
    w.document.close();
  };

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="Stock refill request"
        subtitle={`Edit picked quantities, print documents and batch QR labels — request #${request.id}`}
        actions={
          <ButtonGhost onClick={() => navigate('/stocking/stock-refill-requests')}>← Back</ButtonGhost>
        }
      />

      {/* INFO */}
      <div className="mb-[22px] space-y-1 text-xs leading-relaxed text-slate-500">
        <div>
          <span className="font-semibold text-slate-600">ID:</span> #{request.id}
        </div>
        <div>
          <span className="font-semibold text-slate-600">Supplier:</span> {request.supplier}
        </div>
        <div>
          <span className="font-semibold text-slate-600">Created at:</span> {fmtDateTime(request.date)}
        </div>
        <div>
          <span className="font-semibold text-slate-600">Status:</span>
          <span className={`ml-[5px] inline-block rounded-full px-[9px] py-0.5 text-[10px] font-semibold ${STATUS_TONES[request.status] ?? STATUS_TONES.Pending}`}>
            {request.status.toLowerCase()}
          </span>
        </div>
        <div>
          <span className="font-semibold text-slate-600">Storage request:</span> #{request.storage_request ?? request.id}
        </div>
      </div>

      {/* DOCUMENTS */}
      <section className="mb-[22px] grid grid-cols-1 gap-[22px] sm:grid-cols-2">
        <DocumentCard
          kind="demande"
          subtitle={`REF DEM-${String(request.id).padStart(6, '0')} · ${request.items.length} produits`}
          onPreview={() => openPreview('demande')}
        />
        <DocumentCard
          kind="sortie"
          subtitle={`REF BS-${String(request.id).padStart(6, '0')} · ${request.items.reduce((s, it) => s + (picked[it.id] ?? it.qty_picked), 0)} unités`}
          onPreview={() => openPreview('sortie')}
        />
      </section>

      {/* PRODUCT TABLE */}
      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[650px] border-collapse">
          <thead className="bg-slate-50/80">
            <tr>
              {['Product', 'Quantity requested', 'Quantity picked', 'Unit price', 'Remaining quantity', 'Batch / QR'].map((h) => (
                <th key={h} className="px-[13px] py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {h.includes(' ') && !h.startsWith('Product') ? (
                    <>
                      {h.split(' ').map((w, i) => (
                        <span key={i}>
                          {i > 0 && <br />}
                          {w}
                        </span>
                      ))}
                    </>
                  ) : (
                    h
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {request.items.map((it) => (
              <tr key={it.id} className="border-t border-slate-100 transition hover:bg-brand-50/40">
                <td className="px-[13px] py-2.5">
                  <div className="flex items-center gap-2.5">
                    {it.image_url ? (
                      <img src={it.image_url} alt={it.product_name} className="h-[43px] w-[43px] shrink-0 rounded object-cover" />
                    ) : (
                      <div className="flex h-[43px] w-[43px] shrink-0 items-center justify-center rounded bg-slate-100 text-xl">📦</div>
                    )}
                    <div className="max-w-[160px] text-[11px] font-medium leading-snug text-slate-800">
                      {it.product_name}
                      {it.color && (
                        <>
                          <br />
                          <span className="text-[10px] text-slate-500">Color: {it.color}</span>
                        </>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-[13px] py-2.5 text-[11px] text-slate-600">{it.qty_to_request}</td>
                <td className="px-[13px] py-2.5">
                  <input
                    type="number"
                    min={0}
                    value={picked[it.id] ?? 0}
                    onChange={(e) => setQtyPicked(it.id, e.target.value)}
                    className="h-[34px] w-[100px] rounded-xl border border-slate-300 text-center text-xs outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </td>
                <td className="px-[13px] py-2.5">
                  <span className="inline-block min-w-[100px] rounded-lg bg-slate-50 px-[18px] py-[9px] text-center text-[11px] text-slate-600">
                    {fmtPrice(it.unit_price)}
                  </span>
                </td>
                <td className="px-[13px] py-2.5">
                  <span className="inline-block min-w-[100px] rounded-lg border border-slate-200 bg-white px-[18px] py-[9px] text-center text-[11px] text-slate-600">
                    {Math.max(0, it.supplier_stock - (picked[it.id] ?? 0))}
                  </span>
                </td>
                <td className="px-[13px] py-2.5">
                  {(() => {
                    const idx = request.items.findIndex((x) => x.id === it.id);
                    const saved = request.batches?.find((b) => b.position === idx);
                    if (!saved) {
                      return <span className="text-[10px] text-slate-400">Saved on Save</span>;
                    }
                    const ref = request.storage_request ?? `SRG-${request.id}`;
                    return (
                      <div className="flex items-center gap-2">
                        <span id={`refill-qr-${it.id}`} className="shrink-0">
                          <QRCodeCanvas value={batchUrl(saved.batch_code)} size={44} />
                        </span>
                        <div className="text-[10px] leading-snug">
                          <p className="font-mono font-semibold text-slate-800">{saved.batch_code}</p>
                          <p className="text-slate-400">{saved.quantity} unit(s)</p>
                          <button
                            type="button"
                            onClick={() => {
                              const canvas = document.querySelector<HTMLCanvasElement>(`#refill-qr-${it.id} canvas`);
                              printBatchLabel(it.product_name, it.color ?? null, saved.batch_code, `Refill #${request.id} · ${ref}`, canvas?.toDataURL('image/png'));
                            }}
                            className="mt-0.5 font-semibold text-brand-600 transition hover:text-brand-700"
                          >
                            🖨 Print label
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </td>
              </tr>
            ))}
            {request.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-[13px] py-10 text-center text-xs text-slate-400">
                  No products in this request
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* BOTTOM */}
        <div className="flex items-center justify-between border-t border-slate-100 px-[13px] py-[13px]">
          <button type="button" className="text-[11px] font-medium text-brand-600 transition hover:text-brand-700">
            + Add another product
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-xl border-none bg-brand-600 px-6 py-2 text-[11px] font-semibold text-white shadow-sm shadow-brand-600/20 transition hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </section>

      {/* DOC PREVIEW MODAL */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" onClick={() => setPreview(null)}>
          <div className="flex h-full max-h-[92vh] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
              <h5 className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: DOC_META[preview.kind].accent }} />
                {DOC_META[preview.kind].title} — REF {preview.kind === 'demande' ? 'DEM' : 'BS'}-{String(request.id).padStart(6, '0')}
                <span className={`ml-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${DOC_META[preview.kind].badgeCls}`}>{DOC_META[preview.kind].badge}</span>
              </h5>
              <div className="flex items-center gap-2">
                <button type="button" onClick={downloadOrPrint} className="rounded-lg bg-slate-800 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-slate-900">
                  Open / Save PDF
                </button>
                <button type="button" onClick={() => setPreview(null)} aria-label="Close" className="text-lg leading-none text-slate-400 transition hover:text-slate-600">
                  ×
                </button>
              </div>
            </div>
            <iframe title="document-preview" srcDoc={preview.html} className="min-h-0 w-full flex-1 border-0 bg-white" />
          </div>
        </div>
      )}
    </div>
  );
}
