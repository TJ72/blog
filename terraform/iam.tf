# Keyless CI/CD identity (Workload Identity Federation), imported from the
# resources created during Phase 4 setup. GitHub Actions authenticates to GCP by
# exchanging its OIDC token for short-lived credentials — no service-account JSON
# key exists anywhere. The consumer is ../.github/workflows/deploy.yml.

# The pool groups external (GitHub) identities.
resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions pool"
  deletion_policy           = "DELETE"
}

# The provider trusts GitHub's OIDC issuer, maps token claims to attributes, and
# the attribute_condition restricts the trust to this repo's owner.
resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub provider"
  attribute_condition                = "assertion.repository_owner == 'TJ72'"
  attribute_mapping = {
    "google.subject"             = "assertion.sub"
    "attribute.repository"       = "assertion.repository"
    "attribute.repository_owner" = "assertion.repository_owner"
  }
  deletion_policy = "DELETE"
  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# The service account GitHub Actions impersonates to deploy.
resource "google_service_account" "github_deployer" {
  project         = var.project_id
  account_id      = "github-deployer"
  display_name    = "GitHub Actions deployer"
  deletion_policy = "DELETE"
}

# Project roles: build/push images and deploy Cloud Run revisions. Deliberately
# no IAM-admin, so the pipeline can't change who may invoke the service.
resource "google_project_iam_member" "deployer_run_developer" {
  project = var.project_id
  role    = "roles/run.developer"
  member  = "serviceAccount:${google_service_account.github_deployer.email}"
}

resource "google_project_iam_member" "deployer_ar_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.github_deployer.email}"
}

# Let the deployer act as the runtime SA. Deploying a Cloud Run service that runs
# as a given SA needs roles/iam.serviceAccountUser ("act as") on that SA — even
# when CI passes only --image and the SA is inherited from the existing service.
# Points at the dedicated blog-runtime SA below (was the default compute SA).
resource "google_service_account_iam_member" "deployer_actas_runtime" {
  service_account_id = google_service_account.blog_runtime.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.github_deployer.email}"
}

# Allow only GitHub Actions runs from the TJ72/blog repo (a WIF principalSet) to
# impersonate the deployer SA — the link that makes the keyless exchange work.
resource "google_service_account_iam_member" "deployer_wif_user" {
  service_account_id = google_service_account.github_deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/TJ72/blog"
}

# Dedicated runtime SA for the Cloud Run blog service. Created so the
# internet-facing container does NOT run as the project default compute SA (which
# carries GCP's broad roles/editor). This is the least-privilege execution
# identity: it holds only what the app actually calls at runtime, so if the
# container is ever compromised the stolen credentials can do nothing else.
# (The alert-to-discord function still runs as the default compute SA — its own
# least-privilege pass is a separate step, with its build/trigger SA chain.)
resource "google_service_account" "blog_runtime" {
  project      = var.project_id
  account_id   = "blog-runtime"
  display_name = "Blog Cloud Run runtime"
}

# The only access the app needs at runtime, granted to the dedicated SA: write the
# Firestore counter (datastore.user) and read the CV object (objectViewer).
resource "google_project_iam_member" "runtime_datastore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.blog_runtime.email}"
}

resource "google_storage_bucket_iam_member" "runtime_cv_viewer" {
  bucket = google_storage_bucket.cv.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.blog_runtime.email}"
}

# Dedicated runtime SA for the alert-to-discord Cloud Function. The function code
# only reads an env var and POSTs to Discord over HTTPS — it calls NO GCP API — so
# this identity holds ZERO roles. Same blast-radius logic as blog_runtime: if the
# function is ever compromised, the token it could leak grants nothing.
#
# Only the function's *runtime* identity moves here. Its *build* SA (Cloud Build,
# build_config) and *trigger* SA (Eventarc, event_trigger) still use the default
# compute SA — those are control-plane identities used at deploy/dispatch time and
# are not inherited by the running function code, so they're a lower-priority,
# separate hardening step.
resource "google_service_account" "alert_fn_runtime" {
  project      = var.project_id
  account_id   = "alert-fn-runtime"
  display_name = "alert-to-discord function runtime"
}

# The function's two control-plane identities, moved off the default compute SA
# (editor) for defense in depth. Unlike the runtime SA these are NOT inherited by
# the executing function code — they run at deploy time (Cloud Build) and dispatch
# time (Eventarc) — so they were lower priority, but neither needs editor.

# Build identity: Cloud Build compiles the source zip into an image and pushes it
# to the gcf-artifacts repo on deploy. cloudbuild.builds.builder is the role
# Google documents for a user-specified gen2 build service account.
resource "google_service_account" "alert_fn_build" {
  project      = var.project_id
  account_id   = "alert-fn-build"
  display_name = "alert-to-discord function build"
}

resource "google_project_iam_member" "alert_fn_build_builder" {
  project = var.project_id
  role    = "roles/cloudbuild.builds.builder"
  member  = "serviceAccount:${google_service_account.alert_fn_build.email}"
}

# Trigger identity: Eventarc uses this to invoke the function when a Pub/Sub alert
# arrives. It needs to receive events and invoke the underlying Cloud Run service.
# (run.invoker is project-scoped here for reliability; it could be tightened to
# just the function's service.)
resource "google_service_account" "alert_fn_trigger" {
  project      = var.project_id
  account_id   = "alert-fn-trigger"
  display_name = "alert-to-discord function trigger"
}

resource "google_project_iam_member" "alert_fn_trigger_receiver" {
  project = var.project_id
  role    = "roles/eventarc.eventReceiver"
  member  = "serviceAccount:${google_service_account.alert_fn_trigger.email}"
}

resource "google_project_iam_member" "alert_fn_trigger_invoker" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.alert_fn_trigger.email}"
}
