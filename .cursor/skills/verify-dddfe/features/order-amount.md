# Order amount

Order amount shows `数量 × 单价` in fen while pay type is online, and replaces that figure with a hidden-amount sentence while pay type is offline.

## Sub-features

- `amount-online` shows `{qty × 100} 分` for the seeded unit price.
- `amount-offline` hides the figure after `线下（隐藏金额）`.
- `amount-offline-qty` keeps the figure hidden when quantity changes offline.
- `amount-back-online` shows the figure again after `线上（显示并计算金额）`.

## How to get to it (user POV)

- Sign in, then read the amount section on `/orders/order-1`.
- Choose `线上（显示并计算金额）` or `线下（隐藏金额）`.
- Change the `数量` field.

## Driving it with control.mjs

Preconditions:

- `node .cursor/skills/verify-dddfe/control.mjs doctor` reports the verification URL.
- This Vite process still has the seed, or this recipe sets quantity and pay type before it asserts. A previous save in this process replaces the seed until `stop` and `launch`.
- Signed in as editor. From a signed-out page, run `node .cursor/skills/verify-dddfe/control.mjs browser open /login` and `node .cursor/skills/verify-dddfe/control.mjs browser click --role button --name "以 editor 登录"`.

- **Open the order.** Wait until the form is on screen. Run `node .cursor/skills/verify-dddfe/control.mjs browser wait-text "订单 Form · DDD Demo"`.
- **Read the seed amount.** The online amount is visible. Run `node .cursor/skills/verify-dddfe/control.mjs browser wait-text "100 分"` and `node .cursor/skills/verify-dddfe/control.mjs browser wait-text "金额（派生，只读）"`. `node .cursor/skills/verify-dddfe/control.mjs browser value --label "数量"` prints `1`.
- **Change quantity.** Set quantity to `3`. Run `node .cursor/skills/verify-dddfe/control.mjs browser fill --label "数量" --value 3`. The amount reads `300 分`. Run `node .cursor/skills/verify-dddfe/control.mjs browser wait-text "300 分"`.
- **Hide the amount.** Choose `线下（隐藏金额）`. Run `node .cursor/skills/verify-dddfe/control.mjs browser click --role radio --name "线下（隐藏金额）"`. The page shows `已隐藏（offline）。Domain 中 amount = null` and does not show `300 分`. Run `node .cursor/skills/verify-dddfe/control.mjs browser wait-text "已隐藏（offline）。Domain 中 amount = null"`.
- **Quantity while hidden.** Set quantity to `4`. Run `node .cursor/skills/verify-dddfe/control.mjs browser fill --label "数量" --value 4`. The hidden sentence stays, and `400 分` does not appear. Run `node .cursor/skills/verify-dddfe/control.mjs browser wait-text "已隐藏（offline）。Domain 中 amount = null"`.
- **Show it again.** Choose `线上（显示并计算金额）`. Run `node .cursor/skills/verify-dddfe/control.mjs browser click --role radio --name "线上（显示并计算金额）"`. The amount reads `400 分`. Run `node .cursor/skills/verify-dddfe/control.mjs browser wait-text "400 分"`.
- **Proof.** Capture the online amount. Run `node .cursor/skills/verify-dddfe/control.mjs browser snapshot --aria --path artifacts/order-amount/online.aria.txt` and `node .cursor/skills/verify-dddfe/control.mjs browser screenshot --path artifacts/order-amount/online.png`. Both show `400 分` and `金额（派生，只读）`.

## Gotchas

- The amount sentence updates when the field changes. The save-bar version can tick later. Match the amount text, not `version`.
- This recipe saves the draft inside the Vite process. A later recipe must set the fields it cares about, or relaunch.
- Quantity rejects values below `1` by leaving the previous quantity in place. Assert the amount text after the fill.
- Viewer, editor, and admin all see the pay radios. The radios are not an admin-only control.
