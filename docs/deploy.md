# Deploy — LOKUS (T057)

Two Cloud Run services in `asia-southeast2`: `lokus-api-<env>` and
`lokus-web-<env>`. Every merge to `main` deploys, once CI is green
(constitution VII).

## One-time setup

You need a Google Cloud project with billing enabled, and `gcloud` +
`terraform` locally.

### 1. Provision the infrastructure

```bash
cd infra
cp backend.hcl.example backend.hcl            # the GCS bucket for state
cp terraform.tfvars.example terraform.tfvars  # project id, environment

terraform init -backend-config=backend.hcl
terraform apply
```

This creates everything, including the Workload Identity pool that lets GitHub
Actions deploy **without a service-account key**. A downloaded JSON key is a
long-lived credential that leaks with the repository and cannot be rotated by
CI; a federated token lasts minutes and is bound to this one repository by the
`attribute_condition` in `infra/deploy.tf`.

If your repository is not `ardianwidyo/lokus`, set `github_repository` in
`terraform.tfvars` — otherwise the condition will refuse your workflow, which
is the intended behaviour.

### 2. Fill the secrets

Terraform creates the Secret Manager containers empty and never writes a
version, so no credential passes through Terraform state:

```bash
printf '%s' "$PLACES_KEY"   | gcloud secrets versions add lokus-places-api-key-dev --data-file=-
printf '%s' "$SESSION_KEY"  | gcloud secrets versions add lokus-session-signing-key-dev --data-file=-
printf '%s' "$IDP_CONFIG"   | gcloud secrets versions add lokus-identity-platform-config-dev --data-file=-
```

The API refuses to start without them rather than falling back to a default.

### 3. Point GitHub at the project

```bash
terraform output workload_identity_provider   # -> GCP_WORKLOAD_IDENTITY_PROVIDER
terraform output deployer_service_account     # -> GCP_DEPLOYER_SA
terraform output web_url                      # the demo URL
```

Set these as **repository variables** (Settings → Secrets and variables →
Actions → Variables). They are identifiers, not secrets — the security boundary
is the `attribute_condition`, not the obscurity of these strings.

| Variable | Value |
|---|---|
| `GCP_PROJECT_ID` | your project id |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | from the output above |
| `GCP_DEPLOYER_SA` | from the output above |
| `GCP_ENVIRONMENT` | `dev`, `staging` or `prod` — must match `terraform.tfvars` |
| `LOKUS_API_URL` | the API's URL, once it exists. Leave unset to keep the console on seeded data. |

Until `GCP_PROJECT_ID` is set the deploy job **skips** rather than failing — an
unconfigured repository should not paint every push red, because that teaches
people to ignore red. Once it is set, a missing provider or deployer account
fails on the first step with a named list, because a half-finished
configuration is a real misconfiguration and should look like one.

## What a deploy does

1. Waits for CI on `main` to conclude **successfully** — lint, unit tests,
   coverage thresholds, `terraform validate`, the committed-secret gate, and
   the eval thresholds. A red eval never reaches a revision.
2. Builds both images from the repository root, tagged with the commit sha.
   The root is the build context because the npm workspace links
   `packages/core` into both services.
3. Rolls out each service.
4. Curls `/healthz` on both and **fails the run** if either is not 200. A
   revision that serves errors is not a deploy.

Run it by hand from the Actions tab (`workflow_dispatch`) when you need to
redeploy without a new commit.

## Rollback

Cloud Run keeps every revision. Roll back without a build:

```bash
gcloud run services update-traffic lokus-web-dev --region asia-southeast2 \
  --to-revisions lokus-web-dev-00042-abc=100
```

## Local container check

Both images build locally, which is worth doing before trusting CI with them:

```bash
docker build -f api/Dockerfile -t lokus-api .
docker build -f web/Dockerfile -t lokus-web .

docker run --rm -p 8080:8080 -e GOOGLE_CLOUD_PROJECT=demo lokus-api
docker run --rm -p 8081:8080 lokus-web    # http://localhost:8081/masuk
```

## Cost

`api_min_instances` defaults to `0`, so both services scale to zero and an idle
demo costs almost nothing. Raise it to `1` shortly before Demo Day to avoid a
cold start in front of judges, and put it back afterwards.

The per-tenant model budget is separate and enforced in code
(`packages/core/src/cost/budget.js`): above 90% the agents drop to the Flash
tier and Cloud Monitoring raises an alert; the hard ceiling refuses calls.

## What is not wired yet

- The console still runs on the seeded dataset in the browser. Setting
  `LOKUS_API_URL` switches the session source to HTTP, but the reputation,
  agent, briefing and admin sources have no HTTP implementation yet — only the
  seeded one.
- Identity Platform must be enabled and a tenant created before real sign-in
  works; until then the API rejects every token, which is the correct
  behaviour, not a bug.
