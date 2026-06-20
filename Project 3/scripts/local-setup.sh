#!/usr/bin/env bash
set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
RESET='\033[0m'

log()  { echo -e "${CYAN}[MediCore]${RESET} $1"; }
ok()   { echo -e "${GREEN}[  OK  ]${RESET} $1"; }
err()  { echo -e "${RED}[ FAIL ]${RESET} $1"; exit 1; }

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗"
echo -e "║         MediCore Healthcare Platform — Local Setup       ║"
echo -e "╚══════════════════════════════════════════════════════════╝${RESET}"
echo ""

# Prerequisites check
log "Checking prerequisites..."
command -v node >/dev/null 2>&1 || err "Node.js 18+ is required"
command -v yarn >/dev/null 2>&1 || err "Yarn 3.6+ is required"
command -v docker >/dev/null 2>&1 || err "Docker is required"
NODE_VER=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
[ "$NODE_VER" -ge 18 ] || err "Node.js 18+ required (found $NODE_VER)"
ok "Prerequisites satisfied"

# Environment setup
log "Setting up environment..."
if [ ! -f ".env" ]; then
  cp .env.example .env
  ok ".env created from .env.example"
else
  ok ".env already exists"
fi

# Install dependencies
log "Installing workspace dependencies..."
corepack enable
yarn install --no-immutable
ok "Dependencies installed"

# Start infrastructure
log "Starting PostgreSQL, Redis, and MinIO..."
docker compose -f infrastructure/docker/docker-compose.infra.yml up -d
log "Waiting for services to be healthy..."
sleep 8

# Run migrations
log "Running database migrations..."
yarn workspace medicore-auth db:migrate && ok "Auth migrations applied"
yarn workspace medicore-patients db:migrate && ok "Patient migrations applied"
yarn workspace medicore-appointments db:migrate && ok "Appointment migrations applied"

# Seed demo data
log "Seeding demo data..."
yarn workspace medicore-auth db:seed && ok "Demo users seeded"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗"
echo -e "║              MediCore is ready to start!                 ║"
echo -e "╠══════════════════════════════════════════════════════════╣"
echo -e "║  Run: yarn start                                         ║"
echo -e "║                                                          ║"
echo -e "║  Frontend:     http://localhost:3005                     ║"
echo -e "║  Auth API:     http://localhost:9001/healthz/live        ║"
echo -e "║  Patient API:  http://localhost:9002/healthz/live        ║"
echo -e "║  FHIR:         http://localhost:9002/fhir/r4/metadata    ║"
echo -e "║                                                          ║"
echo -e "║  Demo Logins:                                            ║"
echo -e "║    superadmin@medicore.health / MediCore@2025!           ║"
echo -e "║    dr.smith@medicore.health   / MediCore@2025!           ║"
echo -e "║    patient@medicore.health    / MediCore@2025!           ║"
echo -e "╚══════════════════════════════════════════════════════════╝${RESET}"
