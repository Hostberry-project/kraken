#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-7000}"

if command -v ss >/dev/null 2>&1; then
  if ss -tln "sport = :$PORT" 2>/dev/null | grep -q LISTEN; then
    echo "Puerto $PORT ocupado. Ejecuta: ./scripts/stop.sh"
    exit 1
  fi
elif command -v lsof >/dev/null 2>&1; then
  if lsof -ti ":$PORT" >/dev/null 2>&1; then
    echo "Puerto $PORT ocupado. Ejecuta: ./scripts/stop.sh"
    exit 1
  fi
fi

export KRAKEN_HOST="${KRAKEN_HOST:-0.0.0.0}"
echo "Kraken en puerto $PORT (Ctrl+C para detener)"
exec node addon.js
