# =============================================================================
# MediNova — Monitoring Module
# CloudWatch log groups, alarms, dashboard, SNS alerts
# =============================================================================

# --- SNS Topic for Operations Alerts ---
resource "aws_sns_topic" "medinova_alerts" {
  name = "${var.name_prefix}-ops-alerts"

  tags = merge(var.common_tags, {
    Name = "${var.name_prefix}-ops-alerts"
  })
}

resource "aws_sns_topic_subscription" "email_alerts" {
  topic_arn = aws_sns_topic.medinova_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# --- CloudWatch Log Groups ---

resource "aws_cloudwatch_log_group" "application" {
  name              = "/medinova/${var.environment}/application"
  retention_in_days = var.log_retention_days

  tags = merge(var.common_tags, {
    Name      = "medinova-application-logs"
    Component = "logging"
  })
}

resource "aws_cloudwatch_log_group" "appointment_api" {
  name              = "/medinova/${var.environment}/appointment-api"
  retention_in_days = var.log_retention_days

  tags = var.common_tags
}

resource "aws_cloudwatch_log_group" "patient_access" {
  name              = "/medinova/${var.environment}/patient-access-audit"
  retention_in_days = 2555 # 7 years for HIPAA audit retention

  tags = merge(var.common_tags, {
    Name       = "medinova-patient-access-audit"
    Compliance = "HIPAA"
    DataClass  = "PHI-Audit"
  })
}

# --- CloudWatch Alarms ---

resource "aws_cloudwatch_metric_alarm" "api_high_error_rate" {
  alarm_name          = "${var.name_prefix}-api-high-error-rate"
  alarm_description   = "MediNova appointment API 5xx error rate exceeded 5%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.medinova_alerts.arn]
  ok_actions          = [aws_sns_topic.medinova_alerts.arn]

  tags = var.common_tags
}

resource "aws_cloudwatch_metric_alarm" "node_cpu_high" {
  alarm_name          = "${var.name_prefix}-node-cpu-high"
  alarm_description   = "EKS worker node CPU utilization exceeded 80%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 120
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.medinova_alerts.arn]

  tags = var.common_tags
}

resource "aws_cloudwatch_metric_alarm" "node_memory_high" {
  alarm_name          = "${var.name_prefix}-node-memory-high"
  alarm_description   = "EKS worker node memory utilization exceeded 85%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "mem_used_percent"
  namespace           = "CWAgent"
  period              = 120
  statistic           = "Average"
  threshold           = 85
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.medinova_alerts.arn]

  tags = var.common_tags
}

resource "aws_cloudwatch_metric_alarm" "rds_cpu_high" {
  alarm_name          = "${var.name_prefix}-rds-cpu-high"
  alarm_description   = "Patient database CPU exceeded 75%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 75
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.medinova_alerts.arn]

  tags = var.common_tags
}

resource "aws_cloudwatch_metric_alarm" "rds_connections_high" {
  alarm_name          = "${var.name_prefix}-rds-connections-high"
  alarm_description   = "Patient database connection count above threshold"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 100
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.medinova_alerts.arn]

  tags = var.common_tags
}

# --- CloudWatch Dashboard ---
resource "aws_cloudwatch_dashboard" "medinova_ops" {
  dashboard_name = "${var.name_prefix}-operations"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "text"
        width  = 24
        height = 2
        properties = {
          markdown = "# MediNova Health Solutions — Operations Dashboard\n**Environment:** ${var.environment} | **Cluster:** ${var.cluster_name}"
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "EKS Node CPU Utilization"
          period = 300
          stat   = "Average"
          metrics = [["AWS/EC2", "CPUUtilization"]]
          view   = "timeSeries"
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "Patient DB — CPU & Connections"
          period = 300
          stat   = "Average"
          metrics = [
            ["AWS/RDS", "CPUUtilization"],
            ["AWS/RDS", "DatabaseConnections"]
          ]
          view = "timeSeries"
        }
      },
      {
        type   = "log"
        width  = 24
        height = 8
        properties = {
          title   = "Appointment API — Recent Errors"
          query   = "SOURCE '/medinova/${var.environment}/appointment-api' | fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 100"
          region  = "us-east-1"
          view    = "table"
        }
      },
      {
        type   = "log"
        width  = 24
        height = 6
        properties = {
          title  = "Patient Access Audit Log — Last 50 Events"
          query  = "SOURCE '/medinova/${var.environment}/patient-access-audit' | fields @timestamp, @message | sort @timestamp desc | limit 50"
          region = "us-east-1"
          view   = "table"
        }
      }
    ]
  })
}
