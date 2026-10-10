# Order Form DDD Demo

Spec: `../docs/superpowers/specs/2026-10-09-order-form-ddd-demo-design.md`

```bash
pnpm install
pnpm dev      # UI
pnpm test     # Domain applyChange tests
```

试玩：

1. 切「线下」→ 金额隐藏且为 null；改数量金额仍为 null  
2. 切「线上」→ 金额 = qty × unitPrice  
3. 换省 → 市清空并刷新 options  
4. 观察 version / autosave
