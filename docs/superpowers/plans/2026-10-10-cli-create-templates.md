# CLI Create + Multi-Template Repo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the repo into `packages/create-dddfe` + `templates/demo`, with a CLI that copies a template and renames `package.json`, plus a Makefile that runs install + `git init`.

**Architecture:** pnpm workspace root owns only `packages/*`. Templates live at `templates/<name>` outside the workspace. The CLI resolves templates via `../../templates` in workspace (and `./templates` when published later). Makefile wraps CLI then `pnpm install` + `git init`.

**Tech Stack:** Node.js (ESM), TypeScript, vitest, pnpm workspaces, Make

## Global Constraints

- CLI does **only** copy + rename; Makefile does install + git init
- Default template: `demo`
- Do **not** publish to npm in this plan
- Exclude from copy: `node_modules`, `dist`, `.git`, `*.tsbuildinfo`, `.DS_Store`
- Prefer creating apps outside the monorepo (`NAME=../my-app`)

---

### Task 1: Workspace root + move demo → templates/demo

**Files:**
- Create: `package.json` (repo root)
- Create: `pnpm-workspace.yaml`
- Modify: `.gitignore`
- Move: `demo/` → `templates/demo/`
- Create: `README.md` (repo root) — brief; expanded in Task 4 if needed

**Interfaces:**
- Produces: `templates/demo/package.json` exists; workspace includes `packages/*` only

- [ ] **Step 1: Create workspace root files**

`pnpm-workspace.yaml`:
```yaml
packages:
  - 'packages/*'
```

Root `package.json`:
```json
{
  "name": "dddfe",
  "private": true,
  "type": "module",
  "scripts": {
    "create": "pnpm --filter create-dddfe exec create-dddfe",
    "test": "pnpm --filter create-dddfe test"
  },
  "engines": {
    "node": ">=20"
  },
  "packageManager": "pnpm@10.28.0"
}
```

(Use whatever `pnpm -v` reports if different.)

- [ ] **Step 2: Move demo**

```bash
mkdir -p templates
git mv demo templates/demo
```

If untracked files block `git mv`, move with `mv` then `git add`.

- [ ] **Step 3: Update root `.gitignore`**

Replace demo-prefixed ignores with:

```gitignore
**/node_modules/
**/dist/
.DS_Store
*.local
.env
.env.*
.idea/
.vscode/
*.tsbuildinfo
```

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-workspace.yaml .gitignore templates/demo
git commit -m "chore: workspace root and move demo to templates/demo"
```

---

### Task 2: CLI package — failing tests first (TDD)

**Files:**
- Create: `packages/create-dddfe/package.json`
- Create: `packages/create-dddfe/tsconfig.json`
- Create: `packages/create-dddfe/vitest.config.ts`
- Create: `packages/create-dddfe/src/create.ts`
- Create: `packages/create-dddfe/src/create.test.ts`
- Create: `packages/create-dddfe/src/index.ts`
- Create: `packages/create-dddfe/bin/create-dddfe.js`

**Interfaces:**
- Produces:
  - `parseArgs(argv: string[]): { projectName: string; template: string }`
  - `resolveTemplatesRoot(packageRoot: string): string`
  - `createProject(opts: { projectName: string; template: string; cwd: string; templatesRoot: string }): Promise<string>`
  - Returns absolute path of created project; throws `Error` with short message on failure

- [ ] **Step 1: Scaffold package.json + tsconfig + vitest**

`packages/create-dddfe/package.json`:
```json
{
  "name": "create-dddfe",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "bin": {
    "create-dddfe": "./bin/create-dddfe.js"
  },
  "files": [
    "dist",
    "bin",
    "templates"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "prepublishOnly": "pnpm run build"
  },
  "devDependencies": {
    "@types/node": "^24.13.3",
    "typescript": "~6.0.2",
    "vitest": "^5.0.3"
  },
  "engines": {
    "node": ">=20"
  }
}
```

`tsconfig.json`: outDir `dist`, rootDir `src`, module NodeNext, target ES2022, strict true, declaration true.

`vitest.config.ts`: `test: { include: ['src/**/*.test.ts'] }`

`bin/create-dddfe.js`:
```js
#!/usr/bin/env node
import('../dist/index.js')
```

- [ ] **Step 2: Write failing tests** in `src/create.test.ts`

```ts
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createProject, parseArgs } from './create.js'

const dirs: string[] = []
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})

function makeTemplatesRoot() {
  const root = mkdtempSync(join(tmpdir(), 'dddfe-tpl-'))
  dirs.push(root)
  const demo = join(root, 'demo')
  mkdirSync(join(demo, 'src'), { recursive: true })
  writeFileSync(join(demo, 'package.json'), JSON.stringify({ name: 'demo', version: '0.0.0' }))
  writeFileSync(join(demo, 'src', 'hi.txt'), 'hi')
  mkdirSync(join(demo, 'node_modules', 'x'), { recursive: true })
  writeFileSync(join(demo, 'node_modules', 'x', 'a'), 'skip')
  mkdirSync(join(demo, 'dist'), { recursive: true })
  writeFileSync(join(demo, 'dist', 'out.js'), 'skip')
  return root
}

describe('parseArgs', () => {
  it('defaults template to demo', () => {
    expect(parseArgs(['my-app'])).toEqual({ projectName: 'my-app', template: 'demo' })
  })
  it('reads --template', () => {
    expect(parseArgs(['my-app', '--template', 'demo'])).toEqual({
      projectName: 'my-app',
      template: 'demo',
    })
  })
})

describe('createProject', () => {
  it('fails on unknown template', async () => {
    const templatesRoot = makeTemplatesRoot()
    const cwd = mkdtempSync(join(tmpdir(), 'dddfe-cwd-'))
    dirs.push(cwd)
    await expect(
      createProject({ projectName: 'app', template: 'nope', cwd, templatesRoot }),
    ).rejects.toThrow(/unknown template/i)
  })

  it('fails when target exists', async () => {
    const templatesRoot = makeTemplatesRoot()
    const cwd = mkdtempSync(join(tmpdir(), 'dddfe-cwd-'))
    dirs.push(cwd)
    mkdirSync(join(cwd, 'app'))
    await expect(
      createProject({ projectName: 'app', template: 'demo', cwd, templatesRoot }),
    ).rejects.toThrow(/already exists/i)
  })

  it('copies files, renames package, skips excluded dirs', async () => {
    const templatesRoot = makeTemplatesRoot()
    const cwd = mkdtempSync(join(tmpdir(), 'dddfe-cwd-'))
    dirs.push(cwd)
    const dest = await createProject({
      projectName: 'my-app',
      template: 'demo',
      cwd,
      templatesRoot,
    })
    expect(dest).toBe(join(cwd, 'my-app'))
    expect(existsSync(join(dest, 'src', 'hi.txt'))).toBe(true)
    expect(existsSync(join(dest, 'node_modules'))).toBe(false)
    expect(existsSync(join(dest, 'dist'))).toBe(false)
    const pkg = JSON.parse(readFileSync(join(dest, 'package.json'), 'utf8'))
    expect(pkg.name).toBe('my-app')
  })
})
```

- [ ] **Step 3: Run tests — expect FAIL**

```bash
cd packages/create-dddfe && pnpm install && pnpm test
```

Expected: fail (module not found / createProject missing)

- [ ] **Step 4: Implement `src/create.ts` + thin `src/index.ts`**

Implement:
- `parseArgs`: first non-flag arg = projectName; `--template <name>` optional
- `resolveTemplatesRoot(packageRoot)`: if `join(packageRoot,'templates')` exists use it; else `join(packageRoot,'..','..','templates')` resolved
- `createProject`: validate, `fs.cp` with filter, rewrite package.json name
- `index.ts`: parse `process.argv.slice(2)`, resolve templates from `fileURLToPath(import.meta.url)` package root (`../..` from `dist/index.js` → package root), call createProject, print next steps, `process.exit(1)` on error

Filter excludes directory/file basenames: `node_modules`, `dist`, `.git`, `.DS_Store`, and names ending in `.tsbuildinfo`.

For project names that are paths (`../my-app`), use `path.resolve(cwd, projectName)` as destination; set package `name` to `path.basename` of that path (npm-safe: lowercase basename).

- [ ] **Step 5: Run tests — expect PASS**

```bash
pnpm --filter create-dddfe test
```

- [ ] **Step 6: Build + smoke**

```bash
pnpm --filter create-dddfe build
pnpm exec create-dddfe /tmp/dddfe-smoke-app --template demo
# expect /tmp/dddfe-smoke-app/package.json name dddfe-smoke-app
rm -rf /tmp/dddfe-smoke-app
```

- [ ] **Step 7: Commit**

```bash
git add packages/create-dddfe package.json pnpm-lock.yaml
git commit -m "feat(create-dddfe): copy template and rename package.json"
```

---

### Task 3: Makefile + README

**Files:**
- Create: `Makefile`
- Create or replace: `README.md` (repo root)

- [ ] **Step 1: Add Makefile**

```makefile
TEMPLATE ?= demo

.PHONY: create
create:
ifndef NAME
	$(error NAME is required, e.g. make create NAME=../my-app)
endif
	pnpm exec create-dddfe $(NAME) --template $(TEMPLATE)
	cd $(NAME) && pnpm install && git init
```

- [ ] **Step 2: Write root README** covering: templates list, `pnpm --filter create-dddfe test`, `pnpm exec create-dddfe ../my-app`, `make create NAME=../my-app`, how to add a template under `templates/<name>`, note that npm publish is not done yet.

- [ ] **Step 3: Commit**

```bash
git add Makefile README.md
git commit -m "docs: Makefile create flow and root README"
```

---

### Task 4: Verify end-to-end

- [ ] **Step 1:** `pnpm test` at root passes
- [ ] **Step 2:** `make create NAME=/tmp/dddfe-e2e TEMPLATE=demo` succeeds (install + git init); then `rm -rf /tmp/dddfe-e2e`
- [ ] **Step 3:** Confirm `templates/demo` still has `agent.md` and runs `pnpm test` inside the template if deps present (optional; skip if node_modules absent — run install in template only if needed for sanity)

---

## Spec coverage (self-review)

| Spec item | Task |
|-----------|------|
| Workspace + packages/create-dddfe + templates/* | 1, 2 |
| Move demo | 1 |
| CLI copy + rename only | 2 |
| Makefile install + git | 3 |
| Publishable structure, no publish | 2 (`files`, private true for now — set `"private": false` only when publishing; keep private:true in v1) |
| Tests: unknown / exists / happy | 2 |
| README | 3 |
