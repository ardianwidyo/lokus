import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_TIMEOUT_MS,
  GeminiError,
  MODEL_FOR_TIER,
  costOf,
  createGeminiAdapter,
  createGeminiAdapterIfConfigured,
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

describe('Gemini adapter (T060)', () => {
  it('refuses to construct without a key rather than pretending', () => {
    // The same rule the Business Profile adapter follows: a caller must choose
    // the deterministic path explicitly, never receive invented text silently.
    expect(() => createGeminiAdapter({})).toThrow(GeminiError);
    expect(() => createGeminiAdapter({})).toThrow(/GEMINI_API_KEY belum diset/);
  });

  it('returns null when unconfigured so the caller can fall back', () => {
    expect(createGeminiAdapterIfConfigured({})).toBeNull();
    expect(createGeminiAdapterIfConfigured({ apiKey: 'k', fetchImpl: async () => ok('x') })).not.toBeNull();
  });

  it('sends the key in a header, never in the URL', async () => {
    // A key in a query string lands in access logs and proxy caches.
    const fetchImpl = vi.fn(async () => ok('halo'));
    const gemini = createGeminiAdapter({ apiKey: 'secret-key', fetchImpl });

    await gemini.generate({ prompt: 'p' });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).not.toContain('secret-key');
    expect(init.headers['x-goog-api-key']).toBe('secret-key');
  });

  it('picks the cheaper model for the flash tier', async () => {
    const fetchImpl = vi.fn(async () => ok('halo'));
    const gemini = createGeminiAdapter({ apiKey: 'k', fetchImpl });

    await gemini.generate({ prompt: 'p', tier: MODEL_TIER.FLASH });

    expect(fetchImpl.mock.calls[0][0]).toContain(MODEL_FOR_TIER[MODEL_TIER.FLASH]);
    expect(MODEL_FOR_TIER[MODEL_TIER.FLASH]).not.toBe(MODEL_FOR_TIER[MODEL_TIER.REASONING]);
  });

  it('reports the tokens and the cost the call actually incurred', async () => {
    const fetchImpl = async () => ok('halo', { promptTokenCount: 1_000_000, candidatesTokenCount: 0 });
    const gemini = createGeminiAdapter({ apiKey: 'k', fetchImpl });

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
    const gemini = createGeminiAdapter({ apiKey: 'k', fetchImpl });

    await expect(gemini.generate({ prompt: 'p' })).rejects.toThrow(/SAFETY/);
  });

  it('surfaces an HTTP failure with its status and without the key', async () => {
    const fetchImpl = async () => ({
      ok: false,
      status: 429,
      text: async () => 'Quota exceeded',
    });
    const gemini = createGeminiAdapter({ apiKey: 'secret-key', fetchImpl });

    const error = await gemini.generate({ prompt: 'p' }).catch((e) => e);

    expect(error.code).toBe('GEMINI_HTTP_ERROR');
    expect(error.status).toBe(429);
    expect(error.message).toContain('Quota exceeded');
    expect(error.message).not.toContain('secret-key');
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
    const gemini = createGeminiAdapter({ apiKey: 'k', fetchImpl, timeoutMs: 10 });

    const error = await gemini.generate({ prompt: 'p' }).catch((e) => e);

    expect(error.code).toBe('GEMINI_TIMEOUT');
    expect(DEFAULT_TIMEOUT_MS).toBeLessThanOrEqual(30_000);
  });

  it('reports an unreachable endpoint as such', async () => {
    const fetchImpl = async () => {
      throw new Error('getaddrinfo ENOTFOUND');
    };
    const gemini = createGeminiAdapter({ apiKey: 'k', fetchImpl });

    const error = await gemini.generate({ prompt: 'p' }).catch((e) => e);
    expect(error.code).toBe('GEMINI_UNREACHABLE');
  });

  it('prices nothing for a model it does not know', () => {
    expect(costOf('some-future-model', { input: 1000, output: 1000 })).toBe(0);
  });
});

describe('thinking tokens (measured 2026-07-30)', () => {
  it('charges for thoughts, which are billed but absent from candidatesTokenCount', async () => {
    // 328 thought tokens against 12 visible was a real measurement. Pricing
    // only the visible ones understates the call by an order of magnitude and
    // lets the budget guard wave through what it should degrade.
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'jawab' }] } }],
        usageMetadata: { promptTokenCount: 0, candidatesTokenCount: 12, thoughtsTokenCount: 328 },
      }),
    });
    const gemini = createGeminiAdapter({ apiKey: 'k', fetchImpl });

    const result = await gemini.generate({ prompt: 'p' });

    expect(result.tokens.output).toBe(340);
    expect(result.tokens.visible).toBe(12);
    expect(result.tokens.thoughts).toBe(328);
    // 340 output tokens at Rp 6.400 per 1M.
    expect(result.costIdr).toBeCloseTo(2.176, 3);
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
    const gemini = createGeminiAdapter({ apiKey: 'k', fetchImpl });

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
    const gemini = createGeminiAdapter({ apiKey: 'k', fetchImpl });

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
    const gemini = createGeminiAdapter({ apiKey: 'k', fetchImpl });

    const result = await gemini.generate({ prompt: 'p' });
    expect(result.finishReason).toBe('STOP');
  });
});
