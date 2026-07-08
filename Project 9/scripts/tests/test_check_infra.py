"""Unit tests for MediCart infrastructure check script."""
import sys
import os
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from check_infra import (
    check_eks_cluster,
    check_ecr_repository,
    check_rds_instance,
    check_s3_buckets,
    check_secrets_manager,
)


def _mock_client(service: str, **kwargs) -> MagicMock:
    return MagicMock()


# ---------------------------------------------------------------------------
# EKS
# ---------------------------------------------------------------------------

def test_check_eks_cluster_active():
    mock_boto = MagicMock()
    mock_boto.describe_cluster.return_value = {
        "cluster": {"name": "medicart-dev-cluster", "status": "ACTIVE"}
    }
    with patch("check_infra._client", return_value=mock_boto):
        result = check_eks_cluster()
    assert result["ok"] is True
    assert result["status"] == "ACTIVE"


def test_check_eks_cluster_not_active():
    mock_boto = MagicMock()
    mock_boto.describe_cluster.return_value = {
        "cluster": {"name": "medicart-dev-cluster", "status": "CREATING"}
    }
    with patch("check_infra._client", return_value=mock_boto):
        result = check_eks_cluster()
    assert result["ok"] is False


def test_check_eks_cluster_error():
    mock_boto = MagicMock()
    mock_boto.describe_cluster.side_effect = Exception("ResourceNotFoundException")
    with patch("check_infra._client", return_value=mock_boto):
        result = check_eks_cluster()
    assert result["ok"] is False
    assert result["status"] == "ERROR"


# ---------------------------------------------------------------------------
# ECR
# ---------------------------------------------------------------------------

def test_check_ecr_repository_found():
    mock_boto = MagicMock()
    mock_boto.describe_repositories.return_value = {
        "repositories": [{"repositoryName": "medicart-api"}]
    }
    with patch("check_infra._client", return_value=mock_boto):
        result = check_ecr_repository()
    assert result["ok"] is True


def test_check_ecr_repository_error():
    mock_boto = MagicMock()
    mock_boto.describe_repositories.side_effect = Exception("RepositoryNotFoundException")
    with patch("check_infra._client", return_value=mock_boto):
        result = check_ecr_repository()
    assert result["ok"] is False


# ---------------------------------------------------------------------------
# RDS
# ---------------------------------------------------------------------------

def test_check_rds_instance_available():
    mock_boto = MagicMock()
    mock_boto.describe_db_instances.return_value = {
        "DBInstances": [{"DBInstanceIdentifier": "medicart-dev-db", "DBInstanceStatus": "available"}]
    }
    with patch("check_infra._client", return_value=mock_boto):
        result = check_rds_instance()
    assert result["ok"] is True


def test_check_rds_instance_not_available():
    mock_boto = MagicMock()
    mock_boto.describe_db_instances.return_value = {
        "DBInstances": [{"DBInstanceIdentifier": "medicart-dev-db", "DBInstanceStatus": "backing-up"}]
    }
    with patch("check_infra._client", return_value=mock_boto):
        result = check_rds_instance()
    assert result["ok"] is False


# ---------------------------------------------------------------------------
# S3
# ---------------------------------------------------------------------------

def test_check_s3_buckets_found():
    mock_boto = MagicMock()
    mock_boto.list_buckets.return_value = {
        "Buckets": [{"Name": "medicart-dev-assets-123456789"}, {"Name": "other-bucket"}]
    }
    with patch("check_infra._client", return_value=mock_boto):
        result = check_s3_buckets()
    assert result["ok"] is True


def test_check_s3_buckets_not_found():
    mock_boto = MagicMock()
    mock_boto.list_buckets.return_value = {"Buckets": [{"Name": "unrelated-bucket"}]}
    with patch("check_infra._client", return_value=mock_boto):
        result = check_s3_buckets()
    assert result["ok"] is False


# ---------------------------------------------------------------------------
# Secrets Manager
# ---------------------------------------------------------------------------

def test_check_secrets_manager_found():
    mock_boto = MagicMock()
    mock_boto.describe_secret.return_value = {"Name": "medicart/dev/db-credentials"}
    with patch("check_infra._client", return_value=mock_boto):
        result = check_secrets_manager()
    assert result["ok"] is True


def test_check_secrets_manager_not_found():
    mock_boto = MagicMock()
    mock_boto.describe_secret.side_effect = Exception("ResourceNotFoundException")
    with patch("check_infra._client", return_value=mock_boto):
        result = check_secrets_manager()
    assert result["ok"] is False
