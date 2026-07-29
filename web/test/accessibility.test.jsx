import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { App } from '../src/App.jsx';
import { SCREENS } from '../src/app/screens.js';
import { createSeededAdminSource } from '../src/data/adminSource.js';
import { createSeededAgentSource } from '../src/data/agentSource.js';
import { createSeededBriefingSource } from '../src/data/briefingSource.js';
import { createSeededReputationSource } from '../src/data/reputationSource.js';
import { createSeededSessionSource } from '../src/data/sessionSource.js';
import { ACTIVE_TENANT_KEY } from '../src/data/tenantCache.js';
import { contrastRatio, parseColor } from '../src/lib/contrast.js';

/**
 * T056 — the accessibility pass, asserted rather than performed once.
 *
 * jsdom has no layout engine, so this cannot measure rendered pixel sizes. It
 * checks the things that are actually decidable from the DOM and the token
 * values: semantic structure, accessible names, keyboard reachability, and
 * text contrast computed from design/tokens.css.
 */

const BUILT = ['masuk', 'briefing', 'peta', 'site-scout', 'review', 'draft', 'tema', 'chat', 'tindakan', 'admin'];

const signIn = (role = 'manager') =>
  window.sessionStorage.setItem(
    ACTIVE_TENANT_KEY,
    JSON.stringify({ tenantId: 'nusa-retail', name: 'Nusa Retail', outletCount: 42, area: 'Jabodetabek', role }),
  );

let shared;

beforeAll(() => {
  shared = {
    sessionSource: createSeededSessionSource(),
    reputationSource: createSeededReputationSource(),
    agentSource: createSeededAgentSource(),
    briefingSource: createSeededBriefingSource(),
    adminSource: createSeededAdminSource(),
  };
});

const renderScreen = (path) => {
  window.history.pushState({}, '', path);
  return render(<App {...shared} />);
};

describe('T056 · accessibility', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it.each(BUILT)('screen %s has exactly one h1, naming the screen', async (id) => {
    signIn();
    const screenDef = SCREENS.find((s) => s.id === id);
    renderScreen(screenDef.path);

    await waitFor(() => expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(screenDef.title);
  });

  it.each(BUILT)('screen %s gives every button and link an accessible name', async (id) => {
    signIn();
    renderScreen(SCREENS.find((s) => s.id === id).path);
    await waitFor(() => expect(document.querySelectorAll('.panel').length).toBeGreaterThan(0));

    for (const el of screen.queryAllByRole('button').concat(screen.queryAllByRole('link'))) {
      const name = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim();
      expect(name.length, `${id}: an interactive element has no accessible name`).toBeGreaterThan(0);
    }
  });

  it('marks the rail and the bottom nav as distinct landmarks', async () => {
    signIn();
    renderScreen('/briefing');

    expect(screen.getByRole('navigation', { name: 'Navigasi layar' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Navigasi utama' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('marks the current screen with aria-current, not colour alone', async () => {
    signIn();
    renderScreen('/tema');

    // The rail carries all 14 screens; the bottom nav only its four, and
    // "Analisis tema" is not one of them.
    const current = screen.getAllByRole('link', { current: 'page' });

    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent('Analisis tema');
  });

  it('marks the current screen in both navs when it appears in both', async () => {
    signIn();
    renderScreen('/review');

    const current = screen.getAllByRole('link', { current: 'page' });

    expect(current).toHaveLength(2);
    expect(current.map((el) => el.textContent.trim())).toEqual(
      expect.arrayContaining([expect.stringContaining('Kotak masuk review'), 'Review']),
    );
  });

  it('hides decorative marks from assistive technology', async () => {
    signIn();
    renderScreen('/briefing');
    await screen.findByText('Semalam di jaringan Anda');

    // Blueprint registration corners and timeline markers carry no meaning.
    for (const corner of document.querySelectorAll('.corner, .timeline-mark, .decision-mark')) {
      expect(corner).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('labels the review list as a listbox with selectable options', async () => {
    signIn();
    renderScreen('/review');

    const list = await screen.findByRole('listbox', { name: 'Daftar review' });

    // The rows render before the effect that selects the first one, so there
    // is a real frame with no selection. Wait for it to settle rather than
    // asserting into the gap.
    await waitFor(() =>
      expect(
        within(list)
          .getAllByRole('option')
          .filter((o) => o.getAttribute('aria-selected') === 'true'),
      ).toHaveLength(1),
    );
    expect(within(list).getAllByRole('option').length).toBeGreaterThan(0);
  });

  it('reaches the review list by keyboard alone', async () => {
    signIn();
    renderScreen('/review');
    const list = await screen.findByRole('listbox', { name: 'Daftar review' });

    // Same settling wait: without it the first arrow press lands on index 0
    // instead of moving from it.
    await waitFor(() =>
      expect(within(list).getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true'),
    );

    // The list is a single tab stop; arrows move within it, which is the
    // pattern a listbox is supposed to follow.
    expect(list).toHaveAttribute('tabIndex', '0');

    list.focus();
    await userEvent.keyboard('{ArrowDown}');

    expect(within(list).getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('gives the chat composer a real label', async () => {
    signIn();
    renderScreen('/chat');

    expect(screen.getByLabelText('Pertanyaan untuk agen')).toBeInTheDocument();
  });

  it('announces loading and errors to screen readers', async () => {
    signIn();
    render(
      <App
        {...shared}
        briefingSource={{ ...shared.briefingSource, briefing: () => new Promise(() => {}) }}
      />,
    );
    window.history.pushState({}, '', '/briefing');

    const status = await screen.findByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('gives the theme matrix a caption and row headers', async () => {
    signIn();
    renderScreen('/tema');

    const table = await screen.findByRole('table');

    expect(within(table).getAllByRole('rowheader').length).toBeGreaterThan(0);
    expect(table.querySelector('caption')).not.toBeNull();
  });

  it('describes each sparkline, which is otherwise invisible to a reader', async () => {
    signIn();
    renderScreen('/tema');
    await screen.findByRole('table');

    const sparklines = screen.getAllByRole('img');

    expect(sparklines.length).toBeGreaterThan(0);
    expect(sparklines[0]).toHaveAccessibleName(/tren 8 pekan/i);
  });
});

describe('T056 · contrast of body copy on its background', () => {
  // Values read from design/tokens.css. WCAG 2.2 AA: 4.5:1 for body text,
  // 3:1 for large text and UI chrome.
  const BG = '#f2f2f3';
  const ACCENT_100 = '#eef6ff';
  const ACCENT_900 = '#1d2d3d';

  it.each([
    ['body text on ground', '#1d1f20', BG],
    ['secondary text on ground', '#5d5d60', BG],
    ['accent text on ground', '#416180', BG],
    ['decision body on accent tint', ACCENT_900, ACCENT_100],
    ['accent text on accent tint', '#416180', ACCENT_100],
    ['ground text on dark accent', BG, ACCENT_900],
  ])('%s clears 4.5:1', (_label, fg, bg) => {
    expect(contrastRatio(parseColor(fg), parseColor(bg))).toBeGreaterThanOrEqual(4.5);
  });

  it('confirms the base accent is only safe for chrome, not body copy', () => {
    // design/UI-GUIDELINES.md says exactly this, which is why body-sized accent
    // text uses --color-accent-700 everywhere instead.
    const ratio = contrastRatio(parseColor('#5980a6'), parseColor(BG));

    expect(ratio).toBeLessThan(4.5);
    expect(ratio).toBeGreaterThanOrEqual(3);
  });

  it.each([
    ['neutral tag text', '#424244', '#f5f5f8'],
    ['accent tag text', '#2c455d', ACCENT_100],
  ])('%s clears 4.5:1', (_label, fg, bg) => {
    expect(contrastRatio(parseColor(fg), parseColor(bg))).toBeGreaterThanOrEqual(4.5);
  });
});
