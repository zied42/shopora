import { Router } from 'express';
import { ah, requireAuth, requireRole } from '../middleware/auth';
import { Store } from '../store';
import { logFd, logLz } from '../lib/logger';
import {
  fdCreateOrder,
  fdBulkCreate,
  fdGetLocalities,
  fdGetOrderState,
  fdFilterOrders,
  fdCancelOrders,
  fdCreatePickup,
  fdRequestPrintPickup,
  FdCreateOrderInput,
} from '../services/firstDelivery';
import {
  parseLzCredentials,
  lzCreateColis,
  lzCreateColisBasic,
  lzGetColis,
  lzListColis,
  lzCancelColis,
  lzModifyColis,
  lzPickup,
  lzCities,
  LzColis,
  LzResult,
} from '../services/lazajella';

async function getToken(store: Store, companyId: string): Promise<string> {
  const cfg = await store.getIntegrationSetting(companyId);
  if (!cfg.api_key) throw new Error(`${companyId} API key not configured`);
  return cfg.api_key;
}

const LZ_COMPANY = 'lazajella';

async function getLzAuth(store: Store): Promise<ReturnType<typeof parseLzCredentials>> {
  const cfg = await store.getIntegrationSetting(LZ_COMPANY);
  if (!cfg.api_key) throw new Error(`${LZ_COMPANY} API key not configured`);
  if (!cfg.enabled) throw new Error(`${LZ_COMPANY} integration is disabled`);
  logLz('auth', { uilisateur: cfg.api_key.split(':')[0], hasPass: !!cfg.api_key.includes(':') });
  return parseLzCredentials(cfg.api_key);
}

const FD_STATUS_MAP: Record<number, string> = {
  0: 'en_attente',
  1: 'en_cours',
  2: 'livre',
  3: 'echange',
  5: 'retour_expediteur',
  6: 'supprime',
  7: 'rtn_client_agence',
  8: 'au_magasin',
  11: 'rtn_depôt',
  20: 'a_verifier',
  30: 'retour_recu',
  31: 'rtn_definitif',
  100: 'demande_enlevement',
  101: 'enlevement_assigne',
  102: 'en_cours_enlevement',
  103: 'enleve',
  104: 'enlevement_annule',
  201: 'retour_assigne',
  202: 'retour_en_cours',
  203: 'retour_enleve',
  204: 'retour_annule',
};

export const FD_STATUS_LABELS: Record<string, string> = {
  en_attente: 'En attente',
  en_cours: 'En cours',
  livre: 'Livré',
  echange: 'Échange',
  retour_expediteur: 'Retour expéditeur',
  supprime: 'Supprimé',
  rtn_client_agence: 'Retour client/agence',
  au_magasin: 'Au magasin',
  rtn_depôt: 'Retour dépôt',
  a_verifier: 'À vérifier',
  retour_recu: 'Retour reçu',
  rtn_definitif: 'Retour définitif',
  demande_enlevement: "Demande d'enlèvement",
  enlevement_assigne: "Enlèvement assigné",
  en_cours_enlevement: "En cours d'enlèvement",
  enleve: 'Enlevé',
  enlevement_annule: "Enlèvement annulé",
  retour_assigne: 'Retour assigné',
  retour_en_cours: 'Retour en cours',
  retour_enleve: 'Retour enlevé',
  retour_annule: 'Retour annulé',
};

export function integrationRoutes(store: Store): Router {
  const router = Router();

  router.get('/settings', requireAuth, requireRole('admin'), ah(async (_req, res) => {
    const all = await store.getAllIntegrationSettings();
    const safe: Record<string, { enabled: boolean; has_key: boolean }> = {};
    for (const [k, v] of Object.entries(all)) {
      safe[k] = { enabled: v.enabled, has_key: !!v.api_key };
    }
    res.json({ success: true, data: safe });
  }));

  router.post('/settings', requireAuth, requireRole('admin'), ah(async (req, res) => {
    const { company_id, api_key, enabled } = req.body as { company_id: string; api_key?: string; enabled?: boolean };
    if (!company_id) { res.status(400).json({ success: false, message: 'company_id required' }); return; }
    const current = await store.getIntegrationSetting(company_id);
    await store.setIntegrationSetting(
      company_id,
      api_key !== undefined ? api_key : current.api_key,
      enabled !== undefined ? enabled : current.enabled
    );
    res.json({ success: true, data: { ok: true } });
  }));

  router.post('/first-delivery/localities', requireAuth, requireRole('admin'), ah(async (_req, res) => {
    const token = await getToken(store, 'first-delivery');
    const data = await fdGetLocalities(token);
    res.json({ success: true, data });
  }));

  router.post('/first-delivery/create', requireAuth, requireRole('admin'), ah(async (req, res) => {
    const token = await getToken(store, 'first-delivery');
    const input = req.body as FdCreateOrderInput;
    const data = await fdCreateOrder(token, input);
    res.json({ success: true, data });
  }));

  router.post('/first-delivery/bulk-create', requireAuth, requireRole('admin'), ah(async (req, res) => {
    const token = await getToken(store, 'first-delivery');
    const inputs = req.body as FdCreateOrderInput[];
    if (!Array.isArray(inputs) || inputs.length > 100) {
      res.status(400).json({ success: false, message: 'Max 100 orders at a time' });
      return;
    }
    const data = await fdBulkCreate(token, inputs);
    res.json({ success: true, data });
  }));

  router.post('/first-delivery/etat', requireAuth, requireRole('admin'), ah(async (req, res) => {
    const token = await getToken(store, 'first-delivery');
    const { barCode } = req.body as { barCode: string };
    if (!barCode) { res.status(400).json({ success: false, message: 'barCode required' }); return; }
    const data = await fdGetOrderState(token, barCode);
    res.json({ success: true, data });
  }));

  router.post('/first-delivery/filter', requireAuth, requireRole('admin'), ah(async (req, res) => {
    const token = await getToken(store, 'first-delivery');
    const data = await fdFilterOrders(token, req.body);
    res.json({ success: true, data });
  }));

  router.post('/first-delivery/cancel', requireAuth, requireRole('admin'), ah(async (req, res) => {
    const token = await getToken(store, 'first-delivery');
    const { barCodes } = req.body as { barCodes: string[] };
    if (!Array.isArray(barCodes) || barCodes.length > 100) {
      res.status(400).json({ success: false, message: 'Max 100 barcodes at a time' });
      return;
    }
    const data = await fdCancelOrders(token, barCodes);
    res.json({ success: true, data });
  }));

  router.post('/first-delivery/pickup', requireAuth, requireRole('admin'), ah(async (req, res) => {
    const token = await getToken(store, 'first-delivery');
    const { barCodes } = req.body as { barCodes: string[] };
    if (!Array.isArray(barCodes) || barCodes.length === 0) {
      res.status(400).json({ success: false, message: 'barCodes array required' });
      return;
    }
    const data = await fdCreatePickup(token, barCodes);
    res.json({ success: true, data });
  }));

  router.post('/first-delivery/print/:pickupId', requireAuth, requireRole('admin'), ah(async (req, res) => {
    const token = await getToken(store, 'first-delivery');
    const data = await fdRequestPrintPickup(token, req.params.pickupId);
    res.json({ success: true, data });
  }));

  router.get('/delivery-statuses', requireAuth, ah(async (_req, res) => {
    res.json({ success: true, data: FD_STATUS_LABELS });
  }));

  router.post('/first-delivery/sync-status/:orderId', requireAuth, requireRole('admin'), ah(async (req, res) => {
    const orderId = Number(req.params.orderId);
    const order = await store.getOrder(orderId);
    if (!order) { res.status(404).json({ success: false, message: 'Order not found' }); return; }
    if (!order.delivery_company || order.delivery_company !== 'first-delivery') {
      res.status(400).json({ success: false, message: 'Order is not assigned to First Delivery' }); return;
    }
    const barCode = order.barcode;
    if (!barCode) { res.status(400).json({ success: false, message: 'Order has no barcode' }); return; }
    const token = await getToken(store, 'first-delivery');
    const fdResult = await fdGetOrderState(token, barCode);
    const fdState = (fdResult as { state?: number })?.state;
    logFd('sync_status', { orderId, barCode, fdState });
    if (fdState === undefined || fdState === null) {
      res.json({ success: true, data: { delivery_status: order.delivery_status, fd_state: null } }); return;
    }
    const mapped = FD_STATUS_MAP[fdState] ?? `unknown_${fdState}`;
    await store.setDeliveryStatus(orderId, mapped);
    res.json({ success: true, data: { delivery_status: mapped, fd_state: fdState } });
  }));

  router.post('/first-delivery/dispatch/:orderId', requireAuth, requireRole('admin'), ah(async (req, res) => {
    const orderId = Number(req.params.orderId);
    const order = await store.getOrder(orderId);
    if (!order) { res.status(404).json({ success: false, message: 'Order not found' }); return; }
    if (!order.delivery_company) {
      await store.setDeliveryCompany(orderId, 'first-delivery');
    } else if (order.delivery_company !== 'first-delivery') {
      res.status(400).json({ success: false, message: `Order assigned to ${order.delivery_company}` }); return;
    }
    if (order.barcode) {
      res.json({ success: true, data: { barCode: order.barcode, already_dispatched: true } }); return;
    }
    const token = await getToken(store, 'first-delivery');
    const items = order.items;
    const gov = order.governorate ?? 'Tunis';
    const ville = order.city ?? '';
    const tel = order.customer_phone ?? '00000000';
    const tel2 = order.telephone2 ?? '';
    const clientName = order.customer_name ?? 'Client';
    const addr = [order.shipping_address, ville, gov].filter(Boolean).join(' ');
    const prix = Number(order.total ?? 0);
    const designation = items.map((i) => i.product_name as string).join(', ') || 'Commande';
    const nombreArticle = order.nombre_article != null ? Number(order.nombre_article) : items.reduce((s, i) => s + Number(i.quantity ?? 1), 0);
    const commentaire = order.commentaire ?? items.map((i) => `${i.product_name} x${i.quantity}`).join(', ');
    const input: FdCreateOrderInput = {
      Client: { nom: clientName, locality_id: order.locality_id ?? undefined, gouvernerat: gov, ville, adresse: addr, telephone: tel, telephone2: tel2 || undefined },
      Produit: { prix, designation, nombreArticle, article: designation, commentaire, nombreEchange: order.nombre_echange === 'oui' ? 1 : 0, estFragile: (order.est_fragile as 'oui' | 'non') ?? 'non', ouvrirColis: (order.ouvrir_colis as 'oui' | 'non') ?? 'non' },
    };
    logFd('dispatch_request', { orderId, clientName, gov, ville, tel, prix, designation, nombreArticle, commentaire, estFragile: input.Produit.estFragile, ouvrirColis: input.Produit.ouvrirColis, source: 'api_dispatch' });
    const result = await fdCreateOrder(token, input);
    if (result.isError) {
      logFd('dispatch_error', { orderId, message: result.message, source: 'api_dispatch' });
      res.status(502).json({ success: false, message: String(result.message ?? 'FD API error') }); return;
    }
    const barCode = (result.result as { barCode?: string } | undefined)?.barCode;
    logFd('dispatch_success', { orderId, barCode, message: result.message, source: 'api_dispatch' });
    if (barCode) {
      await store.setDeliveryCompany(orderId, 'first-delivery');
      await store.setOrderBarcode(orderId, barCode);
    }
    res.json({ success: true, data: { barCode, already_dispatched: false } });
  }));

  router.post('/lazajella/test-create', requireAuth, requireRole('admin'), ah(async (req, res) => {
    const auth = await getLzAuth(store);
    const base: LzColis = {
      reference: 'TEST-LZ-001',
      client: 'Test Client API',
      adresse: 'Rue de la Liberté 12',
      gouvernorat: 'Tunis',
      ville: 'Tunis',
      nb_pieces: 1,
      prix: 49.5,
      tel1: '20123456',
      designation: 'Article de test API',
      commentaire: 'Test integration ecommerce',
      echange: 0,
    };
    const body = (req.body ?? {}) as Partial<LzColis>;
    const colis: LzColis = { ...base, ...body };
    logLz('test_create_request', { ...colis });
    const result = await lzCreateColis(auth, colis);
    logLz('test_create_result', { ok: result.ok, status: result.status, message: result.message, data: result.data });
    res.status(result.ok ? 200 : 502).json({ success: result.ok, data: result });
  }));

  router.post('/lazajella/create', requireAuth, requireRole('admin'), ah(async (req, res) => {
    const auth = await getLzAuth(store);
    const colis = req.body as LzColis;
    const result = await lzCreateColis(auth, colis);
    res.status(result.ok ? 200 : 502).json({ success: result.ok, data: result });
  }));

  router.post('/lazajella/detail', requireAuth, requireRole('admin'), ah(async (req, res) => {
    const auth = await getLzAuth(store);
    const { barCode, codeBar } = req.body as { barCode?: string; codeBar?: string };
    const code = barCode ?? codeBar;
    if (!code) { res.status(400).json({ success: false, message: 'barCode required' }); return; }
    const result = await lzGetColis(auth, code);
    res.status(result.ok ? 200 : 502).json({ success: result.ok, data: result });
  }));

  router.post('/lazajella/list', requireAuth, requireRole('admin'), ah(async (req, res) => {
    const auth = await getLzAuth(store);
    const { barCode, codeBar } = req.body as { barCode?: string; codeBar?: string };
    const code = barCode ?? codeBar ?? '';
    const result = await lzListColis(auth, code);
    res.status(result.ok ? 200 : 502).json({ success: result.ok, data: result });
  }));

  router.post('/lazajella/cancel', requireAuth, requireRole('admin'), ah(async (req, res) => {
    const auth = await getLzAuth(store);
    const { barCode, codeBar } = req.body as { barCode?: string; codeBar?: string };
    const code = barCode ?? codeBar;
    if (!code) { res.status(400).json({ success: false, message: 'barCode required' }); return; }
    const result = await lzCancelColis(auth, code);
    res.status(result.ok ? 200 : 502).json({ success: result.ok, data: result });
  }));

  router.post('/lazajella/pickup', requireAuth, requireRole('admin'), ah(async (req, res) => {
    const auth = await getLzAuth(store);
    const result = await lzPickup(auth);
    res.status(result.ok ? 200 : 502).json({ success: result.ok, data: result });
  }));

  router.post('/lazajella/cities', requireAuth, requireRole('admin'), ah(async (_req, res) => {
    const auth = await getLzAuth(store);
    const result = await lzCities(auth);
    res.status(result.ok ? 200 : 502).json({ success: result.ok, data: result });
  }));

  router.post('/lazajella/dispatch/:orderId', requireAuth, requireRole('admin'), ah(async (req, res) => {
    const orderId = Number(req.params.orderId);
    const order = await store.getOrder(orderId);
    if (!order) { res.status(404).json({ success: false, message: 'Order not found' }); return; }
    if (!order.delivery_company) {
      await store.setDeliveryCompany(orderId, LZ_COMPANY);
    } else if (order.delivery_company !== LZ_COMPANY) {
      res.status(400).json({ success: false, message: `Order assigned to ${order.delivery_company}` }); return;
    }
    if (order.barcode) {
      res.json({ success: true, data: { barCode: order.barcode, already_dispatched: true } }); return;
    }
    const auth = await getLzAuth(store);
    const items = order.items;
    const gov = order.governorate ?? 'Tunis';
    const ville = order.city ?? '';
    const colis: LzColis = {
      reference: String(order.order_number ?? `CMD-${orderId}`),
      client: order.customer_name ?? 'Client',
      adresse: [order.shipping_address, ville, gov].filter(Boolean).join(' '),
      gouvernorat: gov,
      ville,
      nb_pieces: order.nombre_article != null ? Number(order.nombre_article) : items.reduce((s, i) => s + Number(i.quantity ?? 1), 0),
      prix: Number(order.total ?? 0),
      tel1: order.customer_phone ?? '00000000',
      tel2: order.telephone2 ?? undefined,
      designation: items.map((i) => i.product_name as string).join(', ') || 'Commande',
      commentaire: order.commentaire ?? undefined,
      echange: order.nombre_echange === 'oui' ? 1 : 0,
    };
    logLz('dispatch_request', { orderId, ...colis, source: 'api_dispatch' });
    const result: LzResult = await lzCreateColis(auth, colis);
    if (!result.ok) {
      logLz('dispatch_error', { orderId, status: result.status, message: result.message, data: result.data, source: 'api_dispatch' });
      res.status(502).json({ success: false, message: `LaZajella API error ${result.status}: ${result.message ?? ''}` }); return;
    }
    const barCode = extractLzBarCode(result.data);
    logLz('dispatch_success', { orderId, barCode, data: result.data, source: 'api_dispatch' });
    if (barCode) {
      await store.setDeliveryCompany(orderId, LZ_COMPANY);
      await store.setOrderBarcode(orderId, barCode);
      await store.setDeliveryStatus(orderId, 'en_attente');
    }
    res.json({ success: true, data: { barCode, already_dispatched: false } });
  }));

  return router;
}

function extractLzBarCode(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (typeof d.barCode === 'string' && d.barCode) return d.barCode;
  if (typeof d.codeBar === 'string' && d.codeBar) return d.codeBar;
  if (typeof d.barcode === 'string' && d.barcode) return d.barcode;
  const str = JSON.stringify(d);
  const m = str.match(/"(?:barCode|codeBar|barcode)"\s*:\s*"([^"]+)"/);
  return m ? m[1] : null;
}
