# Order address

Order address lets a user pick a province and then a city from that province. Changing the province replaces the city list and clears a city that is not in the new list.

## Sub-features

- `address-seed` shows `浙江` and `杭州` on a fresh order.
- `address-jiangsu` switches the city list to `南京` and `苏州` and clears `杭州`.
- `address-city` selects `南京` after that switch.
- `address-zhejiang` returns to `杭州` and `宁波`.

## How to get to it (user POV)

- Sign in and use the `省` and `市` selects on `/orders/order-1`.
- `浙江` offers `杭州` and `宁波`. `江苏` offers `南京` and `苏州`.

## Driving it with control.mjs

Preconditions:

- `node .cursor/skills/verify-dddfe/control.mjs doctor` reports the verification URL.
- Signed in as editor. From a signed-out page, run `node .cursor/skills/verify-dddfe/control.mjs browser open /login` and `node .cursor/skills/verify-dddfe/control.mjs browser click --role button --name "以 editor 登录"`.
- The form heading is visible. Run `node .cursor/skills/verify-dddfe/control.mjs browser wait-text "订单 Form · DDD Demo"`.

- **Read the seed.** Wait until the city list has arrived. Run `node .cursor/skills/verify-dddfe/control.mjs browser options --label "市"` and require `杭州` and `宁波`. `node .cursor/skills/verify-dddfe/control.mjs browser value --label "省"` prints `浙江`. `node .cursor/skills/verify-dddfe/control.mjs browser value --label "市"` prints `杭州`.
- **Switch province.** Choose `江苏`. Run `node .cursor/skills/verify-dddfe/control.mjs browser select --label "省" --value 江苏`. The city list becomes the Jiangsu cities and the selected city is empty. Run `node .cursor/skills/verify-dddfe/control.mjs browser options --label "市"` and require `南京` and `苏州` with no `杭州`. `node .cursor/skills/verify-dddfe/control.mjs browser value --label "市"` prints an empty line.
- **Pick a city.** Choose `南京`. Run `node .cursor/skills/verify-dddfe/control.mjs browser select --label "市" --value 南京`. `node .cursor/skills/verify-dddfe/control.mjs browser value --label "市"` prints `南京`.
- **Switch back.** Choose `浙江`. Run `node .cursor/skills/verify-dddfe/control.mjs browser select --label "省" --value 浙江`. The city list includes `杭州` and `宁波`, and the selected city is empty because `南京` is not in Zhejiang. Then choose `杭州` with `node .cursor/skills/verify-dddfe/control.mjs browser select --label "市" --value 杭州`.
- **Proof.** Capture the Zhejiang selection. Run `node .cursor/skills/verify-dddfe/control.mjs browser snapshot --aria --path artifacts/order-address/zhejiang.aria.txt` and `node .cursor/skills/verify-dddfe/control.mjs browser screenshot --path artifacts/order-address/zhejiang.png`. The city value is `杭州` and the province value is `浙江`.

## Gotchas

- The city options show up after a short delay, including after a province change. `browser select` waits for the option. `browser options` does not. Wait with `select`, or poll `options`, before asserting the list.
- `市` stays disabled until a province is selected. The seed already has `浙江`.
- Selecting a province clears a city from the other province. Assert the empty city before picking the new one.
- This recipe marks the order dirty and the Vite process can save it. Relaunch when a later recipe needs the original seed untouched.
