#!/bin/bash
# Setup PointzPlus PostgreSQL Database

MIGRATIONS_DIR="server/db/migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "❌ Migrations directory '$MIGRATIONS_DIR' not found."
  echo "   Place the .sql migrations there, then re-run this script."
  exit 1
fi

echo "=== PointzPlus Database Setup ==="

# Check if PostgreSQL is running
if ! pg_isready -q; then
  echo "❌ PostgreSQL is not running. Please start it first."
  exit 1
fi

# Create database if not exists
if ! psql -lqt | cut -d \| -f 1 | grep -qw pointzplus; then
  echo "Creating database 'pointzplus'..."
  createdb pointzplus
else
  echo "✓ Database 'pointzplus' already exists"
fi

# Run migrations
echo ""
echo "Running migrations..."
psql -d pointzplus -f "$MIGRATIONS_DIR/20260915_001_init.sql"

echo ""
echo "Seeding programs..."
psql -d pointzplus -f "$MIGRATIONS_DIR/20260915_002_seed_programs.sql"

echo ""
echo "Adding coupons, tokens, sync jobs, security columns & slugs..."
psql -d pointzplus -f "$MIGRATIONS_DIR/20260915_003_coupons_and_sync_jobs.sql"
psql -d pointzplus -f "$MIGRATIONS_DIR/20260915_004_security_and_slugs.sql"

echo ""
echo "Adding sync job queue columns (claiming, heartbeat, retries)..."
psql -d pointzplus -f "$MIGRATIONS_DIR/20260915_005_sync_job_queue.sql"


echo ""
echo "=== Database Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. cd server && npm install && npm start"
echo "2. npx expo start (in pointzplus-mobile root)"
echo "3. Register a new account in the app; the database starts with no user portfolio data."