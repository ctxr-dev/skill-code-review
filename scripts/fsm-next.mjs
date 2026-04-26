#!/usr/bin/env node
// fsm-next.mjs — read disk state, return the next-state brief.
//
// Two modes:
//   --new-run --repo X --base-sha Y --head-sha Z [--args <json>] [--session-id S]
//   --resume <run-id> [--session-id S]
//
// Output: JSON brief on stdout. Exit 0 on success, non-zero on lock-conflict
// or fault.
//
// Sprint A behavioural contract: foundation only. The script can be invoked
// from tests; production wiring lands in Sprint B.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  acquireLock,
  buildRunId,
  ensureRunDir,
} from "./lib/fsm-storage.mjs";
import {
  buildBrief,
  initialiseManifest,
  loadFsm,
  runEnv,
  stateById,
  updateManifest,
  writeEntryTrace,
} from "./lib/fsm-engine.mjs";
import { readManifest } from "./lib/fsm-storage.mjs";

// ─── Arg parsing (minimal — keep flag surface tight) ─────────────────

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--new-run") args.newRun = true;
    else if (arg === "--resume") args.resumeRunId = argv[++i];
    else if (arg === "--repo") args.repo = argv[++i];
    else if (arg === "--base-sha") args.baseSha = argv[++i];
    else if (arg === "--head-sha") args.headSha = argv[++i];
    else if (arg === "--args") args.args = JSON.parse(argv[++i]);
    else if (arg === "--args-file") args.args = JSON.parse(readFileSync(argv[++i], "utf8"));
    else if (arg === "--session-id") args.sessionId = argv[++i];
    else if (arg === "--fsm-path") args.fsmPath = argv[++i];
    else if (arg === "--root-dir") args.rootDir = argv[++i];
    else {
      throw new Error(`fsm-next: unknown argument "${arg}"`);
    }
  }
  if (!args.sessionId) {
    args.sessionId = `session-${process.pid}-${Date.now()}`;
  }
  return args;
}

function emit(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function fail(error, code = 1) {
  process.stderr.write(`fsm-next: ${error}\n`);
  process.exit(code);
}

let parsed;
try {
  parsed = parseArgs(process.argv.slice(2));
} catch (err) {
  fail(err.message, 2);
}

if (parsed.newRun && parsed.resumeRunId) {
  fail("--new-run and --resume are mutually exclusive", 2);
}
if (!parsed.newRun && !parsed.resumeRunId) {
  fail("must pass --new-run or --resume <run-id>", 2);
}

const rootDir = parsed.rootDir ? resolve(parsed.rootDir) : process.cwd();

let fsm;
try {
  fsm = loadFsm({ fsmPath: parsed.fsmPath, rootDir });
} catch (err) {
  fail(err.message, 1);
}

if (parsed.newRun) {
  if (!parsed.repo) fail("--new-run requires --repo", 2);
  const built = buildRunId({
    repo: parsed.repo,
    baseSha: parsed.baseSha ?? "",
    headSha: parsed.headSha ?? "",
  });
  const runId = built.runId;
  ensureRunDir(runId, { rootDir });
  const lock = acquireLock(runId, { sessionId: parsed.sessionId, rootDir });
  if (!lock.acquired) {
    emit({ error: "run_locked", lock: lock.lock });
    process.exit(1);
  }
  initialiseManifest({
    runId,
    fsmDoc: fsm.doc,
    fsmHash: fsm.hash,
    args: parsed.args ?? {},
    repo: parsed.repo,
    baseSha: parsed.baseSha,
    headSha: parsed.headSha,
    rootDir,
  });
  // Advance: write entry trace for the FSM's entry state.
  const entryState = stateById(fsm.doc, fsm.doc.fsm.entry);
  const env = { args: parsed.args ?? {} };
  const inputs = entryState.worker?.inputs?.reduce((acc, name) => {
    acc[name] = env[name];
    return acc;
  }, {}) ?? {};
  writeEntryTrace(
    runId,
    { state: entryState, inputs },
    { rootDir },
  );
  updateManifest(
    runId,
    { current_state: entryState.id, next_state: null },
    { rootDir },
  );
  const brief = buildBrief({ doc: fsm.doc, state: entryState, env, runId });
  emit({ ok: true, ...brief });
  process.exit(0);
}

// --resume path
const runId = parsed.resumeRunId;
const manifest = readManifest(runId, { rootDir });
if (!manifest) {
  emit({ error: "run_not_found", run_id: runId });
  process.exit(1);
}
if (manifest.fsm_yaml_hash !== fsm.hash) {
  emit({
    error: "fsm_yaml_changed",
    run_id: runId,
    run_hash: manifest.fsm_yaml_hash,
    current_hash: fsm.hash,
    current_state: manifest.current_state,
  });
  process.exit(1);
}
if (manifest.status !== "in_progress" && manifest.status !== "paused") {
  emit({
    error: "run_not_resumable",
    run_id: runId,
    status: manifest.status,
  });
  process.exit(1);
}
const lock = acquireLock(runId, { sessionId: parsed.sessionId, rootDir });
if (!lock.acquired) {
  emit({ error: "run_locked", lock: lock.lock });
  process.exit(1);
}
const env = runEnv(runId, { rootDir });
const stateId = manifest.current_state ?? fsm.doc.fsm.entry;
const state = stateById(fsm.doc, stateId);
const brief = buildBrief({ doc: fsm.doc, state, env, runId });
emit({ ok: true, resumed: true, ...brief });
process.exit(0);
