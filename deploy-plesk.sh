#!/usr/bin/env bash
set -Eeuo pipefail

APP_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_ROOT"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Node.js and npm must be available in the Plesk deployment action." >&2
  exit 1
fi

NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if [[ ! "$NODE_MAJOR" =~ ^[0-9]+$ ]] || (( NODE_MAJOR < 20 )); then
  echo "This project requires Node.js 20 or later; found $(node --version)." >&2
  exit 1
fi

if [[ ! -f package-lock.json ]]; then
  echo "package-lock.json is required for a reproducible Plesk deployment." >&2
  exit 1
fi

npm ci --include=dev --no-audit --no-fund
npm run build
npm prune --omit=dev --no-audit --no-fund

echo "Build complete. Restart the Node.js application from Plesk."