# Firestore holds tenants, user roles, tickets, agent runs and traces.
# Every document path is prefixed by tenant id; see plan.md "Data model".
resource "google_firestore_database" "main" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  # Deleting the database would take every tenant's tickets and audit trail
  # with it. Terraform must refuse.
  delete_protection_state = var.environment == "prod" ? "DELETE_PROTECTION_ENABLED" : "DELETE_PROTECTION_DISABLED"

  depends_on = [google_project_service.required]
}

# Composite indexes for the two reads the UI does on every screen: a tenant's
# open tickets by due date, and a tenant's most recent agent runs.
resource "google_firestore_index" "tickets_by_status_due" {
  project    = var.project_id
  database   = google_firestore_database.main.name
  collection = "tickets"

  fields {
    field_path = "tenantId"
    order      = "ASCENDING"
  }
  fields {
    field_path = "status"
    order      = "ASCENDING"
  }
  fields {
    field_path = "dueAt"
    order      = "ASCENDING"
  }
}

resource "google_firestore_index" "agent_runs_recent" {
  project    = var.project_id
  database   = google_firestore_database.main.name
  collection = "agent_runs"

  fields {
    field_path = "tenantId"
    order      = "ASCENDING"
  }
  fields {
    field_path = "startedAt"
    order      = "DESCENDING"
  }
}
