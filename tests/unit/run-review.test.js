// Smoke tests for the pure helpers in scripts/run-review.mjs. Full
// end-to-end runner coverage (start → fsm-next → inline-state → fsm-commit
// → terminal) lands under SC-B7 (worker-output replay harness). These tests
// pin the exported helpers so the contract documented in the module header
// can't drift unnoticed.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  parseArgs,
  parseFsmCliResult,
  stateIdToModuleName,
  isValidGitRef,
  runTrimValidationGate,
} from "../../scripts/run-review.mjs";

test("parseArgs: --flag value pairs become entries", () => {
  const args = parseArgs([
    "node",
    "run-review.mjs",
    "--start",
    "--base",
    "abc",
    "--head",
    "def",
  ]);
  assert.equal(args.start, true);
  assert.equal(args.base, "abc");
  assert.equal(args.head, "def");
});

test("parseArgs: bare --flag (no value) becomes boolean true", () => {
  const args = parseArgs(["node", "run-review.mjs", "--continue"]);
  assert.equal(args.continue, true);
});

test("parseArgs: ignores positional args before --", () => {
  const args = parseArgs(["node", "run-review.mjs", "extra", "--key", "v"]);
  assert.equal(args.key, "v");
});

test("stateIdToModuleName: snake_case → kebab-case", () => {
  assert.equal(stateIdToModuleName("risk_tier_triage"), "risk-tier-triage");
  assert.equal(stateIdToModuleName("stage_a_empty"), "stage-a-empty");
  assert.equal(stateIdToModuleName("emit_stdout"), "emit-stdout");
  assert.equal(stateIdToModuleName("plain"), "plain");
});

test("parseFsmCliResult: result.error surfaces as structured fault", () => {
  const out = parseFsmCliResult(
    { error: Object.assign(new Error("not found"), { code: "ENOENT" }), stdout: "" },
    "fsm-next",
  );
  assert.equal(out.ok, false);
  assert.match(out.error, /spawn failed/);
  assert.match(out.error, /ENOENT/);
});

test("parseFsmCliResult: result.signal surfaces with signal name", () => {
  const out = parseFsmCliResult({ signal: "SIGTERM", stdout: "" }, "fsm-commit");
  assert.equal(out.ok, false);
  assert.match(out.error, /SIGTERM/);
});

test("parseFsmCliResult: non-zero status reports stderr or status code", () => {
  const stderrOut = parseFsmCliResult(
    { status: 2, stderr: "boom", stdout: "" },
    "fsm-next",
  );
  assert.equal(stderrOut.ok, false);
  assert.equal(stderrOut.error, "boom");

  const noStderr = parseFsmCliResult(
    { status: 3, stderr: "", stdout: "" },
    "fsm-next",
  );
  assert.match(noStderr.error, /exited with status 3/);
});

test("parseFsmCliResult: non-JSON stdout surfaces parse error", () => {
  const out = parseFsmCliResult({ status: 0, stdout: "not json" }, "fsm-next");
  assert.equal(out.ok, false);
  assert.match(out.error, /non-JSON stdout/);
});

test("parseFsmCliResult: valid JSON stdout returns parsed payload", () => {
  const out = parseFsmCliResult(
    { status: 0, stdout: '{"run_id":"abc","status":"awaiting_worker"}' },
    "fsm-next",
  );
  assert.equal(out.ok, true);
  assert.equal(out.payload.run_id, "abc");
  assert.equal(out.payload.status, "awaiting_worker");
});

test("isValidGitRef: accepts SHAs, branches, tags, revspecs", () => {
  assert.equal(isValidGitRef("abc1234"), true);
  assert.equal(isValidGitRef("HEAD"), true);
  assert.equal(isValidGitRef("origin/main"), true);
  assert.equal(isValidGitRef("v1.2.3"), true);
  assert.equal(isValidGitRef("feat/sprint-b-hardening"), true);
  // git revspec syntax accepted by the orchestrator spec:
  assert.equal(isValidGitRef("HEAD~1"), true);
  assert.equal(isValidGitRef("HEAD^"), true);
  assert.equal(isValidGitRef("commit^2"), true);
  assert.equal(isValidGitRef("branch@{1.day.ago}"), true);
});

test("isValidGitRef: rejects shell metacharacters, leading dash, overlong", () => {
  assert.equal(isValidGitRef("abc; rm -rf /"), false);
  assert.equal(isValidGitRef("abc`whoami`"), false);
  assert.equal(isValidGitRef("abc$(whoami)"), false);
  assert.equal(isValidGitRef("abc | cat"), false);
  assert.equal(isValidGitRef("abc with space"), false);
  assert.equal(isValidGitRef("abc'quote"), false);
  assert.equal(isValidGitRef('abc"dquote'), false);
  // Leading-dash → option injection risk; rejected even though everything
  // else is alphanumeric.
  assert.equal(isValidGitRef("-n"), false);
  assert.equal(isValidGitRef("-upload-pack=evil"), false);
  assert.equal(isValidGitRef(""), false);
  assert.equal(isValidGitRef(null), false);
  assert.equal(isValidGitRef(undefined), false);
  assert.equal(isValidGitRef(123), false);
  // Length cap (255 chars) — anything longer should be rejected.
  assert.equal(isValidGitRef("a".repeat(256)), false);
  assert.equal(isValidGitRef("a".repeat(255)), true);
});

test("runTrimValidationGate: no-op for non-trim outputs", () => {
  // Non-trim worker outputs (no picked_leaves[]) must short-circuit
  // without calling resolveStorageRoot/runEnv. The injection seam lets
  // us assert nothing was reached without spinning up the FSM.
  let called = false;
  const result = runTrimValidationGate("run-1", { stage_a_candidates: [] }, {
    resolveStorageRoot: () => { called = true; return "/tmp"; },
    runEnv: () => { called = true; return {}; },
  });
  assert.deepEqual(result, { ok: true });
  assert.equal(called, false, "no-op path must not touch the env loaders");
});

test("runTrimValidationGate: aborts when runEnv throws", () => {
  const err = Object.assign(new Error("run state not found"), { code: "ENOENT" });
  const result = runTrimValidationGate(
    "run-1",
    { picked_leaves: [{ id: "x", path: "x.md" }] },
    {
      resolveStorageRoot: () => "/tmp",
      runEnv: () => { throw err; },
    },
  );
  assert.equal(result.ok, false);
  assert.match(result.message, /failed to read run env/);
  assert.match(result.message, /ENOENT/);
  assert.equal(result.details.state, "llm_trim");
  assert.equal(result.details.run_id, "run-1");
});

test("runTrimValidationGate: aborts on validation errors with violation details", () => {
  // A picked-leaf id that isn't in the wiki triggers class-1; with
  // injected env carrying empty stage_a_candidates the validator hits
  // every applicable rule. We pass `repoRoot` to a path with no
  // reviewers.wiki/ to short-circuit class-2 fully.
  const result = runTrimValidationGate(
    "run-1",
    {
      picked_leaves: [{ id: "fake-id-not-in-wiki", path: "made-up.md" }],
      rejected_leaves: [],
      coverage_rescues: [],
    },
    {
      resolveStorageRoot: () => "/tmp",
      runEnv: () => ({ stage_a_candidates: [], changed_paths: [] }),
      repoRoot: "/this/path/has/no/reviewers/wiki/at/all",
    },
  );
  assert.equal(result.ok, false);
  assert.match(result.message, /referential-integrity validation failed/);
  assert.equal(result.details.state, "llm_trim");
  assert.equal(result.details.run_id, "run-1", "run_id must be present in validation-failure details for fault-trace correlation");
  assert.ok(Array.isArray(result.details.violations));
  assert.ok(result.details.violations.length > 0);
});

test("runTrimValidationGate: null outputs treated as no-op (gate doesn't fire)", () => {
  // The gate only validates outputs that look like trim output. `null`
  // is the explicit no-op input — the runner can call this gate from
  // every --continue without first sniffing the worker's identity, and
  // anything that isn't a trim shape (including null/undefined or a
  // different worker's payload) falls through without touching the env
  // loaders. The validator's own correctness is covered by its
  // dedicated test suite.
  const result = runTrimValidationGate(
    "run-1",
    null,
    {
      resolveStorageRoot: () => "/tmp",
      runEnv: () => ({}),
    },
  );
  assert.deepEqual(result, { ok: true });
});
