#!/usr/bin/env bash
# Cloud Agent / local env install for a create-dddfe generated app.
# Idempotent. Must exit. Do not start long-running servers here.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> app install (create-dddfe template)"

# Seed .env from .env.example when missing (never overwrite)
if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
  echo "    created .env from .env.example"
fi

if ! command -v pnpm >/dev/null 2>&1; then
  if command -v corepack >/dev/null 2>&1; then
    corepack enable
    corepack prepare pnpm@9.15.9 --activate || true
  fi
fi
command -v pnpm >/dev/null 2>&1 || {
  echo "pnpm not found on PATH" >&2
  exit 1
}

# prepare restores skills-lock.json into .agents/skills when the lock exists
pnpm install --frozen-lockfile || pnpm install
pnpm skills:install

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git config core.hooksPath .githooks || true
fi

echo "==> install done"
echo "    skills: pnpm exec skills add <owner/repo> --skill <name> -a cursor -y"
echo "    next: pnpm verify   # or pnpm lint && pnpm test && pnpm build"
