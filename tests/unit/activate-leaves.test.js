// Unit tests for scripts/inline-states/activate-leaves.mjs — the
// inline-state handler that runs the activation gate over every wiki
// leaf BEFORE tree_descend (B6 reframe; PR C of #70 divergence #4).

import { test } from "node:test";
import assert from "node:assert/strict";

import activateLeaves, {
  enumerateWikiLeavesWithActivation,
  fetchDiffText,
  projectV2Fields,
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

test("enumerateWikiLeavesWithActivation: surfaces v2 frontmatter fields when authored (#87)", () => {
  // PR for #87: pre-extract focus / dimensions / audit_surface /
  // languages / tools / tags / covers / type alongside `activation` so
  // the trim worker reads them straight from its brief env instead of
  // doing K Agent Read calls. Until skill-llm-wiki#27 merges and a
  // wiki rebuild ships the v2 fields, only `tags` / `covers` / `type`
  // (the v1 set already preserved by the wiki rebuild) will be
  // populated. The projection in projectV2Fields() drops malformed
  // values per the v2 schema rules, so anything that lands here must
  // already conform.
  const leaves = enumerateWikiLeavesWithActivation(
    new URL("../..", import.meta.url).pathname,
    { useCache: false },
  );
  assert.ok(leaves.length > 0, "wiki should have leaves");
  // Per-field shape rules (mirror projectV2Fields in
  // scripts/inline-states/activate-leaves.mjs):
  //   focus / type:               string
  //   dimensions / audit_surface
  //   / tags / covers:            string[]
  //   tools:                      object[] (each with name / purpose)
  //   languages:                  "all" | non-empty string[]
  for (const leaf of leaves) {
    if (leaf.focus !== undefined) assert.equal(typeof leaf.focus, "string", `${leaf.id}.focus`);
    if (leaf.type !== undefined) assert.equal(typeof leaf.type, "string", `${leaf.id}.type`);
    for (const f of ["dimensions", "audit_surface", "tags", "covers"]) {
      if (leaf[f] === undefined) continue;
      assert.ok(Array.isArray(leaf[f]), `${leaf.id}.${f} must be an array`);
      for (const item of leaf[f]) {
        assert.equal(typeof item, "string", `${leaf.id}.${f}[*] must be a string`);
      }
    }
    if (leaf.tools !== undefined) {
      assert.ok(Array.isArray(leaf.tools), `${leaf.id}.tools must be an array`);
      for (const t of leaf.tools) {
        assert.ok(t !== null && typeof t === "object" && !Array.isArray(t), `${leaf.id}.tools[*] must be an object`);
      }
    }
    if (leaf.languages !== undefined) {
      const ok = leaf.languages === "all" || (Array.isArray(leaf.languages) && leaf.languages.every((x) => typeof x === "string"));
      assert.ok(ok, `${leaf.id}.languages must be \"all\" or string[]`);
    }
  }
  // At least the v1 fields the existing wiki preserves (`tags`,
  // `covers`) MUST be present somewhere, otherwise the projection is
  // broken and not just absent-corpus-data.
  const someTags = leaves.find((l) => Array.isArray(l.tags) && l.tags.length > 0);
  assert.ok(someTags, "expected at least one leaf with tags[] (v1 fields should always be preserved)");
  const someCovers = leaves.find((l) => Array.isArray(l.covers) && l.covers.length > 0);
  assert.ok(someCovers, "expected at least one leaf with covers[] (v1 fields should always be preserved)");
});

test("projectV2Fields: drops malformed values silently per the wiki-leaf contract (#87)", () => {
  // Validation responsibility lives in projectV2Fields, not in the
  // FSM commit step. A malformed corpus leaf (typo in frontmatter,
  // wrong type) gets silently dropped from the projection so the
  // trim worker never sees it and the FSM's response_schema doesn't
  // fault post-hoc on a corpus typo.
  const valid = projectV2Fields({
    focus: "scoped focus string",
    dimensions: ["security", "correctness"],
    audit_surface: ["request_handling"],
    languages: ["typescript", "python"],
    tools: [{ name: "eslint", purpose: "lint JS" }],
    tags: ["solid", "circuit-breaker"],
    covers: ["thing one", "thing two"],
    type: "primary",
  });
  assert.deepEqual(valid, {
    focus: "scoped focus string",
    dimensions: ["security", "correctness"],
    audit_surface: ["request_handling"],
    languages: ["typescript", "python"],
    tools: [{ name: "eslint", purpose: "lint JS" }],
    tags: ["solid", "circuit-breaker"],
    covers: ["thing one", "thing two"],
    type: "primary",
  });
  // languages: "all" is a documented variant.
  assert.deepEqual(projectV2Fields({ languages: "all" }), { languages: "all" });
  // Malformed values are dropped (not propagated).
  const malformed = projectV2Fields({
    focus: 42,                              // wrong type — drop
    dimensions: "not-an-array",             // wrong type — drop
    audit_surface: ["ok", 99],              // mixed types — drop entire array
    languages: "javascript",                // string but not "all" — drop
    tools: [{ name: "ok", purpose: "p" }, { name: "missing-purpose" }], // missing required field — drop entire array
    tags: null,                             // null — drop (treated as omitted)
    covers: ["valid one"],                  // valid — keep
    type: ["primary"],                      // wrong type — drop
    not_in_v2_set: "ignored",               // not in V2_FIELDS — never forwarded
  });
  assert.deepEqual(malformed, { covers: ["valid one"] });
  // null / undefined inputs return {}.
  assert.deepEqual(projectV2Fields(null), {});
  assert.deepEqual(projectV2Fields(undefined), {});
  assert.deepEqual(projectV2Fields("not-an-object"), {});
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
  // PR for #87: activated_leaves[*] forwards the v2 frontmatter fields
  // pre-extracted by enumerateWikiLeavesWithActivation. Until the
  // skill-llm-wiki#27 rebuild ships, dimensions/audit_surface/
  // languages/tools may be absent on every leaf, but the v1 fields
  // (covers/tags) should pass through. Assert the SHAPE: any v2 field
  // present is structurally valid; covers/tags are present somewhere.
  // Per projectV2Fields validation:
  //   focus / type:               string
  //   dimensions / audit_surface
  //   / tags / covers:            string[]
  //   tools:                      object[] (with name + purpose strings)
  //   languages:                  "all" | string[]
  for (const leaf of out1.activated_leaves) {
    if (leaf.focus !== undefined) assert.equal(typeof leaf.focus, "string", `${leaf.id}.focus`);
    if (leaf.type !== undefined) assert.equal(typeof leaf.type, "string", `${leaf.id}.type`);
    for (const f of ["dimensions", "audit_surface", "tags", "covers"]) {
      if (leaf[f] === undefined) continue;
      assert.ok(Array.isArray(leaf[f]), `${leaf.id}.${f} must be an array`);
    }
    if (leaf.tools !== undefined) {
      assert.ok(Array.isArray(leaf.tools), `${leaf.id}.tools must be an array`);
    }
    if (leaf.languages !== undefined) {
      const ok = leaf.languages === "all" || (Array.isArray(leaf.languages) && leaf.languages.every((x) => typeof x === "string"));
      assert.ok(ok, `${leaf.id}.languages must be "all" or string[]`);
    }
  }
  const someCovers = out1.activated_leaves.find((l) => Array.isArray(l.covers) && l.covers.length > 0);
  assert.ok(
    someCovers,
    "expected activated_leaves[*] to forward the leaf's covers[] from frontmatter",
  );
});
