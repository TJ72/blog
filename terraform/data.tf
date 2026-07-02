# Stateful backends and the image registry.

# Firestore (Native) — the view counter lives here (doc stats/cv, field views).
# deletion_policy ABANDON: destroying this Terraform resource leaves the database
# in place, a guard against accidentally wiping data.
resource "google_firestore_database" "default" {
  project                           = var.project_id
  name                              = "(default)"
  location_id                       = "asia-east1"
  type                              = "FIRESTORE_NATIVE"
  app_engine_integration_mode       = "DISABLED"
  concurrency_mode                  = "PESSIMISTIC"
  database_edition                  = "STANDARD"
  delete_protection_state           = "DELETE_PROTECTION_DISABLED"
  point_in_time_recovery_enablement = "POINT_IN_TIME_RECOVERY_DISABLED"
  realtime_updates_mode             = "REALTIME_UPDATES_MODE_ENABLED"
  deletion_policy                   = "ABANDON"
}

# Artifact Registry repo holding the blog's container images (CI pushes here).
resource "google_artifact_registry_repository" "blog" {
  project                = var.project_id
  location               = "asia-east1"
  repository_id          = "blog"
  description            = "Blog container images"
  format                 = "DOCKER"
  mode                   = "STANDARD_REPOSITORY"
  cleanup_policy_dry_run = false

  # CI pushes a new SHA-tagged image on every deploy, so images would otherwise
  # accumulate forever. KEEP takes precedence over DELETE, so these two policies
  # together mean "retain the last 30 days of images, but always keep at least
  # the 10 newest" — the live image is always the newest, so it is never at risk.
  cleanup_policies {
    id     = "keep-recent-releases"
    action = "KEEP"
    most_recent_versions {
      keep_count = 10
    }
  }
  cleanup_policies {
    id     = "delete-stale"
    action = "DELETE"
    condition {
      # ANY (not just UNTAGGED): our old images keep a permanent SHA tag, so an
      # untagged-only rule would never match them. Duration in seconds to match
      # what the API stores, which avoids a perpetual plan diff.
      tag_state  = "ANY"
      older_than = "2592000s" # 30 days
    }
  }
}

# Private bucket holding the CV PDF, served only through /api/cv (never public).
resource "google_storage_bucket" "cv" {
  project                     = var.project_id
  name                        = "${var.project_id}-cv"
  location                    = "ASIA-EAST1"
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  # "enforced" (not "inherited"): public IAM grants on this bucket are rejected
  # outright, so the CV can never be exposed by a mis-click. The runtime SA's
  # explicit objectViewer grant is unaffected — this only forbids allUsers/
  # allAuthenticatedUsers bindings.
  public_access_prevention = "enforced"
  soft_delete_policy {
    retention_duration_seconds = 604800
  }
}
