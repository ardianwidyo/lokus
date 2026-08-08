import { GeminiError, TRANSPORT, createGeminiAdapterIfConfigured, isConfigured } from './gemini.js';

/**
 * Which reasoning path answers, and the ability to change it without a restart.
 *
 * Three paths, and the honest ordering between them is availability, not
 * preference: `deterministic` always works because it needs nothing, `vertex`
 * needs an identity, `apikey` needs a string from AI Studio. An operator picks
 * among what is actually configured, and the screen shows the rest greyed with
 * the reason — a control that offers a path it cannot take is worse than no
 * control.
 *
 * What this deliberately does not hold is a credential. The key and the token
 * provider are resolved in the API process from its environment; this object
 * only decides which of the already-built adapters is asked. Nothing here can
 * be set from a browser, because nothing here is a secret.
 *
 * The scope is the process, not the tenant. Every tenant on this instance
 * shares the choice, which is why changing it is gated (see `mutable`): one
 * tenant's admin must not be able to change how another tenant's answers are
 * produced. Making it per-tenant means threading a tenant through every
 * `generate` call, and that is a bigger change than this control is worth.
 */

export const REASONING_PATH = Object.freeze({
  DETERMINISTIC: 'deterministic',
  VERTEX: 'vertex',
  API_KEY: 'apikey',
});

export const REASONING_PATHS = Object.freeze([
  REASONING_PATH.DETERMINISTIC,
  REASONING_PATH.VERTEX,
  REASONING_PATH.API_KEY,
]);

export class ReasoningSwitchError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ReasoningSwitchError';
    this.code = code;
  }
}

/**
 * `vertex` and `apikey` are the option shapes `createGeminiAdapter` takes;
 * either may be absent, which is what makes that path unavailable.
 *
 * `mutable` is false unless an operator opted in. A read-only switch is the
 * right default for a shared process: the screen still reports which path is
 * live, and nobody can change it from a browser by accident.
 */
export function createReasoningSwitch({
  vertex = null,
  apikey = null,
  path = REASONING_PATH.DETERMINISTIC,
  mutable = false,
  onChange = null,
} = {}) {
  const built = {
    [REASONING_PATH.VERTEX]: createGeminiAdapterIfConfigured({ ...vertex, transport: TRANSPORT.VERTEX }),
    [REASONING_PATH.API_KEY]: createGeminiAdapterIfConfigured({ ...apikey, transport: TRANSPORT.API_KEY }),
  };

  const availability = {
    [REASONING_PATH.DETERMINISTIC]: true,
    [REASONING_PATH.VERTEX]: Boolean(built[REASONING_PATH.VERTEX]),
    [REASONING_PATH.API_KEY]: Boolean(built[REASONING_PATH.API_KEY]),
  };

  // A configured start-up path that cannot be dialled falls back rather than
  // failing to boot. The alternative is an API that refuses to start because a
  // key expired, which turns a degraded reasoning layer into an outage.
  let active = availability[path] ? path : REASONING_PATH.DETERMINISTIC;

  const current = () => built[active] ?? null;

  return {
    get path() {
      return active;
    },
    get mutable() {
      return mutable;
    },
    /**
     * False on the deterministic path. The two writers check this before they
     * call, so a disabled model reads as "no model" rather than as a failure —
     * the reader is told the answer was quoted, not that something broke.
     */
    get enabled() {
      return Boolean(current());
    },
    get model() {
      return current()?.transport ?? null;
    },

    /** What the screen renders: every path, whether it can be taken, and why not. */
    options() {
      return REASONING_PATHS.map((id) => ({
        id,
        available: availability[id],
        active: id === active,
        detail: detailFor(id, { vertex, available: availability[id] }),
      }));
    },

    select(next) {
      if (!mutable) {
        throw new ReasoningSwitchError(
          'REASONING_IMMUTABLE',
          'Jalur penalaran dikunci pada proses ini. Set LOKUS_REASONING_SWITCHABLE=true untuk membukanya.',
        );
      }
      if (!REASONING_PATHS.includes(next)) {
        throw new ReasoningSwitchError('REASONING_UNKNOWN_PATH', `Jalur "${next}" tidak dikenal.`);
      }
      if (!availability[next]) {
        // Refused rather than accepted-and-ignored: a control that reports
        // success while nothing changed is a control that teaches the operator
        // to distrust the screen.
        throw new ReasoningSwitchError(
          'REASONING_UNAVAILABLE',
          `Pilihan "${next}" belum diatur di proses ini.`,
        );
      }

      const previous = active;
      active = next;
      if (previous !== next) onChange?.({ from: previous, to: next });
      return active;
    },

    /**
     * Delegates to whichever adapter is active right now, so a switch takes
     * effect on the next question rather than on the next deploy.
     */
    async generate(request) {
      const adapter = current();
      if (!adapter) {
        throw new GeminiError('GEMINI_DISABLED', 'Jalur penalaran deterministik: model tidak dipanggil.');
      }
      return adapter.generate(request);
    },
  };
}

function detailFor(id, { vertex, available }) {
  if (id === REASONING_PATH.DETERMINISTIC) return null;

  if (id === REASONING_PATH.VERTEX) {
    // The location, never the project id. Naming the billable resource in a
    // payload a browser reads buys nothing an operator does not already know
    // from their own console, and gives away a target to everyone else.
    if (available) return `Vertex AI · ${vertex?.location ?? 'global'}`;
    return isConfigured({ ...vertex, transport: TRANSPORT.VERTEX })
      ? null
      : 'GOOGLE_CLOUD_PROJECT / ADC belum lengkap';
  }

  // Never the key, not even its first characters: a prefix is enough to
  // confirm a guess, and this payload is read by a browser.
  return available ? 'AI Studio' : 'GEMINI_API_KEY belum diset';
}
