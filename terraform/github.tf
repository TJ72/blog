# Single-source-of-truth wiring for CI/CD: Terraform owns the WIF provider name
# and the deployer SA email, and publishes them to the GitHub repo as Actions
# Variables. The workflow reads them as ${{ vars.WIF_PROVIDER }} / ${{ vars.DEPLOYER_SA }}
# instead of hardcoding the strings — so renaming a resource here updates the
# workflow's inputs on the next `apply`, no manual YAML edit. (These values are
# not secrets, so plain Variables — not Secrets — are appropriate.)

resource "github_actions_variable" "wif_provider" {
  repository    = "blog"
  variable_name = "WIF_PROVIDER"
  value         = google_iam_workload_identity_pool_provider.github.name
}

resource "github_actions_variable" "deployer_sa" {
  repository    = "blog"
  variable_name = "DEPLOYER_SA"
  value         = google_service_account.github_deployer.email
}

# Handy for `terraform output` and for anyone reading the config.
output "wif_provider" {
  value = google_iam_workload_identity_pool_provider.github.name
}

output "deployer_sa" {
  value = google_service_account.github_deployer.email
}
