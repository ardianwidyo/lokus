import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_LOCATION,
  DEFAULT_TIMEOUT_MS,
  GeminiError,
  MODEL_FOR_TIER,
  costOf,
  createGeminiAdapter,
  createGeminiAdapterIfConfigured,
  endpointFor,
} from '../src/adapters/gemini.js';
import { MODEL_TIER } from '../src/cost/budget.js';

const ok = (text, usage = { promptTokenCount: 100, candidatesTokenCount: 50 }) => ({
  ok: true,
  status: 200,
  json: async () => ({
    candidates: [{ content: { parts: [{ text }] } }],
    usageMetadata: usage,
  }),
});

/** The two things every live call needs; individual tests override what they test. */
const vertex = (overrides = {}) => ({
  projectId: 'ebco-aihack-ardian',
  getAccessToken: async () => 'ya29.token',
  ...overrides,
});

describe('Gemini adapter over Vertex AI (T060)', () => {
  it('refuses to construct without a project or a token source rather than pretending', () => {
    // The same rule the Business Profile adapter follows: a caller must choose
    // the deterministic path explicitly, never receive invented text silently.
    expect(() => createGeminiAdapter({})).toThrow(GeminiError);
    expect(() => createGeminiAdapter({})).toThrow(/Project Vertex AI belum diset/);
    expect(() => createGeminiAdapter({ projectId: 'p' })).toThrow(/access token/);
  });

  it('returns null when unconfigured so the caller can fall back', () => {
    expect(createGeminiAdapterIfConfigured({})).toBeNull();
    // A project without a way to authenticate is not a configuration, it is
    // half of one — and half of one would throw on the first call instead of
    // degrading at wiring time.
    expect(createGeminiAdapterIfConfigured({ projectId: 'p' })).toBeNull();
    expect(createGeminiAdapterIfConfigured(vertex({ fetchImpl: async () => ok('x') }))).not.toBeNull();
  });

  it('calls the project-scoped Vertex endpoint, not the API-key one', async () => {
    const fetchImpl = vi.fn(async () => ok('halo'));
    const gemini = createGeminiAdapter(vertex({ fetchImpl }));

    await gemini.generate({ prompt: 'p' });

    const [url] = fetchImpl.mock.calls[0];
    expect(url).toContain('aiplatform.googleapis.com');
    expect(url).toContain('/projects/ebco-aihack-ardian/locations/global/');
    expect(url).not.toContain('generativelanguage.googleapis.com');
  });

  it('prefixes the host for a pinned region and leaves global unprefixed', () => {
    // Measured 2026-08-07: global and asia-southeast1 answer, asia-southeast2
    // returns 400 FAILED_PRECONDITION. The host shape is what differs.
    expect(endpointFor({ projectId: 'p', location: 'global', model: 'm' })).toContain(
      'https://aiplatform.googleapis.com/',
    );
    expect(endpointFor({ projectId: 'p', location: 'asia-southeast1', model: 'm' })).toContain(
      'https://asia-southeast1-aiplatform.googleapis.com/',
    );
    expect(DEFAULT_LOCATION).toBe('global');
  });

  it('sends the token as a bearer header, never in the URL', async () => {
    // A credential in a query string lands in access logs and proxy caches.
    const fetchImpl = vi.fn(async () => ok('halo'));
    const gemini = createGeminiAdapter(vertex({ getAccessToken: async () => 'secret-token', fetchImpl }));

    await gemini.generate({ prompt: 'p' });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).not.toContain('secret-token');
    expect(init.headers.authorization).toBe('Bearer secret-token');
    expect(init.headers['x-goog-api-key']).toBeUndefined();
  });

  it('asks for a token on every generation so an expired one is never reused', async () => {
    // Caching belongs to the provider, which knows the expiry; an adapter that
    // held the first token would outlive it by 59 minutes.
    const getAccessToken = vi.fn(async () => 'ya29.token');
    const gemini = createGeminiAdapter(vertex({ getAccessToken, fetchImpl: async () => ok('halo') }));

    await gemini.generate({ prompt: 'p' });
    await gemini.generate({ prompt: 'p' });

    expect(getAccessToken).toHaveBeenCalledTimes(2);
  });

  it('reports a credential failure as its own cause, not as a model failure', async () => {
    const fetchImpl = vi.fn(async () => ok('halo'));
    const gemini = createGeminiAdapter(
      vertex({
        getAccessToken: async () => {
          throw new Error('gcloud ADC tidak ditemukan');
        },
        fetchImpl,
      }),
    );

    const error = await gemini.generate({ prompt: 'p' }).catch((e) => e);

    expect(error.code).toBe('GEMINI_NO_CREDENTIALS');
    expect(error.message).toContain('gcloud ADC tidak ditemukan');
    // No credential means no call: an unauthenticated request would only spend
    // the caller's latency budget to be refused.
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('treats an empty token as no token', async () => {
    const gemini = createGeminiAdapter(vertex({ getAccessToken: async () => '', fetchImpl: async () => ok('x') }));

    const error = await gemini.generate({ prompt: 'p' }).catch((e) => e);
    expect(error.code).toBe('GEMINI_NO_CREDENTIALS');
  });

  it('picks the cheaper model for the flash tier', async () => {
    const fetchImpl = vi.fn(async () => ok('halo'));
    const gemini = createGeminiAdapter(vertex({ fetchImpl }));

    await gemini.generate({ prompt: 'p', tier: MODEL_TIER.FLASH });

    expect(fetchImpl.mock.calls[0][0]).toContain(MODEL_FOR_TIER[MODEL_TIER.FLASH]);
    expect(MODEL_FOR_TIER[MODEL_TIER.FLASH]).not.toBe(MODEL_FOR_TIER[MODEL_TIER.REASONING]);
  });

  it('reports the tokens and the cost the call actually incurred', async () => {
    const fetchImpl = async () => ok('halo', { promptTokenCount: 1_000_000, candidatesTokenCount: 0 });
    const gemini = createGeminiAdapter(vertex({ fetchImpl }));

    const result = await gemini.generate({ prompt: 'p' });

    expect(result.tokens).toEqual({ input: 1_000_000, output: 0, visible: 0, thoughts: 0 });
    expect(result.costIdr).toBe(1_600);
    expect(result.model).toBe(MODEL_FOR_TIER[MODEL_TIER.REASONING]);
  });

  it('treats an empty candidate as a refusal, not as an answer', async () => {
    // Returning "" here would let a caller publish silence as content.
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [], promptFeedback: { blockReason: 'SAFETY' } }),
    });
    const gemini = createGeminiAdapter(vertex({ fetchImpl }));

    await expect(gemini.generate({ prompt: 'p' })).rejects.toThrow(/SAFETY/);
  });

  it('surfaces an HTTP failure with its status and without the token', async () => {
    const fetchImpl = async () => ({
      ok: false,
      status: 429,
      text: async () => 'Quota exceeded',
    });
    const gemini = createGeminiAdapter(vertex({ getAccessToken: async () => 'secret-token', fetchImpl }));

    const error = await gemini.generate({ prompt: 'p' }).catch((e) => e);

    expect(error.code).toBe('GEMINI_HTTP_ERROR');
    expect(error.status).toBe(429);
    expect(error.message).toContain('Quota exceeded');
    expect(error.message).not.toContain('secret-token');
  });

  it('gives up rather than hanging when the model does not answer', async () => {
    const fetchImpl = (_url, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        });
      });
    const gemini = createGeminiAdapter(vertex({ fetchImpl, timeoutMs: 10 }));

    const error = await gemini.generate({ prompt: 'p' }).catch((e) => e);

    expect(error.code).toBe('GEMINI_TIMEOUT');
    expect(DEFAULT_TIMEOUT_MS).toBeLessThanOrEqual(30_000);
  });

  it('reports an unreachable endpoint as such', async () => {
    const fetchImpl = async () => {
      throw new Error('getaddrinfo ENOTFOUND');
    };
    const gemini = createGeminiAdapter(vertex({ fetchImpl }));

    const error = await gemini.generate({ prompt: 'p' }).catch((e) => e);
    expect(error.code).toBe('GEMINI_UNREACHABLE');
  });

  it('prices nothing for a model it does not know', () => {
    expect(costOf('some-future-model', { input: 1000, output: 1000 })).toBe(0);
  });
});

describe('thinking tokens (measured on Vertex 2026-08-07)', () => {
  it('charges for thoughts, which are billed but absent from candidatesTokenCount', async () => {
    // 487 thought tokens against 21 visible was a real Vertex measurement.
    // Pricing only the visible ones understates the call by an order of
    // magnitude and lets the budget guard wave through what it should degrade.
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'jawab' }] } }],
        usageMetadata: { promptTokenCount: 0, candidatesTokenCount: 12, thoughtsTokenCount: 328 },
      }),
    });
    const gemini = createGeminiAdapter(vertex({ fetchImpl }));

    const result = await gemini.generate({ prompt: 'p' });

    expect(result.tokens.output).toBe(340);
    expect(result.tokens.visible).toBe(12);
    expect(result.tokens.thoughts).toBe(328);
    // 340 output tokens at Rp 6.400 per 1M.
    expect(result.costIdr).toBeCloseTo(2.176, 3);
  });

  it('never publishes a thought part as if it were the answer', async () => {
    // Vertex flags the model's working notes with `thought: true`. They are not
    // an answer, and a caller that printed them would be publishing reasoning
    // the reader was never meant to see.
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                { text: 'Pengguna bertanya soal refund, saya cek pasal 4...', thought: true },
                { text: 'Barang promo tidak bisa dikembalikan [1].' },
              ],
            },
          },
        ],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 15 },
      }),
    });
    const gemini = createGeminiAdapter(vertex({ fetchImpl }));

    const result = await gemini.generate({ prompt: 'p' });

    expect(result.text).toBe('Barang promo tidak bisa dikembalikan [1].');
    expect(result.text).not.toContain('saya cek pasal');
  });

  it('refuses an answer that is nothing but thoughts', async () => {
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'hmm, mari saya pikirkan', thought: true }] } }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 0, thoughtsTokenCount: 40 },
      }),
    });
    const gemini = createGeminiAdapter(vertex({ fetchImpl }));

    const error = await gemini.generate({ prompt: 'p' }).catch((e) => e);
    expect(error.code).toBe('GEMINI_EMPTY');
  });

  it('reports zero thoughts for a model that does not think', async () => {
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'jawab' }] } }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 15 },
      }),
    });
    const gemini = createGeminiAdapter(vertex({ fetchImpl }));

    const result = await gemini.generate({ prompt: 'p', tier: MODEL_TIER.FLASH });

    expect(result.tokens).toMatchObject({ output: 15, visible: 15, thoughts: 0 });
  });
});

describe('truncation', () => {
  it('rejects a cut-off generation rather than returning half a sentence', async () => {
    // The first live reply draft came back as "Halo Kak Ratna, terima kasih
    // atas masukannya dan kami" and passed every shape check, because no
    // heuristic distinguishes brief from severed. finishReason does.
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          { content: { parts: [{ text: 'Halo Kak Ratna, terima kasih atas masukannya dan kami' }] }, finishReason: 'MAX_TOKENS' },
        ],
        usageMetadata: { promptTokenCount: 300, candidatesTokenCount: 100, thoughtsTokenCount: 280 },
      }),
    });
    const gemini = createGeminiAdapter(vertex({ fetchImpl }));

    const error = await gemini.generate({ prompt: 'p' }).catch((e) => e);

    expect(error.code).toBe('GEMINI_TRUNCATED');
  });

  it('passes a normally finished generation through', async () => {
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Selesai.' }] }, finishReason: 'STOP' }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
      }),
    });
    const gemini = createGeminiAdapter(vertex({ fetchImpl }));

    const result = await gemini.generate({ prompt: 'p' });
    expect(result.finishReason).toBe('STOP');
  });
});
