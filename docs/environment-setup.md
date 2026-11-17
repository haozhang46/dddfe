# Environment init scripts & templates

## Monorepo (this repo)

| File | Role |
|------|------|
| [`.cursor/install.sh`](../.cursor/install.sh) | Dependencies: workspace + `templates/demo` + optional `verify-dddfe` skill |
| [`.cursor/start.sh`](../.cursor/start.sh) | Boot demo Vite on `:5173` (tmux, re-runnable) |

Cloud Agent `environment.json` fields (from workspace root; with `workDir` `/agent` use the `cd` guard):

```text
install:
[ ! -d '/agent/repos/dddfe' ] || cd '/agent/repos/dddfe' || exit $?
bash .cursor/install.sh

start:
[ ! -d '/agent/repos/dddfe' ] || cd '/agent/repos/dddfe' || exit $?
bash .cursor/start.sh
```

Local:

```bash
bash .cursor/install.sh
bash .cursor/start.sh          # optional; or pnpm --dir templates/demo dev
./scripts/verify.sh
```

## Generated apps (`create-dddfe`)

Copied from `templates/demo` into every new project:

| File | Role |
|------|------|
| `.cursor/install.sh` | `pnpm install` + githooks |
| `.cursor/start.sh` | Vite on `:5173` |
| `.cursor/environment.template.json` | Suggested Cloud Agent install/start |
| `.cursor/skills/` | Agent SOP |
| `.githooks/` | pre-commit lint + fmt |
| `scripts/verify.sh` | Full verify |
| `AGENT.md` | Agent entry |

```bash
make create NAME=../my-app
cd ../my-app
bash .cursor/install.sh
pnpm verify
```

## Lifecycle (Cursor Cloud Agents)

- **`install`**: must finish; packages only (no long-running servers).
- **`start`**: every boot; daemons / Vite; safe to re-run.
- Do not put `pnpm install` in `start`.
