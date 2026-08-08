import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../src/App.jsx';
import { createSeededKnowledgeSource } from '../src/data/knowledgeSource.js';
import { createSeededSessionSource } from '../src/data/sessionSource.js';
import { ACTIVE_TENANT_KEY } from '../src/data/tenantCache.js';

const renderKb = async ({ role = 'manager', knowledgeSource = null } = {}) => {
  window.sessionStorage.setItem(
    ACTIVE_TENANT_KEY,
    JSON.stringify({ tenantId: 'nusa-retail', name: 'Nusa Retail', outletCount: 42, area: 'Jabodetabek', role }),
  );
  window.history.pushState({}, '', '/pengetahuan');
  const utils = render(
    <App
      sessionSource={createSeededSessionSource()}
      knowledgeSource={knowledgeSource ?? createSeededKnowledgeSource()}
    />,
  );
  await screen.findByRole('table', {}, { timeout: 4000 }).catch(() => null);
  await screen.findByText(/Dokumen yang terbaca/, {}, { timeout: 4000 });
  return utils;
};

describe('Screen 11 · Pusat pengetahuan (T024)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('reports the corpus size and the embedding configuration', async () => {
    await renderKb();

    expect(screen.getByText('text-embedding-004')).toBeInTheDocument();
    expect(screen.getByText(/768 dimensi · dipotong tiap 800 token · tumpang tindih 120/)).toBeInTheDocument();
  });

  it('measures coverage by probing the corpus, not by asserting a figure', async () => {
    await renderKb();

    expect(screen.getByText(/dari \d+ hal yang biasa ditanya staf/)).toBeInTheDocument();
  });

  it('lists every document with its index state and chunk count', async () => {
    await renderKb();
    const table = screen.getByRole('table');

    expect(within(table).getByText('SOP Layanan Pelanggan v4')).toBeInTheDocument();
    expect(within(table).getAllByText('Sudah terbaca').length).toBeGreaterThan(0);
    expect(within(table).getByText('Menunggu ditinjau')).toBeInTheDocument();
  });

  it('says plainly that only indexed documents can be quoted', async () => {
    await renderKb();

    // Otherwise "menunggu tinjauan" reads as searchable.
    expect(
      screen.getByText(/Draft yang\s+menunggu ditinjau dan dokumen yang tidak dipakai tidak pernah muncul/),
    ).toBeInTheDocument();
  });

  it('shows an empty gap panel when nothing has been refused yet', async () => {
    await renderKb();

    // A fresh corpus has no refusals; the panel says so rather than inventing.
    expect(screen.getByText('Belum ada celah tercatat')).toBeInTheDocument();
  });

  it('shows a gap with its proposed clause once questions have been refused', async () => {
    const source = createSeededKnowledgeSource();
    // Two refusals of the same question: enough evidence to propose a clause.
    await source.ask('nusa-retail', 'Berapa lama garansi barang elektronik?', { askedBy: 'Dwi' });
    await source.ask('nusa-retail', 'Berapa lama garansi barang elektronik?', { askedBy: 'Sari' });

    await renderKb({ knowledgeSource: source });

    expect(screen.getByText(/2 pertanyaan dari 2 orang/)).toBeInTheDocument();
    expect(screen.getByText('Usulan pasal · draft')).toBeInTheDocument();
  });

  it('marks the proposed clause as a draft needing a human owner', async () => {
    const source = createSeededKnowledgeSource();
    await source.ask('nusa-retail', 'Berapa batas waktu antrean kasir yang wajib dilaporkan?');
    await source.ask('nusa-retail', 'Berapa batas waktu antrean kasir yang wajib dilaporkan?');

    await renderKb({ knowledgeSource: source });

    expect(screen.getByText(/draft yang harus ditinjau orang/)).toBeInTheDocument();
    expect(screen.getByText(/Tidak ada yang masuk SOP tanpa disetujui/)).toBeInTheDocument();
  });

  it('sends a clause draft to the SOP owner', async () => {
    const source = createSeededKnowledgeSource();
    await source.ask('nusa-retail', 'Berapa batas waktu antrean kasir yang wajib dilaporkan?');
    await source.ask('nusa-retail', 'Berapa batas waktu antrean kasir yang wajib dilaporkan?');
    await renderKb({ knowledgeSource: source });

    await userEvent.click(screen.getByRole('button', { name: 'Kirim ke pemilik SOP' }));

    expect(await screen.findByText(/dikirim ke pemilik SOP/)).toBeInTheDocument();
  });

  it('stops a viewer changing anything (AC-6.3)', async () => {
    const source = createSeededKnowledgeSource();
    await source.ask('nusa-retail', 'Berapa batas waktu antrean kasir yang wajib dilaporkan?');
    await source.ask('nusa-retail', 'Berapa batas waktu antrean kasir yang wajib dilaporkan?');

    await renderKb({ role: 'viewer', knowledgeSource: source });

    expect(screen.getByRole('button', { name: 'Kirim ke pemilik SOP' })).toBeDisabled();
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });

  it('states that a restricted upload is stored but not indexed', async () => {
    await renderKb();

    expect(
      screen.getByText(/tetap disimpan, tapi tidak dipakai untuk menjawab pertanyaan umum/),
    ).toBeInTheDocument();
  });

  /**
   * jsdom has no object URLs and no download machinery, so what is asserted
   * here is what the console asked the browser to save — the filename and the
   * bytes — plus the sentence it showed the reader afterwards. Those are the
   * two things AC-10.11 is about; whether Chrome writes the file is Chrome's.
   */
  describe('handing a document back as a file (T070)', () => {
    let saved;

    beforeEach(() => {
      saved = [];
      window.URL.createObjectURL = vi.fn((blob) => {
        saved.push(blob);
        return 'blob:lokus/test';
      });
      window.URL.revokeObjectURL = vi.fn();
      // jsdom navigates on a real anchor click and warns about it; the click is
      // the download, and there is nothing to navigate to.
      HTMLAnchorElement.prototype.click = vi.fn();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    const readBlob = (blob) =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsText(blob);
      });

    it('offers each document the file it actually holds, and no button for the rest', async () => {
      await renderKb();
      const table = screen.getByRole('table');

      // Seeded documents are passages, never uploads: what LOKUS holds is text.
      expect(
        within(table).getByRole('button', { name: 'Unduh berkas SOP Layanan Pelanggan v4' }),
      ).toHaveTextContent('Unduh teks');
      // Excluded from the index and never uploaded — nothing to give, and a
      // disabled button would invite a hunt for the setting that enables it.
      expect(within(table).getAllByText('tidak disimpan').length).toBeGreaterThan(0);
    });

    it('downloads the indexed text under a name that says what it is', async () => {
      await renderKb();

      await userEvent.click(
        screen.getByRole('button', { name: 'Unduh berkas SOP Layanan Pelanggan v4' }),
      );

      expect(await screen.findByText(/ini teks yang terbaca agen, bukan berkas asli/)).toBeInTheDocument();
      expect(screen.getByText(/sop-layanan-pelanggan-v4-teks-terindeks\.txt/)).toBeInTheDocument();
      expect(await readBlob(saved[0])).toMatch(/Antrean lebih dari 10 menit/);
    });

    it('hands an uploaded document back as the file it arrived as', async () => {
      const source = createSeededKnowledgeSource();
      const text = 'Pasal satu mengatur jam operasional kasir. '.repeat(20);
      await source.ingest('nusa-retail', {
        title: 'SOP Kasir 2026',
        text,
        sourceFile: { filename: 'sop-kasir-2026.md', mimeType: 'text/markdown' },
      });
      await renderKb({ knowledgeSource: source });

      await userEvent.click(screen.getByRole('button', { name: 'Unduh berkas SOP Kasir 2026' }));

      expect(await screen.findByText(/sama persis seperti saat diserahkan/)).toBeInTheDocument();
      expect(await readBlob(saved[0])).toBe(text);
    });

    it('refuses a restricted document to a manager, naming it (AC-10.9)', async () => {
      const source = createSeededKnowledgeSource();
      await source.ingest('nusa-retail', {
        title: 'Perjanjian Waralaba 2026',
        text: 'Pasal satu mengatur bagi hasil waralaba. '.repeat(20),
        restricted: true,
      });
      await renderKb({ knowledgeSource: source, role: 'manager' });

      await userEvent.click(
        screen.getByRole('button', { name: 'Unduh berkas Perjanjian Waralaba 2026' }),
      );

      const refusal = await screen.findByRole('alert');
      expect(refusal).toHaveTextContent(/Perjanjian Waralaba 2026/);
      expect(refusal).toHaveTextContent(/khusus untuk Admin/);
      expect(saved).toHaveLength(0);
    });

    it('lets a viewer download, because reading a document is not writing to it', async () => {
      await renderKb({ role: 'viewer' });

      await userEvent.click(
        screen.getByRole('button', { name: 'Unduh berkas Panduan Nada Brand 2026' }),
      );

      expect(await screen.findByText(/panduan-nada-brand-2026-teks-terindeks\.txt/)).toBeInTheDocument();
    });
  });

  it('shows the error state with a retry', async () => {
    const source = createSeededKnowledgeSource();
    source.overview = async () => {
      throw new Error('Layanan pengetahuan tidak menjawab.');
    };

    window.sessionStorage.setItem(
      ACTIVE_TENANT_KEY,
      JSON.stringify({ tenantId: 'nusa-retail', name: 'Nusa Retail', role: 'manager' }),
    );
    window.history.pushState({}, '', '/pengetahuan');
    render(<App sessionSource={createSeededSessionSource()} knowledgeSource={source} />);

    const title = await screen.findByText('Daftar dokumen gagal ditampilkan');
    expect(title.closest('.panel')).toHaveAttribute('data-status', 'error');
  });
});
