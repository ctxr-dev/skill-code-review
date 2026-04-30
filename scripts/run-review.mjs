#!/usr/bin/env node
// run-review.mjs — orchestrator-driver runner for skill-code-review (Sprint B B1).
//
// Drives the FSM at fsm/code-reviewer.fsm.yaml through the @ctxr/fsm engine:
// - calls `fsm-next` to get a state brief,
// - for inline states (no `worker:`) dispatches to scripts/inline-states/<kebab-state-id>.mjs,
// - for worker states pauses and emits a structured brief for the caller (Main Session
//   Claude) to dispatch the worker via the Agent tool,
// - calls `fsm-commit` with the captured outputs,
// - loops until the FSM reaches the `terminal` state.
//
// Two invocation modes:
//   node scripts/run-review.mjs --start --base <sha> --head <sha> [--args-file <path>]
//   node scripts/run-review.mjs --continue --run-id <id> --outputs-file <path>
//
// Output (JSON, one object on stdout per call):
//   { status: "awaiting_worker", run_id, brief }   — caller dispatches worker
//   { status: "terminal",        run_id, verdict, run_dir_path }
//   { status: "fault",           run_id, fault: { state, reason, details } }
//   { status: "error",           message, ...extra } — environment / setup
//     failure (no fsm dep installed, bad CLI args, missing inline handler).
//     Distinct from `fault`: `fault` is an in-flow runtime fault during state
//     execution; `error` is a fail-fast pre-condition before the loop is
//     usable. Process exits non-zero after emitting `error`.
//
// Inline states are dispatched to handler modules under scripts/inline-states/.
// FSM state ids are snake_case; handler filenames are kebab-case. The runner
// translates at dispatch time. Hitting an inline state without a registered
// handler emits a `fault` so callers can react uniformly.

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, existsSync, rmSync, renameSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir, platform } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

import { resolveSettings, runEnv, runDirPath, readLock, readManifest } from "@ctxr/fsm";

import {
  resolveReplayMode,
  computeHashKey,
  replayLookup,
  recordOutputs,
  stashPendingBrief,
  readPendingBrief,
  clearPendingBrief,
  FIXTURES_ROOT,
} from "./lib/worker-replay.mjs";

import { validateTrimOutput } from "./lib/trim-output-validator.mjs";

// Apply the B8 referential-integrity check to a worker output. Returns
// `{ ok: true }` for no-op (output isn't a trim shape) or for a clean
// pass; returns `{ ok: false, message, details }` on any violation
// (env unreadable, schema-cross-ref violations). The --continue caller
// is responsible for converting `ok: false` to a fail() so the runner
// stays the only place that touches process.exit; unit tests can drive
// this function without process.exit by stubbing the env loader and
// inspecting the return shape.
//
// Exported so unit tests can pin the gate without a live FSM run.
// `_deps` is an optional injection seam (resolveStorageRoot, runEnv,
// repoRoot) so tests can drive both happy and failure paths.
export function runTrimValidationGate(runId, outputs, _deps = {}) {
  if (!outputs || !Array.isArray(outputs.picked_leaves)) return { ok: true };
  const resolveStorageRootFn = _deps.resolveStorageRoot ?? resolveStorageRoot;
  const runEnvFn = _deps.runEnv ?? runEnv;
  const repoRoot = _deps.repoRoot ?? REPO_ROOT;
  let env;
  try {
    const storageRoot = resolveStorageRootFn();
    env = runEnvFn(runId, { storageRoot });
  } catch (err) {
    // Build the parenthetical from defined parts only so we don't emit
    // awkward strings like "( something)" when the thrown value lacks
    // `code` or `message`. Falls back to the stringified value when
    // neither is present.
    const parts = [err?.code, err?.message ?? (typeof err === "string" ? err : null)].filter(
      (p) => typeof p === "string" && p.length > 0,
    );
    const detail = parts.length > 0 ? ` (${parts.join(": ")})` : "";
    return {
      ok: false,
      message: `llm_trim validation: failed to read run env${detail}.`,
      details: { state: "llm_trim", run_id: runId },
    };
  }
  const v = validateTrimOutput(outputs, env, { repoRoot });
  if (!v.ok) {
    return {
      ok: false,
      message: `llm_trim referential-integrity validation failed: ${v.errors.join("; ")}`,
      details: { state: "llm_trim", run_id: runId, violations: v.errors },
    };
  }
  return { ok: true };
}

// Project the FSM brief's declared inputs out of the run env so the hash
// key only depends on what the worker actually sees, not the full env.
// fsm-next can expose the inputs list either at the top level
// (`brief.inputs`) or nested under the worker block (`brief.worker.inputs`),
// matching how prompt_template is exposed. Fall back so a hash isn't
// computed against an empty inputs list when the brief uses the nested
// shape.
function projectBriefInputs(brief, env) {
  const namesRaw = Array.isArray(brief?.inputs)
    ? brief.inputs
    : Array.isArray(brief?.worker?.inputs)
      ? brief.worker.inputs
      : [];
  const out = {};
  for (const name of namesRaw) out[name] = env?.[name];
  return out;
}

// In the FSM YAML, prompt_template paths are written relative to the FSM
// YAML's own directory (e.g. `workers/project-scanner.md`), not relative
// to the repo root. computeHashKey expects a path relative to repoRoot
// when reading the prompt body, so the runner projects the brief's path
// into a repo-relative one before calling it.
//
// The FSM YAML for this project lives at `fsm/code-reviewer.fsm.yaml`
// (configured in .fsmrc.json). Hardcoding the prefix here is simpler
// than going through loadConfig/resolveSettings every call AND keeps
// this helper purely synchronous + testable without a config gate.
const FSM_YAML_DIR_REL = "fsm";

export function repoRelativePromptPath(briefPath) {
  if (typeof briefPath !== "string" || briefPath.length === 0) return "";
  // Reject absolute paths and any traversal segment up front. The hashing
  // harness reads `<repoRoot>/<promptTemplate>`; without these guards a
  // brief carrying `../etc/passwd` or `/abs/path` would let a tampered
  // FSM YAML pull arbitrary files into the hash (and into the recorded
  // fixture's content fingerprint). Legitimate shapes are
  // `workers/<role>.md` (FSM-yaml-relative) or `fsm/workers/<role>.md`
  // (already repo-relative). Throw rather than silently sanitize so a
  // malformed brief surfaces immediately.
  if (
    /(^|[\\/])\.\.([\\/]|$)/.test(briefPath) ||
    briefPath.startsWith("/") ||
    briefPath.startsWith("\\") ||
    /^[A-Za-z]:[\\/]/.test(briefPath)
  ) {
    throw new Error(
      `repoRelativePromptPath: traversal / absolute / UNC paths are rejected; got ${JSON.stringify(briefPath)}`,
    );
  }
  // Already repo-relative (starts with `fsm/`) → pass through unchanged.
  // Otherwise prepend the FSM-YAML directory so paths like
  // `workers/project-scanner.md` become `fsm/workers/project-scanner.md`.
  const norm = briefPath.split(/[/\\]+/).join("/");
  if (norm.startsWith(`${FSM_YAML_DIR_REL}/`) || norm === FSM_YAML_DIR_REL) {
    return norm;
  }
  return `${FSM_YAML_DIR_REL}/${norm}`;
}

// Bake the worker prompt body into the brief so the orchestrator (the LLM
// driving --start/--continue) can use brief.worker.prompt_body directly
// instead of having to Read the file at brief.worker.prompt_template. SKILL.md
// instructs the orchestrator NOT to read the file separately. The runner
// reads it once here, on the way out, and ships its bytes in the brief.
//
// Failures to read are surfaced as a missing prompt_body (not a fault):
// the brief still flows, the orchestrator still has the prompt_template
// path it can fall back to, and any hashing / fixture-record code that
// ALREADY needs the file body will surface its own errors at that point.
// We do NOT want a transient ENOENT on prompt-body enrichment to fault
// out a run that would otherwise advance fine.
export function enrichBriefWithPromptBody(brief) {
  const promptTemplate = brief?.worker?.prompt_template;
  if (!promptTemplate || typeof promptTemplate !== "string") return brief;
  let bodyPath;
  try {
    bodyPath = resolve(REPO_ROOT, repoRelativePromptPath(promptTemplate));
  } catch {
    return brief;
  }
  let body;
  try {
    body = readFileSync(bodyPath, "utf8");
  } catch {
    return brief;
  }
  // Return a new object with the enriched worker; do not mutate input.
  return {
    ...brief,
    worker: {
      ...brief.worker,
      prompt_body: body,
    },
  };
}

// Bake each picked leaf's full markdown body into the dispatch_specialists
// brief so the orchestrator can dispatch K specialists in parallel without
// needing to Read K leaf files separately. Only enriches when the brief is
// for dispatch_specialists; other states pass through untouched.
//
// PR D of #70 (audit divergence #3): the coordinator-Agent layer was
// eliminated in favour of orchestrator-side parallel dispatch. The runner
// now ships every picked leaf's body in inputs.picked_leaves[].body so the
// orchestrator's "dispatch K specialists" step is a single concatenation
// per leaf, not a Read-then-concatenate.
export function enrichBriefWithSpecialistBodies(brief) {
  if (brief?.state !== "dispatch_specialists") return brief;
  const inputs = brief?.inputs;
  const pickedLeaves = inputs?.picked_leaves;
  if (!Array.isArray(pickedLeaves) || pickedLeaves.length === 0) return brief;
  const wikiRoot = resolve(REPO_ROOT, "reviewers.wiki");
  const enrichedLeaves = pickedLeaves.map((leaf) => {
    if (!leaf || typeof leaf.path !== "string") return leaf;
    // Try wiki-relative first (the canonical shape from tree_descend),
    // then repo-relative as a fallback (some upstream tooling carries the
    // longer prefix). Mirrors verify-coverage.mjs's resolution order.
    const candidates = [resolve(wikiRoot, leaf.path), resolve(REPO_ROOT, leaf.path)];
    for (const candidate of candidates) {
      try {
        const body = readFileSync(candidate, "utf8");
        return { ...leaf, body };
      } catch {
        continue;
      }
    }
    // Leaf body unreadable: pass through without `body`. The orchestrator
    // can still Read the file from leaf.path as a fallback. We do not
    // surface this as a fault — that would block a run for one missing
    // body when 19 of 20 specialists could still dispatch fine.
    return leaf;
  });
  return {
    ...brief,
    inputs: {
      ...inputs,
      picked_leaves: enrichedLeaves,
    },
  };
}

// PR for #76: run-dir as the source of truth.
//
// Two helpers compute the canonical per-state, per-run-id paths under
// <run_dir>/workers/. The directory is pre-created by @ctxr/fsm's
// ensureRunDir on every fsm-next invocation, so no mkdir boilerplate is
// needed here.
//
// Layout:
//   <run_dir>/workers/<state>-brief.json   ← runner writes on every pause
//   <run_dir>/workers/<state>-output.json  ← orchestrator writes; --continue reads
//
// Both files round-trip through JSON.parse / JSON.stringify with no
// special framing — they are the canonical artifacts the orchestrator
// reads from disk.
export function defaultOutputsPath(runId, state) {
  if (!runId || !state) return null;
  const storageRoot = resolveStorageRoot();
  return join(runDirPath(runId, { storageRoot }), "workers", `${state}-output.json`);
}

export function defaultBriefPath(runId, state) {
  if (!runId || !state) return null;
  const storageRoot = resolveStorageRoot();
  return join(runDirPath(runId, { storageRoot }), "workers", `${state}-brief.json`);
}

// Inject brief.outputs_path into every awaiting_worker brief on the way
// out of parseFsmCliResult. Pure function, idempotent; passes through
// briefs that are not at a worker pause.
//
// SKILL.md mandates that the orchestrator write the worker's response
// to brief.outputs_path. The runner defaults --continue's --outputs-file
// to this same path, so the orchestrator does not need to thread the
// path back via CLI args.
export function enrichBriefWithOutputsPath(brief) {
  if (!brief?.has_worker) return brief;
  if (!brief.run_id || !brief.state) return brief;
  const outputsPath = defaultOutputsPath(brief.run_id, brief.state);
  if (!outputsPath) return brief;
  return { ...brief, outputs_path: outputsPath };
}

// Persist a fully-enriched awaiting_worker brief to
// <run_dir>/workers/<state>-brief.json atomically (write to a tmp
// sibling, then rename). The brief on disk is the canonical record;
// stdout is a convenience signal but not load-bearing — if the
// orchestrator loses the stdout brief, --resume reads this file.
//
// Best-effort: any I/O failure is swallowed. The orchestrator can still
// use stdout if disk persistence happens to fail. We do not want a
// transient ENOSPC / EACCES on brief-disk-write to fault out a run that
// would otherwise advance fine.
export function writeBriefToDisk(brief) {
  if (!brief?.has_worker) return;
  if (!brief.run_id || !brief.state) return;
  const briefPath = defaultBriefPath(brief.run_id, brief.state);
  if (!briefPath) return;
  atomicWriteFile(briefPath, JSON.stringify(brief, null, 2));
}

// PR for #79: pre-stage agent dispatch prompts under <run_dir>/workers/
// so the orchestrator never composes prompts itself or reaches for
// /tmp / python3 -c / jq to extract prompt_body and concat with inputs.
//
// Layout (additive on top of #76):
//   <run_dir>/workers/<state>-dispatch-prompt.md
//                                            ← single agent-ready prompt
//   <run_dir>/workers/dispatch_specialists-prompt-<leaf-id>.md
//                                            ← K per-leaf prompts (one per
//                                              picked specialist)
//
// The orchestrator's dispatch step becomes:
//   1. cat <run_dir>/workers/<state>-dispatch-prompt.md
//   2. Feed the bytes to Agent
// No JSON parsing, no field extraction, no /tmp.
// FSM state-id shape per fsm/code-reviewer.fsm.yaml: snake_case ascii
// (lowercase letters, digits, underscore). Reject anything else BEFORE
// composing a filename so a tampered manifest (e.g. an attacker-controlled
// current_state with `..` or path separators) cannot direct file
// writes/reads outside <run_dir>/workers/. Same defense-in-depth pattern
// as scripts/lib/worker-replay.mjs's assertSafeStateSegment.
function isSafeStateSegment(state) {
  return typeof state === "string" && /^[a-z][a-z0-9_]*$/.test(state);
}

export function defaultDispatchPromptPath(runId, state, leafId) {
  if (!runId) return null;
  if (!isSafeStateSegment(state)) return null;
  const storageRoot = resolveStorageRoot();
  const dir = join(runDirPath(runId, { storageRoot }), "workers");
  if (state === "dispatch_specialists") {
    // Strict branch: dispatch_specialists prompts are ONLY valid in the
    // documented per-leaf layout. Reject missing or malformed leaf-ids
    // (path-traversal guard: kebab-case alnum-and-dashes per the corpus
    // contract) so the helper never falls back to the generic
    // "<state>-dispatch-prompt.md" path that writeSpecialistPromptsToDisk
    // does not produce.
    if (typeof leafId !== "string" || !/^[a-z][a-z0-9-]*$/.test(leafId)) {
      return null;
    }
    return join(dir, `dispatch_specialists-prompt-${leafId}.md`);
  }
  return join(dir, `${state}-dispatch-prompt.md`);
}

// Pure function: build the literal agent-ready prompt text from a brief.
// Two shapes:
//   - Standard worker (project-scanner, tree-descender, etc.): one prompt
//     containing the worker's prompt_body verbatim plus a structured
//     "INPUTS" section emitting JSON for every declared input, followed
//     by brief.outputs_path as the location where the worker writes its
//     JSON response.
//   - dispatch_specialists per-leaf (when `opts.leaf` is provided):
//     the per-specialist template plus the leaf's id/path/dimensions and
//     body, the project_profile, the changed_paths, an orchestrator-fill
//     filtered-diff placeholder, and tool_results. In this shape
//     outputs_path is included only for audit/orchestration context;
//     the specialist returns JSON to the orchestrator and does NOT
//     write to disk directly (the orchestrator aggregates the K
//     responses and writes once).
export function buildDispatchPromptText(brief, opts = {}) {
  const promptBody = brief?.worker?.prompt_body ?? "";
  const declaredInputs = brief?.worker?.inputs ?? [];
  const inputs = brief?.inputs ?? {};
  const outputsPath = brief?.outputs_path ?? "<unknown>";
  const leaf = opts.leaf ?? null;

  if (leaf) {
    // Per-specialist prompt for dispatch_specialists.
    const projectProfile = inputs.project_profile ?? {};
    const changedPaths = Array.isArray(inputs.changed_paths) ? inputs.changed_paths : [];
    const toolResults = Array.isArray(inputs.tool_results) ? inputs.tool_results : [];
    return [
      promptBody,
      "",
      "--- THIS SPECIALIST ---",
      `id = ${leaf.id ?? ""}`,
      `path = ${leaf.path ?? ""}`,
      `dimensions = ${JSON.stringify(leaf.dimensions ?? [])}`,
      "",
      "--- LEAF BODY ---",
      String(leaf.body ?? ""),
      "",
      "--- PROJECT PROFILE ---",
      JSON.stringify(projectProfile, null, 2),
      "",
      "--- CHANGED PATHS ---",
      JSON.stringify(changedPaths, null, 2),
      "",
      // The runner does NOT pre-compute a per-leaf filtered diff —
      // that would require reading each leaf's `activation.file_globs`
      // from frontmatter at brief-build time (a follow-up; tracked
      // separately). The orchestrator MUST append the filtered diff
      // below this header before dispatching the Agent. SKILL.md's
      // dispatch_specialists section names this as the one allowed
      // form of prompt augmentation.
      "--- FILTERED DIFF (orchestrator appends below) ---",
      `(Append: git diff <base>..<head> -- <leaf's activation.file_globs from leaf.body frontmatter, or the full diff if no globs>)`,
      "",
      // Header reflects what the runner actually emits: ALL tool_results
      // unfiltered. The dispatched specialist can filter itself using
      // its leaf body's tools[] frontmatter, which IS shipped above.
      "--- TOOL RESULTS ---",
      JSON.stringify(toolResults, null, 2),
      "",
      // Per-specialist contract: return JSON to the orchestrator. The
      // orchestrator collects K responses and aggregates them into a
      // single specialist_outputs[] payload at outputs_path. K specialists
      // writing directly to outputs_path would clobber each other and
      // contradict fsm/workers/specialist.md.
      "--- RESPONSE CONTRACT ---",
      "Return ONLY the per-specialist JSON object to the orchestrator.",
      "Do NOT write to disk or to any outputs path.",
      "Required shape: { id, status, runtime_ms, tokens_in, tokens_out, findings[], optional skip_reason }",
      "",
      `(For audit context: the orchestrator aggregates the K responses into specialist_outputs[] and writes once to ${outputsPath}.)`,
      "",
    ].join("\n");
  }

  // Standard worker prompt.
  const lines = [promptBody, "", "--- INPUTS (from FSM env) ---"];
  for (const name of declaredInputs) {
    // JSON.stringify(undefined) returns undefined (no string output);
    // the surrounding template-literal interpolation would then coerce
    // it to the string "undefined" and emit a non-JSON line
    // `<name> = undefined`. Coerce missing inputs to null so the INPUTS
    // section stays JSON-shaped and predictable for the dispatched agent.
    const value = inputs[name] === undefined ? null : inputs[name];
    lines.push(`${name} = ${JSON.stringify(value, null, 2)}`);
    lines.push("");
  }
  lines.push("--- OUTPUTS PATH ---");
  lines.push(`Write your JSON response (matching the response_schema in your prompt above) to:`);
  lines.push(outputsPath);
  lines.push("");
  return lines.join("\n");
}

// Side-effecting helper. Persists the standard-worker dispatch prompt
// to <run_dir>/workers/<state>-dispatch-prompt.md atomically. Fires
// from handleWorkerStateBrief alongside writeBriefToDisk on every pause.
// Best-effort: I/O failures are swallowed; the brief on disk is the
// canonical record. SKILL.md forbids orchestrator-side prompt
// composition as the normal path — if the prompt file goes missing,
// reconstructing from the brief's prompt_body + inputs is a
// last-resort, run-dir-scoped recovery, not standard workflow.
export function writeDispatchPromptToDisk(brief) {
  if (!brief?.has_worker) return;
  if (brief.state === "dispatch_specialists") return; // handled by writeSpecialistPromptsToDisk
  const promptPath = defaultDispatchPromptPath(brief.run_id, brief.state);
  if (!promptPath) return;
  const text = buildDispatchPromptText(brief);
  atomicWriteFile(promptPath, text);
}

// Side-effecting helper. For dispatch_specialists ONLY, writes one
// prompt file per picked leaf so the orchestrator dispatches K Agents
// in parallel using K cat-of-file prompts. Files at:
//   <run_dir>/workers/dispatch_specialists-prompt-<leaf-id>.md
// Skip leaves with malformed ids (defaultDispatchPromptPath returns null).
export function writeSpecialistPromptsToDisk(brief) {
  if (!brief?.has_worker) return;
  if (brief.state !== "dispatch_specialists") return;
  const pickedLeaves = brief?.inputs?.picked_leaves;
  if (!Array.isArray(pickedLeaves) || pickedLeaves.length === 0) return;
  for (const leaf of pickedLeaves) {
    if (!leaf || typeof leaf.id !== "string") continue;
    const promptPath = defaultDispatchPromptPath(brief.run_id, brief.state, leaf.id);
    if (!promptPath) continue;
    const text = buildDispatchPromptText(brief, { leaf });
    atomicWriteFile(promptPath, text);
  }
}

// Shared atomic-write primitive used by writeBriefToDisk and the new
// dispatch-prompt writers. Write to a uniquely-named tmp sibling, then
// rename. Best-effort: any I/O failure is swallowed and the leftover tmp
// file (if any) is cleaned up. Callers do NOT throw — these are
// derivative artefacts, not load-bearing.
function atomicWriteFile(targetPath, contents) {
  const tmpPath = `${targetPath}.tmp-${process.pid}-${Date.now()}`;
  try {
    writeFileSync(tmpPath, contents);
    renameSync(tmpPath, targetPath);
  } catch {
    try {
      rmSync(tmpPath, { force: true });
    } catch {
      // ignore
    }
  }
}

function hashKeyForBrief(brief, env) {
  const briefPath = brief?.prompt_template ?? brief?.worker?.prompt_template ?? "";
  return computeHashKey({
    state: brief?.state,
    // Project the FSM-yaml-relative path to a repo-relative one so
    // computeHashKey's `resolve(repoRoot, promptTemplate)` finds the
    // actual prompt file under fsm/workers/.
    promptTemplate: repoRelativePromptPath(briefPath),
    inputs: projectBriefInputs(brief, env),
    // Pass repoRoot so the harness reads the prompt body and includes its
    // SHA in the hash — editing the prose without renaming the file
    // invalidates every recorded fixture for that worker.
    repoRoot: REPO_ROOT,
  });
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const INLINE_STATES_DIR = resolve(__dirname, "inline-states");

function resolveStorageRoot() {
  // @ctxr/fsm exposes resolveSettings(cliArgs, cwd) — cliArgs is the
  // selector ({fsmName, fsmPath, storageRoot, sessionId}), cwd is the
  // directory to resolve the .fsmrc.json relative to. resolveSettings
  // calls loadConfig internally; the caller does NOT pre-load. Returns
  // are camelCase (storageRoot), not the snake_case form used in
  // .fsmrc.json on disk. Earlier rounds had this backwards
  // (loadConfig({cwd: REPO_ROOT}) and resolveSettings(config, {...})),
  // which was hidden because this function is only on the --continue
  // path.
  const settings = resolveSettings({ fsmName: "code-reviewer" }, REPO_ROOT);
  return resolve(REPO_ROOT, settings.storageRoot);
}

export function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    // POSIX `--` terminates option parsing; everything after is positional.
    // Treating it as an option (which the naive startsWith("--") check
    // does) would create an `args[""]` entry and swallow the trailing
    // positionals.
    if (a === "--") break;
    if (!a.startsWith("--")) continue;
    // Support both `--key value` and `--key=value` forms. The latter is
    // what most CLIs accept by convention, and our docs show that shape.
    const eq = a.indexOf("=");
    if (eq !== -1) {
      const key = a.slice(2, eq);
      args[key] = a.slice(eq + 1);
      continue;
    }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next === "--" || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i++;
  }
  return args;
}

function emit(payload) {
  process.stdout.write(JSON.stringify(payload) + "\n");
}

// Allowlist for the args bag forwarded into the FSM run env. Mirrors the
// argument table in report-format.md. Unknown keys are rejected so a
// typo'd flag (e.g. `scope-langs` instead of `scope-lang`) surfaces at
// startup rather than being silently dropped mid-pipeline.
const ALLOWED_ARGS_KEYS = new Set([
  "format",
  "full",
  "base",
  "head",
  "scope-dir",
  "scope-lang",
  "scope-framework",
  "scope-reviewer",
  "scope-severity",
  "scope-gate",
  "tools",
  "mode",
  "description",
  "max-reviewers",
  // `replay-mode` is intentionally NOT in this set — it's a runner-level
  // CLI flag, not part of the FSM run's `args` env (per report-format.md).
  // Forwarding it into env.args would mean the same worker invocation
  // hashes differently depending on whether the user passed
  // --replay-mode=live vs left the flag off, defeating the determinism
  // the harness exists to provide.
]);
function validateArgsBag(bag) {
  if (bag === null || typeof bag !== "object" || Array.isArray(bag)) {
    fail(`--args-file must contain a JSON object; got: ${typeof bag}`);
  }
  for (const key of Object.keys(bag)) {
    if (!ALLOWED_ARGS_KEYS.has(key)) {
      fail(
        `--args-file contains unknown key '${key}'. Allowed keys: ${[...ALLOWED_ARGS_KEYS].join(", ")}`,
      );
    }
  }
}

// Validate a run id per @ctxr/fsm's run-id format: lowercase alnum + dashes
// only, fixed length range. Anything else (especially `/` or `..`) would
// let `path.join(SCRATCH_DIR, ...)` escape the scratch directory when the
// id is interpolated into a filename, opening a path-traversal that could
// overwrite arbitrary files in `--continue` mode.
const RUN_ID_PATTERN = /^[a-z0-9][a-z0-9-]{2,63}$/;
export function isValidRunId(value) {
  return typeof value === "string" && RUN_ID_PATTERN.test(value);
}

// Validate a git ref / SHA / revspec per code-reviewer.md's argument-parsing
// allowlist. Accept alnum + `_./-@^~{}` so the documented revspec features
// (`HEAD~1`, `branch@{1.day.ago}`, `commit^2`) work, but DON'T accept `:` —
// the spec doesn't document `:` and allowing it expands the shape to
// `treeish:path` forms that the orchestrator never asks for. Reject shell
// metacharacters (whitespace, `;`, `|`, `&`, `$`, backticks, `(`, `)`, `*`,
// `?`, `\`, `'`, `"`, `>`, `<`, `:`) so values can't inject into downstream
// `git` invocations even if the engine forwards them to a shell context.
// Also reject refs that START with `-`: `-something` would be parsed by
// `git` as an option (`-n`, `--upload-pack=...`) and turn into option
// injection if any downstream call lacks a `--` separator before the ref.
const GIT_REF_PATTERN = /^(?!-)[A-Za-z0-9_./@^~{}-]{1,255}$/;
export function isValidGitRef(value) {
  return typeof value === "string" && GIT_REF_PATTERN.test(value);
}

// Read + parse JSON from a path, surfacing missing-file / invalid-JSON as
// structured `{status:"error"}` instead of letting the exception escape
// to main().catch and emit a generic "unhandled error".
function readJsonFile(path, label) {
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch (err) {
    fail(`${label} read failed (${path}): ${err.code ?? ""} ${err.message}`.trim());
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    fail(`${label} contains invalid JSON (${path}): ${err.message}`);
  }
}

function fail(message, extra = {}) {
  emit({ status: "error", message, ...extra });
  process.exit(1);
}

// Locate the @ctxr/fsm CLIs through the local node_modules. Hard-fail if the
// dep isn't installed — the runner cannot work without it. On Windows npm
// installs `.cmd` shims under .bin; try the bare name first, then the .cmd
// fallback, so the lookup is portable.
function fsmBin(name) {
  const base = join(REPO_ROOT, "node_modules", ".bin", name);
  if (existsSync(base)) return base;
  if (platform() === "win32") {
    const cmd = `${base}.cmd`;
    if (existsSync(cmd)) return cmd;
  }
  fail(
    `@ctxr/fsm CLI not found: ${base}${platform() === "win32" ? "(.cmd)" : ""}. Run \`npm install\` to fetch the dep.`,
  );
}

// Each spawnSync needs a tiny scratch JSON file passed via --args-file or
// --outputs-file. Write into a single per-process temp dir and clean it up at
// exit so we don't leak `run-review-*` directories under the OS temp dir on
// long sessions. Lazy-create on first use so importing this module from
// tests / other tooling (which never invokes the runner) doesn't allocate
// a temp directory.
let _scratchDir = null;
function getScratchDir() {
  if (_scratchDir) return _scratchDir;
  _scratchDir = mkdtempSync(join(tmpdir(), "run-review-"));
  process.on("exit", () => {
    try {
      rmSync(_scratchDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup; never block process exit on a temp-dir hiccup.
    }
  });
  return _scratchDir;
}

// Session-id threading: @ctxr/fsm's defaultSessionId() returns
// `session-${pid}-${Date.now()}` per process. fsm-next acquires the run
// lock with that auto-id; fsm-commit rejects any subprocess presenting a
// different one. Without explicit threading, every spawnSync in this
// runner hands fsm-* a fresh session-id and the lock check always fails
// after the first acquisition. Fix: generate a session-id once per
// runner process (--start) or read the existing one from <run_dir>/
// lock.json (--continue), and pass it as --session-id to every fsm-next
// and fsm-commit subprocess.
export function buildRunnerSessionId() {
  return `runner-${process.pid}-${Date.now()}`;
}

export function readSessionIdFromLock(runId) {
  const storageRoot = resolveStorageRoot();
  const lock = readLock(runId, { storageRoot });
  if (!lock || typeof lock.session_id !== "string" || !lock.session_id) {
    return null;
  }
  return lock.session_id;
}

function runFsmNextStart({ baseSha, headSha, argsBag, sessionId }) {
  const argsFile = join(getScratchDir(), "args.json");
  writeFileSync(argsFile, JSON.stringify(argsBag ?? {}));
  const args = [
    "--new-run",
    "--repo",
    "skill-code-review",
    "--base-sha",
    baseSha,
    "--head-sha",
    headSha,
    "--args-file",
    argsFile,
  ];
  if (sessionId) {
    args.push("--session-id", sessionId);
  }
  const result = spawnSync(fsmBin("fsm-next"), args, {
    encoding: "utf8",
    cwd: REPO_ROOT,
  });
  return parseFsmCliResult(result, "fsm-next --new-run");
}

function runFsmCommit({ runId, outputs, sessionId }) {
  // Defence-in-depth: the runId here came from main()'s --start (assigned
  // by fsm-next) or --continue (validated by isValidRunId before reaching
  // this point). Sanitise once more so a bad path can never form regardless
  // of caller. Lowercase + restrict to the run-id alphabet (matches
  // isValidRunId's `[a-z0-9-]+` exactly) so the temp filename is consistent
  // with the documented id format.
  const safeRunId = String(runId).toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 64);
  const outputsFile = join(getScratchDir(), `outputs-${safeRunId}-${Date.now()}.json`);
  writeFileSync(outputsFile, JSON.stringify(outputs ?? {}));
  try {
    const args = ["--run-id", runId, "--outputs-file", outputsFile];
    if (sessionId) {
      args.push("--session-id", sessionId);
    }
    const result = spawnSync(fsmBin("fsm-commit"), args, {
      encoding: "utf8",
      cwd: REPO_ROOT,
    });
    return parseFsmCliResult(result, "fsm-commit");
  } finally {
    // Delete the per-commit outputs file as soon as fsm-commit returns —
    // long sessions otherwise accumulate many small files in SCRATCH_DIR.
    // Process-exit cleanup remains as a safety net for the dir itself.
    try {
      rmSync(outputsFile, { force: true });
    } catch {
      // best-effort
    }
  }
}

export function parseFsmCliResult(result, label) {
  if (result.error) {
    return {
      ok: false,
      error: `${label} spawn failed: ${result.error.code || ""} ${result.error.message}`.trim(),
      raw: result.stdout,
    };
  }
  if (result.signal) {
    return {
      ok: false,
      error: `${label} terminated by signal ${result.signal}`,
      raw: result.stdout,
    };
  }
  if (result.status !== 0) {
    return {
      ok: false,
      error:
        result.stderr?.trim() ||
        `${label} exited with status ${result.status === null ? "null" : result.status}`,
      raw: result.stdout,
    };
  }
  try {
    const payload = JSON.parse(result.stdout);
    // Enrich every fsm-* payload that carries a worker brief:
    //   1. prompt_body — the worker's prompt template bytes, baked in so
    //      the orchestrator never needs to Read the template file.
    //   2. picked_leaves[].body — for dispatch_specialists only, every
    //      picked leaf's full markdown body, baked in so the orchestrator
    //      dispatches K specialists in parallel without K separate Reads.
    // Both helpers are idempotent and pass through untouched payloads
    // they don't apply to (terminal status, non-worker state, etc.).
    // Three enrichers, applied innermost-first:
    //   1. enrichBriefWithPromptBody       — bake the worker's prompt template bytes
    //   2. enrichBriefWithSpecialistBodies — for dispatch_specialists, bake each leaf body
    //   3. enrichBriefWithOutputsPath      — inject the canonical outputs_path
    // Briefs without a worker (terminal payloads, etc.) pass through untouched.
    const enriched = enrichBriefWithOutputsPath(
      enrichBriefWithSpecialistBodies(
        enrichBriefWithPromptBody(payload),
      ),
    );
    return { ok: true, payload: enriched };
  } catch (err) {
    return {
      ok: false,
      error: `${label} returned non-JSON stdout: ${err.message}`,
      raw: result.stdout,
    };
  }
}

// FSM state ids are snake_case (`risk_tier_triage`, `stage_a_empty`, ...)
// but the inline-state module filenames are kebab-case
// (`risk-tier-triage.mjs`, `stage-a-empty.mjs`, ...) — the convention used
// across the rest of the repo. Translate at dispatch time so both sides keep
// their idiomatic spelling.
export function stateIdToModuleName(stateId) {
  return stateId.replace(/_/g, "-");
}

// Load and invoke a deterministic inline-state handler from
// scripts/inline-states/<kebab-state-id>.mjs. Each handler exports a default
// async function `({ brief, env }) => outputs`. The env is the cumulative
// output of all prior states in the run (read via @ctxr/fsm's runEnv).
async function dispatchInlineState(brief, runId) {
  const modulePath = join(INLINE_STATES_DIR, `${stateIdToModuleName(brief.state)}.mjs`);
  if (!existsSync(modulePath)) {
    return {
      ok: false,
      error:
        `Inline-state handler not found: ${modulePath}. ` +
        `This state is declared inline in fsm/code-reviewer.fsm.yaml but the ` +
        `Node module that computes its outputs has not been authored yet ` +
        `(Sprint B B2). Either author the handler or convert the state to a ` +
        `worker state in the FSM YAML.`,
    };
  }
  // ESM dynamic import on Windows refuses raw absolute paths; convert to a
  // file:// URL so the same call works on POSIX and Windows. The import
  // itself can throw (module-not-found at the URL, syntax error in the
  // handler, etc.); catch and surface as a structured fault rather than
  // letting the exception escape to main().catch and emit a generic
  // "unhandled error".
  let mod;
  try {
    mod = await import(pathToFileURL(modulePath).href);
  } catch (err) {
    return { ok: false, error: `Inline handler import failed (${modulePath}): ${err.message}` };
  }
  if (typeof mod.default !== "function") {
    return {
      ok: false,
      error: `${modulePath} must export a default async function ({brief, env}) => outputs.`,
    };
  }
  try {
    const storageRoot = resolveStorageRoot();
    const env = runEnv(runId, { storageRoot });
    const outputs = await mod.default({ brief, env });
    return { ok: true, outputs };
  } catch (err) {
    return { ok: false, error: `Inline handler threw: ${err.message}` };
  }
}

// handleWorkerStateBrief — the worker-state branch of loop(), pulled out so
// unit tests can drive replay-hit / replay-miss / replay-corrupted /
// hash-fail / record-stash-fail without spinning up the FSM CLIs.
//
// Returns one of:
//   { kind: "advance", payload: <new fsm-commit payload> }   — replay-hit auto-commit
//   { kind: "pause",   payload: { status, run_id, brief } }   — emit awaiting_worker
//   { kind: "fault",   payload: { status: "fault", run_id, fault } } — surface up
//
// `_deps` is the dependency injection seam (resolveStorageRoot, runEnv,
// hashKeyForBrief, replayLookup, runFsmCommit, stashPendingBrief,
// fixturesRoot, runDirPath). All have production defaults so the runner
// can call this with no extra args.
export function handleWorkerStateBrief(brief, runId, opts = {}, _deps = {}) {
  const replayMode = opts.replayMode ?? "live";
  const resolveStorageRootFn = _deps.resolveStorageRoot ?? resolveStorageRoot;
  const runEnvFn = _deps.runEnv ?? runEnv;
  const hashKeyForBriefFn = _deps.hashKeyForBrief ?? hashKeyForBrief;
  const replayLookupFn = _deps.replayLookup ?? replayLookup;
  const runFsmCommitFn = _deps.runFsmCommit ?? runFsmCommit;
  const stashPendingBriefFn = _deps.stashPendingBrief ?? stashPendingBrief;
  const runDirPathFn = _deps.runDirPath ?? runDirPath;
  const fixturesRoot = _deps.fixturesRoot ?? FIXTURES_ROOT;

  // Live mode (the default) skips the env+hash+stash work entirely. The
  // hash key and stash only matter for replay/record; running them on
  // every live worker pause introduces new failure modes (unreadable
  // prompt template, missing run-storage) for callers who didn't
  // opt into the harness. The trade-off: a user who goes
  // `--start --replay-mode=live` and then `--continue
  // --replay-mode=record` will not have a stash to record against;
  // record mode is per-run, not retroactive.
  if (replayMode === "live") {
    // Persist the brief to <run_dir>/workers/<state>-brief.json AND
    // pre-stage the agent dispatch prompt(s) under <run_dir>/workers/
    // before returning. The on-disk artefacts are the canonical record;
    // stdout is a redundant convenience. Lost stdout (orchestrator
    // pipes through a summarizer, etc.) becomes recoverable via --resume,
    // and the orchestrator dispatches workers without ever composing
    // prompts itself or touching /tmp.
    writeBriefToDisk(brief);
    if (brief.state === "dispatch_specialists") {
      writeSpecialistPromptsToDisk(brief);
    } else {
      writeDispatchPromptToDisk(brief);
    }
    return {
      kind: "pause",
      payload: { status: "awaiting_worker", run_id: runId, brief },
    };
  }

  // resolveStorageRoot reads .fsmrc.json + walks @ctxr/fsm config; runEnv
  // reads the run-storage tree on disk. Either can throw on a missing /
  // corrupt config or storage. Convert to an in-flow fault so the run
  // stops cleanly instead of crashing out as a top-level {status:"error"}.
  let storageRoot, env;
  try {
    storageRoot = resolveStorageRootFn();
    env = runEnvFn(runId, { storageRoot });
  } catch (err) {
    return {
      kind: "fault",
      payload: {
        status: "fault",
        run_id: runId,
        fault: {
          state: brief.state,
          reason: `failed to load run env: ${err?.message ?? String(err)}`,
        },
      },
    };
  }

  // hashKeyForBrief can throw when the prompt template is unreadable.
  let hashKey;
  try {
    hashKey = hashKeyForBriefFn(brief, env);
  } catch (err) {
    return {
      kind: "fault",
      payload: {
        status: "fault",
        run_id: runId,
        fault: {
          state: brief.state,
          reason: `hash key compute failed: ${err?.message ?? String(err)}`,
        },
      },
    };
  }

  // B7 replay mode: try to satisfy the worker call from a recorded fixture.
  if (replayMode === "replay") {
    let cached;
    try {
      cached = replayLookupFn(fixturesRoot, brief.state, hashKey);
    } catch (err) {
      return {
        kind: "fault",
        payload: {
          status: "fault",
          run_id: runId,
          fault: {
            state: brief.state,
            reason: `replay-mode fixture corrupted: ${err?.message ?? String(err)}`,
            hash_key: hashKey,
          },
        },
      };
    }
    if (!cached.hit) {
      return {
        kind: "fault",
        payload: {
          status: "fault",
          run_id: runId,
          fault: {
            state: brief.state,
            reason: `replay-mode miss: no fixture for state="${brief.state}" hashKey=${hashKey.slice(0, 12)}...`,
            hash_key: hashKey,
          },
        },
      };
    }
    const commit = runFsmCommitFn({ runId, outputs: cached.outputs });
    if (!commit.ok) {
      return {
        kind: "fault",
        payload: {
          status: "fault",
          run_id: runId,
          fault: { state: brief.state, reason: commit.error, details: commit.raw },
        },
      };
    }
    return { kind: "advance", payload: commit.payload };
  }

  // B7 record mode: stash the brief for --continue. Stash failures
  // surface as faults — without the stash, --continue can't persist
  // the recorded fixture and the user would think record-mode
  // succeeded when it silently didn't. (Live mode returned early.)
  // Wrap both runDirPath AND stashPendingBrief in the same try/catch:
  // runDirPath can throw on a missing/corrupt run-storage tree, and
  // an unhandled throw there would crash the runner instead of
  // surfacing as the same structured fault that a stash failure does.
  try {
    const dir = runDirPathFn(runId, { storageRoot });
    stashPendingBriefFn(dir, { state: brief.state, hashKey });
  } catch (err) {
    return {
      kind: "fault",
      payload: {
        status: "fault",
        run_id: runId,
        fault: {
          state: brief.state,
          reason: `replay-mode=record: failed to stash pending brief: ${err?.message ?? String(err)}`,
        },
      },
    };
  }

  // Persist the brief to <run_dir>/workers/<state>-brief.json AND the
  // dispatch prompt(s) before returning. Same reasoning as the
  // live-mode branch above; disk artefacts are canonical regardless of
  // replay mode.
  writeBriefToDisk(brief);
  if (brief.state === "dispatch_specialists") {
    writeSpecialistPromptsToDisk(brief);
  } else {
    writeDispatchPromptToDisk(brief);
  }
  return {
    kind: "pause",
    payload: { status: "awaiting_worker", run_id: runId, brief },
  };
}

// Drive the loop from a starting brief: walk inline states, pause on workers,
// stop on terminal. Returns the final status payload to emit.
async function loop(brief, runId, { replayMode = "live", sessionId } = {}) {
  let current = brief;
  while (true) {
    if (current.status === "terminal") {
      return {
        status: "terminal",
        run_id: runId,
        verdict: current.verdict,
        run_dir_path: current.run_dir_path,
      };
    }
    // Terminal-state brief detection. The FSM YAML declares `terminal` as a
    // no-op end state (no worker, no transitions). When fsm-commit advances
    // INTO terminal it emits a brief with state="terminal" and no
    // `status: "terminal"` envelope (that envelope is only emitted when
    // fsm-commit is called WITH terminal as the committed state). Without
    // this branch the loop falls into dispatchInlineState, fails to find
    // an `inline-states/terminal.mjs` handler, and surfaces a spurious
    // fault AFTER the canonical report+Manifest were already written.
    // Calling fsm-commit one more time with empty outputs lets fsm-commit
    // mark the run completed and release the lock cleanly, then emit the
    // proper { status: "terminal", verdict, run_dir_path } payload.
    if (current.state === "terminal" && !current.has_worker) {
      const finalCommit = runFsmCommit({ runId, outputs: {}, sessionId });
      if (!finalCommit.ok) {
        return {
          status: "fault",
          run_id: runId,
          fault: {
            state: "terminal",
            reason: `fsm-commit on terminal state failed: ${finalCommit.error}`,
            details: finalCommit.raw,
          },
        };
      }
      current = finalCommit.payload;
      continue;
    }
    if (current.has_worker) {
      const result = handleWorkerStateBrief(current, runId, { replayMode });
      if (result.kind === "advance") {
        current = result.payload;
        continue;
      }
      // "pause" (awaiting_worker) and "fault" both terminate this call.
      return result.payload;
    }
    const dispatch = await dispatchInlineState(current, runId);
    if (!dispatch.ok) {
      return {
        status: "fault",
        run_id: runId,
        fault: { state: current.state, reason: dispatch.error },
      };
    }
    const commit = runFsmCommit({ runId, outputs: dispatch.outputs, sessionId });
    if (!commit.ok) {
      return {
        status: "fault",
        run_id: runId,
        fault: {
          state: current.state,
          reason: `fsm-commit failed: ${commit.error}`,
          details: commit.raw,
        },
      };
    }
    current = commit.payload;
  }
}

async function main() {
  const args = parseArgs(process.argv);

  // --start and --continue are mutually exclusive: passing both is an
  // ambiguous invocation that the caller almost certainly didn't mean.
  // Reject up front rather than silently picking one branch.
  if (args.start && args.continue) {
    fail("--start and --continue are mutually exclusive; pick one");
  }
  if ((args.start && args.resume) || (args.continue && args.resume)) {
    fail("--resume is mutually exclusive with --start and --continue");
  }

  if (args.start) {
    const baseSha = args.base ?? args["base-sha"];
    const headSha = args.head ?? args["head-sha"];
    if (!baseSha || !headSha) {
      fail("--start requires --base <sha> and --head <sha>");
    }
    const refSyntax = "alnum / _ . / - @ ^ ~ { }, no leading dash, ≤255 chars";
    if (!isValidGitRef(baseSha)) {
      fail(`--base must be a valid git ref/SHA/revspec (${refSyntax}); got: ${baseSha}`);
    }
    if (!isValidGitRef(headSha)) {
      fail(`--head must be a valid git ref/SHA/revspec (${refSyntax}); got: ${headSha}`);
    }
    let argsBag = {};
    if (args["args-file"] !== undefined) {
      // parseArgs sets bare `--args-file` (no value) to boolean `true`.
      // Guard against that here so readJsonFile(true, ...) doesn't produce
      // a confusing fs error.
      if (typeof args["args-file"] !== "string" || args["args-file"].length === 0) {
        fail("--args-file requires a path argument");
      }
      argsBag = readJsonFile(args["args-file"], "--args-file");
      // The args bag flows into the FSM run env as `args` and is referenced
      // by report-format.md (scope-* keys, format, full, description).
      // Reject unknown keys before they enter the run env so a typo'd flag
      // surfaces as a startup error instead of silently being ignored
      // mid-pipeline.
      validateArgsBag(argsBag);
    }
    // Generate a session-id once per --start invocation and thread it
    // through every fsm-next / fsm-commit subprocess in this process. The
    // lock that fsm-next writes outlives the runner subprocess by 1 hour;
    // a later --continue subprocess will re-discover the same session-id
    // by reading <run_dir>/lock.json.
    const sessionId = buildRunnerSessionId();
    const start = runFsmNextStart({ baseSha, headSha, argsBag, sessionId });
    if (!start.ok) {
      fail(`fsm-next --new-run failed: ${start.error}`, { raw: start.raw });
    }
    const brief = start.payload;
    // Read replay-mode from the runner-level CLI flag only. Pulling it
    // from argsBag would forward it into env.args (the FSM run env),
    // which makes the worker hash differ between record vs replay.
    const replayMode = resolveReplayMode(
      { "replay-mode": args["replay-mode"] },
      {
        onInvalid: (msg) => fail(msg, { flag: "--replay-mode" }),
      },
    );
    emit(await loop(brief, brief.run_id, { replayMode, sessionId }));
    return;
  }

  if (args.continue) {
    const runId = args["run-id"];
    if (!runId) {
      fail("--continue requires --run-id <id>");
    }
    if (typeof runId !== "string" || runId.length === 0) {
      fail("--run-id requires a value (got bare flag)");
    }
    if (!isValidRunId(runId)) {
      // Reject path-traversal payloads (`../`, `/etc/passwd`, …) before
      // `runId` can land in a filename inside SCRATCH_DIR.
      fail(`--run-id must be lowercase alnum + dashes, 3-64 chars; got: ${runId}`);
    }

    // --outputs-file is now optional. When omitted, default to the
    // canonical path the brief shipped as `outputs_path`:
    //   <run_dir>/workers/<current_state>-output.json
    // The runner reads the manifest's current_state to compose the
    // path. SKILL.md instructs the orchestrator to write to
    // brief.outputs_path and call --continue --run-id <id> without
    // --outputs-file in the common case.
    let outputsFile = args["outputs-file"];
    if (outputsFile === undefined) {
      const storageRoot = resolveStorageRoot();
      const manifest = readManifest(runId, { storageRoot });
      if (!manifest) {
        fail(
          `--continue: no manifest found for run-id "${runId}"; cannot resolve default --outputs-file. Run --start first, or pass --outputs-file <path> explicitly.`,
          { run_id: runId },
        );
      }
      const currentState = manifest.current_state;
      if (!currentState) {
        fail(
          `--continue: manifest has no current_state for run-id "${runId}"; cannot resolve default --outputs-file. Pass --outputs-file <path> explicitly.`,
          { run_id: runId },
        );
      }
      outputsFile = defaultOutputsPath(runId, currentState);
      if (!existsSync(outputsFile)) {
        fail(
          `--continue: default outputs file not found at "${outputsFile}". Either write your worker output to that path (the brief shipped it as outputs_path) or pass --outputs-file <path> explicitly.`,
          { run_id: runId, current_state: currentState, expected_path: outputsFile },
        );
      }
    } else if (typeof outputsFile !== "string" || outputsFile.length === 0) {
      fail("--outputs-file requires a path argument");
    }
    const outputs = readJsonFile(outputsFile, "--outputs-file");

    // B8 referential-integrity: when the worker output looks like trim
    // output (`picked_leaves[]` present), validate cross-references against
    // the run env BEFORE handing it to fsm-commit. JSON-Schema only checks
    // shape; the trim worker can fabricate ids / paths / files that pass
    // the schema but break downstream consumers. Abort here on any
    // violation rather than let a bad trim output corrupt the env.
    const gate = runTrimValidationGate(runId, outputs);
    if (!gate.ok) {
      fail(gate.message, gate.details);
    }

    // --replay-mode SHOULD be passed on EACH --continue invocation. The
    // runner is stateless across CLI calls and the flag defaults to
    // "live" when omitted; if --start was invoked with
    // --replay-mode=record but a subsequent --continue omitted the
    // flag, those outputs would silently NOT be recorded. Callers
    // driving the record/replay flow should set the same mode on every
    // call. (A future enhancement could persist the mode in the run
    // dir's manifest so --continue infers it; for now per-call is the
    // documented contract.)
    const replayMode = resolveReplayMode(
      { "replay-mode": args["replay-mode"] },
      {
        onInvalid: (msg) => fail(msg, { flag: "--replay-mode" }),
      },
    );

    // The lock acquired by --start (with the original runner's session-id)
    // outlives that subprocess. This --continue process is a fresh node
    // invocation with no in-memory state from --start, so we recover the
    // session-id from the on-disk lock file. fsm-commit will accept it
    // because lock.session_id will equal what we pass via --session-id.
    const sessionId = readSessionIdFromLock(runId);
    if (!sessionId) {
      fail(
        `--continue: no session-id found in lock for run-id "${runId}". Either the run never reached --start, or the lock has been deleted/expired. Restart with --start.`,
        { run_id: runId },
      );
    }

    const commit = runFsmCommit({ runId, outputs, sessionId });
    if (!commit.ok) {
      fail(`fsm-commit failed: ${commit.error}`, { raw: commit.raw });
    }

    // B7 record mode: persist the worker outputs we just received under
    // the hash key the runner stashed when it emitted awaiting_worker.
    // Done AFTER a successful fsm-commit so a commit failure (schema
    // validation, post-validation, etc.) doesn't leave behind a stale
    // fixture or wipe the pending-brief stash that a retry would need.
    // Recording errors surface as a fault — silent failure here would
    // make later replay-mode runs fail without a clear root cause.
    if (replayMode === "record") {
      // resolveStorageRoot / runDirPath / readPendingBrief can throw on
      // a missing or corrupt .fsmrc.json or a missing run-storage tree.
      // Wrap in try/catch so the record-mode finalisation surfaces a
      // structured error instead of falling through to main().catch.
      let storageRoot, dir, stash;
      try {
        storageRoot = resolveStorageRoot();
        dir = runDirPath(runId, { storageRoot });
        stash = readPendingBrief(dir);
      } catch (err) {
        fail(
          `replay-mode=record: failed to read run state for fixture persistence: ${err?.message ?? String(err)}`,
          { run_id: runId },
        );
      }
      // No silent skip: a missing/malformed stash means the user thinks
      // they are recording fixtures but nothing would land on disk.
      // Surface via fail() so the run stops loud (emits {status:"error"}
      // and exits non-zero) — silent record-mode would be worse than no
      // record mode at all.
      if (!(stash && typeof stash.state === "string" && typeof stash.hashKey === "string")) {
        fail(
          "replay-mode=record: missing or invalid pending-brief stash; cannot persist fixture",
          { run_id: runId, dir },
        );
      }
      try {
        // Don't write a wall-clock timestamp into the fixture meta — the
        // whole point of canonicalized record mode is byte-stable
        // refresh, and a per-record `recorded_at` would force a diff
        // every time a maintainer re-records the same logical brief.
        // The run id is similarly per-invocation noise. recordOutputs
        // skips the meta wrapper entirely when meta is null, so the
        // fixture body collapses to `{ outputs: <outputs> }`.
        recordOutputs(FIXTURES_ROOT, {
          state: stash.state,
          hashKey: stash.hashKey,
          outputs,
        });
        clearPendingBrief(dir);
      } catch (err) {
        fail(
          `replay-mode=record: failed to persist fixture for state=${stash.state}: ${err?.message ?? String(err)}`,
          { state: stash.state, hash_key: stash.hashKey },
        );
      }
    } else {
      // Live / replay --continue: even when we're not recording the
      // current step, clear any previous-step stash if it's there.
      // Otherwise a stash left over from a record-mode --start could
      // be picked up by a later record-mode --continue against the
      // wrong outputs (the stash is keyed only on `{state, hashKey}`,
      // not on the specific output payload). Best-effort: a missing
      // run dir or unreadable stash is the harmless case.
      try {
        const storageRoot = resolveStorageRoot();
        const dir = runDirPath(runId, { storageRoot });
        clearPendingBrief(dir);
      } catch {
        // ignore — clearing is best-effort housekeeping, not load-bearing
      }
    }

    emit(await loop(commit.payload, runId, { replayMode, sessionId }));
    return;
  }

  if (args.resume) {
    // --resume is a read-only recovery path. The orchestrator (the LLM)
    // pipes --continue stdout through summarizers / parsers and loses
    // the next awaiting_worker brief; --resume re-emits it from the
    // canonical on-disk artifact at <run_dir>/workers/<state>-brief.json.
    //
    // No subprocess. No lock dance. The brief on disk was written by
    // the runner during the previous pause (see writeBriefToDisk in
    // handleWorkerStateBrief). All this does is read the manifest's
    // current_state and read the matching brief file.
    const runId = args["run-id"];
    if (!runId) {
      fail("--resume requires --run-id <id>");
    }
    if (typeof runId !== "string" || runId.length === 0) {
      fail("--run-id requires a value (got bare flag)");
    }
    if (!isValidRunId(runId)) {
      fail(`--run-id must be lowercase alnum + dashes, 3-64 chars; got: ${runId}`);
    }
    const storageRoot = resolveStorageRoot();
    const manifest = readManifest(runId, { storageRoot });
    if (!manifest) {
      fail(
        `--resume: no manifest found for run-id "${runId}". Either the run never started or the run-dir was removed.`,
        { run_id: runId },
      );
    }
    // Terminal / faulted runs have no brief to resume — surface the
    // manifest's verdict / fault state directly so the orchestrator
    // sees the same shape it would have seen at the original
    // terminal pause.
    if (manifest.status === "completed") {
      emit({
        status: "terminal",
        run_id: runId,
        verdict: manifest.verdict ?? null,
        run_dir_path: runDirPath(runId, { storageRoot }),
      });
      return;
    }
    if (manifest.status === "faulted") {
      emit({
        status: "fault",
        run_id: runId,
        fault: {
          state: manifest.current_state ?? null,
          reason: manifest.fault_reason ?? "run faulted; see manifest",
        },
      });
      return;
    }
    const currentState = manifest.current_state;
    if (!currentState) {
      fail(
        `--resume: manifest has no current_state for run-id "${runId}".`,
        { run_id: runId, status: manifest.status },
      );
    }
    const briefPath = defaultBriefPath(runId, currentState);
    if (!briefPath || !existsSync(briefPath)) {
      fail(
        `--resume: no brief file at "${briefPath}". Either this run pre-dates run-dir-as-source-of-truth (briefs were not persisted) or the file was removed. Try re-running --start, or use @ctxr/fsm's fsm-next --resume directly.`,
        { run_id: runId, current_state: currentState, expected_path: briefPath },
      );
    }
    let brief;
    try {
      brief = JSON.parse(readFileSync(briefPath, "utf8"));
    } catch (err) {
      fail(
        `--resume: brief file at "${briefPath}" is unreadable or malformed: ${err?.message ?? String(err)}`,
        { run_id: runId, current_state: currentState, brief_path: briefPath },
      );
    }
    emit({ status: "awaiting_worker", run_id: runId, brief });
    return;
  }

  // PR for #79: three thin "print X" CLIs that let the orchestrator drive
  // a shell loop using only run-dir paths and runner-emitted plaintext —
  // no /tmp, no python3 -c, no jq extraction.
  if (args["print-run-dir"]) {
    const runId = args["run-id"];
    if (!runId || typeof runId !== "string" || !isValidRunId(runId)) {
      fail("--print-run-dir requires --run-id <id> (lowercase alnum + dashes, 3-64 chars)");
    }
    const storageRoot = resolveStorageRoot();
    process.stdout.write(`${runDirPath(runId, { storageRoot })}\n`);
    return;
  }

  if (args["print-current-state"]) {
    const runId = args["run-id"];
    if (!runId || typeof runId !== "string" || !isValidRunId(runId)) {
      fail("--print-current-state requires --run-id <id> (lowercase alnum + dashes, 3-64 chars)");
    }
    const storageRoot = resolveStorageRoot();
    const manifest = readManifest(runId, { storageRoot });
    if (!manifest) {
      fail(
        `--print-current-state: no manifest found for run-id "${runId}".`,
        { run_id: runId },
      );
    }
    // Surface terminal/faulted as sentinels so a shell loop can branch
    // on them without parsing the manifest itself.
    if (manifest.status === "completed") {
      process.stdout.write("terminal\n");
      return;
    }
    if (manifest.status === "faulted") {
      process.stdout.write("faulted\n");
      return;
    }
    const currentState = manifest.current_state;
    if (!currentState) {
      fail(
        `--print-current-state: manifest has no current_state for run-id "${runId}".`,
        { run_id: runId, status: manifest.status },
      );
    }
    // SKILL.md shows the orchestrator using $STATE to interpolate paths
    // like $RUN_DIR/workers/$STATE-brief.json. A tampered manifest with
    // current_state containing path separators or `..` would let the
    // orchestrator's loop walk outside <run_dir>. Reject anything that
    // doesn't match the documented snake_case ascii state-id shape so
    // the printed value is always safe to interpolate.
    if (!isSafeStateSegment(currentState)) {
      fail(
        `--print-current-state: manifest has invalid current_state for run-id "${runId}" (must match ^[a-z][a-z0-9_]*$).`,
        { run_id: runId, status: manifest.status, current_state: currentState },
      );
    }
    process.stdout.write(`${currentState}\n`);
    return;
  }

  if (args["print-dispatch-prompt"]) {
    const runId = args["run-id"];
    if (!runId || typeof runId !== "string" || !isValidRunId(runId)) {
      fail("--print-dispatch-prompt requires --run-id <id>");
    }
    const leafId = args["leaf-id"];
    const storageRoot = resolveStorageRoot();
    const manifest = readManifest(runId, { storageRoot });
    if (!manifest) {
      fail(
        `--print-dispatch-prompt: no manifest found for run-id "${runId}".`,
        { run_id: runId },
      );
    }
    // Mirror --print-current-state: a finished run has no pause prompt.
    // Without this branch the code falls through to a generic
    // missing-file error that misleadingly claims the run pre-dates
    // dispatch-prompt staging.
    if (manifest.status === "completed") {
      fail(
        `--print-dispatch-prompt: run "${runId}" is terminal (verdict ${manifest.verdict ?? "unknown"}); there is no pause prompt to print.`,
        { run_id: runId, status: "completed", verdict: manifest.verdict ?? null },
      );
    }
    if (manifest.status === "faulted") {
      fail(
        `--print-dispatch-prompt: run "${runId}" is faulted (state ${manifest.current_state ?? "unknown"}); there is no pause prompt to print.`,
        { run_id: runId, status: "faulted", current_state: manifest.current_state ?? null },
      );
    }
    const currentState = manifest.current_state;
    if (!currentState) {
      fail(
        `--print-dispatch-prompt: manifest has no current_state (run is ${manifest.status ?? "unknown"}).`,
        { run_id: runId, status: manifest.status },
      );
    }
    // Validate currentState BEFORE composing any path. Without this,
    // a tampered manifest with current_state="../etc/passwd" would
    // make defaultDispatchPromptPath return null and the downstream
    // null check would misleadingly blame the leaf-id.
    if (!isSafeStateSegment(currentState)) {
      fail(
        `--print-dispatch-prompt: manifest has invalid current_state for run-id "${runId}" (must match ^[a-z][a-z0-9_]*$).`,
        { run_id: runId, current_state: currentState },
      );
    }
    if (currentState === "dispatch_specialists" && (!leafId || typeof leafId !== "string")) {
      fail(
        `--print-dispatch-prompt for state "dispatch_specialists" requires --leaf-id <id>; one prompt per picked specialist sits at <run_dir>/workers/dispatch_specialists-prompt-<leaf-id>.md.`,
        { run_id: runId, current_state: currentState },
      );
    }
    const promptPath = defaultDispatchPromptPath(
      runId,
      currentState,
      currentState === "dispatch_specialists" ? leafId : undefined,
    );
    // currentState is now guaranteed safe (isSafeStateSegment passed
    // above). The only way promptPath can be null at this point is the
    // dispatch_specialists branch rejecting a malformed leaf-id.
    //   1. promptPath === null → invalid --leaf-id (must match
    //      `^[a-z][a-z0-9-]*$`).
    //   2. promptPath set but file missing → run pre-dates dispatch-prompt
    //      staging, or the file was removed.
    if (promptPath === null) {
      fail(
        `--print-dispatch-prompt: invalid --leaf-id "${leafId}" for state "dispatch_specialists" (must match ^[a-z][a-z0-9-]*$).`,
        { run_id: runId, current_state: currentState, leaf_id: leafId },
      );
    }
    if (!existsSync(promptPath)) {
      fail(
        `--print-dispatch-prompt: no prompt file at "${promptPath}". Either this run pre-dates dispatch-prompt staging or the file was removed.`,
        { run_id: runId, current_state: currentState, leaf_id: leafId, expected_path: promptPath },
      );
    }
    let body;
    try {
      body = readFileSync(promptPath, "utf8");
    } catch (err) {
      fail(
        `--print-dispatch-prompt: prompt file at "${promptPath}" is unreadable: ${err?.message ?? String(err)}`,
        { run_id: runId, current_state: currentState, prompt_path: promptPath },
      );
    }
    process.stdout.write(body);
    return;
  }

  fail(
    "Usage:\n" +
      "  run-review.mjs --start --base <sha> --head <sha> [--args-file <path>] [--replay-mode <live|record|replay>]\n" +
      "  run-review.mjs --continue --run-id <id> [--outputs-file <path>] [--replay-mode <live|record|replay>]\n" +
      "  run-review.mjs --resume --run-id <id>\n" +
      "  run-review.mjs --print-run-dir --run-id <id>\n" +
      "  run-review.mjs --print-current-state --run-id <id>\n" +
      "  run-review.mjs --print-dispatch-prompt --run-id <id> [--leaf-id <id>]",
  );
}

// Gate the auto-run on "this is the entrypoint" so unit tests can import
// helpers from this module without firing the FSM loop. `process.argv[1]`
// is sometimes relative (e.g. `node scripts/run-review.mjs`); resolve it
// to an absolute path before pathToFileURL — pathToFileURL throws on
// relative inputs.
if (process.argv[1]) {
  const entryUrl = pathToFileURL(resolve(process.argv[1])).href;
  if (import.meta.url === entryUrl) {
    main().catch((err) => fail(`unhandled error: ${err.stack || err.message}`));
  }
}
