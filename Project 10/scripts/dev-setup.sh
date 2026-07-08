#!/usr/bin/env bash
# Bootstrap the local development environment.
# Run once after cloning the repository.
set -euo pipefail

echo "▶ DeployPilot — Local Development Setup"

# 1. Python environment
echo "── Setting up Python virtualenv"
python3.12 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements-dev.txt

# 2. Environment file
if [[ ! -f .env ]]; then
  echo "── Creating .env from .env.example"
  cp .env.example .env
  echo "   ⚠  Edit .env and fill in your values"
fi

# 3. Start Docker services
echo "── Starting Docker services (postgres + redis)"
docker compose up -d postgres redis

echo "── Waiting for Postgres to be ready..."
until docker compose exec -T postgres pg_isready -U deploypilot > /dev/null 2>&1; do
  sleep 1
done

# 4. Database migrations
echo "── Running Alembic migrations"
alembic upgrade head

echo "✅ Setup complete!"
echo ""
echo "   Start API:    uvicorn deploypilot.main:app --reload"
echo "   Start worker: celery -A deploypilot.workers.celery_app worker --loglevel=info"
echo "   Run tests:    pytest tests/unit/"
echo "   API docs:     http://localhost:8000/docs"
