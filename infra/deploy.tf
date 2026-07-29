# The web console: the second Cloud Run service, and the keyless path GitHub
# Actions uses to deploy both.

resource "google_cloud_run_v2_service" "web" {
  project  = var.project_id
  name     = "lokus-web-${var.environment}"
  location = var.region
  labels   = var.labels

  ingress = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.web.email

    scaling {
      min_instance_count = var.api_min_instances
      max_instance_count = var.api_max_instances
    }

    containers {
      image = var.web_image

      resources {
        limits = {
          cpu    = "1"
          memory = "256Mi"
        }
        cpu_idle = true
      }

      ports {
        container_port = 8080
      }

      startup_probe {
        http_get {
          path = "/healthz"
        }
        initial_delay_seconds = 2
        timeout_seconds       = 3
        period_seconds        = 5
        failure_threshold     = 6
      }
    }
  }

  lifecycle {
    ignore_changes = [template[0].containers[0].image, client, client_version]
  }

  depends_on = [google_project_service.required]
}

# Static files only. This identity reads nothing and writes nothing; it exists
# so the service does not run as the default compute account, which can.
resource "google_service_account" "web" {
  project      = var.project_id
  account_id   = "lokus-web-${var.environment}"
  display_name = "LOKUS web console (Cloud Run)"
  description  = "Serves the built static console. Holds no data permissions by design."

  depends_on = [google_project_service.required]
}

resource "google_cloud_run_v2_service_iam_member" "web_public" {
  project  = var.project_id
  location = google_cloud_run_v2_service.web.location
  name     = google_cloud_run_v2_service.web.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ── Keyless CI auth ────────────────────────────────────────────────────────
# Workload Identity Federation rather than a downloaded service-account key.
# A JSON key in a GitHub secret is a long-lived credential that cannot be
# rotated by us and leaks with the repository; a federated token lasts minutes
# and is bound to this repo.

resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = "lokus-github-${var.environment}"
  display_name              = "LOKUS GitHub Actions"
  description               = "Federated identity for the deploy workflow. No service account keys exist."

  depends_on = [google_project_service.required]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-oidc"
  display_name                       = "GitHub OIDC"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }

  # Without this condition any GitHub repository in the world could mint tokens
  # for this pool. It is the whole security boundary.
  attribute_condition = "assertion.repository == \"${var.github_repository}\""

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# Only the named repository may impersonate the deployer, and the deployer can
# only push images and roll out revisions (see iam.tf).
resource "google_service_account_iam_member" "github_impersonates_deployer" {
  service_account_id = google_service_account.deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repository}"
}

resource "google_service_account_iam_member" "deployer_acts_as_web" {
  service_account_id = google_service_account.web.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deployer.email}"
}

output "web_url" {
  description = "Public URL of the web console."
  value       = google_cloud_run_v2_service.web.uri
}

output "workload_identity_provider" {
  description = "Value for the deploy workflow's workload_identity_provider input."
  value       = google_iam_workload_identity_pool_provider.github.name
}
