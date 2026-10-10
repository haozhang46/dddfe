# AGENTS.md — Frontend DDD Template

This project is a **CLI init template** for React + TypeScript apps that keep business rules out of UI and IO. Prefer editing by layer; do not flatten everything into components or a global store.

## Stack

- React + Vite + TypeScript
- `react-router` for app routes + permission guards
- Vitest for Domain (and other pure) unit tests
- Orchestrator: thin reducer + effects (not Redux / XState in the default scaffold)
- Package manager: `pnpm`

```bash
pnpm install
pnpm dev
pnpm test
pnpm lint
```

## Layers (dependency direction)

```
presentation  →  application  →  domain
      ↓               ↓
infrastructure implements application/ports
```

| Layer | Owns | Must not |
|-------|------|----------|
| `src/domain/<bc>/` | Model + pure rules (`applyChange`, visibility, derived, …) | Import React, fetch, queue, orchestrator |
| `src/application/` | Ports + use cases (timing, call Domain, call ports) | UI, concrete HTTP clients |
| `src/infrastructure/` | Repos, queue, mocks, DTO mapping | Business convergence rules |
| `src/presentation/` | Pages, page-local components, shared `components/` | Call Domain helpers directly from section `onChange` |

**Single write path for field edits:** UI → `orchestrator.changeField` → use case `changeField` → Domain `applyChange` → (optional IO) → `dispatch` → `buildViewModel` → UI.

## Domain package layout (every bounded context)

Use the **same entry names** in every BC; the folder name carries the domain.

```text
src/domain/<bc>/
  model.ts          # <Bc>Draft type, create<Bc>Draft, setPath, FieldPath, FieldChange
  applyChange.ts    # ★ unified mutation entry: setPath → reactions → derived → visibility
  index.ts          # public barrel — outsiders import only from here
  reactions.ts      # optional sync linkages
  derived.ts        # optional calculated fields
  visibility.ts     # optional show/hide + nulling
  canSubmit.ts      # optional invariants for submit
  *.test.ts         # pure tests; no DOM / network
```

Example (`order`):

```ts
import { applyChange, createOrderDraft, type OrderDraft } from '../domain/order'
```

Rules:

- Model type name includes the BC: `OrderDraft`, `PayDraft` — not a generic `FormDraft`.
- Factory: `createOrderDraft` / `createPayDraft` (or `createDraft` only inside that package).
- Mutation entry is always `applyChange` — distinguish BCs by import path / namespace, not by renaming to `applyOrderChange`.
- Prefer **shallow immutable updates** (`{ ...draft, field }`) when the draft is flat primitives; deep-clone only for nested structures.
- Domain stays deterministic and side-effect free.

## Application

- Define ports under `application/ports/` (interfaces only).
- One use case file per intent: `loadOrder`, `changeField`, `saveDraft`, …
- `changeField` may call Domain then ports (e.g. load cities after province change). Keep orchestration thin.

## Infrastructure

- Implement ports; put latency, abort, and queue keys here.
- Request coalescing / latest-wins belongs in `RequestQueue` (or equivalent), not Domain.

## Presentation

```text
src/presentation/
  router.tsx              # route table
  auth/                   # AuthProvider + createAuthDeps (session from sessionStorage)
  pages/<page>/           # page entry + page-owned wiring
    index.tsx             # page entry (default import surface)
    orchestrator.ts       # optional
    buildViewModel.ts
    createDeps.ts
    components/           # components used only by this page
  components/             # shared / common UI (RequireAuth, RequirePermission, Can, …)
```

- Page components render **ViewModel only**; forward edits with `orchestrator.changeField(path, value)`.
- `buildViewModel` projects Domain draft + orchestrator meta (`phase`, `dirty`, options, errors).
- Keep React components free of business convergence (no `if (payType === 'offline') setAmount(null)` in `onChange`).
- Put reusable UI in `presentation/components/`; keep page-specific UI under `pages/<page>/components/`.

## Auth + permissions

- Login (before app shell) calls Application `login` → mock `AuthRepository` returns `authJson` → `AuthSessionStore` saves to `sessionStorage` key `dddfe.authJson`.
- Domain `user` BC: `parseAuthJson`, `hasPermission`, `canAccessRoute` (pure). Outsiders import from `domain/user` barrel only.
- **Route permissions are enforced** via `RequireAuth` + `RequirePermission` in `router.tsx`.
- **Button / field permissions** use the `Can` / `hasPermission` scaffold (demo: Submit gated by `order:submit`). Do not invent ad-hoc permission checks in section `onChange`.

## Adding a new bounded context

1. Create `src/domain/<bc>/` with `model.ts`, `applyChange.ts` (when the BC mutates a draft), `index.ts` (+ rules as needed). For `user`, prefer `model.ts` + `permissions.ts` (no form `applyChange`).
2. Add ports + use cases under `application/`.
3. Add infrastructure adapters.
4. Wire deps in presentation (`createDeps` / orchestrator / `AuthProvider`) and UI sections.
5. Cover Domain rules with Vitest before wiring UI.
6. New protected pages: add a route under `RequirePermission` with the required permission code.

## Do / Don't

**Do**

- Put dual-source / race-prone field rules in Domain convergence order and unit-test them.
- Import Domain only via `src/domain/<bc>` barrel from outside the package.
- Keep `reduce` pure; async work around `dispatch`.

**Don't**

- Put fetch / `RequestQueue` / React hooks inside `domain/`.
- Bypass `changeField` from a section (no direct repo or `applyChange` in components).
- Invent a different mutation entry name per BC (`applyPayChange`, `updateOrder`, …) without a strong reason.
- Treat the orchestrator as the Domain — it is presentation/application state machinery.

## Reference demo behavior (order form)

- Offline: `amount` hidden and `null`; qty changes must not write `amount`.
- Online: `amount = qty * unitPrice`.
- Province change clears `city` and refreshes city options.
- Autosave debounce after successful field change when dirty.

Spec (monorepo / upstream docs, if present): design notes under `docs/` or the parent repository README.
