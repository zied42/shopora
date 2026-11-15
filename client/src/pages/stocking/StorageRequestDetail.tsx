import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { apiErrorMessage, getStorageRequest, getStockRefillRequest, batchUrl, StorageRequest, StockRefillRequest } from '../../lib/api';
import { ButtonGhost, PageHeader, Spinner } from '../../components/ui';
import { batchCodeOf, printBatchLabel } from './batchLabel';

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

function buildDocHtml(sr: StorageRequest, refill: StockRefillRequest | null): string {
  const ref = sr.gid || `SRG-${sr.id}`;
  const itemRows = refill?.items ?? [];
  const bodyRows = itemRows.length
    ? itemRows
        .map((it, i) => {
          const name = it.color ? `${esc(it.product_name)} — ${esc(it.color)}` : esc(it.product_name);
          return `<tr><td class="c">${String(i + 1).padStart(2, '0')}</td><td>${name}</td><td class="n">${it.qty_to_request}</td><td class="n">${it.qty_picked}</td></tr>`;
        })
        .join('')
    : `<tr><td colspan="4" class="empty">Produits : ${sr.products} unité${sr.products === 1 ? '' : 's'} (détail indisponible)</td></tr>`;

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Demande de stockage ${ref}</title><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;background:#eef1f4;padding:24px;display:flex;justify-content:center;color:#2f3a44}
.page{width:100%;max-width:720px;background:#fff;border-radius:10px;box-shadow:0 4px 24px rgba(0,0,0,.12);overflow:hidden}
.top{height:8px;background:rgb(79 70 229)}
.head{display:flex;justify-content:space-between;align-items:flex-start;padding:24px 30px 18px}
.brand{display:flex;gap:11px;align-items:center}
.logo{width:42px;height:42px;border-radius:10px;background:rgb(79 70 229);color:#fff;font-weight:800;font-size:16px;display:flex;align-items:center;justify-content:center}
.brand b{font-size:15px;color:#1f2937;display:block}
.brand span{font-size:10px;color:#94a3b8}
.docbox{text-align:right;border:1px solid rgb(79 70 229 / 33%);background:rgb(79 70 229 / 5%);border-radius:9px;padding:13px 17px}
.docbox h1{font-size:14px;letter-spacing:1.5px;text-transform:uppercase;color:rgb(79 70 229);margin-bottom:5px}
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
.totals .grand{display:flex;justify-content:space-between;padding:10px 12px;border-radius:8px;background:rgb(79 70 229);color:#fff;font-weight:700;font-size:12.5px;margin-top:4px}
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
    <h1>Demande de stockage</h1>
    <div class="row"><span>Référence</span><b>${esc(ref)}</b></div>
    <div class="row"><span>Date</span><b>${fmtDate(sr.created_at)}</b></div>
    <div class="row"><span>Statut</span><b>${esc(sr.status)}</b></div>
  </div>
</div>
<div class="parties">
  <div class="party"><span>Client</span><b>${esc(sr.client)}</b><small>ID #${sr.id}</small></div>
  <div class="party"><span>Demande liée</span><b>${sr.related_refill_id ? `Recharge #${sr.related_refill_id}` : '—'}</b><small>Stockage dépôt central</small></div>
</div>
<table>
<thead><tr><th class="c">#</th><th>Désignation</th><th class="n">Qté demandée</th><th class="n">Qté récupérée</th></tr></thead>
<tbody>${bodyRows}</tbody>
</table>
<div class="totals">
  <div class="trow"><span>Produits</span><b>${itemRows.length || sr.products}</b></div>
  <div class="trow"><span>Échecs QC</span><b>${sr.failed_qc}</b></div>
  <div class="grand"><span>STATUT</span><span>${esc(sr.status)}</span></div>
</div>
${sr.discrepancies ? `<div style="margin:14px 30px 0;padding:10px 14px;border-radius:8px;background:#fef3c7;color:#92400e;font-size:11px"><b>Écarts :</b> ${esc(sr.discrepancies)}</div>` : ''}
<div class="signs">${['Responsable stock', 'Client'].map((s) => `<div class="sig"><div class="box"></div><span>${s}</span></div>`).join('')}</div>
<div class="foot"><span>${esc(ref)}</span><span>Document généré automatiquement le ${fmtDateTime(new Date().toISOString())}</span></div>
</div></body></html>`;
}

export default function StorageRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState<StorageRequest | null>(null);
  const [refill, setRefill] = useState<StockRefillRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [distributions, setDistributions] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const n = Number(id);
    if (!Number.isFinite(n) || n <= 0) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setRefill(null);
    getStorageRequest(n)
      .then(async (r) => {
        if (!alive) return;
        setRequest(r);
        if (r.related_refill_id) {
          try {
            const rf = await getStockRefillRequest(r.related_refill_id);
            if (alive) setRefill(rf);
          } catch {
            /* linked request unavailable — show without items */
          }
        }
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
        <p className="text-sm font-semibold text-slate-600">Storage request not found</p>
        <button
          type="button"
          onClick={() => navigate('/stocking/storage-requests')}
          className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-700"
        >
          Back to Storage requests
        </button>
      </div>
    );
  }

  const confirmed = request.status === 'Confirmed';

  const openPreview = () => {
    setPreviewHtml(buildDocHtml(request, refill));
  };

  const downloadOrPrint = () => {
    if (!previewHtml) return;
    const w = window.open('', '_blank');
    if (!w) {
      alert('Please allow pop-ups to export the document as PDF.');
      return;
    }
    w.document.open();
    w.document.write(previewHtml);
    w.document.close();
  };

  const items = refill?.items ?? [];

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="Storage request"
        subtitle={`Inbound storage request #${request.id} — QC results, items and documents`}
        actions={
          <>
            <ButtonGhost onClick={() => navigate('/stocking/storage-requests')}>← Back</ButtonGhost>
            <button type="button" onClick={() => window.location.reload()} title="Refresh" className="rounded-xl border border-slate-300 bg-white p-2 text-sm text-slate-500 transition hover:bg-slate-50">
              ↻
            </button>
          </>
        }
      />

      {/* REQUEST HEADER */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-4 px-[22px] pt-6">
          <div className="flex items-center gap-2.5 text-xs font-semibold text-brand-600">
            <span className="text-lg leading-none">♟</span>
            {request.client}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">●&nbsp;&nbsp;{fmtDateTime(request.created_at)}</div>
          <div className="flex items-center gap-2 text-xs font-medium text-brand-600">
            <span className="text-lg leading-none">📦</span>
            {request.related_refill_id ? (
              <button
                type="button"
                onClick={() => navigate(`/stocking/stock-refill-requests/${request.related_refill_id}`)}
                className="transition hover:text-brand-700 hover:underline"
              >
                Refill request: #{request.related_refill_id}
              </button>
            ) : (
              <span className="text-slate-400">Refill request: —</span>
            )}
          </div>
          <button
            type="button"
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              confirmed ? 'cursor-default bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
            }`}
          >
            ✓ {request.status}
          </button>
        </div>

        {/* COUNT BADGE */}
        <div className="px-[22px] pb-5 pt-4">
          {request.discrepancies ? (
            <span className="inline-block rounded-lg bg-amber-50 px-4 py-2 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">
              ⚠ {request.discrepancies}
            </span>
          ) : (
            <span className="inline-block rounded-lg bg-emerald-50 px-4 py-2 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
              ✓ &nbsp;Count is correct
            </span>
          )}
        </div>

        {/* INVOICE CARD */}
        <div className="mx-[22px] mb-[22px] w-[500px] max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <button type="button" onClick={openPreview} className="flex h-[190px] w-full cursor-pointer items-center justify-center bg-white transition hover:bg-slate-50">
            <div className="h-[170px] w-[220px] scale-[.85] border border-slate-200 p-3 text-[7px] text-slate-500">
              <h3 className="mb-3 text-center text-[11px] font-semibold text-slate-700">Demande de stockage</h3>
              {[...Array(7)].map((_, i) => (
                <div key={i} className="mb-[5px] h-2 border-b border-slate-200" />
              ))}
            </div>
          </button>
          <button
            type="button"
            onClick={openPreview}
            className="flex h-[45px] w-full items-center justify-center gap-2 border-t border-slate-200 bg-white text-[13px] font-semibold text-brand-600 transition hover:bg-slate-50"
          >
            ◉ &nbsp;Preview document
          </button>
        </div>

        {/* ITEMS */}
        <div className="border-t border-slate-100 px-[22px] py-5 text-base font-semibold text-slate-700">Request items:</div>

        {!request.related_refill_id && (
          <div className="mx-[22px] mb-[22px] flex h-[120px] items-center justify-center rounded border border-dashed border-slate-200 text-xs text-slate-400">
            No linked refill request — save a stock refill request with this reference to link its products.
          </div>
        )}

        {request.related_refill_id && items.length === 0 && (
          <div className="mx-[22px] mb-[22px] flex h-[80px] items-center justify-center rounded border border-dashed border-slate-200 text-xs text-slate-400">
            Linked refill request has no items.
          </div>
        )}

        {items.map((it, idx) => (
          <section key={it.id} className="grid grid-cols-1 gap-6 border-t border-slate-100 px-[22px] py-6 odd:bg-slate-50/40 lg:grid-cols-[minmax(0,570px)_1fr]">
            <div className="flex gap-4">
              {it.image_url ? (
                <img src={it.image_url} alt={it.product_name} className="h-[130px] w-[150px] shrink-0 rounded border border-slate-200 object-cover" />
              ) : (
                <div className="flex h-[130px] w-[150px] shrink-0 items-center justify-center rounded border border-slate-200 bg-slate-100 text-3xl">📦</div>
              )}
              <div className="pt-1">
                <div className="max-w-[350px] text-base font-semibold leading-snug text-slate-800">{it.product_name}</div>
                {it.color && (
                  <div className="mt-2 text-sm text-slate-500">
                    Color: <strong className="text-slate-800">{it.color}</strong>
                  </div>
                )}
                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="font-semibold text-brand-600">✓ Passed QC: {it.qty_picked}</div>
                  <div className="text-slate-500">
                    Requested qty: <strong className="text-slate-800">{it.qty_to_request}</strong>
                  </div>
                  <div className="text-slate-500">
                    Unit price: <strong className="text-slate-800">{fmtPrice(it.unit_price)}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* BATCH */}
            <div className="flex flex-col items-center lg:pl-2">
              {(() => {
                const code = refill?.batches?.find((b) => b.position === idx)?.batch_code ?? batchCodeOf(it.id);
                return (
                  <>
                    <div className="flex w-full max-w-[390px]">
                      <div className="flex min-w-[120px] flex-1 items-center justify-center gap-2 border border-slate-200 bg-white py-3 text-[13px] text-slate-600">
                        ▥
                        <span className="text-left text-[10px] leading-[1.35]">
                          Batch
                          <br />
                          code
                          <br />
                          <strong className="text-[12px]">{code}</strong>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const canvas = document.querySelector<HTMLCanvasElement>(`#qr-slot-${it.id} canvas`);
                          printBatchLabel(it.product_name, it.color ?? null, code, request.gid || `SRG-${request.id}`, canvas?.toDataURL('image/png'));
                        }}
                        className="w-[105px] border border-l-0 border-slate-200 bg-white py-3 text-[13px] text-slate-600 transition hover:bg-slate-50"
                      >
                        🖨 Print
                      </button>
                      <button
                        type="button"
                        onClick={() => setDistributions((prev) => ({ ...prev, [it.id]: true }))}
                        disabled={distributions[it.id]}
                        className="w-[130px] border border-l-0 border-slate-200 bg-white px-2 py-3 text-[13px] leading-tight text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                      >
                        ♙ Create
                        <br />
                        distribution
                      </button>
                    </div>
                    <div className="flex h-[100px] w-full max-w-[390px] items-center justify-center border border-t-0 border-slate-200 bg-white text-sm text-slate-400">
                      {distributions[it.id] ? (
                        <span className="inline-flex items-center gap-1.5 rounded bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                          ✓ Distribution created for {code}
                        </span>
                      ) : (
                        <span id={`qr-slot-${it.id}`} className="flex flex-col items-center gap-1" title="Scan for product & supplier">
                          <QRCodeCanvas value={batchUrl(code)} size={64} />
                          <span className="text-[9px] text-slate-400">Scan for product &amp; supplier</span>
                        </span>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </section>
        ))}
      </section>

      {/* DOC PREVIEW MODAL */}
      {previewHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" onClick={() => setPreviewHtml(null)}>
          <div className="flex h-full max-h-[92vh] w-full max-w-[760px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
              <h5 className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand-600" />
                Demande de stockage — REF {request.gid || `SRG-${request.id}`}
              </h5>
              <div className="flex items-center gap-2">
                <button type="button" onClick={downloadOrPrint} className="rounded-lg bg-slate-800 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-slate-900">
                  Open / Save PDF
                </button>
                <button type="button" onClick={() => setPreviewHtml(null)} aria-label="Close" className="text-lg leading-none text-slate-400 transition hover:text-slate-600">
                  ×
                </button>
              </div>
            </div>
            <iframe title="storage-request-preview" srcDoc={previewHtml} className="min-h-0 w-full flex-1 border-0 bg-white" />
          </div>
        </div>
      )}
    </div>
  );
}
