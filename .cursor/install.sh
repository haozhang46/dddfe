#!/usr/bin/env bash
# Cloud Agent / local env install for the dddfe monorepo.
# Idempotent. Must exit. Do not start long-running servers here.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> dddfe install (monorepo)"

# Seed .env from .env.example when missing (never overwrite)
if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
  echo "    created .env from .env.example"
fi
if [ ! -f templates/demo/.env ] && [ -f templates/demo/.env.example ]; then
  cp templates/demo/.env.example templates/demo/.env
  echo "    created templates/demo/.env from .env.example"
fi

# Corepack / pnpm (Ubuntu login shells may not load ~/.bashrc PATH)
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

# Workspace packages (create-dddfe)
pnpm install --frozen-lockfile || pnpm install

# Demo template is NOT a workspace member — own lockfile
(
  cd templates/demo
  pnpm install --ignore-workspace --frozen-lockfile || pnpm install --ignore-workspace
)

# Optional: runtime UI driver skill (Chrome channel; no Playwright browser download)
if [ -f .cursor/skills/verify-dddfe/package.json ]; then
  (
    cd .cursor/skills/verify-dddfe
    pnpm install --ignore-workspace --frozen-lockfile || pnpm install --ignore-workspace
  )
fi

# Point git hooks at .githooks when inside a git work tree
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git config core.hooksPath .githooks || true
fi

echo "==> install done"
echo "    next: pnpm lint && pnpm --dir templates/demo test"
echo "    or:   ./scripts/verify.sh"
