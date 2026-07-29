import { findOutlet } from '../domain/outlets.js';
import { assertTenant } from '../lib/tenantScope.js';
import { guardrailCheck } from '../reputation/guardrails.js';
import { route } from './intent.js';

/**
 * The supervisor: route, delegate in parallel, merge, refuse when nothing is
 * sourced, and persist the trace.
 *
 * AC-7.1 is the routing and the merge. Constitution I is the refusal: the
 * supervisor never inspects whether an answer *sounds* right, it checks whether
 * the merged sources array is empty. A claim nobody can trace does not get
 * emitted, regardless of how plausible the findings read.
 *
 * AC-7.2 is the trace — step number, tool, result size, latency — recorded for
 * every step including the ones that returned nothing.
 */

/** Rough cost model in rupiah, so screen 10 can show a per-answer figure. */
const COST_PER_STEP_IDR = 42;
const COST_PER_SOURCE_IDR = 1.2;

export function estimateCostIdr({ stepCount, sourceCount }) {
  return Math.round(stepCount * COST_PER_STEP_IDR + sourceCount * COST_PER_SOURCE_IDR);
}

export function createSupervisor({ agents = {}, gapLog = null, now = () => new Date(), idFactory = null } = {}) {
  let counter = 0;
  const nextId = idFactory ?? (() => `run-${(counter += 1)}`);

  async function ask({ tenantId, question, context = {} }) {
    assertTenant(tenantId);
    const startedAt = Date.now();

    const plan = route({ question, context });
    const steps = [
      {
        n: 1,
        tool: 'supervisor.route',
        resultSize: plan.agents.length,
        ms: 0,
        note: `intent ${plan.intent} → ${plan.agents.join(', ')}`,
      },
    ];

    // Parallel delegation: the agents do not depend on one another, and a
    // question that needs three of them should not cost three round trips.
    const selected = plan.agents.map((name) => agents[name]).filter(Boolean);
    const results = await Promise.all(
      selected.map((agent) =>
        agent.run({
          tenantId,
          question,
          outletId: plan.outletId ?? context.outletId ?? null,
          startStep: 1,
        }),
      ),
    );

    // Renumber after the fact: the agents ran concurrently, so their own step
    // numbers overlap. The trace shows one honest sequence.
    let n = steps.length;
    for (const result of results) {
      for (const agentStep of result.steps) {
        steps.push({ ...agentStep, n: (n += 1), agent: result.agent });
      }
    }

    const findings = results.flatMap((result) => result.findings);
    const sources = results.flatMap((result) => result.sources);
    const unavailable = results.filter((result) => result.unavailable);
    const rejectedCount = results.reduce((sum, result) => sum + (result.rejectedCount ?? 0), 0);

    const refused = sources.length === 0;

    // Constitution I says a refusal logs a knowledge gap. Refusing without
    // recording it means the corpus never improves and nobody knows what it
    // is failing to answer.
    const knowledgeGap = refused
      ? (gapLog?.record({
          tenantId,
          question,
          askedBy: context.askedBy ?? null,
          at: now(),
        }) ?? null)
      : null;
    const answer = refused
      ? buildRefusal(plan, unavailable)
      : buildAnswer({ plan, findings, unavailable });

    const guardrail = guardrailCheck({
      draftText: answer,
      citations: sources
        .filter((source) => source.type === 'document')
        .map((source) => ({ docId: source.docId, page: source.page, score: source.score })),
    });
    steps.push({
      n: steps.length + 1,
      tool: 'guardrail.check',
      resultSize: guardrail.data.checks.length,
      ms: guardrail.latencyMs,
      note: guardrail.data.summary,
    });

    const latencyMs = Date.now() - startedAt;

    return {
      id: nextId(),
      tenantId,
      question,
      intent: plan.intent,
      agents: plan.agents,
      outletId: plan.outletId,
      answer,
      refused,
      knowledgeGap,
      findings,
      sources,
      sourceSummary: summariseSources(sources),
      unavailable: unavailable.map((result) => ({ agent: result.agent, reason: result.reason })),
      rejectedCount,
      guardrail: guardrail.data,
      steps,
      latencyMs,
      costIdr: estimateCostIdr({ stepCount: steps.length, sourceCount: sources.length }),
      startedAt: new Date(now().getTime() - latencyMs).toISOString(),
      finishedAt: now().toISOString(),
    };
  }

  return { ask, route };
}

function buildAnswer({ plan, findings, unavailable }) {
  const outlet = plan.outletId ? findOutlet(plan.outletId) : null;
  const lead = outlet
    ? `Untuk ${outlet.name}, ini yang ditemukan agen:`
    : 'Ini yang ditemukan agen di seluruh jaringan:';

  const body = findings.map((finding) => finding.text);

  const caveats = unavailable.map(
    (result) => `Catatan: ${result.reason} Jawaban ini belum memasukkan sudut pandang tersebut.`,
  );

  return [lead, ...body, ...caveats].join('\n\n');
}

function buildRefusal(plan, unavailable) {
  const missing = unavailable.map((result) => result.reason).join(' ');

  return [
    'Tidak ada di dokumen.',
    'Agen tidak menemukan satu pun sumber yang bisa menopang jawaban untuk pertanyaan ini, ' +
      'jadi tidak ada jawaban yang diberikan. Pertanyaan ini dicatat sebagai celah pengetahuan.',
    missing,
  ]
    .filter(Boolean)
    .join('\n\n');
}

/** The source tags shown under the answer: "18 review · SOP v4 hal. 12". */
function summariseSources(sources) {
  const reviews = sources.filter((source) => source.type === 'review');
  const documents = sources.filter((source) => source.type === 'document');

  const tags = [];
  if (reviews.length > 0) tags.push(`${reviews.length} review`);

  const seen = new Set();
  for (const doc of documents) {
    const label = `${doc.title ?? doc.docId} hal. ${doc.page}`;
    if (!seen.has(label)) {
      seen.add(label);
      tags.push(label);
    }
  }

  return tags;
}
