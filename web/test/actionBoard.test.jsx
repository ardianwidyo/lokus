import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '../src/App.jsx';
import { createSeededSessionSource } from '../src/data/sessionSource.js';
import { ACTIVE_TENANT_KEY } from '../src/data/tenantCache.js';

const signIn = (role = 'manager') =>
  window.sessionStorage.setItem(
    ACTIVE_TENANT_KEY,
    JSON.stringify({ tenantId: 'nusa-retail', name: 'Nusa Retail', outletCount: 42, area: 'Jabodetabek', role }),
  );

const renderBoard = async () => {
  signIn();
  window.history.pushState({}, '', '/tindakan');
  const utils = render(<App sessionSource={createSeededSessionSource()} />);
  await screen.findByRole('region', { name: 'Baru' });
  return utils;
};

const column = (label) => screen.getByRole('region', { name: label });

describe('Screen 13 · Papan tindakan', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('lays the board out in the four fixed columns', async () => {
    await renderBoard();

    for (const label of ['Baru', 'Dikerjakan', 'Menunggu', 'Selesai']) {
      expect(column(label)).toBeInTheDocument();
    }
  });

  it('places each ticket in the column matching its status', async () => {
    await renderBoard();

    expect(within(column('Baru')).getByText('T-119')).toBeInTheDocument();
    expect(within(column('Dikerjakan')).getByText('T-118')).toBeInTheDocument();
    expect(within(column('Menunggu')).getByText('T-120')).toBeInTheDocument();
    expect(within(column('Selesai')).getByText('T-114')).toBeInTheDocument();
  });

  it('names the insight every ticket came from', async () => {
    await renderBoard();
    const card = screen.getByText('T-118').closest('.ticket-card');

    expect(within(card).getByText(/dari keputusan briefing · insight-/)).toBeInTheDocument();
  });

  it('shows the measured impact on closed tickets', async () => {
    await renderBoard();
    const card = screen.getByText('T-114').closest('.ticket-card');

    expect(within(card).getByText(/keluhan antrean turun 18%/)).toBeInTheDocument();
    expect(within(card).getByText(/selesai dalam [\d,]+ hari/)).toBeInTheDocument();
  });

  it('shows owner and due date on open tickets', async () => {
    await renderBoard();
    const card = screen.getByText('T-118').closest('.ticket-card');

    expect(within(card).getByText(/Dwi Kurnia · tenggat/)).toBeInTheDocument();
  });

  it('reports average close time against the SLA', async () => {
    await renderBoard();

    expect(screen.getByText(/Rata-rata tiket selesai/)).toBeInTheDocument();
    expect(screen.getByText(/target 5 hari/)).toBeInTheDocument();
  });

  it('filters to tickets the agents raised', async () => {
    await renderBoard();
    const before = screen.getAllByText(/^T-\d+$/).length;

    await userEvent.click(screen.getByText(/^Dari agen/));

    await waitFor(() => expect(screen.getAllByText(/^T-\d+$/).length).toBeLessThan(before));
    expect(screen.queryByText('T-118')).not.toBeInTheDocument();
  });

  it('receives a ticket approved on the Briefing screen', async () => {
    // One shared store: a decision approved on screen 02 must appear here.
    signIn();
    window.history.pushState({}, '', '/briefing');
    render(<App sessionSource={createSeededSessionSource()} />);

    await screen.findByText('Semalam di jaringan Anda');
    const [decision] = screen.getAllByText(/^Keputusan \d$/).map((t) => t.closest('.decision'));
    await userEvent.click(within(decision).getByRole('button', { name: /Setujui & buat tiket/ }));
    const receipt = await screen.findByText(/Tiket T-\d+ dibuat/);
    const id = receipt.textContent.match(/T-\d+/)[0];

    await userEvent.click(screen.getByRole('link', { name: /Papan tindakan/ }));

    await screen.findByRole('region', { name: 'Baru' });
    expect(within(column('Baru')).getByText(id)).toBeInTheDocument();
  });
});
