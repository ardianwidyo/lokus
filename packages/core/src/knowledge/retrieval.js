import { assertTenant } from '../lib/tenantScope.js';
import { retrievablePassages } from '../seed/documents.js';
import { toolResult } from '../lib/toolResult.js';

/**
 * Passage retrieval.
 *
 * Vertex AI Search does this in production with `text-embedding-004`; this is
 * the same contract over lexical scoring, so the console and the eval suite run
 * without a network call. Both return {docId, page, score, text} and both
 * obey the same confidence floor.
 *
 * Scoring is IDF-weighted token overlap normalised to 0..1. The absolute value
 * matters because the refusal threshold is defined on it (AC-4.1): below 0.70
 * the agent says "tidak ada di dokumen" rather than guessing.
 */
export const CONFIDENCE_THRESHOLD = 0.7;

/** Words too common in Indonesian SOP prose to carry meaning. */
const STOPWORDS = new Set([
  'yang', 'dan', 'di', 'ke', 'dari', 'untuk', 'pada', 'dengan', 'atau', 'itu',
  'ini', 'tidak', 'ada', 'akan', 'sudah', 'juga', 'bisa', 'dapat', 'saya',
  'kami', 'anda', 'apa', 'bagaimana', 'boleh', 'jika', 'bila', 'oleh', 'dalam',
  'sebagai', 'adalah', 'harus', 'wajib', 'nya', 'nya.', 'per', 'ya',
]);

export function tokenise(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

/** Indonesian affixes, stripped crudely so "antrean"/"antre" match. */
function stem(token) {
  return token
    .replace(/(nya|kah|lah|pun)$/u, '')
    .replace(/^(mem|men|meng|meny|me|di|ter|ber|per|ke)/u, '')
    .replace(/(kan|an|i)$/u, '');
}

function buildIdf(passages) {
  const documentFrequency = new Map();

  for (const passage of passages) {
    for (const token of new Set(tokenise(passage.text).map(stem))) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
  }

  const total = passages.length;
  return (token) => Math.log((total + 1) / ((documentFrequency.get(token) ?? 0) + 1)) + 1;
}

/**
 * Scores every passage against the query and returns them ranked.
 * `rejectedCount` is the number considered but left below the threshold —
 * AC-4.3 puts that number on screen so the reader knows what was discarded.
 */
export function searchPassages({
  tenantId,
  query,
  topK = 4,
  passages = null,
  threshold = CONFIDENCE_THRESHOLD,
}) {
  assertTenant(tenantId);

  const corpus = passages ?? retrievablePassages(tenantId);
  if (corpus.length === 0) return { chunks: [], rejected: [], rejectedCount: 0 };

  const idf = buildIdf(corpus);
  const queryTokens = [...new Set(tokenise(query).map(stem))];
  const queryWeight = queryTokens.reduce((sum, token) => sum + idf(token), 0);

  const scored = corpus
    .map((passage) => {
      const passageTokens = new Set(tokenise(passage.text).map(stem));
      const matched = queryTokens.filter((token) => passageTokens.has(token));
      const score = queryWeight === 0
        ? 0
        : matched.reduce((sum, token) => sum + idf(token), 0) / queryWeight;

      return { ...passage, score: Number(score.toFixed(4)), matchedTerms: matched };
    })
    .sort((a, b) => b.score - a.score);

  const chunks = scored.filter((entry) => entry.score >= threshold).slice(0, topK);
  const rejected = scored.filter((entry) => !chunks.includes(entry));

  return { chunks, rejected, rejectedCount: rejected.length };
}

/** `rag.search` in the tool contract. */
export async function ragSearch({ tenantId, query, topK = 4, passages = null } = {}) {
  const startedAt = Date.now();
  const { chunks, rejectedCount } = searchPassages({ tenantId, query, topK, passages });

  return toolResult({
    data: {
      chunks: chunks.map(({ docId, page, score, text, title }) => ({ docId, page, score, text, title })),
      rejectedCount,
    },
    sources: chunks.map((chunk) => ({
      type: 'document',
      docId: chunk.docId,
      page: chunk.page,
      score: chunk.score,
      title: chunk.title,
      quote: firstSentence(chunk.text),
    })),
    startedAt,
  });
}

export function firstSentence(text, maxLength = 180) {
  const sentence = String(text).split(/(?<=\.)\s/)[0];
  return sentence.length > maxLength ? `${sentence.slice(0, maxLength - 1)}…` : sentence;
}
