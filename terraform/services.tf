# Project APIs this blog's features deliberately rely on, managed as one list via
# for_each. GCP auto-enables many *other* APIs by default — those are intentionally
# left out; only the ones we depend on are declared here.
#
# disable_on_destroy = false: removing an entry (or destroying) will NOT disable
# the API, which avoids accidental outages and dependency breakage. Enabling an
# API is cheap and idempotent; disabling one is the dangerous direction.
locals {
  project_services = [
    "cloudresourcemanager.googleapis.com", # foundational: read/manage project IAM
    "run.googleapis.com",                  # Cloud Run (the blog)
    "artifactregistry.googleapis.com",     # container images
    "firestore.googleapis.com",            # view counter
    "monitoring.googleapis.com",           # uptime check, alert policy, dashboard
    "pubsub.googleapis.com",               # alert transport
    "cloudfunctions.googleapis.com",       # alert-to-discord relay
    "eventarc.googleapis.com",             # Pub/Sub trigger for the function
    "cloudbuild.googleapis.com",           # builds the function source
    "iamcredentials.googleapis.com",       # WIF token exchange
    "sts.googleapis.com",                  # WIF token exchange
    "billingbudgets.googleapis.com",       # the cost budget below
  ]
}

resource "google_project_service" "enabled" {
  for_each           = toset(local.project_services)
  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}
