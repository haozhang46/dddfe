#!/usr/bin/env tsx
/**
 * Runtime Inspector - Chrome DevTools Protocol + Lighthouse
 * 
 * Capabilities:
 * 1. Read Console logs (errors, warnings, info)
 * 2. Monitor Network requests
 * 3. Measure Performance metrics
 * 4. Run Lighthouse audits
 * 5. Take screenshots
 * 
 * Usage: tsx scripts/tools/runtime-inspector.ts
 */

import { spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { chromium, type Browser, type Page, type CDPSession } from 'playwright';

interface ConsoleMessage {
  type: 'log' | 'info' | 'warn' | 'error';
  text: string;
  timestamp: number;
  url?: string;
  lineNumber?: number;
}

interface NetworkRequest {
  url: string;
  method: string;
  status?: number;
  duration?: number;
  size?: number;
  failed: boolean;
}

interface PerformanceMetrics {
  // Core Web Vitals
  LCP?: number; // Largest Contentful Paint
  FID?: number; // First Input Delay
  CLS?: number; // Cumulative Layout Shift
  
  // Other metrics
  FCP?: number; // First Contentful Paint
  TTI?: number; // Time to Interactive
  TBT?: number; // Total Blocking Time
  
  // Memory
  jsHeapSize: number;
  
  // DOM
  domNodes: number;
}

interface LighthouseResult {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  /** Present only when the Lighthouse build still exposes a PWA category. */
  pwa?: number;

  // Detailed metrics
  metrics: {
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    totalBlockingTime: number;
    cumulativeLayoutShift: number;
    speedIndex: number;
  };

  // Opportunities (what to improve)
  opportunities: Array<{
    title: string;
    description: string;
    savings: number; // milliseconds
  }>;
}

interface InspectionResult {
  url: string;
  timestamp: number;
  console: ConsoleMessage[];
  network: NetworkRequest[];
  performance: PerformanceMetrics;
  lighthouse?: LighthouseResult;
  screenshots: string[];
  errors: string[];
}

export class RuntimeInspector {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private cdp: CDPSession | null = null;
  
  private consoleMessages: ConsoleMessage[] = [];
  private networkRequests: NetworkRequest[] = [];
  
  async start() {
    console.log('🚀 Starting Runtime Inspector...\n');
    
    // Launch browser
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
    
    const context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    
    this.page = await context.newPage();
    
    // Get CDP session
    this.cdp = await context.newCDPSession(this.page);
    
    // Enable necessary domains
    await this.cdp.send('Network.enable');
    await this.cdp.send('Performance.enable');
    await this.cdp.send('Console.enable');
    await this.cdp.send('Log.enable');
    
    // Set up console listener
    this.page.on('console', msg => {
      this.consoleMessages.push({
        type: msg.type() as any,
        text: msg.text(),
        timestamp: Date.now(),
      });
      
      // Print to stdout for real-time feedback
      const icon = this.getConsoleIcon(msg.type());
      console.log(`${icon} [Console ${msg.type()}] ${msg.text()}`);
    });
    
    // Set up network listeners
    this.cdp.on('Network.requestWillBeSent', (event) => {
      const request: NetworkRequest = {
        url: event.request.url,
        method: event.request.method,
        failed: false,
      };
      this.networkRequests.push(request);
    });
    
    this.cdp.on('Network.responseReceived', (event) => {
      const request = this.networkRequests.find(r => r.url === event.response.url);
      if (request) {
        request.status = event.response.status;
      }
    });
    
    this.cdp.on('Network.loadingFailed', (event) => {
      console.log(`❌ [Network] Request failed: ${event.errorText}`);
    });
    
    console.log('✅ Runtime Inspector started\n');
  }
  
  async inspect(url: string, options: {
    runLighthouse?: boolean;
    screenshot?: boolean;
  } = {}): Promise<InspectionResult> {
    if (!this.page || !this.cdp) {
      throw new Error('Inspector not started. Call start() first.');
    }
    
    console.log(`🔍 Inspecting: ${url}\n`);
    
    const result: InspectionResult = {
      url,
      timestamp: Date.now(),
      console: [],
      network: [],
      performance: {
        jsHeapSize: 0,
        domNodes: 0,
      },
      screenshots: [],
      errors: [],
    };
    
    try {
      // Clear previous data
      this.consoleMessages = [];
      this.networkRequests = [];
      
      // Navigate to URL
      const startTime = Date.now();
      await this.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      const loadTime = Date.now() - startTime;
      
      console.log(`✅ Page loaded in ${loadTime}ms\n`);
      
      // Wait a bit for any async operations
      await this.page.waitForTimeout(2000);
      
      // Collect console messages
      result.console = [...this.consoleMessages];
      
      // Collect network requests
      result.network = [...this.networkRequests];
      
      // Get performance metrics
      result.performance = await this.getPerformanceMetrics();
      
      // Take screenshot
      if (options.screenshot !== false) {
        const screenshotPath = `./screenshots/runtime-${Date.now()}.png`;
        await this.page.screenshot({
          path: screenshotPath,
          fullPage: true,
        });
        result.screenshots.push(screenshotPath);
        console.log(`📸 Screenshot saved: ${screenshotPath}\n`);
      }
      
      // Run Lighthouse
      if (options.runLighthouse) {
        console.log('🏠 Running Lighthouse audit...\n');
        result.lighthouse = await this.runLighthouse(url);
      }
      
      // Collect errors
      result.errors = this.consoleMessages
        .filter(m => m.type === 'error')
        .map(m => m.text);
      
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
      console.error('❌ Inspection error:', error);
    }
    
    return result;
  }
  
  private async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    if (!this.cdp || !this.page) {
      throw new Error('CDP session not available');
    }
    
    // Get metrics from Performance API
    const metricsResponse = await this.cdp.send('Performance.getMetrics');
    
    const metrics: PerformanceMetrics = {
      jsHeapSize: 0,
      domNodes: 0,
    };
    
    for (const metric of metricsResponse.metrics) {
      switch (metric.name) {
        case 'JSHeapUsedSize':
          metrics.jsHeapSize = metric.value;
          break;
        case 'Nodes':
          metrics.domNodes = metric.value;
          break;
      }
    }
    
    // Get Web Vitals from page
    const webVitals = await this.page.evaluate(() => {
      return new Promise<any>((resolve) => {
        // Use PerformanceObserver for real metrics
        const metrics: any = {};
        
        // LCP
        if ('PerformanceObserver' in window) {
          try {
            const lcpObserver = new PerformanceObserver((list) => {
              const entries = list.getEntries();
              const lastEntry = entries[entries.length - 1];
              metrics.LCP = lastEntry.startTime;
            });
            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
          } catch (e) {
            // LCP not available
          }
          
          // CLS
          try {
            let clsValue = 0;
            const clsObserver = new PerformanceObserver((list) => {
              for (const entry of list.getEntries() as any[]) {
                if (!(entry as any).hadRecentInput) {
                  clsValue += (entry as any).value;
                }
              }
              metrics.CLS = clsValue;
            });
            clsObserver.observe({ entryTypes: ['layout-shift'] });
          } catch (e) {
            // CLS not available
          }
        }
        
        // FCP from PerformanceTiming
        const timing = performance.timing;
        if (timing.domContentLoadedEventEnd && timing.navigationStart) {
          metrics.FCP = timing.domContentLoadedEventEnd - timing.navigationStart;
        }
        
        // Wait a bit to collect metrics
        setTimeout(() => resolve(metrics), 1000);
      });
    });
    
    Object.assign(metrics, webVitals);
    
    console.log('📊 Performance Metrics:');
    console.log(`  JS Heap: ${(metrics.jsHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  DOM Nodes: ${metrics.domNodes}`);
    if (metrics.LCP) console.log(`  LCP: ${metrics.LCP.toFixed(0)}ms`);
    if (metrics.FCP) console.log(`  FCP: ${metrics.FCP.toFixed(0)}ms`);
    if (metrics.CLS) console.log(`  CLS: ${metrics.CLS.toFixed(3)}`);
    console.log();
    
    return metrics;
  }
  
  private async runLighthouse(url: string): Promise<LighthouseResult> {
    // Spawn the Lighthouse CLI (not the JS API). Importing lighthouse under tsx/esbuild
    // rewrites in-browser gatherer scripts with `__name`, which then crashes in Chrome.
    const outPath = `./lighthouse-${Date.now()}.json`;
    const chromePath = process.env.CHROME_PATH || chromium.executablePath();
    const args = [
      'exec',
      'lighthouse',
      url,
      '--quiet',
      '--output=json',
      `--output-path=${outPath}`,
      '--only-categories=performance,accessibility,best-practices,seo',
      `--chrome-path=${chromePath}`,
      '--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage',
    ];

    const spawned = spawnSync('pnpm', args, {
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
    });
    if (spawned.status !== 0) {
      const detail = (spawned.stderr || spawned.stdout || '').trim();
      throw new Error(`Lighthouse CLI failed (exit ${spawned.status}): ${detail.slice(0, 2000)}`);
    }

    const report = JSON.parse(await fs.readFile(outPath, 'utf8')) as {
      categories: Record<string, { score: number | null }>;
      audits: Record<
        string,
        {
          title: string;
          description: string;
          numericValue?: number;
          details?: { type?: string };
        }
      >;
    };
    await fs.unlink(outPath).catch(() => undefined);

    const score = (id: string) => (report.categories[id]?.score ?? 0) * 100;

    const result: LighthouseResult = {
      performance: score('performance'),
      accessibility: score('accessibility'),
      bestPractices: score('best-practices'),
      seo: score('seo'),
      pwa: report.categories.pwa ? score('pwa') : undefined,

      metrics: {
        firstContentfulPaint: report.audits['first-contentful-paint'].numericValue!,
        largestContentfulPaint: report.audits['largest-contentful-paint'].numericValue!,
        totalBlockingTime: report.audits['total-blocking-time'].numericValue!,
        cumulativeLayoutShift: report.audits['cumulative-layout-shift'].numericValue!,
        speedIndex: report.audits['speed-index'].numericValue!,
      },

      opportunities: [],
    };

    for (const audit of Object.values(report.audits)) {
      if (audit.details?.type === 'opportunity' && audit.numericValue && audit.numericValue > 100) {
        result.opportunities.push({
          title: audit.title,
          description: audit.description,
          savings: audit.numericValue,
        });
      }
    }
    result.opportunities.sort((a, b) => b.savings - a.savings);

    console.log('🏠 Lighthouse Scores:');
    console.log(`  Performance:    ${result.performance.toFixed(0)}/100`);
    console.log(`  Accessibility:  ${result.accessibility.toFixed(0)}/100`);
    console.log(`  Best Practices: ${result.bestPractices.toFixed(0)}/100`);
    console.log(`  SEO:            ${result.seo.toFixed(0)}/100`);
    if (result.pwa != null) {
      console.log(`  PWA:            ${result.pwa.toFixed(0)}/100`);
    }
    console.log();

    if (result.opportunities.length > 0) {
      console.log('💡 Top Opportunities:');
      for (const opp of result.opportunities.slice(0, 3)) {
        console.log(`  - ${opp.title}: Save ${(opp.savings / 1000).toFixed(2)}s`);
      }
      console.log();
    }

    return result;
  }
  
  private getConsoleIcon(type: string): string {
    switch (type) {
      case 'error': return '❌';
      case 'warn': return '⚠️ ';
      case 'info': return 'ℹ️ ';
      default: return '📝';
    }
  }
  
  async stop() {
    if (this.browser) {
      await this.browser.close();
      console.log('✅ Runtime Inspector stopped\n');
    }
  }
  
  printSummary(result: InspectionResult) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 INSPECTION SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log(`URL: ${result.url}`);
    console.log(`Time: ${new Date(result.timestamp).toLocaleString()}\n`);
    
    // Console messages
    const errors = result.console.filter(m => m.type === 'error');
    const warnings = result.console.filter(m => m.type === 'warn');
    
    console.log(`Console Messages: ${result.console.length} total`);
    console.log(`  Errors:   ${errors.length}`);
    console.log(`  Warnings: ${warnings.length}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Console Errors:');
      errors.forEach(e => console.log(`  - ${e.text}`));
    }
    
    // Network
    const failed = result.network.filter(r => r.failed);
    console.log(`\nNetwork Requests: ${result.network.length} total`);
    console.log(`  Failed: ${failed.length}`);
    
    if (failed.length > 0) {
      console.log('\n❌ Failed Requests:');
      failed.forEach(r => console.log(`  - ${r.url}`));
    }
    
    // Performance
    console.log('\n📊 Performance:');
    console.log(`  JS Heap: ${(result.performance.jsHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  DOM Nodes: ${result.performance.domNodes}`);
    if (result.performance.LCP) {
      console.log(`  LCP: ${result.performance.LCP.toFixed(0)}ms`);
    }
    if (result.performance.CLS) {
      console.log(`  CLS: ${result.performance.CLS.toFixed(3)}`);
    }
    
    // Lighthouse
    if (result.lighthouse) {
      console.log('\n🏠 Lighthouse Scores:');
      console.log(`  Performance:    ${result.lighthouse.performance.toFixed(0)}/100`);
      console.log(`  Accessibility:  ${result.lighthouse.accessibility.toFixed(0)}/100`);
      console.log(`  Best Practices: ${result.lighthouse.bestPractices.toFixed(0)}/100`);
      
      if (result.lighthouse.performance < 90) {
        console.log('\n⚠️  Performance score below 90!');
        if (result.lighthouse.opportunities.length > 0) {
          console.log('\nTop improvements:');
          result.lighthouse.opportunities.slice(0, 3).forEach(opp => {
            console.log(`  - ${opp.title}: ${(opp.savings / 1000).toFixed(2)}s`);
          });
        }
      }
    }
    
    // Screenshots
    if (result.screenshots.length > 0) {
      console.log(`\n📸 Screenshots: ${result.screenshots.length}`);
      result.screenshots.forEach(s => console.log(`  - ${s}`));
    }
    
    // Overall status
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const hasErrors = errors.length > 0 || failed.length > 0;
    const poorPerformance = result.lighthouse && result.lighthouse.performance < 50;
    
    if (hasErrors || poorPerformance) {
      console.log('❌ INSPECTION FAILED');
      if (hasErrors) console.log('   - Console errors or network failures detected');
      if (poorPerformance) console.log('   - Performance score critically low');
    } else {
      console.log('✅ INSPECTION PASSED');
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2);
  const runLighthouse = args.includes('--lighthouse');
  const url = args.find((a) => !a.startsWith('-')) || 'http://127.0.0.1:4173';

  const inspector = new RuntimeInspector();

  try {
    await inspector.start();

    const result = await inspector.inspect(url, {
      runLighthouse,
      screenshot: true,
    });
    
    inspector.printSummary(result);

    // Save detailed report (stable path for CI + timestamped copy for local runs)
    const stampedPath = `./runtime-report-${Date.now()}.json`;
    const stablePath = process.env.RUNTIME_REPORT_PATH || './runtime-report.json';
    const payload = JSON.stringify(result, null, 2);
    await fs.writeFile(stampedPath, payload);
    await fs.writeFile(stablePath, payload);
    console.log(`📄 Detailed report saved: ${stampedPath}`);
    console.log(`📄 Stable report saved:   ${stablePath}\n`);

    // Exit code based on results
    const hasErrors = result.errors.length > 0;
    const poorPerformance = result.lighthouse && result.lighthouse.performance < 50;

    if (hasErrors || poorPerformance) {
      process.exit(1);
    }
    
  } finally {
    await inspector.stop();
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export default RuntimeInspector;
