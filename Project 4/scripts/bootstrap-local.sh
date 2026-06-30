#!/usr/bin/env bash
# ShieldGrid local bootstrap — runs migrations and creates seed data
set -euo pipefail

COMPOSE_CMD="docker compose"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Waiting for database to be ready..."
$COMPOSE_CMD exec -T postgres pg_isready -U shieldgrid -d shieldgrid

echo "==> Running Alembic migrations..."
$COMPOSE_CMD exec -T api alembic upgrade head

echo "==> Bootstrap complete. Access the dashboard at http://localhost:3000"
echo "    Register your account at http://localhost:8000/docs#/Authentication/register_api_v1_auth_register_post"
