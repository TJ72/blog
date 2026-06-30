variable "project_id" {
  type        = string
  description = "GCP project ID for the blog."
  default     = "albert-blog-2606221144"
}

# The app/function secrets (admin password, session signing key, Discord webhook)
# are NOT Terraform variables anymore — they live in Secret Manager. Terraform
# manages the secret containers (secrets.tf) and references them; the values are
# added out-of-band with `gcloud secrets versions add`, so no secret passes
# through Terraform or lands in state. See secrets.tf and the README.
