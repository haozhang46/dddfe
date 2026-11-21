---
extends: bug-fix
when: Fixing a defect in this DDD monorepo or templates/demo.
---

# dddfe Bug fix

Keep pstack Bug fix steps. Reproduce and verify with the project driver and oxlint gates.

- **After** "Reproduce it yourself on the matching surface via the driver skill (Non-negotiables), even when a debug or instrumentation protocol says to ask the user to reproduce.":
  - For `templates/demo` UI bugs, use `.cursor/skills/verify/` (`node .cursor/skills/verify/control.mjs`) and the matching feature file under `.cursor/skills/verify/features/`.
- **After** "Unit tests show branch behavior, not bug absence.":
  - Run `./scripts/verify.sh`. Fix oxlint / layer violations in code, not by weakening the verifier.
