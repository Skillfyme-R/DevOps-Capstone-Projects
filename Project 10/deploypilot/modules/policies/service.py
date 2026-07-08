"""Policy evaluation service."""

import json
from dataclasses import dataclass, field
from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from deploypilot.models.policy import Policy, PolicyType
from deploypilot.models.run import InfrastructureRun


@dataclass
class PolicyViolation:
    policy_id: str
    policy_name: str
    policy_type: str
    message: str


@dataclass
class PolicyEvaluationResult:
    passed: bool
    requires_approval: bool = False
    violations: List[PolicyViolation] = field(default_factory=list)


class PolicyService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def evaluate(self, run: InfrastructureRun) -> PolicyEvaluationResult:
        """
        Evaluate all enabled policies for the workspace that owns this run's project.

        Returns a PolicyEvaluationResult describing whether the run may proceed.
        """
        # Resolve workspace via project join
        from sqlalchemy import text

        result = await self.db.execute(
            text(
                "SELECT w.id FROM workspaces w "
                "JOIN projects p ON p.workspace_id = w.id "
                "WHERE p.id = :pid"
            ),
            {"pid": run.project_id},
        )
        row = result.fetchone()
        if not row:
            return PolicyEvaluationResult(passed=True)

        workspace_id = row[0]
        policies_result = await self.db.execute(
            select(Policy).where(
                Policy.workspace_id == workspace_id,
                Policy.is_enabled.is_(True),
            ).order_by(Policy.priority)
        )
        policies = list(policies_result.scalars().all())

        overall_passed = True
        requires_approval = False
        violations: List[PolicyViolation] = []

        for policy in policies:
            check_passed, needs_approval, message = self._check_policy(policy, run)
            if not check_passed:
                overall_passed = False
                violations.append(
                    PolicyViolation(
                        policy_id=str(policy.id),
                        policy_name=policy.name,
                        policy_type=policy.policy_type.value,
                        message=message,
                    )
                )
            if needs_approval:
                requires_approval = True

        return PolicyEvaluationResult(
            passed=overall_passed,
            requires_approval=requires_approval,
            violations=violations,
        )

    @staticmethod
    def _check_policy(
        policy: Policy,
        run: InfrastructureRun,
    ) -> tuple[bool, bool, str]:
        """
        Evaluate a single policy against a run.

        Returns (passed, requires_approval, message).
        """
        if policy.policy_type == PolicyType.REQUIRE_APPROVAL:
            return True, True, ""

        if policy.policy_type == PolicyType.AUTO_APPLY:
            return True, False, ""

        if policy.policy_type == PolicyType.COST_THRESHOLD:
            # Without real cost data we pass by default
            return True, False, ""

        if policy.policy_type == PolicyType.RESOURCE_BLOCK:
            # Parse blocked resource types from rules JSON
            if policy.rules:
                try:
                    rules = json.loads(policy.rules)
                    blocked = rules.get("blocked_resources", [])
                    if blocked:
                        # Simplified: always pass (no resource-type inspection at plan level)
                        return True, False, ""
                except (json.JSONDecodeError, AttributeError):
                    pass
            return True, False, ""

        if policy.policy_type == PolicyType.MERGE_GUARD:
            # Block applies triggered by non-PR events if rule is set
            if run.trigger.value not in ("pull_request", "manual"):
                return (
                    False,
                    False,
                    f"MERGE_GUARD: trigger '{run.trigger.value}' is not allowed by policy '{policy.name}'",
                )
            return True, False, ""

        return True, False, ""
