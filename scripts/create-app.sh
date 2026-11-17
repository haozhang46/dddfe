#!/usr/bin/env bash
# Create a new app from templates/demo via create-dddfe, then run its env install.
# Usage: ./scripts/create-app.sh ../my-app [template]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NAME="${1:-}"
TEMPLATE="${2:-demo}"

if [ -z "$NAME" ]; then
  echo "Usage: $0 <project-path> [template]" >&2
  echo "  e.g. $0 ../my-app" >&2
  exit 1
fi

cd "$ROOT"
pnpm --filter create-dddfe build
node "$ROOT/packages/create-dddfe/bin/create-dddfe.js" "$NAME" --template "$TEMPLATE"

(
  cd "$NAME"
  git init
  bash .cursor/install.sh
)

echo "Created $NAME"
echo "  cd $NAME && pnpm verify"
echo "  bash .cursor/start.sh   # optional Vite"
