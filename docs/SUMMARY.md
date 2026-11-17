# Lauren Tan AI 开发方案 - 实施总结

## 🎯 完成内容

已成功实现 Lauren Tan (SpaceX) 在 "All Code Is Slop (Except Mine)" 中提出的完整 AI 开发方法论。

### 📚 核心文档（已添加）

| 文档 | 用途 | 阅读时间 |
|------|------|---------|
| [本页 SUMMARY](./SUMMARY.md) | 实施总览 | 10 分钟 |
| [pstack-workflow](../.cursor/skills/pstack-workflow/SKILL.md) | 项目 SOP（= pstack + 门禁） | 5 分钟 |
| [AI 如何遵循 SOP](./how-ai-follows-sop.md) | Agent 为何走 poteto playbook | 15 分钟 |
| [验证工具实现指南](./verification-tools-setup.md) | oxlint、Playwright、DevTools | 20-30 分钟 |
| [AI 场景下的单元测试价值](./unit-tests-for-ai-agents.md) | 深度分析、常见误区 | 15-20 分钟 |
| [测试策略速查表](./testing-cheatsheet-ai-agents.md) | 快速决策、场景矩阵 | 5 分钟 |
| [Agent 使用指南](../AGENT.md) | 架构表 + 指向 pstack SOP | 10 分钟 |

### 🛠️ 实用工具（已实现）

#### 1. 验证脚本
```bash
./scripts/verify.sh              # 完整验证（架构+类型+测试+构建）
```

**检查项**：
- ✅ Domain 层纯净度（无 HTTP、无 UI 框架）
- ✅ Application 层依赖反转（使用 Ports 而非具体实现）
- ✅ TypeScript 编译
- ✅ 单元测试
- ✅ 构建成功
- ✅ Bundle 大小

#### 2. 架构扫描工具
```bash
pnpm run verify:arch             # AST 级别架构检查
```

**能力**：
- 使用 ts-morph 分析代码结构
- 检测跨层依赖违规
- 检测 Domain 层不纯（HTTP、UI 框架、XState）
- 检测 Application 直接依赖具体实现
- 检测 Domain 类型缺少 `Readonly<>`

#### 3. Bundle 测量工具
```bash
pnpm run verify:bundle           # 构建并测量 Bundle 大小
```

**能力**：
- 生产构建
- 分析所有 chunks 大小
- 对比历史记录
- Hill Climbing 支持（性能优化迭代）

#### 4. E2E 测试框架
```bash
cd templates/demo
pnpm test:e2e                    # Playwright 自动化测试
```

**已配置**：
- Playwright 配置文件（`playwright.config.ts`）
- 核心流程测试（`e2e/order-flow.spec.ts`）
- 自动启动 dev server
- 失败时自动截图/录屏

#### 5. oxlint + oxfmt（Oxc 工具链）
```text
templates/demo/.oxlintrc.json        # oxlint 配置
templates/demo/oxlint/ddd-plugin.js  # DDD 分层规则
templates/demo/.oxfmtrc.json         # oxfmt 配置
```

**oxlint 规则**（`pnpm lint`）：
- `ddd/domain-purity` — Domain 不能导入 UI / fetch / storage / 其他层
- `ddd/domain-barrel` — Domain 包外只能走 barrel
- `ddd/application-boundary` — Application 不能导入 UI / Infrastructure
- `ddd/infrastructure-boundary` — Infrastructure 不能导入 UI / use case
- `ddd/section-viewmodel` — Section 不直连 Domain / use case
- `ddd/apply-change-name` / `ddd/base-component` — 命名与 base 组件约定
- `ddd/bem-classname` — presentation 层 JSX `className` 遵循 BEM
- `check-css-bem` — CSS 嵌套禁止 `&__` / `&--`，子选择器写全名（如 `.page__hint`）

**oxfmt**（`pnpm fmt` / `pnpm fmt:check`）：Oxc 格式化器，不是 Prettier。

---

## 🏗️ 架构实现

### 信任金字塔（Lauren Tan 的倒金字塔）

```text
┌─────────────────────────────────────────────────────┐
│ 第 1 层：代码约束（最大层）                           │
│ · TypeScript 类型系统                                │
│ · oxlint + ddd-plugin（DDD 架构强制）                │
│ · oxfmt（格式强制）                                  │
│ · API 设计、目录结构                                 │
│ 💡 让错误变得不可能                                  │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 第 2 层：运行时验证（关键层）                         │
│ · Playwright E2E 测试                                │
│ · 真实浏览器交互                                     │
│ · Chrome DevTools Protocol                          │
│ 💡 闭环验证：运行 → 观察 → 修正                      │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ 第 3 层：Prose（最小层）                             │
│ · AGENT.md（引用工具，不重复逻辑）                   │
│ · 技能文档                                          │
│ 💡 只用于无法编码的判断                              │
└─────────────────────────────────────────────────────┘
```

### 验证循环（AI Agent 自主工作）

```text
┌──────────────────────────────────────────────────┐
│ 1. Agent 修改代码                                 │
└────────────────┬─────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────────────┐
│ 2. 运行 ./scripts/verify.sh                      │
│    - 架构检查 (秒级)                              │
│    - 类型检查 (秒级)                              │
│    - 单元测试 (秒级)                              │
│    - E2E 测试 (分钟级)                            │
│    - 构建验证 (分钟级)                            │
└────────────────┬─────────────────────────────────┘
                 ↓
         ┌───────┴───────┐
         │ 全部通过？    │
         └───────┬───────┘
          ✅ 是  │  ❌ 否
                 │       │
                 │       ↓
                 │  ┌─────────────────────────┐
                 │  │ Agent 读错误信息        │
                 │  │ 理解失败原因            │
                 │  │ 修正代码（不改测试）    │
                 │  └───────┬─────────────────┘
                 │          │
                 │          └──────┐
                 ↓                 ↓
         ┌──────────────┐   返回步骤 2
         │ Commit & Push │
         └──────────────┘
```

**关键**：Agent **不需要人类干预**即可完成「验证 → 修正」循环。

---

## 📊 测试策略（回答「单元测试有用吗？」）

### 三层测试对比

| 维度 | 单元测试 | E2E 测试 | 运行时验证 |
|------|---------|---------|-----------|
| **速度** | ⚡ 毫秒-秒 | 🐌 秒-分钟 | 🐢 分钟 |
| **反馈精度** | ✅ 精确到函数 | ⚠️ 模块级 | ❌ 系统级 |
| **真实性** | ❌ Mock 环境 | ⚠️ 测试环境 | ✅ 真实运行 |
| **需求验证** | ❌ 不能 | ✅ 能 | ✅ 能 |
| **AI 自圆其说风险** | ⚠️ 高 | ⚠️ 中 | ✅ 低 |
| **置信度** | 40% | 70% | 90% |

### 最终答案

> **单元测试在 AI 场景下有用吗？**
>
> ✅ **有用**，但**不够**。
>
> - 单元测试 = 快速反馈 + 精确定位
> - E2E 测试 = 行为验证 + 捕获需求偏差
> - 运行时验证 = 真实观察 + 截图证据
>
> **三者缺一不可。**

### 置信度评分

| 测试组合 | 置信度 | 说明 |
|---------|-------|------|
| 只有单元测试 | 40% | Agent 可能写「自圆其说」的测试 |
| 单元 + E2E | 70% | 能捕获需求理解偏差 |
| **单元 + E2E + 运行时** | **90%** | **Lauren Tan 推荐** ✅ |
| 上述 + 人类采样 | 95% | 可自动 merge |

---

## 🚀 快速开始

### 1. 验证环境设置

```bash
# 安装依赖
pnpm install

# 运行完整验证
./scripts/verify.sh
```

**预期结果**：
```
✅ Domain layer purity passed
✅ TypeScript compilation passed
✅ Unit tests passed
✅ Build passed
✅ Bundle size OK (< 500KB)
```

### 2. 测试 AI Agent 工作流

#### 场景：添加新功能

```bash
# 1. 创建新 Domain 函数
vim templates/demo/src/domain/order/calculateDiscount.ts

# 2. 添加测试
vim templates/demo/src/domain/order/calculateDiscount.test.ts

# 3. 运行验证
./scripts/verify.sh

# 4. 如果失败，读错误，修正代码
# 5. 重复步骤 3-4 直到通过
# 6. Commit
git add .
git commit -m "feat: add discount calculation"
```

#### 场景：性能优化（Hill Climbing）

```bash
# 1. 记录 baseline
pnpm run verify:bundle
# Output: Total: 450 KB

# 2. 尝试优化（例如 lazy load）
vim templates/demo/src/App.tsx

# 3. 重新测量
pnpm run verify:bundle
# Output: Total: 380 KB

# 4. 判断
# 380 < 450 → 保留改动 ✅
# 380 > 450 → 回滚改动 ❌

# 5. Commit（如果改进了）
git commit -m "perf: reduce bundle size to 380KB"
```

---

## 📈 成熟度路线图

### 阶段 1：信任建立（第 1-2 周）

- [x] ✅ 完成工具设置（已完成）
- [ ] 运行 `./scripts/verify.sh` 并通过
- [ ] 添加 3-5 个核心 E2E 测试
- [ ] AI Agent 完成 5-10 次成功的「验证 → 修正」循环
- [ ] 人类审查每个 Agent PR

**目标**：验证工具可靠，Agent 能理解错误信息。

### 阶段 2：模式识别（第 3-6 周）

- [ ] 记录 Agent 常见错误（例如：忘记边界条件）
- [ ] 将重复错误转化为 lint rules
- [ ] 添加更多 E2E 覆盖
- [ ] Agent 自主修正率 > 70%

**目标**：从个案修正 → 模式预防。

### 阶段 3：采样审查（第 2-3 月）

- [ ] Agent PR 自动通过率 > 80%
- [ ] 人类只采样 20-30 个 PR/天（不是全部审查）
- [ ] 发现新模式 → 立即加规则

**目标**：从全量审查 → 采样监督。

### 阶段 4：扩展并行（第 4+ 月）

- [ ] 添加 Coordinator Agent（管理多个 Worker Agents）
- [ ] 某些类型 PR 自动 merge（如 codebase gardening）
- [ ] 性能优化自动化（Hill Climbing）
- [ ] 外部输入（Slack、Linear、GitHub Issues）自动转化为任务

**目标**：Lauren Tan 级别的规模（~2,500 PRs/月）。

---

## 🎓 学习路径

### 新手（0-2 小时）

1. 读 [AI 如何遵循 SOP](./how-ai-follows-sop.md)
2. 运行 `./scripts/verify.sh`
3. 看 [测试策略速查表](./testing-cheatsheet-ai-agents.md)
4. 尝试一次「修改 → 验证 → 修正」循环

### 进阶（2-6 小时）

1. 读 [验证工具实现](./verification-tools-setup.md)（oxlint 为主）
2. 读 [templates/demo/agent.md](../templates/demo/agent.md) oxlint 规则表
3. 添加一个新的 E2E 测试
4. 需要时扩展 `oxlint/ddd-plugin.js`（不是 ESLint）

### 专家（6+ 小时）

1. 读 [单元测试深度分析](./unit-tests-for-ai-agents.md)
2. 实现 Chrome DevTools Protocol 集成
3. 添加 Property-based testing
4. 设置 Coordinator Agent（如果需要规模化）

---

## 💡 核心原则速记

### Lauren Tan 的三大原则

1. **Make the easy thing the right thing**  
   让正确的做法成为最简单的做法

2. **Fix the environment, not the output**  
   修复产生代码的环境，而非修复单个输出

3. **Verification closes the loop**  
   验证闭环是自主性的关键

### 实践检查清单

- [ ] 验证脚本存在且可运行
- [ ] Domain 层无 HTTP/UI 依赖（被 oxlint `ddd/domain-purity` 强制）
- [ ] 至少 3 个关键流程有 E2E 测试
- [ ] Agent 能读懂验证错误信息
- [ ] Agent 能自主修正（不改测试）
- [ ] 性能有度量（Bundle size 等）

---

## 🔗 参考资料

### 外部资源

- [Lauren Tan 演讲视频（YouTube）](https://www.youtube.com/watch?v=O_zcc6Xl12g)
- [Lauren Tan's Kitchen 详解](https://bsbarkur.github.io/explainers/poteto-pstack/)
- [pstack 技能库（GitHub）](https://github.com/poteto/pstack)

### 本仓库文档

| 文档 | 链接 |
|------|------|
| 实施总结 | [SUMMARY.md](./SUMMARY.md) |
| AI 遵循 SOP（= pstack） | [how-ai-follows-sop.md](./how-ai-follows-sop.md) |
| 项目 SOP skill | [../.cursor/skills/pstack-workflow/SKILL.md](../.cursor/skills/pstack-workflow/SKILL.md) |
| 工具实现（oxlint） | [verification-tools-setup.md](./verification-tools-setup.md) |
| 单元测试分析 | [unit-tests-for-ai-agents.md](./unit-tests-for-ai-agents.md) |
| 测试速查表 | [testing-cheatsheet-ai-agents.md](./testing-cheatsheet-ai-agents.md) |
| demo oxlint 规则 | [../templates/demo/agent.md](../templates/demo/agent.md) |
| Agent 指南 | [../AGENT.md](../AGENT.md) |
| pstack 上游 | https://github.com/poteto/pstack |

---

## ✅ 验收标准

### 你已准备好扩展 AI 开发，当：

1. ✅ `./scripts/verify.sh` 一致通过
2. ✅ Agent 能自主完成 10 次「验证 → 修正」循环
3. ✅ E2E 测试覆盖关键用户流程
4. ✅ 性能度量已设置（Bundle size 等）
5. ✅ Agent 理解「测试是真理，代码要改」
6. ✅ 人类审查发现 <20% 的 PR 需要干预

---

**下一步**：运行 `./scripts/verify.sh`，开始你的第一次验证循环！🚀
