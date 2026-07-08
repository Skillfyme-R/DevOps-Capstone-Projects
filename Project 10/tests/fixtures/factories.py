"""
Test data factories using factory_boy.
"""
import uuid
import factory
from factory import fuzzy

from deploypilot.models.user import User, UserRole
from deploypilot.models.organization import Organization
from deploypilot.models.workspace import Workspace
from deploypilot.models.project import Project
from deploypilot.models.run import InfrastructureRun, RunStatus, RunTrigger
from deploypilot.core.security import hash_password


class UserFactory(factory.Factory):
    class Meta:
        model = User

    id = factory.LazyFunction(uuid.uuid4)
    email = factory.Sequence(lambda n: f"user{n}@example.com")
    username = factory.Sequence(lambda n: f"user{n}")
    display_name = factory.Faker("name")
    hashed_password = factory.LazyFunction(lambda: hash_password("Password1!"))
    role = UserRole.MEMBER
    is_active = True
    is_email_verified = True


class OrganizationFactory(factory.Factory):
    class Meta:
        model = Organization

    id = factory.LazyFunction(uuid.uuid4)
    name = factory.Faker("company")
    slug = factory.Sequence(lambda n: f"org-{n}")
    plan = "pro"
    max_workspaces = 10
    max_members = 50
    is_active = True
    owner_id = factory.LazyFunction(uuid.uuid4)


class WorkspaceFactory(factory.Factory):
    class Meta:
        model = Workspace

    id = factory.LazyFunction(uuid.uuid4)
    organization_id = factory.LazyFunction(uuid.uuid4)
    name = factory.Sequence(lambda n: f"workspace-{n}")
    slug = factory.Sequence(lambda n: f"workspace-{n}")
    cloud_provider = "aws"
    terraform_version = "1.6.4"
    auto_apply = False
    is_locked = False


class ProjectFactory(factory.Factory):
    class Meta:
        model = Project

    id = factory.LazyFunction(uuid.uuid4)
    workspace_id = factory.LazyFunction(uuid.uuid4)
    name = factory.Sequence(lambda n: f"project-{n}")
    slug = factory.Sequence(lambda n: f"project-{n}")
    repo_url = "https://github.com/example/terraform-repo"
    repo_branch = "main"
    repo_dir = "."
    is_active = True


class RunFactory(factory.Factory):
    class Meta:
        model = InfrastructureRun

    id = factory.LazyFunction(uuid.uuid4)
    project_id = factory.LazyFunction(uuid.uuid4)
    status = RunStatus.PENDING
    trigger = RunTrigger.MANUAL
    resources_added = 0
    resources_changed = 0
    resources_destroyed = 0
