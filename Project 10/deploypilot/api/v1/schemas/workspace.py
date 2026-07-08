from typing import Optional
from uuid import UUID
from pydantic import BaseModel


class CreateWorkspaceRequest(BaseModel):
    name: str
    description: Optional[str] = None
    cloud_provider: str = "aws"
    aws_region: Optional[str] = None
    terraform_version: str = "1.6.0"
    auto_apply: bool = False


class WorkspaceResponse(BaseModel):
    id: UUID
    organization_id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    cloud_provider: str
    aws_region: Optional[str] = None
    terraform_version: str
    auto_apply: bool
    is_locked: bool
    lock_reason: Optional[str] = None

    model_config = {"from_attributes": True}


class LockWorkspaceRequest(BaseModel):
    reason: str
