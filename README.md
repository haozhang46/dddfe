# dddfe

CLI + multi-template repo for frontend DDD scaffolds (React + Vite + TypeScript).

## Templates

| Name | Description |
|------|-------------|
| `demo` | Order form sample: domain / application / infrastructure / presentation, auth + route guards |

Add more under `templates/<name>/` (standalone app root with its own `package.json` and `agent.md`).

## Create a project

**From this repo (copy + rename + install + git init):**

```bash
pnpm install
make create NAME=../my-app
# optional: TEMPLATE=demo (default)
```

**CLI only (copy + rename `package.json` name):**

```bash
pnpm install
pnpm --filter create-dddfe build
pnpm exec create-dddfe ../my-app --template demo
cd ../my-app && pnpm install && git init
```

After publish (not done yet), the same entry will support:

```bash
pnpm create dddfe my-app
# npm create dddfe my-app
```

## Develop

```bash
pnpm test                          # create-dddfe unit tests
pnpm --filter create-dddfe build   # compile CLI
cd templates/demo && pnpm install && pnpm test && pnpm dev
```

## Layout

```text
packages/create-dddfe   # create-dddfe CLI (publishable later)
templates/demo          # first init template
docs/                   # maintainer specs / plans
```
