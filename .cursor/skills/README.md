# Cursor Skills for DDD Frontend Development

> **Purpose**: Point agents at **pstack** as the project SOP, plus repo-local
> verification skills.

## Available Skills

### 🔄 [pstack-workflow](./pstack-workflow/SKILL.md) — project SOP

**Use when**: Any feature, bug fix, refactor, or shipping task.

**What it does**:
- Declares this repo's SOP = **pstack `/poteto-mode`** (no separate 7-step list)
- Matches a poteto playbook and runs it
- Adds dddfe gates: DDD layers, `./scripts/verify.sh`, **verify-dddfe**

**Quick start**:
```text
# Agent receives task → Read pstack-workflow → Read poteto-mode → Match playbook
```

### 🧪 [verify-dddfe](./verify-dddfe/SKILL.md)

**Use when**: Proving login, amount, address, or route-guard behavior in the
demo UI, or when a UI change needs a runtime check.

### 📐 [when-to-use-formal-verification.md](./when-to-use-formal-verification.md)

**Use when**: Deciding whether state machines, concurrency, money, or security
rules need formal / property-based checks (alongside pstack formal-verification
skills).

---

## How Skills Work

### For AI Agents

When you receive a task:

1. **Read [pstack-workflow](./pstack-workflow/SKILL.md)**
2. **Read the poteto-mode skill** (pstack plugin) and match a playbook
3. **Do not skip verification** (`./scripts/verify.sh`, verify-dddfe when UI)
4. **Self-correct** when verification fails (don't ask human)

### For Humans

Skills are:
- ✅ Executable SOPs (pstack playbooks + project gates)
- ✅ Decision trees (which playbook / which verify surface)
- ✅ Error recovery (fix root cause → re-verify)
- ❌ NOT a second workflow competing with pstack

---

## Skill Principles (Lauren Tan / pstack)

### 1. Reference Tools, Don't Repeat Logic

❌ **Bad**: "Run TypeScript compiler with `tsc --noEmit`"

✅ **Good**: "Run `./scripts/verify.sh` (starts with `pnpm lint` / oxlint + ddd-plugin)"

### 2. Playbooks, Not Ad-Hoc Steps

❌ **Bad**: "Make sure to test your code"

✅ **Good**: "Match Feature / Bug fix playbook. Verify on the matching surface.
If it fails, fix root cause and re-verify."

### 3. Self-Correcting Loops

❌ **Bad**: "If tests fail, ask the user what to do"

✅ **Good**: "If tests fail, read error → understand → fix code → re-verify"

---

## Adding New Skills

Add a skill when:
- You find yourself repeatedly explaining the same workflow to agents
- A process has >3 steps
- Errors are common and need standardized recovery

Prefer extending **pstack** (or a thin project overlay like `pstack-workflow`)
over inventing a parallel SOP.

### File Naming

- Folder skills: `<name>/SKILL.md` (Cursor skill format)
- Flat docs: `<topic>.md` when they are decision guides, not the front-door SOP

---

## Integration with Verification

```text
pstack playbook (WORKFLOW)     Verification (TRUTH)
       ↓                              ↓
  Match + execute      →      ./scripts/verify.sh
       ↓                              ↓
  Implementation              All checks pass?
       ↓                              ↓
       ← ← ← ← ← ← ← ← ← ←  No: Fix & retry
                                  ↓
                             Yes: Commit / PR
```

UI paths also use **verify-dddfe**. Verification is objective truth. Skills
teach how to satisfy it.

---

## Quick Links

- [pstack-workflow](./pstack-workflow/SKILL.md) — Main SOP
- [Main AGENT.md](../../AGENT.md) — Architecture + verify tables
- [Verification Tools](../../docs/verification-tools-setup.md) — Tool documentation
- [pstack](https://github.com/poteto/pstack) — Upstream skill library

---

**Start every task by reading [pstack-workflow](./pstack-workflow/SKILL.md).**
