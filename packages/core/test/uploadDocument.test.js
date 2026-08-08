import { describe, expect, it } from 'vitest';

import { FILE_ORIGIN } from '../src/knowledge/documentFile.js';
import { INDEX_STATE, createSeededKnowledgeStore } from '../src/knowledge/ingest.js';
import { UPLOAD_MAX_BYTES, classifyUpload } from '../src/knowledge/upload.js';
import { createKnowledgeService } from '../src/services/knowledgeService.js';

const TENANT = 'nusa-retail';
const encode = (text) => new TextEncoder().encode(text);

/** A real PDF header, so the bytes under test are not text pretending to be one. */
const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a, 0x00, 0xff, 0xfe]);

/**
 * AC-10.12. Storing and reading are separated, and the whole risk of separating
 * them is a document that looks searchable and is not. These assert the console
 * cannot be told that.
 */
describe('storing a document before it can be read (T071)', () => {
  const service = () => createKnowledgeService({ store: createSeededKnowledgeStore() });

  it('keeps a PDF whole and marks it as not yet read', async () => {
    const svc = service();

    const result = await svc.ingest(TENANT, {
      title: 'Perjanjian Waralaba 2026',
      bytes: PDF_BYTES,
      sourceFile: { filename: 'perjanjian-2026.pdf', mimeType: 'application/pdf' },
    });

    expect(result.indexState).toBe(INDEX_STATE.AWAITING_EXTRACTION);
    expect(result.indexed).toBe(false);
    expect(result.stored).toBe(true);
    expect(result.chunks).toBe(0);
  });

  it('hands that PDF back byte for byte', async () => {
    const svc = service();
    await svc.ingest(TENANT, {
      title: 'Perjanjian Waralaba 2026',
      bytes: PDF_BYTES,
      sourceFile: { filename: 'perjanjian-2026.pdf', mimeType: 'application/pdf' },
    });

    const file = await svc.documentFile(TENANT, 'perjanjian-waralaba-2026', { role: 'manager' });

    expect(file.origin).toBe(FILE_ORIGIN.ORIGINAL);
    expect(file.filename).toBe('perjanjian-2026.pdf');
    expect(file.mimeType).toBe('application/pdf');
    expect([...file.bytes]).toEqual([...PDF_BYTES]);
    // Never decoded: a PDF read as text is mojibake, and mojibake chunks
    // cleanly enough to be cited at a customer.
    expect(file.text).toBeUndefined();
  });

  it('keeps an unread document out of retrieval, the indexed count and coverage', async () => {
    const svc = service();
    const before = await svc.overview(TENANT);

    await svc.ingest(TENANT, {
      title: 'Katalog Harga 2026',
      bytes: PDF_BYTES,
      sourceFile: { filename: 'katalog.pdf' },
    });
    const after = await svc.overview(TENANT);

    expect(after.stats.documentCount).toBe(before.stats.documentCount + 1);
    // The three figures that would each be a lie if an unread file counted.
    expect(after.stats.indexedCount).toBe(before.stats.indexedCount);
    expect(after.stats.chunkCount).toBe(before.stats.chunkCount);
    expect(after.coverage.answered).toBe(before.coverage.answered);

    const row = after.documents.find((doc) => doc.docId === 'katalog-harga-2026');
    expect(row.retrievable).toBe(false);
    expect(row.pages).toBeNull();
  });

  it('cannot be cited by an agent while it is unread', async () => {
    const svc = service();
    await svc.ingest(TENANT, {
      title: 'Aturan Diskon Karyawan',
      bytes: encode('Diskon karyawan adalah 40 persen untuk semua barang.'),
      sourceFile: { filename: 'diskon.pdf' },
    });

    // The words are in the file. They are not in the index, and the agent must
    // refuse rather than answer from a document nobody has read.
    const answer = await svc.ask(TENANT, 'Berapa diskon karyawan?');

    expect(answer.answered).toBe(false);
  });

  it('indexes a text file in the same step it stores it', async () => {
    const svc = service();
    const text = 'Antrean lebih dari sepuluh menit wajib dilaporkan ke area manager. '.repeat(6);

    const result = await svc.ingest(TENANT, {
      title: 'SOP Antrean v2',
      bytes: encode(text),
      sourceFile: { filename: 'sop-antrean-v2.md', mimeType: '' },
    });

    expect(result.indexed).toBe(true);
    expect(result.indexState).toBe(INDEX_STATE.INDEXED);
    expect(result.chunks).toBeGreaterThan(0);

    const file = await svc.documentFile(TENANT, 'sop-antrean-v2', { role: 'viewer' });
    expect(file.text).toBe(text);
    // The extension decides the type, not the browser's empty `type` field.
    expect(file.mimeType).toBe('text/markdown; charset=utf-8');
  });

  it('refuses a type it cannot even store, rather than keeping an unnameable blob', async () => {
    await expect(
      service().ingest(TENANT, {
        title: 'Sesuatu',
        bytes: PDF_BYTES,
        sourceFile: { filename: 'malware.exe' },
      }),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_TYPE' });
  });

  it('refuses a file over the ceiling', async () => {
    await expect(
      service().ingest(TENANT, {
        title: 'Katalog Besar',
        bytes: new Uint8Array(64),
        sourceFile: { filename: 'katalog.pdf' },
        maxBytes: 32,
      }),
    ).rejects.toMatchObject({ code: 'FILE_TOO_LARGE' });
  });

  it('refuses an empty file rather than storing a zero-byte document', async () => {
    await expect(
      service().ingest(TENANT, {
        title: 'Kosong',
        bytes: new Uint8Array(0),
        sourceFile: { filename: 'kosong.pdf' },
      }),
    ).rejects.toMatchObject({ code: 'EMPTY_DOCUMENT' });
  });

  it('keeps the restriction rule working on an unread file', async () => {
    const svc = service();
    await svc.ingest(TENANT, {
      title: 'Kontrak Direksi',
      bytes: PDF_BYTES,
      sourceFile: { filename: 'kontrak.pdf' },
      restricted: true,
    });

    await expect(svc.documentFile(TENANT, 'kontrak-direksi', { role: 'manager' })).rejects.toMatchObject(
      { code: 'ROLE_FORBIDDEN' },
    );
    expect(await svc.documentFile(TENANT, 'kontrak-direksi', { role: 'admin' })).toMatchObject({
      filename: 'kontrak.pdf',
    });
  });
});

describe('what may be uploaded (T071)', () => {
  it('classifies by extension, not by the type the client claimed', () => {
    // Browsers report `.md` with an empty type often enough that trusting the
    // claim would refuse a Markdown SOP at random.
    expect(classifyUpload({ filename: 'sop.md' })).toMatchObject({ type: 'MD', readable: true });
    expect(classifyUpload({ filename: 'kontrak.PDF' })).toMatchObject({ type: 'PDF', readable: false });
  });

  it('treats a spreadsheet as storable but not readable', () => {
    // A CSV is text on the wire and a table in meaning; chunked as prose it
    // retrieves badly and cites worse.
    expect(classifyUpload({ filename: 'harga.csv' }).readable).toBe(false);
  });

  it('names which rule an upload broke', () => {
    expect(() => classifyUpload({ filename: 'a.exe' })).toThrow(/belum bisa menyimpan/);
    expect(() =>
      classifyUpload({ filename: 'a.pdf', sizeBytes: UPLOAD_MAX_BYTES + 1 }),
    ).toThrow(/melebihi batas 25 MB/);
  });
});
