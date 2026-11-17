#!/bin/bash
# Verification script (Lauren Tan approach)
# Architecture constraints are enforced by oxlint + ddd-plugin, not ESLint.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
DEMO="$ROOT/templates/demo"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

FAILED=0

if [ ! -f "$DEMO/node_modules/oxlint/package.json" ] || [ ! -f "$DEMO/node_modules/oxfmt/package.json" ]; then
  echo -e "${RED}❌ demo oxlint/oxfmt is missing.${NC}"
  echo "   Run: cd templates/demo && pnpm install --ignore-workspace"
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
echo "🏗️  ARCHITECTURE (oxlint + ddd-plugin)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Primary DDD enforcement: oxlint with templates/demo/oxlint/ddd-plugin.js
# Rules: ddd/domain-purity, ddd/domain-barrel, ddd/application-boundary,
#        ddd/infrastructure-boundary, ddd/section-viewmodel,
#        ddd/apply-change-name, ddd/base-component
run_check "oxlint (DDD layer rules)" "pnpm lint"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ FORMAT (oxfmt)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Formatter: oxfmt (Oxc), not Prettier / ESLint
# Config: templates/demo/.oxfmtrc.json
run_check "oxfmt --check" "pnpm fmt:check"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📘 TYPE CHECKING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

run_check "TypeScript compilation" "pnpm --dir templates/demo exec tsc -b --pretty false"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 UNIT TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

run_check "demo unit tests" "pnpm --dir templates/demo test"
run_check "create-dddfe unit tests" "pnpm --filter create-dddfe test"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏗️  BUILD"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

run_check "demo production build" "pnpm --dir templates/demo build"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}✨ ALL VERIFICATION PASSED ✨${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 0
else
  echo -e "${RED}❌ VERIFICATION FAILED${NC}"
  echo -e "${YELLOW}Fix the code (not the tests). Re-run: ./scripts/verify.sh${NC}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  exit 1
fi
