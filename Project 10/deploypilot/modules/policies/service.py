"""
PolicyService: evaluate workspace policies against a completed plan.
Returns whether the run requires human approval before apply.
"""
import json
import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from deploypilot.core.logging import get_logger
from deploypilot.models.policy import Policy, PolicyType
from deploypilot.models.run import InfrastructureRun

log = get_logger(__name__)


class PolicyEvaluationResult:
    def __init__(self, requires_approval: bool, blocking_policies: list[str]):
        self.requires_approval = requires_approval
        self.blocking_policies = blocking_policies


class PolicyService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def evaluate(self, run: InfrastructureRun) -> PolicyEvaluationResult:
        """
        Evaluate all enabled policies for the workspace containing this run's project.
        Returns whether the run requires approval before apply.
        """
        ws_id = await self._get_workspace_id_for_run(run)
        policies = await self._get_enabled_policies(ws_id)

        blocking: list[str] = []
        for policy in policies:
            if self._check_policy(policy, run):
                blocking.append(policy.name)
                log.info(
                    "policy_triggered",
                    policy=policy.name,
                    run_id=str(run.id),
                    type=policy.policy_type.value,
                )

        return PolicyEvaluationResult(
            requires_approval=len(blocking) > 0,
            blocking_policies=blocking,
        )

    def _check_policy(self, policy: Policy, run: InfrastructureRun) -> bool:
        match policy.policy_type:
            case PolicyType.REQUIRE_APPROVAL:
                return True  # always requires approval when this policy is active

            case PolicyType.RESOURCE_BLOCK:
                # rules JSON: {"blocked_resources": ["aws_instance", "aws_s3_bucket"]}
                rules = json.loads(policy.rules or "{}")
                blocked = rules.get("blocked_resources", [])
                plan_text = run.plan_output or ""
                return any(r in plan_text for r in blocked)

            case PolicyType.COST_THRESHOLD:
                # Placeholder: real impl would parse Infracost JSON
                rules = json.loads(policy.rules or "{}")
                threshold = rules.get("monthly_cost_usd", 0)
                return run.resources_added > 0 and threshold > 0

            case PolicyType.AUTO_APPLY:
                return False  # auto-apply policy means no approval needed

            case PolicyType.MERGE_GUARD:
                return run.resources_destroyed > 0

            case _:
                return False

    async def _get_enabled_policies(self, ws_id: uuid.UUID) -> list[Policy]:
        result = await self.db.execute(
            select(Policy)
            .where(
                Policy.workspace_id == ws_id,
                Policy.is_enabled.is_(True),
            )
            .order_by(Policy.priority)
        )
        return list(result.scalars().all())

    async def _get_workspace_id_for_run(self, run: InfrastructureRun) -> uuid.UUID:
        from deploypilot.models.project import Project
        result = await self.db.execute(
            select(Project.workspace_id).where(Project.id == run.project_id)
        )
        return result.scalar_one()

    async def create_policy(
        self,
        workspace_id: uuid.UUID,
        name: str,
        policy_type: PolicyType,
        rules: Optional[dict] = None,
        min_approvers: int = 1,
        description: Optional[str] = None,
    ) -> Policy:
        policy = Policy(
            workspace_id=workspace_id,
            name=name,
            policy_type=policy_type,
            rules=json.dumps(rules) if rules else None,
            min_approvers=min_approvers,
            description=description,
        )
        self.db.add(policy)
        await self.db.flush()
        return policy
