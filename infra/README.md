# infra — LOKUS Terraform baseline (T001)

Everything LOKUS runs on, declared once. Region is `asia-southeast2`; changing
it requires amending `specs/001-lokus-core/plan.md` first (the `region`
variable has a validation rule that refuses anything else).

## What this creates

| File | Resources |
|---|---|
| `services.tf` | the 18 project services the stack table in `plan.md` depends on |
| `iam.tf` | four service accounts — api, agent, scheduler, deployer — and their project roles |
| `firestore.tf` | Firestore Native database + composite indexes for tickets and agent runs |
| `bigquery.tf` | `lokus_raw_*` landing dataset, `lokus_marts_*` serving dataset, dataset-scoped grants |
| `storage.tf` | documents bucket (versioned, public access blocked) + Artifact Registry repo |
| `secrets.tf` | five empty Secret Manager containers + per-secret accessor grants |
| `cloud_run.tf` | the API service, with secrets mounted from Secret Manager |

## Least privilege, concretely

- BigQuery, Cloud Storage and Secret Manager grants are made **on the
  individual resource**, not at project level. The API can read the marts
  dataset but not write it; it can read its own session key but not the
  Business Profile refresh token.
- The CI deployer holds `run.developer` and `artifactregistry.writer` only,
  plus `serviceAccountUser` on the API runtime account specifically — it cannot
  impersonate anything else in the project.
- Firestore has no per-collection IAM. Tenant isolation there is enforced in
  application code (`api/src/middleware/tenantContext.js`) and proven by tests,
  not by IAM. Called out here so the gap is visible rather than assumed.

## Secrets

Terraform creates the secret **containers** and never the versions. No
credential passes through this directory or through Terraform state:

```bash
printf '%s' "$PLACES_KEY" | gcloud secrets versions add lokus-places-api-key-dev --data-file=-
```

## Usage

```bash
cp backend.hcl.example backend.hcl          # fill in the state bucket
cp terraform.tfvars.example terraform.tfvars # fill in the project id

terraform init -backend-config=backend.hcl
terraform plan
terraform apply
```

CI runs `terraform init -backend=false` followed by `terraform fmt -check` and
`terraform validate`, so a syntax or type error fails the pull request before
anyone runs an apply.
