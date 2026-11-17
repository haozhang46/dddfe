# Route guard

Route guard sends a signed-out user to `登录`, sends a signed-in user without admin access to `无权限`, and shows `Admin panel` only for the admin account. The order page shows `提交` for editor and admin, and `无提交权限` for viewer.

## Sub-features

- `guard-anon` turns `/orders/order-1` and `/admin` into the login page when signed out.
- `guard-viewer-admin` shows `无权限` for viewer on `/admin`.
- `guard-admin` shows `Admin panel` for admin.
- `guard-submit` shows `无提交权限` for viewer and `提交` for editor.

## How to get to it (user POV)

- Open `/orders/order-1` or `/admin` without signing in.
- On the order page, choose the `Admin` link.
- On `无权限`, choose `返回订单` or `退出登录`.
- On the order page, read the submit button.

## Driving it with control.mjs

Preconditions:

- `node .cursor/skills/verify-dddfe/control.mjs doctor` reports the verification URL.
- Start signed out. Run `node .cursor/skills/verify-dddfe/control.mjs storage absent dddfe.authJson`. If it fails, choose `退出` or `退出登录` first.

- **Signed-out order.** Open the order route. Run `node .cursor/skills/verify-dddfe/control.mjs browser open /orders/order-1`. The login heading is shown. Run `node .cursor/skills/verify-dddfe/control.mjs browser wait-text "登录"`. `node .cursor/skills/verify-dddfe/control.mjs browser url` prints a URL ending in `/login`.
- **Signed-out admin.** Open the admin route. Run `node .cursor/skills/verify-dddfe/control.mjs browser open /admin` and `node .cursor/skills/verify-dddfe/control.mjs browser wait-text "登录"`.
- **Viewer admin page.** Sign in as viewer. Run `node .cursor/skills/verify-dddfe/control.mjs browser click --role button --name "以 viewer 登录"` and `node .cursor/skills/verify-dddfe/control.mjs browser wait-text "Viewer"`. Open admin. Run `node .cursor/skills/verify-dddfe/control.mjs browser open /admin`. The heading is `无权限`, not `Admin panel`. Run `node .cursor/skills/verify-dddfe/control.mjs browser wait-text "无权限"`. The URL ends in `/forbidden`.
- **Viewer submit label.** Return to the order. Run `node .cursor/skills/verify-dddfe/control.mjs browser click --role link --name "返回订单"` and `node .cursor/skills/verify-dddfe/control.mjs browser wait-text "无提交权限"`.
- **Admin page.** Sign out and sign in as admin. Run `node .cursor/skills/verify-dddfe/control.mjs browser click --role button --name "退出"`, `node .cursor/skills/verify-dddfe/control.mjs browser wait-text "登录"`, `node .cursor/skills/verify-dddfe/control.mjs browser click --role button --name "以 admin 登录"`, and `node .cursor/skills/verify-dddfe/control.mjs browser wait-text "Admin"`. Choose `Admin`. Run `node .cursor/skills/verify-dddfe/control.mjs browser click --role link --name "Admin"`. The heading is `Admin panel`. Run `node .cursor/skills/verify-dddfe/control.mjs browser wait-text "Admin panel"`.
- **Proof.** Capture the admin page. Run `node .cursor/skills/verify-dddfe/control.mjs browser snapshot --aria --path artifacts/route-guard/admin.aria.txt` and `node .cursor/skills/verify-dddfe/control.mjs browser screenshot --path artifacts/route-guard/admin.png`. Both show `Admin panel`.
- **Editor submit label.** Leave admin, sign in as editor, and read the order button. Run `node .cursor/skills/verify-dddfe/control.mjs browser click --role button --name "退出登录"`, `node .cursor/skills/verify-dddfe/control.mjs browser click --role button --name "以 editor 登录"`, and `node .cursor/skills/verify-dddfe/control.mjs browser wait-text "提交"`.

## Gotchas

- Viewer does not stay on a broken admin URL. The visible result is the `无权限` heading at `/forbidden`.
- `无提交权限` is its own disabled button. Editor and admin render `提交` instead. Do not click `提交`: it opens an alert, and a dismissed alert is not proof.
- On a fresh seed, editor's `提交` is enabled because province and city are already set. After a recipe clears the city, `提交` stays disabled until both selects have a value. The proof is the button's name.
- `退出` and `退出登录` are different names. Use the one on the page you are on.
