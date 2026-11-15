import { Router } from 'express';
import { z } from 'zod';
import { ah, requireAuth, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/error';
import { Store } from '../store';

const createReservationSchema = z.object({
  product_id: z.number().int().positive(),
  quantity: z.number().int().min(1),
});

const resolveSchema = z.object({
  status: z.enum(['accepted', 'rejected']),
});

const refillSchema = z.object({
  demanded_qty: z.number().int().min(1).optional(),
});

const priceSchema = z.object({
  price: z.number().min(0),
});

const gotSchema = z.object({
  got_qty: z.number().int().min(0),
});

const scanSchema = z.object({
  /** QR value printed for a reservation refill, e.g. RSV-12. */
  code: z.string().min(1),
});

export function reservationRoutes(store: Store): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/', requireRole('dropshipper', 'fournisseur', 'stocking', 'chef', 'admin'), ah(async (req, res) => {
    const reservations = await store.listReservations({ role: req.user.role, userId: req.user.id });
    res.json({ success: true, data: reservations });
  }));

  router.post('/', requireRole('dropshipper'), validateBody(createReservationSchema), ah(async (req, res) => {
    const { reservation, balance } = await store.createReservation({
      dropshipper_id: req.user.id,
      product_id: req.body.product_id,
      quantity: req.body.quantity,
    });
    res.json({ success: true, data: { reservation, balance } });
  }));

  router.patch('/:id(\\d+)/resolve', requireRole('fournisseur'), validateBody(resolveSchema), ah(async (req, res) => {
    // A fournisseur can only resolve reservations on their own products.
    const reservation = await store.resolveReservation(Number(req.params.id), req.body.status, req.user.id);
    res.json({ success: true, data: reservation });
  }));

  router.patch('/:id(\\d+)/price', requireRole('dropshipper'), validateBody(priceSchema), ah(async (req, res) => {
    // A dropshipper sets their own per-unit price on a pending reservation (re-prices the 40% deposit).
    const { reservation, balance } = await store.updateReservationPrice(Number(req.params.id), req.body.price, req.user.id);
    res.json({ success: true, data: { reservation, balance } });
  }));

  router.get('/refill-pickup-list', requireRole('stocking', 'chef', 'admin'), ah(async (_req, res) => {
    const result = await store.getReservationRefillPickupList();
    res.json({ success: true, data: result });
  }));

  router.post('/:id(\\d+)/cancel', requireRole('dropshipper'), ah(async (req, res) => {
    // A dropshipper can only cancel their own reservations.
    const reservation = await store.cancelReservation(Number(req.params.id), req.user.id);
    // The deposit is refunded, so hand the new balance back to keep the client in sync.
    const user = await store.findUserById(req.user.id);
    res.json({ success: true, data: { reservation, balance: Number(user?.balance ?? 0) } });
  }));

  router.post('/:id(\\d+)/refill', requireRole('stocking'), validateBody(refillSchema), ah(async (req, res) => {
    const refill = await store.createReservationRefill(Number(req.params.id), req.body.demanded_qty);
    res.json({ success: true, data: refill });
  }));

  router.patch('/:id(\\d+)/got', requireRole('stocking'), validateBody(gotSchema), ah(async (req, res) => {
    const refill = await store.updateReservationRefill(Number(req.params.id), req.body.got_qty);
    res.json({ success: true, data: refill });
  }));

  router.post('/scan', requireRole('stocking'), validateBody(scanSchema), ah(async (req, res) => {
    const code = String(req.body.code).trim();
    const match = /^RSV-(\d+)$/i.exec(code);
    if (!match) {
      res.status(400).json({ success: false, error: 'This is not a valid reservation refill code.' });
      return;
    }
    const refill = await store.scanReservationRefill(Number(match[1]));
    const reservations = await store.listReservations({ role: 'stocking', userId: req.user.id });
    const reservation = reservations.find((x) => x.id === Number(match[1])) ?? null;
    res.json({ success: true, data: { refill, reservation } });
  }));

  return router;
}