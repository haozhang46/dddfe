---
extends: feature
when: Implementing a feature, use case, or user-visible change in this scaffolded DDD app.
---

# Feature (dddfe template)

Keep pstack Feature steps. Add DDD layer gates and `pnpm verify`.

- **After** "`how` over the affected subsystem.":
  - Read `AGENT.md` and `agent.md`. Name which layers change: Domain, Application, Infrastructure, Presentation. Domain stays pure; UI never embeds Domain convergence in `onChange`.
- **Before** "Delegate code-writing to a subagent using your configured feature model":
  - For Presentation / React work, read `.cursor/skills/react-fe-skill/SKILL.md` when present, and the component registry (`registry.json` / `r/<name>.json`).
- **After** "wrong-surface is not a pass. Flag it.":
  - Run `pnpm verify` (oxlint + fmt + tsc + test + build). Fix violations in code, not by weakening the verifier. High-risk rules: `.cursor/skills/when-to-use-formal-verification.md`.
