/**
 * The file behind a document row (AC-10.11).
 *
 * A knowledge base holds two different things and a console that blurs them
 * lies: the file someone handed over, and the text that was indexed from it.
 * They are not interchangeable. The indexed text has lost the layout, the
 * tables, and every page the extractor could not read; handing it down under
 * the original's name would tell a reader they have the SOP when they have a
 * transcription of part of it.
 *
 * So a download is always labelled with its origin, and the rendition built
 * from chunks says what it is in its own first lines — not in a tooltip the
 * file loses the moment it lands in someone's Downloads folder.
 */

export const FILE_ORIGIN = Object.freeze({
  /** The bytes handed to LOKUS, returned unchanged. */
  ORIGINAL: 'original',
  /** No original is held. What is offered is the text that was indexed. */
  INDEXED_TEXT: 'indexed-text',
});

export const TEXT_MIME = 'text/plain; charset=utf-8';

/** Why a document has nothing to hand over. Reported, never guessed at. */
export const FILE_UNAVAILABLE = Object.freeze({
  NOT_HELD: 'NOT_HELD',
});

/**
 * Bytes, not characters. A header that counted characters would understate
 * every Indonesian document containing a single "é" or "—", and the number is
 * used for `content-length`, where being wrong breaks the download.
 */
export function byteLength(text) {
  return new TextEncoder().encode(String(text ?? '')).length;
}

export function fileSlug(title) {
  return (
    String(title ?? '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 64) || 'dokumen'
  );
}

/** `.txt`, and named for what it is — the reader will see this in a file list. */
export function indexedTextFilename(title) {
  return `${fileSlug(title)}-teks-terindeks.txt`;
}

/**
 * The rendition of a document LOKUS holds only as chunks.
 *
 * Written in Indonesian because the file leaves the console: it is opened in
 * Notepad, forwarded to a franchisee, attached to an email. The reader is the
 * tenant's own staff, not the console's locale setting.
 *
 * Chunks are printed in store order with their page and token count, the same
 * way the inspector panel prints them (AC-10.8). A clause the chunker split
 * across a boundary appears split here too — reassembling it would produce a
 * document that reads better than the one the agents actually search.
 */
export function renderIndexedText({ document, chunks = [] }) {
  const header = [
    `# ${document.title}`,
    '# Teks terindeks LOKUS — bukan berkas asli',
    '#',
    `# Dokumen  : ${document.docId}`,
    `# Tenant   : ${document.tenantId}`,
    `# Jenis    : ${document.type}${document.pages ? ` · ${document.pages} halaman` : ''}`,
    `# Status   : ${document.indexState}`,
    `# Potongan : ${chunks.length}`,
    `# Diperbarui: ${document.updatedAt}`,
    '#',
    '# LOKUS tidak menyimpan berkas asli dokumen ini. Yang ada di bawah adalah',
    '# teks yang benar-benar terbaca dan bisa dikutip agen, potongan demi',
    '# potongan, apa adanya — termasuk kalau sebuah pasal terpotong di tengah.',
  ];

  const body = chunks.map(
    (chunk, index) =>
      `--- potongan ${index + 1} · hal. ${chunk.page ?? '—'} · ${chunk.tokens} token ---\n${chunk.text}`,
  );

  return `${header.join('\n')}\n\n${body.join('\n\n')}\n`;
}

/**
 * What a row says about its file, without building the file.
 *
 * The list on screen 11 renders six of these per load and a real corpus renders
 * hundreds; rendering every document's text to report a size would make the
 * table pay for downloads nobody asked for. So the size is known only for an
 * original, whose length was measured once at ingest.
 */
export function describeFile({ original = null, chunkCount = 0, title = '' } = {}) {
  if (original) {
    return {
      available: true,
      origin: FILE_ORIGIN.ORIGINAL,
      filename: original.filename,
      mimeType: original.mimeType,
      sizeBytes: original.sizeBytes,
    };
  }

  if (chunkCount > 0) {
    return {
      available: true,
      origin: FILE_ORIGIN.INDEXED_TEXT,
      filename: indexedTextFilename(title),
      mimeType: TEXT_MIME,
      sizeBytes: null,
    };
  }

  return {
    available: false,
    origin: null,
    filename: null,
    mimeType: null,
    sizeBytes: null,
    reason: FILE_UNAVAILABLE.NOT_HELD,
  };
}
