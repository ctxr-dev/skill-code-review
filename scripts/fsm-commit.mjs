#!/usr/bin/env node
// fsm-commit.mjs — validate worker output, write state-exit, advance.
//
// Usage:
//   --run-id <id>
//   --outputs <json>            inline JSON of the state's outputs
//   --outputs-file <path>       path to a JSON file with outputs
//   [--transition <state-id>]   for kind=judgement transitions, the FSM
//                               Orchestrator picks; pass via this flag
//   [--session-id S]            session must hold the lock
//   [--fsm-path P] [--root-dir D]
//
// Output: JSON brief for the next state on success, or { status: "terminal", verdict, run_dir_path } on terminal.
// Exit 0 on success, non-zero on schema/validation failure.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  readLock,
  readManifest,
  releaseLock,
  runDirPath,
} from "./lib/fsm-storage.mjs";
import {
  buildBrief,
  loadFsm,
  resolveTransition,
  runEnv,
  runPostValidations,
  stateById,
  updateManifest,
  validateOutputs,
  writeEntryTrace,
  writeExitTrace,
  writeFaultTrace,
} from "./lib/fsm-engine.mjs";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--run-id") args.runId = argv[++i];
    else if (arg === "--outputs") args.outputs = JSON.parse(argv[++i]);
    else if (arg === "--outputs-file") args.outputs = JSON.parse(readFileSync(argv[++i], "utf8"));
    else if (arg === "--transition") args.judgementPick = argv[++i];
    else if (arg === "--session-id") args.sessionId = argv[++i];
    else if (arg === "--fsm-path") args.fsmPath = argv[++i];
    else if (arg === "--root-dir") args.rootDir = argv[++i];
    else throw new Error(`fsm-commit: unknown argument "${arg}"`);
  }
  if (!args.runId) throw new Error("--run-id is required");
  if (args.outputs === undefined) {
    throw new Error("either --outputs or --outputs-file is required");
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
  process.stderr.write(`fsm-commit: ${error}\n`);
  process.exit(code);
}

let parsed;
try {
  parsed = parseArgs(process.argv.slice(2));
} catch (err) {
  fail(err.message, 2);
}

const rootDir = parsed.rootDir ? resolve(parsed.rootDir) : process.cwd();

const manifest = readManifest(parsed.runId, { rootDir });
if (!manifest) {
  emit({ error: "run_not_found", run_id: parsed.runId });
  process.exit(1);
}

const lock = readLock(parsed.runId, { rootDir });
if (!lock || lock.session_id !== parsed.sessionId) {
  emit({
    error: "lock_not_held",
    run_id: parsed.runId,
    expected_session: parsed.sessionId,
    actual_lock: lock,
  });
  process.exit(1);
}

let fsm;
try {
  fsm = loadFsm({ fsmPath: parsed.fsmPath, rootDir });
} catch (err) {
  fail(err.message, 1);
}

if (manifest.fsm_yaml_hash !== fsm.hash) {
  emit({
    error: "fsm_yaml_changed",
    run_id: parsed.runId,
    run_hash: manifest.fsm_yaml_hash,
    current_hash: fsm.hash,
  });
  process.exit(1);
}

const stateId = manifest.current_state;
if (!stateId) {
  emit({ error: "no_current_state", run_id: parsed.runId });
  process.exit(1);
}

const state = stateById(fsm.doc, stateId);

// Validate outputs against the worker response_schema (no-op for inline states).
const validationResult = validateOutputs(state, parsed.outputs);
if (!validationResult.valid) {
  writeFaultTrace(
    parsed.runId,
    {
      state,
      reason: "output_schema_violation",
      details: validationResult.errors,
    },
    { rootDir },
  );
  updateManifest(parsed.runId, { status: "faulted", ended_at: new Date().toISOString() }, { rootDir });
  releaseLock(parsed.runId, { sessionId: parsed.sessionId, rootDir });
  emit({
    error: "output_schema_violation",
    state: state.id,
    errors: validationResult.errors,
  });
  process.exit(1);
}

// Run post_validations (declarative in Sprint A).
const postValidations = runPostValidations(state);

// Resolve next transition.
const env = runEnv(parsed.runId, { rootDir });
// Merge the freshly-committed outputs into the env for transition evaluation.
const envWithCommit = { ...env, ...parsed.outputs };
const { transition, evaluations } = resolveTransition(state, envWithCommit, {
  judgementPick: parsed.judgementPick,
});

// Write the exit trace.
writeExitTrace(
  parsed.runId,
  {
    state,
    outputs: parsed.outputs,
    postValidations: postValidations.results,
    transitionEvals: evaluations,
    chosenTransition: transition?.to ?? null,
  },
  { rootDir },
);

// If no transition matched, that's a terminal state. Update manifest, release lock.
if (!transition) {
  if ((state.transitions ?? []).length > 0) {
    // We had transitions but none matched — this is a fault.
    writeFaultTrace(
      parsed.runId,
      {
        state,
        reason: "no_transition_matched",
        details: { evaluations },
      },
      { rootDir },
    );
    updateManifest(
      parsed.runId,
      { status: "faulted", ended_at: new Date().toISOString() },
      { rootDir },
    );
    releaseLock(parsed.runId, { sessionId: parsed.sessionId, rootDir });
    emit({
      error: "no_transition_matched",
      state: state.id,
      evaluations,
    });
    process.exit(1);
  }
  // True terminal: state has no transitions by design.
  updateManifest(
    parsed.runId,
    {
      status: "completed",
      current_state: state.id,
      next_state: null,
      ended_at: new Date().toISOString(),
      verdict: envWithCommit.verdict ?? null,
      transitions_count: (manifest.transitions_count ?? 0) + 1,
    },
    { rootDir },
  );
  releaseLock(parsed.runId, { sessionId: parsed.sessionId, rootDir });
  emit({
    ok: true,
    status: "terminal",
    state: state.id,
    verdict: envWithCommit.verdict ?? null,
    run_dir_path: runDirPath(parsed.runId, { rootDir }),
  });
  process.exit(0);
}

// Advance to the next state.
const nextState = stateById(fsm.doc, transition.to);
const nextInputs = nextState.worker?.inputs?.reduce((acc, name) => {
  acc[name] = envWithCommit[name];
  return acc;
}, {}) ?? {};
writeEntryTrace(
  parsed.runId,
  { state: nextState, inputs: nextInputs },
  { rootDir },
);
updateManifest(
  parsed.runId,
  {
    current_state: nextState.id,
    next_state: null,
    transitions_count: (manifest.transitions_count ?? 0) + 1,
  },
  { rootDir },
);
const brief = buildBrief({ doc: fsm.doc, state: nextState, env: envWithCommit, runId: parsed.runId });
emit({ ok: true, advanced_from: state.id, ...brief });
process.exit(0);
