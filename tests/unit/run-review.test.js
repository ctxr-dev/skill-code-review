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
  repoRelativePromptPath,
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

test("repoRelativePromptPath: projects FSM-yaml-relative paths to repo-relative ones", () => {
  // brief.prompt_template values are relative to the FSM YAML's own
  // directory (e.g. `workers/project-scanner.md`). The hashing harness
  // expects repo-relative paths (`fsm/workers/project-scanner.md`) so
  // it can read the prompt body. This pure helper does the projection.
  assert.equal(
    repoRelativePromptPath("workers/project-scanner.md"),
    "fsm/workers/project-scanner.md",
  );
  assert.equal(
    repoRelativePromptPath("workers/trim-candidates.md"),
    "fsm/workers/trim-candidates.md",
  );
  // Already repo-relative → pass through unchanged.
  assert.equal(
    repoRelativePromptPath("fsm/workers/trim-candidates.md"),
    "fsm/workers/trim-candidates.md",
  );
  // Empty / non-string inputs project to the empty string (the harness
  // treats that as "no prompt body" and only hashes the path component).
  assert.equal(repoRelativePromptPath(""), "");
  assert.equal(repoRelativePromptPath(null), "");
  assert.equal(repoRelativePromptPath(undefined), "");
});

test("repoRelativePromptPath: rejects path traversal and absolute paths", () => {
  // The hashing harness reads `<repoRoot>/<promptTemplate>`; without
  // these guards a tampered FSM YAML could pull arbitrary files into
  // the recorded fixture's content fingerprint.
  assert.throws(() => repoRelativePromptPath("../etc/passwd"), /traversal|absolute/);
  assert.throws(() => repoRelativePromptPath("workers/../../etc/passwd"), /traversal|absolute/);
  assert.throws(() => repoRelativePromptPath("/etc/passwd"), /traversal|absolute/);
  assert.throws(() => repoRelativePromptPath("C:\\Windows\\System32"), /traversal|absolute/);
  assert.throws(() => repoRelativePromptPath("..\\evil.md"), /traversal|absolute/);
  // Windows leading-backslash and UNC forms must also be rejected:
  // `\Windows\...` and `\\server\share\...` get normalized into
  // `<repoRoot>\Windows\...` / similar by path.resolve on Windows,
  // which escapes the intended repo-relative scope.
  assert.throws(() => repoRelativePromptPath("\\Windows\\System32"), /traversal|absolute|UNC/);
  assert.throws(() => repoRelativePromptPath("\\\\server\\share\\file"), /traversal|absolute|UNC/);
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
