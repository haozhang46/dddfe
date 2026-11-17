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

## Commands

```bash
pnpm lint          # oxlint + ddd-plugin + CSS BEM nesting check
pnpm fmt           # oxfmt (write)
pnpm fmt:check     # oxfmt --check
pnpm test          # vitest
pnpm verify        # lint → fmt:check → tsc → test → build
pnpm dev           # Vite
```

Pre-commit runs `pnpm lint` and `pnpm fmt:check` (via `.githooks`, set by `prepare` on install).

## Architecture (enforced)

| Rule                                                | Tool                       |
| --------------------------------------------------- | -------------------------- |
| Domain purity / barrels / layer boundaries          | oxlint `ddd/*`             |
| JSX `className` BEM                                 | oxlint `ddd/bem-classname` |
| CSS nesting: full child BEM name (no `&__` / `&--`) | `check-css-bem`            |
| Format                                              | oxfmt                      |

Not ESLint / Prettier.
