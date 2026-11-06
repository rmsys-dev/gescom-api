#!/bin/sh
set -eu

# O script exige MIGRATION_DATABASE_URL. Imagens antigas só tinham DATABASE_URL.
if [ -z "${MIGRATION_DATABASE_URL:-}" ] && [ -n "${DATABASE_URL:-}" ]; then
  echo "[entrypoint] MIGRATION_DATABASE_URL ausente; usando DATABASE_URL."
  export MIGRATION_DATABASE_URL="$DATABASE_URL"
fi

echo "[entrypoint] Aplicando migrations (scripts/migrate.ts)..."
./node_modules/.bin/tsx scripts/migrate.ts

echo "[entrypoint] Iniciando API..."
exec node dist/server.js
