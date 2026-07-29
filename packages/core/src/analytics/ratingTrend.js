import { TREND_WEEKS, weekIndexOf } from '../domain/clock.js';
import { assertTenant } from '../lib/tenantScope.js';
import { toolResult } from '../lib/toolResult.js';

/**
 * `bq.ratingTrend` — weekly mean rating for one outlet, with change points.
 *
 * A change point is where the trailing mean moves by more than
 * `CHANGE_THRESHOLD` between adjacent weeks. It is detected, never asserted:
 * the supervisor needs somewhere real to point when it claims a rating fell,
 * and screen 04 annotates the chart from this list.
 */
export const CHANGE_THRESHOLD = 0.15;

export async function ratingTrend({
  tenantId,
  outletId,
  reviews,
  weeks = TREND_WEEKS,
  now = undefined,
} = {}) {
  const startedAt = Date.now();
  assertTenant(tenantId);

  const scoped = reviews.filter(
    (review) => review.tenantId === tenantId && review.outletId === outletId,
  );

  const buckets = Array.from({ length: weeks }, () => ({ sum: 0, count: 0, ids: [] }));

  for (const review of scoped) {
    const index = weekIndexOf(review.publishedAt, now) - 1;
    if (index < 0 || index >= weeks) continue;

    buckets[index].sum += review.rating;
    buckets[index].count += 1;
    buckets[index].ids.push(review.id);
  }

  const points = buckets.map((bucket, index) => ({
    week: index + 1,
    rating: bucket.count === 0 ? null : Number((bucket.sum / bucket.count).toFixed(2)),
    reviewCount: bucket.count,
  }));

  const changePoints = [];
  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1].rating;
    const current = points[i].rating;
    if (previous === null || current === null) continue;

    const delta = Number((current - previous).toFixed(2));
    if (Math.abs(delta) >= CHANGE_THRESHOLD) {
      changePoints.push({ week: points[i].week, delta, from: previous, to: current });
    }
  }

  const rated = points.filter((point) => point.rating !== null);
  const current = rated.at(-1)?.rating ?? null;
  const first = rated[0]?.rating ?? null;

  return toolResult({
    data: {
      outletId,
      points,
      changePoints,
      current,
      overallDelta: current !== null && first !== null ? Number((current - first).toFixed(2)) : null,
    },
    // The trend is only as citable as the reviews under it.
    sources: scoped.map((review) => ({
      type: 'review',
      id: review.id,
      outletId: review.outletId,
      publishedAt: review.publishedAt,
    })),
    startedAt,
  });
}
