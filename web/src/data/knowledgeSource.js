import { DEFAULT_LOCALE, createKnowledgeService } from '@lokus/core';

/**
 * Knowledge data for screens 11 and 12.
 *
 * One service instance per tenant, so the gap log behind screen 11 is the same
 * one screen 12's refusals write into — a question refused in the answer view
 * appears in the gap report without a reload.
 *
 * `locale` is closed over at construction; `SessionContext` rebuilds this
 * source when the reader's language changes, the same way it rebuilds on a
 * tenant switch.
 */
export function createSeededKnowledgeSource({
  tenantId = 'nusa-retail',
  locale = DEFAULT_LOCALE,
  // The workspace's store, so a document ingested here is the same one the chat
  // agent and the reply drafter retrieve from (AC-10.2). Absent, this source
  // still works on its own corpus — which is what the screen tests rely on.
  store = null,
} = {}) {
  const service = createKnowledgeService({ store });

  return {
    isSeeded: true,
    overview: (forTenantId = tenantId) => service.overview(forTenantId),
    ask: (forTenantId, question, options) =>
      service.ask(forTenantId, question, { ...options, locale }),
    ingest: (forTenantId, document) => service.ingest(forTenantId, document),
    // The role travels per call rather than being closed over, mirroring the
    // API, where it is read off the verified token on every request. The rule
    // it feeds lives in the service, so both paths refuse identically (AC-10.9).
    document: (forTenantId, docId, options) => service.document(forTenantId, docId, options),
  };
}
