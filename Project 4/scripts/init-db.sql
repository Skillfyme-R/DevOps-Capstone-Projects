-- ShieldGrid database initialisation
-- Creates the extensions needed before Alembic runs migrations

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set search path
SET search_path TO public;
