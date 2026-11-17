# AI 如何自动遵循 SOP？

> **你的问题**："AI 在接到需求的时候会根据这套 SOP 来执行吗？"
>
> **简短回答**：**会的，如果他们读取并遵循 `.cursor/skills/pstack-workflow/SKILL.md`（SOP = pstack `/poteto-mode`）**

---

## 工作原理

### ❌ 传统方式（不可靠）

```text
人类：「添加折扣字段」
   ↓
AI：*开始写代码*
   ↓
结果：可能做对，也可能做错（无标准流程）
```

**问题**：
- AI 自己决定流程（每次可能不同）
- 可能跳过测试
- 可能不验证就提交
- 错误处理不一致

### ✅ pstack 方式（可靠）

```text
人类：「添加折扣字段」
   ↓
AI：读取 AGENT.md → 看到「SOP = pstack-workflow」
   ↓
AI：打开 pstack-workflow → 打开 poteto-mode → 匹配 Feature playbook
   ↓
AI：把 playbook 步骤写入 todo；architect / 吞吐检查点；按需委派
   ↓
AI：项目门禁 — 标明 DDD 分层；实现可验证单元
   ↓
AI：运行 ./scripts/verify.sh（UI 再跑 verify-dddfe）
   ↓
   ├─ ✅ 通过 → Opening a PR / Commit
   └─ ❌ 失败 → 读错误 → 修根因 → 回到验证
```

**关键差异**：
- ✅ **标准化流程**（pstack playbook，不是自造步骤）
- ✅ **可验证单元**（sequence-verifiable-units / 便宜路径上的 tdd）
- ✅ **自动验证**（`./scripts/verify.sh` + 产品面证明）
- ✅ **自主纠错**（Fix Root Causes，不堵人类）

---

## 技术实现

### 1. 项目 SOP skill（入口）

**位置**：`.cursor/skills/pstack-workflow/SKILL.md`

**作用**：
- 声明本仓库 SOP **就是** pstack，禁止平行的自定义 7 步流程
- 要求先读 poteto-mode、匹配 playbook
- 挂上仓库门禁：DDD 分层、`./scripts/verify.sh`、verify-dddfe

### 2. AGENT.md（指针）

**位置**：仓库根目录 `AGENT.md`

**作用**：
- 打开仓库时指向 `pstack-workflow`
- 保留架构表与 oxlint 规则（真理在工具里，不在散文重复）

### 3. pstack / poteto-mode（步骤本体）

**位置**：已安装的 pstack 插件 `skills/poteto-mode/`

**作用**：
- Feature / Bug fix / Refactoring 等 playbook 拥有具体步骤
- Principles（Prove It Works、Boundary Discipline、…）约束决策
- 子代理、arena、swarm、interrogate 按 skill 调度

### 4. 验证工具（强制执行）

**位置**：`./scripts/verify.sh` + oxlint（`pnpm lint` / `ddd-plugin`）+ 测试 + verify-dddfe

**作用**：
- AI 即使偏离 playbook，**验证工具会拦住它**
- 例如：Domain 引入 fetch → oxlint 失败 → 被迫改代码

---

## 对比

| 维度 | 无 SOP | 旧自定义 7 步 | 现 pstack SOP |
|------|--------|---------------|---------------|
| 入口 | 随意 | 固定 7 步 md | poteto-mode playbook |
| 任务路由 | 无 | 一套线性步骤 | Feature / Bug / … 分册 |
| 验证 | 可选 | `./scripts/verify.sh` | 同左 + verify-dddfe / 产品面 |
| 与上游 | — | 自称 Lauren Tan，未接 pstack | 直接使用 pstack |

---

## 如何确认 AI 在遵循 SOP？

#### ✅ AI 正在遵循 SOP

- 先读 `pstack-workflow` / poteto-mode
- Todo 里是 **playbook 步骤**（不是自造 Step 1–7）
- 改码前或改码中标明 DDD 层影响
- 提交前跑 `./scripts/verify.sh`
- 失败时自主修，不问「怎么办？」

#### ❌ AI 没有遵循 SOP

- 直接开写，无 playbook
- 仍按已删除的「7 步 DDD workflow」执行
- 跳过 verify / 改测试迁就坏实现
- UI 改完却不跑 verify-dddfe

纠正话术：

```text
请先阅读 .cursor/skills/pstack-workflow/SKILL.md，
按 poteto-mode 匹配 playbook，并跑 ./scripts/verify.sh。
```

---

## 检查清单：确认 SOP 生效

```
✅ 已创建 .cursor/skills/pstack-workflow/SKILL.md
✅ 已删除旧的 ddd-development-workflow.md（无平行 SOP）
✅ AGENT.md 第一段指向 pstack-workflow
✅ pstack 插件可用（poteto-mode + playbooks）
✅ 验证脚本存在且可运行（./scripts/verify.sh）
✅ UI 有 verify-dddfe
✅ AI 匹配 playbook 而非自造步骤
✅ AI 验证失败时自主修正
```

如果全部 ✅，SOP 已生效。

---

## 总结

> **「AI 在接到需求时会自动遵循这套 SOP 吗？」**

**答**：会的，前提是 AGENT.md → `pstack-workflow` → poteto-mode playbook，且 `./scripts/verify.sh`（及 UI 上的 verify-dddfe）强制证明。

```text
用户：「做任务 X」
   ↓
AI：AGENT.md → pstack-workflow → poteto-mode
   ↓
AI：匹配 playbook → 执行 + 项目门禁
   ↓
   ├─ 验证通过 → Commit / PR
   └─ 验证失败 → 自主修正 → 重试
```

| 组件 | 作用 | 状态 |
|------|------|------|
| **AGENT.md** | 入口指针 | ✅ |
| **pstack-workflow** | 仓库 SOP（= pstack + 门禁） | ✅ |
| **poteto-mode** | Playbook 步骤本体 | ✅（插件） |
| **验证工具** | 强制执行 | ✅ |

**现在试试给 AI 一个任务，看它是否走 playbook 而不是自造 7 步。**
