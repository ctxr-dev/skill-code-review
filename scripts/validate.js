#!/usr/bin/env node

/**
 * Thin wrapper — delegates to @ctxr-dev/skills validate.
 * Falls back to local sibling (monorepo dev setup).
 */

import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

let primaryExitCode = 1;

try {
  execFileSync("npx", ["--yes", "@ctxr-dev/skills", "validate", ROOT], {
    stdio: "inherit",
  });
} catch (e) {
  primaryExitCode = e.status || 1;
  try {
    execFileSync(
      "node",
      [join(ROOT, "..", "skills-cli", "src", "cli.js"), "validate", ROOT],
      { stdio: "inherit" }
    );
  } catch {
    process.exit(primaryExitCode);
  }
}
