import { describe, expect, it } from 'vitest';

import { createSeededKnowledgeStore } from '../src/knowledge/ingest.js';
import { TenantScopeError } from '../src/lib/tenantScope.js';
import { createKnowledgeService } from '../src/services/knowledgeService.js';

const TENANT = 'nusa-retail';
const longText = (sentences) =>
  Array.from(
    { length: sentences },
    (_, i) => `Kalimat nomor ${i + 1} berisi aturan operasional yang cukup panjang untuk mengisi ruang.`,
  ).join(' ');

/**
 * The restriction rule lives in the service because both callers go through it:
 * the API route with the role off the verified token, the seeded console with
 * the role it holds for the tenant. These tests are what stops the two drifting
 * (AC-10.9).
 */
describe('reading one document through the service (T069)', () => {
  const withRestricted = async () => {
    const store = createSeededKnowledgeStore();
    const service = createKnowledgeService({ store });
    await service.ingest(TENANT, {
      title: 'Perjanjian Waralaba 2026',
      text: longText(20),
      restricted: true,
    });
    return service;
  };

  it('returns an unrestricted document to any role', async () => {
    const service = createKnowledgeService({ store: createSeededKnowledgeStore() });

    const detail = await service.document(TENANT, 'sop-layanan-v4', { role: 'viewer' });

    expect(detail.title).toBe('SOP Layanan Pelanggan v4');
    expect(detail.chunks.length).toBeGreaterThan(0);
  });

  it('refuses a restricted document to a manager, naming it', async () => {
    const service = await withRestricted();

    await expect(
      service.document(TENANT, 'perjanjian-waralaba-2026', { role: 'manager' }),
    ).rejects.toMatchObject({ code: 'ROLE_FORBIDDEN' });
    await expect(
      service.document(TENANT, 'perjanjian-waralaba-2026', { role: 'manager' }),
    ).rejects.toThrow(/Perjanjian Waralaba 2026/);
  });

  it('refuses a restricted document when no role was passed at all', async () => {
    const service = await withRestricted();

    await expect(service.document(TENANT, 'perjanjian-waralaba-2026')).rejects.toMatchObject({
      code: 'ROLE_FORBIDDEN',
    });
  });

  it('gives a restricted document to an admin', async () => {
    const service = await withRestricted();

    const detail = await service.document(TENANT, 'perjanjian-waralaba-2026', { role: 'admin' });

    // Stored and readable by an admin, but still outside retrieval: the
    // restriction is about who may read it, not about it being indexed.
    expect(detail.chunks.length).toBeGreaterThan(0);
    expect(detail.retrievable).toBe(false);
  });

  it('refuses rather than returning the document with its chunks removed', async () => {
    const service = await withRestricted();

    // An empty `chunks` array would say the document is blank, which is a
    // different and false statement.
    await expect(
      service.document(TENANT, 'perjanjian-waralaba-2026', { role: 'viewer' }),
    ).rejects.toThrow();
  });

  it('answers null for a document this tenant does not have', async () => {
    const service = createKnowledgeService({ store: createSeededKnowledgeStore() });

    expect(await service.document(TENANT, 'tidak-ada', { role: 'admin' })).toBeNull();
  });

  it('refuses without a tenant id', async () => {
    const service = createKnowledgeService({ store: createSeededKnowledgeStore() });

    await expect(service.document(undefined, 'sop-layanan-v4', { role: 'admin' })).rejects.toBeInstanceOf(
      TenantScopeError,
    );
  });
});
