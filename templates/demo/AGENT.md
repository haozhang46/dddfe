# Agent Guidelines

> Trust comes from executable constraints (oxlint / oxfmt / tests), not prose.

## START HERE: poteto-mode

**Every non-trivial task:** restore pstack skills, then follow **`poteto-mode`**:

```bash
pnpm skills:install
```

Read `.agents/skills/poteto-mode/SKILL.md`, match a playbook, then apply [`.agents/playbooks/`](./.agents/playbooks/) (Feature / Bug fix overlays for this DDD template).

1. Clarify via the playbook (`how` / investigate as required)
2. Name layers (Domain / Application / Infrastructure / Presentation)
3. Implement (Presentation → `.cursor/skills/react-fe-skill/SKILL.md` when present)
4. Run `pnpm verify`
5. Fix failures (read oxlint rule ids; do not change tests to match broken code)
6. Opening a PR (per poteto-mode)

DDD layer rules and BEM: see [`agent.md`](./agent.md).

Before adding UI, read [`registry.json`](./registry.json), then `r/<name>.json` for the component you will use. `pnpm registry:check` fails when a shared component is missing from that index.

## Commands

```bash
bash .cursor/install.sh   # deps + .env from .env.example + githooks + skills restore
bash .cursor/start.sh     # Vite on :5173 (Cloud Agent / optional)
pnpm lint                 # oxlint + ddd-plugin + CSS BEM nesting check
pnpm fmt                  # oxfmt (write)
pnpm fmt:check            # oxfmt --check
pnpm test                 # vitest
pnpm verify               # lint → fmt:check → tsc → test → build
pnpm dev                  # Vite (foreground)
pnpm storybook            # Base component catalog on :6006
pnpm build-storybook      # Static Storybook build (also in pnpm verify)
pnpm skills:install       # .agents/skills from skills-lock.json (Cursor)
pnpm skills:check         # fail when a locked skill has an upstream update
pnpm skills:update        # move locked skills to the latest source commit
node .agents/skills/poteto-mode/scripts/check-playbooks.mjs
```

External skills (pstack) are locked in `skills-lock.json` from `haozhang46/pstack-claude`. `pnpm skills:install` restores `.agents/skills/` (gitignored). Skills in `.cursor/skills/` ship with the template. The CLI needs Node `>=22.20`.

Pre-commit (`.githooks/pre-commit`, set by `prepare` / `.cursor/install.sh`) runs `pnpm lint`, `pnpm fmt:check`, and `pnpm affected:graph`. Pull requests run `.github/workflows/affected-test.yml` (`affected:graph`, then `nx affected:test`).

Cloud Agent: `.cursor/environment.json` defines `install` / `start` (`bash .cursor/install.sh` / `start.sh`).

## Architecture (enforced)

| Rule                                                | Tool                        |
| --------------------------------------------------- | --------------------------- |
| Domain purity / barrels / layer boundaries          | oxlint `ddd/*`              |
| JSX `className` BEM                                 | oxlint `ddd/bem-classname`  |
| Named hook callbacks / no imperative handle / clone | oxlint (see react-fe-skill) |
| Format                                              | oxfmt                       |
| Behavior                                            | vitest + `pnpm verify`      |
