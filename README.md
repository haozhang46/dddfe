# dddfe

CLI + multi-template repo for frontend DDD scaffolds (React + Vite + TypeScript).

**Now with Lauren Tan's AI Development Approach** - Make AI agents trustworthy through executable constraints, not prose.

## Templates

| Name | Description |
|------|-------------|
| `demo` | Order form sample: domain / application / infrastructure / presentation, auth + route guards |

Add more under `templates/<name>/` (standalone app root with its own `package.json` and `agent.md`).

## 🤖 AI Agent Ready

This repository implements Lauren Tan's methodology (see `docs/` and `AGENT.md`) from SpaceX:

- ✅ **Executable constraints** (oxlint + `ddd-plugin` enforce DDD architecture)
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
  ├── SUMMARY.md               # Lauren Tan approach overview
  ├── how-ai-follows-sop.md    # How agents follow the SOP
  └── verification-tools-setup.md
templates/demo/
  ├── .oxlintrc.json           # oxlint config
  └── oxlint/ddd-plugin.js     # DDD layer rules (primary enforcement)
scripts/
  ├── verify.sh                # Main verification (starts with pnpm lint / oxlint)
  └── tools/                   # Extra verification tools
      ├── architecture-scanner.ts  # Optional AST scan (secondary to oxlint)
      ├── measure-bundle.ts
      └── runtime-inspector.ts
```

## Documentation

| Document | Purpose |
|----------|---------|
| [SUMMARY](./docs/SUMMARY.md) | Lauren Tan approach overview |
| [How AI follows SOP](./docs/how-ai-follows-sop.md) | Agent SOP behavior |
| [Verification Tools](./docs/verification-tools-setup.md) | Playwright, DevTools, oxlint |
| [AGENT.md](./AGENT.md) | Agent guidelines (references tools, not prose) |
| [demo agent.md](./templates/demo/agent.md) | Template layering + oxlint rule table |
| [Frontend DDD](./frontend-ddd-xstate-request-queue.md) | Architecture deep-dive (Chinese) |
