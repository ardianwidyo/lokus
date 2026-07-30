import { DEFAULT_LOCALE, isLocale, localeFromAcceptLanguage, normaliseLocale } from '@lokus/core';

/**
 * Resolves the locale for every request — AC-8.4.
 *
 * The locale travels *on the request* rather than being inferred from the tenant
 * or held in process state. Two operators of the same tenant can read the console
 * in different languages at the same time, and one process serves both; a
 * server-side default per tenant would make whichever of them asked second read
 * the other's language.
 *
 * `?locale=` wins over `Accept-Language`, because it is the console stating a
 * choice the reader made rather than the browser stating a preference the reader
 * may never have set. Anything unrecognised is Indonesian: a bad header is not a
 * reason to refuse a request.
 */
export function registerLocale(fastify) {
  fastify.decorateRequest('locale', DEFAULT_LOCALE);

  fastify.addHook('onRequest', async (request) => {
    request.locale = resolveLocale(request);
    // Constitution III: the locale is part of what produced the response, so it
    // belongs on the log line beside the tenant.
    request.log = request.log.child({ locale: request.locale });
  });
}

export function resolveLocale({ query, headers } = {}) {
  const requested = query?.locale;
  if (typeof requested === 'string' && isLocale(normaliseLocale(requested))) {
    return normaliseLocale(requested);
  }

  return localeFromAcceptLanguage(headers?.['accept-language']);
}
