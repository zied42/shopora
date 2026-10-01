import { Order } from './api';

function csvCell(value: unknown): string {
  let text = String(value ?? '');
  // Spreadsheet applications may interpret cells beginning with these characters as formulas.
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function exportOrdersToCsv(orders: Order[], filename = 'orders.csv') {
  const headers = ['#', 'Order', 'Date', 'Customer', 'Phone', 'Address', 'Supplier', 'Items', 'Total', 'Cost', 'Profit', 'Status', 'Payment', 'Method', 'Tracking'];
  const rows = orders.map((o, i) => [
    i + 1, o.order_number, new Date(o.created_at).toLocaleString(), o.customer_name ?? '', o.customer_phone ?? '',
    o.shipping_address ?? '', o.fournisseur_name, o.items.map((it) => `${it.product_name} x${it.quantity}`).join(', '),
    o.total, o.total_cost, o.profit, o.status, o.payment_status, o.payment_method ?? '',
    o.tracking.map((t) => `${t.carrier ?? ''} ${t.tracking_number ?? ''}`).join(' / '),
  ]);
  const csv = '\uFEFF' + [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace(/\.(xlsx|xls)$/i, '.csv');
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadText(filename: string, text: string, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
