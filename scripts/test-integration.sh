#!/usr/bin/env bash

# Local convenience wrapper: spins up a disposable integration Postgres,
# runs migrations + integration tests via the core runner, then tears down.
# Set KEEP_INTEGRATION_DB=1 to keep the container running after tests.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.integration.yml"
export POSTGRES_URL="${INTEGRATION_POSTGRES_URL:-postgresql://postgres:postgres@127.0.0.1:54329/system_design_learner_integration}"
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

"$ROOT_DIR/scripts/run-integration-tests.sh" "$@"
