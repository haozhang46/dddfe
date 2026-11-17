# dddfe

CLI + multi-template repo for frontend DDD scaffolds (React + Vite + TypeScript).

**Now with Lauren Tan's AI Development Approach** - Make AI agents trustworthy through executable constraints, not prose.

## Templates

| Name | Description |
|------|-------------|
| `demo` | Order form sample: domain / application / infrastructure / presentation, auth + route guards |

Add more under `templates/<name>/` (standalone app root with its own `package.json` and `agent.md`).

## 🤖 AI Agent Ready

This repository implements [Lauren Tan's methodology](./docs/lauren-tan-ai-development-approach.md) from SpaceX:

- ✅ **Executable constraints** (ESLint rules enforce DDD architecture)
- ✅ **Verification loop** (Agents can run tests autonomously)
- ✅ **Runtime verification** (Playwright E2E + DevTools integration)
- ✅ **Hill climbing** (Bundle size tracking for performance optimization)

### Quick Verification

```bash
# Install and verify everything works
pnpm install
./scripts/verify.sh
```

### For AI Agents

See [AGENT.md](./AGENT.md) for agent guidelines.

Key principle: **Make the easy thing the right thing.**

## Create a project

**From this repo (copy + rename + install + git init):**

```bash
pnpm install
make create NAME=../my-app
# optional: TEMPLATE=demo (default)
```

**CLI only (copy + rename `package.json` name):**

```bash
pnpm install
pnpm --filter create-dddfe build
pnpm exec create-dddfe ../my-app --template demo
cd ../my-app && pnpm install && git init
```

After publish (not done yet), the same entry will support:

```bash
pnpm create dddfe my-app
# npm create dddfe my-app
```

## Develop

```bash
pnpm install                       # also points git hooks at .githooks
pnpm lint                          # oxlint in templates/demo, including the ddd plugin
pnpm test                          # create-dddfe unit tests
pnpm --filter create-dddfe build   # compile CLI
cd templates/demo && pnpm install && pnpm test && pnpm dev
```

`pnpm install` at the repo root sets `core.hooksPath` to `.githooks`. The pre-commit hook runs the root `pnpm lint` script and stops the commit when oxlint reports an error.

## Layout

```text
packages/create-dddfe           # create-dddfe CLI (publishable later)
templates/demo                  # first init template
  ├── src/domain/              # Pure business logic (no HTTP, no UI)
  ├── src/application/         # Use cases + Ports (abstractions)
  ├── src/infrastructure/      # HTTP, Queue, Repository implementations
  ├── src/presentation/        # XState machines + React UI
  ├── e2e/                     # Playwright E2E tests
  └── playwright.config.ts     # Browser automation config
docs/                           # maintainer specs / plans
  ├── lauren-tan-ai-development-approach.md  # Full methodology
  ├── LAUREN_TAN_QUICKSTART.md               # 15-minute guide
  └── verification-tools-setup.md            # Tool implementation guide
scripts/
  ├── verify.sh                # Main verification script
  └── tools/                   # Verification tools
      ├── architecture-scanner.ts  # AST-based architecture checks
      └── measure-bundle.ts        # Bundle size tracking
```

## Documentation

| Document | Purpose |
|----------|---------|
| [Lauren Tan's Approach](./docs/lauren-tan-ai-development-approach.md) | Complete methodology from "All Code Is Slop (Except Mine)" |
| [Quick Start](./docs/LAUREN_TAN_QUICKSTART.md) | Get started in 15 minutes |
| [Verification Tools](./docs/verification-tools-setup.md) | Playwright, DevTools, ts-morph setup |
| [AGENT.md](./AGENT.md) | Agent guidelines (references tools, not prose) |
| [Frontend DDD](./frontend-ddd-xstate-request-queue.md) | Architecture deep-dive (Chinese) |
