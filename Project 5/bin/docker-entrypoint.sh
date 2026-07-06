#!/bin/sh
set -e

echo "FluxStream — Starting up..."

# Run migrations
echo "Running database migrations..."
./bin/fluxstream eval "Core.Release.migrate()"

# Optionally seed the database
if [ "$SEED_DB" = "true" ]; then
  echo "Seeding database..."
  ./bin/fluxstream eval "Core.Release.seed()"
fi

echo "Migrations complete. Starting FluxStream..."
exec "$@"
