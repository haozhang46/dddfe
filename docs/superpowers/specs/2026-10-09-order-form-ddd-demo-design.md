# Order Form DDD Demo — Design Spec

**Date:** 2026-10-09  
**Status:** Approved  
**Stack:** React + Vite + TypeScript  
**Orchestration:** Thin reducer + single `changeField` pipeline (no XState in this demo)

## 1. Goal

Implement a runnable order-form demo that proves the layering discussed in `frontend-ddd-xstate-request-queue.md` and subsequent design decisions:

- Domain owns pure business convergence (`applyChange`)
- Application owns use-case timing (IO + calling Domain)
- Infrastructure owns mock HTTP + request queue
- Presentation owns ViewModel render + thin `onChange` forwarding
- One field (`amount`) has **two write sources**, resolved deterministically

## 2. Out of Scope

- XState
- Real backend
- Auth / i18n / design-system polish
- Multi-aggregate / multi-BC split

## 3. Domain Model

```ts
type PayType = 'online' | 'offline';

type FormDraft = {
  id: string;
  version: number;
  payType: PayType;
  qty: number;
  unitPrice: number; // fen, fixed for demo (e.g. 100)
  amount: number | null; // fen; null when hidden
  province: string;
  city: string;
};
```

### 3.1 Dual sources for `amount`

| Source | Trigger | Rule |
|--------|---------|------|
| Visibility | `payType` change (and every convergence) | If `payType === 'offline'` → `amount = null` (field hidden) |
| Derived calc | `qty` / `unitPrice` / switch to `online` | If `payType === 'online'` → `amount = qty * unitPrice` |

User cannot manually edit `amount` in this demo (always derived or cleared). That makes the dual-source race obvious and testable.

### 3.2 Convergence order (Domain, pure)

`applyChange(draft, { path, value })`:

1. `setPath` — apply the user edit  
2. `applyReactions` — e.g. province change clears `city`  
3. `applyDerived` — compute `amount` only when online  
4. `applyVisibility` — force `amount = null` when offline (last, highest priority)

Idempotent: running twice on the same inputs yields the same draft.

### 3.3 Other Domain rules

- `isAmountVisible(draft) => draft.payType === 'online'`
- `ensureCityValid(draft, cityOptions)` — if current city not in options, clear city
- `canSubmit(draft)` — online requires amount > 0; always requires province + city; qty >= 1

## 4. Application

### 4.1 Ports

```ts
interface OrderRepository {
  load(orderId: string, signal?: AbortSignal): Promise<FormDraft>;
  saveDraft(draft: FormDraft, expectedVersion: number, signal?: AbortSignal): Promise<FormDraft>;
}

interface CityQuery {
  listByProvince(province: string, signal?: AbortSignal): Promise<Option[]>;
}

type Option = { value: string; label: string };
```

### 4.2 Use cases

| Use case | Behavior |
|----------|----------|
| `loadOrder` | Repo load → return draft |
| `changeField` | `applyChange` → if path is `province`, `loadCities` + `ensureCityValid` → return `{ draft, cityOptions? }` |
| `saveDraft` | Persist with `expectedVersion`; bump version in mock |
| `loadCities` | Query cities for province |

**No Super-Application layer.** Coarse `changeField` may call fine `loadCities`.

### 4.3 Single entry pipeline

All UI field edits call `changeField(path, value)` only. Sections must not call ports or Domain helpers directly.

## 5. Infrastructure

- In-memory / delayed mock (`setTimeout` 200–400ms) for order + cities
- `RequestQueue` with key `order:write:${id}` latest-wins for saves; `cities:${province}` for city loads
- DTO mapping optional (can map 1:1 for mock)

Mock data:

- Provinces: `浙江`, `江苏` (static in Presentation or Domain constants)
- Cities: 浙江 → 杭州/宁波；江苏 → 南京/苏州

## 6. Presentation

### 6.1 Orchestrator state (reducer)

```ts
type Phase = 'idle' | 'loading' | 'editing' | 'saving' | 'submitting';

type OrchestratorState = {
  phase: Phase;
  draft: FormDraft | null;
  cityOptions: Option[];
  error: string | null;
  epoch: number;
  dirty: boolean;
  lastSavedAt: number | null;
};
```

Reducer is pure phase/meta updates. Async work lives in orchestrator effects around `dispatch`, not inside `reduce`.

### 6.2 ViewModel

```ts
type FormViewModel = {
  values: FormDraft;
  ui: {
    amountVisible: boolean;
    cityOptions: Option[];
    saving: boolean;
    phase: Phase;
  };
  errors: Partial<Record<keyof FormDraft | 'form', string>>;
  canSubmit: boolean;
};
```

`buildViewModel(state)` projects Domain + orchestrator meta. Components render **only** ViewModel.

### 6.3 UI sections

- `PaySection` — payType  
- `QtySection` — qty  
- `AmountSection` — read-only amount when visible  
- `AddressSection` — province + city  
- `SaveBar` — dirty / saving / manual save / submit (submit can alert JSON for demo)

All `onChange` → `facade.changeField`.

### 6.4 Autosave

Debounce 400ms after successful `changeField` when `dirty`. Uses Application `saveDraft` + queue. On success update `version` only; do not reset in-progress typing incorrectly (draft already local).

## 7. Directory Layout

```text
demo/
  package.json
  vite.config.ts
  index.html
  src/
    domain/order/
      FormDraft.ts
      applyChange.ts
      visibility.ts
      derived.ts
      ensureCityValid.ts
      canSubmit.ts
    application/
      ports/OrderRepository.ts
      ports/CityQuery.ts
      use-cases/loadOrder.ts
      use-cases/changeField.ts
      use-cases/saveDraft.ts
      use-cases/loadCities.ts
    infrastructure/
      queue/RequestQueue.ts
      mock/delay.ts
      mock/cityData.ts
      repositories/MockOrderRepository.ts
      repositories/MockCityQuery.ts
    presentation/
      buildViewModel.ts
      orchestrator.ts
      OrderFormPage.tsx
      sections/*.tsx
    App.tsx
    main.tsx
  src/domain/order/applyChange.test.ts
```

## 8. Acceptance Criteria

1. Switch to `offline`: amount hidden; draft.amount is `null`; changing qty does not set amount.  
2. Switch to `online`: amount visible and equals `qty * unitPrice`; changing qty updates amount.  
3. Change province: city cleared; city options refresh to that province.  
4. Invalid city after province change is cleared via `ensureCityValid`.  
5. Autosave or manual save bumps `version` (visible in UI).  
6. Domain unit tests cover dual-source `amount` cases.  
7. `pnpm install && pnpm dev` runs the demo; `pnpm test` runs Domain tests.

## 9. Dependencies

- `react`, `react-dom`
- `vite`, `typescript`, `@vitejs/plugin-react`
- `vitest` for Domain tests

No Redux / XState / form libraries in this demo.
