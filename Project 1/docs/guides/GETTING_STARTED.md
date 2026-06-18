# Getting Started — NexusFinance Developer Guide

## Prerequisites

Install these tools before starting:

| Tool       | Version  | Install                                   |
|------------|----------|-------------------------------------------|
| Node.js    | ≥ 18     | https://nodejs.org or `nvm install 18`    |
| Yarn       | ≥ 3.6    | `corepack enable && corepack prepare yarn@stable --activate` |
| Docker     | ≥ 24     | https://docker.com/desktop               |
| Git        | ≥ 2.40   | https://git-scm.com                      |
| kubectl    | ≥ 1.27   | For Kubernetes deployments               |
| Terraform  | ≥ 1.5    | For infrastructure changes               |

## Quick Start (5 minutes)

```bash
# 1. Clone the repository
git clone https://github.com/nexusfinance/platform.git
cd nexusfinance-platform

# 2. Install all dependencies (all packages at once via workspaces)
yarn install

# 3. Copy environment variables
cp .env.example .env
# Edit .env with your values (minimum: DB and Redis are configured below)

# 4. Start infrastructure (PostgreSQL + Redis)
yarn docker:up

# 5. Wait for postgres to be healthy, then run migrations
yarn db:migrate

# 6. Seed demo data (creates demo users and sample transactions)
yarn db:seed

# 7. Start the platform!
yarn start
```

Open:
- Frontend: http://localhost:3000
- Backend API: http://localhost:7007
- API Health: http://localhost:7007/healthz/ready
- Grafana: http://localhost:3001 (admin / nexus_grafana_admin)
- Prometheus: http://localhost:9090
- DB Admin: http://localhost:8080 (run with `--profile dev`)

## Demo Login Credentials

| User         | Email                                    | Password   | Role             |
|--------------|------------------------------------------|------------|------------------|
| Alex Johnson | alex.johnson@demo.nexusfinance.io        | Demo@1234  | customer (KYC L2)|
| Sarah Chen   | sarah.chen@demo.nexusfinance.io          | Demo@1234  | analyst          |
| Admin        | admin@nexusfinance.io                    | Demo@1234  | admin + all roles|

## Development Workflow

### Running individual services

```bash
yarn start:backend    # Backend only (port 7007)
yarn start:app        # Frontend only (port 3000)
```

### Making database changes

```bash
# Create a new migration file
touch packages/backend/src/migrations/004_add_beneficiaries.ts

# Write the migration (see 001_create_users.ts as example)

# Apply it
yarn db:migrate

# Undo if something went wrong
yarn db:rollback

# Apply again
yarn db:migrate
```

### Running tests

```bash
yarn test             # All packages
yarn workspace @nexusfinance/backend test  # Backend only
yarn workspace @nexusfinance/app test      # Frontend only
```

### Building for production

```bash
yarn build            # Build all packages
yarn build:backend    # Backend only (TypeScript → JavaScript)
yarn build:app        # Frontend only (React → static HTML/CSS/JS)
```

### Docker build

```bash
# Build backend image
docker build -t nexusfinance-backend:dev -f infrastructure/docker/Dockerfile.backend .

# Build frontend image
docker build -t nexusfinance-frontend:dev -f infrastructure/docker/Dockerfile.app .
```

## Project Structure Quick Reference

```
nexusfinance-platform/
│
├── packages/app/src/
│   ├── pages/              ← Add new pages here
│   ├── components/         ← Add reusable components here
│   ├── hooks/              ← Add custom hooks (useAccounts, etc.) here
│   └── styles/theme.ts     ← Change colors/fonts here
│
├── packages/backend/src/
│   ├── plugins/            ← Add new API feature modules here
│   │   └── myfeature/
│   │       └── routes.ts   ← Register in index.ts
│   └── migrations/         ← Add new migration files here
│
├── app-config.yaml         ← Main configuration (edit for new features)
├── .env                    ← Your local secrets (never commit)
└── infrastructure/
    ├── docker/             ← Docker files
    ├── kubernetes/         ← K8s manifests
    └── terraform/          ← AWS infrastructure code
```

## Adding a New Feature

Example: Adding a "Budgets" feature.

### Step 1: Database migration

```typescript
// packages/backend/src/migrations/004_create_budgets.ts
export async function up(knex) {
  await knex.schema.createTable('nexus_budgets', table => {
    table.uuid('id').primary();
    table.uuid('user_id').references('id').inTable('nexus_users');
    table.string('category').notNullable();
    table.decimal('monthly_limit', 19, 4).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}
```

### Step 2: Backend route

```typescript
// packages/backend/src/plugins/budgets/routes.ts
export function budgetRoutes() {
  const router = Router();
  router.get('/',    async (req, res) => { /* list budgets */ });
  router.post('/',   async (req, res) => { /* create budget */ });
  router.patch('/:id', async (req, res) => { /* update budget */ });
  return router;
}
```

### Step 3: Register in index.ts

```typescript
// packages/backend/src/index.ts
import { budgetRoutes } from './plugins/budgets/routes';
// ...
app.use('/api/v1/budgets', authMiddleware, budgetRoutes());
```

### Step 4: Frontend hook

```typescript
// packages/app/src/hooks/useBudgets.ts
export function useBudgets() {
  return useQuery('budgets', () => api.get('/budgets'));
}
```

### Step 5: Frontend page

```typescript
// packages/app/src/pages/BudgetsPage.tsx
export default function BudgetsPage() {
  const { data } = useBudgets();
  // ... render
}
```

### Step 6: Add to navigation

```typescript
// packages/app/src/components/layout/Sidebar.tsx
{ label: 'Budgets', icon: <BudgetIcon />, path: '/budgets' }
```

## Environment Variables Reference

See `.env.example` for a complete list with descriptions.

Required for local development:
- `NEXUS_DB_*`        — PostgreSQL connection
- `NEXUS_REDIS_URL`   — Redis connection
- `NEXUS_BACKEND_SECRET` — JWT signing key (any 64+ char string locally)
- `NEXUS_SESSION_SECRET` — Session key

Required for payments:
- `STRIPE_*`          — Create account at stripe.com/register

## Troubleshooting

### "Connection refused" when starting backend
Make sure Docker is running: `yarn docker:up`
Wait for postgres health: `docker-compose -f infrastructure/docker/docker-compose.yml ps`

### "relation does not exist" database error
Run migrations: `yarn db:migrate`

### TypeScript compilation errors
Run type check to see all errors: `yarn type-check`

### Port already in use
Backend port 7007: `lsof -i :7007 | grep LISTEN`
Frontend port 3000: `lsof -i :3000 | grep LISTEN`
Kill the process: `kill -9 <PID>`
