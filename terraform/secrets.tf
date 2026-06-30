# Secret Manager. The app and function secrets live here instead of as plaintext
# Cloud Run / function env vars. Terraform manages the secret CONTAINERS and who
# may read them, but deliberately NOT the secret VERSIONS — the actual values are
# added out-of-band with `gcloud secrets versions add` (see README), so no secret
# value ever passes through Terraform or lands in state. Cloud Run / the function
# reference the secret and the platform injects it at runtime.

resource "google_secret_manager_secret" "admin_token" {
  project   = var.project_id
  secret_id = "admin-token"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "session_secret" {
  project   = var.project_id
  secret_id = "session-secret"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret" "discord_webhook" {
  project   = var.project_id
  secret_id = "discord-webhook"
  replication {
    auto {}
  }
}

# Least-privilege read access: each runtime SA can read only the secrets it needs.
# The blog service reads the admin password + session signing key; the function
# reads the Discord webhook. Nothing else can read them.
resource "google_secret_manager_secret_iam_member" "blog_runtime_admin_token" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.admin_token.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.blog_runtime.email}"
}

resource "google_secret_manager_secret_iam_member" "blog_runtime_session_secret" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.session_secret.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.blog_runtime.email}"
}

resource "google_secret_manager_secret_iam_member" "alert_fn_discord_webhook" {
  project   = var.project_id
  secret_id = google_secret_manager_secret.discord_webhook.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.alert_fn_runtime.email}"
}
