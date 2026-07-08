"""Test data factories using factory_boy."""
import factory
import factory.fuzzy
from uuid import uuid4
from datetime import datetime, timezone

from deploypilot.db.models.user import User, UserRole
from deploypilot.db.models.organization import Organization
from deploypilot.db.models.workspace import Workspace
from deploypilot.db.models.project import Project
from deploypilot.modules.security.service import hash_password


class UserFactory(factory.Factory):
    class Meta:
        model = User

    id = factory.LazyFunction(uuid4)
    email = factory.Sequence(lambda n: f"user_{n}@example.com")
    full_name = factory.Faker("name")
    hashed_password = factory.LazyAttribute(lambda _: hash_password("TestPassword123!"))
    role = UserRole.MEMBER
    is_active = True
    is_verified = True
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    updated_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))


class SuperAdminUserFactory(UserFactory):
    role = UserRole.SUPER_ADMIN
    email = factory.Sequence(lambda n: f"superadmin_{n}@example.com")


class OrganizationFactory(factory.Factory):
    class Meta:
        model = Organization

    id = factory.LazyFunction(uuid4)
    name = factory.Sequence(lambda n: f"Test Org {n}")
    slug = factory.Sequence(lambda n: f"test-org-{n}")
    is_active = True
    max_workspaces = 10
    max_members = 50
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    updated_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))


class WorkspaceFactory(factory.Factory):
    class Meta:
        model = Workspace

    id = factory.LazyFunction(uuid4)
    name = factory.Sequence(lambda n: f"Test Workspace {n}")
    slug = factory.Sequence(lambda n: f"test-workspace-{n}")
    organization_id = factory.LazyFunction(uuid4)
    is_active = True
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    updated_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))


class ProjectFactory(factory.Factory):
    class Meta:
        model = Project

    id = factory.LazyFunction(uuid4)
    name = factory.Sequence(lambda n: f"Test Project {n}")
    workspace_id = factory.LazyFunction(uuid4)
    repo_url = factory.Sequence(lambda n: f"https://github.com/example/project-{n}")
    repo_dir = "infrastructure/"
    default_branch = "main"
    is_active = True
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    updated_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
