/**
 * The HTTP client every remote data source shares.
 *
 * It attaches the bearer token and the tenant header, and maps the API's error
 * codes onto the ones `useAsyncData` already understands — so a 403 for a
 * tenant the caller has no membership for renders as "perlu izin" rather than
 * as a generic failure.
 */

export class ApiError extends Error {
  constructor(code, message, status) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

/** Codes the panel layer treats as "needs permission" rather than "error". */
const PERMISSION_CODES = new Set(['TENANT_FORBIDDEN', 'ROLE_FORBIDDEN', 'AUTH_TENANT_CLAIM_MISSING']);

export function createApiClient({ baseUrl, getToken, getTenantId, getLocale = null, fetchImpl = fetch }) {
  async function send(path, { method = 'GET', body = null, tenantId = null } = {}) {
    const tenant = tenantId ?? getTenantId?.() ?? null;
    const token = await getToken?.();
    // The reader's language, on every request rather than baked into a client
    // built once — `api/src/plugins/locale.js` reads this same header per
    // request, so switching languages needs no new connection.
    const locale = getLocale?.() ?? null;

    return fetchImpl(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(tenant ? { 'x-lokus-tenant': tenant } : {}),
        ...(locale ? { 'accept-language': locale } : {}),
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }

  /** Every failure path, shared: a download refused must raise what a read does. */
  async function raise(response) {
    // The API always answers with {error:{code,message}}; a body that is not
    // that shape means something in front of the API failed, and saying so is
    // more useful than reporting an empty message.
    const payload = await response.json().catch(() => null);
    const code = payload?.error?.code ?? `HTTP_${response.status}`;
    const message =
      payload?.error?.message ?? `Layanan tidak menjawab dengan benar (${response.status}).`;

    throw new ApiError(code, message, response.status);
  }

  async function request(path, options) {
    const response = await send(path, options);
    if (response.ok) return response.status === 204 ? null : response.json();
    return raise(response);
  }

  /**
   * A file rather than a document (AC-10.11).
   *
   * The name and the origin come off the response headers, not off a guess made
   * from the URL: the server is the only party that knows whether it just sent
   * the original file or a rendition of the indexed text, and `documentFile`
   * on the seeded source returns the same three fields so the screens above
   * cannot tell the two sources apart.
   */
  async function requestFile(path, options) {
    const response = await send(path, options);
    if (!response.ok) return raise(response);

    return {
      blob: await response.blob(),
      filename: filenameFromDisposition(response.headers?.get('content-disposition')),
      mimeType: response.headers?.get('content-type') ?? 'application/octet-stream',
      origin: response.headers?.get('x-lokus-file-origin') ?? null,
    };
  }

  /**
   * A multipart upload (AC-10.12).
   *
   * `FormData` sets its own `content-type` with the boundary the body was
   * actually written with; supplying one here would produce a boundary that
   * matches nothing and a body the server cannot parse. So this bypasses
   * `send`'s JSON header rather than passing a body through it.
   */
  async function requestForm(path, form, { tenantId = null } = {}) {
    const tenant = tenantId ?? getTenantId?.() ?? null;
    const token = await getToken?.();
    const locale = getLocale?.() ?? null;

    const response = await fetchImpl(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(tenant ? { 'x-lokus-tenant': tenant } : {}),
        ...(locale ? { 'accept-language': locale } : {}),
      },
      body: form,
    });

    if (response.ok) return response.status === 204 ? null : response.json();
    return raise(response);
  }

  return {
    isSeeded: false,
    get: (path, options) => request(path, options),
    post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
    getFile: (path, options) => requestFile(path, options),
    postForm: (path, form, options) => requestForm(path, form, options),
  };
}

/**
 * The filename the server chose, out of `Content-Disposition`.
 *
 * `filename*` first: it is the exact name, percent-encoded UTF-8, and the plain
 * `filename` beside it is the flattened ASCII fallback the API sends for old
 * clients. Preferring the fallback would turn "SOP Layanan · v4.txt" into
 * "SOP Layanan _ v4.txt" on a browser that had no such limitation.
 */
export function filenameFromDisposition(header) {
  if (!header) return 'dokumen';

  const extended = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (extended) {
    try {
      return decodeURIComponent(extended[1].trim());
    } catch {
      // A malformed encoding is the server's problem, not a reason to fail the
      // download: fall through to the ASCII name it also sent.
    }
  }

  const plain = /filename="([^"]*)"/i.exec(header) ?? /filename=([^;]+)/i.exec(header);
  return plain ? plain[1].trim() : 'dokumen';
}

export function isPermissionError(error) {
  return PERMISSION_CODES.has(error?.code);
}

/**
 * The token the console sends.
 *
 * There is no real one yet: Identity Platform is not provisioned (spec.md Q1),
 * so this mints the `dev:` token the API accepts only when it is running with
 * LOKUS_AUTH_MODE=dev. Against a production API these are rejected, which is
 * the correct outcome — the console is not pretending to be signed in.
 */
export function createDevTokenProvider({ getTenant, user = 'demo' }) {
  return () => {
    const tenant = getTenant?.();

    // Before a tenant is chosen the console still has to authenticate, because
    // the list of tenants to choose from comes from an authenticated route.
    // Returning null here is what made screen 01 unreachable over HTTP.
    if (!tenant?.tenantId || !tenant?.role) return `dev:${user}`;

    return `dev:${user}:${tenant.tenantId}:${tenant.role}`;
  };
}
