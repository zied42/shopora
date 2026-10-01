function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function batchCodeOf(itemId: number): string {
  return `#${73000 + itemId}`;
}

export function printBatchLabel(productName: string, color: string | null, code: string, storageRef: string, qrDataUrl?: string): void {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Batch label ${esc(code)}</title><style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#eef1f4;padding:24px;display:flex;flex-direction:column;align-items:center;gap:16px}
.toolbar{display:flex;gap:10px}
.printbtn{background:#111827;color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.25)}
.closebtn{background:#fff;color:#475569;border:1px solid #cbd5e1;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:600;cursor:pointer}
.label{width:300px;border:2px solid #222;border-radius:8px;padding:14px 16px;text-align:center;background:#fff}
.label .brand{font-size:10px;font-weight:700;letter-spacing:1px;color:#555;text-transform:uppercase;margin-bottom:6px}
.label h1{font-size:26px;letter-spacing:1.5px;margin-bottom:4px}
.label .product{font-size:12px;color:#333;margin-bottom:2px}
.label .color{font-size:11px;color:#777;margin-bottom:8px}
.label img.qr,.label .barcode{margin:6px auto 4px}
.barcode{height:46px;background:repeating-linear-gradient(90deg,#111 0 2px,transparent 2px 4px,#111 4px 5px,transparent 5px 9px,#111 9px 12px,transparent 12px 14px)}
.label .ref{font-size:9px;color:#999}
@media print{body{background:#fff;padding:0}.toolbar{display:none}.label{border-width:1px}}
</style></head><body>
<div class="toolbar">
  <button class="printbtn" onclick="window.print()">🖨 Print label</button>
  <button class="closebtn" onclick="window.close()">Close</button>
</div>
<div class="label">
  <div class="brand">Stock Management — Batch</div>
  <h1>${esc(code)}</h1>
  <div class="product">${esc(productName)}</div>
  ${color ? `<div class="color">Color: ${esc(color)}</div>` : ''}
  ${qrDataUrl ? `<img class="qr" src="${qrDataUrl}" width="92" height="92" alt="QR ${esc(code)}">` : '<div class="barcode"></div>'}
  <div class="ref">${esc(storageRef)}</div>
</div>
</body></html>`;
  const w = window.open('', '_blank', 'width=420,height=520');
  if (!w) {
    alert('Please allow pop-ups to print the batch label.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
