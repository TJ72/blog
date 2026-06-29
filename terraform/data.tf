# Stateful backends and the image registry.

# Firestore (Native) — the view counter lives here (doc stats/cv, field views).
# deletion_policy ABANDON: destroying this Terraform resource leaves the database
# in place, a guard against accidentally wiping data.
resource "google_firestore_database" "default" {
  project                           = "albert-blog-2606221144"
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
  project                = "albert-blog-2606221144"
  location               = "asia-east1"
  repository_id          = "blog"
  description            = "Blog container images"
  format                 = "DOCKER"
  mode                   = "STANDARD_REPOSITORY"
  cleanup_policy_dry_run = false
}

# Private bucket holding the CV PDF, served only through /api/cv (never public).
resource "google_storage_bucket" "cv" {
  project                     = "albert-blog-2606221144"
  name                        = "albert-blog-2606221144-cv"
  location                    = "ASIA-EAST1"
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "inherited"
  soft_delete_policy {
    retention_duration_seconds = 604800
  }
}
