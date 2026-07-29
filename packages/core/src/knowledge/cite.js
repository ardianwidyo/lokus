import { assertTenant, scopeToTenant } from '../lib/tenantScope.js';
import { toolResult } from '../lib/toolResult.js';
import { CONFIDENCE_THRESHOLD, firstSentence, searchPassages } from './retrieval.js';

/**
 * `rag.cite` — an answer whose every claim carries a marker back to a page.
 *
 * AC-4.2: each cited passage is clickable to the source page.
 * AC-4.3: the number of chunks considered but rejected is shown.
 * AC-4.1: below the confidence floor the answer is "tidak ada di dokumen" and
 *         a knowledge gap is logged instead of a guess.
 *
 * The answer is composed from the retrieved passages rather than written and
 * then matched to them. That ordering is the whole guarantee: a sentence
 * cannot appear unless a passage produced it, so there is no path by which an
 * uncited claim reaches the reader.
 */

export const REFUSAL_TEXT = 'Tidak ada di dokumen.';

export class KnowledgeGapLog {
  constructor() {
    this.entries = [];
  }

  /**
   * Repeated questions are counted, not duplicated — the gap report ranks by
   * how often staff hit the same wall, and duplicates would flatten that.
   */
  record({ tenantId, question, askedBy = null, bestScore = 0, outOfVocabulary = [], at = new Date() }) {
    assertTenant(tenantId);
    const key = normalise(question);

    const existing = this.entries.find(
      (entry) => entry.tenantId === tenantId && entry.key === key,
    );

    if (existing) {
      existing.occurrences += 1;
      existing.lastAskedAt = at.toISOString();
      if (askedBy && !existing.askedBy.includes(askedBy)) existing.askedBy.push(askedBy);
      return existing;
    }

    const entry = {
      id: `gap-${this.entries.length + 1}`,
      tenantId,
      key,
      question: String(question).trim(),
      occurrences: 1,
      askedBy: askedBy ? [askedBy] : [],
      bestScore,
      outOfVocabulary,
      firstAskedAt: at.toISOString(),
      lastAskedAt: at.toISOString(),
    };
    this.entries.push(entry);
    return entry;
  }

  list(tenantId) {
    assertTenant(tenantId);
    return scopeToTenant(tenantId, this.entries)
      .map((entry) => ({ ...entry }))
      .sort((a, b) => b.occurrences - a.occurrences);
  }
}

function normalise(question) {
  return String(question ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Answers a question from the corpus.
 *
 * `askedBy` is recorded on a gap so the report can say who kept hitting it,
 * which is what turns "37 unanswered questions" into a specific person to talk
 * to.
 */
export async function ragCite({
  tenantId,
  question,
  passages = null,
  topK = 3,
  threshold = CONFIDENCE_THRESHOLD,
  gapLog = null,
  askedBy = null,
  now = () => new Date(),
} = {}) {
  const startedAt = Date.now();
  assertTenant(tenantId);

  const { chunks, rejected, rejectedCount, outOfVocabulary } = searchPassages({
    tenantId,
    query: question,
    topK,
    passages,
    threshold,
  });

  // AC-4.1: nothing above the floor means no answer, not a hedged one.
  if (chunks.length === 0) {
    const gap = gapLog?.record({
      tenantId,
      question,
      askedBy,
      bestScore: rejected[0]?.score ?? 0,
      outOfVocabulary,
      at: now(),
    });

    return toolResult({
      data: {
        answered: false,
        text: REFUSAL_TEXT,
        reason:
          `Tidak ada kutipan yang mencapai ambang keyakinan ${threshold}. ` +
          `Kutipan terdekat hanya ${(rejected[0]?.score ?? 0).toFixed(2)}.`,
        citations: [],
        confidence: rejected[0]?.score ?? 0,
        rejectedCount,
        threshold,
        knowledgeGap: gap ?? null,
      },
      // Empty on purpose: the supervisor must not be able to build a claim on
      // a refusal.
      sources: [],
      startedAt,
    });
  }

  const citations = chunks.map((chunk, index) => ({
    marker: `[${index + 1}]`,
    docId: chunk.docId,
    title: chunk.title,
    page: chunk.page,
    score: chunk.score,
    quote: firstSentence(chunk.text),
    text: chunk.text,
  }));

  const paragraphs = citations.map((citation) => `${citation.text} ${citation.marker}`);
  const confidence = Number(
    (citations.reduce((sum, c) => sum + c.score, 0) / citations.length).toFixed(4),
  );

  return toolResult({
    data: {
      answered: true,
      text: paragraphs.join('\n\n'),
      paragraphs,
      citations,
      confidence,
      confidenceLabel: confidence >= 0.85 ? 'keyakinan tinggi' : 'keyakinan sedang',
      rejectedCount,
      threshold,
      knowledgeGap: null,
    },
    sources: citations.map((citation) => ({
      type: 'document',
      docId: citation.docId,
      title: citation.title,
      page: citation.page,
      score: citation.score,
      quote: citation.quote,
      marker: citation.marker,
    })),
    startedAt,
  });
}
