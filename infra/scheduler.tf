# The nightly cycle. Cloud Scheduler publishes to Pub/Sub at 23:00 WIB; the
# agents consume, and the briefing must exist by 06:00 (AC-1.1).
#
# Scheduler → Pub/Sub rather than Scheduler → Cloud Run directly, so a slow or
# failed cycle is retried by the subscription instead of being lost with the
# HTTP response.

resource "google_pubsub_topic" "nightly_cycle" {
  project = var.project_id
  name    = "lokus-nightly-cycle-${var.environment}"
  labels  = var.labels

  depends_on = [google_project_service.required]
}

resource "google_pubsub_topic" "nightly_cycle_dead_letter" {
  project = var.project_id
  name    = "lokus-nightly-cycle-dlq-${var.environment}"
  labels  = var.labels

  depends_on = [google_project_service.required]
}

resource "google_pubsub_subscription" "nightly_cycle" {
  project = var.project_id
  name    = "lokus-nightly-cycle-sub-${var.environment}"
  topic   = google_pubsub_topic.nightly_cycle.id
  labels  = var.labels

  # A whole tenant's overnight run: generous, but bounded.
  ack_deadline_seconds       = 600
  message_retention_duration = "86400s"

  retry_policy {
    minimum_backoff = "30s"
    maximum_backoff = "600s"
  }

  # Five failures and the message goes to the dead-letter topic rather than
  # retrying until the window closes. AC-1.4 puts retried failures on the
  # briefing timeline, so they must stop somewhere visible.
  dead_letter_policy {
    dead_letter_topic     = google_pubsub_topic.nightly_cycle_dead_letter.id
    max_delivery_attempts = 5
  }

  push_config {
    push_endpoint = "${google_cloud_run_v2_service.api.uri}/v1/internal/nightly-cycle"

    oidc_token {
      service_account_email = google_service_account.scheduler.email
      audience              = google_cloud_run_v2_service.api.uri
    }
  }
}

resource "google_cloud_scheduler_job" "nightly_cycle" {
  project     = var.project_id
  region      = var.region
  name        = "lokus-nightly-cycle-${var.environment}"
  description = "Starts the overnight agent cycle. Briefing must be ready by 06:00 WIB (AC-1.1)."

  schedule  = "0 23 * * *"
  time_zone = "Asia/Jakarta"

  # Seven hours of headroom before the 06:00 deadline.
  attempt_deadline = "320s"

  retry_config {
    retry_count          = 3
    min_backoff_duration = "60s"
    max_backoff_duration = "600s"
  }

  pubsub_target {
    topic_name = google_pubsub_topic.nightly_cycle.id
    data       = base64encode(jsonencode({ trigger = "nightly", environment = var.environment }))
  }

  depends_on = [google_project_service.required]
}

# The scheduler identity may publish to this one topic and invoke the API's
# push endpoint. It holds no data permissions of its own.
resource "google_pubsub_topic_iam_member" "scheduler_publishes" {
  project = var.project_id
  topic   = google_pubsub_topic.nightly_cycle.name
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.scheduler.email}"
}

resource "google_cloud_run_v2_service_iam_member" "scheduler_invokes_api" {
  project  = var.project_id
  location = google_cloud_run_v2_service.api.location
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.scheduler.email}"
}

# Alert if a cycle lands in the dead-letter topic: a briefing that silently
# fails to appear is worse than one that appears late.
resource "google_monitoring_alert_policy" "nightly_cycle_dead_letter" {
  project      = var.project_id
  display_name = "LOKUS nightly cycle dead-lettered (${var.environment})"
  combiner     = "OR"

  conditions {
    display_name = "Messages in the nightly-cycle dead letter topic"

    condition_threshold {
      filter = join(" AND ", [
        "resource.type = \"pubsub_topic\"",
        "resource.labels.topic_id = \"${google_pubsub_topic.nightly_cycle_dead_letter.name}\"",
        "metric.type = \"pubsub.googleapis.com/topic/send_message_operation_count\"",
      ])
      comparison      = "COMPARISON_GT"
      threshold_value = 0
      duration        = "300s"

      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_SUM"
      }
    }
  }

  documentation {
    content = "The overnight agent cycle failed five delivery attempts. The Briefing Pagi will be missing or stale. Check Cloud Run logs for /v1/internal/nightly-cycle."
  }

  depends_on = [google_project_service.required]
}
