#!/usr/bin/env node

/**
 * Build reviewers/index.yaml from YAML frontmatter in each reviewer file.
 * Run: npm run index:build
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REVIEWERS_DIR = join(ROOT, "reviewers");
const INDEX_PATH = join(REVIEWERS_DIR, "index.yaml");

const REQUIRED_FIELDS = ["id", "type", "focus", "audit_surface"];

let errors = 0;

function error(msg) {
  console.error(`  ✗ ${msg}`);
  errors++;
}

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}

const reviewers = [];
let files;
try {
  files = readdirSync(REVIEWERS_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();
} catch (e) {
  console.error(`Cannot read reviewers directory: ${e.message}`);
  process.exit(1);
}

console.log("\n▸ Building reviewer index\n");

for (const file of files) {
  const content = readFileSync(join(REVIEWERS_DIR, file), "utf8");
  const expectedId = file.replace(/\.md$/, "");

  let data;
  try {
    ({ data } = matter(content));
  } catch (e) {
    error(`${file}: invalid frontmatter — ${e.message}`);
    continue;
  }

  if (!data || Object.keys(data).length === 0) {
    error(`${file}: missing YAML frontmatter`);
    continue;
  }

  if (data.id !== expectedId) {
    error(`${file}: id '${data.id}' does not match filename '${expectedId}'`);
  }

  for (const field of REQUIRED_FIELDS) {
    if (!data[field]) {
      error(`${file}: missing required field '${field}'`);
    }
  }

  if (data.audit_surface && !Array.isArray(data.audit_surface)) {
    error(`${file}: audit_surface must be an array`);
  }

  if (data.type && !["universal", "conditional"].includes(data.type)) {
    error(`${file}: type must be 'universal' or 'conditional', got '${data.type}'`);
  }

  if (data.type === "conditional" && !data.activation) {
    error(`${file}: conditional reviewer must have 'activation' field`);
  }

  if (!data.languages) data.languages = "all";

  reviewers.push({ file: `reviewers/${file}`, ...data });
}

if (errors > 0) {
  console.error(`\n✗ Index build failed: ${errors} error(s)\n`);
  process.exit(1);
}

// Generate YAML
let yaml = "# Auto-generated from reviewer frontmatter. Do not edit manually.\n";
yaml += "# Rebuild: npm run index:build\n\n";

for (const r of reviewers) {
  yaml += `- id: ${r.id}\n`;
  yaml += `  file: ${r.file}\n`;
  yaml += `  type: ${r.type}\n`;
  yaml += `  focus: ${JSON.stringify(r.focus)}\n`;

  if (Array.isArray(r.audit_surface) && r.audit_surface.length > 0) {
    yaml += `  audit_surface:\n`;
    for (const item of r.audit_surface) {
      yaml += `    - ${JSON.stringify(item)}\n`;
    }
  }

  if (r.languages === "all") {
    yaml += `  languages: all\n`;
  } else {
    yaml += `  languages: [${r.languages.join(", ")}]\n`;
  }

  if (r.activation) {
    yaml += `  activation:\n`;
    for (const [key, val] of Object.entries(r.activation)) {
      if (Array.isArray(val)) {
        yaml += `    ${key}: [${val.map((v) => JSON.stringify(v)).join(", ")}]\n`;
      }
    }
  }

  if (Array.isArray(r.tools) && r.tools.length > 0) {
    yaml += `  tools:\n`;
    for (const tool of r.tools) {
      yaml += `    - name: ${tool.name}\n`;
      if (tool.command) yaml += `      command: ${JSON.stringify(tool.command)}\n`;
      yaml += `      purpose: ${JSON.stringify(tool.purpose)}\n`;
    }
  }

  yaml += "\n";
}

try {
  writeFileSync(INDEX_PATH, yaml);
} catch (e) {
  console.error(`Cannot write index: ${e.message}`);
  process.exit(1);
}

ok(`Generated ${INDEX_PATH} with ${reviewers.length} reviewers`);
console.log();
