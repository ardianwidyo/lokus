# api — LOKUS API (T002)

Fastify on Node 20+, deployed to Cloud Run. This phase delivers authentication,
tenant isolation, and role enforcement; the domain routes arrive with P1–P4.

## The auth contract

An Identity Platform ID token carries two custom claims:

```json
{
  "sub": "user-dwi",
  "tenantId": "nusa-retail",
  "roles": { "nusa-retail": "manager", "dealer-arta-motor": "admin" }
}
```

`roles` is the authority on what the caller may see. `tenantId` is only a
convenience default and is discarded when `roles` grants no membership for it.

Three request decorators compose in this order:

| Decorator | Effect | Failure |
|---|---|---|
| `fastify.authenticate` | verifies the token against Google's JWKS, builds `request.principal` | `401 AUTH_TOKEN_MISSING` / `AUTH_TOKEN_INVALID` / `AUTH_TENANT_CLAIM_MISSING` |
| `fastify.withTenant` | resolves the tenant from `x-lokus-tenant` (or route/query param) and checks membership → `request.tenant` | `400 TENANT_REQUIRED`, `403 TENANT_FORBIDDEN` |
| `fastify.requireRole(role)` | server-side role gate, `viewer < manager < admin` | `403 ROLE_FORBIDDEN` |

```js
fastify.post('/v1/reviews/:reviewId/reply',
  { preHandler: [fastify.authenticate, fastify.withTenant, fastify.requireRole(ROLES.MANAGER)] },
  handler);
```

## How the constitution's rules are enforced here

- **No cross-tenant read (AC-6.1).** Membership is read from the token, never
  from the request body. A tenant the token does not grant returns `403` whether
  or not it exists, so the endpoint cannot be used to enumerate tenants.
- **Tenant id in every query (constitution IV).** `src/lib/tenantScope.js` is
  the only way to build a filter or a WHERE clause. A missing tenant id throws
  `TenantScopeError` instead of returning rows, and a `tenantId` passed in the
  caller's filters is overwritten rather than honoured.
- **Tenant id in every log line.** `withTenant` replaces `request.log` with a
  child logger bound to `tenantId` and `userId`.
- **Role shown and enforced (AC-6.3).** `GET /v1/session` returns each tenant
  with its role for screen 01; the same role is what `requireRole` checks. The
  UI hiding a button is a courtesy, not the control.
- **Errors leak nothing.** A token failure returns `AUTH_TOKEN_INVALID`
  regardless of the reason — expiry, audience, signature. The reason is logged,
  not returned.

## Routes

| Method | Path | Auth |
|---|---|---|
| `GET` | `/healthz` | none (Cloud Run probes) |
| `GET` | `/v1/session` | token |
| `POST` | `/v1/session/tenant` | token + tenant |

## Local development

```bash
cp .env.example .env      # no secrets; real values come from Secret Manager
npm run dev  --workspace api
npm test     --workspace api
npm run test:coverage --workspace api
```

The tenant directory is a seeded in-memory implementation behind the same
interface a Firestore-backed one will use — the pattern `plan.md` prescribes
for the Business Profile adapter (Q1).
