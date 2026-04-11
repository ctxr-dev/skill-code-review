#!/usr/bin/env node

/**
 * Delegates to @ctxr-dev/skills validate.
 * Requires @ctxr-dev/skills >= 2.1.0 (supports reviewers/index.yaml).
 */

import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

try {
  execFileSync("npx", ["--yes", "@ctxr-dev/skills", "validate", ROOT], {
    stdio: "inherit",
  });
} catch (e) {
  process.exit(e.status || 1);
}
