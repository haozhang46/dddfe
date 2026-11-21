# Agent Guidelines - Lauren Tan's Approach

> **Core Principle**: Trust comes from executable constraints, not prose. This file references verification tools; it doesn't repeat their logic.

---

## 🚨 START HERE: Standard Operating Procedure

**Every time you receive a task**, follow this workflow:

👉 **[Read DDD Development Workflow](./.cursor/skills/ddd-development-workflow.md)** 👈

It contains the complete 7-step SOP:
1. **Clarify requirements** (ASK questions before coding)
2. **Analyze layer impact** (Domain? Application? Infrastructure? Presentation?)
3. **Write tests FIRST** (TDD - tests define correct behavior)
4. **Implement code** (follow layer dependencies)
5. **Run verification** (`./scripts/verify.sh`)
6. **Fix errors autonomously** (read → understand → fix → retry)
7. **Commit & push** (only after verification passes)

**Do NOT skip this.** The skill guides you through every scenario, including error recovery.

### Presentation / React UI

When the change touches React components or hooks under `presentation/` (or template UI):

👉 **[Read React Frontend Conventions](./.cursor/skills/react-fe-skill/SKILL.md)** 👈

- Write a short component breakdown before coding (§1)
- Named functions inside hooks — no anonymous `useEffect(() => …)` (§2)
- Keep page-only UI colocated; promote to `presentation/components/` only when shared (§3)
- Wrap logical page sections in `ErrorBoundary`; prefer Suspense for suspending data (§7–8)
- Still obey DDD write path: UI → orchestrator → use case → Domain (never Domain rules in `onChange`)

---

## Environment bootstrap

```bash
bash .cursor/install.sh          # workspace + templates/demo deps
bash .cursor/start.sh            # demo Vite on :5173 (optional)
./scripts/create-app.sh ../app   # new project from template
```

Template: [`.cursor/environment.json`](./.cursor/environment.json). See [docs/environment-setup.md](./docs/environment-setup.md).

## Quick Verification

Before committing any change:

```bash
./scripts/verify.sh
```

If it passes, your change respects the architecture. If it fails, **fix the code, not the test**.

---

## Architecture Rules (Enforced by Tools)

This repository follows **DDD (Domain-Driven Design)** with strict layer boundaries:

```text
Domain → Application → Infrastructure
  ↓          ↓              ↓
(pure)   (use-cases)   (HTTP, DB)
             ↑              ↑
             └── Presentation ──┘
                  (UI, XState)
```

### What Gets Enforced Automatically

| Rule | Enforced By | Violation Example |
|------|-------------|-------------------|
| Domain is pure (no HTTP, no UI) | oxlint `ddd/domain-purity` | ❌ `import` React / fetch / storage in `domain/` |
| Domain only via barrel outside package | oxlint `ddd/domain-barrel` | ❌ deep import into `domain/<bc>/file` |
| Application depends on Ports, not Infrastructure | oxlint `ddd/application-boundary` | ❌ Application imports Infrastructure / UI |
| Infrastructure stays off UI / use cases | oxlint `ddd/infrastructure-boundary` | ❌ Infrastructure imports React or a use case |
| Section uses ViewModel, not Domain/use case | oxlint `ddd/section-viewmodel` | ❌ Section calls `applyChange` directly |
| JSX className follows BEM | oxlint `ddd/bem-classname` | ❌ `className="saveBar"` / `save_bar` |
| Named hook callbacks (`useEffect` / `useMemo` / …) | oxlint `ddd/named-hook-callback` | ❌ `useEffect(() => …)` |
| No `cloneElement` in presentation | oxlint `ddd/no-clone-element` | ❌ `cloneElement(child, props)` |
| No `useImperativeHandle` in presentation | oxlint `ddd/no-imperative-handle` | ❌ ref + imperative API |
| CSS nested child uses full BEM name | `pnpm lint:css` / `check-css-bem` | ❌ `.page { &__hint {} }` → use `.page__hint` |
| Layer boundaries (extra scan) | optional `pnpm run verify:arch` | secondary to oxlint |

**Primary enforcement:**
- `pnpm lint` → **oxlint** + `templates/demo/oxlint/ddd-plugin.js` (`.oxlintrc.json`)
- `pnpm fmt:check` → **oxfmt** (`.oxfmtrc.json`); fix with `pnpm fmt`

Pre-commit runs both. Not ESLint / Prettier.

**You don't need to remember these rules.** oxlint / oxfmt will stop you if you violate them.

---

## Testing Strategy

### 1. Domain Tests (No Mocks)

Domain is pure, so tests need no network/DB mocks:

```typescript
// ✅ Good - Pure unit test
import { applyChange } from './applyChange';

test('applyChange validates quantity', () => {
  expect(() => applyChange(order, { qty: -1 })).toThrow();
});
```

### 2. Application Tests (Mock Ports)

Application tests mock the Repository **interface**:

```typescript
// ✅ Good - Mock the Port
const mockRepo: OrderRepository = {
  load: async () => mockOrder,
  save: async (o) => o,
};

const useCase = createLoadOrder(mockRepo);
```

### 3. Infrastructure Tests (Real HTTP/Queue)

Test Repository implementations with test doubles or local servers.

### 4. E2E Tests (Playwright)

Test the actual running app with real browser interaction.

### 5. Affected tests (Nx)

Workspace packages are an Nx project graph. `nx affected:test` runs a project's tests and the tests of every project that depends on it.

Changing `packages/core-lib` runs `core-lib`, `order-app`, and `admin-app`. `create-dddfe` does not depend on `core-lib`, so that change leaves it out. `templates/demo` is its own Nx workspace and is copied into apps created by `create-dddfe`. Run `pnpm affected:test` inside the generated app.

```bash
pnpm affected:test --base=main --head=HEAD
pnpm affected:graph
```

---

## Making Changes: The Verification Loop

Lauren Tan's key insight: **Close the feedback loop**. Don't ask humans for verification when machines can do it.

### Workflow

```text
1. Write failing test (TDD)
   ↓
2. Implement the feature
   ↓
3. Run ./scripts/verify.sh
   ↓
4a. ✅ Passes → Commit and push
4b. ❌ Fails → Read error, revise code (go to step 2)
```

**Never modify tests to match broken code.** Tests are the truth. Code must change to satisfy them.

---

## Common Anti-Patterns (Auto-Detected)

The following will **fail verification automatically**. You don't need to remember them:

### ❌ HTTP in Domain

```typescript
// templates/demo/src/domain/order/fetchOrders.ts
export async function fetchOrders() {
  return fetch('/api/orders'); // ❌ Fails: Domain cannot use fetch
}
```

**Fix**: Move HTTP to Infrastructure (Repository implementation)

### ❌ Concrete Infrastructure in Application

```typescript
// templates/demo/src/application/use-cases/loadOrder.ts
import { HttpOrderRepository } from '../../infrastructure/...'; // ❌ Fails

export function createLoadOrder(repo: HttpOrderRepository) { ... }
```

**Fix**: Use the Port (interface) instead:

```typescript
import type { OrderRepository } from '../ports/OrderRepository'; // ✅

export function createLoadOrder(repo: OrderRepository) { ... }
```

### ❌ UI Framework in Domain

```typescript
// templates/demo/src/domain/order/Order.ts
import { useState } from 'react'; // ❌ Fails

export function Order() { ... }
```

**Fix**: Domain should be UI-agnostic. Move UI concerns to Presentation.

---

## When Verification Fails

### Read the Error Message

The verification script will tell you:
- Which check failed
- What file violated the rule
- How to fix it

### Common Failures and Fixes

| Failure | Fix |
|---------|-----|
| `ddd/domain-purity` | Remove UI / fetch / storage / cross-layer imports from `src/domain/` |
| `ddd/domain-barrel` | Import Domain only via `src/domain/<bc>` barrel |
| `ddd/application-boundary` | Application depends on Ports, not Infrastructure / UI |
| `ddd/infrastructure-boundary` | Infrastructure must not import UI or use cases |
| `ddd/section-viewmodel` | Sections talk to ViewModel / orchestrator, not Domain / repos |
| `ddd/named-hook-callback` | Use named function callbacks in `useEffect` / `useMemo` / `useCallback` / `useLayoutEffect` |
| `ddd/no-clone-element` | Prefer render prop / registry instead of `cloneElement` |
| `ddd/no-imperative-handle` | Return API methods from a hook instead of `useImperativeHandle` |
| TypeScript / tests failed | Fix implementation (don't change tests to match broken code) |

### Self-Correcting Process

1. **Read** the error message carefully
2. **Understand** the root cause (not just the symptom)
3. **Fix** the code (not the test or verifier)
4. **Re-run** verification
5. **Repeat** steps 1-4 until all checks pass

**Do NOT ask human for help unless**:
- Error message is unclear (report it)
- You genuinely don't understand the requirement (ask clarifying question)

---

## Adding New Layers

### New Domain Entity

1. Create in `src/domain/<entity>/`
2. Pure TypeScript (no imports from infra/presentation)
3. Add tests in same directory
4. Verify: `./scripts/verify.sh`

### New Repository

1. Define Port in `src/application/ports/`
2. Implement in `src/infrastructure/repositories/`
3. Use RequestQueue for HTTP (see existing examples)
4. Use in use-cases via Port interface

### New Use Case

1. Create in `src/application/use-cases/`
2. Depend only on Ports (not concrete implementations)
3. Return domain objects
4. Add tests that mock Ports

---

## Codebase Gardening

This repository should be **pristine**. Agents copy existing patterns, so:

- **Good patterns spread**: Clean code → More clean code
- **Bad patterns spread**: One workaround → Copied everywhere

### If You See Tech Debt

Don't just fix it and move on. Ask:

1. **Can this be prevented?** → Extend `templates/demo/oxlint/ddd-plugin.js` (oxlint, not ESLint)
2. **Is this a pattern?** → Scan for other occurrences
3. **Can a codemod fix it?** → Write script, don't do manually

The goal is to **prevent recurrence**, not just fix the instance.

---

## Resources

### Project Docs

- [DDD Development Workflow](./.cursor/skills/ddd-development-workflow.md) - **START HERE** for every task
- [SUMMARY](./docs/SUMMARY.md) - Approach overview
- [demo agent.md](./templates/demo/agent.md) - Layering + oxlint rule table
- [Unit Tests in AI](./docs/unit-tests-for-ai-agents.md) - Why tests matter
- [Verification Tools](./docs/verification-tools-setup.md) - oxlint / Playwright / DevTools

### External

- [All Code Is Slop (Except Mine)](https://www.youtube.com/watch?v=O_zcc6Xl12g) - Lauren Tan's talk
- [pstack](https://github.com/poteto/pstack) - Lauren Tan's skill library

---

## Philosophy

> "Make the easy thing the right thing."
> — Lauren Tan

This repository's structure, lints, and tests are designed so that the **simplest path is also the correct path**. If you find yourself fighting the tools, that's a signal that the approach may be wrong.

When in doubt:
1. Read [DDD Development Workflow](./.cursor/skills/ddd-development-workflow.md)
2. Run `./scripts/verify.sh`
3. Read the error
4. Fix the violation (not the verifier)

The verifier is your ally, not your enemy.

---

## Summary: How to Use This System

```text
📋 Receive task
   ↓
📖 Read .cursor/skills/ddd-development-workflow.md
   ↓
❓ Ask clarifying questions (Step 1)
   ↓
🏗️  Analyze layers (Step 2)
   ↓
✅ Write tests FIRST (Step 3)
   ↓
💻 Implement code (Step 4)
   ↓
🔍 Run ./scripts/verify.sh (Step 5)
   ↓
   ├─ ✅ Pass → Commit (Step 7)
   └─ ❌ Fail → Fix & retry (Step 6)
```

**Start every task by reading the skill. Follow it step by step. You'll succeed.** 🚀
