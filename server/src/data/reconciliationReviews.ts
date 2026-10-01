import { at, mulberry32, pad, MANAGERS } from './shipments';

export type ReviewStatus = 'Pending' | 'Approved' | 'Rejected';

export interface ReconciliationReview {
  id: number;
  created_at: string;
  type: string;
  /** Difference (TND) between expected and collected cash. Negative = deficit. */
  variance: number;
  current_variance: number;
  status: ReviewStatus;
  comment: string | null;
  reviewed_by: string | null;
  cashier_session: string;
  location: string;
}

export const REVIEW_TYPES = [
  'COD Settlement',
  'Dropbox Control',
  'Carrier Claim',
  'E-Payment',
  'Refund',
  'Handling Fee',
];

export const REVIEW_LOCATIONS = [
  'Tunis - Centre',
  'Ariana',
  'La Marsa',
  'Charguia',
  'Sousse',
  'Sfax',
  'Nabeul',
  'Bizerte',
  'Gabès',
];

const REVIEW_COMMENTS: (string | null)[] = [
  'Variance approved',
  'Please verify missing amount',
  'Waiting for carrier confirmation',
  'Difference investigated and closed',
  null,
  null,
  null,
];

export interface ReconciliationReviewsResult {
  reviews: ReconciliationReview[];
}

export function buildReconciliationReviews(): ReconciliationReviewsResult {
  const rand = mulberry32(20260819);
  const reviews: ReconciliationReview[] = [];
  const count = 264;

  for (let i = 0; i < count; i++) {
    const id = count - i;
    const dayAgo = 1 + Math.floor(i / 8);
    const created = at(dayAgo, 8 + Math.floor(rand() * 11), Math.floor(rand() * 60));

    const statusRoll = rand();
    const status: ReviewStatus = statusRoll < 0.42 ? 'Pending' : statusRoll < 0.76 ? 'Approved' : 'Rejected';
    const rawVariance = (rand() * 90 - 15);
    const variance = Math.round(rawVariance * 1000) / 1000;
    const currentVariance = Math.round((rand() < 0.7 ? variance + (rand() * 6 - 3) : variance) * 1000) / 1000;
    const reviewed_by = status === 'Pending' ? null : (MANAGERS[Math.floor(rand() * MANAGERS.length)] ?? MANAGERS[0]!);
    const comment = status === 'Pending' ? null : (REVIEW_COMMENTS[Math.floor(rand() * REVIEW_COMMENTS.length)] ?? null);

    reviews.push({
      id,
      created_at: created,
      type: REVIEW_TYPES[Math.floor(rand() * REVIEW_TYPES.length)] ?? REVIEW_TYPES[0]!,
      variance,
      current_variance: currentVariance,
      status,
      comment,
      reviewed_by,
      cashier_session: `#S-${pad(7450 + i * 3, 5)}`,
      location: REVIEW_LOCATIONS[Math.floor(rand() * REVIEW_LOCATIONS.length)] ?? REVIEW_LOCATIONS[0]!,
    });
  }

  return { reviews };
}