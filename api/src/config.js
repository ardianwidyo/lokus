/**
 * Runtime configuration. Every value comes from the environment; secrets are
 * injected by Cloud Run from Secret Manager (see infra/cloud_run.tf). Nothing
 * here has a hard-coded credential default.
 */

const DEFAULT_TENANT_CLAIM = 'tenantId';
const DEFAULT_ROLES_CLAIM = 'roles';

/** Google's JWKS for Identity Platform / Firebase secure tokens. */
const SECURETOKEN_JWKS_URI =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

function required(name, value) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadConfig(env = process.env) {
  const projectId = required('GOOGLE_CLOUD_PROJECT', env.GOOGLE_CLOUD_PROJECT);

  return {
    env: env.NODE_ENV ?? 'development',
    port: Number(env.PORT ?? 8080),
    host: env.HOST ?? '0.0.0.0',
    projectId,
    region: env.LOKUS_REGION ?? 'asia-southeast2',
    environment: env.LOKUS_ENVIRONMENT ?? 'dev',

    auth: {
      // Identity Platform signs ID tokens with the securetoken service account;
      // issuer and audience are both derived from the project id.
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      jwksUri: env.LOKUS_JWKS_URI ?? SECURETOKEN_JWKS_URI,
      tenantClaim: env.LOKUS_TENANT_CLAIM ?? DEFAULT_TENANT_CLAIM,
      rolesClaim: env.LOKUS_ROLES_CLAIM ?? DEFAULT_ROLES_CLAIM,
      // Tolerance for clock drift between Cloud Run and the token issuer.
      clockToleranceSeconds: Number(env.LOKUS_CLOCK_TOLERANCE_SECONDS ?? 5),
    },

    bigquery: {
      martsDataset: env.BQ_MARTS_DATASET ?? `lokus_marts_${env.LOKUS_ENVIRONMENT ?? 'dev'}`,
    },
    storage: {
      documentsBucket: env.DOCS_BUCKET ?? null,
    },
  };
}

export { DEFAULT_TENANT_CLAIM, DEFAULT_ROLES_CLAIM, SECURETOKEN_JWKS_URI };
