# Order Form DDD Demo — Implementation Plan

> **For agentic workers:** Implement task-by-task; check off steps as done.

**Goal:** Ship a Vite React TS order-form demo with Domain `applyChange`, Application `changeField`, mock Infra queue, and ViewModel UI proving dual-source `amount`.

**Architecture:** Single `changeField` pipeline; Domain pure convergence; Presentation reducer + `buildViewModel`; mock repos with `RequestQueue`.

**Tech Stack:** React 18, Vite, TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-09-order-form-ddd-demo-design.md`

## Global Constraints

- No XState / Redux / form libs
- All field edits → `changeField` only
- Domain has zero fetch/queue imports
- Demo lives under `demo/`

---

### Task 1: Scaffold Vite app + Vitest

**Files:**
- Create: `demo/package.json`, `demo/vite.config.ts`, `demo/tsconfig.json`, `demo/tsconfig.app.json`, `demo/tsconfig.node.json`, `demo/index.html`, `demo/src/main.tsx`, `demo/src/App.tsx`, `demo/src/vite-env.d.ts`

- [ ] Scaffold and verify `pnpm install` + `pnpm dev` boots

---

### Task 2: Domain + tests

**Files:**
- Create: `demo/src/domain/order/*.ts`, `demo/src/domain/order/applyChange.test.ts`

- [ ] Implement `FormDraft`, `applyChange`, visibility/derived/reactions, `ensureCityValid`, `canSubmit`
- [ ] Tests: offline clears amount; online derives; qty under offline does not set amount; province clears city
- [ ] `pnpm test` passes

---

### Task 3: Application ports + use cases

**Files:**
- Create: `demo/src/application/ports/*.ts`, `demo/src/application/use-cases/*.ts`

- [ ] `changeField` calls `applyChange`, optionally `loadCities` + `ensureCityValid`

---

### Task 4: Infrastructure mock + queue

**Files:**
- Create: `demo/src/infrastructure/**/*.ts`

- [ ] `RequestQueue`, `MockOrderRepository`, `MockCityQuery` with delay

---

### Task 5: Presentation orchestrator + UI

**Files:**
- Create: `demo/src/presentation/**/*`

- [ ] Orchestrator with load / changeField / debounced save
- [ ] `buildViewModel` + sections + `OrderFormPage`
- [ ] Wire `App.tsx`
- [ ] Manual verify acceptance criteria in browser

---

## Spec coverage

| Spec section | Task |
|--------------|------|
| Dual-source amount | Task 2 |
| changeField pipeline | Task 3, 5 |
| Queue + mock | Task 4 |
| ViewModel UI | Task 5 |
| Acceptance / test scripts | Task 1, 2, 5 |
