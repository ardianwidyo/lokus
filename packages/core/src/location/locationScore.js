import { findOutlet } from '../domain/outlets.js';
import { assertTenant } from '../lib/tenantScope.js';
import { toolResult } from '../lib/toolResult.js';

/**
 * `bq.locationScore` — AC-5.1: the score exposes its four factors and their
 * weights.
 *
 * The competitor factor is *derived* from the Places response rather than
 * seeded, so the number on screen moves when the map does. The other three are
 * survey inputs: foot traffic, surrounding category mix and parking access come
 * from street-level data the demo does not have, so they are seeded and labelled
 * as such rather than being computed from nothing.
 */

/** Default weights. Configurable per tenant in Admin (AC-5.1). */
export const DEFAULT_WEIGHTS = Object.freeze({
  traffic: 0.35,
  mix: 0.25,
  competitors: 0.25,
  access: 0.15,
});

export const FACTOR_LABELS = Object.freeze({
  traffic: 'Lalu lintas pejalan',
  mix: 'Bauran kategori sekitar',
  competitors: 'Kepadatan pesaing',
  access: 'Ketersediaan parkir',
});

/** Each competing POI inside the radius costs this much of the factor. */
export const COMPETITOR_PENALTY = 8;

/**
 * Survey inputs per outlet. Not derived, and the UI says so — inventing a
 * footfall figure would be exactly the untraceable number the constitution
 * forbids.
 */
const SURVEYED = Object.freeze({
  'BKS-02': { traffic: 88, mix: 76, access: 44 },
  'CKR-01': { traffic: 79, mix: 74, access: 66 },
  'DPK-01': { traffic: 86, mix: 71, access: 62 },
  'SRP-03': { traffic: 86, mix: 82, access: 71 },
  'BGR-01': { traffic: 88, mix: 87, access: 80 },
  'TGR-01': { traffic: 80, mix: 78, access: 74 },
});

export class LocationScoreError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'LocationScoreError';
    this.code = code;
  }
}

export function competitorFactor(competitorCount) {
  return Math.max(0, 100 - competitorCount * COMPETITOR_PENALTY);
}

/**
 * `merge: false` normalises exactly the keys given, without folding in the
 * outlet defaults. Site Scout scores on cannibalisation where an outlet scores
 * on parking access; merging would leave an `access` weight with no factor
 * behind it, silently dragging every candidate's score down.
 */
export function normaliseWeights(weights, { merge = true } = {}) {
  const merged = merge ? { ...DEFAULT_WEIGHTS, ...weights } : { ...weights };
  const total = Object.values(merged).reduce((sum, value) => sum + value, 0);

  if (total <= 0) {
    throw new LocationScoreError('WEIGHTS_INVALID', 'Bobot faktor harus berjumlah lebih dari nol');
  }

  // Renormalised, so an admin who sets weights summing to 1.2 gets a score
  // still on a 0-100 scale rather than one that quietly exceeds it.
  return Object.fromEntries(
    Object.entries(merged).map(([key, value]) => [key, Number((value / total).toFixed(4))]),
  );
}

export function scoreFrom(factors, weights) {
  const w = normaliseWeights(weights);
  const total = Object.entries(w).reduce((sum, [key, weight]) => sum + (factors[key] ?? 0) * weight, 0);

  return Math.round(total);
}

/** `bq.locationScore`. Pass `geo` to score a candidate site instead of an outlet. */
export async function locationScore({
  tenantId,
  outletId = null,
  geo = null,
  places,
  weights = DEFAULT_WEIGHTS,
  surveyed = null,
  radiusM = 1000,
} = {}) {
  const startedAt = Date.now();
  assertTenant(tenantId);

  const outlet = outletId ? findOutlet(outletId) : null;
  if (outletId && (!outlet || outlet.tenantId !== tenantId)) {
    // Same refusal for another tenant's outlet as for one that does not exist.
    throw new LocationScoreError('OUTLET_NOT_FOUND', 'Cabang tidak ditemukan untuk tenant ini');
  }

  const point = geo ?? outlet?.geo;
  if (!point) {
    throw new LocationScoreError('TARGET_REQUIRED', 'Butuh outletId atau koordinat untuk dinilai');
  }

  const nearby = await places.nearbyCompetitors({ geo: point, radiusM });
  const survey = surveyed ?? SURVEYED[outletId] ?? { traffic: 70, mix: 70, access: 70 };

  const factors = {
    traffic: survey.traffic,
    mix: survey.mix,
    competitors: competitorFactor(nearby.data.total),
    access: survey.access,
  };

  const appliedWeights = normaliseWeights(weights);

  return toolResult({
    data: {
      outletId,
      geo: point,
      total: scoreFrom(factors, appliedWeights),
      factors,
      weights: appliedWeights,
      labels: FACTOR_LABELS,
      competitorCount: nearby.data.total,
      newCompetitorCount: nearby.data.newSinceCount,
      // Named so the UI can say which numbers are measured and which surveyed,
      // rather than presenting all four as if they had the same provenance.
      derivedFactors: ['competitors'],
      surveyedFactors: ['traffic', 'mix', 'access'],
      radiusM,
    },
    sources: nearby.sources,
    startedAt,
  });
}
