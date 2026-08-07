import {
  createMemoryApprovalStore,
  createSeededGbpAdapter,
  createSeededKnowledgeStore,
} from '@lokus/core';

/**
 * The mutable state the seeded console shares.
 *
 * Every seeded source used to build its own adapters. That was harmless while
 * the data was fixed at build time — six copies of the same deterministic rows
 * are indistinguishable from one. It stopped being harmless the moment the
 * console could be *given* something: a SOP ingested on screen 11 landed in
 * that screen's store, while the chat agent went on reading the frozen seed
 * corpus and the drafter read a third copy. The document was correctly indexed
 * and invisible to the two screens where seeing it would have mattered.
 *
 * So the adapters are built once here and handed to every source (AC-10.2).
 * The scope is deliberately narrow: this holds the two things a reader can add
 * to — reviews and documents — and nothing else. Services, budget guards and
 * ticket stores stay where they are.
 *
 * `passages` is a function rather than the array itself, and that is the whole
 * mechanism. An agent is constructed once and answers many questions; handed an
 * array it would be bound to the corpus as it stood at construction. Handed a
 * function, it re-reads on every search (see `searchPassages` in core).
 */
export function createDemoWorkspace({ tenantId = 'nusa-retail' } = {}) {
  const gbp = createSeededGbpAdapter();
  const knowledgeStore = createSeededKnowledgeStore();
  // Held here rather than inside the reputation source because that source is
  // rebuilt whenever the corpus changes, and an approval is a record of a named
  // human accepting responsibility (constitution II). Losing it on an unrelated
  // rebuild would quietly erase who approved what.
  const approvalStore = createMemoryApprovalStore();

  return {
    tenantId,
    gbp,
    knowledgeStore,
    approvalStore,
    /** Live corpus for every retrieval path: chat, cited answers, reply drafts. */
    passages: (forTenantId = tenantId) => knowledgeStore.retrievablePassages(forTenantId),
  };
}
