# Monitoring stack, imported from existing GCP resources via `terraform plan
# -generate-config-out` and then refined: the Discord webhook is now a sensitive
# variable, and resources reference each other instead of hardcoding IDs.

# __generated__ by Terraform from "projects/albert-blog-2606221144/topics/monitoring-alerts"
resource "google_pubsub_topic" "monitoring_alerts" {
  deletion_policy            = "DELETE"
  kms_key_name               = null
  labels                     = {}
  message_retention_duration = null
  name                       = "monitoring-alerts"
  project                    = var.project_id
  tags                       = null
}

# __generated__ by Terraform from "projects/503336128890/dashboards/054d0080-c7eb-4494-93c1-51f54bcd1ce2"
resource "google_monitoring_dashboard" "service_health" {
  dashboard_json = jsonencode({
    displayName = "Blog — Service Health"
    etag        = "7cac12822a16c88f49fd02acd636f804"
    mosaicLayout = {
      columns = 12
      tiles = [{
        height = 4
        widget = {
          title = "Uptime — fraction of probes passing"
          xyChart = {
            dataSets = [{
              plotType   = "LINE"
              targetAxis = "Y1"
              timeSeriesQuery = {
                timeSeriesFilter = {
                  aggregation = {
                    alignmentPeriod    = "300s"
                    crossSeriesReducer = "REDUCE_MEAN"
                    groupByFields      = ["resource.label.\"host\""]
                    perSeriesAligner   = "ALIGN_FRACTION_TRUE"
                  }
                  filter = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" resource.type=\"uptime_url\""
                }
              }
            }]
            yAxis = {
              label = "fraction"
              scale = "LINEAR"
            }
          }
        }
        width = 6
        }, {
        height = 4
        widget = {
          title = "Cloud Run — requests/s by response class"
          xyChart = {
            dataSets = [{
              plotType   = "LINE"
              targetAxis = "Y1"
              timeSeriesQuery = {
                timeSeriesFilter = {
                  aggregation = {
                    alignmentPeriod    = "60s"
                    crossSeriesReducer = "REDUCE_SUM"
                    groupByFields      = ["metric.label.\"response_code_class\""]
                    perSeriesAligner   = "ALIGN_RATE"
                  }
                  filter = "metric.type=\"run.googleapis.com/request_count\" resource.type=\"cloud_run_revision\" resource.label.\"service_name\"=\"blog\""
                }
              }
            }]
            yAxis = {
              label = "req/s"
              scale = "LINEAR"
            }
          }
        }
        width = 6
        xPos  = 6
        }, {
        height = 4
        widget = {
          title = "Cloud Run — request latency (p95 / p99)"
          xyChart = {
            dataSets = [{
              legendTemplate = "p95"
              plotType       = "LINE"
              targetAxis     = "Y1"
              timeSeriesQuery = {
                timeSeriesFilter = {
                  aggregation = {
                    alignmentPeriod  = "60s"
                    perSeriesAligner = "ALIGN_PERCENTILE_95"
                  }
                  filter = "metric.type=\"run.googleapis.com/request_latencies\" resource.type=\"cloud_run_revision\" resource.label.\"service_name\"=\"blog\""
                }
              }
              }, {
              legendTemplate = "p99"
              plotType       = "LINE"
              targetAxis     = "Y1"
              timeSeriesQuery = {
                timeSeriesFilter = {
                  aggregation = {
                    alignmentPeriod  = "60s"
                    perSeriesAligner = "ALIGN_PERCENTILE_99"
                  }
                  filter = "metric.type=\"run.googleapis.com/request_latencies\" resource.type=\"cloud_run_revision\" resource.label.\"service_name\"=\"blog\""
                }
              }
            }]
            yAxis = {
              label = "ms"
              scale = "LINEAR"
            }
          }
        }
        width = 6
        yPos  = 4
        }, {
        height = 4
        widget = {
          title = "Cloud Run — active instances by state"
          xyChart = {
            dataSets = [{
              plotType   = "STACKED_AREA"
              targetAxis = "Y1"
              timeSeriesQuery = {
                timeSeriesFilter = {
                  aggregation = {
                    alignmentPeriod    = "60s"
                    crossSeriesReducer = "REDUCE_SUM"
                    groupByFields      = ["metric.label.\"state\""]
                    perSeriesAligner   = "ALIGN_MEAN"
                  }
                  filter = "metric.type=\"run.googleapis.com/container/instance_count\" resource.type=\"cloud_run_revision\" resource.label.\"service_name\"=\"blog\""
                }
              }
            }]
            yAxis = {
              label = "instances"
              scale = "LINEAR"
            }
          }
        }
        width = 6
        xPos  = 6
        yPos  = 4
      }]
    }
    name = "projects/${local.project_number}/dashboards/054d0080-c7eb-4494-93c1-51f54bcd1ce2"
  })
  deletion_policy = "DELETE"
  project         = local.project_number
}

# __generated__ by Terraform from "projects/albert-blog-2606221144/notificationChannels/17763559937055753421"
resource "google_monitoring_notification_channel" "discord_pubsub" {
  deletion_policy = "DELETE"
  description     = null
  display_name    = "Pub/Sub — monitoring-alerts (Discord relay)"
  enabled         = true
  force_delete    = false
  labels = {
    topic = google_pubsub_topic.monitoring_alerts.id
  }
  project     = var.project_id
  type        = "pubsub"
  user_labels = {}
}

# __generated__ by Terraform from "projects/albert-blog-2606221144/alertPolicies/11293156152870994956"
resource "google_monitoring_alert_policy" "uptime_failing" {
  combiner              = "OR"
  deletion_policy       = "DELETE"
  display_name          = "blog — uptime check failing"
  enabled               = true
  notification_channels = [google_monitoring_notification_channel.discord_pubsub.id]
  project               = var.project_id
  severity              = null
  user_labels           = {}
  alert_strategy {
    auto_close           = "1800s"
    notification_prompts = []
  }
  conditions {
    display_name = "Home page uptime check failing (more than one location)"
    condition_threshold {
      comparison              = "COMPARISON_GT"
      denominator_filter      = null
      duration                = "60s"
      evaluation_missing_data = null
      filter                  = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND resource.type=\"uptime_url\" AND metric.label.\"check_id\"=\"${google_monitoring_uptime_check_config.blog_home.uptime_check_id}\""
      threshold_value         = 1
      aggregations {
        alignment_period     = "300s"
        cross_series_reducer = "REDUCE_COUNT_FALSE"
        group_by_fields      = ["resource.label.\"host\""]
        per_series_aligner   = "ALIGN_NEXT_OLDER"
      }
      trigger {
        count   = 1
        percent = 0
      }
    }
  }
  documentation {
    content   = "The blog home page uptime check is failing from more than one location. Check the Cloud Run service (recent deploys, logs, instance health) at https://console.cloud.google.com/run/detail/asia-east1/blog ."
    mime_type = "text/markdown"
    subject   = null
  }
}

# __generated__ by Terraform from "projects/albert-blog-2606221144/uptimeCheckConfigs/blog-home-page-https-get-3nn2gTT_e0E"
resource "google_monitoring_uptime_check_config" "blog_home" {
  checker_type       = "STATIC_IP_CHECKERS"
  deletion_policy    = "DELETE"
  display_name       = "blog — home page (HTTPS GET /)"
  log_check_failures = false
  period             = "60s"
  project            = var.project_id
  selected_regions   = ["USA", "EUROPE", "ASIA_PACIFIC"]
  timeout            = "10s"
  user_labels        = {}
  http_check {
    body                = null
    content_type        = null
    custom_content_type = null
    headers             = {}
    mask_headers        = false
    path                = "/"
    port                = 443
    request_method      = "GET"
    use_ssl             = true
    validate_ssl        = true
    accepted_response_status_codes {
      status_class = "STATUS_CLASS_2XX"
      status_value = 0
    }
  }
  monitored_resource {
    labels = {
      # Deliberately NOT derived from google_cloud_run_v2_service.blog.uri: that
      # attribute returns the LEGACY random-tag URL (blog-…-de.a.run.app), while
      # this is the newer deterministic URL. host is immutable, so switching
      # would force-replace the check (new check_id, metric history reset, a
      # monitoring gap during apply) just to probe an older URL format.
      host       = "blog-${local.project_number}.asia-east1.run.app"
      project_id = var.project_id
    }
    type = "uptime_url"
  }
}

# __generated__ by Terraform from "projects/albert-blog-2606221144/locations/asia-east1/functions/alert-to-discord"
resource "google_cloudfunctions2_function" "alert_to_discord" {
  deletion_policy = "DELETE"
  description     = null
  kms_key_name    = null
  labels          = {}
  location        = "asia-east1"
  name            = "alert-to-discord"
  project         = var.project_id
  build_config {
    docker_repository     = "projects/${var.project_id}/locations/asia-east1/repositories/gcf-artifacts"
    entry_point           = "alertToDiscord"
    environment_variables = {}
    runtime               = "nodejs22"
    service_account       = google_service_account.alert_fn_build.id
    worker_pool           = null
    automatic_update_policy {
    }
    source {
      storage_source {
        bucket     = "gcf-v2-sources-${local.project_number}-asia-east1"
        generation = 1782704205395807
        object     = "alert-to-discord/function-source.zip"
      }
    }
  }
  event_trigger {
    event_type            = "google.cloud.pubsub.topic.v1.messagePublished"
    pubsub_topic          = google_pubsub_topic.monitoring_alerts.id
    retry_policy          = "RETRY_POLICY_DO_NOT_RETRY"
    service_account_email = google_service_account.alert_fn_trigger.email
    trigger_region        = "asia-east1"
  }
  service_config {
    all_traffic_on_latest_revision = true
    available_cpu                  = "0.1666"
    available_memory               = "256Mi"
    binary_authorization_policy    = null
    environment_variables = {
      LOG_EXECUTION_ID = "true"
    }
    secret_environment_variables {
      key        = "DISCORD_WEBHOOK_URL"
      project_id = var.project_id
      secret     = google_secret_manager_secret.discord_webhook.secret_id
      version    = "latest"
    }
    ingress_settings                 = "ALLOW_ALL"
    max_instance_count               = 3
    max_instance_request_concurrency = 1
    min_instance_count               = 0
    service_account_email            = google_service_account.alert_fn_runtime.email
    timeout_seconds                  = 60
    vpc_connector                    = null
    vpc_connector_egress_settings    = null
  }

  # The build/trigger SAs must hold their roles, and the runtime SA must hold
  # secretAccessor on the webhook, before the function is updated — or the redeploy
  # (build) / event delivery / secret mount could fail in the gap.
  depends_on = [
    google_project_iam_member.alert_fn_build_builder,
    google_project_iam_member.alert_fn_trigger_receiver,
    google_project_iam_member.alert_fn_trigger_invoker,
    google_secret_manager_secret_iam_member.alert_fn_discord_webhook,
  ]
}

# __generated__ by Terraform from "projects/albert-blog-2606221144/topics/monitoring-alerts roles/pubsub.publisher serviceAccount:service-503336128890@gcp-sa-monitoring-notification.iam.gserviceaccount.com"
resource "google_pubsub_topic_iam_member" "monitoring_publisher" {
  member  = "serviceAccount:service-${local.project_number}@gcp-sa-monitoring-notification.iam.gserviceaccount.com"
  project = var.project_id
  role    = "roles/pubsub.publisher"
  topic   = google_pubsub_topic.monitoring_alerts.id
}
