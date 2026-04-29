// Integration test: prove that scripts/run-review.mjs is invocable as a
// standalone entry point and produces the FSM-driven JSON contract that
// SKILL.md instructs the LLM to consume.
//
// This test is deliberately minimal — it does NOT drive the full 14-state
// pipeline (that would require a complete replay fixture covering every
// worker output). What it DOES prove:
//
//   1. The runner can be spawned from a fresh process with --start.
//   2. The first stdout line is a single JSON object with
//      status="awaiting_worker", a run_id, and a brief.role naming the
//      first worker (project-scanner).
//   3. The FSM engine writes a manifest at the resolved run-dir path that
//      assert-fresh-run.mjs can validate.
//
// Together these guarantee SKILL.md's "run this command, loop until
// terminal" instructions are physically implementable by an LLM with no
// further setup. The full-pipeline reproducibility coverage lives in
// tests/integration/reproducibility.test.js (in-process inline-state
// composition).

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveSettings, runDirPath } from "@ctxr/fsm";
import { validateRun } from "../../scripts/assert-fresh-run.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("runner --start: emits awaiting_worker JSON with project-scanner brief and writes manifest", () => {
  // Use sentinel SHA-shaped strings; the runner only validates the shape
  // (alnum / _ . / - @ ^ ~ { }, no leading dash) — it does NOT verify the
  // ref resolves against the working tree until a worker actually runs git.
  const baseSha = "0000000000000000000000000000000000000001";
  const headSha = "0000000000000000000000000000000000000002";

  const result = spawnSync(
    process.execPath,
    [
      "scripts/run-review.mjs",
      "--start",
      "--base",
      baseSha,
      "--head",
      headSha,
    ],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 30_000 },
  );

  // The runner exits 0 after emitting the awaiting_worker brief and
  // returning control to the caller (caller is responsible for dispatching
  // workers and re-invoking with --continue). Stderr may carry @ctxr/fsm
  // diagnostics; ignore for this test.
  assert.equal(
    result.status,
    0,
    `runner exited with status ${result.status}; stderr: ${result.stderr}`,
  );

  // The runner emits one or more JSON objects, one per stdout line. The
  // FIRST line MUST be the awaiting_worker brief for the entry state.
  const lines = result.stdout
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  assert.ok(lines.length > 0, "runner emitted no stdout");
  const firstLine = JSON.parse(lines[0]);

  assert.equal(firstLine.status, "awaiting_worker");
  assert.match(
    firstLine.run_id,
    /^\d{8}-\d{6}-[0-9a-f]{7}$/,
    `run_id "${firstLine.run_id}" doesn't match the documented yyyymmdd-hhmmss-hash7 shape`,
  );
  assert.ok(firstLine.brief, "missing brief object");
  assert.equal(firstLine.brief.state, "scan_project");
  assert.equal(firstLine.brief.worker?.role, "project-scanner");
  assert.equal(firstLine.brief.worker?.prompt_template, "workers/project-scanner.md");

  // The FSM engine seeds the manifest at run-init with base_sha / head_sha
  // taken from --base / --head. Confirm assert-fresh-run.mjs accepts it.
  const settings = resolveSettings({ fsmName: "code-reviewer" }, REPO_ROOT);
  const storageRoot = resolve(REPO_ROOT, settings.storageRoot);
  const runDir = runDirPath(firstLine.run_id, { storageRoot });
  const manifestPath = `${runDir}/manifest.json`;
  assert.ok(
    existsSync(manifestPath),
    `expected manifest at ${manifestPath} after --start`,
  );

  // The manifest carries base_sha/head_sha as set by the FSM engine, so
  // assert-fresh-run.mjs's mismatch path is reachable.
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.base_sha, baseSha);
  assert.equal(manifest.head_sha, headSha);

  // Direct API call (avoids spawning yet another process).
  const ok = validateRun({
    runId: firstLine.run_id,
    base: baseSha,
    head: headSha,
    storageRoot,
  });
  assert.equal(ok.ok, true, `validateRun failed: ${JSON.stringify(ok)}`);

  const mismatched = validateRun({
    runId: firstLine.run_id,
    base: "wrong-sha",
    head: headSha,
    storageRoot,
  });
  assert.equal(mismatched.ok, false);
  assert.equal(mismatched.violation, "base-mismatch");
});
