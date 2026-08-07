import { MODEL_TIER } from '../cost/budget.js';

/**
 * Gemini, over the Vertex AI REST endpoint.
 *
 * No SDK: one `fetch` against a documented HTTP API is the whole requirement,
 * and plan.md does not list a Google client library. What changed on
 * 2026-08-07 is not the transport but the identity — the AI Studio endpoint
 * authenticated with a bearer API key, Vertex authenticates with an OAuth
 * access token minted from Application Default Credentials, so there is no
 * long-lived secret to store, mount, or leak. `aiplatform.googleapis.com` is
 * also the endpoint plan.md's stack table always named.
 *
 * The token is fetched by the caller and injected as `getAccessToken`, because
 * resolving credentials needs `node:fs` and `node:crypto` and this file is in
 * the bundle the browser console ships. The console never holds a credential:
 * the GitHub Pages demo runs the deterministic path instead.
 */

/**
 * The multi-region endpoint. Measured against project `ebco-aihack-ardian` on
 * 2026-08-07: `global` and `asia-southeast1` both answer 200; `asia-southeast2`
 * — the region the rest of the stack lives in — answers 400 FAILED_PRECONDITION,
 * because these models are not served from Jakarta. `global` is the default
 * because it has the widest capacity; set `GOOGLE_CLOUD_LOCATION` to pin a
 * region when data residency has to win over availability.
 */
export const DEFAULT_LOCATION = 'global';

/**
 * Which published model backs each budget tier.
 *
 * Pinned rather than the floating `*-latest` aliases. Constitution III wants
 * the trace to say what actually ran, and an alias can be repointed under a
 * recorded run, which makes the trace a guess after the fact.
 *
 * Both were confirmed reachable on Vertex on 2026-08-07, and before that on AI
 * Studio on 2026-07-30. `gemini-2.0-*`, the earlier choice, returned 429 on the
 * AI Studio path — a spent free-tier allowance, which is exactly why a
 * rate-limited model must degrade rather than fail.
 *
 * Measured 2026-07-30, on a short constrained prompt:
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
 * does, which is the only job these numbers have here. Vertex bills the same
 * per-token rates as AI Studio's paid tier, so the table did not move when the
 * endpoint did; what moved is that these tokens are now billed at all.
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

/** `global` is served from the unprefixed host; every region prefixes its own. */
export function endpointFor({ projectId, location, model }) {
  const host = location === 'global' ? 'aiplatform.googleapis.com' : `${location}-aiplatform.googleapis.com`;
  return `https://${host}/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;
}

/**
 * The real adapter. Returns `{ text, tokens, costIdr, model, ms }` so the
 * caller can put the call in the execution trace with what it cost, rather
 * than reporting an estimate (constitution III).
 */
export function createGeminiAdapter({
  projectId = null,
  location = DEFAULT_LOCATION,
  getAccessToken = null,
  tier = MODEL_TIER.REASONING,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
} = {}) {
  if (!projectId) {
    throw new GeminiError(
      'GEMINI_NOT_CONFIGURED',
      'Project Vertex AI belum diset. Gunakan jalur deterministik secara eksplisit.',
    );
  }
  if (typeof getAccessToken !== 'function') {
    throw new GeminiError(
      'GEMINI_NOT_CONFIGURED',
      'Penyedia access token Vertex AI belum diberikan. Gunakan jalur deterministik secara eksplisit.',
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
    // The clock starts before the token is fetched: a cached token costs
    // nothing, an expired one costs a round trip, and the trace should report
    // the wait the caller actually had rather than the part we like.
    const startedAt = now();

    let token;
    try {
      token = await getAccessToken();
    } catch (error) {
      throw new GeminiError(
        'GEMINI_NO_CREDENTIALS',
        `Kredensial Google tidak bisa diambil: ${error?.message ?? 'sebab tidak diketahui'}`,
      );
    }
    if (!token) {
      throw new GeminiError(
        'GEMINI_NO_CREDENTIALS',
        'Kredensial Google kosong. Jalankan `gcloud auth application-default login` atau beri service account pada runtime.',
      );
    }

    // An abandoned request still costs the caller's latency budget, so the
    // timeout is enforced here rather than left to the platform default.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetchImpl(endpointFor({ projectId, location, model }), {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
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
      // The body carries Google's reason; the token itself must never be echoed.
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
    // answer — 487 against 21 in one Vertex measurement. Leaving them out would
    // under-report the spend by an order of magnitude and let the budget guard
    // wave through calls it should have degraded (constitution V).
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

  return { isSeeded: false, projectId, location, generate };
}

/**
 * Builds the adapter when Vertex is configured and returns `null` when it is
 * not, so a caller writes `gemini ?? deterministic` instead of a try/catch.
 * An unconfigured reasoning layer is a normal configuration, not an error.
 */
export function createGeminiAdapterIfConfigured(options = {}) {
  return options?.projectId && typeof options?.getAccessToken === 'function'
    ? createGeminiAdapter(options)
    : null;
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
    // Vertex can return the model's own thinking as a part flagged `thought`.
    // That is working notes, not an answer, and it must never be published as
    // one — nor counted as text when deciding whether the model said anything.
    .filter((part) => !part?.thought)
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
