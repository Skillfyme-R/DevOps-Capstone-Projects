"""Initial schema — all tables and enums.

Revision ID: 001
Revises: None
Create Date: 2024-01-01 00:00:00
"""

from alembic import op
import sqlalchemy as sa

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------------ enums
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
                CREATE TYPE user_role_enum AS ENUM (
                    'super_admin', 'org_owner', 'org_admin', 'member', 'viewer'
                );
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_role_enum') THEN
                CREATE TYPE team_role_enum AS ENUM (
                    'owner', 'admin', 'maintainer', 'contributor', 'viewer'
                );
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'run_status_enum') THEN
                CREATE TYPE run_status_enum AS ENUM (
                    'pending', 'queued', 'planning', 'plan_complete',
                    'awaiting_approval', 'approved', 'applying', 'applied',
                    'destroying', 'destroyed', 'failed', 'cancelled', 'discarded'
                );
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'run_trigger_enum') THEN
                CREATE TYPE run_trigger_enum AS ENUM (
                    'manual', 'vcs_push', 'pull_request', 'schedule', 'api'
                );
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'policy_type_enum') THEN
                CREATE TYPE policy_type_enum AS ENUM (
                    'require_approval', 'cost_threshold', 'resource_block',
                    'auto_apply', 'merge_guard'
                );
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status_enum') THEN
                CREATE TYPE approval_status_enum AS ENUM (
                    'pending', 'approved', 'rejected', 'expired'
                );
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_channel_enum') THEN
                CREATE TYPE notification_channel_enum AS ENUM (
                    'email', 'slack', 'webhook', 'in_app'
                );
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integration_type_enum') THEN
                CREATE TYPE integration_type_enum AS ENUM (
                    'github', 'gitlab', 'bitbucket', 'slack',
                    'pagerduty', 'jira', 'datadog'
                );
            END IF;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'secret_scope_enum') THEN
                CREATE TYPE secret_scope_enum AS ENUM (
                    'organization', 'workspace', 'project'
                );
            END IF;
        END $$;
    """)

    # ----------------------------------------------------------------- tables
    op.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) NOT NULL UNIQUE,
            username VARCHAR(100) NOT NULL UNIQUE,
            display_name VARCHAR(200) NOT NULL,
            hashed_password VARCHAR(255),
            avatar_url VARCHAR(500),
            role user_role_enum NOT NULL DEFAULT 'member',
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
            mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
            mfa_secret VARCHAR(64),
            github_user_id VARCHAR(100),
            github_username VARCHAR(100),
            github_access_token VARCHAR(500),
            deleted_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS api_keys (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR(200) NOT NULL,
            key_hash VARCHAR(64) NOT NULL UNIQUE,
            key_prefix VARCHAR(10) NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            last_used_at TIMESTAMPTZ,
            expires_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS organizations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(200) NOT NULL,
            slug VARCHAR(100) NOT NULL UNIQUE,
            description TEXT,
            logo_url VARCHAR(500),
            website VARCHAR(300),
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            plan VARCHAR(50) NOT NULL DEFAULT 'free',
            max_workspaces INTEGER NOT NULL DEFAULT 3,
            max_members INTEGER NOT NULL DEFAULT 5,
            owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
            deleted_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS teams (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            name VARCHAR(200) NOT NULL,
            slug VARCHAR(100) NOT NULL,
            description TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (organization_id, slug)
        );
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS team_memberships (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            role team_role_enum NOT NULL DEFAULT 'contributor',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE (team_id, user_id)
        );
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS workspaces (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            name VARCHAR(200) NOT NULL,
            slug VARCHAR(100) NOT NULL,
            description TEXT,
            cloud_provider VARCHAR(30) NOT NULL DEFAULT 'aws',
            aws_region VARCHAR(30),
            aws_account_id VARCHAR(20),
            terraform_version VARCHAR(20) NOT NULL DEFAULT '1.6.0',
            auto_apply BOOLEAN NOT NULL DEFAULT FALSE,
            is_locked BOOLEAN NOT NULL DEFAULT FALSE,
            lock_reason TEXT,
            state_backend VARCHAR(30) NOT NULL DEFAULT 's3',
            state_config TEXT,
            deleted_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
            name VARCHAR(200) NOT NULL,
            slug VARCHAR(100) NOT NULL,
            description TEXT,
            repo_url VARCHAR(500),
            repo_branch VARCHAR(200) NOT NULL DEFAULT 'main',
            repo_dir VARCHAR(300) NOT NULL DEFAULT '.',
            vcs_provider VARCHAR(30) NOT NULL DEFAULT 'github',
            installation_id VARCHAR(100),
            terraform_version VARCHAR(20),
            var_file VARCHAR(300),
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            deleted_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS infrastructure_runs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            triggered_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
            status run_status_enum NOT NULL DEFAULT 'pending',
            trigger run_trigger_enum NOT NULL DEFAULT 'manual',
            commit_sha VARCHAR(40),
            branch VARCHAR(200),
            pr_number INTEGER,
            pr_url VARCHAR(500),
            plan_output TEXT,
            apply_output TEXT,
            error_message TEXT,
            resources_added INTEGER NOT NULL DEFAULT 0,
            resources_changed INTEGER NOT NULL DEFAULT 0,
            resources_destroyed INTEGER NOT NULL DEFAULT 0,
            completed_at TIMESTAMPTZ,
            plan_file_url VARCHAR(500),
            log_url VARCHAR(500),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS policies (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
            name VARCHAR(200) NOT NULL,
            description TEXT,
            policy_type policy_type_enum NOT NULL,
            is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
            priority INTEGER NOT NULL DEFAULT 100,
            rules TEXT,
            min_approvers INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS approval_requests (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            run_id UUID NOT NULL REFERENCES infrastructure_runs(id) ON DELETE CASCADE,
            policy_id UUID REFERENCES policies(id) ON DELETE SET NULL,
            requested_by_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
            reviewed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
            status approval_status_enum NOT NULL DEFAULT 'pending',
            comment TEXT,
            expires_at TIMESTAMPTZ,
            reviewed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
            actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
            action VARCHAR(100) NOT NULL,
            resource_type VARCHAR(100) NOT NULL,
            resource_id VARCHAR(100),
            before_state TEXT,
            after_state TEXT,
            ip_address VARCHAR(45),
            user_agent VARCHAR(500),
            request_id VARCHAR(100),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
            channel notification_channel_enum NOT NULL,
            event VARCHAR(100) NOT NULL,
            title VARCHAR(300) NOT NULL,
            body TEXT NOT NULL,
            is_read BOOLEAN NOT NULL DEFAULT FALSE,
            is_sent BOOLEAN NOT NULL DEFAULT FALSE,
            metadata_json TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS integrations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            integration_type integration_type_enum NOT NULL,
            name VARCHAR(200) NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            credentials_encrypted TEXT,
            config_json TEXT,
            last_synced_at TIMESTAMPTZ,
            last_error TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)

    op.execute("""
        CREATE TABLE IF NOT EXISTS secrets (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
            project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
            scope secret_scope_enum NOT NULL,
            key VARCHAR(200) NOT NULL,
            value_encrypted TEXT NOT NULL,
            description VARCHAR(500),
            is_sensitive BOOLEAN NOT NULL DEFAULT TRUE,
            created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)

    # ---------------------------------------------------------------- indexes
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_email ON users (email);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_username ON users (username);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_users_github_user_id ON users (github_user_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_organizations_slug ON organizations (slug);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_workspaces_slug ON workspaces (slug);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_projects_slug ON projects (slug);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_infrastructure_runs_project_id ON infrastructure_runs (project_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_infrastructure_runs_status ON infrastructure_runs (status);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_audit_logs_organization_id ON audit_logs (organization_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_audit_logs_actor_id ON audit_logs (actor_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_audit_logs_action ON audit_logs (action);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_audit_logs_resource_type ON audit_logs (resource_type);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_approval_requests_run_id ON approval_requests (run_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_approval_requests_status ON approval_requests (status);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications (user_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_policies_workspace_id ON policies (workspace_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_integrations_organization_id ON integrations (organization_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_secrets_organization_id ON secrets (organization_id);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_secrets_key ON secrets (key);")


def downgrade() -> None:
    # Drop tables in reverse dependency order
    for table in [
        "secrets",
        "integrations",
        "notifications",
        "audit_logs",
        "approval_requests",
        "policies",
        "infrastructure_runs",
        "projects",
        "workspaces",
        "team_memberships",
        "teams",
        "organizations",
        "api_keys",
        "users",
    ]:
        op.execute(f"DROP TABLE IF EXISTS {table} CASCADE;")

    # Drop enums
    for enum in [
        "secret_scope_enum",
        "integration_type_enum",
        "notification_channel_enum",
        "approval_status_enum",
        "policy_type_enum",
        "run_trigger_enum",
        "run_status_enum",
        "team_role_enum",
        "user_role_enum",
    ]:
        op.execute(f"DROP TYPE IF EXISTS {enum};")
