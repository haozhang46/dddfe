# Agent Guidelines

> Trust comes from executable constraints (oxlint / oxfmt / tests), not prose.

## START HERE

**Every task:** follow [`.cursor/skills/ddd-development-workflow.md`](./.cursor/skills/ddd-development-workflow.md)

1. Clarify requirements
2. Analyze layers (Domain / Application / Infrastructure / Presentation)
3. Write tests first (TDD)
4. Implement
5. Run `pnpm verify`
6. Fix failures (read oxlint rule ids; do not change tests to match broken code)
7. Commit

DDD layer rules and BEM: see [`agent.md`](./agent.md).

Before adding UI, read [`registry.json`](./registry.json), then `r/<name>.json` for the component you will use. `pnpm registry:check` fails when a shared component is missing from that index.

## Commands

```bash
bash .cursor/install.sh   # deps + .env from .env.example + githooks
bash .cursor/start.sh     # Vite on :5173 (Cloud Agent / optional)
pnpm lint                 # oxlint + ddd-plugin + CSS BEM nesting check
pnpm fmt                  # oxfmt (write)
pnpm fmt:check            # oxfmt --check
pnpm test                 # vitest
pnpm verify               # lint → fmt:check → tsc → test → build
pnpm dev                  # Vite (foreground)
pnpm storybook            # Base component catalog on :6006
pnpm build-storybook      # Static Storybook build (also in pnpm verify)
```

Pre-commit runs `pnpm lint` and `pnpm fmt:check` (via `.githooks`, set by `prepare` / `.cursor/install.sh`).

Cloud Agent: `.cursor/environment.json` defines `install` / `start` (`bash .cursor/install.sh` / `start.sh`).

## Architecture (enforced)

| Rule                                                | Tool                       |
| --------------------------------------------------- | -------------------------- |
| Domain purity / barrels / layer boundaries          | oxlint `ddd/*`             |
| JSX `className` BEM                                 | oxlint `ddd/bem-classname` |
| CSS nesting: full child BEM name (no `&__` / `&--`) | `check-css-bem`            |
| Format                                              | oxfmt                      |

Not ESLint / Prettier.
