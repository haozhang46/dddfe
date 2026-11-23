# AGENTS.md — Frontend DDD Template

This project is a **CLI init template** for React + TypeScript apps that keep business rules out of UI and IO. Prefer editing by layer; do not flatten everything into components or a global store.

## Stack

- React + Vite + TypeScript
- `react-router` for app routes + permission guards
- Vitest for Domain (and other pure) unit tests
- Nx `affected:test`: `libs/core-lib` plus every project that depends on it (`libs/order-app`, `libs/admin-app`). The Vite app (`demo`) is its own project.
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

| Layer                 | Owns                                                       | Must not                                             |
| --------------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| `src/domain/<bc>/`    | Model + pure rules (`applyChange`, visibility, derived, …) | Import React, fetch, queue, orchestrator             |
| `src/application/`    | Ports + use cases (timing, call Domain, call ports)        | UI, concrete HTTP clients                            |
| `src/infrastructure/` | Repos, queue, mocks, DTO mapping                           | Business convergence rules                           |
| `src/presentation/`   | Pages, page-local components, shared `components/`         | Call Domain helpers directly from section `onChange` |

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
import { applyChange, createOrderDraft, type OrderDraft } from "../domain/order";
```

Rules:

- Model type name includes the BC: `OrderDraft`, `PayDraft` — not a generic `FormDraft`.
- Factory: `createOrderDraft` / `createPayDraft` (or `createDraft` only inside that package).
- Mutation entry is always `applyChange` — distinguish BCs by import path / namespace, not by renaming to `applyOrderChange`.
- Prefer **Immer `produce` at Domain mutation entries** (`applyChange`, `ensureCityValid`); pipeline steps mutate the draft in place. Outsiders still receive a new immutable draft.
- Domain stays deterministic and side-effect free.

## Application

- Define ports under `application/ports/` (interfaces only).
- One use case file per intent: `loadOrder`, `changeField`, `saveDraft`, …
- `changeField` may call Domain then ports (e.g. load cities after province change). Keep orchestration thin.

## Infrastructure

- Implement ports; put latency, abort, and queue keys here.
- Request coalescing / latest-wins belongs in `RequestQueue` (or equivalent), not Domain.
- Translate upstream payloads in `src/infrastructure/acl/` (`orderAcl`, `authAcl`). Ports keep speaking `OrderDraft` and `authJson`. Word list, translation table, and diagrams: [`docs/glossary-acl.md`](./docs/glossary-acl.md).

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
    base/                 # optional widgets; a file here becomes the only allowed UI for that scenario
```

- Page components render **ViewModel only**; forward edits with `orchestrator.changeField(path, value)`.
- `buildViewModel` projects Domain draft + orchestrator meta (`phase`, `dirty`, options, errors).
- Keep React components free of business convergence (no `if (payType === 'offline') setAmount(null)` in `onChange`).
- Put reusable UI in `presentation/components/`; keep page-specific UI under `pages/<page>/components/`.
- Before adding UI, read [`registry.json`](./registry.json). That index is the list of components that exist. Open [`r/<name>.json`](./r/form.json) for props, when to use it, and the files to import. A new shared component ships with an `r/<name>.json` in the same change; `pnpm registry:check` fails until `registry.json` matches.
- React UI conventions (named hook callbacks, ErrorBoundary per section, hook vs util, no `forwardRef`/`cloneElement` for custom APIs): see monorepo [`.cursor/skills/react-fe-skill/SKILL.md`](../../.cursor/skills/react-fe-skill/SKILL.md).

## Auth + permissions

- Login (before app shell) calls Application `login` → mock `AuthRepository` translates an IdP principal through `authAcl` into `authJson` → `AuthSessionStore` saves to `sessionStorage` key `dddfe.authJson`.
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

## Enforced by lint / format

`pnpm lint` runs **oxlint** plus `oxlint/ddd-plugin.js`. When a check fails, the message names the file or function to use instead. These rules encode the layering above; the prose stays for judgment calls the linter cannot see.

`pnpm fmt` / `pnpm fmt:check` runs **oxfmt** (Oxc formatter, not Prettier). Config: `.oxfmtrc.json`. Fix with `pnpm fmt`, never hand-format around the tool.

`pnpm lint` also runs `oxlint/check-css-bem.js` on `src/**/*.css`.

| Mistake                                                                                         | Check                         |
| ----------------------------------------------------------------------------------------------- | ----------------------------- |
| Domain imports React, fetch, storage, a queue, another layer, or any package other than `immer` | `ddd/domain-purity`           |
| Import of `src/domain/<bc>/someFile` from outside that package                                  | `ddd/domain-barrel`           |
| Application imports UI, infrastructure, `fetch`, or storage                                     | `ddd/application-boundary`    |
| Infrastructure imports UI, or an application use case instead of a port                         | `ddd/infrastructure-boundary` |
| A page section value-imports domain, a use case, or a repository, or calls `applyChange`        | `ddd/section-viewmodel`       |
| A domain function named `applyOrderChange`, `updateOrder`, `mutateDraft`, and similar           | `ddd/apply-change-name`       |
| A native control or third-party widget that duplicates a file in `components/base/`             | `ddd/base-component`          |
| JSX `className` not BEM (`block`, `block__el`, `block--mod`, kebab-case)                        | `ddd/bem-classname`           |
| CSS nesting uses `&__` / `&--` instead of the full child class name                             | `check-css-bem`               |
| Anonymous / arrow callback in `useEffect` / `useLayoutEffect` / `useMemo` / `useCallback`       | `ddd/named-hook-callback`     |
| `cloneElement` / `React.cloneElement` in presentation                                           | `ddd/no-clone-element`        |
| `useImperativeHandle` in presentation (use a hook-returned API object instead)                  | `ddd/no-imperative-handle`    |

### CSS nesting BEM

When nesting CSS, **write the child class in full**. Do not use `&__` / `&--` shorthand.

```css
/* ❌ */
.page {
  &__hint {
    color: #666;
  }
}

/* ✅ */
.page {
  .page__hint {
    color: #666;
  }
}
```

## Base components

Put a shared widget at `src/presentation/components/base/<Name>.tsx` (or `<Name>/index.tsx`). `ddd/base-component` stays quiet until that file exists. The implementation inside `base/` may use the native element. Every other file under `src/` must use the base component. The error names that component.

| When this file exists | Do not write this outside `base/`                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `DatePicker.tsx`      | `<input type="date">`, `datetime-local`, `month`, `week`, `time`; another `DatePicker` import; `react-datepicker`; `@mui/x-date-pickers`   |
| `Form.tsx`            | `<form>`; another `Form` import; `formik`. Zod stays on the page schema; `Form` parses one field and calls `onCommit` only when it matches |
| `Text.tsx`            | `<p>`, `<span>`, `<h1>`–`<h6>`; another `Text` import                                                                                      |
| `Input.tsx`           | `<textarea>`; `<input>` of type text, email, password, search, tel, url, or with no type                                                   |
| `Select.tsx`          | `<select>`                                                                                                                                 |
| `Button.tsx`          | `<button>`                                                                                                                                 |

`<input type="radio">` and `<input type="number">` stay legal. They are not one of these widgets.

Stories for these widgets live next to the implementation (`Button.stories.tsx` and the rest). `pnpm storybook` opens the catalog. `pnpm build-storybook` is part of `pnpm verify`.

## Reference demo behavior (order form)

- Offline: `amount` hidden and `null`; qty changes must not write `amount`.
- Online: `amount = qty * unitPrice`.
- Province change clears `city` and refreshes city options.
- Autosave debounce after successful field change when dirty.

Spec (monorepo / upstream docs, if present): design notes under `docs/` or the parent repository README.
