import { CANNIBALISATION_THRESHOLD_KM, cannibalisation } from '../location/cannibalisation.js';
import { locationScore } from '../location/locationScore.js';
import { compareSites } from '../location/compareSites.js';
import { scoutSites } from '../location/siteScout.js';
import { outletsForTenant } from '../domain/outlets.js';
import { DEFAULT_LOCALE } from '../i18n/locales.js';
import { localeFactor } from '../i18n/format.js';
import { t } from '../i18n/index.js';
import { assertTenant } from '../lib/tenantScope.js';

/**
 * The network map — screen 03.
 *
 * Scores every outlet, finds the competitors around each, and looks for own
 * branches close enough to be taking each other's customers. Everything on the
 * map is derived: the marker positions are real coordinates, the scores come
 * from the Places response, and the agent note is written from whatever the
 * cannibalisation check actually found.
 */
export function createLocationService({ places, weights = undefined } = {}) {
  async function networkMap(tenantId, { ratingsByOutlet = {}, locale = DEFAULT_LOCALE } = {}) {
    assertTenant(tenantId);
    const outlets = outletsForTenant(tenantId);

    const scored = await Promise.all(
      outlets.map(async (outlet) => {
        const [score, nearby] = await Promise.all([
          locationScore({ tenantId, outletId: outlet.outletId, places, weights, locale }),
          places.nearbyCompetitors({ geo: outlet.geo }),
        ]);

        return {
          outletId: outlet.outletId,
          code: outlet.code,
          name: outlet.name,
          region: outlet.region,
          geo: outlet.geo,
          manager: outlet.manager,
          score: score.data.total,
          factors: score.data.factors,
          weights: score.data.weights,
          derivedFactors: score.data.derivedFactors,
          surveyedFactors: score.data.surveyedFactors,
          competitorCount: score.data.competitorCount,
          newCompetitorCount: score.data.newCompetitorCount,
          radiusM: score.data.radiusM,
          labels: score.data.labels,
          rating: ratingsByOutlet[outlet.outletId] ?? null,
          competitors: nearby.data.pois,
        };
      }),
    );

    const pairs = await nearbyOwnPairs(tenantId, outlets, locale);

    return {
      // Ascending: the branch that needs attention is the one at the top.
      outlets: scored.sort((a, b) => a.score - b.score),
      competitors: scored.flatMap((outlet) =>
        outlet.competitors.map((poi) => ({ ...poi, nearOutletId: outlet.outletId })),
      ),
      cannibalisationPairs: pairs,
      agentNote: agentNote(scored, pairs, locale),
      sourceCount: scored.reduce((sum, outlet) => sum + outlet.competitorCount, 0),
    };
  }

  async function siteScout(tenantId, { locale = DEFAULT_LOCALE } = {}) {
    assertTenant(tenantId);
    const { data } = await scoutSites({ tenantId, places, weights: undefined, locale });
    return data;
  }

  async function compare(tenantId, ids = null, { locale = DEFAULT_LOCALE } = {}) {
    assertTenant(tenantId);
    const { data } = await compareSites({ tenantId, places, ids, weights, locale });
    return data;
  }

  return { networkMap, siteScout, compare };
}

/**
 * Own outlets close enough to compete with each other. Checked pairwise and
 * de-duplicated, so A-B and B-A are one finding rather than two.
 */
async function nearbyOwnPairs(tenantId, outlets, locale) {
  const seen = new Set();
  const pairs = [];

  for (const outlet of outlets) {
    const { data } = await cannibalisation({
      tenantId,
      geo: outlet.geo,
      excludeOutletId: outlet.outletId,
      locale,
    });

    if (!data.flagged || !data.nearestOwn) continue;

    const key = [outlet.outletId, data.nearestOwn.outletId].sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key);

    pairs.push({ a: outlet.name, b: data.nearestOwn.name, km: data.nearestOwnKm });
  }

  return pairs;
}

/** Written from what was found; there is no note when there is nothing to say. */
function agentNote(scored, pairs, locale = DEFAULT_LOCALE) {
  const threshold = localeFactor(locale, CANNIBALISATION_THRESHOLD_KM);

  if (pairs.length > 0) {
    const [pair] = pairs;
    const km = localeFactor(locale, pair.km);

    return {
      headline: t(locale, 'mapNote.pairsHeadline'),
      body: t(locale, 'mapNote.pairsBody', { a: pair.a, b: pair.b, km, threshold }),
      evidence: [
        t(locale, 'mapNote.pairsEvidenceKm', { km }),
        t(locale, 'mapNote.pairsEvidenceThreshold', { threshold }),
        t(locale, 'mapNote.pairsEvidenceCount', { count: pairs.length }),
      ],
    };
  }

  const withNew = scored.filter((outlet) => outlet.newCompetitorCount > 0);
  if (withNew.length > 0) {
    const worst = withNew.sort((a, b) => a.score - b.score)[0];
    // The radius the score actually used, rather than "1 km" written by hand and
    // left behind the first time the default changed.
    const radius = `${localeFactor(locale, (worst.radiusM ?? 1000) / 1000)} km`;

    return {
      headline: t(locale, 'mapNote.newCompetitorsHeadline', { outlet: worst.name }),
      body: t(locale, 'mapNote.newCompetitorsBody', {
        count: worst.newCompetitorCount,
        outlet: worst.name,
        score: worst.score,
        factor: worst.factors.competitors,
        radius,
      }),
      evidence: [
        t(locale, 'mapNote.evidenceScore', { score: worst.score }),
        t(locale, 'mapNote.evidenceCompetitors', { count: worst.competitorCount }),
        t(locale, 'mapNote.evidenceRadius', { radius }),
      ],
    };
  }

  return null;
}
