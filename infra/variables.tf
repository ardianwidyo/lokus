variable "project_id" {
  description = "Google Cloud project that hosts LOKUS."
  type        = string
}

variable "region" {
  description = "Single deployment region. LOKUS is Jakarta-only by decision in plan.md."
  type        = string
  default     = "asia-southeast2"

  validation {
    condition     = var.region == "asia-southeast2"
    error_message = "plan.md pins LOKUS to asia-southeast2; changing the region needs a plan.md amendment first."
  }
}

variable "environment" {
  description = "Deployment environment; becomes a resource name suffix and a log label."
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod."
  }
}

variable "api_image" {
  description = "Container image for the Cloud Run API service. CI overrides this per deploy."
  type        = string
  default     = "asia-southeast2-docker.pkg.dev/cloudrun/container/hello"
}

variable "api_min_instances" {
  description = "Cloud Run minimum instances. Zero keeps the demo cheap; raise for Demo Day."
  type        = number
  default     = 0
}

variable "api_max_instances" {
  description = "Cloud Run maximum instances. Bounded because cost has a ceiling (constitution V)."
  type        = number
  default     = 4
}

variable "reasoning_path" {
  description = "Where reply drafts and cited answers come from: Vertex AI, or the deterministic path."
  type        = string
  default     = "vertex"

  validation {
    condition     = contains(["vertex", "deterministic"], var.reasoning_path)
    error_message = "reasoning_path must be one of: vertex, deterministic."
  }
}

variable "vertex_location" {
  description = "Vertex AI endpoint for Gemini. Not var.region: asia-southeast2 does not serve these models (measured 2026-08-07)."
  type        = string
  default     = "global"

  validation {
    condition     = contains(["global", "asia-southeast1", "us-central1"], var.vertex_location)
    error_message = "vertex_location must be an endpoint that serves the pinned models: global, asia-southeast1, or us-central1."
  }
}

variable "identity_platform_tenant_claim" {
  description = "Custom JWT claim that carries the tenant id. Must match api/src/config.js."
  type        = string
  default     = "tenantId"
}

variable "document_retention_days" {
  description = "Lifecycle age for non-current versions of ingested SOP documents."
  type        = number
  default     = 90
}

variable "labels" {
  description = "Labels applied to every labellable resource, for cost attribution per constitution V."
  type        = map(string)
  default = {
    app     = "lokus"
    owner   = "ebco"
    managed = "terraform"
  }
}

variable "web_image" {
  description = "Container image for the web console service. CI overrides this per deploy."
  type        = string
  default     = "asia-southeast2-docker.pkg.dev/cloudrun/container/hello"
}

variable "github_repository" {
  description = "owner/repo allowed to federate into the deployer account. This is the security boundary on keyless CI auth."
  type        = string
  default     = "ardianwidyo/lokus"

  validation {
    condition     = can(regex("^[^/]+/[^/]+$", var.github_repository))
    error_message = "github_repository must be in owner/repo form."
  }
}
