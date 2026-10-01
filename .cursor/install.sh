#!/usr/bin/env bash
# Idempotent Cloud Agent bootstrap for the Fusion High web app.
# Installs PostgreSQL (when missing), Node dependencies, and a local .env.
set -euo pipefail

if [[ -f /workspace/package.json ]]; then
  cd /workspace
elif [[ -n "${BASH_SOURCE[0]:-}" && -f "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/package.json" ]]; then
  cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fi

export DEBIAN_FRONTEND=noninteractive

if ! command -v psql >/dev/null 2>&1 || ! command -v pg_isready >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y postgresql postgresql-contrib
fi

if ! command -v curl >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y curl
fi

npm ci
npm ci --prefix client

if [[ ! -f .env ]]; then
  umask 077
  cat > .env <<EOF
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=$(openssl rand -hex 16)
DB_NAME=FUSION_DB
JWT_SECRET=$(openssl rand -hex 32)
PORT=4000
IP=127.0.0.1
EOF
  echo "Created local .env (gitignored)."
else
  echo "Local .env already present; leaving it unchanged."
fi

echo "Install complete."
