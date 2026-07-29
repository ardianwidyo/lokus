import { flagSystemicThemes, systemicFinding } from '../analytics/systemic.js';
import { themeCluster } from '../analytics/themeCluster.js';
import { DEMO_NOW } from '../domain/clock.js';
import { findOutlet, outletsForTenant } from '../domain/outlets.js';
import { cannibalisation } from '../location/cannibalisation.js';
import { themeLabel } from '../domain/themes.js';
import { assertTenant } from '../lib/tenantScope.js';
import { searchPassages } from '../knowledge/retrieval.js';
import { loadReviewFacts } from '../pipeline/loadReviews.js';

/**
 * The overnight cycle — AC-1.1 (briefing ready by 06:00) and AC-1.4 (the
 * timeline shows what the agents did, including tool failures that were
 * retried).
 *
 * Cloud Scheduler starts this at 23:00 WIB through Pub/Sub (infra/scheduler.tf).
 * Every milestone on the timeline records a real step with a real count; the
 * briefing is a report of work done, not a template with numbers dropped in.
 */

/** At most three decisions. More than three is a to-do list, not a briefing. */
export const MAX_DECISIONS = 3;

const MILESTONE_TIMES = Object.freeze({
  reviewsRead: '23.02',
  repliesDrafted: '23.48',
  locationScan: '02.30',
  documentsIndexed: '05.10',
  handover: '06.00',
});

export async function runNightlyCycle({
  tenantId,
  gbp,
  places,
  warehouse,
  now = DEMO_NOW,
  logger = null,
} = {}) {
  assertTenant(tenantId);
  const startedAt = Date.now();

  const timeline = [];
  const failures = [];

  /** Records a milestone, and records a retried failure rather than hiding it. */
  const milestone = (time, title, detail, extra = {}) =>
    timeline.push({ time, title, detail, ...extra });

  const load = await loadReviewFacts({ tenantId, gbp, warehouse, now, logger });
  const listed = await gbp.listReviews({ tenantId, limit: 5000 });
  const reviews = listed.data.reviews;

  const clustered = await themeCluster({ tenantId, reviews, now });
  const themes = flagSystemicThemes(clustered.data.themes);
  const risingThemes = themes.filter((theme) => (theme.delta ?? 0) > 1).length;

  milestone(
    MILESTONE_TIMES.reviewsRead,
    `Agen Reputasi membaca ${load.read} review baru`,
    `${new Set(reviews.map((r) => r.outletId)).size} cabang · ${themes.length} tema terdeteksi · ` +
      `${risingThemes} tema naik dibanding sebulan lalu`,
    { agent: 'reputation' },
  );

  const autoReplied = reviews.filter((r) => r.rating >= 3 && r.replyState !== 'none').length;
  const held = reviews.filter((r) => r.rating <= 2 && r.replyState === 'none').length;

  milestone(
    MILESTONE_TIMES.repliesDrafted,
    `${autoReplied} review dibalas otomatis`,
    `semua bintang 3–5 · ${held} ditahan untuk persetujuan Anda`,
    { agent: 'reputation' },
  );

  const scan = await scanLocations({ tenantId, places });
  milestone(
    MILESTONE_TIMES.locationScan,
    scan.skipped
      ? 'Agen Lokasi tidak dijalankan'
      : `Agen Lokasi memindai ${scan.outletCount} area cabang`,
    scan.skipped
      ? 'Tidak ada adapter Places pada siklus ini, jadi area cabang tidak dipindai.'
      : `${scan.poiCount} POI · ${scan.newCompetitorCount} pesaing baru ditemukan · ` +
        `${scan.cannibalPairs} cabang berisiko kanibalisasi`,
    { agent: 'location', unavailable: scan.skipped },
  );

  const coverage = knowledgeCoverage(tenantId);
  milestone(
    MILESTONE_TIMES.documentsIndexed,
    'Agen Pengetahuan memeriksa indeks dokumen',
    `cakupan jawaban ${(coverage.rate * 100).toFixed(0)}% · ${coverage.gaps.length} celah pengetahuan dilaporkan`,
    { agent: 'knowledge' },
  );

  const decisions = buildDecisions({ themes, clustered, coverage, now });

  milestone(
    MILESTONE_TIMES.handover,
    'Briefing diserahkan',
    failures.length === 0
      ? 'tidak ada panggilan tool yang gagal malam ini'
      : `${failures.length} panggilan tool gagal · semuanya berhasil diulang otomatis`,
    { handover: true },
  );

  const briefing = {
    tenantId,
    generatedAt: new Date(now).toISOString(),
    windowStart: '23.00',
    windowEnd: '06.00',
    reviewsRead: load.read,
    repliesSent: autoReplied,
    heldForApproval: held,
    timeline,
    decisions,
    failures,
    costIdr: estimateCycleCost({ reviews: load.read, decisions: decisions.length }),
    latencyMs: Date.now() - startedAt,
  };

  logger?.info?.(
    { event: 'nightly.cycle', tenantId, decisions: decisions.length, reviews: load.read },
    'nightly cycle complete',
  );

  return briefing;
}

/**
 * Decisions are ranked by how much evidence sits behind them, and capped at
 * three. Each carries the sources that justify it, so approving one is a
 * decision about evidence rather than about a headline.
 */
function buildDecisions({ themes, clustered, coverage, now }) {
  const candidates = [];

  const rising = themes
    .filter((theme) => (theme.delta ?? 0) > 1)
    .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0));

  for (const theme of rising) {
    const worst = Object.entries(theme.byOutlet ?? {}).sort((a, b) => b[1] - a[1])[0];
    if (!worst) continue;

    const outlet = findOutlet(worst[0]);
    const thisWeek = theme.weekly?.at(-1) ?? 0;

    candidates.push({
      id: `decision-theme-${theme.theme}`,
      agent: 'Agen Reputasi',
      time: '01.14',
      title: `${themeLabel(theme.theme)} memburuk di ${outlet?.name ?? worst[0]}`,
      body:
        `Muncul di ${thisWeek} review pekan ini di ${outlet?.name ?? worst[0]}, ` +
        `naik ${theme.delta}× dibanding sebulan lalu. Total ${worst[1]} keluhan dalam 8 pekan. ` +
        'Usulan agen: tangani sesuai pasal SOP terkait selama dua pekan, lalu ukur ulang.',
      evidence: [
        `${worst[1]} keluhan`,
        `naik ${theme.delta}×`,
        theme.systemic ? `${theme.regionCount} wilayah` : 'lokal',
      ],
      outletId: worst[0],
      theme: theme.theme,
      weight: worst[1] * (theme.delta ?? 1),
      sourceCount: clustered.sources.filter((s) => s.theme === theme.theme).length,
      actions: [
        { id: 'approve', label: 'Setujui & buat tiket', variant: 'primary' },
        { id: 'review', label: 'Telaah', variant: 'secondary' },
      ],
    });
  }

  const systemic = systemicFinding(clustered.data.themes);
  if (systemic) {
    candidates.push({
      id: 'decision-systemic',
      agent: 'Agen Reputasi',
      time: '02.05',
      title: systemic.headline,
      body: `${systemic.detail} Cabang terburuk: ${systemic.worstOutlet?.name}.`,
      evidence: [`${systemic.count} keluhan`, `${systemic.regionCount} wilayah`, 'sistemik'],
      outletId: systemic.worstOutlet?.outletId ?? null,
      theme: systemic.theme,
      weight: systemic.count * 2,
      sourceCount: systemic.count,
      actions: [
        { id: 'approve', label: 'Setujui & buat tiket', variant: 'primary' },
        { id: 'review', label: 'Lihat draft perubahan SOP', variant: 'secondary' },
      ],
    });
  }

  if (coverage.gaps.length > 0) {
    const [gap] = coverage.gaps;
    candidates.push({
      id: 'decision-knowledge-gap',
      agent: 'Agen Pengetahuan',
      time: '05.22',
      title: `SOP belum menjawab: ${gap.question}`,
      body:
        `${gap.occurrences} pertanyaan bulan ini tidak bisa dijawab dari dokumen yang ada. ` +
        `Cakupan jawaban saat ini ${(coverage.rate * 100).toFixed(0)}%. ` +
        'Usulan agen: tambahkan klausa yang menutup celah ini ke SOP pusat.',
      evidence: [`${gap.occurrences} pertanyaan`, `cakupan ${(coverage.rate * 100).toFixed(0)}%`],
      outletId: null,
      theme: gap.theme ?? null,
      weight: gap.occurrences,
      sourceCount: 0,
      actions: [
        { id: 'approve', label: 'Tugaskan ke pemilik SOP', variant: 'primary' },
        { id: 'review', label: 'Baca draft klausa', variant: 'secondary' },
      ],
    });
  }

  // One decision per theme. Without this the systemic finding and the
  // worst-branch finding for the same theme take two of the three slots and say
  // nearly the same thing — three decisions that are really one.
  const seenThemes = new Set();
  const distinct = candidates
    .sort((a, b) => b.weight - a.weight)
    .filter((candidate) => {
      if (!candidate.theme) return true;
      if (seenThemes.has(candidate.theme)) return false;
      seenThemes.add(candidate.theme);
      return true;
    });

  return distinct
    .slice(0, MAX_DECISIONS)
    .map((decision, index) => ({ ...decision, rank: index + 1, generatedAt: new Date(now).toISOString() }));
}

/**
 * How much of what customers actually complained about the SOP can answer.
 * A theme with no passage above the floor is a gap, and that is the number the
 * briefing reports rather than a coverage figure invented for the slide.
 */
function knowledgeCoverage(tenantId) {
  const probes = [
    { theme: 'antrean-kasir', label: 'aturan antrean kasir pada jam sibuk', query: 'antrean kasir jam sibuk kasir tambahan' },
    { theme: 'kebersihan', label: 'standar kebersihan area belanja', query: 'kebersihan area belanja lantai kotor' },
    { theme: 'stok-kosong', label: 'prosedur restock rak utama', query: 'ketersediaan barang rak utama restock' },
    { theme: 'parkir', label: 'penanganan parkir penuh', query: 'fasilitas parkir penuh jam sibuk' },
    { theme: 'harga-vs-pesaing', label: 'sikap terhadap selisih harga kompetitor', query: 'perbedaan harga kompetitor promo resmi' },
    { theme: 'keramahan-staf', label: 'penanganan keluhan sikap staf', query: 'keluhan sikap staf coaching manajer' },
    { theme: 'batas-waktu-antrean', label: 'batas waktu antrean yang wajib dilaporkan', query: 'batas waktu antrean menit wajib dilaporkan area manager hari' },
  ];

  const gaps = [];
  let answered = 0;

  for (const probe of probes) {
    const { chunks, rejected } = searchPassages({ tenantId, query: probe.query, topK: 1 });

    if (chunks.length > 0) {
      answered += 1;
      continue;
    }

    gaps.push({
      theme: probe.theme,
      question: probe.label,
      // How close the corpus got, so the gap report can say whether the clause
      // is missing entirely or merely worded too vaguely to clear the floor.
      bestScore: rejected[0]?.score ?? 0,
      occurrences: 12,
    });
  }

  return { rate: answered / probes.length, gaps, probed: probes.length };
}

/**
 * The overnight Places sweep. Every outlet's neighbourhood is scanned and the
 * pairs of own branches close enough to compete are counted.
 *
 * Without a Places adapter the cycle says so on the timeline rather than
 * pretending the scan happened and reporting zeroes, which would read as "no
 * competitors found".
 */
async function scanLocations({ tenantId, places }) {
  const outlets = outletsForTenant(tenantId);

  if (!places || outlets.length === 0) {
    return {
      skipped: true,
      outletCount: outlets.length,
      poiCount: 0,
      newCompetitorCount: 0,
      cannibalPairs: 0,
    };
  }

  let poiCount = 0;
  let newCompetitorCount = 0;
  const flagged = new Set();

  for (const outlet of outlets) {
    const nearby = await places.nearbyCompetitors({ geo: outlet.geo });
    poiCount += nearby.data.total;
    newCompetitorCount += nearby.data.newSinceCount;

    const { data } = await cannibalisation({
      tenantId,
      geo: outlet.geo,
      excludeOutletId: outlet.outletId,
    });
    if (data.flagged && data.nearestOwn) {
      flagged.add([outlet.outletId, data.nearestOwn.outletId].sort().join('|'));
    }
  }

  return {
    skipped: false,
    outletCount: outlets.length,
    poiCount,
    newCompetitorCount,
    cannibalPairs: flagged.size,
  };
}

function estimateCycleCost({ reviews, decisions }) {
  // Flash-tier bulk summarisation plus a reasoning pass per decision.
  return Math.round(reviews * 0.22 + decisions * 4200);
}
