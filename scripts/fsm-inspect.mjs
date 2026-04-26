#!/usr/bin/env node
// fsm-inspect.mjs — debug dump for an FSM run.
//
// Usage:
//   --run-id <id> [--root-dir D]
//
// Output: JSON with manifest + lock state + ordered list of trace records.

import { resolve } from "node:path";

import {
  readLock,
  readManifest,
  readTrace,
  runDirPath,
} from "./lib/fsm-storage.mjs";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--run-id") args.runId = argv[++i];
    else if (arg === "--root-dir") args.rootDir = argv[++i];
    else throw new Error(`fsm-inspect: unknown argument "${arg}"`);
  }
  if (!args.runId) throw new Error("--run-id is required");
  return args;
}

function emit(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

let parsed;
try {
  parsed = parseArgs(process.argv.slice(2));
} catch (err) {
  process.stderr.write(`fsm-inspect: ${err.message}\n`);
  process.exit(2);
}

const rootDir = parsed.rootDir ? resolve(parsed.rootDir) : process.cwd();

const manifest = readManifest(parsed.runId, { rootDir });
if (!manifest) {
  emit({ error: "run_not_found", run_id: parsed.runId });
  process.exit(1);
}

const lock = readLock(parsed.runId, { rootDir });
const trace = readTrace(parsed.runId, { rootDir });

emit({
  ok: true,
  run_id: parsed.runId,
  run_dir_path: runDirPath(parsed.runId, { rootDir }),
  manifest,
  lock,
  trace_count: trace.length,
  trace: trace.map((r) => ({
    file: r.fileName,
    sequence: r.data.sequence,
    phase: r.data.phase,
    state: r.data.state,
    timestamp: r.data.timestamp,
  })),
});
process.exit(0);
