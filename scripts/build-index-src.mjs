#!/usr/bin/env node

/**
 * Build a transitional index for reviewers.src/ (v2 schema).
 *
 * Writes reviewers.src/.index-src.yaml (gitignored). Does NOT touch the
 * legacy reviewers/index.yaml — that file is the dispatch source of truth
 * until Phase 3 orchestrator rewiring.
 *
 * Run: npm run index:build:src
 *
 * Exit codes:
 *   0 — all files parse and validate against the v2 schema.
 *   1 — at least one file failed the hard schema gate.
 */

import { readdirSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseReviewer, ParseError } from "./lib/parse-reviewer-src.mjs";
import {
  REQUIRED_FRONTMATTER,
  VALID_TYPES,
  VALID_TIERS,
  DIMENSIONS,
  COVERS_MIN,
  COVERS_MAX,
  AUDIT_MIN,
  LAST_REVIEWED_PATTERN,
  ID_PATTERN,
  isValidLanguages,
} from "./lib/reviewer-schema.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC_DIR = join(ROOT, "reviewers.src");
const INDEX_PATH = join(SRC_DIR, ".index-src.yaml");

/**
 * Validate a parsed reviewer against the v2 frontmatter schema.
 *
 * @returns {string[]} list of error messages (empty if valid).
 */
export function validateFrontmatter(parsed, expectedId) {
  const errors = [];
  const fm = parsed.frontmatter;

  for (const field of REQUIRED_FRONTMATTER) {
    if (fm[field] === undefined || fm[field] === null || fm[field] === "") {
      errors.push(`missing required field '${field}'`);
    }
  }

  if (fm.id !== undefined) {
    if (typeof fm.id !== "string") {
      errors.push(`id must be a string, got ${typeof fm.id}`);
    } else {
      if (!ID_PATTERN.test(fm.id)) {
        errors.push(`id '${fm.id}' must be kebab-case (${ID_PATTERN})`);
      }
      if (fm.id !== expectedId) {
        errors.push(`id '${fm.id}' does not match filename '${expectedId}'`);
      }
    }
  }

  if (fm.type !== undefined && !VALID_TYPES.includes(fm.type)) {
    errors.push(`type must be one of ${VALID_TYPES.join("|")}, got '${fm.type}'`);
  }

  if (fm.tier !== undefined && !VALID_TIERS.includes(fm.tier)) {
    errors.push(`tier must be one of ${VALID_TIERS.join("|")}, got ${JSON.stringify(fm.tier)}`);
  }

  if (fm.type === "conditional" && !fm.activation) {
    errors.push("conditional reviewer must have 'activation' field");
  }

  if (fm.focus !== undefined && typeof fm.focus !== "string") {
    errors.push(`focus must be a string, got ${typeof fm.focus}`);
  }

  if (fm.dimensions !== undefined) {
    if (!Array.isArray(fm.dimensions)) {
      errors.push(`dimensions must be an array, got ${typeof fm.dimensions}`);
    } else if (fm.dimensions.length === 0) {
      errors.push("dimensions must not be empty");
    } else {
      for (const dim of fm.dimensions) {
        if (!DIMENSIONS.includes(dim)) {
          errors.push(`dimensions contains unknown value '${dim}' (valid: ${DIMENSIONS.join("|")})`);
        }
      }
      const seen = new Set();
      for (const dim of fm.dimensions) {
        if (seen.has(dim)) {
          errors.push(`dimensions contains duplicate value '${dim}'`);
        }
        seen.add(dim);
      }
    }
  }

  if (fm.covers !== undefined) {
    if (!Array.isArray(fm.covers)) {
      errors.push(`covers must be an array, got ${typeof fm.covers}`);
    } else if (fm.covers.length < COVERS_MIN) {
      errors.push(`covers has ${fm.covers.length} items, minimum is ${COVERS_MIN}`);
    } else if (fm.covers.length > COVERS_MAX) {
      errors.push(`covers has ${fm.covers.length} items, maximum is ${COVERS_MAX}`);
    }
  }

  if (fm.audit_surface !== undefined) {
    if (!Array.isArray(fm.audit_surface)) {
      errors.push(`audit_surface must be an array, got ${typeof fm.audit_surface}`);
    } else if (fm.audit_surface.length < AUDIT_MIN) {
      errors.push(`audit_surface has ${fm.audit_surface.length} items, minimum is ${AUDIT_MIN}`);
    }
  }

  if (fm.languages !== undefined && !isValidLanguages(fm.languages)) {
    errors.push(`languages must be 'all' or a non-empty array of strings`);
  }

  if (fm.tags !== undefined) {
    if (!Array.isArray(fm.tags)) {
      errors.push(`tags must be an array, got ${typeof fm.tags}`);
    }
  }

  if (fm.last_reviewed !== undefined) {
    // gray-matter parses YYYY-MM-DD as a JS Date. Accept either.
    const asString =
      fm.last_reviewed instanceof Date
        ? fm.last_reviewed.toISOString().slice(0, 10)
        : String(fm.last_reviewed);
    if (!LAST_REVIEWED_PATTERN.test(asString)) {
      errors.push(`last_reviewed must match YYYY-MM-DD, got '${asString}'`);
    }
  }

  return errors;
}

/**
 * Serialise a list of validated reviewer records to YAML. Deterministic
 * ordering (input array order preserved; input is sorted alphabetically by
 * the caller).
 */
export function serializeIndex(records) {
  let yaml = "# Auto-generated from reviewers.src/*.md frontmatter. Do not edit manually.\n";
  yaml += "# Rebuild: npm run index:build:src\n";
  yaml += "# Transitional artifact (Phase 1.Z.1). Not the dispatch source of truth.\n\n";

  for (const r of records) {
    yaml += `- id: ${r.id}\n`;
    yaml += `  file: reviewers.src/${r.file}\n`;
    yaml += `  type: ${r.type}\n`;
    yaml += `  tier: ${r.tier}\n`;
    yaml += `  focus: ${JSON.stringify(r.focus)}\n`;
    if (Array.isArray(r.dimensions)) {
      yaml += `  dimensions: [${r.dimensions.join(", ")}]\n`;
    }
    if (r.languages === "all") {
      yaml += `  languages: all\n`;
    } else if (Array.isArray(r.languages)) {
      yaml += `  languages: [${r.languages.join(", ")}]\n`;
    }
    yaml += "\n";
  }
  return yaml;
}

/**
 * Run the index build against srcDir. Returns {errors, records}.
 * Exported for unit tests; CLI path wraps this below.
 */
export function buildIndex(srcDir) {
  const errors = [];
  const records = [];

  if (!existsSync(srcDir)) {
    return {
      errors: [`reviewers source directory not found: ${srcDir}`],
      records: [],
    };
  }

  let files;
  try {
    files = readdirSync(srcDir)
      .filter((f) => f.endsWith(".md") && !f.startsWith("."))
      .filter((f) => {
        const full = join(srcDir, f);
        return statSync(full).isFile();
      })
      .sort();
  } catch (e) {
    return { errors: [`cannot list ${srcDir}: ${e.message}`], records: [] };
  }

  // Ignore repo-level meta files that live next to reviewers (README.md,
  // SCHEMA.md, etc.). They lack frontmatter on purpose.
  const SKIP = new Set(["README.md", "SCHEMA.md"]);

  for (const file of files) {
    if (SKIP.has(file)) continue;

    const expectedId = file.replace(/\.md$/, "");
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

    const fieldErrors = validateFrontmatter(parsed, expectedId);
    if (fieldErrors.length > 0) {
      for (const err of fieldErrors) {
        errors.push(`${file}: ${err}`);
      }
      continue;
    }

    records.push({
      file,
      id: parsed.frontmatter.id,
      type: parsed.frontmatter.type,
      tier: parsed.frontmatter.tier,
      focus: parsed.frontmatter.focus,
      dimensions: parsed.frontmatter.dimensions,
      languages: parsed.frontmatter.languages,
    });
  }

  return { errors, records };
}

function main() {
  console.log("\n▸ Building reviewers.src index (v2 schema)\n");
  const { errors, records } = buildIndex(SRC_DIR);

  for (const err of errors) {
    console.error(`  ✗ ${err}`);
  }

  if (errors.length > 0) {
    console.error(`\n✗ Index build failed: ${errors.length} error(s)\n`);
    process.exit(1);
  }

  try {
    writeFileSync(INDEX_PATH, serializeIndex(records));
  } catch (e) {
    console.error(`Cannot write ${INDEX_PATH}: ${e.message}`);
    process.exit(1);
  }

  console.log(`  ✓ Parsed ${records.length} reviewer source files`);
  console.log(`  ✓ Wrote ${INDEX_PATH}`);
  console.log();
}

// Only run main() when invoked directly, not when imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
