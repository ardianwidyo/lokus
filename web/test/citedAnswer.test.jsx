import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '../src/App.jsx';
import { createSeededKnowledgeSource } from '../src/data/knowledgeSource.js';
import { createSeededSessionSource } from '../src/data/sessionSource.js';
import { ACTIVE_TENANT_KEY } from '../src/data/tenantCache.js';

const renderAnswer = async (knowledgeSource = null) => {
  window.sessionStorage.setItem(
    ACTIVE_TENANT_KEY,
    JSON.stringify({ tenantId: 'nusa-retail', name: 'Nusa Retail', outletCount: 42, area: 'Jabodetabek', role: 'manager' }),
  );
  window.history.pushState({}, '', '/jawaban');
  const utils = render(
    <App
      sessionSource={createSeededSessionSource()}
      knowledgeSource={knowledgeSource ?? createSeededKnowledgeSource()}
    />,
  );
  await screen.findByText(/Kirim ke WhatsApp|Tidak ada di dokumen/, {}, { timeout: 4000 });
  return utils;
};

const askIt = async (question) => {
  await userEvent.type(screen.getByLabelText('Pertanyaan staf cabang'), question);
  await userEvent.click(screen.getByRole('button', { name: /Tanya/ }));
};

describe('Screen 12 · Jawaban bersitasi (AC-4.1, AC-4.2, AC-4.3)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('opens on a worked example, with who asked it and how', async () => {
    await renderAnswer();

    expect(screen.getByText(/Dwi Kurnia · Bekasi Timur · via WhatsApp/)).toBeInTheDocument();
    expect(screen.getByText(/refund barang promo/)).toBeInTheDocument();
  });

  it('marks each claim with a citation marker (AC-4.2)', async () => {
    await renderAnswer();

    const markers = document.querySelectorAll('.answer-marker');
    expect(markers.length).toBeGreaterThan(0);
    expect(markers[0].textContent).toBe('[1]');
  });

  it('shows each source with its page, score and quote', async () => {
    await renderAnswer();
    const panel = screen.getByText('Sumber').closest('.panel');
    const cards = panel.querySelectorAll('.source-card');

    expect(cards.length).toBeGreaterThan(0);
    expect(within(cards[0]).getByText(/hal\. \d+/)).toBeInTheDocument();
    // Indonesian decimal comma, since US-8.
    expect(within(cards[0]).getByText(/skor 0,\d\d|skor 1,00/)).toBeInTheDocument();
    expect(within(cards[0]).getByRole('button', { name: /Buka halaman \d+/ })).toBeInTheDocument();
  });

  it('numbers the source cards to match the markers in the text', async () => {
    await renderAnswer();

    const markers = [...document.querySelectorAll('.answer-marker')].map((n) => n.textContent);
    const cards = [...document.querySelectorAll('.source-marker')].map((n) => n.textContent);

    expect(cards).toEqual(markers);
  });

  it('says how many chunks were considered and rejected (AC-4.3)', async () => {
    await renderAnswer();

    expect(screen.getByText(/Potongan yang dipertimbangkan tapi tidak dipakai/)).toBeInTheDocument();
    expect(screen.getByText(/semuanya di bawah ambang 0,70/)).toBeInTheDocument();
  });

  it('reports how confident it is rather than implying certainty', async () => {
    await renderAnswer();

    expect(screen.getByText(/\d+ sumber · keyakinan (tinggi|sedang)/)).toBeInTheDocument();
  });

  it('refuses out loud when the corpus cannot answer (AC-4.1)', async () => {
    await renderAnswer();

    await askIt('Bagaimana resep rendang padang?');

    expect(await screen.findByText('Tidak ada di dokumen.')).toBeInTheDocument();
    expect(screen.getByText(/dicatat sebagai celah pengetahuan/)).toBeInTheDocument();
  });

  it('shows no sources at all when it refuses', async () => {
    await renderAnswer();

    await askIt('Bagaimana resep rendang padang?');
    await screen.findByText('Tidak ada di dokumen.');

    expect(document.querySelectorAll('.source-card')).toHaveLength(0);
    expect(screen.getByText(/Tidak ada kutipan yang lolos ambang/)).toBeInTheDocument();
  });

  it('uses the same code path to answer and to refuse, not a demo mode', async () => {
    // Ask a real question after a refusal: the box must answer again.
    await renderAnswer();

    await askIt('Bagaimana resep rendang padang?');
    await screen.findByText('Tidak ada di dokumen.');

    await askIt('Berapa lama antrean sebelum kasir tambahan wajib dibuka?');

    expect(await screen.findByText(/Kirim ke WhatsApp/)).toBeInTheDocument();
  });

  it('records the refused question as a gap the knowledge screen can show', async () => {
    const source = createSeededKnowledgeSource();
    await renderAnswer(source);

    await askIt('Berapa lama garansi barang elektronik?');
    await screen.findByText('Tidak ada di dokumen.');

    const overview = await source.overview('nusa-retail');
    expect(overview.totalUnanswered).toBeGreaterThan(0);
  });

  it('states the refusal threshold on screen', async () => {
    await renderAnswer();

    expect(screen.getByText(/Agen menolak menjawab bila skor kemiripan sumber di bawah/)).toBeInTheDocument();
  });

  it('shows the error state when the service fails', async () => {
    const source = createSeededKnowledgeSource();
    source.ask = async () => {
      throw new Error('Layanan pengetahuan tidak menjawab.');
    };

    window.sessionStorage.setItem(
      ACTIVE_TENANT_KEY,
      JSON.stringify({ tenantId: 'nusa-retail', name: 'Nusa Retail', role: 'manager' }),
    );
    window.history.pushState({}, '', '/jawaban');
    render(<App sessionSource={createSeededSessionSource()} knowledgeSource={source} />);

    const title = await screen.findByText('Jawaban tak bisa dimuat');
    expect(title.closest('.panel')).toHaveAttribute('data-status', 'error');
  });
});

describe('Screen 12 · who wrote the words (T061)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('says the answer is quoted when no model is configured', async () => {
    // This is the public demo's path, and it should not imply a model ran.
    await renderAnswer();

    expect(screen.getByText(/dikutip apa adanya dari SOP/)).toBeInTheDocument();
  });

  it('names the model, and that the citations were checked, when one wrote it', async () => {
    const source = createSeededKnowledgeSource();
    const ask = source.ask.bind(source);
    source.ask = async (...args) => ({
      ...(await ask(...args)),
      generated: true,
      generationStep: { tool: 'gemini.generate', model: 'gemini-2.0-flash', costIdr: 0.5, ms: 640 },
    });

    await renderAnswer(source);

    expect(screen.getByText(/ditulis gemini-2\.0-flash, lolos cek sitasi/)).toBeInTheDocument();
  });
});
