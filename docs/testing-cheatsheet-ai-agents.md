# AI Agent 测试策略速查表

## 快速决策树

```text
                需要测试什么？
                      │
         ┌────────────┼────────────┐
         │            │            │
    纯函数/算法    用户流程    真实运行效果
         │            │            │
         ↓            ↓            ↓
    单元测试      E2E 测试    运行时验证
    (Vitest)    (Playwright)  (DevTools)
         │            │            │
    秒级反馈      分钟反馈      最可靠
```

---

## 三层测试对比

| 维度 | 单元测试 | E2E 测试 | 运行时验证 |
|------|---------|---------|-----------|
| **速度** | ⚡ 毫秒-秒 | 🐌 秒-分钟 | 🐢 分钟 |
| **隔离性** | ✅ 高 | ❌ 低 | ❌ 低 |
| **真实性** | ❌ Mock 环境 | ⚠️ 测试环境 | ✅ 真实运行 |
| **反馈精度** | ✅ 精确到函数 | ⚠️ 模块级 | ❌ 系统级 |
| **需求验证** | ❌ 不能 | ✅ 能 | ✅ 能 |
| **AI 自圆其说风险** | ⚠️ 高 | ⚠️ 中 | ✅ 低 |

---

## 使用场景矩阵

### ✅ 必须用单元测试

- Domain 层纯函数（不变式）
- 数学计算逻辑
- 边界条件（null, undefined, 空数组）
- 已知 bug 的回归测试

**示例**：
```typescript
test('订单总价 = 单价 × 数量', () => {
  const order = createOrder(10, 100);
  expect(order.total).toBe(1000);
});
```

### ✅ 必须用 E2E 测试

- 关键用户流程（登录、支付、下单）
- 跨层集成（UI → State → API）
- 视觉回归（布局、按钮位置）

**示例**：
```typescript
test('用户可以完成下单', async ({ page }) => {
  await page.goto('/order');
  await page.fill('[name="qty"]', '10');
  await page.click('button:has-text("提交")');
  await expect(page).toHaveURL('/success');
});
```

### ✅ 必须用运行时验证

- 性能优化（Bundle size, Lighthouse）
- 内存泄漏检测
- 真实网络环境（超时、重试）
- Console 错误监控

**示例**：
```bash
pnpm run verify:app order-flow
# 自动运行应用 → 截图 → DevTools 数据
```

---

## AI Agent 工作流

### 标准流程（所有代码改动）

```bash
# 1. 改代码
vim src/domain/order.ts

# 2. 快速验证（秒级）
pnpm test

# 3. 行为验证（分钟级）
pnpm test:e2e

# 4. 真实验证（分钟级）
pnpm run verify:app

# 全过 → commit
```

### 性能优化流程（Hill Climbing）

```bash
# 1. 记录 baseline
pnpm run verify:bundle
# Output: 450KB

# 2. 尝试优化
# ... 修改代码 ...

# 3. 重新测量
pnpm run verify:bundle
# Output: 380KB

# 4. 判断
380 < 450 → 保留 ✅
380 > 450 → 回滚 ❌

# 5. 继续迭代
```

---

## 常见陷阱

### ❌ 陷阱 1：只写单元测试

```text
Agent 写 100 个单元测试，全过 ✅
部署后用户：「保存按钮不见了」❌

原因：单测无法验证 UI
解决：加 E2E 测试
```

### ❌ 陷阱 2：Agent 自己写测试

```typescript
// Agent 的实现（错了）
function discount(price) {
  return price * 0.9; // 应该是折扣金额 10，而非折后价 90
}

// Agent 的测试（也错了）
test('discount', () => {
  expect(discount(100)).toBe(90); // ✅ 通过，但逻辑错误
});
```

**解决**：
1. 人类写核心不变式测试
2. E2E 验证真实行为
3. 运行时看截图（一眼看出不对）

### ❌ 陷阱 3：忽略运行时验证

```text
所有测试通过 ✅
真实运行：内存持续增长，2 小时后 OOM

原因：测试都是短时运行，没测到内存泄漏
解决：运行时监控 + DevTools profiling
```

---

## 置信度评分

| 测试组合 | 置信度 | 说明 |
|---------|-------|------|
| 只有单元测试 | 40% | Agent 可能自圆其说 |
| 单元 + E2E | 70% | 能捕获需求偏差 |
| 单元 + E2E + 运行时 | 90% | Lauren Tan 推荐 |
| 上述 + 人类采样 | 95% | 可自动 merge |

---

## 实战建议

### 新项目初期（信任度建立期）

```text
第 1 周：
- ✅ 写 10 个核心不变式单元测试（人类写）
- ✅ 写 3 个关键流程 E2E 测试（人类写）
- ✅ 设置运行时验证脚本

第 2-4 周：
- Agent 改代码 → 跑三层测试 → 人类审查每个 PR
- 记录 Agent 的常见错误

第 2 个月：
- 把常见错误转化为 lint rules
- Agent PR 自动通过率 >80% → 开始采样审查
```

### 高信任度后（扩展期）

```text
- Agent 的改动全部跑三层测试
- 通过 → 自动 merge（某些类别的 PR）
- 人类每天采样 20-30 个 PR
- 发现模式问题 → 加规则（而非每次修正）
```

---

## 指标监控

### 健康的 AI 项目

```text
单元测试通过率：>95%
E2E 测试通过率：>90%
运行时验证通过率：>85%

Agent 自主修正率：>80%（测试失败后，Agent 能自己改对）
人类干预率：<20%（需要人类解释需求的情况）
```

### 危险信号

```text
❌ 单元测试通过率 100%，但 E2E 大量失败
   → Agent 在自圆其说

❌ 所有测试通过，但用户报 bug
   → 测试覆盖不足，需要加运行时验证

❌ Agent 改代码 → 改测试 → 又通过了
   → 测试不应该被改（应该是真理）
```

---

## 一句话总结

> **单元测试给速度，E2E 测试给信心，运行时验证给真相。**
> 
> 三者缺一不可。

---

## 参考

- [完整分析](./unit-tests-for-ai-agents.md)
- [Lauren Tan 实施总结](./SUMMARY.md)
- [验证工具设置](./verification-tools-setup.md)
