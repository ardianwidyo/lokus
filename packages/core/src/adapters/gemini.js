import { MODEL_TIER } from '../cost/budget.js';

/**
 * Gemini, over the AI Studio REST endpoint.
 *
 * No SDK: one `fetch` against a documented HTTP API is the whole requirement,
 * and plan.md does not list a Google client library. Vertex AI Agent Engine
 * would be the production home for this, but it needs an active billing
 * account and the project's is an expired trial — recorded in plan.md
 * (2026-07-30).
 *
 * The key is read by the API process only. A key shipped to a browser is a
 * public key, so the console never holds one and the GitHub Pages demo runs
 * the deterministic path instead.
 */

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Which published model backs each budget tier.
 *
 * Pinned rather than the floating `*-latest` aliases. Constitution III wants
 * the trace to say what actually ran, and an alias can be repointed under a
 * recorded run, which makes the trace a guess after the fact.
 *
 * Both were confirmed reachable on 2026-07-30. `gemini-2.0-*`, the earlier
 * choice, returns 429 on this project — its free-tier daily allowance is spent
 * elsewhere, which is exactly why a rate-limited model must degrade rather
 * than fail.
 *
 * Measured the same day, on a short constrained prompt:
 *
 *   gemini-3.6-flash        342 thought tokens   5729 ms
 *   gemini-3.5-flash        328 thought tokens   2565 ms
 *   gemini-3.5-flash-lite     0 thought tokens    853 ms
 *
 * The lite tier does not think, which is the right trade for the cheap tier:
 * both call sites hand the model its passages and its rules, so the work is
 * following constraints rather than reasoning, and the output is verified
 * afterwards either way. 3.6 was rejected for the reasoning tier because 5.7 s
 * on one call is most of the eval's 10 s p95 budget.
 */
export const MODEL_FOR_TIER = Object.freeze({
  [MODEL_TIER.REASONING]: 'gemini-3.5-flash',
  [MODEL_TIER.FLASH]: 'gemini-3.5-flash-lite',
});

/**
 * Rupiah per 1M tokens, input/output. Rough published rates converted at
 * Rp 16.000 — precise enough to make the budget guard bite before real money
 * does, which is the only job these numbers have here.
 */
const RATE_IDR_PER_MTOK = Object.freeze({
  'gemini-3.5-flash': { input: 1_600, output: 6_400 },
  'gemini-3.6-flash': { input: 1_600, output: 6_400 },
  'gemini-3.5-flash-lite': { input: 1_200, output: 4_800 },
  // Kept so a run recorded against an older pin still prices correctly rather
  // than silently costing zero.
  'gemini-2.0-flash': { input: 1_600, output: 6_400 },
  'gemini-2.0-flash-lite': { input: 1_200, output: 4_800 },
});

/** A model that takes longer than this is worse than no model. */
export const DEFAULT_TIMEOUT_MS = 20_000;

export class GeminiError extends Error {
  constructor(code, message, { status = null } = {}) {
    super(message);
    this.name = 'GeminiError';
    this.code = code;
    this.status = status;
  }
}

/**
 * The real adapter. Returns `{ text, tokens, costIdr, model, ms }` so the
 * caller can put the call in the execution trace with what it cost, rather
 * than reporting an estimate (constitution III).
 */
export function createGeminiAdapter({
  apiKey = null,
  tier = MODEL_TIER.REASONING,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
} = {}) {
  if (!apiKey) {
    throw new GeminiError(
      'GEMINI_NOT_CONFIGURED',
      'GEMINI_API_KEY belum diset. Gunakan jalur deterministik secara eksplisit.',
    );
  }
  if (typeof fetchImpl !== 'function') {
    throw new GeminiError('GEMINI_NO_FETCH', 'fetch tidak tersedia di runtime ini.');
  }

  // Generous, because on a thinking model the budget is shared with thoughts
  // and a truncated answer is worse than a slow one — the first live cited
  // answer came back cut off mid-sentence at 900.
  async function generate({ prompt, tier: callTier = tier, temperature = 0.2, maxOutputTokens = 4_096 }) {
    const model = MODEL_FOR_TIER[callTier] ?? MODEL_FOR_TIER[MODEL_TIER.REASONING];
    const startedAt = now();

    // An abandoned request still costs the caller's latency budget, so the
    // timeout is enforced here rather than left to the platform default.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetchImpl(`${ENDPOINT}/${model}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature, maxOutputTokens, responseMimeType: 'text/plain' },
        }),
        signal: controller.signal,
      });
    } catch (error) {
      throw new GeminiError(
        error?.name === 'AbortError' ? 'GEMINI_TIMEOUT' : 'GEMINI_UNREACHABLE',
        error?.name === 'AbortError'
          ? `Gemini tidak menjawab dalam ${timeoutMs} ms.`
          : `Gemini tidak bisa dihubungi: ${error?.message ?? 'sebab tidak diketahui'}`,
      );
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      // The body carries Google's reason; the key itself must never be echoed.
      const detail = await safeText(response);
      throw new GeminiError('GEMINI_HTTP_ERROR', `Gemini menolak permintaan (${response.status}). ${detail}`, {
        status: response.status,
      });
    }

    const body = await response.json();
    const text = extractText(body);
    const finishReason = body?.candidates?.[0]?.finishReason ?? null;

    // A cut-off generation is not a shorter answer, it is half a sentence. On
    // a thinking model this is easy to hit, because thoughts and the visible
    // reply share one budget — and a truncated public reply would otherwise
    // reach a customer, since no shape check can reliably tell "brief" from
    // "severed". The API says so outright, so the API is what we believe.
    if (finishReason === 'MAX_TOKENS') {
      throw new GeminiError(
        'GEMINI_TRUNCATED',
        `Jawaban Gemini terpotong di batas ${maxOutputTokens} token; jalur deterministik dipakai.`,
      );
    }

    if (!text) {
      // A blocked or empty candidate is a refusal, not an answer. Returning ""
      // here would let a caller publish silence as if it were content.
      throw new GeminiError(
        'GEMINI_EMPTY',
        `Gemini tidak mengembalikan teks (${body?.promptFeedback?.blockReason ?? 'tanpa kandidat'}).`,
      );
    }

    const usage = body?.usageMetadata ?? {};
    // Thinking tokens are billed at the output rate but are not included in
    // candidatesTokenCount, and on a thinking model they dwarf the visible
    // answer — 328 against 12 in one measurement. Leaving them out would have
    // under-reported the spend by an order of magnitude and let the budget
    // guard wave through calls it should have degraded (constitution V).
    const thoughts = usage.thoughtsTokenCount ?? 0;
    const tokens = {
      input: usage.promptTokenCount ?? 0,
      output: (usage.candidatesTokenCount ?? 0) + thoughts,
      visible: usage.candidatesTokenCount ?? 0,
      thoughts,
    };

    return {
      text: text.trim(),
      model,
      tier: callTier,
      tokens,
      finishReason,
      costIdr: costOf(model, tokens),
      ms: now() - startedAt,
    };
  }

  return { isSeeded: false, generate };
}

/**
 * Builds the adapter when a key exists and returns `null` when it does not,
 * so a caller writes `gemini ?? deterministic` instead of a try/catch. Absence
 * of a key is a normal configuration, not an error.
 */
export function createGeminiAdapterIfConfigured(options = {}) {
  return options?.apiKey ? createGeminiAdapter(options) : null;
}

export function costOf(model, { input = 0, output = 0 } = {}) {
  const rate = RATE_IDR_PER_MTOK[model];
  if (!rate) return 0;
  return Number(((input * rate.input + output * rate.output) / 1_000_000).toFixed(4));
}

function extractText(body) {
  const parts = body?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .map((part) => part?.text ?? '')
    .join('')
    .trim();
}

async function safeText(response) {
  try {
    const text = await response.text();
    return text.slice(0, 300);
  } catch {
    return '';
  }
}
