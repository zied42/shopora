import { AVATARS } from './leads';

const OWNER_AVATARS = Object.values(AVATARS).filter(Boolean) as string[];

/** Deterministic demo profile picture for a mock org owner (or null when the owner has no photo). */
export function ownerAvatarFor(name: string): string | null {
  if (!OWNER_AVATARS.length) return null;
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 4 === 0 ? null : OWNER_AVATARS[h % OWNER_AVATARS.length]!;
}