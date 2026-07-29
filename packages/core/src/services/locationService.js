import { cannibalisation } from '../location/cannibalisation.js';
import { locationScore } from '../location/locationScore.js';
import { scoutSites } from '../location/siteScout.js';
import { outletsForTenant } from '../domain/outlets.js';
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
  async function networkMap(tenantId, { ratingsByOutlet = {} } = {}) {
    assertTenant(tenantId);
    const outlets = outletsForTenant(tenantId);

    const scored = await Promise.all(
      outlets.map(async (outlet) => {
        const [score, nearby] = await Promise.all([
          locationScore({ tenantId, outletId: outlet.outletId, places, weights }),
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
          rating: ratingsByOutlet[outlet.outletId] ?? null,
          competitors: nearby.data.pois,
        };
      }),
    );

    const pairs = await nearbyOwnPairs(tenantId, outlets);

    return {
      // Ascending: the branch that needs attention is the one at the top.
      outlets: scored.sort((a, b) => a.score - b.score),
      competitors: scored.flatMap((outlet) =>
        outlet.competitors.map((poi) => ({ ...poi, nearOutletId: outlet.outletId })),
      ),
      cannibalisationPairs: pairs,
      agentNote: agentNote(scored, pairs),
      sourceCount: scored.reduce((sum, outlet) => sum + outlet.competitorCount, 0),
    };
  }

  async function siteScout(tenantId) {
    assertTenant(tenantId);
    const { data } = await scoutSites({ tenantId, places, weights: undefined });
    return data;
  }

  return { networkMap, siteScout };
}

/**
 * Own outlets close enough to compete with each other. Checked pairwise and
 * de-duplicated, so A-B and B-A are one finding rather than two.
 */
async function nearbyOwnPairs(tenantId, outlets) {
  const seen = new Set();
  const pairs = [];

  for (const outlet of outlets) {
    const { data } = await cannibalisation({
      tenantId,
      geo: outlet.geo,
      excludeOutletId: outlet.outletId,
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
function agentNote(scored, pairs) {
  if (pairs.length > 0) {
    const [pair] = pairs;
    return {
      headline: 'Dua cabang berdekatan terdeteksi',
      body:
        `${pair.a} dan ${pair.b} hanya berjarak ${pair.km} km — di bawah ambang 1,2 km. ` +
        'Sebagian pelanggan berpindah antar keduanya, bukan bertambah. Catchment keduanya ' +
        'sudah dihitung ulang.',
      evidence: [`${pair.km} km`, 'ambang 1,2 km', `${pairs.length} pasang`],
    };
  }

  const withNew = scored.filter((outlet) => outlet.newCompetitorCount > 0);
  if (withNew.length > 0) {
    const worst = withNew.sort((a, b) => a.score - b.score)[0];
    return {
      headline: `Pesaing baru di sekitar ${worst.name}`,
      body:
        `${worst.newCompetitorCount} pesaing baru muncul dalam radius 1 km. Skor lokasi ` +
        `${worst.name} kini ${worst.score}, terendah di jaringan. Faktor kepadatan pesaing ` +
        `turun ke ${worst.factors.competitors}.`,
      evidence: [`skor ${worst.score}`, `${worst.competitorCount} pesaing`, 'radius 1 km'],
    };
  }

  return null;
}
