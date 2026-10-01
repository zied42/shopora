import { AuthUser } from '../middleware/auth';
import { StaffActivityInput, Store } from '../store';

/** Fields describing the action, minus who performed it. */
export type StaffActivityFields = Omit<StaffActivityInput, 'user_id' | 'user_name' | 'role'>;

const FALLBACK_ROLE_NAME: Record<string, string> = {
  admin: 'Admin',
  chef: 'Chef',
  support: 'Support',
  stocking: 'Stocking',
  confirmateur: 'Confirmateur',
};

/**
 * Fire-and-forget audit of a staff action. Never throws — recording
 * activity must never break the request it is attached to.
 */
export function logStaffActivity(store: Store, user: AuthUser, fields: StaffActivityFields) {
  const role = user.role || ((user as { role?: string }).role as string) || 'staff';
  const input: StaffActivityInput = {
    user_id: user.id,
    user_name: user.name || FALLBACK_ROLE_NAME[role] || 'Staff',
    role,
    ...fields,
  };
  void store.logStaffActivity(input).catch((err) => {
    console.warn('[staff-activity]', (err as Error).message);
  });
}

/** Whole seconds elapsed since `from`, or null when unknown/in the future. */
export function secondsSince(from: string | Date | null | undefined, now = Date.now()): number | null {
  if (!from) return null;
  const ms = now - new Date(from).getTime();
  return Number.isFinite(ms) && ms > 0 ? Math.round(ms / 1000) : null;
}