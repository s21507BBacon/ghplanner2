#!/bin/bash
# Script to initialise Neon PostgreSQL database schema

set -e

echo "Initialising Neon PostgreSQL database..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable is not set"
  echo "Please set it to your Neon connection string:"
  echo "  export DATABASE_URL='postgresql://user:password@host/database?sslmode=require'"
  exit 1
fi

# Check if psql is installed
if ! command -v psql &> /dev/null; then
  echo "Error: psql (PostgreSQL client) is not installed"
  echo "Install it with: brew install postgresql (macOS) or apt-get install postgresql-client (Linux)"
  exit 1
fi

# Apply schema
echo "Applying database schema..."
psql "$DATABASE_URL" -f ../database/schema.sql

echo "✓ Database schema initialised successfully!"
echo ""
echo "Your Neon database is now ready to use."


