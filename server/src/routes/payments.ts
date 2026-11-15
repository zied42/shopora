import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { ah, requireAuth, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/error';
import { flouciGeneratePayment, flouciVerifyPayment } from '../services/flouci';
import { Store } from '../store';

const verifySchema = z.object({ order_id: z.number().int().positive() });

export function paymentRoutes(store: Store): Router {
  const router = Router();
  router.use(requireAuth, requireRole('customer', 'dropshipper'));

  router.post('/orders/:id(\\d+)/flouci', ah(async (req, res) => {
    if (!env.FLOUCI_PUBLIC_KEY || !env.FLOUCI_SECRET_KEY) {
      res.status(503).json({ success: false, error: 'Flouci test credentials are not configured on the server' });
      return;
    }
    const id = Number(req.params.id);
    const order = await store.getOrder(id);
    if (!order) { res.status(404).json({ success: false, error: 'Order not found' }); return; }
    if (order.dropshipper_id !== req.user.id) {
      res.status(403).json({ success: false, error: 'You can only pay for your own orders' }); return;
    }
    if (order.payment_method !== 'flouci' || order.payment_status === 'paid') {
      res.status(409).json({ success: false, error: 'This order is not awaiting a Flouci payment' }); return;
    }
    if (order.status !== 'pending') {
      res.status(409).json({ success: false, error: 'Send the order to the chef before paying' }); return;
    }

    const prior = await store.getOrderPaymentAttempt(id);
    if (prior?.status === 'pending' && prior.amount_millimes === Math.round(order.total * 1000)) {
      const previousCheck = await flouciVerifyPayment(`${env.FLOUCI_PUBLIC_KEY}:${env.FLOUCI_SECRET_KEY}`, prior.payment_id);
      if (previousCheck.status === 'PENDING') {
        res.json({ success: true, data: { status: 'pending', payment_url: prior.link, payment_id: prior.payment_id } });
        return;
      }
      if (previousCheck.status === 'SUCCESS') {
        if (!previousCheck.success || previousCheck.developer_tracking_id !== prior.tracking_id || previousCheck.amount !== prior.amount_millimes) {
          res.status(409).json({ success: false, error: 'Verified payment details do not match this order' }); return;
        }
        await store.updateOrderPaymentAttemptStatus(prior.payment_id, 'paid');
        await store.updatePayment(order.id, 'paid');
        res.json({ success: true, data: { status: 'paid' } });
        return;
      }
      if (previousCheck.status === 'EXPIRED' || previousCheck.status === 'FAILURE' || previousCheck.status === 'SYSTEM_FAILURE') {
        await store.updateOrderPaymentAttemptStatus(prior.payment_id, previousCheck.status === 'EXPIRED' ? 'expired' : 'failed');
      } else {
        res.status(409).json({ success: false, error: 'The previous payment is still being processed; check its status before starting another session' }); return;
      }
    }

    const trackingId = randomUUID();
    const result = await flouciGeneratePayment(`${env.FLOUCI_PUBLIC_KEY}:${env.FLOUCI_SECRET_KEY}`, {
      amount: order.total,
      developerTrackingId: trackingId,
      successLink: `${env.WEB_BASE_URL}/payment/result?order_id=${id}`,
      failLink: `${env.WEB_BASE_URL}/payment/result?order_id=${id}&cancelled=1`,
      sessionTimeoutSecs: 1200,
    });
    if (!result.link) throw new Error('Flouci did not return a payment link');
    await store.saveOrderPaymentAttempt({
      order_id: id,
      payment_id: result.payment_id,
      tracking_id: trackingId,
      amount_millimes: Math.round(order.total * 1000),
      link: result.link,
      status: 'pending',
    });
    res.json({ success: true, data: { status: 'pending', payment_url: result.link, payment_id: result.payment_id } });
  }));

  router.post('/flouci/verify', validateBody(verifySchema), ah(async (req, res) => {
    if (!env.FLOUCI_PUBLIC_KEY || !env.FLOUCI_SECRET_KEY) {
      res.status(503).json({ success: false, error: 'Flouci credentials are not configured on the server' }); return;
    }
    const attempt = await store.getOrderPaymentAttempt(req.body.order_id);
    if (!attempt) { res.status(404).json({ success: false, error: 'Payment attempt not found' }); return; }
    const order = await store.getOrder(attempt.order_id);
    if (!order) { res.status(404).json({ success: false, error: 'Order not found' }); return; }
    if (order.dropshipper_id !== req.user.id) {
      res.status(403).json({ success: false, error: 'You cannot verify another customer’s payment' }); return;
    }
    if (order.payment_status === 'paid' && attempt.status === 'paid') {
      res.json({ success: true, data: { status: 'paid' } }); return;
    }

    const verified = await flouciVerifyPayment(`${env.FLOUCI_PUBLIC_KEY}:${env.FLOUCI_SECRET_KEY}`, attempt.payment_id);
    const expectedAmount = Math.round(order.total * 1000);
    if (verified.status === 'SUCCESS') {
      if (!verified.success || verified.developer_tracking_id !== attempt.tracking_id || verified.amount !== attempt.amount_millimes || expectedAmount !== attempt.amount_millimes) {
        res.status(409).json({ success: false, error: 'Verified payment details do not match this order' }); return;
      }
      await store.updateOrderPaymentAttemptStatus(attempt.payment_id, 'paid');
      await store.updatePayment(order.id, 'paid');
      res.json({ success: true, data: { status: 'paid' } });
      return;
    }
    const status = verified.status === 'EXPIRED' ? 'expired' : verified.status === 'FAILURE' || verified.status === 'SYSTEM_FAILURE' ? 'failed' : 'pending';
    await store.updateOrderPaymentAttemptStatus(attempt.payment_id, status);
    res.json({ success: true, data: { status } });
  }));

  return router;
}
