import { TREND_WEEKS, weekIndexOf } from '../domain/clock.js';
import { findOutlet } from '../domain/outlets.js';
import { THEMES } from '../domain/themes.js';
import { assertTenant } from '../lib/tenantScope.js';
import { toolResult } from '../lib/toolResult.js';

/**
 * Theme clustering — AC-2.1: themes come from the review text, never from a tag
 * on the row. The only inputs are the body and the keyword table in
 * `domain/themes.js`.
 *
 * A review is assigned exactly one dominant theme, not every theme it brushes
 * against. "Kasirnya jutek, tidak menyapa" scores on both staff manner and
 * checkout; counting it under both would inflate every total and make the
 * screen-07 matrix double-count. The schema keeps `themes` an array because
 * the warehouse column is repeated, but the clusterer fills at most one.
 */

/** Complaints only. A five-star review mentioning parking is not a complaint. */
export const COMPLAINT_MAX_RATING = 3;

function normalise(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Scores one review against every theme. Each keyword counts once however many
 * times it appears, so a rant that repeats "parkir" six times does not outweigh
 * a review that names two distinct problems.
 */
export function scoreThemes(text) {
  const haystack = normalise(text);

  return THEMES.map((theme) => {
    const matched = theme.keywords.filter(({ term }) => haystack.includes(normalise(term)));
    return {
      theme: theme.id,
      score: matched.reduce((sum, keyword) => sum + keyword.weight, 0),
      matchedTerms: matched.map((keyword) => keyword.term),
    };
  }).sort((a, b) => b.score - a.score);
}

/**
 * The dominant theme, with a confidence in 0..1 — its share of all theme
 * signal in the text. Returns null when nothing matches, which is the honest
 * answer for "Tokonya nyaman, belanja cepat".
 */
export function classifyReview(text) {
  const scored = scoreThemes(text);
  const total = scored.reduce((sum, entry) => sum + entry.score, 0);

  if (total === 0 || scored[0].score === 0) return null;

  const [top] = scored;
  return {
    theme: top.theme,
    score: Number((top.score / total).toFixed(4)),
    rawScore: top.score,
    matchedTerms: top.matchedTerms,
  };
}

/** The `themes` value written to the review row: at most one entry. */
export function themesFor(text) {
  const classified = classifyReview(text);
  return classified ? [{ theme: classified.theme, score: classified.score }] : [];
}

/**
 * `bq.themeCluster` — weekly complaint rollup per outlet over the trend window.
 *
 * `infra/sql/build_theme_rollup.sql` is the BigQuery form of this function; the
 * two must agree, which is why both filter to rating <= 3 and both count a
 * review once.
 */
export async function themeCluster({
  tenantId,
  reviews,
  outletId = null,
  weeks = TREND_WEEKS,
  now = undefined,
} = {}) {
  const startedAt = Date.now();
  assertTenant(tenantId);

  const scoped = reviews
    .filter((review) => review.tenantId === tenantId)
    .filter((review) => (outletId ? review.outletId === outletId : true))
    .filter((review) => review.rating <= COMPLAINT_MAX_RATING);

  /** theme -> { total, byOutlet, weekly, sources } */
  const buckets = new Map();

  for (const review of scoped) {
    const classified = classifyReview(review.text);
    if (!classified) continue;

    const weekIndex = weekIndexOf(review.publishedAt, now);
    if (weekIndex < 1 || weekIndex > weeks) continue;

    const bucket = buckets.get(classified.theme) ?? {
      total: 0,
      byOutlet: {},
      weekly: Array.from({ length: weeks }, () => 0),
      weeklyByOutlet: {},
      sources: [],
      outletIds: new Set(),
    };

    bucket.total += 1;
    bucket.byOutlet[review.outletId] = (bucket.byOutlet[review.outletId] ?? 0) + 1;
    bucket.weekly[weekIndex - 1] += 1;
    bucket.weeklyByOutlet[review.outletId] ??= Array.from({ length: weeks }, () => 0);
    bucket.weeklyByOutlet[review.outletId][weekIndex - 1] += 1;
    bucket.outletIds.add(review.outletId);

    // Constitution I: the count has to be traceable to the rows behind it.
    bucket.sources.push({
      type: 'review',
      id: review.id,
      outletId: review.outletId,
      theme: classified.theme,
      score: classified.score,
    });

    buckets.set(classified.theme, bucket);
  }

  const themes = [...buckets.entries()]
    .map(([theme, bucket]) => ({
      theme,
      count: bucket.total,
      byOutlet: bucket.byOutlet,
      weekly: bucket.weekly,
      weeklyByOutlet: bucket.weeklyByOutlet,
      // Same definition as the SQL's LAG(count, 4): this week against the same
      // week a month earlier.
      delta: ratio(bucket.weekly[weeks - 1], bucket.weekly[Math.max(0, weeks - 5)]),
      outletIds: [...bucket.outletIds],
      regions: [...new Set([...bucket.outletIds].map((id) => findOutlet(id)?.region).filter(Boolean))],
    }))
    .sort((a, b) => b.count - a.count);

  const sources = [...buckets.values()].flatMap((bucket) => bucket.sources);

  return toolResult({
    data: { themes, weeks, reviewsConsidered: scoped.length },
    sources,
    startedAt,
  });
}

function ratio(current, earlier) {
  if (!earlier) return null;
  return Number((current / earlier).toFixed(2));
}
