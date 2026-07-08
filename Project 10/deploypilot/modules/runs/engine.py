"""Terraform execution engine — wraps the terraform binary via subprocess."""

import asyncio
import os
import re
import shutil
import tempfile
from typing import Optional

from deploypilot.core.config import settings
from deploypilot.core.logging import get_logger
from deploypilot.models.run import InfrastructureRun

log = get_logger(__name__)


class TerraformError(Exception):
    """Raised when a Terraform command exits with a non-zero status."""

    def __init__(self, message: str, returncode: int = -1, stderr: str = "") -> None:
        super().__init__(message)
        self.returncode = returncode
        self.stderr = stderr


class TerraformEngine:
    """
    Executes Terraform plan/apply/destroy for a single infrastructure run.

    A temporary working directory is created per run so that concurrent runs
    do not interfere with each other.
    """

    def __init__(
        self,
        run: InfrastructureRun,
        work_dir: Optional[str] = None,
    ) -> None:
        self.run = run
        os.makedirs(settings.TERRAFORM_WORKING_DIR, exist_ok=True)
        self.work_dir = work_dir or tempfile.mkdtemp(
            dir=settings.TERRAFORM_WORKING_DIR,
            prefix=f"run-{str(run.id)[:8]}-",
        )
        self._tf = settings.TERRAFORM_BINARY_PATH

    # ----------------------------------------------------------------- public

    async def plan(self, env_vars: dict) -> tuple[str, dict]:
        """
        Run `terraform init` then `terraform plan`.

        Returns (plan_output_text, summary_dict) where summary_dict has keys
        ``added``, ``changed``, ``destroyed``.
        """
        os.makedirs(self.work_dir, exist_ok=True)

        # init
        rc, stdout, stderr = await self._exec([self._tf, "init", "-input=false", "-no-color"], env_vars)
        if rc != 0:
            raise TerraformError(f"terraform init failed: {stderr}", rc, stderr)

        log.info("terraform_init_ok", run_id=str(self.run.id))

        # plan
        plan_file = os.path.join(self.work_dir, "tfplan.binary")
        rc, stdout, stderr = await self._exec(
            [self._tf, "plan", "-input=false", "-no-color", f"-out={plan_file}"],
            env_vars,
        )
        if rc != 0:
            raise TerraformError(f"terraform plan failed: {stderr}", rc, stderr)

        summary = self._parse_plan_summary(stdout)
        log.info("terraform_plan_ok", run_id=str(self.run.id), summary=summary)
        return stdout, summary

    async def apply(self, env_vars: dict) -> str:
        """
        Run `terraform apply` on the previously generated plan file.

        Returns the apply output text.
        """
        plan_file = os.path.join(self.work_dir, "tfplan.binary")
        rc, stdout, stderr = await self._exec(
            [self._tf, "apply", "-input=false", "-no-color", "-auto-approve", plan_file],
            env_vars,
        )
        if rc != 0:
            raise TerraformError(f"terraform apply failed: {stderr}", rc, stderr)

        log.info("terraform_apply_ok", run_id=str(self.run.id))
        return stdout

    async def destroy(self, env_vars: dict) -> str:
        """Run `terraform destroy`."""
        rc, stdout, stderr = await self._exec(
            [self._tf, "destroy", "-input=false", "-no-color", "-auto-approve"],
            env_vars,
        )
        if rc != 0:
            raise TerraformError(f"terraform destroy failed: {stderr}", rc, stderr)

        log.info("terraform_destroy_ok", run_id=str(self.run.id))
        return stdout

    def cleanup(self) -> None:
        """Remove the temporary working directory."""
        if os.path.isdir(self.work_dir):
            shutil.rmtree(self.work_dir, ignore_errors=True)

    # ---------------------------------------------------------------- private

    async def _exec(
        self,
        cmd: list[str],
        env: dict,
    ) -> tuple[int, str, str]:
        """Run an external command asynchronously and return (returncode, stdout, stderr)."""
        merged_env = {**os.environ, **env}
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=self.work_dir,
            env=merged_env,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout_b, stderr_b = await proc.communicate()
        return (
            proc.returncode or 0,
            stdout_b.decode("utf-8", errors="replace"),
            stderr_b.decode("utf-8", errors="replace"),
        )

    @staticmethod
    def _parse_plan_summary(output: str) -> dict:
        """Extract resource change counts from `terraform plan` output."""
        pattern = r"Plan:\s+(\d+)\s+to\s+add,\s+(\d+)\s+to\s+change,\s+(\d+)\s+to\s+destroy"
        match = re.search(pattern, output)
        if match:
            return {
                "added": int(match.group(1)),
                "changed": int(match.group(2)),
                "destroyed": int(match.group(3)),
            }
        return {"added": 0, "changed": 0, "destroyed": 0}
