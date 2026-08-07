import { KnowledgeGapLog, ragCite } from '../knowledge/cite.js';
import { gapReport } from '../knowledge/gapReport.js';
import { createSeededKnowledgeStore } from '../knowledge/ingest.js';
import { DEFAULT_LOCALE } from '../i18n/locales.js';
import { assertTenant } from '../lib/tenantScope.js';

/**
 * Knowledge for screens 11 and 12, composed once for both callers.
 *
 * The gap log is shared with the supervisor and the draft generator, so a
 * question refused in the chat and a reply the drafter could not ground show up
 * in the same report. Separate logs would each tell half the truth.
 */
/** A restricted document is stored for admins, not hidden from everyone. */
const RESTRICTED_READER_ROLES = new Set(['admin']);

export class KnowledgeAccessError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'KnowledgeAccessError';
    this.code = code;
  }
}

export function createKnowledgeService({ store = null, gapLog = null, gemini = null } = {}) {
  const kb = store ?? createSeededKnowledgeStore();
  const gaps = gapLog ?? new KnowledgeGapLog();

  /** Coverage measured by probing the corpus with the questions staff ask. */
  const COVERAGE_PROBES = [
    { theme: 'antrean-kasir', query: 'antrean kasir jam sibuk kasir tambahan' },
    { theme: 'kebersihan', query: 'kebersihan area belanja lantai kotor' },
    { theme: 'stok-kosong', query: 'ketersediaan barang rak utama restock' },
    { theme: 'parkir', query: 'fasilitas parkir penuh jam sibuk' },
    { theme: 'harga-vs-pesaing', query: 'perbedaan harga kompetitor promo resmi' },
    { theme: 'keramahan-staf', query: 'keluhan sikap staf coaching manajer' },
    { theme: 'refund', query: 'pengembalian barang promo struk kemasan' },
  ];

  async function coverage(tenantId) {
    assertTenant(tenantId);
    const passages = kb.retrievablePassages(tenantId);

    let answered = 0;
    for (const probe of COVERAGE_PROBES) {
      const result = await ragCite({ tenantId, question: probe.query, passages, topK: 1 });
      if (result.data.answered) answered += 1;
    }

    return { answered, probed: COVERAGE_PROBES.length, rate: answered / COVERAGE_PROBES.length };
  }

  async function overview(tenantId) {
    assertTenant(tenantId);

    const [stats, cover, report] = await Promise.all([
      Promise.resolve(kb.stats(tenantId)),
      coverage(tenantId),
      gapReport({ tenantId, gapLog: gaps }),
    ]);

    return {
      stats,
      coverage: cover,
      documents: kb.documentsFor(tenantId),
      gaps: report.data.gaps,
      totalUnanswered: report.data.totalQuestions,
      clausesAreDrafts: report.data.clausesAreDrafts,
    };
  }

  async function ask(tenantId, question, { askedBy = null, locale = DEFAULT_LOCALE } = {}) {
    assertTenant(tenantId);
    const passages = kb.retrievablePassages(tenantId);

    const result = await ragCite({
      tenantId,
      question,
      passages,
      gapLog: gaps,
      askedBy,
      gemini,
      locale,
    });
    return { ...result.data, question, askedBy };
  }

  async function ingest(tenantId, document) {
    assertTenant(tenantId);
    const { data } = await kb.ingest({ tenantId, ...document });
    return data;
  }

  /**
   * One document and the chunks indexed from it (AC-10.8).
   *
   * The restriction rule lives here rather than in either caller, because both
   * of them call this: the API route reads the role off the verified token, the
   * seeded console passes the role it holds for the tenant. Two copies would
   * drift, and the one that drifted would be the browser's — the demo path,
   * where nobody is checking.
   *
   * Refusal, not omission. Returning the document with an empty `chunks` array
   * would say the document is blank, which is a different and false statement
   * (AC-10.9).
   */
  async function document(tenantId, docId, { role = null } = {}) {
    assertTenant(tenantId);
    const detail = kb.documentDetail(tenantId, docId);
    if (!detail) return null;

    if (detail.restricted && !RESTRICTED_READER_ROLES.has(role)) {
      throw new KnowledgeAccessError(
        'ROLE_FORBIDDEN',
        `Dokumen ${detail.title} dibatasi ke peran Admin`,
      );
    }

    return detail;
  }

  return { overview, ask, ingest, document, gapLog: gaps, store: kb };
}
