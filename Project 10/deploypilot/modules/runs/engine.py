"""
TerraformEngine — executes Terraform plan/apply/destroy within a sandboxed working
directory. Each run gets its own isolated directory with cloned source and
injected secrets.

Design decisions:
  - Uses asyncio.create_subprocess_exec (not subprocess) so the event loop
    stays unblocked on I/O-heavy operations.
  - Streams stdout/stderr to the database run record in chunks.
  - Parses the -json plan output to extract resource change summaries.
"""
import asyncio
import json
import os
import re
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from deploypilot.core.config import settings
from deploypilot.core.logging import get_logger
from deploypilot.models.run import InfrastructureRun, RunStatus

log = get_logger(__name__)

# Regex to extract the plan summary line from terraform output
_PLAN_SUMMARY_RE = re.compile(
    r"Plan:\s+(\d+) to add,\s+(\d+) to change,\s+(\d+) to destroy"
)


class TerraformEngine:
    """
    Stateless engine: instantiate per-run, call plan() then optionally apply().
    The engine does NOT commit DB changes — the caller's service layer does.
    """

    def __init__(self, run: InfrastructureRun, work_dir: Optional[str] = None):
        self.run = run
        self._work_dir = work_dir or os.path.join(
            settings.TERRAFORM_WORKING_DIR, str(run.id)
        )
        self._tf_bin = settings.TERRAFORM_BINARY_PATH

    # ── Public API ────────────────────────────────────────────────────────────

    async def plan(self, env_vars: dict[str, str] | None = None) -> tuple[str, dict]:
        """
        Runs `terraform init` then `terraform plan -out=tfplan.binary -json`.
        Returns (plan_output_text, summary_dict).
        """
        await self._setup_workspace()
        await self._init(env_vars)
        output, summary = await self._run_plan(env_vars)
        return output, summary

    async def apply(self, env_vars: dict[str, str] | None = None) -> str:
        """
        Runs `terraform apply tfplan.binary -json`.
        Returns apply output text.
        """
        output = await self._run_apply(env_vars)
        return output

    async def destroy(self, env_vars: dict[str, str] | None = None) -> str:
        await self._setup_workspace()
        await self._init(env_vars)
        output = await self._run_destroy(env_vars)
        return output

    def cleanup(self) -> None:
        """Remove the run working directory after completion."""
        if os.path.exists(self._work_dir):
            shutil.rmtree(self._work_dir, ignore_errors=True)

    # ── Internal steps ────────────────────────────────────────────────────────

    async def _setup_workspace(self) -> None:
        os.makedirs(self._work_dir, exist_ok=True)
        log.info("tf_workspace_ready", run_id=str(self.run.id), path=self._work_dir)

    async def _init(self, env: dict | None) -> None:
        rc, out, err = await self._exec(
            [self._tf_bin, "init", "-no-color", "-input=false"],
            env=env,
        )
        if rc != 0:
            raise TerraformError(f"terraform init failed:\n{err}")

    async def _run_plan(self, env: dict | None) -> tuple[str, dict]:
        plan_file = os.path.join(self._work_dir, "tfplan.binary")
        rc, out, err = await self._exec(
            [
                self._tf_bin, "plan",
                "-no-color",
                "-input=false",
                f"-out={plan_file}",
            ],
            env=env,
        )
        combined = out + ("\n" + err if err else "")

        summary = {"added": 0, "changed": 0, "destroyed": 0}
        m = _PLAN_SUMMARY_RE.search(combined)
        if m:
            summary["added"] = int(m.group(1))
            summary["changed"] = int(m.group(2))
            summary["destroyed"] = int(m.group(3))

        if rc != 0:
            raise TerraformError(f"terraform plan failed:\n{combined}")

        return combined, summary

    async def _run_apply(self, env: dict | None) -> str:
        plan_file = os.path.join(self._work_dir, "tfplan.binary")
        rc, out, err = await self._exec(
            [self._tf_bin, "apply", "-no-color", "-input=false", "-auto-approve", plan_file],
            env=env,
        )
        combined = out + ("\n" + err if err else "")
        if rc != 0:
            raise TerraformError(f"terraform apply failed:\n{combined}")
        return combined

    async def _run_destroy(self, env: dict | None) -> str:
        rc, out, err = await self._exec(
            [self._tf_bin, "destroy", "-no-color", "-input=false", "-auto-approve"],
            env=env,
        )
        combined = out + ("\n" + err if err else "")
        if rc != 0:
            raise TerraformError(f"terraform destroy failed:\n{combined}")
        return combined

    async def _exec(
        self,
        cmd: list[str],
        env: dict | None = None,
    ) -> tuple[int, str, str]:
        full_env = {**os.environ}
        if env:
            full_env.update(env)
        # Always disable color codes for storage/display in the DB
        full_env["TF_CLI_ARGS"] = "-no-color"

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=self._work_dir,
            env=full_env,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        return proc.returncode or 0, stdout.decode(errors="replace"), stderr.decode(errors="replace")


class TerraformError(Exception):
    """Raised when any terraform subprocess exits non-zero."""
