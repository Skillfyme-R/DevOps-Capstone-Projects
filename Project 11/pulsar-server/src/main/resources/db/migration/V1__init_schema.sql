-- pgcrypto provides gen_random_uuid(); IDs are also generated application-side via @PrePersist
-- as a belt-and-suspenders fallback for inserts that bypass the entity lifecycle (e.g. raw JDBC).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE workflow_definitions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    version         INTEGER NOT NULL,
    description     TEXT,
    tasks_json      JSONB NOT NULL,
    timeout_seconds BIGINT NOT NULL DEFAULT 0,
    owner_email     VARCHAR(255),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_workflow_definitions_name_version UNIQUE (name, version)
);

CREATE INDEX idx_workflow_definitions_name ON workflow_definitions (name);

CREATE TABLE task_definitions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    retry_count         INTEGER NOT NULL DEFAULT 0,
    retry_logic         VARCHAR(32) NOT NULL,
    retry_delay_seconds BIGINT NOT NULL DEFAULT 0,
    timeout_seconds     BIGINT NOT NULL DEFAULT 0,
    input_keys          TEXT,
    output_keys         TEXT,
    CONSTRAINT uq_task_definitions_name UNIQUE (name)
);

CREATE TABLE workflow_executions (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_definition_id      VARCHAR(255) NOT NULL,
    workflow_definition_version INTEGER NOT NULL,
    status                      VARCHAR(32) NOT NULL,
    input_json                  JSONB,
    output_json                 JSONB,
    start_time                  TIMESTAMPTZ,
    end_time                    TIMESTAMPTZ,
    correlation_id              VARCHAR(255),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workflow_executions_correlation_id ON workflow_executions (correlation_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions (status);

CREATE TABLE task_executions (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_execution_id  UUID NOT NULL,
    task_reference_name    VARCHAR(255) NOT NULL,
    task_type              VARCHAR(32) NOT NULL,
    status                 VARCHAR(32) NOT NULL,
    input_json             JSONB,
    output_json            JSONB,
    retry_count            INTEGER NOT NULL DEFAULT 0,
    scheduled_time         TIMESTAMPTZ,
    start_time             TIMESTAMPTZ,
    end_time               TIMESTAMPTZ,
    worker_id              VARCHAR(255),
    callback_after_seconds BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_task_executions_workflow_execution_id ON task_executions (workflow_execution_id);
CREATE INDEX idx_task_executions_status ON task_executions (status);
CREATE INDEX idx_task_executions_wfid_status ON task_executions (workflow_execution_id, status);

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username      VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(32) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_users_username UNIQUE (username)
);

CREATE TABLE api_keys (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_hash   VARCHAR(128) NOT NULL,
    name       VARCHAR(255) NOT NULL,
    active     BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_api_keys_key_hash UNIQUE (key_hash)
);
