// fsm-engine.mjs — shared engine logic used by fsm-next + fsm-commit.
//
// Reads the FSM YAML, builds the run-state environment from disk traces,
// resolves transitions, and produces the next-state brief that the FSM
// Orchestrator consumes via stdout.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";

import { evaluatePredicate } from "./fsm-predicates.mjs";
import {
  hashFsmYaml,
  validateFsmSchema,
  validateFsmStatic,
  validateWorkerResponse,
} from "./fsm-schema.mjs";
import {
  appendTraceFile,
  readManifest,
  readTrace,
  writeManifest,
} from "./fsm-storage.mjs";

const DEFAULT_FSM_PATH = "fsm/code-reviewer.fsm.yaml";

// loadFsm returns the parsed FSM document and its hash. Throws on parse or
// validation failure.
export function loadFsm({ fsmPath = DEFAULT_FSM_PATH, rootDir = process.cwd() } = {}) {
  const path = resolve(rootDir, fsmPath);
  if (!existsSync(path)) {
    throw new Error(`loadFsm: FSM YAML not found at ${path}`);
  }
  const doc = parseYaml(readFileSync(path, "utf8"));
  const schemaResult = validateFsmSchema(doc);
  if (!schemaResult.valid) {
    throw new Error(
      `loadFsm: FSM YAML failed structural validation: ${schemaResult.errors.join("; ")}`,
    );
  }
  const staticResult = validateFsmStatic(doc, { fsmFilePath: path });
  if (!staticResult.valid) {
    throw new Error(
      `loadFsm: FSM YAML failed static validation: ${staticResult.errors.join("; ")}`,
    );
  }
  return { doc, hash: hashFsmYaml(path), path };
}

// stateById returns the state object for the given id or throws.
export function stateById(doc, id) {
  const state = doc.fsm.states.find((s) => s.id === id);
  if (!state) {
    throw new Error(`stateById: no state with id "${id}" in FSM "${doc.fsm.id}"`);
  }
  return state;
}

// runEnv reads all exit/entry trace records for a run and produces the
// cumulative environment of outputs collected so far. Useful for
// resolving inputs of the next state and evaluating its preconditions.
export function runEnv(runId, { rootDir = process.cwd() } = {}) {
  const trace = readTrace(runId, { rootDir });
  const env = {};
  for (const record of trace) {
    if (record.data?.phase !== "exit") continue;
    const outputs = record.data?.outputs;
    if (outputs && typeof outputs === "object") {
      Object.assign(env, outputs);
    }
  }
  // Pull args from the entry trace of the entry state if present.
  for (const record of trace) {
    if (record.data?.phase === "entry" && record.data?.inputs?.args) {
      env.args = record.data.inputs.args;
      break;
    }
  }
  return env;
}

// buildBrief returns the JSON object that the FSM Orchestrator consumes.
// Includes the state spec + resolved inputs + transitions + the worker
// response_schema if present. The Orchestrator never reads the FSM YAML;
// the brief is the only contract.
export function buildBrief({ doc, state, env, runId }) {
  const brief = {
    run_id: runId,
    state: state.id,
    purpose: state.purpose,
    preconditions: state.preconditions ?? [],
    inputs: resolveInputs(state, env),
    outputs_expected: state.outputs ?? [],
    post_validations: state.post_validations ?? [],
    transitions: (state.transitions ?? []).map((t) => ({ to: t.to, when: t.when })),
    has_worker: Boolean(state.worker),
  };
  if (state.worker) {
    brief.worker = {
      role: state.worker.role,
      prompt_template: state.worker.prompt_template,
      inputs: state.worker.inputs ?? [],
      response_schema: state.worker.response_schema,
    };
  }
  return brief;
}

function resolveInputs(state, env) {
  const declared = state.worker?.inputs ?? [];
  const out = {};
  for (const name of declared) {
    out[name] = env[name];
  }
  return out;
}

// resolveTransition picks the first transition whose predicate evaluates
// true against the env. Supports three when-shapes:
//   when: "always" → unconditional
//   when: "otherwise" → true iff no earlier transition matched
//   when: { kind: "deterministic", expression: "..." } → evaluate with predicate engine
//   when: { kind: "judgement", criteria: "..." } → judgement transitions are
//     resolved by the FSM Orchestrator itself; this engine returns null and
//     defers to the caller to provide an explicit pick via fsm-commit's
//     --transition flag.
//   when: { kind: "always" } → unconditional
//
// Returns { transition, evaluations[] } where evaluations records the
// per-transition result for the trace.
export function resolveTransition(state, env, { judgementPick } = {}) {
  const transitions = state.transitions ?? [];
  const evaluations = [];
  let firstMatch = null;
  let matchedAny = false;
  for (const t of transitions) {
    const evalRecord = { to: t.to, when: t.when };
    if (t.when === "always" || t.when?.kind === "always") {
      evalRecord.result = true;
      evaluations.push(evalRecord);
      if (!firstMatch) firstMatch = t;
      matchedAny = true;
      continue;
    }
    if (t.when === "otherwise") {
      const result = !matchedAny;
      evalRecord.result = result;
      evaluations.push(evalRecord);
      if (result && !firstMatch) firstMatch = t;
      continue;
    }
    if (t.when?.kind === "deterministic") {
      try {
        const result = evaluatePredicate(t.when.expression, env);
        evalRecord.result = result;
        evalRecord.expression = t.when.expression;
        evaluations.push(evalRecord);
        if (result && !firstMatch) firstMatch = t;
        if (result) matchedAny = true;
      } catch (err) {
        evalRecord.result = false;
        evalRecord.error = err.message;
        evaluations.push(evalRecord);
      }
      continue;
    }
    if (t.when?.kind === "judgement") {
      const picked = judgementPick === t.to;
      evalRecord.kind = "judgement";
      evalRecord.criteria = t.when.criteria;
      evalRecord.result = picked;
      evaluations.push(evalRecord);
      if (picked && !firstMatch) firstMatch = t;
      if (picked) matchedAny = true;
      continue;
    }
    evalRecord.result = false;
    evalRecord.error = `unsupported when shape: ${JSON.stringify(t.when)}`;
    evaluations.push(evalRecord);
  }
  return { transition: firstMatch, evaluations };
}

// runPostValidations is a stub for Sprint A — the post_validations array is
// declarative documentation today. Sprint B can wire predicate evaluation
// here. Returns { valid, results[] } for trace recording.
export function runPostValidations(state) {
  const results = (state.post_validations ?? []).map((check) => ({
    check,
    result: "skipped",
    note: "post_validations are declarative in Sprint A; runtime evaluation deferred to Sprint B",
  }));
  return { valid: true, results };
}

// validateOutputs runs the worker.response_schema (if any) over the supplied
// payload. Returns { valid, errors[] }. Inline states (no worker) skip
// schema validation and return valid=true.
export function validateOutputs(state, outputs) {
  if (!state.worker?.response_schema) {
    return { valid: true, errors: [] };
  }
  return validateWorkerResponse(state.worker.response_schema, outputs);
}

// initialiseManifest writes the very first manifest.json for a new run.
export function initialiseManifest({ runId, fsmDoc, fsmHash, args, repo, baseSha, headSha, now = new Date(), rootDir = process.cwd() }) {
  const data = {
    run_id: runId,
    parent_run_id: null,
    forked_from: null,
    fsm_id: fsmDoc.fsm.id,
    fsm_yaml_hash: fsmHash,
    fsm_yaml_version: fsmDoc.fsm.version,
    status: "in_progress",
    current_state: null,
    next_state: fsmDoc.fsm.entry,
    started_at: now.toISOString(),
    last_update_at: now.toISOString(),
    ended_at: null,
    paused_at: null,
    pause_reason: null,
    abandoned_at: null,
    abandon_reason: null,
    repo: repo ?? null,
    base_sha: baseSha ?? null,
    head_sha: headSha ?? null,
    args: args ?? {},
    verdict: null,
    transitions_count: 0,
  };
  writeManifest(runId, data, { rootDir });
  return data;
}

// updateManifest patches the existing manifest.json with the supplied
// fields. Caller is responsible for status / current_state / next_state
// transitions.
export function updateManifest(runId, patch, { rootDir = process.cwd(), now = new Date() } = {}) {
  const existing = readManifest(runId, { rootDir });
  if (!existing) {
    throw new Error(`updateManifest: no manifest at run-id "${runId}"`);
  }
  const updated = {
    ...existing,
    ...patch,
    last_update_at: now.toISOString(),
  };
  writeManifest(runId, updated, { rootDir });
  return updated;
}

// writeEntryTrace records the state-entry record. data is the inputs/preconditions
// payload (caller supplies); engine timestamps + numbers it.
export function writeEntryTrace(runId, { state, inputs, preconditionsResult }, { rootDir = process.cwd() } = {}) {
  return appendTraceFile(
    runId,
    {
      phase: "entry",
      state: state.id,
      data: {
        purpose: state.purpose,
        preconditions: preconditionsResult ?? state.preconditions ?? [],
        inputs: inputs ?? {},
      },
    },
    { rootDir },
  );
}

export function writeExitTrace(runId, { state, outputs, postValidations, transitionEvals, chosenTransition }, { rootDir = process.cwd() } = {}) {
  return appendTraceFile(
    runId,
    {
      phase: "exit",
      state: state.id,
      data: {
        outputs: outputs ?? {},
        post_validations: postValidations ?? [],
        transition_evaluation: transitionEvals ?? [],
        transition: chosenTransition ?? null,
      },
    },
    { rootDir },
  );
}

export function writeFaultTrace(runId, { state, reason, details }, { rootDir = process.cwd() } = {}) {
  return appendTraceFile(
    runId,
    {
      phase: "fault",
      state: state.id,
      data: {
        reason,
        details: details ?? null,
      },
    },
    { rootDir },
  );
}
