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
  async function request(path, { method = 'GET', body = null, tenantId = null } = {}) {
    const tenant = tenantId ?? getTenantId?.() ?? null;
    const token = await getToken?.();
    // The reader's language, on every request rather than baked into a client
    // built once — `api/src/plugins/locale.js` reads this same header per
    // request, so switching languages needs no new connection.
    const locale = getLocale?.() ?? null;

    const response = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(tenant ? { 'x-lokus-tenant': tenant } : {}),
        ...(locale ? { 'accept-language': locale } : {}),
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (response.ok) return response.status === 204 ? null : response.json();

    // The API always answers with {error:{code,message}}; a body that is not
    // that shape means something in front of the API failed, and saying so is
    // more useful than reporting an empty message.
    const payload = await response.json().catch(() => null);
    const code = payload?.error?.code ?? `HTTP_${response.status}`;
    const message =
      payload?.error?.message ?? `Layanan tidak menjawab dengan benar (${response.status}).`;

    throw new ApiError(code, message, response.status);
  }

  return {
    isSeeded: false,
    get: (path, options) => request(path, options),
    post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  };
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
