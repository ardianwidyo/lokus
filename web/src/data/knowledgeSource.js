import { DEFAULT_LOCALE, createKnowledgeService } from '@lokus/core';

import { fileBytes } from '../lib/fileBytes.js';

/**
 * Knowledge data for screens 11 and 12.
 *
 * One service instance per tenant, so the gap log behind screen 11 is the same
 * one screen 12's refusals write into — a question refused in the answer view
 * appears in the gap report without a reload.
 *
 * `locale` is closed over at construction; `SessionContext` rebuilds this
 * source when the reader's language changes, the same way it rebuilds on a
 * tenant switch.
 */
export function createSeededKnowledgeSource({
  tenantId = 'nusa-retail',
  locale = DEFAULT_LOCALE,
  // The workspace's store, so a document ingested here is the same one the chat
  // agent and the reply drafter retrieve from (AC-10.2). Absent, this source
  // still works on its own corpus — which is what the screen tests rely on.
  store = null,
} = {}) {
  const service = createKnowledgeService({ store });

  return {
    isSeeded: true,
    overview: (forTenantId = tenantId) => service.overview(forTenantId),
    ask: (forTenantId, question, options) =>
      service.ask(forTenantId, question, { ...options, locale }),
    ingest: (forTenantId, document) => service.ingest(forTenantId, document),

    /**
     * A real file, read in the tab (AC-10.12).
     *
     * No API and no parser: a `FileReader` is the whole mechanism, which is why
     * the GitHub Pages demo can be handed a PDF and hand it back while
     * depending on nothing (AC-10.7). The bytes go to the same `kb.ingest` the
     * HTTP route calls, so a `.txt` is indexed and a PDF is stored and marked
     * as awaiting extraction on both paths alike.
     */
    uploadDocument: async (forTenantId, { title, restricted = false, file }) => {
      const bytes = await fileBytes(file);
      return service.ingest(forTenantId, {
        title,
        restricted,
        bytes,
        sourceFile: { filename: file.name, mimeType: file.type },
      });
    },
    // The role travels per call rather than being closed over, mirroring the
    // API, where it is read off the verified token on every request. The rule
    // it feeds lives in the service, so both paths refuse identically (AC-10.9).
    document: (forTenantId, docId, options) => service.document(forTenantId, docId, options),

    /**
     * The file, as a blob the browser can save (AC-10.11).
     *
     * The HTTP source returns this same shape from a response body, so the
     * screen never learns which one it is holding — the seeded console
     * downloads a real file with no API, which is what AC-10.7 asks of every
     * capability on this screen.
     */
    documentFile: async (forTenantId, docId, options) => {
      const file = await service.documentFile(forTenantId, docId, options);
      if (!file) return null;

      return {
        filename: file.filename,
        mimeType: file.mimeType,
        origin: file.origin,
        // Bytes when the store holds bytes — a PDF put through the text branch
        // becomes the string "undefined" in a file named `.pdf` (AC-10.12).
        blob: new Blob([file.bytes ?? file.text], { type: file.mimeType }),
      };
    },
  };
}
