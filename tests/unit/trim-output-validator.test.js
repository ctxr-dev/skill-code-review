// Tests for the B8 referential-integrity validator. Each violation class
// gets its own fixture; the validator must surface a specific error per
// class, and a fully-valid fixture must produce { ok: true, errors: [] }.

import { test } from "node:test";
import assert from "node:assert/strict";

import { validateTrimOutput } from "../../scripts/lib/trim-output-validator.mjs";

// Use real wiki ids + paths so the file-resolution check (class 2) doesn't
// false-fail the valid fixture. lang-typescript is committed at
// reviewers.wiki/formatter-eslint/lang-typescript.md; sec-csrf and
// sec-idor-and-mass-assignment live under reviewers.wiki/csrf-missing/.
// Picking three real leaves keeps the fixture self-contained and
// independent of the wiki's ongoing growth.
const KNOWN_IDS = ["lang-typescript", "sec-csrf", "sec-idor-and-mass-assignment"];

const VALID_ENV = {
  stage_a_candidates: [
    { id: "lang-typescript", path: "formatter-eslint/lang-typescript.md", activation_match: ["file_globs"] },
    { id: "sec-csrf", path: "csrf-missing/sec-csrf.md", activation_match: ["file_globs"] },
    { id: "sec-idor-and-mass-assignment", path: "csrf-missing/sec-idor-and-mass-assignment.md", activation_match: ["file_globs"] },
  ],
  changed_paths: ["src/api/auth.ts", "src/util/jwt.ts"],
};

function validOutputs() {
  return {
    picked_leaves: [
      { id: "lang-typescript", path: "formatter-eslint/lang-typescript.md", justification: "ok", dimensions: ["correctness"] },
      { id: "sec-csrf", path: "csrf-missing/sec-csrf.md", justification: "ok", dimensions: ["security"] },
    ],
    rejected_leaves: [{ id: "sec-idor-and-mass-assignment", reason: "low signal" }],
    coverage_rescues: [
      { file: "src/api/auth.ts", rescued_leaf: "sec-idor-and-mass-assignment", reason: "rescue" },
    ],
  };
}

test("validateTrimOutput: a fully-valid fixture passes", () => {
  const result = validateTrimOutput(validOutputs(), VALID_ENV, { knownLeafIds: KNOWN_IDS });
  assert.deepEqual(result, { ok: true, errors: [] });
});

test("validateTrimOutput: rejects picked_leaves[].id not in wiki (class 1)", () => {
  const out = validOutputs();
  out.picked_leaves[0].id = "nonexistent-leaf-id";
  const result = validateTrimOutput(out, VALID_ENV, { knownLeafIds: KNOWN_IDS });
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
    knownLeafIds: KNOWN_IDS,
    repoRoot: "/tmp/nonexistent-repo-root-for-test",
  });
  // `knownLeafIds` short-circuits the class-1 wiki walk (the validator
  // accepts the explicit allow-list as the source of truth), so this
  // case targets the class-2 path-resolution check exclusively. With a
  // nonexistent repo root, every wiki-path resolution must fail and
  // surface a "does not resolve to a real wiki file" error.
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some((e) => e.includes("does not resolve to a real wiki file")),
    `expected a path-resolution error, got: ${result.errors.join("; ")}`,
  );
});

test("validateTrimOutput: rejects rejected_leaves[].id not in stage_a_candidates (class 3)", () => {
  const out = validOutputs();
  out.rejected_leaves.push({ id: "phantom-rejected", reason: "?" });
  const result = validateTrimOutput(out, VALID_ENV, { knownLeafIds: KNOWN_IDS });
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some(
      (e) => e.includes("phantom-rejected") && e.includes("stage_a_candidates"),
    ),
    "expected a stage_a_candidates membership error",
  );
});

test("validateTrimOutput: rejects coverage_rescues[].file not in changed_paths (class 4)", () => {
  const out = validOutputs();
  out.coverage_rescues[0].file = "not-in-the-diff.ts";
  const result = validateTrimOutput(out, VALID_ENV, { knownLeafIds: KNOWN_IDS });
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some(
      (e) => e.includes("not-in-the-diff.ts") && e.includes("changed_paths"),
    ),
    "expected a changed_paths membership error",
  );
});

test("validateTrimOutput: rejects coverage_rescues[].rescued_leaf not in rejected_leaves (class 5)", () => {
  const out = validOutputs();
  out.coverage_rescues[0].rescued_leaf = "leaf-the-trim-worker-imagined";
  const result = validateTrimOutput(out, VALID_ENV, { knownLeafIds: KNOWN_IDS });
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
  const result = validateTrimOutput(out, VALID_ENV, { knownLeafIds: KNOWN_IDS });
  assert.equal(result.ok, false);
  // Expect at least 5 errors (one per class). Path check may add one more.
  assert.ok(result.errors.length >= 5, `expected ≥5 errors, got ${result.errors.length}: ${result.errors.join("; ")}`);
});

test("validateTrimOutput: non-trim output (no picked_leaves) is a no-op", () => {
  // The validator only fires for outputs that look like trim output. A
  // shape-mismatch from another worker should not raise spurious errors.
  const result = validateTrimOutput({ stage_a_candidates: [] }, VALID_ENV, {
    knownLeafIds: KNOWN_IDS,
  });
  assert.deepEqual(result, { ok: true, errors: [] });
});

test("validateTrimOutput: missing fields on a trim output produce specific errors", () => {
  const out = {
    picked_leaves: [{}, { id: "sec-jwt-tokens" }], // missing id, missing path
    rejected_leaves: [{}],
    coverage_rescues: [{}],
  };
  const result = validateTrimOutput(out, VALID_ENV, { knownLeafIds: KNOWN_IDS });
  assert.equal(result.ok, false);
  // "missing string `id`" hits picked_leaves and rejected_leaves; "missing string `file`" / `rescued_leaf` hit coverage_rescues; path missing on the second picked leaf.
  const joined = result.errors.join(" || ");
  assert.match(joined, /missing string `id`/);
  assert.match(joined, /missing or not a string|does not resolve/);
  assert.match(joined, /missing string `file`/);
  assert.match(joined, /missing string `rescued_leaf`/);
});
