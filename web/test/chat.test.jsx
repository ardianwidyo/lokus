import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '../src/App.jsx';
import { createSeededAgentSource } from '../src/data/agentSource.js';
import { createSeededSessionSource } from '../src/data/sessionSource.js';
import { ACTIVE_TENANT_KEY } from '../src/data/tenantCache.js';

const renderChat = (agentSource = null) => {
  window.sessionStorage.setItem(
    ACTIVE_TENANT_KEY,
    JSON.stringify({ tenantId: 'nusa-retail', name: 'Nusa Retail', outletCount: 42, area: 'Jabodetabek', role: 'manager' }),
  );
  window.history.pushState({}, '', '/chat');
  return render(
    <App
      sessionSource={createSeededSessionSource()}
      agentSource={agentSource ?? createSeededAgentSource()}
    />,
  );
};

const ask = async (question) => {
  await userEvent.type(screen.getByLabelText('Pertanyaan untuk agen'), question);
  await userEvent.click(screen.getByRole('button', { name: /Kirim/ }));
  return screen.findByRole('article', { name: 'Jawaban agen' });
};

describe('Screen 10 · Chat agen (AC-7.2, AC-7.4)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('answers a branch diagnosis across several agents', async () => {
    renderChat();

    const answer = await ask('Kenapa rating cabang Bekasi Timur turun bulan ini?');

    expect(within(answer).getByText(/Supervisor →/)).toBeInTheDocument();
    expect(answer.textContent).toMatch(/Antrean kasir/);
  });

  it('shows the execution trace inside the answer, not behind a toggle (AC-7.2)', async () => {
    renderChat();

    const answer = await ask('Kenapa rating cabang Bekasi Timur turun bulan ini?');
    const trace = within(answer).getByRole('list', { name: 'Langkah kerja agen' });
    const chips = within(trace).getAllByRole('listitem');

    expect(chips[0]).toHaveTextContent('01 supervisor.route');
    expect(chips.at(-1)).toHaveTextContent(/guardrail\.check/);
    expect(chips.length).toBeGreaterThan(3);
  });

  it('numbers every trace step and names the tool it called', async () => {
    renderChat();

    const answer = await ask('Ringkas keluhan pekan ini');
    const chips = within(within(answer).getByRole('list', { name: 'Langkah kerja agen' })).getAllByRole(
      'listitem',
    );

    chips.forEach((chip, index) => {
      expect(chip.textContent).toMatch(new RegExp(`^${String(index + 1).padStart(2, '0')} \\w`));
    });
  });

  it('reports step count, latency and per-answer cost (AC-7.4)', async () => {
    renderChat();

    const answer = await ask('Ringkas keluhan pekan ini');

    // Indonesian decimal comma for the latency figure, since US-8.
    expect(within(answer).getByText(/\d+ langkah · [\d,]+ s ·\s*Rp \d+/)).toBeInTheDocument();
  });

  it('tags the sources the answer stands on', async () => {
    renderChat();

    const answer = await ask('Ringkas keluhan pekan ini');
    // Scoped to the chips: the "Lihat N review" action matches the same words.
    const chips = answer.querySelector('.citation-chips');

    expect(within(chips).getByText(/\d+ review/)).toBeInTheDocument();
  });

  it('renders the full numbered trace panel below the conversation', async () => {
    renderChat();
    await ask('Ringkas keluhan pekan ini');

    const panel = screen.getByText('Langkah kerja agen, lengkap').closest('.panel');

    await waitFor(() => expect(within(panel).getAllByText(/\d+ ms/).length).toBeGreaterThan(0));
    expect(within(panel).getByText('supervisor.route')).toBeInTheDocument();
  });

  it('accumulates the conversation cost across answers', async () => {
    renderChat();
    await ask('Ringkas keluhan pekan ini');

    const costPanel = screen.getByText('Biaya percakapan ini').closest('.panel');

    expect(within(costPanel).getByText(/^Rp \d+$/)).toBeInTheDocument();
    expect(within(costPanel).getByText(/1 jawaban/)).toBeInTheDocument();
  });

  it('says plainly when it refuses, and shows no source tags', async () => {
    const source = createSeededAgentSource();
    const original = source.ask;
    source.ask = async (question) => ({
      ...(await original(question)),
      refused: true,
      answer: 'Tidak ada di dokumen.',
      sourceSummary: [],
    });

    renderChat(source);
    const answer = await ask('Pertanyaan tanpa sumber');

    expect(answer.textContent).toMatch(/Tidak ada di dokumen/);
    expect(within(answer).getByText(/agen memilih tidak menjawab/)).toBeInTheDocument();
  });

  it('merges the location agent findings into the answer', async () => {
    renderChat();

    const answer = await ask('Kenapa rating cabang Bekasi Timur turun bulan ini?');

    // All three agents now contribute; the location one scores the site.
    expect(answer.textContent).toMatch(/Skor lokasi Bekasi Timur/);
    expect(within(answer).getByText(/bq.locationScore/)).toBeInTheDocument();
  });

  it('offers the suggested questions and asks one on click', async () => {
    renderChat();

    await userEvent.click(screen.getByRole('button', { name: 'Ringkas keluhan pekan ini' }));

    expect(await screen.findByRole('article', { name: 'Jawaban agen' })).toBeInTheDocument();
  });

  it('shows an empty trace panel before anything is asked', () => {
    renderChat();

    expect(screen.getByText('Belum ada langkah tercatat')).toBeInTheDocument();
    expect(screen.getByText('Belum ada biaya')).toBeInTheDocument();
  });

  it('reports a failure without losing the conversation', async () => {
    const source = createSeededAgentSource();
    source.ask = async () => {
      throw new Error('Agen tidak menjawab.');
    };

    renderChat(source);
    await userEvent.type(screen.getByLabelText('Pertanyaan untuk agen'), 'apa saja');
    await userEvent.click(screen.getByRole('button', { name: /Kirim/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Agen tidak menjawab.');
  });

  it('ignores an empty question', async () => {
    renderChat();

    await userEvent.click(screen.getByRole('button', { name: /Kirim/ }));

    expect(screen.queryByRole('article', { name: 'Jawaban agen' })).not.toBeInTheDocument();
  });
});
