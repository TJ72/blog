# The terraform block declares what this configuration needs to run:
# which Terraform version, and which providers (plugins that know how to talk to
# a given API — here, Google Cloud). `terraform init` reads this, downloads the
# google provider, and writes the exact version it picked into
# .terraform.lock.hcl so every machine uses the same one (commit that lock file).
terraform {
  required_version = ">= 1.5" # import blocks + -generate-config-out need 1.5+

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 6.0"
    }
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}

# The provider block configures that plugin: which project and region to act on.
# Auth is NOT set here — the google provider picks up Application Default
# Credentials (ADC) from the environment, i.e. the file written by
# `gcloud auth application-default login`. That keeps credentials out of the repo.
provider "google" {
  project = "albert-blog-2606221144"
  region  = "asia-east1"

  # Some APIs (e.g. billingbudgets) require a quota/billing project when running
  # under user ADC; route those requests through this project instead of failing.
  billing_project       = "albert-blog-2606221144"
  user_project_override = true
}

# Manages settings on the GitHub repo (here: Actions Variables). Auth comes from
# the GITHUB_TOKEN environment variable, so run plan/apply as:
#   GITHUB_TOKEN=$(gh auth token) terraform apply
provider "github" {
  owner = "TJ72"
}
