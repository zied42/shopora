import { Router } from 'express';
import { ah, requireAuth, requireRole } from '../middleware/auth';
import { Store } from '../store';
import { computeStaffStats } from '../services/staffStats';

/** Staff-only helpers (support/admin/chef) used to create commandes on behalf of dropshippers. */
export function staffRoutes(store: Store): Router {
  const router = Router();
  router.use(requireAuth, requireRole('admin'));

  router.get('/dropshippers', ah(async (_req, res) => {
    const users = (await store.listUsers()).filter((u) => u.role === 'customer');
    res.json({ success: true, data: users });
  }));

  router.get('/dropshippers/:id(\\d+)/products', ah(async (req, res) => {
    const user = await store.findUserById(Number(req.params.id));
    if (!user || user.role !== 'customer') {
      res.status(404).json({ success: false, error: 'Dropshipper not found' });
      return;
    }
    const saved = await store.listSavedProducts(user.id);
    res.json({ success: true, data: saved });
  }));

  // ---- Staff team dashboard ----
  router.get('/dashboard/overview', requireRole('admin'), ah(async (_req, res) => {
    const staff = await store.listStaffUsers();
    const activities = await store.listStaffActivity({ limit: 50000 });
    const stats = computeStaffStats(staff, activities);
    const roleTotals = stats.reduce<Record<string, { members: number; actions: number; avgScore: number }>>((acc, s) => {
      const r = acc[s.role] ?? { members: 0, actions: 0, avgScore: 0 };
      r.members += 1;
      r.actions += s.total_actions;
      r.avgScore += s.overall_score;
      acc[s.role] = r;
      return acc;
    }, {});
    for (const r of Object.values(roleTotals)) {
      if (r.members > 0) r.avgScore = Math.round(r.avgScore / r.members);
    }
    res.json({ success: true, data: { members: stats, role_totals: roleTotals, generated_at: new Date().toISOString() } });
  }));

  router.get('/dashboard/:userId(\\d+)', requireRole('admin'), ah(async (req, res) => {
    const userId = Number(req.params.userId);
    const staff = await store.listStaffUsers();
    const person = staff.find((s) => s.id === userId);
    if (!person) {
      res.status(404).json({ success: false, error: 'Staff member not found' });
      return;
    }
    const activities = await store.listStaffActivity({ userId, limit: 1000 });
    const stats = computeStaffStats([person], activities)[0];
    const timeline = await store.listStaffActivity({ userId, limit: 100 });
    res.json({ success: true, data: { stats, timeline } });
  }));

  return router;
}
