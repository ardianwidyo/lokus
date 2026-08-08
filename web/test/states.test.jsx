import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  DataPanel,
  Empty,
  ErrorState,
  Loading,
  NeedsPermission,
  PANEL_STATUS,
} from '../src/components/states/index.js';
import { LocaleProvider } from '../src/i18n/index.js';

/** Every state component reads its default copy through `useT()`. */
function render(ui) {
  return rtlRender(<LocaleProvider>{ui}</LocaleProvider>);
}

describe('Loading', () => {
  it('shows three skeleton bars at the prescribed widths', () => {
    const { container } = render(<Loading />);

    const bars = [...container.querySelectorAll('.skeleton-bar')];

    expect(bars).toHaveLength(3);
    expect(bars.map((bar) => bar.style.width)).toEqual(['70%', '92%', '48%']);
  });

  it('announces itself as busy to assistive technology', () => {
    render(<Loading message="Agen sedang membaca 18 review…" />);

    const status = screen.getByRole('status');

    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveTextContent('Agen sedang membaca 18 review…');
  });

  it('carries no count of its own', () => {
    // A number here would be a number with no source (constitution I).
    render(<Loading />);

    expect(screen.getByRole('status').textContent).not.toMatch(/\d/);
  });
});

describe('Empty', () => {
  it('renders the screen copy and its single action', async () => {
    const onAction = vi.fn();
    render(
      <Empty
        title="Tidak ada review baru"
        description="Semua review pekan ini sudah dibalas. Agen mengecek lagi malam ini pukul 23.00."
        onAction={onAction}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Periksa sekarang' }));

    expect(screen.getByText('Tidak ada review baru')).toBeInTheDocument();
    expect(screen.getByText(/pukul 23\.00/)).toBeInTheDocument();
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('omits the action when the screen offers none', () => {
    render(<Empty title="Tidak ada review baru" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('ErrorState', () => {
  it('names the failure and offers both recovery actions', async () => {
    const onRetry = vi.fn();
    const onViewLog = vi.fn();
    render(
      <ErrorState
        title="Places API tak menjawab"
        description="Skor lokasi memakai data tersimpan per 26 Juli. Percobaan ulang otomatis dalam 5 menit."
        onRetry={onRetry}
        onViewLog={onViewLog}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Places API tak menjawab');

    await userEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    await userEvent.click(screen.getByRole('button', { name: 'Lihat catatan error' }));

    expect(onRetry).toHaveBeenCalledOnce();
    expect(onViewLog).toHaveBeenCalledOnce();
  });

  it('says what it is showing instead, rather than failing silently', () => {
    render(
      <ErrorState
        title="Places API tak menjawab"
        description="Skor lokasi memakai data tersimpan per 26 Juli."
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('data tersimpan per 26 Juli');
  });
});

describe('NeedsPermission', () => {
  it('offers the connect action to a role that may write', async () => {
    const onConnect = vi.fn();
    render(
      <NeedsPermission
        title="Hubungkan Business Profile"
        description="LOKUS butuh akses baca review dan tulis balasan untuk 42 lokasi milik Anda."
        onConnect={onConnect}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Hubungkan akun' }));

    expect(onConnect).toHaveBeenCalledOnce();
  });

  it('hides the connect action from a read-only role and says why (AC-6.3)', () => {
    render(
      <NeedsPermission title="Hubungkan Business Profile" onConnect={vi.fn()} canConnect={false} />,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText(/hanya bisa melihat/)).toBeInTheDocument();
  });
});

describe('DataPanel', () => {
  it.each([
    [PANEL_STATUS.LOADING, '.state-loading'],
    [PANEL_STATUS.EMPTY, '.state-empty'],
    [PANEL_STATUS.ERROR, '.state-error'],
    [PANEL_STATUS.NEEDS_PERMISSION, '.state-permission'],
  ])('renders the %s state', (status, selector) => {
    const { container } = render(
      <DataPanel status={status} title="Kotak masuk review">
        <p>isi panel</p>
      </DataPanel>,
    );

    expect(container.querySelector(selector)).toBeInTheDocument();
    // A panel in a non-ready state must not leak its data body.
    expect(screen.queryByText('isi panel')).not.toBeInTheDocument();
  });

  it('renders its children only when ready', () => {
    render(
      <DataPanel status={PANEL_STATUS.READY} title="Kotak masuk review">
        <p>isi panel</p>
      </DataPanel>,
    );

    expect(screen.getByText('isi panel')).toBeInTheDocument();
  });

  it('defaults to ready so a panel cannot render a state it never declared', () => {
    render(
      <DataPanel>
        <p>isi panel</p>
      </DataPanel>,
    );

    expect(screen.getByText('isi panel')).toBeInTheDocument();
  });

  it('is a blueprint frame with four registration marks', () => {
    const { container } = render(<DataPanel title="Kotak masuk review" />);

    const panel = container.querySelector('.blueprint.panel');

    expect(panel).toBeInTheDocument();
    expect(panel.querySelectorAll(':scope > .corner')).toHaveLength(4);
    expect([...panel.querySelectorAll(':scope > .corner')].map((c) => c.className)).toEqual([
      'corner tl',
      'corner tr',
      'corner bl',
      'corner br',
    ]);
  });

  it('exposes its status so the four-state audit can read it', () => {
    const { container } = render(<DataPanel status={PANEL_STATUS.ERROR} />);

    expect(container.querySelector('.panel')).toHaveAttribute('data-status', 'error');
  });

  it('passes screen copy through to the state it renders', () => {
    render(
      <DataPanel
        status={PANEL_STATUS.EMPTY}
        empty={{ title: 'Tidak ada review baru', description: 'Agen akan memeriksa lagi.' }}
      />,
    );

    expect(screen.getByText('Tidak ada review baru')).toBeInTheDocument();
    expect(screen.getByText('Agen akan memeriksa lagi.')).toBeInTheDocument();
  });
});
