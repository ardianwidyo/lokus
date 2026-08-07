/**
 * One real model call, asserted end to end.
 *
 * The unit tests prove the adapter's behaviour against a fake `fetch`, and the
 * eval proves the golden set against the deterministic path. Neither proves the
 * thing a reader most doubts: that the reasoning layer is wired to a model that
 * answers. This does, once per run, through the same `createServices` the API
 * uses — so a broken credential, a retired model pin, or a regression in the
 * grounding check fails CI instead of failing a demo.
 *
 *   LOKUS_REASONING=apikey GEMINI_API_KEY=... node scripts/smoke-model.mjs
 *   LOKUS_REASONING=vertex GOOGLE_CLOUD_PROJECT=... node scripts/smoke-model.mjs
 *
 * Deliberately not part of `npm run eval`. The eval's thresholds have to be
 * reproducible and free; a live model is neither. Keeping them apart means a
 * rate limit degrades one job rather than invalidating the quality gates.
 */
import { createServices } from '../api/src/services/index.js';

const TENANT = 'nusa-retail';
const QUESTION = 'Apakah barang promo bisa dikembalikan?';

const services = createServices({
  evaluationReport: { generatedAt: null, cases: 0, gates: [] },
});

if (!services.gemini.enabled) {
  // Refuses rather than passing quietly. A smoke test that reports success
  // while running the deterministic path proves nothing at all, which is worse
  // than proving nothing loudly.
  console.error(
    `Jalur penalaran "${services.reasoning}" tidak memanggil model. ` +
      'Set LOKUS_REASONING=apikey (dengan GEMINI_API_KEY) atau =vertex.',
  );
  process.exit(1);
}

console.log(`jalur: ${services.reasoning}`);

const answer = await services.knowledge.ask(TENANT, QUESTION, { askedBy: 'ci-smoke' });
const step = answer.generationStep;

const checks = [
  ['model dipanggil', Boolean(step)],
  ['jawaban ditulis model, bukan disalin', answer.generated === true],
  ['pin model sesuai', step?.model?.startsWith('gemini-') === true],
  // The grounding rule this whole layer exists to enforce: prose the model
  // wrote is only allowed through if it still carries its sources.
  ['jawaban membawa sitasi', (answer.citations ?? []).length > 0],
  ['biaya tercatat', typeof step?.costIdr === 'number'],
  ['latensi tercatat', typeof step?.ms === 'number'],
];

for (const [label, passed] of checks) {
  console.log(`  ${passed ? 'LULUS' : 'GAGAL'}  ${label}`);
}

if (step) {
  console.log(
    `\n${step.model} · ${step.ms} ms · Rp ${step.costIdr} · ` +
      `${step.tokens.input} in / ${step.tokens.visible} visible / ${step.tokens.thoughts} thought`,
  );
}

if (!checks.every(([, passed]) => passed)) {
  console.error('\nSatu atau lebih pemeriksaan gagal.');
  process.exit(1);
}

console.log('\nModel menjawab dan jawabannya bersumber.');
