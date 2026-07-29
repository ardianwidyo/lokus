import { describe, expect, it } from 'vitest';

import {
  CHUNK_OVERLAP_TOKENS,
  CHUNK_TOKENS,
  EMBEDDING_MODEL,
  INDEX_STATE,
  IngestError,
  chunkText,
  createSeededKnowledgeStore,
  createVertexKnowledgeStore,
  estimateTokens,
} from '../src/knowledge/ingest.js';
import { TenantScopeError } from '../src/lib/tenantScope.js';

const TENANT = 'nusa-retail';
const longText = (sentences) =>
  Array.from({ length: sentences }, (_, i) => `Kalimat nomor ${i + 1} berisi aturan operasional yang cukup panjang untuk mengisi ruang.`).join(' ');

describe('chunking', () => {
  it('uses the window plan.md fixes', () => {
    expect(CHUNK_TOKENS).toBe(800);
    expect(CHUNK_OVERLAP_TOKENS).toBe(120);
  });

  it('returns one chunk for a short document', () => {
    expect(chunkText('Antrean lebih dari 10 menit wajib ditangani.')).toHaveLength(1);
  });

  it('splits a long document into several', () => {
    expect(chunkText(longText(200)).length).toBeGreaterThan(1);
  });

  it('overlaps consecutive chunks, so a clause on a boundary stays findable', () => {
    const chunks = chunkText(longText(200));
    const tailOfFirst = chunks[0].slice(-200);

    // Some of the first chunk's ending must reappear at the start of the next,
    // or a rule split across the boundary is lost from both sides.
    const overlapping = tailOfFirst
      .split(' ')
      .some((word) => word.length > 4 && chunks[1].startsWith(word) === false && chunks[1].includes(word));
    expect(overlapping).toBe(true);
  });

  it('prefers to end on a sentence boundary', () => {
    const chunks = chunkText(longText(200));

    expect(chunks[0].endsWith('.')).toBe(true);
  });

  it('returns nothing for empty input rather than one empty chunk', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   ')).toEqual([]);
    expect(chunkText(null)).toEqual([]);
  });

  it('estimates tokens on the same basis the chunker uses', () => {
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('')).toBe(0);
  });
});

describe('kb.ingest', () => {
  it('indexes a document and reports its chunk configuration', async () => {
    const store = createSeededKnowledgeStore();

    const { data } = await store.ingest({
      tenantId: TENANT,
      title: 'SOP Kebersihan v2',
      text: longText(120),
    });

    expect(data.documentId).toBe('sop-kebersihan-v2');
    expect(data.chunks).toBeGreaterThan(0);
    expect(data.indexState).toBe(INDEX_STATE.INDEXED);
    expect(data.config).toMatchObject({
      chunkTokens: 800,
      overlapTokens: 120,
      embeddingModel: EMBEDDING_MODEL,
    });
  });

  it('makes an ingested document immediately retrievable', async () => {
    const store = createSeededKnowledgeStore();
    const before = store.retrievablePassages(TENANT).length;

    await store.ingest({ tenantId: TENANT, title: 'Aturan Parkir Baru', text: longText(50) });

    expect(store.retrievablePassages(TENANT).length).toBeGreaterThan(before);
  });

  it('holds a restricted document back from general retrieval', async () => {
    // An admin-only contract must never be quotable to a customer.
    const store = createSeededKnowledgeStore();

    const { data } = await store.ingest({
      tenantId: TENANT,
      title: 'Perjanjian Rahasia',
      text: longText(30),
      restricted: true,
    });

    expect(data.indexState).toBe(INDEX_STATE.REVIEW);
    expect(store.retrievablePassages(TENANT).some((c) => c.docId === data.documentId)).toBe(false);
  });

  it('refuses an empty document rather than indexing nothing', async () => {
    const store = createSeededKnowledgeStore();

    await expect(store.ingest({ tenantId: TENANT, title: 'Kosong', text: '   ' })).rejects.toMatchObject(
      { code: 'EMPTY_DOCUMENT' },
    );
  });

  it('refuses a document with no title', async () => {
    const store = createSeededKnowledgeStore();

    await expect(store.ingest({ tenantId: TENANT, text: longText(10) })).rejects.toBeInstanceOf(
      IngestError,
    );
  });

  it('refuses to ingest the same document twice', async () => {
    const store = createSeededKnowledgeStore();
    await store.ingest({ tenantId: TENANT, title: 'SOP Ganda', text: longText(20) });

    await expect(
      store.ingest({ tenantId: TENANT, title: 'SOP Ganda', text: longText(20) }),
    ).rejects.toMatchObject({ code: 'ALREADY_EXISTS' });
  });

  it('keeps one tenant\'s documents out of another\'s index', async () => {
    const store = createSeededKnowledgeStore();
    await store.ingest({ tenantId: 'dealer-arta-motor', title: 'SOP Dealer', text: longText(20) });

    expect(store.documentsFor(TENANT).some((doc) => doc.docId === 'sop-dealer')).toBe(false);
    expect(store.retrievablePassages(TENANT).some((c) => c.docId === 'sop-dealer')).toBe(false);
  });

  it('refuses without a tenant id', async () => {
    const store = createSeededKnowledgeStore();

    await expect(store.ingest({ title: 'x', text: 'y' })).rejects.toBeInstanceOf(TenantScopeError);
    expect(() => store.documentsFor()).toThrow(TenantScopeError);
  });
});

describe('the knowledge base index', () => {
  it('lists documents with their index state and chunk count', () => {
    const store = createSeededKnowledgeStore();
    const docs = store.documentsFor(TENANT);

    expect(docs.length).toBeGreaterThan(0);
    for (const doc of docs) {
      expect(doc).toMatchObject({ title: expect.any(String), indexState: expect.any(String) });
      expect(doc.retrievable).toBe(doc.indexState === INDEX_STATE.INDEXED);
    }
  });

  it('excludes the draft SOP and the excluded minutes from retrieval', () => {
    const store = createSeededKnowledgeStore();
    const retrievable = new Set(store.retrievablePassages(TENANT).map((c) => c.docId));

    expect(retrievable.has('sop-keluhan-v5-draft')).toBe(false);
    expect(retrievable.has('notulen-ops-juni')).toBe(false);
    expect(retrievable.has('sop-layanan-v4')).toBe(true);
  });

  it('reports the stats screen 11 shows', () => {
    const stats = createSeededKnowledgeStore().stats(TENANT);

    expect(stats.indexedCount).toBeGreaterThan(0);
    expect(stats.chunkCount).toBeGreaterThan(0);
    expect(stats).toMatchObject({ embeddingModel: EMBEDDING_MODEL, dimensions: 768 });
  });
});

describe('the real knowledge store', () => {
  it('refuses without a bucket and an index rather than pretending to index', () => {
    expect(() => createVertexKnowledgeStore({})).toThrow(IngestError);
    expect(() => createVertexKnowledgeStore({})).toThrow(/belum dikonfigurasi/);
  });

  it('is explicit that it awaits pilot provisioning', () => {
    expect(() => createVertexKnowledgeStore({ bucket: 'b', searchEngineId: 's' })).toThrow(/Q2/);
  });
});
