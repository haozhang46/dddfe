#!/usr/bin/env bash
# Cloud Agent boot: keep the demo Vite server available for UI verify.
# Detached / re-runnable. Do not install packages here.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT="${DDDFE_DEV_PORT:-5173}"
SESSION="dddfe_demo_dev"
LOG="/tmp/dddfe-demo-dev.log"

if [ ! -d templates/demo/node_modules ]; then
  echo "start: templates/demo/node_modules missing; run .cursor/install.sh first" >&2
  exit 1
fi

# Already listening?
if curl -fsS "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
  echo "start: demo already up on :${PORT}"
  exit 0
fi

# Reuse tmux session if present
if tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "start: tmux session $SESSION already exists"
  exit 0
fi

tmux new-session -d -s "$SESSION" \
  "cd '$ROOT/templates/demo' && pnpm exec vite --host 127.0.0.1 --port ${PORT} 2>&1 | tee '$LOG'"

# Wait for readiness (Vite may take a few seconds)
for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
    echo "start: demo ready http://127.0.0.1:${PORT}/"
    exit 0
  fi
  sleep 1
done

echo "start: timed out waiting for :${PORT} (see $LOG)" >&2
exit 1
