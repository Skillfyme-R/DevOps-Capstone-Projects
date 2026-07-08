output "patient_records_bucket_name" { value = aws_s3_bucket.patient_records.id }
output "patient_records_bucket_arn" { value = aws_s3_bucket.patient_records.arn }
output "app_assets_bucket_name" { value = aws_s3_bucket.app_assets.id }
output "app_assets_bucket_arn" { value = aws_s3_bucket.app_assets.arn }
