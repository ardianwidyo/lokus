import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '../src/App.jsx';
import { createSeededBriefingSource } from '../src/data/briefingSource.js';
import { createSeededSessionSource } from '../src/data/sessionSource.js';
import { ACTIVE_TENANT_KEY } from '../src/data/tenantCache.js';

const renderBriefing = async ({ role = 'manager', briefingSource = null } = {}) => {
  window.sessionStorage.setItem(
    ACTIVE_TENANT_KEY,
    JSON.stringify({ tenantId: 'nusa-retail', name: 'Nusa Retail', outletCount: 42, area: 'Jabodetabek', role }),
  );
  window.history.pushState({}, '', '/briefing');
  const utils = render(
    <App
      sessionSource={createSeededSessionSource()}
      briefingSource={briefingSource ?? createSeededBriefingSource()}
    />,
  );
  await screen.findByText('Semalam di jaringan Anda');
  return utils;
};

const decisions = () => screen.getAllByText(/^Keputusan \d$/).map((tag) => tag.closest('.decision'));

describe('Screen 02 · Briefing Pagi (AC-1.2, AC-1.3, AC-1.4)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('shows the overnight timeline from 23.00 to the 06.00 handover (AC-1.4)', async () => {
    await renderBriefing();

    expect(screen.getByText('23.02')).toBeInTheDocument();
    expect(screen.getByText('06.00')).toBeInTheDocument();
    expect(screen.getByText('Briefing diserahkan')).toBeInTheDocument();
  });

  it('reports real counts on the timeline rather than template numbers', async () => {
    await renderBriefing();

    expect(screen.getByText(/Agen Reputasi membaca \d+ review baru/)).toBeInTheDocument();
    expect(screen.getByText(/\d+ cabang · \d+ tema terdeteksi/)).toBeInTheDocument();
  });

  it('says on the timeline which agent did not run', async () => {
    await renderBriefing();

    expect(screen.getByText('Agen Lokasi tidak dijalankan')).toBeInTheDocument();
  });

  it('surfaces at most three decisions', async () => {
    await renderBriefing();

    expect(decisions().length).toBeGreaterThan(0);
    expect(decisions().length).toBeLessThanOrEqual(3);
  });

  it('gives each decision its evidence and a proposed action (AC-1.2)', async () => {
    await renderBriefing();
    const [first] = decisions();

    expect(within(first).getByText(/\d+ keluhan/)).toBeInTheDocument();
    expect(within(first).getByText(/[Uu]sulan agen/)).toBeInTheDocument();
    expect(within(first).getByRole('button', { name: /Setujui & buat tiket/ })).toBeInTheDocument();
  });

  it('creates a ticket with an owner and a due date when approved (AC-1.3)', async () => {
    await renderBriefing();
    const [first] = decisions();

    await userEvent.click(within(first).getByRole('button', { name: /Setujui & buat tiket/ }));

    expect(
      await screen.findByText(/Tiket T-\d+ dibuat · pemilik .+ · tenggat/),
    ).toBeInTheDocument();
  });

  it('links the ticket back to the decision that produced it', async () => {
    const source = createSeededBriefingSource();
    await renderBriefing({ briefingSource: source });
    const [first] = decisions();

    await userEvent.click(within(first).getByRole('button', { name: /Setujui & buat tiket/ }));

    await waitFor(async () => {
      const tickets = await source.tickets.list('nusa-retail');
      expect(tickets).toHaveLength(1);
      expect(tickets[0].sourceKind).toBe('briefing_decision');
      expect(tickets[0].sourceInsightId).toMatch(/^decision-/);
    });
  });

  it('shows the network metrics computed from the same review set', async () => {
    await renderBriefing();

    expect(screen.getByText('Rating jaringan')).toBeInTheDocument();
    expect(screen.getByText(/rata-rata \d+ review dalam 8 pekan/)).toBeInTheDocument();
  });

  it('stops a viewer from approving and explains why (AC-6.3)', async () => {
    await renderBriefing({ role: 'viewer' });
    const [first] = decisions();

    expect(within(first).getByRole('button', { name: /Setujui & buat tiket/ })).toBeDisabled();
    expect(within(first).getByText(/Peran Anda hanya bisa membaca/)).toBeInTheDocument();
  });

  it('reports a ticket failure instead of claiming success', async () => {
    const source = createSeededBriefingSource();
    source.approveDecision = async () => {
      throw new Error('Tiket gagal dibuat.');
    };

    await renderBriefing({ briefingSource: source });
    const [first] = decisions();

    await userEvent.click(within(first).getByRole('button', { name: /Setujui & buat tiket/ }));

    expect(await screen.findByText('Tiket gagal dibuat.')).toBeInTheDocument();
  });

  it('shows the error state with a retry when the cycle cannot be read', async () => {
    const source = createSeededBriefingSource();
    source.briefing = async () => {
      throw new Error('Siklus semalam tidak menjawab.');
    };

    window.sessionStorage.setItem(
      ACTIVE_TENANT_KEY,
      JSON.stringify({ tenantId: 'nusa-retail', name: 'Nusa Retail', role: 'manager' }),
    );
    window.history.pushState({}, '', '/briefing');
    render(<App sessionSource={createSeededSessionSource()} briefingSource={source} />);

    const title = await screen.findByText('Briefing tak bisa dimuat');
    expect(title.closest('.panel')).toHaveAttribute('data-status', 'error');
    expect(within(title.closest('.panel')).getByRole('button', { name: 'Coba lagi' })).toBeInTheDocument();
  });
});
