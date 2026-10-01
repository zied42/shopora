import { Router } from 'express';
import { ah, requireAuth, requireRole } from '../middleware/auth';
import { Store } from '../store';
import { logStaffActivity } from '../lib/staffActivity';

export function confirmateurRoutes(store: Store): Router {
  const router = Router();
  router.use(requireAuth);
  router.use(requireRole('admin'));

  router.get('/pending', ah(async (_req, res) => {
    const orders = await store.raw<{
      id: number; order_number: string; dropshipper_name: string; customer_name: string;
      total: number; status: string; created_at: string; item_count: number;
    }>(`
      SELECT o.id, o.order_number, u.name AS dropshipper_name, o.customer_name,
        o.total, o.status, o.created_at,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
      FROM orders o
      JOIN users u ON u.id = o.dropshipper_id
      WHERE o.status = 'pending'
      ORDER BY o.id ASC
    `);
    res.json({ success: true, data: orders });
  }));

  router.post('/confirm/:id', ah(async (req, res) => {
    const orderId = Number(req.params.id);
    const updated = await store.scanOrder(orderId, 'confirm', req.user.id);
    logStaffActivity(store, req.user, {
      activity_type: 'order_confirm',
      label: `Confirmed commande #${orderId}`,
      ref_id: orderId,
      quantity: 1,
    });
    res.json({ success: true, data: updated });
  }));

  router.get('/dashboard', ah(async (_req, res) => {
    const stats = await store.raw<{
      total_confirmed: number; today_confirmed: number; unique_confirmateurs: number;
      unique_dropshippers: number; by_confirmateur: Array<{ name: string; count: number }>;
      recent: Array<{
        id: number; order_number: string; dropshipper_name: string; customer_name: string;
        total: number; confirmed_by_name: string; confirmed_at: string;
      }>;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM orders WHERE status IN ('confirmed','shipped','delivered')) AS total_confirmed,
        (SELECT COUNT(*) FROM orders WHERE status IN ('confirmed','shipped','delivered') AND DATE(confirmed_at) = CURDATE()) AS today_confirmed,
        (SELECT COUNT(DISTINCT confirmed_by) FROM orders WHERE confirmed_by IS NOT NULL) AS unique_confirmateurs,
        (SELECT COUNT(DISTINCT dropshipper_id) FROM orders WHERE status IN ('confirmed','shipped','delivered')) AS unique_dropshippers
    `);
    const byConfirmateur = await store.raw<Array<{ name: string; count: number }>>(`
      SELECT u.name, COUNT(*) AS count
      FROM orders o JOIN users u ON u.id = o.confirmed_by
      WHERE o.confirmed_by IS NOT NULL AND o.status IN ('confirmed','shipped','delivered')
      GROUP BY o.confirmed_by ORDER BY count DESC
    `);
    const recent = await store.raw<Array<{
      id: number; order_number: string; dropshipper_name: string; customer_name: string;
      total: number; confirmed_by_name: string; confirmed_at: string;
    }>>(`
      SELECT o.id, o.order_number, u.name AS dropshipper_name, o.customer_name, o.total,
        c.name AS confirmed_by_name, o.confirmed_at
      FROM orders o
      JOIN users u ON u.id = o.dropshipper_id
      LEFT JOIN users c ON c.id = o.confirmed_by
      WHERE o.confirmed_by IS NOT NULL AND o.status IN ('confirmed','shipped','delivered')
      ORDER BY o.confirmed_at DESC LIMIT 20
    `);
    res.json({ success: true, data: { ...stats[0], by_confirmateur: byConfirmateur, recent } });
  }));

  router.get('/my-dashboard', ah(async (req, res) => {
    const uid = req.user.id;
    const stats = await store.raw<{
      my_confirmed: number; my_today: number;
    }>(`
      SELECT
        COUNT(*) AS my_confirmed,
        SUM(CASE WHEN DATE(confirmed_at) = CURDATE() THEN 1 ELSE 0 END) AS my_today
      FROM orders WHERE confirmed_by = ? AND status IN ('confirmed','shipped','delivered')
    `, [uid]);
    const recent = await store.raw<Array<{
      id: number; order_number: string; dropshipper_name: string; customer_name: string;
      total: number; confirmed_at: string;
    }>>(`
      SELECT o.id, o.order_number, u.name AS dropshipper_name, o.customer_name, o.total, o.confirmed_at
      FROM orders o JOIN users u ON u.id = o.dropshipper_id
      WHERE o.confirmed_by = ? AND o.status IN ('confirmed','shipped','delivered')
      ORDER BY o.confirmed_at DESC LIMIT 20
    `, [uid]);
    res.json({ success: true, data: { ...stats[0], recent } });
  }));

  return router;
}
