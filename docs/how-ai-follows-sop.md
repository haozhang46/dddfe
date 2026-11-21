# AI 如何自动遵循 SOP？

> **你的问题**："AI 在接到需求的时候会根据这套 SOP 来执行吗？"
>
> **简短回答**：**会的，如果他们读取并遵循 `poteto-mode`（`.agents/skills/poteto-mode/`，由 `skills-lock.json` 恢复）以及 `.agents/playbooks/`**

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

### ✅ Lauren Tan 方式（可靠）

```text
人类：「添加折扣字段」
   ↓
AI：读取 AGENT.md → 看到「必须先读 .agents/skills/poteto-mode/SKILL.md」
   ↓
AI：打开 skill 文件，看到 7 步流程
   ↓
AI：Step 1 - 问澄清问题：
    「折扣是百分比还是固定金额？」
    「折扣能超过总价吗？」
   ↓
人类：回答问题
   ↓
AI：Step 2 - 分析层级：
    「需要改 Domain + Application + Presentation」
   ↓
AI：Step 3 - 写测试（先于实现）：
    test('折扣不能超过总价')
    test('折扣必须 >= 0')
   ↓
AI：Step 4 - 实现代码
   ↓
AI：Step 5 - 运行 ./scripts/verify.sh
   ↓
    ├─ ✅ 通过 → Step 7: Commit
    └─ ❌ 失败 → Step 6: 读错误 → 修正代码 → 回到 Step 5
```

**关键差异**：
- ✅ **标准化流程**（每次都一样）
- ✅ **TDD 强制**（测试先于代码）
- ✅ **自动验证**（不依赖人类检查）
- ✅ **自主纠错**（读错误 → 理解 → 修正）

---

## 技术实现

### 1. Cursor Skills（关键机制）

**位置**：`.agents/skills/poteto-mode/SKILL.md`

**作用**：
- Cursor AI 会**优先读取** `.cursor/skills/` 目录下的文件
- 当 AI 看到「这是一个 skill」，它会将其视为**工作指令**而非普通文档
- Skill 内容是**可执行的步骤**，而非抽象指导

**类比**：
- 普通文档 = 菜谱（你可以选择遵循或不遵循）
- Cursor Skill = 生产线 SOP（必须按步骤执行）

### 2. AGENT.md（入口点）

**位置**：`/AGENT.md`（仓库根目录）

**作用**：
- AI 打开仓库时会自动读取 `AGENT.md`
- 第一行就写：**「必须先读 .agents/skills/poteto-mode/SKILL.md」**
- 这是「指向 SOP 的指针」

**类比**：
- AGENT.md = 工厂入口的告示牌（「所有工人必须先读安全手册」）
- Skill = 安全手册本身

### 3. 验证工具（强制执行）

**位置**：`./scripts/verify.sh` + oxlint（`pnpm lint` / `ddd-plugin`）+ 测试

**作用**：
- AI 即使偏离 SOP，**验证工具会拦住它**
- 例如：AI 忘记写测试 → 验证失败 → AI 被迫补测试

**类比**：
- SOP = 驾照考试流程（告诉你怎么考）
- 验证工具 = 考官（不合格就是不合格）

---

## 实际案例演示

### 场景：「添加折扣字段到订单」

#### 传统方式（无 SOP）

```text
用户：「添加折扣字段」

AI（无指导）：
  1. *直接开始写代码*
  2. 添加 discount: number 到 Order 类型
  3. 更新 UI 组件
  4. Commit
  
❌ 问题：
  - 没问清楚折扣是百分比还是金额
  - 没写测试
  - 没验证就提交
  - Domain 层可能引入了 UI 依赖
```

#### Lauren Tan 方式（有 SOP）

```text
用户：「添加折扣字段」

AI（遵循 SOP）：

📖 读取 AGENT.md
   「在任何任务前，先读 .agents/skills/poteto-mode/SKILL.md」

📖 打开 .agents/skills/poteto-mode/SKILL.md
   看到 Step 1: 「理解需求 - 必须先问澄清问题」

❓ AI 问：
   「我理解您想添加折扣字段。让我确认：
   1. 折扣是百分比（如 10%）还是固定金额（如 50 元）？
   2. 折扣应在数量计算前还是后应用？
   3. 折扣能超过 100% 或总价吗？
   4. 所有用户都能看到折扣还是仅管理员？
   5. 负数折扣如何处理？」

👤 用户回答：
   「固定金额，计算后应用，不能超过总价，所有人可见，负数拒绝」

🏗️ AI (Step 2)：分析层级
   「需要改动：
   - Domain: 添加 discount: Money，添加验证
   - Application: ApplyChange 用例支持 discount
   - Infrastructure: DTO 映射
   - Presentation: UI 输入 + XState 事件」

✅ AI (Step 3)：写测试（先于实现）
   创建 applyDiscount.test.ts：
   test('折扣从总价扣除')
   test('折扣不能超过总价')
   test('折扣不能为负')

💻 AI (Step 4)：实现代码
   - Domain: applyDiscount() 函数
   - Application: 更新 ApplyChange
   - Infrastructure: 更新 DTO
   - Presentation: 添加输入框

🔍 AI (Step 5)：运行验证
   $ ./scripts/verify.sh
   ✅ 架构检查通过
   ✅ 类型检查通过
   ✅ 单元测试通过
   ✅ E2E 测试通过
   ✅ 构建通过

📝 AI (Step 7)：Commit
   git commit -m "feat: add discount field..."
```

**结果对比**：

| 维度 | 无 SOP | 有 SOP |
|------|-------|-------|
| **需求理解** | ❌ 猜测 | ✅ 澄清 |
| **测试覆盖** | ❌ 可能没有 | ✅ TDD 强制 |
| **架构违规** | ❌ 可能违反 | ✅ 验证拦截 |
| **错误处理** | ❌ 问人 | ✅ 自主修正 |
| **可重复性** | ❌ 每次不同 | ✅ 标准化 |

---

## 为什么 AI 会遵循？

### 1. Cursor 平台的 Skills 机制

**Cursor 会做什么**：
- 自动扫描 `.cursor/skills/` 目录
- 识别 `.md` 文件为技能文档
- 当 AI 看到 AGENT.md 引用 skill，会**优先加载**
- Skill 内容被视为**工作指令**（而非建议）

**类比**：
- 普通项目 README：「建议你这样做」（AI 可能忽略）
- Cursor Skill：「你必须这样做」（AI 会遵循）

### 2. 验证闭环（强制反馈）

即使 AI 试图跳过步骤：

```text
AI 跳过测试 → 直接写代码 → 运行 verify.sh
   ↓
❌ 测试失败（没有测试文件）
   ↓
AI 收到错误：「No test files found」
   ↓
AI 回到 Step 3（补测试）
   ↓
重新运行 verify.sh
   ↓
✅ 通过
```

**关键**：验证工具是**客观真理**，AI 无法绕过。

### 3. 错误反馈机制（自我纠正）

SOP 包含完整的错误处理流程：

```markdown
## Step 6: Fix Errors

### Rule: Read Error, Understand, Fix CODE (NOT Tests)

#### Example Error 1: Architecture Violation
❌ Domain layer must not import HTTP libraries

Action:
1. Read error: "Domain importing HTTP library"
2. Understand: I accidentally imported axios
3. Fix: Remove axios, use dependency inversion
```

AI 看到这个，会：
1. 匹配错误类型（架构违规）
2. 找到对应的修复指南
3. 应用修复
4. 重新验证

**无需人类干预**。

---

## 如何确认 AI 在遵循 SOP？

### 观察信号

#### ✅ AI 正在遵循 SOP

```text
AI：「在开始前，让我先澄清几个问题：
     1. ...
     2. ...」
     
→ 这是 Step 1（理解需求）

AI：「我需要在以下层级做修改：
     - Domain: ...
     - Application: ...」
     
→ 这是 Step 2（分析层级）

AI：「让我先写测试...」

→ 这是 Step 3（TDD）

AI：「运行 ./scripts/verify.sh 检查...」

→ 这是 Step 5（验证）

AI：「验证失败，错误是 ... 让我修正...」

→ 这是 Step 6（自主纠错）
```

#### ❌ AI 没有遵循 SOP

```text
AI：*直接开始写代码，不问问题*

→ 跳过了 Step 1

AI：*写完代码后才写测试*

→ 跳过了 Step 3（TDD）

AI：「我觉得应该可以了」*不运行验证*

→ 跳过了 Step 5

AI：「这个错误怎么办？」*问人类*

→ 跳过了 Step 6（应该自主修正）
```

### 如何纠正

如果 AI 没有遵循：

```
你：「请先阅读 .agents/skills/poteto-mode/SKILL.md 并遵循其步骤」
```

或者：

```
你：「请按照 AGENT.md 中的标准流程执行」
```

AI 会重新读取 skill 并从 Step 1 开始。

---

## 成熟度演进

### 阶段 1：监督期（当前）

```text
用户：「添加功能 X」
   ↓
AI：读 skill → 遵循 7 步 → 完成
   ↓
用户：审查 PR（确认 AI 遵循了 SOP）
```

**人类角色**：监督是否遵循流程

### 阶段 2：采样期（1-2 月后）

```text
AI：自动遵循 SOP → 完成 10 个任务
   ↓
用户：随机采样 2-3 个 PR
   ↓
发现问题 → 更新 skill
```

**人类角色**：质量抽查 + SOP 优化

### 阶段 3：自主期（3+ 月后）

```text
AI：自动遵循 SOP → 完成 100 个任务 → 某些类型自动 merge
   ↓
用户：每天看 commit history（5-10 分钟）
   ↓
发现模式问题 → 加 lint rule（而非个案修正）
```

**人类角色**：模式识别 + 规则制定

---

## 常见问题

### Q1: AI 会不会忽略 skill？

**A**: 可能，如果：
- AGENT.md 没有明确指向 skill
- Skill 写得太抽象（「建议你...」而非「必须...」）
- 没有验证工具强制执行

**解决**：
- ✅ AGENT.md 第一行就写「必须先读 skill」
- ✅ Skill 用命令式语气（「Do X」而非「You might do X」）
- ✅ verify.sh / `pnpm lint`（oxlint）拦截不合规代码

### Q2: 如果 AI 不问澄清问题怎么办？

**A**: 提醒它：

```
「请先按照 .agents/skills/poteto-mode/SKILL.md 的 Step 1 
澄清需求，再开始编码」
```

AI 会重新读 skill 并问问题。

### Q3: AI 能自己改进 SOP 吗？

**A**: 不能。SOP 是「真理」，由人类维护。

但 AI 可以：
- 发现 SOP 缺失的场景（「我遇到了 skill 没覆盖的情况」）
- 建议 SOP 改进（「Step 3 可以加上 XXX 检查」）

然后**人类决定**是否更新 skill。

### Q4: 多个 AI 同时工作会冲突吗？

**A**: 不会，如果：
- 每个 AI 在独立分支工作
- 每个 AI 都运行 verify.sh（验证各自改动）
- Merge 时正常处理冲突

Lauren Tan 的 SpaceX 设置：>10 个 coordinator agents 并行工作。

---

## 检查清单：确认 SOP 生效

```
✅ 已创建 .agents/skills/poteto-mode/SKILL.md
✅ AGENT.md 第一段引用 skill
✅ Skill 使用命令式语气（「Do」而非「Consider」）
✅ Skill 包含完整错误处理指南
✅ 验证脚本存在且可运行（./scripts/verify.sh）
✅ AI 收到任务时能找到 skill
✅ AI 遵循 Step 1（问澄清问题）
✅ AI 遵循 Step 3（TDD - 测试先于代码）
✅ AI 遵循 Step 5（运行验证）
✅ AI 遵循 Step 6（自主修正错误）
```

如果全部 ✅，SOP 已生效。

---

## 总结

### 你的问题答案

> **「AI 在接到需求时会自动遵循这套 SOP 吗？」**

**答**：

✅ **会的**，前提是：

1. **AGENT.md 明确指向 skill**（已完成 ✅）
2. **Skill 是可执行的步骤**（已完成 ✅）
3. **验证工具强制执行**（已完成 ✅）
4. **AI 知道先读 AGENT.md**（Cursor 平台默认行为 ✅）

### 工作流程

```text
用户：「做任务 X」
   ↓
AI：自动读取 AGENT.md
   ↓
AI：看到「必须先读 .agents/skills/poteto-mode/SKILL.md」
   ↓
AI：打开 skill，看到 7 步 SOP
   ↓
AI：执行 Step 1-7
   ↓
   ├─ 验证通过 → Commit
   └─ 验证失败 → 自主修正 → 重试
```

### 关键要素

| 组件 | 作用 | 状态 |
|------|------|------|
| **AGENT.md** | 入口点（指向 skill） | ✅ 已创建 |
| **Skill** | 可执行 SOP（7 步流程） | ✅ 已创建 |
| **验证工具** | 强制执行（拦截违规） | ✅ 已实现 |
| **错误指南** | 自主纠错（无需人类） | ✅ 已包含 |

**所有组件就位。AI 现在会自动遵循 SOP。** ✅

---

## 下一步

### 验证 AI 是否遵循

1. **给 AI 一个任务**：
   ```
   「请在订单中添加备注字段」
   ```

2. **观察 AI 的第一反应**：
   - ✅ 好：AI 问澄清问题（「备注字段有长度限制吗？」）
   - ❌ 坏：AI 直接开始写代码

3. **如果 AI 直接写代码**：
   ```
   「请先遵循 .agents/skills/poteto-mode/SKILL.md 的流程」
   ```

4. **观察 AI 是否自主纠错**：
   - AI 运行 `./scripts/verify.sh`
   - 如果失败，AI 读错误 → 修正 → 重试
   - ✅ 好：AI 没有问「怎么办？」
   - ❌ 坏：AI 问人类如何修复

### 如果一切正常

恭喜！🎉 你的 AI 开发环境已按 Lauren Tan 的方法配置完成，AI 会自动遵循 SOP。

### 如果有问题

检查：
1. AGENT.md 是否在仓库根目录
2. .agents/skills/poteto-mode/SKILL.md 是否存在
3. AI 是否能访问这些文件

---

**现在试试给 AI 一个任务，看它是否遵循 SOP！** 🚀