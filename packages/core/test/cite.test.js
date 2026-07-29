import { describe, expect, it } from 'vitest';

import { KnowledgeGapLog, REFUSAL_TEXT, ragCite } from '../src/knowledge/cite.js';
import { CONFIDENCE_THRESHOLD } from '../src/knowledge/retrieval.js';
import { TenantScopeError } from '../src/lib/tenantScope.js';

const TENANT = 'nusa-retail';
const REFUND = 'Pelanggan minta refund barang promo yang sudah dibuka, boleh tidak?';

const cite = (overrides = {}) => ragCite({ tenantId: TENANT, question: REFUND, ...overrides });

describe('rag.cite (AC-4.2)', () => {
  it('answers with a marker on every paragraph', async () => {
    const { data } = await cite();

    expect(data.answered).toBe(true);
    for (const paragraph of data.paragraphs) {
      expect(paragraph).toMatch(/\[\d\]$/);
    }
  });

  it('gives each citation a document, a page, a score and a quote', async () => {
    const { data } = await cite();

    for (const citation of data.citations) {
      expect(citation).toMatchObject({
        marker: expect.stringMatching(/^\[\d\]$/),
        docId: expect.any(String),
        page: expect.any(Number),
        score: expect.any(Number),
        quote: expect.any(String),
      });
      expect(citation.score).toBeGreaterThanOrEqual(CONFIDENCE_THRESHOLD);
    }
  });

  it('numbers markers from one, in the order they appear', async () => {
    const { data } = await cite();

    expect(data.citations.map((c) => c.marker)).toEqual(
      data.citations.map((_, i) => `[${i + 1}]`),
    );
  });

  it('cites the refund clause the SOP actually contains', async () => {
    const { data } = await cite();

    expect(data.citations.some((c) => c.docId === 'sop-layanan-v4' && c.page >= 21)).toBe(true);
  });

  it('reports how many chunks were considered and rejected (AC-4.3)', async () => {
    const { data } = await cite();

    expect(data.rejectedCount).toBeGreaterThan(0);
    expect(data.threshold).toBe(CONFIDENCE_THRESHOLD);
  });

  it('composes the answer from the passages rather than the other way round', async () => {
    // Every sentence must come from a retrieved chunk; there is no path by
    // which an uncited claim reaches the reader.
    const { data } = await cite();

    for (const citation of data.citations) {
      expect(data.text).toContain(citation.text);
    }
  });

  it('labels its own confidence rather than implying certainty', async () => {
    const { data } = await cite();

    expect(data.confidence).toBeGreaterThan(0);
    expect(['keyakinan tinggi', 'keyakinan sedang']).toContain(data.confidenceLabel);
  });
});

describe('the refusal path (AC-4.1)', () => {
  it('refuses when nothing clears the floor', async () => {
    const { data, sources } = await cite({ question: 'Bagaimana resep rendang padang?' });

    expect(data.answered).toBe(false);
    expect(data.text).toBe(REFUSAL_TEXT);
    expect(data.citations).toEqual([]);
    // Empty sources: the supervisor must not be able to build on a refusal.
    expect(sources).toEqual([]);
  });

  it('says how close it got, rather than only that it failed', async () => {
    const { data } = await cite({ question: 'Bagaimana resep rendang padang?' });

    expect(data.reason).toMatch(/ambang keyakinan 0\.7/);
    expect(data.reason).toMatch(/Kutipan terdekat hanya/);
  });

  it('logs a knowledge gap when it refuses', async () => {
    const gapLog = new KnowledgeGapLog();

    await cite({ question: 'Berapa lama garansi barang elektronik?', gapLog, askedBy: 'Dwi Kurnia' });

    const [gap] = gapLog.list(TENANT);
    expect(gap.question).toMatch(/garansi barang elektronik/);
    expect(gap.askedBy).toContain('Dwi Kurnia');
  });

  it('logs no gap when it could answer', async () => {
    const gapLog = new KnowledgeGapLog();

    await cite({ gapLog });

    expect(gapLog.list(TENANT)).toHaveLength(0);
  });

  it('works without a gap log at all', async () => {
    const { data } = await cite({ question: 'resep rendang' });

    expect(data.knowledgeGap).toBeNull();
  });

  it('refuses with an empty corpus rather than throwing', async () => {
    const { data } = await cite({ passages: [] });

    expect(data.answered).toBe(false);
  });
});

describe('the knowledge gap log', () => {
  it('counts a repeated question instead of duplicating it', () => {
    const log = new KnowledgeGapLog();

    log.record({ tenantId: TENANT, question: 'Berapa batas waktu antrean?' });
    log.record({ tenantId: TENANT, question: 'berapa BATAS waktu antrean??' });

    const gaps = log.list(TENANT);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].occurrences).toBe(2);
  });

  it('collects everyone who hit the same wall', () => {
    const log = new KnowledgeGapLog();

    log.record({ tenantId: TENANT, question: 'Batas antrean?', askedBy: 'Dwi' });
    log.record({ tenantId: TENANT, question: 'Batas antrean?', askedBy: 'Sari' });
    log.record({ tenantId: TENANT, question: 'Batas antrean?', askedBy: 'Dwi' });

    expect(log.list(TENANT)[0].askedBy).toEqual(['Dwi', 'Sari']);
  });

  it('ranks by how often staff hit the gap', () => {
    const log = new KnowledgeGapLog();

    log.record({ tenantId: TENANT, question: 'Jarang ditanya' });
    log.record({ tenantId: TENANT, question: 'Sering ditanya' });
    log.record({ tenantId: TENANT, question: 'Sering ditanya' });

    expect(log.list(TENANT)[0].question).toBe('Sering ditanya');
  });

  it('keeps one tenant\'s gaps out of another\'s report', () => {
    const log = new KnowledgeGapLog();

    log.record({ tenantId: TENANT, question: 'Milik Nusa' });

    expect(log.list('dealer-arta-motor')).toHaveLength(0);
  });

  it('refuses to record or list without a tenant id', () => {
    const log = new KnowledgeGapLog();

    expect(() => log.record({ question: 'x' })).toThrow(TenantScopeError);
    expect(() => log.list()).toThrow(TenantScopeError);
  });

  it('records the words the corpus had never seen, for the gap report', async () => {
    const gapLog = new KnowledgeGapLog();

    await cite({ question: 'Bagaimana prosedur klaim asuransi kendaraan?', gapLog });

    expect(gapLog.list(TENANT)[0].outOfVocabulary.length).toBeGreaterThan(0);
  });
});

describe('tenant scoping', () => {
  it('refuses without a tenant id', async () => {
    await expect(ragCite({ question: REFUND })).rejects.toBeInstanceOf(TenantScopeError);
  });

  it('answers nothing for a tenant with no corpus', async () => {
    const { data } = await cite({ tenantId: 'klinik-sehat-prima' });

    expect(data.answered).toBe(false);
  });
});
