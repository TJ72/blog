variable "project_id" {
  type        = string
  description = "GCP project ID for the blog."
  default     = "albert-blog-2606221144"
}

# The Discord webhook URL is a secret, so it is NOT hardcoded in committed config.
# Terraform reads it from terraform.tfvars (gitignored) or the environment
# variable TF_VAR_discord_webhook_url. `sensitive = true` makes Terraform redact
# it in plan/apply output (it still ends up in state — which is why state is
# gitignored too).
variable "discord_webhook_url" {
  type        = string
  description = "Incoming webhook URL for the #blog-alerts Discord channel."
  sensitive   = true
}

variable "admin_token" {
  type        = string
  description = "Password for the /admin view-count page (Cloud Run env var ADMIN_TOKEN)."
  sensitive   = true
}
