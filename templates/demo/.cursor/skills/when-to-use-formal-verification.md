# When to Use Formal Verification - Decision Guide for AI

> **Purpose**: Help AI agents decide when formal verification (TLA+, Lean, Property-based testing) is necessary.
>
> **Key Principle**: Formal verification is HIGH-COST, HIGH-VALUE. Only use when benefits outweigh costs.

---

## Quick Decision Tree

```text
收到任务
   ↓
┌──────────────────────────────────┐
│ 是否涉及以下场景？                │
│                                  │
│ □ 状态机/并发控制                │
│ □ 金融/支付逻辑                  │
│ □ 安全关键功能                   │
│ □ 复杂的业务不变式               │
│ □ 用户明确要求                   │
└──────────────────┬───────────────┘
                   │
         ┌─────────┴─────────┐
         │     任一勾选？    │
         └─────────┬─────────┘
            YES ↓      ↓ NO
                │      │
    ┌───────────┘      └──────────┐
    ↓                              ↓
使用形式化验证              跳过形式化验证
    │                      （单元测试 + E2E 足够）
    ↓
判断使用哪种:
├─ Property-based testing (最常用)
├─ TLA+ (状态机/并发)
└─ Lean (数学证明)
```

---

## ✅ 应该使用形式化验证的场景

### 1. 状态机/并发控制（使用 TLA+）

**触发条件**：

- 代码包含 XState 状态机
- 涉及多个并发操作
- 有竞态条件风险（如：RequestQueue）

**示例任务**：

```
用户：「实现订单自动保存，但要防止并发保存冲突」
```

**AI 判断**：

```
关键词检测: "并发"、"冲突"
涉及组件: RequestQueue（管理并发）
风险: 竞态条件
决策: ✅ 使用 TLA+ 建模
```

**实施**：

```tla
---- MODULE RequestQueue ----
EXTENDS Naturals, Sequences

VARIABLES queue, inflight

TypeInvariant ==
  /\ queue \in Seq(Request)
  /\ inflight \in [RequestId -> BOOLEAN]

SafetyProperty ==
  \* 同一个 key 不能同时有两个请求 in-flight
  \A r1, r2 \in DOMAIN inflight :
    (inflight[r1] /\ inflight[r2] /\ r1.key = r2.key) => r1 = r2
```

---

### 2. 金融/支付逻辑（使用 Property-based Testing）

**触发条件**：

- 涉及金钱计算
- 折扣、优惠券、积分
- 退款逻辑

**示例任务**：

```
用户：「添加优惠券功能，可以叠加使用」
```

**AI 判断**：

```
关键词检测: "优惠券"、"叠加"
风险: 金额计算错误
决策: ✅ 使用 Property-based Testing
```

**实施**：

```typescript
import { fc } from "@fast-check/vitest";

test("优惠券叠加后总价不能为负", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 10000 }), // 原价
      fc.array(fc.integer({ min: 0, max: 1000 }), { maxLength: 5 }), // 优惠券
      (price, coupons) => {
        const result = applyCoupons(price, coupons);
        return result.finalPrice >= 0; // 不变式: 最终价格 >= 0
      },
    ),
  );
});

test("优惠券顺序不影响最终价格（交换律）", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 10000 }),
      fc.array(fc.integer({ min: 0, max: 1000 })),
      (price, coupons) => {
        const result1 = applyCoupons(price, coupons);
        const result2 = applyCoupons(price, [...coupons].reverse());
        return result1.finalPrice === result2.finalPrice;
      },
    ),
  );
});
```

---

### 3. 安全关键功能（使用 Property-based Testing）

**触发条件**：

- 权限检查
- 数据加密/解密
- 输入验证

**示例任务**：

```
用户：「实现用户权限系统，管理员可以删除任何订单」
```

**AI 判断**：

```
关键词检测: "权限"、"管理员"
风险: 权限绕过漏洞
决策: ✅ 使用 Property-based Testing
```

**实施**：

```typescript
test("非管理员永远不能删除他人订单", () => {
  fc.assert(
    fc.property(
      fc.record({
        userId: fc.uuid(),
        role: fc.constantFrom("user", "guest"),
      }),
      fc.uuid(), // orderId
      fc.uuid(), // orderOwnerId
      (user, orderId, orderOwnerId) => {
        fc.pre(user.userId !== orderOwnerId); // 前提：不是订单拥有者

        const canDelete = checkPermission(user, "delete", orderId, orderOwnerId);
        return canDelete === false; // 不变式：必须返回 false
      },
    ),
  );
});
```

---

### 4. 复杂业务不变式（使用 Property-based Testing）

**触发条件**：

- 有多个相互依赖的业务规则
- 规则之间可能冲突
- 边界条件复杂

**示例任务**：

```
用户：「库存扣减规则：
      - 普通用户一次最多买 10 件
      - VIP 用户一次最多买 50 件
      - 库存不足时自动降级到可用数量
      - 但最少要买 1 件，否则失败」
```

**AI 判断**：

```
规则数量: 4 条
相互依赖: 是（库存 vs 用户限制）
边界情况: 多（库存为 0、为 1、接近限制）
决策: ✅ 使用 Property-based Testing
```

**实施**：

```typescript
test("库存扣减不变式", () => {
  fc.assert(
    fc.property(
      fc.record({
        userType: fc.constantFrom("normal", "vip"),
        requestQty: fc.integer({ min: 1, max: 100 }),
        currentStock: fc.integer({ min: 0, max: 1000 }),
      }),
      ({ userType, requestQty, currentStock }) => {
        const result = reserveStock(userType, requestQty, currentStock);

        // 不变式 1: 扣减数量不能超过库存
        if (result.success) {
          expect(result.reserved).toBeLessThanOrEqual(currentStock);
        }

        // 不变式 2: 扣减数量不能超过用户限制
        const limit = userType === "vip" ? 50 : 10;
        if (result.success) {
          expect(result.reserved).toBeLessThanOrEqual(limit);
        }

        // 不变式 3: 如果成功，至少扣减 1 件
        if (result.success) {
          expect(result.reserved).toBeGreaterThanOrEqual(1);
        }

        // 不变式 4: 如果失败，库存必须为 0
        if (!result.success) {
          expect(currentStock).toBe(0);
        }

        return true;
      },
    ),
  );
});
```

---

## ❌ 不需要形式化验证的场景

### 1. 简单 CRUD 操作

**示例任务**：

```
用户：「添加一个备注字段到订单表单」
```

**AI 判断**：

```
复杂度: 低（简单字段）
风险: 低（UI 输入）
决策: ❌ 跳过形式化验证
使用: 单元测试 + E2E 足够
```

---

### 2. UI 组件样式

**示例任务**：

```
用户：「把保存按钮改成绿色」
```

**AI 判断**：

```
类型: 纯 UI
风险: 无（不涉及逻辑）
决策: ❌ 跳过形式化验证
使用: 截图验证足够
```

---

### 3. 已有充分单元测试覆盖的简单逻辑

**示例任务**：

```
用户：「计算订单总价（单价 × 数量）」
```

**AI 判断**：

```
复杂度: 低（简单乘法）
已有测试:
  test('calcTotal', () => {
    expect(calcTotal(10, 100)).toBe(1000);
  })
决策: ❌ 跳过形式化验证
原因: 单元测试已充分覆盖
```

---

## 🎯 判断流程（AI 执行）

### Step 1: 分析任务特征

```typescript
// AI 内部决策逻辑
function analyzeTask(task: string): TaskAnalysis {
  const features = {
    hasStateMachine: /状态机|state machine|xstate|concurrent/i.test(task),
    hasFinancial: /金额|支付|优惠券|折扣|退款/i.test(task),
    hasSecurity: /权限|加密|认证|授权/i.test(task),
    hasComplexRules: countBusinessRules(task) > 3,
    explicitRequest: /形式化|property.*test|TLA|Lean/i.test(task),
  };

  const complexity = assessComplexity(task);
  const risk = assessRisk(task);

  return { features, complexity, risk };
}
```

### Step 2: 应用决策规则

```typescript
function shouldUseFormalVerification(analysis: TaskAnalysis): boolean {
  // 规则 1: 用户明确要求
  if (analysis.features.explicitRequest) {
    return true;
  }

  // 规则 2: 高风险场景
  if (
    analysis.risk === "high" &&
    (analysis.features.hasFinancial || analysis.features.hasSecurity)
  ) {
    return true;
  }

  // 规则 3: 状态机 + 并发
  if (analysis.features.hasStateMachine && analysis.complexity === "high") {
    return true;
  }

  // 规则 4: 复杂业务规则
  if (analysis.features.hasComplexRules && analysis.risk === "medium") {
    return true;
  }

  // 默认: 不需要
  return false;
}
```

### Step 3: 选择合适的方法

```typescript
function selectFormalMethod(analysis: TaskAnalysis): FormalMethod {
  if (analysis.features.hasStateMachine) {
    return "TLA+"; // 状态机建模
  }

  if (
    analysis.features.hasFinancial ||
    analysis.features.hasSecurity ||
    analysis.features.hasComplexRules
  ) {
    return "Property-based Testing"; // 最实用
  }

  if (analysis.features.explicitRequest && /Lean|Coq/i.test(task)) {
    return "Lean"; // 数学证明（很少用）
  }

  return "Property-based Testing"; // 默认
}
```

---

## 📋 集成到 SOP

### 更新 ddd-development-workflow.md

在 **Step 3: TDD - 写测试** 之后添加：

```markdown
### Step 3.5: 判断是否需要形式化验证（可选）

运行判断：

□ 是否涉及状态机/并发？
□ 是否涉及金融/支付逻辑？
□ 是否涉及安全关键功能？
□ 是否有 >3 条相互依赖的业务规则？
□ 用户是否明确要求？

如果任一项为 YES:
→ 继续 Step 3.6

如果全部为 NO:
→ 跳过形式化验证，继续 Step 4（实现代码）
```

### Step 3.6: 实施形式化验证

```markdown
#### 场景 A: 状态机/并发（使用 TLA+）

1. 创建 TLA+ 规格文件
2. 定义状态空间和转换规则
3. 编写不变式
4. 运行 TLC 模型检查器
5. 修正发现的问题

#### 场景 B: 金融/安全/复杂规则（使用 Property-based Testing）

1. 识别业务不变式
2. 编写 Property-based 测试
3. 运行测试（自动生成数百个测试用例）
4. 修正失败的 properties
5. 确保所有不变式成立

#### 场景 C: 数学证明（使用 Lean，极少用）

1. 形式化定义
2. 编写证明
3. Lean 类型检查器验证
```

---

## 🔍 实战示例

### 示例 1: 自动判断「不需要」

**任务**：

```
用户：「在订单表单添加一个备注输入框」
```

**AI 分析**：

```typescript
{
  features: {
    hasStateMachine: false,      // 无状态机
    hasFinancial: false,         // 无金额
    hasSecurity: false,          // 无权限
    hasComplexRules: false,      // 规则简单
    explicitRequest: false,      // 用户未要求
  },
  complexity: 'low',
  risk: 'low',
}

决策: shouldUseFormalVerification() → false ❌

输出:
「这是简单的 UI 添加，不需要形式化验证。
 我将使用单元测试 + E2E 测试。」
```

---

### 示例 2: 自动判断「需要」

**任务**：

```
用户：「实现积分兑换功能：
      - 积分可以抵扣订单金额（100 积分 = 1 元）
      - 积分不能超过订单金额的 50%
      - 使用积分后不能再撤销
      - VIP 用户积分抵扣比例是 80 积分 = 1 元」
```

**AI 分析**：

```typescript
{
  features: {
    hasStateMachine: false,
    hasFinancial: true,          // ✅ 涉及金额
    hasSecurity: false,
    hasComplexRules: true,       // ✅ 4 条规则
    explicitRequest: false,
  },
  complexity: 'medium',
  risk: 'high',                  // ✅ 金钱相关
}

决策: shouldUseFormalVerification() → true ✅

方法: selectFormalMethod() → 'Property-based Testing'

输出:
「这涉及金融计算且有多条相互依赖的规则。
 我将使用 Property-based Testing 来验证不变式。」
```

**AI 实施**：

```typescript
import { fc } from "@fast-check/vitest";

test("积分兑换不变式", () => {
  fc.assert(
    fc.property(
      fc.record({
        orderAmount: fc.integer({ min: 1, max: 100000 }), // 订单金额（分）
        userPoints: fc.integer({ min: 0, max: 1000000 }), // 用户积分
        isVip: fc.boolean(),
      }),
      ({ orderAmount, userPoints, isVip }) => {
        const result = redeemPoints(orderAmount, userPoints, isVip);

        // 不变式 1: 积分抵扣不能超过订单金额 50%
        const maxDeduction = orderAmount * 0.5;
        expect(result.deduction).toBeLessThanOrEqual(maxDeduction);

        // 不变式 2: 不能使用超过拥有的积分
        expect(result.pointsUsed).toBeLessThanOrEqual(userPoints);

        // 不变式 3: 最终金额 >= 0
        expect(result.finalAmount).toBeGreaterThanOrEqual(0);

        // 不变式 4: 最终金额 = 订单金额 - 抵扣金额
        expect(result.finalAmount).toBe(orderAmount - result.deduction);

        return true;
      },
    ),
  );
});
```

---

## 💡 AI 输出示例

### 情况 1: 不需要形式化验证

```text
AI: 「分析任务特征...

任务: 添加备注字段
特征:
  - 复杂度: 低
  - 风险: 低
  - 金融相关: 否
  - 并发控制: 否

决策: ❌ 不需要形式化验证

理由: 这是简单的 CRUD 操作，单元测试 + E2E 测试足够。

我将:
  1. 写单元测试验证 Domain 逻辑
  2. 写 E2E 测试验证 UI 交互
  3. 运行 pnpm verify
」
```

### 情况 2: 需要形式化验证

```text
AI: 「分析任务特征...

任务: 积分兑换功能
特征:
  - 复杂度: 中
  - 风险: 高（涉及金额）
  - 业务规则: 4 条（相互依赖）
  - 边界条件: 复杂

决策: ✅ 需要形式化验证

方法: Property-based Testing

理由:
  1. 涉及金钱计算（高风险）
  2. 多条规则相互影响（容易出错）
  3. 边界条件复杂（积分不足、VIP vs 普通用户）

我将:
  1. 识别所有业务不变式（4 条）
  2. 编写 Property-based 测试（自动生成数百个用例）
  3. 验证所有不变式在任意输入下都成立
  4. 然后写单元测试 + E2E 测试
  5. 运行 pnpm verify
」
```

---

## 📊 成本收益分析

### Property-based Testing

| 维度         | 成本                 | 收益           |
| ------------ | -------------------- | -------------- |
| **时间**     | +20-30 分钟          | 发现边界 bug   |
| **代码量**   | +50-100 行           | 数百个测试用例 |
| **维护**     | 低（随代码演进）     | 持续保护       |
| **适用场景** | 金融、安全、复杂规则 | 高             |

### TLA+

| 维度         | 成本             | 收益             |
| ------------ | ---------------- | ---------------- |
| **时间**     | +2-4 小时        | 发现并发 bug     |
| **学习曲线** | 陡峭             | 状态空间完整验证 |
| **维护**     | 中（独立于代码） | 设计文档         |
| **适用场景** | 状态机、并发     | 极高             |

### Lean（极少用）

| 维度         | 成本             | 收益           |
| ------------ | ---------------- | -------------- |
| **时间**     | +数天            | 数学正确性证明 |
| **学习曲线** | 非常陡峭         | 绝对保证       |
| **适用场景** | 密码学、关键算法 | 有限           |

---

## ✅ 总结

### AI 判断标准（清单）

```
□ 任务涉及状态机/并发？        → YES: TLA+
□ 任务涉及金融/支付逻辑？      → YES: Property-based Testing
□ 任务涉及安全/权限？          → YES: Property-based Testing
□ 任务有 >3 条依赖业务规则？   → YES: Property-based Testing
□ 用户明确要求形式化验证？     → YES: 按用户指定

如果全部 NO → 跳过形式化验证，使用单元测试 + E2E
```

### 默认策略

**90% 的任务**: 单元测试 + E2E 足够
**10% 的任务**: 需要形式化验证（Property-based Testing 为主）

### 关键原则

> **"Formal verification is not always needed, but when needed, it's invaluable."**
>
> 不是每次都需要形式化验证，但需要时它价值极高。

---

**AI 现在知道何时使用形式化验证了！** ✅
