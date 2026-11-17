#!/usr/bin/env tsx
/**
 * Bundle Size Measurement Tool
 * Following Lauren Tan's Hill Climbing approach
 * 
 * Usage: tsx scripts/tools/measure-bundle.ts
 */

import { build } from 'vite';
import { promises as fs } from 'fs';
import * as path from 'path';

interface BundleMeasurement {
  timestamp: number;
  date: string;
  totalSize: number;
  totalSizeKB: number;
  chunks: Array<{ name: string; size: number; sizeKB: number }>;
  threshold: number;
  thresholdKB: number;
  passed: boolean;
}

export async function measureBundle(): Promise<BundleMeasurement> {
  console.log('📦 Building production bundle...\n');
  
  // Build the app
  try {
    await build({
      root: './templates/demo',
      mode: 'production',
      logLevel: 'warn',
      build: {
        outDir: './dist',
        emptyOutDir: true,
      },
    });
  } catch (error) {
    console.error('❌ Build failed:', error);
    throw error;
  }
  
  console.log('✅ Build complete\n');
  console.log('📏 Measuring bundle size...\n');
  
  // Read dist directory
  const distPath = './templates/demo/dist/assets';
  let files: string[] = [];
  
  try {
    files = await fs.readdir(distPath);
  } catch (error) {
    console.error(`❌ Cannot read dist directory: ${distPath}`);
    throw error;
  }
  
  const chunks: Array<{ name: string; size: number; sizeKB: number }> = [];
  let totalSize = 0;
  
  for (const file of files) {
    if (file.endsWith('.js') || file.endsWith('.css')) {
      const filePath = path.join(distPath, file);
      const stats = await fs.stat(filePath);
      const size = stats.size;
      
      chunks.push({
        name: file,
        size,
        sizeKB: Math.round((size / 1024) * 100) / 100,
      });
      
      totalSize += size;
    }
  }
  
  // Sort chunks by size (largest first)
  chunks.sort((a, b) => b.size - a.size);
  
  const threshold = 500 * 1024; // 500KB
  const passed = totalSize <= threshold;
  
  const measurement: BundleMeasurement = {
    timestamp: Date.now(),
    date: new Date().toISOString(),
    totalSize,
    totalSizeKB: Math.round((totalSize / 1024) * 100) / 100,
    chunks,
    threshold,
    thresholdKB: Math.round((threshold / 1024) * 100) / 100,
    passed,
  };
  
  // Save to history
  await saveHistory(measurement);
  
  // Print report
  printReport(measurement);
  
  return measurement;
}

async function saveHistory(measurement: BundleMeasurement) {
  const historyPath = './bundle-history.json';
  let history: BundleMeasurement[] = [];
  
  try {
    const data = await fs.readFile(historyPath, 'utf-8');
    history = JSON.parse(data);
  } catch {
    // File doesn't exist yet
  }
  
  history.push(measurement);
  
  // Keep only last 100 measurements
  if (history.length > 100) {
    history = history.slice(-100);
  }
  
  await fs.writeFile(historyPath, JSON.stringify(history, null, 2));
}

async function loadHistory(): Promise<BundleMeasurement[]> {
  const historyPath = './bundle-history.json';
  
  try {
    const data = await fs.readFile(historyPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function printReport(measurement: BundleMeasurement) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 BUNDLE SIZE REPORT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log(`Total Size: ${measurement.totalSizeKB} KB`);
  console.log(`Threshold:  ${measurement.thresholdKB} KB`);
  
  if (measurement.passed) {
    console.log(`Status:     ✅ PASS\n`);
  } else {
    const over = measurement.totalSizeKB - measurement.thresholdKB;
    console.log(`Status:     ❌ FAIL (over by ${over.toFixed(2)} KB)\n`);
  }
  
  console.log('Chunks:');
  console.log('─────────────────────────────────────────\n');
  
  for (const chunk of measurement.chunks) {
    const percentage = ((chunk.size / measurement.totalSize) * 100).toFixed(1);
    console.log(`  ${chunk.name}`);
    console.log(`    ${chunk.sizeKB} KB (${percentage}%)\n`);
  }
}

async function printComparison() {
  const history = await loadHistory();
  
  if (history.length < 2) {
    console.log('ℹ️  Not enough history to compare\n');
    return;
  }
  
  const current = history[history.length - 1];
  const previous = history[history.length - 2];
  
  const diff = current.totalSize - previous.totalSize;
  const diffKB = Math.round((diff / 1024) * 100) / 100;
  const percent = ((diff / previous.totalSize) * 100).toFixed(2);
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 COMPARISON WITH PREVIOUS BUILD');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log(`Previous: ${previous.totalSizeKB} KB`);
  console.log(`Current:  ${current.totalSizeKB} KB`);
  
  if (diff > 0) {
    console.log(`Change:   📈 +${diffKB} KB (+${percent}%)`);
    console.log(`\n⚠️  Bundle size increased\n`);
  } else if (diff < 0) {
    console.log(`Change:   📉 ${diffKB} KB (${percent}%)`);
    console.log(`\n✅ Bundle size decreased!\n`);
  } else {
    console.log(`Change:   ➡️  No change\n`);
  }
}

// CLI entry point
async function main() {
  try {
    const measurement = await measureBundle();
    await printComparison();
    
    if (!measurement.passed) {
      console.log('❌ Bundle size check failed\n');
      process.exit(1);
    }
    
    console.log('✅ Bundle size check passed\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
