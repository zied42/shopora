import { Router } from 'express';
import { ah } from '../middleware/auth';
import { Store } from '../store';

export function batchRoutes(store: Store): Router {
  const router = Router();
  // Public — scanned QR codes must work without logging in
  router.get('/:code', ah(async (req, res) => {
    const code = String(req.params.code ?? '').trim();
    if (!code) {
      res.status(400).json({ success: false, error: 'Batch code is required' });
      return;
    }
    const rows = await store.getBatchesByCode(code);
    if (rows.length === 0) {
      res.status(404).json({ success: false, error: 'Batch not found' });
      return;
    }
    const first = rows[0];
    res.json({
      success: true,
      data: {
        batch_code: first.batch_code,
        product_name: first.product_name,
        color: first.color,
      },
    });
  }));

  return router;
}
