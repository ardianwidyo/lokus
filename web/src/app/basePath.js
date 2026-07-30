/**
 * Where the console is mounted.
 *
 * On Cloud Run it is the domain root; on GitHub Pages it is a subdirectory
 * (`/lokus/`), because Pages serves a project site under the repository name.
 * The fourteen screen paths in screens.js are written from the root either way
 * — the mount point is a deployment fact, not a routing one, so it is stripped
 * on the way in and prepended on the way out and nothing else has to know.
 *
 * Vite substitutes BASE_URL at build time from `base` in vite.config.js.
 */
const RAW_BASE = import.meta.env?.BASE_URL ?? '/';

/** `/lokus/` → `/lokus`; `/` → `''`. No trailing slash, so paths concatenate. */
export function normaliseBase(base) {
  const trimmed = String(base ?? '/').replace(/\/+$/, '');
  return trimmed === '' || trimmed === '/' ? '' : trimmed;
}

export const BASE_PATH = normaliseBase(RAW_BASE);

/**
 * A browser pathname → the app path the router understands.
 * `/lokus/briefing` → `/briefing`, and the bare mount point → `/`.
 */
export function stripBase(pathname, base = BASE_PATH) {
  if (!base || !pathname.startsWith(base)) return pathname;

  const rest = pathname.slice(base.length);
  return rest === '' ? '/' : rest;
}

/** An app path → the URL to put in the address bar. `/briefing` → `/lokus/briefing`. */
export function withBase(path, base = BASE_PATH) {
  if (!base) return path;
  return `${base}${path}`;
}
