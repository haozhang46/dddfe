# 验证工具完整实现 - Lauren Tan 方法

> **核心思路**：给 AI Agent 提供「运行 → 观察 → 测量 → 修正」的完整能力

## 工具链架构

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. 静态检查 (编译时)                                          │
│    · TypeScript (tsc)                                       │
│    · oxlint + ddd-plugin (架构约束)                          │
│    · ts-morph (AST 分析 + Codemod)                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. 单元测试 (隔离验证)                                        │
│    · Vitest (Domain/Application/Infrastructure)            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. E2E 测试 (真实行为)                                        │
│    · Playwright (浏览器自动化)                               │
│    · 启动 dev server → 交互 → 断言结果                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. 运行时观察 (AI 获取上下文)                                 │
│    · Chrome DevTools Protocol                               │
│    · Network 请求、Console 日志、性能指标                    │
│    · 截图、录屏                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. 性能度量 (Hill Climbing)                                  │
│    · Bundle size                                            │
│    · Lighthouse score                                       │
│    · Core Web Vitals                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. 形式化验证 (高级，可选)                                     │
│    · TLA+ (状态机规格)                                       │
│    · Lean (定理证明)                                         │
│    · Property-based testing                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 第一层：Playwright E2E 测试

### 安装

```bash
cd templates/demo
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

### 配置

```typescript
// templates/demo/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

### 核心测试：订单流程

```typescript
// templates/demo/e2e/order-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Order Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('用户可以创建订单并保存草稿', async ({ page }) => {
    // 1. 登录
    await page.click('text=登录');
    await page.fill('[name="username"]', 'admin');
    await page.fill('[name="password"]', 'admin123');
    await page.click('button:has-text("登录")');
    
    // 2. 等待跳转到订单页
    await expect(page).toHaveURL('/order');
    
    // 3. 填写订单信息
    await page.fill('[name="qty"]', '10');
    await page.selectOption('[name="city"]', { label: '北京' });
    await page.fill('[name="address"]', '海淀区中关村');
    
    // 4. 保存草稿
    await page.click('button:has-text("保存草稿")');
    
    // 5. 验证保存成功
    await expect(page.locator('.toast')).toContainText('保存成功');
    
    // 6. 验证字段值保留
    await expect(page.locator('[name="qty"]')).toHaveValue('10');
  });

  test('数量必须大于 0', async ({ page }) => {
    await page.goto('/order');
    
    // 尝试输入负数
    await page.fill('[name="qty"]', '-5');
    await page.click('button:has-text("提交")');
    
    // 验证错误提示
    await expect(page.locator('.error')).toContainText('数量必须大于 0');
  });

  test('自动保存在 500ms 后触发', async ({ page }) => {
    await page.goto('/order');
    
    // 监听网络请求
    const saveRequest = page.waitForRequest(
      request => request.url().includes('/api/orders') && request.method() === 'PATCH'
    );
    
    // 输入内容
    await page.fill('[name="qty"]', '5');
    
    // 等待自动保存触发
    await saveRequest;
    
    // 验证保存指示器
    await expect(page.locator('.save-indicator')).toContainText('已保存');
  });
});
```

### 性能测试

```typescript
// templates/demo/e2e/performance.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Performance', () => {
  test('首页加载时间 < 2s', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(2000);
  });

  test('XState 状态机响应时间 < 100ms', async ({ page }) => {
    await page.goto('/order');
    
    // 测量状态转换
    const start = Date.now();
    await page.click('button:has-text("保存草稿")');
    await page.waitForSelector('.toast');
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(100);
  });
});
```

---

## 第二层：Chrome DevTools Protocol 集成

### 创建 CLI 工具

这是 **Lauren Tan 的关键创新**：把浏览器自动化封装成可复用的 CLI，而不是每次让 Agent 重新写 Playwright 脚本。

```typescript
// scripts/tools/app-verifier.ts
import { chromium, Browser, Page } from '@playwright/test';
import { createServer } from 'vite';
import type { ViteDevServer } from 'vite';

export interface VerificationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  screenshots: string[];
  performance: {
    loadTime: number;
    bundleSize: number;
    memoryUsage: number;
  };
  console: {
    errors: string[];
    warnings: string[];
  };
}

export class AppVerifier {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private server: ViteDevServer | null = null;

  async start() {
    // 1. 启动 Vite dev server
    this.server = await createServer({
      root: process.cwd(),
      server: { port: 5173 },
    });
    await this.server.listen();
    console.log('✅ Dev server started at http://localhost:5173');

    // 2. 启动浏览器
    this.browser = await chromium.launch({ headless: true });
    const context = await this.browser.newContext();
    this.page = await context.newPage();

    // 3. 监听 Console
    this.page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      console.log(`[Browser ${type}] ${text}`);
    });

    // 4. 监听 Network
    this.page.on('requestfailed', (request) => {
      console.log(`❌ Request failed: ${request.url()}`);
    });
  }

  async verify(scenario: string): Promise<VerificationResult> {
    if (!this.page) throw new Error('Page not initialized');

    const result: VerificationResult = {
      success: true,
      errors: [],
      warnings: [],
      screenshots: [],
      performance: { loadTime: 0, bundleSize: 0, memoryUsage: 0 },
      console: { errors: [], warnings: [] },
    };

    try {
      const start = Date.now();

      // 访问页面
      await this.page.goto('http://localhost:5173');
      result.performance.loadTime = Date.now() - start;

      // 执行场景
      switch (scenario) {
        case 'order-flow':
          await this.verifyOrderFlow(result);
          break;
        case 'auth-flow':
          await this.verifyAuthFlow(result);
          break;
        default:
          throw new Error(`Unknown scenario: ${scenario}`);
      }

      // 获取性能指标
      const metrics = await this.page.evaluate(() => ({
        memory: (performance as any).memory?.usedJSHeapSize || 0,
      }));
      result.performance.memoryUsage = metrics.memory;

      // 截图
      const screenshotPath = `./screenshots/${scenario}-${Date.now()}.png`;
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      result.screenshots.push(screenshotPath);

    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    return result;
  }

  private async verifyOrderFlow(result: VerificationResult) {
    if (!this.page) return;

    // 1. 检查登录按钮存在
    const loginBtn = await this.page.locator('text=登录');
    if (!(await loginBtn.isVisible())) {
      result.errors.push('登录按钮不可见');
      return;
    }

    // 2. 登录
    await loginBtn.click();
    await this.page.fill('[name="username"]', 'admin');
    await this.page.fill('[name="password"]', 'admin123');
    await this.page.click('button:has-text("登录")');

    // 3. 等待跳转
    await this.page.waitForURL(/\/order/, { timeout: 5000 });

    // 4. 填写表单
    await this.page.fill('[name="qty"]', '10');
    
    // 5. 保存
    await this.page.click('button:has-text("保存草稿")');

    // 6. 验证成功提示
    const toast = this.page.locator('.toast');
    await toast.waitFor({ state: 'visible', timeout: 3000 });
    
    const text = await toast.textContent();
    if (!text?.includes('保存成功')) {
      result.errors.push(`期望看到"保存成功"，实际看到: ${text}`);
    }
  }

  private async verifyAuthFlow(result: VerificationResult) {
    // 实现认证流程验证
  }

  async stop() {
    await this.page?.close();
    await this.browser?.close();
    await this.server?.close();
    console.log('✅ Cleanup complete');
  }
}

// CLI 入口
async function main() {
  const scenario = process.argv[2] || 'order-flow';
  
  const verifier = new AppVerifier();
  
  try {
    await verifier.start();
    const result = await verifier.verify(scenario);
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 VERIFICATION RESULT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log(JSON.stringify(result, null, 2));
    
    if (!result.success) {
      console.error('\n❌ Verification failed');
      process.exit(1);
    }
    
    console.log('\n✅ Verification passed');
    
  } finally {
    await verifier.stop();
  }
}

if (require.main === module) {
  main().catch(console.error);
}
```

### 使用方式（给 Agent）

```bash
# Agent 只需要调用这个简单命令
pnpm exec tsx scripts/tools/app-verifier.ts order-flow

# 输出：
# ✅ Dev server started
# ✅ Browser launched
# [Browser log] XState: transitioning to 'editing'
# [Browser log] OrderService: saving draft...
# 📊 VERIFICATION RESULT
# {
#   "success": true,
#   "errors": [],
#   "performance": {
#     "loadTime": 823,
#     "memoryUsage": 12582912
#   }
# }
# ✅ Verification passed
```

**Lauren Tan 的原则**：
- ❌ **不要**：让 Agent 每次都写 50 行 Playwright 代码
- ✅ **要**：封装成 CLI，Agent 只需调用 `app-verifier.ts order-flow`

---

## 第三层：ts-morph 代码扫描与迁移

### AST 扫描工具

```typescript
// scripts/tools/architecture-scanner.ts
import { Project } from 'ts-morph';
import * as path from 'path';

interface Violation {
  file: string;
  line: number;
  message: string;
  severity: 'error' | 'warning';
}

export class ArchitectureScanner {
  private project: Project;
  private violations: Violation[] = [];

  constructor(tsConfigPath: string) {
    this.project = new Project({
      tsConfigFilePath: tsConfigPath,
    });
  }

  scan() {
    this.violations = [];
    
    this.checkDomainPurity();
    this.checkPortUsage();
    this.checkImmutability();
    
    return this.violations;
  }

  private checkDomainPurity() {
    const domainFiles = this.project.getSourceFiles('src/domain/**/*.ts');
    
    for (const file of domainFiles) {
      const imports = file.getImportDeclarations();
      
      for (const imp of imports) {
        const moduleSpecifier = imp.getModuleSpecifierValue();
        
        // 检查是否导入了 infrastructure
        if (moduleSpecifier.includes('infrastructure')) {
          this.violations.push({
            file: file.getFilePath(),
            line: imp.getStartLineNumber(),
            message: '❌ Domain 不能依赖 Infrastructure',
            severity: 'error',
          });
        }
        
        // 检查是否导入了 HTTP 库
        if (['axios', 'node-fetch', 'got'].includes(moduleSpecifier)) {
          this.violations.push({
            file: file.getFilePath(),
            line: imp.getStartLineNumber(),
            message: '❌ Domain 不能进行 HTTP 请求',
            severity: 'error',
          });
        }
        
        // 检查是否导入了 UI 框架
        if (['react', 'vue', '@vue/'].some(ui => moduleSpecifier.includes(ui))) {
          this.violations.push({
            file: file.getFilePath(),
            line: imp.getStartLineNumber(),
            message: '❌ Domain 不能依赖 UI 框架',
            severity: 'error',
          });
        }
      }
      
      // 检查是否使用了 fetch
      const fetchCalls = file.getDescendantsOfKind(SyntaxKind.CallExpression)
        .filter(call => call.getExpression().getText() === 'fetch');
      
      for (const call of fetchCalls) {
        this.violations.push({
          file: file.getFilePath(),
          line: call.getStartLineNumber(),
          message: '❌ Domain 不能使用 fetch',
          severity: 'error',
        });
      }
    }
  }

  private checkPortUsage() {
    const appFiles = this.project.getSourceFiles('src/application/**/*.ts');
    
    for (const file of appFiles) {
      if (file.getFilePath().includes('/ports/')) continue;
      
      const imports = file.getImportDeclarations();
      
      for (const imp of imports) {
        const moduleSpecifier = imp.getModuleSpecifierValue();
        
        // 检查是否直接导入具体实现
        if (moduleSpecifier.includes('infrastructure') && 
            (moduleSpecifier.includes('Http') || moduleSpecifier.includes('Mock'))) {
          this.violations.push({
            file: file.getFilePath(),
            line: imp.getStartLineNumber(),
            message: '⚠️  Application 应该依赖 Port 接口，而非具体实现',
            severity: 'warning',
          });
        }
      }
    }
  }

  private checkImmutability() {
    const domainFiles = this.project.getSourceFiles('src/domain/**/*.ts');
    
    for (const file of domainFiles) {
      // 检查 type 定义是否使用 Readonly
      const typeAliases = file.getTypeAliases();
      
      for (const typeAlias of typeAliases) {
        const typeNode = typeAlias.getTypeNode();
        if (!typeNode) continue;
        
        const text = typeNode.getText();
        if (!text.startsWith('Readonly<') && typeAlias.isExported()) {
          this.violations.push({
            file: file.getFilePath(),
            line: typeAlias.getStartLineNumber(),
            message: '⚠️  Domain 类型建议使用 Readonly<>',
            severity: 'warning',
          });
        }
      }
    }
  }

  printReport() {
    if (this.violations.length === 0) {
      console.log('✅ 没有发现架构违规');
      return;
    }
    
    console.log(`\n❌ 发现 ${this.violations.length} 个架构问题:\n`);
    
    const errors = this.violations.filter(v => v.severity === 'error');
    const warnings = this.violations.filter(v => v.severity === 'warning');
    
    if (errors.length > 0) {
      console.log('━━━ ERRORS ━━━\n');
      errors.forEach(v => {
        console.log(`${v.file}:${v.line}`);
        console.log(`  ${v.message}\n`);
      });
    }
    
    if (warnings.length > 0) {
      console.log('━━━ WARNINGS ━━━\n');
      warnings.forEach(v => {
        console.log(`${v.file}:${v.line}`);
        console.log(`  ${v.message}\n`);
      });
    }
  }
}

// CLI 入口
async function main() {
  const scanner = new ArchitectureScanner('./templates/demo/tsconfig.json');
  const violations = scanner.scan();
  scanner.printReport();
  
  const errors = violations.filter(v => v.severity === 'error');
  if (errors.length > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
```

### Codemod：自动添加 Readonly

```typescript
// scripts/tools/codemod-add-readonly.ts
import { Project, SyntaxKind } from 'ts-morph';

function addReadonlyToDomain(project: Project) {
  const domainFiles = project.getSourceFiles('src/domain/**/*.ts');
  
  for (const file of domainFiles) {
    const typeAliases = file.getTypeAliases();
    
    for (const typeAlias of typeAliases) {
      const typeNode = typeAlias.getTypeNode();
      if (!typeNode) continue;
      
      const text = typeNode.getText();
      
      // 跳过已经是 Readonly 的
      if (text.startsWith('Readonly<')) continue;
      
      // 只处理对象类型
      if (typeNode.getKind() === SyntaxKind.TypeLiteral) {
        console.log(`Wrapping ${typeAlias.getName()} in Readonly<>`);
        typeNode.replaceWithText(`Readonly<${text}>`);
      }
    }
  }
  
  project.saveSync();
  console.log('✅ Codemod complete');
}

const project = new Project({
  tsConfigFilePath: './templates/demo/tsconfig.json',
});

addReadonlyToDomain(project);
```

**使用场景（Lauren Tan 的 Gardening）**：

1. Agent 发现 10 个地方没用 `Readonly<>`
2. 不要手动改 10 次
3. 运行 codemod，批量修复
4. 提交一次 PR

---

## 第四层：Chrome DevTools Protocol 深度集成

### 获取运行时上下文

```typescript
// scripts/tools/devtools-inspector.ts
import { chromium, CDPSession } from '@playwright/test';

export class DevToolsInspector {
  private session: CDPSession | null = null;

  async connect(page: any) {
    this.session = await page.context().newCDPSession(page);
    
    // 启用必要的 domains
    await this.session.send('Network.enable');
    await this.session.send('Performance.enable');
    await this.session.send('Console.enable');
    await this.session.send('Debugger.enable');
  }

  async getNetworkRequests() {
    if (!this.session) return [];
    
    const requests: any[] = [];
    
    this.session.on('Network.requestWillBeSent', (event) => {
      requests.push({
        url: event.request.url,
        method: event.request.method,
        timestamp: event.timestamp,
      });
    });
    
    return requests;
  }

  async getConsoleMessages() {
    if (!this.session) return [];
    
    const messages: any[] = [];
    
    this.session.on('Console.messageAdded', (event) => {
      messages.push({
        level: event.message.level,
        text: event.message.text,
        url: event.message.url,
        line: event.message.line,
      });
    });
    
    return messages;
  }

  async getPerformanceMetrics() {
    if (!this.session) return null;
    
    const metrics = await this.session.send('Performance.getMetrics');
    
    return {
      jsHeapSize: metrics.metrics.find(m => m.name === 'JSHeapUsedSize')?.value || 0,
      domNodes: metrics.metrics.find(m => m.name === 'Nodes')?.value || 0,
      layoutDuration: metrics.metrics.find(m => m.name === 'LayoutDuration')?.value || 0,
    };
  }

  async getCoverage() {
    if (!this.session) return null;
    
    // 启动代码覆盖率收集
    await this.session.send('Profiler.enable');
    await this.session.send('Profiler.startPreciseCoverage', {
      callCount: true,
      detailed: true,
    });
    
    // ... 执行测试场景 ...
    
    // 获取覆盖率结果
    const coverage = await this.session.send('Profiler.takePreciseCoverage');
    
    await this.session.send('Profiler.stopPreciseCoverage');
    await this.session.send('Profiler.disable');
    
    return coverage.result;
  }
}
```

### 完整验证工具（整合所有能力）

```typescript
// scripts/tools/full-verifier.ts
import { AppVerifier } from './app-verifier';
import { DevToolsInspector } from './devtools-inspector';
import { ArchitectureScanner } from './architecture-scanner';

export async function fullVerify() {
  console.log('🔍 开始完整验证流程...\n');
  
  // 1. 架构扫描（静态）
  console.log('━━━ 1/4 架构约束检查 ━━━');
  const scanner = new ArchitectureScanner('./templates/demo/tsconfig.json');
  const violations = scanner.scan();
  scanner.printReport();
  
  if (violations.some(v => v.severity === 'error')) {
    console.error('❌ 架构检查失败');
    process.exit(1);
  }
  
  // 2. E2E 测试（行为）
  console.log('\n━━━ 2/4 E2E 测试 ━━━');
  const verifier = new AppVerifier();
  await verifier.start();
  
  const devtools = new DevToolsInspector();
  // await devtools.connect(verifier.page);
  
  const result = await verifier.verify('order-flow');
  
  if (!result.success) {
    console.error('❌ E2E 测试失败');
    await verifier.stop();
    process.exit(1);
  }
  
  // 3. 性能度量
  console.log('\n━━━ 3/4 性能指标 ━━━');
  console.log(`  加载时间: ${result.performance.loadTime}ms`);
  console.log(`  内存使用: ${(result.performance.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
  
  // 4. 生成报告
  console.log('\n━━━ 4/4 生成报告 ━━━');
  const report = {
    timestamp: new Date().toISOString(),
    architecture: { violations: violations.length },
    e2e: { success: result.success, errors: result.errors },
    performance: result.performance,
  };
  
  require('fs').writeFileSync(
    './verification-report.json',
    JSON.stringify(report, null, 2)
  );
  
  await verifier.stop();
  
  console.log('\n✅ 验证完成！报告已保存到 verification-report.json');
}

if (require.main === module) {
  fullVerify().catch(console.error);
}
```

---

## 第五层：性能度量（Hill Climbing）

### Bundle Size Tracker

```typescript
// scripts/tools/measure-bundle.ts
import { build } from 'vite';
import { promises as fs } from 'fs';
import * as path from 'path';

interface BundleMeasurement {
  timestamp: number;
  totalSize: number;
  chunks: Array<{ name: string; size: number }>;
  threshold: number;
  passed: boolean;
}

export async function measureBundle(): Promise<BundleMeasurement> {
  // 构建
  await build({
    root: './templates/demo',
    mode: 'production',
    logLevel: 'warn',
  });
  
  // 读取 dist
  const distPath = './templates/demo/dist/assets';
  const files = await fs.readdir(distPath);
  
  const chunks: Array<{ name: string; size: number }> = [];
  let totalSize = 0;
  
  for (const file of files) {
    if (file.endsWith('.js')) {
      const filePath = path.join(distPath, file);
      const stats = await fs.stat(filePath);
      chunks.push({ name: file, size: stats.size });
      totalSize += stats.size;
    }
  }
  
  const threshold = 500 * 1024; // 500KB
  const passed = totalSize <= threshold;
  
  const measurement: BundleMeasurement = {
    timestamp: Date.now(),
    totalSize,
    chunks,
    threshold,
    passed,
  };
  
  // 保存历史
  const historyPath = './bundle-history.json';
  let history: BundleMeasurement[] = [];
  
  try {
    const data = await fs.readFile(historyPath, 'utf-8');
    history = JSON.parse(data);
  } catch {
    // 文件不存在
  }
  
  history.push(measurement);
  await fs.writeFile(historyPath, JSON.stringify(history, null, 2));
  
  // 打印结果
  console.log('\n📦 Bundle Size Measurement');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total: ${(totalSize / 1024).toFixed(2)} KB`);
  console.log(`Threshold: ${(threshold / 1024).toFixed(2)} KB`);
  console.log(`Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log('\nChunks:');
  chunks.forEach(chunk => {
    console.log(`  ${chunk.name}: ${(chunk.size / 1024).toFixed(2)} KB`);
  });
  
  // 对比上一次
  if (history.length > 1) {
    const prev = history[history.length - 2];
    const diff = totalSize - prev.totalSize;
    const percent = ((diff / prev.totalSize) * 100).toFixed(2);
    
    console.log(`\nChange from previous: ${diff > 0 ? '+' : ''}${(diff / 1024).toFixed(2)} KB (${percent}%)`);
  }
  
  return measurement;
}

if (require.main === module) {
  measureBundle().then(result => {
    process.exit(result.passed ? 0 : 1);
  });
}
```

### Agent Hill Climbing 工作流

```text
1. Baseline: 运行 `measure-bundle` → 记录 450KB
2. Agent 尝试优化（例如 lazy load 组件）
3. 再次运行 `measure-bundle` → 记录 380KB
4. 对比：380KB < 450KB → 保留改动 ✅
5. 继续优化...
```

---

## 第六层：形式化验证（高级）

### TLA+ 状态机规格（示例）

```tla
---- MODULE OrderStateMachine ----
EXTENDS Naturals, Sequences

VARIABLES order, state

Init == 
  /\ order = [qty |-> 0, city |-> "", address |-> ""]
  /\ state = "idle"

UpdateQty(q) ==
  /\ state = "editing"
  /\ q > 0
  /\ order' = [order EXCEPT !.qty = q]
  /\ state' = "editing"

SaveDraft ==
  /\ state = "editing"
  /\ order.qty > 0
  /\ state' = "autosaving"

SubmitOrder ==
  /\ state = "editing"
  /\ order.qty > 0
  /\ order.city # ""
  /\ order.address # ""
  /\ state' = "submitting"

TypeInvariant ==
  /\ order.qty >= 0
  /\ state \in {"idle", "editing", "autosaving", "submitting", "success"}

Next ==
  \/ \E q \in Nat : UpdateQty(q)
  \/ SaveDraft
  \/ SubmitOrder

Spec == Init /\ [][Next]_<<order, state>>

====
```

### Property-Based Testing (Vitest + fast-check)

```typescript
// templates/demo/src/domain/order/applyChange.property.test.ts
import { describe, it } from 'vitest';
import { fc } from '@fast-check/vitest';
import { applyChange } from './applyChange';
import { createOrder } from './Order';

describe('applyChange properties', () => {
  it('永远不会产生负数数量', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: -100, max: 100 }),
        (initialQty, delta) => {
          const order = createOrder('o1', 1, initialQty);
          
          try {
            const result = applyChange(order, { qty: initialQty + delta });
            return result.qty >= 0;
          } catch {
            // 抛出异常也算通过（拒绝非法输入）
            return true;
          }
        }
      )
    );
  });

  it('版本号单调递增', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ qty: fc.integer({ min: 1, max: 100 }) })),
        (changes) => {
          let order = createOrder('o1', 0);
          
          for (const change of changes) {
            const prevVersion = order.version;
            order = applyChange(order, change);
            if (order.version <= prevVersion) return false;
          }
          
          return true;
        }
      )
    );
  });
});
```

---

## 完整集成到 verify.sh

仓库里的 `scripts/verify.sh` **以 oxlint 为主**（不是 ESLint，也不是先跑 ts-morph）：

```bash
#!/bin/bash
# scripts/verify.sh（摘要）

set -euo pipefail

# 1. 架构约束（主强制）：oxlint + ddd-plugin
pnpm lint
# → templates/demo/.oxlintrc.json
# → templates/demo/oxlint/ddd-plugin.js
# rules: ddd/domain-purity, ddd/domain-barrel, ddd/application-boundary, ...

# 2. 类型检查
pnpm --dir templates/demo exec tsc -b

# 3. 单元测试
pnpm --dir templates/demo test
pnpm --filter create-dddfe test

# 4. 构建
pnpm --dir templates/demo build
```

可选增强（不在默认 verify 里）：
- `pnpm run verify:arch` — ts-morph 二次扫描（**不能替代 oxlint**）
- `pnpm run verify:runtime` / `verify:runtime:lighthouse` — Chrome DevTools + Lighthouse
- `pnpm --dir templates/demo test:e2e` — Playwright（需先装依赖）

---

## 给 Agent 的完整工具箱

### package.json scripts

```json
{
  "scripts": {
    "lint": "pnpm --dir templates/demo lint",
    "verify": "./scripts/verify.sh",
    "verify:arch": "tsx scripts/tools/architecture-scanner.ts",
    "verify:bundle": "tsx scripts/tools/measure-bundle.ts",
    "verify:runtime": "tsx scripts/tools/runtime-inspector.ts",
    "verify:runtime:lighthouse": "tsx scripts/tools/runtime-inspector.ts --lighthouse"
  }
}
```

demo 内：`"lint": "oxlint"`（见 `templates/demo/package.json`）。

### Agent 使用指南

```markdown
## Agent 工作流

### 任何代码改动后:
```bash
pnpm run verify
```

如果失败，读取错误信息，修正代码（不要改测试）。

### 性能优化时:
```bash
# 1. 记录 baseline
pnpm run verify:bundle
# Output: 450KB

# 2. 做优化

# 3. 再次测量
pnpm run verify:bundle
# Output: 380KB

# 4. 对比：380 < 450 → 保留 ✅
```

### 需要浏览器上下文时:
```bash
pnpm run verify:app order-flow
# 自动启动 dev server
# 自动运行浏览器
# 自动截图
# 自动收集 DevTools 数据
# 输出 JSON 结果
```

### 批量重构时:
```bash
# 扫描问题
pnpm run verify:arch

# 批量修复
pnpm run codemod:readonly

# 验证修复
pnpm run verify
```
```

---

## 总结：Lauren Tan 的核心创新

### ❌ 传统方式（低效）

```
Human: "测试订单流程是否正常"
Agent: "我来写个 Playwright 测试..."
[50 行代码]
[调试 20 分钟]
[最终可能还有 bug]
```

### ✅ Lauren Tan 方式（高效）

```bash
Human: "测试订单流程是否正常"
Agent: `pnpm run verify:app order-flow`
[3 秒返回结果]
[自动截图 + DevTools 数据]
[可复用，下次还能用]
```

### 关键原则

1. **Mechanics → Script，Judgment → Agent**
   - 机械步骤（启动服务器、点击按钮）→ 写成脚本
   - 判断逻辑（这个错误是否可接受）→ Agent 决定

2. **Context 从工具获取，不是人工传递**
   - ❌ Human 看 DevTools → 截图 → 给 Agent
   - ✅ Agent 运行 `verify:app` → 自动获取所有上下文

3. **一次投资，持续收益**
   - 写一次 `app-verifier.ts`
   - 100 个 Agent 都能用
   - 永远不需要重写

---

## 安装清单

```bash
cd templates/demo

# Playwright
pnpm add -D @playwright/test
pnpm exec playwright install chromium

# ts-morph
pnpm add -D ts-morph

# Property-based testing
pnpm add -D @fast-check/vitest

# 创建目录
mkdir -p scripts/tools
mkdir -p e2e
mkdir -p screenshots
```

---

**下一步**: 实现这些工具，然后让 Agent 运行 `pnpm run verify`。当它能自主闭环迭代时，你就准备好扩展了。
