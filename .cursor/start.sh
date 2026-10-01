#!/usr/bin/env bash
# Per-boot startup: PostgreSQL, local database, Express API, and Vite.
# Safe to run more than once. Exits after the services are accepting connections.
set -euo pipefail

if [[ -f /workspace/package.json ]]; then
  cd /workspace
elif [[ -n "${BASH_SOURCE[0]:-}" && -f "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/package.json" ]]; then
  cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "PostgreSQL is not installed. Run .cursor/install.sh first." >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "Missing .env. Run .cursor/install.sh first." >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

: "${DB_PASSWORD:?DB_PASSWORD is required in .env}"
: "${DB_NAME:?DB_NAME is required in .env}"

mkdir -p /tmp
exec 9>/tmp/fusion-start.lock
flock -w 120 9

if ! pg_isready -h 127.0.0.1 -p 5432 -q; then
  pg_ver="$(ls /etc/postgresql 2>/dev/null | sort -V | tail -n 1 || true)"
  if [[ -n "$pg_ver" ]]; then
    sudo pg_ctlcluster "$pg_ver" main start || sudo service postgresql start
  else
    sudo service postgresql start
  fi
fi

ready=0
for _ in $(seq 1 40); do
  if pg_isready -h 127.0.0.1 -p 5432 -q; then
    ready=1
    break
  fi
  sleep 1
done
if [[ "$ready" -ne 1 ]]; then
  echo "PostgreSQL did not become ready on 127.0.0.1:5432." >&2
  exit 1
fi

sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER USER postgres WITH PASSWORD '${DB_PASSWORD}';"

if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${DB_NAME}\";"
fi

listening() {
  local port="$1"
  timeout 1 bash -c "echo >/dev/tcp/127.0.0.1/${port}" >/dev/null 2>&1
}

if ! listening 4000; then
  npm start >> /tmp/fusion-api.log 2>&1 9>&- &
  echo $! > /tmp/fusion-api.pid
fi

if ! listening 3000; then
  npm --prefix client run dev -- --host 0.0.0.0 --port 3000 >> /tmp/fusion-vite.log 2>&1 9>&- &
  echo $! > /tmp/fusion-vite.pid
fi

api_ok=0
for _ in $(seq 1 90); do
  if curl -sf --max-time 3 http://127.0.0.1:4000/api/health | grep -q '"database":"connected"'; then
    api_ok=1
    break
  fi
  sleep 2
done
if [[ "$api_ok" -ne 1 ]]; then
  echo "API did not report a connected database. See /tmp/fusion-api.log" >&2
  tail -n 80 /tmp/fusion-api.log >&2 || true
  exit 1
fi

vite_ok=0
for _ in $(seq 1 40); do
  if curl -sf -o /dev/null --max-time 3 http://127.0.0.1:3000/; then
    vite_ok=1
    break
  fi
  sleep 1
done
if [[ "$vite_ok" -ne 1 ]]; then
  echo "Vite did not respond on port 3000. See /tmp/fusion-vite.log" >&2
  tail -n 80 /tmp/fusion-vite.log >&2 || true
  exit 1
fi

echo "Fusion High dev stack is up: API http://127.0.0.1:4000  Vite http://127.0.0.1:3000"
# Stay attached so PostgreSQL, the API, and Vite are not torn down when startup exits.
wait
