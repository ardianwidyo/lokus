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

/** Distinct in-vocabulary query terms needed before any passage can score. */
export const MIN_ANSWERABLE_TERMS = 2;

/**
 * Words too common in Indonesian SOP prose to carry meaning, plus the
 * interrogative scaffolding of a spoken question ("apa kata SOP soal…").
 *
 * The question words matter: scores are normalised by the query's own weight,
 * so every filler token in a natural question dilutes the match and can push a
 * genuinely relevant passage below the refusal floor. Dropping them keeps the
 * 0.70 threshold a statement about relevance rather than about phrasing.
 */
const STOPWORDS = new Set([
  'yang', 'dan', 'di', 'ke', 'dari', 'untuk', 'pada', 'dengan', 'atau', 'itu',
  'ini', 'tidak', 'ada', 'akan', 'sudah', 'juga', 'bisa', 'dapat', 'saya',
  'kami', 'anda', 'apa', 'bagaimana', 'boleh', 'jika', 'bila', 'oleh', 'dalam',
  'sebagai', 'adalah', 'harus', 'wajib', 'nya', 'nya.', 'per', 'ya',
  'apakah', 'kenapa', 'mengapa', 'gimana', 'soal', 'tentang', 'mengenai',
  'kata', 'berapa', 'kapan', 'siapa', 'mana', 'kalau', 'saat', 'agar',
  'sedang', 'masih', 'lagi', 'saja', 'sih', 'dong', 'nih',
  // Conjunctions and comparatives. They occur in the corpus, so they are
  // "in vocabulary" and were being normalised against — diluting a correct
  // match exactly the way the question words did, only less visibly.
  'karena', 'lebih', 'paling', 'sangat', 'cukup', 'sekali', 'banget',
  'tapi', 'tetapi', 'namun', 'sehingga', 'supaya', 'seperti', 'hanya',
  'setiap', 'antara', 'sampai', 'serta', 'maupun', 'yaitu',
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

/**
 * A passage is searchable by its own text *and* its document title, the way an
 * indexed chunk carries its document metadata. Without it, "apa kata SOP soal
 * antrean" cannot match a clause that never says the word "SOP".
 */
function searchableText(passage) {
  return `${passage.title ?? ''} ${passage.text}`;
}

function buildIdf(passages) {
  const documentFrequency = new Map();

  for (const passage of passages) {
    for (const token of new Set(tokenise(searchableText(passage)).map(stem))) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
  }

  const total = passages.length;
  return {
    idf: (token) => Math.log((total + 1) / ((documentFrequency.get(token) ?? 0) + 1)) + 1,
    isKnown: (token) => documentFrequency.has(token),
  };
}

/**
 * The corpus to search, from an array, a provider, or the frozen seed.
 *
 * The provider form is what makes an ingested document reachable. An agent is
 * constructed once and answers many questions; handing it an array binds it to
 * the corpus as it stood at construction, so a document added afterwards is
 * invisible to it no matter how correctly it was indexed (AC-10.2). A function
 * is re-read per search, so the agent sees the corpus as it is now.
 */
function resolveCorpus(tenantId, passages) {
  if (typeof passages === 'function') return passages(tenantId) ?? [];
  return passages ?? retrievablePassages(tenantId);
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

  const corpus = resolveCorpus(tenantId, passages);
  if (corpus.length === 0) return { chunks: [], rejected: [], rejectedCount: 0 };

  const { idf, isKnown } = buildIdf(corpus);
  const queryTokens = [...new Set(tokenise(query).map(stem))];

  /**
   * Only terms the corpus actually contains are normalised against. A word
   * that appears in no passage cannot discriminate between passages, so
   * letting it into the denominator would punish every candidate equally and
   * push good matches below the refusal floor — the question's phrasing would
   * decide the verdict instead of its meaning.
   *
   * When *no* query term is known, the weight is zero, every score is zero,
   * and the search refuses. That is the honest outcome for a question the
   * corpus has no vocabulary for at all.
   */
  const answerable = queryTokens.filter(isKnown);
  const outOfVocabulary = queryTokens.filter((token) => !isKnown(token));

  /**
   * One shared word is not evidence. "Kenapa rating cabang Bekasi turun?" has
   * exactly one term the SOP corpus knows ("cabang"), and normalising against
   * that single term would score an unrelated clause a confident 1.00. The SOP
   * genuinely has nothing to say about ratings, and the honest answer is to
   * refuse rather than to cite the nearest paragraph.
   */
  const hasEnoughEvidence = answerable.length >= MIN_ANSWERABLE_TERMS;
  const queryWeight = hasEnoughEvidence
    ? answerable.reduce((sum, token) => sum + idf(token), 0)
    : 0;

  const scored = corpus
    .map((passage) => {
      const passageTokens = new Set(tokenise(searchableText(passage)).map(stem));
      const matched = answerable.filter((token) => passageTokens.has(token));
      const score = queryWeight === 0
        ? 0
        : matched.reduce((sum, token) => sum + idf(token), 0) / queryWeight;

      return { ...passage, score: Number(score.toFixed(4)), matchedTerms: matched };
    })
    .sort((a, b) => b.score - a.score);

  const chunks = scored.filter((entry) => entry.score >= threshold).slice(0, topK);
  const rejected = scored.filter((entry) => !chunks.includes(entry));

  // `outOfVocabulary` is what a knowledge-gap report is built from: the words a
  // question used that the corpus has never seen.
  return { chunks, rejected, rejectedCount: rejected.length, outOfVocabulary };
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
