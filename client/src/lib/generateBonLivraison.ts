import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Order, money } from './api';

function drawBarcode(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setFillColor(0, 0, 0);
  let cx = x;
  const barWidths = [4, 2, 5, 3, 4, 2, 6, 3, 4, 2, 5, 3, 4, 2, 6, 3, 4, 2, 5, 3, 4, 2, 6, 3, 4, 2, 5, 3];
  const spaceWidths = [3, 2, 4, 2, 3, 2, 4, 2, 3, 2, 4, 2, 3, 2, 4, 2, 3, 2, 4, 2, 3, 2, 4, 2, 3, 2, 4, 2];
  for (let i = 0; i < barWidths.length && cx < x + w; i++) {
    const bw = barWidths[i % barWidths.length];
    doc.rect(cx, y, Math.min(bw, x + w - cx), h, 'F');
    cx += bw;
    if (cx < x + w) cx += spaceWidths[i % spaceWidths.length];
  }
}

export async function generateBonLivraison(order: Order): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const margin = 12;
  const contentW = pageW - margin * 2;

  const qrDataUrl = await QRCode.toDataURL(order.barcode ?? order.order_number, { width: 125, margin: 0, color: { dark: '#000', light: '#fff' } });

  // ── Header ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(85, 173, 72);
  doc.text('FIRST', margin, 22);
  doc.setFontSize(10);
  doc.setTextColor(51, 51, 51);
  doc.text('DELIVERY', margin, 28);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(85, 85, 85);
  doc.text('Sarf Capital Social 1 000 000DT MF 1609221Y/A/M/000', pageW / 2, 17, { align: 'center' });
  doc.text('Adresse : N°39 rue 8601, zone industrielle Charguia 1 - Tunis 2035.', pageW / 2, 20, { align: 'center' });
  doc.text("Site de transport terrestre de tous produits non réglementés pour le compte d'autrui.", pageW / 2, 23, { align: 'center' });
  doc.setDrawColor(200);
  doc.line(margin, 30, pageW - margin, 30);

  // ── Date ──
  const today = new Date().toISOString().split('T')[0];
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(`Date : ${today}`, pageW / 2, 37, { align: 'center' });

  // ── Title row ──
  const titleY = 43;
  doc.setDrawColor(200);
  doc.rect(margin, titleY, contentW - 65, 14);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`BON DE LIVRAISON N° ${order.barcode ?? order.order_number}`, pageW / 2 - 32, titleY + 9.5, { align: 'center' });
  const barcodeValue = order.barcode ?? order.order_number;
  drawBarcode(doc, pageW - margin - 55, titleY + 1, 55, 7);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.text(barcodeValue, pageW - margin - 27.5, titleY + 12, { align: 'center' });

  // ── Sender ──
  const senderY = 62;
  const senderLeftW = 55;
  doc.rect(margin, senderY, senderLeftW, 18);
  doc.rect(margin + senderLeftW, senderY, contentW - senderLeftW, 18);
  doc.rect(margin, senderY + 18, contentW, 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text("Nom de l'expéditeur:", margin + 3, senderY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(order.fournisseur_name || 'N/A', margin + 3, senderY + 10);
  doc.setFont('helvetica', 'bold');
  doc.text('Adresse:', margin + 3, senderY + 15);
  doc.setFont('helvetica', 'normal');
  doc.text([order.city, order.governorate].filter(Boolean).join(', ') || 'Tunisie', margin + 25, senderY + 15);
  doc.setFont('helvetica', 'bold');
  doc.text('Téléphone:', margin + senderLeftW + 3, senderY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text(order.customer_phone ?? '00000000', margin + senderLeftW + 28, senderY + 5);
  doc.setFont('helvetica', 'bold');
  doc.text('Matricule Fiscal / CIN:', margin + 3, senderY + 24);
  doc.setFont('helvetica', 'normal');
  doc.text(order.dropshipper_cin ?? '—', margin + 42, senderY + 24);
  doc.setFontSize(5.5);
  doc.text('(conformément à la circulaire de la présidence du gouvernement n° 2019-8 du 25/02/2019)', margin + 3, senderY + 28);

  // ── SHOPORA + QR ──
  const BRAND_Y = 100;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(32, 43, 140);
  doc.text('SHOPORA', margin + 28, BRAND_Y);
  doc.setFontSize(9);
  doc.setTextColor(85, 85, 85);
  doc.text('Platform', margin + 28, BRAND_Y + 6);
  doc.addImage(qrDataUrl, 'PNG', pageW - margin - 39, BRAND_Y - 14, 33, 33);

  // ── Barcode under QR ──
  const barY = BRAND_Y + 24;
  drawBarcode(doc, pageW / 2 - 40, barY, 80, 6);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0);
  doc.text(barcodeValue, pageW / 2, barY + 10, { align: 'center' });

  // ── Route ──
  const routeY = barY + 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  const from = order.governorate ?? 'Tunis';
  const to = order.city ?? order.governorate ?? 'Tunis';
  doc.text(`${from} >>> Dispatch >>> ${to}`, pageW / 2, routeY, { align: 'center' });

  // ── Destination ──
  const destY = routeY + 8;
  const destLeftW = contentW * 0.45;
  doc.setDrawColor(200);
  doc.rect(margin, destY, destLeftW, 18);
  doc.rect(margin + destLeftW, destY, contentW - destLeftW, 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('NOM DE DESTINATAIRE:', margin + 3, destY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(order.customer_name ?? 'Client', margin + 3, destY + 10);
  doc.setFontSize(8);
  doc.text(`Téléphone: ${order.customer_phone ?? '—'}`, margin + 3, destY + 15);
  doc.setFont('helvetica', 'bold');
  doc.text('ADRESSE:', margin + destLeftW + 3, destY + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const addr = [order.shipping_address, order.city, order.governorate].filter(Boolean).join(' ');
  doc.text(addr || 'Tunisie', margin + destLeftW + 3, destY + 11, { maxWidth: contentW - destLeftW - 6 });

  // ── Product table ──
  const tableY = destY + 24;
  const col1W = contentW * 0.55;
  const col2W = contentW * 0.2;
  const col3W = contentW * 0.25;
  const rowH = 8;

  doc.setFillColor(245, 245, 245);
  doc.rect(margin, tableY, col1W, rowH, 'FD');
  doc.rect(margin + col1W, tableY, col2W, rowH, 'FD');
  doc.rect(margin + col1W + col2W, tableY, col3W, rowH, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(0);
  doc.text('Désignation-Contenu du colis', margin + 3, tableY + 5.5);
  doc.text('Quantité', margin + col1W + col2W / 2, tableY + 5.5, { align: 'center' });
  doc.text('Montant TTC', margin + col1W + col2W + col3W / 2, tableY + 5.5, { align: 'center' });

  let currentRowY = tableY + rowH;
  for (const item of order.items) {
    doc.rect(margin, currentRowY, col1W, rowH);
    doc.rect(margin + col1W, currentRowY, col2W, rowH);
    doc.rect(margin + col1W + col2W, currentRowY, col3W, rowH);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(item.product_name ?? 'Product', margin + 3, currentRowY + 5.5, { maxWidth: col1W - 6 });
    doc.text(String(item.quantity), margin + col1W + col2W / 2, currentRowY + 5.5, { align: 'center' });
    doc.text(money(item.price * item.quantity), margin + col1W + col2W + col3W / 2, currentRowY + 5.5, { align: 'center' });
    currentRowY += rowH;
  }

  // ── TVA + Lower boxes ──
  currentRowY += 4;
  doc.setFontSize(6);
  doc.setTextColor(85);
  doc.text(`Dont TVA 7% —`, pageW / 2, currentRowY, { align: 'center' });
  currentRowY += 6;

  const boxH = 18;
  const boxGap = 15;
  const boxW = (contentW - boxGap) / 2;
  doc.setDrawColor(200);
  doc.rect(margin, currentRowY, boxW, boxH);
  doc.rect(margin + boxW + boxGap, currentRowY, boxW, boxH);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0);
  doc.text('Instructions diverses :', margin + 3, currentRowY + 6);
  doc.text('Signature expéditeur:', margin + boxW + boxGap + 3, currentRowY + 6);

  // ── Arabic terms ──
  const arabicY = currentRowY + boxH + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(0);
  doc.text('شروط وأحكام التوصيل', pageW - margin, arabicY, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(60);
  const arabicTerms = [
    'يلتزم الطرفان باحترام جميع الشروط المتعلقة بعملية النقل والتوصيل وتسليم الطرود إلى أصحابها.',
    'في حالة عدم تسلم الطرد أو رفضه، يتم التعامل معه وفقا للإجراءات المعتمدة من طرف شركة التوصيل.',
    'جميع المعلومات الواردة في هذا السند تعتبر جزءا من عملية التوصيل ويجب المحافظة عليها.',
    'يتحمل المستلم مسؤولية التأكد من سلامة المنتج عند الاستلام.',
    'الإمضاء عند الاستلام يعتبر موافقة على حالة الطرد.',
  ];
  let ty = arabicY + 5;
  for (const line of arabicTerms) {
    doc.text(line, pageW - margin, ty, { align: 'right', maxWidth: contentW - 20 });
    ty += 4;
  }

  // ── Footer ──
  doc.setDrawColor(200);
  doc.line(margin, pageH - margin - 2, pageW - margin, pageH - margin - 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(85, 173, 72);
  doc.text('FIRST', pageW - margin, pageH - margin - 10, { align: 'right' });
  doc.setFontSize(8);
  doc.setTextColor(51);
  doc.text('DELIVERY', pageW - margin, pageH - margin - 5, { align: 'right' });

  doc.save(`Bon-Livraison-${order.order_number}.pdf`);
}
