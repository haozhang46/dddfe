---
extends: feature
when: Implementing a feature, use case, or user-visible change in this DDD monorepo or templates/demo.
---

# dddfe Feature

Keep pstack Feature steps. Add DDD layer gates and the project verify driver.

- **After** "`how` over the affected subsystem.":
  - Read root `AGENT.md` layer rules (and `templates/demo/agent.md` when touching the demo). Name which layers change: Domain, Application, Infrastructure, Presentation. Domain stays pure; UI never embeds Domain convergence in `onChange`.
- **Before** "Delegate code-writing to a subagent using your configured feature model":
  - For Presentation / React work, read `.cursor/skills/react-fe-skill/SKILL.md` and the component registry under `templates/demo` when applicable.
- **After** "wrong-surface is not a pass. Flag it.":
  - Run `./scripts/verify.sh` (oxlint + tests). For `templates/demo` UI behavior, drive `.cursor/skills/verify/` using its feature map. Use `/maintain-verification-skill` when the map drifts. High-risk rules: `.cursor/skills/when-to-use-formal-verification.md`.
