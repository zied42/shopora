import mysql, { Pool, RowDataPacket } from 'mysql2/promise';
import { mysqlSsl } from '../config/env';

export interface ChefTicketPerson {
  name: string;
}

export interface ChefTicketMessage {
  user: string;
  org: string;
  text: string;
  time: string;
  type?: 'normal' | 'resolution_request';
}

export interface ChefTicket {
  id: number;
  author: ChefTicketPerson;
  owners: ChefTicketPerson[];
  assignees: string[];
  internal_ticket: 'none' | 'unresolved' | 'resolved';
  labels: string[];
  org_type: 'Service' | 'Fulfiller';
  department: string;
  type: string;
  related_to: string | null;
  subject: string;
  rating: number | null;
  spam_reason: string | null;
  last_message: { user: string; org: string; text: string };
  messages: ChefTicketMessage[];
  created_at: string;
  programmed: boolean;
  answered: boolean;
  non_answered: boolean;
  no_follow: boolean;
  under_process: boolean;
  first_response_at: string | null;
  first_response_mins: number | null;
  resolution_at: string | null;
  resolution_mins: number | null;
  resolution_overdue: boolean;
  priority: 'urgent' | 'high' | 'medium';
  status: 'resolved' | 'unresolved';
}

export interface ChefTicketsResult {
  tickets: ChefTicket[];
  stats: {
    underProcess: number;
    scheduled: number;
    today: number;
    answered: number;
    nonAnswered: number;
    noFollow: number;
  };
}

export const CHEF_TICKET_ORG = 'SHOPORA Network Service Tunisia- TI460';

const pool: Pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'ecom',
  waitForConnections: true,
  connectionLimit: 5,
  ssl: mysqlSsl(process.env.DB_HOST || 'localhost'),
});

type Row<T = Record<string, unknown>> = T & RowDataPacket;

async function query<T extends RowDataPacket>(sql: string, params?: unknown[]): Promise<T[]> {
  const [rows] = await pool.query<T[]>(sql, params);
  return rows;
}

async function queryOne<T extends RowDataPacket>(sql: string, params?: unknown[]): Promise<T | undefined> {
  const [rows] = await pool.query<T[]>(sql, params);
  return rows[0];
}

interface TicketRow extends RowDataPacket {
  id: number;
  author_name: string;
  assignees: string;
  internal_ticket: string;
  labels: string;
  org_type: string;
  department: string;
  type: string;
  related_to: string | null;
  subject: string;
  rating: number | null;
  spam_reason: string | null;
  priority: string;
  status: string;
  programmed: number;
  answered: number;
  non_answered: number;
  no_follow: number;
  under_process: number;
  first_response_at: string | null;
  first_response_mins: number | null;
  resolution_at: string | null;
  resolution_mins: number | null;
  resolution_overdue: number;
  created_at: string;
}

interface MessageRow extends RowDataPacket {
  user_name: string;
  org: string;
  text: string;
  msg_type: string;
  time: string;
}

function sameLocalDay(a: string, b: Date): boolean {
  const da = new Date(a);
  return da.getFullYear() === b.getFullYear() && da.getMonth() === b.getMonth() && da.getDate() === b.getDate();
}

function parseJsonArr(val: unknown): string[] {
  if (Array.isArray(val)) return val as string[];
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return []; }
  }
  return [];
}

function rowToTicket(row: TicketRow, messages: ChefTicketMessage[]): ChefTicket {
  const assignees = parseJsonArr(row.assignees);
  const labels = parseJsonArr(row.labels);
  const lastMsg = messages.length > 0 ? messages[messages.length - 1] : { user: row.author_name, org: CHEF_TICKET_ORG, text: '' };
  return {
    id: row.id,
    author: { name: row.author_name },
    owners: assignees.map((n) => ({ name: n })),
    assignees,
    internal_ticket: row.internal_ticket as ChefTicket['internal_ticket'],
    labels,
    org_type: row.org_type as ChefTicket['org_type'],
    department: row.department,
    type: row.type,
    related_to: row.related_to,
    subject: row.subject,
    rating: row.rating,
    spam_reason: row.spam_reason,
    last_message: { user: lastMsg.user, org: lastMsg.org, text: lastMsg.text },
    messages,
    created_at: row.created_at,
    programmed: !!row.programmed,
    answered: !!row.answered,
    non_answered: !!row.non_answered,
    no_follow: !!row.no_follow,
    under_process: !!row.under_process,
    first_response_at: row.first_response_at,
    first_response_mins: row.first_response_mins,
    resolution_at: row.resolution_at,
    resolution_mins: row.resolution_mins,
    resolution_overdue: !!row.resolution_overdue,
    priority: row.priority as ChefTicket['priority'],
    status: row.status as ChefTicket['status'],
  };
}

export async function createChefTicket(input: {
  authorName: string;
  ownerNames: string[];
  subject: string;
  description: string;
  department: string;
  priority: 'urgent' | 'high' | 'medium';
  relatedTo: string | null;
}): Promise<ChefTicket> {
  const now = new Date();
  const [result] = await pool.query(
    `INSERT INTO chef_tickets (author_name, assignees, internal_ticket, labels, org_type, department, type, related_to, subject, priority, status, created_at)
     VALUES (?, ?, 'unresolved', '[]', 'Service', ?, 'Internal', ?, ?, ?, 'unresolved', ?)`,
    [
      input.authorName,
      JSON.stringify(input.ownerNames || []),
      input.department === 'All' ? 'Commercial' : input.department,
      input.relatedTo,
      input.subject,
      input.priority,
      now,
    ],
  );
  const ticketId = (result as { insertId: number }).insertId;

  if (input.description) {
    await pool.query(
      `INSERT INTO chef_ticket_messages (ticket_id, user_name, org, text, time) VALUES (?, ?, ?, ?, ?)`,
      [ticketId, input.authorName, CHEF_TICKET_ORG, input.description, now],
    );
  }

  const row = await queryOne<TicketRow>('SELECT * FROM chef_tickets WHERE id = ?', [ticketId]);
  const msgs = await query<MessageRow>('SELECT * FROM chef_ticket_messages WHERE ticket_id = ? ORDER BY time ASC', [ticketId]);
  return rowToTicket(row!, msgs.map((m) => ({ user: m.user_name, org: m.org, text: m.text, time: m.time, type: (m.msg_type as 'normal' | 'resolution_request') ?? 'normal' })));
}

export async function addMessageToTicket(ticketId: number, user: string, org: string, text: string, msgType: 'normal' | 'resolution_request' = 'normal'): Promise<ChefTicket | null> {
  const now = new Date();
  await pool.query(
    `INSERT INTO chef_ticket_messages (ticket_id, user_name, org, text, msg_type, time) VALUES (?, ?, ?, ?, ?, ?)`,
    [ticketId, user, org, text, msgType, now],
  );
  return getChefTicket(ticketId);
}

export async function updateChefTicket(ticketId: number, patch: { status?: 'resolved' | 'unresolved'; priority?: 'urgent' | 'high' | 'medium' }): Promise<ChefTicket | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (patch.status) { sets.push('status = ?'); params.push(patch.status); }
  if (patch.priority) { sets.push('priority = ?'); params.push(patch.priority); }
  if (sets.length === 0) return getChefTicket(ticketId);
  params.push(ticketId);
  await pool.query(`UPDATE chef_tickets SET ${sets.join(', ')} WHERE id = ?`, params);
  return getChefTicket(ticketId);
}

export async function getChefTicket(ticketId: number): Promise<ChefTicket | null> {
  const row = await queryOne<TicketRow>('SELECT * FROM chef_tickets WHERE id = ?', [ticketId]);
  if (!row) return null;
  const msgs = await query<MessageRow>('SELECT * FROM chef_ticket_messages WHERE ticket_id = ? ORDER BY time ASC', [ticketId]);
  return rowToTicket(row, msgs.map((m) => ({ user: m.user_name, org: m.org, text: m.text, time: m.time, type: (m.msg_type as 'normal' | 'resolution_request') ?? 'normal' })));
}

export async function buildChefTickets(currentUserName?: string): Promise<ChefTicketsResult> {
  const rows = await query<TicketRow>('SELECT * FROM chef_tickets ORDER BY created_at DESC');
  const now = new Date();
  const me = currentUserName?.trim() || '';

  const ticketIds = rows.map((r) => r.id);
  let allMessages: MessageRow[] = [];
  if (ticketIds.length > 0) {
    const placeholders = ticketIds.map(() => '?').join(',');
    allMessages = await query<MessageRow>(
      `SELECT * FROM chef_ticket_messages WHERE ticket_id IN (${placeholders}) ORDER BY time ASC`,
      ticketIds,
    );
  }
  const msgMap = new Map<number, ChefTicketMessage[]>();
  for (const m of allMessages) {
    const arr = msgMap.get(m.ticket_id) ?? [];
    arr.push({ user: m.user_name, org: m.org, text: m.text, time: m.time, type: (m.msg_type as 'normal' | 'resolution_request') ?? 'normal' });
    msgMap.set(m.ticket_id, arr);
  }

  const tickets = rows.map((r) => rowToTicket(r, msgMap.get(r.id) ?? []));

  function resolvedAt(t: ChefTicket): Date {
    const msgs = msgMap.get(t.id) ?? [];
    const lastRes = [...msgs].reverse().find((m) => m.type === 'resolution_request');
    const ts = lastRes?.time ?? t.created_at;
    return new Date(ts);
  }

  const stats = {
    underProcess: tickets.filter((t) => t.status !== 'resolved').length,
    scheduled: 0,
    today: tickets.filter((t) => t.status === 'resolved' && sameLocalDay(resolvedAt(t).toISOString(), now)).length,
    answered: me ? tickets.filter((t) => (msgMap.get(t.id) ?? []).some((m) => m.type === 'resolution_request' && m.user === me)).length : 0,
    nonAnswered: me ? tickets.filter((t) => !(msgMap.get(t.id) ?? []).some((m) => m.user === me)).length : 0,
    noFollow: tickets.filter((t) => t.no_follow).length,
  };

  return { tickets, stats };
}
