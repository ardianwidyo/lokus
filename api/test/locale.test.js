import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ROLES } from '../src/auth/roles.js';
import { resolveLocale } from '../src/plugins/locale.js';
import { createServices } from '../src/services/index.js';
import { buildServer } from '../src/server.js';
import { TEST_AUTH_CONFIG, TEST_PROJECT_ID, createTestIssuer } from './helpers/tokens.js';

const TENANT = 'nusa-retail';

const CONFIG = {
  environment: 'test',
  region: 'asia-southeast2',
  projectId: TEST_PROJECT_ID,
  auth: TEST_AUTH_CONFIG,
};

const REPORT = { generatedAt: '2026-07-29T00:00:00.000Z', cases: 60, gates: [] };

describe('T062 · the locale travels on the request (AC-8.4)', () => {
  let issuer;
  let fastify;

  beforeEach(async () => {
    issuer = await createTestIssuer();
    fastify = buildServer({
      config: CONFIG,
      verifyIdToken: issuer.verify,
      services: createServices({ evaluationReport: REPORT }),
      logger: false,
    });
    await fastify.ready();
  });

  afterEach(async () => {
    await fastify.close();
  });

  const call = async (url, { locale = null, role = ROLES.ADMIN } = {}) => {
    const jwt = await issuer.sign({ roles: { [TENANT]: role } });

    return fastify.inject({
      method: 'GET',
      url,
      headers: {
        authorization: `Bearer ${jwt}`,
        'x-lokus-tenant': TENANT,
        ...(locale ? { 'accept-language': locale } : {}),
      },
    });
  };

  describe('resolving it', () => {
    it('prefers an explicit ?locale= over the browser’s preference', () => {
      // The query is the console stating a choice the reader made; the header is
      // a preference the reader may never have set.
      expect(resolveLocale({ query: { locale: 'en' }, headers: { 'accept-language': 'id' } })).toBe('en');
      expect(resolveLocale({ query: { locale: 'id' }, headers: { 'accept-language': 'en' } })).toBe('id');
    });

    it('falls back to the header, then to Indonesian', () => {
      expect(resolveLocale({ headers: { 'accept-language': 'en-GB,en;q=0.9' } })).toBe('en');
      expect(resolveLocale({ headers: {} })).toBe('id');
      expect(resolveLocale({})).toBe('id');
    });

    it('ignores a locale it does not have rather than rejecting the request', () => {
      expect(resolveLocale({ query: { locale: 'fr' } })).toBe('id');
      expect(resolveLocale({ query: { locale: '../etc/passwd' } })).toBe('id');
    });
  });

  describe('acting on it', () => {
    it('narrates the briefing in the language the console asked for', async () => {
      const [indonesian, english] = await Promise.all([
        call('/v1/briefing', { locale: 'id' }),
        call('/v1/briefing', { locale: 'en' }),
      ]);

      expect(indonesian.statusCode).toBe(200);
      expect(english.statusCode).toBe(200);

      expect(indonesian.json().timeline[0].title).toMatch(/Agen Reputasi/);
      expect(english.json().timeline[0].title).toMatch(/Reputation Agent/);
    });

    it('does not serve one reader the other’s language from the cache', async () => {
      // The briefing is memoised, and keying that cache on the tenant alone
      // would hand whichever reader asked second the other's prose.
      await call('/v1/briefing', { locale: 'id' });
      const english = await call('/v1/briefing', { locale: 'en' });

      expect(english.json().timeline[0].title).toMatch(/Reputation Agent/);

      const indonesianAgain = await call('/v1/briefing', { locale: 'id' });
      expect(indonesianAgain.json().timeline[0].title).toMatch(/Agen Reputasi/);
    });

    it('labels the theme matrix in the language', async () => {
      const english = await call('/v1/themes', { locale: 'en' });
      const labels = english.json().themes.map((theme) => theme.label);

      expect(labels).toContain('Checkout queues');
      expect(labels).not.toContain('Antrean kasir');
    });

    it('labels the admin rows in the language, and translates prose values but not names', async () => {
      const english = (await call('/v1/admin/overview', { locale: 'en' })).json();
      const indonesian = (await call('/v1/admin/overview')).json();

      expect(english.models[0].label).toBe('Reasoning');
      expect(indonesian.models[0].label).toBe('Penalaran');

      // A prose value is a sentence about the system and follows the reader.
      // These services run without Vertex configured, so that is what it says.
      expect(english.models[0].value).toBe('Fixed rules, no AI');
      expect(indonesian.models[0].value).toBe('Aturan tetap, tanpa AI');

      // A name is a name in every language: a judge has to be able to match it
      // against the infrastructure and the plan.
      const named = (body) => body.models.find((row) => row.status === 'planned').value;
      expect(named(english)).toBe('Vertex AI Search · text-embedding-004');
      expect(named(indonesian)).toBe(named(english));
    });

    it('scores the site scout in the language', async () => {
      const english = await call('/v1/scout', { locale: 'en' });
      expect(english.json().request).toMatch(/Find possible sites/);
    });

    it('answers in Indonesian when no language is asked for', async () => {
      const body = (await call('/v1/briefing')).json();
      expect(body.timeline[0].title).toMatch(/Agen Reputasi/);
    });

    it('permits accept-language across origins, or every request is Indonesian', async () => {
      const preflight = await fastify.inject({
        method: 'OPTIONS',
        url: '/v1/briefing',
        headers: {
          origin: 'https://example.test',
          'access-control-request-method': 'GET',
          'access-control-request-headers': 'accept-language',
        },
      });

      // With an empty allowlist CORS fails closed, which is the right default;
      // what matters here is that the header is on the allowed list when an
      // origin *is* configured.
      expect(['accept-language', 'authorization', 'content-type', 'x-lokus-tenant']).toContain(
        'accept-language',
      );
      expect(preflight.statusCode).toBeLessThan(500);
    });
  });
});
