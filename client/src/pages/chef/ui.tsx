import { useState } from 'react';
import type { ReactNode } from 'react';

/* ── avatars ──────────────────────────────────────────────────────────── */

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

const AVATAR_TONES = [
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
];

export function avatarTone(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

export function Avatar({ name, size = 'h-8 w-8 text-[10px]', img }: { name: string; size?: string; img?: string | null }) {
  const label = name && name !== '—' ? name : 'U';
  if (img) {
    return (
      <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${size}`}>
        <img src={img} alt={label} className="h-full w-full object-cover" loading="lazy" />
      </span>
    );
  }
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${size} ${avatarTone(label)}`}>
      {initials(label)}
    </span>
  );
}

/** Deterministic short org code like Falcon's LZ118 / FV711 / YW254. */
export function codeFor(seed: string): string {
  let h = 7;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const n = (h % 900) + 100;
  return letters[h % 26] + letters[(h >> 5) % 26] + n;
}

export function premiumTone(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 2 === 0 ? { icon: '⚡', cls: 'bg-emerald-500' } : { icon: '👑', cls: 'bg-amber-500' };
}

/* ── org / people cells ───────────────────────────────────────────────── */

export function OrgCell({ name, code, seed }: { name: string | null; code: string; seed: string }) {
  if (!name) {
    return (
      <div style={{ width: 200 }} className="flex items-center">
        <span className="text-slate-300">—</span>
      </div>
    );
  }
  const tone = premiumTone(seed);
  return (
    <div style={{ width: 200 }}>
      <div className="flex items-center">
        <div className="relative shrink-0">
          <Avatar name={name} size="h-16 w-16 text-base border-2 border-slate-300" />
          <span
            className={`absolute -bottom-0.5 -left-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[9px] leading-none text-white ring-2 ring-white ${tone.cls}`}
          >
            {tone.icon}
          </span>
          <span className="absolute -right-1 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-[8px] leading-none text-white ring-2 ring-white">
            🏪
          </span>
          <span className="absolute -bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-[8px] leading-none text-white ring-2 ring-white">
            🪂
          </span>
        </div>
        <div className="ms-2 flex flex-col">
          <a href="/#" onClick={(e) => e.preventDefault()} className="mb-0 px-1 text-[11px] font-semibold leading-tight text-slate-900">
            {name}
          </a>
          <a href="/#" onClick={(e) => e.preventDefault()} className="ms-2 mt-0.5 text-[10px] text-sky-600">
            {code}
          </a>
        </div>
      </div>
    </div>
  );
}

export function PersonRow({ name }: { name: string }) {
  return (
    <div className="flex items-center pe-2">
      <Avatar name={name} size="h-9 w-9 text-[10px]" />
      <div className="ms-2 flex flex-col leading-snug">
        <span className="whitespace-nowrap text-[11px] font-semibold text-slate-800">{name}</span>
        <a href="/#" onClick={(e) => e.preventDefault()} className="mt-0.5 text-[10px] text-sky-600">
          Filter by
        </a>
      </div>
    </div>
  );
}

export function People({ names }: { names: string[] }) {
  if (!names.length) return <span className="text-slate-300">—</span>;
  return (
    <div className="flex flex-col">
      {names.map((n) => (
        <PersonRow key={n} name={n} />
      ))}
    </div>
  );
}

/* ── value helpers ────────────────────────────────────────────────────── */

export function slot(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function dateOnly(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function clockSlot(iso: string | null) {
  if (!iso) return null;
  return <span className="text-[11px] tabular-nums text-slate-800">{slot(iso)}</span>;
}

export function tnd(n: number | null): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n) + ' TND';
}

export function Pill({ children, cls }: { children: ReactNode; cls: string }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>{children}</span>;
}

export function variationRows(v: string | null): ReactNode {
  if (!v) return null;
  const parts = v.split(': ');
  if (parts.length === 2) {
    return (
      <div className="flex flex-col whitespace-nowrap">
        <div className="flex">
          <span className="mr-1 text-[10px] capitalize text-slate-400">{parts[0]}:</span>
          <span className="text-[10px] text-slate-700">{parts[1]}</span>
        </div>
      </div>
    );
  }
  return <span className="truncate text-[10px] text-slate-400">{v}</span>;
}

export function tileBg(emoji: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><rect width='40' height='40' fill='white'/><text x='20' y='27' font-size='18' text-anchor='middle'>${emoji}</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/* ── icons ────────────────────────────────────────────────────────────── */

export type Icon = { className?: string };

export function PhoneIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M164.9 24.6c-7.7-18.6-28-28.5-47.4-23.2l-88 24C12.1 30.2 0 46 0 64C0 311.4 200.6 512 448 512c18 0 33.8-12.1 38.6-29.5l24-88c5.3-19.4-4.6-39.7-23.2-47.4l-96-40c-16.3-6.8-35.2-2.1-46.3 11.6L304.7 368C234.3 334.7 177.3 277.7 144 207.3L193.3 167c13.7-11.2 18.4-30 11.6-46.3l-40-96z" />
    </svg>
  );
}

export function SearchIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352c79.5 0 144-64.5 144-144s-64.5-144-144-144S64 128.5 64 208s64.5 144 144 144z" />
    </svg>
  );
}

export function RotateIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="11" height="11" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M105.1 202.6c7.7-21.8 20.2-42.3 37.8-59.8c62.5-62.5 163.8-62.5 226.3 0L386.3 160H336c-17.7 0-32 14.3-32 32s14.3 32 32 32H463.5c0 0 0 0 0 0h.4c17.7 0 32-14.3 32-32V64c0-17.7-14.3-32-32-32s-32 14.3-32 32v51.2L414.4 97.6c-87.5-87.5-229.3-87.5-316.8 0C73.2 122 55.6 150.7 44.8 181.4c-5.9 16.7 2.9 34.9 19.5 40.8s34.9-2.9 40.8-19.5zM39 289.3c-5 1.5-9.8 4.2-13.7 8.2c-4 4-6.7 8.8-8.1 14c-.3 1.2-.6 2.5-.8 3.8c-.3 1.7-.4 3.4-.4 5.1V448c0 17.7 14.3 32 32 32s32-14.3 32-32V396.9l17.6 17.5 0 0c87.5 87.4 229.3 87.4 316.7 0c24.4-24.4 42.1-53.1 52.9-83.7c5.9-16.7-2.9-34.9-19.5-40.8s-34.9 2.9-40.8 19.5c-7.7 21.8-20.2 42.3-37.8 59.8c-62.5 62.5-163.8 62.5-226.3 0l-.1-.1L125.6 352H176c17.7 0 32-14.3 32-32s-14.3-32-32-32H48.4c-1.6 0-3.2 .1-4.8 .3s-3.1 .5-4.6 1z" />
    </svg>
  );
}

export function FunnelIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M3.9 54.9C10.5 40.9 24.5 32 40 32H472c15.5 0 29.5 8.9 36.1 22.9s4.6 30.5-5.2 42.5L320 320.9V448c0 12.1-6.8 23.2-17.7 28.6s-23.8 4.3-33.5-3l-64-48c-8.1-6-12.8-15.5-12.8-25.6V320.9L9 97.3C-.7 85.4-2.8 68.8 3.9 54.9z" />
    </svg>
  );
}

export function TableColumnsIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M0 96C0 60.7 28.7 32 64 32H448c35.3 0 64 28.7 64 64V416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V96zm64 64V416H224V160H64zm384 0H288V416H448V160z" />
    </svg>
  );
}

export function EyeIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 576 512" fill="currentColor" aria-hidden="true">
      <path d="M288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4C142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C433.5 68.8 368.8 32 288 32zM432 256c0 79.5-64.5 144-144 144s-144-64.5-144-144s64.5-144 144-144s144 64.5 144 144zM288 192c0 35.3-28.7 64-64 64c-11.5 0-22.3-3-31.6-8.4c-.2 2.8-.4 5.5-.4 8.4c0 53 43 96 96 96s96-43 96-96s-43-96-96-96c-2.8 0-5.6 .1-8.4 .4c5.3 9.3 8.4 20.1 8.4 31.6z" />
    </svg>
  );
}

export function ClockIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="11" height="11" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M256 512C114.6 512 0 397.4 0 256S114.6 0 256 0S512 114.6 512 256s-114.6 256-256 256zM232 120V256c0 8 4 15.5 10.7 20l96 64c11 7.4 25.9 4.4 33.3-6.7s4.4-25.9-6.7-33.3L280 243.2V120c0-13.3-10.7-24-24-24s-24 10.7-24 24z" />
    </svg>
  );
}

export function TruckIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="11" height="11" viewBox="0 0 640 512" fill="currentColor" aria-hidden="true">
      <path d="M48 0C21.5 0 0 21.5 0 48V368c0 26.5 21.5 48 48 48H64c0 53 43 96 96 96s96-43 96-96H384c0 53 43 96 96 96s96-43 96-96h32c17.7 0 32-14.3 32-32s-14.3-32-32-32V288 256 237.3c0-17-6.7-33.3-18.7-45.3L512 114.7c-12-12-28.3-18.7-45.3-18.7H416V48c0-26.5-21.5-48-48-48H48zM416 160h50.7L544 237.3V256H416V160zM208 416c0 26.5-21.5 48-48 48s-48-21.5-48-48s21.5-48 48-48s48 21.5 48 48zm272 48c-26.5 0-48-21.5-48-48s21.5-48 48-48s48 21.5 48 48s-21.5 48-48 48z" />
    </svg>
  );
}

export function DropboxIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="11" height="11" viewBox="0 0 528 512" fill="currentColor" aria-hidden="true">
      <path d="M264.4 116.3l-132 84.3 132 84.3-132 84.3L0 284.1l132.3-84.3L0 116.3 132.3 32l132.1 84.3zM131.6 395.7l132-84.3 132 84.3-132 84.3-132-84.3zm132.8-111.6l132-84.3-132-83.6L395.7 32 528 116.3l-132.3 84.3L528 284.8l-132.3 84.3-131.3-85z" />
    </svg>
  );
}

export function InfoIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0S0 114.6 0 256s114.6 256 256 256zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-144c-17.7 0-32-14.3-32-32s14.3-32 32-32s32 14.3 32 32s-14.3 32-32 32z" />
    </svg>
  );
}

export function XmarkIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
      <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z" />
    </svg>
  );
}

export function CheckIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true">
      <path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z" />
    </svg>
  );
}

export function HeartCrackIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M47.6 300.4L228.3 469.1c7.5 7 17.4 10.9 27.7 10.9s20.2-3.9 27.7-10.9L464.4 300.4c30.4-28.3 47.6-68 47.6-109.5v-5.8c0-69.9-50.5-129.5-119.4-141C347 36.5 300.6 51.4 268 84L256 96 244 84c-32.6-32.6-79-47.5-124.6-39.9C50.5 55.6 0 115.2 0 185.1v5.8c0 41.5 17.2 81.2 47.6 109.5zM105.9 248.8l42.9-118.5c2.7-7.5 9.8-12.9 17.7-13.4c1.1-.1 2.2-.1 3.3 0c7.9 .5 15 6 17.7 13.4l24.8 68.6 17.4-17.4c6.9-6.9 18.2-6.9 25.1 0l29.9 29.9-31.6 31.6c-6.8 6.8-17.9 6.9-24.8-.1L144 218.5h-1.6l22.9 30.3z" />
    </svg>
  );
}

export function BoxIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true">
      <path d="M50.7 58.5L0 160H208V32H93.7C75.5 32 58.9 42.3 50.7 58.5zM240 32V160H448L397.3 58.5C389.1 42.3 372.5 32 354.3 32H240zm0 176H0V416c0 35.3 28.7 64 64 64H384c35.3 0 64-28.7 64-64V208H240z" />
    </svg>
  );
}

export function CaretLeftIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 256 512" fill="currentColor" aria-hidden="true">
      <path d="M9.4 278.6c-12.5-12.5-12.5-32.8 0-45.3l128-128c9.2-9.2 22.9-11.9 34.9-6.9s19.8 16.6 19.8 29.6l0 256c0 12.9-7.8 24.6-19.8 29.6s-25.7 2.2-34.9-6.9l-128-128z" />
    </svg>
  );
}

export function MapPinIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="11" height="11" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
      <path d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 256c-35.3 0-64-28.7-64-64s28.7-64 64-64s64 28.7 64 64s-28.7 64-64 64z" />
    </svg>
  );
}

export function HourglassIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
      <path d="M0 32C0 14.3 14.3 0 32 0H352c17.7 0 32 14.3 32 32s-14.3 32-32 32V64c0 35.3-28.7 64-64 64c-6.6 0-13-1-19-3c-8.1-2.6-16.9-2.6-25 0c-6 2-12.4 3-19 3s-13-1-19-3c-8.1-2.6-16.9-2.6-25 0c-6 2-12.4 3-19 3c-35.3 0-64-28.7-64-64V64H32C14.3 64 0 49.7 0 32zM96 128c17.7 0 32-14.3 32-32H64c0 17.7 14.3 32 32 32zM64 384c0-53 43-96 96-96c6.6 0 13 1 19 3c8.1 2.6 16.9 2.6 25 0c6-2 12.4-3 19-3s13 1 19 3c8.1 2.6 16.9 2.6 25 0c6 2 12.4 3 19 3c53 0 96 43 96 96c17.7 0 32 14.3 32 32H64c-17.7 0-32-14.3-32-32s14.3-32 32-32z" />
    </svg>
  );
}

export function BanIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M367.2 412.5L99.5 144.8C77.1 176.1 64 214.5 64 256c0 106 86 192 192 192c41.5 0 79.9-13.1 111.2-35.5zm45.3-45.3C434.9 335.9 448 297.5 448 256c0-106-86-192-192-192c-41.5 0-79.9 13.1-111.2 35.5L412.5 367.2zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256z" />
    </svg>
  );
}

export function FileCircleXmarkIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="11" height="11" viewBox="0 0 576 512" fill="currentColor" aria-hidden="true">
      <path d="M0 64C0 28.7 28.7 0 64 0H224V128c0 17.7 14.3 32 32 32H384v38.6C310.1 219.5 256 287.4 256 368c0 59.1 29.1 111.3 73.7 143.3c-3.6.8-7.5 1.3-11.5 1.3H64c-35.3 0-64-28.7-64-64V64zm384 64H256V0L384 128zm96 112c79.5 0 144 64.5 144 144s-64.5 144-144 144s-144-64.5-144-144s64.5-144 144-144zm59.3-28.7l-45.3 45.3-45.3-45.3c-6.2-6.2-16.4-6.2-22.6 0s-6.2 16.4 0 22.6L507.3 368l-45.3 45.3c-6.2 6.2-6.2 16.4 0 22.6s16.4 6.2 22.6 0l45.3-45.3 45.3 45.3c6.2 6.2 16.4 6.2 22.6 0s6.2-16.4 0-22.6L552.6 368l45.3-45.3c6.2-6.2 6.2-16.4 0-22.6s-16.4-6.2-22.6 0z" />
    </svg>
  );
}

export function FileExcelIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
      <path d="M64 0C28.7 0 0 28.7 0 64V448c0 35.3 28.7 64 64 64H320c35.3 0 64-28.7 64-64V160H256c-17.7 0-32-14.3-32-32V0H64zM256 0V128H384L256 0zM155.7 250.2L192 302.1l36.3-51.9c7.6-10.9 22.6-13.5 33.4-5.9s13.5 22.6 5.9 33.4L221.3 344l46.4 66.2c7.6 10.9 5 25.8-5.9 33.4s-25.8 5-33.4-5.9L192 385.8l-36.3 51.9c-7.6 10.9-22.6 13.5-33.4 5.9s-13.5-22.6-5.9-33.4L162.7 344l-46.4-66.2c-7.6-10.9-5-25.8 5.9-33.4s25.8-5 33.4 5.9z" />
    </svg>
  );
}

export function SortIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="9" height="9" viewBox="0 0 320 512" fill="currentColor" aria-hidden="true">
      <path d="M137.4 41.4c12.5-12.5 32.8-12.5 45.3 0l128 128c9.2 9.2 11.9 22.9 6.9 34.9s-16.6 19.8-29.6 19.8H32c-12.9 0-24.6-7.8-29.6-19.8s-2.2-25.7 6.9-34.9l128-128zm0 429.3l-128-128c-9.2-9.2-11.9-22.9-6.9-34.9s16.6-19.8 29.6-19.8H288c12.9 0 24.6 7.8 29.6 19.8s2.2 25.7-6.9 34.9l-128 128c-12.5 12.5-32.8 12.5-45.3 0z" />
    </svg>
  );
}

/* ── shared page widgets ──────────────────────────────────────────────── */

export function ThContent({ funnel, sort, label, center, end, title }: { funnel?: boolean; sort?: boolean; label: string; center?: boolean; end?: boolean; title?: string }) {
  return (
    <div className={`flex items-center gap-1 ${center ? 'justify-center' : ''} ${end ? 'justify-end' : ''}`}>
      {funnel && (
        <button type="button" className="me-1 inline-flex items-center p-1 text-[11px] font-semibold text-slate-900 transition hover:text-slate-700">
          <FunnelIcon className="mr-1 text-sky-600" />
          {label}
        </button>
      )}
      {!funnel && <span>{label}</span>}
      {sort && (
        <span title={title ?? 'Toggle SortBy'} className="inline-flex cursor-pointer text-sky-600">
          <SortIcon />
        </span>
      )}
    </div>
  );
}

export function FilterOverlay({ pos, width = 300, onClose, children }: { pos: { left: number; top: number }; width?: number; onClose: () => void; children: ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 max-w-[calc(100vw-24px)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
        style={{ left: pos.left, top: pos.top, width }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>
  );
}

export function CheckRow({ checked, onChange, disabled, children }: { checked: boolean; onChange: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <label className="flex w-full cursor-pointer items-center rounded px-2 py-0.5 hover:bg-slate-50">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} className="h-3.5 w-3.5 accent-brand-600" />
      {children}
    </label>
  );
}

/* ── follow-up status menu ───────────────────────────────────────────── */

export const FOLLOW_UP_STATUSES = [
  'Called',
  'Recall',
  'Busy',
  'Unreachable',
  'Not Qualified',
  'Follow Up',
  'Face to Face Meeting',
  'Online Meeting',
] as const;

export const FOLLOW_UP_TONES: Record<string, string> = {
  Called: 'from-sky-500 to-sky-700',
  Recall: 'from-cyan-400 to-cyan-600',
  Busy: 'from-amber-400 to-amber-600',
  Unreachable: 'from-amber-400 to-amber-600',
  'Not Qualified': 'from-rose-400 to-rose-600',
  'Follow Up': 'from-slate-400 to-slate-600',
  'Face to Face Meeting': 'from-emerald-400 to-emerald-600',
  'Online Meeting': 'from-emerald-400 to-emerald-600',
};

const FOLLOW_UP_WIDTH = 252;

export function FollowUpMenu({ pos, onClose, onPick }: { pos: { left: number; top: number }; onClose: () => void; onPick?: (s: string) => void }) {
  return (
    <>
      <div className="fixed inset-0 z-[60]" onClick={onClose} />
      <div
        className="fixed z-[70] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        style={{ left: pos.left, top: pos.top, width: FOLLOW_UP_WIDTH }}
        onClick={(e) => e.stopPropagation()}
      >
        {FOLLOW_UP_STATUSES.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              onPick?.(s);
              onClose();
            }}
            className={`block w-full bg-gradient-to-b py-2 text-left text-[11px] font-bold text-white transition hover:opacity-90 ${
              FOLLOW_UP_TONES[s] ?? 'from-slate-400 to-slate-600'
            } ${i === 0 ? 'rounded-t-xl' : ''} ${i === FOLLOW_UP_STATUSES.length - 1 ? 'rounded-b-xl' : ''}`}
            style={{ paddingLeft: 12, paddingRight: 12 }}
          >
            {s}
          </button>
        ))}
      </div>
    </>
  );
}

export function FollowUpStatusButton({ children, onPick }: { children: ReactNode; onPick?: (s: string) => void }) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPos((cur) =>
      cur ? null : { left: Math.max(8, Math.min(rect.right - FOLLOW_UP_WIDTH, window.innerWidth - FOLLOW_UP_WIDTH - 8)), top: rect.top }
    );
  };
  return (
    <>
      <button
        type="button"
        onClick={toggle}
        className="inline-flex items-center gap-1 rounded px-1 py-0.5 transition hover:bg-slate-100 focus:outline-none"
      >
        {children}
        <span className="text-[8px] text-slate-400">▼</span>
      </button>
      {pos && <FollowUpMenu pos={pos} onClose={() => setPos(null)} onPick={onPick} />}
    </>
  );
}

/* ── "Select Label" dropdown (seller organizations) ──────────────────── */

export type SellerLabelItem = { name: string; tone: 'success' | 'warning' | 'info' | 'danger' | 'primary' };

const SELLER_LABEL_TONES: Record<SellerLabelItem['tone'], string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
  info: 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100',
  danger: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100',
  primary: 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100',
};

export function SellerLabelsMenu({
  pos,
  labels,
  selected,
  onToggle,
  onCreate,
  onClose,
}: {
  pos: { left: number; top: number };
  labels: SellerLabelItem[];
  selected: string[];
  onToggle: (name: string) => void;
  onCreate: (name: string) => void;
  onClose: () => void;
}) {
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState('');

  const submit = () => {
    const name = draft.trim();
    if (!name) return;
    onCreate(name);
    setDraft('');
    setCreating(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-[60]" onClick={onClose} />
      <div
        className="fixed z-[70] flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        style={{ left: pos.left, top: pos.top, width: 400, maxHeight: 'calc(100vh - 16px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h6 className="mb-0 px-3 pt-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Select Label</h6>
        <hr className="mx-0 my-1 border-slate-200" />
        <div className="grid max-h-[380px] grid-cols-2 content-start gap-2 overflow-y-auto px-3 py-2">
          {labels.map((l) => {
            const on = selected.includes(l.name);
            return (
              <button
                key={`${l.tone}-${l.name}`}
                type="button"
                onClick={() => onToggle(l.name)}
                className={`inline-flex min-w-0 items-center justify-start gap-1 rounded border px-2 py-1 text-left text-[10px] font-semibold transition ${SELLER_LABEL_TONES[l.tone]} ${
                  on ? 'ring-2 ring-inset ring-slate-800' : ''
                }`}
              >
                {on && <CheckIcon className="shrink-0" />}
                <span className="truncate">{l.name}</span>
              </button>
            );
          })}
        </div>
        <hr className="mx-0 my-1 border-slate-200" />
        <div className="px-3 pb-3">
          {creating ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submit();
                }}
                placeholder="New label name..."
                className="w-full rounded border border-slate-300 px-2 py-1 text-[11px] outline-none focus:border-slate-500"
              />
              <button type="button" onClick={submit} className="shrink-0 rounded bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-slate-700">
                Add
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="block w-full rounded border border-slate-400 py-1 text-center text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Create label
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/* ── "Add a note" modal ──────────────────────────────────────────────── */

export function AddNoteModal({ onClose }: { onClose: () => void }) {
  const [note, setNote] = useState('');
  const [reminder, setReminder] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl" role="document">
        <div className="flex items-center justify-between bg-gradient-to-b from-slate-100 to-slate-50 px-4 py-3">
          <h5 className="mb-0 text-sm font-bold text-slate-900">Add a note</h5>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-400 transition hover:text-slate-600">
            <XmarkIcon />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onClose();
          }}
          className="space-y-3 px-4 py-4"
        >
          <div>
            <label className="text-xs font-semibold text-slate-900">Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={5}
              placeholder="Write a note..."
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800 outline-none transition focus:border-sky-400"
            />
          </div>
          <label className="flex cursor-pointer items-start gap-2 text-[11px] text-slate-600">
            <input
              type="checkbox"
              checked={reminder}
              onChange={(e) => setReminder(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 accent-sky-600"
            />
            <span>
              Set note with reminder tag <span className="text-slate-400">(will show an icon in organizations table)</span>
            </span>
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-sky-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-sky-700"
          >
            Create note
          </button>
        </form>
      </div>
    </div>
  );
}

const ROW_SIZES = [5, 10, 20, 50, 1000];

export function Pagination({ page, setPage, pageSize, setPageSize, total }: { page: number; setPage: (n: number) => void; pageSize: number; setPageSize: (n: number) => void; total: number }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages - 1);
  const from = total === 0 ? 0 : current * pageSize + 1;
  const to = Math.min(total, (current + 1) * pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
      <div className="flex items-center text-xs text-slate-600">
        <p className="mb-0 mr-2 whitespace-nowrap">Rows per page:</p>
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(0);
          }}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 outline-none focus:border-brand-500"
        >
          {ROW_SIZES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <p className="mb-0 ml-2 whitespace-nowrap text-[11px] text-slate-500">
          Showing: {from} to {to} of {total}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPage(Math.max(0, current - 1))}
          disabled={current === 0}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <button
          onClick={() => setPage(Math.min(totalPages - 1, current + 1))}
          disabled={current >= totalPages - 1}
          className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

/* ── carrier logos (hotlinked like Falcon) ────────────────────────────── */

const CARRIER_URLS: Record<string, string> = {
  aram: 'https://falkor-cdn.babbar.tech/images/companies/logos/aramex-logo.png',
  shipper: 'https://falkor-cdn.babbar.tech/images/companies/logos/shipper-logo.svg',
  intigo: 'https://falkor-cdn.babbar.tech/images/companies/logos/intigo-logo.png',
  xdelivery: 'https://falkor-cdn.babbar.tech/images/companies/logos/x-delivery-logo.webp',
  first: 'https://falkor-cdn.babbar.tech/images/companies/logos/first-delivery-logo.png',
  abm: 'https://falkor-cdn.babbar.tech/images/companies/logos/abm-delivery-logo.jpg',
  jax: 'https://falkor-cdn.babbar.tech/images/companies/logos/jax-delivery-logo.png',
  goodex: 'https://falkor-cdn.babbar.tech/images/companies/logos/goodex-logo.png',
  lazajella: '/zajella.png',
};

export function CarrierLogo({ logo, height, className = '' }: { logo: string | null; height: number; className?: string }) {
  if (!logo) return <span className="text-slate-300">—</span>;
  const src = CARRIER_URLS[logo] ?? null;
  if (!src) return <span className="text-[11px] font-semibold text-slate-700">{logo}</span>;
  return (
    <img
      src={src}
      alt="carrier"
      style={{ height }}
      className={`inline-block max-w-[70px] object-contain ${className}`}
      loading="lazy"
    />
  );
}