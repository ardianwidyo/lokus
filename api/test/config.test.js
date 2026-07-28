import { describe, expect, it } from 'vitest';

import { SECURETOKEN_JWKS_URI, loadConfig } from '../src/config.js';

const MINIMAL_ENV = { GOOGLE_CLOUD_PROJECT: 'lokus-ebco-2026' };

describe('loadConfig', () => {
  it('refuses to boot without a project id', () => {
    expect(() => loadConfig({})).toThrow(/GOOGLE_CLOUD_PROJECT/);
  });

  it('derives the Identity Platform issuer and audience from the project id', () => {
    const config = loadConfig(MINIMAL_ENV);

    expect(config.auth.issuer).toBe('https://securetoken.google.com/lokus-ebco-2026');
    expect(config.auth.audience).toBe('lokus-ebco-2026');
    expect(config.auth.jwksUri).toBe(SECURETOKEN_JWKS_URI);
  });

  it('defaults to the region and claim names the infrastructure declares', () => {
    const config = loadConfig(MINIMAL_ENV);

    expect(config.region).toBe('asia-southeast2');
    expect(config.auth.tenantClaim).toBe('tenantId');
    expect(config.auth.rolesClaim).toBe('roles');
  });

  it('carries no credential default', () => {
    const config = loadConfig(MINIMAL_ENV);

    expect(config.storage.documentsBucket).toBeNull();
    expect(JSON.stringify(config)).not.toMatch(/secret|password|key"\s*:\s*"[^"]/i);
  });

  it('takes overrides from the environment', () => {
    const config = loadConfig({
      ...MINIMAL_ENV,
      PORT: '9090',
      LOKUS_ENVIRONMENT: 'prod',
      LOKUS_TENANT_CLAIM: 'tid',
      BQ_MARTS_DATASET: 'lokus_marts_prod',
    });

    expect(config.port).toBe(9090);
    expect(config.environment).toBe('prod');
    expect(config.auth.tenantClaim).toBe('tid');
    expect(config.bigquery.martsDataset).toBe('lokus_marts_prod');
  });
});
