output "api_url" {
  description = "Public URL of the Cloud Run API service."
  value       = google_cloud_run_v2_service.api.uri
}

output "api_service_account" {
  description = "Runtime identity of the API service."
  value       = google_service_account.api.email
}

output "agent_service_account" {
  description = "Runtime identity of the supervisor and specialised agents."
  value       = google_service_account.agent.email
}

output "deployer_service_account" {
  description = "Identity GitHub Actions impersonates to deploy."
  value       = google_service_account.deployer.email
}

output "documents_bucket" {
  description = "Cloud Storage bucket holding source SOP and catalogue documents."
  value       = google_storage_bucket.documents.name
}

output "bigquery_datasets" {
  description = "Raw landing and marts dataset ids."
  value = {
    raw   = google_bigquery_dataset.raw.dataset_id
    marts = google_bigquery_dataset.marts.dataset_id
  }
}

output "artifact_registry_repository" {
  description = "Docker repository CI pushes the API image to."
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.containers.repository_id}"
}

output "secret_ids" {
  description = "Secret Manager containers created for LOKUS. Values are added out of band."
  value       = [for s in google_secret_manager_secret.this : s.secret_id]
}
