import { assertTenant, scopeToTenant } from '../lib/tenantScope.js';
import { toolResult } from '../lib/toolResult.js';
import { DOCUMENTS, PASSAGES } from '../seed/documents.js';
import {
  FILE_ORIGIN,
  TEXT_MIME,
  byteLength,
  describeFile,
  fileSlug,
  renderIndexedText,
} from './documentFile.js';
import { IngestError } from './ingestError.js';
import { UPLOAD_MAX_BYTES, classifyUpload } from './upload.js';

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
  /**
   * The file is held; its text has not been read (AC-10.12).
   *
   * Its own state, because none of the five above is true of it. `diproses`
   * claims work is under way — there is no extractor running. `antre` claims a
   * queue it is in. `dikecualikan` claims someone decided to exclude it. Only
   * this one says the thing that is actually the case, and a document at zero
   * chunks under any of the others would be the console misreporting its corpus.
   */
  AWAITING_EXTRACTION: 'menunggu-ekstraksi',
});

/** Only these states are searchable. Everything else is invisible to retrieval. */
export const RETRIEVABLE_STATES = Object.freeze([INDEX_STATE.INDEXED]);

export { IngestError };

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

  /**
   * The files handed over at ingest, keyed by tenant *and* document id for the
   * same reason chunks carry a tenant: two tenants may ingest documents that
   * slug to the same id, and a map keyed by id alone would hand one tenant the
   * other's file (constitution IV).
   *
   * The seeded corpus has no entry here. Its documents were never uploaded —
   * they are passages, and saying otherwise is what AC-10.11 forbids.
   */
  const originals = new Map();
  const fileKey = (tenantId, docId) => `${tenantId}::${docId}`;
  const originalFor = (tenantId, docId) => originals.get(fileKey(tenantId, docId)) ?? null;

  const withFile = (tenantId, doc, chunkCount) => ({
    ...doc,
    chunkCount,
    retrievable: RETRIEVABLE_STATES.includes(doc.indexState),
    file: describeFile({
      original: originalFor(tenantId, doc.docId),
      chunkCount,
      title: doc.title,
    }),
  });

  function documentsFor(tenantId) {
    assertTenant(tenantId);
    return scopeToTenant(tenantId, docs).map((doc) =>
      withFile(tenantId, doc, chunksFor(tenantId, doc.docId).length),
    );
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
      ...withFile(tenantId, doc, own.length),
      chunks: own.map((chunk) => ({ ...chunk })),
    };
  }

  /**
   * The file itself (AC-10.11).
   *
   * Three outcomes, and the caller can tell them apart: `null` for a document
   * this tenant does not have — the same single refusal `documentDetail` gives,
   * so a download cannot be used to enumerate another tenant's document ids;
   * `{available: false}` for a document LOKUS holds nothing for; and otherwise
   * the bytes, with `origin` saying whether they are the original or a
   * rendition of the indexed chunks.
   *
   * The access rule is deliberately *not* here. It lives in the knowledge
   * service beside the one AC-10.9 already defines, so a restricted document
   * refuses its file and its chunks by the same decision rather than by two
   * copies of it.
   *
   * A production store returns `{url}` here instead — a short-lived signed URL
   * to the Cloud Storage object — and the route redirects to it rather than
   * proxying the bytes through the API process. Nothing above this line changes.
   */
  function documentFile(tenantId, docId) {
    assertTenant(tenantId);
    const doc = scopeToTenant(tenantId, docs).find((entry) => entry.docId === docId);
    if (!doc) return null;

    const original = originalFor(tenantId, docId);
    if (original) {
      return {
        docId,
        title: doc.title,
        available: true,
        origin: FILE_ORIGIN.ORIGINAL,
        filename: original.filename,
        mimeType: original.mimeType,
        sizeBytes: original.sizeBytes,
        // One or the other, never both: a document held as bytes has no text
        // yet, and one held as text has no separate copy in bytes.
        ...(original.bytes ? { bytes: original.bytes } : { text: original.text }),
      };
    }

    const own = chunksFor(tenantId, docId);
    const descriptor = describeFile({ chunkCount: own.length, title: doc.title });
    if (!descriptor.available) return { docId, title: doc.title, ...descriptor };

    const text = renderIndexedText({ document: doc, chunks: own });
    return { docId, title: doc.title, ...descriptor, sizeBytes: byteLength(text), text };
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

  /**
   * What was handed over, kept so it can be handed back (AC-10.11).
   *
   * `text` is the original: the console reads a dropped `.txt`/`.md` whole and
   * passes it unchanged, and a pasted document is original in the only sense
   * that matters — nobody else has a copy of it. The chunker's normalisation
   * happens downstream of this, so what is stored here is not what was indexed
   * but what arrived, which is the point.
   *
   * `sourceFile` carries the dropped file's own name and type when there was a
   * file. Pasted text gets a name derived from the title, because a download
   * called `dokumen.txt` is a worse artefact than one called
   * `sop-layanan-kasir-v5.txt` and neither is a claim about provenance.
   */
  function keepOriginal({ tenantId, docId, title, text, bytes, sourceFile }) {
    const filename = sourceFile?.filename?.trim() || `${fileSlug(title)}.txt`;
    const held = bytes
      ? { sizeBytes: bytes.byteLength, bytes }
      : { sizeBytes: byteLength(text), text };

    originals.set(fileKey(tenantId, docId), {
      filename,
      mimeType: sourceFile?.mimeType?.trim() || TEXT_MIME,
      ...held,
    });
  }

  /**
   * Bytes in, text out, or nothing (AC-10.12).
   *
   * A `.txt` is decoded and indexed in the same step it is stored in. A PDF is
   * not decoded at all: `TextDecoder` over a PDF produces a page of binary
   * punctuation that chunks cleanly, embeds successfully, retrieves plausibly
   * and cites gibberish at a customer. Refusing to read it is the only honest
   * option until an extractor exists (T020).
   */
  function decodeUpload({ bytes, sourceFile, maxBytes }) {
    const kind = classifyUpload({
      filename: sourceFile?.filename,
      sizeBytes: bytes.byteLength,
      maxBytes,
    });

    return {
      kind,
      text: kind.readable ? new TextDecoder().decode(bytes) : null,
    };
  }

  async function ingest({
    tenantId,
    docId,
    title,
    type = null,
    text,
    // The file itself, when one was uploaded rather than typed. `Uint8Array`,
    // because that is what both a browser's `FileReader` and a Node stream can
    // produce and neither has to know about the other's buffer type.
    bytes = null,
    pages = null,
    restricted = false,
    // The file the content came out of, when there was one. Its name and type
    // are metadata; the content is `bytes` or `text`, never a third copy.
    sourceFile = null,
    maxBytes = UPLOAD_MAX_BYTES,
  } = {}) {
    const startedAt = Date.now();
    assertTenant(tenantId);

    if (!title) throw new IngestError('TITLE_REQUIRED', 'Dokumen wajib punya judul');

    const upload = bytes ? decodeUpload({ bytes, sourceFile, maxBytes }) : null;
    const body = upload ? upload.text : text;
    const readable = upload ? upload.kind.readable : true;

    // A file of zero bytes is more likely a failed read than a decision, and a
    // document with no text to chunk cannot be indexed. A stored-but-unread
    // upload is exempt from the second rule: it has no text by definition.
    if (bytes?.byteLength === 0 || (readable && !String(body ?? '').trim())) {
      throw new IngestError('EMPTY_DOCUMENT', 'Dokumen kosong tidak bisa diindeks');
    }

    const id = docId ?? slug(title);
    if (docs.some((doc) => doc.docId === id && doc.tenantId === tenantId)) {
      throw new IngestError('ALREADY_EXISTS', `Dokumen ${id} sudah ada untuk tenant ini`);
    }

    const pieces = readable ? chunkText(body) : [];
    // A stored-but-unread document has no page count: nothing has counted its
    // pages. Reporting the chunk arithmetic would invent one (`—` in the table).
    const pageCount = readable ? (pages ?? Math.max(1, Math.ceil(pieces.length / 2))) : pages;

    const document = {
      docId: id,
      tenantId,
      title,
      type: type ?? upload?.kind.type ?? 'TXT',
      pages: pageCount,
      // Three different reasons a document may not be searchable, and the state
      // names which one applies. Unreadable comes first: a PDF marked
      // restricted is not awaiting review, it is awaiting an extractor, and the
      // restriction is enforced by the service either way (AC-10.9).
      indexState: !readable
        ? INDEX_STATE.AWAITING_EXTRACTION
        : restricted
          ? INDEX_STATE.REVIEW
          : INDEX_STATE.INDEXED,
      updatedAt: new Date().toISOString().slice(0, 10),
      restricted,
      // The same mark an added review carries (AC-10.6). A document typed into
      // the demo must never sit in the table looking like a tenant's own SOP.
      addedInSession: true,
    };
    docs.push(document);
    keepOriginal({
      tenantId,
      docId: id,
      title,
      text: body,
      // Held as bytes only when they cannot be text: a `.md` kept as bytes
      // would download identically but could not be diffed or read in a test.
      bytes: readable ? null : bytes,
      // For an upload the type comes from the extension, not from the browser's
      // `type` field: that field is a claim the client made about itself, and
      // it is empty for `.md` often enough to matter.
      sourceFile: upload
        ? { filename: upload.kind.filename, mimeType: upload.kind.mimeType }
        : sourceFile,
    });

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
        // The caller writes the receipt, and "stored" and "indexed" need
        // different sentences. Deriving it from `chunks === 0` would be
        // guessing; this is the store saying which it did (AC-10.12).
        stored: true,
        indexed: readable,
        type: document.type,
        filename: originalFor(tenantId, id)?.filename ?? null,
        sizeBytes: originalFor(tenantId, id)?.sizeBytes ?? null,
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

  return {
    isSeeded: true,
    ingest,
    documentsFor,
    documentDetail,
    documentFile,
    retrievablePassages,
    stats,
  };
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
