import { ReactNode, useEffect, useState } from 'react';
import { apiErrorMessage, apiGet, DashboardData } from '../lib/api';
import { Spinner } from '../components/ui';

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    apiGet<DashboardData>('/dashboard')
      .then(setData)
      .catch((e) => setError(apiErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return { data, loading, error, refresh: load };
}

export function DashboardLoader({ children }: { children: (d: DashboardData) => ReactNode }) {
  const { data, loading, error } = useDashboard();
  if (loading) return <Spinner />;
  if (error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;
  if (!data) return null;
  return <>{children(data)}</>;
}