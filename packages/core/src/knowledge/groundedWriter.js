/**
 * Turns retrieved passages into prose, then refuses to trust the result until
 * it has checked it.
 *
 * Constitution I does not soften because a language model wrote the sentence.
 * Concatenating passages, which is what this replaces, was grounded by
 * construction: the words came from the document. Generated prose is not, so
 * the grounding has to be verified after the fact instead of assumed, and the
 * verification has to be mechanical — the same reason the supervisor checks
 * for an empty `sources` array rather than judging whether an answer sounds
 * right.
 *
 * If the check fails the caller gets the deterministic answer. A model that
 * cannot cite is not a better answer than passages that can.
 */

/** Markers a sentence may carry, given N citations: [1] … [N]. */
function markersIn(text) {
  return [...text.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1]));
}

/**
 * The rules an answer must satisfy before it is allowed to reach a reader.
 * Returned as a list so a failure can say which rule broke rather than only
 * that something did.
 */
export function checkGrounding(text, citations) {
  const used = markersIn(text);
  const valid = new Set(citations.map((_, index) => index + 1));

  return [
    {
      id: 'cites-something',
      label: 'Jawaban menyebut minimal satu sumber',
      passed: used.length > 0,
    },
    {
      id: 'markers-exist',
      label: 'Setiap penanda menunjuk sumber yang ada',
      // A model that invents "[4]" against three passages has invented a
      // source, which is the failure this whole layer exists to prevent.
      passed: used.every((marker) => valid.has(marker)),
    },
    {
      id: 'no-empty-answer',
      label: 'Jawaban tidak kosong',
      passed: text.trim().length > 0,
    },
  ];
}

export function isGroundedText(text, citations) {
  return checkGrounding(text, citations).every((check) => check.passed);
}

/**
 * The prompt. Everything the model is allowed to know is in it: no history, no
 * outside knowledge, no room to be helpful beyond the passages.
 */
export function buildAnswerPrompt({ question, citations }) {
  const sources = citations
    .map((citation, index) => `[${index + 1}] ${citation.title}, hal. ${citation.page}:\n${citation.text}`)
    .join('\n\n');

  return [
    'Anda menjawab pertanyaan staf cabang HANYA dari kutipan SOP di bawah.',
    '',
    'Aturan:',
    '- Jangan memakai pengetahuan di luar kutipan ini. Kalau kutipan tidak cukup,',
    '  jawab persis: "Tidak ada di dokumen."',
    '- Setiap kalimat yang membawa klaim harus diakhiri penanda sumbernya,',
    '  contoh: "Barang promo tidak bisa dikembalikan [1]."',
    '- Pakai hanya penanda yang tersedia di bawah. Jangan mengarang penanda baru.',
    '- Bahasa Indonesia, ringkas, maksimal tiga kalimat, nada tenang dan faktual.',
    '- Jangan menyapa, jangan meminta maaf, jangan menutup dengan basa-basi.',
    '',
    `Pertanyaan: ${question}`,
    '',
    'Kutipan:',
    sources,
  ].join('\n');
}

/**
 * Generates the answer and returns it only if it survives the check.
 * `{ text, checks, generated, step }` — `generated: false` means the caller
 * should use its deterministic text, and `checks` says why.
 */
export async function writeGroundedAnswer({
  gemini,
  question,
  citations,
  tier,
  fallbackText,
}) {
  if (!gemini || citations.length === 0) {
    return { text: fallbackText, generated: false, checks: [], reason: 'no-model', step: null };
  }

  let result;
  try {
    result = await gemini.generate({ prompt: buildAnswerPrompt({ question, citations }), tier });
  } catch (error) {
    // An unreachable or throttled model must degrade to the deterministic
    // answer, never to an outage the reader sees.
    return {
      text: fallbackText,
      generated: false,
      checks: [],
      reason: error?.code ?? 'GEMINI_FAILED',
      step: null,
    };
  }

  const step = {
    tool: 'gemini.generate',
    model: result.model,
    ms: result.ms,
    costIdr: result.costIdr,
    tokens: result.tokens,
  };

  // The model is allowed to refuse, and its refusal is honoured rather than
  // overridden with passages it just declined to use.
  if (/^tidak ada di dokumen\.?$/i.test(result.text.trim())) {
    return { text: result.text.trim(), generated: true, refused: true, checks: [], reason: 'model-refused', step };
  }

  const checks = checkGrounding(result.text, citations);
  if (!checks.every((check) => check.passed)) {
    return {
      text: fallbackText,
      generated: false,
      checks,
      reason: 'ungrounded',
      step,
    };
  }

  return { text: result.text, generated: true, checks, reason: null, step };
}
