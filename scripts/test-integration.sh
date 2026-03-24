#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.integration.yml"
POSTGRES_URL="${INTEGRATION_POSTGRES_URL:-postgresql://postgres:postgres@127.0.0.1:54329/system_design_sandbox_integration}"
KEEP_DB="${KEEP_INTEGRATION_DB:-0}"

cleanup() {
  if [[ "$KEEP_DB" == "1" ]]; then
    echo "Keeping integration database container running for debugging."
    return
  fi

  docker compose -f "$COMPOSE_FILE" down -v
}

trap cleanup EXIT

echo "Starting integration Postgres..."
docker compose -f "$COMPOSE_FILE" up -d --wait

echo "Running database migrations..."
POSTGRES_URL="$POSTGRES_URL" npx tsx "$ROOT_DIR/scripts/run-migrations.ts"

echo "Running integration tests..."
POSTGRES_URL="$POSTGRES_URL" npx vitest run --config "$ROOT_DIR/vitest.integration.config.mts" "$@"
