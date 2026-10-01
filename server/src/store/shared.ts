import { DbOrder, OrderItem } from './types';

const round2 = (n: number) => Math.round(n * 100) / 100;

export { round2 };

export function computeOrder(base: DbOrder, items: Pick<OrderItem, 'quantity' | 'price' | 'cost'>[]): DbOrder {
  const total = round2(items.reduce((s, i) => s + i.price * i.quantity, 0));
  const total_cost = round2(items.reduce((s, i) => s + i.cost * i.quantity, 0));
  return { ...base, total, total_cost, profit: round2(total - total_cost) };
}

export function computeOrderFromItems(
  base: Omit<DbOrder, 'total' | 'total_cost' | 'profit'>,
  items: Pick<OrderItem, 'quantity' | 'price' | 'cost'>[]
): Pick<DbOrder, 'total' | 'total_cost' | 'profit'> {
  const total = round2(items.reduce((s, i) => s + i.price * i.quantity, 0));
  const total_cost = round2(items.reduce((s, i) => s + i.cost * i.quantity, 0));
  return { total, total_cost, profit: round2(total - total_cost) };
}

export function makeOrderNumber(id: number): string {
  return `D42-${String(1000 + id)}`;
}

export function normName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function resolveWholesalePrice(tiers: { min: number; max: number; price: number }[] | undefined | null, quantity: number): number | null {
  if (!tiers || tiers.length === 0) return null;
  const tier = tiers.find((t) => quantity >= t.min && quantity <= t.max);
  return tier ? tier.price : null;
}

/** "Winning product" trend score: most confirmed + created orders, fewest returns, high rating, more suppliers, high profit. */
export function productTrendScore(created: number, confirmed: number, returns: number, rating: number, offers: number, profit: number): number {
  return round2(confirmed * 3 + created * 1 + rating + offers * 1.5 - returns * 2 + Math.min(profit / 25, 5));
}

/** Supplier offer score: activity (products + orders), confirmed orders, rating, profit, minus returns. */
export function supplierOfferScore(created: number, confirmed: number, returns: number, rating: number, profit: number, totalProducts: number): number {
  return round2(confirmed * 2 + created * 1 + rating * 0.8 - returns * 2 + Math.min(profit / 25, 4) + Math.min(totalProducts * 0.5, 3));
}

/** Recommended (rating + orders + fewer returns) — the NLP comment-sentiment hook will be added here later. */
export function recommendedSortScore(p: { rating: number; rating_count: number; created?: number; returns?: number }): number {
  return round2(p.rating * 3 + Math.min(p.rating_count, 50) * 0.1 + (p.created ?? 0) * 0.6 - (p.returns ?? 0) * 2);
}

export interface InventoryFreeSpace {
  id: number;
  name: string;
  capacity: number;
  used: number;
}

export interface MissingForAllocation {
  product_id: number;
  product_name: string;
  quantity: number;
}

export interface AllocationStep {
  inventory_id: number;
  inventory_name: string;
  product_id: number;
  product_name: string;
  quantity: number;
}

export interface AllocationOutcome {
  allocations: AllocationStep[];
  leftover: MissingForAllocation[];
}

/**
 * Fill missing quantities into the lowest-id inventory that still has free space,
 * one location at a time (capacity - used). Example: inventory A has 1 free unit,
 * inventory B is empty, missing 4 → 1 goes to A, 3 go to B.
 */
export function allocateMissingIntoInventories(missing: MissingForAllocation[], spaces: InventoryFreeSpace[]): AllocationOutcome {
  const free = spaces
    .map((s) => ({ id: s.id, name: s.name, free: Math.max(0, s.capacity - s.used) }))
    .sort((a, b) => a.id - b.id);
  const allocations: AllocationStep[] = [];
  const leftover: MissingForAllocation[] = [];

  for (const item of missing) {
    let remaining = item.quantity;
    let placed = 0;
    for (const slot of free) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, slot.free);
      if (take > 0) {
        allocations.push({ inventory_id: slot.id, inventory_name: slot.name, product_id: item.product_id, product_name: item.product_name, quantity: take });
        slot.free -= take;
        remaining -= take;
        placed += take;
      }
    }
    if (remaining > 0) leftover.push({ product_id: item.product_id, product_name: item.product_name, quantity: remaining });
    if (placed > 0) {
      // ensure a deterministic ordering of allocations per product
      allocations.sort((a, b) => (a.product_id - b.product_id) || (a.inventory_id - b.inventory_id));
    }
  }

  return { allocations, leftover };
}