import * as XLSX from 'xlsx';
import { Order } from './api';

export function exportOrdersToExcel(orders: Order[], filename = 'orders.xlsx') {
  const rows = orders.map((o, i) => ({
    '#': i + 1,
    'Order': o.order_number,
    'Date': new Date(o.created_at).toLocaleString(),
    'Customer': o.customer_name ?? '',
    'Phone': o.customer_phone ?? '',
    'Address': o.shipping_address ?? '',
    'Supplier': o.fournisseur_name,
    'Items': o.items.map((it) => `${it.product_name} x${it.quantity}`).join(', '),
    'Total': o.total,
    'Cost': o.total_cost,
    'Profit': o.profit,
    'Status': o.status,
    'Payment': o.payment_status,
    'Method': o.payment_method ?? '',
    'Tracking': o.tracking.map((t) => `${t.carrier ?? ''} ${t.tracking_number ?? ''}`).join(' / '),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Orders');

  // quick auto-width
  const cols = Object.keys(rows[0] ?? {}).map((k) => ({
    wch: Math.max(k.length, ...rows.map((r) => String(r[k as keyof typeof r] ?? '').length).slice(0, 60), 12),
  }));
  ws['!cols'] = cols;

  XLSX.writeFile(wb, filename);
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