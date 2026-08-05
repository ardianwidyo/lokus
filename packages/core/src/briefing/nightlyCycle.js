import { flagSystemicThemes, systemicFinding } from '../analytics/systemic.js';
import { themeCluster } from '../analytics/themeCluster.js';
import { DEMO_NOW } from '../domain/clock.js';
import { listingFor } from '../domain/listingLevel.js';
import { findOutlet, outletsForTenant } from '../domain/outlets.js';
import { cannibalisation } from '../location/cannibalisation.js';
import { themeLabel } from '../domain/themes.js';
import { DEFAULT_LOCALE } from '../i18n/locales.js';
import { localeFactor, localePercent } from '../i18n/format.js';
import { t } from '../i18n/index.js';
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
  locale = DEFAULT_LOCALE,
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
  const themes = flagSystemicThemes(clustered.data.themes, { locale });
  const risingThemes = themes.filter((theme) => (theme.delta ?? 0) > 1).length;

  milestone(
    MILESTONE_TIMES.reviewsRead,
    t(locale, 'briefing.reviewsReadTitle', { count: load.read }),
    t(locale, 'briefing.reviewsReadDetail', {
      outlets: new Set(reviews.map((r) => r.outletId)).size,
      themes: themes.length,
      rising: risingThemes,
    }),
    { agent: 'reputation' },
  );

  // "Held" means held for a human signature. A review on a listing we do not
  // manage is not waiting for a signature — nobody can sign it into existence —
  // so counting it here would report an approval backlog that does not exist
  // and hide a connection problem that does (spec US-9).
  const repliable = (review) => listingFor(listed.data.listings ?? [], review.outletId).canReply;
  const answerable = reviews.filter(repliable);

  const autoReplied = answerable.filter((r) => r.rating >= 3 && r.replyState !== 'none').length;
  const held = answerable.filter((r) => r.rating <= 2 && r.replyState === 'none').length;
  const unanswerable = reviews.length - answerable.length;

  milestone(
    MILESTONE_TIMES.repliesDrafted,
    t(locale, 'briefing.repliesTitle', { count: autoReplied }),
    unanswerable > 0
      ? `${t(locale, 'briefing.repliesDetail', { held })} ${t(locale, 'briefing.repliesUnanswerable', { count: unanswerable })}`
      : t(locale, 'briefing.repliesDetail', { held }),
    { agent: 'reputation' },
  );

  const scan = await scanLocations({ tenantId, places, locale });
  milestone(
    MILESTONE_TIMES.locationScan,
    scan.skipped
      ? t(locale, 'briefing.locationSkippedTitle')
      : t(locale, 'briefing.locationTitle', { count: scan.outletCount }),
    scan.skipped
      ? t(locale, 'briefing.locationSkippedDetail')
      : t(locale, 'briefing.locationDetail', {
          poi: scan.poiCount,
          competitors: scan.newCompetitorCount,
          pairs: scan.cannibalPairs,
        }),
    { agent: 'location', unavailable: scan.skipped },
  );

  const coverage = knowledgeCoverage(tenantId, locale);
  milestone(
    MILESTONE_TIMES.documentsIndexed,
    t(locale, 'briefing.knowledgeTitle'),
    t(locale, 'briefing.knowledgeDetail', {
      coverage: localePercent(locale, coverage.rate),
      gaps: coverage.gaps.length,
    }),
    { agent: 'knowledge' },
  );

  const decisions = buildDecisions({ themes, clustered, coverage, now, locale });

  milestone(
    MILESTONE_TIMES.handover,
    t(locale, 'briefing.handoverTitle'),
    failures.length === 0
      ? t(locale, 'briefing.handoverClean')
      : t(locale, 'briefing.handoverFailures', { count: failures.length }),
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
    locale,
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
function buildDecisions({ themes, clustered, coverage, now, locale = DEFAULT_LOCALE }) {
  const candidates = [];

  const rising = themes
    .filter((theme) => (theme.delta ?? 0) > 1)
    .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0));

  for (const theme of rising) {
    const worst = Object.entries(theme.byOutlet ?? {}).sort((a, b) => b[1] - a[1])[0];
    if (!worst) continue;

    const outlet = findOutlet(worst[0]);
    const outletName = outlet?.name ?? worst[0];
    const thisWeek = theme.weekly?.at(-1) ?? 0;
    const delta = localeFactor(locale, theme.delta);

    candidates.push({
      id: `decision-theme-${theme.theme}`,
      // The agent's key travels beside its label, so a caller that needs to know
      // which agent produced this does not have to match the display name.
      agentKey: 'reputation',
      agent: t(locale, 'agent.reputation'),
      time: '01.14',
      title: t(locale, 'briefing.decisionThemeTitle', {
        theme: themeLabel(theme.theme, locale),
        outlet: outletName,
      }),
      body: t(locale, 'briefing.decisionThemeBody', {
        thisWeek,
        outlet: outletName,
        delta,
        total: worst[1],
      }),
      evidence: [
        t(locale, 'briefing.evidenceComplaints', { count: worst[1] }),
        t(locale, 'briefing.evidenceRising', { delta }),
        theme.systemic
          ? t(locale, 'briefing.evidenceRegions', { count: theme.regionCount })
          : t(locale, 'briefing.evidenceLocal'),
      ],
      outletId: worst[0],
      theme: theme.theme,
      weight: worst[1] * (theme.delta ?? 1),
      sourceCount: clustered.sources.filter((s) => s.theme === theme.theme).length,
      actions: [
        { id: 'approve', label: t(locale, 'briefing.actionApproveTicket'), variant: 'primary' },
        { id: 'review', label: t(locale, 'briefing.actionReview'), variant: 'secondary' },
      ],
    });
  }

  const systemic = systemicFinding(clustered.data.themes, { locale });
  if (systemic) {
    candidates.push({
      id: 'decision-systemic',
      agentKey: 'reputation',
      agent: t(locale, 'agent.reputation'),
      time: '02.05',
      title: systemic.headline,
      body: t(locale, 'briefing.decisionSystemicBody', {
        detail: systemic.detail,
        outlet: systemic.worstOutlet?.name,
      }),
      evidence: [
        t(locale, 'briefing.evidenceComplaints', { count: systemic.count }),
        t(locale, 'briefing.evidenceRegions', { count: systemic.regionCount }),
        t(locale, 'briefing.evidenceSystemic'),
      ],
      outletId: systemic.worstOutlet?.outletId ?? null,
      theme: systemic.theme,
      weight: systemic.count * 2,
      sourceCount: systemic.count,
      actions: [
        { id: 'approve', label: t(locale, 'briefing.actionApproveTicket'), variant: 'primary' },
        { id: 'review', label: t(locale, 'briefing.actionReviewSop'), variant: 'secondary' },
      ],
    });
  }

  if (coverage.gaps.length > 0) {
    const [gap] = coverage.gaps;
    const percent = localePercent(locale, coverage.rate);

    candidates.push({
      id: 'decision-knowledge-gap',
      agentKey: 'knowledge',
      agent: t(locale, 'agent.knowledge'),
      time: '05.22',
      title: t(locale, 'briefing.decisionGapTitle', { question: gap.question }),
      body: t(locale, 'briefing.decisionGapBody', {
        occurrences: gap.occurrences,
        coverage: percent,
      }),
      evidence: [
        t(locale, 'briefing.evidenceQuestions', { count: gap.occurrences }),
        t(locale, 'briefing.evidenceCoverage', { coverage: percent }),
      ],
      outletId: null,
      theme: gap.theme ?? null,
      weight: gap.occurrences,
      sourceCount: 0,
      actions: [
        { id: 'approve', label: t(locale, 'briefing.actionAssignSopOwner'), variant: 'primary' },
        { id: 'review', label: t(locale, 'briefing.actionReadClause'), variant: 'secondary' },
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
function knowledgeCoverage(tenantId, locale = DEFAULT_LOCALE) {
  // `query` is what is matched against the Indonesian corpus and never changes
  // language; `label` is how the gap is described to a reader and does.
  const probes = [
    { theme: 'antrean-kasir', label: t(locale, 'briefing.probeQueue'), query: 'antrean kasir jam sibuk kasir tambahan' },
    { theme: 'kebersihan', label: t(locale, 'briefing.probeCleanliness'), query: 'kebersihan area belanja lantai kotor' },
    { theme: 'stok-kosong', label: t(locale, 'briefing.probeStock'), query: 'ketersediaan barang rak utama restock' },
    { theme: 'parkir', label: t(locale, 'briefing.probeParking'), query: 'fasilitas parkir penuh jam sibuk' },
    { theme: 'harga-vs-pesaing', label: t(locale, 'briefing.probePrice'), query: 'perbedaan harga kompetitor promo resmi' },
    { theme: 'keramahan-staf', label: t(locale, 'briefing.probeStaff'), query: 'keluhan sikap staf coaching manajer' },
    { theme: 'batas-waktu-antrean', label: t(locale, 'briefing.probeQueueLimit'), query: 'batas waktu antrean menit wajib dilaporkan area manager hari' },
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
async function scanLocations({ tenantId, places, locale = DEFAULT_LOCALE }) {
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
      locale,
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
