output "reports_bucket_name" { value = aws_s3_bucket.reports.bucket }
output "reports_bucket_arn"  { value = aws_s3_bucket.reports.arn }
output "assets_bucket_name"  { value = aws_s3_bucket.assets.bucket }
output "assets_bucket_arn"   { value = aws_s3_bucket.assets.arn }
