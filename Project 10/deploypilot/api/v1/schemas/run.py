from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel


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
