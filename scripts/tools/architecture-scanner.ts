#!/usr/bin/env tsx
/**
 * Architecture Scanner using ts-morph
 * Following Lauren Tan's approach: Make architecture violations impossible
 * 
 * Usage: tsx scripts/tools/architecture-scanner.ts
 */

import { Project, SyntaxKind } from 'ts-morph';
import * as path from 'path';

interface Violation {
  file: string;
  line: number;
  message: string;
  severity: 'error' | 'warning';
  rule: string;
}

export class ArchitectureScanner {
  private project: Project;
  private violations: Violation[] = [];

  constructor(tsConfigPath: string) {
    this.project = new Project({
      tsConfigFilePath: tsConfigPath,
    });
  }

  scan(): Violation[] {
    this.violations = [];
    
    console.log('🔍 Scanning architecture...\n');
    
    this.checkDomainPurity();
    this.checkPortUsage();
    this.checkImmutability();
    this.checkLayerBoundaries();
    
    return this.violations;
  }

  private checkDomainPurity() {
    const domainFiles = this.project.getSourceFiles('**/src/domain/**/*.ts');
    
    for (const file of domainFiles) {
      const imports = file.getImportDeclarations();
      
      for (const imp of imports) {
        const moduleSpecifier = imp.getModuleSpecifierValue();
        
        // Check for infrastructure imports
        if (moduleSpecifier.includes('infrastructure')) {
          this.addViolation({
            file: this.getRelativePath(file.getFilePath()),
            line: imp.getStartLineNumber(),
            message: 'Domain layer must not depend on Infrastructure',
            severity: 'error',
            rule: 'domain-purity',
          });
        }
        
        // Check for HTTP libraries
        if (['axios', 'node-fetch', 'got', 'ky'].includes(moduleSpecifier)) {
          this.addViolation({
            file: this.getRelativePath(file.getFilePath()),
            line: imp.getStartLineNumber(),
            message: 'Domain layer must not import HTTP libraries',
            severity: 'error',
            rule: 'domain-no-http',
          });
        }
        
        // Check for UI frameworks
        if (['react', 'vue', '@vue/', 'svelte'].some(ui => moduleSpecifier.includes(ui))) {
          this.addViolation({
            file: this.getRelativePath(file.getFilePath()),
            line: imp.getStartLineNumber(),
            message: 'Domain layer must not depend on UI frameworks',
            severity: 'error',
            rule: 'domain-no-ui',
          });
        }
        
        // Check for XState
        if (moduleSpecifier.includes('xstate')) {
          this.addViolation({
            file: this.getRelativePath(file.getFilePath()),
            line: imp.getStartLineNumber(),
            message: 'Domain layer must not use XState (belongs in Presentation)',
            severity: 'error',
            rule: 'domain-no-xstate',
          });
        }
      }
      
      // Check for fetch usage
      const descendants = file.getDescendantsOfKind(SyntaxKind.CallExpression);
      for (const call of descendants) {
        const expression = call.getExpression();
        if (expression.getText() === 'fetch') {
          this.addViolation({
            file: this.getRelativePath(file.getFilePath()),
            line: call.getStartLineNumber(),
            message: 'Domain layer must not use fetch()',
            severity: 'error',
            rule: 'domain-no-fetch',
          });
        }
      }
    }
  }

  private checkPortUsage() {
    const appFiles = this.project.getSourceFiles('**/src/application/**/*.ts');
    
    for (const file of appFiles) {
      // Skip port definitions themselves
      if (file.getFilePath().includes('/ports/')) continue;
      
      const imports = file.getImportDeclarations();
      
      for (const imp of imports) {
        const moduleSpecifier = imp.getModuleSpecifierValue();
        
        // Check for concrete Infrastructure imports
        if (moduleSpecifier.includes('infrastructure') && 
            (moduleSpecifier.includes('Http') || 
             moduleSpecifier.includes('Mock') ||
             moduleSpecifier.includes('Repository') && !moduleSpecifier.includes('ports'))) {
          
          this.addViolation({
            file: this.getRelativePath(file.getFilePath()),
            line: imp.getStartLineNumber(),
            message: 'Application should depend on Ports (interfaces), not concrete Infrastructure',
            severity: 'warning',
            rule: 'application-use-ports',
          });
        }
      }
    }
  }

  private checkImmutability() {
    const domainFiles = this.project.getSourceFiles('**/src/domain/**/*.ts');
    
    for (const file of domainFiles) {
      // Check type aliases for Readonly
      const typeAliases = file.getTypeAliases();
      
      for (const typeAlias of typeAliases) {
        if (!typeAlias.isExported()) continue;
        
        const typeNode = typeAlias.getTypeNode();
        if (!typeNode) continue;
        
        const text = typeNode.getText();
        
        // Check if it's an object type without Readonly
        if (typeNode.getKind() === SyntaxKind.TypeLiteral && 
            !text.startsWith('Readonly<')) {
          
          this.addViolation({
            file: this.getRelativePath(file.getFilePath()),
            line: typeAlias.getStartLineNumber(),
            message: `Domain type '${typeAlias.getName()}' should use Readonly<>`,
            severity: 'warning',
            rule: 'domain-immutability',
          });
        }
      }
    }
  }

  private checkLayerBoundaries() {
    // Infrastructure can depend on Domain and Application/Ports
    // Presentation can depend on all layers
    // But warn about circular dependencies
    
    const allFiles = this.project.getSourceFiles('**/src/**/*.ts');
    
    for (const file of allFiles) {
      const filePath = file.getFilePath();
      const layer = this.getLayer(filePath);
      
      if (!layer) continue;
      
      const imports = file.getImportDeclarations();
      
      for (const imp of imports) {
        const moduleSpecifier = imp.getModuleSpecifierValue();
        
        // Skip node_modules
        if (!moduleSpecifier.startsWith('.') && !moduleSpecifier.startsWith('/')) {
          continue;
        }
        
        const targetLayer = this.getLayerFromImport(moduleSpecifier, filePath);
        
        if (targetLayer && !this.isAllowedDependency(layer, targetLayer)) {
          this.addViolation({
            file: this.getRelativePath(filePath),
            line: imp.getStartLineNumber(),
            message: `Layer '${layer}' should not depend on '${targetLayer}'`,
            severity: 'error',
            rule: 'layer-boundaries',
          });
        }
      }
    }
  }

  private getLayer(filePath: string): string | null {
    if (filePath.includes('/domain/')) return 'domain';
    if (filePath.includes('/application/')) return 'application';
    if (filePath.includes('/infrastructure/')) return 'infrastructure';
    if (filePath.includes('/presentation/')) return 'presentation';
    return null;
  }

  private getLayerFromImport(moduleSpecifier: string, fromPath: string): string | null {
    // Resolve relative import
    const resolved = path.resolve(path.dirname(fromPath), moduleSpecifier);
    return this.getLayer(resolved);
  }

  private isAllowedDependency(from: string, to: string): boolean {
    const rules: Record<string, string[]> = {
      domain: [], // Domain depends on nothing
      application: ['domain'], // Application can depend on Domain
      infrastructure: ['domain', 'application'], // Infrastructure can depend on Domain and Application
      presentation: ['domain', 'application', 'infrastructure'], // Presentation can depend on all
    };
    
    return rules[from]?.includes(to) ?? false;
  }

  private addViolation(violation: Violation) {
    this.violations.push(violation);
  }

  private getRelativePath(fullPath: string): string {
    return path.relative(process.cwd(), fullPath);
  }

  printReport() {
    if (this.violations.length === 0) {
      console.log('✅ No architecture violations found\n');
      return;
    }
    
    const errors = this.violations.filter(v => v.severity === 'error');
    const warnings = this.violations.filter(v => v.severity === 'warning');
    
    console.log(`\n❌ Found ${this.violations.length} architecture issues:\n`);
    console.log(`  Errors: ${errors.length}`);
    console.log(`  Warnings: ${warnings.length}\n`);
    
    if (errors.length > 0) {
      console.log('━━━ ERRORS ━━━\n');
      this.printViolations(errors);
    }
    
    if (warnings.length > 0) {
      console.log('\n━━━ WARNINGS ━━━\n');
      this.printViolations(warnings);
    }
  }

  private printViolations(violations: Violation[]) {
    // Group by rule
    const byRule = violations.reduce((acc, v) => {
      if (!acc[v.rule]) acc[v.rule] = [];
      acc[v.rule].push(v);
      return acc;
    }, {} as Record<string, Violation[]>);
    
    for (const [rule, items] of Object.entries(byRule)) {
      console.log(`\n  Rule: ${rule} (${items.length} violation${items.length > 1 ? 's' : ''})`);
      
      for (const item of items) {
        console.log(`    ${item.file}:${item.line}`);
        console.log(`      ${item.message}`);
      }
    }
  }
}

// CLI entry point
async function main() {
  const tsConfigPath = process.argv[2] || './templates/demo/tsconfig.json';
  
  console.log(`Using tsconfig: ${tsConfigPath}\n`);
  
  const scanner = new ArchitectureScanner(tsConfigPath);
  const violations = scanner.scan();
  
  scanner.printReport();
  
  const errors = violations.filter(v => v.severity === 'error');
  
  if (errors.length > 0) {
    console.log('\n❌ Architecture check failed\n');
    process.exit(1);
  }
  
  console.log('✅ Architecture check passed\n');
  process.exit(0);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Error running architecture scanner:', error);
    process.exit(1);
  });
}
