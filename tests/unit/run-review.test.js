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
  handleWorkerStateBrief,
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

test("parseArgs: supports --key=value syntax in addition to --key value", () => {
  const args = parseArgs(["node", "run-review.mjs", "--replay-mode=record", "--base=abc"]);
  assert.equal(args["replay-mode"], "record");
  assert.equal(args.base, "abc");
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

test("handleWorkerStateBrief: env-loader failure surfaces as in-flow fault, not crash", () => {
  // resolveStorageRoot reads .fsmrc.json + fsm config; runEnv reads
  // run-storage on disk. Either can throw on a missing/corrupt config
  // or storage tree. The helper must wrap them so failures convert to
  // {kind:"fault"} instead of bubbling out as a top-level error.
  const result = handleWorkerStateBrief(
    { state: "llm_trim", has_worker: true },
    "run-1",
    { replayMode: "record" }, // live mode skips env loading entirely
    {
      resolveStorageRoot: () => { throw new Error("fsm config missing"); },
      runEnv: () => assert.fail("must not reach runEnv when resolveStorageRoot threw"),
      hashKeyForBrief: () => assert.fail("must not reach hashKey"),
      replayLookup: () => assert.fail("must not reach replay"),
      runFsmCommit: () => assert.fail("must not commit"),
      stashPendingBrief: () => {},
      runDirPath: () => "/tmp/run",
      fixturesRoot: "/tmp/fixtures",
    },
  );
  assert.equal(result.kind, "fault");
  assert.match(result.payload.fault.reason, /failed to load run env/);
});

test("handleWorkerStateBrief: replay HIT auto-commits and advances", () => {
  // Replay returns a recorded fixture; the helper must run fsm-commit
  // and return kind:"advance" with the new payload, never emitting
  // awaiting_worker on a hit.
  const fakeBrief = { state: "llm_trim", has_worker: true };
  const recordedOutputs = { picked_leaves: [], rejected_leaves: [], coverage_rescues: [] };
  const result = handleWorkerStateBrief(
    fakeBrief,
    "run-1",
    { replayMode: "replay" },
    {
      resolveStorageRoot: () => "/tmp",
      runEnv: () => ({}),
      hashKeyForBrief: () => "a".repeat(64),
      replayLookup: () => ({ hit: true, outputs: recordedOutputs }),
      runFsmCommit: ({ runId, outputs }) => {
        assert.equal(runId, "run-1");
        assert.deepEqual(outputs, recordedOutputs);
        return { ok: true, payload: { state: "next-state", has_worker: false } };
      },
      stashPendingBrief: () => {},
      runDirPath: () => "/tmp/run",
      fixturesRoot: "/tmp/fixtures",
    },
  );
  assert.equal(result.kind, "advance");
  assert.equal(result.payload.state, "next-state");
});

test("handleWorkerStateBrief: replay MISS faults with hash_key in details", () => {
  const result = handleWorkerStateBrief(
    { state: "llm_trim", has_worker: true },
    "run-1",
    { replayMode: "replay" },
    {
      resolveStorageRoot: () => "/tmp",
      runEnv: () => ({}),
      hashKeyForBrief: () => "b".repeat(64),
      replayLookup: () => ({ hit: false }),
      runFsmCommit: () => assert.fail("must not commit on a miss"),
      stashPendingBrief: () => {},
      runDirPath: () => "/tmp/run",
      fixturesRoot: "/tmp/fixtures",
    },
  );
  assert.equal(result.kind, "fault");
  assert.equal(result.payload.status, "fault");
  assert.match(result.payload.fault.reason, /replay-mode miss/);
  assert.equal(result.payload.fault.hash_key, "b".repeat(64));
});

test("handleWorkerStateBrief: replay corrupted fixture surfaces as fault, not crash", () => {
  const result = handleWorkerStateBrief(
    { state: "llm_trim", has_worker: true },
    "run-1",
    { replayMode: "replay" },
    {
      resolveStorageRoot: () => "/tmp",
      runEnv: () => ({}),
      hashKeyForBrief: () => "c".repeat(64),
      replayLookup: () => { throw new Error("invalid JSON in fixture"); },
      runFsmCommit: () => assert.fail("must not commit when lookup throws"),
      stashPendingBrief: () => {},
      runDirPath: () => "/tmp/run",
      fixturesRoot: "/tmp/fixtures",
    },
  );
  assert.equal(result.kind, "fault");
  assert.match(result.payload.fault.reason, /fixture corrupted/);
});

test("handleWorkerStateBrief: hash compute failure (record mode) surfaces as in-flow fault", () => {
  // Live mode skips hashing entirely (regression-prevention for
  // non-harness callers); the failure path only fires in record /
  // replay mode where the hash is actually needed.
  const result = handleWorkerStateBrief(
    { state: "llm_trim", has_worker: true },
    "run-1",
    { replayMode: "record" },
    {
      resolveStorageRoot: () => "/tmp",
      runEnv: () => ({}),
      hashKeyForBrief: () => { throw new Error("prompt template not readable"); },
      replayLookup: () => assert.fail("must not look up when hash fails"),
      runFsmCommit: () => assert.fail("must not commit"),
      stashPendingBrief: () => {},
      runDirPath: () => "/tmp/run",
      fixturesRoot: "/tmp/fixtures",
    },
  );
  assert.equal(result.kind, "fault");
  assert.match(result.payload.fault.reason, /hash key compute failed/);
});

test("handleWorkerStateBrief: record-mode runDirPath failure surfaces as fault (not crash)", () => {
  // runDirPath touches the run-storage tree on disk. A missing /
  // corrupt storage tree would throw — the helper must convert that
  // to a structured fault instead of letting it bubble out as a
  // top-level error.
  const result = handleWorkerStateBrief(
    { state: "llm_trim", has_worker: true },
    "run-1",
    { replayMode: "record" },
    {
      resolveStorageRoot: () => "/tmp",
      runEnv: () => ({}),
      hashKeyForBrief: () => "f".repeat(64),
      replayLookup: () => ({ hit: false }),
      runFsmCommit: () => assert.fail("must not commit"),
      stashPendingBrief: () => assert.fail("must not stash when runDirPath threw"),
      runDirPath: () => { throw new Error("storage tree missing"); },
      fixturesRoot: "/tmp/fixtures",
    },
  );
  assert.equal(result.kind, "fault");
  assert.match(result.payload.fault.reason, /failed to stash pending brief/);
});

test("handleWorkerStateBrief: record-mode stash failure surfaces as fault", () => {
  const result = handleWorkerStateBrief(
    { state: "llm_trim", has_worker: true },
    "run-1",
    { replayMode: "record" },
    {
      resolveStorageRoot: () => "/tmp",
      runEnv: () => ({}),
      hashKeyForBrief: () => "d".repeat(64),
      replayLookup: () => ({ hit: false }),
      runFsmCommit: () => assert.fail("must not commit"),
      stashPendingBrief: () => { throw new Error("disk full"); },
      runDirPath: () => "/tmp/run",
      fixturesRoot: "/tmp/fixtures",
    },
  );
  assert.equal(result.kind, "fault");
  assert.match(result.payload.fault.reason, /failed to stash pending brief/);
});

test("handleWorkerStateBrief: live mode skips env+hash entirely and pauses", () => {
  // The default live path must NOT touch the env loaders, hash, or
  // stash. Pre-B7 a live --start didn't read the prompt template or
  // load run-storage; introducing failure modes for callers who didn't
  // opt into the harness would regress that. Stub all env-side
  // dependencies to throw and assert the helper still returns a clean
  // pause.
  const brief = { state: "llm_trim", has_worker: true };
  const result = handleWorkerStateBrief(
    brief,
    "run-1",
    { replayMode: "live" },
    {
      resolveStorageRoot: () => assert.fail("live mode must not touch resolveStorageRoot"),
      runEnv: () => assert.fail("live mode must not touch runEnv"),
      hashKeyForBrief: () => assert.fail("live mode must not compute hashKey"),
      replayLookup: () => assert.fail("live mode must not look up replays"),
      runFsmCommit: () => assert.fail("live mode must not commit"),
      stashPendingBrief: () => assert.fail("live mode must not stash"),
      runDirPath: () => assert.fail("live mode must not touch runDirPath"),
      fixturesRoot: "/tmp/fixtures",
    },
  );
  assert.equal(result.kind, "pause");
  assert.equal(result.payload.status, "awaiting_worker");
  assert.equal(result.payload.brief, brief);
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
