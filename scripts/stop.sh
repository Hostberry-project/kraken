#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-7000}"
stopped=0

if command -v fuser >/dev/null 2>&1; then
  if fuser -k "${PORT}/tcp" 2>/dev/null; then
    stopped=1
  fi
fi

if command -v lsof >/dev/null 2>&1; then
  pids=$(lsof -ti ":$PORT" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "$pids" | xargs -r kill 2>/dev/null || echo "$pids" | xargs kill 2>/dev/null
    stopped=1
  fi
fi

if [ "$stopped" = 1 ]; then
  echo "Puerto $PORT liberado."
else
  echo "Nada escuchando en el puerto $PORT."
fi
