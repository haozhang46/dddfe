# 运行时验证指南 - Chrome DevTools + Lighthouse

> **核心能力**：让 AI 能"看到"应用实际运行的状态，而不是猜测。

---

## 快速开始

### 基础检查（无 Lighthouse）

```bash
# 确保应用正在运行（localhost:5173）
pnpm dev

# 另一个终端运行检查
pnpm run verify:runtime
```

**输出**：

- ✅ Console 日志（errors, warnings, info）
- ✅ Network 请求（成功/失败）
- ✅ 性能指标（内存、DOM 节点）
- ✅ Web Vitals（LCP, CLS, FCP）
- ✅ 截图（自动保存）

### 完整检查（含 Lighthouse）

```bash
pnpm run verify:runtime:lighthouse
```

**额外输出**：

- 🏠 Lighthouse 五大分数（Performance/Accessibility/Best Practices/SEO/PWA）
- 💡 优化建议（按影响排序）
- 📊 详细性能指标

---

## 功能详解

### 1. Console 监控

**能力**：实时读取浏览器 Console 输出

**用途**：

- 捕获 JavaScript 错误
- 发现警告信息
- 记录调试日志

**示例输出**：

```text
📝 [Console log] App initialized
❌ [Console error] Uncaught TypeError: Cannot read property 'x' of undefined
⚠️  [Console warn] Deprecation warning: useEffect with no dependencies
```

**AI 如何使用**：

```
AI 运行 verify:runtime
   ↓
看到: ❌ [Console error] Cannot read property 'discount' of undefined
   ↓
理解: discount 字段未初始化
   ↓
修正代码: 添加 discount: null 默认值
   ↓
重新验证: ✅ 无 Console 错误
```

### 2. Network 监控

**能力**：追踪所有 HTTP 请求

**用途**：

- 发现失败的 API 调用
- 检测慢请求
- 验证请求方法和状态码

**示例输出**：

```text
Network Requests: 12 total
  Failed: 1

❌ Failed Requests:
  - http://localhost:5173/api/orders/123 (404 Not Found)
```

**AI 如何使用**：

```
AI 实现新功能: 加载订单详情
   ↓
运行 verify:runtime
   ↓
看到: ❌ Failed: /api/orders/123 (404)
   ↓
理解: 端点不存在或 Mock 数据缺失
   ↓
修正: 添加 Mock 数据或修正 URL
```

### 3. 性能指标

**能力**：测量真实运行时性能

**指标**：

| 指标             | 含义                     | 目标值              |
| ---------------- | ------------------------ | ------------------- |
| **JS Heap Size** | JavaScript 内存使用      | < 50 MB（初始加载） |
| **DOM Nodes**    | 页面 DOM 节点数          | < 1,500             |
| **LCP**          | Largest Contentful Paint | < 2.5s              |
| **FCP**          | First Contentful Paint   | < 1.8s              |
| **CLS**          | Cumulative Layout Shift  | < 0.1               |
| **TBT**          | Total Blocking Time      | < 300ms             |

**示例输出**：

```text
📊 Performance Metrics:
  JS Heap: 23.45 MB
  DOM Nodes: 847
  LCP: 1250ms ✅
  FCP: 890ms ✅
  CLS: 0.045 ✅
```

**AI 如何使用（Hill Climbing）**：

```
Baseline:
  JS Heap: 45 MB
  LCP: 3200ms ❌

AI 优化: Lazy load 大组件
   ↓
重新测量:
  JS Heap: 28 MB ✅ (-37%)
  LCP: 1800ms ✅ (-43%)
   ↓
判断: 性能改进 → 保留改动
```

### 4. Lighthouse 审计

**能力**：全面的质量评估（Google 标准）

**五大分类**：

1. **Performance（性能）**
   - FCP, LCP, TBT, CLS, Speed Index
   - 资源优化建议

2. **Accessibility（无障碍）**
   - ARIA 标签
   - 颜色对比度
   - 键盘导航

3. **Best Practices（最佳实践）**
   - HTTPS
   - Console 错误
   - 浏览器兼容性

4. **SEO**
   - Meta 标签
   - 可抓取性
   - 移动友好

5. **PWA（渐进式 Web 应用）**
   - Service Worker
   - Manifest
   - 离线支持

**示例输出**：

```text
🏠 Lighthouse Scores:
  Performance:    87/100 ⚠️
  Accessibility:  95/100 ✅
  Best Practices: 100/100 ✅
  SEO:            92/100 ✅
  PWA:            30/100 ❌

💡 Top Opportunities:
  - Eliminate render-blocking resources: Save 1.2s
  - Enable text compression: Save 0.8s
  - Properly size images: Save 0.5s
```

**AI 如何使用**：

```
AI 看到 Performance: 67/100 ❌
   ↓
读取 Opportunities:
  1. Eliminate render-blocking resources: Save 1.2s
  2. Enable text compression: Save 0.8s
   ↓
AI 实现:
  1. 添加 async/defer 到 script 标签
  2. 启用 gzip 压缩
   ↓
重新运行: Performance: 89/100 ✅
```

### 5. 自动截图

**能力**：保存页面渲染结果

**用途**：

- 可视化回归测试
- 证据记录（给人类看）
- UI 问题调试

**文件位置**：`./screenshots/runtime-{timestamp}.png`

**AI 如何使用**：

```
AI 改了 CSS 布局
   ↓
运行 verify:runtime（自动截图）
   ↓
人类查看截图:
  「按钮跑到屏幕外了！」
   ↓
AI 修正 CSS
```

---

## 实战场景

### 场景 1：发现 Console 错误

**问题**：用户报告「保存按钮点击无反应」

**传统调试**：

```
人类: 手动打开 DevTools → 点击按钮 → 看 Console
      发现: Uncaught TypeError...
      截图发给 AI
AI:   根据截图理解错误 → 修正
```

**Lauren Tan 方式**：

```bash
pnpm run verify:runtime
```

**AI 自动看到**：

```
❌ [Console error] Uncaught TypeError: Cannot read property 'save' of undefined
   at OrderForm.tsx:42
```

**AI 自主修正**：

```typescript
// 错误代码
const handleSave = () => {
  orderService.save(); // orderService 未初始化
};

// AI 修正
const handleSave = () => {
  if (!orderService) {
    console.error("OrderService not initialized");
    return;
  }
  orderService.save();
};
```

**验证**：

```bash
pnpm run verify:runtime
✅ No console errors
```

---

### 场景 2：性能优化（Hill Climbing）

**目标**：将 LCP 降到 2.5s 以下

**Baseline 测量**：

```bash
pnpm run verify:runtime

📊 Performance:
  LCP: 3200ms ❌ (目标 < 2500ms)
```

**AI 迭代 1：Lazy Load 图片**

```typescript
// Before
<img src="/hero.png" />

// After
<img src="/hero.png" loading="lazy" />
```

**测量**：

```bash
pnpm run verify:runtime
LCP: 2900ms ⚠️ (-9%)
```

**AI 迭代 2：预加载关键资源**

```html
<link rel="preload" href="/hero.png" as="image" />
```

**测量**：

```bash
pnpm run verify:runtime
LCP: 2200ms ✅ (-31% from baseline)
```

**决策**：2200ms < 2500ms → 保留所有改动 ✅

---

### 场景 3：Lighthouse 驱动的改进

**运行完整审计**：

```bash
pnpm run verify:runtime:lighthouse
```

**输出**：

```text
🏠 Lighthouse Scores:
  Performance:    67/100 ❌

💡 Top Opportunities:
  1. Eliminate render-blocking resources: Save 1.5s
     → Defer non-critical CSS/JS

  2. Enable text compression: Save 1.2s
     → Configure gzip in Vite

  3. Reduce unused JavaScript: Save 0.8s
     → Tree-shaking + code splitting
```

**AI 按优先级实现**：

**1. Defer non-critical resources**：

```typescript
// vite.config.ts
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          ui: ["@mui/material"],
        },
      },
    },
  },
};
```

**2. Enable compression**：

```typescript
// vite.config.ts
import viteCompression from "vite-plugin-compression";

export default {
  plugins: [viteCompression()],
};
```

**重新测量**：

```bash
pnpm run verify:runtime:lighthouse

🏠 Lighthouse Scores:
  Performance:    89/100 ✅ (+22 points)
```

---

## 集成到验证流程

### 更新 verify.sh

```bash
#!/bin/bash
# scripts/verify.sh

# ... 其他检查 ...

# 7. 运行时验证
echo "━━━ 7/7 运行时验证 (Chrome DevTools) ━━━"

# 启动 dev server（后台）

pnpm dev &
DEV_PID=$!

# 等待启动
sleep 5

# 运行运行时检查
cd ../..
pnpm run verify:runtime || {
  kill $DEV_PID
  exit 1
}

# 清理
kill $DEV_PID

echo ""
echo "✅ 所有验证通过！"
```

### AI 工作流

```text
AI 改代码
   ↓
运行 pnpm verify
   ↓
第 7 步: 运行时验证
   ├─ 启动 dev server
   ├─ 运行 runtime-inspector
   ├─ 读取 Console
   ├─ 检查 Network
   ├─ 测量 Performance
   └─ 截图保存
   ↓
   ├─ ✅ 通过 → Commit
   └─ ❌ 失败 → 读错误 → 修正 → 重试
```

---

## 错误处理指南

### 错误 1：Console Error

**输出**：

```
❌ [Console error] Uncaught TypeError: Cannot read property 'x' of undefined
```

**AI 处理**：

1. 定位文件和行号
2. 检查变量初始化
3. 添加空值检查或初始化
4. 重新验证

### 错误 2：Network Failure

**输出**：

```
❌ Failed: /api/orders/123 (404 Not Found)
```

**AI 处理**：

1. 检查 API 端点是否正确
2. 检查 Mock 数据是否存在
3. 确认路由配置
4. 重新验证

### 错误 3：Performance Degradation

**输出**：

```
⚠️  LCP: 4500ms (was 2200ms) ❌ (+104%)
```

**AI 处理**：

1. 对比前后代码差异
2. 识别新增的重资源（图片、库）
3. 应用优化（lazy loading, code splitting）
4. 重新测量

### 错误 4：Lighthouse Score Drop

**输出**：

```
Performance: 45/100 (was 89/100) ❌ (-44 points)
```

**AI 处理**：

1. 查看 Opportunities 列表
2. 按 savings 排序修复
3. 逐项实施优化
4. 重新审计

---

## 高级用法

### 1. 自定义检查脚本

```typescript
// scripts/custom-runtime-check.ts
import RuntimeInspector from "./tools/runtime-inspector";

async function checkOrderFlow() {
  const inspector = new RuntimeInspector();
  await inspector.start();

  // 检查首页
  const home = await inspector.inspect("http://localhost:5173");

  // 检查订单页
  const order = await inspector.inspect("http://localhost:5173/order");

  // 自定义断言
  if (order.console.filter((m) => m.type === "error").length > 0) {
    console.error("❌ 订单页有 Console 错误");
    process.exit(1);
  }

  if (order.performance.LCP! > 2500) {
    console.error("❌ 订单页 LCP 超过 2.5s");
    process.exit(1);
  }

  console.log("✅ 订单流程验证通过");

  await inspector.stop();
}

checkOrderFlow();
```

### 2. CI/CD 集成

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  runtime-verification:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: pnpm install

      - name: Build app
        run: pnpm build

      - name: Start server
        run: pnpm preview &

      - name: Run runtime verification
        run: pnpm run verify:runtime:lighthouse

      - name: Upload screenshots
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: screenshots
          path: screenshots/
```

### 3. 性能预算

```typescript
// scripts/performance-budget.ts
import RuntimeInspector from "./tools/runtime-inspector";

const BUDGETS = {
  LCP: 2500,
  FCP: 1800,
  CLS: 0.1,
  JSHeapSize: 50 * 1024 * 1024, // 50MB
  lighthousePerformance: 90,
};

async function checkBudgets() {
  const inspector = new RuntimeInspector();
  await inspector.start();

  const result = await inspector.inspect("http://localhost:5173", {
    runLighthouse: true,
  });

  const violations: string[] = [];

  if (result.performance.LCP && result.performance.LCP > BUDGETS.LCP) {
    violations.push(`LCP: ${result.performance.LCP}ms > ${BUDGETS.LCP}ms`);
  }

  if (result.performance.jsHeapSize > BUDGETS.JSHeapSize) {
    violations.push(
      `JS Heap: ${(result.performance.jsHeapSize / 1024 / 1024).toFixed(2)}MB > ${BUDGETS.JSHeapSize / 1024 / 1024}MB`,
    );
  }

  if (result.lighthouse && result.lighthouse.performance < BUDGETS.lighthousePerformance) {
    violations.push(
      `Lighthouse Performance: ${result.lighthouse.performance} < ${BUDGETS.lighthousePerformance}`,
    );
  }

  await inspector.stop();

  if (violations.length > 0) {
    console.error("❌ Performance budget exceeded:");
    violations.forEach((v) => console.error(`  - ${v}`));
    process.exit(1);
  }

  console.log("✅ All performance budgets met");
}

checkBudgets();
```

---

## 总结

### 核心能力

| 能力                | 工具                     | 用途             |
| ------------------- | ------------------------ | ---------------- |
| **Console 监控**    | Chrome DevTools Protocol | 捕获错误、警告   |
| **Network 追踪**    | CDP Network domain       | 检测失败请求     |
| **性能测量**        | CDP Performance API      | Web Vitals, 内存 |
| **Lighthouse 审计** | Google Lighthouse        | 全面质量评估     |
| **自动截图**        | Playwright               | 可视化证据       |

### AI 使用方式

```text
运行 verify:runtime
   ↓
自动收集:
  - Console 日志
  - Network 请求
  - 性能指标
  - Lighthouse 分数
  - 截图
   ↓
AI 读取结果
   ↓
   ├─ 有错误 → 自主修正
   ├─ 性能差 → 优化迭代
   └─ 全通过 → Commit
```

### 与其他验证层配合

```text
单元测试 (秒级)      → 快速反馈、精确定位
   ↓
E2E 测试 (分钟级)    → 行为验证、流程完整性
   ↓
运行时验证 (分钟级)  → 真实性能、Console/Network
   ↓
置信度: 90%+
```

---

**现在 AI 可以"看到"应用实际运行的状态了！** ✅

**试试运行：`pnpm run verify:runtime:lighthouse`** 🚀
