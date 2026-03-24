#!/usr/bin/env bash

# Core integration test runner.
# Assumes POSTGRES_URL already points at a running, reachable Postgres instance.
#
# Usage:
#   POSTGRES_URL=... ./scripts/run-integration-tests.sh [vitest args...]

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -z "${POSTGRES_URL:-}" ]]; then
  echo "❌ POSTGRES_URL is not set. Point it at a running Postgres instance."
  exit 1
fi

echo "Running database migrations..."
POSTGRES_URL="$POSTGRES_URL" npx tsx "$ROOT_DIR/scripts/run-migrations.ts"

echo "Running integration tests..."
POSTGRES_URL="$POSTGRES_URL" npx vitest run --config "$ROOT_DIR/vitest.integration.config.mts" "$@"
