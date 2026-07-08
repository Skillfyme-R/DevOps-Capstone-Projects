"""Secret service — encrypted key-value storage with scope resolution."""

import base64
import hashlib
import uuid
from typing import Dict, List, Optional

from cryptography.fernet import Fernet
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from deploypilot.common.exceptions.http import NotFoundError
from deploypilot.core.config import settings
from deploypilot.models.secret import Secret, SecretScope
from deploypilot.models.user import User


def _get_fernet() -> Fernet:
    """Derive a Fernet key from the application SECRET_KEY."""
    raw_key = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    fernet_key = base64.urlsafe_b64encode(raw_key)
    return Fernet(fernet_key)


class SecretService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._fernet = _get_fernet()

    def _encrypt(self, value: str) -> str:
        return self._fernet.encrypt(value.encode()).decode()

    def _decrypt(self, value_encrypted: str) -> str:
        return self._fernet.decrypt(value_encrypted.encode()).decode()

    async def create(
        self,
        organization_id: uuid.UUID,
        scope: SecretScope,
        key: str,
        value: str,
        created_by: User,
        workspace_id: Optional[uuid.UUID] = None,
        project_id: Optional[uuid.UUID] = None,
        description: Optional[str] = None,
        is_sensitive: bool = True,
    ) -> Secret:
        """Create and persist an encrypted secret."""
        secret = Secret(
            organization_id=organization_id,
            workspace_id=workspace_id,
            project_id=project_id,
            scope=scope,
            key=key,
            value_encrypted=self._encrypt(value),
            description=description,
            is_sensitive=is_sensitive,
            created_by_id=created_by.id,
        )
        self.db.add(secret)
        await self.db.flush()
        await self.db.refresh(secret)
        return secret

    async def get_decrypted_value(self, secret_id: uuid.UUID) -> str:
        """Return the plaintext value for a secret."""
        secret = await self.db.get(Secret, secret_id)
        if not secret:
            raise NotFoundError("Secret not found")
        return self._decrypt(secret.value_encrypted)

    async def update_value(self, secret_id: uuid.UUID, new_value: str) -> Secret:
        """Re-encrypt and store a new value."""
        secret = await self.db.get(Secret, secret_id)
        if not secret:
            raise NotFoundError("Secret not found")
        secret.value_encrypted = self._encrypt(new_value)
        await self.db.flush()
        await self.db.refresh(secret)
        return secret

    async def delete(self, secret_id: uuid.UUID) -> None:
        """Delete a secret."""
        secret = await self.db.get(Secret, secret_id)
        if not secret:
            raise NotFoundError("Secret not found")
        await self.db.delete(secret)
        await self.db.flush()

    async def collect_env_for_run(
        self,
        organization_id: uuid.UUID,
        workspace_id: Optional[uuid.UUID] = None,
        project_id: Optional[uuid.UUID] = None,
    ) -> Dict[str, str]:
        """
        Resolve secrets with scope precedence: project > workspace > organization.

        Returns a flat dict suitable for injecting into subprocess environment.
        """
        env: Dict[str, str] = {}

        # org-scoped (lowest priority)
        org_secrets = await self._fetch_secrets(
            organization_id=organization_id,
            scope=SecretScope.ORGANIZATION,
        )
        for s in org_secrets:
            env[s.key] = self._decrypt(s.value_encrypted)

        # workspace-scoped
        if workspace_id:
            ws_secrets = await self._fetch_secrets(
                organization_id=organization_id,
                scope=SecretScope.WORKSPACE,
                workspace_id=workspace_id,
            )
            for s in ws_secrets:
                env[s.key] = self._decrypt(s.value_encrypted)

        # project-scoped (highest priority)
        if project_id:
            proj_secrets = await self._fetch_secrets(
                organization_id=organization_id,
                scope=SecretScope.PROJECT,
                project_id=project_id,
            )
            for s in proj_secrets:
                env[s.key] = self._decrypt(s.value_encrypted)

        return env

    async def _fetch_secrets(
        self,
        organization_id: uuid.UUID,
        scope: SecretScope,
        workspace_id: Optional[uuid.UUID] = None,
        project_id: Optional[uuid.UUID] = None,
    ) -> List[Secret]:
        stmt = select(Secret).where(
            Secret.organization_id == organization_id,
            Secret.scope == scope,
        )
        if workspace_id:
            stmt = stmt.where(Secret.workspace_id == workspace_id)
        if project_id:
            stmt = stmt.where(Secret.project_id == project_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
