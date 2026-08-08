/**
 * What may be uploaded, and how big (AC-10.12).
 *
 * Two decisions live here rather than in the console or the API, because both
 * of them have to make the same one: a demo running entirely in the browser and
 * a Cloud Run process behind a token must accept and refuse identically, or the
 * demo teaches a judge something the product does not do.
 *
 * The split that matters is not "allowed / not allowed" but "readable / merely
 * storable". A `.txt` can be chunked the moment it arrives. A PDF cannot —
 * extraction is Cloud Storage plus a text extractor, and neither exists yet
 * (T020). Storing it anyway is not a half-measure: the franchise agreement
 * nobody can search is still the one somebody needs to download.
 */

import { IngestError } from './ingestError.js';

/**
 * 25 MB. Chosen against what a tenant's SOP actually weighs — a 34-page scanned
 * PDF lands near 8 MB — and against what the seeded console can hold, since the
 * browser path keeps the bytes in a tab's memory with no bucket behind it.
 */
export const UPLOAD_MAX_BYTES = 25 * 1024 * 1024;

/**
 * The allowlist. A type absent from this table is refused rather than stored
 * under `application/octet-stream`: LOKUS would be keeping a file it cannot
 * describe, and a corpus with unidentifiable objects in it is not auditable.
 */
export const UPLOAD_TYPES = Object.freeze({
  txt: { mimeType: 'text/plain; charset=utf-8', type: 'TXT', readable: true },
  md: { mimeType: 'text/markdown; charset=utf-8', type: 'MD', readable: true },
  markdown: { mimeType: 'text/markdown; charset=utf-8', type: 'MD', readable: true },
  pdf: { mimeType: 'application/pdf', type: 'PDF', readable: false },
  docx: {
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    type: 'DOCX',
    readable: false,
  },
  xlsx: {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    type: 'XLSX',
    readable: false,
  },
  // Text on the wire, but a spreadsheet in meaning. Chunking rows as if they
  // were prose produces passages that retrieve badly and cite worse, so it is
  // stored and left for the extractor that will know what a column is.
  csv: { mimeType: 'text/csv; charset=utf-8', type: 'CSV', readable: false },
});

export const ACCEPTED_EXTENSIONS = Object.freeze(Object.keys(UPLOAD_TYPES));

/** The `accept` attribute and the human sentence, from the one table above. */
export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.map((extension) => `.${extension}`).join(',');

export function extensionOf(filename) {
  const match = /\.([A-Za-z0-9]+)$/.exec(String(filename ?? '').trim());
  return match ? match[1].toLowerCase() : null;
}

/**
 * Decides what an upload is, or refuses it saying which rule it broke.
 *
 * The extension decides, not the browser's `type`: browsers report `.md` as
 * empty often enough that trusting them would refuse a Markdown SOP at random,
 * and a `type` sent by a client is a claim the client made about itself.
 */
export function classifyUpload({ filename, sizeBytes = null, maxBytes = UPLOAD_MAX_BYTES } = {}) {
  const extension = extensionOf(filename);
  const known = extension ? UPLOAD_TYPES[extension] : null;

  if (!known) {
    throw new IngestError(
      'UNSUPPORTED_TYPE',
      `LOKUS belum bisa menyimpan berkas ${extension ? `.${extension}` : 'tanpa ekstensi'}`,
    );
  }

  if (sizeBytes !== null && sizeBytes > maxBytes) {
    throw new IngestError(
      'FILE_TOO_LARGE',
      `Berkas melebihi batas ${Math.round(maxBytes / (1024 * 1024))} MB`,
    );
  }

  return { extension, ...known, filename: String(filename).trim() };
}
