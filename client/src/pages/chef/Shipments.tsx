import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiErrorMessage, apiGet, Shipment, ShipmentsResult } from '../../lib/api';
import { Spinner } from '../../components/ui';
import ShipmentTicketModal from './ShipmentTicketModal';

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

function Avatar({ name, size = 'h-8 w-8 text-[10px]' }: { name: string; size?: string }) {
  const label = name && name !== '—' ? name : 'U';
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${size} ${avatarTone(label)}`}>
      {initials(label)}
    </span>
  );
}

/** Deterministic short org code like Falcon's LZ118 / FV711 / YW254. */
function codeFor(seed: string): string {
  let h = 7;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const n = (h % 900) + 100;
  return letters[h % 26] + letters[(h >> 5) % 26] + n;
}

type Icon = { className?: string };

function PhoneIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M164.9 24.6c-7.7-18.6-28-28.5-47.4-23.2l-88 24C12.1 30.2 0 46 0 64C0 311.4 200.6 512 448 512c18 0 33.8-12.1 38.6-29.5l24-88c5.3-19.4-4.6-39.7-23.2-47.4l-96-40c-16.3-6.8-35.2-2.1-46.3 11.6L304.7 368C234.3 334.7 177.3 277.7 144 207.3L193.3 167c13.7-11.2 18.4-30 11.6-46.3l-40-96z" />
    </svg>
  );
}

function UserIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true">
      <path d="M224 256c70.7 0 128-57.3 128-128S294.7 0 224 0S96 57.3 96 128s57.3 128 128 128zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512H418.3c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304H178.3z" />
    </svg>
  );
}

function BarcodeIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M24 32C10.7 32 0 42.7 0 56V456c0 13.3 10.7 24 24 24H40c13.3 0 24-10.7 24-24V56c0-13.3-10.7-24-24-24H24zm88 0c-8.8 0-16 7.2-16 16V464c0 8.8 7.2 16 16 16s16-7.2 16-16V48c0-8.8-7.2-16-16-16zm72 0c-13.3 0-24 10.7-24 24V456c0 13.3 10.7 24 24 24h16c13.3 0 24-10.7 24-24V56c0-13.3-10.7-24-24-24H184zm96 0c-13.3 0-24 10.7-24 24V456c0 13.3 10.7 24 24 24h16c13.3 0 24-10.7 24-24V56c0-13.3-10.7-24-24-24H280zM448 56V456c0 13.3 10.7 24 24 24h16c13.3 0 24-10.7 24-24V56c0-13.3-10.7-24-24-24H472c-13.3 0-24 10.7-24 24zm-64-8V464c0 8.8 7.2 16 16 16s16-7.2 16-16V48c0-8.8-7.2-16-16-16s-16 7.2-16 16z" />
    </svg>
  );
}

function CircleIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0S0 114.6 0 256S114.6 512 256 512z" />
    </svg>
  );
}

function ChartBarIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M32 32c17.7 0 32 14.3 32 32V400c0 8.8 7.2 16 16 16H480c17.7 0 32 14.3 32 32s-14.3 32-32 32H80c-44.2 0-80-35.8-80-80V64C0 46.3 14.3 32 32 32zm96 96c0-17.7 14.3-32 32-32l192 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-192 0c-17.7 0-32-14.3-32-32zm32 64H288c17.7 0 32 14.3 32 32s-14.3 32-32 32H160c-17.7 0-32-14.3-32-32s14.3-32 32-32zm0 96H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H160c-17.7 0-32-14.3-32-32s14.3-32 32-32z" />
    </svg>
  );
}

function FileExcelIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
      <path d="M64 0C28.7 0 0 28.7 0 64V448c0 35.3 28.7 64 64 64H320c35.3 0 64-28.7 64-64V160H256c-17.7 0-32-14.3-32-32V0H64zM256 0V128H384L256 0zM155.7 250.2L192 302.1l36.3-51.9c7.6-10.9 22.6-13.5 33.4-5.9s13.5 22.6 5.9 33.4L221.3 344l46.4 66.2c7.6 10.9 5 25.8-5.9 33.4s-25.8 5-33.4-5.9L192 385.8l-36.3 51.9c-7.6 10.9-22.6 13.5-33.4 5.9s-13.5-22.6-5.9-33.4L162.7 344l-46.4-66.2c-7.6-10.9-5-25.8 5.9-33.4s25.8-5 33.4 5.9z" />
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
    <svg className={className} width="11" height="11" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M105.1 202.6c7.7-21.8 20.2-42.3 37.8-59.8c62.5-62.5 163.8-62.5 226.3 0L386.3 160H336c-17.7 0-32 14.3-32 32s14.3 32 32 32H463.5c0 0 0 0 0 0h.4c17.7 0 32-14.3 32-32V64c0-17.7-14.3-32-32-32s-32 14.3-32 32v51.2L414.4 97.6c-87.5-87.5-229.3-87.5-316.8 0C73.2 122 55.6 150.7 44.8 181.4c-5.9 16.7 2.9 34.9 19.5 40.8s34.9-2.9 40.8-19.5zM39 289.3c-5 1.5-9.8 4.2-13.7 8.2c-4 4-6.7 8.8-8.1 14c-.3 1.2-.6 2.5-.8 3.8c-.3 1.7-.4 3.4-.4 5.1V448c0 17.7 14.3 32 32 32s32-14.3 32-32V396.9l17.6 17.5 0 0c87.5 87.4 229.3 87.4 316.7 0c24.4-24.4 42.1-53.1 52.9-83.7c5.9-16.7-2.9-34.9-19.5-40.8s-34.9 2.9-40.8 19.5c-7.7 21.8-20.2 42.3-37.8 59.8c-62.5 62.5-163.8 62.5-226.3 0l-.1-.1L125.6 352H176c17.7 0 32-14.3 32-32s-14.3-32-32-32H48.4c-1.6 0-3.2 .1-4.8 .3s-3.1 .5-4.6 1z" />
    </svg>
  );
}

function FunnelIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M3.9 54.9C10.5 40.9 24.5 32 40 32H472c15.5 0 29.5 8.9 36.1 22.9s4.6 30.5-5.2 42.5L320 320.9V448c0 12.1-6.8 23.2-17.7 28.6s-23.8 4.3-33.5-3l-64-48c-8.1-6-12.8-15.5-12.8-25.6V320.9L9 97.3C-.7 85.4-2.8 68.8 3.9 54.9z" />
    </svg>
  );
}

function TableColumnsIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M0 96C0 60.7 28.7 32 64 32H448c35.3 0 64 28.7 64 64V416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V96zm64 64V416H224V160H64zm384 0H288V416H448V160z" />
    </svg>
  );
}

function EyeIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 576 512" fill="currentColor" aria-hidden="true">
      <path d="M288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4C142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C433.5 68.8 368.8 32 288 32zM432 256c0 79.5-64.5 144-144 144s-144-64.5-144-144s64.5-144 144-144s144 64.5 144 144zM288 192c0 35.3-28.7 64-64 64c-11.5 0-22.3-3-31.6-8.4c-.2 2.8-.4 5.5-.4 8.4c0 53 43 96 96 96s96-43 96-96s-43-96-96-96c-2.8 0-5.6 .1-8.4 .4c5.3 9.3 8.4 20.1 8.4 31.6z" />
    </svg>
  );
}

function PaperPlaneIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M498.1 5.6c10.1 7 15.4 19.1 13.5 31.2l-64 416c-1.5 9.7-7.4 18.2-16 23s-18.9 5.4-28 1.6L277.3 424.9l-40.1 74.5c-5.2 9.7-16.3 14.6-27 11.9S192 499 192 488V392c0-5.3 1.8-10.5 5.1-14.7L362.4 164.7c2.5-7.1-6.5-14.3-13-8.4L170.4 318.2l-32 28.9 0 0c-9.2 8.3-22.3 10.6-33.8 5.8l-85-35.4C8.4 312.8 .8 302.2 .1 290s5.5-23.7 16.1-29.8l448-256c10.7-6.1 23.9-5.5 34 1.4z" />
    </svg>
  );
}

function ClockIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="11" height="11" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M256 512C114.6 512 0 397.4 0 256S114.6 0 256 0S512 114.6 512 256s-114.6 256-256 256zM232 120V256c0 8 4 15.5 10.7 20l96 64c11 7.4 25.9 4.4 33.3-6.7s4.4-25.9-6.7-33.3L280 243.2V120c0-13.3-10.7-24-24-24s-24 10.7-24 24z" />
    </svg>
  );
}

function TruckIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="11" height="11" viewBox="0 0 640 512" fill="currentColor" aria-hidden="true">
      <path d="M48 0C21.5 0 0 21.5 0 48V368c0 26.5 21.5 48 48 48H64c0 53 43 96 96 96s96-43 96-96H384c0 53 43 96 96 96s96-43 96-96h32c17.7 0 32-14.3 32-32s-14.3-32-32-32V288 256 237.3c0-17-6.7-33.3-18.7-45.3L512 114.7c-12-12-28.3-18.7-45.3-18.7H416V48c0-26.5-21.5-48-48-48H48zM416 160h50.7L544 237.3V256H416V160zM208 416c0 26.5-21.5 48-48 48s-48-21.5-48-48s21.5-48 48-48s48 21.5 48 48zm272 48c-26.5 0-48-21.5-48-48s21.5-48 48-48s48 21.5 48 48s-21.5 48-48 48z" />
    </svg>
  );
}

function DropboxIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="11" height="11" viewBox="0 0 528 512" fill="currentColor" aria-hidden="true">
      <path d="M264.4 116.3l-132 84.3 132 84.3-132 84.3L0 284.1l132.3-84.3L0 116.3 132.3 32l132.1 84.3zM131.6 395.7l132-84.3 132 84.3-132 84.3-132-84.3zm132.8-111.6l132-84.3-132-83.6L395.7 32 528 116.3l-132.3 84.3L528 284.8l-132.3 84.3-131.3-85z" />
    </svg>
  );
}

function InfoIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0S0 114.6 0 256s114.6 256 256 256zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-144c-17.7 0-32-14.3-32-32s14.3-32 32-32s32 14.3 32 32s-14.3 32-32 32z" />
    </svg>
  );
}

function statusIconEl(name: string): ReactNode {
  if (name === 'truck') return <TruckIcon className="mr-1 inline text-amber-700" />;
  if (name === 'dropbox') return <DropboxIcon className="mr-1 inline text-amber-700" />;
  return <ClockIcon className="mr-1 inline text-amber-700" />;
}

function SortIcon({ className = '' }: Icon) {
  return (
    <svg className={className} width="9" height="9" viewBox="0 0 320 512" fill="currentColor" aria-hidden="true">
      <path d="M137.4 41.4c12.5-12.5 32.8-12.5 45.3 0l128 128c9.2 9.2 11.9 22.9 6.9 34.9s-16.6 19.8-29.6 19.8H32c-12.9 0-24.6-7.8-29.6-19.8s-2.2-25.7 6.9-34.9l128-128zm0 429.3l-128-128c-9.2-9.2-11.9-22.9-6.9-34.9s16.6-19.8 29.6-19.8H288c12.9 0 24.6 7.8 29.6 19.8s2.2 25.7-6.9 34.9l-128 128c-12.5 12.5-32.8 12.5-45.3 0z" />
    </svg>
  );
}

/* ── order type options (toolbar filter) ─────────────────────────────── */

type OrderTypeMeta = { value: string; icon: string; cls: string };

const ORDER_TYPE_OPTIONS: OrderTypeMeta[] = [
  { value: 'Dropshipping', icon: '🛒', cls: 'bg-blue-50 text-blue-700' },
  { value: 'Wholesale order', icon: '🗒️', cls: 'bg-sky-50 text-sky-700' },
  { value: 'Reservation order', icon: '🏬', cls: 'bg-sky-50 text-sky-700' },
  { value: 'Wholesale & reservation orders', icon: '🗒️', cls: 'bg-sky-50 text-sky-700' },
  { value: 'Fulfillment', icon: '⚡', cls: 'bg-blue-50 text-blue-700' },
  { value: 'Of wholesale bought products', icon: '🗒️', cls: 'bg-blue-50 text-blue-700' },
  { value: 'Of reserved products', icon: '🏬', cls: 'bg-blue-50 text-blue-700' },
  { value: 'Confirmation orders', icon: '☎️', cls: 'bg-blue-50 text-blue-700' },
  { value: 'Exchanges', icon: '🔁', cls: 'bg-amber-50 text-amber-700' },
  { value: 'Non-COD orders', icon: '💳', cls: 'bg-rose-50 text-rose-700' },
  { value: 'Late Fulfillment', icon: '⏰', cls: 'bg-rose-50 text-rose-700' },
  { value: 'Delivery Verification', icon: '🛠️', cls: 'bg-amber-50 text-amber-700' },
  { value: 'Delivery Verification - Claims', icon: '🛠️', cls: 'bg-amber-50 text-amber-700' },
  { value: 'From Integration', icon: '🛍️', cls: 'bg-blue-50 text-blue-700' },
];

function orderTypeMeta(value: string): OrderTypeMeta {
  return ORDER_TYPE_OPTIONS.find((o) => o.value === value) ?? { value, icon: '🛒', cls: 'bg-blue-50 text-blue-700' };
}

const ROW_SIZES = [5, 10, 20, 50, 1000];

const SEARCH_SCOPES = [
  { id: 'phone', label: 'Search by phone', icon: <PhoneIcon className="text-slate-400" /> },
  { id: 'name', label: 'Search by name', icon: <UserIcon className="text-slate-400" /> },
  { id: 'tracking', label: 'Search tracking number', icon: <BarcodeIcon className="text-slate-400" /> },
] as const;

type SearchScopeId = (typeof SEARCH_SCOPES)[number]['id'];

/* ── column model ─────────────────────────────────────────────────────── */

type ShipCol =
  | 'gid'
  | 'late'
  | 'incubators'
  | 'managers'
  | 'devs'
  | 'retailer'
  | 'suppliers'
  | 'fulfiller'
  | 'warehouse'
  | 'created'
  | 'updated'
  | 'fullfillable'
  | 'prepared'
  | 'picked'
  | 'firstAttempt'
  | 'lastAttempt'
  | 'issueResolved'
  | 'issueReason'
  | 'attempts'
  | 'delivered'
  | 'lastCarrierUpdate'
  | 'expShipFrom'
  | 'expShipTo'
  | 'expDelivFrom'
  | 'expDelivTo'
  | 'verifiedAt'
  | 'verifiedBy'
  | 'markedPost'
  | 'carrierRefund'
  | 'clientRefund'
  | 'codSettlement'
  | 'receivables'
  | 'carrierCodAmount'
  | 'carrierCodStatus'
  | 'to'
  | 'status'
  | 'tracking'
  | 'product'
  | 'cost'
  | 'cod'
  | 'toolbar';

const COLUMNS: { id: ShipCol; label: string; disabled?: boolean }[] = [
  { id: 'gid', label: 'GID' },
  { id: 'late', label: 'Late fulfillment' },
  { id: 'incubators', label: 'Account Incubators' },
  { id: 'managers', label: 'Account Managers' },
  { id: 'devs', label: 'Business Developers' },
  { id: 'retailer', label: 'Retailer' },
  { id: 'suppliers', label: 'Suppliers' },
  { id: 'fulfiller', label: 'Fulfiller' },
  { id: 'warehouse', label: 'Warehouse' },
  { id: 'created', label: 'Created at' },
  { id: 'updated', label: 'Updated at' },
  { id: 'fullfillable', label: 'Fullfillable at' },
  { id: 'prepared', label: 'Prepared at' },
  { id: 'picked', label: 'Picked up at' },
  { id: 'firstAttempt', label: 'First Carrier Attempt at' },
  { id: 'lastAttempt', label: 'Last Carrier Attempt at' },
  { id: 'issueResolved', label: 'Delivery Issue Resolved at' },
  { id: 'issueReason', label: 'Delivery Issue Reason' },
  { id: 'attempts', label: 'Attempt Count' },
  { id: 'delivered', label: 'Delivered at' },
  { id: 'lastCarrierUpdate', label: 'Last Carrier Update at' },
  { id: 'expShipFrom', label: 'Expected Shipping Date From' },
  { id: 'expShipTo', label: 'Expected Shipping Date To' },
  { id: 'expDelivFrom', label: 'Expected Delivery Date From' },
  { id: 'expDelivTo', label: 'Expected Delivery Date To' },
  { id: 'verifiedAt', label: 'Delivery Verified at' },
  { id: 'verifiedBy', label: 'Delivery Verified By' },
  { id: 'markedPost', label: 'Marked Delivered Post Verification' },
  { id: 'carrierRefund', label: 'Carrier refunded' },
  { id: 'clientRefund', label: 'Client refunded' },
  { id: 'codSettlement', label: 'COD Settlement Covers COD Amount' },
  { id: 'receivables', label: 'Receivables Cover Payables' },
  { id: 'carrierCodAmount', label: 'Carrier COD Payment Amount' },
  { id: 'carrierCodStatus', label: 'Carrier COD Payment Status' },
  { id: 'to', label: 'To' },
  { id: 'status', label: 'Status' },
  { id: 'tracking', label: 'Tracking Numbers' },
  { id: 'product', label: 'Product' },
  { id: 'cost', label: 'Cost' },
  { id: 'cod', label: 'COD Amount' },
  { id: 'toolbar', label: 'Toolbar', disabled: true },
];

function defaultCols(): Record<ShipCol, boolean> {
  return Object.fromEntries(COLUMNS.map((c) => [c.id, true])) as Record<ShipCol, boolean>;
}

type HeaderDef = { id: ShipCol; funnel?: boolean; sort?: boolean; center?: boolean; end?: boolean };

const HEADERS: HeaderDef[] = [
  { id: 'gid', funnel: true, sort: true },
  { id: 'late', sort: true },
  { id: 'incubators', funnel: true, sort: true },
  { id: 'managers', funnel: true, sort: true },
  { id: 'devs', funnel: true, sort: true },
  { id: 'retailer', funnel: true, sort: true },
  { id: 'suppliers', funnel: true, sort: true },
  { id: 'fulfiller', funnel: true, sort: true },
  { id: 'warehouse', funnel: true, sort: true },
  { id: 'created', funnel: true, sort: true },
  { id: 'updated', funnel: true, sort: true },
  { id: 'fullfillable', funnel: true, sort: true },
  { id: 'prepared', funnel: true, sort: true },
  { id: 'picked', funnel: true, sort: true },
  { id: 'firstAttempt', funnel: true, sort: true },
  { id: 'lastAttempt', funnel: true, sort: true },
  { id: 'issueResolved', funnel: true, sort: true },
  { id: 'issueReason', funnel: true, sort: true },
  { id: 'attempts', funnel: true, sort: true, center: true },
  { id: 'delivered', funnel: true, sort: true },
  { id: 'lastCarrierUpdate', funnel: true, sort: true },
  { id: 'expShipFrom', funnel: true, sort: true },
  { id: 'expShipTo', funnel: true, sort: true },
  { id: 'expDelivFrom', funnel: true, sort: true },
  { id: 'expDelivTo', funnel: true, sort: true },
  { id: 'verifiedAt', funnel: true, sort: true },
  { id: 'verifiedBy', funnel: true, sort: true },
  { id: 'markedPost', funnel: true },
  { id: 'carrierRefund', funnel: true },
  { id: 'clientRefund', funnel: true },
  { id: 'codSettlement', funnel: true },
  { id: 'receivables', funnel: true },
  { id: 'carrierCodAmount', funnel: true, sort: true },
  { id: 'carrierCodStatus', funnel: true },
  { id: 'to', funnel: true, sort: true },
  { id: 'status', funnel: true },
  { id: 'tracking', center: true },
  { id: 'product', funnel: true },
  { id: 'cost', sort: true, center: true },
  { id: 'cod', sort: true, center: true },
  { id: 'toolbar', end: true },
];

/* ── helpers ──────────────────────────────────────────────────────────── */

function slot(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function dateOnly(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function clockSlot(iso: string | null) {
  if (!iso) return null;
  return <span className="text-[11px] tabular-nums text-slate-800">{slot(iso)}</span>;
}

function YesNo({ v, naWhenNull = true }: { v: boolean | null; naWhenNull?: boolean }) {
  if (v == null) return <span className="text-[11px] font-semibold text-slate-400">{naWhenNull ? 'NA' : 'No'}</span>;
  return (
    <span className={`text-[11px] font-semibold ${v ? 'text-emerald-700' : 'text-slate-500'}`}>{v ? 'Yes' : 'No'}</span>
  );
}

function premiumTone(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 2 === 0 ? { icon: '⚡', cls: 'bg-emerald-500' } : { icon: '👑', cls: 'bg-amber-500' };
}

function OrgCell({ name, code, seed }: { name: string | null; code: string; seed: string }) {
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
          <a href="/chef/shipments" onClick={(e) => e.preventDefault()} className="mb-0 px-1 text-[11px] font-semibold leading-tight text-slate-900">
            {name}
          </a>
          <a href="/chef/shipments" onClick={(e) => e.preventDefault()} className="ms-2 mt-0.5 text-[10px] text-sky-600">
            {code}
          </a>
        </div>
      </div>
    </div>
  );
}

function PersonRow({ name }: { name: string }) {
  return (
    <div className="flex items-center pe-2">
      <Avatar name={name} size="h-9 w-9 text-[10px]" />
      <div className="ms-2 flex flex-col leading-snug">
        <span className="whitespace-nowrap text-[11px] font-semibold text-slate-800">{name}</span>
        <a href="/chef/shipments" onClick={(e) => e.preventDefault()} className="mt-0.5 text-[10px] text-sky-600">
          Filter by
        </a>
      </div>
    </div>
  );
}

function variationRows(v: string | null): ReactNode {
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

function tnd(n: number | null): string {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n) + ' TND';
}

function Pill({ children, cls }: { children: ReactNode; cls: string }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-semibold ${cls}`}>{children}</span>;
}

function People({ names }: { names: string[] }) {
  if (!names.length) return <span className="text-slate-300">—</span>;
  return (
    <div className="flex flex-col">
      {names.map((n) => (
        <PersonRow key={n} name={n} />
      ))}
    </div>
  );
}

function SupplierCell({ suppliers }: { suppliers: string[] }) {
  if (!suppliers.length) return <span className="text-slate-300">—</span>;
  return (
    <div className="flex flex-col gap-1.5">
      {suppliers.map((name) => (
        <div key={name} className="flex items-center" style={{ width: 200 }}>
          <Avatar name={name} size="h-7 w-7 text-[9px]" />
          <span className="ms-1.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-sky-500 text-[7px] leading-none text-white">
            🏪
          </span>
          <span className="ms-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-500 text-[7px] leading-none text-white">
            🪂
          </span>
          <div className="ms-2 flex min-w-0 flex-col">
            <a href="/chef/shipments" onClick={(e) => e.preventDefault()} className="mb-0 max-w-[120px] truncate text-[11px] font-semibold leading-tight text-slate-900">
              {name}
            </a>
            <a href="/chef/shipments" onClick={(e) => e.preventDefault()} className="ms-2 mt-0.5 text-[10px] text-sky-600">
              {codeFor('sup_' + name)}
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

function tileBg(emoji: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><rect width='40' height='40' fill='white'/><text x='20' y='27' font-size='18' text-anchor='middle'>${emoji}</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
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

/* ── page ─────────────────────────────────────────────────────────────── */

export default function ChefShipments({ defaultSupplier, defaultRetailer }: { defaultSupplier?: string; defaultRetailer?: string } = {}) {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const [ticketFor, setTicketFor] = useState<{ id: number; gid: string } | null>(null);
  const [search, setSearch] = useState(defaultRetailer ?? '');
  const [searchType, setSearchType] = useState<SearchScopeId>(defaultRetailer ? 'name' : 'phone');
  const [multiple, setMultiple] = useState(false);
  const [orderTypes, setOrderTypes] = useState<string[]>([]);
  const [cols, setCols] = useState<Record<ShipCol, boolean>>(defaultCols);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [supplierFilter, setSupplierFilter] = useState<string | null>(defaultSupplier ?? null);

  const [otOpen, setOtOpen] = useState<{ pos: { left: number; top: number } } | null>(null);
  const [otDraft, setOtDraft] = useState<string[]>([]);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  const [colsOpen, setColsOpen] = useState<{ pos: { left: number; top: number } } | null>(null);

  const load = () => {
    setLoading(true);
    apiGet<ShipmentsResult>('/chef/shipments')
      .then((r) => setShipments(r.shipments))
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const pushToast = (msg: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3200);
  };

  const openPop = (setter: React.Dispatch<React.SetStateAction<{ pos: { left: number; top: number } } | null>>) => (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setter((cur) =>
      cur ? null : { pos: { left: Math.max(8, Math.min(rect.left, window.innerWidth - 312)), top: rect.bottom + 4 } }
    );
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return shipments.filter((s) => {
      if (supplierFilter && !s.suppliers.includes(supplierFilter)) return false;
      if (orderTypes.length && !orderTypes.includes(s.order_type)) return false;
      if (!q) return true;
      const tokens = multiple ? q.split(/[\s,]+/).filter(Boolean) : [q];
      for (const tok of tokens) {
        if (searchType === 'phone' && (s.retailer_phone ?? '').toLowerCase().includes(tok)) return true;
        if (searchType === 'name' && (s.retailer_name ?? '').toLowerCase().includes(tok)) return true;
        if (searchType === 'tracking' && s.tracking_numbers.some((t) => t.toLowerCase().includes(tok))) return true;
      }
      return false;
    });
  }, [shipments, search, searchType, multiple, orderTypes, supplierFilter]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(current * pageSize, current * pageSize + pageSize);
  const from = total === 0 ? 0 : current * pageSize + 1;
  const to = Math.min(total, (current + 1) * pageSize);
  const colCount = COLUMNS.filter((c) => cols[c.id]).length;

  const toggleRow = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const pageAllSelected = pageRows.length > 0 && pageRows.every((s) => selected.has(s.id));
  const togglePageAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (pageAllSelected) pageRows.forEach((s) => next.delete(s.id));
      else pageRows.forEach((s) => next.add(s.id));
      return next;
    });

  const exportCsv = () => {
    const head = COLUMNS.map((c) => c.label).join(',');
    const lines = filtered.map((s) =>
      [
        s.gid,
        s.order_type,
        s.retailer_name ?? '',
        s.retailer_phone ?? '',
        (s.suppliers ?? []).join(' | '),
        s.fulfiller ?? '',
        s.warehouse ?? '',
        s.created_at,
        s.status,
        s.tracking_numbers.join(' | '),
        s.product_name,
        tnd(s.cost).replace(' TND', ''),
        tnd(s.cod_amount).replace(' TND', ''),
      ].join(',')
    );
    const blob = new Blob([[head, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shipments.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const scopeLabel = SEARCH_SCOPES.find((s) => s.id === searchType) ?? SEARCH_SCOPES[0];
  const otCount = orderTypes.length;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* ── card header: title + toolbar ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
        <h5 className="mb-0 w-full whitespace-nowrap text-base font-bold text-slate-900 lg:w-auto">Shipments</h5>

        <form
          className="flex w-full items-center overflow-hidden rounded-lg border border-slate-300 sm:w-auto"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(0);
          }}
        >
          <div className="relative">
            <button
              type="button"
              onClick={() => setScopeOpen((o) => !o)}
              title={scopeLabel.label}
              className="flex h-full items-center bg-sky-50 px-2.5 py-2 text-sky-600 transition hover:bg-sky-100"
            >
              {scopeLabel.icon}
            </button>
            {scopeOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setScopeOpen(false)} />
                <div className="absolute left-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
                  {SEARCH_SCOPES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSearchType(s.id);
                        setScopeOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${
                        searchType === s.id ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {s.icon}
                      {s.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="relative">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              type="search"
              placeholder="Search"
              className="w-[200px] border-transparent bg-white py-2 pl-2 pr-8 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand-500"
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
              <SearchIcon />
            </span>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setModeOpen((o) => !o)}
              title={multiple ? 'Search multiple' : 'Search single'}
              className="flex h-full items-center bg-sky-50 px-2.5 py-2 text-sky-600 transition hover:bg-sky-100"
            >
              <CircleIcon className={multiple ? 'text-sky-600' : 'text-slate-600'} />
            </button>
            {modeOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setModeOpen(false)} />
                <div className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setMultiple(false);
                      setModeOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${
                      !multiple ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <CircleIcon className="text-slate-400" />
                    Search single
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMultiple(true);
                      setModeOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition ${
                      multiple ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <ChartBarIcon className="text-slate-400" />
                    Search multiple
                  </button>
                </div>
              </>
            )}
          </div>
        </form>

        {supplierFilter && (
          <button
            type="button"
            onClick={() => setSupplierFilter(null)}
            title="Remove supplier filter"
            className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-gradient-to-b from-brand-50 to-brand-100 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:from-brand-100 hover:to-brand-200"
          >
            Supplier: {supplierFilter}
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold leading-none text-white">×</span>
          </button>
        )}

        <div className="w-full sm:w-auto">
          <button
            type="button"
            onClick={openPop(setOtOpen)}
            className="inline-flex w-full items-center gap-1.5 rounded-lg border border-sky-300 bg-gradient-to-b from-slate-100 to-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:from-sky-50 hover:to-sky-100 sm:w-auto"
          >
            <FunnelIcon className="text-info-600 text-brand-600" />
            Order Type
            {otCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold leading-none text-white">
                {otCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 md:ml-auto md:w-auto">
          <div className="flex">
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
            >
              <FileExcelIcon />
              <span className="hidden sm:inline">Export all</span>
            </button>
            <button
              type="button"
              onClick={() => {
                load();
                pushToast('Shipments synced successfully');
              }}
              className="ml-2 inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
            >
              <RotateIcon />
              <span className="hidden sm:inline">Sync all</span>
            </button>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={openPop(setColsOpen)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <TableColumnsIcon />
              Columns
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[4200px] text-left text-xs">
              <thead>
                <tr className="whitespace-nowrap border-b border-slate-200 bg-slate-100 align-middle text-xs text-slate-800">
                  <th className="px-3 py-2.5" style={{ maxWidth: 50 }}>
                    <div className="flex items-center">
                      <input type="checkbox" checked={pageAllSelected} onChange={togglePageAll} className="h-3.5 w-3.5 accent-brand-600" />
                    </div>
                  </th>
                  {HEADERS.filter((h) => cols[h.id]).map((h) => {
                    const label = COLUMNS.find((c) => c.id === h.id)?.label ?? h.id;
                    return (
                      <th
                        key={h.id}
                        title="Toggle SortBy"
                        className={`whitespace-nowrap px-3 py-2.5 ${h.center ? 'text-center' : ''} ${h.end ? 'text-right' : ''}`}
                      >
                        <div className={`flex items-center gap-1 ${h.center ? 'justify-center' : ''} ${h.end ? 'justify-end' : ''}`}>
                          {h.funnel && (
                            <button
                              type="button"
                              className="me-1 inline-flex items-center p-1 text-[11px] font-semibold text-slate-900 transition hover:text-slate-700"
                            >
                              <FunnelIcon className="mr-1 text-sky-600" />
                              {label}
                            </button>
                          )}
                          {!h.funnel && <span>{label}</span>}
                          {h.sort && (
                            <span title="Toggle SortBy" className="inline-flex cursor-pointer text-sky-600">
                              <SortIcon />
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr className="whitespace-nowrap border-b border-slate-50">
                    <td colSpan={colCount + 1} className="px-4 py-16 text-center text-sm text-slate-400">
                      No shipments match your filters.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((s) => {
                    const meta = orderTypeMeta(s.order_type);
                    return (
                      <tr
                        key={s.id}
                        className="whitespace-nowrap border-b border-slate-50 align-middle transition odd:bg-slate-50/40 hover:bg-slate-100/50"
                      >
                        <td className="px-3 py-2">
                          <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleRow(s.id)} className="h-3.5 w-3.5 accent-brand-600" />
                        </td>
                        {cols.gid && (
                          <td className="px-3 py-2">
                            <a href={`/chef/shipments/${s.id}`} onClick={(e) => e.preventDefault()} className="font-mono text-[11px] font-semibold text-brand-700 hover:underline">
                              #{String(Number(s.gid))}
                            </a>
                          </td>
                        )}
                        {cols.late && (
                          <td className="px-3 py-2 text-center">
                            {s.status === 'Delivery Issue' ? (
                              <Pill cls="bg-amber-100 text-amber-700">⏰ Late</Pill>
                            ) : (
                              <span className="text-[10px] text-slate-500">{s.status}</span>
                            )}
                          </td>
                        )}
                        {cols.incubators && <td className="px-3 py-2"><People names={s.account_incubators} /></td>}
                        {cols.managers && <td className="px-3 py-2"><People names={s.account_managers} /></td>}
                        {cols.devs && <td className="px-3 py-2"><People names={s.business_developers} /></td>}
                        {cols.retailer && (
                          <td className="px-3 py-2">
                            <OrgCell name={s.retailer_name} code={codeFor('ret_' + (s.retailer_name ?? ''))} seed={'ret_' + (s.retailer_name ?? '')} />
                          </td>
                        )}
                        {cols.suppliers && (
                          <td className="px-3 py-2">
                            <SupplierCell suppliers={s.suppliers} />
                          </td>
                        )}
                        {cols.fulfiller && (
                          <td className="px-3 py-2">
                            <OrgCell name={s.fulfiller} code={codeFor('ful_' + (s.fulfiller ?? ''))} seed={'ful_' + (s.fulfiller ?? '')} />
                          </td>
                        )}
                        {cols.warehouse && (
                          <td className="px-3 py-2">
                            <span className="whitespace-nowrap text-[11px] text-slate-600">{s.warehouse}</span>
                          </td>
                        )}
                        {cols.created && <td className="px-3 py-2">{clockSlot(s.created_at)}</td>}
                        {cols.updated && <td className="px-3 py-2">{clockSlot(s.updated_at)}</td>}
                        {cols.fullfillable && <td className="px-3 py-2">{clockSlot(s.fullfillable_at)}</td>}
                        {cols.prepared && <td className="px-3 py-2">{clockSlot(s.prepared_at)}</td>}
                        {cols.picked && <td className="px-3 py-2">{clockSlot(s.picked_up_at)}</td>}
                        {cols.firstAttempt && <td className="px-3 py-2">{clockSlot(s.first_carrier_attempt_at)}</td>}
                        {cols.lastAttempt && <td className="px-3 py-2">{clockSlot(s.last_carrier_attempt_at)}</td>}
                        {cols.issueResolved && <td className="px-3 py-2">{clockSlot(s.delivery_issue_resolved_at)}</td>}
                        {cols.issueReason && (
                          <td className="px-3 py-2">
                            {s.status === 'Delivery Issue' ? (
                              <span className="whitespace-nowrap text-[10px] text-rose-600">Customer not reachable</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        )}
                        {cols.attempts && (
                          <td className="px-3 py-2 text-center text-[11px] font-bold text-slate-800">{s.attempt_count}</td>
                        )}
                        {cols.delivered && <td className="px-3 py-2">{clockSlot(s.delivered_at)}</td>}
                        {cols.lastCarrierUpdate && <td className="px-3 py-2">{clockSlot(s.last_carrier_update_at)}</td>}
                        {cols.expShipFrom && (
                          <td className="px-3 py-2">
                            {s.expected_shipping_date_from ? (
                              <span className="text-[11px] tabular-nums text-slate-600">{dateOnly(s.expected_shipping_date_from)}</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        )}
                        {cols.expShipTo && (
                          <td className="px-3 py-2">
                            {s.expected_shipping_date_to ? (
                              <span className="text-[11px] tabular-nums text-slate-600">{dateOnly(s.expected_shipping_date_to)}</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        )}
                        {cols.expDelivFrom && (
                          <td className="px-3 py-2">
                            {s.expected_delivery_date_from ? (
                              <span className="text-[11px] tabular-nums text-slate-600">{dateOnly(s.expected_delivery_date_from)}</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        )}
                        {cols.expDelivTo && (
                          <td className="px-3 py-2">
                            {s.expected_delivery_date_to ? (
                              <span className="text-[11px] tabular-nums text-slate-600">{dateOnly(s.expected_delivery_date_to)}</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        )}
                        {cols.verifiedAt && <td className="px-3 py-2">{clockSlot(s.delivery_verified_at)}</td>}
                        {cols.verifiedBy && (
                          <td className="px-3 py-2">
                            {s.delivery_verified_by ? (
                              <span className="whitespace-nowrap text-[11px] text-slate-600">{s.delivery_verified_by}</span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        )}
                        {cols.markedPost && (
                          <td className="px-3 py-2 text-center">
                            <YesNo v={s.delivery_verified_at ? s.marked_delivered_post_verification : null} />
                          </td>
                        )}
                        {cols.carrierRefund && <td className="px-3 py-2 text-center"><YesNo v={s.carrier_refunded} naWhenNull={false} /></td>}
                        {cols.clientRefund && <td className="px-3 py-2 text-center"><YesNo v={s.client_refunded} naWhenNull={false} /></td>}
                        {cols.codSettlement && (
                          <td className="px-3 py-2 text-center">
                            <YesNo v={s.cod_settlement_status === 'Settled'} naWhenNull={false} />
                          </td>
                        )}
                        {cols.receivables && (
                          <td className="px-3 py-2 text-center">
                            <YesNo v={s.receivables_status === 'Collected'} naWhenNull={false} />
                          </td>
                        )}
                        {cols.carrierCodAmount && (
                          <td className="px-3 py-2 text-center text-[11px] font-bold tabular-nums text-slate-900">
                            {tnd(s.carrier_cod_payment_amount)}
                          </td>
                        )}
                        {cols.carrierCodStatus && (
                          <td className="px-3 py-2">
                            {s.carrier_cod_payment_status ? (
                              <span className="inline-flex w-full items-center gap-1 rounded bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">
                                <span className="text-xs leading-none">⏳</span>
                                {s.carrier_cod_payment_status}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        )}
                        {cols.to && (
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              {s.customer_call && <PhoneIcon className="shrink-0 text-slate-500" />}
                              {s.customer_name ? (
                                <a
                                  href="/chef/shipments"
                                  onClick={(e) => e.preventDefault()}
                                  className="max-w-[150px] truncate text-[11px] font-medium text-slate-700 underline decoration-slate-400 decoration-dotted underline-offset-2"
                                >
                                  {s.customer_name}
                                </a>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </div>
                          </td>
                        )}
                        {cols.status && (
                          <td className="px-3 py-2">
                            <Pill cls="bg-amber-100 text-amber-700">
                              <ClockIcon className="mr-1 inline text-amber-700" />
                              {s.status}
                            </Pill>
                          </td>
                        )}
                        {cols.tracking && (
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-0.5">
                              {statusIconEl(s.status_icon)}
                              <span className="max-w-[170px] truncate text-[11px] text-slate-700">{s.status_detail ?? '—'}</span>
                              {s.status_detail && <InfoIcon className="shrink-0 text-slate-400" />}
                            </div>
                            {s.tracking_numbers.length > 0 && (
                              <div className="mt-1 flex flex-col gap-0.5">
                                {s.tracking_numbers.map((t) => (
                                  <a
                                    key={t}
                                    href="/chef/shipments"
                                    onClick={(e) => e.preventDefault()}
                                    className="w-fit font-mono text-[10px] text-brand-700 underline decoration-brand-700 decoration-dotted underline-offset-2"
                                  >
                                    {t}
                                  </a>
                                ))}
                              </div>
                            )}
                          </td>
                        )}
                        {cols.product && (
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col items-center">
                                <span className="mb-0.5 flex h-4 min-w-4 items-center justify-center rounded bg-sky-100 px-1 text-[9px] font-bold leading-none text-sky-700">
                                  {s.quantity}
                                </span>
                                <span
                                  className="block h-10 w-10 rounded border border-slate-200 bg-white"
                                  style={{ backgroundImage: tileBg(meta.icon), backgroundSize: 'cover', backgroundPosition: 'center' }}
                                />
                              </div>
                              <div className="flex flex-col justify-center leading-tight">
                                <a
                                  href="/chef/shipments"
                                  onClick={(e) => e.preventDefault()}
                                  className="max-w-[150px] truncate text-[11px] font-semibold text-slate-900 hover:underline"
                                >
                                  {s.product_name}
                                </a>
                                {variationRows(s.product_variation)}
                              </div>
                            </div>
                          </td>
                        )}
                        {cols.cost && (
                          <td className="px-3 py-2 text-center text-[11px] tabular-nums text-slate-700">{tnd(s.cost)}</td>
                        )}
                        {cols.cod && (
                          <td className="px-3 py-2 text-center text-[11px] font-bold tabular-nums text-slate-900">{tnd(s.cod_amount)}</td>
                        )}
                        {cols.toolbar && (
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                title="Sync shipment"
                                onClick={() => {
                                  load();
                                  pushToast(`Shipment #${Number(s.gid)} synced successfully`);
                                }}
                                className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:bg-slate-50"
                              >
                                <RotateIcon />
                              </button>
                              <button
                                type="button"
                                title="View shipment"
                                onClick={() => navigate(`/chef/shipments/${s.id}`)}
                                className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:bg-slate-50"
                              >
                                <EyeIcon />
                              </button>
                              <button
                                type="button"
                                title="Send"
                                onClick={() => setTicketFor({ id: s.id, gid: String(Number(s.gid)) })}
                                className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:bg-slate-50"
                              >
                                <PaperPlaneIcon />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── footer / pagination ── */}
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
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={current === 0}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={current >= totalPages - 1}
                className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Order Type filter popover ── */}
      {otOpen && (
        <FilterOverlay pos={otOpen.pos} width={300} onClose={() => setOtOpen(null)}>
          <div>
            <div className="px-3 pt-2.5 pb-1 text-[12px] font-bold tracking-wide text-brand-600">Add type as filters</div>
            <div className="mx-3 my-1.5 h-px bg-slate-100" />
            <div className="max-h-[340px] overflow-y-auto px-2">
              {ORDER_TYPE_OPTIONS.map((o) => (
                <label key={o.value} className="mb-1 flex w-full cursor-pointer items-center rounded-md bg-slate-100 px-3 py-2 transition hover:bg-slate-200">
                  <input
                    type="checkbox"
                    checked={otDraft.includes(o.value)}
                    onChange={() =>
                      setOtDraft((draft) => (draft.includes(o.value) ? draft.filter((x) => x !== o.value) : [...draft, o.value]))
                    }
                    className="h-3.5 w-3.5 accent-brand-600"
                  />
                  <span className={`ml-2 inline-flex items-center gap-2 rounded px-3 py-1.5 text-xs font-semibold ${o.cls}`}>
                    <span className="text-sm leading-none">{o.icon}</span>
                    {o.value}
                  </span>
                </label>
              ))}
            </div>
            <div className="px-3 pb-2 pt-1.5">
              <div className="mb-2 h-px bg-slate-100" />
              <button
                type="button"
                onClick={() => {
                  setOrderTypes(otDraft);
                  setOtOpen(null);
                  setPage(0);
                }}
                className="w-full rounded-md bg-sky-500 py-1.5 text-xs font-bold text-white transition hover:bg-sky-600"
              >
                Save
              </button>
            </div>
          </div>
        </FilterOverlay>
      )}

      {/* ── Columns popover ── */}
      {colsOpen && (
        <FilterOverlay pos={colsOpen.pos} width={260} onClose={() => setColsOpen(null)}>
          <div>
            <div className="px-3 pt-2">
              <h6 className="text-center text-[11px] font-bold uppercase tracking-wide text-slate-500">Showing columns</h6>
            </div>
            <div className="my-1.5 h-px bg-slate-100" />
            <div className="max-h-[280px] overflow-y-auto px-2">
              {COLUMNS.map((c) => (
                <CheckRow
                  key={c.id}
                  checked={cols[c.id]}
                  onChange={() => (c.disabled ? undefined : setCols((prev) => ({ ...prev, [c.id]: !prev[c.id] })))}
                >
                  <span className={`ml-2 text-[11px] font-medium ${c.disabled ? 'text-slate-400' : 'text-slate-700'}`}>{c.label}</span>
                </CheckRow>
              ))}
            </div>
            <div className="my-1 h-px bg-slate-100" />
            <div className="px-3 pb-2 text-center">
              <button type="button" onClick={() => setCols(defaultCols())} className="text-xs font-semibold text-sky-600 hover:underline">
                Reset to default
              </button>
            </div>
          </div>
        </FilterOverlay>
      )}

      {/* ── sync notifications ── */}
      <div className="fixed right-4 top-4 z-[90] flex w-72 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2.5 shadow-lg"
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <span className="text-[11px] font-bold">✓</span>
            </span>
            <p className="mb-0 text-xs font-semibold text-slate-800">{t.msg}</p>
          </div>
        ))}
      </div>

      {ticketFor && <ShipmentTicketModal shipmentId={ticketFor.id} gid={ticketFor.gid} onClose={() => setTicketFor(null)} />}
    </div>
  );
}