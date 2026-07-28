import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '../src/App.jsx';
import { BOTTOM_NAV_IDS, SCREENS, screenNumber } from '../src/app/screens.js';

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

  it('gives every screen a unique path and a subtitle', () => {
    const paths = SCREENS.map((s) => s.path);

    expect(new Set(paths).size).toBe(14);
    expect(SCREENS.every((s) => s.title && s.subtitle && s.railLabel)).toBe(true);
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
  });

  it('renders all 14 rail items, numbered', () => {
    render(<App />);

    const rail = screen.getByRole('navigation', { name: 'Navigasi layar' });
    const items = within(rail).getAllByRole('link');

    expect(items).toHaveLength(14);
    expect(items[0]).toHaveTextContent('01Masuk');
    expect(items[13]).toHaveTextContent('14Admin & biaya');
  });

  it('marks the current screen in the rail', () => {
    render(<App />);

    const current = screen
      .getByRole('navigation', { name: 'Navigasi layar' })
      .querySelector('[aria-current="page"]');

    expect(current).toHaveTextContent('Masuk');
    expect(current).toHaveClass('is-active');
  });

  it('shows the screen number, title and subtitle in the header', () => {
    window.history.pushState({}, '', '/briefing');
    render(<App />);

    expect(screen.getByText('Layar 02')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Briefing Pagi');
    expect(
      screen.getByText(
        'Hasil siklus agen tadi malam, disaring jadi keputusan yang perlu Anda ambil.',
      ),
    ).toBeInTheDocument();
  });

  it('navigates between screens and updates the URL', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('link', { name: /Kotak masuk review/ }));

    expect(window.location.pathname).toBe('/review');
    expect(screen.getByText('Layar 05')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Kotak masuk review');
  });

  it('follows browser back', async () => {
    render(<App />);

    await userEvent.click(screen.getByRole('link', { name: /Chat agen/ }));
    expect(screen.getByText('Layar 10')).toBeInTheDocument();

    window.history.back();
    await screen.findByText('Layar 01');

    expect(window.location.pathname).toBe('/masuk');
  });

  it('falls back to the first screen for an unknown path', () => {
    window.history.pushState({}, '', '/tidak-ada');
    render(<App />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Masuk & pilih tenant');
  });

  it('hides the agent-run action on screen 01, where no tenant is selected yet', () => {
    render(<App />);

    expect(screen.queryByRole('button', { name: /Jalankan agen/ })).not.toBeInTheDocument();
  });

  it('shows the agent-run action on the other screens', () => {
    window.history.pushState({}, '', '/briefing');
    render(<App />);

    expect(screen.getByRole('button', { name: /Jalankan agen/ })).toBeInTheDocument();
  });

  it('renders the four-item bottom nav for small screens', () => {
    render(<App />);

    const nav = screen.getByRole('navigation', { name: 'Navigasi utama' });

    expect(within(nav).getAllByRole('link')).toHaveLength(4);
    expect(nav).toHaveTextContent('Briefing');
    expect(nav).toHaveTextContent('Peta');
    expect(nav).toHaveTextContent('Review');
    expect(nav).toHaveTextContent('Agen');
  });

  it('says no tenant is selected until screen 01 picks one', () => {
    render(<App />);

    expect(screen.getByText('Belum ada tenant')).toBeInTheDocument();
  });

  it('gives every screen a data panel with a declared state', () => {
    // The four-state rule, checked across all 14 screens rather than trusted.
    for (const target of SCREENS) {
      window.history.pushState({}, '', target.path);
      const { container, unmount } = render(<App />);

      const panels = container.querySelectorAll('.panel[data-status]');
      expect(panels.length, `${target.path} has no data panel`).toBeGreaterThan(0);

      unmount();
    }
  });
});
