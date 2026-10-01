import { useEffect, useMemo, useState } from 'react';
import { apiGet, TeamMember } from '../lib/api';

export function useTeamPhotos(base: 'chef' | 'support' | null): (name: string) => string | null {
  const [members, setMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    if (!base) {
      setMembers([]);
      return;
    }
    let alive = true;
    apiGet<TeamMember[]>(`/${base}/team-members`)
      .then((m) => {
        if (alive) setMembers(Array.isArray(m) ? m : []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [base]);

  return useMemo(() => {
    const byName = new Map(members.map((m) => [m.name, m.photo]));
    return (name: string) => byName.get(name) ?? null;
  }, [members]);
}