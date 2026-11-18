#!/bin/bash
# Verification for a generated dddfe app (standalone, not the monorepo).
# Enforced by: oxlint + ddd-plugin, oxfmt, check-css-bem, tsc, vitest, build.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

FAILED=0

if [ ! -f "$ROOT/node_modules/oxlint/package.json" ] || [ ! -f "$ROOT/node_modules/oxfmt/package.json" ]; then
  echo -e "${RED}❌ oxlint/oxfmt missing. Run: pnpm install${NC}"
  exit 1
fi

run_check() {
  local name=$1
  local command=$2

  echo "📋 $name..."
  if eval "$command" > /tmp/verify_output.log 2>&1; then
    echo -e "${GREEN}✅ $name passed${NC}"
  else
    echo -e "${RED}❌ $name failed${NC}"
    echo "   Output:"
    head -40 /tmp/verify_output.log
    FAILED=1
  fi
  echo ""
}

echo "🔍 Starting verification..."
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏗️  LINT (oxlint + ddd-plugin + CSS BEM)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
run_check "pnpm lint" "pnpm lint"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ FORMAT (oxfmt)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
run_check "pnpm fmt:check" "pnpm fmt:check"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📘 TYPE CHECKING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
run_check "TypeScript" "pnpm exec tsc -b --pretty false"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 UNIT TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
run_check "nx affected graph" "node scripts/check-nx-affected.mjs"
run_check "nx unit tests" "pnpm test"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏗️  BUILD"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
run_check "production build" "pnpm build"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}✨ ALL VERIFICATION PASSED ✨${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
else
  echo -e "${RED}❌ VERIFICATION FAILED${NC}"
  echo -e "${YELLOW}Fix the code (not the tests). Re-run: pnpm verify${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi
