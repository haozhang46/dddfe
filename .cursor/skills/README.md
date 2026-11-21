# Cursor Skills for DDD Frontend Development

> **Purpose**: Project-local skills that stay in git. External pstack skills live in `.agents/skills/` via `skills-lock.json`.

## Entry SOP (pstack)

**Every non-trivial task:** follow **`poteto-mode`** in `.agents/skills/poteto-mode/` (restore with `pnpm skills:install`), then apply [`.agents/playbooks/`](../../.agents/playbooks/).

```bash
pnpm skills:install
node .agents/skills/poteto-mode/scripts/check-playbooks.mjs
```

## Project-local skills (this folder)

### [verify](./verify/SKILL.md)

Drive `templates/demo` the way a user does. Feature map under `verify/features/`. Generated shape matches pstack `create-verification-skill`; keep it honest with `maintain-verification-skill`.

### [react-fe-skill](./react-fe-skill/SKILL.md)

Team React conventions for `presentation/` (named hooks, ErrorBoundary, registry). Complements upstream TypeScript / React skills from the lock.

### [when-to-use-formal-verification](./when-to-use-formal-verification.md)

When TLA+ / Lean / property tests are worth the cost.

## External skills (pstack)

Locked in root `skills-lock.json` (and `templates/demo/skills-lock.json`). Restored into `.agents/skills/` (gitignored). Source: `haozhang46/pstack-claude` → `plugins/pstack/skills`.

```bash
pnpm exec skills add https://github.com/haozhang46/pstack-claude/tree/main/plugins/pstack/skills --skill '*' -a cursor -y --full-depth
pnpm skills:install
pnpm skills:check
pnpm skills:update
```

Cursor reads `.agents/skills/` and this `.cursor/skills/` directory. It does not read `skills-lock.json`. The CLI needs Node `>=22.20`.

## Skill Principles (Lauren Tan's Approach)

### 1. Reference Tools, Don't Repeat Logic

Skills point at `./scripts/verify.sh`, oxlint, and `.cursor/skills/verify/` instead of re-stating their rules.

### 2. Executable Over Aspirational

Prefer commands and feature-map recipes over vague guidance.

### 3. Fail Loud, Fix Forward

When verify fails, fix the code (or update the map via `maintain-verification-skill`), never weaken the gate quietly.
