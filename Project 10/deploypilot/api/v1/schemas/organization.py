from typing import Optional
from uuid import UUID
from pydantic import BaseModel


class CreateOrgRequest(BaseModel):
    name: str
    description: Optional[str] = None
    website: Optional[str] = None


class UpdateOrgRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None


class OrgResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    description: Optional[str] = None
    website: Optional[str] = None
    plan: str
    max_workspaces: int
    max_members: int
    is_active: bool

    model_config = {"from_attributes": True}
