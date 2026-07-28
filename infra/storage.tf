# Source documents (SOP, brand voice, catalogues) before they are chunked and
# indexed into Vertex AI Search. Objects are keyed tenants/<tenantId>/... so a
# future per-prefix grant stays possible.
resource "google_storage_bucket" "documents" {
  project  = var.project_id
  name     = "${var.project_id}-lokus-docs-${var.environment}"
  location = var.region
  labels   = var.labels

  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = var.environment != "prod"

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age                = var.document_retention_days
      with_state         = "ARCHIVED"
      num_newer_versions = 3
    }
    action {
      type = "Delete"
    }
  }

  depends_on = [google_project_service.required]
}

# The API only ever links to or streams a document; ingest is the agent's job.
resource "google_storage_bucket_iam_member" "api_reads_documents" {
  bucket = google_storage_bucket.documents.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.api.email}"
}

resource "google_storage_bucket_iam_member" "agent_writes_documents" {
  bucket = google_storage_bucket.documents.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.agent.email}"
}

# Artifact Registry for the API image. Kept here because it is storage the CI
# pipeline writes to, and the deployer's write grant is repository-scoped.
resource "google_artifact_registry_repository" "containers" {
  project       = var.project_id
  location      = var.region
  repository_id = "lokus-${var.environment}"
  description   = "Container images for the LOKUS Cloud Run services."
  format        = "DOCKER"
  labels        = var.labels

  depends_on = [google_project_service.required]
}
