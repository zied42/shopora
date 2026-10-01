import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { apiErrorMessage, apiGet, ChefTicket, ChefTicketsResult, createChefTicket, createStockingTicket, createSupportTicket } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../../components/ui';
import { useTeamPhotos } from '../../hooks/useTeamPhotos';

function initials(name: string) {
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

function avatarTone(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

function Avatar({ name, size = 'h-8 w-8 text-[10px]', img }: { name: string; size?: string; img?: string | null }) {
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

type Icon = { className?: string };
const eyeSvg = { d: 'M288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4C142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C433.5 68.8 368.8 32 288 32zM432 256c0 79.5-64.5 144-144 144s-144-64.5-144-144s64.5-144 144-144s144 64.5 144 144zM288 192c0 35.3-28.7 64-64 64c-11.5 0-22.3-3-31.6-8.4c-.2 2.8-.4 5.5-.4 8.4c0 53 43 96 96 96s96-43 96-96s-43-96-96-96c-2.8 0-5.6 .1-8.4 .4c5.3 9.3 8.4 20.1 8.4 31.6z' };

function EyeIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 576 512" fill="currentColor" aria-hidden="true">
      <path d={eyeSvg.d} />
    </svg>
  );
}

function FilterIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="9" height="9" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M3.9 54.9C10.5 40.9 24.5 32 40 32H472c15.5 0 29.5 8.9 36.1 22.9s4.6 30.5-5.2 42.5L320 320.9V448c0 12.1-6.8 23.2-17.7 28.6s-23.8 4.3-33.5-3l-64-48c-8.1-6-12.8-15.5-12.8-25.6V320.9L9 97.3C-.7 85.4-2.8 68.8 3.9 54.9z" />
    </svg>
  );
}

function SortIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="9" height="9" viewBox="0 0 320 512" fill="currentColor" aria-hidden="true">
      <path d="M137.4 41.4c12.5-12.5 32.8-12.5 45.3 0l128 128c9.2 9.2 11.9 22.9 6.9 34.9s-16.6 19.8-29.6 19.8H32c-12.9 0-24.6-7.8-29.6-19.8s-2.2-25.7 6.9-34.9l128-128zm0 429.3l-128-128c-9.2-9.2-11.9-22.9-6.9-34.9s16.6-19.8 29.6-19.8H288c12.9 0 24.6 7.8 29.6 19.8s2.2 25.7-6.9 34.9l-128 128c-12.5 12.5-32.8 12.5-45.3 0z" />
    </svg>
  );
}

function CalendarDaysIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true">
      <path d="M128 0c17.7 0 32 14.3 32 32V64H288V32c0-17.7 14.3-32 32-32s32 14.3 32 32V64h48c26.5 0 48 21.5 48 48v48H0V112C0 85.5 21.5 64 48 64H96V32c0-17.7 14.3-32 32-32zM0 192H448V464c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V192zm64 80v32c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16V272c0-8.8-7.2-16-16-16H80c-8.8 0-16 7.2-16 16zm144-16c-8.8 0-16 7.2-16 16v32c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16V272c0-8.8-7.2-16-16-16H208zm112 16v32c0 8.8 7.2 16 16 16h32c8.8 0 16-7.2 16-16V272c0-8.8-7.2-16-16-16H336c-8.8 0-16 7.2-16 16z" />
    </svg>
  );
}

function SearchIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352c79.5 0 144-64.5 144-144s-64.5-144-144-144S64 128.5 64 208s64.5 144 144 144z" />
    </svg>
  );
}

function RotateIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M142.9 142.9c62.2-62.2 162.7-62.5 225.3-1L327 183c-6.9 6.9-8.9 17.2-5.2 26.2s12.5 14.8 22.2 14.8H463.5c13.3 0 24-10.7 24-24V72c0-9.7-5.8-18.5-14.8-22.2s-19.3-1.7-26.2 5.2L413.4 96.6c-87.6-86.5-228.7-86.2-315.8 1C73.2 122 55.6 150.7 44.8 181.4c-5.9 16.7 2.9 34.9 19.5 40.8s34.9-2.9 40.8-19.5c7.7-21.8 20.2-42.3 37.8-59.8zM16 312v7.6.7V440c0 9.7 5.8 18.5 14.8 22.2s19.3 1.7 26.2-5.2l41.6-41.6c87.6 86.5 228.7 86.2 315.8-1c24.4-24.4 42.1-53.1 52.9-83.7 5.9-16.7-2.9-34.9-19.5-40.8s-34.9 2.9-40.8 19.5c-7.7 21.8-20.2 42.3-37.8 59.8-62.2 62.2-162.7 62.5-225.3 1L185 329c6.9-6.9 8.9-17.2 5.2-26.2s-12.5-14.8-22.2-14.8H48.4H40c-13.3 0-24 10.7-24 24z" />
    </svg>
  );
}

function ChevronIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 512 512" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z" />
    </svg>
  );
}

function SlidersIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M0 416c0-17.7 14.3-32 32-32l54.7 0c12.3-28.3 40.5-48 73.3-48s61 19.7 73.3 48L480 384c17.7 0 32 14.3 32 32s-14.3 32-32 32l-246.7 0c-12.3 28.3-40.5 48-73.3 48s-61-19.7-73.3-48L32 448c-17.7 0-32-14.3-32-32zm192 0c0-17.7-14.3-32-32-32s-32 14.3-32 32s14.3 32 32 32s32-14.3 32-32zM384 256c0-17.7-14.3-32-32-32s-32 14.3-32 32s14.3 32 32 32s32-14.3 32-32zm-32-80c32.8 0 61 19.7 73.3 48l54.7 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-54.7 0c-12.3 28.3-40.5 48-73.3 48s-61-19.7-73.3-48L32 288c-17.7 0-32-14.3-32-32s14.3-32 32-32l246.7 0c12.3-28.3 40.5-48 73.3-48zM192 64c-17.7 0-32 14.3-32 32s14.3 32 32 32s32-14.3 32-32s-14.3-32-32-32zm73.3 0L480 64c17.7 0 32 14.3 32 32s-14.3 32-32 32l-214.7 0c-12.3 28.3-40.5 48-73.3 48s-61-19.7-73.3-48L32 128C14.3 128 0 113.7 0 96S14.3 64 32 64l86.7 0C131 35.7 159.2 16 192 16s61 19.7 73.3 48z" />
    </svg>
  );
}

function CheckIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M470.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L192 338.7 425.4 105.4c12.5-12.5 32.8-12.5 45.3 0z" />
    </svg>
  );
}

function TriangleIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M256 32c14.2 0 27.3 7.5 34.5 19.8l216 368c7.3 12.4 7.3 27.7 .2 40.1S486.3 480 472 480H40c-14.3 0-27.6-7.7-34.7-20.1s-7-27.8 .2-40.1l216-368C228.7 39.5 241.8 32 256 32zm0 128c-13.3 0-24 10.7-24 24V296c0 13.3 10.7 24 24 24s24-10.7 24-24V184c0-13.3-10.7-24-24-24zm32 224c0-17.7-14.3-32-32-32s-32 14.3-32 32s14.3 32 32 32s32-14.3 32-32z" />
    </svg>
  );
}

function CircleCheckIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="11" height="11" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0S0 114.6 0 256S114.6 512 256 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z" />
    </svg>
  );
}

function CircleXIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="11" height="11" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0S0 114.6 0 256S114.6 512 256 512zM175 175c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z" />
    </svg>
  );
}

function PlusIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="9" height="9" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true">
      <path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32V224H48c-17.7 0-32 14.3-32 32s14.3 32 32 32H192V432c0 17.7 14.3 32 32 32s32-14.3 32-32V288H400c17.7 0 32-14.3 32-32s-14.3-32-32-32H256V80z" />
    </svg>
  );
}

function DotIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="8" height="8" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0S0 114.6 0 256S114.6 512 256 512z" />
    </svg>
  );
}

function ClipboardCheckIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
      <path d="M192 0c-41.8 0-77.4 26.7-90.5 64H64C28.7 64 0 92.7 0 128V448c0 35.3 28.7 64 64 64H320c35.3 0 64-28.7 64-64V128c0-35.3-28.7-64-64-64H282.5C269.4 26.7 233.8 0 192 0zm0 64a32 32 0 1 1 0 64 32 32 0 1 1 0-64zM305 273L177 401c-9.4 9.4-24.6 9.4-33.9 0L79 337c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L271 239c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z" />
    </svg>
  );
}

function CircleUserIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M399 384.2C376.9 345.8 335.4 320 288 320H224c-47.4 0-88.9 25.8-111 64.2c35.2 39.2 86.2 63.8 143 63.8s107.8-24.7 143-63.8zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zm256 16a72 72 0 1 0 0-144 72 72 0 1 0 0 144z" />
    </svg>
  );
}

function LinkIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 640 512" fill="currentColor" aria-hidden="true">
      <path d="M579.8 267.7c56.5-56.5 56.5-148 0-204.5c-50-50-128.8-56.5-186.3-15.4l-1.6 1.1c-14.4 10.3-17.7 30.3-7.4 44.6s30.3 17.7 44.6 7.4l1.6-1.1c32.1-22.9 76-19.3 103.8 8.6c31.5 31.5 31.5 82.5 0 114L422.3 334.8c-31.5 31.5-82.5 31.5-114 0c-27.9-27.9-31.5-71.8-8.6-103.8l1.1-1.6c10.3-14.4 6.9-34.4-7.4-44.6s-34.4-6.9-44.6 7.4l-1.1 1.6C206.5 251.2 213 330 263 380c56.5 56.5 148 56.5 204.5 0L579.8 267.7zM60.2 244.3c-56.5 56.5-56.5 148 0 204.5c50 50 128.8 56.5 186.3 15.4l1.6-1.1c14.4-10.3 17.7-30.3 7.4-44.6s-30.3-17.7-44.6-7.4l-1.6 1.1c-32.1 22.9-76 19.3-103.8-8.6C74 372 74 321 105.5 289.5L217.7 177.2c31.5-31.5 82.5-31.5 114 0c27.9 27.9 31.5 71.8 8.6 103.9l-1.1 1.6c-10.3 14.4-6.9 34.4 7.4 44.6s34.4 6.9 44.6-7.4l1.1-1.6C433.5 260.8 427 182 377 132c-56.5-56.5-148-56.5-204.5 0L60.2 244.3z" />
    </svg>
  );
}

function CirclePlusIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="13" height="13" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM232 344V280H168c-13.3 0-24-10.7-24-24s10.7-24 24-24h64V168c0-13.3 10.7-24 24-24s24 10.7 24 24v64h64c13.3 0 24 10.7 24 24s-10.7 24-24 24H280v64c0 13.3-10.7 24-24 24s-24-10.7-24-24z" />
    </svg>
  );
}

function CommentIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="15" height="15" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M512 240c0 114.9-114.6 208-256 208c-37.1 0-72.3-6.4-104.1-17.9c-11.9 8.7-31.3 20.6-54.3 30.6C73.6 471.1 44.7 480 16 480c-6.5 0-12.3-3.9-14.8-9.9c-2.5-6-1.1-12.8 3.4-17.4c.3-.3.7-.7 1.3-1.4c1.1-1.2 2.8-3.1 4.9-5.7c4.1-5 9.6-12.4 15.2-21.6c10-16.6 19.5-38.4 21.4-62.9C17.7 326.8 0 285.1 0 240C0 125.1 114.6 32 256 32s256 93.1 256 208z" />
    </svg>
  );
}

function EllipsisVerticalIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="9" height="9" viewBox="0 0 128 512" fill="currentColor" aria-hidden="true">
      <path d="M64 360c30.9 0 56 25.1 56 56s-25.1 56-56 56s-56-25.1-56-56s25.1-56 56-56zm0-160c30.9 0 56 25.1 56 56s-25.1 56-56 56s-56-25.1-56-56s25.1-56 56-56zM120 96c0 30.9-25.1 56-56 56S8 126.9 8 96S33.1 40 64 40s56 25.1 56 56z" />
    </svg>
  );
}

function UserIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="9" height="9" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true">
      <path d="M224 256c70.7 0 128-57.3 128-128S294.7 0 224 0S96 57.3 96 128s57.3 128 128 128zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512H418.3c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304H178.3z" />
    </svg>
  );
}

function CrownIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 576 512" fill="currentColor" aria-hidden="true">
      <path d="M309 106c11.4-7 19-19.7 19-34c0-22.1-17.9-40-40-40s-40 17.9-40 40c0 14.4 7.6 27 19 34L209.7 220.6c-9.1 18.2-32.7 23.4-48.6 10.7L72 160c5-6.7 8-15 8-24c0-22.1-17.9-40-40-40S0 113.9 0 136s17.9 40 40 40c.2 0 .5 0 .7 0L86.4 427.4c5.5 30.4 32 52.6 63 52.6H426.6c30.9 0 57.4-22.1 63-52.6L535.3 176c.2 0 .5 0 .7 0c22.1 0 40-17.9 40-40s-17.9-40-40-40s-40 17.9-40 40c0 9 3 17.3 8 24l-89.1 71.3c-15.9 12.7-39.5 7.5-48.6-10.7L309 106z" />
    </svg>
  );
}

function PenIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M362.7 19.3L314.3 67.7 444.3 197.7l48.4-48.4c25-25 25-65.5 0-90.5L453.3 19.3c-25-25-65.5-25-90.5 0zm-71 71L58.6 323.5c-10.4 10.4-18 23.3-22.2 37.4L1 481.2c-1.5 8.5.8 17.6 6 23.8s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L421.7 220.3 291.7 90.3z" />
    </svg>
  );
}

const PRIORITY_TONE: Record<ChefTicket['priority'], string> = {
  urgent: 'text-rose-600',
  high: 'text-amber-500',
  medium: 'text-sky-600',
};

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate();
  const month = d.toLocaleString('en-GB', { month: 'long' });
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${hh}:${mm}`;
}

function fmtDateCell(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (diff >= 0 && hours < 24) {
    if (hours === 0) return 'now';
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  }
  const day = d.getDate();
  const month = d.toLocaleString('en-GB', { month: 'long' });
  if (d.getFullYear() === new Date().getFullYear() && Math.floor(diff / 86_400_000) < 14) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${hh}:${mm}`;
  }
  return `${day} ${month.slice(0, 3)}`;
}

function statCard({ icon, tone, ring, value, label }: { icon: string; tone: string; ring: string; value: number; label: string }) {
  return (
    <div className={`flex w-full min-w-0 cursor-pointer items-center rounded-xl border px-2.5 py-2 transition sm:w-auto sm:min-w-[132px] ${ring}`}>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base ${tone}`}>{icon}</span>
      <div className="ml-2 flex flex-col leading-tight">
        <span className="text-xl font-extrabold text-slate-900">{value}</span>
        <span className="text-[10px] font-medium text-slate-500">{label}</span>
      </div>
    </div>
  );
}

const ROW_SIZES = [5, 10, 20, 50, 1000];

type FieldId =
  | 'view'
  | 'author'
  | 'owners'
  | 'assignees'
  | 'labels'
  | 'orgType'
  | 'notes'
  | 'department'
  | 'type'
  | 'relatedTo'
  | 'internalTickets'
  | 'subject'
  | 'rating'
  | 'spam'
  | 'lastMessage'
  | 'firstResponse'
  | 'resolution'
  | 'date'
  | 'programmed'
  | 'carrier'
  | 'priority'
  | 'status'
  | 'toolbar';

const FIELDS: { id: FieldId; label: string; disabled?: boolean; defaultOn?: boolean }[] = [
  { id: 'view', label: 'View', defaultOn: true },
  { id: 'author', label: 'Author', defaultOn: true },
  { id: 'owners', label: 'Owners', defaultOn: true },
  { id: 'assignees', label: 'Assignees' },
  { id: 'labels', label: 'Labels', defaultOn: true },
  { id: 'orgType', label: 'Org. Type', defaultOn: true },
  { id: 'notes', label: 'Notes', defaultOn: true },
  { id: 'department', label: 'Department', defaultOn: true },
  { id: 'type', label: 'Type', defaultOn: true },
  { id: 'relatedTo', label: 'Related to', defaultOn: true },
  { id: 'internalTickets', label: 'Internal Tickets' },
  { id: 'subject', label: 'Subject', defaultOn: true },
  { id: 'rating', label: 'Rating', defaultOn: true },
  { id: 'spam', label: 'Spam reason', defaultOn: true },
  { id: 'lastMessage', label: 'Last message', defaultOn: true },
  { id: 'firstResponse', label: 'First response at', defaultOn: true },
  { id: 'resolution', label: 'Resolution time', defaultOn: true },
  { id: 'date', label: 'Date', defaultOn: true },
  { id: 'programmed', label: 'Programmed', defaultOn: true },
  { id: 'carrier', label: 'Carrier', disabled: true },
  { id: 'priority', label: 'Priority', defaultOn: true },
  { id: 'status', label: 'Status', defaultOn: true },
  { id: 'toolbar', label: 'Toolbar', defaultOn: true },
];

function defaultFields(): Record<FieldId, boolean> {
  return Object.fromEntries(FIELDS.map((f) => [f.id, !!f.defaultOn])) as Record<FieldId, boolean>;
}

/* ── column filter panel data & primitives ─────────────────────────────── */

type LabelMode = 'include' | 'exclude';
type FirstResponseKey = 'not_answered' | 'lt_1h' | '1h_4h' | 'gt_4h';
type InboxTabKey = 'unread' | 'pinned' | 'unresolved' | 'owner' | 'author';
type FilterKind = 'labels' | 'orgType' | 'department' | 'type' | 'rating' | 'spam' | 'firstResponse' | 'priority' | 'status' | 'internalTickets';

interface TicketFilters {
  labels: { mode: LabelMode; values: string[] };
  orgType: string[];
  department: string[];
  type: string[];
  rating: number[];
  spam: string[];
  firstResponse: FirstResponseKey[];
  priority: string[];
  status: string[];
  internalTickets: string[];
}

const EMPTY_FILTERS: TicketFilters = {
  labels: { mode: 'include', values: [] },
  orgType: [],
  department: [],
  type: [],
  rating: [],
  spam: [],
  firstResponse: [],
  priority: [],
  status: [],
  internalTickets: [],
};

const LABEL_GROUPS: { name: string; items: { label: string; tone: string }[] }[] = [
  {
    name: 'Dependency Type',
    items: [
      { label: 'Action Request', tone: 'info' },
      { label: 'Info Request', tone: 'info' },
      { label: 'Note', tone: 'info' },
      { label: 'Report', tone: 'info' },
      { label: 'Suggestion', tone: 'info' },
    ],
  },
  {
    name: 'Announcement & Communication',
    items: [
      { label: 'Announcement', tone: 'secondary' },
      { label: 'IT Announcement', tone: 'secondary' },
    ],
  },
  {
    name: 'System & Automation',
    items: [
      { label: 'Auto Generated', tone: 'secondary' },
      { label: 'System Auto Alert', tone: 'secondary' },
    ],
  },
  {
    name: 'Workflow Status',
    items: [
      { label: 'Backlog', tone: 'secondary' },
      { label: 'Blocked', tone: 'danger' },
      { label: 'In Progress', tone: 'primary' },
    ],
  },
  {
    name: 'Action Dependency',
    items: [
      { label: 'Confirmation Action', tone: 'warning' },
      { label: 'Fulfillment Action', tone: 'warning' },
      { label: 'IT Action', tone: 'warning' },
      { label: 'Operations Action', tone: 'warning' },
      { label: 'Supplier Action', tone: 'warning' },
    ],
  },
];

const LABEL_TONE: Record<string, string> = {
  info: 'bg-sky-100 text-sky-700',
  secondary: 'bg-slate-100 text-slate-600',
  danger: 'bg-rose-100 text-rose-700',
  primary: 'bg-brand-100 text-brand-700',
  warning: 'bg-amber-100 text-amber-700',
};

const LABEL_TONE_BY_NAME: Record<string, string> = Object.fromEntries(
  LABEL_GROUPS.flatMap((g) => g.items.map((it) => [it.label, it.tone]))
);

const TYPE_OPTIONS: { value: string; icon: string }[] = [
  { value: 'Return request', icon: '🔄' },
  { value: 'Exchange request', icon: '🔁' },
  { value: 'Delivery delay', icon: '🚚' },
  { value: 'Price change', icon: '💱' },
  { value: 'Address change', icon: '📍' },
  { value: 'Phone change', icon: '📞' },
  { value: 'Postpone delivery date', icon: '📅' },
  { value: 'Cancel shipment', icon: '🚫' },
  { value: 'Fulfillment issue', icon: '📦' },
  { value: 'Confirmation access request', icon: '🔓' },
  { value: 'Dropshipping eligibility request', icon: '🛒' },
  { value: 'Other', icon: '🧩' },
];

const SPAM_OPTIONS: { value: string; icon: string }[] = [
  { value: 'Duplicate ticket', icon: '🧩' },
  { value: 'Invalid relaunch', icon: '🔄' },
  { value: 'Abusive or inappropriate', icon: '🚫' },
];

const FIRST_RESPONSE_OPTIONS: { key: FirstResponseKey; label: string; cls: string }[] = [
  { key: 'not_answered', label: 'Not answered', cls: 'text-slate-600' },
  { key: 'lt_1h', label: 'Answered in less than 1 hour', cls: 'text-emerald-600' },
  { key: '1h_4h', label: 'Answered between 1 and 4 hours', cls: 'text-amber-600' },
  { key: 'gt_4h', label: 'Answered after 4 hours', cls: 'text-rose-600' },
];

const PRIORITY_OPTIONS: { value: string; label: string; cls: string }[] = [
  { value: 'low', label: 'Low', cls: 'bg-slate-100 text-slate-600' },
  { value: 'medium', label: 'Medium', cls: 'bg-sky-100 text-sky-600' },
  { value: 'high', label: 'High', cls: 'bg-amber-100 text-amber-700' },
  { value: 'urgent', label: 'Urgent', cls: 'bg-rose-100 text-rose-600' },
];

const STATUS_OPTIONS: { value: string; label: string; cls: string }[] = [
  { value: 'resolved', label: 'Resolved', cls: 'bg-emerald-100 text-emerald-700' },
  { value: 'unresolved', label: 'Unresolved', cls: 'bg-amber-100 text-amber-700' },
];

const INTERNAL_TICKET_OPTIONS: { value: string; label: string; cls: string }[] = [
  { value: 'all', label: 'All', cls: 'bg-slate-100 text-slate-600' },
  { value: 'has', label: 'Has internal ticket', cls: 'bg-sky-100 text-sky-700' },
  { value: 'none', label: 'No internal ticket', cls: 'bg-slate-100 text-slate-600' },
  { value: 'unresolved', label: 'Has unresolved internal ticket', cls: 'bg-amber-100 text-amber-700' },
  { value: 'resolved', label: 'Has resolved internal ticket', cls: 'bg-emerald-100 text-emerald-700' },
];

const DEPARTMENT_OPTIONS: { value: string; icon: string }[] = [
  { value: 'Commercial', icon: '🎧' },
  { value: 'Technical', icon: '💻' },
];

const ORG_TYPE_OPTIONS: { value: string; icon: string; cls: string }[] = [
  { value: 'Retailer', icon: '🧑‍💼', cls: 'bg-sky-100 text-sky-600' },
  { value: 'Supplier', icon: '🏭', cls: 'bg-amber-100 text-amber-700' },
  { value: 'Fulfiller', icon: '📦', cls: 'bg-brand-100 text-brand-700' },
  { value: 'Service', icon: '🧑', cls: 'bg-emerald-100 text-emerald-700' },
];

const RATING_COLORS: Record<number, string> = { 1: '#F17A45', 2: '#F19745', 3: '#F1A545', 4: '#F1B345', 5: '#F1D045' };

function firstResponseBucket(t: ChefTicket): FirstResponseKey {
  if (t.first_response_mins === null) return 'not_answered';
  if (t.first_response_mins < 60) return 'lt_1h';
  if (t.first_response_mins <= 240) return '1h_4h';
  return 'gt_4h';
}

function StarRow({ value }: { value: number }) {
  const fill = RATING_COLORS[value];
  return (
    <span className="inline-flex items-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width="15" height="15" viewBox="0 0 24 24" className="mx-px" style={{ color: i <= value && value > 0 ? fill : '#ccc' }} aria-hidden="true">
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" fill="currentColor" />
        </svg>
      ))}
    </span>
  );
}

function FilterOverlay({ pos, width = 300, onClose, children }: { pos: { left: number; top: number }; width?: number; onClose: () => void; children: ReactNode }) {
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

function CheckRow({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: ReactNode }) {
  return (
    <label className="flex w-full cursor-pointer items-center rounded px-2 py-0.5 hover:bg-slate-50">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-3.5 w-3.5 accent-brand-600" />
      {children}
    </label>
  );
}

function SaveBar({ onSave }: { onSave: () => void }) {
  return (
    <div className="px-3 pb-2">
      <div className="mb-2 h-px bg-slate-100" />
      <button type="button" onClick={onSave} className="w-full rounded-md bg-sky-500 py-1.5 text-xs font-bold text-white transition hover:bg-sky-600">
        Save
      </button>
    </div>
  );
}

/* ── Create Internal Ticket modal ──────────────────────────────────────── */

type NewTicketPriority = 'low' | 'medium' | 'high' | 'urgent';

const PRIORITY_PICKS: { value: NewTicketPriority; label: string; icon: string; active: string }[] = [
  { value: 'low', label: 'Low', icon: '−', active: 'border-slate-400 bg-slate-50 text-slate-700' },
  { value: 'medium', label: 'Medium', icon: '◫', active: 'border-sky-400 bg-sky-50 text-sky-600' },
  { value: 'high', label: 'High', icon: '↑', active: 'border-amber-400 bg-amber-50 text-amber-600' },
  { value: 'urgent', label: 'Urgent', icon: '!', active: 'border-rose-400 bg-rose-50 text-rose-600' },
];

function CreateTicketModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (draft: { priority: NewTicketPriority; title: string; description: string; related: string[]; assignees: string[]; dept: string }) => void }) {
  const [priority, setPriority] = useState<NewTicketPriority>('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [relatedType, setRelatedType] = useState('Link');
  const [linkInput, setLinkInput] = useState('');
  const [related, setRelated] = useState<string[]>([]);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [dept, setDept] = useState('All');
  const [assignees, setAssignees] = useState<string[]>([]);

  if (!open) return null;

  const canAddLink = linkInput.trim().length > 0;
  const addLink = () => {
    if (!canAddLink) return;
    setRelated((r) => [...r, `${relatedType}: ${linkInput.trim()}`]);
    setLinkInput('');
  };
  const addAssignee = () => {
    const name = assigneeSearch.trim();
    if (!name) return;
    setAssignees((a) => (a.includes(name) ? a : [...a, name]));
    setAssigneeSearch('');
  };

  const valid = title.trim().length > 0;
  const submit = () => {
    if (!valid) return;
    onCreate({ priority, title: title.trim(), description, related, assignees, dept });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
              <ClipboardCheckIcon />
            </span>
            <div>
              <h3 className="truncate text-base font-bold text-slate-900">Create Internal Ticket</h3>
              <p className="text-xs text-slate-500">Assign tasks to internal team members</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* body */}
        <div className="min-h-0 overflow-y-auto grid grid-cols-1 gap-4 p-4 sm:p-5 md:grid-cols-12">
          {/* left column */}
          <div className="space-y-4 md:col-span-7">
            {/* priority */}
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-600">Priority</p>
              <div className="flex flex-wrap gap-2">
                {PRIORITY_PICKS.map((p) => {
                  const selected = priority === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPriority(p.value)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                        selected ? p.active + ' shadow-sm' : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                      }`}
                    >
                      {selected && <CheckIcon className="text-current" />}
                      {p.label}
                      <span className="text-xs opacity-70">{p.icon}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* title */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Title <span className="text-rose-500">*</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter ticket title"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            {/* description */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe what needs to be done"
                className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            {/* related entities */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-600">Related entities</p>
                <span className="text-[11px] text-slate-400">
                  <LinkIcon className="mr-1 inline" />
                  {related.length} linked
                </span>
              </div>
              <div className="flex min-h-[52px] items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 px-3 py-2">
                {related.length === 0 ? (
                  <span className="text-xs text-slate-400">No related entities</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {related.map((r) => (
                      <span key={r} className="inline-flex items-center gap-1 rounded-md bg-sky-100 px-2 py-1 text-[11px] font-medium text-sky-700">
                        <LinkIcon />
                        {r}
                        <button type="button" onClick={() => setRelated((list) => list.filter((x) => x !== r))} className="text-sky-500 hover:text-rose-500">
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-2 flex flex-col items-stretch gap-2 sm:flex-row sm:items-start">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <select
                    value={relatedType}
                    onChange={(e) => setRelatedType(e.target.value)}
                    className="w-[76px] rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-medium text-slate-700 outline-none focus:border-brand-500"
                  >
                    <option>Link</option>
                    <option>ID</option>
                  </select>
                  <input
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addLink()}
                    placeholder="Paste a link or enter an ID"
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </div>
                <button
                  type="button"
                  disabled={!canAddLink}
                  onClick={addLink}
                  className="inline-flex items-center justify-center gap-1 rounded-lg bg-sky-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <PlusIcon className="text-current" />
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* right column */}
          <div className="rounded-xl bg-slate-50 p-4 md:col-span-5">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-700">
              <CircleUserIcon className="text-slate-500" />
              Assignees
            </p>

            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <CirclePlusIcon />
              </span>
              <input
                value={assigneeSearch}
                onChange={(e) => setAssigneeSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addAssignee()}
                placeholder="Add users"
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <select
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
            >
              <option value="All">All Dept</option>
              <option value="Commercial">Commercial</option>
              <option value="Technical">Technical</option>
            </select>

            <div className="mt-3 flex min-h-[88px] items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-white px-3 py-2">
              {assignees.length === 0 ? (
                <span className="text-xs text-slate-400">No assignees added yet</span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {assignees.map((a) => (
                    <span key={a} className="inline-flex items-center gap-1 rounded-full bg-slate-200 py-1 pl-1 pr-1.5 text-[11px] font-medium text-slate-700">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-400 text-[8px] font-bold text-white">
                        {a.slice(0, 1).toUpperCase()}
                      </span>
                      {a}
                      <button type="button" onClick={() => setAssignees((list) => list.filter((x) => x !== a))} className="text-slate-500 hover:text-rose-500">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!valid}
            onClick={submit}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PlusIcon className="text-current" />
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── page component ────────────────────────────────────────────────────── */
export default function ChefTickets({ basePath = '/chef/tickets' }: { basePath?: string } = {}) {
  const { user } = useAuth();
  const CURRENT_USER = user?.name ?? 'Unknown';
  const photoFor = useTeamPhotos(basePath.includes('/support') ? 'support' : basePath.includes('/stocking') ? null : 'chef');
  const [data, setData] = useState<ChefTicketsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_desc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<TicketFilters>(EMPTY_FILTERS);
  const [openFilter, setOpenFilter] = useState<{ kind: FilterKind; pos: { left: number; top: number } } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [fields, setFields] = useState<Record<FieldId, boolean>>(defaultFields);
  const [fieldsOpen, setFieldsOpen] = useState<{ pos: { left: number; top: number } } | null>(null);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [inboxTabs, setInboxTabs] = useState<InboxTabKey[]>([]);
  const [inboxSearch, setInboxSearch] = useState('');
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });

  const load = () => {
    setLoading(true);
    apiGet<ChefTicketsResult>(basePath)
      .then(setData)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);
  useEffect(() => {
    const handler = () => load();
    window.addEventListener('focus', handler);
    return () => window.removeEventListener('focus', handler);
  }, []);

  const openPanel = (kind: FilterKind) => (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setOpenFilter((cur) =>
      cur && cur.kind === kind
        ? null
        : { kind, pos: { left: Math.min(rect.left - 20, window.innerWidth - 320), top: rect.bottom + 4 } }
    );
  };

  const openFieldsPanel = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setFieldsOpen((cur) =>
      cur
        ? null
        : { pos: { left: Math.max(8, Math.min(rect.left + rect.width - 260, window.innerWidth - 268)), top: rect.bottom + 4 } }
    );
  };

  const rows = useMemo(() => {
    if (!data) return [];
    let list = [...data.tickets];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          t.subject.toLowerCase().includes(q) ||
          t.author.name.toLowerCase().includes(q) ||
          t.owners.some((o) => o.name.toLowerCase().includes(q)) ||
          t.last_message.text.toLowerCase().includes(q) ||
          t.org_type.toLowerCase().includes(q) ||
          String(t.id).includes(q)
      );
    }

    if (dateRange.from) {
      const from = new Date(dateRange.from);
      from.setHours(0, 0, 0, 0);
      list = list.filter((t) => new Date(t.created_at) >= from);
    }
    if (dateRange.to) {
      const to = new Date(dateRange.to);
      to.setHours(23, 59, 59, 999);
      list = list.filter((t) => new Date(t.created_at) <= to);
    }

    list = list.filter((t) => {
      if (filters.orgType.length && !filters.orgType.includes(t.org_type)) return false;
      if (filters.department.length && !filters.department.includes(t.department)) return false;
      if (filters.type.length && !filters.type.includes(t.type)) return false;
      if (filters.priority.length && !filters.priority.includes(t.priority)) return false;
      if (filters.status.length && !filters.status.includes(t.status)) return false;
      if (filters.internalTickets.length) {
        const hit = filters.internalTickets.some((v) => {
          if (v === 'all') return true;
          if (v === 'has') return t.internal_ticket !== 'none';
          if (v === 'none') return t.internal_ticket === 'none';
          if (v === 'unresolved') return t.internal_ticket === 'unresolved';
          if (v === 'resolved') return t.internal_ticket === 'resolved';
          return false;
        });
        if (!hit) return false;
      }
      if (filters.rating.length) {
        const r = t.rating ?? 0;
        if (!filters.rating.includes(r)) return false;
      }
      if (filters.spam.length && !filters.spam.includes(t.spam_reason ?? '')) return false;
      const bucket = firstResponseBucket(t);
      if (filters.firstResponse.length && !filters.firstResponse.includes(bucket)) return false;
      const { mode, values } = filters.labels;
      if (values.length) {
        const hasAny = values.some((l) => t.labels.includes(l));
        if (mode === 'include' && !hasAny) return false;
        if (mode === 'exclude' && hasAny) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      const ca = new Date(a.created_at).getTime();
      const cb = new Date(b.created_at).getTime();
      switch (sortBy) {
        case 'created_asc':
          return ca - cb;
        case 'priority':
          return PRIORITY_TONE[a.priority].localeCompare(PRIORITY_TONE[b.priority]) || cb - ca;
        case 'status':
          return a.status.localeCompare(b.status) || cb - ca;
        default:
          return cb - ca;
      }
    });
    return list;
  }, [data, search, sortBy, filters, dateRange]);

  const total = rows.length;
  const colCount = FIELDS.filter((f) => fields[f.id]).length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages - 1);
  const pageRows = rows.slice(current * pageSize, current * pageSize + pageSize);
  const from = total === 0 ? 0 : current * pageSize + 1;
  const to = Math.min(total, (current + 1) * pageSize);

  const applyFilters = (patch: Partial<TicketFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(0);
  };

  const unreadCount = data ? data.tickets.filter((t) => t.non_answered).length : 0;

  const inboxRows = useMemo(() => {
    if (!data) return [];
    const q = inboxSearch.trim().toLowerCase();
    return data.tickets.filter((t) => {
      if (inboxTabs.includes('unread') && !t.non_answered) return false;
      if (inboxTabs.includes('pinned') && !t.programmed) return false;
      if (inboxTabs.includes('unresolved') && t.status !== 'unresolved') return false;
      if (inboxTabs.includes('owner') && !t.owners.some((o) => o.name === CURRENT_USER)) return false;
      if (inboxTabs.includes('author') && t.author.name !== CURRENT_USER) return false;
      if (q && !(t.subject.toLowerCase().includes(q) || t.last_message.text.toLowerCase().includes(q) || t.author.name.toLowerCase().includes(q))) {
        return false;
      }
      return true;
    });
  }, [data, inboxTabs, inboxSearch]);

  const inboxChips: { key: InboxTabKey; label: string; icon?: ReactNode; divider?: boolean }[] = [
    { key: 'unread', label: `Unread (${unreadCount})` },
    { key: 'pinned', label: 'Pinned' },
    { key: 'unresolved', label: 'Unresolved', divider: true },
    { key: 'owner', label: 'Owner', icon: <CrownIcon className="mr-0.5" /> },
    { key: 'author', label: 'Author', icon: <PenIcon className="mr-0.5" /> },
  ];

  const toggleInboxTab = (key: InboxTabKey) =>
    setInboxTabs((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));

  const mentionedTickets = data?.tickets.filter((ticket) => {
    const userName = user?.name;
    return !!userName && (ticket.owners.some((owner) => owner.name === userName) || ticket.assignees.includes(userName));
  }) ?? [];
  const today = new Date().toDateString();
  const stats = data
    ? {
        underProcess: mentionedTickets.filter((ticket) => ticket.under_process).length,
        scheduled: mentionedTickets.filter((ticket) => ticket.programmed).length,
        today: mentionedTickets.filter((ticket) => new Date(ticket.created_at).toDateString() === today).length,
        answered: mentionedTickets.filter((ticket) => ticket.answered).length,
        nonAnswered: mentionedTickets.filter((ticket) => ticket.non_answered).length,
        noFollow: mentionedTickets.filter((ticket) => ticket.no_follow).length,
      }
    : undefined;
  const totalTickets = mentionedTickets.length;
  const green = stats?.answered ?? 0;
  const amber = Math.max(0, totalTickets - green);
  const greenPct = totalTickets > 0 ? (green / totalTickets) * 100 : 0;
  const pct = Math.round(greenPct);

  const filterIcon = (active: boolean) => (
    <FilterIcon className={active ? 'mr-1 text-brand-600' : 'mr-1 text-sky-600'} />
  );

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden">
      {/* ── stats header ── */}
      <div className="mb-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex shrink-0 items-center">
            <Avatar name={CURRENT_USER} size="h-11 w-11 text-sm" img={user?.photo} />
            <div className="ml-2">
              <p className="text-sm font-semibold leading-none text-slate-800">{CURRENT_USER}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">Stats</p>
            </div>
          </div>

          <div className="mx-1 hidden h-9 w-px bg-gradient-to-b from-transparent via-slate-200 to-transparent sm:block" />

          {data &&
            (() => {
              const s = stats!;
              return (
                <div className="grid w-full min-w-0 grid-cols-2 gap-1.5 sm:flex sm:flex-1 sm:flex-wrap sm:items-center">
                  {statCard({ icon: '⏳', tone: 'bg-sky-50 text-sky-600', ring: 'border-sky-200 bg-sky-50/40', value: s.underProcess, label: 'Under process' })}
                  {statCard({ icon: '🗓️', tone: 'bg-violet-50 text-violet-600', ring: 'border-violet-200 bg-violet-50/40', value: s.scheduled, label: 'Scheduled' })}
                  {statCard({ icon: '📆', tone: 'bg-emerald-50 text-emerald-600', ring: 'border-emerald-200 bg-emerald-50/40', value: s.today, label: 'Today' })}
                  {statCard({ icon: '📨', tone: 'bg-sky-50 text-sky-500', ring: 'border-sky-200 bg-sky-50/40', value: s.answered, label: 'Answered' })}
                  {statCard({ icon: '💬', tone: 'bg-orange-50 text-orange-500', ring: 'border-orange-200 bg-orange-50/40', value: s.nonAnswered, label: 'Non answered' })}
                  {statCard({ icon: '🔕', tone: 'bg-rose-50 text-rose-500', ring: 'border-rose-200 bg-rose-50/40', value: s.noFollow, label: 'No follow' })}
                </div>
              );
            })()}

          <div className="flex w-full shrink-0 flex-wrap items-center justify-between gap-2 sm:ml-auto sm:w-auto">
            <button title="All Tickets" className="flex items-center gap-1 rounded-lg px-1 py-1 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
              <FilterIcon className="text-sky-600" />
              All Tickets
            </button>
            <div className="mx-1 hidden h-6 w-px bg-gradient-to-b from-transparent via-slate-200 to-transparent sm:block" />
            <div className="flex flex-col items-center">
              <div className="mb-1 flex justify-center">
                <span className="mr-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">{green}</span>
                <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-white">{amber}</span>
              </div>
              <div className="flex h-2.5 w-full max-w-[200px] overflow-hidden rounded-full bg-slate-100 sm:w-[200px]">
                <div className="h-full bg-emerald-500" style={{ width: `${greenPct}%` }} />
                <div className="h-full bg-amber-400" style={{ width: `${100 - greenPct}%` }} />
              </div>
            </div>
            <span className="mt-1 text-[11px] font-bold text-slate-700">{pct}%</span>
            <button title="Collapse" onClick={() => setLoading((l) => l)} className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100">
              <ChevronIcon />
            </button>
            <button title="Refresh" onClick={load} className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50" disabled={loading}>
              <RotateIcon />
            </button>
          </div>
        </div>
      </div>

      {/* ── table card ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <h5 className="whitespace-nowrap text-sm font-bold text-slate-900">Tickets</h5>
            <form className="relative flex-1 sm:flex-none">
              <input
                placeholder="Search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-3 pr-8 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 sm:w-[200px]"
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                <SearchIcon />
              </span>
            </form>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <div className="flex overflow-hidden rounded-lg border border-slate-300 text-sm">
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange((d) => ({ ...d, from: e.target.value }))}
                className="w-[130px] border-r border-slate-200 bg-white px-2 py-1.5 text-slate-600 outline-none"
                placeholder="From"
              />
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange((d) => ({ ...d, to: e.target.value }))}
                className="w-[130px] border-l border-slate-200 bg-white px-2 py-1.5 text-slate-600 outline-none"
                placeholder="To"
              />
              {(dateRange.from || dateRange.to) && (
                <button type="button" onClick={() => setDateRange({ from: '', to: '' })} className="bg-slate-100 px-2 text-slate-500 hover:bg-slate-200">✕</button>
              )}
            </div>
            <div className="flex items-center rounded-lg border border-slate-300 py-1.5 pl-2 pr-1 text-sm text-brand-600">
              <CalendarDaysIcon className="mr-1" />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-transparent text-sm font-medium text-brand-600 outline-none">
                <option value="created_desc">Created At Desc</option>
                <option value="created_asc">Created At Asc</option>
                <option value="priority">Priority</option>
                <option value="status">Status</option>
              </select>
            </div>
            <button
              type="button"
              title="Columns"
              onClick={openFieldsPanel}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100"
            >
              <SlidersIcon />
            </button>
            <div className="relative">
              <button
                type="button"
                title="Ticket Messages"
                aria-expanded={inboxOpen}
                onClick={() => setInboxOpen((o) => !o)}
                className="flex h-9 w-9 items-center justify-center rounded-full transition hover:brightness-95"
                style={{ backgroundColor: '#2c7be5', color: '#fff', boxShadow: '0 0 0 3px rgba(44, 123, 229, 0.25)' }}
              >
                <CommentIcon />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {inboxOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setInboxOpen(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-[24rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                    <div className="border-b border-slate-100 px-3 py-3">
                      <div className="mb-2 flex items-center justify-between">
                        <h6 className="text-sm font-semibold text-slate-800">Ticket Messages</h6>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={load} title="Refresh" className="text-slate-400 transition hover:text-slate-700">
                            <RotateIcon />
                          </button>
                          <Link
                            to={`${basePath}?is_internal=true`}
                            onClick={() => setInboxOpen(false)}
                            className="text-[10px] font-medium text-brand-600 transition hover:text-brand-700"
                          >
                            View all
                          </Link>
                        </div>
                      </div>
                      <div className="relative mb-2">
                        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                          <SearchIcon />
                        </span>
                        <input
                          value={inboxSearch}
                          onChange={(e) => setInboxSearch(e.target.value)}
                          placeholder="Search tickets..."
                          className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setInboxTabs([])}
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition ${
                            inboxTabs.length === 0 ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          All
                        </button>
                        {inboxChips.map((chip) => (
                          <span key={chip.key} className="inline-flex items-center gap-1">
                            {chip.divider && <span className="mx-1 h-3.5 w-px bg-slate-200" />}
                            <button
                              type="button"
                              onClick={() => toggleInboxTab(chip.key)}
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition ${
                                inboxTabs.includes(chip.key) ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {chip.icon}
                              {chip.label}
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="max-h-[25rem] overflow-y-auto">
                      {inboxRows.length === 0 ? (
                        <div className="px-4 py-12 text-center text-xs text-slate-400">No ticket messages found.</div>
                      ) : (
                        inboxRows.slice(0, 8).map((t) => (
                          <Link
                            key={t.id}
                            to={`${basePath}/${t.id}`}
                            onClick={() => setInboxOpen(false)}
                            className="flex items-start gap-2 border-b border-slate-100 px-3 py-3 transition last:border-b-0 hover:bg-slate-50/80"
                          >
                            <div className="flex shrink-0 items-center">
                              <Avatar name={t.author.name} size="h-8 w-8 text-[10px]" img={photoFor(t.author.name)} />
                              {(t.owners ?? []).slice(0, 2).map((o) => (
                                <div key={o.name} className="-ml-2">
                                  <Avatar name={o.name} size="h-8 w-8 text-[10px]" img={photoFor(o.name)} />
                                </div>
                              ))}
                              {(t.owners ?? []).length + 1 > 3 && (
                                <div className="-ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700 ring-2 ring-white">
                                  +{(t.owners ?? []).length + 1 - 3}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-1.5">
                                  <span
                                    className={`shrink-0 rounded px-1 text-[9px] font-semibold leading-4 ${
                                      t.status === 'resolved'
                                        ? 'border border-emerald-400 text-emerald-600'
                                        : 'border border-amber-400 text-amber-600'
                                    }`}
                                  >
                                    {t.status === 'resolved' ? 'Resolved' : 'Unresolved'}
                                  </span>
                                  <span className="truncate text-xs font-semibold text-slate-800">{t.subject}</span>
                                </div>
                                <span className="shrink-0 text-[10px] text-slate-400">{fmtDateCell(t.created_at)}</span>
                              </div>
                              <p className="mt-1 truncate text-[11px] text-slate-500">
                                <span className="font-semibold text-slate-700">{t.author.name}: </span>
                                {t.last_message.text}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-col items-center gap-1 pt-0.5 text-slate-300">
                              <EllipsisVerticalIcon />
                              <UserIcon />
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
            >
              <PlusIcon className="text-current" />
              Create
            </button>
          </div>
        </div>

        {loading ? (
          <Spinner />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[2200px] text-left text-xs">
                <thead>
                  <tr className="whitespace-nowrap border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                    {fields.view && <th className="px-3 py-2.5">View</th>}
                    {fields.author && (
                      <th className="px-3 py-2.5">
                        <span className="inline-flex items-center">
                          {filterIcon(false)} Author
                        </span>
                      </th>
                    )}
                    {fields.owners && (
                      <th className="px-3 py-2.5">
                        <span className="inline-flex items-center">
                          {filterIcon(false)} Owners
                        </span>
                      </th>
                    )}
                    {fields.assignees && (
                      <th className="px-3 py-2.5">
                        <span className="inline-flex items-center">
                          {filterIcon(false)} Assignees
                        </span>
                      </th>
                    )}
                    {fields.labels && (
                      <th className="px-3 py-2.5">
                        <button type="button" onClick={openPanel('labels')} className="inline-flex items-center hover:text-brand-600">
                          {filterIcon(filters.labels.values.length > 0)} Labels
                        </button>
                      </th>
                    )}
                    {fields.orgType && (
                      <th className="px-3 py-2.5">
                        <button type="button" onClick={openPanel('orgType')} className="inline-flex items-center hover:text-brand-600">
                          {filterIcon(filters.orgType.length > 0)} Org. Type
                        </button>
                        <SortIcon className="text-sky-600" />
                      </th>
                    )}
                    {fields.department && (
                      <th className="px-3 py-2.5">
                        <button type="button" onClick={openPanel('department')} className="inline-flex items-center hover:text-brand-600">
                          {filterIcon(filters.department.length > 0)} Department
                        </button>
                      </th>
                    )}
                    {fields.type && (
                      <th className="px-3 py-2.5">
                        <button type="button" onClick={openPanel('type')} className="inline-flex items-center hover:text-brand-600">
                          {filterIcon(filters.type.length > 0)} Type
                        </button>
                        <SortIcon className="text-sky-600" />
                      </th>
                    )}
                    {fields.relatedTo && <th className="px-3 py-2.5 text-center">Related to</th>}
                    {fields.internalTickets && (
                      <th className="px-3 py-2.5">
                        <button type="button" onClick={openPanel('internalTickets')} className="inline-flex items-center hover:text-brand-600">
                          {filterIcon(filters.internalTickets.length > 0)} Internal tickets
                        </button>
                      </th>
                    )}
                    {fields.notes && <th className="px-3 py-2.5">Notes</th>}
                    {fields.subject && <th className="px-3 py-2.5">Subject</th>}
                    {fields.rating && (
                      <th className="px-3 py-2.5 text-center">
                        <button type="button" onClick={openPanel('rating')} className="inline-flex items-center hover:text-brand-600">
                          {filterIcon(filters.rating.length > 0)} Rating
                        </button>
                      </th>
                    )}
                    {fields.spam && (
                      <th className="px-3 py-2.5">
                        <button type="button" onClick={openPanel('spam')} className="inline-flex items-center hover:text-brand-600">
                          {filterIcon(filters.spam.length > 0)} Spam reason
                        </button>
                      </th>
                    )}
                    {fields.lastMessage && <th className="px-3 py-2.5">Last message</th>}
                    {fields.date && <th className="px-3 py-2.5">Date</th>}
                    {fields.programmed && <th className="px-3 py-2.5">Programmed</th>}
                    {fields.firstResponse && (
                      <th className="px-3 py-2.5">
                        <button type="button" onClick={openPanel('firstResponse')} className="inline-flex items-center hover:text-brand-600">
                          {filterIcon(filters.firstResponse.length > 0)} First response at
                        </button>
                      </th>
                    )}
                    {fields.resolution && <th className="px-3 py-2.5">Resolution time</th>}
                    {fields.priority && (
                      <th className="px-3 py-2.5">
                        <button type="button" onClick={openPanel('priority')} className="inline-flex items-center hover:text-brand-600">
                          {filterIcon(filters.priority.length > 0)} Priority
                        </button>
                      </th>
                    )}
                    {fields.status && (
                      <th className="px-3 py-2.5">
                        <button type="button" onClick={openPanel('status')} className="inline-flex items-center hover:text-brand-600">
                          {filterIcon(filters.status.length > 0)} Status
                        </button>
                      </th>
                    )}
                    {fields.toolbar && <th className="px-3 py-2.5 text-right">Toolbar</th>}
                  </tr>
                </thead>
                <tbody className={loading ? '' : ''}>
                  {pageRows.length === 0 ? (
                    <tr className="whitespace-nowrap border-b border-slate-50">
                      <td colSpan={colCount} className="px-4 py-16 text-center text-sm text-slate-400">
                        No tickets match your filters.
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((t) => (
                      <tr key={t.id} className="whitespace-nowrap border-b border-slate-50 align-middle transition hover:bg-slate-50/60">
                      {/* View */}
                      {fields.view && (
                        <td className="px-3 py-1.5">
                          <Link
                            to={`${basePath}/${t.id}`}
                            className="inline-flex items-center justify-center rounded-md border border-sky-200 bg-sky-50 p-1.5 text-sky-600 transition hover:bg-sky-100"
                            title="View ticket"
                          >
                            <EyeIcon />
                          </Link>
                        </td>
                      )}
                      {/* Author */}
                      {fields.author && (
                        <td className="px-3 py-1.5">
                          <div className="flex items-center">
                            <Avatar name={t.author.name} img={photoFor(t.author.name)} />
                            <div className="ml-2 flex flex-col leading-tight">
                              <span className="font-semibold text-slate-800">{t.author.name}</span>
                              <Link to={basePath} className="mt-0.5 text-[10px] text-sky-600 hover:underline">
                                Filter by
                              </Link>
                            </div>
                          </div>
                        </td>
                      )}
                      {/* Owners */}
                      {fields.owners && (
                        <td className="px-3 py-1.5">
                          <div className="flex items-center">
                            <Avatar name={t.owners[0]?.name ?? '—'} img={photoFor(t.owners[0]?.name ?? '')} />
                            <div className="ml-2 flex flex-col leading-tight">
                              <span className="font-semibold text-slate-800">{t.owners[0]?.name ?? '—'}</span>
                              <Link to={basePath} className="mt-0.5 text-[10px] text-sky-600 hover:underline">
                                Filter by
                              </Link>
                            </div>
                          </div>
                        </td>
                      )}
                      {/* Assignees */}
                      {fields.assignees && (
                        <td className="px-3 py-1.5">
                          {t.assignees.length === 0 ? (
                            <span className="text-slate-300">-</span>
                          ) : (
                            <div className="flex items-center">
                              <div className="flex">
                                {t.assignees.slice(0, 4).map((name, i) => (
                                  <div key={name} className={i === 0 ? '' : '-ml-2'} style={{ zIndex: 4 - i }}>
                                    <Avatar name={name} size="h-7 w-7 rounded-full ring-2 ring-white text-[9px]" img={photoFor(name)} />
                                  </div>
                                ))}
                              </div>
                              {t.assignees.length > 4 && (
                                <span className="ml-1.5 text-[10px] font-semibold text-slate-500">+{t.assignees.length - 4}</span>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                      {/* Labels */}
                      {fields.labels && (
                        <td className="px-3 py-1.5">
                          {t.labels.length === 0 ? (
                            <span className="text-slate-300">-</span>
                          ) : (
                            <div className="flex max-w-[180px] flex-wrap gap-0.5">
                              {t.labels.map((l) => (
                                <span
                                  key={l}
                                  className={`inline-flex items-center whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] font-medium ${LABEL_TONE[LABEL_TONE_BY_NAME[l]] ?? 'bg-slate-100 text-slate-600'}`}
                                >
                                  {l}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      )}
                      {/* Org Type */}
                      {fields.orgType && (
                        <td className="px-3 py-1.5">
                          <span className="inline-flex items-center gap-1.5 text-slate-700">
                            <span className="text-base">{t.org_type === 'Service' ? '🧑' : '🏭'}</span>
                            <span className="whitespace-nowrap">{t.org_type}</span>
                          </span>
                        </td>
                      )}
                      {/* Department */}
                      {fields.department && (
                        <td className="px-3 py-1.5">
                          <span className="inline-flex items-center gap-1 text-slate-700">
                            <span className="text-base">{t.department === 'Technical' ? '💻' : '🎧'}</span>
                            <span className="whitespace-nowrap">{t.department}</span>
                          </span>
                        </td>
                      )}
                      {/* Type */}
                      {fields.type && (
                        <td className="px-3 py-1.5">
                          <span className="inline-flex max-w-[130px] flex-nowrap items-center gap-1 text-slate-700">
                            <span className="text-base">{TYPE_OPTIONS.find((o) => o.value === t.type)?.icon ?? '🧩'}</span>
                            <span className="whitespace-nowrap">{t.type}</span>
                          </span>
                        </td>
                      )}
                      {/* Related to */}
                      {fields.relatedTo && <td className="px-3 py-1.5 text-center text-slate-400">{t.related_to ?? ''}</td>}
                      {/* Internal tickets */}
                      {fields.internalTickets && (
                        <td className="px-3 py-1.5">
                          {t.internal_ticket === 'resolved' ? (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                              <CircleCheckIcon /> Resolved
                            </span>
                          ) : t.internal_ticket === 'unresolved' ? (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
                              <CircleXIcon /> Unresolved
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-200">
                              No internal ticket
                            </span>
                          )}
                        </td>
                      )}
                      {/* Notes */}
                      {fields.notes && (
                        <td className="px-3 py-1.5">
                          <button type="button" className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-700 hover:underline">
                            <PlusIcon /> Add note
                          </button>
                        </td>
                      )}
                      {/* Subject */}
                      {fields.subject && (
                        <td className="px-3 py-1.5">
                          <span className="inline-block w-[180px] truncate font-semibold text-slate-800">{t.subject}</span>
                        </td>
                      )}
                      {/* Rating */}
                      {fields.rating && (
                        <td className="px-3 py-1.5 text-center text-slate-400">
                          <StarRow value={t.rating ?? 0} />
                        </td>
                      )}
                      {/* Spam reason */}
                      {fields.spam && (
                        <td className="px-3 py-1.5 text-center">
                          <span className="text-[11px] italic text-slate-400">{t.spam_reason ?? 'Not spam'}</span>
                        </td>
                      )}
                      {/* Last message */}
                      {fields.lastMessage && (
                        <td className="px-3 py-1.5">
                          <div className="flex max-w-[320px] flex-col">
                            <div className="flex items-center">
                              <Avatar name={t.last_message.user} size="h-7 w-7 text-[9px]" img={photoFor(t.last_message.user)} />
                              <div className="ml-2 flex flex-col leading-tight">
                                <span className="text-[11px] font-bold text-sky-600">{t.last_message.user}</span>
                                <span className="text-[10px] text-slate-500">{t.last_message.org}</span>
                              </div>
                            </div>
                            <p className="mt-1 max-w-[300px] truncate text-[11px] font-semibold text-slate-700">{t.last_message.text}</p>
                          </div>
                        </td>
                      )}
                      {/* Date */}
                      {fields.date && <td className="px-3 py-1.5 text-slate-600">{fmtDateCell(t.created_at)}</td>}
                      {/* Programmed */}
                      {fields.programmed && <td className="px-3 py-1.5 text-slate-400">{t.programmed ? 'Yes' : '-'}</td>}
                      {/* First response at */}
                      {fields.firstResponse && (
                        <td className="px-3 py-1.5">
                          {t.first_response_at && t.first_response_mins !== null ? (
                            <div className="flex flex-col justify-center leading-tight">
                              <span className="text-[11px] text-slate-500">{fmtDateTime(t.first_response_at)}</span>
                              <span className="mt-1 inline-flex items-center text-[11px] font-semibold text-emerald-600">
                                <CheckIcon className="mr-1" /> {t.first_response_mins} Mins
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      )}
                      {/* Resolution time */}
                      {fields.resolution && (
                        <td className="px-3 py-1.5">
                          {t.resolution_at && t.resolution_mins !== null ? (
                            <div className={`flex flex-col justify-center leading-tight ${t.resolution_overdue ? 'text-amber-600' : 'text-emerald-600'}`}>
                              <span className="text-[11px] font-medium text-slate-500">{fmtDateTime(t.resolution_at)}</span>
                              <span className="mt-1 inline-flex items-center font-semibold">
                                {t.resolution_overdue ? <TriangleIcon className="mr-1" /> : <CheckIcon className="mr-1" />}
                                {t.resolution_mins} Mins
                                {t.resolution_overdue && <span className="ml-1 text-[10px]">(+{Math.round(t.resolution_mins / 60)} H)</span>}
                              </span>
                            </div>
                          ) : (
                            <span className="text-center text-slate-400">-</span>
                          )}
                        </td>
                      )}
                      {/* Priority */}
                      {fields.priority && (
                        <td className="px-3 py-1.5">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold ${PRIORITY_TONE[t.priority]}`}>
                            <DotIcon /> {t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}
                          </span>
                        </td>
                      )}
                      {/* Status */}
                      {fields.status && (
                        <td className="px-3 py-1.5">
                          {t.status === 'resolved' ? (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700">
                              <CircleCheckIcon /> Resolved
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-600">
                              <CircleXIcon /> Unresolved
                            </span>
                          )}
                        </td>
                      )}
                      {/* Toolbar */}
                      {fields.toolbar && (
                        <td className="px-3 py-1.5 text-right">
                          <Link
                            to={`${basePath}/${t.id}`}
                            className="inline-flex items-center justify-center rounded-md border border-sky-200 bg-sky-50 p-1.5 text-sky-600 transition hover:bg-sky-100"
                            title="View ticket"
                          >
                            <EyeIcon />
                          </Link>
                        </td>
                      )}
                    </tr>
                  ))
                  )}
                </tbody>
              </table>
            </div>

            {/* mobile card list */}
            <div className="hidden">
              {pageRows.length === 0 ? (
                <div className="px-4 py-16 text-center text-sm text-slate-400">No tickets match your filters.</div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {pageRows.map((t) => (
                    <li key={t.id} className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={t.author.name} size="h-9 w-9 text-[11px]" img={photoFor(t.author.name)} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">{t.subject}</p>
                            <p className="mt-0.5 truncate text-[11px] text-slate-500">
                              {t.author.name} · #{t.id} · {fmtDateCell(t.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${PRIORITY_TONE[t.priority]}`}>
                            {t.priority}
                          </span>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                              t.status === 'resolved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {t.status}
                          </span>
                          {t.internal_ticket !== 'none' && (
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                t.internal_ticket === 'resolved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              internal {t.internal_ticket}
                            </span>
                          )}
                          {t.rating != null && <span className="text-[10px] font-semibold text-slate-500">★ {t.rating}</span>}
                        </div>
                        {(t.owners ?? []).length > 0 && (
                          <div className="mt-2.5 flex items-center gap-1">
                            {(t.owners ?? []).slice(0, 4).map((o, i) => (
                              <div key={o.name} className={i === 0 ? '' : '-ml-2'}>
                                <Avatar name={o.name} size="h-6 w-6 text-[9px] ring-2 ring-white" img={photoFor(o.name)} />
                              </div>
                            ))}
                            <span className="ml-1 text-[10px] text-slate-400">{(t.owners ?? []).length} owner{(t.owners ?? []).length > 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>
                      <Link
                        to={`${basePath}/${t.id}`}
                        className="mt-1 inline-flex shrink-0 items-center justify-center rounded-md border border-sky-200 bg-sky-50 p-2.5 text-sky-600 transition hover:bg-sky-100"
                        title="View ticket"
                      >
                        <EyeIcon />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* footer / pagination */}
            <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="mr-2 whitespace-nowrap">Rows per page:</span>
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
                <span className="ml-2 whitespace-nowrap text-[11px] text-slate-500">Showing: {from} to {to} of {total}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={current === 0}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none sm:py-1.5"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={current >= totalPages - 1}
                  className="flex-1 rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none sm:py-1.5"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── column visibility popover ── */}
      {fieldsOpen && (
        <FilterOverlay pos={fieldsOpen.pos} width={260} onClose={() => setFieldsOpen(null)}>
          <div>
            <div className="px-3 pt-2">
              <h6 className="text-center text-[11px] font-bold uppercase tracking-wide text-slate-500">Showing fields</h6>
            </div>
            <div className="my-1.5 h-px bg-slate-100" />
            <div className="max-h-[240px] overflow-y-auto px-2">
              {FIELDS.map((f) => (
                <CheckRow
                  key={f.id}
                  checked={fields[f.id]}
                  onChange={() =>
                    f.disabled ? undefined : setFields((prev) => ({ ...prev, [f.id]: !prev[f.id] }))
                  }
                >
                  <span className={`ml-2 text-[11px] font-medium ${f.disabled ? 'text-slate-400' : 'text-slate-700'}`}>{f.label}</span>
                </CheckRow>
              ))}
            </div>
            <div className="my-1 h-px bg-slate-100" />
            <div className="px-3 pb-2 text-center">
              <button type="button" onClick={() => setFields(defaultFields())} className="text-xs font-semibold text-sky-600 hover:underline">
                Reset to default
              </button>
            </div>
          </div>
        </FilterOverlay>
      )}

      {/* ── column filter popovers ── */}
      {openFilter && (
        <FilterOverlay pos={openFilter.pos} onClose={() => setOpenFilter(null)}>
          {openFilter.kind === 'labels' && (
            <div>
              <div className="flex gap-1 px-3 pt-2">
                <button
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, labels: { ...f.labels, mode: 'include' } }))}
                  className={`flex-1 rounded-md py-1 text-[11px] font-bold transition ${
                    filters.labels.mode === 'include'
                      ? 'bg-brand-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Include
                </button>
                <button
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, labels: { ...f.labels, mode: 'exclude' } }))}
                  className={`flex-1 rounded-md py-1 text-[11px] font-bold transition ${
                    filters.labels.mode === 'exclude'
                      ? 'border border-rose-600 bg-rose-50 text-rose-600'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Exclude
                </button>
              </div>
              <div className="mx-3 mb-1 mt-2 h-px bg-slate-100" />
              <div className="px-3 text-[11px] font-semibold text-slate-900">Filter by labels</div>
              <div className="mx-3 my-1 h-px bg-slate-100" />
              <div className="max-h-[360px] overflow-y-auto px-1 pb-1">
                {LABEL_GROUPS.map((g) => (
                  <div key={g.name}>
                    <div className="mb-0.5 mt-1 px-2 text-[9px] font-bold uppercase tracking-wide text-slate-400">{g.name}</div>
                    {g.items.map((it) => (
                      <CheckRow
                        key={it.label}
                        checked={filters.labels.values.includes(it.label)}
                        onChange={() =>
                          setFilters((f) => {
                            const cur = f.labels.values;
                            return {
                              ...f,
                              labels: {
                                ...f.labels,
                                values: cur.includes(it.label) ? cur.filter((x) => x !== it.label) : [...cur, it.label],
                              },
                            };
                          })
                        }
                      >
                        <span className={`ml-2 inline-block rounded px-2 py-0.5 text-[10px] font-medium ${LABEL_TONE[it.tone]}`}>
                          {it.label}
                        </span>
                      </CheckRow>
                    ))}
                  </div>
                ))}
              </div>
              <SaveBar onSave={() => setOpenFilter(null)} />
            </div>
          )}

          {openFilter.kind === 'department' && (
            <div className="px-3 py-2">
              <div className="text-[11px] font-medium text-slate-700">Show only</div>
              <div className="my-1.5 h-px bg-slate-100" />
              <div className="flex max-h-[200px] flex-col gap-1">
                {DEPARTMENT_OPTIONS.map((o) => (
                  <CheckRow
                    key={o.value}
                    checked={filters.department.includes(o.value)}
                    onChange={() =>
                      applyFilters({
                        department: filters.department.includes(o.value)
                          ? filters.department.filter((x) => x !== o.value)
                          : [...filters.department, o.value],
                      })
                    }
                  >
                    <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-800">
                      <span className="text-xl">{o.icon}</span>
                      {o.value}
                    </span>
                  </CheckRow>
                ))}
              </div>
            </div>
          )}

          {openFilter.kind === 'orgType' && (
            <div>
              <div className="px-3 pt-2 text-[11px] font-semibold text-slate-900">Add type as filters</div>
              <div className="mx-3 my-1.5 h-px bg-slate-100" />
              <div className="max-h-[360px] overflow-y-auto px-2">
                {ORG_TYPE_OPTIONS.map((o) => (
                  <label
                    key={o.value}
                    className="mb-1 flex w-full cursor-pointer items-center rounded-md bg-slate-100 px-3 py-2 transition hover:bg-slate-200"
                  >
                    <input
                      type="checkbox"
                      checked={filters.orgType.includes(o.value)}
                      onChange={() =>
                        applyFilters({
                          orgType: filters.orgType.includes(o.value)
                            ? filters.orgType.filter((x) => x !== o.value)
                            : [...filters.orgType, o.value],
                        })
                      }
                      className="h-3.5 w-3.5 accent-brand-600"
                    />
                    <span className={`ml-2 inline-flex items-center gap-2 rounded px-3 py-1.5 text-xs font-semibold ${o.cls}`}>
                      <span className="text-base leading-none">{o.icon}</span>
                      {o.value}
                    </span>
                  </label>
                ))}
              </div>
              <SaveBar onSave={() => setOpenFilter(null)} />
            </div>
          )}

          {openFilter.kind === 'type' && (
            <div>
              <div className="px-3 pt-2 text-[11px] font-semibold text-slate-900">Add type as filters</div>
              <div className="mx-3 my-1.5 h-px bg-slate-100" />
              <div className="max-h-[360px] overflow-y-auto px-2">
                {TYPE_OPTIONS.map((o) => (
                  <label
                    key={o.value}
                    className="mb-1 flex w-full cursor-pointer items-center rounded-md bg-slate-100 px-3 py-2 transition hover:bg-slate-200"
                  >
                    <input
                      type="checkbox"
                      checked={filters.type.includes(o.value)}
                      onChange={() =>
                        applyFilters({
                          type: filters.type.includes(o.value)
                            ? filters.type.filter((x) => x !== o.value)
                            : [...filters.type, o.value],
                        })
                      }
                      className="h-3.5 w-3.5 accent-brand-600"
                    />
                    <span className="ml-2 inline-flex items-center gap-2 text-xs text-slate-600">
                      <span className="text-base leading-none">{o.icon}</span>
                      {o.value}
                    </span>
                  </label>
                ))}
              </div>
              <SaveBar onSave={() => setOpenFilter(null)} />
            </div>
          )}

          {openFilter.kind === 'rating' && (
            <div>
              <div className="px-3 pt-2 text-[11px] font-semibold text-slate-900">Add rating as filters</div>
              <div className="mx-3 my-1.5 h-px bg-slate-100" />
              <div className="max-h-[300px] overflow-y-auto px-2 pb-1">
                {[0, 1, 2, 3, 4, 5].map((r) => (
                  <CheckRow
                    key={r}
                    checked={filters.rating.includes(r)}
                    onChange={() =>
                      applyFilters({
                        rating: filters.rating.includes(r)
                          ? filters.rating.filter((x) => x !== r)
                          : [...filters.rating, r],
                      })
                    }
                  >
                    <span className="ml-2 inline-flex items-center gap-2">
                      <StarRow value={r} />
                      <span className="text-[10px] text-slate-400">{r} / 5</span>
                    </span>
                  </CheckRow>
                ))}
              </div>
              <SaveBar onSave={() => setOpenFilter(null)} />
            </div>
          )}

          {openFilter.kind === 'spam' && (
            <div className="px-3 py-2">
              <div className="text-[11px] font-medium text-slate-700">Show only</div>
              <div className="my-1.5 h-px bg-slate-100" />
              <div className="flex max-h-[260px] flex-col gap-1">
                {SPAM_OPTIONS.map((o) => (
                  <CheckRow
                    key={o.value}
                    checked={filters.spam.includes(o.value)}
                    onChange={() =>
                      applyFilters({
                        spam: filters.spam.includes(o.value) ? filters.spam.filter((x) => x !== o.value) : [...filters.spam, o.value],
                      })
                    }
                  >
                    <span className="ml-2 inline-flex items-center gap-1.5 text-xs text-slate-700">
                      <span className="text-sm">{o.icon}</span>
                      {o.value}
                    </span>
                  </CheckRow>
                ))}
              </div>
            </div>
          )}

          {openFilter.kind === 'firstResponse' && (
            <div>
              <div className="px-3 pt-2 text-[11px] font-semibold text-slate-900">Add type as filters</div>
              <div className="mx-3 my-1.5 h-px bg-slate-100" />
              <div className="max-h-[360px] overflow-y-auto px-2 pb-1">
                {FIRST_RESPONSE_OPTIONS.map((o) => (
                  <CheckRow
                    key={o.key}
                    checked={filters.firstResponse.includes(o.key)}
                    onChange={() =>
                      applyFilters({
                        firstResponse: filters.firstResponse.includes(o.key)
                          ? filters.firstResponse.filter((x) => x !== o.key)
                          : [...filters.firstResponse, o.key],
                      })
                    }
                  >
                    <span className={`ml-2 inline-flex items-center text-xs font-medium ${o.cls}`}>{o.label}</span>
                  </CheckRow>
                ))}
              </div>
              <SaveBar onSave={() => setOpenFilter(null)} />
            </div>
          )}

          {openFilter.kind === 'priority' && (
            <div className="px-3 py-2">
              <div className="text-[11px] font-medium text-slate-700">Show only</div>
              <div className="my-1.5 h-px bg-slate-100" />
              <div className="flex max-h-[200px] flex-col gap-1">
                {PRIORITY_OPTIONS.map((o) => (
                  <CheckRow
                    key={o.value}
                    checked={filters.priority.includes(o.value)}
                    onChange={() =>
                      applyFilters({
                        priority: filters.priority.includes(o.value)
                          ? filters.priority.filter((x) => x !== o.value)
                          : [...filters.priority, o.value],
                      })
                    }
                  >
                    <span className={`ml-2 inline-flex w-full items-center rounded px-2 py-1 text-xs font-semibold ${o.cls}`}>{o.label}</span>
                  </CheckRow>
                ))}
              </div>
            </div>
          )}

          {openFilter.kind === 'status' && (
            <div className="px-3 py-2">
              <div className="text-[11px] font-medium text-slate-700">Show only</div>
              <div className="my-1.5 h-px bg-slate-100" />
              <div className="flex max-h-[200px] flex-col gap-1">
                {STATUS_OPTIONS.map((o) => (
                  <CheckRow
                    key={o.value}
                    checked={filters.status.includes(o.value)}
                    onChange={() =>
                      applyFilters({
                        status: filters.status.includes(o.value)
                          ? filters.status.filter((x) => x !== o.value)
                          : [...filters.status, o.value],
                      })
                    }
                  >
                    <span className={`ml-2 inline-flex w-full items-center rounded px-2 py-1 text-xs font-semibold ${o.cls}`}>
                      {o.value === 'resolved' ? (
                        <CircleCheckIcon className="mr-2" />
                      ) : (
                        <CircleXIcon className="mr-2" />
                      )}
                      {o.label}
                    </span>
                  </CheckRow>
                ))}
              </div>
            </div>
          )}

          {openFilter.kind === 'internalTickets' && (
            <div className="px-3 py-2">
              <div className="text-[11px] font-medium text-slate-700">Show only</div>
              <div className="my-1.5 h-px bg-slate-100" />
              <div className="flex max-h-[220px] flex-col gap-1">
                {INTERNAL_TICKET_OPTIONS.map((o) => (
                  <CheckRow
                    key={o.value}
                    checked={filters.internalTickets.includes(o.value)}
                    onChange={() => {
                      if (o.value === 'all') {
                        applyFilters({ internalTickets: ['all'] });
                        return;
                      }
                      const rest = filters.internalTickets.filter((x) => x !== 'all');
                      applyFilters({
                        internalTickets: rest.includes(o.value) ? rest.filter((x) => x !== o.value) : [...rest, o.value],
                      });
                    }}
                  >
                    <span className={`ml-2 inline-flex w-full items-center rounded px-2 py-0.5 text-[11px] font-semibold ${o.cls}`}>{o.label}</span>
                  </CheckRow>
                ))}
              </div>
            </div>
          )}
        </FilterOverlay>
      )}

      <CreateTicketModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (draft) => {
          if (!data) return;
          try {
            const isStocking = basePath.includes('/stocking');
            const isSupport = basePath.includes('/support');
            const fn = isStocking ? createStockingTicket : isSupport ? createSupportTicket : createChefTicket;
            const created = await fn({
              author_name: CURRENT_USER,
              owner_names: draft.assignees,
              subject: draft.title,
              description: draft.description || '',
              department: draft.dept === 'All' ? 'Commercial' : draft.dept,
              priority: (draft.priority === 'low' ? 'medium' : draft.priority) as ChefTicket['priority'],
              related_to: draft.related.join(', ') || null,
            });
            setData((d) => (d ? { ...d, tickets: [created, ...d.tickets] } : d));
            setPage(0);
          } catch (e) {
            alert(apiErrorMessage(e));
          }
        }}
      />
    </div>
  );
}