import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./check-css-bem.js", import.meta.url));

function runOnCss(css: string) {
  const root = mkdtempSync(join(tmpdir(), "css-bem-"));
  const src = join(root, "src");
  mkdirSync(src, { recursive: true });
  writeFileSync(join(src, "sample.css"), css);
  const result = spawnSync(process.execPath, [script, root], {
    encoding: "utf8",
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

describe("check-css-bem", () => {
  it("allows full BEM names under nesting", () => {
    const r = runOnCss(`
.page {
  color: #111;
  .page__hint {
    color: #666;
  }
  .page--loading {
    opacity: 0.5;
  }
}
`);
    expect(r.status).toBe(0);
  });

  it("rejects &__ / &-- shorthand", () => {
    const r = runOnCss(`
.page {
  &__hint { color: #666; }
  &--loading { opacity: 0.5; }
}
`);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/&__/);
  });

  it("rejects non-BEM class tokens", () => {
    const r = runOnCss(`
.saveBar { display: flex; }
`);
    expect(r.status).not.toBe(0);
    expect(r.stderr).toMatch(/saveBar/);
  });
});
