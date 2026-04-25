#!/usr/bin/env node

/**
 * Validate body-shape and tier-limit adherence for reviewers.src/ files.
 *
 * Enforces:
 *   1. All seven required H2 sections present and in correct order.
 *   2. Tier-based caps on total lines, audit-surface checklist items, and H3
 *      subsection count inside `## Detailed Checks`.
 *
 * Policy: "soft-warn only, proceed" per user decision. Hard failures are
 * reserved for *missing/out-of-order sections* (structural schema violations)
 * and malformed files that can't be parsed at all. Tier-cap overruns are
 * reported as warnings (to stderr) but the exit code stays 0.
 *
 * Exit codes:
 *   0 — no hard failures (warnings may be present).
 *   1 — at least one hard failure (unparseable / missing-section / out-of-order).
 */

import { readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseReviewer, ParseError } from "./lib/parse-reviewer-src.mjs";
import { REQUIRED_BODY_SECTIONS, TIER_LIMITS, VALID_TIERS } from "./lib/reviewer-schema.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = join(ROOT, "reviewers.src");

/**
 * Validate body-shape for one parsed reviewer.
 *
 * @returns {{errors: string[], warnings: string[]}}
 */
export function validateBodyShape(parsed) {
  const errors = [];
  const warnings = [];

  const sectionNames = parsed.sections.map((s) => s.name);

  // Hard: every required section present.
  for (const required of REQUIRED_BODY_SECTIONS) {
    if (!sectionNames.includes(required)) {
      errors.push(`missing required H2 section '## ${required}'`);
    }
  }

  // Hard: required sections in the exact order. Only check if all are present;
  // otherwise the "missing section" error above already covers the problem.
  if (errors.length === 0) {
    const filtered = sectionNames.filter((n) => REQUIRED_BODY_SECTIONS.includes(n));
    for (let i = 0; i < REQUIRED_BODY_SECTIONS.length; i++) {
      if (filtered[i] !== REQUIRED_BODY_SECTIONS[i]) {
        errors.push(
          `required sections out of order: expected '${REQUIRED_BODY_SECTIONS[i]}' at position ${i}, got '${filtered[i]}'`,
        );
        break; // First ordering error is enough; don't cascade.
      }
    }
  }

  // Soft: tier-based caps. Only enforceable if tier is valid.
  const tier = parsed.frontmatter.tier;
  if (VALID_TIERS.includes(tier)) {
    const limits = TIER_LIMITS[tier];
    if (parsed.totalLines > limits.maxLines) {
      warnings.push(
        `tier ${tier} line cap: ${parsed.totalLines} lines > ${limits.maxLines} max`,
      );
    }
    if (parsed.auditItemCount > limits.maxAudit) {
      warnings.push(
        `tier ${tier} audit_surface cap: ${parsed.auditItemCount} items > ${limits.maxAudit} max`,
      );
    }
    if (parsed.h3Count > limits.maxH3) {
      warnings.push(
        `tier ${tier} H3 cap: ${parsed.h3Count} subsections > ${limits.maxH3} max`,
      );
    }
  }

  return { errors, warnings };
}

/**
 * Run body-shape validation across srcDir. Returns structured result.
 * Exported for unit tests.
 */
export function runValidation(srcDir) {
  const errors = [];
  const warnings = [];
  let filesChecked = 0;

  if (!existsSync(srcDir)) {
    return {
      errors: [`reviewers source directory not found: ${srcDir}`],
      warnings: [],
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

    const { errors: fErrors, warnings: fWarnings } = validateBodyShape(parsed);
    for (const err of fErrors) errors.push(`${file}: ${err}`);
    for (const warn of fWarnings) warnings.push(`${file}: ${warn}`);
  }

  return { errors, warnings, filesChecked };
}

function main() {
  console.log("\n▸ Validating reviewer body shape (tier caps soft-warn)\n");
  const { errors, warnings, filesChecked } = runValidation(SRC_DIR);

  for (const err of errors) {
    console.error(`  ✗ ${err}`);
  }
  for (const warn of warnings) {
    console.error(`  ! ${warn}`);
  }

  console.log();
  if (errors.length > 0) {
    console.error(
      `✗ Body-shape validation failed: ${errors.length} error(s), ${warnings.length} warning(s) across ${filesChecked} file(s)\n`,
    );
    process.exit(1);
  }
  console.log(
    `✓ Body-shape validation passed: ${filesChecked} file(s), 0 errors, ${warnings.length} warning(s)\n`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
