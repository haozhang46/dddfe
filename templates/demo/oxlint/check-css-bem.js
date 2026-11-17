#!/usr/bin/env node
/**
 * CSS nesting BEM check: child class selectors must be written in full.
 *
 * Forbidden (shorthand under nesting):
 *   .block { &__el {} }
 *   .block { &--mod {} }
 *
 * Required:
 *   .block { .block__el {} }
 *   .block { .block--mod {} }
 *
 * Also: every `.class` token in CSS must itself be a valid BEM name.
 *
 * Usage: node oxlint/check-css-bem.js [rootDir]
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const BEM_CLASS =
  /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:__[a-z][a-z0-9]*(?:-[a-z0-9]+)*)?(?:--[a-z][a-z0-9]*(?:-[a-z0-9]+)*)?$/;

const root = resolve(process.argv[2] ?? ".");
const srcRoot = join(root, "src");

/** @type {{ file: string, line: number, message: string }[]} */
const errors = [];

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "dist") continue;
      walk(full);
      continue;
    }
    if (!name.endsWith(".css")) continue;
    checkFile(full);
  }
}

function checkFile(file) {
  const text = readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);
  const rel = relative(root, file);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    // Native/SCSS nesting BEM shorthand — must write full class name instead
    if (/&__/.test(line) || /&--/.test(line)) {
      errors.push({
        file: rel,
        line: lineNo,
        message:
          "Do not use `&__` / `&--` nesting shorthand. Write the full BEM class (e.g. `.block { .block__el {} }`).",
      });
    }

    // Every .classname token should be valid BEM (skip urls, decimals, ...)
    const classRe = /\.([a-zA-Z_][a-zA-Z0-9_-]*)/g;
    let match;
    while ((match = classRe.exec(line)) !== null) {
      const name = match[1];
      if (BEM_CLASS.test(name)) continue;
      errors.push({
        file: rel,
        line: lineNo,
        message: `CSS class ".${name}" must follow BEM: block, block__element, block--modifier (kebab-case).`,
      });
    }
  }
}

walk(srcRoot);

if (errors.length === 0) {
  console.log("check-css-bem: ok");
  process.exit(0);
}

console.error(`check-css-bem: ${errors.length} issue(s)\n`);
for (const err of errors) {
  console.error(`${err.file}:${err.line}`);
  console.error(`  ${err.message}\n`);
}
process.exit(1);
