# DDD Development Workflow - Lauren Tan's Approach

> **Purpose**: Standard operating procedure for AI agents working in this DDD codebase.
> 
> **When to use**: EVERY time you receive a task to implement a feature, fix a bug, or refactor code.

---

## Workflow Overview

```text
收到需求
   ↓
1. 理解需求（ASK 澄清问题）
   ↓
2. 分析影响（哪些层需要改？）
   ↓
3. TDD：先写测试
   ↓
4. 实现代码
   ↓
5. 运行验证（./scripts/verify.sh → 先跑 `pnpm lint` / oxlint）
   ↓
6. 修正错误（如果验证失败；读 oxlint rule id，如 `ddd/domain-purity`）
   ↓
7. Commit & Push
```

---

## Step 1: Understand Requirements

### DO THIS FIRST

Before writing ANY code, clarify:

1. **What is the user trying to achieve?**
   - User story format: "As a [role], I want [action], so that [benefit]"

2. **What are the acceptance criteria?**
   - How will we know it's done correctly?
   - What should the UI look like?
   - What should happen on error?

3. **What business rules apply?**
   - Any constraints? (e.g., "quantity must be > 0")
   - Any edge cases? (e.g., "what if city list is empty?")

### Example Dialog

```
User: "Add a discount field to the order form"

❌ BAD: Immediately start coding
✅ GOOD: Ask clarifying questions

Agent: "I understand you want to add a discount field. Let me clarify:
1. Is this a percentage discount or fixed amount?
2. Should discount be applied before or after quantity calculation?
3. Can discount exceed 100% or the total price?
4. Should discount be visible to all user roles or just admin?
5. What should happen if discount is negative?"
```

**Principle**: Understanding wrong = everything else is wasted.

---

## Step 2: Analyze Impact (Which Layers?)

### Layer Decision Tree

```text
需求影响哪些层？
   │
   ├─ 纯业务规则？ → Domain
   │   例如：「折扣不能超过总价」
   │
   ├─ 用例编排？ → Application
   │   例如：「加载订单 → 应用折扣 → 保存」
   │
   ├─ HTTP/存储？ → Infrastructure
   │   例如：「保存折扣到数据库」
   │
   └─ UI/交互？ → Presentation
       例如：「折扣输入框 + XState 状态」
```

### Example: "Add discount to order"

**Analysis**:

1. **Domain**: 
   - Add `discount: Money` field to `Order` type
   - Add validation: `discount <= subtotal`
   - Update `calculateTotal` to subtract discount

2. **Application**:
   - Add `discount` parameter to `ApplyChange` use case
   - Update `OrderRepository` port to accept discount

3. **Infrastructure**:
   - Update `HttpOrderRepository` to send discount in DTO
   - Update `MockOrderRepository` for tests

4. **Presentation**:
   - Add discount input field in UI
   - Update XState context to include discount
   - Add `CHANGE_DISCOUNT` event

**Output**: Write this analysis down, confirm with user if uncertain.

---

## Step 3: Test-Driven Development (TDD)

### Rule: Tests BEFORE Implementation

**Why?**
- Tests define "correct behavior" (independent of your implementation guess)
- Prevents "self-consistent" implementation + test that are both wrong
- Verification will catch if your tests are wrong (E2E layer)

### Process

#### 3.1 Domain Tests (Pure Functions)

```typescript
// ✅ FIRST: Write the test
// templates/demo/src/domain/order/applyDiscount.test.ts

import { describe, test, expect } from 'vitest';
import { applyDiscount } from './applyDiscount';
import { createOrder } from './Order';
import { money } from './Money';

describe('applyDiscount', () => {
  test('折扣金额从总价中扣除', () => {
    const order = createOrder('o1', 1, 10, money(100)); // qty=10, unitPrice=100
    const result = applyDiscount(order, money(50)); // 折扣 50
    
    expect(result.total.amount).toBe(950); // 1000 - 50
  });

  test('折扣不能超过总价', () => {
    const order = createOrder('o1', 1, 10, money(100));
    
    expect(() => applyDiscount(order, money(1500))).toThrow('折扣不能超过总价');
  });

  test('折扣不能为负数', () => {
    const order = createOrder('o1', 1, 10, money(100));
    
    expect(() => applyDiscount(order, money(-10))).toThrow('折扣必须 >= 0');
  });
});
```

**At this point**: Tests fail (function doesn't exist yet). This is CORRECT.

#### 3.2 THEN: Implement to Pass Tests

```typescript
// ✅ SECOND: Write implementation
// templates/demo/src/domain/order/applyDiscount.ts

import type { Order } from './Order';
import type { Money } from './Money';
import { addMoney, money } from './Money';

export function applyDiscount(order: Order, discount: Money): Order {
  // Validation (business rules)
  if (discount.amount < 0) {
    throw new Error('折扣必须 >= 0');
  }
  
  const subtotal = calculateSubtotal(order);
  if (discount.amount > subtotal.amount) {
    throw new Error('折扣不能超过总价');
  }
  
  // Apply discount
  return Object.freeze({
    ...order,
    discount,
    total: money(subtotal.amount - discount.amount, subtotal.currency),
  });
}
```

#### 3.3 Run Unit Tests

```bash
cd templates/demo
pnpm test src/domain/order/applyDiscount.test.ts
```

**Expected**: All tests pass.

### Repeat for Each Layer

- Application layer: Mock Ports
- Infrastructure layer: Test with real RequestQueue
- Presentation layer: Will be covered by E2E

---

## Step 4: Implement Code (All Layers)

Follow the layer analysis from Step 2.

### Domain Layer

```typescript
// Update Order type
export type Order = Readonly<{
  id: string;
  version: number;
  items: readonly CartItem[];
  discount?: Money;  // NEW
}>;

// Update calculateTotal
export function calculateTotal(order: Order): Money {
  const subtotal = calculateSubtotal(order.items);
  const discount = order.discount?.amount ?? 0;
  return money(subtotal.amount - discount, subtotal.currency);
}
```

### Application Layer

```typescript
// Update use case to accept discount
export type ApplyChangeInput = {
  orderId: string;
  changes: {
    qty?: number;
    city?: string;
    discount?: Money;  // NEW
  };
  expectedVersion: number;
};
```

### Infrastructure Layer

```typescript
// Update DTO
export type OrderDto = {
  id: string;
  version: number;
  items: CartItemDto[];
  discount?: { amount: number; currency: string };  // NEW
};
```

### Presentation Layer

```typescript
// Update XState context
type OrderContext = {
  order: Order | null;
  discount: Money | null;  // NEW
  // ...
};

// Add event
type OrderEvent = 
  | { type: 'CHANGE_DISCOUNT'; discount: Money }
  | // ... other events
```

**Principle**: Follow dependency direction (Domain ← Application ← Infrastructure, Presentation).

---

## Step 5: Run Verification

### CRITICAL: Run Full Verification

```bash
./scripts/verify.sh
```

This runs (see `scripts/verify.sh`):
1. ✅ **oxlint** — DDD layer rules via `pnpm lint` / `ddd-plugin`
2. ✅ **oxfmt --check** — format via `pnpm fmt:check` (fix with `pnpm fmt`)
3. ✅ TypeScript compilation
4. ✅ Unit tests (demo + create-dddfe)
5. ✅ Production build

Optional (not in default verify): E2E, runtime inspector, bundle size, `verify:arch`.

### Expected: ALL PASS

If ANY step fails, go to Step 6.

---

## Step 6: Fix Errors (Self-Correcting Loop)

### Rule: Read Error, Understand, Fix CODE (NOT Tests)

#### Example Error 1: oxlint DDD violation

```
❌ oxlint (DDD layer rules) failed
  error: ddd/domain-purity
  templates/demo/src/domain/order/applyDiscount.ts
```

**Action**:
1. Read rule id: `ddd/domain-purity` (see `templates/demo/agent.md` table)
2. Understand: Domain imported UI / fetch / storage / another layer
3. Fix: move IO to Infrastructure; keep Domain pure

```typescript
// ❌ BAD — Domain must not do HTTP
import axios from 'axios';
export async function applyDiscount(order: Order) {
  const discount = await axios.get('/api/discounts');
}

// ✅ GOOD — Domain pure; Infrastructure implements Port
export function applyDiscount(order: Order, discount: Money): Order {
  // pure validation + transform
}
```

Primary lint command: `pnpm lint` (oxlint). Config: `.oxlintrc.json` + `oxlint/ddd-plugin.js`.

#### Example Error 2: Unit Test Failure

```
❌ Unit tests failed

  FAIL  src/domain/order/applyDiscount.test.ts
  ● applyDiscount › 折扣不能超过总价

    expect(received).toThrow()

    Received function did not throw
```

**Action**:
1. Read error: "Expected to throw, but didn't"
2. Understand: I forgot to add validation
3. Fix: Add the validation in implementation

```typescript
// ❌ Current (no validation)
export function applyDiscount(order: Order, discount: Money): Order {
  return { ...order, discount };
}

// ✅ Fixed (with validation)
export function applyDiscount(order: Order, discount: Money): Order {
  const subtotal = calculateSubtotal(order);
  if (discount.amount > subtotal.amount) {
    throw new Error('折扣不能超过总价');  // ADD THIS
  }
  return { ...order, discount };
}
```

#### Example Error 3: E2E Test Failure

```
❌ E2E tests failed

  FAIL  e2e/order-flow.spec.ts
  ● 用户可以应用折扣

    Expected: "折扣：50"
    Received: "折扣：undefined"
```

**Action**:
1. Read error: UI shows "undefined" instead of discount amount
2. Understand: I forgot to display discount in UI
3. Fix: Add discount display in component

```tsx
// ✅ Add to UI
<div className="discount">
  折扣：{order.discount?.amount ?? 0}
</div>
```

### Re-run Verification

```bash
./scripts/verify.sh
```

**Repeat Step 5-6 until all checks pass.**

---

## Step 7: Commit & Push

### Only After Verification Passes

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add discount field to order

- Add discount: Money field to Order type
- Add applyDiscount domain function with validation
- Update ApplyChange use case to accept discount
- Add discount input to order form UI
- Add CHANGE_DISCOUNT event to XState machine

Validation rules:
- Discount must be >= 0
- Discount cannot exceed subtotal

Tests: All unit + E2E tests pass
Verification: ./scripts/verify.sh passes"

# Push
git push origin main
```

---

## Common Mistakes to Avoid

### ❌ Mistake 1: Skip Requirements Clarification

```
User: "Add discount"
Agent: *immediately starts coding*
Result: Builds wrong thing (percentage vs fixed amount)
```

**Fix**: Always ask clarifying questions first.

### ❌ Mistake 2: Write Implementation Before Tests

```
Agent writes applyDiscount() → writes test that matches implementation
Result: Both wrong, but test passes
```

**Fix**: TDD. Test defines correct behavior, implementation must satisfy it.

### ❌ Mistake 3: Modify Tests to Match Code

```
Test fails → Agent changes test to pass
```

**Fix**: Tests are TRUTH. Code must change, not tests.

### ❌ Mistake 4: Skip Verification

```
Agent: "I think it's done"
*doesn't run ./scripts/verify.sh*
Result: Breaks in production
```

**Fix**: ALWAYS run verification before commit.

### ❌ Mistake 5: Ask Human for Every Error

```
Verification fails → Agent: "What should I do?"
```

**Fix**: Read error message, understand root cause, fix code, re-verify.

---

## Success Criteria

You've completed the workflow correctly when:

1. ✅ Requirements are clear (you asked clarifying questions)
2. ✅ Layer analysis documented (you know which files to change)
3. ✅ Tests written BEFORE implementation
4. ✅ All unit tests pass
5. ✅ `./scripts/verify.sh` passes (oxlint + tsc + tests + build)
6. ✅ Code committed with descriptive message
7. ✅ You did NOT need to ask human for help debugging errors

---

## Quick Reference

### Every Task Checklist

```
[ ] Step 1: Clarify requirements (ASK questions)
[ ] Step 2: Analyze layer impact (Domain/App/Infra/Presentation)
[ ] Step 3: Write tests FIRST (TDD)
[ ] Step 4: Implement code (follow layer dependencies)
[ ] Step 5: Run ./scripts/verify.sh
[ ] Step 6: Fix errors (read, understand, fix code)
[ ] Step 7: Commit & Push (only after verification passes)
```

### Verification Commands

```bash
# Full verification (use this)
./scripts/verify.sh

# Individual checks (for debugging)
pnpm lint                      # oxlint + ddd-plugin (PRIMARY architecture)
pnpm fmt:check                 # oxfmt (formatter; fix with pnpm fmt)
pnpm --dir templates/demo test # Unit tests
pnpm run verify:arch           # Optional ts-morph scan (secondary)
pnpm run verify:runtime        # Optional Chrome DevTools
pnpm run verify:bundle         # Optional bundle size
```

---

## Final Principle

> **"Tests are truth. Code must change to satisfy tests, never the reverse."**
> 
> **"Verification failing is GOOD. It caught an error before production."**
> 
> **"Ask questions UP FRONT. Fix errors AUTONOMOUSLY."**

---

**Now execute this workflow for your current task.** 🚀
