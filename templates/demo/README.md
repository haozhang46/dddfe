# Order Form DDD Demo (create-dddfe template)

Scaffolded apps include this tree plus **AGENT.md**, `.cursor/skills/`, `.githooks/pre-commit`, `.github/workflows/affected-test.yml`, `docs/`, and `scripts/verify.sh`.

提交前 `.githooks/pre-commit` 跑 `pnpm lint`、`pnpm fmt:check`、`pnpm affected:graph`。Pull request 上 `.github/workflows/affected-test.yml` 再跑 `nx affected:test`。

```bash
pnpm install                      # also sets git hooksPath → .githooks (prepare)
pnpm dev                          # UI
pnpm test                         # nx run-many -t test
pnpm affected:test                # nx affected:test, since main
pnpm affected:graph               # core-lib change also selects its dependents
pnpm lint                         # oxlint + ddd-plugin + CSS BEM + component registry
pnpm lint:css                     # CSS: nested children must use full BEM names
pnpm fmt                          # oxfmt (write)
pnpm fmt:check                    # oxfmt --check
pnpm verify                       # lint → fmt:check → tsc → test → build → storybook
pnpm storybook                    # Base 组件 Storybook（:6006）
pnpm skills:install               # 按 skills-lock.json 装回外部 skill（.agents/skills）
pnpm exec skills add <owner/repo> --skill <name> -a cursor -y
```

外部 skill 由 `skills` CLI 管理，锁文件是项目根的 `skills-lock.json`。Agent 读 `.agents/skills/`，不读这把锁。`.cursor/skills/` 里的 SOP 随模板提交，不进锁。CLI 需要 Node `>=22.20`。

Agent entry: [`AGENT.md`](./AGENT.md) → [`.cursor/skills/ddd-development-workflow.md`](./.cursor/skills/ddd-development-workflow.md)  
Layer / BEM rules: [`agent.md`](./agent.md)

可用组件在 `registry.json`（索引）和 `r/<name>.json`（props 与用法）。订单页的表单是 `form`：每个字段先用页面上的 Zod schema 解析，通过后才进入 `changeField`。金额显隐仍由 Domain 决定。

试玩：

1. 切「线下」→ 金额隐藏且为 null；改数量金额仍为 null
2. 切「线上」→ 金额 = qty × unitPrice
3. 换省 → 市清空并刷新 options
4. 观察 version / autosave
