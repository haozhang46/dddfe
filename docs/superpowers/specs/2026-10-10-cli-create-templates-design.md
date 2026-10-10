# CLI Create + Multi-Template Repo Design

**Date:** 2026-10-10  
**Status:** Approved (brainstorm)  
**Goal:** Turn `dddfe` into a same-repo CLI + templates scaffold. First template is the existing order-form DDD demo; more templates can be added later under `templates/`.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Layout | Flat: `packages/create-dddfe` + `templates/*` (pnpm workspace) |
| Templates in v1 | Only `templates/demo` (move current `demo/`) |
| Invoke | Both `create-dddfe` (for `pnpm`/`npm create`) and local workspace bin |
| Create steps | Copy + rename `package.json` name + `pnpm install` + `git init` |
| Split of work | CLI: copy + rename. Makefile: `pnpm install` + `git init` |
| Publish | Package structured for npm; **do not publish** in v1 |

## Architecture

```text
dddfe/
  package.json                 # private workspace root
  pnpm-workspace.yaml          # packages/*
  Makefile                     # make create NAME=… TEMPLATE=demo
  README.md
  packages/
    create-dddfe/              # publishable CLI (unpublished in v1)
      package.json             # name: create-dddfe, bin: create-dddfe
      src/index.ts
  templates/
    demo/                      # former demo/ — standalone Vite app
  docs/                        # maintainer specs/plans (not copied into apps)
```

- Templates are **not** workspace members (avoids installing them as packages).
- Root docs (`docs/`, design notes at repo root) stay for maintainers; they are not part of generated projects.

## CLI behavior (`create-dddfe`)

**Usage:**

```bash
create-dddfe <project-name> [--template demo]
```

Default `--template` is `demo`.

**Steps (CLI only):**

1. Resolve template dir: `<repo>/templates/<template>` (when running from published package, resolve relative to package install location that embeds/copies `templates` — see Packaging).
2. Fail if template missing or target directory already exists.
3. Copy template → `<cwd>/<project-name>/`, excluding: `node_modules`, `dist`, `.git`, `*.tsbuildinfo`, `.DS_Store`.
4. Set target `package.json` `"name"` to `<project-name>`.
5. Print next steps (`cd`, `pnpm install`, or `make create` when in-repo).

**Out of scope for CLI in v1:** `--install`, interactive prompts, placeholder templating beyond `package.json` name.

**Errors:** unknown template / existing dir → non-zero exit + short message.

## Makefile

```make
# make create NAME=../my-app TEMPLATE=demo
# NAME is a path relative to cwd (usually repo root). Prefer creating *outside* this repo.
create:
	pnpm exec create-dddfe $(NAME) --template $(or $(TEMPLATE),demo)
	cd $(NAME) && pnpm install && git init
```

- In-repo one-shot full flow: `make create NAME=../my-app`.
- Creating inside the monorepo root is allowed but not recommended (pollutes the template repo).
- `pnpm create` / `npm create` users only get CLI steps; README documents manual install/git.

## Template conventions

Each `templates/<name>/` is a **standalone project root**:

- Own `package.json`, `src/`, `agent.md` (or `AGENTS.md`)
- No dependency on sibling packages in this monorepo
- Keep `pnpm-lock.yaml` so installs are reproducible after copy

**v1:** migrate `demo/` → `templates/demo/` as-is (content). Name in template `package.json` may remain `demo`; CLI overwrites on create.

**Adding a template later:** add `templates/<name>/` following the same rules; no CLI change required if discovery is filesystem-based.

## Packaging (`create-dddfe`)

- `package.json`: `"bin": { "create-dddfe": "./dist/index.js" }` (or `./bin/create-dddfe.js` shim), `"files"` includes compiled CLI **and** a copy of / path to templates needed at runtime.
- v1 approach for templates at runtime:
  - **Dev / workspace:** resolve `../../templates` from the package.
  - **Published (future):** include `templates/` in the npm package `files` (or a subset), resolve relative to package root.
- TypeScript + build step for the CLI; workspace root scripts may expose `create-dddfe` via pnpm.

## Testing

Light unit tests for the CLI:

- Unknown template → failure
- Target exists → failure
- Happy path: copies files, sets `package.json` name, skips excluded dirs

No Vite e2e for the generated app in this change.

## Non-goals (v1)

- Publishing to npm
- Multiple real templates beyond `demo`
- Template variable engine (`{{name}}` in many files)
- Auto-install / git inside the Node CLI
- Moving maintainer `docs/` into templates

## Migration checklist (implementation)

1. Add workspace root + `pnpm-workspace.yaml`
2. Add `packages/create-dddfe` with bin, copy/rename logic, tests
3. `git mv demo templates/demo` (or equivalent)
4. Update root `.gitignore` / README / Makefile
5. Verify: `pnpm exec create-dddfe tmp-app --template demo` then Makefile path
