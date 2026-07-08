"""
MediCart Healthcare Platform — Infrastructure Health Check Script
Verifies AWS resources are provisioned and healthy.
"""
import boto3
import sys
import json
import os
import logging
from typing import Any

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("medicart.infra_check")

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
ENVIRONMENT = os.getenv("ENVIRONMENT", "dev")

EXPECTED = {
    "eks_cluster": f"medicart-{ENVIRONMENT}-cluster",
    "ecr_repository": "medicart-api",
    "rds_identifier": f"medicart-{ENVIRONMENT}-db",
    "s3_bucket_prefix": f"medicart-{ENVIRONMENT}-assets",
}


def _client(service: str):
    return boto3.client(service, region_name=AWS_REGION)


def check_eks_cluster() -> dict[str, Any]:
    try:
        eks = _client("eks")
        resp = eks.describe_cluster(name=EXPECTED["eks_cluster"])
        cluster = resp["cluster"]
        status = cluster["status"]
        ok = status == "ACTIVE"
        logger.info("EKS cluster %s — %s", cluster["name"], status)
        return {"resource": "EKS Cluster", "name": cluster["name"], "status": status, "ok": ok}
    except Exception as e:
        logger.error("EKS check failed: %s", e)
        return {"resource": "EKS Cluster", "name": EXPECTED["eks_cluster"], "status": "ERROR", "ok": False, "error": str(e)}


def check_ecr_repository() -> dict[str, Any]:
    try:
        ecr = _client("ecr")
        resp = ecr.describe_repositories(repositoryNames=[EXPECTED["ecr_repository"]])
        repo = resp["repositories"][0]
        logger.info("ECR repository %s — active", repo["repositoryName"])
        return {"resource": "ECR Repository", "name": repo["repositoryName"], "status": "ACTIVE", "ok": True}
    except Exception as e:
        logger.error("ECR check failed: %s", e)
        return {"resource": "ECR Repository", "name": EXPECTED["ecr_repository"], "status": "ERROR", "ok": False, "error": str(e)}


def check_rds_instance() -> dict[str, Any]:
    try:
        rds = _client("rds")
        resp = rds.describe_db_instances(DBInstanceIdentifier=EXPECTED["rds_identifier"])
        db = resp["DBInstances"][0]
        status = db["DBInstanceStatus"]
        ok = status == "available"
        logger.info("RDS instance %s — %s", db["DBInstanceIdentifier"], status)
        return {"resource": "RDS Instance", "name": db["DBInstanceIdentifier"], "status": status, "ok": ok}
    except Exception as e:
        logger.error("RDS check failed: %s", e)
        return {"resource": "RDS Instance", "name": EXPECTED["rds_identifier"], "status": "ERROR", "ok": False, "error": str(e)}


def check_s3_buckets() -> dict[str, Any]:
    try:
        s3 = _client("s3")
        resp = s3.list_buckets()
        medicart_buckets = [b["Name"] for b in resp["Buckets"] if b["Name"].startswith(EXPECTED["s3_bucket_prefix"])]
        ok = len(medicart_buckets) > 0
        logger.info("S3 MediCart buckets: %s", medicart_buckets)
        return {"resource": "S3 Buckets", "name": str(medicart_buckets), "status": "FOUND" if ok else "NOT_FOUND", "ok": ok}
    except Exception as e:
        logger.error("S3 check failed: %s", e)
        return {"resource": "S3 Buckets", "name": EXPECTED["s3_bucket_prefix"], "status": "ERROR", "ok": False, "error": str(e)}


def check_secrets_manager() -> dict[str, Any]:
    try:
        sm = _client("secretsmanager")
        secret_name = f"medicart/{ENVIRONMENT}/db-credentials"
        resp = sm.describe_secret(SecretId=secret_name)
        logger.info("SecretsManager secret %s — active", resp["Name"])
        return {"resource": "Secrets Manager", "name": resp["Name"], "status": "ACTIVE", "ok": True}
    except Exception as e:
        logger.error("Secrets Manager check failed: %s", e)
        return {"resource": "Secrets Manager", "name": f"medicart/{ENVIRONMENT}/db-credentials", "status": "ERROR", "ok": False, "error": str(e)}


def main():
    logger.info("=== MediCart Infrastructure Health Check ===")
    logger.info("Environment: %s | Region: %s", ENVIRONMENT, AWS_REGION)

    checks = [
        check_eks_cluster(),
        check_ecr_repository(),
        check_rds_instance(),
        check_s3_buckets(),
        check_secrets_manager(),
    ]

    print("\n=== MediCart Infrastructure Health Report ===")
    print(f"{'Resource':<20} {'Name':<45} {'Status':<15} {'OK'}")
    print("-" * 95)

    all_ok = True
    for check in checks:
        status_icon = "PASS" if check["ok"] else "FAIL"
        print(f"{check['resource']:<20} {check['name']:<45} {check['status']:<15} {status_icon}")
        if not check["ok"]:
            all_ok = False

    print("\n" + "=" * 95)
    if all_ok:
        print("All MediCart infrastructure checks PASSED.")
        sys.exit(0)
    else:
        print("One or more MediCart infrastructure checks FAILED.")
        sys.exit(1)


if __name__ == "__main__":
    main()
