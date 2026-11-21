# Cursor Skills for DDD Frontend Development

> **Purpose**: Guide AI agents through standardized workflows in this DDD codebase.

## Available Skills

### 🔄 [DDD Development Workflow](./ddd-development-workflow.md)

**Use when**: Implementing features, fixing bugs, or refactoring code.

**What it does**:
- 7-step SOP from requirements → verification → commit
- TDD workflow (tests before implementation)
- Self-correcting error resolution
- Layer analysis (Domain/Application/Infrastructure/Presentation)

**Quick start**:
```bash
# Agent receives task → Opens this skill → Follows steps 1-7
```

---

### ⚛️ [React Frontend Conventions](./react-fe-skill/SKILL.md)

**Use when**: Writing or refactoring React components / hooks in `presentation/`.

**What it does**:
- Component breakdown before coding (props, responsibility, scope, data flow)
- Named hook callbacks (`useEffect(function syncX() { … })`)
- Page vs global component placement; hook vs util split
- ErrorBoundary + Suspense patterns; avoid `forwardRef` / `cloneElement` for custom APIs
- State guidance (`useState` → context → Zustand) with immutability / immer notes

**Quick start**:
```bash
# Presentation UI change → read react-fe-skill → then follow DDD workflow SOP
```

---

## External skills

Skills in this folder are committed with the repo. They are not in `skills-lock.json`, and `skills remove --all` does not delete them.

External skills are a separate list, managed by the `skills` CLI (`devDependency`):

```bash
pnpm exec skills add vercel-labs/agent-skills --skill vercel-react-best-practices -a cursor -y
pnpm skills:install    # restore skills-lock.json into .agents/skills
pnpm skills:check
pnpm skills:update
```

`templates/demo` has the same scripts and its own lock. Cursor reads `.agents/skills/` and this `.cursor/skills/` directory. It does not read `skills-lock.json`. The CLI needs Node `>=22.20`.

## How Skills Work

### For AI Agents

When you receive a task:

1. **Read the appropriate skill** (usually `ddd-development-workflow.md`)
2. **Follow the steps sequentially**
3. **Do NOT skip steps** (especially verification)
4. **Self-correct** when verification fails (don't ask human)

### For Humans

Skills are:
- ✅ Executable SOPs (not vague guidelines)
- ✅ Decision trees (what to do in each situation)
- ✅ Error recovery procedures (how to fix common failures)
- ❌ NOT just documentation (they're runnable workflows)

---

## Skill Principles (Lauren Tan's Approach)

### 1. Reference Tools, Don't Repeat Logic

❌ **Bad**: "Run TypeScript compiler with `tsc --noEmit`"

✅ **Good**: "Run `./scripts/verify.sh` (starts with `pnpm lint` / oxlint + ddd-plugin)"

**Why**: Tools are deterministic. Skills guide when/why to use them.

### 2. Workflows, Not Instructions

❌ **Bad**: "Make sure to test your code"

✅ **Good**: "Step 5: Run `./scripts/verify.sh`. If it fails, go to Step 6 (Fix Errors)."

**Why**: Clear flow, no ambiguity.

### 3. Self-Correcting Loops

❌ **Bad**: "If tests fail, ask the user what to do"

✅ **Good**: "If tests fail, read error → understand → fix code → re-verify"

**Why**: Agent autonomy. Human only needed for requirements clarification.

---

## Adding New Skills

### When to Add

Add a skill when:
- You find yourself repeatedly explaining the same workflow to agents
- A process has >3 steps
- Errors are common and need standardized recovery

### Template Structure

```markdown
# Skill Name

> **When to use**: [Trigger condition]

## Overview
[Visual workflow diagram]

## Step-by-Step
### Step 1: [Name]
[What to do]
[Example]
[Common errors]

### Step 2: [Name]
...

## Success Criteria
[How to know you're done]

## Quick Reference
[Cheat sheet]
```

### File Naming

- `<action>-<object>-<context>.md`
- Examples:
  - `ddd-development-workflow.md`
  - `debug-xstate-machine.md`
  - `add-new-repository.md`

---

## Skill Maintenance

### Update When

- Agent repeatedly makes the same mistake → Add to "Common Mistakes"
- Verification catches new pattern → Add to checklist
- Workflow changes → Update steps

### Don't Update For

- Individual cases (skills are patterns, not case-by-case fixes)
- Personal preferences (skills enforce team standards)

---

## Integration with Verification

Skills + Verification = Closed Loop

```text
Skill (WORKFLOW)          Verification (TRUTH)
       ↓                          ↓
  Follow steps      →      Run ./scripts/verify.sh
       ↓                          ↓
  Implementation           All checks pass?
       ↓                          ↓
       ← ← ← ← ← ← ← ← ← ←  No: Fix & retry
                                  ↓
                             Yes: Commit
```

**Key**: Verification is objective truth. Skills teach how to satisfy it.

---

## Quick Links

- [DDD Development Workflow](./ddd-development-workflow.md) - Main SOP
- [React Frontend Conventions](./react-fe-skill/SKILL.md) - Presentation React rules
- [Main AGENT.md](../../AGENT.md) - High-level agent guidelines
- [Verification Tools](../../docs/verification-tools-setup.md) - Tool documentation

---

**Start every task by reading [ddd-development-workflow.md](./ddd-development-workflow.md).** 🚀
