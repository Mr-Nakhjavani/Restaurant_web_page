#!/bin/sh
# Applies database migrations, optionally seeds reference data, then starts the server.
set -e
echo "[entrypoint] applying migrations"
npx prisma migrate deploy
if [ "${RUN_SEED_ON_START:-false}" = "true" ]; then
  echo "[entrypoint] seeding reference data (sample bookings only if the database is empty)"
  npx tsx prisma/seed.ts
fi
exec npx next start -p "${PORT:-3000}"
