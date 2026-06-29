# Keyless CI/CD identity (Workload Identity Federation), imported from the
# resources created during Phase 4 setup. GitHub Actions authenticates to GCP by
# exchanging its OIDC token for short-lived credentials — no service-account JSON
# key exists anywhere. The consumer is ../.github/workflows/deploy.yml.

# The pool groups external (GitHub) identities.
resource "google_iam_workload_identity_pool" "github" {
  project                   = "albert-blog-2606221144"
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions pool"
  deletion_policy           = "DELETE"
}

# The provider trusts GitHub's OIDC issuer, maps token claims to attributes, and
# the attribute_condition restricts the trust to this repo's owner.
resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = "albert-blog-2606221144"
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
  project         = "albert-blog-2606221144"
  account_id      = "github-deployer"
  display_name    = "GitHub Actions deployer"
  deletion_policy = "DELETE"
}

# Project roles: build/push images and deploy Cloud Run revisions. Deliberately
# no IAM-admin, so the pipeline can't change who may invoke the service.
resource "google_project_iam_member" "deployer_run_developer" {
  project = "albert-blog-2606221144"
  role    = "roles/run.developer"
  member  = "serviceAccount:${google_service_account.github_deployer.email}"
}

resource "google_project_iam_member" "deployer_ar_writer" {
  project = "albert-blog-2606221144"
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.github_deployer.email}"
}

# Let the deployer act as the runtime SA (required to deploy a service that runs
# as that SA). The runtime SA is the project's default compute SA, which is not
# managed here, so it is referenced by its literal resource name.
resource "google_service_account_iam_member" "deployer_actas_runtime" {
  service_account_id = "projects/albert-blog-2606221144/serviceAccounts/503336128890-compute@developer.gserviceaccount.com"
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

# Runtime SA (the project default compute SA that Cloud Run and the function run
# as) — the access the app needs at runtime, least privilege: read the Firestore
# counter and read the CV object, nothing more. (The compute SA also carries
# GCP's default roles/editor grant, which is intentionally NOT managed here.)
resource "google_project_iam_member" "runtime_datastore" {
  project = "albert-blog-2606221144"
  role    = "roles/datastore.user"
  member  = "serviceAccount:503336128890-compute@developer.gserviceaccount.com"
}

resource "google_storage_bucket_iam_member" "runtime_cv_viewer" {
  bucket = google_storage_bucket.cv.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:503336128890-compute@developer.gserviceaccount.com"
}
