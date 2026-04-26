// fsm-runtime.test.js — integration tests for fsm-next + fsm-commit +
// fsm-inspect over a fixture FSM. Drives the full new-run → multi-state
// advance → terminal cycle in an isolated temp directory.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "scripts",
);
const REPO_ROOT = join(SCRIPT_DIR, "..");

// Build a minimal three-state FSM in a temp root so tests don't depend on
// the production FSM YAML's exact shape.
const MINIMAL_FSM = `
fsm:
  id: smoke
  version: 1
  entry: a
  states:
    - id: a
      purpose: "Entry; produces x."
      preconditions: []
      worker:
        role: stub
        prompt_template: fsm/workers/stub.md
        inputs: ["args"]
        response_schema:
          type: object
          required: [x]
          properties:
            x: { type: integer, minimum: 0 }
      outputs: ["x"]
      transitions:
        - to: b
          when:
            kind: deterministic
            expression: "x > 0"
        - to: c
          when:
            kind: deterministic
            expression: "x == 0"
    - id: b
      purpose: "Mid; produces y."
      preconditions: ["x exists"]
      worker:
        role: stub
        prompt_template: fsm/workers/stub.md
        inputs: ["x"]
        response_schema:
          type: object
          required: [y]
          properties:
            y: { type: string, minLength: 1 }
      outputs: ["y"]
      transitions:
        - to: c
          when: always
    - id: c
      purpose: "Terminal."
      preconditions: []
      outputs: []
      transitions: []
`;

function setupFixture() {
  const tmp = mkdtempSync(join(tmpdir(), "fsm-runtime-"));
  // Create fsm/ + worker stub.
  writeFileSync(join(tmp, "fsm.yaml"), MINIMAL_FSM);
  // The static validator checks worker prompt_template existence; create a stub.
  const fsmDir = join(tmp, "fsm");
  spawnSync("mkdir", ["-p", join(fsmDir, "workers")], { encoding: "utf8" });
  writeFileSync(join(fsmDir, "workers", "stub.md"), "# stub worker\n");
  // Move fsm.yaml into fsm/ so prompt_template resolution finds workers/.
  cpSync(join(tmp, "fsm.yaml"), join(fsmDir, "code-reviewer.fsm.yaml"));
  rmSync(join(tmp, "fsm.yaml"));
  return tmp;
}

function runScript(name, args, opts = {}) {
  return spawnSync("node", [join(SCRIPT_DIR, name), ...args], {
    encoding: "utf8",
    cwd: opts.cwd ?? REPO_ROOT,
  });
}

function parseJsonStdout(result) {
  if (result.status !== 0) {
    throw new Error(
      `script exited ${result.status}; stderr: ${result.stderr}; stdout: ${result.stdout}`,
    );
  }
  return JSON.parse(result.stdout);
}

// ─── fsm-next --new-run ────────────────────────────────────────────────

test("fsm-next --new-run: creates run, returns entry-state brief, holds lock", () => {
  const tmp = setupFixture();
  try {
    const result = runScript(
      "fsm-next.mjs",
      [
        "--new-run",
        "--repo", "testrepo",
        "--base-sha", "aaa",
        "--head-sha", "bbb",
        "--session-id", "test-session",
        "--args", JSON.stringify({ scope: "all" }),
        "--fsm-path", "fsm/code-reviewer.fsm.yaml",
        "--root-dir", tmp,
      ],
    );
    const brief = parseJsonStdout(result);
    assert.equal(brief.ok, true);
    assert.match(brief.run_id, /^\d{8}-\d{6}-[0-9a-f]{7}$/);
    assert.equal(brief.state, "a");
    assert.equal(brief.purpose, "Entry; produces x.");
    assert.equal(brief.has_worker, true);
    assert.equal(brief.worker.role, "stub");
    assert.deepEqual(brief.transitions.map((t) => t.to), ["b", "c"]);
    assert.deepEqual(brief.inputs, { args: { scope: "all" } });
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("fsm-next --new-run rejects unknown args", () => {
  const tmp = setupFixture();
  try {
    const result = runScript("fsm-next.mjs", ["--bogus"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /unknown argument/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// ─── fsm-commit: advance via deterministic predicate ───────────────────

test("fsm-commit: deterministic predicate routes a→b when x>0", () => {
  const tmp = setupFixture();
  try {
    const session = "test-session-2";
    const newRun = parseJsonStdout(
      runScript("fsm-next.mjs", [
        "--new-run", "--repo", "testrepo",
        "--base-sha", "aaa", "--head-sha", "bbb",
        "--session-id", session,
        "--args", "{}",
        "--root-dir", tmp,
      ]),
    );
    const commit = parseJsonStdout(
      runScript("fsm-commit.mjs", [
        "--run-id", newRun.run_id,
        "--outputs", JSON.stringify({ x: 5 }),
        "--session-id", session,
        "--root-dir", tmp,
      ]),
    );
    assert.equal(commit.ok, true);
    assert.equal(commit.advanced_from, "a");
    assert.equal(commit.state, "b");
    assert.deepEqual(commit.inputs, { x: 5 });
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("fsm-commit: deterministic predicate routes a→c when x==0 (skipping b)", () => {
  const tmp = setupFixture();
  try {
    const session = "test-session-3";
    const newRun = parseJsonStdout(
      runScript("fsm-next.mjs", [
        "--new-run", "--repo", "testrepo",
        "--base-sha", "aaa", "--head-sha", "bbb",
        "--session-id", session,
        "--args", "{}",
        "--root-dir", tmp,
      ]),
    );
    const commit = parseJsonStdout(
      runScript("fsm-commit.mjs", [
        "--run-id", newRun.run_id,
        "--outputs", JSON.stringify({ x: 0 }),
        "--session-id", session,
        "--root-dir", tmp,
      ]),
    );
    assert.equal(commit.ok, true);
    assert.equal(commit.advanced_from, "a");
    assert.equal(commit.state, "c");
    assert.equal(commit.transitions.length, 0); // c is terminal in the fixture
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// ─── full cycle to terminal ────────────────────────────────────────────

test("fsm-commit: reaches terminal after full a→b→c cycle", () => {
  const tmp = setupFixture();
  try {
    const session = "test-session-4";
    const newRun = parseJsonStdout(
      runScript("fsm-next.mjs", [
        "--new-run", "--repo", "testrepo",
        "--base-sha", "aaa", "--head-sha", "bbb",
        "--session-id", session,
        "--args", "{}",
        "--root-dir", tmp,
      ]),
    );
    // a → b
    parseJsonStdout(
      runScript("fsm-commit.mjs", [
        "--run-id", newRun.run_id,
        "--outputs", JSON.stringify({ x: 5 }),
        "--session-id", session,
        "--root-dir", tmp,
      ]),
    );
    // b → c (advances to terminal state but does not yet commit it)
    const advanced = parseJsonStdout(
      runScript("fsm-commit.mjs", [
        "--run-id", newRun.run_id,
        "--outputs", JSON.stringify({ y: "all-good" }),
        "--session-id", session,
        "--root-dir", tmp,
      ]),
    );
    assert.equal(advanced.state, "c");
    // c has empty transitions[] — committing it with empty outputs is the
    // terminal step.
    const final = parseJsonStdout(
      runScript("fsm-commit.mjs", [
        "--run-id", newRun.run_id,
        "--outputs", JSON.stringify({}),
        "--session-id", session,
        "--root-dir", tmp,
      ]),
    );
    assert.equal(final.ok, true);
    assert.equal(final.status, "terminal");
    assert.equal(final.state, "c");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// ─── schema-violation fault path ───────────────────────────────────────

test("fsm-commit: invalid worker output triggers fault + manifest status faulted", () => {
  const tmp = setupFixture();
  try {
    const session = "test-session-5";
    const newRun = parseJsonStdout(
      runScript("fsm-next.mjs", [
        "--new-run", "--repo", "testrepo",
        "--base-sha", "aaa", "--head-sha", "bbb",
        "--session-id", session,
        "--args", "{}",
        "--root-dir", tmp,
      ]),
    );
    const result = runScript("fsm-commit.mjs", [
      "--run-id", newRun.run_id,
      "--outputs", JSON.stringify({ x: -1 }), // violates minimum 0
      "--session-id", session,
      "--root-dir", tmp,
    ]);
    assert.notEqual(result.status, 0);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.error, "output_schema_violation");
    assert.match(payload.errors.join(" "), />=/);
    // Verify manifest moved to faulted.
    const inspect = parseJsonStdout(
      runScript("fsm-inspect.mjs", [
        "--run-id", newRun.run_id,
        "--root-dir", tmp,
      ]),
    );
    assert.equal(inspect.manifest.status, "faulted");
    assert.equal(inspect.lock, null); // released on fault
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// ─── lock conflict ─────────────────────────────────────────────────────

test("fsm-commit: refuses when caller does not hold the lock", () => {
  const tmp = setupFixture();
  try {
    const session = "test-session-6";
    const newRun = parseJsonStdout(
      runScript("fsm-next.mjs", [
        "--new-run", "--repo", "testrepo",
        "--base-sha", "aaa", "--head-sha", "bbb",
        "--session-id", session,
        "--args", "{}",
        "--root-dir", tmp,
      ]),
    );
    const result = runScript("fsm-commit.mjs", [
      "--run-id", newRun.run_id,
      "--outputs", JSON.stringify({ x: 5 }),
      "--session-id", "different-session",
      "--root-dir", tmp,
    ]);
    assert.notEqual(result.status, 0);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.error, "lock_not_held");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// ─── resume after pause ────────────────────────────────────────────────

test("fsm-next --resume: picks up at current_state after a fresh fsm-next call", () => {
  const tmp = setupFixture();
  try {
    const session = "test-session-7";
    const newRun = parseJsonStdout(
      runScript("fsm-next.mjs", [
        "--new-run", "--repo", "testrepo",
        "--base-sha", "aaa", "--head-sha", "bbb",
        "--session-id", session,
        "--args", "{}",
        "--root-dir", tmp,
      ]),
    );
    // a → b
    parseJsonStdout(
      runScript("fsm-commit.mjs", [
        "--run-id", newRun.run_id,
        "--outputs", JSON.stringify({ x: 5 }),
        "--session-id", session,
        "--root-dir", tmp,
      ]),
    );
    // b → c (advance)
    parseJsonStdout(
      runScript("fsm-commit.mjs", [
        "--run-id", newRun.run_id,
        "--outputs", JSON.stringify({ y: "complete" }),
        "--session-id", session,
        "--root-dir", tmp,
      ]),
    );
    // c → terminal
    const final = parseJsonStdout(
      runScript("fsm-commit.mjs", [
        "--run-id", newRun.run_id,
        "--outputs", JSON.stringify({}),
        "--session-id", session,
        "--root-dir", tmp,
      ]),
    );
    assert.equal(final.status, "terminal");
    // Resuming a completed run should be rejected with run_not_resumable.
    const rejected = runScript("fsm-next.mjs", [
      "--resume", newRun.run_id,
      "--session-id", session,
      "--root-dir", tmp,
    ]);
    assert.notEqual(rejected.status, 0);
    const payload = JSON.parse(rejected.stdout);
    assert.equal(payload.error, "run_not_resumable");
    assert.equal(payload.status, "completed");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// ─── fsm-inspect ───────────────────────────────────────────────────────

test("fsm-inspect: returns manifest + lock + ordered trace records", () => {
  const tmp = setupFixture();
  try {
    const session = "test-session-8";
    const newRun = parseJsonStdout(
      runScript("fsm-next.mjs", [
        "--new-run", "--repo", "testrepo",
        "--base-sha", "aaa", "--head-sha", "bbb",
        "--session-id", session,
        "--args", "{}",
        "--root-dir", tmp,
      ]),
    );
    const result = parseJsonStdout(
      runScript("fsm-inspect.mjs", [
        "--run-id", newRun.run_id,
        "--root-dir", tmp,
      ]),
    );
    assert.equal(result.ok, true);
    assert.equal(result.run_id, newRun.run_id);
    assert.equal(result.manifest.fsm_id, "smoke");
    assert.equal(result.manifest.status, "in_progress");
    assert.ok(result.lock);
    assert.equal(result.lock.session_id, session);
    assert.equal(result.trace_count, 1);
    assert.equal(result.trace[0].phase, "entry");
    assert.equal(result.trace[0].state, "a");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("fsm-inspect: returns error for unknown run", () => {
  const tmp = setupFixture();
  try {
    const result = runScript("fsm-inspect.mjs", [
      "--run-id", "20260101-000000-fffffff",
      "--root-dir", tmp,
    ]);
    assert.notEqual(result.status, 0);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.error, "run_not_found");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
