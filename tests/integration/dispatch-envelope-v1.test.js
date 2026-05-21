// Integration test for the additive `--format=dispatch-v1` option on
// `scripts/run-review.mjs --print-batch-envelope`. The legacy form
// (no `--format`) MUST keep its existing wire shape byte-identical so
// existing Claude Code orchestrators continue to work; the new form
// emits a `subagent.batch.v1` envelope per
// https://github.com/ctxr-dev/kit/blob/main/docs/subagent-dispatch-v1.md
// so any Agent Skills harness (Codex CLI, Cursor, etc.) can consume it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveSettings, runDirPath } from "@ctxr/fsm";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function planRun() {
  const baseSha = "7777777777777777777777777777777777777777";
  const headSha = "8888888888888888888888888888888888888888";
  const start = spawnSync(
    process.execPath,
    ["scripts/run-review.mjs", "--start", "--base", baseSha, "--head", headSha],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 30_000 },
  );
  assert.equal(start.status, 0, `--start exited ${start.status}; stderr: ${start.stderr}`);
  const runId = JSON.parse(start.stdout.split("\n").filter(Boolean)[0]).run_id;
  const settings = resolveSettings({ fsmName: "code-reviewer" }, REPO_ROOT);
  const storageRoot = resolve(REPO_ROOT, settings.storageRoot);
  const runDir = runDirPath(runId, { storageRoot });
  const workersDir = join(runDir, "workers");
  const briefShape = {
    run_id: runId,
    state: "dispatch_specialists",
    inputs: {
      picked_leaves: [
        { id: "v1-alpha", path: "x/v1-alpha.md", justification: "j", dimensions: ["correctness"] },
        { id: "v1-beta", path: "x/v1-beta.md", justification: "j", dimensions: ["correctness"] },
      ],
    },
  };
  writeFileSync(join(workersDir, "dispatch_specialists-brief.json"), JSON.stringify(briefShape));
  writeFileSync(join(workersDir, "dispatch_specialists-prompt-v1-alpha.md"), "<staged>\n");
  writeFileSync(join(workersDir, "dispatch_specialists-prompt-v1-beta.md"), "<staged>\n");
  const manifestPath = join(runDir, "manifest.json");
  const realManifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  realManifest.current_state = "dispatch_specialists";
  writeFileSync(manifestPath, JSON.stringify(realManifest));
  return { runId, runDir, workersDir };
}

test("--print-batch-envelope --format=dispatch-v1 emits subagent.batch.v1", () => {
  const { runId } = planRun();
  const r = spawnSync(
    process.execPath,
    [
      "scripts/run-review.mjs",
      "--print-batch-envelope",
      "--format=dispatch-v1",
      "--run-id",
      runId,
    ],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 5_000 },
  );
  assert.equal(r.status, 0, `--print-batch-envelope exited ${r.status}; stderr: ${r.stderr}`);
  const env = JSON.parse(r.stdout);
  assert.equal(env.kind, "subagent.batch.v1");
  assert.equal(Array.isArray(env.envelopes), true);
  assert.equal(env.envelopes.length, 2);
  assert.equal(env.pending_now, 2);
  assert.equal(env.total_dispatch_units, 2);
  assert.equal(env.remaining_after, 0);
  // Structural mirror of the published subagent.dispatch.v1 JSON Schema
  // (sibling repo: ctxr/templates/_common/subagent-dispatch-v1.schema.json).
  // We can't $ref it cross-repo at test time, so assert the full
  // required-field set + types + the `kind` literal + `effort` enum on
  // every emitted envelope. If the schema's required[] changes, this is
  // the canary.
  const EFFORT_ENUM = new Set(["heavy", "balanced", "light"]);
  for (const e of env.envelopes) {
    // required: kind, request_id, role, prompt, inputs, effort
    assert.equal(e.kind, "subagent.dispatch.v1");
    assert.equal(typeof e.request_id, "string");
    assert.ok(e.request_id.length > 0, "request_id must be non-empty");
    assert.equal(typeof e.role, "string");
    assert.ok(e.role.length > 0, "role must be non-empty");
    assert.equal(e.role, "code-review-specialist");
    assert.equal(typeof e.prompt, "string");
    assert.ok(e.prompt.length > 0, "prompt must be non-empty");
    assert.equal(typeof e.inputs, "object");
    assert.ok(e.inputs !== null && !Array.isArray(e.inputs), "inputs must be an object");
    assert.equal(typeof e.effort, "string");
    assert.ok(EFFORT_ENUM.has(e.effort), `effort must be in enum; got ${e.effort}`);
    assert.equal(e.effort, "balanced");
    // optional-but-emitted: outputs_path (the per-leaf path --continue
    // aggregates from), parent_run_id, response_schema.
    assert.match(e.request_id, new RegExp(`^${runId}-`));
    assert.equal(typeof e.outputs_path, "string");
    assert.match(e.outputs_path, /dispatch_specialists-output-/);
    assert.equal(e.parent_run_id, runId);
    assert.match(e.prompt, /You are a specialist reviewer/);
    assert.equal(typeof e.response_schema.findings, "string");
    // inputs carries the staged-prompt pointer the sub-agent reads from.
    assert.equal(typeof e.inputs.prompt_path, "string");
    assert.match(e.inputs.prompt_path, /dispatch_specialists-prompt-/);
  }
  // request_id must be unique across the batch — the host harness keys
  // its returned result on this id, so a collision would silently
  // overwrite one sub-agent's result with another's.
  const requestIds = env.envelopes.map((e) => e.request_id);
  assert.equal(
    new Set(requestIds).size,
    requestIds.length,
    `request_ids must be unique; got ${JSON.stringify(requestIds)}`,
  );
  // outputs_path matches per-leaf collection path the runner aggregates
  // from on --continue. Reading it back produces a path under the same
  // workersDir as the staged prompt.
  const ids = env.envelopes.map((e) => {
    const m = /-(v1-[a-z]+)\.json$/.exec(e.outputs_path);
    return m ? m[1] : null;
  });
  assert.deepEqual(ids.sort(), ["v1-alpha", "v1-beta"]);
});

test("--print-batch-envelope (no --format) keeps legacy shape byte-identical", () => {
  const { runId } = planRun();
  const r = spawnSync(
    process.execPath,
    ["scripts/run-review.mjs", "--print-batch-envelope", "--run-id", runId],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 5_000 },
  );
  assert.equal(r.status, 0, `--print-batch-envelope exited ${r.status}; stderr: ${r.stderr}`);
  const env = JSON.parse(r.stdout);
  // Legacy shape: EXACTLY { batch, remaining_after, pending_now,
  // total_dispatch_units, shims }. No `kind`, no `envelopes` key. The
  // additive --format flag MUST NOT perturb the default wire shape that
  // existing Claude Code orchestrators consume.
  assert.deepEqual(
    Object.keys(env).sort(),
    ["batch", "pending_now", "remaining_after", "shims", "total_dispatch_units"],
  );
  assert.equal(env.kind, undefined);
  assert.equal(env.envelopes, undefined);
  assert.deepEqual(env.batch, ["v1-alpha", "v1-beta"]);
  assert.equal(typeof env.shims, "object");
  // shims is keyed by the same batch ids — one shim prompt per id.
  assert.deepEqual(Object.keys(env.shims).sort(), ["v1-alpha", "v1-beta"]);
  assert.equal(env.pending_now, 2);
  assert.equal(env.total_dispatch_units, 2);
  assert.equal(env.remaining_after, 0);
});

test("dispatch-v1 zero-work envelope (empty picked_leaves)", () => {
  const baseSha = "7777777777777777777777777777777777777777";
  const headSha = "8888888888888888888888888888888888888888";
  const start = spawnSync(
    process.execPath,
    ["scripts/run-review.mjs", "--start", "--base", baseSha, "--head", headSha],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 30_000 },
  );
  assert.equal(start.status, 0);
  const runId = JSON.parse(start.stdout.split("\n").filter(Boolean)[0]).run_id;
  const settings = resolveSettings({ fsmName: "code-reviewer" }, REPO_ROOT);
  const storageRoot = resolve(REPO_ROOT, settings.storageRoot);
  const runDir = runDirPath(runId, { storageRoot });
  const workersDir = join(runDir, "workers");
  writeFileSync(
    join(workersDir, "dispatch_specialists-brief.json"),
    JSON.stringify({ run_id: runId, state: "dispatch_specialists", inputs: { picked_leaves: [] } }),
  );
  const manifestPath = join(runDir, "manifest.json");
  const realManifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  realManifest.current_state = "dispatch_specialists";
  writeFileSync(manifestPath, JSON.stringify(realManifest));

  const r = spawnSync(
    process.execPath,
    [
      "scripts/run-review.mjs",
      "--print-batch-envelope",
      "--format=dispatch-v1",
      "--run-id",
      runId,
    ],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 5_000 },
  );
  assert.equal(r.status, 0);
  const env = JSON.parse(r.stdout);
  assert.equal(env.kind, "subagent.batch.v1");
  assert.deepEqual(env.envelopes, []);
  assert.equal(env.total_dispatch_units, 0);
});

test("--format with an unrecognized value is rejected (no silent legacy fallthrough)", () => {
  const { runId } = planRun();
  const r = spawnSync(
    process.execPath,
    [
      "scripts/run-review.mjs",
      "--print-batch-envelope",
      "--format=dispatch-v2",
      "--run-id",
      runId,
    ],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 5_000 },
  );
  // A typo'd / future-version --format must hard-fail, NOT silently emit
  // the legacy shape — a cross-harness orchestrator asking for an
  // envelope it doesn't get would dispatch nothing.
  assert.notEqual(r.status, 0, `expected non-zero exit; stdout=${r.stdout}`);
  const payload = JSON.parse(r.stdout);
  assert.equal(payload.status, "error");
  assert.match(payload.message, /--format only supports "dispatch-v1"/);
});
