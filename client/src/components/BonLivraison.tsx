import { useEffect, useRef } from 'react';
import Barcode from 'react-barcode';
import QRCode from 'qrcode';
import { money, Order } from '../lib/api';

const companyInfo =
  'Sarf Capital Social 1 000 000DT MF 1609221Y/A/M/000\nAdresse : N°39 rue 8601, zone industrielle Charguia 1 -\nTunis 2035.\nSite de transport terrestre de tous produits non réglementés\npour le compte d\'autrui.';

export function BonLivraison({ order }: { order: Order }) {
  const barcode = order.barcode ?? '';
  const today = new Date().toISOString().split('T')[0];
  const from = order.governorate ?? 'Tunis';
  const to = order.city ?? order.governorate ?? 'Tunisie';
  const addr = [order.shipping_address, order.city, order.governorate].filter(Boolean).join(' ');
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!qrRef.current) return;
    const el = qrRef.current;
    el.innerHTML = '';
    let cancelled = false;
    QRCode.toDataURL(order.order_number || ' ', { width: 125, margin: 0 }).then((url) => {
      if (cancelled || !el) return;
      const img = document.createElement('img');
      img.src = url;
      img.style.width = '125px';
      img.style.height = '125px';
      el.appendChild(img);
    });
    return () => { cancelled = true; el.innerHTML = ''; };
  }, [order.order_number]);

  return (
    <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: '#111' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; padding: 20px; background: #f5f5f5; font-family: Arial, Helvetica, sans-serif; color: #111; }
        .bl-page { width: 210mm; min-height: 297mm; margin: auto; background: white; padding: 12mm; box-shadow: 0 0 8px rgba(0,0,0,0.2); }
        .bl-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
        .bl-first-logo { font-size: 42px; font-weight: 900; font-style: italic; color: #55ad48; line-height: 35px; }
        .bl-delivery { font-size: 12px; letter-spacing: 5px; color: #333; }
        .bl-company-info { text-align: center; font-size: 8px; color: #555; max-width: 650px; white-space: pre-line; }
        .bl-date { text-align: center; font-size: 11px; font-weight: bold; margin: 8px 0; }
        .bl-title-row { display: flex; align-items: center; justify-content: space-between; gap: 15px; margin-top: 5px; }
        .bl-title { border: 1px solid #ddd; padding: 9px 20px; flex: 1; text-align: center; font-size: 21px; font-weight: bold; }
        .bl-barcode-box { width: 250px; text-align: center; }
        .bl-barcode-number { font-size: 19px; margin-top: 3px; letter-spacing: 1px; }
        .bl-sender { border: 1px solid #ccc; margin-top: 12px; display: grid; grid-template-columns: 190px 1fr; font-size: 11px; }
        .bl-sender-left { padding: 9px; border-right: 1px solid #ccc; }
        .bl-sender-right { padding: 9px; }
        .bl-sender-bottom { grid-column: 1 / -1; border-top: 1px solid #ccc; padding: 8px; }
        .bl-shopora-section { margin-top: 18px; display: flex; align-items: center; justify-content: center; gap: 35px; }
        .bl-shopora-logo { width: 180px; text-align: center; }
        .bl-shopora-logo-main { color: #202b8c; font-size: 34px; font-weight: 900; letter-spacing: 3px; }
        .bl-shopora-logo-sub { color: #555; font-size: 11px; margin-top: 5px; }
        .bl-qr-container { text-align: center; }
        .bl-scan-text { font-size: 10px; font-weight: bold; margin-top: 4px; letter-spacing: 1px; }
        .bl-route { text-align: center; font-size: 21px; font-weight: bold; margin: 5px 0 12px; }
        .bl-destination { display: grid; grid-template-columns: 45% 55%; border: 1px solid #ccc; font-size: 11px; }
        .bl-destination-title { font-weight: bold; margin-bottom: 5px; }
        .bl-destination > div { padding: 7px; }
        .bl-table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
        .bl-table th, .bl-table td { border: 1px solid #ccc; padding: 7px; }
        .bl-table th { text-align: left; font-weight: bold; }
        .bl-table td:nth-child(2), .bl-table td:nth-child(3), .bl-table th:nth-child(2), .bl-table th:nth-child(3) { text-align: center; }
        .bl-lower { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 15px; }
        .bl-box { border: 1px solid #ccc; height: 75px; padding: 9px; font-size: 12px; }
        .bl-arabic { direction: rtl; text-align: right; font-size: 9px; line-height: 1.7; margin-top: 10px; }
        .bl-footer { margin-top: 15px; border-top: 1px solid #ddd; padding-top: 10px; text-align: right; }
        .bl-footer-first { color: #55ad48; font-size: 27px; font-weight: bold; font-style: italic; }
        .bl-center-barcode { text-align: center; margin-top: 8px; }
        @media print {
          body { background: white; padding: 0; }
          .bl-page { box-shadow: none; margin: 0; width: 210mm; min-height: 297mm; }
        }
      `}</style>

      <div className="bl-page">

        <div className="bl-header">
          <div>
            <div className="bl-first-logo">FIRST</div>
            <div className="bl-delivery">DELIVERY</div>
          </div>
          <div className="bl-company-info">{companyInfo}</div>
        </div>

        <div className="bl-date">
          Date : {today}
        </div>

        <div className="bl-title-row">
          <div className="bl-title">
            BON DE LIVRAISON N° {barcode}
          </div>
          <div className="bl-barcode-box">
            <Barcode value={barcode} format="CODE128" height={45} width={1.8} margin={0} displayValue={false} />
            <div className="bl-barcode-number">
              {barcode}
            </div>
          </div>
        </div>

        <div className="bl-sender">
          <div className="bl-sender-left">
            <b>Nom de l'expéditeur:</b> {order.fournisseur_name ?? 'N/A'}<br />
            <b>Adresse:</b> {[order.city, order.governorate].filter(Boolean).join(', ') || 'Tunisie'}
          </div>
          <div className="bl-sender-right">
            <b>Téléphone:</b> {order.customer_phone ?? '00000000'}
          </div>
          <div className="bl-sender-bottom">
            <b>Matricule Fiscal / CIN:</b> {order.dropshipper_cin ?? '—'}
            <br />(conformément à la circulaire de la présidence du gouvernement
            n° 2019-8 du 25/02/2019)
          </div>
        </div>

        <div className="bl-shopora-section">
          <div className="bl-shopora-logo">
            <div className="bl-shopora-logo-main">shopora</div>
            <div className="bl-shopora-logo-sub">Platform</div>
          </div>
          <div className="bl-qr-container">
            <div ref={qrRef} />
            <div className="bl-scan-text">SCAN TO VERIFY</div>
          </div>
        </div>

        <div className="bl-center-barcode">
          <Barcode value={barcode} format="CODE128" height={43} width={1.8} margin={0} displayValue={false} />
          <div style={{ fontSize: 18, marginTop: 3 }}>
            {barcode}
          </div>
        </div>

        <div className="bl-route">
          {from} &gt;&gt; ---- Dispatch ---- &gt;&gt; {to}
        </div>

        <div className="bl-destination">
          <div>
            <div className="bl-destination-title">
              NOM DE DESTINATAIRE:
            </div>
            {order.customer_name ?? 'Client'}<br />
            <b>Téléphone:</b> {order.customer_phone ?? '—'}
          </div>
          <div>
            <div className="bl-destination-title">
              ADRESSE:
            </div>
            {addr || 'Tunisie'}
          </div>
        </div>

        <table className="bl-table">
          <thead>
            <tr>
              <th>Désignation-Contenu du colis</th>
              <th>Quantité</th>
              <th>Montant TTC</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it) => (
              <tr key={it.id}>
                <td>{it.product_name ?? 'Product'} ×{it.quantity}</td>
                <td>{it.quantity}</td>
                <td>{money(it.price * it.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ textAlign: 'center', fontSize: 10, marginTop: 8 }}>
          Dont TVA 7%
        </div>

        <div className="bl-lower">
          <div className="bl-box"><b>Instructions diverses :</b></div>
          <div className="bl-box"><b>Signature expéditeur:</b></div>
        </div>

        <div className="bl-arabic">
          <b>شروط وأحكام التوصيل</b>
          <p>يلتزم الطرفان باحترام جميع الشروط المتعلقة بعملية النقل
          والتوصيل وتسليم الطرود إلى أصحابها.</p>
          <p>في حالة عدم تسلم الطرد أو رفضه، يتم التعامل معه وفقا للإجراءات
          المعتمدة من طرف شركة التوصيل.</p>
          <p>جميع المعلومات الواردة في هذا السند تعتبر جزءا من عملية
          التوصيل ويجب المحافظة عليها.</p>
          <p>يتحمل المستلم مسؤولية التأكد من سلامة المنتج عند الاستلام.</p>
          <p>الإمضاء عند الاستلام يعتبر موافقة على حالة الطرد.</p>
        </div>

        <div className="bl-footer">
          <div className="bl-footer-first">FIRST</div>
          <div style={{ fontSize: 9 }}>DELIVERY</div>
        </div>

      </div>
    </div>
  );
}
