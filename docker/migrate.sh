#!/bin/sh
# Run all Supabase migrations (in timestamp order) then load the seed file.
# Executed by the db-migrate service in docker-compose.yml.
set -e

echo "==> Waiting for PostgreSQL to accept connections…"
until psql -c '\q' 2>/dev/null; do
  sleep 1
done

echo "==> Applying migrations…"
for f in $(ls /migrations/*.sql | sort); do
  echo "    $f"
  psql -v ON_ERROR_STOP=1 -f "$f"
done

echo "==> Loading seed data…"
psql -v ON_ERROR_STOP=1 -f /seed.sql

echo "==> Database ready."
