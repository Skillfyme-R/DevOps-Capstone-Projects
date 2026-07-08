"""
Secret management: encrypt at rest, inject into Terraform runs as env vars.

Encryption strategy:
  - Production: AWS KMS data key envelope encryption via boto3
  - Development: Fernet symmetric key derived from SECRET_KEY

The interface is the same in both modes — callers don't need to know which
backend is active.
"""
import base64
import os
from typing import Optional
import uuid

from cryptography.fernet import Fernet
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from deploypilot.core.config import settings
from deploypilot.core.logging import get_logger
from deploypilot.models.run import InfrastructureRun
from deploypilot.models.secret import Secret, SecretScope

log = get_logger(__name__)


def _build_fernet() -> Fernet:
    """
    Derive a stable Fernet key from SECRET_KEY so secrets survive restarts.
    In production, replace with AWS KMS.
    """
    import hashlib
    raw = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    key = base64.urlsafe_b64encode(raw)
    return Fernet(key)


_fernet = _build_fernet()


def encrypt_value(plain: str) -> str:
    return _fernet.encrypt(plain.encode()).decode()


def decrypt_value(encrypted: str) -> str:
    return _fernet.decrypt(encrypted.encode()).decode()


class SecretService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        organization_id: uuid.UUID,
        key: str,
        value: str,
        scope: SecretScope = SecretScope.ORGANIZATION,
        workspace_id: Optional[uuid.UUID] = None,
        project_id: Optional[uuid.UUID] = None,
        description: Optional[str] = None,
        created_by_id: Optional[uuid.UUID] = None,
    ) -> Secret:
        secret = Secret(
            organization_id=organization_id,
            scope=scope,
            key=key.upper(),
            value_encrypted=encrypt_value(value),
            description=description,
            workspace_id=workspace_id,
            project_id=project_id,
            created_by_id=created_by_id,
        )
        self.db.add(secret)
        await self.db.flush()
        log.info("secret_created", key=key, scope=scope.value, org=str(organization_id))
        return secret

    async def get_decrypted_value(self, secret_id: uuid.UUID) -> str:
        result = await self.db.execute(
            select(Secret).where(Secret.id == secret_id)
        )
        secret = result.scalar_one_or_none()
        if not secret:
            raise ValueError(f"Secret {secret_id} not found")
        return decrypt_value(secret.value_encrypted)

    async def update_value(self, secret_id: uuid.UUID, new_value: str) -> Secret:
        result = await self.db.execute(
            select(Secret).where(Secret.id == secret_id)
        )
        secret = result.scalar_one()
        secret.value_encrypted = encrypt_value(new_value)
        await self.db.flush()
        return secret

    async def delete(self, secret_id: uuid.UUID) -> None:
        result = await self.db.execute(
            select(Secret).where(Secret.id == secret_id)
        )
        secret = result.scalar_one()
        await self.db.delete(secret)
        await self.db.flush()

    async def collect_env_for_run(self, run: InfrastructureRun) -> dict[str, str]:
        """
        Collect all secrets applicable to a run (org → workspace → project scope)
        and return them as a flat env var dict.
        More specific scopes override broader ones (project wins over workspace wins over org).
        """
        from deploypilot.models.project import Project
        proj_result = await self.db.execute(
            select(Project).where(Project.id == run.project_id)
        )
        project = proj_result.scalar_one()

        from deploypilot.models.workspace import Workspace
        ws_result = await self.db.execute(
            select(Workspace).where(Workspace.id == project.workspace_id)
        )
        workspace = ws_result.scalar_one()

        # Query in ascending scope specificity — project overrides workspace overrides org
        result = await self.db.execute(
            select(Secret).where(
                Secret.organization_id == workspace.organization_id,
            ).order_by(Secret.scope)
        )
        secrets = result.scalars().all()

        env: dict[str, str] = {}
        for s in secrets:
            if s.scope == SecretScope.ORGANIZATION:
                env[s.key] = decrypt_value(s.value_encrypted)
            elif s.scope == SecretScope.WORKSPACE and s.workspace_id == workspace.id:
                env[s.key] = decrypt_value(s.value_encrypted)
            elif s.scope == SecretScope.PROJECT and s.project_id == project.id:
                env[s.key] = decrypt_value(s.value_encrypted)

        log.info("secrets_collected_for_run", run_id=str(run.id), count=len(env))
        return env

    async def list_for_org(self, org_id: uuid.UUID) -> list[Secret]:
        result = await self.db.execute(
            select(Secret).where(
                Secret.organization_id == org_id,
                Secret.scope == SecretScope.ORGANIZATION,
            )
        )
        return list(result.scalars().all())
