import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { App } from '../src/App.jsx';
import { createSeededSessionSource } from '../src/data/sessionSource.js';
import { ACTIVE_TENANT_KEY } from '../src/data/tenantCache.js';

const openAt = (url) => {
  window.history.pushState({}, '', url);
  return render(<App sessionSource={createSeededSessionSource()} />);
};

const withTenant = () =>
  window.sessionStorage.setItem(
    ACTIVE_TENANT_KEY,
    JSON.stringify({ tenantId: 'nusa-retail', name: 'Nusa Retail', outletCount: 42, role: 'manager' }),
  );

describe('T063 · arriving without a tenant', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('asks which tenant to open instead of showing an error panel', async () => {
    // The reported symptom: /jawaban rendered "Permintaan ini tidak menyebutkan
    // tenant" — accurate, and useless to someone who simply had not chosen yet.
    openAt('/jawaban');

    await waitFor(() => expect(window.location.pathname).toBe('/masuk'), { timeout: 4000 });
    expect(screen.queryByText(/tidak menyebut perusahaan/i)).not.toBeInTheDocument();
  });

  it('remembers where the reader was heading, in the URL', async () => {
    openAt('/jawaban');

    await waitFor(() => expect(window.location.search).toContain('next='), { timeout: 4000 });
    expect(decodeURIComponent(window.location.search)).toContain('/jawaban');
  });

  it('keeps the query string of a deep link across the detour', async () => {
    openAt('/cabang?outlet=DPK-01');

    await waitFor(() => expect(window.location.pathname).toBe('/masuk'), { timeout: 4000 });
    expect(decodeURIComponent(window.location.search)).toContain('outlet=DPK-01');
  });

  it('continues to the intended screen once a tenant is chosen', async () => {
    openAt('/jawaban');
    await waitFor(() => expect(window.location.pathname).toBe('/masuk'), { timeout: 4000 });

    await userEvent.click(await screen.findByText('Nusa Retail', {}, { timeout: 4000 }));

    await waitFor(() => expect(window.location.pathname).toBe('/jawaban'), { timeout: 6000 });
  });

  it('lands on the briefing when nothing was intended', async () => {
    openAt('/masuk');

    await userEvent.click(await screen.findByText('Nusa Retail', {}, { timeout: 4000 }));

    await waitFor(() => expect(window.location.pathname).toBe('/briefing'), { timeout: 6000 });
  });

  it('leaves screen 01 alone — it is the one screen that needs no tenant', async () => {
    openAt('/masuk');

    await screen.findByText('Nusa Retail', {}, { timeout: 4000 });
    expect(window.location.search).toBe('');
  });

  it('does not redirect once a tenant is already chosen', async () => {
    withTenant();
    openAt('/jawaban');

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(window.location.pathname).toBe('/jawaban');
  });
});

describe('T063 · next is not a way to send someone elsewhere', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it.each([
    ['an external site', 'https://example.com/phish'],
    ['a protocol-relative URL', '//example.com'],
    ['a path no screen owns', '/../../etc/passwd'],
    ['screen 01 itself, which would loop', '/masuk'],
  ])('ignores %s and falls back to the briefing', async (_label, next) => {
    // next arrives in the URL, so it is resolved against the known screen
    // paths; anything else is discarded rather than followed.
    openAt(`/masuk?next=${encodeURIComponent(next)}`);

    await userEvent.click(await screen.findByText('Nusa Retail', {}, { timeout: 4000 }));

    await waitFor(() => expect(window.location.pathname).toBe('/briefing'), { timeout: 6000 });
    expect(window.location.href).not.toContain('example.com');
  });
});

describe('T063 · nothing is asked before a tenant exists', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('does not mount the screen while redirecting, so it fires no request', async () => {
    // Screen 12 asks its opening question on mount. Mounted during the
    // redirect it asked without a tenant: a guaranteed 400 and a console error
    // on every deep link.
    let asked = 0;
    const knowledgeSource = {
      overview: async () => ({ stats: {}, coverage: {}, documents: [], gaps: [] }),
      ask: async () => {
        asked += 1;
        throw new Error('should never be called without a tenant');
      },
    };

    window.history.pushState({}, '', '/jawaban');
    render(<App sessionSource={createSeededSessionSource()} knowledgeSource={knowledgeSource} />);

    await waitFor(() => expect(window.location.pathname).toBe('/masuk'), { timeout: 4000 });
    expect(asked).toBe(0);
  });
});
