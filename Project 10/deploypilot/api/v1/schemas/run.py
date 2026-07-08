"""Infrastructure run request and response schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class ProjectCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    repo_url: Optional[str] = None
    repo_branch: str = "main"
    repo_dir: str = "."
    vcs_provider: str = "github"


class ProjectResponse(BaseModel):
    id: UUID
    workspace_id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    repo_url: Optional[str] = None
    repo_branch: str
    repo_dir: str
    vcs_provider: str
    terraform_version: Optional[str] = None
    is_active: bool

    model_config = {"from_attributes": True}


class CreateRunRequest(BaseModel):
    commit_sha: Optional[str] = None
    branch: Optional[str] = None


class RunResponse(BaseModel):
    id: UUID
    project_id: UUID
    status: str
    trigger: str
    commit_sha: Optional[str] = None
    branch: Optional[str] = None
    pr_number: Optional[int] = None
    resources_added: int
    resources_changed: int
    resources_destroyed: int
    plan_output: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ApproveRunRequest(BaseModel):
    comment: Optional[str] = None


class RejectRunRequest(BaseModel):
    comment: str
