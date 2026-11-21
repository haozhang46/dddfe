#!/usr/bin/env node
// Restore external agent skills recorded in skills-lock.json.
// No-op when the lock is absent. Agents read .agents/skills; the lock is only for this CLI.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

if (!existsSync("skills-lock.json")) {
  process.exit(0);
}

console.log("skills: restore from skills-lock.json into .agents/skills");
const result = spawnSync("skills", ["install", "-a", "cursor"], { stdio: "inherit" });
if (result.error) {
  console.error(
    `skills: ${result.error.message}. Run pnpm install so the skills CLI is available.`,
  );
  process.exit(1);
}
process.exit(result.status ?? 1);
