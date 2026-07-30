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

    expect(data.reason).toMatch(/ambang keyakinan 0,70/);
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

describe('T022 · refusals are recorded wherever they happen', () => {
  it('records a gap when the supervisor refuses', async () => {
    const { createSupervisor } = await import('../src/agents/supervisor.js');
    const gapLog = new KnowledgeGapLog();
    const supervisor = createSupervisor({ agents: {}, gapLog });

    const run = await supervisor.ask({
      tenantId: TENANT,
      question: 'Berapa lama masa garansi kulkas?',
      context: { askedBy: 'Dwi Kurnia' },
    });

    expect(run.refused).toBe(true);
    expect(run.knowledgeGap.question).toMatch(/garansi kulkas/);
    expect(gapLog.list(TENANT)).toHaveLength(1);
  });

  it('records no gap when the supervisor could answer', async () => {
    const { createSupervisor, createReputationAgent } = await import('../src/index.js');
    const { createSeededGbpAdapter } = await import('../src/adapters/gbp.js');
    const gapLog = new KnowledgeGapLog();
    const supervisor = createSupervisor({
      agents: { reputation: createReputationAgent({ gbp: createSeededGbpAdapter() }) },
      gapLog,
    });

    const run = await supervisor.ask({ tenantId: TENANT, question: 'Ringkas keluhan pekan ini' });

    expect(run.refused).toBe(false);
    expect(run.knowledgeGap).toBeNull();
    expect(gapLog.list(TENANT)).toHaveLength(0);
  });

  it('records a gap when the draft generator cannot ground a reply', async () => {
    const { draftReply } = await import('../src/reputation/draftReply.js');
    const gapLog = new KnowledgeGapLog();

    const result = await draftReply({
      tenantId: TENANT,
      review: {
        id: 'rev-x',
        tenantId: TENANT,
        outletId: 'BKS-02',
        rating: 1,
        author: 'Uji',
        text: 'Antre lama sekali di kasir.',
      },
      // Empty corpus: nothing can ground the draft.
      passages: [],
      gapLog,
    });

    expect(result.data.drafted).toBe(false);
    expect(gapLog.list(TENANT)).toHaveLength(1);
    expect(gapLog.list(TENANT)[0].askedBy).toContain('Dwi Kurnia');
  });

  it('still refuses cleanly with no gap log attached', async () => {
    const { createSupervisor } = await import('../src/agents/supervisor.js');

    const run = await createSupervisor({ agents: {} }).ask({
      tenantId: TENANT,
      question: 'apa saja',
    });

    expect(run.refused).toBe(true);
    expect(run.knowledgeGap).toBeNull();
  });
});

describe('rag.cite with a model behind it (T061)', () => {
  const modelSaying = (text) => ({
    generate: async () => ({
      text,
      model: 'gemini-2.0-flash',
      tier: 'gemini-reasoning',
      tokens: { input: 120, output: 40 },
      costIdr: 0.5,
      ms: 640,
    }),
  });

  it('serves the passages themselves when no model is configured', async () => {
    const { data } = await cite();

    // This is what the public demo runs, and it must stay grounded by
    // construction rather than by a check.
    expect(data.generated).toBeFalsy();
    expect(data.text).toContain(data.citations[0].text);
  });

  it('serves the written answer when the model cites properly', async () => {
    const { data } = await cite({
      gemini: modelSaying('Barang promo yang sudah dibuka tidak bisa dikembalikan [1].'),
    });

    expect(data.answered).toBe(true);
    expect(data.generated).toBe(true);
    expect(data.text).toBe('Barang promo yang sudah dibuka tidak bisa dikembalikan [1].');
    expect(data.generationStep).toMatchObject({ tool: 'gemini.generate', costIdr: 0.5 });
  });

  it('keeps the citations verifiable even when a model wrote the words', async () => {
    const { sources } = await cite({
      gemini: modelSaying('Tidak bisa dikembalikan [1].'),
    });

    // The sources are still the retrieved passages with their pages and
    // scores; the model never gets to choose what the answer is attributed to.
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) {
      expect(source).toMatchObject({ type: 'document', page: expect.any(Number) });
      expect(source.score).toBeGreaterThanOrEqual(CONFIDENCE_THRESHOLD);
    }
  });

  it('discards a fluent answer that cites nothing', async () => {
    const { data } = await cite({
      gemini: modelSaying('Tentu saja barang promo selalu bisa dikembalikan kapan pun.'),
    });

    expect(data.generated).toBe(false);
    expect(data.text).not.toContain('kapan pun');
    expect(data.text).toContain(data.citations[0].text);
  });

  it('discards an answer that cites a source that does not exist', async () => {
    const { data } = await cite({ gemini: modelSaying('Refund boleh 30 hari [9].') });

    expect(data.generated).toBe(false);
    expect(data.text).not.toContain('[9]');
  });

  it('refuses, and logs the gap, when the model says the passages do not answer it', async () => {
    const gapLog = new KnowledgeGapLog();

    const { data, sources } = await cite({
      gemini: modelSaying('Tidak ada di dokumen.'),
      gapLog,
    });

    expect(data.answered).toBe(false);
    expect(data.text).toBe(REFUSAL_TEXT);
    expect(sources).toEqual([]);
    expect(gapLog.list(TENANT).length).toBe(1);
  });

  it('falls back rather than failing when the model errors', async () => {
    const broken = {
      generate: async () => {
        throw Object.assign(new Error('429'), { code: 'GEMINI_HTTP_ERROR' });
      },
    };

    const { data } = await cite({ gemini: broken });

    expect(data.answered).toBe(true);
    expect(data.generated).toBe(false);
  });
});
