#!/usr/bin/env node

/**
 * Delegates to @ctxr/kit validate.
 */

import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

try {
  execFileSync("npx", ["--yes", "@ctxr/kit", "validate", ROOT], {
    stdio: "inherit",
  });
} catch (e) {
  process.exit(e.status || 1);
}
