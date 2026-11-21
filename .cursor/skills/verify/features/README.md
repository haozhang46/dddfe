# dddfe demo verification map

This directory is the maintained source for verifying the user-facing behavior of the `templates/demo` order form. Read the index before driving the app, then use the matching feature file as the recipe.

## Baseline preconditions

- Launch with `node .cursor/skills/verify/control.mjs launch` and require the `ready http://127.0.0.1:4173` line (or the port you passed).
- Run `node .cursor/skills/verify/control.mjs doctor` and require `doctor ok` for that same URL.
- A fresh Vite process seeds order `order-1`: pay type online, quantity `1`, unit price `100`, amount `100 分`, province `浙江`, city `杭州`. Auth is logged out.
- The seed lives in that Vite process. After a recipe saves, later recipes in the same process see the saved draft. `stop` then `launch` restores the seed.
- Never drive an instance that was not started by this verification run.

## Driving conventions

- Start every recipe from the baseline state unless its preconditions say otherwise.
- Prefer ARIA roles and accessible names over CSS selectors or DOM position.
- Treat every command as literal. Keep quoted names and flags unchanged.
- Run browser and storage actions through `node .cursor/skills/verify/control.mjs`.
- Do not remove proof artifacts during cleanup.

## Proof and skip reporting

- Capture the user action and the resulting state, not only the final screen.
- UI proof includes an ARIA snapshot and a screenshot with the page heading visible.
- Login proof includes `storage get dddfe.authJson` after the button click, and `storage absent` after `退出`.
- Amount and address proof include the visible sentence or the select value after the control change.
- Record the feature ID and entry point used with every artifact.
- Report an unreachable path with the attempted command and the unmet precondition.
- Do not report a skipped entry point as verified through a different path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph describing the user-visible behavior. It then uses exactly four H2 sections in this order.

1. `Sub-features` lists short IDs with one line for each behavior.
2. `How to get to it (user POV)` lists every user entry point.
3. `Driving it with control.mjs` starts with `Preconditions:` and uses labeled bullets that pair each user action with an exact command and observable result.
4. `Gotchas` lists traps that can waste or invalidate a verification run.

Keep implementation details out of the map. Name only user paths, stable handles, required state, commands, and observable proof.

## Features

- [Log in and out](./login.md) covers the three mock user buttons, the order page they open, and `退出`.
- [Order amount](./order-amount.md) covers online quantity math and the offline hidden amount.
- [Order address](./order-address.md) covers province and city selects, including the city list that follows the province.
- [Route guard](./route-guard.md) covers signed-out redirects, the admin page, the no-permission page, and the submit button label.
