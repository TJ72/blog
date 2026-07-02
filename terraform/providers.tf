# The terraform block declares what this configuration needs to run:
# which Terraform version, and which providers (plugins that know how to talk to
# a given API — here, Google Cloud). `terraform init` reads this, downloads the
# google provider, and writes the exact version it picked into
# .terraform.lock.hcl so every machine uses the same one (commit that lock file).
terraform {
  required_version = ">= 1.5" # import blocks + -generate-config-out need 1.5+

  # Remote state in a GCS bucket: durable (not tied to one laptop) and keeps the
  # plaintext-secret state in a private, versioned bucket. The bucket is created
  # out-of-band (see README) and deliberately NOT managed by Terraform — it's the
  # store for this very state, so it can't depend on it (same bootstrap reason the
  # GCP project itself is unmanaged). NOTE: backend blocks can't use variables, so
  # the bucket name is a literal here even though project_id is a var elsewhere.
  backend "gcs" {
    bucket = "albert-blog-2606221144-tfstate"
    prefix = "blog"
  }

  required_providers {
    google = {
      # Pessimistic (~>) so `init -upgrade` can take minor/patch releases but
      # never a future major 8 with breaking changes. Day-to-day the lock file
      # pins the exact version; this constraint is the guard for upgrade day.
      source  = "hashicorp/google"
      version = "~> 7.38"
    }
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
    # Zips the alert function's source at plan time (see main.tf), which is what
    # lets Terraform detect source-code changes and redeploy the function.
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}

# The provider block configures that plugin: which project and region to act on.
# Auth is NOT set here — the google provider picks up Application Default
# Credentials (ADC) from the environment, i.e. the file written by
# `gcloud auth application-default login`. That keeps credentials out of the repo.
provider "google" {
  project = var.project_id
  region  = "asia-east1"

  # Some APIs (e.g. billingbudgets) require a quota/billing project when running
  # under user ADC; route those requests through this project instead of failing.
  billing_project       = var.project_id
  user_project_override = true
}

# Manages settings on the GitHub repo (here: Actions Variables). Auth comes from
# the GITHUB_TOKEN environment variable, so run plan/apply as:
#   GITHUB_TOKEN=$(gh auth token) terraform apply
provider "github" {
  owner = "TJ72"
}

# Look the project number up from the project ID, so the number (which appears in
# default resource names like the run.app URL, the gcf source bucket, and the
# default compute SA) is derived from a single source instead of hardcoded.
data "google_project" "this" {}

locals {
  project_number = data.google_project.this.number
  # GCP's default Compute Engine service account. The function's build (Cloud
  # Build) and trigger (Eventarc) identities still run as it; see iam.tf.
  compute_sa = "${data.google_project.this.number}-compute@developer.gserviceaccount.com"
}
