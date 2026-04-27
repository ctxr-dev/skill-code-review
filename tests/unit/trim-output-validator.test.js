// Tests for the B8 referential-integrity validator. Each violation class
// gets its own fixture; the validator must surface a specific error per
// class, and a fully-valid fixture must produce { ok: true, errors: [] }.
//
// Hermetic by construction: the test suite builds a synthetic
// reviewers.wiki/ tree under a per-test-process temp directory and runs
// every assertion against that. No assumption about which leaf ids the
// real corpus carries today — wiki reorganizations / renames don't break
// this suite.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

import { validateTrimOutput } from "../../scripts/lib/trim-output-validator.mjs";

// Reserve a portable, definitely-empty repo root for tests that need a
// repoRoot which does NOT contain reviewers.wiki/. mkdtempSync + rmSync
// gives a path that's guaranteed unique AND not on disk — works on
// Windows + POSIX, and never collides with an existing tree.
const _t = mkdtempSync(join(tmpdir(), "trim-validator-no-wiki-"));
rmSync(_t, { recursive: true, force: true });
const NONEXISTENT_REPO_ROOT = _t;
if (existsSync(NONEXISTENT_REPO_ROOT)) {
  throw new Error("test setup failed: NONEXISTENT_REPO_ROOT still exists");
}

// Synthetic wiki: 3 leaves under deterministic paths. Using made-up ids
// (`fake-lang`, `fake-sec`, `fake-rejected`) keeps the assertions
// independent of the real corpus.
let HERMETIC_REPO_ROOT;

function writeLeaf(repoRoot, relPath, id) {
  const abs = join(repoRoot, "reviewers.wiki", relPath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(
    abs,
    `---\nid: ${id}\ntype: leaf\n---\n\n# ${id}\n`,
  );
}

before(() => {
  HERMETIC_REPO_ROOT = mkdtempSync(join(tmpdir(), "trim-validator-hermetic-"));
  writeLeaf(HERMETIC_REPO_ROOT, "cluster-a/fake-lang.md", "fake-lang");
  writeLeaf(HERMETIC_REPO_ROOT, "cluster-b/fake-sec.md", "fake-sec");
  writeLeaf(HERMETIC_REPO_ROOT, "cluster-b/fake-rejected.md", "fake-rejected");
  // Second copy of fake-lang under cluster-b/ so the duplicate-stage-A
  // test can pick a real, on-disk leaf and exercise class 3 alone (not
  // accidentally fail on class 2 because the file doesn't exist).
  writeLeaf(HERMETIC_REPO_ROOT, "cluster-b/fake-lang.md", "fake-lang");
});

after(() => {
  if (HERMETIC_REPO_ROOT) rmSync(HERMETIC_REPO_ROOT, { recursive: true, force: true });
});

const VALID_ENV = {
  stage_a_candidates: [
    { id: "fake-lang", path: "cluster-a/fake-lang.md", activation_match: ["file_globs"] },
    { id: "fake-sec", path: "cluster-b/fake-sec.md", activation_match: ["file_globs"] },
    { id: "fake-rejected", path: "cluster-b/fake-rejected.md", activation_match: ["file_globs"] },
  ],
  changed_paths: ["src/api/auth.ts", "src/util/jwt.ts"],
};

function validOutputs() {
  return {
    picked_leaves: [
      { id: "fake-lang", path: "cluster-a/fake-lang.md", justification: "ok", dimensions: ["correctness"] },
      { id: "fake-sec", path: "cluster-b/fake-sec.md", justification: "ok", dimensions: ["security"] },
    ],
    rejected_leaves: [{ id: "fake-rejected", reason: "low signal" }],
    coverage_rescues: [
      { file: "src/api/auth.ts", rescued_leaf: "fake-rejected", reason: "rescue" },
    ],
  };
}

function hermeticOpts(extra = {}) {
  return { repoRoot: HERMETIC_REPO_ROOT, ...extra };
}

test("validateTrimOutput: a fully-valid fixture passes", () => {
  const result = validateTrimOutput(validOutputs(), VALID_ENV, hermeticOpts());
  assert.deepEqual(result, { ok: true, errors: [] });
});

test("validateTrimOutput: rejects picked_leaves[].id not in wiki (class 1)", () => {
  const out = validOutputs();
  out.picked_leaves[0].id = "nonexistent-leaf-id";
  const result = validateTrimOutput(out, VALID_ENV, hermeticOpts());
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some((e) => e.includes("nonexistent-leaf-id") && e.includes("reviewers.wiki")),
    "expected an error mentioning the fabricated id and wiki",
  );
});

test("validateTrimOutput: rejects picked_leaves[].path that doesn't resolve (class 2)", () => {
  const out = validOutputs();
  out.picked_leaves[0].path = "made-up/does-not-exist.md";
  const result = validateTrimOutput(out, VALID_ENV, {
    repoRoot: NONEXISTENT_REPO_ROOT,
    knownLeafIds: ["fake-lang", "fake-sec", "fake-rejected"],
  });
  // knownLeafIds short-circuits class 1 (the validator accepts the
  // explicit allow-list as the source of truth); the nonexistent
  // repo root drives every wiki-path resolution to fail (class 2).
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some((e) => e.includes("does not resolve to a real wiki file")),
    `expected a path-resolution error, got: ${result.errors.join("; ")}`,
  );
});

test("validateTrimOutput: class 2 rejects non-leaf wiki paths (index.md, dotfiles, non-md)", () => {
  // A path that resolves to a real file under reviewers.wiki/ but isn't
  // a leaf (cluster index, dotfile, non-markdown) must NOT pass class 2.
  // Without this, a worker could fabricate
  // `picked_leaves[].path = "cluster-a/index.md"` and bypass the gate.
  const indexPath = join(HERMETIC_REPO_ROOT, "reviewers.wiki", "cluster-a", "index.md");
  const dotPath = join(HERMETIC_REPO_ROOT, "reviewers.wiki", "cluster-a", ".gitignore");
  const txtPath = join(HERMETIC_REPO_ROOT, "reviewers.wiki", "cluster-a", "notes.txt");
  writeFileSync(indexPath, "---\nid: index\ntype: cluster\n---\n");
  writeFileSync(dotPath, "");
  writeFileSync(txtPath, "scratch");
  for (const badPath of ["cluster-a/index.md", "cluster-a/.gitignore", "cluster-a/notes.txt"]) {
    const out = {
      picked_leaves: [{ id: "fake-lang", path: badPath, justification: "x", dimensions: [] }],
      rejected_leaves: [],
      coverage_rescues: [],
    };
    const result = validateTrimOutput(out, VALID_ENV, hermeticOpts());
    assert.equal(result.ok, false);
    assert.ok(
      result.errors.some((e) => e.includes("does not resolve to a real wiki file")),
      `expected class-2 rejection for non-leaf path "${badPath}", got: ${result.errors.join("; ")}`,
    );
  }
});

test("validateTrimOutput: rejects picked_leaves not in stage_a_candidates (class 3, id mismatch)", () => {
  // fake-sec is a real wiki id and resolves to a real file — but it is NOT
  // in stage_a_candidates for this scenario. Class 1 + class 2 must both
  // pass; class 3 is the only thing catching this fabrication.
  const env = {
    stage_a_candidates: [
      { id: "fake-lang", path: "cluster-a/fake-lang.md" },
    ],
    changed_paths: [],
  };
  const out = {
    picked_leaves: [
      { id: "fake-sec", path: "cluster-b/fake-sec.md", justification: "x", dimensions: [] },
    ],
    rejected_leaves: [],
    coverage_rescues: [],
  };
  const result = validateTrimOutput(out, env, hermeticOpts());
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some(
      (e) => e.includes("fake-sec") && e.includes("not in stage_a_candidates"),
    ),
    `expected a stage-A-candidate membership error, got: ${result.errors.join("; ")}`,
  );
});

test("validateTrimOutput: rejects picked_leaves with wrong path for the id (class 3, path mismatch)", () => {
  // Both id (fake-lang) and path (cluster-b/fake-sec.md) are individually
  // valid wiki entries, but the pair doesn't match: stage_a declared
  // fake-lang at cluster-a/fake-lang.md.
  const out = validOutputs();
  out.picked_leaves[0].path = "cluster-b/fake-sec.md";
  const result = validateTrimOutput(out, VALID_ENV, hermeticOpts());
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some(
      (e) => e.includes("fake-lang") && e.includes("does not match any stage_a_candidates entry path"),
    ),
    `expected an id↔path pair-mismatch error, got: ${result.errors.join("; ")}`,
  );
});

test("validateTrimOutput: pair check is order-independent under duplicate stage_a ids", () => {
  // stage_a_candidates is a list, not a map. The same id may legitimately
  // appear with multiple paths. The pair check must accept ANY declared
  // {id, path} pair — a Map keyed only by id would have been
  // order-dependent (last write wins) and could mis-match a picked leaf
  // against the wrong path.
  const env = {
    stage_a_candidates: [
      { id: "fake-lang", path: "cluster-a/fake-lang.md" },
      { id: "fake-lang", path: "cluster-b/fake-lang.md" },
    ],
    changed_paths: [],
  };
  // Picking the SECOND declared path must pass even though a Map keyed
  // only by id would have remembered the first.
  const out = {
    picked_leaves: [
      { id: "fake-lang", path: "cluster-b/fake-lang.md", justification: "x", dimensions: [] },
    ],
    rejected_leaves: [],
    coverage_rescues: [],
  };
  const result = validateTrimOutput(out, env, hermeticOpts());
  const class3Errors = result.errors.filter((e) =>
    e.includes("not in stage_a_candidates") || e.includes("does not match"),
  );
  assert.deepEqual(class3Errors, [], `duplicate stage_a id pair check must succeed: ${result.errors.join("; ")}`);
});

test("validateTrimOutput: pair check accepts cosmetic 'reviewers.wiki/' prefix on stage_a path", () => {
  // Stage-A may emit either wiki-relative or repo-relative paths;
  // normalizeWikiPath collapses them. Same effective path must match.
  const env = {
    stage_a_candidates: [
      { id: "fake-lang", path: "reviewers.wiki/cluster-a/fake-lang.md" },
    ],
    changed_paths: [],
  };
  const out = {
    picked_leaves: [
      { id: "fake-lang", path: "cluster-a/fake-lang.md", justification: "x", dimensions: [] },
    ],
    rejected_leaves: [],
    coverage_rescues: [],
  };
  const result = validateTrimOutput(out, env, hermeticOpts());
  const class3Errors = result.errors.filter((e) =>
    e.includes("not in stage_a_candidates") || e.includes("does not match any stage_a_candidates entry path"),
  );
  assert.deepEqual(class3Errors, [], `prefix-normalized paths must not trigger class 3: ${result.errors.join("; ")}`);
});

test("validateTrimOutput: rejects rejected_leaves[].id not in stage_a_candidates (class 4)", () => {
  const out = validOutputs();
  out.rejected_leaves.push({ id: "phantom-rejected", reason: "?" });
  const result = validateTrimOutput(out, VALID_ENV, hermeticOpts());
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some(
      (e) => e.includes("phantom-rejected") && e.includes("stage_a_candidates"),
    ),
    "expected a stage_a_candidates membership error",
  );
});

test("validateTrimOutput: rejects coverage_rescues[].file not in changed_paths (class 5)", () => {
  const out = validOutputs();
  out.coverage_rescues[0].file = "not-in-the-diff.ts";
  const result = validateTrimOutput(out, VALID_ENV, hermeticOpts());
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some(
      (e) => e.includes("not-in-the-diff.ts") && e.includes("changed_paths"),
    ),
    "expected a changed_paths membership error",
  );
});

test("validateTrimOutput: rejects coverage_rescues[].rescued_leaf not in rejected_leaves (class 6)", () => {
  const out = validOutputs();
  out.coverage_rescues[0].rescued_leaf = "leaf-the-trim-worker-imagined";
  const result = validateTrimOutput(out, VALID_ENV, hermeticOpts());
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some(
      (e) =>
        e.includes("leaf-the-trim-worker-imagined") && e.includes("rejected_leaves"),
    ),
    "expected a rescued_leaf ↔ rejected_leaves[] cross-ref error",
  );
});

test("validateTrimOutput: collects ALL violations in a single pass (multi-class)", () => {
  const out = {
    picked_leaves: [{ id: "fabricated-id", path: "fabricated.md", justification: "x", dimensions: [] }],
    rejected_leaves: [{ id: "phantom-rejected", reason: "?" }],
    coverage_rescues: [
      { file: "not-in-diff.ts", rescued_leaf: "leaf-the-trim-worker-imagined", reason: "?" },
    ],
  };
  const result = validateTrimOutput(out, VALID_ENV, hermeticOpts());
  assert.equal(result.ok, false);
  assert.ok(result.errors.length >= 5, `expected ≥5 errors, got ${result.errors.length}: ${result.errors.join("; ")}`);
});

test("validateTrimOutput: non-trim output (no picked_leaves) is a no-op", () => {
  const result = validateTrimOutput({ stage_a_candidates: [] }, VALID_ENV, hermeticOpts());
  assert.deepEqual(result, { ok: true, errors: [] });
});

test("validateTrimOutput: missing fields on a trim output produce specific errors", () => {
  const out = {
    picked_leaves: [{}, { id: "fake-other" }], // missing id, missing path
    rejected_leaves: [{}],
    coverage_rescues: [{}],
  };
  const result = validateTrimOutput(out, VALID_ENV, hermeticOpts());
  assert.equal(result.ok, false);
  const joined = result.errors.join(" || ");
  assert.match(joined, /missing string `id`/);
  assert.match(joined, /missing or not a string|does not resolve/);
  assert.match(joined, /missing string `file`/);
  assert.match(joined, /missing string `rescued_leaf`/);
});
