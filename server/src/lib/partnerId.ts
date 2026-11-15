/** Public partner ID shown between dropshippers and fournisseurs instead of full names.
 *  Dropshipper → DRP-0001, Fournisseur → FRN-0001, staff → USR-0001. */
export function partnerId(role: string, userId: number): string {
  const prefix = role === 'fournisseur' ? 'FRN' : role === 'dropshipper' ? 'DRP' : 'USR';
  return `${prefix}-${String(userId).padStart(4, '0')}`;
}

/** True when the viewer is one of the two market-side roles that must not see the other's name. */
export function isPeerRole(role: string): boolean {
  return role === 'dropshipper' || role === 'fournisseur';
}