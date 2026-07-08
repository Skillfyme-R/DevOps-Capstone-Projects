"""
Unit tests for PolicyService evaluation logic.
These tests exercise the policy engine without a real database.
"""
import json
import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from deploypilot.models.policy import Policy, PolicyType
from deploypilot.models.run import InfrastructureRun, RunStatus
from deploypilot.modules.policies.service import PolicyService


def make_run(
    added: int = 0,
    changed: int = 0,
    destroyed: int = 0,
    plan_output: str = "",
) -> InfrastructureRun:
    run = MagicMock(spec=InfrastructureRun)
    run.id = uuid.uuid4()
    run.project_id = uuid.uuid4()
    run.status = RunStatus.PLAN_COMPLETE
    run.resources_added = added
    run.resources_changed = changed
    run.resources_destroyed = destroyed
    run.plan_output = plan_output
    return run


def make_policy(policy_type: PolicyType, rules: dict | None = None) -> Policy:
    p = MagicMock(spec=Policy)
    p.id = uuid.uuid4()
    p.name = f"policy-{policy_type.value}"
    p.policy_type = policy_type
    p.rules = json.dumps(rules) if rules else None
    p.min_approvers = 1
    p.is_enabled = True
    return p


@pytest.fixture
def svc():
    db = AsyncMock()
    return PolicyService(db=db)


class TestRequireApprovalPolicy:
    def test_always_triggers(self, svc):
        policy = make_policy(PolicyType.REQUIRE_APPROVAL)
        run = make_run()
        assert svc._check_policy(policy, run) is True


class TestMergeGuardPolicy:
    def test_triggers_when_resources_destroyed(self, svc):
        policy = make_policy(PolicyType.MERGE_GUARD)
        run = make_run(destroyed=2)
        assert svc._check_policy(policy, run) is True

    def test_does_not_trigger_when_nothing_destroyed(self, svc):
        policy = make_policy(PolicyType.MERGE_GUARD)
        run = make_run(added=3, changed=1, destroyed=0)
        assert svc._check_policy(policy, run) is False


class TestResourceBlockPolicy:
    def test_blocks_matching_resource_type(self, svc):
        policy = make_policy(
            PolicyType.RESOURCE_BLOCK,
            rules={"blocked_resources": ["aws_s3_bucket"]},
        )
        run = make_run(plan_output="resource aws_s3_bucket will be created")
        assert svc._check_policy(policy, run) is True

    def test_allows_when_no_blocked_types_in_plan(self, svc):
        policy = make_policy(
            PolicyType.RESOURCE_BLOCK,
            rules={"blocked_resources": ["aws_s3_bucket"]},
        )
        run = make_run(plan_output="resource aws_lambda_function will be created")
        assert svc._check_policy(policy, run) is False


class TestAutoApplyPolicy:
    def test_never_blocks(self, svc):
        policy = make_policy(PolicyType.AUTO_APPLY)
        run = make_run(destroyed=99)
        assert svc._check_policy(policy, run) is False
