import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiGet, apiErrorMessage, timeFmt } from '../../lib/api';
import { Badge, Card, EmptyState, PageHeader, Spinner } from '../../components/ui';

interface StaffTypeStat {
  activity_type: string;
  label: string;
  count: number;
  last7d: number;
  last30d: number;
  score: number;
  avg_duration_seconds: number | null;
  team_best: number;
  team_avg_duration_seconds: number | null;
}

interface StaffArea {
  activity_type: string;
  label: string;
  score: number;
  count: number;
}

type StaffGrade = 'excellent' | 'good' | 'average' | 'needs_attention';

interface StaffMember {
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
  best_area: StaffArea | null;
  weak_area: StaffArea | null;
}

interface RoleTotals {
  [role: string]: { members: number; actions: number; avgScore: number };
}

interface OverviewData {
  members: StaffMember[];
  role_totals: RoleTotals;
  generated_at: string;
}

interface ActivityRow {
  id: number;
  user_id: number;
  user_name: string;
  role: string;
  activity_type: string;
  label: string | null;
  ref_id: number | null;
  quantity: number | null;
  duration_seconds: number | null;
  created_at: string;
}

interface DetailData {
  stats: StaffMember;
  timeline: ActivityRow[];
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  chef: 'Chef',
  support: 'Support',
  stocking: 'Stocking',
  confirmateur: 'Confirmateur',
};

const GRADE_META: Record<StaffGrade, { label: string; tone: 'green' | 'red' | 'amber' | 'blue'; ring: string; bar: string }> = {
  excellent: { label: 'Excellent', tone: 'green', ring: 'text-emerald-600', bar: 'bg-emerald-500' },
  good: { label: 'Good', tone: 'blue', ring: 'text-sky-600', bar: 'bg-sky-500' },
  average: { label: 'Average', tone: 'amber', ring: 'text-amber-600', bar: 'bg-amber-500' },
  needs_attention: { label: 'Needs attention', tone: 'red', ring: 'text-rose-600', bar: 'bg-rose-500' },
};

function scoreRingColor(score: number) {
  if (score >= 80) return 'text-emerald-500';
  if (score >= 65) return 'text-sky-500';
  if (score >= 50) return 'text-amber-500';
  return 'text-rose-500';
}

function fmtDuration(seconds: number | null | undefined): string {
  if (seconds == null) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}

function ScoreRing({ score }: { score: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="7" className="stroke-slate-100" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * score) / 100}
          className={`${scoreRingColor(score)} transition-all duration-700`}
        />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center text-base font-bold ${scoreRingColor(score)}`}>{score}</span>
    </div>
  );
}

function MemberCard({ m, onOpen }: { m: StaffMember; onOpen: (id: number) => void }) {
  const g = GRADE_META[m.grade];
  const typeCount = (t: string) => m.types.find((x) => x.activity_type === t)?.count ?? 0;
  const commandSummary = {
    made: typeCount('command_create'),
    forwarded: typeCount('command_forward'),
    any: (typeCount('command_create') + typeCount('command_forward')) > 0,
  };
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-sm font-bold text-white">
            {m.name.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">{m.name}</p>
            <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{ROLE_LABEL[m.role] ?? m.role}</p>
          </div>
        </div>
        <ScoreRing score={m.overall_score} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-slate-50 px-2 py-2">
          <p className="text-lg font-bold text-slate-900">{m.total_actions}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">30 days</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-2 py-2">
          <p className="text-lg font-bold text-slate-900">{m.last7d}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Last 7d</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-2 py-2">
          <p className="text-lg font-bold text-slate-900">{m.active_days}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Active days</p>
        </div>
      </div>

      {commandSummary.any && (
        <div className="rounded-xl border border-brand-100 bg-brand-50/50 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-brand-600">Orders</p>
          <div className="mt-1.5 flex gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="font-bold text-slate-900">{commandSummary.made}</span>
              <span className="text-[11px] text-slate-500">made</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              <span className="font-bold text-slate-900">{commandSummary.forwarded}</span>
              <span className="text-[11px] text-slate-500">sent to chef</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={g.tone}>{g.label}</Badge>
        {m.best_area && m.best_area.count > 0 && (
          <Badge tone="green">
            Best: {m.best_area.label} ({m.best_area.score})
          </Badge>
        )}
        {m.weak_area && m.weak_area.score < 60 && (
          <Badge tone="red">
            Weak: {m.weak_area.label} ({m.weak_area.score})
          </Badge>
        )}
        {m.total_actions > 0 && <span className="ml-auto text-[10px] text-slate-400">Last seen {m.last_active ? timeFmt(m.last_active) : '—'}</span>}
      </div>

      <div className="space-y-2">
        {m.types.slice(0, 5).map((t) => (
          <div key={t.activity_type}>
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-600">{t.label}</span>
              <span className="text-slate-400">{t.count}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${t.score > 0 ? (t.score >= 65 ? 'bg-emerald-400' : t.score >= 40 ? 'bg-amber-400' : 'bg-rose-400') : 'bg-slate-200'}`} style={{ width: `${t.score}%` }} />
            </div>
          </div>
        ))}
        {m.types.length === 0 && <p className="text-xs text-slate-400">No recorded activity yet.</p>}
      </div>

      <button
        onClick={() => onOpen(m.user_id)}
        className="mt-auto rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-600 hover:text-brand-600"
      >
        View details
      </button>
    </Card>
  );
}

function MemberDetail({ userId, onBack }: { userId: number; onBack: () => void }) {
  const [data, setData] = useState<DetailData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let disposed = false;
    setData(null);
    setError('');
    apiGet<DetailData>(`/staff/dashboard/${userId}`)
      .then((d) => {
        if (!disposed) setData(d);
      })
      .catch((e) => {
        if (!disposed) setError(apiErrorMessage(e));
      });
    return () => {
      disposed = true;
    };
  }, [userId]);

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-sm text-rose-600">{error}</p>
        <button onClick={onBack} className="mt-3 text-sm font-semibold text-brand-600 hover:underline">Back to overview</button>
      </Card>
    );
  }
  if (!data) return <Spinner />;

  const m = data.stats;
  const g = GRADE_META[m.grade];
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm font-semibold text-brand-600 hover:underline">← Back to team overview</button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-lg font-bold text-white">
            {m.name.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{m.name}</h2>
            <div className="mt-1 flex items-center gap-2">
              <Badge tone="slate">{ROLE_LABEL[m.role] ?? m.role}</Badge>
              <Badge tone={g.tone}>{g.label}</Badge>
            </div>
          </div>
        </div>
        <ScoreRing score={m.overall_score} />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ['Total actions (30d)', String(m.total_actions)],
          ['Last 7 days', String(m.last7d)],
          ['Active days', String(m.active_days)],
          ['Last seen', m.last_active ? timeFmt(m.last_active) : '—'],
          ['Commandes made', String(m.types.find((t) => t.activity_type === 'command_create')?.count ?? 0)],
          ['Commandes sent to chef', String(m.types.find((t) => t.activity_type === 'command_forward')?.count ?? 0)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-slate-50 px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      {m.best_area && m.weak_area && (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Strongest area</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{m.best_area.label}</p>
            <p className="text-xs text-slate-500">
              {m.best_area.count} actions · score {m.best_area.score}/100 vs team best {m.types.find((t) => t.activity_type === m.best_area!.activity_type)?.team_best ?? '—'}
            </p>
          </div>
          <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-rose-700">Needs focus</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{m.weak_area.label}</p>
            <p className="text-xs text-slate-500">
              {m.weak_area.count} actions · score {m.weak_area.score}/100 vs team best {m.types.find((t) => t.activity_type === m.weak_area!.activity_type)?.team_best ?? '—'}
            </p>
          </div>
        </div>
      )}

      <Card className="p-5">
        <h3 className="text-sm font-bold text-slate-900">Activity by duty</h3>
        <div className="mt-4 space-y-3">
          {m.types.map((t) => (
            <div key={t.activity_type} className="flex flex-wrap items-center gap-3">
              <span className="w-40 text-sm font-medium text-slate-600">{t.label}</span>
              <div className="h-2 min-w-[8rem] flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${g.bar}`} style={{ width: `${t.score}%` }} />
              </div>
              <span className="w-8 text-right text-sm font-bold text-slate-700">{t.count}</span>
              <span className={`w-12 text-right text-xs font-semibold ${t.score >= 65 ? 'text-emerald-600' : t.score >= 40 ? 'text-amber-600' : 'text-rose-600'}`}>{t.score}/100</span>
              {t.avg_duration_seconds != null && <span className="w-16 text-right text-[11px] text-slate-400">avg {fmtDuration(t.avg_duration_seconds)}</span>}
            </div>
          ))}
          {m.types.length === 0 && <p className="text-sm text-slate-400">No activity recorded yet.</p>}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-bold text-slate-900">Recent activity</h3>
        {data.timeline.length === 0 ? (
          <EmptyState icon="📋" title="No activity yet" hint="Actions will appear here once this staff member starts working." />
        ) : (
          <div className="mt-3 divide-y divide-slate-100">
            {data.timeline.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{a.label || a.activity_type.replace('_', ' ')}</p>
                  <p className="text-[11px] text-slate-400">
                    {ROLE_LABEL[a.role] ?? a.role} · {a.activity_type.replace('_', ' ')}
                    {a.duration_seconds != null ? ` · took ${fmtDuration(a.duration_seconds)}` : ''}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-slate-400">{timeFmt(a.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export default function StaffDashboard() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    apiGet<OverviewData>('/staff/dashboard/overview')
      .then(setData)
      .catch((e) => setError(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const members = useMemo(() => {
    if (!data) return [];
    if (roleFilter === 'all') return data.members;
    return data.members.filter((m) => m.role === roleFilter);
  }, [data, roleFilter]);

  const roleNames = useMemo(() => (data ? Object.keys(data.role_totals) : []), [data]);

  if (selectedId != null) {
    return (
      <div className="mx-auto max-w-5xl">
        <MemberDetail userId={selectedId} onBack={() => setSelectedId(null)} />
      </div>
    );
  }

  const needsAttention = data ? data.members.filter((m) => m.grade === 'needs_attention').length : 0;
  const teamAvg = data ? Math.round(data.members.reduce((s, m) => s + m.overall_score, 0) / Math.max(1, data.members.length)) : 0;
  const total30 = data ? data.members.reduce((s, m) => s + m.total_actions, 0) : 0;

  return (
    <div>
      <PageHeader
        title="Staff Team Dashboard"
        subtitle="How each staff member performs in their role — where they do their job and where they don't."
        actions={
          data && (
            <button onClick={load} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-brand-600 hover:text-brand-600">
              Refresh
            </button>
          )
        }
      />

      {loading && <Spinner />}
      {error && <Card className="p-5"><p className="text-sm text-rose-600">{error}</p></Card>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Members</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{data.members.length}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Actions (30 days)</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{total30}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Team avg score</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{teamAvg}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Need attention</p>
              <p className={`mt-1 text-2xl font-bold ${needsAttention > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{needsAttention}</p>
            </Card>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => setRoleFilter('all')}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${roleFilter === 'all' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              All
            </button>
            {roleNames.map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${roleFilter === r ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {ROLE_LABEL[r] ?? r} · {data.role_totals[r].members}
              </button>
            ))}
          </div>

          {members.length === 0 ? (
            <div className="mt-6">
              <EmptyState icon="👥" title="No staff members" hint="No staff users exist for this filter yet." />
            </div>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {members.map((m) => (
                <MemberCard key={m.user_id} m={m} onOpen={setSelectedId} />
              ))}
            </div>
          )}

          <p className="mt-6 text-right text-[10px] text-slate-400">Updated {data.generated_at ? timeFmt(data.generated_at) : '—'}</p>
        </>
      )}
    </div>
  );
}