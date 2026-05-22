// Tests for the SKILL_ROOT vs PROJECT_ROOT split introduced in #100.
//
// Before that PR the runner hardcoded a single REPO_ROOT to the skill's
// install dir, which broke every review run from outside the skill's
// own repo (the eval in #100 documented the failure mode: every per-leaf
// dispatch prompt embedded a `(diff unavailable: ...)` placeholder
// because git diff ran in the wrong cwd, and 14 of 20 specialists
// returned skipped).
//
// These tests pin the new contract:
//   - --repo-root <path> wins.
//   - process.cwd()'s git toplevel wins next.
//   - SKILL_ROOT is the fallback so existing in-skill tests still pass.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  FilteredDiffError,
  handleWorkerStateBrief,
  projectRoot,
  setProjectRootForTesting,
} from "../../scripts/run-review.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
// SKILL_ROOT, not REPO_ROOT — the test-file vocabulary mirrors the
// production rename (closes finding #31).
const SKILL_ROOT = resolve(__dirname, "..", "..");
const RUNNER_PATH = resolve(SKILL_ROOT, "scripts", "run-review.mjs");

// Named placeholder SHAs (closes finding #32 — magic literals). These
// are deliberately unreachable 40-hex strings: the runner's --start
// validates the format, but `git diff <unreachable>..<unreachable>`
// is the negative path under test.
const UNREACHABLE_BASE_SHA = "0000000000000000000000000000000000000001";
const UNREACHABLE_HEAD_SHA = "0000000000000000000000000000000000000002";
const FRESH_REPO_BASE_SHA = "1111111111111111111111111111111111111111";
const FRESH_REPO_HEAD_SHA = "2222222222222222222222222222222222222222";

// Spawn the runner with --start and the unreachable SHA pair so the
// run reaches a documented failure mode without doing real diff work.
// Returns { status, stdout, stderr, allOutput }.
function runStart(extraArgs, opts = {}) {
  const result = spawnSync(
    process.execPath,
    [
      RUNNER_PATH,
      "--start",
      "--base", UNREACHABLE_BASE_SHA,
      "--head", UNREACHABLE_HEAD_SHA,
      ...extraArgs,
    ],
    { encoding: "utf8", cwd: SKILL_ROOT, timeout: 30_000, ...opts },
  );
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    allOutput: `${result.stdout}\n${result.stderr}`,
  };
}

// Initialise a git repo at a fresh tmpdir for tests that need a
// real project root (closes finding #29 — host VCS coupling).
//
// Verifies `git init` exit status (closes the round-2 lang-javascript
// + flaky-tests findings: silent git failures in CI containers
// without git installed would otherwise propagate as misleading
// downstream "not a git repository" errors from the runner under
// test, hiding the real environmental cause).
function makeFreshGitRepo() {
  const dir = mkdtempSync(join(tmpdir(), "fresh-git-repo-"));
  const init = spawnSync("git", ["init", "-q", dir], { encoding: "utf8" });
  if (init.status !== 0 || init.error) {
    rmSync(dir, { recursive: true, force: true });
    throw new Error(
      `git init failed (status=${init.status}, error=${init.error?.message ?? "none"}, ` +
      `stderr=${init.stderr ?? ""}); cannot run tests that need a fresh git repo. ` +
      `Is git installed?`,
    );
  }
  return dir;
}

// FilteredDiffError contract — name, message, optional cause.
test("FilteredDiffError carries name + message + optional cause", () => {
  const cause = new Error("ENOENT");
  const err = new FilteredDiffError("git diff exited 1", { cause });
  assert.equal(err.name, "FilteredDiffError");
  assert.equal(err.message, "git diff exited 1");
  assert.equal(err.cause, cause);
  assert.ok(err instanceof Error);
});

test("FilteredDiffError without cause is still an Error", () => {
  const err = new FilteredDiffError("boom");
  assert.equal(err.name, "FilteredDiffError");
  assert.equal(err.cause, undefined);
});

// setProjectRootForTesting behaviour: the override must take effect
// observably, and the null reset must clear it. Pre-fix, the
// "accepts an absolute path and clears with null" test had ZERO
// assertions and the comment admitted as much (closes findings #1
// and #28). The fix asserts the observable consequence: projectRoot()
// returns the override value when set, and re-discovers from cwd
// after null is passed.
test("setProjectRootForTesting: override is observable via projectRoot()", () => {
  const tmp = mkdtempSync(join(tmpdir(), "proj-root-override-"));
  try {
    setProjectRootForTesting(tmp);
    assert.equal(projectRoot(), resolve(tmp),
      "projectRoot() must return the override value");
  } finally {
    setProjectRootForTesting(null);
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("setProjectRootForTesting(null) re-enables discovery (cache cleared)", () => {
  // Closes finding #2: the cache-invalidation test had zero
  // assertions and admitted in a comment that the next test didn't
  // actually verify the contract either.
  //
  // Observed contract: after override → reset, projectRoot() must
  // re-run discovery (returning the cwd-based value), NOT keep
  // returning the cleared override.
  //
  // The two assertions are NOT redundant:
  //   - notEqual against the override pins "cache cleared the
  //     override"
  //   - equal against discoveredFirst pins "and ran the discovery
  //     branch again, not some default" — without it, an
  //     implementation that returned a hardcoded sentinel after
  //     reset would pass the notEqual but fail this one.
  // Process.cwd() is stable across these calls (the test does not
  // chdir between them), so discoveredFirst === discoveredAgain
  // is the load-bearing equality.
  setProjectRootForTesting(null);
  const discoveredFirst = projectRoot();
  const tmp = mkdtempSync(join(tmpdir(), "proj-root-cache-clear-"));
  try {
    setProjectRootForTesting(tmp);
    assert.equal(projectRoot(), resolve(tmp), "override should win");
    setProjectRootForTesting(null);
    const discoveredAgain = projectRoot();
    assert.notEqual(discoveredAgain, resolve(tmp),
      "after reset, projectRoot() must NOT return the cleared override");
    assert.equal(discoveredAgain, discoveredFirst,
      "after reset, projectRoot() must re-run discovery, not return a default");
  } finally {
    setProjectRootForTesting(null);
    rmSync(tmp, { recursive: true, force: true });
  }
});

// Round-5 Copilot review on #101: doc string says "absolute path",
// but pre-fix the helper accepted any truthy string and resolve()'d
// it (silently anchoring relative paths to the test runner's cwd).
// The fix throws on non-absolute / non-string input so the contract
// matches the docs.
test("setProjectRootForTesting throws on relative paths", () => {
  assert.throws(
    () => setProjectRootForTesting("relative/path"),
    /absolute path/,
  );
});

// Closes finding #33: combined inputs in one test obscure which case
// failed. Split into per-input cases so each is reported separately.
test("setProjectRootForTesting throws on number input", () => {
  assert.throws(() => setProjectRootForTesting(42), /absolute path or null/);
});

test("setProjectRootForTesting throws on object input", () => {
  assert.throws(() => setProjectRootForTesting({}), /absolute path or null/);
});

// The --repo-root flag is the explicit user override.
test("--repo-root: missing path fails up front with a clear error", () => {
  const result = runStart(["--repo-root", "/this/path/does/not/exist/abc123"]);
  assert.notEqual(result.status, 0, "missing --repo-root must fail");
  assert.match(result.allOutput, /--repo-root/);
  assert.match(result.allOutput, /does not exist/);
});

// Round-4 Copilot review on #101: parseArgs encodes a bare flag as
// boolean `true`. Pre-fix, discoverProjectRoot silently fell through.
test("--repo-root: bare flag (no value) is rejected up front", () => {
  const result = runStart(["--repo-root"]);
  assert.notEqual(result.status, 0, "bare --repo-root must fail");
  assert.match(result.allOutput, /--repo-root/);
  assert.match(result.allOutput, /requires a value|bare flag|absolute|does not exist/);
});

// Relative paths were silently accepted by `resolve()`, leaving the
// operator with a confusing later git diff failure.
test("--repo-root: relative paths are rejected up front", () => {
  const result = runStart(["--repo-root", "relative/path"]);
  assert.notEqual(result.status, 0, "relative --repo-root must fail");
  assert.match(result.allOutput, /--repo-root/);
  assert.match(result.allOutput, /absolute/);
});

// Pointing at a non-git directory previously produced an opaque
// downstream "git diff exited 128" — now it fails at startup.
test("--repo-root: non-git directories are rejected up front", () => {
  const tmp = mkdtempSync(join(tmpdir(), "non-git-"));
  try {
    const result = runStart(["--repo-root", tmp]);
    assert.notEqual(result.status, 0, "non-git --repo-root must fail");
    assert.match(result.allOutput, /--repo-root/);
    assert.match(result.allOutput, /not a git repository/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// Closes finding #29: the previous "args.project_root contains
// .git/" test ran the runner against the host repo, coupling the
// test to whatever VCS layout the test runner happened to be in
// (failures under tarball / sandboxed CI checkouts). The fix is
// self-contained: spawn the runner against a fresh git repo we
// just initialised in tmpdir, and assert the seeded value is
// exactly that path.
test("project_root in args bag follows --repo-root verbatim", () => {
  const freshRepo = makeFreshGitRepo();
  try {
    const result = runStart([
      "--base", FRESH_REPO_BASE_SHA,
      "--head", FRESH_REPO_HEAD_SHA,
      "--repo-root", freshRepo,
    ]);
    assert.equal(result.status, 0, `--start failed: ${result.stderr}`);
    const firstLine = result.stdout.split("\n").filter(Boolean)[0];
    let envelope;
    try {
      envelope = JSON.parse(firstLine);
    } catch (parseErr) {
      assert.fail(
        `--start stdout was not parseable JSON: ${parseErr.message}\n` +
        `firstLine="${firstLine}"\nstderr=${result.stderr}`,
      );
    }
    assert.equal(envelope.status, "awaiting_worker");
    const seeded = envelope.brief?.inputs?.args?.project_root;
    assert.equal(seeded, freshRepo,
      "args.project_root must equal the --repo-root passed at --start");
  } finally {
    rmSync(freshRepo, { recursive: true, force: true });
  }
});

// Fault-fast contract for the dispatch_specialists branch.
test("handleWorkerStateBrief: dispatch_specialists faults on FilteredDiffError before pausing", () => {
  const brief = {
    has_worker: true,
    run_id: "20260502-fault-tst",
    state: "dispatch_specialists",
    inputs: { picked_leaves: [{ id: "lang-javascript", path: "x.md" }] },
  };
  // Closes finding #27: the previous assertion pinned `git diff
  // exited 1` (upstream git wording). The runner's contract is
  // FilteredDiffError + the operator-actionable hint; the upstream
  // git wording is incidental. We assert only on the runner's own
  // surface now (FilteredDiffError class name, the --repo-root
  // remediation hint, and the bound message string).
  const result = handleWorkerStateBrief(brief, brief.run_id, {}, {
    writeBriefToDisk: () => {},
    writeSpecialistPromptsToDisk: () => {
      throw new FilteredDiffError("the underlying diff failure");
    },
  });
  assert.equal(result.kind, "fault");
  assert.equal(result.payload.status, "fault");
  assert.equal(result.payload.run_id, "20260502-fault-tst");
  assert.equal(result.payload.fault.state, "dispatch_specialists");
  assert.match(result.payload.fault.reason, /FilteredDiffError/);
  assert.match(result.payload.fault.reason, /the underlying diff failure/);
  assert.match(result.payload.fault.reason, /--repo-root/);
});

// Sanity: non-FilteredDiffError exceptions still propagate.
test("handleWorkerStateBrief: re-throws non-FilteredDiffError from staging", () => {
  const brief = {
    has_worker: true,
    run_id: "20260502-other-tst",
    state: "dispatch_specialists",
    inputs: { picked_leaves: [{ id: "x", path: "x.md" }] },
  };
  assert.throws(
    () => handleWorkerStateBrief(brief, brief.run_id, {}, {
      writeBriefToDisk: () => {},
      writeSpecialistPromptsToDisk: () => {
        throw new Error("disk full");
      },
    }),
    /disk full/,
  );
});

test("handleWorkerStateBrief: non-specialist states pause as before", () => {
  const brief = {
    has_worker: true,
    run_id: "20260502-pause-tst",
    state: "scan_project",
    inputs: { args: {} },
  };
  const result = handleWorkerStateBrief(brief, brief.run_id, {}, {
    writeBriefToDisk: () => {},
    writeDispatchPromptToDisk: () => {},
  });
  assert.equal(result.kind, "pause");
  assert.equal(result.payload.status, "awaiting_worker");
});

// Round-2 Copilot review on #101: record/replay must honour
// _deps.writeSpecialistPromptsToDisk consistently with live mode.
test("handleWorkerStateBrief: record mode honors injected writeSpecialistPromptsToDisk", () => {
  let injectedSpecialistCalled = false;
  const brief = {
    has_worker: true,
    run_id: "20260502-recmode-tst",
    state: "dispatch_specialists",
    inputs: { picked_leaves: [{ id: "lang-javascript", path: "x.md" }] },
  };
  const result = handleWorkerStateBrief(
    brief,
    brief.run_id,
    { replayMode: "record" },
    {
      resolveStorageRoot: () => "/no-where",
      runEnv: () => ({}),
      hashKeyForBrief: () => "deadbeef",
      runDirPath: () => "/no-where",
      stashPendingBrief: () => {},
      writeBriefToDisk: () => {},
      writeDispatchPromptToDisk: () => {},
      writeSpecialistPromptsToDisk: () => {
        injectedSpecialistCalled = true;
      },
    },
  );
  assert.equal(result.kind, "pause");
  assert.equal(injectedSpecialistCalled, true,
    "record mode must use the injected writeSpecialistPromptsToDisk");
});

// Storage-path contract is verified by direct unit tests of
// `coerceAbsoluteProjectRoot` and `validateStorageRootEntry` in
// tests/unit/project-root-lib.test.js. Earlier versions of this
// file went via writeRunArtefacts and:
//   - pre-created a stub manifest at a hardcoded date path
//     (drifted on day-rollover, pre-created the storage tree,
//     making the assertion pass vacuously);
//   - inspected a possibly-empty error message under a conditional
//     `if (observedError)` guard;
//   - hardcoded year prefixes (2025/2026/2027) that would silently
//     stop catching misroutes on 2028-01-01.
// All three were called out by the v2.4 round-3 self-review as
// fragile + non-deterministic, so the writeRunArtefacts-level
// tests were deleted in favour of the helper-level coverage.
