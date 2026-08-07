import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { LocaleProvider } from '../src/i18n/index.js';
import { ReasoningPanel } from '../src/screens/admin/ReasoningPanel.jsx';

const OPTIONS = (active = 'vertex') => [
  { id: 'deterministic', available: true, active: active === 'deterministic', detail: null },
  { id: 'vertex', available: true, active: active === 'vertex', detail: 'Vertex AI · global' },
  { id: 'apikey', available: false, active: false, detail: 'GEMINI_API_KEY belum diset' },
];

const sourceFor = ({ mutable = true, active = 'vertex', selectReasoning } = {}) => ({
  reasoning: vi.fn(async () => ({ active, mutable, options: OPTIONS(active) })),
  selectReasoning: selectReasoning ?? vi.fn(async () => ({})),
});

const renderPanel = async (adminSource) => {
  render(
    <LocaleProvider>
      <ReasoningPanel adminSource={adminSource} />
    </LocaleProvider>,
  );
  await screen.findByText('Vertex AI');
};

/**
 * The control that decides which model answers — and, just as important, the
 * control that does not accept a credential.
 */
describe('Screen 14 · jalur penalaran', () => {
  it('offers a path the process can take and refuses to offer one it cannot', async () => {
    await renderPanel(sourceFor());

    // Configured: selectable. Not configured: shown, disabled, with the reason,
    // because hiding it would leave an operator wondering if it exists.
    expect(screen.getByRole('button', { name: /Deterministik/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /API key/ })).toBeDisabled();
    expect(screen.getByText('GEMINI_API_KEY belum diset')).toBeInTheDocument();
  });

  it('marks the live path as pressed, so the state is not only a colour', async () => {
    await renderPanel(sourceFor({ active: 'vertex' }));

    expect(screen.getByRole('button', { name: /Vertex AI/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Deterministik/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('sends the chosen path and re-reads what the server actually did', async () => {
    // Re-read rather than assume: the server is the only thing that knows
    // whether the switch took.
    const source = sourceFor();
    await renderPanel(source);

    await userEvent.click(screen.getByRole('button', { name: /Deterministik/ }));

    expect(source.selectReasoning).toHaveBeenCalledWith('deterministic');
    await waitFor(() => expect(source.reasoning).toHaveBeenCalledTimes(2));
  });

  it('locks every option when the process forbids switching', async () => {
    // The choice is process-wide, so one tenant's admin must not flip it for
    // everyone by default.
    await renderPanel(sourceFor({ mutable: false }));

    expect(screen.getByRole('button', { name: /Deterministik/ })).toBeDisabled();
    expect(screen.getByText(/Terkunci pada proses ini/)).toBeInTheDocument();
  });

  it('names a refusal rather than leaving the screen unchanged and silent', async () => {
    const source = sourceFor({
      selectReasoning: vi.fn(async () => {
        throw Object.assign(new Error('Jalur "apikey" belum dikonfigurasi di proses ini.'), {
          code: 'REASONING_UNAVAILABLE',
        });
      }),
    });
    await renderPanel(source);

    await userEvent.click(screen.getByRole('button', { name: /Deterministik/ }));

    expect(await screen.findByText(/belum dikonfigurasi di proses ini/)).toBeInTheDocument();
  });

  it('explains itself instead of erroring when there is no API to ask', async () => {
    // The seeded console runs the domain in the browser: no process, no
    // credentials, nothing to choose between.
    render(
      <LocaleProvider>
        <ReasoningPanel adminSource={{ isSeeded: true }} />
      </LocaleProvider>,
    );

    expect(await screen.findByText('Tidak tersedia di mode contoh')).toBeInTheDocument();
  });

  it('never renders a credential', async () => {
    // The panel selects among configured paths; it does not accept or display
    // a key, and the payload it renders carries none.
    const source = sourceFor();
    await renderPanel(source);

    expect(document.body.textContent).not.toMatch(/AIza/);
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
