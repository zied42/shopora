import { Router } from 'express';
import { ah, requireAuth, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/error';
import { z } from 'zod';
import { Store } from '../store';
import { flouciVerifyPayment } from '../services/flouci';

export async function getFlouciToken(store: Store): Promise<{ token: string }> {
  const cfg = await store.getIntegrationSetting('flouci');
  if (!cfg.enabled) throw new Error('Flouci integration is disabled');
  if (!cfg.api_key || !cfg.api_key.includes(':')) throw new Error('Flouci API keys not configured');
  return { token: cfg.api_key };
}

const linkWalletSchema = z.object({
  identifier: z.string().trim().min(3, 'Enter your Flouci account identifier').max(255),
});

const verifySchema = z.object({
  payment_id: z.string().trim().min(1).max(120),
});

export function flouciRoutes(store: Store): Router {
  const router = Router();

  router.get('/wallet', requireAuth, requireRole('customer'), ah(async (req, res) => {
    const wallet = await store.getFlouciWallet(req.user.id);
    const cfg = await store.getIntegrationSetting('flouci');
    res.json({
      success: true,
      data: {
        wallet,
        integration: { enabled: cfg.enabled, has_key: !!cfg.api_key },
      },
    });
  }));

  router.post('/wallet', requireAuth, requireRole('customer'), validateBody(linkWalletSchema), ah(async (req, res) => {
    const { identifier } = req.body as { identifier: string };
    const cfg = await store.getIntegrationSetting('flouci');
    if (!cfg.enabled || !cfg.api_key) {
      res.status(400).json({ success: false, error: 'Flouci is not active yet' });
      return;
    }
    await store.setFlouciWallet(req.user.id, identifier);
    const wallet = await store.getFlouciWallet(req.user.id);
    res.json({ success: true, data: { wallet } });
  }));

  router.delete('/wallet', requireAuth, requireRole('customer'), ah(async (req, res) => {
    await store.clearFlouciWallet(req.user.id);
    res.json({ success: true, data: { ok: true } });
  }));

  router.get('/payouts', requireAuth, requireRole('customer'), ah(async (req, res) => {
    const [payouts, wallet] = await Promise.all([
      store.listPayoutsForRecipient(req.user.id, 'customer'),
      store.getFlouciWallet(req.user.id),
    ]);
    const cfg = await store.getIntegrationSetting('flouci');
    res.json({
      success: true,
      data: {
        payouts,
        wallet,
        integration: { enabled: cfg.enabled, has_key: !!cfg.api_key },
      },
    });
  }));

  router.post('/payouts/:id(\\d+)/verify', requireAuth, requireRole('admin', 'customer'), ah(async (req, res) => {
    const id = Number(req.params.id);
    const payout = await store.getPayoutById(id);
    if (!payout) {
      res.status(404).json({ success: false, error: 'Payout not found' });
      return;
    }
    if (req.user.role === 'customer' && payout.recipient_id !== req.user.id) {
      res.status(403).json({ success: false, error: 'Not your payout' });
      return;
    }
    if (!payout.flouci_payment_id) {
      res.status(400).json({ success: false, error: 'Payout has no Flouci payment' });
      return;
    }
    const { token } = await getFlouciToken(store);
    const result = await flouciVerifyPayment(token, payout.flouci_payment_id);
    await store.updatePayoutFlouciStatus(id, result.status);
    const updated = await store.getPayoutById(id);
    res.json({ success: true, data: { payout: updated, flouci: result } });
  }));

  router.post('/verify', requireAuth, requireRole('admin'), validateBody(verifySchema), ah(async (req, res) => {
    const { payment_id } = req.body as { payment_id: string };
    const { token } = await getFlouciToken(store);
    const result = await flouciVerifyPayment(token, payment_id);
    res.json({ success: true, data: result });
  }));

  router.post('/webhook', ah(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const paymentId = String(body.payment_id ?? body.PaymentId ?? '');
    if (!paymentId) {
      res.status(400).json({ success: false, error: 'payment_id required' });
      return;
    }
    try {
      const payout = await store.getPayoutByFlouciPaymentId(paymentId);
      if (!payout) {
        res.status(404).json({ success: false, error: 'Unknown payment' });
        return;
      }
      const { token } = await getFlouciToken(store);
      const result = await flouciVerifyPayment(token, paymentId);
      await store.updatePayoutFlouciStatus(payout.id, result.status);
      console.log(`[flouci] webhook payout #${payout.id} → ${result.status}`);
      res.json({ success: true, data: { status: result.status } });
    } catch (err) {
      const message = (err as Error)?.message ?? String(err);
      console.error(`[flouci] webhook error: ${message}`);
      res.status(502).json({ success: false, error: message });
    }
  }));

  return router;
}
