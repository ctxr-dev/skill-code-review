#!/usr/bin/env node

/**
 * Validate that every reviewer declares a non-empty, deduplicated subset of
 * the 7-axis review-dimensions taxonomy.
 *
 * Note: build-index-src.mjs already performs this validation as part of its
 * frontmatter gate. This script exists as a standalone tool so consumers can
 * run only the dimensions check without rebuilding the index, and so the
 * plan's step 1.Z.3 has a dedicated entry point.
 *
 * Exit codes:
 *   0 — every file passes.
 *   1 — at least one file fails.
 */

import { readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseReviewer, ParseError } from "./lib/parse-reviewer-src.mjs";
import { DIMENSIONS } from "./lib/reviewer-schema.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = join(ROOT, "reviewers.src");

/**
 * Validate a reviewer's dimensions field.
 *
 * @returns {string[]} error messages (empty if valid).
 */
export function validateDimensions(parsed) {
  const errors = [];
  const dims = parsed.frontmatter.dimensions;

  if (dims === undefined || dims === null) {
    errors.push("missing 'dimensions' field");
    return errors;
  }

  if (!Array.isArray(dims)) {
    errors.push(`dimensions must be an array, got ${typeof dims}`);
    return errors;
  }

  if (dims.length === 0) {
    errors.push("dimensions must not be empty");
    return errors;
  }

  const seen = new Set();
  for (const dim of dims) {
    if (typeof dim !== "string") {
      errors.push(`dimensions contains non-string value: ${JSON.stringify(dim)}`);
      continue;
    }
    if (!DIMENSIONS.includes(dim)) {
      errors.push(`dimensions contains unknown value '${dim}' (valid: ${DIMENSIONS.join("|")})`);
    }
    if (seen.has(dim)) {
      errors.push(`dimensions contains duplicate value '${dim}'`);
    }
    seen.add(dim);
  }

  return errors;
}

/**
 * Run dimensions validation across srcDir. Returns structured result.
 * Exported for unit tests.
 */
export function runValidation(srcDir) {
  const errors = [];
  let filesChecked = 0;

  if (!existsSync(srcDir)) {
    return {
      errors: [`reviewers source directory not found: ${srcDir}`],
      filesChecked: 0,
    };
  }

  const files = readdirSync(srcDir)
    .filter((f) => f.endsWith(".md") && !f.startsWith("."))
    .filter((f) => statSync(join(srcDir, f)).isFile())
    .sort();

  const SKIP = new Set(["README.md", "SCHEMA.md"]);

  for (const file of files) {
    if (SKIP.has(file)) continue;
    filesChecked++;
    let parsed;
    try {
      parsed = parseReviewer(join(srcDir, file));
    } catch (e) {
      if (e instanceof ParseError) {
        errors.push(e.message);
      } else {
        errors.push(`${file}: unexpected parse error: ${e.message}`);
      }
      continue;
    }

    const fErrors = validateDimensions(parsed);
    for (const err of fErrors) errors.push(`${file}: ${err}`);
  }

  return { errors, filesChecked };
}

function main() {
  console.log("\n▸ Validating reviewer dimensions (7-axis taxonomy)\n");
  const { errors, filesChecked } = runValidation(SRC_DIR);

  for (const err of errors) {
    console.error(`  ✗ ${err}`);
  }

  console.log();
  if (errors.length > 0) {
    console.error(
      `✗ Dimensions validation failed: ${errors.length} error(s) across ${filesChecked} file(s)\n`,
    );
    process.exit(1);
  }
  console.log(`✓ Dimensions validation passed: ${filesChecked} file(s), 0 errors\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
