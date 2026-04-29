// Unit tests for the run-dir-as-source-of-truth helpers (#76):
//   - defaultOutputsPath / defaultBriefPath  — canonical per-state paths
//   - enrichBriefWithOutputsPath             — third enricher in parseFsmCliResult
//   - writeBriefToDisk                       — atomic brief persistence

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, mkdtempSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";

import {
  defaultOutputsPath,
  defaultBriefPath,
  enrichBriefWithOutputsPath,
  writeBriefToDisk,
} from "../../scripts/run-review.mjs";

test("defaultOutputsPath: returns null on missing run_id or state", () => {
  assert.equal(defaultOutputsPath(null, "scan_project"), null);
  assert.equal(defaultOutputsPath("20260429-185000-a3618a4", null), null);
  assert.equal(defaultOutputsPath("", ""), null);
});

test("defaultOutputsPath: produces a path containing run-id segments and the state suffix", () => {
  const path = defaultOutputsPath("20260429-185000-a3618a4", "scan_project");
  assert.ok(path.endsWith("workers/scan_project-output.json"), `unexpected suffix: ${path}`);
  // run-id format: yyyymmdd-hhmmss-hash7. Path layout includes year/month/day
  // segments and a 2-char shard from the hash. Confirm those tokens appear.
  assert.match(path, /\/2026\/04\/29\//);
  assert.match(path, /\/a3\/618a4\//);
});

test("defaultBriefPath: produces a path with the brief suffix", () => {
  const path = defaultBriefPath("20260429-185000-a3618a4", "tree_descend");
  assert.ok(path.endsWith("workers/tree_descend-brief.json"), `unexpected suffix: ${path}`);
});

test("enrichBriefWithOutputsPath: passes through briefs with no worker", () => {
  // status: "terminal" payloads, faulted shapes, etc.
  assert.deepEqual(enrichBriefWithOutputsPath({ status: "terminal" }), { status: "terminal" });
  assert.deepEqual(enrichBriefWithOutputsPath({ has_worker: false }), { has_worker: false });
});

test("enrichBriefWithOutputsPath: passes through briefs missing run_id or state", () => {
  const a = enrichBriefWithOutputsPath({ has_worker: true, state: "scan_project" });
  assert.equal(a.outputs_path, undefined);
  const b = enrichBriefWithOutputsPath({ has_worker: true, run_id: "x" });
  assert.equal(b.outputs_path, undefined);
});

test("enrichBriefWithOutputsPath: injects outputs_path on a complete worker brief", () => {
  const brief = {
    has_worker: true,
    run_id: "20260429-185000-a3618a4",
    state: "tree_descend",
    worker: { role: "tree-descender" },
  };
  const out = enrichBriefWithOutputsPath(brief);
  assert.ok(out.outputs_path.endsWith("workers/tree_descend-output.json"));
  // Original not mutated.
  assert.equal(brief.outputs_path, undefined);
});

test("enrichBriefWithOutputsPath: idempotent (applying twice yields the same outputs_path)", () => {
  const brief = {
    has_worker: true,
    run_id: "20260429-185000-a3618a4",
    state: "scan_project",
  };
  const a = enrichBriefWithOutputsPath(brief);
  const b = enrichBriefWithOutputsPath(a);
  assert.equal(a.outputs_path, b.outputs_path);
});

test("writeBriefToDisk: passes through silently when no worker / missing fields", () => {
  // Should not throw on these shapes.
  writeBriefToDisk({ status: "terminal" });
  writeBriefToDisk({ has_worker: false });
  writeBriefToDisk({ has_worker: true, run_id: "x" });
  // No assertion — the test passing means nothing was thrown.
});

test("writeBriefToDisk: atomically writes the brief to <run_dir>/workers/<state>-brief.json", () => {
  // We need a real <run_dir>/workers/ directory to write into. Use a
  // synthetic run-id that resolves under .skill-code-review/. The
  // workers/ subdirectory is normally created by @ctxr/fsm's
  // ensureRunDir on fsm-next; we mkdir it here to mirror that
  // contract for an isolated unit test.
  const runId = "20991231-235959-cafef00";
  const state = "test_state";
  const briefPath = defaultBriefPath(runId, state);
  const workersDir = dirname(briefPath);
  mkdirSync(workersDir, { recursive: true });

  try {
    const brief = {
      has_worker: true,
      run_id: runId,
      state,
      worker: { role: "test" },
      outputs_path: "/some/path.json",
    };
    writeBriefToDisk(brief);
    assert.ok(existsSync(briefPath), `expected brief at ${briefPath}`);
    const onDisk = JSON.parse(readFileSync(briefPath, "utf8"));
    assert.deepEqual(onDisk, brief);
    // No tmp file leaked alongside.
    const leaks = readdirSync(workersDir).filter((n) => n.includes(".tmp-"));
    assert.deepEqual(leaks, [], "no .tmp leftover");
  } finally {
    // Best-effort cleanup so repeat runs don't accumulate synthetic
    // run-dirs under .skill-code-review/.
    rmSync(briefPath, { force: true });
  }
});
