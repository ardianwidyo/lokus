import { assertTenant } from '../lib/tenantScope.js';
import { toolResult } from '../lib/toolResult.js';
import { CANDIDATE_POOL, scoutSites } from './siteScout.js';

/**
 * Two candidates, factor by factor — AC-5.3.
 *
 * Every row declares where its number came from and which side it favours, and
 * the two conclusions are written from the rows rather than chosen first and
 * justified after. A comparison that only shows totals invites the reader to
 * accept the ranking; showing the rows lets them disagree with it.
 */

/**
 * Daily visits are a model, not a measurement, so the model is stated rather
 * than hidden behind a plausible-looking number.
 *
 *   passers-by ≈ traffic score × 8
 *   share      ≈ 1 / (1 + competitors × 0.15)
 *
 * The band is ±12%, which is roughly the spread between a weekday and a
 * weekend on the outlets we can actually measure.
 */
export const VISITS_PER_TRAFFIC_POINT = 8;
export const COMPETITOR_SHARE_WEIGHT = 0.15;
export const VISITS_BAND = 0.12;

export function estimateDailyVisits({ traffic, competitorCount }) {
  const passers = traffic * VISITS_PER_TRAFFIC_POINT;
  const share = 1 / (1 + competitorCount * COMPETITOR_SHARE_WEIGHT);
  const centre = passers * share;

  return {
    low: Math.round(centre * (1 - VISITS_BAND)),
    high: Math.round(centre * (1 + VISITS_BAND)),
    centre: Math.round(centre),
  };
}

/** Broker quotes: survey input, flagged as such exactly like footfall. */
const RENT_IDR_PER_MONTH = Object.freeze({
  'cibubur-junction': { low: 18_000_000, high: 22_000_000 },
  'kramat-jati': { low: 12_000_000, high: 15_000_000 },
  'duren-sawit': { low: 10_000_000, high: 13_000_000 },
  'pondok-gede': { low: 14_000_000, high: 17_000_000 },
  'bekasi-utara': { low: 11_000_000, high: 14_000_000 },
});

export class CompareError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'CompareError';
    this.code = code;
  }
}

export async function compareSites({ tenantId, places, ids = null, weights = undefined } = {}) {
  const startedAt = Date.now();
  assertTenant(tenantId);

  // Score the whole pool so a comparison uses the same numbers the ranking did.
  const scouted = await scoutSites({
    tenantId,
    places,
    weights,
    limit: CANDIDATE_POOL.length,
  });
  const byId = new Map(scouted.data.recommended.map((candidate) => [candidate.id, candidate]));

  const [idA, idB] = ids ?? scouted.data.recommended.slice(0, 2).map((candidate) => candidate.id);
  const a = byId.get(idA);
  const b = byId.get(idB);

  if (!a || !b) {
    throw new CompareError('CANDIDATE_NOT_FOUND', 'Kandidat tidak ditemukan untuk dibandingkan');
  }
  if (a.id === b.id) {
    throw new CompareError('SAME_CANDIDATE', 'Pilih dua kandidat yang berbeda');
  }

  const rows = buildRows(a, b);

  return toolResult({
    data: {
      a: summarise(a, rows, 'a'),
      b: summarise(b, rows, 'b'),
      rows,
      // Named so the UI can footnote it rather than presenting a model as
      // a measurement.
      visitsModel: {
        perTrafficPoint: VISITS_PER_TRAFFIC_POINT,
        competitorWeight: COMPETITOR_SHARE_WEIGHT,
        band: VISITS_BAND,
      },
    },
    // Every place and branch the two candidates were measured against.
    sources: scouted.sources,
    startedAt,
  });
}

function buildRows(a, b) {
  const visitsA = estimateDailyVisits({ traffic: a.factors.traffic, competitorCount: a.competitorCount });
  const visitsB = estimateDailyVisits({ traffic: b.factors.traffic, competitorCount: b.competitorCount });
  const rentA = RENT_IDR_PER_MONTH[a.id] ?? null;
  const rentB = RENT_IDR_PER_MONTH[b.id] ?? null;

  return [
    row('Skor lokasi', a.total, b.total, 'higher', 'terukur', {
      a: String(a.total),
      b: String(b.total),
    }),
    row('Lalu lintas pejalan', a.factors.traffic, b.factors.traffic, 'higher', 'survei', {
      a: `${a.factors.traffic} · ${a.context}`,
      b: `${b.factors.traffic} · ${b.context}`,
    }),
    row(
      `Pesaing dalam ${a.radiusM} m`,
      a.competitorCount,
      b.competitorCount,
      'lower',
      'terukur',
      { a: `${a.competitorCount} minimarket`, b: `${b.competitorCount} minimarket` },
    ),
    row(
      'Cabang sendiri terdekat',
      a.nearestOwnKm,
      b.nearestOwnKm,
      'higher',
      'terukur',
      {
        a: `${km(a.nearestOwnKm)} km · ${riskLabel(a)}`,
        b: `${km(b.nearestOwnKm)} km · ${riskLabel(b)}`,
      },
    ),
    row('Estimasi kunjungan/hari', visitsA.centre, visitsB.centre, 'higher', 'model', {
      a: `${visitsA.low}–${visitsA.high}`,
      b: `${visitsB.low}–${visitsB.high}`,
    }),
    row(
      'Sewa pasaran',
      rentA ? rentA.low : null,
      rentB ? rentB.low : null,
      'lower',
      'survei',
      { a: rentText(rentA), b: rentText(rentB) },
    ),
  ];
}

function row(label, valueA, valueB, better, origin, display) {
  const comparable = typeof valueA === 'number' && typeof valueB === 'number' && valueA !== valueB;
  const favours = !comparable
    ? null
    : (better === 'higher') === valueA > valueB
      ? 'a'
      : 'b';

  return { label, origin, valueA, valueB, better, favours, display };
}

/** Indonesian decimal separator; 9.14 reads as nine-point-one-four elsewhere. */
function km(value) {
  return String(value).replace('.', ',');
}

function riskLabel(candidate) {
  if (candidate.cannibalFlagged) return 'risiko kanibalisasi';
  if (candidate.nearestOwnKm < 2) return 'risiko sedang';
  return 'aman';
}

function rentText(rent) {
  if (!rent) return 'tidak tersedia';
  return `Rp ${(rent.low / 1_000_000).toFixed(0)}–${(rent.high / 1_000_000).toFixed(0)} jt/bln`;
}

/**
 * The per-column conclusion, assembled from the rows that column won. A
 * comparison where both conclusions could be swapped without anyone noticing
 * is not a conclusion.
 */
function summarise(candidate, rows, side) {
  const won = rows.filter((entry) => entry.favours === side).map((entry) => entry.label);
  const lost = rows.filter((entry) => entry.favours && entry.favours !== side).map((entry) => entry.label);

  return {
    ...candidate,
    wins: won,
    losses: lost,
    conclusion: conclusionFor(candidate, won, lost),
  };
}

function conclusionFor(candidate, won, lost) {
  if (candidate.cannibalFlagged) {
    return (
      `Terlalu dekat dengan ${candidate.nearestOwn.name} (${km(candidate.nearestOwnKm)} km). ` +
      'Sebagian pendapatannya diambil dari cabang sendiri, jadi angka di atas melebih-lebihkan pertumbuhan.'
    );
  }

  const crowded = candidate.factors.competitors < 60;
  const busy = candidate.factors.traffic >= 90;

  if (busy && crowded) {
    return (
      'Volume lebih tinggi tapi perang harga hampir pasti. Pilih ini hanya jika siap bersaing harga.'
    );
  }
  if (!crowded && won.length >= lost.length) {
    return (
      'Pendapatan lebih stabil dan mudah diprediksi. Pilih ini jika target margin, bukan volume.'
    );
  }
  return (
    `Unggul pada ${won.join(', ') || 'tidak ada faktor'}; tertinggal pada ${lost.join(', ') || 'tidak ada'}. ` +
    'Keputusannya bergantung pada bobot yang Anda pakai di Admin.'
  );
}
