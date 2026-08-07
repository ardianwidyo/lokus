import { createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';

/**
 * An OAuth access token for Google APIs, from Application Default Credentials.
 *
 * This is the piece that replaces `GEMINI_API_KEY`. It resolves credentials the
 * same way every Google client library does — explicit file, then the
 * well-known ADC file, then the metadata server — but with `fetch` and two Node
 * builtins rather than a new dependency, which is the rule the rest of this
 * repository follows for Google APIs.
 *
 * Why it lives in `api/` and not in `packages/core`: resolving credentials
 * needs `node:fs` and `node:crypto`, and core is bundled into the browser
 * console. A credential path that can be reached from browser code is a
 * credential path that will eventually be reached from browser code.
 */

const SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const TOKEN_URI = 'https://oauth2.googleapis.com/token';
const JWT_BEARER_GRANT = 'urn:ietf:params:oauth:grant-type:jwt-bearer';

/** A service-account assertion is valid for an hour; Google allows no more. */
const ASSERTION_TTL_SECONDS = 3_600;

/**
 * Tokens are refreshed this long before they expire. A token that is valid for
 * another two seconds is not usable: the request it authorises has not been
 * sent yet, and a 401 mid-briefing degrades a screen for no reason.
 */
const EXPIRY_SKEW_MS = 60_000;

export class AccessTokenError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AccessTokenError';
    this.code = code;
  }
}

/** Where `gcloud auth application-default login` writes on each platform. */
export function wellKnownAdcPath(env = process.env, os = platform()) {
  if (os === 'win32') {
    const appData = env.APPDATA;
    return appData ? join(appData, 'gcloud', 'application_default_credentials.json') : null;
  }
  return join(homedir(), '.config', 'gcloud', 'application_default_credentials.json');
}

/**
 * Returns `async () => token`, caching until shortly before expiry.
 *
 * The cache holds the in-flight promise rather than only the value, so a
 * briefing that fires six model calls at once mints one token, not six. Every
 * failure carries a code and a message that names the fix; the Gemini adapter
 * turns any of them into a fallback to the deterministic path, so a missing
 * credential degrades the console rather than breaking it.
 */
export function createAccessTokenProvider({
  env = process.env,
  fetchImpl = globalThis.fetch,
  readFileImpl = readFile,
  os = platform(),
  now = () => Date.now(),
} = {}) {
  let cached = null; // { token, expiresAt }
  let inFlight = null;

  async function mint() {
    // An explicit token wins: it is how CI runs against a real project without
    // a credential file, and how anyone can reproduce a call with
    // `gcloud auth application-default print-access-token`.
    if (env.GOOGLE_ACCESS_TOKEN) {
      return { token: env.GOOGLE_ACCESS_TOKEN, expiresIn: 0 };
    }

    const credentials = await loadCredentialsFile({ env, readFileImpl, os });
    if (credentials) return exchangeCredentials(credentials, { fetchImpl, now });

    // Cloud Run, GCE, Cloud Build: the runtime service account, no file at all.
    return fetchMetadataToken({ env, fetchImpl });
  }

  return async function getAccessToken() {
    if (cached && cached.expiresAt > now()) return cached.token;
    if (inFlight) return inFlight;

    inFlight = (async () => {
      const { token, expiresIn } = await mint();
      cached = {
        token,
        // An unknown lifetime is not cached: better one extra round trip than a
        // token this process believes in after Google has stopped honouring it.
        expiresAt: expiresIn > 0 ? now() + expiresIn * 1_000 - EXPIRY_SKEW_MS : 0,
      };
      return token;
    })();

    try {
      return await inFlight;
    } finally {
      inFlight = null;
    }
  };
}

async function loadCredentialsFile({ env, readFileImpl, os }) {
  const explicit = env.GOOGLE_APPLICATION_CREDENTIALS;
  const wellKnown = wellKnownAdcPath(env, os);

  for (const [path, required] of [
    [explicit, true],
    [wellKnown, false],
  ]) {
    if (!path) continue;
    let raw;
    try {
      raw = await readFileImpl(path, 'utf8');
    } catch (error) {
      // A path the operator named explicitly and that does not exist is a
      // misconfiguration worth saying out loud; the well-known path simply
      // being absent is the normal case on Cloud Run.
      if (required) {
        throw new AccessTokenError(
          'CREDENTIALS_UNREADABLE',
          `GOOGLE_APPLICATION_CREDENTIALS menunjuk berkas yang tidak terbaca (${path}): ${error?.message}`,
        );
      }
      continue;
    }

    try {
      return JSON.parse(raw);
    } catch (error) {
      throw new AccessTokenError(
        'CREDENTIALS_MALFORMED',
        `Berkas kredensial ${path} bukan JSON yang sah: ${error?.message}`,
      );
    }
  }

  return null;
}

function exchangeCredentials(credentials, { fetchImpl, now }) {
  if (credentials.type === 'authorized_user') {
    return postTokenRequest(fetchImpl, {
      grant_type: 'refresh_token',
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      refresh_token: credentials.refresh_token,
    });
  }

  if (credentials.type === 'service_account') {
    return postTokenRequest(fetchImpl, {
      grant_type: JWT_BEARER_GRANT,
      assertion: signAssertion(credentials, Math.floor(now() / 1_000)),
    });
  }

  throw new AccessTokenError(
    'CREDENTIALS_UNSUPPORTED',
    `Tipe kredensial "${credentials.type ?? 'tanpa tipe'}" tidak didukung. Pakai authorized_user atau service_account.`,
  );
}

/** RS256 over `header.claims`, which is all a JWT bearer assertion is. */
function signAssertion({ client_email: clientEmail, private_key: privateKey }, issuedAt) {
  if (!clientEmail || !privateKey) {
    throw new AccessTokenError(
      'CREDENTIALS_MALFORMED',
      'Kredensial service account tidak punya client_email atau private_key.',
    );
  }

  const payload = [
    { alg: 'RS256', typ: 'JWT' },
    {
      iss: clientEmail,
      scope: SCOPE,
      aud: TOKEN_URI,
      iat: issuedAt,
      exp: issuedAt + ASSERTION_TTL_SECONDS,
    },
  ]
    .map((part) => Buffer.from(JSON.stringify(part)).toString('base64url'))
    .join('.');

  const signature = createSign('RSA-SHA256').update(payload).sign(privateKey).toString('base64url');
  return `${payload}.${signature}`;
}

async function postTokenRequest(fetchImpl, form) {
  let response;
  try {
    response = await fetchImpl(TOKEN_URI, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(form).toString(),
    });
  } catch (error) {
    throw new AccessTokenError('TOKEN_UNREACHABLE', `oauth2.googleapis.com tidak bisa dihubungi: ${error?.message}`);
  }

  if (!response.ok) {
    // Google's reason is useful; the refresh token and client secret in the
    // request are not, and must not travel back out in an error message.
    const detail = (await safeText(response)).slice(0, 200);
    throw new AccessTokenError('TOKEN_REFUSED', `Google menolak permintaan token (${response.status}). ${detail}`);
  }

  const body = await response.json();
  if (!body?.access_token) {
    throw new AccessTokenError('TOKEN_EMPTY', 'Google membalas tanpa access_token.');
  }
  return { token: body.access_token, expiresIn: Number(body.expires_in ?? 0) };
}

async function fetchMetadataToken({ env, fetchImpl }) {
  const host = env.GCE_METADATA_HOST ?? 'metadata.google.internal';
  const url = `http://${host}/computeMetadata/v1/instance/service-account/token`;

  let response;
  try {
    response = await fetchImpl(url, { headers: { 'metadata-flavor': 'Google' } });
  } catch (error) {
    // Off Google Cloud this host does not resolve, and that is the ordinary
    // case for a laptop with no ADC file — so the message says what to run.
    throw new AccessTokenError(
      'NO_CREDENTIALS',
      `Tidak ada kredensial Google. Jalankan \`gcloud auth application-default login\` atau set GOOGLE_APPLICATION_CREDENTIALS (${error?.message}).`,
    );
  }

  if (!response.ok) {
    throw new AccessTokenError(
      'METADATA_REFUSED',
      `Metadata server menolak permintaan token (${response.status}).`,
    );
  }

  const body = await response.json();
  if (!body?.access_token) {
    throw new AccessTokenError('TOKEN_EMPTY', 'Metadata server membalas tanpa access_token.');
  }
  return { token: body.access_token, expiresIn: Number(body.expires_in ?? 0) };
}

async function safeText(response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}
