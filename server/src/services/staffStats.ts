import { StaffActivityRow, StaffActivityType } from '../store';

export interface StaffTypeStat {
  activity_type: StaffActivityType;
  label: string;
  count: number;
  last7d: number;
  last30d: number;
  /** 0..100 — volume relative to the best teammate on the same activity (speed-adjusted for replies). */
  score: number;
  avg_duration_seconds: number | null;
  team_best: number;
  team_avg_duration_seconds: number | null;
}

export interface StaffAreaStat {
  activity_type: StaffActivityType;
  label: string;
  score: number;
  count: number;
}

export type StaffGrade = 'excellent' | 'good' | 'average' | 'needs_attention';

export interface StaffMemberStats {
  user_id: number;
  name: string;
  role: string;
  total_actions: number;
  last7d: number;
  last30d: number;
  active_days: number;
  last_active: string | null;
  overall_score: number;
  grade: StaffGrade;
  types: StaffTypeStat[];
  best_area: StaffAreaStat | null;
  weak_area: StaffAreaStat | null;
}

export const STAFF_TYPE_LABELS: Record<StaffActivityType, string> = {
  ticket_reply: 'Ticket replies',
  chat_reply: 'Team chat',
  order_confirm: 'Order confirmations',
  return_process: 'Returns processed',
  product_moderate: 'Product moderation',
  pick_create: 'Picks created',
  pick_scan: 'Pick scans',
  refill_create: 'Refill requests',
  refill_update: 'Refill updates',
  followup: 'Supplier follow-ups',
  command_create: 'Commandes made',
  command_forward: 'Commandes sent to chef',
  payment_reconcile: 'Payments reconciled',
  order_price_override: 'Order totals overridden',
};

/** The duties that matter for each role — where a staffer "does their job" or not. */
const ROLE_TYPES: Partial<Record<string, StaffActivityType[]>> = {
  admin: ['ticket_reply', 'return_process', 'product_moderate', 'followup', 'order_confirm', 'chat_reply', 'command_create', 'command_forward'],
  chef: ['followup', 'ticket_reply', 'product_moderate', 'order_confirm', 'chat_reply'],
  support: ['ticket_reply', 'chat_reply', 'return_process', 'command_create', 'command_forward'],
  stocking: ['pick_create', 'pick_scan', 'refill_create', 'refill_update', 'product_moderate', 'chat_reply'],
  confirmateur: ['order_confirm', 'chat_reply'],
};

const SPEED_TYPES: StaffActivityType[] = ['ticket_reply', 'chat_reply'];

interface TypeStats {
  count: number;
  last7d: number;
  last30d: number;
  durations: number[];
  lastAt: string;
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export function computeStaffStats(
  staff: Array<{ id: number; name: string; role: string }>,
  activities: StaffActivityRow[],
  now = Date.now()
): StaffMemberStats[] {
  const day = 24 * 60 * 60 * 1000;
  const weekAgo = now - 7 * day;
  const monthAgo = now - 30 * day;

  // Per-user, per-type tallies.
  const byUser = new Map<number, Map<StaffActivityType, TypeStats>>();
  // Team tallies per type (across all staff) + best single member's count.
  const team = new Map<StaffActivityType, { total: number; durations: number[]; bestMember: number }>();
  // Per (type, user) count for the "best teammate" reference.
  const typeUserCounts = new Map<StaffActivityType, Map<number, number>>();

  for (const a of activities) {
    let userTypes = byUser.get(a.user_id);
    if (!userTypes) {
      userTypes = new Map();
      byUser.set(a.user_id, userTypes);
    }
    const t = a.created_at ? new Date(a.created_at).getTime() : now;
    const cur = userTypes.get(a.activity_type) ?? { count: 0, last7d: 0, last30d: 0, durations: [], lastAt: '' };
    cur.count += 1;
    if (t >= weekAgo) cur.last7d += 1;
    if (t >= monthAgo) cur.last30d += 1;
    if (a.duration_seconds != null) cur.durations.push(a.duration_seconds);
    if (!cur.lastAt || a.created_at > cur.lastAt) cur.lastAt = a.created_at;
    userTypes.set(a.activity_type, cur);

    const tt = team.get(a.activity_type) ?? { total: 0, durations: [], bestMember: 0 };
    tt.total += 1;
    if (a.duration_seconds != null) tt.durations.push(a.duration_seconds);
    team.set(a.activity_type, tt);

    let usersForType = typeUserCounts.get(a.activity_type);
    if (!usersForType) {
      usersForType = new Map();
      typeUserCounts.set(a.activity_type, usersForType);
    }
    usersForType.set(a.user_id, (usersForType.get(a.user_id) ?? 0) + 1);
  }

  const result: StaffMemberStats[] = staff.map((s) => {
    const types = byUser.get(s.id);
    const typeStats: StaffTypeStat[] = [];
    const relevant = ROLE_TYPES[s.role] ?? Object.keys(STAFF_TYPE_LABELS) as StaffActivityType[];
    const covered = new Set<StaffActivityType>();

    if (types) {
      for (const [activityType, st] of types) {
        const bounded = relevant.includes(activityType);
        const tt = team.get(activityType);
        const teamBest = typeUserCounts.get(activityType)?.size
          ? Math.max(...(typeUserCounts.get(activityType)?.values() ?? [0]))
          : 0;
        const volumeScore = teamBest > 0 ? Math.min(100, Math.round((st.count / teamBest) * 100)) : 0;

        let score = volumeScore;
        let teamAvgDur: number | null = null;
        if (SPEED_TYPES.includes(activityType) && tt && tt.durations.length > 0) {
          teamAvgDur = tt.durations.reduce((x, y) => x + y, 0) / tt.durations.length;
          const userAvg = st.durations.length > 0 ? st.durations.reduce((x, y) => x + y, 0) / st.durations.length : teamAvgDur;
          const speedScore = teamAvgDur > 0 ? clamp(50 + ((teamAvgDur - userAvg) / teamAvgDur) * 50, 0, 100) : 50;
          score = Math.round(volumeScore * 0.7 + speedScore * 0.3);
        }

        // A low relative score means they lag the team on something that is
        // relevant to their role; keep it visible so the dashboard can say
        // where they do their job and where they don't.
        if (!bounded) score = Math.min(score, 15);

        typeStats.push({
          activity_type: activityType,
          label: STAFF_TYPE_LABELS[activityType] ?? activityType,
          count: st.count,
          last7d: st.last7d,
          last30d: st.last30d,
          score,
          avg_duration_seconds: st.durations.length
            ? Math.round(st.durations.reduce((x, y) => x + y, 0) / st.durations.length)
            : null,
          team_best: teamBest,
          team_avg_duration_seconds: teamAvgDur != null ? Math.round(teamAvgDur) : null,
        });
        if (bounded) covered.add(activityType);
      }
    }

    // Include relevant duties with zero activity so "where they don't do their job" is explicit.
    for (const at of relevant) {
      if (!covered.has(at) && !typeStats.some((ts) => ts.activity_type === at)) {
        const uc = typeUserCounts.get(at);
        typeStats.push({
          activity_type: at,
          label: STAFF_TYPE_LABELS[at] ?? at,
          count: 0,
          last7d: 0,
          last30d: 0,
          score: 0,
          avg_duration_seconds: null,
          team_best: uc?.size ? Math.max(...uc.values()) : 0,
          team_avg_duration_seconds: null,
        });
      }
    }

    typeStats.sort((x, y) => y.count - x.count);

    let total = 0;
    let last7d = 0;
    let last30d = 0;
    const activeDays = new Set<string>();
    let lastAt = '';
    if (types) {
      for (const st of types.values()) {
        total += st.count;
        last7d += st.last7d;
        last30d += st.last30d;
        for (const a of activities) {
          if (a.user_id === s.id) activeDays.add(a.created_at.slice(0, 10));
        }
        if (st.lastAt > lastAt) lastAt = st.lastAt;
      }
    }

    const scored = typeStats.filter((ts) => ts.count > 0);
    const weighted = scored.length
      ? scored.reduce((acc, ts) => acc + ts.score * ts.count, 0) / scored.reduce((acc, ts) => acc + ts.count, 0)
      : 0;
    const lastActiveMs = lastAt ? new Date(lastAt).getTime() : null;
    let bonus = 0;
    if (lastActiveMs != null) {
      const ago = now - lastActiveMs;
      if (ago <= 3 * day) bonus = 3;
      else if (ago <= 7 * day) bonus = 1.5;
    }
    const overall = Math.round(clamp(weighted + bonus, 0, 100));

    const grade: StaffGrade =
      overall >= 80 ? 'excellent' : overall >= 65 ? 'good' : overall >= 50 ? 'average' : 'needs_attention';

    const relevantScored = scored.filter((ts) => relevant.includes(ts.activity_type));
    const bestArea: StaffAreaStat | null = relevantScored.length
      ? relevantScored.reduce((m, ts) => (ts.score >= m.score ? ts : m), relevantScored[0])
      : null;
    const weakArea: StaffAreaStat | null = relevantScored.length
      ? relevantScored.reduce((m, ts) => (ts.score <= m.score ? ts : m), relevantScored[0])
      : null;

    return {
      user_id: s.id,
      name: s.name,
      role: s.role,
      total_actions: total,
      last7d,
      last30d,
      active_days: activeDays.size,
      last_active: lastAt || null,
      overall_score: overall,
      grade,
      types: typeStats,
      best_area: bestArea
        ? { activity_type: bestArea.activity_type, label: bestArea.label, score: bestArea.score, count: bestArea.count }
        : null,
      weak_area: weakArea
        ? { activity_type: weakArea.activity_type, label: weakArea.label, score: weakArea.score, count: weakArea.count }
        : null,
    };
  });

  return result.sort((a, b) => b.overall_score - a.overall_score || b.total_actions - a.total_actions);
}
