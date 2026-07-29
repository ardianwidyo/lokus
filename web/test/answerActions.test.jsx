import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '../src/App.jsx';
import { createSeededAgentSource } from '../src/data/agentSource.js';
import { createSeededSessionSource } from '../src/data/sessionSource.js';
import { ACTIVE_TENANT_KEY } from '../src/data/tenantCache.js';

const renderChat = ({ role = 'manager', agentSource = null } = {}) => {
  window.sessionStorage.setItem(
    ACTIVE_TENANT_KEY,
    JSON.stringify({ tenantId: 'nusa-retail', name: 'Nusa Retail', outletCount: 42, area: 'Jabodetabek', role }),
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

const actions = (answer) => within(answer).getByRole('group', { name: 'Tindakan untuk jawaban ini' });

describe('Answer actions (AC-7.3)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('offers a ticket, the reviews, and the map for a branch diagnosis', async () => {
    renderChat();

    const answer = await ask('Kenapa rating cabang Bekasi Timur turun bulan ini?');
    const group = actions(answer);

    expect(within(group).getByRole('button', { name: /Buat tiket ke manajer Bekasi Timur/ })).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: /Lihat \d+ review/ })).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: 'Tunjukkan di peta' })).toBeInTheDocument();
  });

  it('creates a ticket and reports its id, owner and due date', async () => {
    renderChat();
    const answer = await ask('Kenapa rating cabang Bekasi Timur turun bulan ini?');

    await userEvent.click(within(actions(answer)).getByRole('button', { name: /Buat tiket/ }));

    expect(await screen.findByText(/Tiket T-\d+ dibuat untuk Dwi Kurnia · tenggat/)).toBeInTheDocument();
  });

  it('stores the ticket against the run that produced it', async () => {
    const source = createSeededAgentSource();
    renderChat({ agentSource: source });
    const answer = await ask('Kenapa rating cabang Bekasi Timur turun bulan ini?');

    await userEvent.click(within(actions(answer)).getByRole('button', { name: /Buat tiket/ }));

    await waitFor(async () => {
      const tickets = await source.tickets.list('nusa-retail');
      expect(tickets).toHaveLength(1);
      expect(tickets[0].sourceInsightId).toMatch(/^run-/);
      expect(tickets[0].sourceKind).toBe('agent_run');
    });
  });

  it('navigates to the review inbox', async () => {
    renderChat();
    const answer = await ask('Kenapa rating cabang Bekasi Timur turun bulan ini?');

    await userEvent.click(within(actions(answer)).getByRole('button', { name: /Lihat \d+ review/ }));

    await waitFor(() => expect(window.location.pathname).toBe('/review'));
  });

  it('navigates to the map centred on the branch it diagnosed', async () => {
    renderChat();
    const answer = await ask('Kenapa rating cabang Bekasi Timur turun bulan ini?');

    await userEvent.click(within(actions(answer)).getByRole('button', { name: 'Tunjukkan di peta' }));

    await waitFor(() => expect(window.location.pathname).toBe('/peta'));
    expect(window.location.search).toBe('?outlet=BKS-02');
  });

  it('offers the knowledge-gap route when the agent refused', async () => {
    const source = createSeededAgentSource();
    const original = source.ask;
    source.ask = async (question) => ({
      ...(await original(question)),
      refused: true,
      answer: 'Tidak ada di dokumen.',
      sourceSummary: [],
      sources: [],
    });

    renderChat({ agentSource: source });
    const answer = await ask('Pertanyaan tanpa sumber');
    const group = actions(answer);

    expect(within(group).getByRole('button', { name: 'Laporkan celah pengetahuan' })).toBeInTheDocument();
    expect(within(group).queryByRole('button', { name: /Buat tiket/ })).not.toBeInTheDocument();
  });

  it('lets a viewer navigate but not create a ticket (AC-6.3)', async () => {
    renderChat({ role: 'viewer' });
    const answer = await ask('Kenapa rating cabang Bekasi Timur turun bulan ini?');
    const group = actions(answer);

    expect(within(group).getByRole('button', { name: /Buat tiket/ })).toBeDisabled();
    expect(within(group).getByRole('button', { name: 'Tunjukkan di peta' })).toBeEnabled();
  });

  it('reports a ticket failure instead of pretending it worked', async () => {
    const source = createSeededAgentSource();
    source.createTicket = async () => {
      throw new Error('Tiket gagal dibuat.');
    };

    renderChat({ agentSource: source });
    const answer = await ask('Kenapa rating cabang Bekasi Timur turun bulan ini?');

    await userEvent.click(within(actions(answer)).getByRole('button', { name: /Buat tiket/ }));

    expect(await screen.findByText('Tiket gagal dibuat.')).toBeInTheDocument();
  });
});
