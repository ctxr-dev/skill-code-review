// worker-replay.mjs — record/replay harness for FSM worker outputs (Sprint B B7).
//
// B5's reproducibility test only covers the deterministic inline pipeline.
// Worker outputs are seeded in the test fixture, so worker-call
// reproducibility is NOT measured — and real LLM outputs vary run-to-run.
// This harness fills the gap: every worker invocation can be recorded into
// a versioned fixture, then replayed deterministically.
//
// Three modes (controlled by `--replay-mode` on the runner):
//
//   live    — default. Worker runs normally; no record / no replay.
//   record  — Worker runs normally, but the captured outputs are persisted
//             to `tests/fixtures/worker-responses/<state-id>/<hash>.json`
//             when the runner's --continue handler receives them.
//   replay  — Before pausing on a worker, the runner computes the hash
//             key from the brief and looks up a recorded fixture. On hit
//             the runner auto-commits the recorded outputs and continues
//             the loop without emitting awaiting_worker. On miss it
//             returns a fault so the missing fixture is loud, not silent.
//
// Hash key: sha256 of `<state-id>|<prompt_template>|<canonical-json(inputs)>`.
// The state id pins which worker; the prompt template path pins the
// prompt revision (a prompt change ⇒ a new hash); canonical-json(inputs)
// pins the env payload (a different diff / project profile ⇒ a different
// hash). Same triple ⇒ same fixture, byte-identical replay.

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Compute the fixtures root from THIS module's location (scripts/lib/),
// not from a caller-supplied metaUrl. The previous shape was misuse-prone:
// a caller in scripts/run-review.mjs passing import.meta.url would resolve
// `.., ..` to the parent of the repo. Pin the derivation to this file so
// any caller gets the right path.
const __replay_dirname = dirname(fileURLToPath(import.meta.url));
export const FIXTURES_ROOT = resolve(__replay_dirname, "..", "..", "tests", "fixtures", "worker-responses");

export const VALID_REPLAY_MODES = new Set(["live", "record", "replay"]);

export function resolveReplayMode(argsBag) {
  const raw = argsBag?.["replay-mode"];
  if (typeof raw !== "string") return "live";
  const norm = raw.trim().toLowerCase();
  return VALID_REPLAY_MODES.has(norm) ? norm : "live";
}

// Canonical JSON: stable key ordering at every level so two runs with the
// same logical inputs produce byte-identical strings (and therefore the
// same hash). Keys at every object level are sorted lex; arrays preserve
// order.
function canonicalize(value) {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const keys = Object.keys(value).sort();
  const out = {};
  for (const k of keys) out[k] = canonicalize(value[k]);
  return out;
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

// Hash key for a worker invocation. Inputs:
//   - state:           FSM state id (e.g. "llm_trim").
//   - promptTemplate:  the prompt-template PATH (relative to repo root).
//                      Used both as a stable identity AND to read the
//                      prompt body so the hash buckets on prompt CONTENT,
//                      not just the path. Editing the prompt without
//                      renaming the file ⇒ different hash ⇒ replay miss
//                      ⇒ caller knows the fixture is stale.
//   - inputs:          the env payload sent to the worker. Caller projects
//                      the relevant slice (the FSM brief's `inputs:[...]`
//                      list) so unrelated env fields don't bust the hash.
//   - repoRoot:        optional; only used to read the prompt body. When
//                      omitted, only the path is hashed (back-compat with
//                      callers that don't have repo-root context).
export function computeHashKey({ state, promptTemplate, inputs, repoRoot }) {
  const h = createHash("sha256");
  h.update(String(state ?? ""));
  h.update("\u001f"); // unit-separator — unlikely to appear in any field
  h.update(String(promptTemplate ?? ""));
  h.update("\u001f");
  // Hash the prompt body when we can read it, so a content edit invalidates
  // every recorded fixture for that worker. Missing / unreadable file is
  // captured as the empty-content marker so the hash is still defined.
  let promptBody = "";
  if (typeof repoRoot === "string" && typeof promptTemplate === "string" && promptTemplate.length > 0) {
    const candidate = resolve(repoRoot, promptTemplate);
    try {
      promptBody = readFileSync(candidate, "utf8");
    } catch {
      // Treat unreadable prompts as empty; the hash still differs from
      // any fixture recorded against a real prompt.
    }
  }
  h.update(promptBody);
  h.update("\u001f");
  h.update(canonicalJson(inputs ?? {}));
  return h.digest("hex");
}

// Reject path-traversal in `state` so a tampered `.replay-pending.json`
// (or any other untrusted source for `state`) can't direct
// `recordOutputs` to write outside the fixtures tree via `join`.
function assertSafeStateSegment(state) {
  if (typeof state !== "string" || state.length === 0) {
    throw new Error("fixturePath: state must be a non-empty string");
  }
  if (state.includes("/") || state.includes("\\") || state.includes("..")) {
    throw new Error(`fixturePath: state must not contain path separators or '..' (got: ${state})`);
  }
  if (isAbsolute(state)) {
    throw new Error(`fixturePath: state must not be an absolute path (got: ${state})`);
  }
}

export function fixturePath(fixturesRoot, state, hashKey) {
  assertSafeStateSegment(state);
  if (typeof hashKey !== "string" || !/^[a-f0-9]{64}$/.test(hashKey)) {
    throw new Error(`fixturePath: hashKey must be 64-char hex sha256; got ${hashKey}`);
  }
  return join(fixturesRoot, state, `${hashKey}.json`);
}

// Look up a recorded fixture. Returns the parsed outputs object on hit,
// null on miss. Caller decides whether to fault (replay mode) or fall
// through to live dispatch (live / record).
export function replayLookup(fixturesRoot, state, hashKey) {
  const path = fixturePath(fixturesRoot, state, hashKey);
  if (!existsSync(path)) return null;
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    // Each fixture stores both the original meta (for debugging) and the
    // worker's outputs. The replay path returns just `outputs`; meta is
    // optional and only present when the file was written by recordOutputs.
    // Use Object.hasOwn for property presence (not a truthiness check) so
    // a fixture that legitimately recorded `outputs: null` still returns
    // null instead of falling back to the wrapping `{outputs, meta}`
    // object — the call site can distinguish "no fixture" (return null
    // from existsSync miss) from "fixture exists, output is null".
    if (parsed && typeof parsed === "object" && Object.hasOwn(parsed, "outputs")) {
      return parsed.outputs;
    }
    return parsed;
  } catch {
    return null;
  }
}

// Persist worker outputs to the fixtures tree. Returns the absolute path
// the fixture was written to so the caller can log / surface it.
export function recordOutputs(
  fixturesRoot,
  { state, hashKey, outputs, meta = null },
) {
  const path = fixturePath(fixturesRoot, state, hashKey);
  mkdirSync(dirname(path), { recursive: true });
  const payload = meta === null ? { outputs } : { meta, outputs };
  writeFileSync(path, JSON.stringify(payload, null, 2) + "\n");
  return path;
}

// In record mode the runner needs to remember which worker brief produced
// the outputs that arrive in --continue. Stash a minimal record under the
// run directory; --continue reads it back, computes the fixture path,
// writes the fixture, and removes the stash. The stash file lives next to
// the run's manifest.json so it inherits the same lifecycle.
const STASH_FILENAME = ".replay-pending.json";

export function stashPendingBrief(runDir, { state, hashKey }) {
  const path = join(runDir, STASH_FILENAME);
  writeFileSync(path, JSON.stringify({ state, hashKey }) + "\n");
  return path;
}

export function readPendingBrief(runDir) {
  const path = join(runDir, STASH_FILENAME);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

export function clearPendingBrief(runDir) {
  const path = join(runDir, STASH_FILENAME);
  if (!existsSync(path)) return;
  try {
    writeFileSync(path, "");
  } catch {
    // best-effort — the stash is internal bookkeeping, not user-visible.
  }
}
