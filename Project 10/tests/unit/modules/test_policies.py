"""Unit tests for the policy engine evaluation logic."""
import pytest
from unittest.mock import MagicMock, AsyncMock
from uuid import uuid4

from deploypilot.modules.policies.engine import PolicyEngine
from deploypilot.db.models.policy import Policy, PolicyType


def make_policy(policy_type: PolicyType, config: dict) -> Policy:
    p = MagicMock(spec=Policy)
    p.id = uuid4()
    p.policy_type = policy_type
    p.config = config
    p.is_active = True
    return p


class TestCostThresholdPolicy:
    def test_below_threshold_passes(self):
        engine = PolicyEngine()
        policy = make_policy(PolicyType.COST_THRESHOLD, {"monthly_limit_usd": 500.0})
        result = engine.evaluate_cost_threshold(policy, estimated_cost=100.0)
        assert result.approved is True

    def test_above_threshold_blocks(self):
        engine = PolicyEngine()
        policy = make_policy(PolicyType.COST_THRESHOLD, {"monthly_limit_usd": 500.0})
        result = engine.evaluate_cost_threshold(policy, estimated_cost=600.0)
        assert result.approved is False
        assert "cost" in result.reason.lower()

    def test_exact_threshold_passes(self):
        engine = PolicyEngine()
        policy = make_policy(PolicyType.COST_THRESHOLD, {"monthly_limit_usd": 500.0})
        result = engine.evaluate_cost_threshold(policy, estimated_cost=500.0)
        assert result.approved is True


class TestResourceBlockPolicy:
    def test_blocked_resource_type_fails(self):
        engine = PolicyEngine()
        policy = make_policy(
            PolicyType.RESOURCE_BLOCK,
            {"blocked_types": ["aws_instance", "aws_db_instance"]},
        )
        result = engine.evaluate_resource_block(policy, resource_types=["aws_instance"])
        assert result.approved is False

    def test_allowed_resource_type_passes(self):
        engine = PolicyEngine()
        policy = make_policy(
            PolicyType.RESOURCE_BLOCK,
            {"blocked_types": ["aws_db_instance"]},
        )
        result = engine.evaluate_resource_block(policy, resource_types=["aws_s3_bucket"])
        assert result.approved is True

    def test_empty_resource_list_passes(self):
        engine = PolicyEngine()
        policy = make_policy(PolicyType.RESOURCE_BLOCK, {"blocked_types": ["aws_instance"]})
        result = engine.evaluate_resource_block(policy, resource_types=[])
        assert result.approved is True


class TestRequireApprovalPolicy:
    def test_require_approval_returns_pending(self):
        engine = PolicyEngine()
        policy = make_policy(
            PolicyType.REQUIRE_APPROVAL,
            {"approvers": ["user-1", "user-2"], "minimum_approvals": 1},
        )
        result = engine.evaluate_require_approval(policy, approvals_received=0)
        assert result.approved is False
        assert result.requires_approval is True

    def test_sufficient_approvals_passes(self):
        engine = PolicyEngine()
        policy = make_policy(
            PolicyType.REQUIRE_APPROVAL,
            {"approvers": ["user-1", "user-2"], "minimum_approvals": 1},
        )
        result = engine.evaluate_require_approval(policy, approvals_received=1)
        assert result.approved is True
