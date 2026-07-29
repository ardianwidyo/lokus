import { KnowledgeGapLog, ragCite } from '../knowledge/cite.js';
import { gapReport } from '../knowledge/gapReport.js';
import { createSeededKnowledgeStore } from '../knowledge/ingest.js';
import { assertTenant } from '../lib/tenantScope.js';

/**
 * Knowledge for screens 11 and 12, composed once for both callers.
 *
 * The gap log is shared with the supervisor and the draft generator, so a
 * question refused in the chat and a reply the drafter could not ground show up
 * in the same report. Separate logs would each tell half the truth.
 */
export function createKnowledgeService({ store = null, gapLog = null } = {}) {
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

  async function ask(tenantId, question, { askedBy = null } = {}) {
    assertTenant(tenantId);
    const passages = kb.retrievablePassages(tenantId);

    const result = await ragCite({ tenantId, question, passages, gapLog: gaps, askedBy });
    return { ...result.data, question, askedBy };
  }

  async function ingest(tenantId, document) {
    assertTenant(tenantId);
    const { data } = await kb.ingest({ tenantId, ...document });
    return data;
  }

  return { overview, ask, ingest, gapLog: gaps, store: kb };
}
