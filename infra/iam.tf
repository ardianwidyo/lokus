# Service accounts, one per workload, each granted only what that workload
# calls. Grants are made on the individual resource (dataset, bucket, secret)
# rather than at project level wherever the API supports it.

resource "google_service_account" "api" {
  project      = var.project_id
  account_id   = "lokus-api-${var.environment}"
  display_name = "LOKUS API (Cloud Run)"
  description  = "Serves the Fastify API: reads Firestore, queries BigQuery, reads documents and secrets."

  depends_on = [google_project_service.required]
}

resource "google_service_account" "agent" {
  project      = var.project_id
  account_id   = "lokus-agent-${var.environment}"
  display_name = "LOKUS agents (Vertex AI Agent Engine)"
  description  = "Runs the supervisor and the three specialised agents: Vertex AI, BigQuery, Firestore, document ingest."

  depends_on = [google_project_service.required]
}

resource "google_service_account" "scheduler" {
  project      = var.project_id
  account_id   = "lokus-scheduler-${var.environment}"
  display_name = "LOKUS nightly cycle"
  description  = "Publishes the nightly trigger to Pub/Sub; holds no data permissions."

  depends_on = [google_project_service.required]
}

resource "google_service_account" "deployer" {
  project      = var.project_id
  account_id   = "lokus-deployer-${var.environment}"
  display_name = "LOKUS CI deployer"
  description  = "GitHub Actions identity: pushes images and rolls out Cloud Run revisions."

  depends_on = [google_project_service.required]
}

# ── API service account ────────────────────────────────────────────────────
# Firestore has no per-collection IAM, so tenant isolation for it is enforced
# in application code (api/src/middleware/tenantContext.js) and asserted by
# tests, not by IAM. That gap is deliberate and documented here.
locals {
  api_project_roles = [
    "roles/datastore.user",    # Firestore read/write
    "roles/bigquery.jobUser",  # run queries; dataset access granted per dataset
    "roles/logging.logWriter", # structured logs carry tenantId
    "roles/cloudtrace.agent",  # constitution III
    "roles/aiplatform.user",   # on-request model calls from the API
  ]

  agent_project_roles = [
    "roles/aiplatform.user",
    "roles/datastore.user",   # persists agent_run.steps
    "roles/bigquery.jobUser", # theme rollups, GIS distance
    "roles/discoveryengine.editor",
    "roles/logging.logWriter",
    "roles/cloudtrace.agent",
  ]

  deployer_project_roles = [
    "roles/run.developer",
    "roles/artifactregistry.writer",
  ]
}

resource "google_project_iam_member" "api" {
  for_each = toset(local.api_project_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "agent" {
  for_each = toset(local.agent_project_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.agent.email}"
}

resource "google_project_iam_member" "deployer" {
  for_each = toset(local.deployer_project_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

# The deployer may only act as the runtime service account — never as itself or
# as any other identity in the project.
resource "google_service_account_iam_member" "deployer_acts_as_api" {
  service_account_id = google_service_account.api.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deployer.email}"
}
