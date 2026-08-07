import { generateKeyPairSync } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import {
  AccessTokenError,
  createAccessTokenProvider,
  wellKnownAdcPath,
} from '../src/lib/googleAccessToken.js';

const tokenResponse = (token = 'ya29.fresh', expiresIn = 3_600) => ({
  ok: true,
  status: 200,
  json: async () => ({ access_token: token, expires_in: expiresIn }),
});

const userAdc = JSON.stringify({
  type: 'authorized_user',
  client_id: 'client.apps.googleusercontent.com',
  client_secret: 'shh',
  refresh_token: '1//refresh',
});

/** Reads the form body a token request sent, without parsing it by hand twice. */
const formOf = (call) => Object.fromEntries(new URLSearchParams(call[1].body));

describe('Google access token provider (Vertex AI credentials)', () => {
  it('prefers an explicit token so a run can be reproduced by hand', async () => {
    const fetchImpl = vi.fn();
    const getToken = createAccessTokenProvider({
      env: { GOOGLE_ACCESS_TOKEN: 'ya29.explicit' },
      fetchImpl,
    });

    expect(await getToken()).toBe('ya29.explicit');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('exchanges a user ADC refresh token for an access token', async () => {
    const fetchImpl = vi.fn(async () => tokenResponse());
    const getToken = createAccessTokenProvider({
      env: { GOOGLE_APPLICATION_CREDENTIALS: 'C:/adc.json' },
      fetchImpl,
      readFileImpl: async () => userAdc,
    });

    expect(await getToken()).toBe('ya29.fresh');

    const [url] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://oauth2.googleapis.com/token');
    expect(formOf(fetchImpl.mock.calls[0])).toMatchObject({
      grant_type: 'refresh_token',
      refresh_token: '1//refresh',
    });
  });

  it('signs a JWT assertion for a service account key', async () => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const fetchImpl = vi.fn(async () => tokenResponse());
    const getToken = createAccessTokenProvider({
      env: { GOOGLE_APPLICATION_CREDENTIALS: '/sa.json' },
      fetchImpl,
      readFileImpl: async () =>
        JSON.stringify({
          type: 'service_account',
          client_email: 'lokus-api@ebco-aihack-ardian.iam.gserviceaccount.com',
          private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
        }),
      now: () => 1_700_000_000_000,
    });

    await getToken();

    const form = formOf(fetchImpl.mock.calls[0]);
    expect(form.grant_type).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer');

    const [header, claims] = form.assertion
      .split('.')
      .slice(0, 2)
      .map((part) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8')));
    expect(header).toEqual({ alg: 'RS256', typ: 'JWT' });
    expect(claims).toMatchObject({
      iss: 'lokus-api@ebco-aihack-ardian.iam.gserviceaccount.com',
      aud: 'https://oauth2.googleapis.com/token',
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      iat: 1_700_000_000,
      exp: 1_700_003_600,
    });
    // Three segments and a signature that is not empty: an assertion Google
    // would at least attempt to verify.
    expect(form.assertion.split('.')).toHaveLength(3);
    expect(form.assertion.split('.')[2].length).toBeGreaterThan(80);
  });

  it('falls back to the metadata server when there is no credential file', async () => {
    // This is the Cloud Run path: the runtime service account, no file at all.
    const fetchImpl = vi.fn(async () => tokenResponse('ya29.metadata'));
    const getToken = createAccessTokenProvider({
      env: { GCE_METADATA_HOST: 'metadata.google.internal', APPDATA: undefined },
      fetchImpl,
      readFileImpl: async () => {
        throw new Error('ENOENT');
      },
      os: 'linux',
    });

    expect(await getToken()).toBe('ya29.metadata');

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toContain('/computeMetadata/v1/instance/service-account/token');
    expect(init.headers['metadata-flavor']).toBe('Google');
  });

  it('caches until shortly before expiry rather than on every call', async () => {
    let clock = 1_000_000;
    const fetchImpl = vi.fn(async () => tokenResponse('ya29.cached', 3_600));
    const getToken = createAccessTokenProvider({
      env: { GOOGLE_APPLICATION_CREDENTIALS: '/adc.json' },
      fetchImpl,
      readFileImpl: async () => userAdc,
      now: () => clock,
    });

    await getToken();
    await getToken();
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    // Past the hour minus the 60 s safety margin: a token valid for another
    // two seconds is not usable for a request that has not been sent yet.
    clock += 3_600_000 - 30_000;
    await getToken();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('mints one token for a burst of concurrent calls, not one each', async () => {
    // A briefing fires several model calls at once; six token requests for one
    // token is six chances to be rate-limited on the credential path.
    const fetchImpl = vi.fn(async () => tokenResponse());
    const getToken = createAccessTokenProvider({
      env: { GOOGLE_APPLICATION_CREDENTIALS: '/adc.json' },
      fetchImpl,
      readFileImpl: async () => userAdc,
    });

    const tokens = await Promise.all([getToken(), getToken(), getToken()]);

    expect(tokens).toEqual(['ya29.fresh', 'ya29.fresh', 'ya29.fresh']);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('does not cache a token whose lifetime Google did not state', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'ya29.unknown-ttl' }),
    }));
    const getToken = createAccessTokenProvider({
      env: { GOOGLE_APPLICATION_CREDENTIALS: '/adc.json' },
      fetchImpl,
      readFileImpl: async () => userAdc,
    });

    await getToken();
    await getToken();

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('names the fix when there are no credentials anywhere', async () => {
    const getToken = createAccessTokenProvider({
      env: {},
      fetchImpl: async () => {
        throw new Error('getaddrinfo ENOTFOUND metadata.google.internal');
      },
      readFileImpl: async () => {
        throw new Error('ENOENT');
      },
      os: 'linux',
    });

    const error = await getToken().catch((e) => e);

    expect(error).toBeInstanceOf(AccessTokenError);
    expect(error.code).toBe('NO_CREDENTIALS');
    expect(error.message).toContain('gcloud auth application-default login');
  });

  it('complains loudly when an explicitly named credential file is missing', async () => {
    // An absent well-known file is the normal Cloud Run case; a path the
    // operator typed and that does not exist is a misconfiguration.
    const getToken = createAccessTokenProvider({
      env: { GOOGLE_APPLICATION_CREDENTIALS: '/tidak/ada.json' },
      fetchImpl: async () => tokenResponse(),
      readFileImpl: async () => {
        throw new Error('ENOENT');
      },
    });

    const error = await getToken().catch((e) => e);
    expect(error.code).toBe('CREDENTIALS_UNREADABLE');
    expect(error.message).toContain('/tidak/ada.json');
  });

  it('refuses a credential type it cannot honour instead of guessing', async () => {
    const getToken = createAccessTokenProvider({
      env: { GOOGLE_APPLICATION_CREDENTIALS: '/impersonated.json' },
      fetchImpl: async () => tokenResponse(),
      readFileImpl: async () => JSON.stringify({ type: 'external_account' }),
    });

    const error = await getToken().catch((e) => e);
    expect(error.code).toBe('CREDENTIALS_UNSUPPORTED');
    expect(error.message).toContain('external_account');
  });

  it('reports a refused exchange without echoing the refresh token back', async () => {
    const getToken = createAccessTokenProvider({
      env: { GOOGLE_APPLICATION_CREDENTIALS: '/adc.json' },
      fetchImpl: async () => ({ ok: false, status: 400, text: async () => 'invalid_grant' }),
      readFileImpl: async () => userAdc,
    });

    const error = await getToken().catch((e) => e);

    expect(error.code).toBe('TOKEN_REFUSED');
    expect(error.message).toContain('invalid_grant');
    expect(error.message).not.toContain('1//refresh');
  });

  it('looks for the ADC file where gcloud writes it on each platform', () => {
    expect(wellKnownAdcPath({ APPDATA: 'C:\\Users\\a\\AppData\\Roaming' }, 'win32')).toContain(
      'gcloud',
    );
    expect(wellKnownAdcPath({}, 'linux')).toContain('.config');
  });
});
