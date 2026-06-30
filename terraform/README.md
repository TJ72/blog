# Infrastructure (Terraform)

Infrastructure as code for the blog. Terraform is the source of record for these
resources.

**Compute** (`cloudrun.tf`):

- `google_cloud_run_v2_service` — the blog service. Terraform owns the config; CI owns the image (`lifecycle.ignore_changes`), so `gcloud run deploy` on each push isn't seen as drift.

**Monitoring** (`main.tf`):

- `google_monitoring_uptime_check_config` — uptime check on the home page
- `google_monitoring_alert_policy` — fires when the check fails from >1 location
- `google_monitoring_notification_channel` — Pub/Sub channel (the Discord relay)
- `google_monitoring_dashboard` — "Blog — Service Health"
- `google_pubsub_topic` + `google_pubsub_topic_iam_member` — alert transport
- `google_cloudfunctions2_function` — the alert-to-Discord relay

**CI/CD identity** (`iam.tf`) — keyless GitHub Actions → GCP via Workload Identity Federation:

- `google_iam_workload_identity_pool` + `_provider` — trust GitHub's OIDC, scoped to the repo owner
- `google_service_account` — the deployer SA
- `google_project_iam_member` ×2 — `run.developer` + `artifactregistry.writer`
- `google_service_account_iam_member` ×2 — deployer acts as the runtime SA; the `TJ72/blog` principalSet may impersonate the deployer

**Data backends** (`data.tf`) and runtime-SA access (`iam.tf`):

- `google_firestore_database` — the view counter (`stats/cv`)
- `google_storage_bucket` — the private CV bucket
- `google_artifact_registry_repository` — the container-image repo
- `google_project_iam_member` + `google_storage_bucket_iam_member` — the runtime SA reads the counter and the CV (least privilege)

**CI/CD wiring** (`github.tf`) — single source of truth for the workflow's auth inputs:

- `github_actions_variable` ×2 — publishes the WIF provider name (`WIF_PROVIDER`) and deployer SA email (`DEPLOYER_SA`) to the repo, so `deploy.yml` reads `${{ vars.* }}` instead of hardcoding them

**Project config** (`services.tf`, `budget.tf`):

- `google_project_service` (a `for_each` over the APIs the project relies on; `disable_on_destroy = false`)
- `google_billing_budget` — the 150 TWD/month cost alert (alerts only; the real cap is Cloud Run `--max-instances`)

## Prerequisites

- Terraform >= 1.5
- Application Default Credentials: `gcloud auth application-default login`
- A GitHub token for the `github` provider (it manages repo Actions Variables):
  `export GITHUB_TOKEN=$(gh auth token)` before running plan/apply
- The app/function secrets set in Secret Manager (see [Secrets](#secrets)). No
  `terraform.tfvars` is needed — `project_id` has a default and the secrets aren't
  Terraform variables.

## Usage

```bash
terraform init      # download the provider + configure the GCS backend
terraform plan      # preview changes
terraform apply     # converge the cloud to match this config
```

`terraform plan` reporting **No changes** means the cloud matches the code — no drift.

## State

State lives in a **GCS backend** (`backend "gcs"` in `providers.tf`): bucket
`albert-blog-2606221144-tfstate`, private + versioned. That makes it durable (not
tied to one laptop) and keeps the plaintext-secret state off local disk.

`terraform apply` still runs **locally**, with your own credentials — only the
state is remote. (Running apply in CI would need a near-admin CI identity, which
for a solo project enlarges the blast radius more than it's worth.)

The state bucket is created **out-of-band** and is deliberately **not** managed by
Terraform: the store for the state can't depend on that same state (the same
bootstrap reason the GCP project itself is unmanaged). To recreate it from scratch:

```bash
gcloud storage buckets create gs://albert-blog-2606221144-tfstate \
  --location=asia-east1 --uniform-bucket-level-access --public-access-prevention
gcloud storage buckets update gs://albert-blog-2606221144-tfstate --versioning
terraform init -migrate-state   # first time only: copy existing state up
```

(Backend blocks can't use variables, so the bucket name is a literal in
`providers.tf` even though `project_id` is a variable everywhere else.)

## Secrets

`ADMIN_TOKEN`, `SESSION_SECRET`, and the Discord webhook live in **Secret Manager**,
not as plaintext env vars. Terraform manages the secret *containers* and grants
each runtime SA `secretmanager.secretAccessor` (`secrets.tf`); Cloud Run and the
function reference them by name. The *values* are added **out-of-band**, so no
secret ever passes through Terraform or lands in state:

```bash
printf %s 'the-value' | gcloud secrets versions add admin-token --data-file=-
# likewise for session-secret and discord-webhook
```

Rotating a secret = add a new version (the references use `latest`) and redeploy
the consumer. Local `next dev` still reads `.env.local`; Secret Manager only backs
the deployed services.

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

- **State** is in a private, versioned GCS backend (see [State](#state)). The app
  secrets are no longer in it — they live in Secret Manager (see [Secrets](#secrets)),
  so state holds only non-secret config plus references.
- **The function's source** is referenced as the already-uploaded zip, so Terraform
  manages the function's *config* but not its *code deploy* — changing
  `../functions/alert-to-discord` still needs `gcloud functions deploy`. Managing
  the source archive in Terraform too is a future improvement.
