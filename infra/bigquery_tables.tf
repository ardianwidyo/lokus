# Review facts and theme rollups.
#
# Both tables are partitioned by date and clustered by tenant first, so every
# query the API issues prunes to one tenant's partitions before it reads a byte
# (constitution IV, and it keeps the per-tenant cost ceiling honest).

resource "google_bigquery_table" "review" {
  project             = var.project_id
  dataset_id          = google_bigquery_dataset.marts.dataset_id
  table_id            = "review"
  description         = "One row per Google Business Profile review, loaded nightly."
  deletion_protection = var.environment == "prod"
  labels              = var.labels

  time_partitioning {
    type          = "DAY"
    field         = "published_at"
    expiration_ms = null
  }

  # tenant_id first: no query may scan another tenant's blocks.
  clustering = ["tenant_id", "outlet_id", "rating"]

  schema = jsonencode([
    { name = "id", type = "STRING", mode = "REQUIRED", description = "Business Profile review id" },
    { name = "tenant_id", type = "STRING", mode = "REQUIRED" },
    { name = "outlet_id", type = "STRING", mode = "REQUIRED" },
    { name = "rating", type = "INT64", mode = "REQUIRED" },
    { name = "text", type = "STRING", mode = "NULLABLE" },
    { name = "author", type = "STRING", mode = "NULLABLE" },
    { name = "published_at", type = "TIMESTAMP", mode = "REQUIRED" },
    { name = "reply_state", type = "STRING", mode = "REQUIRED", description = "none|draft|approved|sent" },
    { name = "reply_text", type = "STRING", mode = "NULLABLE" },
    { name = "approved_by", type = "STRING", mode = "NULLABLE" },
    { name = "approved_at", type = "TIMESTAMP", mode = "NULLABLE" },
    { name = "sent_at", type = "TIMESTAMP", mode = "NULLABLE" },
    { name = "source_uri", type = "STRING", mode = "NULLABLE" },
    { name = "loaded_at", type = "TIMESTAMP", mode = "REQUIRED" },
    {
      name        = "themes"
      type        = "RECORD"
      mode        = "REPEATED"
      description = "Themes the clusterer found in `text`. Derived, never supplied by the source (AC-2.1)."
      fields = [
        { name = "theme", type = "STRING", mode = "REQUIRED" },
        { name = "score", type = "FLOAT64", mode = "REQUIRED" },
      ]
    },
  ])
}

resource "google_bigquery_table" "theme_rollup" {
  project             = var.project_id
  dataset_id          = google_bigquery_dataset.marts.dataset_id
  table_id            = "theme_rollup"
  description         = "Weekly complaint theme counts per outlet, with the systemic flag (AC-2.2)."
  deletion_protection = var.environment == "prod"
  labels              = var.labels

  time_partitioning {
    type  = "DAY"
    field = "week_start"
  }

  clustering = ["tenant_id", "theme", "outlet_id"]

  schema = jsonencode([
    { name = "tenant_id", type = "STRING", mode = "REQUIRED" },
    { name = "outlet_id", type = "STRING", mode = "REQUIRED" },
    { name = "theme", type = "STRING", mode = "REQUIRED" },
    { name = "week_start", type = "DATE", mode = "REQUIRED" },
    { name = "week_index", type = "INT64", mode = "REQUIRED", description = "1..8, 8 is the current week" },
    { name = "count", type = "INT64", mode = "REQUIRED" },
    { name = "delta", type = "FLOAT64", mode = "NULLABLE", description = "Ratio against the same theme four weeks earlier" },
    { name = "region_count", type = "INT64", mode = "REQUIRED", description = "Distinct regions carrying this theme in the week" },
    { name = "systemic", type = "BOOL", mode = "REQUIRED", description = "region_count >= 4 (AC-2.2)" },
    { name = "computed_at", type = "TIMESTAMP", mode = "REQUIRED" },
  ])
}

# The outlet dimension. Small and slowly changing, but it has to live in
# BigQuery because the systemic rule (AC-2.2) and the GIS distance queries in P3
# both join against `region` and `geo`.
resource "google_bigquery_table" "outlet" {
  project             = var.project_id
  dataset_id          = google_bigquery_dataset.marts.dataset_id
  table_id            = "outlet"
  description         = "Outlet dimension: region for the systemic-theme rule, geo for GIS."
  deletion_protection = var.environment == "prod"
  labels              = var.labels

  clustering = ["tenant_id"]

  schema = jsonencode([
    { name = "outlet_id", type = "STRING", mode = "REQUIRED" },
    { name = "tenant_id", type = "STRING", mode = "REQUIRED" },
    { name = "code", type = "STRING", mode = "REQUIRED" },
    { name = "name", type = "STRING", mode = "REQUIRED" },
    { name = "region", type = "STRING", mode = "REQUIRED" },
    { name = "address", type = "STRING", mode = "NULLABLE" },
    { name = "manager", type = "STRING", mode = "NULLABLE" },
    { name = "opened_at", type = "DATE", mode = "NULLABLE" },
    { name = "geo", type = "GEOGRAPHY", mode = "NULLABLE" },
  ])
}

resource "google_bigquery_table" "review_landing" {
  project             = var.project_id
  dataset_id          = google_bigquery_dataset.raw.dataset_id
  table_id            = "review_landing"
  description         = "Raw nightly extract from the Business Profile adapter, before theme clustering."
  deletion_protection = false
  labels              = var.labels

  time_partitioning {
    type  = "DAY"
    field = "extracted_at"
  }

  clustering = ["tenant_id"]

  schema = jsonencode([
    { name = "tenant_id", type = "STRING", mode = "REQUIRED" },
    { name = "extracted_at", type = "TIMESTAMP", mode = "REQUIRED" },
    { name = "payload", type = "JSON", mode = "REQUIRED", description = "Adapter response, stored verbatim so a reload never needs the API again" },
  ])
}
