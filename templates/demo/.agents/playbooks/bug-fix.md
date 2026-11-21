---
extends: bug-fix
when: Fixing a defect in this scaffolded DDD app.
---

# Bug fix (dddfe template)

Keep pstack Bug fix steps. Verify with `pnpm verify` and oxlint gates.

- **After** "Unit tests show branch behavior, not bug absence.":
  - Run `pnpm verify`. Fix oxlint / layer violations in code, not by weakening the verifier.
