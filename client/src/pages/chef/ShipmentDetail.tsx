import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiErrorMessage, getShipmentDetail, ShipmentDetail, ShipmentTimelineItem } from '../../lib/api';
import { Spinner } from '../../components/ui';
import { AddNoteModal, CheckIcon, ClockIcon, DropboxIcon, EyeIcon, tnd, TruckIcon } from './ui';
import ShipmentTicketModal from './ShipmentTicketModal';

/* ═══════════════════════════ local icons ═══════════════════════════ */

function Icon({ d, size = 12, mirror = false, className = '' }: { d: string; size?: number; mirror?: boolean; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="currentColor"
      aria-hidden="true"
      className={`${mirror ? '-scale-x-100' : ''} ${className}`}
    >
      <path d={d} />
    </svg>
  );
}

const D_INFO = 'M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0S0 114.6 0 256S114.6 512 256 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-144c-17.7 0-32-14.3-32-32s14.3-32 32-32s32 14.3 32 32s-14.3 32-32 32z';
const D_STORE =
  'M547.6 103.8L490.3 13.1C485.2 5 476.1 0 466.4 0H109.6C99.9 0 90.8 5 85.7 13.1L28.3 103.8c-29.6 46.8-3.4 111.9 51.9 119.4c4 .5 8.1 .8 12.1 .8c26.1 0 49.3-11.4 65.2-29c15.9 17.6 39.1 29 65.2 29c26.1 0 49.3-11.4 65.2-29c15.9 17.6 39.1 29 65.2 29c26.2 0 49.3-11.4 65.2-29c16 17.6 39.1 29 65.2 29c4.1 0 8.1-.3 12.1-.8c55.5-7.4 81.8-72.5 52.1-119.4zM499.7 254.9l-.1 0c-5.3 .7-10.7 1.1-16.2 1.1c-12.4 0-24.3-1.9-35.4-5.3V384H128V250.6c-11.2 3.5-23.2 5.4-35.6 5.4c-5.5 0-11-.4-16.3-1.1l-.1 0c-4.1-.6-8.1-1.3-12-2.3V384v64c0 35.3 28.7 64 64 64H448c35.3 0 64-28.7 64-64V384 252.6c-4 1-8 1.8-12.3 2.3z';
const D_USER =
  'M224 256c70.7 0 128-57.3 128-128S294.7 0 224 0S96 57.3 96 128s57.3 128 128 128zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512H418.3c16.4 0 29.7-13.3 29.7-29.7C448 383.8 368.2 304 269.7 304H178.3z';
const D_CALENDAR =
  'M96 32V64H48C21.5 64 0 85.5 0 112v48H448V112c0-26.5-21.5-48-48-48H352V32c0-17.7-14.3-32-32-32s-32 14.3-32 32V64H160V32c0-17.7-14.3-32-32-32S96 14.3 96 32zM448 192H0V464c0 26.5 21.5 48 48 48H400c26.5 0 48-21.5 48-48V192z';
const D_ARR_RIGHT =
  'M386.3 160H336c-17.7 0-32 14.3-32 32s14.3 32 32 32H464c17.7 0 32-14.3 32-32V64c0-17.7-14.3-32-32-32s-32 14.3-32 32v51.2L414.4 97.6c-87.5-87.5-229.3-87.5-316.8 0s-87.5 229.3 0 316.8s229.3 87.5 316.8 0c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0c-62.5 62.5-163.8 62.5-226.3 0s-62.5-163.8 0-226.3s163.8-62.5 226.3 0L386.3 160z';
const D_ARRS_ROTATE =
  'M105.1 202.6c7.7-21.8 20.2-42.3 37.8-59.8c62.5-62.5 163.8-62.5 226.3 0L386.3 160H336c-17.7 0-32 14.3-32 32s14.3 32 32 32H463.5c0 0 0 0 0 0h.4c17.7 0 32-14.3 32-32V64c0-17.7-14.3-32-32-32s-32 14.3-32 32v51.2L414.4 97.6c-87.5-87.5-229.3-87.5-316.8 0C73.2 122 55.6 150.7 44.8 181.4c-5.9 16.7 2.9 34.9 19.5 40.8s34.9-2.9 40.8-19.5zM39 289.3c-5 1.5-9.8 4.2-13.7 8.2c-4 4-6.7 8.8-8.1 14c-.3 1.2-.6 2.5-.8 3.8c-.3 1.7-.4 3.4-.4 5.1V448c0 17.7 14.3 32 32 32s32-14.3 32-32V396.9l17.6 17.5 0 0c87.5 87.4 229.3 87.4 316.7 0c24.4-24.4 42.1-53.1 52.9-83.7c5.9-16.7-2.9-34.9-19.5-40.8s-34.9 2.9-40.8 19.5c-7.7 21.8-20.2 42.3-37.8 59.8c-62.5 62.5-163.8 62.5-226.3 0l-.1-.1L125.6 352H176c17.7 0 32-14.3 32-32s-14.3-32-32-32H48.4c-1.6 0-3.2 .1-4.8 .3s-3.1 .5-4.6 1z';
const D_PLANE =
  'M498.1 5.6c10.1 7 15.4 19.1 13.5 31.2l-64 416c-1.5 9.7-7.4 18.2-16 23s-18.9 5.4-28 1.6L277.3 424.9l-40.1 74.5c-5.2 9.7-16.3 14.6-27 11.9S192 499 192 488V392c0-5.3 1.8-10.5 5.1-14.7L362.4 164.7c2.5-7.1-6.5-14.3-13-8.4L170.4 318.2l-32 28.9 0 0c-9.2 8.3-22.3 10.6-33.8 5.8l-85-35.4C8.4 312.8 .8 302.2 .1 290s5.5-23.7 16.1-29.8l448-256c10.7-6.1 23.9-5.5 34 1.4z';
const D_TICKET =
  'M64 64C28.7 64 0 92.7 0 128v80c26.5 0 48 21.5 48 48s-21.5 48-48 48v80c0 35.3 28.7 64 64 64H512c35.3 0 64-28.7 64-64V304c-26.5 0-48-21.5-48-48s21.5-48 48-48V128c0-35.3-28.7-64-64-64H64zm64 96l0 192H448V160H128zm-32 0c0-17.7 14.3-32 32-32H448c17.7 0 32 14.3 32 32V352c0 17.7-14.3 32-32 32H128c-17.7 0-32-14.3-32-32V160z';
const D_REPORT =
  'M64 0C28.7 0 0 28.7 0 64V448c0 35.3 28.7 64 64 64H320c35.3 0 64-28.7 64-64V160H256c-17.7 0-32-14.3-32-32V0H64zM256 0V128H384L256 0zM112 256H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16zm0 64H272c8.8 0 16 7.2 16 16s-7.2 16-16 16H112c-8.8 0-16-7.2-16-16s7.2-16 16-16z';
const D_HEADSET = 'M256 48C141.1 48 48 141.1 48 256v40c0 13.3-10.7 24-24 24s-24-10.7-24-24v-40C0 114.6 114.6 0 256 0S512 114.6 512 256v40c0 13.3-10.7 24-24 24s-24-10.7-24-24v-40c0-114.9-93.1-208-208-208zm0 176c-8.8 0-16 7.2-16 16v112c0 8.8-7.2 16-16 16s-16-7.2-16-16v-72c0-26.5-21.5-48-48-48s-48 21.5-48 48v32c0 26.5 21.5 48 48 48h6.6c2.5-9.4 11-16.6 21-16.6H184c13.3 0 24 10.7 24 24v48c0 13.3-10.7 24-24 24H152c-13.3 0-24-10.7-24-24v-7c-28.6-9-50.2-30.2-53.9-63.2H72c-39.8 0-72-32.2-72-72v-24c0-39.8 32.2-72 72-72h30.7C113.6 166.2 135.1 162 160 160h96c24.9 2 46.4 6.2 57.3 24H320c39.8 0 72 32.2 72 72v32c0 39.8-32.2 72-72 72h-8c2.6-3.1 4.4-7.1 4.4-11.6V320c0-13.3-10.7-24-24-24h-40c-13.3 0-24 10.7-24 24v80c0 13.3 10.7 24 24 24h17.8l12.8 28.8c1.9 4.3 6.1 7.2 10.8 7.2H334c2.2 0 4.3-.6 6.2-1.7c13.5 9.4 30.2 15.7 47.8 15.7c44.2 0 80-35.8 80-80V384c0-88.4-71.6-160-160-160h-52z';
const D_PRINT =
  'M128 0C92.7 0 64 28.7 64 64v96h64V64H354.7L384 93.3V160h64V93.3c0-17-6.7-33.3-18.7-45.3L400 18.7C388 6.7 371.7 0 354.7 0H128zM384 352v32 64H128V384 368 352H384zm64 32h32c17.7 0 32-14.3 32-32V256c0-35.3-28.7-64-64-64H64c-35.3 0-64 28.7-64 64v96c0 17.7 14.3 32 32 32H64v64c0 35.3 28.7 64 64 64H384c35.3 0 64-28.7 64-64V384zm-16-88c-13.3 0-24-10.7-24-24s10.7-24 24-24s24 10.7 24 24s-10.7 24-24 24z';
const D_LOCK_OPEN =
  'M352 144c0-44.2 35.8-80 80-80s80 35.8 80 80v48c0 17.7 14.3 32 32 32s32-14.3 32-32V144C576 64.5 511.5 0 432 0S288 64.5 288 144v48H64c-35.3 0-64 28.7-64 64V448c0 35.3 28.7 64 64 64H384c35.3 0 64-28.7 64-64V256c0-35.3-28.7-64-64-64H352V144z';
const D_CARET_DOWN = 'M137.4 374.6c12.5 12.5 32.8 12.5 45.3 0l128-128c9.2-9.2 11.9-22.9 6.9-34.9s-16.6-19.8-29.6-19.8L32 192c-12.9 0-24.6 7.8-29.6 19.8s-2.2 25.7 6.9 34.9l128 128z';
const D_WAREHOUSE =
  'M0 488V171.3c0-26.2 15.9-49.7 40.2-59.4L308.1 4.8c7.6-3.1 16.1-3.1 23.8 0L599.8 111.9c24.3 9.7 40.2 33.3 40.2 59.4V488c0 13.3-10.7 24-24 24H568c-13.3 0-24-10.7-24-24V224c0-17.7-14.3-32-32-32H128c-17.7 0-32 14.3-32 32V488c0 13.3-10.7 24-24 24H24c-13.3 0-24-10.7-24-24zm488 24l-336 0c-13.3 0-24-10.7-24-24V432H512l0 56c0 13.3-10.7 24-24 24zM128 400V336H512v64H128zm0-96V224H512l0 80H128z';
const D_TRUCK_FAST =
  'M112 0C85.5 0 64 21.5 64 48V96H16c-8.8 0-16 7.2-16 16s7.2 16 16 16H64 272c8.8 0 16 7.2 16 16s-7.2 16-16 16H64 48c-8.8 0-16 7.2-16 16s7.2 16 16 16H64 240c8.8 0 16 7.2 16 16s-7.2 16-16 16H64 16c-8.8 0-16 7.2-16 16s7.2 16 16 16H64 208c8.8 0 16 7.2 16 16s-7.2 16-16 16H64V416c0 53 43 96 96 96s96-43 96-96H384c0 53 43 96 96 96s96-43 96-96h32c17.7 0 32-14.3 32-32s-14.3-32-32-32V288 256 237.3c0-17-6.7-33.3-18.7-45.3L512 114.7c-12-12-28.3-18.7-45.3-18.7H416V48c0-26.5-21.5-48-48-48H112zM544 237.3V256H416V160h50.7L544 237.3zM160 464c-26.5 0-48-21.5-48-48s21.5-48 48-48s48 21.5 48 48s-21.5 48-48 48zm368-48c0 26.5-21.5 48-48 48s-48-21.5-48-48s21.5-48 48-48s48 21.5 48 48z';
const D_HAND =
  'M559.7 392.2c17.8-13.1 21.6-38.1 8.5-55.9s-38.1-21.6-55.9-8.5L392.6 416H272c-8.8 0-16-7.2-16-16s7.2-16 16-16h16 64c17.7 0 32-14.3 32-32s-14.3-32-32-32H288 272 193.7c-29.1 0-57.3 9.9-80 28L68.8 384H32c-17.7 0-32 14.3-32 32v64c0 17.7 14.3 32 32 32H192 352.5c29 0 57.3-9.3 80.7-26.5l126.6-93.3zm-367-8.2c.3 0 .6 0 .9 0c0 0 0 0 0 0c-.3 0-.6 0-.9 0z';
const D_MONEY =
  'M0 112.5V422.3c0 18 10.1 35 27 41.3c87 32.5 174 10.3 261-11.9c79.8-20.3 159.6-40.7 239.3-18.9c23 6.3 48.7-9.5 48.7-33.4V89.7c0-18-10.1-35-27-41.3C462 15.9 375 38.1 288 60.3C208.2 80.6 128.4 100.9 48.7 79.1C25.6 72.8 0 88.6 0 112.5zM288 352c-44.2 0-80-43-80-96s35.8-96 80-96s80 43 80 96s-35.8 96-80 96zM64 352c35.3 0 64 28.7 64 64H64V352zm64-208c0 35.3-28.7 64-64 64V144h64zM512 304v64H448c0-35.3 28.7-64 64-64zM448 96h64v64c-35.3 0-64-28.7-64-64z';
const D_BOXES =
  'M256 48c0-26.5 21.5-48 48-48H592c26.5 0 48 21.5 48 48V464c0 26.5-21.5 48-48 48H381.3c1.8-5 2.7-10.4 2.7-16V253.3c18.6-6.6 32-24.4 32-45.3V176c0-26.5-21.5-48-48-48H256V48zM571.3 347.3c6.2-6.2 6.2-16.4 0-22.6l-64-64c-6.2-6.2-16.4-6.2-22.6 0l-64 64c-6.2 6.2-6.2 16.4 0 22.6s16.4 6.2 22.6 0L480 310.6V432c0 8.8 7.2 16 16 16s16-7.2 16-16V310.6l36.7 36.7c6.2 6.2 16.4 6.2 22.6 0zM0 176c0-8.8 7.2-16 16-16H368c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H16c-8.8 0-16-7.2-16-16V176zm352 80V480c0 17.7-14.3 32-32 32H64c-17.7 0-32-14.3-32-32V256H352zM144 320c-8.8 0-16 7.2-16 16s7.2 16 16 16h96c8.8 0 16-7.2 16-16s-7.2-16-16-16H144z';
const D_LIST =
  'M0 96C0 60.7 28.7 32 64 32H512c35.3 0 64 28.7 64 64V416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V96zM128 288c17.7 0 32-14.3 32-32s-14.3-32-32-32s-32 14.3-32 32s14.3 32 32 32zm32-128c0-17.7-14.3-32-32-32s-32 14.3-32 32s14.3 32 32 32s32-14.3 32-32zM128 384c17.7 0 32-14.3 32-32s-14.3-32-32-32s-32 14.3-32 32s14.3 32 32 32zm96-248c-13.3 0-24 10.7-24 24s10.7 24 24 24H448c13.3 0 24-10.7 24-24s-10.7-24-24-24H224zm0 96c-13.3 0-24 10.7-24 24s10.7 24 24 24H448c13.3 0 24-10.7 24-24s-10.7-24-24-24H224zm0 96c-13.3 0-24 10.7-24 24s10.7 24 24 24H448c13.3 0 24-10.7 24-24s-10.7-24-24-24H224z';
const D_ARR_LEFT =
  'M125.7 160H176c17.7 0 32 14.3 32 32s-14.3 32-32 32H48c-17.7 0-32-14.3-32-32V64c0-17.7 14.3-32 32-32s32 14.3 32 32v51.2L97.6 97.6c87.5-87.5 229.3-87.5 316.8 0s87.5 229.3 0 316.8s-229.3 87.5-316.8 0c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0c62.5 62.5 163.8 62.5 226.3 0s62.5-163.8 0-226.3s-163.8-62.5-226.3 0L125.7 160z';
const D_MONEY_TRANSFER =
  'M535 41c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l64 64c4.5 4.5 7 10.6 7 17s-2.5 12.5-7 17l-64 64c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l23-23L384 112c-13.3 0-24-10.7-24-24s10.7-24 24-24l174.1 0L535 41zM105 377l-23 23L256 400c13.3 0 24 10.7 24 24s-10.7 24-24 24L81.9 448l23 23c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0L7 441c-4.5-4.5-7-10.6-7-17s2.5-12.5 7-17l64-64c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9zM96 64H337.9c-3.7 7.2-5.9 15.3-5.9 24c0 28.7 23.3 52 52 52l117.4 0c-4 17 .6 35.5 13.8 48.8c20.3 20.3 53.2 20.3 73.5 0L608 169.5V384c0 35.3-28.7 64-64 64H302.1c3.7-7.2 5.9-15.3 5.9-24c0-28.7-23.3-52-52-52l-117.4 0c4-17-.6-35.5-13.8-48.8c-20.3-20.3-53.2-20.3-73.5 0L32 342.5V128c0-35.3 28.7-64 64-64zm64 64H96v64c35.3 0 64-28.7 64-64zM544 320c-35.3 0-64 28.7-64 64h64V320zM320 352c53 0 96-43 96-96s-43-96-96-96s-96 43-96 96s43 96 96 96z';
const D_INVOICE =
  'M64 0C28.7 0 0 28.7 0 64V448c0 35.3 28.7 64 64 64H320c35.3 0 64-28.7 64-64V160H256c-17.7 0-32-14.3-32-32V0H64zM256 0V128H384L256 0zM64 80c0-8.8 7.2-16 16-16h64c8.8 0 16 7.2 16 16s-7.2 16-16 16H80c-8.8 0-16-7.2-16-16zm0 64c0-8.8 7.2-16 16-16h64c8.8 0 16 7.2 16 16s-7.2 16-16 16H80c-8.8 0-16-7.2-16-16zm128 72c8.8 0 16 7.2 16 16v17.3c8.5 1.2 16.7 3.1 24.1 5.1c8.5 2.3 13.6 11 11.3 19.6s-11 13.6-19.6 11.3c-11.1-3-22-5.2-32.1-5.3c-8.4-.1-17.4 1.8-23.6 5.5c-5.7 3.4-8.1 7.3-8.1 12.8c0 3.7 1.3 6.5 7.3 10.1c6.9 4.1 16.6 7.1 29.2 10.9l.5 .1 0 0 0 0c11.3 3.4 25.3 7.6 36.3 14.6c12.1 7.6 22.4 19.7 22.7 38.2c.3 19.3-9.6 33.3-22.9 41.6c-7.7 4.8-16.4 7.6-25.1 9.1V440c0 8.8-7.2 16-16 16s-16-7.2-16-16V422.2c-11.2-2.1-21.7-5.7-30.9-8.9l0 0c-2.1-.7-4.2-1.4-6.2-2.1c-8.4-2.8-12.9-11.9-10.1-20.2s11.9-12.9 20.2-10.1c2.5 .8 4.8 1.6 7.1 2.4l0 0 0 0 0 0c13.6 4.6 24.6 8.4 36.3 8.7c9.1 .3 17.9-1.7 23.7-5.3c5.1-3.2 7.9-7.3 7.8-14c-.1-4.6-1.8-7.8-7.7-11.6c-6.8-4.3-16.5-7.4-29-11.2l-1.6-.5 0 0c-11-3.3-24.3-7.3-34.8-13.7c-12-7.2-22.6-18.9-22.7-37.3c-.1-19.4 10.8-32.8 23.8-40.5c7.5-4.4 15.8-7.2 24.1-8.7V232c0-8.8 7.2-16 16-16z';
const D_MAP =
  'M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z';

/* ═══════════════════════════ helpers ═══════════════════════════ */

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MON_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const pad2 = (n: number) => String(n).padStart(2, '0');

function fmtFull(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${pad2(d.getDate())} ${MON[d.getMonth()]} ${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function fmtHour(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const h = d.getHours() % 12 || 12;
  return `${d.getDate()} ${MON_FULL[d.getMonth()]} ${pad2(h)}:${pad2(d.getMinutes())} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
}

function fmtLog(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const s = String(d.getFullYear()).slice(2);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())} - ${pad2(d.getDate())} ${MON[d.getMonth()]} ${s}`;
}

function fmtRange(from: string | null, to: string | null): string {
  const f = from ? new Date(from) : null;
  const t = to ? new Date(to) : null;
  const one = f ? `${MON[f.getMonth()]} ${f.getDate()}` : '—';
  const two = t ? `${MON[t.getMonth()]} ${t.getDate()}` : '—';
  return `${one} to ${two}`;
}

function maskPhone(p: string | null): string {
  if (!p) return '—';
  const m = p.match(/(\d+)$/);
  const tail = m ? m[1].slice(-2) : '';
  return `+216 ** *** *${tail}`;
}

function PhoneReveal({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      title={show ? 'Hide phone number' : 'Show phone number'}
      onClick={onToggle}
      className="inline-flex cursor-pointer items-center text-slate-400 transition hover:text-sky-600"
    >
      <EyeIcon />
    </button>
  );
}

function statusIcon(s: ShipmentDetail) {
  const cls = { clock: 'text-amber-700', truck: 'text-amber-700', dropbox: 'text-amber-700' }[s.status_icon] ?? 'text-amber-700';
  if (s.status_icon === 'truck') return <TruckIcon className={`mr-1 inline ${cls}`} />;
  if (s.status_icon === 'dropbox') return <DropboxIcon className={`mr-1 inline ${cls}`} />;
  return <ClockIcon className={`mr-1 inline ${cls}`} />;
}

function timelineToneFor(key: string): { base: string; icon: ReactNode } {
  switch (key) {
    case 'created':
      return { base: 'bg-sky-100 text-sky-700', icon: <Icon d={D_REPORT} size={11} /> };
    case 'prepared':
    case 'readyPickup':
      return { base: 'bg-slate-200 text-slate-500', icon: <Icon d={D_BOXES} size={11} /> };
    case 'picked':
    case 'origin':
      return { base: 'bg-slate-200 text-slate-500', icon: <Icon d={D_TRUCK_FAST} size={11} /> };
    case 'transit':
      return { base: 'bg-slate-200 text-slate-500', icon: <Icon d={D_TRUCK_FAST} size={11} /> };
    case 'destination':
      return { base: 'bg-slate-200 text-slate-500', icon: <Icon d={D_MAP} size={11} /> };
    case 'out':
      return { base: 'bg-slate-200 text-slate-500', icon: <Icon d={D_TRUCK_FAST} size={11} /> };
    case 'delivered':
      return { base: 'bg-slate-200 text-slate-500', icon: <CheckIcon /> };
    default:
      return { base: 'bg-slate-200 text-slate-500', icon: <Icon d={D_LIST} size={11} /> };
  }
}

/* ═══════════════════════════ page ═══════════════════════════ */

export default function ChefShipmentDetail() {
  const { id } = useParams<{ id: string }>();
  const shipmentId = Number(id);
  const [ship, setShip] = useState<ShipmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notesOpen, setNotesOpen] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [tab, setTab] = useState('overview');
  const [showOrgPhone, setShowOrgPhone] = useState(false);
  const [showClientPhone, setShowClientPhone] = useState(false);
  const [showWarehousePhone, setShowWarehousePhone] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setLoading(true);
    getShipmentDetail(shipmentId)
      .then(setShip)
      .catch((e) => alert(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [shipmentId]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!ship) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h5 className="text-base font-bold text-slate-900">Shipment not found</h5>
        <p className="mt-1 text-sm text-slate-500">This shipment does not exist.</p>
        <Link to="/chef/shipments" className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">
          ← Back to shipments
        </Link>
      </div>
    );
  }

  const target = new Date(ship.created_at).getTime() + 2.5 * 24 * 60 * 60 * 1000;
  const diff = Math.max(0, target - now);
  const dd = Math.floor(diff / 86400000);
  const hh = Math.floor((diff % 86400000) / 3600000);
  const mm = Math.floor((diff % 3600000) / 60000);
  const ss = Math.floor((diff % 60000) / 1000);
  const countdown = `${pad2(dd)}:${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Icon d={D_LIST} size={11} /> },
    { id: 'returns', label: 'Returns', icon: <Icon d={D_ARR_LEFT} size={11} /> },
    { id: 'transactions', label: 'Transactions', icon: <Icon d={D_MONEY_TRANSFER} size={11} /> },
    { id: 'tickets', label: 'Tickets', icon: <Icon d={D_TICKET} size={11} /> },
    { id: 'settlements', label: 'Settlements', icon: <Icon d={D_INVOICE} size={11} /> },
  ];

  const iconBtn = (title: string, children: React.ReactNode, onClick?: () => void, danger = false) => (
    <button
      key={title}
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-md border p-1.5 transition ${
        danger ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-2 py-4 sm:px-4">
      <Link to="/chef/shipments" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-sky-600 transition hover:underline">
        ← Back to shipments
      </Link>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* ── header card ── */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-xl font-bold text-slate-900">
              <span className="text-sm font-semibold text-slate-500">Shipment</span>
              <span>{String(Number(ship.gid))}</span>
              <Icon d={D_INFO} size={14} />
            </div>

            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-3 text-xs text-slate-700">
              <div className="flex flex-col gap-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700">
                  <Icon d={D_STORE} size={12} />
                  {ship.fulfiller ?? '—'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="text-[11px]">{showOrgPhone ? ship.fulfiller_phone_full : ship.fulfiller_phone}</span>
                  <PhoneReveal show={showOrgPhone} onToggle={() => setShowOrgPhone((v) => !v)} />
                  <span className="inline-flex items-center gap-1">
                    <button type="button" className="rounded-md border border-sky-200 bg-sky-50 p-1 text-sky-600 transition hover:bg-sky-100">
                      <Icon d={D_PLANE} size={10} />
                    </button>
                  </span>
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700">
                  <Icon d={D_USER} size={12} />
                  {ship.retailer_name ?? '—'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="text-[11px]">{showClientPhone ? ship.retailer_phone ?? '—' : maskPhone(ship.retailer_phone)}</span>
                  <PhoneReveal show={showClientPhone} onToggle={() => setShowClientPhone((v) => !v)} />
                  <span className="inline-flex items-center gap-1">
                    <button type="button" className="rounded-md border border-sky-200 bg-sky-50 p-1 text-sky-600 transition hover:bg-sky-100">
                      <Icon d={D_PLANE} size={10} />
                    </button>
                  </span>
                </span>
              </div>

              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                <ClockIcon className="mr-1 text-slate-400" />
                {fmtFull(ship.created_at)}
              </span>

              <span className="inline-flex items-center gap-1 text-[11px]">
                <Icon d={D_CALENDAR} size={12} className="mr-1 text-slate-400" />
                <span className="font-semibold text-amber-600 tabular-nums">{countdown}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {iconBtn('Sync shipment', <Icon d={D_ARR_RIGHT} size={11} />, undefined, true)}
            <button
              type="button"
              onClick={() => setNotesOpen(true)}
              className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Notes
            </button>
            {iconBtn('Sync all', <Icon d={D_ARRS_ROTATE} size={11} />)}
            {iconBtn('Send', <Icon d={D_PLANE} size={11} />, () => setTicketOpen(true))}
            {iconBtn('Create ticket', <Icon d={D_TICKET} size={11} />, () => setTicketOpen(true))}
            {iconBtn('Support', <Icon d={D_HEADSET} size={11} />)}
            {iconBtn('Timers', <Icon d={D_REPORT} size={11} />)}
            {iconBtn('Print', <Icon d={D_PRINT} size={11} />)}
            {iconBtn('Access', <Icon d={D_LOCK_OPEN} size={11} />)}
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-amber-400 to-amber-500 px-2.5 py-1.5 text-xs font-bold text-white transition hover:from-amber-500 hover:to-amber-600"
            >
              {statusIcon(ship)}
              {ship.status}
              <Icon d={D_CARET_DOWN} size={9} />
            </button>
          </div>
        </div>

        {/* ── info cards ── */}
        <div className="grid gap-3 p-4 md:grid-cols-2">
          {/* left: shipping info */}
          <div className="space-y-3">
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="flex items-center justify-between bg-gradient-to-b from-slate-100 to-slate-200 px-3 py-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Icon d={D_MAP} size={16} />
                  Shipping Information
                </div>
                <span className="text-[11px] text-slate-500">
                  <a href="/chef/shipments" onClick={(e) => e.preventDefault()} className="inline-flex items-center gap-1 hover:text-sky-600">
                    <Icon d={D_REPORT} size={11} /> Edit
                  </a>
                </span>
              </div>
              <div className="grid gap-1 p-3 text-xs">
                <div className="font-semibold text-slate-800">
                  <span className="font-normal text-slate-500">Client</span>: {ship.customer_name ?? '—'} /{' '}
                  <span className="inline-flex items-center">
                    <span className="text-[11px]">{showClientPhone ? ship.customer_phone_full : ship.customer_phone}</span>
                    <PhoneReveal show={showClientPhone} onToggle={() => setShowClientPhone((v) => !v)} />
                  </span>
                </div>
                <div className="font-semibold text-slate-800">
                  <span className="font-normal text-slate-500">Address</span>: <span className="font-normal text-slate-700">{ship.address ?? '—'}</span>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 bg-gradient-to-b from-sky-50 to-sky-100 px-3 py-2 text-xs font-bold text-slate-900">
                <Icon d={D_PLANE} size={12} />
                Confirmation details
              </div>
              <div className="grid gap-1 p-3 text-xs">
                <div className="font-semibold text-slate-800">
                  <span className="font-normal text-slate-500">Confirmed by: </span>
                  {ship.confirmed_by}
                </div>
                <div className="font-semibold text-slate-800">
                  <span className="font-normal text-slate-500">Order created at: </span>
                  {fmtHour(ship.order_created_at)}
                </div>
                <div className="font-semibold text-slate-800">
                  <span className="font-normal text-slate-500">Task created at: </span>
                  {fmtHour(ship.task_created_at)}
                </div>
                <div className="font-semibold text-slate-800">
                  <span className="font-normal text-slate-500">Confirmed created at: </span>
                  {fmtHour(ship.confirmed_created_at)}
                </div>
              </div>
            </div>

            <div className="mt-2 space-y-1 rounded-lg border border-sky-200 bg-sky-50 p-3 text-[11px]">
              <div className="flex items-start gap-2">
                <Icon d={D_BOXES} size={13} className="mt-0.5 text-sky-600" />
                <span>
                  <span className="font-bold text-slate-800">Expected shipping date: </span>
                  <span className="text-slate-700">{fmtRange(ship.expected_shipping_date_from, ship.expected_shipping_date_to)}</span>
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Icon d={D_TRUCK_FAST} size={13} className="mt-0.5 text-sky-600" />
                <span>
                  <span className="font-bold text-slate-800">Expected delivery date: </span>
                  <span className="text-slate-700">{fmtRange(ship.expected_delivery_date_from, ship.expected_delivery_date_to)}</span>
                </span>
              </div>
            </div>
          </div>

          {/* right: fulfillment */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-1">
              <Icon d={D_WAREHOUSE} size={14} className="text-slate-500" />
              <span className="font-bold text-slate-800">Fulfillment Warehouse:</span>
              <div>
                <h6 className="mb-0 text-xs font-bold text-rose-600">{ship.warehouse} - {ship.fulfiller ?? ''}</h6>
                <span className="inline-flex items-center gap-1">
                  <span className="text-[11px]">{showWarehousePhone ? ship.warehouse_phone_full : ship.warehouse_phone}</span>
                  <PhoneReveal show={showWarehousePhone} onToggle={() => setShowWarehousePhone((v) => !v)} />
                  <span className="inline-flex items-center gap-1">
                    <button type="button" className="rounded-md border border-sky-200 bg-sky-50 p-1 text-sky-600 transition hover:bg-sky-100">
                      <Icon d={D_PLANE} size={10} />
                    </button>
                  </span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Icon d={D_TRUCK_FAST} size={14} className="text-slate-500" />
              <span className="font-bold text-slate-800">Carrier account:</span>
              <span className="font-semibold text-slate-700">{ship.carrier_name}</span>
              <span className="text-[11px] text-slate-400">ID:{ship.carrier_account_id}</span>
            </div>

            <div className="flex items-start gap-1">
              <Icon d={D_HAND} size={14} className="mt-0.5 text-slate-500" />
              <span className="font-bold text-slate-800">Related pickup Request:</span>
              <div className="flex flex-col">
                {ship.pickup_request_id ? (
                  <span className="font-semibold text-sky-700">{ship.pickup_request_id}</span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
                {ship.pickup_note && <span className="max-w-xs text-[11px] text-slate-500">{ship.pickup_note}</span>}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Icon d={D_MONEY} size={14} className="text-slate-500" />
              <span className="font-bold text-slate-800">COD amount:</span>
              <span className="font-semibold text-slate-900">{tnd(ship.cod_amount)}</span>
            </div>
          </div>
        </div>

        {/* ── tabs ── */}
        <div className="mt-2 flex gap-1 overflow-x-auto border-b border-slate-100 px-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold transition ${
                tab === t.id ? 'border-sky-500 text-sky-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && <OverviewTab ship={ship} />}
        {tab === 'returns' && <EmptyTab label="Returns" />}
        {tab === 'transactions' && <EmptyTab label="Transactions" />}
        {tab === 'tickets' && <EmptyTab label="Tickets" />}
        {tab === 'settlements' && <EmptyTab label="Settlements" />}
      </div>

      {notesOpen && <AddNoteModal onClose={() => setNotesOpen(false)} />}
      {ticketOpen && <ShipmentTicketModal shipmentId={ship.id} gid={ship.gid} onClose={() => setTicketOpen(false)} />}
    </div>
  );
}

/* ═══════════════════════════ tabs ═══════════════════════════ */

function EmptyTab({ label }: { label: string }) {
  return (
    <div className="px-4 py-16 text-center text-sm text-slate-400">
      No {label.toLowerCase()} records found.
    </div>
  );
}

function OverviewTab({ ship }: { ship: ShipmentDetail }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-brand-600 text-white">
            <tr>
              <th className="px-3 py-2.5 font-semibold">Product</th>
              <th className="px-3 py-2.5 text-center font-semibold">Quantity</th>
              <th className="px-3 py-2.5 text-center font-semibold">Quantity settled</th>
              <th className="px-3 py-2.5 text-right font-semibold">Selling price</th>
              <th className="px-3 py-2.5 text-right font-semibold">Unit price</th>
              <th className="px-3 py-2.5 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-200 border-l-2 border-l-sky-400">
              <td className="px-3 py-2 align-middle">
                <h6 className="mb-0 flex items-center whitespace-nowrap">
                  <span className="flex flex-col justify-center text-sm font-bold text-slate-900">{ship.product_name}</span>
                </h6>
                {ship.product_variation && <p className="mb-0 mt-0.5 text-[11px] text-slate-500">{ship.product_variation}</p>}
              </td>
              <td className="px-3 py-2 text-center">{ship.quantity}</td>
              <td className="px-3 py-2 text-center">
                <span className="inline-block rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">0</span>
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{tnd(ship.cod_amount)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{tnd(ship.cost)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-500">0.000 TND</td>
            </tr>
          </tbody>
          <tfoot>
            {[
              { label: 'Subtotal', value: '0.000 TND' },
              { label: 'Service fee', value: '0.000 TND' },
              { label: 'Total', value: '0.000 TND' },
            ].map((row) => (
              <tr key={row.label}>
                <td colSpan={4} />
                <td className="border border-slate-100 bg-sky-50 px-3 py-2 text-right font-bold text-slate-800">{row.label}</td>
                <td className="border border-slate-100 bg-sky-50 px-3 py-2 text-right font-bold text-slate-800">{row.value}</td>
              </tr>
            ))}
          </tfoot>
        </table>
      </div>

      {/* order logs */}
      <div className="border-t border-slate-100 px-4 pb-6 pt-4">
        <div className="mb-2 flex items-start gap-2">
          <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-sky-700">
            <Icon d={D_REPORT} size={11} />
          </span>
          <div>
            <h5 className="mb-0 text-sm font-bold text-slate-900">
              Order logs <span className="ml-2 text-slate-300">───</span>
            </h5>
            <p className="mb-0 text-xs text-slate-500">You can monitor all the changes that happened to this order from here.</p>
          </div>
        </div>

        <div className="mt-2 space-y-1">
          {ship.timeline.map((item: ShipmentTimelineItem) => {
            const tone = timelineToneFor(item.key);
            return (
              <div
                key={item.id}
                className={`flex min-h-[44px] items-center rounded-md px-2 py-1 transition ${
                  item.completed ? 'bg-sky-50/70' : 'bg-slate-50 opacity-50 grayscale'
                }`}
              >
                <span className={`mr-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${item.completed ? tone.base : 'bg-slate-200 text-slate-400'}`}>
                  {tone.icon}
                </span>
                <span className={`min-w-0 flex-1 text-xs font-semibold ${item.completed ? 'text-slate-800' : 'text-slate-500'}`}>{item.title}</span>
                {item.at && <span className="ml-2 shrink-0 whitespace-nowrap text-right text-[11px] font-semibold tabular-nums text-slate-700">{fmtLog(item.at)}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}