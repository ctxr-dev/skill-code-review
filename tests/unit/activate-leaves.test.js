// Unit tests for scripts/inline-states/activate-leaves.mjs — the
// inline-state handler that runs the activation gate over every wiki
// leaf BEFORE tree_descend (B6 reframe; PR C of #70 divergence #4).

import { test } from "node:test";
import assert from "node:assert/strict";

import activateLeaves, {
  enumerateWikiLeavesWithActivation,
  fetchDiffText,
} from "../../scripts/inline-states/activate-leaves.mjs";

test("enumerateWikiLeavesWithActivation: walks the corpus and returns leaves with activation blocks", () => {
  const leaves = enumerateWikiLeavesWithActivation(
    new URL("../..", import.meta.url).pathname,
    { useCache: false },
  );
  assert.ok(leaves.length > 0, "wiki should have at least one leaf");
  // All entries have a string id and a path.
  for (const leaf of leaves) {
    assert.equal(typeof leaf.id, "string");
    assert.match(leaf.id, /^[a-z][a-z0-9-]*$/);
    assert.equal(typeof leaf.path, "string");
    assert.ok(leaf.path.endsWith(".md"));
  }
  // Ids are unique.
  const ids = new Set(leaves.map((l) => l.id));
  assert.equal(ids.size, leaves.length, "leaf ids must be unique");
  // Sorted by id (deterministic ordering).
  for (let i = 1; i < leaves.length; i++) {
    assert.ok(leaves[i - 1].id <= leaves[i].id, `not sorted at index ${i}`);
  }
  // At least one leaf has an activation block (otherwise the gate is a
  // no-op and this test is a tautology).
  const withActivation = leaves.filter((l) => l.activation);
  assert.ok(withActivation.length > 0, "expected at least one leaf with activation:");
});

test("fetchDiffText: returns empty string on missing/invalid SHAs without throwing", () => {
  // Use sha-shaped strings that are valid but don't exist in the repo.
  const text = fetchDiffText(
    "0000000000000000000000000000000000000001",
    "0000000000000000000000000000000000000002",
    new URL("../..", import.meta.url).pathname,
  );
  assert.equal(typeof text, "string");
  assert.equal(text, "", "expected empty string on git diff failure");
});

test("activateLeaves: empty changed_paths still produces a structurally valid output", async () => {
  const out = await activateLeaves({
    env: {
      project_profile: { languages: ["javascript"] },
      changed_paths: [],
      args: {},
      base_sha: null,
      head_sha: null,
    },
  });
  assert.ok(Array.isArray(out.activated_leaves));
  // No diff body, no changed paths → no file_globs / keyword_matches /
  // structural_signals fire, no leaves activated.
  // (structural_signals could fire on language=javascript — but only if
  // some leaf declares "javascript" in its activation.structural_signals[].
  // The test just asserts the output shape is valid.)
  for (const leaf of out.activated_leaves) {
    assert.equal(typeof leaf.id, "string");
    assert.equal(typeof leaf.path, "string");
    assert.ok(Array.isArray(leaf.activation_match));
    assert.ok(leaf.activation_match.length > 0);
    for (const sig of leaf.activation_match) {
      assert.ok(
        ["file_globs", "keyword_matches", "structural_signals", "escalation_from"].includes(sig),
        `unknown signal: ${sig}`,
      );
    }
  }
});

test("activateLeaves: file_globs activation fires deterministically on a JS-shaped diff", async () => {
  // Use changed_paths shaped like the actual PR A diff. file_globs
  // covering **/*.mjs / **/*.js will fire for any leaf with those globs.
  const out1 = await activateLeaves({
    env: {
      project_profile: { languages: ["javascript"] },
      changed_paths: ["scripts/run-review.mjs", "tests/integration/end-to-end-runner.test.js"],
      args: {},
      base_sha: null,
      head_sha: null,
    },
  });
  const out2 = await activateLeaves({
    env: {
      project_profile: { languages: ["javascript"] },
      changed_paths: ["scripts/run-review.mjs", "tests/integration/end-to-end-runner.test.js"],
      args: {},
      base_sha: null,
      head_sha: null,
    },
  });
  // Determinism: identical input → byte-identical output (modulo array
  // order, which the gate sorts).
  assert.deepEqual(
    out1.activated_leaves.map((l) => l.id),
    out2.activated_leaves.map((l) => l.id),
    "two identical runs must produce identical activated_leaves",
  );
  // At least one JS-relevant leaf activated.
  assert.ok(
    out1.activated_leaves.length > 0,
    "expected at least one leaf to activate on JS-shaped diff",
  );
});
