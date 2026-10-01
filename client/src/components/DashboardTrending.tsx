import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiErrorMessage, apiGet, TrendingItem } from '../lib/api';
import { TrendingCardSkeleton, TrendingStrip } from './Trending';

export function DashboardTrending({ limit = 8, navigateTo }: { limit?: number; navigateTo?: string }) {
  const [items, setItems] = useState<TrendingItem[] | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    apiGet<TrendingItem[]>(`/products/trending?limit=${limit}`)
      .then(setItems)
      .catch((e) => alert(apiErrorMessage(e)));
  }, [limit]);

  if (!items) return <TrendingCardSkeleton />;
  return (
    <TrendingStrip
      items={items}
      onOpen={(t) => {
        if (navigateTo) navigate(navigateTo.replace(':id', String(t.best.product_id)));
      }}
    />
  );
}