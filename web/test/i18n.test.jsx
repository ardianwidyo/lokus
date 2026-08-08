import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '../src/App.jsx';
import { createSeededSessionSource } from '../src/data/sessionSource.js';
import { ACTIVE_TENANT_KEY } from '../src/data/tenantCache.js';
import {
  LOCALE_STORAGE_KEY,
  WEB_MESSAGES,
  applyDocumentLocale,
  readLocale,
  translate,
  writeLocale,
} from '../src/i18n/index.js';
import { splitTemplate } from '../src/i18n/Rich.jsx';
import { dictionaryParity } from '@lokus/core';

const signIn = (role = 'manager') =>
  window.sessionStorage.setItem(
    ACTIVE_TENANT_KEY,
    JSON.stringify({ tenantId: 'nusa-retail', name: 'Nusa Retail', outletCount: 42, area: 'Jabodetabek', role }),
  );

describe('T063 · the console dictionary (AC-8.6)', () => {
  it('has no key in one language that the other lacks', () => {
    const missing = dictionaryParity(WEB_MESSAGES);

    expect(missing).toEqual({ id: [], en: [] });
  });

  it('leaves no message blank in either language', () => {
    for (const locale of ['id', 'en']) {
      const blank = Object.keys(flatten(WEB_MESSAGES[locale])).filter(
        (key) => String(translate(locale, key)).trim() === '',
      );
      expect(blank).toEqual([]);
    }
  });

  it('names every screen’s title, subtitle and rail label in both languages', () => {
    // Guards against a screen id added to app/screens.js with no matching
    // dictionary entry — which would render the raw key on screen.
    const ids = [
      'masuk', 'briefing', 'peta', 'cabang', 'review', 'draft', 'tema',
      'site-scout', 'bandingkan', 'chat', 'pengetahuan', 'jawaban', 'tindakan', 'admin',
    ];

    for (const locale of ['id', 'en']) {
      for (const id of ids) {
        const entry = WEB_MESSAGES[locale].screen[id];
        expect(entry, `${locale}.screen.${id}`).toBeTruthy();
        expect(entry.title).toBeTruthy();
        expect(entry.subtitle).toBeTruthy();
        expect(entry.railLabel).toBeTruthy();
      }
    }
  });
});

function flatten(source, prefix = '') {
  const flat = {};
  for (const [key, value] of Object.entries(source)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(flat, flatten(value, path));
    } else {
      flat[path] = value;
    }
  }
  return flat;
}

describe('T063 · Rich, the mixed-node interpolation helper', () => {
  it('splits a template into text and named holes, in order', () => {
    expect(splitTemplate('a {x} b {y}')).toEqual([
      { text: 'a ', name: null },
      { text: null, name: 'x' },
      { text: ' b ', name: null },
      { text: null, name: 'y' },
    ]);
  });

  it('handles a hole at the very start and two adjacent holes', () => {
    expect(splitTemplate('{a}{b} tail')).toEqual([
      { text: null, name: 'a' },
      { text: null, name: 'b' },
      { text: ' tail', name: null },
    ]);
  });

  it('returns the whole string as one text part when there is no hole', () => {
    expect(splitTemplate('no holes here')).toEqual([{ text: 'no holes here', name: null }]);
  });
});

describe('T063 · locale persistence (AC-8.2)', () => {
  it('round-trips through storage, defaulting to Indonesian for a value it has never seen', () => {
    const store = new Map();
    const storage = {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value),
    };

    expect(readLocale(storage)).toBe('id');

    writeLocale('en', storage);
    expect(readLocale(storage)).toBe('en');
    expect(store.get(LOCALE_STORAGE_KEY)).toBe('en');
  });

  it('falls back to Indonesian for a stale or hand-edited value', () => {
    const storage = { getItem: () => 'fr', setItem: () => {} };
    expect(readLocale(storage)).toBe('id');
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

    expect(() => readLocale(storage)).not.toThrow();
    expect(readLocale(storage)).toBe('id');
    expect(() => writeLocale('en', storage)).not.toThrow();
  });

  it('sets <html lang> to the normalised locale', () => {
    const doc = { documentElement: { lang: '' } };
    applyDocumentLocale('en-GB', doc);
    expect(doc.documentElement.lang).toBe('en');
  });
});

describe('T063 · the language switcher (AC-8.1, AC-8.2, AC-8.3)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it('offers exactly Indonesian and English, defaulting to Indonesian', async () => {
    signIn();
    window.history.pushState({}, '', '/briefing');
    render(<App sessionSource={createSeededSessionSource()} />);

    const group = screen.getAllByRole('radiogroup', { name: 'Bahasa tampilan' })[0];
    const options = within(group).getAllByRole('radio');

    expect(options).toHaveLength(2);
    expect(options.find((o) => o.checked).value).toBe('id');
  });

  it('re-renders the console immediately and sets <html lang>', async () => {
    signIn();
    window.history.pushState({}, '', '/briefing');
    render(<App sessionSource={createSeededSessionSource()} />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Briefing Pagi');

    const english = screen.getAllByRole('radio', { name: 'English' })[0];
    await userEvent.click(english);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Morning Briefing');
    expect(document.documentElement.lang).toBe('en');
  });

  it('persists the choice across a reload', async () => {
    signIn();
    window.history.pushState({}, '', '/briefing');
    const first = render(<App sessionSource={createSeededSessionSource()} />);

    await userEvent.click(screen.getAllByRole('radio', { name: 'English' })[0]);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Morning Briefing');

    first.unmount();

    render(<App sessionSource={createSeededSessionSource()} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Morning Briefing');
  });

  it('formats numbers and dates in the chosen locale, never mixing the two (AC-8.3)', async () => {
    signIn();
    window.history.pushState({}, '', '/briefing');
    render(<App sessionSource={createSeededSessionSource()} />);

    await screen.findByText(/Rating jaringan/);
    // Indonesian: comma decimal.
    expect(document.querySelector('.metric-card .metric-value').textContent).toMatch(/^\d,\d\d$/);

    await userEvent.click(screen.getAllByRole('radio', { name: 'English' })[0]);

    await screen.findByText(/Network rating/);
    // English: dot decimal — and never a leftover Indonesian comma reading.
    expect(document.querySelector('.metric-card .metric-value').textContent).toMatch(/^\d\.\d\d$/);
  });

  it('is reachable from a screen with no rail, below 900px', async () => {
    signIn();
    window.history.pushState({}, '', '/briefing');
    const { container } = render(<App sessionSource={createSeededSessionSource()} />);

    // Both mounts exist in the DOM; CSS toggles which is visible at which
    // breakpoint. jsdom applies no layout, so this checks reachability rather
    // than visibility — the real breakpoint is a design-system CSS rule.
    const switches = container.querySelectorAll('.lang-switch');
    expect(switches.length).toBeGreaterThanOrEqual(2);
  });
});

describe('T063 · tenant content ignores the console language (AC-8.5)', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it('keeps a reply draft and its SOP quotation in Indonesian in English mode', async () => {
    signIn();
    window.history.pushState({}, '', '/draft');
    render(<App sessionSource={createSeededSessionSource()} />);

    await userEvent.click(screen.getAllByRole('radio', { name: 'English' })[0]);
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('AI reply draft'));

    // The tone label is console copy and follows English...
    expect(await screen.findByText(/tone: warm, accountable/)).toBeInTheDocument();
    // ...while the drafted reply itself, read by an Indonesian customer, does not.
    const draftText = document.querySelector('.draft-text-lg');
    expect(draftText).toBeTruthy();
    expect(draftText.textContent).toMatch(/Terima kasih|SOP/);
  });
});
