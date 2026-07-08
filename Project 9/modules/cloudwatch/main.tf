resource "aws_cloudwatch_log_group" "medicart_app" {
  name              = "/medicart/${var.environment}/app"
  retention_in_days = 90

  tags = {
    Environment = var.environment
    Project     = "medicart-platform"
  }
}

resource "aws_cloudwatch_log_group" "eks_cluster" {
  name              = "/aws/eks/${var.cluster_name}/cluster"
  retention_in_days = 30

  tags = {
    Environment = var.environment
  }
}

# CPU Utilization Alarm
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "medicart-${var.environment}-cpu-high"
  alarm_description   = "MediCart EKS node CPU utilization exceeded 80%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 120
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "notBreaching"

  alarm_actions = var.alert_sns_arn != "" ? [var.alert_sns_arn] : []

  tags = {
    Environment = var.environment
  }
}

# Memory Utilization Alarm
resource "aws_cloudwatch_metric_alarm" "memory_high" {
  alarm_name          = "medicart-${var.environment}-memory-high"
  alarm_description   = "MediCart EKS node memory utilization exceeded 85%"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "mem_used_percent"
  namespace           = "CWAgent"
  period              = 120
  statistic           = "Average"
  threshold           = 85
  treat_missing_data  = "notBreaching"

  alarm_actions = var.alert_sns_arn != "" ? [var.alert_sns_arn] : []

  tags = {
    Environment = var.environment
  }
}

# RDS Connection Count Alarm
resource "aws_cloudwatch_metric_alarm" "rds_connections_high" {
  alarm_name          = "medicart-${var.environment}-rds-connections-high"
  alarm_description   = "MediCart RDS connection count exceeded 80% of max"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "notBreaching"

  tags = {
    Environment = var.environment
  }
}

# API Error Rate Dashboard
resource "aws_cloudwatch_dashboard" "medicart" {
  dashboard_name = "medicart-${var.environment}-operations"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "MediCart API — CPU Utilization"
          period = 300
          stat   = "Average"
          metrics = [["AWS/EC2", "CPUUtilization"]]
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "MediCart RDS — Database Connections"
          period = 300
          stat   = "Average"
          metrics = [["AWS/RDS", "DatabaseConnections"]]
        }
      },
      {
        type   = "log"
        width  = 24
        height = 6
        properties = {
          title   = "MediCart Application Logs — Recent Errors"
          query   = "SOURCE '/medicart/${var.environment}/app' | fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 50"
          region  = "us-east-1"
          view    = "table"
        }
      }
    ]
  })
}
