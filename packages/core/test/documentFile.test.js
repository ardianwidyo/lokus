import { describe, expect, it } from 'vitest';

import { FILE_ORIGIN } from '../src/knowledge/documentFile.js';
import { createSeededKnowledgeStore } from '../src/knowledge/ingest.js';
import { createKnowledgeService } from '../src/services/knowledgeService.js';

const TENANT = 'nusa-retail';
const OTHER = 'dealer-arta-motor';

const longText = (sentences) =>
  Array.from(
    { length: sentences },
    (_, i) => `Kalimat nomor ${i + 1} berisi aturan operasional yang cukup panjang untuk mengisi ruang.`,
  ).join(' ');

/**
 * AC-10.11. The rule under test is not "a download works" but "a download is
 * never mislabelled": the original when there is one, the indexed text named as
 * indexed text when there is not, and a refusal when there is neither.
 */
describe('handing a document back as a file (T070)', () => {
  const service = () => createKnowledgeService({ store: createSeededKnowledgeStore() });

  it('renders the indexed text for a seeded document, saying it is not the original', async () => {
    const file = await service().documentFile(TENANT, 'sop-layanan-v4', { role: 'viewer' });

    expect(file.origin).toBe(FILE_ORIGIN.INDEXED_TEXT);
    expect(file.filename).toBe('sop-layanan-pelanggan-v4-teks-terindeks.txt');
    expect(file.mimeType).toBe('text/plain; charset=utf-8');
    // The disclaimer travels inside the file, because the file outlives the
    // screen that explained it.
    expect(file.text).toMatch(/bukan berkas asli/);
    expect(file.text).toMatch(/Antrean lebih dari 10 menit/);
  });

  it('prints every indexed chunk with the page and token count it was stored with', async () => {
    const file = await service().documentFile(TENANT, 'sop-layanan-v4', { role: 'admin' });
    const detail = await service().document(TENANT, 'sop-layanan-v4', { role: 'admin' });

    expect(file.text.match(/^--- potongan /gm)).toHaveLength(detail.chunkCount);
    expect(file.text).toContain(`hal. ${detail.chunks[0].page} · ${detail.chunks[0].tokens} token`);
  });

  it('reports a size in bytes, not characters', async () => {
    const file = await service().documentFile(TENANT, 'sop-layanan-v4', { role: 'viewer' });

    // "·" is two bytes and appears in every chunk header, so a character count
    // would come in low — and `content-length` would be wrong by that much.
    expect(file.sizeBytes).toBe(new TextEncoder().encode(file.text).length);
    expect(file.sizeBytes).toBeGreaterThan(file.text.length);
  });

  it('hands an uploaded document back byte for byte, under the name it arrived with', async () => {
    const svc = service();
    const text = `${longText(8)}\n\nPasal terakhir ditulis persis seperti ini.`;
    await svc.ingest(TENANT, {
      title: 'SOP Layanan Kasir v5',
      text,
      sourceFile: { filename: 'sop-kasir-v5.md', mimeType: 'text/markdown' },
    });

    const file = await svc.documentFile(TENANT, 'sop-layanan-kasir-v5', { role: 'manager' });

    expect(file.origin).toBe(FILE_ORIGIN.ORIGINAL);
    expect(file.filename).toBe('sop-kasir-v5.md');
    expect(file.mimeType).toBe('text/markdown');
    // Unchanged: not chunked, not trimmed, not reassembled from the chunks.
    expect(file.text).toBe(text);
  });

  it('names a pasted document after its title rather than inventing a filename', async () => {
    const svc = service();
    await svc.ingest(TENANT, { title: 'Catatan Rapat Ops', text: longText(6) });

    const file = await svc.documentFile(TENANT, 'catatan-rapat-ops', { role: 'manager' });

    expect(file.filename).toBe('catatan-rapat-ops.txt');
    expect(file.origin).toBe(FILE_ORIGIN.ORIGINAL);
  });

  it('refuses a document it holds neither a file nor a chunk for', async () => {
    // Excluded from the index and never uploaded: there is nothing to give.
    await expect(service().documentFile(TENANT, 'notulen-ops-juni', { role: 'admin' })).rejects.toMatchObject(
      { code: 'FILE_NOT_HELD' },
    );
  });

  it('refuses a restricted document by the same rule that hides its chunks', async () => {
    const svc = service();
    await svc.ingest(TENANT, { title: 'Perjanjian Waralaba 2026', text: longText(20), restricted: true });

    await expect(
      svc.documentFile(TENANT, 'perjanjian-waralaba-2026', { role: 'manager' }),
    ).rejects.toMatchObject({ code: 'ROLE_FORBIDDEN' });
    await expect(
      svc.documentFile(TENANT, 'perjanjian-waralaba-2026', { role: 'manager' }),
    ).rejects.toThrow(/Perjanjian Waralaba 2026/);

    const allowed = await svc.documentFile(TENANT, 'perjanjian-waralaba-2026', { role: 'admin' });
    expect(allowed.origin).toBe(FILE_ORIGIN.ORIGINAL);
  });

  it('answers nothing for another tenant, the same way the chunk route does', async () => {
    // Not a refusal: a refusal would confirm the id exists (AC-6.1).
    expect(await service().documentFile(OTHER, 'sop-layanan-v4', { role: 'admin' })).toBeNull();
  });

  it('keeps one tenant from downloading another tenant document of the same id', async () => {
    const store = createSeededKnowledgeStore();
    const svc = createKnowledgeService({ store });
    await svc.ingest(TENANT, { title: 'Panduan Kasir', text: 'Aturan milik Nusa Retail.' });
    await svc.ingest(OTHER, { title: 'Panduan Kasir', text: 'Aturan milik Arta Motor.' });

    const mine = await svc.documentFile(TENANT, 'panduan-kasir', { role: 'manager' });
    const theirs = await svc.documentFile(OTHER, 'panduan-kasir', { role: 'manager' });

    expect(mine.text).toBe('Aturan milik Nusa Retail.');
    expect(theirs.text).toBe('Aturan milik Arta Motor.');
  });
});

describe('what a document row says about its file (T070)', () => {
  it('marks a seeded document as holding indexed text only', async () => {
    const service = createKnowledgeService({ store: createSeededKnowledgeStore() });

    const { documents } = await service.overview(TENANT);
    const sop = documents.find((doc) => doc.docId === 'sop-layanan-v4');

    expect(sop.file).toMatchObject({ available: true, origin: FILE_ORIGIN.INDEXED_TEXT });
  });

  it('marks a document with no file and no chunks as holding nothing', async () => {
    const service = createKnowledgeService({ store: createSeededKnowledgeStore() });

    const { documents } = await service.overview(TENANT);
    const excluded = documents.find((doc) => doc.docId === 'notulen-ops-juni');

    expect(excluded.file).toMatchObject({ available: false, reason: 'NOT_HELD' });
  });

  it('carries the descriptor on the detail a reader opened, not only on the list', async () => {
    const service = createKnowledgeService({ store: createSeededKnowledgeStore() });

    const detail = await service.document(TENANT, 'nada-brand-2026', { role: 'viewer' });

    expect(detail.file.available).toBe(true);
    expect(detail.file.filename).toBe('panduan-nada-brand-2026-teks-terindeks.txt');
  });
});
