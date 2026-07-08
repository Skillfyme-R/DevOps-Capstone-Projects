output "alert_topic_arn" { value = aws_sns_topic.medinova_alerts.arn }
output "application_log_group" { value = aws_cloudwatch_log_group.application.name }
output "audit_log_group" { value = aws_cloudwatch_log_group.patient_access.name }
output "dashboard_url" {
  value = "https://console.aws.amazon.com/cloudwatch/home#dashboards:name=${aws_cloudwatch_dashboard.medinova_ops.dashboard_name}"
}
