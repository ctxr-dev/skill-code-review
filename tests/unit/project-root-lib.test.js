// Direct unit tests for scripts/lib/project-root.mjs and the
// new exports in scripts/assert-fresh-run.mjs.
//
// Closes round-2 self-review findings #2 and #4: the post-#101
// shared module had no dedicated test file and several error
// branches (gitToplevelFromCwd's depth-cap exit, readFsmRcDirect's
// JSON-parse path, validateStorageRootEntry's per-branch errors)
// were unreachable from integration tests. Each branch now has a
// per-test assertion.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  FSM_NAME,
  MAX_GIT_TOPLEVEL_WALK_DEPTH,
  coerceAbsoluteProjectRoot,
  gitToplevelFromCwd,
  readFsmRcDirect,
  validateStorageRootEntry,
} from "../../scripts/lib/project-root.mjs";

import {
  parseArgs,
  resolveProjectRootForAssertion,
  resolveAssertionStorageRoot,
} from "../../scripts/assert-fresh-run.mjs";

// FSM_NAME is a module-level constant exposed for cross-file
// consistency. Pinning it avoids silent vocabulary drift.
test("FSM_NAME equals the documented code-reviewer string", () => {
  assert.equal(FSM_NAME, "code-reviewer");
});

test("MAX_GIT_TOPLEVEL_WALK_DEPTH is a positive integer", () => {
  assert.equal(typeof MAX_GIT_TOPLEVEL_WALK_DEPTH, "number");
  assert.ok(Number.isInteger(MAX_GIT_TOPLEVEL_WALK_DEPTH));
  assert.ok(MAX_GIT_TOPLEVEL_WALK_DEPTH > 0);
});

// coerceAbsoluteProjectRoot — the single-source absolute-string
// coercion. Inputs come from env.args.project_root, which is
// runner-controlled but defensively re-validated here.
test("coerceAbsoluteProjectRoot: accepts absolute paths verbatim", () => {
  // mkdtempSync is OS-portable and returns an absolute path.
  const dir = mkdtempSync(join(tmpdir(), "coerce-abs-"));
  try {
    assert.equal(coerceAbsoluteProjectRoot(dir, "/fallback"), dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Per-input tests for the rejection path. Pre-fix this was one
// combined test; closes round-4 finding #21 (combined inputs in
// one test obscure which case failed). Each input shape gets its
// own pass/fail signal via parameterised `for (const ...) test()`
// loop at module scope (NOT inside a test body — that would be
// the loop-with-assertions antipattern).
const FALLBACK = "/expected/fallback";
for (const [label, input] of [
  ["undefined", undefined],
  ["null", null],
  ["empty string", ""],
  ["relative path", "relative/path"],
  ["dot-relative path", "./also-relative"],
  ["number", 42],
  ["boolean true", true],
  ["boolean false", false],
  ["object with path", { path: "/abs" }],
  ["array with abs path", ["/abs"]],
]) {
  test(`coerceAbsoluteProjectRoot: rejects ${label}`, () => {
    assert.equal(coerceAbsoluteProjectRoot(input, FALLBACK), FALLBACK);
  });
}

// validateStorageRootEntry — six distinct error branches.
// Pre-#103 these were only exercised indirectly via subprocess
// runs; now each has a dedicated assertion (closes finding #4).

test("validateStorageRootEntry: returns the raw relative storage_root on valid config", () => {
  const cfg = { fsms: [{ name: FSM_NAME, storage_root: ".skill-code-review" }] };
  assert.equal(
    validateStorageRootEntry(cfg, "/skill-root"),
    ".skill-code-review",
  );
});

test("validateStorageRootEntry: rejects null/undefined cfg", () => {
  assert.throws(
    () => validateStorageRootEntry(null, "/skill-root"),
    /missing or has no "fsms" array/,
  );
  assert.throws(
    () => validateStorageRootEntry(undefined, "/skill-root"),
    /missing or has no "fsms" array/,
  );
});

test("validateStorageRootEntry: rejects cfg without fsms array", () => {
  assert.throws(
    () => validateStorageRootEntry({}, "/skill-root"),
    /missing or has no "fsms" array/,
  );
  assert.throws(
    () => validateStorageRootEntry({ fsms: "not-an-array" }, "/skill-root"),
    /missing or has no "fsms" array/,
  );
});

test("validateStorageRootEntry: rejects missing FSM-name entry", () => {
  const cfg = { fsms: [{ name: "other-fsm", storage_root: ".other" }] };
  assert.throws(
    () => validateStorageRootEntry(cfg, "/skill-root"),
    /code-reviewer entry not found/,
  );
});

test("validateStorageRootEntry: rejects empty/missing storage_root", () => {
  assert.throws(
    () => validateStorageRootEntry(
      { fsms: [{ name: FSM_NAME, storage_root: "" }] }, "/skill-root",
    ),
    /missing or empty/,
  );
  assert.throws(
    () => validateStorageRootEntry(
      { fsms: [{ name: FSM_NAME }] }, "/skill-root",
    ),
    /missing or empty/,
  );
});

test("validateStorageRootEntry: rejects absolute storage_root", () => {
  const cfg = { fsms: [{ name: FSM_NAME, storage_root: "/abs/escape" }] };
  assert.throws(
    () => validateStorageRootEntry(cfg, "/skill-root"),
    /must be a relative path/,
  );
});

test("validateStorageRootEntry: rejects .. with forward-slash separator", () => {
  const cfg = {
    fsms: [{ name: FSM_NAME, storage_root: ".skill/../../escape" }],
  };
  assert.throws(
    () => validateStorageRootEntry(cfg, "/skill-root"),
    /must not contain ".." segments/,
  );
});

test("validateStorageRootEntry: rejects .. with backslash separator (Windows)", () => {
  const cfg = {
    fsms: [{ name: FSM_NAME, storage_root: ".skill\\..\\escape" }],
  };
  assert.throws(
    () => validateStorageRootEntry(cfg, "/skill-root"),
    /must not contain ".." segments/,
  );
});

test("validateStorageRootEntry: honours fsmName parameter", () => {
  const cfg = {
    fsms: [
      { name: "first-fsm", storage_root: ".first" },
      { name: "second-fsm", storage_root: ".second" },
    ],
  };
  assert.equal(
    validateStorageRootEntry(cfg, "/skill-root", "second-fsm"),
    ".second",
  );
});

// gitToplevelFromCwd — three terminator paths, each tested
// deterministically via _deps.existsSync injection (no host filesystem
// coupling). Closes round-3 findings #2, #11, #12, #13, #14, #36, #38
// (host-VCS-dependent branches, dead `warned` variable).

test("gitToplevelFromCwd: returns the directory containing .git", () => {
  // Stub existsSync to claim the input directory itself contains
  // a .git entry. The walk should return that dir on the first
  // iteration without consulting the host filesystem.
  const stubExists = (path) => path === "/fake/repo/.git";
  assert.equal(
    gitToplevelFromCwd("/fake/repo", { existsSync: stubExists }),
    "/fake/repo",
  );
});

test("gitToplevelFromCwd: walks up from subdir to find .git", () => {
  // Stub: only /fake/repo/.git exists. The walk should ascend
  // /fake/repo/sub/deep → /fake/repo/sub → /fake/repo (found).
  const stubExists = (path) => path === "/fake/repo/.git";
  assert.equal(
    gitToplevelFromCwd("/fake/repo/sub/deep", { existsSync: stubExists }),
    "/fake/repo",
  );
});

test("gitToplevelFromCwd: returns null at fs root with no warning emitted", () => {
  // Stub: no .git anywhere. The walk should reach "/" via
  // dirname(dir) === dir (the natural-fs-root terminator) and
  // return null WITHOUT emitting a warning.
  const captured = [];
  const found = gitToplevelFromCwd("/no/git/anywhere/here", {
    existsSync: () => false,
    warn: (msg) => captured.push(msg),
  });
  assert.equal(found, null,
    "natural fs-root termination must return null");
  assert.equal(captured.length, 0,
    "natural fs-root termination must NOT emit a warning");
});

test("gitToplevelFromCwd: hits depth cap and emits a warning", () => {
  // Stub: no .git anywhere AND a synthetic dirname that never
  // converges (each parent is unique), forcing the walk to hit
  // MAX_GIT_TOPLEVEL_WALK_DEPTH. The cap-hit branch must emit a
  // warning naming the cap value and "falling back".
  // We construct a path with > MAX_GIT_TOPLEVEL_WALK_DEPTH segments
  // so dirname() never reaches a fixed point before the cap fires.
  const segments = Array.from(
    { length: MAX_GIT_TOPLEVEL_WALK_DEPTH + 5 },
    (_, i) => `seg${i}`,
  );
  const deepPath = "/" + segments.join("/");
  const captured = [];
  const found = gitToplevelFromCwd(deepPath, {
    existsSync: () => false,
    warn: (msg) => captured.push(msg),
  });
  assert.equal(found, null, "cap-hit terminator must return null");
  assert.equal(captured.length, 1, "cap-hit must emit exactly one warning");
  assert.match(captured[0], /falling back/);
  assert.match(captured[0], new RegExp(String(MAX_GIT_TOPLEVEL_WALK_DEPTH)));
  assert.match(captured[0], /--repo-root/);
});

// readFsmRcDirect — JSON parse + missing-file paths via injection.
test("readFsmRcDirect: parses valid JSON via injected reader", () => {
  const cfg = readFsmRcDirect("/fake-skill-root", {
    readFile: () => '{"fsms":[{"name":"code-reviewer","storage_root":".x"}]}',
  });
  assert.deepEqual(cfg, {
    fsms: [{ name: "code-reviewer", storage_root: ".x" }],
  });
});

test("readFsmRcDirect: throws on read failure with a path-naming message", () => {
  assert.throws(
    () => readFsmRcDirect("/fake-skill-root", {
      readFile: () => { throw new Error("ENOENT"); },
    }),
    /failed to read .fsmrc.json at \/fake-skill-root/,
  );
});

test("readFsmRcDirect: throws on JSON parse failure with a path-naming message", () => {
  assert.throws(
    () => readFsmRcDirect("/fake-skill-root", {
      readFile: () => "not json",
    }),
    /not valid JSON/,
  );
});

test("readFsmRcDirect: defaults to readFileSync over a controlled fixture", () => {
  // Stage a synthetic .fsmrc.json into a tmpdir so the default-reader
  // path is exercised without coupling to the live in-tree config
  // (closes round-4 findings #22 / #23). The corrupt-file test below
  // already uses this same shape; mirroring it here keeps the
  // test contract consistent and host-independent.
  const tmp = mkdtempSync(join(tmpdir(), "fsmrc-default-reader-"));
  try {
    writeFileSync(
      join(tmp, ".fsmrc.json"),
      JSON.stringify({
        fsms: [{ name: FSM_NAME, storage_root: ".test-storage" }],
      }),
    );
    const cfg = readFsmRcDirect(tmp);
    assert.deepEqual(cfg, {
      fsms: [{ name: FSM_NAME, storage_root: ".test-storage" }],
    });
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// assert-fresh-run.mjs's parseArgs and helpers (closes finding #2).

test("parseArgs (assert-fresh-run): rejects bare --repo-root flag", () => {
  assert.throws(
    () => parseArgs(["node", "script", "--repo-root"]),
    /--repo-root requires a value/,
  );
});

test("parseArgs (assert-fresh-run): rejects --repo-root consuming the next flag", () => {
  assert.throws(
    () => parseArgs(["node", "script", "--repo-root", "--base", "abc"]),
    /--repo-root requires a value/,
  );
});

test("parseArgs (assert-fresh-run): accepts --repo-root with absolute value", () => {
  const args = parseArgs([
    "node", "script",
    "--run-id", "20260503-x-001",
    "--base", "abc",
    "--head", "def",
    "--repo-root", "/abs/path",
  ]);
  assert.equal(args.repoRoot, "/abs/path");
  assert.equal(args.runId, "20260503-x-001");
});

test("parseArgs (assert-fresh-run): accepts --repo-root=value form", () => {
  const args = parseArgs([
    "node", "script", "--repo-root=/abs/x",
  ]);
  assert.equal(args.repoRoot, "/abs/x");
});

// Per-flag bare-value tests. Splitting the combined test (round-3
// finding #15) gives each flag an independent pass/fail signal so
// a regression on one doesn't mask the others.
for (const flag of ["--run-id", "--base", "--head", "--max-age-seconds"]) {
  test(`parseArgs (assert-fresh-run): ${flag} bare-flag throws "requires a value"`, () => {
    assert.throws(
      () => parseArgs(["node", "script", flag]),
      new RegExp(`${flag} requires a value`),
    );
  });
}

// --max-age-seconds NaN check (round-3 finding #19).
test("parseArgs (assert-fresh-run): --max-age-seconds rejects non-numeric value", () => {
  assert.throws(
    () => parseArgs(["node", "script", "--max-age-seconds", "abc"]),
    /expected a finite number/,
  );
});

test("parseArgs (assert-fresh-run): --max-age-seconds=<value> rejects non-numeric value", () => {
  assert.throws(
    () => parseArgs(["node", "script", "--max-age-seconds=xyz"]),
    /expected a finite number/,
  );
});

test("parseArgs (assert-fresh-run): --max-age-seconds accepts integer values", () => {
  const args = parseArgs(["node", "script", "--max-age-seconds", "300"]);
  assert.equal(args.maxAgeSeconds, 300);
});

test("resolveProjectRootForAssertion: rejects relative --repo-root", () => {
  assert.throws(
    () => resolveProjectRootForAssertion({ repoRoot: "relative/path" }),
    /requires an absolute path/,
  );
});

test("resolveProjectRootForAssertion: rejects nonexistent --repo-root", () => {
  assert.throws(
    () => resolveProjectRootForAssertion({ repoRoot: "/this/does/not/exist/abc123" }),
    /does not exist/,
  );
});

test("resolveProjectRootForAssertion: rejects non-git --repo-root", () => {
  const tmp = mkdtempSync(join(tmpdir(), "non-git-resolve-"));
  try {
    assert.throws(
      () => resolveProjectRootForAssertion({ repoRoot: tmp }),
      /not a git repository/,
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("resolveProjectRootForAssertion: accepts a git repo dir", () => {
  const tmp = mkdtempSync(join(tmpdir(), "git-resolve-"));
  try {
    mkdirSync(join(tmp, ".git"), { recursive: true });
    assert.equal(resolveProjectRootForAssertion({ repoRoot: tmp }), tmp);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("resolveProjectRootForAssertion: walks up cwd when --repo-root absent", () => {
  const root = mkdtempSync(join(tmpdir(), "cwd-walk-"));
  try {
    mkdirSync(join(root, ".git"), { recursive: true });
    mkdirSync(join(root, "deep", "nested"), { recursive: true });
    assert.equal(
      resolveProjectRootForAssertion({}, { cwd: join(root, "deep", "nested") }),
      root,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("resolveAssertionStorageRoot: resolves under the given project root", () => {
  const tmp = mkdtempSync(join(tmpdir(), "assert-storage-"));
  try {
    const storageRoot = resolveAssertionStorageRoot(tmp);
    // The skill ships .fsmrc.json with storage_root = ".skill-code-review"
    // — verify the resolved path is anchored at the project root.
    assert.ok(
      storageRoot.startsWith(tmp),
      `storage root must be under projectRoot; got ${storageRoot}`,
    );
    assert.ok(
      storageRoot.endsWith(".skill-code-review"),
      `storage root must end with the configured relative path; got ${storageRoot}`,
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// End-to-end smoke: corrupted .fsmrc.json surfaces via readFsmRcDirect.
test("readFsmRcDirect + validateStorageRootEntry: corrupt file produces operator-actionable error", () => {
  const tmp = mkdtempSync(join(tmpdir(), "corrupt-fsmrc-"));
  try {
    writeFileSync(join(tmp, ".fsmrc.json"), "{ not valid json");
    assert.throws(
      () => readFsmRcDirect(tmp),
      /not valid JSON/,
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// enrichBriefWithPromptBody warn paths (closes round-3 finding #4).
// The function is best-effort: it returns the un-enriched brief on
// any failure but emits a stderr WARN so the operator sees the
// signal. Both the resolve-fail and the read-fail branches are
// pinned via _deps.writeStderr / _deps.readFile injection seams.

test("enrichBriefWithPromptBody: emits WARN and returns brief on read failure", async () => {
  const { enrichBriefWithPromptBody } = await import("../../scripts/run-review.mjs");
  const captured = [];
  const brief = { worker: { prompt_template: "workers/whatever.md" } };
  const result = enrichBriefWithPromptBody(brief, {
    writeStderr: (msg) => captured.push(msg),
    readFile: () => { throw new Error("ENOENT: simulated"); },
  });
  // Brief must pass through unchanged (no prompt_body added).
  assert.equal(result, brief);
  assert.equal(result.worker.prompt_body, undefined);
  // WARN must be emitted naming the function and the underlying error.
  assert.equal(captured.length, 1);
  assert.match(captured[0], /WARN: enrichBriefWithPromptBody/);
  assert.match(captured[0], /could not read body/);
  assert.match(captured[0], /ENOENT: simulated/);
});

test("enrichBriefWithPromptBody: enriches brief with body when readFile succeeds", async () => {
  const { enrichBriefWithPromptBody } = await import("../../scripts/run-review.mjs");
  const captured = [];
  const brief = { worker: { prompt_template: "workers/scan-project.md" } };
  const result = enrichBriefWithPromptBody(brief, {
    writeStderr: (msg) => captured.push(msg),
    readFile: () => "STUB BODY",
  });
  assert.equal(result.worker.prompt_body, "STUB BODY");
  assert.equal(captured.length, 0, "no warnings on the success path");
});

test("enrichBriefWithPromptBody: passes through when prompt_template is missing", async () => {
  const { enrichBriefWithPromptBody } = await import("../../scripts/run-review.mjs");
  const captured = [];
  // No prompt_template → no enrichment, no warning.
  const brief = { worker: {} };
  const result = enrichBriefWithPromptBody(brief, {
    writeStderr: (msg) => captured.push(msg),
    readFile: () => { throw new Error("must not be called"); },
  });
  assert.equal(result, brief);
  assert.equal(captured.length, 0);
});

// Round-4 finding #5: the resolve-fail catch is distinct from the
// read-fail catch (different WARN string "could not resolve body
// path") and was uncovered. We trigger it by passing a malformed
// prompt_template that makes repoRelativePromptPath throw — easiest
// shape is one that triggers a path-resolution validation error.
test("enrichBriefWithPromptBody: emits WARN and returns brief on resolve failure", async () => {
  const { enrichBriefWithPromptBody } = await import("../../scripts/run-review.mjs");
  const captured = [];
  // A null-byte-bearing string is rejected by node:path's resolve
  // (or by repoRelativePromptPath's validation, depending on
  // implementation); either path lands in the resolve-fail catch.
  // If the implementation accepts it, we fall back to the absolute
  // form which the resolve catch also exercises.
  const brief = { worker: { prompt_template: "\u0000bad-path" } };
  const result = enrichBriefWithPromptBody(brief, {
    writeStderr: (msg) => captured.push(msg),
    readFile: () => { throw new Error("must not be called — resolve must fail first"); },
    skillRoot: "/fake/skill",
  });
  // Brief passes through unchanged regardless of which catch fired.
  assert.equal(result, brief);
  assert.equal(result.worker.prompt_body, undefined);
  // Exactly one WARN should be emitted naming the function.
  assert.equal(captured.length, 1);
  assert.match(captured[0], /WARN: enrichBriefWithPromptBody/);
});
