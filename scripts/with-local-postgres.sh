#!/usr/bin/env bash

# Ensures the local dev Postgres container is running and exports POSTGRES_URL
# for the child command. All other .env.local values are left untouched.
#
# Usage: ./scripts/with-local-postgres.sh <command> [args...]

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.dev.yml"
DEV_POSTGRES_URL="postgresql://postgres:postgres@127.0.0.1:54328/system_design_learner_dev"

if [[ $# -eq 0 ]]; then
  echo "Usage: $0 <command> [args...]"
  exit 1
fi

# Ensure the dev DB container is up
if ! docker compose -f "$COMPOSE_FILE" ps --status running 2>/dev/null | grep -q postgres; then
  echo "Starting local dev Postgres..."
  docker compose -f "$COMPOSE_FILE" up -d --wait
fi

# Run the child command with POSTGRES_URL pointing at the local DB
export POSTGRES_URL="$DEV_POSTGRES_URL"
exec "$@"
