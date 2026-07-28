# Project services. Every API that plan.md's stack table depends on is enabled
# here, so a fresh project reaches a deployable state from `terraform apply`
# alone. Services are never disabled on destroy: turning an API off can delete
# the data behind it.
locals {
  required_services = [
    "run.googleapis.com",              # API service
    "artifactregistry.googleapis.com", # API container images
    "firestore.googleapis.com",        # tenants, tickets, agent runs/traces
    "bigquery.googleapis.com",         # review facts, theme rollups, GIS
    "storage.googleapis.com",          # source SOP/catalog documents
    "secretmanager.googleapis.com",    # every credential (constitution: no secrets in repo)
    "aiplatform.googleapis.com",       # Vertex AI: Gemini, embeddings, Agent Engine
    "discoveryengine.googleapis.com",  # Vertex AI Search (RAG index)
    "identitytoolkit.googleapis.com",  # Identity Platform (auth + tenant claim)
    "places.googleapis.com",           # Places API (New)
    "mybusinessbusinessinformation.googleapis.com",
    "cloudscheduler.googleapis.com", # nightly cycle 23:00
    "pubsub.googleapis.com",         # nightly cycle fan-out
    "cloudtrace.googleapis.com",     # constitution III: every step is traceable
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "iam.googleapis.com",
    "cloudresourcemanager.googleapis.com",
  ]
}

resource "google_project_service" "required" {
  for_each = toset(local.required_services)

  project = var.project_id
  service = each.value

  disable_on_destroy         = false
  disable_dependent_services = false
}
