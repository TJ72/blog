# Infrastructure (Terraform)

Infrastructure as code for the blog's monitoring stack. Terraform is the source
of record for these resources:

- `google_monitoring_uptime_check_config` — uptime check on the home page
- `google_monitoring_alert_policy` — fires when the check fails from >1 location
- `google_monitoring_notification_channel` — Pub/Sub channel (the Discord relay)
- `google_monitoring_dashboard` — "Blog — Service Health"
- `google_pubsub_topic` + `google_pubsub_topic_iam_member` — alert transport
- `google_cloudfunctions2_function` — the alert-to-Discord relay

## Prerequisites

- Terraform >= 1.5
- Application Default Credentials: `gcloud auth application-default login`
- A `terraform.tfvars` (gitignored) holding the Discord webhook:
  ```hcl
  discord_webhook_url = "https://discord.com/api/webhooks/…"
  ```

## Usage

```bash
terraform init      # download the provider (pinned in .terraform.lock.hcl)
terraform plan      # preview changes
terraform apply     # converge the cloud to match this config
```

`terraform plan` reporting **No changes** means the cloud matches the code — no drift.

## Testing the alert pipeline

```
Uptime check ──fails──► Alert policy ──► Pub/Sub topic ──► Cloud Function ──► Discord
```

- **Delivery half** (Pub/Sub → Function → Discord): publish a fake incident
  straight to the topic.
  ```bash
  gcloud pubsub topics publish monitoring-alerts \
    --message='{"incident":{"state":"open","policy_name":"manual test","summary":"test"}}'
  ```
- **End to end** (policy included): create a throwaway uptime check against a path
  that 404s plus a fast-firing policy on it, wait for the alert, then delete both.
- Confirm delivery in the function logs:
  ```bash
  gcloud functions logs read alert-to-discord --gen2 --region=asia-east1 --limit=20
  ```

## How this was bootstrapped

The resources existed before Terraform (created with gcloud / the Monitoring REST
API). They were adopted with `import {}` blocks plus `terraform plan
-generate-config-out`, which reads each live resource and generates its HCL. The
generated config was then refined — the secret became a sensitive variable and
hardcoded IDs became references — and `terraform apply` recorded the resources in
state without recreating them.

## Notes / limitations

- **State** is local (`terraform.tfstate`, gitignored) and can contain secrets in
  plaintext. A team would use a remote backend (a GCS bucket).
- **The function's source** is referenced as the already-uploaded zip, so Terraform
  manages the function's *config* but not its *code deploy* — changing
  `../functions/alert-to-discord` still needs `gcloud functions deploy`. Managing
  the source archive in Terraform too is a future improvement.
