import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '../src/App.jsx';
import { createSeededAgentSource } from '../src/data/agentSource.js';
import { createSeededLocationSource } from '../src/data/locationSource.js';
import { createSeededSessionSource } from '../src/data/sessionSource.js';
import { ACTIVE_TENANT_KEY } from '../src/data/tenantCache.js';

const renderScout = async ({ role = 'manager', locationSource = null, agentSource = null } = {}) => {
  window.sessionStorage.setItem(
    ACTIVE_TENANT_KEY,
    JSON.stringify({ tenantId: 'nusa-retail', name: 'Nusa Retail', outletCount: 42, area: 'Jabodetabek', role }),
  );
  window.history.pushState({}, '', '/site-scout');
  const utils = render(
    <App
      sessionSource={createSeededSessionSource()}
      locationSource={locationSource ?? createSeededLocationSource()}
      agentSource={agentSource ?? createSeededAgentSource()}
    />,
  );
  // The panel kicker renders in the loading state too, so waiting on it would
  // let assertions run before any candidate exists. Wait for real content.
  await screen.findByText(/Peringkat 1|Tidak ada kandidat yang lolos|Site Scout tak bisa dimuat/, {}, { timeout: 4000 });
  return utils;
};

const cards = () => [...document.querySelectorAll('.scout-card')];

describe('Screen 08 · Site Scout (T035)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('shows the request and what the scan actually covered', async () => {
    await renderScout();

    expect(screen.getByText(/minimal 1,2 km dari cabang kami sendiri/)).toBeInTheDocument();
    expect(screen.getByText('POI dianalisis')).toBeInTheDocument();
    expect(screen.getByText('Lolos filter')).toBeInTheDocument();
  });

  it('ranks three candidates, best first, with the top one marked', async () => {
    await renderScout();
    const found = cards();

    expect(found).toHaveLength(3);
    expect(found[0]).toHaveClass('is-top');
    expect(within(found[0]).getByText('Peringkat 1')).toBeInTheDocument();

    const scores = found.map((card) => Number(card.querySelector('.scout-score').textContent));
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it('shows the four candidate factors, including cannibalisation', async () => {
    await renderScout();
    const [best] = cards();

    for (const label of ['Lalu lintas pejalan', 'Bauran kategori', 'Pesaing', 'Kanibalisasi']) {
      expect(within(best).getByText(new RegExp(label))).toBeInTheDocument();
    }
  });

  it('marks which factors are measured and which surveyed', async () => {
    await renderScout();
    const [best] = cards();

    expect(within(best).getAllByText(/· survei/)).toHaveLength(2);
    expect(within(best).getAllByText(/· terukur/)).toHaveLength(2);
  });

  it('writes reasoning that matches the candidate\'s own competitor count', async () => {
    await renderScout();

    for (const card of cards()) {
      const count = card.querySelectorAll('.factor-value')[2].textContent;
      expect(card.querySelector('.scout-reasoning').textContent.length).toBeGreaterThan(20);
      expect(count).toMatch(/^\d+$/);
    }
  });

  it('shows what the filter rejected, and why, instead of hiding it', async () => {
    await renderScout();

    const panel = screen.getByText('Ditolak filter').closest('.panel');

    expect(within(panel).getByText(/di bawah ambang 1,2 km/)).toBeInTheDocument();
    expect(within(panel).getByText(/skornya bagus/)).toBeInTheDocument();
  });

  it('raises a survey ticket owned by the expansion team', async () => {
    const agentSource = createSeededAgentSource();
    await renderScout({ agentSource });
    const [best] = cards();

    await userEvent.click(within(best).getByRole('button', { name: 'Jadikan tiket survei' }));

    expect(await screen.findByText(/Tiket T-\d+ dibuat untuk Tim Ekspansi/)).toBeInTheDocument();
    await waitFor(async () => {
      const tickets = await agentSource.tickets.list('nusa-retail');
      expect(tickets.some((t) => t.sourceInsightId.startsWith('site-scout-'))).toBe(true);
    });
  });

  it('lets a viewer compare but not raise a ticket (AC-6.3)', async () => {
    await renderScout({ role: 'viewer' });
    const [best] = cards();

    expect(within(best).getByRole('button', { name: 'Jadikan tiket survei' })).toBeDisabled();
    expect(within(best).getByRole('button', { name: 'Bandingkan' })).toBeEnabled();
  });

  it('carries the candidate into the comparison screen', async () => {
    await renderScout();
    const [best] = cards();

    await userEvent.click(within(best).getByRole('button', { name: 'Bandingkan' }));

    await waitFor(() => expect(window.location.pathname).toBe('/bandingkan'));
    expect(window.location.search).toMatch(/^\?a=/);
  });

  it('states where each number came from', async () => {
    await renderScout();

    expect(screen.getByText(/Kepadatan pesaing dihitung dari Places/)).toBeInTheDocument();
    expect(screen.getByText(/masih berupa survei/)).toBeInTheDocument();
  });

  it('shows the empty state when nothing clears the filter', async () => {
    const source = createSeededLocationSource();
    source.siteScout = async () => ({
      request: 'Cari kandidat',
      recommended: [],
      rejected: [],
      considered: 0,
      passedFilter: 0,
      poiCount: 0,
    });

    await renderScout({ locationSource: source });

    expect(screen.getByText('Tidak ada kandidat yang lolos')).toBeInTheDocument();
  });

  it('shows the error state with a retry', async () => {
    const source = createSeededLocationSource();
    source.siteScout = async () => {
      throw new Error('Layanan lokasi tidak menjawab.');
    };

    window.sessionStorage.setItem(
      ACTIVE_TENANT_KEY,
      JSON.stringify({ tenantId: 'nusa-retail', name: 'Nusa Retail', role: 'manager' }),
    );
    window.history.pushState({}, '', '/site-scout');
    render(
      <App sessionSource={createSeededSessionSource()} locationSource={source} />,
    );

    const title = await screen.findByText('Site Scout tak bisa dimuat');
    expect(title.closest('.panel')).toHaveAttribute('data-status', 'error');
  });
});
