# Environment init scripts & templates

## Monorepo (this repo)

| File | Role |
|------|------|
| [`.cursor/environment.json`](../.cursor/environment.json) | Cloud Agent template (`install` / `start`) |
| [`.cursor/install.sh`](../.cursor/install.sh) | Dependencies + seed `.env` / `templates/demo/.env` + restore each `skills-lock.json` |
| [`.cursor/start.sh`](../.cursor/start.sh) | Boot demo Vite on `:5173` (tmux, re-runnable) |
| [`.env.example`](../.env.example) | Monorepo env template (→ `.env`, gitignored) |
| [`scripts/create-app.sh`](../scripts/create-app.sh) | Create a new app from template + run its install |

Committed `.cursor/environment.json`:

```json
{
  "install": "bash .cursor/install.sh",
  "start": "bash .cursor/start.sh"
}
```

With Cloud Agent `workDir` `/agent`, dashboard `install` / `start` need a `cd` guard:

```text
[ ! -d '/agent/repos/dddfe' ] || cd '/agent/repos/dddfe' || exit $?
bash .cursor/install.sh
```

Local:

```bash
bash .cursor/install.sh
bash .cursor/start.sh
./scripts/verify.sh
```

## Create a project

```bash
./scripts/create-app.sh ../my-app
# or: make create NAME=../my-app
```

`create-app.sh` / `make create` run `create-dddfe`, then `git init` + `bash .cursor/install.sh`.

## Generated apps (`create-dddfe`)

Copied from `templates/demo` into every new project:

| File | Role |
|------|------|
| `.cursor/environment.json` | Cloud Agent `install` / `start` |
| `.cursor/install.sh` | `pnpm install` + seed `.env` + githooks + `pnpm skills:install` |
| `.cursor/start.sh` | Vite on `:5173` |
| `.env.example` | Committed env template |
| `.env` | Created from `.env.example` if missing (gitignored) |
| `.gitignore` | Ignores `.env` / `.env.*`, keeps `.env.example` |
| `.cursor/skills/` | Agent SOP |
| `.githooks/` | pre-commit lint + fmt |
| `scripts/verify.sh` | Full verify |
| `scripts/install-skills.mjs` | Restore `skills-lock.json` into `.agents/skills` (`pnpm skills:install`) |
| `AGENT.md` | Agent entry |

```bash
cd ../my-app
pnpm verify
bash .cursor/start.sh
```

## Lifecycle (Cursor Cloud Agents)

- **`install`**: must finish; packages only (no long-running servers).
- **`start`**: every boot; daemons / Vite; safe to re-run.
- Do not put `pnpm install` in `start`.
