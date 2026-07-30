import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '../src/App.jsx';
import { BOTTOM_NAV_IDS, SCREENS, screenNumber } from '../src/app/screens.js';
import { WEB_MESSAGES } from '../src/i18n/index.js';
import { ACTIVE_TENANT_KEY } from '../src/data/tenantCache.js';

describe('screen registry', () => {
  it('has exactly the 14 screens design/SCREENS.md lists', () => {
    expect(SCREENS).toHaveLength(14);
  });

  it('numbers them 01 to 14 in rail order', () => {
    expect(SCREENS.map(screenNumber)).toEqual([
      '01', '02', '03', '04', '05', '06', '07',
      '08', '09', '10', '11', '12', '13', '14',
    ]);
  });

  it('gives every screen a unique path and a subtitle in both languages', () => {
    const paths = SCREENS.map((s) => s.path);

    expect(new Set(paths).size).toBe(14);

    for (const locale of ['id', 'en']) {
      const dict = WEB_MESSAGES[locale].screen;
      expect(
        SCREENS.every(
          (s) => dict[s.id]?.title && dict[s.id]?.subtitle && dict[s.id]?.railLabel,
        ),
      ).toBe(true);
    }
  });

  it('draws the bottom nav from real screens', () => {
    const ids = SCREENS.map((s) => s.id);

    expect(BOTTOM_NAV_IDS).toHaveLength(4);
    expect(BOTTOM_NAV_IDS.every((id) => ids.includes(id))).toBe(true);
  });
});

describe('AppShell', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/masuk');
    window.sessionStorage.clear();
    // These assert the shell's chrome — rail, header, navigation — not the
    // tenant gate. Without a tenant every screen but 01 now redirects to 01
    // (T063), so the shell would never be seen on the screens under test.
    window.sessionStorage.setItem(
      ACTIVE_TENANT_KEY,
      JSON.stringify({ tenantId: 'nusa-retail', name: 'Nusa Retail', outletCount: 42, role: 'manager' }),
    );
  });

  /** Screen 01 loads its tenant list on mount; settle it before asserting. */
  const renderApp = async () => {
    const utils = render(<App />);
    await act(async () => {});
    return utils;
  };

  it('renders all 14 rail items, numbered', async () => {
    await renderApp();

    const rail = screen.getByRole('navigation', { name: 'Navigasi layar' });
    const items = within(rail).getAllByRole('link');

    expect(items).toHaveLength(14);
    expect(items[0]).toHaveTextContent('01Masuk');
    expect(items[13]).toHaveTextContent('14Admin & biaya');
  });

  it('marks the current screen in the rail', async () => {
    await renderApp();

    const current = screen
      .getByRole('navigation', { name: 'Navigasi layar' })
      .querySelector('[aria-current="page"]');

    expect(current).toHaveTextContent('Masuk');
    expect(current).toHaveClass('is-active');
  });

  it('shows the screen number, title and subtitle in the header', async () => {
    window.history.pushState({}, '', '/briefing');
    await renderApp();

    expect(screen.getByText('Layar 02')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Briefing Pagi');
    expect(
      screen.getByText(
        'Hasil siklus agen tadi malam, disaring jadi keputusan yang perlu Anda ambil.',
      ),
    ).toBeInTheDocument();
  });

  it('navigates between screens and updates the URL', async () => {
    await renderApp();

    await userEvent.click(screen.getByRole('link', { name: /Kotak masuk review/ }));

    expect(window.location.pathname).toBe('/review');
    expect(await screen.findByText('Layar 05')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Kotak masuk review');
  });

  it('follows browser back', async () => {
    await renderApp();

    await userEvent.click(screen.getByRole('link', { name: /Chat agen/ }));
    expect(screen.getByText('Layar 10')).toBeInTheDocument();

    window.history.back();
    await screen.findByText('Layar 01');

    expect(window.location.pathname).toBe('/masuk');
  });

  it('falls back to the first screen for an unknown path', async () => {
    window.history.pushState({}, '', '/tidak-ada');
    await renderApp();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Masuk & pilih tenant');
  });

  it('hides the agent-run action on screen 01, where no tenant is selected yet', async () => {
    await renderApp();

    expect(screen.queryByRole('button', { name: /Jalankan agen/ })).not.toBeInTheDocument();
  });

  it('shows the agent-run action on the other screens', async () => {
    window.history.pushState({}, '', '/briefing');
    await renderApp();

    expect(screen.getByRole('button', { name: /Jalankan agen/ })).toBeInTheDocument();
  });

  it('renders the four-item bottom nav for small screens', async () => {
    await renderApp();

    const nav = screen.getByRole('navigation', { name: 'Navigasi utama' });

    expect(within(nav).getAllByRole('link')).toHaveLength(4);
    expect(nav).toHaveTextContent('Briefing');
    expect(nav).toHaveTextContent('Peta');
    expect(nav).toHaveTextContent('Review');
    expect(nav).toHaveTextContent('Agen');
  });

  it('says no tenant is selected until screen 01 picks one', async () => {
    // The one case here that genuinely wants the unchosen state, so it undoes
    // the tenant the other shell tests need.
    window.sessionStorage.clear();
    await renderApp();

    expect(screen.getByText('Belum ada tenant')).toBeInTheDocument();
    // And it stays on screen 01 rather than redirecting to itself.
    expect(window.location.pathname).toBe('/masuk');
  });

});
