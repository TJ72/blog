# Monitoring

Cloud Monitoring configuration for the blog: an uptime check, an alerting policy,
and a dashboard. Alerts are delivered to Discord through a Pub/Sub topic and a
Cloud Function (see [`../functions/alert-to-discord`](../functions/alert-to-discord)).

```
Uptime check ──fails──► Alert policy ──► Pub/Sub topic ──► Cloud Function ──► Discord
                                         (monitoring-alerts)  (alert-to-discord)
Dashboard: request rate, latency, instance count, uptime
```

## Files

| File | What it is |
| --- | --- |
| `uptime-check.json` | Probes `https://<service>/` every minute from three continents; non-2xx is a failure. |
| `alert-policy.json` | Fires when the uptime check fails from more than one location; routes to the Pub/Sub channel. |
| `dashboard.json` | "Blog — Service Health" dashboard (request rate / latency / instances / uptime). |

## How this is applied (IaC-lite)

These files are the **source of record** for resources that already run in GCP.
They are created imperatively with the Monitoring REST API rather than through a
CI/CD pipeline, so editing a file here does **not** change the cloud until you
re-apply it — and changing a resource in the console does not update these files.
That gap is *configuration drift*; managing it by hand is the trade-off for not
(yet) using Terraform. Treat these files as reproducible build instructions.

All commands assume:

```bash
PROJECT=albert-blog-2606221144
TOKEN=$(gcloud auth print-access-token)
API=https://monitoring.googleapis.com
```

### 1. Uptime check + dashboard

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "$API/v3/projects/$PROJECT/uptimeCheckConfigs" -d @uptime-check.json

curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "$API/v1/projects/$PROJECT/dashboards" -d @dashboard.json
```

### 2. Pub/Sub topic + notification channel

```bash
gcloud pubsub topics create monitoring-alerts

# Create the Pub/Sub notification channel; note the returned channel ID.
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "$API/v3/projects/$PROJECT/notificationChannels" -d '{
    "type": "pubsub",
    "displayName": "Pub/Sub — monitoring-alerts (Discord relay)",
    "labels": { "topic": "projects/'"$PROJECT"'/topics/monitoring-alerts" }
  }'

# Let Cloud Monitoring publish to the topic (easy to forget — without it the
# channel silently delivers nothing).
gcloud pubsub topics add-iam-policy-binding monitoring-alerts \
  --member="serviceAccount:service-503336128890@gcp-sa-monitoring-notification.iam.gserviceaccount.com" \
  --role="roles/pubsub.publisher"
```

### 3. Alert policy

`alert-policy.json` hard-codes two IDs that are generated on creation: the uptime
check id (`metric.label.check_id`) and the notification channel id. If you rebuild
from scratch, update those to match the resources created above, then:

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "$API/v3/projects/$PROJECT/alertPolicies" -d @alert-policy.json
```

### 4. Cloud Function (the Discord relay)

See [`../functions/alert-to-discord`](../functions/alert-to-discord). The Discord
webhook URL is injected at deploy time, so it never lives in the repo:

```bash
gcloud functions deploy alert-to-discord \
  --gen2 --runtime=nodejs22 --region=asia-east1 \
  --source=../functions/alert-to-discord --entry-point=alertToDiscord \
  --trigger-topic=monitoring-alerts \
  --set-env-vars=DISCORD_WEBHOOK_URL=<your-webhook-url> \
  --memory=256Mi --max-instances=3
```

## Testing the pipeline

- **Just the delivery half** (Pub/Sub → Function → Discord): publish a fake
  incident straight to the topic.
  ```bash
  gcloud pubsub topics publish monitoring-alerts \
    --message='{"incident":{"state":"open","policy_name":"manual test","summary":"test"}}'
  ```
- **End to end** (policy included): create a throwaway uptime check against a path
  that 404s and a fast-firing policy on it, wait for the alert, then delete both.
- Confirm delivery in the function logs:
  ```bash
  gcloud functions logs read alert-to-discord --gen2 --region=asia-east1 --limit=20
  ```
