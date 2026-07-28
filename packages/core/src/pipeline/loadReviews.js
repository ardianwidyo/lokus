import { DEMO_NOW } from '../domain/clock.js';
import { assertTenant } from '../lib/tenantScope.js';

/**
 * The nightly review load: adapter -> raw landing -> review fact table.
 *
 * The landing write comes first and stores the adapter response verbatim, so a
 * reload never has to call the Business Profile API again — which matters
 * because that API is rate limited and, per Q1, may not be ours for long.
 *
 * Themes are deliberately not set here. A review arrives unlabelled and the
 * clustering step writes them afterwards (AC-2.1). `infra/sql/load_review_facts.sql`
 * is the BigQuery form of exactly this.
 */
export async function loadReviewFacts({
  tenantId,
  gbp,
  warehouse,
  since = null,
  now = DEMO_NOW,
  logger = null,
}) {
  assertTenant(tenantId);
  const startedAt = Date.now();

  const listed = await gbp.listReviews({ tenantId, since, limit: 5000 });
  const rows = listed.data.reviews;

  const extractedAt = now.toISOString();
  await warehouse.putLanding(tenantId, extractedAt, { reviews: rows });

  const merged = await warehouse.mergeReviews(tenantId, rows);

  const summary = {
    tenantId,
    extractedAt,
    read: rows.length,
    inserted: merged.inserted,
    updated: merged.updated,
    sources: listed.sources.length,
    latencyMs: Date.now() - startedAt,
  };

  // Constitution IV: every log line carries the tenant id.
  logger?.info?.({ event: 'review.load', ...summary }, 'nightly review load complete');

  return summary;
}
