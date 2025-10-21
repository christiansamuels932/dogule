#!/bin/sh
set -eu

missing=""

for var in DATABASE_URL JWT_SECRET; do
  value=$(eval "printf '%s' \"\${$var:-}\"")
  if [ -z "$value" ]; then
    if [ -z "$missing" ]; then
      missing="$var"
    else
      missing="$missing $var"
    fi
  fi
done

if [ -n "$missing" ]; then
  echo "ERR_DEPLOY_ENV_001 Missing required environment variables: $missing" >&2
  exit 1
fi

exec node apps/server/dist/index.js
