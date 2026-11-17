---
name: pstack-workflow
description: >-
  Project SOP for dddfe. Route every feature, bug fix, refactor, or shipping
  task through pstack /poteto-mode, then enforce this repo's DDD and verify
  gates. Use whenever AGENT.md points here or the user asks for the project SOP.
---

# dddfe SOP = pstack

> **This project's operating procedure is pstack.** There is no separate 7-step
> workflow. `/poteto-mode` owns the steps; this skill only adds repo gates.

## Non-negotiables

1. **Read the poteto-mode skill in full** before acting. Find it under the
   installed pstack plugin (`skills/poteto-mode/SKILL.md`). Follow its
   Principles and Non-negotiables.
2. **Match a playbook.** Open `playbooks/<title>.md` (kebab-case title). Copy
   those steps into the todo list first. No playbook fit → **figure-it-out**.
3. **Apply the project gates below** inside every code playbook (Feature, Bug
   fix, Refactoring, Perf issue, Hillclimb, Prototype, Visual parity, Shipping).
4. **Do not invent a parallel SOP.** Do not fall back to a custom step list
   that bypasses poteto-mode.

## Route (front door)

```text
Task arrives
   ↓
Read poteto-mode skill (full)
   ↓
Match playbook → copy steps to todos
   ↓
Run playbook (architect / swarm / arena / interrogate as poteto says)
   ↓
Project gates (this file) on every verify / before-commit surface
   ↓
Opening a PR / Shipping playbook when shipping
```

Common matches:

| User intent | Playbook |
|-------------|----------|
| New behavior | Feature |
| Defect / regression | Bug fix |
| Structure only, same behavior | Refactoring |
| Measured slowness | Perf issue |
| Metric climb | Hillclimb |
| Read-only question | Investigation |
| Large / no fit | figure-it-out |
| Land the change | Opening a PR → Babysit / Shipping as needed |

Prompt shape (pstack): goal + done check + proof + known facts + real constraints.
Do not prescribe the how.

## Project gates (always)

These are **truth for this repo**. Playbook "verify on the matching surface"
means these surfaces unless the task cannot touch them.

### 1. Architecture (DDD layers)

```text
presentation  →  application  →  domain
      ↓               ↓
infrastructure implements application/ports
```

Before writing or reviewing a diff, name which layers move. Prefer
**principle-model-the-domain** and **principle-boundary-discipline**. Deep
detail: `templates/demo/agent.md` and root `AGENT.md` architecture tables.

oxlint (`pnpm lint` / `ddd-plugin`) enforces purity and boundaries. Do not
weaken rules to land a change.

### 2. Mechanical verification

Before commit / PR:

```bash
./scripts/verify.sh
```

If it fails: read the error → fix **code** (not the test or the verifier) →
re-run. That is poteto **Prove It Works** + **Fix Root Causes** on this repo's
harness.

Optional deeper surfaces when the change warrants them:

| Surface | When |
|---------|------|
| `pnpm --dir templates/demo test` | Domain / application unit behavior |
| `pnpm run verify:arch` | Extra AST layer scan |
| `pnpm run verify:runtime` | Runtime / DevTools path |
| Playwright e2e under `templates/demo` | Cross-layer user flows |

### 3. Product / UI proof

UI or route-guard behavior → run **verify-dddfe**
(`.cursor/skills/verify-dddfe/SKILL.md`): drive the demo the way a user does;
capture evidence. "It compiles" is not a pass.

### 4. Formal / property checks (optional)

State machines, concurrency, money rules, or explicit request → follow
`.cursor/skills/when-to-use-formal-verification.md`, or pstack
`/create-formal-verification-skill` / maintain skills when generating a
project verifier. Skip when none of the triggers apply.

### 5. Tests as behavior truth

- Prefer **principle-test-behavior-not-implementation**.
- Bug fix with a cheap local target → poteto **tdd** skill (failing check
  before fix).
- Feature with clear domain rules → write the observable check before (or as
  the first verifiable unit of) implementation, per
  **principle-sequence-verifiable-units**.
- Never edit tests solely to match a wrong implementation.

## Playbook overlays

### Feature

After poteto Feature steps (trace → architect → throughput checkpoint →
delegate / arena → verify → commits → PR):

- Throughput checkpoint must call out **which DDD layers** are independent vs
  shared.
- Domain changes stay pure; Application talks Ports only.
- Verify = `./scripts/verify.sh` (+ verify-dddfe if UI).

### Bug fix

After poteto Bug fix (repro → binary search → plan → fix → verify → ordered
commits → PR):

- Repro on the real surface (demo UI / verify-dddfe / failing test), not a
  guess.
- Verify = same surface + `./scripts/verify.sh`.

### Refactoring

Zero behavior change. `./scripts/verify.sh` and existing tests must stay green.
Prefer **Laziness Protocol** / **Subtract Before You Add**.

### Opening a PR / Shipping

Mechanical green (`./scripts/verify.sh`) before asking for review. PR prose
via poteto **technical-writing** / **unslop**.

## Anti-patterns (this repo)

| Don't | Do |
|-------|-----|
| Follow a custom 7-step list instead of poteto-mode | Match a playbook |
| Skip `./scripts/verify.sh` because "tests passed locally in one file" | Run the full gate before commit |
| Put fetch / React in `domain/` | Move IO / UI out; keep Domain pure |
| Ask the human how to fix an oxlint / test failure you can read | Fix autonomously; re-verify |
| Declare UI done without driving the app | verify-dddfe (or equivalent user-path proof) |

## Success criteria

Done when:

1. A poteto playbook was matched and its steps were executed (or figure-it-out).
2. Project gates above passed on the matching surfaces.
3. `./scripts/verify.sh` is green for code changes.
4. Evidence of proof is in the reply (command output, verify-dddfe artifacts, or
   failing-then-passing repro), not a vibes claim.

## Quick links

- pstack poteto-mode: plugin `skills/poteto-mode/SKILL.md`
- Project verify skill: [verify-dddfe](../verify-dddfe/SKILL.md)
- Formal-verification decision: [when-to-use-formal-verification.md](../when-to-use-formal-verification.md)
- Layer + oxlint detail: [AGENT.md](../../../AGENT.md), [templates/demo/agent.md](../../../templates/demo/agent.md)
- pstack upstream: https://github.com/poteto/pstack
