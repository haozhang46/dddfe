# Order Form DDD Demo (create-dddfe template)

Scaffolded apps include this tree plus **AGENT.md**, `.cursor/skills/`, `.githooks/`, `docs/`, and `scripts/verify.sh`.

```bash
pnpm install                      # also sets git hooksPath → .githooks (prepare)
pnpm dev                          # UI
pnpm test                         # nx run-many -t test
pnpm affected:test                # nx affected:test, since main
pnpm affected:graph               # core-lib change also selects its dependents
pnpm lint                         # oxlint + ddd-plugin + CSS BEM nesting check
pnpm lint:css                     # CSS: nested children must use full BEM names
pnpm fmt                          # oxfmt (write)
pnpm fmt:check                    # oxfmt --check
pnpm verify                       # lint → fmt:check → tsc → test → build
```

Agent entry: [`AGENT.md`](./AGENT.md) → [`.cursor/skills/ddd-development-workflow.md`](./.cursor/skills/ddd-development-workflow.md)  
Layer / BEM rules: [`agent.md`](./agent.md)

试玩：

1. 切「线下」→ 金额隐藏且为 null；改数量金额仍为 null
2. 切「线上」→ 金额 = qty × unitPrice
3. 换省 → 市清空并刷新 options
4. 观察 version / autosave
