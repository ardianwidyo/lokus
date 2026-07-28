# Two datasets: raw landing for the ingest jobs, marts for everything the UI
# and the agents read. Splitting them keeps write access off the tables that
# answer user questions.
resource "google_bigquery_dataset" "raw" {
  project                    = var.project_id
  dataset_id                 = "lokus_raw_${var.environment}"
  friendly_name              = "LOKUS raw landing"
  description                = "Landing zone for review, Places and Business Profile extracts. Written by ingest jobs only."
  location                   = var.region
  delete_contents_on_destroy = var.environment != "prod"
  labels                     = var.labels

  depends_on = [google_project_service.required]
}

resource "google_bigquery_dataset" "marts" {
  project                    = var.project_id
  dataset_id                 = "lokus_marts_${var.environment}"
  friendly_name              = "LOKUS marts"
  description                = "Review facts, theme rollups, location scores and GIS distances. Read by the API and the agents."
  location                   = var.region
  delete_contents_on_destroy = var.environment != "prod"
  labels                     = var.labels

  depends_on = [google_project_service.required]
}

# Dataset-scoped grants rather than project-wide bigquery.dataViewer.
resource "google_bigquery_dataset_iam_member" "api_reads_marts" {
  project    = var.project_id
  dataset_id = google_bigquery_dataset.marts.dataset_id
  role       = "roles/bigquery.dataViewer"
  member     = "serviceAccount:${google_service_account.api.email}"
}

resource "google_bigquery_dataset_iam_member" "agent_reads_marts" {
  project    = var.project_id
  dataset_id = google_bigquery_dataset.marts.dataset_id
  role       = "roles/bigquery.dataViewer"
  member     = "serviceAccount:${google_service_account.agent.email}"
}

resource "google_bigquery_dataset_iam_member" "agent_writes_marts" {
  project    = var.project_id
  dataset_id = google_bigquery_dataset.marts.dataset_id
  role       = "roles/bigquery.dataEditor"
  member     = "serviceAccount:${google_service_account.agent.email}"
}

resource "google_bigquery_dataset_iam_member" "agent_reads_raw" {
  project    = var.project_id
  dataset_id = google_bigquery_dataset.raw.dataset_id
  role       = "roles/bigquery.dataEditor"
  member     = "serviceAccount:${google_service_account.agent.email}"
}
