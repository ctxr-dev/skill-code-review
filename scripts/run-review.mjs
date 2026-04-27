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
import { readFileSync, writeFileSync, mkdtempSync, existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir, platform } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

import { loadConfig, resolveSettings, runEnv, runDirPath } from "@ctxr/fsm";

import {
  resolveReplayMode,
  computeHashKey,
  replayLookup,
  recordOutputs,
  stashPendingBrief,
  readPendingBrief,
  clearPendingBrief,
  defaultFixturesRoot,
} from "./lib/worker-replay.mjs";

const FIXTURES_ROOT = defaultFixturesRoot(import.meta.url);

// Project the FSM brief's declared inputs out of the run env so the hash
// key only depends on what the worker actually sees, not the full env.
function projectBriefInputs(brief, env) {
  const names = Array.isArray(brief?.inputs) ? brief.inputs : [];
  const out = {};
  for (const name of names) out[name] = env?.[name];
  return out;
}

function hashKeyForBrief(brief, env) {
  return computeHashKey({
    state: brief?.state,
    promptTemplate: brief?.prompt_template ?? brief?.worker?.prompt_template ?? "",
    inputs: projectBriefInputs(brief, env),
  });
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const INLINE_STATES_DIR = resolve(__dirname, "inline-states");

function resolveStorageRoot() {
  const config = loadConfig({ cwd: REPO_ROOT });
  const settings = resolveSettings(config, { fsmName: "code-reviewer" });
  return resolve(REPO_ROOT, settings.storage_root);
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
  "replay-mode",
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

function runFsmNextStart({ baseSha, headSha, argsBag }) {
  const argsFile = join(getScratchDir(), "args.json");
  writeFileSync(argsFile, JSON.stringify(argsBag ?? {}));
  const result = spawnSync(
    fsmBin("fsm-next"),
    [
      "--new-run",
      "--repo",
      "skill-code-review",
      "--base-sha",
      baseSha,
      "--head-sha",
      headSha,
      "--args-file",
      argsFile,
    ],
    { encoding: "utf8", cwd: REPO_ROOT },
  );
  return parseFsmCliResult(result, "fsm-next --new-run");
}

function runFsmCommit({ runId, outputs }) {
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
    const result = spawnSync(
      fsmBin("fsm-commit"),
      ["--run-id", runId, "--outputs-file", outputsFile],
      { encoding: "utf8", cwd: REPO_ROOT },
    );
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
    return { ok: true, payload: JSON.parse(result.stdout) };
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

// Drive the loop from a starting brief: walk inline states, pause on workers,
// stop on terminal. Returns the final status payload to emit.
async function loop(brief, runId, { replayMode = "live" } = {}) {
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
    if (current.has_worker) {
      const storageRoot = resolveStorageRoot();
      const env = runEnv(runId, { storageRoot });
      const hashKey = hashKeyForBrief(current, env);

      // B7 replay mode: try to satisfy the worker call from a recorded
      // fixture. On hit, auto-commit the recorded outputs and continue
      // the loop without ever emitting awaiting_worker. On miss, return
      // a fault — silent fall-through to live dispatch would defeat the
      // determinism the harness exists to provide.
      if (replayMode === "replay") {
        const cached = replayLookup(FIXTURES_ROOT, current.state, hashKey);
        if (cached === null) {
          return {
            status: "fault",
            run_id: runId,
            fault: {
              state: current.state,
              reason: `replay-mode miss: no fixture for state="${current.state}" hashKey=${hashKey.slice(0, 12)}...`,
              hash_key: hashKey,
            },
          };
        }
        const commit = runFsmCommit({ runId, outputs: cached });
        if (!commit.ok) {
          return {
            status: "fault",
            run_id: runId,
            fault: { state: current.state, reason: commit.error, details: commit.raw },
          };
        }
        current = commit.payload;
        continue;
      }

      // B7 record mode: stash the brief so --continue knows where to file
      // the captured outputs. Live mode also stashes (cheap, harmless) so
      // a subsequent --replay-mode=record on --continue still works
      // without requiring the original --start to have set the flag.
      const dir = runDirPath(runId, { storageRoot });
      try {
        stashPendingBrief(dir, { state: current.state, hashKey });
      } catch {
        // Stash is best-effort bookkeeping; never fail the run on it.
      }

      return { status: "awaiting_worker", run_id: runId, brief: current };
    }
    const dispatch = await dispatchInlineState(current, runId);
    if (!dispatch.ok) {
      return {
        status: "fault",
        run_id: runId,
        fault: { state: current.state, reason: dispatch.error },
      };
    }
    const commit = runFsmCommit({ runId, outputs: dispatch.outputs });
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
    const start = runFsmNextStart({ baseSha, headSha, argsBag });
    if (!start.ok) {
      fail(`fsm-next --new-run failed: ${start.error}`, { raw: start.raw });
    }
    const brief = start.payload;
    const replayMode = resolveReplayMode({ "replay-mode": args["replay-mode"] ?? argsBag["replay-mode"] });
    emit(await loop(brief, brief.run_id, { replayMode }));
    return;
  }

  if (args.continue) {
    const runId = args["run-id"];
    const outputsFile = args["outputs-file"];
    if (!runId || !outputsFile) {
      fail("--continue requires --run-id <id> and --outputs-file <path>");
    }
    // parseArgs sets bare flags to boolean `true`; require the value to
    // actually be a non-empty string before forwarding it as a path / id.
    if (typeof runId !== "string" || runId.length === 0) {
      fail("--run-id requires a value (got bare flag)");
    }
    if (typeof outputsFile !== "string" || outputsFile.length === 0) {
      fail("--outputs-file requires a path argument");
    }
    if (!isValidRunId(runId)) {
      // Reject path-traversal payloads (`../`, `/etc/passwd`, …) before
      // `runId` can land in a filename inside SCRATCH_DIR.
      fail(`--run-id must be lowercase alnum + dashes, 3-64 chars; got: ${runId}`);
    }
    const outputs = readJsonFile(outputsFile, "--outputs-file");
    const replayMode = resolveReplayMode({ "replay-mode": args["replay-mode"] });

    // B7 record mode: persist the worker outputs we just received under
    // the hash key the runner stashed when it emitted awaiting_worker.
    // Done BEFORE fsm-commit so a commit failure doesn't leave a
    // half-recorded fixture without its corresponding env update.
    if (replayMode === "record") {
      try {
        const storageRoot = resolveStorageRoot();
        const dir = runDirPath(runId, { storageRoot });
        const stash = readPendingBrief(dir);
        if (stash && typeof stash.state === "string" && typeof stash.hashKey === "string") {
          recordOutputs(FIXTURES_ROOT, {
            state: stash.state,
            hashKey: stash.hashKey,
            outputs,
            meta: { recorded_at: new Date().toISOString(), run_id: runId },
          });
          clearPendingBrief(dir);
        }
      } catch {
        // Recording is opt-in instrumentation; never fail the run on it.
      }
    }

    const commit = runFsmCommit({ runId, outputs });
    if (!commit.ok) {
      fail(`fsm-commit failed: ${commit.error}`, { raw: commit.raw });
    }
    emit(await loop(commit.payload, runId, { replayMode }));
    return;
  }

  fail(
    "Usage:\n" +
      "  run-review.mjs --start --base <sha> --head <sha> [--args-file <path>]\n" +
      "  run-review.mjs --continue --run-id <id> --outputs-file <path>",
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
