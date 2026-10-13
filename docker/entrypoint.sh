#!/bin/sh
set -eu

echo "[entrypoint] Aplicando migrations (drizzle-kit migrate)..."
./node_modules/.bin/drizzle-kit migrate --config=drizzle.migrate.config.ts

echo "[entrypoint] Iniciando API..."
exec node dist/server.js
