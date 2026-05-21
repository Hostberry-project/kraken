#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v node >/dev/null 2>&1; then
  echo "Instala Node.js 18 o superior (Debian/Ubuntu: sudo apt install nodejs npm)"
  exit 1
fi

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "Node $(node -v) detectado; se requiere >= 18"
  exit 1
fi

echo "Instalando dependencias..."
npm install --no-fund --no-audit

chmod +x scripts/start.sh scripts/stop.sh 2>/dev/null || true

echo ""
echo "Listo. Arrancar:  ./scripts/start.sh"
echo "Detener:        ./scripts/stop.sh"
