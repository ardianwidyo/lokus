import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { App } from '../src/App.jsx';
import { createSeededSessionSource } from '../src/data/sessionSource.js';
import { ACTIVE_TENANT_KEY } from '../src/data/tenantCache.js';
import { THEME_STORAGE_KEY, applyDocumentTheme, readTheme, writeTheme } from '../src/theme/index.js';

const signIn = (role = 'manager') =>
  window.sessionStorage.setItem(
    ACTIVE_TENANT_KEY,
    JSON.stringify({ tenantId: 'nusa-retail', name: 'Nusa Retail', outletCount: 42, area: 'Jabodetabek', role }),
  );

/** Stubs `matchMedia` the way jsdom does not, for the system-preference default. */
function stubPrefersDark(matches) {
  const original = globalThis.matchMedia;
  globalThis.matchMedia = (query) => ({ media: query, matches });
  return () => {
    globalThis.matchMedia = original;
  };
}

describe('theme persistence, mirroring i18n.test.jsx "locale persistence"', () => {
  it('round-trips through storage', () => {
    const store = new Map();
    const storage = {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value),
    };

    writeTheme('dark', storage);
    expect(readTheme(storage)).toBe('dark');
    expect(store.get(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('falls back to the system preference for a value it has never seen', () => {
    const storage = { getItem: () => null, setItem: () => {} };
    const restore = stubPrefersDark(true);
    try {
      expect(readTheme(storage)).toBe('dark');
    } finally {
      restore();
    }
  });

  it('falls back to light when there is no system preference signal', () => {
    const storage = { getItem: () => null, setItem: () => {} };
    const restore = stubPrefersDark(false);
    try {
      expect(readTheme(storage)).toBe('light');
    } finally {
      restore();
    }
  });

  it('falls back rather than trusting a stale or hand-edited value', () => {
    const storage = { getItem: () => 'sepia', setItem: () => {} };
    const restore = stubPrefersDark(false);
    try {
      expect(readTheme(storage)).toBe('light');
    } finally {
      restore();
    }
  });

  it('does not throw when storage is unavailable', () => {
    const storage = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };

    expect(() => readTheme(storage)).not.toThrow();
    expect(() => writeTheme('dark', storage)).not.toThrow();
  });

  it('sets <html data-theme> to the normalised value', () => {
    const doc = { documentElement: { dataset: {} } };
    applyDocumentTheme('dark', doc);
    expect(doc.documentElement.dataset.theme).toBe('dark');

    // An unrecognised value normalises to the default rather than reaching the DOM verbatim.
    applyDocumentTheme('sepia', doc);
    expect(doc.documentElement.dataset.theme).toBe('light');
  });
});

describe('the theme switcher, mirroring i18n.test.jsx "the language switcher"', () => {
  let restoreMatchMedia;

  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    restoreMatchMedia = stubPrefersDark(false);
  });

  afterEach(() => {
    restoreMatchMedia();
    document.documentElement.removeAttribute('data-theme');
  });

  it('offers exactly light and dark, defaulting to light with no stored or system preference', async () => {
    signIn();
    window.history.pushState({}, '', '/briefing');
    render(<App sessionSource={createSeededSessionSource()} />);

    const group = screen.getAllByRole('radiogroup', { name: 'Tema konsol' })[0];
    const options = within(group).getAllByRole('radio');

    expect(options).toHaveLength(2);
    expect(options.find((o) => o.checked).value).toBe('light');
  });

  it('sets <html data-theme> immediately on choosing dark', async () => {
    signIn();
    window.history.pushState({}, '', '/briefing');
    render(<App sessionSource={createSeededSessionSource()} />);

    expect(document.documentElement.dataset.theme).toBe('light');

    const dark = screen.getAllByRole('radio', { name: 'Tema gelap' })[0];
    await userEvent.click(dark);

    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('persists the choice across a reload', async () => {
    signIn();
    window.history.pushState({}, '', '/briefing');
    const first = render(<App sessionSource={createSeededSessionSource()} />);

    await userEvent.click(screen.getAllByRole('radio', { name: 'Tema gelap' })[0]);
    expect(document.documentElement.dataset.theme).toBe('dark');

    first.unmount();

    render(<App sessionSource={createSeededSessionSource()} />);
    expect(document.documentElement.dataset.theme).toBe('dark');
    const group = screen.getAllByRole('radiogroup', { name: 'Tema konsol' })[0];
    expect(within(group).getAllByRole('radio').find((o) => o.checked).value).toBe('dark');
  });

  it('is reachable from a screen with no rail, below 900px, same as the language switch', async () => {
    signIn();
    window.history.pushState({}, '', '/briefing');
    const { container } = render(<App sessionSource={createSeededSessionSource()} />);

    // Both mounts exist in the DOM; CSS toggles which is visible at which
    // breakpoint (see shell.css ".header-theme"), so this checks reachability.
    const switches = container.querySelectorAll('.theme-switch');
    expect(switches.length).toBeGreaterThanOrEqual(2);
  });

  it('does not follow the reader across tenants, same as the console language (AC-8.5 pattern)', async () => {
    signIn();
    window.history.pushState({}, '', '/briefing');
    render(<App sessionSource={createSeededSessionSource()} />);

    await userEvent.click(screen.getAllByRole('radio', { name: 'Tema gelap' })[0]);
    expect(readTheme()).toBe('dark');
  });
});
