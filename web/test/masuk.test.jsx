import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from '../src/App.jsx';
import { ACTIVE_TENANT_KEY, readActiveTenant } from '../src/data/tenantCache.js';
import {
  SEED_TENANTS,
  SessionError,
  createSeededSessionSource,
} from '../src/data/sessionSource.js';

/** A source stuck loading, so the loading state can be observed. */
const pendingSource = () => ({
  isSeeded: true,
  loadSession: () => new Promise(() => {}),
  selectTenant: vi.fn(),
  signInWithGoogle: vi.fn(),
  sendSignInLink: vi.fn(),
});

const failingSource = (error) => ({
  isSeeded: true,
  loadSession: () => Promise.reject(error),
  selectTenant: vi.fn(),
  signInWithGoogle: vi.fn(),
  sendSignInLink: vi.fn(),
});

const renderMasuk = (sessionSource) => {
  window.history.pushState({}, '', '/masuk');
  return render(<App sessionSource={sessionSource} />);
};

describe('Screen 01 · Masuk & pilih tenant', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  describe('sign-in card', () => {
    it('offers SSO and the email fallback with the copy from SCREENS.md', async () => {
      renderMasuk(createSeededSessionSource());
      // Let the tenant panel settle so the assertions run on a quiet tree.
      await screen.findByText('Nusa Retail');

      expect(
        screen.getByRole('button', { name: 'Lanjutkan dengan Google Workspace' }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Email kerja')).toHaveAttribute(
        'placeholder',
        'nama@perusahaan.co.id',
      );
      expect(screen.getByRole('button', { name: 'Kirim tautan masuk' })).toBeInTheDocument();
      expect(
        screen.getByText('Dilindungi SSO organisasi. LOKUS tidak menyimpan kata sandi.'),
      ).toBeInTheDocument();
    });

    it('sends a sign-in link to the address entered', async () => {
      const source = createSeededSessionSource();
      renderMasuk(source);

      await userEvent.type(screen.getByLabelText('Email kerja'), 'dwi@nusaretail.co.id');
      await userEvent.click(screen.getByRole('button', { name: 'Kirim tautan masuk' }));

      expect(await screen.findByText(/Tautan masuk dikirim ke dwi@nusaretail\.co\.id/)).toBeVisible();
    });

    it('surfaces an SSO failure instead of swallowing it', async () => {
      const source = {
        ...createSeededSessionSource(),
        signInWithGoogle: () => Promise.reject(new SessionError('NOT_IMPLEMENTED', 'SSO belum tersambung')),
      };
      renderMasuk(source);

      await userEvent.click(
        screen.getByRole('button', { name: 'Lanjutkan dengan Google Workspace' }),
      );

      expect(await screen.findByRole('alert')).toHaveTextContent('SSO belum tersambung');
    });
  });

  describe('tenant panel — four states', () => {
    it('loading', () => {
      const { container } = renderMasuk(pendingSource());

      expect(container.querySelector('.state-loading')).toBeInTheDocument();
      expect(container.querySelector('.panel[data-status="loading"]')).toBeInTheDocument();
    });

    it('empty', async () => {
      renderMasuk(createSeededSessionSource({ tenants: [] }));

      expect(await screen.findByText('Belum ada tenant')).toBeInTheDocument();
    });

    it('error, with a retry that actually retries', async () => {
      const loadSession = vi
        .fn()
        .mockRejectedValueOnce(new SessionError('REQUEST_FAILED', 'Layanan sesi tak menjawab.'))
        .mockResolvedValueOnce({ user: {}, tenants: SEED_TENANTS });
      renderMasuk({ ...createSeededSessionSource(), loadSession });

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Daftar tenant tak bisa dimuat');

      await userEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));

      expect(await screen.findByText('Nusa Retail')).toBeInTheDocument();
      expect(loadSession).toHaveBeenCalledTimes(2);
    });

    it('needs permission, when the account has no tenant membership', async () => {
      renderMasuk(failingSource(new SessionError('AUTH_TENANT_CLAIM_MISSING', 'no membership')));

      expect(await screen.findByText('Akun ini belum diberi akses tenant')).toBeInTheDocument();
    });
  });

  describe('tenant list (AC-6.3)', () => {
    it('shows each tenant with its branch count, segment and role', async () => {
      renderMasuk(createSeededSessionSource());

      const rows = await screen.findAllByRole('button', { name: /^Buka / });

      expect(rows).toHaveLength(3);
      expect(rows[0]).toHaveTextContent('Nusa Retail');
      expect(rows[0]).toHaveTextContent('42 cabang · minimarket · peran: Area Manager');
      expect(rows[1]).toHaveTextContent('11 cabang · klinik · peran: Viewer');
      expect(rows[2]).toHaveTextContent('7 cabang · otomotif · peran: Admin');
    });

    it('tags the most recently opened tenant "Terakhir dibuka"', async () => {
      renderMasuk(createSeededSessionSource());

      const nusa = await screen.findByRole('button', { name: /^Buka Nusa Retail/ });

      expect(within(nusa).getByText('Terakhir dibuka')).toBeInTheDocument();
      expect(nusa).toHaveClass('is-last-opened');
    });

    it('tags a read-only tenant "Baca saja" and a trial by days left', async () => {
      renderMasuk(createSeededSessionSource());

      const klinik = await screen.findByRole('button', { name: /^Buka Klinik Sehat Prima/ });
      const dealer = await screen.findByRole('button', { name: /^Buka Dealer Arta Motor/ });

      expect(within(klinik).getByText('Baca saja')).toBeInTheDocument();
      expect(within(dealer).getByText('Uji coba · 12 hari')).toBeInTheDocument();
    });

    it('marks seeded data as sample data rather than passing it off as real', async () => {
      renderMasuk(createSeededSessionSource());

      expect(await screen.findByText('data contoh')).toBeInTheDocument();
    });

    it('closes with the multi-tenant note from SCREENS.md', async () => {
      renderMasuk(createSeededSessionSource());

      expect(
        await screen.findByText(/bukti nyata kesiapan multi-tenant, bukan klaim di slide/),
      ).toBeInTheDocument();
    });
  });

  describe('selecting a tenant', () => {
    it('stores tenantId and role, then opens screen 02', async () => {
      renderMasuk(createSeededSessionSource());

      await userEvent.click(await screen.findByRole('button', { name: /^Buka Nusa Retail/ }));

      await waitFor(() => expect(window.location.pathname).toBe('/briefing'));
      expect(readActiveTenant()).toMatchObject({ tenantId: 'nusa-retail', role: 'manager' });
      expect(screen.getByText('Layar 02')).toBeInTheDocument();
    });

    it('clears any cached state from the previous tenant', async () => {
      // Constitution IV: tenant switching clears client state; no shared cache.
      window.sessionStorage.setItem('lokus:tenant:reviews', '["stale"]');
      renderMasuk(createSeededSessionSource());

      await userEvent.click(await screen.findByRole('button', { name: /^Buka Dealer Arta Motor/ }));

      await waitFor(() => expect(window.location.pathname).toBe('/briefing'));
      expect(window.sessionStorage.getItem('lokus:tenant:reviews')).toBeNull();
      expect(window.sessionStorage.getItem(ACTIVE_TENANT_KEY)).toContain('dealer-arta-motor');
    });

    it('shows the chosen tenant in the rail', async () => {
      renderMasuk(createSeededSessionSource());

      await userEvent.click(await screen.findByRole('button', { name: /^Buka Nusa Retail/ }));

      const rail = await screen.findByRole('navigation', { name: 'Navigasi layar' });
      await waitFor(() => expect(within(rail).getByText('Nusa Retail')).toBeInTheDocument());
      expect(within(rail).getByText('42 cabang · Jabodetabek')).toBeInTheDocument();
    });

    it('hides the agent-run action for a viewer role (AC-6.3)', async () => {
      renderMasuk(createSeededSessionSource());

      await userEvent.click(await screen.findByRole('button', { name: /^Buka Klinik Sehat Prima/ }));

      await waitFor(() => expect(window.location.pathname).toBe('/briefing'));
      expect(screen.queryByRole('button', { name: /Jalankan agen/ })).not.toBeInTheDocument();
    });

    it('keeps the agent-run action for a manager role', async () => {
      renderMasuk(createSeededSessionSource());

      await userEvent.click(await screen.findByRole('button', { name: /^Buka Nusa Retail/ }));

      expect(await screen.findByRole('button', { name: /Jalankan agen/ })).toBeInTheDocument();
    });

    it('refuses a tenant the session does not grant, and stays put (AC-6.1)', async () => {
      const source = createSeededSessionSource();
      renderMasuk(source);
      await screen.findByText('Nusa Retail');

      await expect(source.selectTenant('tenant-orang-lain')).rejects.toMatchObject({
        code: 'TENANT_FORBIDDEN',
      });
      expect(window.location.pathname).toBe('/masuk');
    });
  });
});
