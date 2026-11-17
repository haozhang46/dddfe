# Log in and out

Log in lets a user pick a mock account and land on that user's order page. Log out returns to the login page and drops the saved session.

## Sub-features

- `login-editor` signs in as editor and opens order `order-1`.
- `login-viewer` signs in as viewer and shows the name Viewer.
- `login-admin` signs in as admin and shows the name Admin.
- `logout` returns to `登录` and clears the saved session.

## How to get to it (user POV)

- Open `/login`.
- Open `/` or `/orders/order-1` while signed out. The page shows `登录`.
- On the order page, choose `退出`.

## Driving it with control.mjs

Preconditions:

- `node .cursor/skills/verify-dddfe/control.mjs doctor` reports the verification URL.
- The owned browser is signed out. `node .cursor/skills/verify-dddfe/control.mjs storage absent dddfe.authJson` prints `absent`.

- **Open login.** Go to the login page. Run `node .cursor/skills/verify-dddfe/control.mjs browser open /login`. The heading `登录` is visible. Run `node .cursor/skills/verify-dddfe/control.mjs browser wait-text "登录"`.
- **Sign in as editor.** Choose `以 editor 登录`. Run `node .cursor/skills/verify-dddfe/control.mjs browser click --role button --name "以 editor 登录"`. The heading becomes `订单 Form · DDD Demo` and the page names Editor. Run `node .cursor/skills/verify-dddfe/control.mjs browser wait-text "订单 Form · DDD Demo"` and `node .cursor/skills/verify-dddfe/control.mjs browser wait-text "Editor"`. `node .cursor/skills/verify-dddfe/control.mjs browser url` prints a URL ending in `/orders/order-1`.
- **Confirm the session.** Read the saved session from the page. Run `node .cursor/skills/verify-dddfe/control.mjs storage get dddfe.authJson`. The printed JSON contains `"displayName":"Editor"` and `"userId":"u-editor"`.
- **Proof.** Capture the order page. Run `node .cursor/skills/verify-dddfe/control.mjs browser snapshot --aria --path artifacts/login/editor.aria.txt` and `node .cursor/skills/verify-dddfe/control.mjs browser screenshot --path artifacts/login/editor.png`. Both show `订单 Form · DDD Demo` and `Editor`.
- **Sign out.** Choose `退出`. Run `node .cursor/skills/verify-dddfe/control.mjs browser click --role button --name "退出"`. The heading is `登录` again. Run `node .cursor/skills/verify-dddfe/control.mjs browser wait-text "登录"` and `node .cursor/skills/verify-dddfe/control.mjs storage absent dddfe.authJson`.
- **Viewer entry.** Choose `以 viewer 登录`. Run `node .cursor/skills/verify-dddfe/control.mjs browser click --role button --name "以 viewer 登录"` and `node .cursor/skills/verify-dddfe/control.mjs browser wait-text "Viewer"`. Then choose `退出` with `node .cursor/skills/verify-dddfe/control.mjs browser click --role button --name "退出"` and require `storage absent`.
- **Admin entry.** Choose `以 admin 登录`. Run `node .cursor/skills/verify-dddfe/control.mjs browser click --role button --name "以 admin 登录"` and `node .cursor/skills/verify-dddfe/control.mjs browser wait-text "Admin"`. Then choose `退出` and require `storage absent`.

## Gotchas

- The login button stays on screen for a short mock delay. Wait for `订单 Form · DDD Demo` instead of assuming the click finished.
- Opening `/login` while already signed in leaves the order page, not the login form. Sign out first.
- `退出` on the order page is the button named `退出`. The admin and no-permission pages name their button `退出登录`.
- `issuedAt` changes every login. Match `displayName` and `userId`, not the whole JSON string.
- Writing `dddfe.authJson` from the harness skips the button. That is not this feature.
