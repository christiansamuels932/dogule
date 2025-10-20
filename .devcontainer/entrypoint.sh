#!/bin/sh
set -euo pipefail

npm install --no-fund --no-audit

exec "$@"
