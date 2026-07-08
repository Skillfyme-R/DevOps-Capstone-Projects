"""
Migration 001: Initial schema — all core tables.
Uses raw SQL with IF NOT EXISTS so re-runs are safe.
"""
from alembic import op
import sqlalchemy as sa

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # ── Enums — PostgreSQL has no CREATE TYPE IF NOT EXISTS, so we check pg_type ──
    enums = {
        "user_role_enum":            "('super_admin','org_owner','org_admin','member','viewer')",
        "team_role_enum":            "('owner','admin','maintainer','contributor','viewer')",
        "run_status_enum":           "('pending','queued','planning','plan_complete','awaiting_approval','approved','applying','applied','destroying','destroyed','failed','cancelled','discarded')",
        "run_trigger_enum":          "('manual','vcs_push','pull_request','schedule','api')",
        "policy_type_enum":          "('require_approval','cost_threshold','resource_block','auto_apply','merge_guard')",
        "approval_status_enum":      "('pending','approved','rejected','expired')",
        "notification_channel_enum": "('email','slack','webhook','in_app')",
        "integration_type_enum":     "('github','gitlab','bitbucket','slack','pagerduty','jira','datadog')",
        "secret_scope_enum":         "('organization','workspace','project')",
    }
    for name, values in enums.items():
        conn.execute(sa.text(
            f"DO $$ BEGIN "
            f"  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '{name}') THEN "
            f"    CREATE TYPE {name} AS ENUM {values}; "
            f"  END IF; "
            f"END $$;"
        ))

    # ── Tables ────────────────────────────────────────────────────────────────
    conn.execute(sa.text("""
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
            email_verified_at TIMESTAMPTZ,
            last_login_at TIMESTAMPTZ,
            mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
            mfa_secret VARCHAR(64),
            github_user_id VARCHAR(100),
            github_username VARCHAR(100),
            github_access_token TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMPTZ
        )
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_users_email ON users(email)"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_users_username ON users(username)"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_users_github_user_id ON users(github_user_id)"))

    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS api_keys (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR(200) NOT NULL,
            key_hash VARCHAR(64) NOT NULL UNIQUE,
            key_prefix VARCHAR(10) NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            expires_at TIMESTAMPTZ,
            last_used_at TIMESTAMPTZ,
            scopes TEXT NOT NULL DEFAULT 'read:all',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """))

    conn.execute(sa.text("""
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
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMPTZ
        )
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_organizations_slug ON organizations(slug)"))

    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS teams (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
            name VARCHAR(200) NOT NULL,
            slug VARCHAR(100) NOT NULL,
            description TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(organization_id, slug)
        )
    """))

    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS team_memberships (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            role team_role_enum NOT NULL DEFAULT 'contributor',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            UNIQUE(team_id, user_id)
        )
    """))

    conn.execute(sa.text("""
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
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMPTZ
        )
    """))

    conn.execute(sa.text("""
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
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            deleted_at TIMESTAMPTZ
        )
    """))

    conn.execute(sa.text("""
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
            queued_at TIMESTAMPTZ,
            started_at TIMESTAMPTZ,
            plan_completed_at TIMESTAMPTZ,
            apply_started_at TIMESTAMPTZ,
            completed_at TIMESTAMPTZ,
            plan_file_url VARCHAR(500),
            log_url VARCHAR(500),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_runs_project_id ON infrastructure_runs(project_id)"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_runs_status ON infrastructure_runs(status)"))

    conn.execute(sa.text("""
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
        )
    """))

    conn.execute(sa.text("""
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
        )
    """))

    conn.execute(sa.text("""
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
        )
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_audit_action ON audit_logs(action)"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_audit_resource_type ON audit_logs(resource_type)"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_audit_org ON audit_logs(organization_id)"))

    conn.execute(sa.text("""
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
        )
    """))

    conn.execute(sa.text("""
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
        )
    """))

    conn.execute(sa.text("""
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
        )
    """))


def downgrade() -> None:
    conn = op.get_bind()
    for table in [
        "secrets", "integrations", "notifications", "audit_logs",
        "approval_requests", "policies", "infrastructure_runs",
        "projects", "workspaces", "team_memberships", "teams",
        "organizations", "api_keys", "users",
    ]:
        conn.execute(sa.text(f"DROP TABLE IF EXISTS {table} CASCADE"))

    for enum in [
        "user_role_enum", "team_role_enum", "run_status_enum", "run_trigger_enum",
        "policy_type_enum", "approval_status_enum", "notification_channel_enum",
        "integration_type_enum", "secret_scope_enum",
    ]:
        conn.execute(sa.text(f"DROP TYPE IF EXISTS {enum}"))
