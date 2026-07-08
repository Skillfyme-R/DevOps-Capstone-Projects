output "app_log_group_name" { value = aws_cloudwatch_log_group.medicart_app.name }
output "dashboard_name" { value = aws_cloudwatch_dashboard.medicart.dashboard_name }
