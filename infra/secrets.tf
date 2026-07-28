# Secret containers only — no values. Versions are added out of band
# (`gcloud secrets versions add`), never through Terraform, so that no
# credential can reach the repository or the state file.
locals {
  secrets = {
    places-api-key = {
      description = "Places API (New) key used by the location agent."
      accessed_by = ["agent"]
    }
    gbp-oauth-client = {
      description = "Business Profile Performance API OAuth client JSON."
      accessed_by = ["agent"]
    }
    gbp-refresh-token = {
      description = "Long-lived refresh token for the pilot tenant's Business Profile account."
      accessed_by = ["agent"]
    }
    identity-platform-config = {
      description = "Identity Platform API key and tenant mapping consumed by the API."
      accessed_by = ["api"]
    }
    session-signing-key = {
      description = "Key used to sign LOKUS session cookies."
      accessed_by = ["api"]
    }
  }

  # Flattened (secret, service account) pairs so each grant is its own resource.
  secret_accessors = merge([
    for name, cfg in local.secrets : {
      for sa in cfg.accessed_by : "${name}:${sa}" => {
        secret  = name
        account = sa
      }
    }
  ]...)

  service_account_emails = {
    api   = google_service_account.api.email
    agent = google_service_account.agent.email
  }
}

resource "google_secret_manager_secret" "this" {
  for_each = local.secrets

  project   = var.project_id
  secret_id = "lokus-${each.key}-${var.environment}"
  labels    = var.labels

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }

  depends_on = [google_project_service.required]
}

# Accessor grants are per secret, not project-wide: the API can read its own
# session key but not the Business Profile refresh token, and vice versa.
resource "google_secret_manager_secret_iam_member" "accessor" {
  for_each = local.secret_accessors

  project   = var.project_id
  secret_id = google_secret_manager_secret.this[each.value.secret].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${local.service_account_emails[each.value.account]}"
}
