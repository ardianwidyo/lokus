# The API service. Secrets are mounted as environment variables from Secret
# Manager at boot; nothing sensitive is baked into the image or this file.
resource "google_cloud_run_v2_service" "api" {
  project  = var.project_id
  name     = "lokus-api-${var.environment}"
  location = var.region
  labels   = var.labels

  ingress = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.api.email

    scaling {
      min_instance_count = var.api_min_instances
      max_instance_count = var.api_max_instances
    }

    containers {
      image = var.api_image

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
        cpu_idle = true
      }

      ports {
        container_port = 8080
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
      env {
        name  = "LOKUS_REGION"
        value = var.region
      }
      env {
        name  = "LOKUS_ENVIRONMENT"
        value = var.environment
      }
      env {
        name  = "LOKUS_TENANT_CLAIM"
        value = var.identity_platform_tenant_claim
      }
      env {
        name  = "BQ_MARTS_DATASET"
        value = google_bigquery_dataset.marts.dataset_id
      }
      env {
        name  = "DOCS_BUCKET"
        value = google_storage_bucket.documents.name
      }

      env {
        name = "IDENTITY_PLATFORM_CONFIG"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.this["identity-platform-config"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "SESSION_SIGNING_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.this["session-signing-key"].secret_id
            version = "latest"
          }
        }
      }

      startup_probe {
        http_get {
          path = "/healthz"
        }
        initial_delay_seconds = 3
        timeout_seconds       = 3
        period_seconds        = 5
        failure_threshold     = 6
      }

      liveness_probe {
        http_get {
          path = "/healthz"
        }
        period_seconds    = 30
        timeout_seconds   = 3
        failure_threshold = 3
      }
    }
  }

  # CI sets the image on every deploy; Terraform must not roll it back.
  lifecycle {
    ignore_changes = [template[0].containers[0].image, client, client_version]
  }

  depends_on = [
    google_project_service.required,
    google_secret_manager_secret_iam_member.accessor,
  ]
}

# The API authenticates its own callers with Identity Platform tokens, so the
# service itself is reachable without an IAM invoker check.
resource "google_cloud_run_v2_service_iam_member" "api_public" {
  project  = var.project_id
  location = google_cloud_run_v2_service.api.location
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
