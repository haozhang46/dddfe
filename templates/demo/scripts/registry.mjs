import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const itemDir = join(root, "r");
const componentDir = join(root, "src/presentation/components");
const registryPath = join(root, "registry.json");

const REQUIRED = ["name", "type", "title", "description", "files"];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

function loadItems() {
  const errors = [];
  const files = readdirSync(itemDir)
    .filter((name) => name.endsWith(".json"))
    .sort();
  const items = files.map((file) => {
    const item = JSON.parse(readFileSync(join(itemDir, file), "utf8"));
    const expected = file.slice(0, -".json".length);
    if (item.name !== expected) errors.push(`${file}: name must be "${expected}"`);
    for (const key of REQUIRED) {
      if (item[key] == null || item[key] === "") errors.push(`${file}: missing ${key}`);
    }
    if (!Array.isArray(item.files) || item.files.length === 0) {
      errors.push(`${file}: files must list at least one path`);
    }
    for (const entry of item.files ?? []) {
      if (!entry?.path) {
        errors.push(`${file}: a file entry has no path`);
        continue;
      }
      try {
        statSync(join(root, entry.path));
      } catch {
        errors.push(`${file}: ${entry.path} does not exist`);
      }
    }
    return item;
  });
  items.sort((a, b) => a.name.localeCompare(b.name));
  return { items, errors };
}

function sourceFiles() {
  return walk(componentDir)
    .filter((path) => {
      if (!/\.(tsx|ts)$/.test(path)) return false;
      if (path.endsWith(".test.ts") || path.endsWith(".test.tsx")) return false;
      if (path.endsWith(".stories.ts") || path.endsWith(".stories.tsx")) return false;
      // Barrel re-exports are not registry items.
      if (/[/\\]index\.tsx?$/.test(path)) return false;
      return true;
    })
    .map((path) => relative(root, path).split("\\").join("/"))
    .sort();
}

function registryDocument(items) {
  return {
    $schema: "https://ui.shadcn.com/schema/registry.json",
    name: "dddfe",
    homepage: "https://github.com/haozhang46/dddfe",
    items,
  };
}

function sameItems(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

const write = process.argv.includes("--write");
const { items, errors } = loadItems();
const listed = new Set(items.flatMap((item) => item.files.map((file) => file.path)));
for (const path of sourceFiles()) {
  if (!listed.has(path)) errors.push(`src component ${path} is missing from r/*.json`);
}

if (errors.length > 0) {
  for (const error of errors) console.error(`registry: ${error}`);
  process.exit(1);
}

const next = registryDocument(items);
if (write) {
  writeFileSync(registryPath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`registry: wrote ${items.length} items`);
  process.exit(0);
}

let current;
try {
  current = JSON.parse(readFileSync(registryPath, "utf8"));
} catch {
  console.error("registry: registry.json is missing. Run: node scripts/registry.mjs --write");
  process.exit(1);
}

if (
  current.$schema !== next.$schema ||
  current.name !== next.name ||
  current.homepage !== next.homepage ||
  !sameItems(current.items, next.items)
) {
  console.error(
    "registry: registry.json does not match r/*.json. Run: node scripts/registry.mjs --write",
  );
  process.exit(1);
}

console.log(`registry: ${items.length} items`);
