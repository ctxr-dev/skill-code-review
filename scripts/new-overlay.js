#!/usr/bin/env node

/**
 * Scaffold a new overlay from scripts/templates/overlay.md.
 * Usage: npm run new:overlay -- <category> <name>
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE = join(ROOT, "scripts", "templates", "overlay.md");
const OVERLAYS_DIR = join(ROOT, "overlays");
const VALID_CATEGORIES = ["frameworks", "languages", "infra"];

function toTitle(str) {
  return str.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const [category, name] = process.argv.slice(2);

if (!category || !name) {
  console.error("Usage: npm run new:overlay -- <category> <name>");
  console.error(`Categories: ${VALID_CATEGORIES.join(", ")}`);
  console.error("Example: npm run new:overlay -- frameworks svelte");
  process.exit(1);
}

if (!VALID_CATEGORIES.includes(category)) {
  console.error(`Invalid category '${category}' — must be: ${VALID_CATEGORIES.join(", ")}`);
  process.exit(1);
}

if (!/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error(`Invalid name '${name}' — must be lowercase kebab-case`);
  process.exit(1);
}

const outPath = join(OVERLAYS_DIR, category, `${name}.md`);

// Verify output stays within overlays/ dir
const expectedRel = join(category, `${name}.md`);
if (relative(OVERLAYS_DIR, outPath) !== expectedRel) {
  console.error("Invalid name — path escapes overlays directory");
  process.exit(1);
}

if (existsSync(outPath)) {
  console.error(`overlays/${category}/${name}.md already exists`);
  process.exit(1);
}

let template;
try {
  template = readFileSync(TEMPLATE, "utf8");
} catch (e) {
  console.error(`Cannot read template: ${e.message}`);
  process.exit(1);
}

const title = toTitle(name);
const content = template.replace(/\{\{title\}\}/g, title);

try {
  writeFileSync(outPath, content);
} catch (e) {
  console.error(`Cannot write file: ${e.message}`);
  process.exit(1);
}

console.log(`\n  ✓ Created overlays/${category}/${name}.md\n`);
console.log("  Next steps:");
console.log("    1. Fill in the overlay checklist items");
console.log(`    2. Add a row to overlays/index.md under the ${toTitle(category)} section:`);
console.log(`       | [${name}.md](${category}/${name}.md) | trigger | specialists | summary |`);
console.log("    3. Run: npm run validate && npm run lint");
console.log();
