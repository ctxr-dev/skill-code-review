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
  for (const e of env.envelopes) {
    assert.equal(e.kind, "subagent.dispatch.v1");
    assert.equal(e.role, "code-review-specialist");
    assert.equal(e.effort, "balanced");
    assert.match(e.request_id, new RegExp(`^${runId}-`));
    assert.equal(typeof e.outputs_path, "string");
    assert.match(e.outputs_path, /dispatch_specialists-output-/);
    assert.equal(e.parent_run_id, runId);
    assert.match(e.prompt, /You are a specialist reviewer/);
    assert.equal(typeof e.response_schema.findings, "string");
  }
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
  // Legacy shape: { batch, shims, remaining_after, pending_now, total_dispatch_units }.
  // No `kind`, no `envelopes` key.
  assert.equal(env.kind, undefined);
  assert.equal(env.envelopes, undefined);
  assert.deepEqual(env.batch, ["v1-alpha", "v1-beta"]);
  assert.equal(typeof env.shims, "object");
  assert.equal(env.pending_now, 2);
  assert.equal(env.total_dispatch_units, 2);
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
