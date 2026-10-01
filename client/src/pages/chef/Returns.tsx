import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiErrorMessage, apiGet, ChefReturn, ExchangeDeliveryStatus, ReturnDeliveryStatus, ReturnsResult } from '../../lib/api';
import { Modal, Spinner } from '../../components/ui';
import {
  Avatar,
  CheckIcon,
  CheckRow,
  ClockIcon,
  EyeIcon,
  FileExcelIcon,
  FilterOverlay,
  FunnelIcon,
  InfoIcon,
  Pagination,
  People,
  Pill,
  premiumTone,
  RotateIcon,
  SearchIcon,
  TableColumnsIcon,
  ThContent,
  clockSlot,
  variationRows,
} from './ui';

function ReplacementIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M463.5 224h8.5c13.3 0 24-10.7 24-24V72c0-9.7 5.8-18.5 14.8-22.2s19.3-1.7 26.2 5.2l40 40c6.9 6.9 17.2 8.9 26.2 5.2s14.8-12.5 14.8-22.2V24c0-13.3-10.7-24-24-24H392c-30.9 0-56 25.1-56 56v8h-2c-97.2 0-194.6 5.2-291.3 15.7C26.2 57.2 0 84.8 0 120v32c0 30.9 25.1 56 56 56h7.5C48 290.6 32 320.8 32 352c0 67.3 54.9 123.5 121.6 126.1C193.6 480.8 256 416.7 256 336v-7.9c32 14.9 68.8 23.9 107.2 23.9h28.8v8c0 30.9 25.1 56 56 56h56c13.3 0 24-10.7 24-24V264c0-30.9-25.1-56-56-56h-8.5c3.4-33.1 6.9-66.6 11-100zM32 152V120c0-13.3 10.7-24 24-24h71l-17.3 76.2c-4 17.7-1.3 36.1 7.4 51.7H56c-13.3 0-24-10.7-24-24zm233.5 0l-3.2 76.2c6-10.8 5.5-23.3.5-33.6L273.7 128l-8.2 24z" />
    </svg>
  );
}

function ProductReturnIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
      <path d="M8.2 214.4c-10.9 26.6 12.5 45.6 36.2 45.6H176V416c0 35.3 28.7 64 64 64s64-28.7 64-64V260H256h36.2c0-14 0-28 0-42.2h71.5L288 216.9c-4.4 0-8.9-1.2-12.8-3.6L64 195.7V144c0-17.7-14.3-32-32-32S0 126.3 0 144v48c0 .3 .1 .7 0 1V214.4zM512 96c0-17.7-14.3-32-32-32H128c-17.7 0-32 14.3-32 32v48h73.8l45.4 27.2H488c13.3 0 24-10.7 24-24V96z" />
    </svg>
  );
}

type RetCol =
  | 'gid'
  | 'createdBy'
  | 'type'
  | 'retailer'
  | 'address'
  | 'destWarehouse'
  | 'products'
  | 'approval'
  | 'deliveryType'
  | 'processType'
  | 'carrier'
  | 'exchangeDelivery'
  | 'returnDelivery'
  | 'dispute'
  | 'createdAt'
  | 'acceptedAt'
  | 'receivedAt'
  | 'inspection'
  | 'refund'
  | 'toolbar';

const COLUMNS: { id: RetCol; label: string; disabled?: boolean }[] = [
  { id: 'gid', label: 'GID' },
  { id: 'createdBy', label: 'Created by' },
  { id: 'type', label: 'Type' },
  { id: 'retailer', label: 'Retailer' },
  { id: 'address', label: 'Address' },
  { id: 'destWarehouse', label: 'Destination warehouse' },
  { id: 'products', label: 'Product(s)' },
  { id: 'approval', label: 'Approval status' },
  { id: 'deliveryType', label: 'Delivery type' },
  { id: 'processType', label: 'Process Type' },
  { id: 'carrier', label: 'Carrier account' },
  { id: 'exchangeDelivery', label: 'Exchange delivery status' },
  { id: 'returnDelivery', label: 'Return delivery status' },
  { id: 'dispute', label: 'Dispute status' },
  { id: 'createdAt', label: 'Created at' },
  { id: 'acceptedAt', label: 'Accepted at' },
  { id: 'receivedAt', label: 'Received at' },
  { id: 'inspection', label: 'Inspection' },
  { id: 'refund', label: 'Refund' },
  { id: 'toolbar', label: 'Toolbar', disabled: true },
];

function defaultCols(): Record<RetCol, boolean> {
  return Object.fromEntries(COLUMNS.map((c) => [c.id, true])) as Record<RetCol, boolean>;
}

type HeaderDef = { id: RetCol; funnel?: boolean; sort?: boolean; center?: boolean; end?: boolean };

const HEADERS: HeaderDef[] = [
  { id: 'gid', funnel: true, sort: true },
  { id: 'createdBy', funnel: true, sort: true },
  { id: 'type', funnel: true },
  { id: 'retailer', funnel: true, sort: true },
  { id: 'address', funnel: true, sort: true },
  { id: 'destWarehouse', funnel: true, sort: true },
  { id: 'products', sort: true },
  { id: 'approval', funnel: true },
  { id: 'deliveryType', funnel: true },
  { id: 'processType', funnel: true },
  { id: 'carrier', sort: true },
  { id: 'exchangeDelivery', funnel: true },
  { id: 'returnDelivery', funnel: true },
  { id: 'dispute', funnel: true },
  { id: 'createdAt', funnel: true, sort: true },
  { id: 'acceptedAt', funnel: true, sort: true },
  { id: 'receivedAt', funnel: true, sort: true },
  { id: 'inspection', sort: true },
  { id: 'refund', sort: true, center: true },
  { id: 'toolbar', end: true },
];

function RetailerCell({ name, code, premium }: { name: string; code: string; premium: boolean }) {
  const tone = premiumTone(premium ? code : 'plain');
  return (
    <div style={{ width: 200 }}>
      <div className="flex items-center">
        <div className="relative shrink-0">
          <Avatar name={name} size="h-16 w-16 text-base border-2 border-slate-300" />
          {premium && (
            <span className={`absolute -bottom-0.5 -left-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[9px] leading-none text-white ring-2 ring-white ${tone.cls}`}>
              {tone.icon}
            </span>
          )}
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

function ApprovalBadge({ approval }: { approval: ChefReturn['approval_status'] }) {
  if (approval === 'approved') {
    return (
      <Pill cls="bg-emerald-50 text-emerald-700">
        <CheckIcon className="mr-1 inline text-emerald-600" />
        Approved
      </Pill>
    );
  }
  if (approval === 'rejected') {
    return (
      <Pill cls="bg-rose-50 text-rose-700">
        <svg width="10" height="10" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true" className="mr-1 inline text-rose-600"><path d="M367.2 412.5L99.5 144.8C77.1 176.1 64 214.5 64 256c0 106 86 192 192 192c41.5 0 79.9-13.1 111.2-35.5zm45.3-45.3C434.9 335.9 448 297.5 448 256c0-106-86-192-192-192c-41.5 0-79.9 13.1-111.2 35.5L412.5 367.2zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256z" /></svg>
        Rejected
      </Pill>
    );
  }
  return (
    <Pill cls="bg-amber-50 text-amber-700">
      <ClockIcon className="mr-1 inline text-amber-600" />
      Waiting for approval
    </Pill>
  );
}

const EXCHANGE_META: Partial<Record<ExchangeDeliveryStatus, { cls: string; icon: ReactNode; text: string }>> = {
  awaiting_packaging: {
    cls: 'bg-amber-50 text-amber-700',
    icon: <svg width="10" height="10" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true"><path d="M50.7 58.5L0 160H208V32H93.7C75.5 32 58.9 42.3 50.7 58.5zM240 32V160H448L397.3 58.5C389.1 42.3 372.5 32 354.3 32H240zM240 176H0V416c0 35.3 28.7 64 64 64H384c35.3 0 64-28.7 64-64V176H240z" /></svg>,
    text: 'Awaiting packaging',
  },
  packed: {
    cls: 'bg-sky-50 text-sky-700',
    icon: <svg width="10" height="10" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true"><path d="M50.7 58.5L0 160H208V32H93.7C75.5 32 58.9 42.3 50.7 58.5zM240 32V160H448L397.3 58.5C389.1 42.3 372.5 32 354.3 32H240zM240 176H0V416c0 35.3 28.7 64 64 64H384c35.3 0 64-28.7 64-64V176H240z" /></svg>,
    text: 'Packed',
  },
  ready_for_pickup: {
    cls: 'bg-sky-50 text-sky-700',
    icon: <svg width="10" height="10" viewBox="0 0 640 512" fill="currentColor" aria-hidden="true"><path d="M48 0C21.5 0 0 21.5 0 48V368c0 26.5 21.5 48 48 48H64c0 53 43 96 96 96s96-43 96-96c0 53 0 0 0 0 0 53 43 96 96 96s96-43 96-96h32c17.7 0 32-14.3 32-32s-14.3-32-32-32V288 256 237.3c0-17-6.7-33.3-18.7-45.3L512 114.7c-12-12-28.3-18.7-45.3-18.7H416V48c0-26.5-21.5-48-48-48H48zM416 160h50.7L544 237.3V256H416V160z" /></svg>,
    text: 'Ready for pickup',
  },
  picked_up: {
    cls: 'bg-sky-50 text-sky-700',
    icon: <svg width="10" height="10" viewBox="0 0 640 512" fill="currentColor" aria-hidden="true"><path d="M640 0V400c0 61.9-50.1 112-112 112c-61 0-110.5-48.7-112-109.3L48.4 502.9c-17.1 4.6-34.6-5.4-39.3-22.5s5.4-34.6 22.5-39.3L352 353.8V64c0-35.3 28.7-64 64-64H640zM576 400c0-26.5-21.5-48-48-48s-48 21.5-48 48s21.5 48 48 48s48-21.5 48-48z" /></svg>,
    text: 'Picked Up',
  },
  on_its_way: {
    cls: 'bg-sky-50 text-sky-700',
    icon: <svg width="10" height="10" viewBox="0 0 640 512" fill="currentColor" aria-hidden="true"><path d="M48 0C21.5 0 0 21.5 0 48V368c0 26.5 21.5 48 48 48H64c0 53 43 96 96 96s96-43 96-96H384c0 53 43 96 96 96s96-43 96-96h32c17.7 0 32-14.3 32-32s-14.3-32-32-32V288 256 237.3c0-17-6.7-33.3-18.7-45.3L512 114.7c-12-12-28.3-18.7-45.3-18.7H416V48c0-26.5-21.5-48-48-48H48zM416 160h50.7L544 237.3V256H416V160z" /></svg>,
    text: 'On its way',
  },
  at_carrier_facility: {
    cls: 'bg-sky-50 text-sky-700',
    icon: <svg width="10" height="10" viewBox="0 0 640 512" fill="currentColor" aria-hidden="true"><path d="M0 488V171.3c0-26.2 15.9-49.7 40.2-59.4L308.1 4.8c7.6-3.1 16.1-3.1 23.8 0L599.8 111.9c24.3 9.7 40.2 33.3 40.2 59.4V488c0 13.3-10.7 24-24 24H568c-13.3 0-24-10.7-24-24V224c0-17.7-14.3-32-32-32H128c-17.7 0-32 14.3-32 32V488c0 13.3-10.7 24-24 24H24c-13.3 0-24-10.7-24-24zm96-176c0 8.8 7.2 16 16 16H528c8.8 0 16-7.2 16-16v-64c0-8.8-7.2-16-16-16H112c-8.8 0-16 7.2-16 16v64zm336 128H208c-8.8 0-16 7.2-16 16v48H480v-48c0-8.8-7.2-16-16-16z" /></svg>,
    text: 'At carrier facility',
  },
  delivered: {
    cls: 'bg-emerald-50 text-emerald-700',
    icon: <CheckIcon className="mr-1 inline text-emerald-600" />,
    text: 'Delivered',
  },
  returning_to_sender: {
    cls: 'bg-rose-50 text-rose-700',
    icon: <svg width="10" height="10" viewBox="0 0 576 512" fill="currentColor" aria-hidden="true"><path d="M0 48C0 21.5 21.5 0 48 0H368c26.5 0 48 21.5 48 48V96h50.7c17 0 33.3 6.7 45.3 18.7L589.3 192c12 12 18.7 28.3 18.7 45.3V256v32 64c17.7 0 32 14.3 32 32s-14.3 32-32 32H576c0 53-43 96-96 96s-96-43-96-96H256c0 53-43 96-96 96s-96-43-96-96H48c-26.5 0-48-21.5-48-48V48zM416 256H544V237.3L466.7 160H416v96zM160 464c26.5 0 48-21.5 48-48s-21.5-48-48-48s-48 21.5-48 48s21.5 48 48 48zm368-48c0-26.5-21.5-48-48-48s-48 21.5-48 48s21.5 48 48 48s48-21.5 48-48zM257 95c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9l39 39H96c-13.3 0-24 10.7-24 24s10.7 24 24 24H262.1l-39 39c-9.4 9.4-9.4 24.6 0 33.9s24.6 9.4 33.9 0l80-80c9.4-9.4 9.4-24.6 0-33.9L257 95z" /></svg>,
    text: 'Returning to sender',
  },
  returned_to_sender: {
    cls: 'bg-rose-50 text-rose-700',
    icon: <svg width="10" height="10" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M117.2 160.4L224 64.3V64c0-12.6-7.4-24.1-19-29.2s-25-3-34.4 5.4l-160 144C3.9 190.3 0 198.9 0 208s3.9 17.7 10.6 23.8l160 144c9.4 8.5 22.9 10.6 34.4 5.4s19-16.6 19-29.2v-.3L117.2 255.6C103.7 243.4 96 226.1 96 208s7.7-35.4 21.2-47.6zM352 64c0-12.6-7.4-24.1-19-29.2s-25-3-34.4 5.4l-160 144c-6.7 6.1-10.6 14.7-10.6 23.8s3.9 17.7 10.6 23.8l160 144c9.4 8.5 22.9 10.6 34.4 5.4s19-16.6 19-29.2V288h32c53 0 96 43 96 96c0 30.4-12.8 47.9-22.2 56.7c-5.5 5.1-9.8 12-9.8 19.5c0 10.9 8.8 19.7 19.7 19.7c2.8 0 5.6-.6 8.1-1.9C494.5 467.9 576 417.3 576 304c0-97.2-78.8-176-176-176H352V64z" /></svg>,
    text: 'Returned to sender',
  },
  canceled: {
    cls: 'bg-rose-50 text-rose-700',
    icon: <svg width="10" height="10" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M367.2 412.5L99.5 144.8C77.1 176.1 64 214.5 64 256c0 106 86 192 192 192c41.5 0 79.9-13.1 111.2-35.5zm45.3-45.3C434.9 335.9 448 297.5 448 256c0-106-86-192-192-192c-41.5 0-79.9 13.1-111.2 35.5L412.5 367.2zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256z" /></svg>,
    text: 'Canceled',
  },
};

function ExchangeBadge({ r }: { r: ChefReturn }) {
  const meta = r.exchange_delivery_status ? EXCHANGE_META[r.exchange_delivery_status] : undefined;
  if (!meta) return <span className="text-slate-300">—</span>;
  return (
    <div className="flex items-center gap-1.5">
      <Pill cls={meta.cls}>
        {meta.icon}
        <span className="ml-1">{meta.text}</span>
      </Pill>
      {r.exchange_shipment_id && (
        <div className="flex items-center gap-1 text-[10px] text-sky-600">
          <a href="/#" onClick={(e) => e.preventDefault()} className="underline decoration-sky-600 decoration-dotted underline-offset-2">
            Shipment #{r.exchange_shipment_id}
          </a>
          <EyeIcon className="shrink-0" />
        </div>
      )}
    </div>
  );
}

const RETURN_META: Partial<Record<ReturnDeliveryStatus, { cls: string; icon: ReactNode; text: string }>> = {
  awaiting_arrival: {
    cls: 'bg-amber-50 text-amber-700',
    icon: <svg width="10" height="10" viewBox="0 0 640 512" fill="currentColor" aria-hidden="true"><path d="M48 0C21.5 0 0 21.5 0 48V368c0 26.5 21.5 48 48 48H64c0 53 43 96 96 96s96-43 96-96H384c0 53 43 96 96 96s96-43 96-96h32c17.7 0 32-14.3 32-32s-14.3-32-32-32V288 256 237.3c0-17-6.7-33.3-18.7-45.3L512 114.7c-12-12-28.3-18.7-45.3-18.7H416V48c0-26.5-21.5-48-48-48H48zM416 160h50.7L544 237.3V256H416V160z" /></svg>,
    text: 'Awaiting products arrival to fulfillment center',
  },
  packed: {
    cls: 'bg-sky-50 text-sky-700',
    icon: <svg width="10" height="10" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true"><path d="M50.7 58.5L0 160H208V32H93.7C75.5 32 58.9 42.3 50.7 58.5zM240 32V160H448L397.3 58.5C389.1 42.3 372.5 32 354.3 32H240zM240 176H0V416c0 35.3 28.7 64 64 64H384c35.3 0 64-28.7 64-64V176H240z" /></svg>,
    text: 'Packed',
  },
  ready_for_pickup: {
    cls: 'bg-sky-50 text-sky-700',
    icon: <svg width="10" height="10" viewBox="0 0 640 512" fill="currentColor" aria-hidden="true"><path d="M48 0C21.5 0 0 21.5 0 48V368c0 26.5 21.5 48 48 48H64c0 53 43 96 96 96s96-43 96-96c0 53 0 0 0 0 0 53 43 96 96 96s96-43 96-96h32c17.7 0 32-14.3 32-32s-14.3-32-32-32V288 256 237.3c0-17-6.7-33.3-18.7-45.3L512 114.7c-12-12-28.3-18.7-45.3-18.7H416V48c0-26.5-21.5-48-48-48H48zM416 160h50.7L544 237.3V256H416V160z" /></svg>,
    text: 'Ready for pickup',
  },
  picked_up: {
    cls: 'bg-sky-50 text-sky-700',
    icon: <svg width="10" height="10" viewBox="0 0 640 512" fill="currentColor" aria-hidden="true"><path d="M640 0V400c0 61.9-50.1 112-112 112c-61 0-110.5-48.7-112-109.3L48.4 502.9c-17.1 4.6-34.6-5.4-39.3-22.5s5.4-34.6 22.5-39.3L352 353.8V64c0-35.3 28.7-64 64-64H640zM576 400c0-26.5-21.5-48-48-48s-48 21.5-48 48s21.5 48 48 48s48-21.5 48-48z" /></svg>,
    text: 'Picked Up',
  },
  on_its_way: {
    cls: 'bg-sky-50 text-sky-700',
    icon: <svg width="10" height="10" viewBox="0 0 640 512" fill="currentColor" aria-hidden="true"><path d="M48 0C21.5 0 0 21.5 0 48V368c0 26.5 21.5 48 48 48H64c0 53 43 96 96 96s96-43 96-96H384c0 53 43 96 96 96s96-43 96-96h32c17.7 0 32-14.3 32-32s-14.3-32-32-32V288 256 237.3c0-17-6.7-33.3-18.7-45.3L512 114.7c-12-12-28.3-18.7-45.3-18.7H416V48c0-26.5-21.5-48-48-48H48zM416 160h50.7L544 237.3V256H416V160z" /></svg>,
    text: 'On its way',
  },
  delivered: {
    cls: 'bg-emerald-50 text-emerald-700',
    icon: <CheckIcon className="mr-1 inline text-emerald-600" />,
    text: 'Delivered',
  },
  returning_to_sender: {
    cls: 'bg-rose-50 text-rose-700',
    icon: <svg width="10" height="10" viewBox="0 0 576 512" fill="currentColor" aria-hidden="true"><path d="M0 48C0 21.5 21.5 0 48 0H368c26.5 0 48 21.5 48 48V96h50.7c17 0 33.3 6.7 45.3 18.7L589.3 192c12 12 18.7 28.3 18.7 45.3V256v32 64c17.7 0 32 14.3 32 32s-14.3 32-32 32H576c0 53-43 96-96 96s-96-43-96-96H256c0 53-43 96-96 96s-96-43-96-96H48c-26.5 0-48-21.5-48-48V48zM416 256H544V237.3L466.7 160H416v96zM160 464c26.5 0 48-21.5 48-48s-21.5-48-48-48s-48 21.5-48 48s21.5 48 48 48zm368-48c0-26.5-21.5-48-48-48s-48 21.5-48 48s21.5 48 48 48s48-21.5 48-48zM257 95c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9l39 39H96c-13.3 0-24 10.7-24 24s10.7 24 24 24H262.1l-39 39c-9.4 9.4-9.4 24.6 0 33.9s24.6 9.4 33.9 0l80-80c9.4-9.4 9.4-24.6 0-33.9L257 95z" /></svg>,
    text: 'Returning to sender',
  },
  returned_to_sender: {
    cls: 'bg-rose-50 text-rose-700',
    icon: <svg width="10" height="10" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M117.2 160.4L224 64.3V64c0-12.6-7.4-24.1-19-29.2s-25-3-34.4 5.4l-160 144C3.9 190.3 0 198.9 0 208s3.9 17.7 10.6 23.8l160 144c9.4 8.5 22.9 10.6 34.4 5.4s19-16.6 19-29.2v-.3L117.2 255.6C103.7 243.4 96 226.1 96 208s7.7-35.4 21.2-47.6zM352 64c0-12.6-7.4-24.1-19-29.2s-25-3-34.4 5.4l-160 144c-6.7 6.1-10.6 14.7-10.6 23.8s3.9 17.7 10.6 23.8l160 144c9.4 8.5 22.9 10.6 34.4 5.4s19-16.6 19-29.2V288h32c53 0 96 43 96 96c0 30.4-12.8 47.9-22.2 56.7c-5.5 5.1-9.8 12-9.8 19.5c0 10.9 8.8 19.7 19.7 19.7c2.8 0 5.6-.6 8.1-1.9C494.5 467.9 576 417.3 576 304c0-97.2-78.8-176-176-176H352V64z" /></svg>,
    text: 'Returned to sender',
  },
  return_delivered: {
    cls: 'bg-emerald-50 text-emerald-700',
    icon: <CheckIcon className="mr-1 inline text-emerald-600" />,
    text: 'Return delivered',
  },
  canceled: {
    cls: 'bg-rose-50 text-rose-700',
    icon: <svg width="10" height="10" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><path d="M367.2 412.5L99.5 144.8C77.1 176.1 64 214.5 64 256c0 106 86 192 192 192c41.5 0 79.9-13.1 111.2-35.5zm45.3-45.3C434.9 335.9 448 297.5 448 256c0-106-86-192-192-192c-41.5 0-79.9 13.1-111.2 35.5L412.5 367.2zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256z" /></svg>,
    text: 'Canceled',
  },
};

function ReturnDeliveryBadge({ r }: { r: ChefReturn }) {
  const meta = r.return_delivery_status ? RETURN_META[r.return_delivery_status] : undefined;
  if (!meta) return <span className="text-slate-300">—</span>;
  return (
    <div className="flex items-center gap-1.5">
      <Pill cls={meta.cls}>
        {meta.icon}
        <span className="ml-1">{meta.text}</span>
      </Pill>
      <InfoIcon className="shrink-0 text-slate-400" />
    </div>
  );
}

export default function ChefReturns() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ChefReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cols, setCols] = useState<Record<RetCol, boolean>>(defaultCols);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [footerOpen, setFooterOpen] = useState<{ pos: { left: number; top: number } } | null>(null);
  const [fltDraft, setFltDraft] = useState<{ types: ChefReturn['type'][]; approvals: ChefReturn['approval_status'][] }>({ types: [], approvals: [] });
  const [filters, setFilters] = useState<{ types: ChefReturn['type'][]; approvals: ChefReturn['approval_status'][] }>({ types: [], approvals: [] });
  const [typeFilterOpen, setTypeFilterOpen] = useState<{ pos: { left: number; top: number } } | null>(null);
  const [typeDraft, setTypeDraft] = useState<ChefReturn['type'][]>([]);
  const [colsOpen, setColsOpen] = useState<{ pos: { left: number; top: number } } | null>(null);
  const [report, setReport] = useState<ChefReturn | null>(null);

  const load = () => {
    setLoading(true);
    apiGet<ReturnsResult>('/chef/returns')
      .then((r) => setRows(r.returns))
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openPop = (setter: React.Dispatch<React.SetStateAction<{ pos: { left: number; top: number } } | null>>) => (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setter((cur) =>
      cur ? null : { pos: { left: Math.max(8, Math.min(rect.left, window.innerWidth - 320)), top: rect.bottom + 4 } }
    );
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filters.types.length && !filters.types.includes(r.type)) return false;
      if (filters.approvals.length && !filters.approvals.includes(r.approval_status)) return false;
      if (!q) return true;
      const hay = [r.gid, r.created_by ?? '', r.retailer_name, r.retailer_code, r.created_at].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search, filters]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(current * pageSize, current * pageSize + pageSize);
  const colCount = COLUMNS.filter((c) => cols[c.id]).length;

  const exportCsv = () => {
    const head = COLUMNS.map((c) => c.label).join(',');
    const lines = filtered.map((r) =>
      [r.gid, r.created_by ?? '', r.type, r.retailer_name, r.address, r.destination_warehouse ?? '', r.products.map((p) => p.name).join(' | '), r.approval_status, r.delivery_type, r.process_type, r.carrier, r.exchange_delivery_status, r.return_delivery_status, r.dispute_status ?? '', r.created_at, r.accepted_at ?? '', r.received_at ?? '', r.inspection ? 'View report' : '', ''].join(',')
    );
    const blob = new Blob([[head, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'returns.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const fltCount = filters.types.length + filters.approvals.length;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* ── card header ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
        <h5 className="mb-0 w-full whitespace-nowrap text-base font-bold text-slate-900 lg:w-auto">Returns &amp; Exchanges</h5>

        <form
          className="flex w-full items-center overflow-hidden rounded-lg border border-slate-300 sm:w-auto"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(0);
          }}
        >
          <div className="relative">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              type="search"
              placeholder="Search"
              className="w-[220px] border-transparent bg-white py-2 pl-2 pr-8 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand-500"
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
              <SearchIcon />
            </span>
          </div>
        </form>

        <div className="w-full sm:w-auto">
          <button
            type="button"
            onClick={openPop(setFooterOpen)}
            className="inline-flex w-full items-center gap-1.5 rounded-lg border border-sky-300 bg-gradient-to-b from-slate-100 to-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:from-sky-50 hover:to-sky-100 sm:w-auto"
          >
            <FunnelIcon className="text-info-600 text-brand-600" />
            Filters
            {fltCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold leading-none text-white">
                {fltCount}
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
              onClick={load}
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
            <table className="w-full min-w-[2400px] text-left text-xs">
              <thead>
                <tr className="whitespace-nowrap border-b border-slate-200 bg-slate-100 align-middle text-xs text-slate-800">
                  {HEADERS.filter((h) => cols[h.id]).map((h) => {
                    const label = COLUMNS.find((c) => c.id === h.id)?.label ?? h.id;
                    return (
                      <th key={h.id} title="Toggle SortBy" className={`whitespace-nowrap px-3 py-2.5 ${h.center ? 'text-center' : ''} ${h.end ? 'text-right' : ''}`}>
                        {h.id === 'type' ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              setTypeFilterOpen((cur) => {
                                if (cur) return null;
                                setTypeDraft(filters.types);
                                return { pos: { left: Math.max(8, Math.min(rect.left, window.innerWidth - 320)), top: rect.bottom + 4 } };
                              });
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-900 transition hover:text-slate-700"
                          >
                            <FunnelIcon className="text-sky-600" />
                            Type
                          </button>
                        ) : (
                          <ThContent funnel={h.funnel} sort={h.sort} label={label} center={h.center} end={h.end} title="Toggle SortBy" />
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr className="whitespace-nowrap border-b border-slate-50">
                    <td colSpan={colCount} className="px-4 py-16 text-center text-sm text-slate-400">
                      No returns match your filters.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r) => (
                    <tr key={r.id} className="whitespace-nowrap border-b border-slate-50 align-middle transition odd:bg-slate-50/40 hover:bg-slate-100/50">
                      {cols.gid && (
                        <td className="px-3 py-2">
                          <a href={`/chef/returns/${r.id}`} onClick={(e) => e.preventDefault()} className="font-mono text-[11px] font-semibold text-brand-700 hover:underline">
                            #{r.gid}
                          </a>
                        </td>
                      )}
                      {cols.createdBy && (
                        <td className="px-3 py-2">
                          {r.created_by === 'Seller' ? (
                            <div className="flex items-center">
                              <Avatar name="Seller" size="h-9 w-9 text-[10px]" />
                              <div className="ms-2 flex flex-col leading-snug">
                                <span className="whitespace-nowrap text-[11px] font-semibold text-slate-800">Seller</span>
                              </div>
                            </div>
                          ) : (
                            <People names={r.created_by ? [r.created_by] : []} />
                          )}
                        </td>
                      )}
                      {cols.type && (
                        <td className="px-3 py-2">
                          {r.type === 'replacement' ? (
                            <div className="flex items-center gap-1.5 text-amber-600" title="Replacement">
                              <ReplacementIcon />
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-sky-600" title="Product return">
                              <ProductReturnIcon />
                            </div>
                          )}
                        </td>
                      )}
                      {cols.retailer && (
                        <td className="px-3 py-2">
                          <RetailerCell name={r.retailer_name} code={r.retailer_code} premium={r.retailer_premium} />
                        </td>
                      )}
                      {cols.address && (
                        <td className="px-3 py-2">
                          <a href="/#" onClick={(e) => e.preventDefault()} className="max-w-[170px] truncate text-[11px] text-slate-700 underline decoration-slate-400 decoration-dotted underline-offset-2">
                            {r.address}
                          </a>
                        </td>
                      )}
                      {cols.destWarehouse && (
                        <td className="px-3 py-2">
                          {r.destination_warehouse ? (
                            <span className="whitespace-nowrap text-[11px] text-slate-600">{r.destination_warehouse}</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      )}
                      {cols.products && (
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-1.5">
                            {r.products.map((p) => (
                              <div key={p.name} className="flex items-center gap-2">
                                <div className="flex flex-col items-center">
                                  <span className="mb-0.5 flex h-4 min-w-4 items-center justify-center rounded bg-sky-100 px-1 text-[9px] font-bold leading-none text-sky-700">
                                    {p.quantity}
                                  </span>
                                  <span className="block h-10 w-10 rounded border border-slate-200 bg-white" style={{ backgroundImage: 'linear-gradient(135deg,#e2e8f0,#f8fafc)' }} />
                                </div>
                                <div className="flex flex-col justify-center leading-tight">
                                  <a href="/#" onClick={(e) => e.preventDefault()} className="max-w-[150px] truncate text-[11px] font-semibold text-slate-900 hover:underline">
                                    {p.name}
                                  </a>
                                  {variationRows(p.variation)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      )}
                      {cols.approval && (
                        <td className="px-3 py-2">
                          <ApprovalBadge approval={r.approval_status} />
                        </td>
                      )}
                      {cols.deliveryType && (
                        <td className="px-3 py-2">
                          <span className="whitespace-nowrap text-[11px] font-semibold text-slate-700">{r.delivery_type}</span>
                        </td>
                      )}
                      {cols.processType && (
                        <td className="px-3 py-2">
                          <Pill cls={r.process_type.toUpperCase().includes('SWAP') ? 'bg-amber-50 text-amber-700' : 'bg-sky-50 text-sky-700'}>
                            {r.process_type}
                          </Pill>
                        </td>
                      )}
                      {cols.carrier && (
                        <td className="px-3 py-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-[9px] font-bold text-brand-700">
                            {r.carrier
                              .split(/\s+/)
                              .map((w) => w[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </span>
                          <span className="mt-1 block whitespace-nowrap text-[11px] text-slate-700">{r.carrier}</span>
                        </td>
                      )}
                      {cols.exchangeDelivery && (
                        <td className="px-3 py-2">
                          <ExchangeBadge r={r} />
                        </td>
                      )}
                      {cols.returnDelivery && (
                        <td className="px-3 py-2">
                          <ReturnDeliveryBadge r={r} />
                        </td>
                      )}
                      {cols.dispute && (
                        <td className="px-3 py-2">
                          {r.dispute_status === 'unresolved' ? (
                            <Pill cls="bg-amber-50 text-amber-700">
                              <ClockIcon className="mr-1 inline text-amber-600" />
                              Unresolved
                            </Pill>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      )}
                      {cols.createdAt && <td className="px-3 py-2">{clockSlot(r.created_at)}</td>}
                      {cols.acceptedAt && (
                        <td className="px-3 py-2">
                          {r.accepted_at ? (
                            <span className="text-[11px] tabular-nums text-slate-800">{clockSlot(r.accepted_at)}</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      )}
                      {cols.receivedAt && (
                        <td className="px-3 py-2">
                          {r.received_at ? (
                            <span className="text-[11px] tabular-nums text-slate-800">{clockSlot(r.received_at)}</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      )}
                      {cols.inspection && (
                        <td className="px-3 py-2">
                          {(r.reason || r.attachments?.length) ? (
                            <div className="flex items-center gap-1 text-[11px] text-sky-600">
                              <button
                                type="button"
                                onClick={() => setReport(r)}
                                className="underline decoration-sky-600 decoration-dotted underline-offset-2"
                              >
                                View report
                              </button>
                              <EyeIcon className="shrink-0" />
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      )}
                      {cols.refund && (
                        <td className="px-3 py-2 text-center">
                          <span className="text-slate-300">—</span>
                        </td>
                      )}
                      {cols.toolbar && (
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button type="button" title="View details" onClick={() => navigate(`/chef/returns/${r.id}`)} className="rounded-md border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:bg-slate-50">
                              <EyeIcon />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} total={total} />
        </>
      )}

      {/* ── Filters popover ── */}
      {footerOpen && (
        <FilterOverlay pos={footerOpen.pos} width={320} onClose={() => setFooterOpen(null)}>
          <div>
            <div className="px-3 pt-2.5 pb-1 text-[12px] font-bold tracking-wide text-brand-600">Add filters</div>
            <div className="mx-3 my-1.5 h-px bg-slate-100" />
            <div className="px-3">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Type</div>
              <div className="flex flex-col gap-0.5">
                {(['replacement', 'product_return'] as const).map((t) => (
                  <CheckRow
                    key={t}
                    checked={fltDraft.types.includes(t)}
                    onChange={() =>
                      setFltDraft((d) => ({ ...d, types: d.types.includes(t) ? d.types.filter((x) => x !== t) : [...d.types, t] }))
                    }
                  >
                    <span className="ml-2 text-[11px] font-medium text-slate-700">{t === 'replacement' ? 'Replacement' : 'Product return'}</span>
                  </CheckRow>
                ))}
              </div>
              <div className="mb-1 mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Approval status</div>
              <div className="flex flex-col gap-0.5">
                {(['approved', 'waiting', 'rejected'] as const).map((a) => (
                  <CheckRow
                    key={a}
                    checked={fltDraft.approvals.includes(a)}
                    onChange={() =>
                      setFltDraft((d) => ({ ...d, approvals: d.approvals.includes(a) ? d.approvals.filter((x) => x !== a) : [...d.approvals, a] }))
                    }
                  >
                    <span className="ml-2 text-[11px] font-medium text-slate-700">{a === 'approved' ? 'Approved' : a === 'rejected' ? 'Rejected' : 'Waiting for approval'}</span>
                  </CheckRow>
                ))}
              </div>
            </div>
            <div className="px-3 pb-2 pt-1.5">
              <div className="mb-2 h-px bg-slate-100" />
              <button
                type="button"
                onClick={() => {
                  setFilters(fltDraft);
                  setFooterOpen(null);
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
                <CheckRow key={c.id} checked={cols[c.id]} disabled={c.disabled} onChange={() => setCols((prev) => ({ ...prev, [c.id]: !prev[c.id] }))}>
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

      {/* ── Type filter popover ── */}
      {typeFilterOpen && (
        <FilterOverlay pos={typeFilterOpen.pos} width={300} onClose={() => setTypeFilterOpen(null)}>
          <div className="px-3 py-2.5">
            <div className="mb-1 text-[12px] font-bold tracking-wide text-brand-600">Add type as filters</div>
            <hr className="my-1.5 border-slate-100" />
            {(['product_return', 'replacement'] as const).map((t) => {
              const isReturn = t === 'product_return';
              const checked = typeDraft.includes(t);
              return (
                <label
                  key={t}
                  className={`mb-1.5 flex cursor-pointer items-center rounded px-2 py-2 transition ${
                    isReturn ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setTypeDraft((d) => (d.includes(t) ? d.filter((x) => x !== t) : [...d, t]))
                    }
                    className="h-3.5 w-3.5 accent-brand-600"
                  />
                  <span className="ms-2 flex items-center gap-2 text-xs font-semibold">
                    <span className="text-sm">{isReturn ? '↩️' : '🔁'}</span>
                    <span className="whitespace-nowrap">{isReturn ? 'Return' : 'Exchange'}</span>
                  </span>
                </label>
              );
            })}
            <div className="mt-2">
              <hr className="border-slate-100" />
              <button
                type="button"
                onClick={() => {
                  setFilters((f) => ({ ...f, types: typeDraft }));
                  setTypeFilterOpen(null);
                  setPage(0);
                }}
                className="mt-2 w-full rounded-md bg-sky-500 py-1.5 text-xs font-bold text-white transition hover:bg-sky-600"
              >
                Save
              </button>
            </div>
          </div>
        </FilterOverlay>
      )}

      {/* ── Report modal ── */}
      <Modal open={!!report} onClose={() => setReport(null)} title={report ? `${report.type === 'replacement' ? 'Échange' : 'Retour'} report — #${report.gid}` : ''}>
        {report && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Dropshipper</p>
                <p className="font-semibold text-slate-800">{report.retailer_name}</p>
                <p className="text-sm text-slate-500">{report.retailer_code}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Date</p>
                <p className="text-sm text-slate-700">{new Date(report.created_at).toLocaleDateString('fr-TN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Reason</p>
              <p className="text-sm text-slate-700">{report.reason ?? '—'}</p>
            </div>

            {report.reply && (
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Notes</p>
                <p className="text-sm text-slate-700">{report.reply}</p>
              </div>
            )}

            {(report.attachments?.length ?? 0) > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Attachments</p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {report.attachments.map((url, i) => {
                    const isVideo = /\.(mp4|webm|mov|ogg|m4v)(\?|$)/i.test(url) || url.includes('/uploads/vid-');
                    return isVideo ? (
                      <video key={i} src={url} controls className="aspect-video w-full rounded-xl border border-slate-200 bg-black object-contain" />
                    ) : (
                      <img key={i} src={url} alt="" className="aspect-square w-full rounded-xl border border-slate-200 object-cover" />
                    );
                  })}
                </div>
              </div>
            )}

            {!report.reason && !report.reply && !report.attachments?.length && (
              <p className="text-sm text-slate-400">No report details for this return.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}