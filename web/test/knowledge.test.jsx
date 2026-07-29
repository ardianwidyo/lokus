import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

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
  await screen.findByText(/Dokumen terindeks/, {}, { timeout: 4000 });
  return utils;
};

describe('Screen 11 · Pusat pengetahuan (T024)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('reports the corpus size and the embedding configuration', async () => {
    await renderKb();

    expect(screen.getByText('text-embedding-004')).toBeInTheDocument();
    expect(screen.getByText(/768 dim · chunk 800 token · overlap 120/)).toBeInTheDocument();
  });

  it('measures coverage by probing the corpus, not by asserting a figure', async () => {
    await renderKb();

    expect(screen.getByText(/dari \d+ tema yang staf tanyakan/)).toBeInTheDocument();
  });

  it('lists every document with its index state and chunk count', async () => {
    await renderKb();
    const table = screen.getByRole('table');

    expect(within(table).getByText('SOP Layanan Pelanggan v4')).toBeInTheDocument();
    expect(within(table).getAllByText('Terindeks').length).toBeGreaterThan(0);
    expect(within(table).getByText('Menunggu tinjauan')).toBeInTheDocument();
  });

  it('says plainly that only indexed documents can be quoted', async () => {
    await renderKb();

    // Otherwise "menunggu tinjauan" reads as searchable.
    expect(
      screen.getByText(/Draft yang\s+menunggu tinjauan dan dokumen yang dikecualikan tidak pernah muncul/),
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
    expect(screen.getByText('Usulan klausa · draft')).toBeInTheDocument();
  });

  it('marks the proposed clause as a draft needing a human owner', async () => {
    const source = createSeededKnowledgeSource();
    await source.ask('nusa-retail', 'Berapa batas waktu antrean kasir yang wajib dilaporkan?');
    await source.ask('nusa-retail', 'Berapa batas waktu antrean kasir yang wajib dilaporkan?');

    await renderKb({ knowledgeSource: source });

    expect(screen.getByText(/draft untuk ditinjau manusia/)).toBeInTheDocument();
    expect(screen.getByText(/Tidak ada yang masuk SOP tanpa persetujuan/)).toBeInTheDocument();
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
      screen.getByText(/tetap disimpan tapi tidak diindeks untuk jawaban umum/),
    ).toBeInTheDocument();
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

    const title = await screen.findByText('Indeks tak bisa dimuat');
    expect(title.closest('.panel')).toHaveAttribute('data-status', 'error');
  });
});
