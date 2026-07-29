import { cannibalisation } from './cannibalisation.js';
import { competitorFactor, normaliseWeights } from './locationScore.js';
import { assertTenant } from '../lib/tenantScope.js';
import { toolResult } from '../lib/toolResult.js';

/**
 * Site Scout — screen 08. Ranks candidate sites for a new branch.
 *
 * The same tools as the network map, asked a different question: not "which
 * branch is struggling" but "where should the next one go". Nothing new is
 * invented — competitor density comes from Places, distance to own branches
 * from the cannibalisation check.
 *
 * A candidate is scored on a different fourth factor from an existing outlet:
 * parking access matters for a branch you already run, cannibalisation matters
 * for one you are considering. Substituting it is the whole difference between
 * evaluating a site and evaluating a shop.
 */

export const CANDIDATE_WEIGHTS = Object.freeze({
  traffic: 0.3,
  mix: 0.25,
  competitors: 0.25,
  cannibalisation: 0.2,
});

export const CANDIDATE_FACTOR_LABELS = Object.freeze({
  traffic: 'Lalu lintas pejalan',
  mix: 'Bauran kategori',
  competitors: 'Pesaing',
  cannibalisation: 'Kanibalisasi',
});

/** Beyond this, a new branch is not taking meaningful custom from an old one. */
export const CLEAR_DISTANCE_KM = 3;

/**
 * Candidate sites. Coordinates are real Jakarta Timur positions; the traffic
 * and category-mix figures are survey inputs, flagged as such on screen exactly
 * as they are for existing outlets.
 */
const CANDIDATE_POOL = Object.freeze([
  {
    id: 'cibubur-junction',
    name: 'Cibubur Junction · sisi timur',
    area: 'Jakarta Timur',
    geo: { lat: -6.3676, lng: 106.8919 },
    surveyed: { traffic: 91, mix: 86 },
    context: 'Perkantoran dan dua sekolah dalam radius 600 m',
  },
  {
    id: 'kramat-jati',
    name: 'Kramat Jati · dekat pasar',
    area: 'Jakarta Timur',
    geo: { lat: -6.2795, lng: 106.8676 },
    surveyed: { traffic: 95, mix: 71 },
    context: 'Pasar harian dengan arus pejalan tertinggi dari semua kandidat',
  },
  {
    id: 'duren-sawit',
    name: 'Duren Sawit · jalan utama',
    area: 'Jakarta Timur',
    geo: { lat: -6.2317, lng: 106.9203 },
    surveyed: { traffic: 69, mix: 78 },
    context: 'Jalan utama perumahan, arus stabil sepanjang hari',
  },
  {
    id: 'pondok-gede',
    name: 'Pondok Gede · seberang terminal',
    area: 'Bekasi',
    geo: { lat: -6.2823, lng: 106.9312 },
    surveyed: { traffic: 88, mix: 74 },
    context: 'Terminal dan area transit',
  },
  {
    // Deliberately close to Bekasi Timur, so the cannibalisation rule has a
    // real case to catch rather than being a check that never fires.
    id: 'bekasi-utara',
    name: 'Bekasi · Jl. Chairil Anwar utara',
    area: 'Bekasi',
    geo: { lat: -6.2303, lng: 107.0011 },
    surveyed: { traffic: 84, mix: 80 },
    context: 'Ruas yang sama dengan cabang Bekasi Timur, sisi utara',
  },
]);

/** Distance to the nearest own branch, expressed on the 0–100 factor scale. */
export function cannibalisationFactor(nearestOwnKm) {
  if (nearestOwnKm === null || nearestOwnKm === undefined) return 100;
  return Math.max(0, Math.min(100, Math.round((nearestOwnKm / CLEAR_DISTANCE_KM) * 100)));
}

export async function scoutSites({
  tenantId,
  places,
  weights = CANDIDATE_WEIGHTS,
  candidates = CANDIDATE_POOL,
  limit = 3,
  radiusM = 800,
  request = null,
} = {}) {
  const startedAt = Date.now();
  assertTenant(tenantId);

  const appliedWeights = normaliseWeights(weights, { merge: false });
  const sources = [];
  let poiCount = 0;

  const scored = await Promise.all(
    candidates.map(async (candidate) => {
      const [nearby, cannibal] = await Promise.all([
        places.nearbyCompetitors({ geo: candidate.geo, radiusM }),
        cannibalisation({ tenantId, geo: candidate.geo }),
      ]);

      poiCount += nearby.data.total;
      sources.push(...nearby.sources, ...cannibal.sources);

      const factors = {
        traffic: candidate.surveyed.traffic,
        mix: candidate.surveyed.mix,
        competitors: competitorFactor(nearby.data.total),
        cannibalisation: cannibalisationFactor(cannibal.data.nearestOwnKm),
      };

      const total = Math.round(
        Object.entries(appliedWeights).reduce(
          (sum, [key, weight]) => sum + (factors[key] ?? 0) * weight,
          0,
        ),
      );

      return {
        ...candidate,
        total,
        factors,
        weights: appliedWeights,
        labels: CANDIDATE_FACTOR_LABELS,
        competitorCount: nearby.data.total,
        nearestOwn: cannibal.data.nearestOwn,
        nearestOwnKm: cannibal.data.nearestOwnKm,
        cannibalFlagged: cannibal.data.flagged,
        radiusM,
        // Same honesty as the outlet score: two of the four are surveyed.
        derivedFactors: ['competitors', 'cannibalisation'],
        surveyedFactors: ['traffic', 'mix'],
      };
    }),
  );

  const ranked = scored.sort((a, b) => b.total - a.total);
  const recommended = ranked.slice(0, limit).map((candidate, index) => ({
    ...candidate,
    rank: index + 1,
    reasoning: reasoningFor(candidate),
  }));

  /**
   * Sites that were considered and rejected, with the reason. Shown rather
   * than dropped: a filter nobody can see is indistinguishable from no filter,
   * and the cannibalisation rule is worth more visible than hidden. Ranking is
   * left alone — promoting a rejected site to make the rule demonstrable would
   * make the order say something the numbers do not.
   */
  const rejected = ranked
    .filter((candidate) => candidate.cannibalFlagged && !recommended.includes(candidate))
    .map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      total: candidate.total,
      nearestOwn: candidate.nearestOwn,
      nearestOwnKm: candidate.nearestOwnKm,
      reason: `Hanya ${candidate.nearestOwnKm} km dari ${candidate.nearestOwn.name} — di bawah ambang 1,2 km.`,
    }));

  return toolResult({
    data: {
      request: request ?? DEFAULT_REQUEST,
      recommended,
      rejected,
      considered: candidates.length,
      // "Passed the filter" means not flagged for cannibalisation: a site that
      // mostly moves existing customers is not an expansion.
      passedFilter: ranked.filter((candidate) => !candidate.cannibalFlagged).length,
      poiCount,
      weights: appliedWeights,
    },
    sources,
    startedAt,
  });
}

const DEFAULT_REQUEST =
  'Cari kandidat lokasi baru, minimal 1,2 km dari cabang kami sendiri, dengan lalu lintas pejalan tinggi.';

/**
 * The paragraph under each candidate. Written from its own numbers, so it
 * cannot say "no competitors nearby" about a site with four of them.
 */
function reasoningFor(candidate) {
  const parts = [`${candidate.context}.`];

  parts.push(
    candidate.competitorCount === 0
      ? `Tidak ada minimarket sejenis dalam radius ${candidate.radiusM} m.`
      : `${candidate.competitorCount} pesaing sejenis dalam radius ${candidate.radiusM} m.`,
  );

  if (candidate.cannibalFlagged) {
    parts.push(
      `Cabang sendiri terdekat ${candidate.nearestOwn.name} hanya ${candidate.nearestOwnKm} km — ` +
        'sebagian pelanggan akan berpindah, bukan bertambah.',
    );
  } else if (candidate.nearestOwn) {
    parts.push(
      `Cabang terdekat kami ${candidate.nearestOwn.name} ${candidate.nearestOwnKm} km — tidak berebut pelanggan.`,
    );
  }

  // A trade-off is worth naming: a high-traffic site with heavy competition is
  // a price play, not a convenience one, and that changes who should approve it.
  if (candidate.factors.traffic >= 90 && candidate.factors.competitors < 60) {
    parts.push('Cocok bila strateginya harga, bukan kenyamanan.');
  }

  return parts.join(' ');
}

export { CANDIDATE_POOL };
