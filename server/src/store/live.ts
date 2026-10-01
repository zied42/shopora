export interface SupplierLiveCounts {
  added: number;
  activeProducts: number;
  warehouses: number;
  subscriptions: number;
}

export interface OnboardingChip {
  label: string;
  ok: boolean;
}

export function buildLiveSupplierOnboarding(c: SupplierLiveCounts): OnboardingChip[] {
  const added = Math.max(0, Math.floor(c.added));
  const active = Math.max(0, Math.floor(c.activeProducts));
  const warehouses = Math.max(0, Math.floor(c.warehouses));
  const subscriptions = Math.max(0, Math.floor(c.subscriptions));
  return [
    { label: 'Active', ok: true },
    { label: `Has ${added} added products`, ok: added > 0 },
    { label: `Has ${active} active products`, ok: active > 0 },
    { label: 'Has packing material', ok: warehouses > 0 },
    { label: `Has ${warehouses} active warehouses`, ok: warehouses > 0 },
    { label: 'Has active subscriptions', ok: subscriptions > 0 },
  ];
}

function familyOf(label: string): string {
  if (label === 'Active') return 'active';
  return label.replace(/^Has \d+ /i, 'Has ').toLowerCase();
}

export function supplierOnboardingHas(chips: OnboardingChip[], status: string): boolean {
  const family = familyOf(status);
  return chips.some((c) => familyOf(c.label) === family && c.ok);
}