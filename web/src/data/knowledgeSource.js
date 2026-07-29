import { createKnowledgeService } from '@lokus/core';

/**
 * Knowledge data for screens 11 and 12.
 *
 * One service instance per tenant, so the gap log behind screen 11 is the same
 * one screen 12's refusals write into — a question refused in the answer view
 * appears in the gap report without a reload.
 */
export function createSeededKnowledgeSource({ tenantId = 'nusa-retail' } = {}) {
  const service = createKnowledgeService();

  return {
    isSeeded: true,
    overview: (forTenantId = tenantId) => service.overview(forTenantId),
    ask: (forTenantId, question, options) => service.ask(forTenantId, question, options),
    ingest: (forTenantId, document) => service.ingest(forTenantId, document),
  };
}
