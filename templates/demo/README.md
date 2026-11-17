# Order Form DDD Demo

Spec: `../docs/superpowers/specs/2026-10-09-order-form-ddd-demo-design.md`

```bash
pnpm install --ignore-workspace   # demo has its own lockfile
pnpm dev                          # UI
pnpm test                         # unit tests
pnpm lint                         # oxlint + ddd-plugin + CSS BEM nesting check
pnpm lint:css                     # CSS: nested children must use full BEM names
pnpm fmt                          # oxfmt (write)
pnpm fmt:check                    # oxfmt --check
```

试玩：

1. 切「线下」→ 金额隐藏且为 null；改数量金额仍为 null
2. 切「线上」→ 金额 = qty × unitPrice
3. 换省 → 市清空并刷新 options
4. 观察 version / autosave
