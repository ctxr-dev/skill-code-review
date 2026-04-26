#!/usr/bin/env node
// fsm-validate-static.mjs — static well-formedness check on an FSM YAML.
//
// Usage:
//   node scripts/fsm-validate-static.mjs <path-to-fsm-yaml> [<more> ...]
//
// Exits non-zero on any validation failure. Prints a structured report to
// stdout. Designed to run inside `npm run validate:src` to gate the FSM
// definition before any orchestrator change ships.

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";

import {
  validateFsmSchema,
  validateFsmStatic,
} from "./lib/fsm-schema.mjs";

const args = process.argv.slice(2);
if (args.length === 0) {
  process.stderr.write(
    "fsm-validate-static: at least one FSM YAML path is required\n",
  );
  process.stderr.write(
    "  usage: node scripts/fsm-validate-static.mjs <path-to-fsm-yaml> [<more>]\n",
  );
  process.exit(2);
}

let totalErrors = 0;
const reports = [];

for (const arg of args) {
  const path = resolve(process.cwd(), arg);
  if (!existsSync(path)) {
    reports.push({
      file: arg,
      errors: [`File not found: ${path}`],
    });
    totalErrors += 1;
    continue;
  }

  let doc;
  try {
    doc = parseYaml(readFileSync(path, "utf8"));
  } catch (err) {
    reports.push({
      file: arg,
      errors: [`YAML parse failure: ${err.message}`],
    });
    totalErrors += 1;
    continue;
  }

  const schemaResult = validateFsmSchema(doc);
  if (!schemaResult.valid) {
    reports.push({ file: arg, phase: "schema", errors: schemaResult.errors });
    totalErrors += schemaResult.errors.length;
    continue;
  }

  const staticResult = validateFsmStatic(doc, { fsmFilePath: path });
  if (!staticResult.valid) {
    reports.push({ file: arg, phase: "static", errors: staticResult.errors });
    totalErrors += staticResult.errors.length;
    continue;
  }

  reports.push({
    file: arg,
    phase: "passed",
    errors: [],
    states: doc.fsm.states.length,
  });
}

const summary = {
  ok: totalErrors === 0,
  total_errors: totalErrors,
  files: reports,
};
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
process.exit(totalErrors === 0 ? 0 : 1);
