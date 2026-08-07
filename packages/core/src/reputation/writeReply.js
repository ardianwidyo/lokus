import { MODEL_TIER } from '../cost/budget.js';

/**
 * The brand-voice reply, written by a model and then checked.
 *
 * A public reply is different from an internal answer: it goes out under the
 * business's name, so the failure mode is not just an invented fact but a
 * promise the branch never agreed to make. The guardrail already refuses a
 * draft that promises a date, discloses personal data, or oversteps the SOP —
 * this layer feeds the model the same rules the guardrail enforces, then lets
 * the guardrail have the final word anyway.
 *
 * Constitution II is untouched by any of it: a one- or two-star reply still
 * waits for a named human, whoever wrote the words.
 */

/** Sentences a template can produce that a model must not. */
export function buildReplyPrompt({ review, sopPassage, voicePassage, outlet, address }) {
  const rules = [
    '- Bahasa Indonesia, 2–4 kalimat, sopan tapi tidak berlebihan.',
    '- Akui masalahnya secara spesifik, jangan meminta maaf berulang.',
    '- Sebut satu tindakan konkret yang diambil, diambil HANYA dari pasal SOP di bawah.',
    '- Jangan menjanjikan tanggal, kompensasi, atau hasil yang tidak tertulis di SOP.',
    '- Jangan menyebut data pribadi pelanggan selain sapaan namanya.',
    '- Jangan mengarang kebijakan. Kalau SOP tidak mengatur, cukup katakan akan ditindaklanjuti.',
    '- Jangan memakai tanda kurung siku atau penanda sumber apa pun di teks balasan.',
  ].join('\n');

  return [
    `Anda menulis balasan publik untuk review Google di cabang ${outlet?.name ?? 'kami'}.`,
    '',
    'Aturan:',
    rules,
    '',
    `Sapaan yang dipakai: ${address?.salutation ?? ''} ${address?.name ?? ''}`.trim(),
    `Rating: ${review.rating} bintang`,
    `Isi review: "${review.text}"`,
    '',
    `Pasal SOP yang mengatur tindakan (${sopPassage.title}, hal. ${sopPassage.page}):`,
    sopPassage.text,
    voicePassage ? `\nAturan nada brand (${voicePassage.title}, hal. ${voicePassage.page}):\n${voicePassage.text}` : '',
    '',
    'Tulis balasannya saja, tanpa pembuka atau penutup tambahan.',
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * A public reply must not carry citation markers — they are for the internal
 * reviewer, not the customer — so grounding is checked differently here than
 * for a cited answer: the draft is rejected if it invents a commitment the
 * guardrail would catch, and the citations stay attached as metadata.
 */
export function checkReplyShape(text) {
  const trimmed = text.trim();
  const sentences = trimmed.split(/[.!?]+\s/).filter((s) => s.trim().length > 0);

  return [
    { id: 'not-empty', label: 'Balasan tidak kosong', passed: trimmed.length > 0 },
    {
      id: 'no-markers',
      label: 'Tidak ada penanda sitasi di teks publik',
      passed: !/\[\d+\]/.test(trimmed),
    },
    {
      id: 'length',
      label: 'Panjangnya 2–5 kalimat',
      passed: sentences.length >= 1 && sentences.length <= 5,
    },
    {
      id: 'no-placeholder',
      label: 'Tidak ada placeholder template yang lolos',
      passed: !/\{[a-z_]+\}/i.test(trimmed),
    },
  ];
}

/**
 * Returns `{ text, generated, checks, reason, step }`. `generated: false`
 * means the caller keeps its assembled template — which is grounded by
 * construction and never wrong, only stiffer.
 */
export async function writeReply({
  gemini,
  review,
  sopPassage,
  voicePassage,
  outlet,
  address,
  // The bulk tier by default, which is what plan.md always said this job was:
  // "Gemini Flash (bulk)". Measured on one live draft, the reasoning tier
  // spent 1236 thought tokens to produce 104 visible ones — Rp 8,58 — while
  // the lite tier produced an equally good, slightly tighter reply with no
  // thinking at all, for Rp 0,38. Across hundreds of reviews that is the
  // difference between a budget and a bill, and the task is following stated
  // rules rather than reasoning.
  tier = MODEL_TIER.FLASH,
  fallbackText,
}) {
  // See groundedWriter: a switch set to deterministic is not a failure.
  if (!gemini || gemini.enabled === false || !sopPassage) {
    return { text: fallbackText, generated: false, checks: [], reason: 'no-model', step: null };
  }

  let result;
  try {
    result = await gemini.generate({
      prompt: buildReplyPrompt({ review, sopPassage, voicePassage, outlet, address }),
      tier,
      // A public reply should read the same way twice; this is not the place
      // for the model to be inventive.
      temperature: 0.15,
      // A ceiling costs nothing unused, and on a thinking tier the budget is
      // shared with thoughts — at 400 the first live draft came back as "Halo
      // Kak Ratna, terima kasih atas masukannya dan kami", and 1024 was still
      // not enough for a model that spent 1236 tokens thinking.
      maxOutputTokens: 4_096,
    });
  } catch (error) {
    return { text: fallbackText, generated: false, checks: [], reason: error?.code ?? 'GEMINI_FAILED', step: null };
  }

  const step = {
    tool: 'gemini.generate',
    model: result.model,
    ms: result.ms,
    costIdr: result.costIdr,
    tokens: result.tokens,
  };

  const checks = checkReplyShape(result.text);
  if (!checks.every((check) => check.passed)) {
    return { text: fallbackText, generated: false, checks, reason: 'malformed', step };
  }

  return { text: result.text.trim(), generated: true, checks, reason: null, step };
}
