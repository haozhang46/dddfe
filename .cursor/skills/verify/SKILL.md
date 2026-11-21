---
name: verify
description: "Drive the dddfe demo web UI (templates/demo, the Vite order form) the way a user does, and capture screenshots, ARIA snapshots, and sessionStorage. Use to prove login, amount, address, or route-guard behavior, or when a change to that UI needs a runtime check."
---

# Verify dddfe

Drive the copyable order-form demo in `templates/demo`. The user-facing surface is that Vite page. The repo also ships `pnpm create` (`create-dddfe`); this skill does not drive the scaffolder.

The helper is `node .cursor/skills/verify/control.mjs`. Run every command from the repo root. It keeps one Vite process and one Chrome context alive so later commands share the page and `sessionStorage`.

## Launch

Install once if those paths are missing:

```bash
cd templates/demo && pnpm install --ignore-workspace
cd .cursor/skills/verify && pnpm install --ignore-workspace
```

Google Chrome must be installed. The helper uses Playwright's `chrome` channel and does not download a Playwright browser.

```bash
node .cursor/skills/verify/control.mjs launch
```

Ready prints `ready http://127.0.0.1:4173`. That means Vite is serving the demo shell and the owned browser is on the `登录` heading. A port that merely accepts TCP is not ready.

The demo has no database. A fresh process seeds order `order-1` as online pay, quantity `1`, unit price `100`, amount `100`, province `浙江`, city `杭州`. Auth starts logged out. Login, city lookup, and save are the app's own mocks (about 200–300ms). Assertions poll; do not sleep a fixed time and assume the mock finished.

Override the port only when this checkout has no live instance:

```bash
DDDFE_VERIFY_PORT=4174 node .cursor/skills/verify/control.mjs launch
```

One checkout owns one instance. A second `launch` while the daemon is alive prints the existing URL and does not start another browser. Two instances need two checkouts and two ports. The in-memory order lives inside that Vite process, and `sessionStorage` lives in the owned browser context. Do not drive a human Chrome against the same URL during a recipe: a manual save overwrites the mock order, and the human window does not share the login.

## Doctor

```bash
node .cursor/skills/verify/control.mjs doctor
```

Doctor is read-only. It checks the daemon pid, the Vite pid, that `GET /login` is the demo document (`id="root"` and `<title>demo</title>`), and that the owned page answers. It does not require a logged-in user. `doctor ok http://127.0.0.1:4173` means the instance is worth driving. Anything else: run `stop`, then `launch`.

## Drive

Open a path, then use the accessible name from the feature file. Commands below are the real ones.

```bash
node .cursor/skills/verify/control.mjs browser open /login
node .cursor/skills/verify/control.mjs browser click --role button --name "以 editor 登录"
node .cursor/skills/verify/control.mjs browser wait-text "订单 Form · DDD Demo"
node .cursor/skills/verify/control.mjs browser fill --label "数量" --value 3
node .cursor/skills/verify/control.mjs browser select --label "省" --value 浙江
node .cursor/skills/verify/control.mjs browser value --label "数量"
node .cursor/skills/verify/control.mjs browser options --label "市"
node .cursor/skills/verify/control.mjs storage get dddfe.authJson
node .cursor/skills/verify/control.mjs storage absent dddfe.authJson
```

`browser click` needs `--role` and `--name`. `fill`, `value`, `options`, and `select` need `--label`. Names and labels are exact. `wait-text` polls the visible text for up to 8 seconds. `select` waits until that option exists, then chooses it. Paths are app routes (`/login`, `/orders/order-1`, `/admin`, `/forbidden`).

Follow `features/README.md`, then the feature file. A proof of one entry point does not cover the others.

## Evidence

Write proof under `.cursor/skills/verify/artifacts/<feature-id>/`. Paths passed to the helper are relative to the skill directory.

```bash
node .cursor/skills/verify/control.mjs browser snapshot --aria --path artifacts/login/order.aria.txt
node .cursor/skills/verify/control.mjs browser screenshot --path artifacts/login/order.png
```

Capture the user action and the state it produced. For this UI that is an ARIA snapshot, a screenshot that shows the page heading, and the side effect the action claims (`sessionStorage` key `dddfe.authJson` after login, the amount sentence after a quantity change, the city options after a province change). Do not set `sessionStorage` or the order draft from the harness. Login goes through the button. Field changes go through the controls. The demo already isolates auth and the order API behind its mocks; there is no separate dry-run mode.

`提交` calls `alert`. The helper dismisses the dialog so the run does not hang. Dismissing it is not proof that submit worked. Permission proof is which button the page renders.

## Cleanup

```bash
node .cursor/skills/verify/control.mjs stop
```

`stop` sends shutdown to the daemon this run started, then signals that daemon pid and that Vite pid if they are still alive. It deletes `.cursor/skills/verify/run/` (state, Vite log, daemon log). It does not delete `.cursor/skills/verify/artifacts/`. After a failed attempt, run `stop` before launching again.

## Helpers

`.cursor/skills/verify/control.mjs` is the only helper. It is executable. Subcommands: `launch`, `doctor`, `stop`, `browser`, `storage`. Unknown input prints the usage and exits non-zero. A missing control file, a dead pid, or a missing element exits non-zero and names the next command.
