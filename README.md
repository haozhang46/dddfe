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

- ✅ **Executable constraints** (oxlint + `ddd-plugin` enforce DDD; oxfmt formats)
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

Generated apps include the **agent scaffold** from the template:

- `AGENT.md` + `agent.md`
- `.cursor/skills/` (DDD workflow SOP)
- `.cursor/environment.json` (Cloud Agent `install` / `start`)
- `.cursor/install.sh` + `.cursor/start.sh` (env bootstrap)
- `.env.example` → `.env` on create/install (`.env` gitignored)
- `.gitignore` (includes `.env` / `.env.*`, keeps `.env.example`)
- `.githooks/` (oxlint + oxfmt on commit)
- `docs/` (verification / SOP guides)
- `scripts/verify.sh` + `pnpm lint` / `fmt` / `verify`

**From this repo (create script → copy + git init + install):**

```bash
bash .cursor/install.sh
./scripts/create-app.sh ../my-app
# or: make create NAME=../my-app
```

**CLI only (copy + rename `package.json` name):**

```bash
bash .cursor/install.sh
pnpm --filter create-dddfe build
pnpm exec create-dddfe ../my-app --template demo
cd ../my-app && git init && bash .cursor/install.sh
```

After publish (not done yet), the same entry will support:

```bash
pnpm create dddfe my-app
# npm create dddfe my-app
```

## Develop

```bash
bash .cursor/install.sh            # workspace + templates/demo + optional verify skill
pnpm lint                          # oxlint in templates/demo, including the ddd plugin
pnpm fmt:check                     # oxfmt --check in templates/demo
pnpm fmt                           # oxfmt (write)
pnpm test                          # create-dddfe unit tests
pnpm --filter create-dddfe build   # compile CLI
bash .cursor/start.sh              # demo Vite on :5173 (or: pnpm --dir templates/demo dev)
pnpm --dir templates/demo storybook # base component Storybook on :6006
```

`bash .cursor/install.sh` (or root `pnpm install`) sets `core.hooksPath` to `.githooks`. The pre-commit hook runs `pnpm lint` (oxlint) and `pnpm fmt:check` (oxfmt).

Cloud Agent env fields: see [docs/environment-setup.md](./docs/environment-setup.md).

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
  ├── .oxfmtrc.json            # oxfmt config
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
| [Environment setup](./docs/environment-setup.md) | Cloud Agent install/start scripts + templates |
| [AGENT.md](./AGENT.md) | Agent guidelines (references tools, not prose) |
| [demo agent.md](./templates/demo/agent.md) | Template layering + oxlint rule table |
| [Frontend DDD](./frontend-ddd-xstate-request-queue.md) | Architecture deep-dive (Chinese) |
