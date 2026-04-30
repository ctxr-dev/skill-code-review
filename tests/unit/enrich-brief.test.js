// Unit tests for enrichBriefWithPromptBody and
// enrichBriefWithSpecialistBodies — the brief-enrichment helpers
// that bake worker prompt bytes (PR A of #70) and per-leaf
// markdown bodies (PR D of #70) into the awaiting_worker brief
// so the orchestrator dispatches without doing separate Reads.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  enrichBriefWithPromptBody,
  enrichBriefWithSpecialistBodies,
} from "../../scripts/run-review.mjs";

test("enrichBriefWithPromptBody: passes through briefs without a worker", () => {
  const brief = { state: "terminal", verdict: "GO" };
  const out = enrichBriefWithPromptBody(brief);
  assert.deepEqual(out, brief);
});

test("enrichBriefWithPromptBody: bakes prompt_body when prompt_template resolves", () => {
  const brief = {
    state: "scan_project",
    worker: {
      role: "project-scanner",
      prompt_template: "workers/project-scanner.md",
    },
    inputs: { args: {} },
  };
  const out = enrichBriefWithPromptBody(brief);
  assert.equal(out.worker.role, "project-scanner");
  assert.equal(typeof out.worker.prompt_body, "string");
  assert.ok(
    out.worker.prompt_body.includes("project-scanner"),
    "prompt_body should contain the worker name from the file body",
  );
  // Original brief is not mutated.
  assert.equal(brief.worker.prompt_body, undefined);
});

test("enrichBriefWithPromptBody: passes through on unreadable prompt_template without faulting", () => {
  const brief = {
    state: "scan_project",
    worker: {
      role: "ghost",
      prompt_template: "workers/no-such-worker.md",
    },
  };
  const out = enrichBriefWithPromptBody(brief);
  assert.equal(out.worker.prompt_body, undefined);
  assert.equal(out.worker.role, "ghost");
});

test("enrichBriefWithSpecialistBodies: passes through non-dispatch_specialists briefs", () => {
  const brief = {
    state: "scan_project",
    inputs: { picked_leaves: [{ id: "a", path: "x.md" }] },
  };
  const out = enrichBriefWithSpecialistBodies(brief);
  assert.deepEqual(out, brief);
});

test("enrichBriefWithSpecialistBodies: bakes leaf bodies for dispatch_specialists", () => {
  const brief = {
    state: "dispatch_specialists",
    worker: { role: "specialist" },
    inputs: {
      picked_leaves: [
        // Use a known leaf path — every leaf under reviewers.wiki/<subcat>/<leaf>.md
        { id: "test-integration", path: "test-tests/test-integration.md", justification: "...", dimensions: ["tests"] },
      ],
    },
  };
  const out = enrichBriefWithSpecialistBodies(brief);
  const leaf = out.inputs.picked_leaves[0];
  assert.equal(typeof leaf.body, "string");
  assert.ok(leaf.body.length > 0);
  assert.ok(
    leaf.body.includes("test-integration"),
    "leaf.body should contain the leaf id from the on-disk frontmatter",
  );
  // Other leaf fields preserved.
  assert.equal(leaf.id, "test-integration");
  assert.equal(leaf.path, "test-tests/test-integration.md");
  assert.equal(leaf.justification, "...");
  assert.deepEqual(leaf.dimensions, ["tests"]);
});

test("enrichBriefWithSpecialistBodies: surfaces activation.file_globs[] from leaf frontmatter (#83)", () => {
  // Regression: if extractFileGlobs ever silently fails (line-ending
  // change, regex tweak, etc.), the per-leaf filtered-diff in the
  // staged prompt falls back to the full diff and the token-saving
  // win of #83 evaporates with no surfaced error. Lock the contract
  // down here against a stable corpus leaf.
  const brief = {
    state: "dispatch_specialists",
    inputs: {
      picked_leaves: [
        { id: "test-integration", path: "test-tests/test-integration.md" },
      ],
    },
  };
  const out = enrichBriefWithSpecialistBodies(brief);
  const leaf = out.inputs.picked_leaves[0];
  assert.ok(Array.isArray(leaf.file_globs), "file_globs should be an array");
  assert.ok(leaf.file_globs.length > 0, "file_globs should be non-empty for this corpus leaf");
  // The known frontmatter for test-integration declares these globs.
  // We assert that at least one canonical glob is present (rather
  // than an exact match) so a corpus rebuild that adds globs doesn't
  // break this test.
  assert.ok(
    leaf.file_globs.some((g) => g === "**/*integration*"),
    "expected `**/*integration*` glob from test-integration frontmatter",
  );
});

test("enrichBriefWithSpecialistBodies: passes through unreadable leaf without faulting", () => {
  const brief = {
    state: "dispatch_specialists",
    inputs: {
      picked_leaves: [
        { id: "real", path: "test-tests/test-integration.md" },
        { id: "ghost", path: "no-such/leaf.md" },
      ],
    },
  };
  const out = enrichBriefWithSpecialistBodies(brief);
  assert.equal(typeof out.inputs.picked_leaves[0].body, "string");
  assert.equal(out.inputs.picked_leaves[1].body, undefined);
  assert.equal(out.inputs.picked_leaves[1].id, "ghost");
});

test("enrichBriefWithSpecialistBodies: passes through dispatch_specialists with empty picked_leaves", () => {
  const brief = {
    state: "dispatch_specialists",
    inputs: { picked_leaves: [] },
  };
  const out = enrichBriefWithSpecialistBodies(brief);
  assert.deepEqual(out.inputs.picked_leaves, []);
});
