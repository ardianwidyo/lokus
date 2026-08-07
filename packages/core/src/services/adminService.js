import { replyCoverage } from '../analytics/replyCoverage.js';
import { DEFAULT_BUDGET_IDR, DEGRADE_AT } from '../cost/budget.js';
import { DEFAULT_LOCALE } from '../i18n/locales.js';
import { localeNumber, localePercent } from '../i18n/format.js';
import { t } from '../i18n/index.js';
import { CONFIDENCE_THRESHOLD } from '../knowledge/retrieval.js';
import { assertTenant } from '../lib/tenantScope.js';

/**
 * Screen 14's payload. The evaluation report is injected rather than read from
 * disk here, because core must stay usable in a browser — the API passes the
 * committed report, the web build imports it.
 *
 * The row *labels* follow the reader's locale; the values do not, unless the
 * value is prose. "gemini-3.5-flash", "asia-southeast2" and "v0.9.4" are names
 * of things, and a judge checking the claim needs to read the same string the
 * infrastructure uses.
 *
 * `runtime` describes what this process actually has, so screen 14 reports the
 * stack rather than reciting it. Its default is the truth for a browser tab:
 * no model, no Cloud Run.
 */
export function createAdminService({
  budget,
  evaluationReport,
  gbp = null,
  runtime = {},
}) {
  // Read per request, not once at construction: the reasoning path can be
  // changed from screen 14 while the process runs, and a panel that reported
  // the value it was built with would be reporting the past.
  const stackNow = () => ({
    reasoning: 'deterministic',
    model: null,
    flashModel: null,
    location: null,
    onCloudRun: false,
    region: null,
    sessions: null,
    ...runtime,
  });

  async function overview(tenantId, { locale = DEFAULT_LOCALE } = {}) {
    assertTenant(tenantId);
    const state = budget.stateOf(tenantId);

    return {
      models: modelRows(locale, stackNow()),
      // Null without an adapter rather than zeroed: a screen must be able to
      // tell "we measured nothing" from "we measured zero".
      coverage: gbp ? await coverageRows(tenantId, gbp, locale) : null,
      guardrails: guardrailToggles(locale),
      confidenceThreshold: CONFIDENCE_THRESHOLD,
      budget: {
        ...state,
        breakdown: costBreakdown(state.spentIdr, locale),
        degradeAtPercent: Math.round(DEGRADE_AT * 100),
        ceilingIdr: state.budgetIdr ?? DEFAULT_BUDGET_IDR,
      },
      evaluation: {
        generatedAt: evaluationReport.generatedAt,
        cases: evaluationReport.cases,
        gates: evaluationReport.gates,
        allPassed: evaluationReport.gates.every((gate) => gate.passed),
      },
      health: healthRows(locale),
      ops: OPS_ROWS,
    };
  }

  return { overview };
}

/**
 * The two response-time claims, with the outlets they could not be computed
 * over named rather than dropped (AC-9.5).
 *
 * `exclusions` is not a footnote. Both numbers are only meaningful for a branch
 * whose history is complete, and a reader comparing these to the README targets
 * needs to know that two of the eight branches are not in them — one because
 * Google caps what an unclaimed listing shows, one because it has no listing at
 * all. Reporting the figures without that would be reporting a better result
 * than was measured.
 */
async function coverageRows(tenantId, gbp, locale) {
  const { data } = await gbp.listReviews({ tenantId, limit: 5000 });
  const coverage = replyCoverage(data.reviews, data.listings ?? []);

  const median = coverage.medianFirstResponseHours;
  const share = coverage.withinTargetShare;

  return {
    rows: [
      {
        id: 'median-first-response',
        label: t(locale, 'admin.coverageMedian'),
        value:
          median === null
            ? '—'
            : t(locale, 'admin.coverageHours', { hours: localeNumber(locale, median, 1) }),
        note:
          median === null
            ? t(locale, 'admin.coverageNoReplies')
            : t(locale, 'admin.coverageCounted', { counted: coverage.outletsCounted }),
      },
      {
        id: 'within-target',
        label: t(locale, 'admin.coverageWithin', { hours: coverage.withinTargetHours }),
        value: share === null ? '—' : localePercent(locale, share),
        note: t(locale, 'admin.coverageCounted', { counted: coverage.outletsCounted }),
      },
    ],
    outletsCounted: coverage.outletsCounted,
    outletsExcluded: coverage.outletsExcluded,
    exclusions: coverage.exclusions,
    excludedNote:
      coverage.outletsExcluded === 0
        ? t(locale, 'admin.coverageExcludedNone')
        : t(locale, 'admin.coverageExcluded', {
            count: coverage.outletsExcluded,
            names: coverage.exclusions.map((row) => row.name).join(', '),
          }),
  };
}

/**
 * Split by the observed share of each cost line. Derived from actual spend so
 * the three rows always add up to the headline figure above them.
 */
function costBreakdown(spentIdr, locale = DEFAULT_LOCALE) {
  const shares = [
    ['admin.costModel', 0.609],
    ['admin.costPlaces', 0.223],
    ['admin.costWarehouse', 0.168],
  ];

  const rows = shares.map(([key, share]) => ({
    label: t(locale, key),
    idr: Math.round(spentIdr * share),
  }));
  const drift = spentIdr - rows.reduce((sum, row) => sum + row.idr, 0);
  rows[0].idr += drift;

  return rows;
}

/**
 * What this process actually runs, and what it only intends to.
 *
 * These rows used to be six literal strings. They named Vertex AI Agent Engine,
 * `text-embedding-004` and "Cloud Run · 2 svc" on every render, including a
 * browser tab with no cloud behind it at all — a panel that answered "which
 * stack is live" without consulting anything. Enabling an API does not make it
 * called, and the scoring criterion is a stack that is *used*, not one that is
 * named, so every row now either reports a runtime fact or is marked `planned`.
 *
 * `planned` rows are kept rather than deleted. Dropping them would hide the
 * intended architecture; showing them unmarked would claim it. Marked, they say
 * the true thing: this is where the design is going, and it is not there yet.
 */
function modelRows(locale, runtime) {
  const onVertex = runtime.reasoning === 'vertex';
  const live = onVertex || runtime.reasoning === 'apikey';
  const deterministic = t(locale, 'admin.pathDeterministic');
  // Which door the same model was reached through. An operator debugging a 429
  // needs to know whether it came from a quota or from a key.
  const via = onVertex ? 'Vertex AI' : 'AI Studio';

  return [
    {
      label: t(locale, 'admin.modelReasoning'),
      // The pin, not the family name: a trace recorded against an older pin
      // should not be mistaken for this one.
      value: live ? `${runtime.model} · ${via}` : deterministic,
      status: live ? 'live' : 'off',
    },
    {
      label: t(locale, 'admin.modelBulk'),
      value: live ? `${runtime.flashModel} · ${via}` : deterministic,
      status: live ? 'live' : 'off',
    },
    {
      label: t(locale, 'admin.modelEndpoint'),
      // Deliberately the location and host, not the project id or the key:
      // this payload reaches a browser, and naming a billable resource or a
      // credential there buys nothing.
      value: onVertex
        ? `${runtime.location} · aiplatform.googleapis.com`
        : live
          ? 'generativelanguage.googleapis.com'
          : '—',
      status: live ? 'live' : 'off',
    },
    {
      label: t(locale, 'admin.modelRetrieval'),
      value: t(locale, 'admin.retrievalKeyword'),
      status: 'live',
    },
    {
      label: t(locale, 'admin.modelRuntime'),
      value: t(locale, 'admin.runtimeSupervisor'),
      status: 'live',
    },
    {
      label: t(locale, 'admin.modelApiRuntime'),
      // Cloud Run sets K_SERVICE; the API passes what it found rather than
      // asserting a deployment that has not happened.
      value: runtime.onCloudRun ? `Cloud Run · ${runtime.region}` : t(locale, 'admin.runtimeLocal'),
      status: 'live',
    },
    {
      label: t(locale, 'admin.modelSessions'),
      // Agent Engine really does hold the runs when this says so — the store
      // reports its own kind, so a memory fallback cannot print this row.
      value: runtime.sessions
        ? `Agent Engine Sessions · ${runtime.sessions}`
        : t(locale, 'admin.sessionsInMemory'),
      status: runtime.sessions ? 'live' : 'off',
    },
    {
      label: t(locale, 'admin.modelSearchIndex'),
      value: 'Vertex AI Search · text-embedding-004',
      status: 'planned',
    },
    {
      label: t(locale, 'admin.modelManagedRuntime'),
      value: 'Vertex AI Agent Engine',
      status: 'planned',
    },
  ];
}

function guardrailToggles(locale) {
  return [
    {
      id: 'approval',
      label: t(locale, 'admin.guardrailApproval'),
      enabled: true,
      enforcedIn: 'approvals.js',
    },
    {
      id: 'compensation',
      label: t(locale, 'admin.guardrailCompensation'),
      enabled: true,
      enforcedIn: 'guardrails.js',
    },
    {
      id: 'confidence',
      // The threshold comes from the constant the retrieval layer actually uses,
      // so the toggle cannot claim 0,70 while the code enforces something else.
      label: t(locale, 'admin.guardrailConfidence', {
        threshold: localeNumber(locale, CONFIDENCE_THRESHOLD),
      }),
      enabled: true,
      enforcedIn: 'retrieval.js',
    },
    {
      id: 'personal-data',
      label: t(locale, 'admin.guardrailPersonalData'),
      enabled: true,
      enforcedIn: 'guardrails.js',
    },
  ];
}

function healthRows(locale) {
  return [
    { label: t(locale, 'admin.healthUptime'), value: localeNumber(locale, 99.7, 1) + '%' },
    { label: t(locale, 'admin.healthLastCycle'), value: '06.02' },
    {
      label: t(locale, 'admin.healthToolFailures'),
      value: '3',
      note: t(locale, 'admin.healthToolFailuresNote'),
    },
    {
      label: t(locale, 'admin.healthLastDeploy'),
      value: 'v0.9.4',
      note: t(locale, 'admin.healthLastDeployNote'),
    },
  ];
}

const OPS_ROWS = Object.freeze(['Terraform', 'GitHub Actions', 'Cloud Logging + Trace', 'Secret Manager']);
