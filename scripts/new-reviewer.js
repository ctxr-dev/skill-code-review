#!/usr/bin/env node

/**
 * Scaffold a new reviewer from scripts/templates/reviewer.md.
 * Usage: npm run new:reviewer -- <reviewer-id> [--type conditional]
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE = join(ROOT, "scripts", "templates", "reviewer.md");
const REVIEWERS_DIR = join(ROOT, "reviewers");
const VALID_TYPES = ["universal", "conditional"];

function toTitle(str) {
  return str.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const id = args.find((a) => !a.startsWith("--"));
  let type = "conditional";

  const typeIdx = args.indexOf("--type");
  if (typeIdx !== -1) {
    const val = args[typeIdx + 1];
    if (!val || val.startsWith("--")) {
      console.error("--type requires a value: universal or conditional");
      process.exit(1);
    }
    if (!VALID_TYPES.includes(val)) {
      console.error(`Invalid type '${val}' — must be: ${VALID_TYPES.join(", ")}`);
      process.exit(1);
    }
    type = val;
  }

  return { id, type };
}

const { id, type } = parseArgs(process.argv);

if (!id) {
  console.error("Usage: npm run new:reviewer -- <reviewer-id> [--type conditional]");
  console.error("Example: npm run new:reviewer -- caching-strategy");
  process.exit(1);
}

if (!/^[a-z][a-z0-9-]*$/.test(id)) {
  console.error(`Invalid id '${id}' — must be lowercase kebab-case`);
  process.exit(1);
}

const outPath = join(REVIEWERS_DIR, `${id}.md`);

// Verify output stays within reviewers/ dir
if (relative(REVIEWERS_DIR, outPath) !== `${id}.md`) {
  console.error("Invalid id — path escapes reviewers directory");
  process.exit(1);
}

if (existsSync(outPath)) {
  console.error(`reviewers/${id}.md already exists`);
  process.exit(1);
}

let template;
try {
  template = readFileSync(TEMPLATE, "utf8");
} catch (e) {
  console.error(`Cannot read template: ${e.message}`);
  process.exit(1);
}

const title = toTitle(id);
const content = template
  .replace(/\{\{id\}\}/g, id)
  .replace(/\{\{title\}\}/g, title)
  .replace(/\{\{type\}\}/g, type)
  .replace(/\{\{focus\}\}/g, `TODO — describe ${title} focus`);

try {
  writeFileSync(outPath, content);
} catch (e) {
  console.error(`Cannot write file: ${e.message}`);
  process.exit(1);
}

console.log(`\n  ✓ Created reviewers/${id}.md\n`);
console.log("  Next steps:");
console.log("    1. Edit the frontmatter: fill in focus, audit_surface, activation");
console.log("    2. Fill in the checklist sections");
console.log("    3. Run: npm run index:build && npm run validate && npm run lint");
console.log();
