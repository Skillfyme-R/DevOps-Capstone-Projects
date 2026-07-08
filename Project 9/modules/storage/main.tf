# =============================================================================
# MediNova — Storage Module
# S3 buckets: patient records (PHI) + app assets
# =============================================================================

# --- Patient Records Bucket (PHI — HIPAA-sensitive) ---
resource "aws_s3_bucket" "patient_records" {
  bucket = var.patient_records_bucket

  tags = merge(var.common_tags, {
    Name       = var.patient_records_bucket
    DataClass  = "PHI"
    Compliance = "HIPAA"
  })
}

resource "aws_s3_bucket_versioning" "patient_records" {
  bucket = aws_s3_bucket.patient_records.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "patient_records" {
  bucket = aws_s3_bucket.patient_records.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "patient_records" {
  bucket                  = aws_s3_bucket.patient_records.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "patient_records" {
  bucket = aws_s3_bucket.patient_records.id

  rule {
    id     = "patient-records-tiering"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 365
      storage_class = "GLACIER"
    }

    # PHI records retained 7 years per HIPAA requirement
    expiration {
      days = 2555 # 7 years
    }

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

resource "aws_s3_bucket_logging" "patient_records" {
  bucket        = aws_s3_bucket.patient_records.id
  target_bucket = aws_s3_bucket.patient_records.id
  target_prefix = "access-logs/patient-records/"
}

# --- App Assets Bucket ---
resource "aws_s3_bucket" "app_assets" {
  bucket = var.app_assets_bucket

  tags = merge(var.common_tags, {
    Name      = var.app_assets_bucket
    DataClass = "Public"
  })
}

resource "aws_s3_bucket_versioning" "app_assets" {
  bucket = aws_s3_bucket.app_assets.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "app_assets" {
  bucket = aws_s3_bucket.app_assets.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "app_assets" {
  bucket                  = aws_s3_bucket.app_assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "app_assets" {
  bucket = aws_s3_bucket.app_assets.id

  rule {
    id     = "app-assets-cleanup"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    expiration {
      days = 365
    }
  }
}
