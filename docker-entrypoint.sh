#!/bin/sh
set -e

echo "=== VOC-Market Container Initializing ==="
echo "Node Environment : ${NODE_ENV:-production}"
echo "Server Port      : ${PORT:-3000}"

# Run idempotent database initialization (creates tables & initial seed if fresh DB)
if [ "$SKIP_DB_INIT" != "true" ]; then
  echo "Checking database connection and schema..."
  bun run db:init || echo "Warning: db:init encountered an issue, proceeding to start app..."
fi

echo "Launching VOC-Market Elysia server..."
exec bun run start

