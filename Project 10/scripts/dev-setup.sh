#!/usr/bin/env bash
set -euo pipefail

BOLD="\033[1m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
RESET="\033[0m"

info()    { echo -e "${GREEN}[INFO]${RESET}  $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*"; exit 1; }
section() { echo -e "\n${BOLD}==> $*${RESET}"; }

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

section "Checking prerequisites"

command -v docker >/dev/null 2>&1 || error "Docker not found. Install from https://docs.docker.com/get-docker/"
command -v python3 >/dev/null 2>&1 || error "Python 3 not found."

PYTHON_VERSION=$(python3 --version 2>&1 | grep -oE '[0-9]+\.[0-9]+')
MAJOR=$(echo "$PYTHON_VERSION" | cut -d. -f1)
MINOR=$(echo "$PYTHON_VERSION" | cut -d. -f2)
[[ $MAJOR -ge 3 && $MINOR -ge 12 ]] || warn "Python 3.12+ recommended, found $PYTHON_VERSION"

info "Docker: $(docker --version)"
info "Python: $(python3 --version)"

section "Creating virtual environment"

if [[ ! -d ".venv" ]]; then
    python3 -m venv .venv
    info "Created .venv"
else
    info ".venv already exists — skipping"
fi

source .venv/bin/activate
pip install --upgrade pip -q

section "Installing Python dependencies"
pip install -r requirements.txt -r requirements-dev.txt -q
info "Dependencies installed"

section "Setting up environment file"

if [[ ! -f ".env" ]]; then
    cp .env.example .env
    SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
    FERNET_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
    sed -i.bak "s|SECRET_KEY=change-me-to-a-long-random-string|SECRET_KEY=${SECRET_KEY}|g" .env
    sed -i.bak "s|FERNET_KEY=change-me-to-a-valid-fernet-key|FERNET_KEY=${FERNET_KEY}|g" .env
    rm -f .env.bak
    info ".env created with generated keys"
else
    warn ".env already exists — skipping (delete it to regenerate)"
fi

section "Starting infrastructure services"

docker compose up -d postgres redis
info "Waiting for PostgreSQL to be ready..."

for i in {1..30}; do
    if docker compose exec -T postgres pg_isready -U deploypilot >/dev/null 2>&1; then
        info "PostgreSQL ready"
        break
    fi
    sleep 2
    [[ $i -eq 30 ]] && error "PostgreSQL did not become ready in time"
done

section "Running database migrations"

export PYTHONPATH="$PROJECT_ROOT"
# shellcheck disable=SC1091
source .env 2>/dev/null || true

alembic -c deploypilot/db/alembic.ini upgrade head
info "Migrations applied"

section "Setup complete"

echo ""
echo -e "${BOLD}Quick start:${RESET}"
echo "  source .venv/bin/activate"
echo "  docker compose up -d          # start all services"
echo "  docker compose logs -f api    # tail API logs"
echo ""
echo -e "${BOLD}Useful commands:${RESET}"
echo "  pytest tests/unit/            # run unit tests"
echo "  pytest tests/integration/     # run integration tests (needs docker)"
echo "  alembic -c deploypilot/db/alembic.ini revision --autogenerate -m 'desc'  # new migration"
echo ""
echo -e "${GREEN}DeployPilot dev environment ready.${RESET}"
