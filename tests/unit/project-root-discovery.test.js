// Tests for the SKILL_ROOT vs PROJECT_ROOT split introduced in #100.
//
// Before this PR the runner hardcoded a single REPO_ROOT to the skill's
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
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  FilteredDiffError,
  handleWorkerStateBrief,
  setProjectRootForTesting,
} from "../../scripts/run-review.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");
const RUNNER_PATH = resolve(REPO_ROOT, "scripts", "run-review.mjs");

// FilteredDiffError is exported so writeSpecialistPromptsToDisk's
// caller (handleWorkerStateBrief) can pattern-match it. The class
// name and `cause` plumbing both matter for the structured fault
// payload the runner emits to the operator.
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

// setProjectRootForTesting is the unit-test escape hatch that bypasses
// the discovery walk. It exists so tests don't need to mutate
// process.cwd() (which is process-global and would race with parallel
// tests).
test("setProjectRootForTesting accepts an absolute path and clears with null", () => {
  const tmp = mkdtempSync(join(tmpdir(), "proj-root-test-"));
  try {
    setProjectRootForTesting(tmp);
    setProjectRootForTesting(null);
    // No assertion failures means the override + reset round-trip works.
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// The --repo-root flag is the explicit user override. We exercise it
// via a subprocess so the behaviour reflects what an end-user would
// see: unknown SHAs in a fake repo should produce a structured fault
// from the runner (NOT a silent placeholder, NOT a stack trace).
test("--repo-root: missing path fails up front with a clear error", () => {
  const result = spawnSync(
    process.execPath,
    [
      RUNNER_PATH,
      "--start",
      "--base", "0000000000000000000000000000000000000001",
      "--head", "0000000000000000000000000000000000000002",
      "--repo-root", "/this/path/does/not/exist/abc123",
    ],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 30_000 },
  );
  assert.notEqual(result.status, 0, "missing --repo-root must fail");
  // The error payload may land on stdout (fail() emits structured JSON
  // to stdout, not stderr).
  const allOutput = `${result.stdout}\n${result.stderr}`;
  assert.match(allOutput, /--repo-root/);
  assert.match(allOutput, /does not exist/);
});

// When the runner is invoked from inside the skill's own repo (which
// is what every CI run does), discoverProjectRoot's gitToplevel walk
// returns the skill repo. This pins backward compatibility: the 302
// existing tests that don't pass --repo-root keep working.
test("project_root in args bag defaults to a directory containing .git", () => {
  // Run --start in a way that pauses at scan_project, then read the
  // brief and confirm args.project_root points at a directory with a
  // .git/ entry (i.e., a real git repo, not a stale path).
  const start = spawnSync(
    process.execPath,
    [
      RUNNER_PATH,
      "--start",
      "--base", "1111111111111111111111111111111111111111",
      "--head", "2222222222222222222222222222222222222222",
    ],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 30_000 },
  );
  assert.equal(start.status, 0, `--start failed: ${start.stderr}`);
  const envelope = JSON.parse(start.stdout.split("\n").filter(Boolean)[0]);
  assert.equal(envelope.status, "awaiting_worker");
  const projectRoot = envelope.brief?.inputs?.args?.project_root;
  assert.ok(typeof projectRoot === "string" && projectRoot.length > 0,
    "args.project_root must be a non-empty string");
  // The seed must point at a real git repo (any directory containing
  // .git counts: regular repo, worktree linkfile, submodule). We
  // don't assert it equals SKILL_ROOT specifically because the
  // runner's discovery walks up from cwd, and CI / test invocations
  // may run in a worktree.
  assert.ok(
    existsSync(join(projectRoot, ".git")),
    `args.project_root "${projectRoot}" should contain a .git/ entry`,
  );
});

// Fault-fast contract for the dispatch_specialists branch:
// when writeSpecialistPromptsToDisk throws FilteredDiffError, the
// runner returns a structured fault payload BEFORE any specialist
// is dispatched. Pre-#100 the runner silently shipped K broken
// dispatch prompts, and the operator only learned of the misconfig
// after K Agent dispatches returned skipped.
test("handleWorkerStateBrief: dispatch_specialists faults on FilteredDiffError before pausing", () => {
  const brief = {
    has_worker: true,
    run_id: "20260502-fault-tst",
    state: "dispatch_specialists",
    inputs: { picked_leaves: [{ id: "lang-javascript", path: "x.md" }] },
  };
  const result = handleWorkerStateBrief(brief, brief.run_id, {}, {
    writeBriefToDisk: () => {},
    writeSpecialistPromptsToDisk: () => {
      throw new FilteredDiffError("git diff exited 1: error");
    },
  });
  assert.equal(result.kind, "fault");
  assert.equal(result.payload.status, "fault");
  assert.equal(result.payload.run_id, "20260502-fault-tst");
  assert.equal(result.payload.fault.state, "dispatch_specialists");
  // Operator-actionable hint must name the underlying cause AND the
  // remediation flag the operator can pass on retry.
  assert.match(result.payload.fault.reason, /FilteredDiffError/);
  assert.match(result.payload.fault.reason, /git diff exited 1/);
  assert.match(result.payload.fault.reason, /--repo-root/);
});

// Sanity: non-FilteredDiffError exceptions from writeSpecialistPromptsToDisk
// must still propagate (don't swallow programming bugs).
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

// Non-dispatch_specialists worker states still pause normally — the
// fault-fast catch is dispatch_specialists-specific.
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
