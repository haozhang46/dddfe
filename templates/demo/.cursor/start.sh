#!/usr/bin/env bash
# Cloud Agent boot: Vite for this generated app.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT="${DDDFE_DEV_PORT:-5173}"
SESSION="app_dev"
LOG="/tmp/dddfe-app-dev.log"

if [ ! -d node_modules ]; then
  echo "start: node_modules missing; run .cursor/install.sh first" >&2
  exit 1
fi

if curl -fsS "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
  echo "start: already up on :${PORT}"
  exit 0
fi

if tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "start: tmux session $SESSION already exists"
  exit 0
fi

tmux new-session -d -s "$SESSION" \
  "cd '$ROOT' && pnpm exec vite --host 127.0.0.1 --port ${PORT} 2>&1 | tee '$LOG'"

for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
    echo "start: ready http://127.0.0.1:${PORT}/"
    exit 0
  fi
  sleep 1
done

echo "start: timed out waiting for :${PORT} (see $LOG)" >&2
exit 1
