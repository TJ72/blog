# Monthly cost budget. It only ALERTS — it does not cap spend (the real ceiling
# is Cloud Run --max-instances). 150 TWD/month; email alerts at 50/90/100% of
# actual net spend (INCLUDE_ALL_CREDITS, so it stays quiet until free credits run
# out). Lives under the billing account, not the project.
resource "google_billing_budget" "monthly" {
  billing_account = "0158B3-514B07-067DE2"
  display_name    = "blog-monthly-budget"

  budget_filter {
    calendar_period        = "MONTH"
    credit_types_treatment = "INCLUDE_ALL_CREDITS"
    projects               = ["projects/${local.project_number}"]
  }

  amount {
    specified_amount {
      currency_code = "TWD"
      units         = "150"
    }
  }

  threshold_rules {
    spend_basis       = "CURRENT_SPEND"
    threshold_percent = 0.5
  }
  threshold_rules {
    spend_basis       = "CURRENT_SPEND"
    threshold_percent = 0.9
  }
  threshold_rules {
    spend_basis       = "CURRENT_SPEND"
    threshold_percent = 1
  }
}
