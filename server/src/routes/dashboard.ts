import { Router } from 'express';
import { ah, requireAuth } from '../middleware/auth';
import { Store } from '../store';
import { OrderFull } from '../store/types';

const round = (n: number) => Math.round(n * 100) / 100;
const dayKey = (d: string) => d.slice(0, 10);

export function dashboardRoutes(store: Store): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/', ah(async (req, res) => {
    const role = req.user.role;
    const orders = await store.listOrders({ role, userId: req.user.id });
    const paidOrders = orders.filter((o) => o.payment_status === 'paid');

    const revenue = round(paidOrders.reduce((s, o) => s + Number(o.total), 0));
    const profit = round(paidOrders.reduce((s, o) => s + Number(o.profit), 0));
    const revenueByDay = buildRevenueByDay(orders);

    if (role === 'admin') {
      const users = await store.listUsers();
      const products = await store.listProducts();
      const lowStock = products.filter((p) => p.stock < 20).sort((a, b) => a.stock - b.stock).slice(0, 6);
      res.json({
        success: true,
        data: {
          totals: {
            revenue,
            profit,
            orders: orders.length,
            products: products.length,
            users: users.length,
            customers: users.filter((u) => u.role === 'customer').length,
            sellers: users.filter((u) => u.role === 'seller').length,
            pendingOrders: orders.filter((o) => o.status === 'pending').length,
            lowStock: lowStock.length,
          },
          revenueByDay,
          statusCounts: statusCounts(orders),
          recentOrders: orders.slice(0, 6),
          lowStock: lowStock.map((p) => ({ id: p.id, name: p.name, stock: p.stock, fournisseur_name: p.fournisseur_name, image_url: p.image_url })),
        },
      });
      return;
    }

    if (role === 'customer') {
      const available = await store.listProducts({ activeOnly: true });
      const unpaid = orders.filter((o) => o.payment_status === 'unpaid');
      res.json({
        success: true,
        data: {
          totals: {
            orders: orders.length,
            revenue,
            profit,
            unpaidOrders: unpaid.length,
            unpaidAmount: round(unpaid.reduce((s, o) => s + Number(o.total), 0)),
            availableProducts: available.length,
            delivered: orders.filter((o) => o.status === 'delivered').length,
          },
          revenueByDay,
          statusCounts: statusCounts(orders),
          recentOrders: orders.slice(0, 6),
        },
      });
      return;
    }

    // fournisseur
    const products = await store.listProducts({ fournisseurId: req.user.id });
    const lowStock = products.filter((p) => p.stock < 20).sort((a, b) => a.stock - b.stock).slice(0, 6);
    res.json({
      success: true,
      data: {
        totals: {
          products: products.length,
          stockUnits: products.reduce((s, p) => s + p.stock, 0),
          orders: orders.length,
          pendingConfirmations: orders.filter((o) => o.status === 'pending' || o.status === 'confirmed').length,
          revenue,
          profit,
          lowStock: lowStock.length,
        },
        revenueByDay,
        statusCounts: statusCounts(orders),
        recentOrders: orders.slice(0, 6),
        lowStock: lowStock.map((p) => ({ id: p.id, name: p.name, stock: p.stock, image_url: p.image_url })),
      },
    });
  }));

  return router;
}

function statusCounts(orders: OrderFull[]) {
  return ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].reduce<Record<string, number>>((acc, s) => {
    acc[s] = orders.filter((o) => o.status === s).length;
    return acc;
  }, {});
}

function buildRevenueByDay(orders: OrderFull[]) {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days.map((day) => ({
    day: day.slice(5), // MM-DD
    value: round(
      orders
        .filter((o) => o.payment_status === 'paid' && dayKey(new Date(o.created_at).toISOString()) === day)
        .reduce((s, o) => s + Number(o.total), 0)
    ),
  }));
}
