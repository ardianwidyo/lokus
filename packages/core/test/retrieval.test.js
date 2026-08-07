import { describe, expect, it } from 'vitest';

import {
  CONFIDENCE_THRESHOLD,
  MIN_ANSWERABLE_TERMS,
  ragSearch,
  searchPassages,
} from '../src/knowledge/retrieval.js';
import { TenantScopeError } from '../src/lib/tenantScope.js';

const TENANT = 'nusa-retail';
const find = (query, options = {}) => searchPassages({ tenantId: TENANT, query, ...options });

describe('passage retrieval', () => {
  it('holds the refusal floor at 0.70 (AC-4.1)', () => {
    expect(CONFIDENCE_THRESHOLD).toBe(0.7);
  });

  it.each([
    ['Apa kata SOP soal antrean kasir?', 12],
    ['Bagaimana aturan kebersihan lantai?', 18],
    ['Apa aturan parkir jam sibuk?', 30],
    ['Pelanggan minta refund barang promo yang sudah dibuka, boleh tidak?', 22],
  ])('answers %p from page %i', (query, page) => {
    const { chunks } = find(query);

    expect(chunks[0].page).toBe(page);
    expect(chunks[0].score).toBeGreaterThanOrEqual(CONFIDENCE_THRESHOLD);
  });

  it('is not thrown off by the scaffolding of a spoken question', () => {
    // Same question, more filler. Retrieval must not lose the passage.
    const plain = find('antrean kasir jam sibuk');
    const chatty = find('Halo, kalau boleh tahu, apa sih kata SOP soal antrean kasir saat jam sibuk?');

    expect(chatty.chunks[0].page).toBe(plain.chunks[0].page);
  });

  it('matches a clause through its document title', () => {
    // Page 12 never contains the word "SOP"; the title carries it.
    const { chunks } = find('SOP antrean kasir');

    expect(chunks[0].docId).toBe('sop-layanan-v4');
  });

  it('refuses a question the corpus has no vocabulary for', () => {
    const { chunks, outOfVocabulary } = find('resep rendang padang');

    expect(chunks).toHaveLength(0);
    expect(outOfVocabulary).toEqual(expect.arrayContaining(['resep', 'rendang']));
  });

  it('refuses when only one common word is shared, rather than citing the nearest clause', () => {
    // The SOP genuinely says nothing about ratings. "cabang" alone is not
    // evidence, and a confident citation here would be a fabricated answer.
    const { chunks } = find('Kenapa rating cabang Bekasi Timur turun bulan ini?');

    expect(MIN_ANSWERABLE_TERMS).toBe(2);
    expect(chunks).toHaveLength(0);
  });

  it('counts what it considered and rejected (AC-4.3)', () => {
    const { rejectedCount } = find('antrean kasir');

    expect(rejectedCount).toBeGreaterThan(0);
  });

  it('never returns a document that is not indexed', () => {
    // The draft SOP v5 and the excluded ops minutes must be unreachable.
    const all = find('keluhan antrean batas waktu laporan', { threshold: 0 });

    expect(all.chunks.concat(all.rejected).every((c) => c.docId !== 'sop-keluhan-v5-draft')).toBe(true);
    expect(all.chunks.concat(all.rejected).every((c) => c.docId !== 'notulen-ops-juni')).toBe(true);
  });

  it('returns nothing for a tenant with no corpus, and refuses with no tenant', async () => {
    expect(find('antrean kasir', { tenantId: 'klinik-sehat-prima' }).chunks).toHaveLength(0);
    expect(() => searchPassages({ query: 'antrean' })).toThrow(TenantScopeError);
  });
});

describe('rag.search envelope', () => {
  it('cites each chunk with document, page, score and a quote (AC-4.2)', async () => {
    const { data, sources } = await ragSearch({ tenantId: TENANT, query: 'antrean kasir jam sibuk' });

    expect(sources[0]).toMatchObject({
      type: 'document',
      docId: 'sop-layanan-v4',
      page: expect.any(Number),
      score: expect.any(Number),
      quote: expect.any(String),
    });
    expect(data.rejectedCount).toBeGreaterThan(0);
  });

  it('returns an empty sources array when it refuses, so no claim can stand on it', async () => {
    const result = await ragSearch({ tenantId: TENANT, query: 'resep rendang padang' });

    expect(result.data.chunks).toEqual([]);
    expect(result.sources).toEqual([]);
  });
});

describe('a corpus that grows after the agent was built (AC-10.2)', () => {
  const TENANT = 'nusa-retail';

  /** The shape `createSeededKnowledgeStore().retrievablePassages` returns. */
  const passage = (text) => ({
    chunkId: 'chunk-demo-1',
    docId: 'sop-demo',
    page: 1,
    title: 'SOP Penanganan Antrean Kasir',
    text,
    tenantId: TENANT,
  });

  it('re-reads a provider on every search, so a document added later is found', () => {
    const corpus = [];
    const provider = () => corpus;
    const query = 'kasir tambahan antrean kasir jam sibuk';

    // Built once, asked twice — exactly how the chat agent is constructed.
    const before = searchPassages({ tenantId: TENANT, query, passages: provider });
    expect(before.chunks).toHaveLength(0);

    corpus.push(
      passage(
        'Kasir tambahan wajib dibuka ketika antrean kasir mencapai lima orang pada jam sibuk. ' +
          'Supervisor toko memantau antrean setiap 15 menit.',
      ),
    );

    const after = searchPassages({ tenantId: TENANT, query, passages: provider });
    expect(after.chunks).toHaveLength(1);
    expect(after.chunks[0].docId).toBe('sop-demo');
  });

  it('treats a provider returning nothing as an empty corpus, not as the seed', () => {
    const found = searchPassages({
      tenantId: TENANT,
      query: 'antrean kasir jam sibuk',
      passages: () => null,
    });

    expect(found.chunks).toHaveLength(0);
    expect(found.rejectedCount).toBe(0);
  });

  it('still falls back to the seeded corpus when nothing is passed', () => {
    const found = searchPassages({ tenantId: TENANT, query: 'antrean kasir jam sibuk' });
    expect(found.chunks.length).toBeGreaterThan(0);
  });
});
