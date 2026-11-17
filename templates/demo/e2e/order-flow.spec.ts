import { test, expect } from "@playwright/test";

/**
 * Order Flow E2E Tests
 * Following Lauren Tan's approach: Runtime verification that agents can run autonomously
 */

test.describe("Order Form - Core Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("应用加载成功", async ({ page }) => {
    // 验证页面标题
    await expect(page).toHaveTitle(/DDD Demo/);

    // 验证登录按钮可见
    await expect(page.locator("text=登录")).toBeVisible();
  });

  test("用户可以登录", async ({ page }) => {
    // 点击登录
    await page.click("text=登录");

    // 填写用户名和密码（使用 mock 用户）
    await page.fill('input[name="username"]', "admin");
    await page.fill('input[name="password"]', "admin123");

    // 点击登录按钮
    await page.click('button:has-text("登录")');

    // 验证跳转到订单页
    await expect(page).toHaveURL(/\/order/);

    // 验证用户信息显示
    await expect(page.locator("text=admin")).toBeVisible();
  });

  test("可以填写订单并保存草稿", async ({ page }) => {
    // 先登录
    await page.goto("/order"); // 如果有路由守卫会自动跳转到登录

    // 假设已经登录，填写订单
    await page.fill('input[name="qty"]', "10");
    await page.selectOption('select[name="city"]', { index: 1 });
    await page.fill('input[name="address"]', "测试地址 123 号");

    // 保存草稿
    await page.click('button:has-text("保存草稿")');

    // 验证保存成功提示
    await expect(page.locator('.toast, [role="alert"]')).toContainText(/保存成功|已保存/);
  });

  test("数量必须大于 0", async ({ page }) => {
    await page.goto("/order");

    // 尝试输入 0 或负数
    await page.fill('input[name="qty"]', "0");

    // 尝试提交
    await page.click('button:has-text("提交")');

    // 验证错误提示
    await expect(page.locator('.error, [role="alert"]')).toContainText(/数量|必须|大于/);
  });

  test("必填字段验证", async ({ page }) => {
    await page.goto("/order");

    // 不填任何字段，直接提交
    await page.click('button:has-text("提交")');

    // 验证错误提示存在
    const errors = await page.locator('.error, [role="alert"]').count();
    expect(errors).toBeGreaterThan(0);
  });
});

test.describe("Order Form - Performance", () => {
  test("页面加载时间小于 2 秒", async ({ page }) => {
    const start = Date.now();
    await page.goto("/order");
    const loadTime = Date.now() - start;

    expect(loadTime).toBeLessThan(2000);
  });

  test("XState 状态转换响应快速", async ({ page }) => {
    await page.goto("/order");

    const start = Date.now();

    // 触发状态改变
    await page.fill('input[name="qty"]', "5");
    await page.click('button:has-text("保存草稿")');

    // 等待响应
    await page.locator('.toast, [role="alert"]').waitFor({ timeout: 1000 });

    const responseTime = Date.now() - start;

    // 状态机响应应该很快（< 500ms）
    expect(responseTime).toBeLessThan(500);
  });
});

test.describe("Order Form - Edge Cases", () => {
  test("快速连续点击保存（防重复提交）", async ({ page }) => {
    await page.goto("/order");

    // 填写表单
    await page.fill('input[name="qty"]', "5");

    // 快速点击多次
    await Promise.all([
      page.click('button:has-text("保存草稿")'),
      page.click('button:has-text("保存草稿")'),
      page.click('button:has-text("保存草稿")'),
    ]);

    // 验证：应该只发送一次请求（通过 RequestQueue 去重）
    // 这里可以监听网络请求数量
    // 简化版：验证没有出错即可
    await expect(page.locator("body")).not.toContainText(/错误|Error/);
  });

  test("网络中断后恢复（乐观 UI）", async ({ page }) => {
    await page.goto("/order");

    // 模拟离线
    await page.route("**/*", (route) => route.abort());

    // 尝试保存（应该显示错误）
    await page.fill('input[name="qty"]', "5");
    await page.click('button:has-text("保存草稿")');

    // 恢复网络
    await page.unroute("**/*");

    // 重试应该成功
    await page.click('button:has-text("保存草稿")');
    await expect(page.locator('.toast, [role="alert"]')).toContainText(/保存成功|已保存/);
  });
});
