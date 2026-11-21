# Cursor Skills (template)

Project-local skills ship with every app from `create-dddfe`.

| Skill                                                                      | Use                                             |
| -------------------------------------------------------------------------- | ----------------------------------------------- |
| [react-fe-skill](./react-fe-skill/SKILL.md)                                | Presentation / React conventions (when present) |
| [when-to-use-formal-verification.md](./when-to-use-formal-verification.md) | Financial / concurrent / high-risk rules        |

**Entry SOP:** restore pstack via `pnpm skills:install`, then follow **`poteto-mode`** and [`.agents/playbooks/`](../../.agents/playbooks/).

External skills are locked in `skills-lock.json`. Agent reads `.agents/skills/`, not the lock. CLI needs Node `>=22.20`.
