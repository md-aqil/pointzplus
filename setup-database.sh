#!/bin/bash
# Setup PointzPlus PostgreSQL Database

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
psql -d pointzplus -f supabase/migrations/20260915_001_init.sql

echo ""
echo "Seeding programs..."
psql -d pointzplus -f supabase/migrations/20260915_002_seed_programs.sql

echo ""
echo "Adding coupons, tokens, and sync jobs..."
psql -d pointzplus -f supabase/migrations/20260915_003_coupons_and_sync_jobs.sql

echo ""
echo "=== Database Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. cd server && npm install && npm start"
echo "2. npx expo start (in pointzplus-mobile root)"
echo ""
echo "Default credentials (for development):"
echo "Email: admin@pointzplus.com"
echo "Password: pointzplus123"