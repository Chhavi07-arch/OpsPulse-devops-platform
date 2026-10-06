#!/bin/sh
set -eu

# Kubernetes runs migrations in an init container and sets OPSPULSE_RUN_MIGRATIONS=false.
if [ "${OPSPULSE_RUN_MIGRATIONS:-true}" = "true" ]; then
  alembic upgrade head
fi

exec "$@"
