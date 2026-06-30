# The Cloud Run service. Imported from the running service; Terraform owns the
# configuration, while CI/CD owns the image (see the lifecycle block at the end).

# __generated__ by Terraform from "projects/albert-blog-2606221144/locations/asia-east1/services/blog"
resource "google_cloud_run_v2_service" "blog" {
  annotations          = {}
  client               = "gcloud"
  client_version       = "568.0.0"
  custom_audiences     = []
  default_uri_disabled = false
  deletion_policy      = "DELETE"
  deletion_protection  = true
  description          = null
  iap_enabled          = false
  ingress              = "INGRESS_TRAFFIC_ALL"
  invoker_iam_disabled = false
  labels               = {}
  launch_stage         = "GA"
  location             = "asia-east1"
  name                 = "blog"
  project              = var.project_id
  scaling {
    manual_instance_count = 0
    max_instance_count    = 3
    min_instance_count    = 0
    scaling_mode          = null
  }
  template {
    annotations                      = {}
    encryption_key                   = null
    execution_environment            = null
    gpu_zonal_redundancy_disabled    = false
    health_check_disabled            = false
    labels                           = {}
    max_instance_request_concurrency = 80
    revision                         = null
    service_account                  = google_service_account.blog_runtime.email
    session_affinity                 = false
    timeout                          = "300s"
    containers {
      args           = []
      base_image_uri = null
      command        = []
      depends_on     = []
      image          = "asia-east1-docker.pkg.dev/${var.project_id}/blog/blog:9fa4dd70e1b6034c8e85d466889fdcc773b53470"
      name           = null
      working_dir    = null
      env {
        name  = "ADMIN_TOKEN"
        value = var.admin_token
      }
      ports {
        container_port = 8080
        name           = "http1"
      }
      resources {
        cpu_idle = true
        limits = {
          cpu    = "1000m"
          memory = "512Mi"
        }
        startup_cpu_boost = true
      }
      startup_probe {
        failure_threshold     = 1
        initial_delay_seconds = 0
        period_seconds        = 240
        timeout_seconds       = 240
        tcp_socket {
          port = 8080
        }
      }
    }
    scaling {
      max_instance_count = 3
      min_instance_count = 0
    }
  }
  traffic {
    percent  = 100
    revision = null
    tag      = null
    type     = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }

  # The new revision runs AS blog_runtime, so that SA must already hold its runtime
  # roles before this service is updated; otherwise the first request that touches
  # Firestore/GCS could fail in the gap before the IAM bindings exist. (IAM is also
  # eventually-consistent, so propagation can still lag a few seconds after apply.)
  depends_on = [
    google_project_iam_member.runtime_datastore,
    google_storage_bucket_iam_member.runtime_cv_viewer,
  ]

  # CI/CD (gcloud run deploy) owns the image and stamps client metadata on every
  # push; Terraform owns everything else. Ignore those fields so a deploy doesn't
  # show up as drift here.
  lifecycle {
    ignore_changes = [
      client,
      client_version,
      template[0].containers[0].image,
    ]
  }
}
