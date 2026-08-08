import { assertTenant, scopeToTenant } from '../lib/tenantScope.js';
import { toolResult } from '../lib/toolResult.js';
import { DOCUMENTS, PASSAGES } from '../seed/documents.js';

/**
 * `kb.ingest` — documents in, retrievable passages out.
 *
 * plan.md fixes the chunking: 800 tokens with 120 overlap, embedded with
 * `text-embedding-004` and indexed in Vertex AI Search. The seeded store does
 * the same chunking and keeps the chunks in memory; swapping in Vertex AI
 * Search changes the index backend, not the contract or the chunk boundaries.
 *
 * Overlap matters and is not decoration: a clause that straddles a chunk
 * boundary is retrievable from either side, so a rule split across a page break
 * is not silently lost.
 */

export const CHUNK_TOKENS = 800;
export const CHUNK_OVERLAP_TOKENS = 120;
export const EMBEDDING_MODEL = 'text-embedding-004';
export const EMBEDDING_DIMENSIONS = 768;

/** Roughly a token per 4 characters for Indonesian prose. */
const CHARS_PER_TOKEN = 4;

export const INDEX_STATE = Object.freeze({
  QUEUED: 'antre',
  PROCESSING: 'diproses',
  INDEXED: 'indexed',
  REVIEW: 'menunggu-tinjauan',
  EXCLUDED: 'dikecualikan',
});

/** Only these states are searchable. Everything else is invisible to retrieval. */
export const RETRIEVABLE_STATES = Object.freeze([INDEX_STATE.INDEXED]);

export class IngestError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'IngestError';
    this.code = code;
  }
}

/**
 * Splits text into overlapping chunks on sentence boundaries where it can, so
 * a chunk rarely ends mid-clause. Falls back to a hard cut only when a single
 * sentence is longer than the window.
 */
export function chunkText(text, { tokens = CHUNK_TOKENS, overlap = CHUNK_OVERLAP_TOKENS } = {}) {
  const source = String(text ?? '').trim();
  if (source === '') return [];

  const size = tokens * CHARS_PER_TOKEN;
  const step = Math.max(1, (tokens - overlap) * CHARS_PER_TOKEN);

  const chunks = [];
  for (let start = 0; start < source.length; start += step) {
    let end = Math.min(source.length, start + size);

    // Prefer to end on a sentence boundary inside the last 20% of the window.
    if (end < source.length) {
      const window = source.slice(start, end);
      const boundary = window.lastIndexOf('. ');
      if (boundary > size * 0.8) end = start + boundary + 1;
    }

    chunks.push(source.slice(start, end).trim());
    if (end >= source.length) break;
  }

  return chunks.filter(Boolean);
}

/** Token count, on the same rough basis the chunker uses. */
export function estimateTokens(text) {
  return Math.ceil(String(text ?? '').length / CHARS_PER_TOKEN);
}

/**
 * The knowledge base. Firestore plus Vertex AI Search in production, memory
 * here, behind one interface — the same pattern as every other adapter.
 */
export function createSeededKnowledgeStore({ documents = DOCUMENTS, passages = PASSAGES } = {}) {
  const docs = documents.map((doc) => ({ ...doc }));
  // A chunk inherits its document's tenant. The seed passages carry only a
  // docId, and nothing stops two tenants from ingesting documents that slug to
  // the same id — so selecting chunks by docId alone would hand one tenant the
  // other's text. Harmless while chunks were only ever counted; not harmless
  // now that a panel prints them (AC-10.8, constitution IV).
  const chunks = passages.map((passage, index) => ({
    ...passage,
    tenantId: passage.tenantId ?? docs.find((doc) => doc.docId === passage.docId)?.tenantId ?? null,
    chunkId: `chunk-${passage.docId}-${index + 1}`,
    tokens: estimateTokens(passage.text),
  }));

  const chunksFor = (tenantId, docId) =>
    chunks.filter((chunk) => chunk.tenantId === tenantId && chunk.docId === docId);

  function documentsFor(tenantId) {
    assertTenant(tenantId);
    return scopeToTenant(tenantId, docs).map((doc) => ({
      ...doc,
      chunkCount: chunksFor(tenantId, doc.docId).length,
      retrievable: RETRIEVABLE_STATES.includes(doc.indexState),
    }));
  }

  /**
   * One document with the chunks that were actually indexed from it (AC-10.8).
   *
   * The chunks are returned as stored rather than reassembled into the original
   * text: a clause the chunker split across two chunks is retrieved as two
   * pieces, and a reader deciding whether the corpus can answer a question needs
   * to see that, not a tidied-up version of it.
   *
   * `null` for a document that does not exist and for one belonging to another
   * tenant alike — the same single refusal `gbp.reply` gives, so this cannot be
   * used to find out which document ids another tenant holds (AC-6.1).
   */
  function documentDetail(tenantId, docId) {
    assertTenant(tenantId);
    const doc = scopeToTenant(tenantId, docs).find((entry) => entry.docId === docId);
    if (!doc) return null;

    const own = chunksFor(tenantId, docId);

    return {
      ...doc,
      chunkCount: own.length,
      retrievable: RETRIEVABLE_STATES.includes(doc.indexState),
      chunks: own.map((chunk) => ({ ...chunk })),
    };
  }

  /** Only indexed documents contribute. A draft awaiting review is invisible. */
  function retrievablePassages(tenantId) {
    assertTenant(tenantId);
    const indexed = new Set(
      scopeToTenant(tenantId, docs)
        .filter((doc) => RETRIEVABLE_STATES.includes(doc.indexState))
        .map((doc) => doc.docId),
    );

    return chunks
      .filter((chunk) => chunk.tenantId === tenantId && indexed.has(chunk.docId))
      .map((chunk) => ({
        ...chunk,
        tenantId,
        title: docs.find((doc) => doc.docId === chunk.docId).title,
      }));
  }

  async function ingest({ tenantId, docId, title, type = 'PDF', text, pages = null, restricted = false } = {}) {
    const startedAt = Date.now();
    assertTenant(tenantId);

    if (!title) throw new IngestError('TITLE_REQUIRED', 'Dokumen wajib punya judul');
    if (!String(text ?? '').trim()) {
      throw new IngestError('EMPTY_DOCUMENT', 'Dokumen kosong tidak bisa diindeks');
    }

    const id = docId ?? slug(title);
    if (docs.some((doc) => doc.docId === id && doc.tenantId === tenantId)) {
      throw new IngestError('ALREADY_EXISTS', `Dokumen ${id} sudah ada untuk tenant ini`);
    }

    const pieces = chunkText(text);
    const pageCount = pages ?? Math.max(1, Math.ceil(pieces.length / 2));

    const document = {
      docId: id,
      tenantId,
      title,
      type,
      pages: pageCount,
      // Restricted documents are stored but never indexed for general
      // retrieval, so an admin-only contract cannot be quoted to a customer.
      indexState: restricted ? INDEX_STATE.REVIEW : INDEX_STATE.INDEXED,
      updatedAt: new Date().toISOString().slice(0, 10),
      restricted,
      // The same mark an added review carries (AC-10.6). A document typed into
      // the demo must never sit in the table looking like a tenant's own SOP.
      addedInSession: true,
    };
    docs.push(document);

    pieces.forEach((piece, index) => {
      chunks.push({
        chunkId: `chunk-${id}-${index + 1}`,
        docId: id,
        tenantId,
        // Two chunks to a page, matching how the seed corpus is laid out.
        page: Math.floor(index / 2) + 1,
        text: piece,
        tokens: estimateTokens(piece),
      });
    });

    return toolResult({
      data: {
        documentId: id,
        pages: pageCount,
        chunks: pieces.length,
        indexState: document.indexState,
        config: {
          chunkTokens: CHUNK_TOKENS,
          overlapTokens: CHUNK_OVERLAP_TOKENS,
          embeddingModel: EMBEDDING_MODEL,
          dimensions: EMBEDDING_DIMENSIONS,
        },
      },
      sources: [{ type: 'document', docId: id, title, page: 1 }],
      startedAt,
    });
  }

  function stats(tenantId) {
    assertTenant(tenantId);
    const own = documentsFor(tenantId);
    const indexed = own.filter((doc) => doc.retrievable);

    return {
      documentCount: own.length,
      indexedCount: indexed.length,
      chunkCount: indexed.reduce((sum, doc) => sum + doc.chunkCount, 0),
      embeddingModel: EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMENSIONS,
      chunkTokens: CHUNK_TOKENS,
      overlapTokens: CHUNK_OVERLAP_TOKENS,
    };
  }

  return { isSeeded: true, ingest, documentsFor, documentDetail, retrievablePassages, stats };
}

/**
 * The real ingest path. Unimplemented rather than faked: without a bucket and
 * an index the caller must choose the seeded store explicitly instead of
 * believing a document was indexed when it was not.
 */
export function createVertexKnowledgeStore({ bucket, searchEngineId } = {}) {
  if (!bucket || !searchEngineId) {
    throw new IngestError(
      'KB_NOT_CONFIGURED',
      'Cloud Storage dan Vertex AI Search belum diatur. Pakai penyimpanan data contoh secara eksplisit.',
    );
  }

  throw new IngestError(
    'KB_NOT_IMPLEMENTED',
    'Ingest ke Vertex AI Search menunggu provisioning index tenant pilot (spec.md Q2).',
  );
}

function slug(title) {
  return String(title)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}
