// Unit tests for the dispatch-prompt staging helpers (#79):
//   - defaultDispatchPromptPath              — canonical path computation
//   - buildDispatchPromptText                — pure text composition
//   - writeDispatchPromptToDisk              — atomic single-file write
//   - writeSpecialistPromptsToDisk           — K-files-per-pause for dispatch_specialists

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname } from "node:path";

import {
  defaultDispatchPromptPath,
  buildDispatchPromptText,
  writeDispatchPromptToDisk,
  writeSpecialistPromptsToDisk,
} from "../../scripts/run-review.mjs";

test("defaultDispatchPromptPath: returns null on missing run_id or state", () => {
  assert.equal(defaultDispatchPromptPath(null, "scan_project"), null);
  assert.equal(defaultDispatchPromptPath("20260429-200856-cece84b", null), null);
});

test("defaultDispatchPromptPath: standard worker path ends with <state>-dispatch-prompt.md", () => {
  const path = defaultDispatchPromptPath("20260429-200856-cece84b", "tree_descend");
  assert.ok(
    path.endsWith("workers/tree_descend-dispatch-prompt.md"),
    `unexpected suffix: ${path}`,
  );
});

test("defaultDispatchPromptPath: dispatch_specialists per-leaf path ends with prompt-<leaf-id>.md", () => {
  const path = defaultDispatchPromptPath(
    "20260429-200856-cece84b",
    "dispatch_specialists",
    "lang-javascript",
  );
  assert.ok(
    path.endsWith("workers/dispatch_specialists-prompt-lang-javascript.md"),
    `unexpected suffix: ${path}`,
  );
});

test("defaultDispatchPromptPath: rejects malformed leaf-ids (path traversal guard)", () => {
  assert.equal(
    defaultDispatchPromptPath("20260429-200856-cece84b", "dispatch_specialists", "../etc/passwd"),
    null,
  );
  assert.equal(
    defaultDispatchPromptPath("20260429-200856-cece84b", "dispatch_specialists", "leaf/with/slash"),
    null,
  );
  assert.equal(
    defaultDispatchPromptPath("20260429-200856-cece84b", "dispatch_specialists", "Has-Uppercase"),
    null,
  );
});

test("defaultDispatchPromptPath: dispatch_specialists is strictly per-leaf (rejects missing leaf-id)", () => {
  // Regression for the second-round Copilot review on PR #80: previously a
  // call with state="dispatch_specialists" and no/empty leafId fell back
  // to the generic "<state>-dispatch-prompt.md" path that
  // writeSpecialistPromptsToDisk does not produce. Strict branch now
  // returns null and forces callers to supply a valid leaf-id.
  assert.equal(
    defaultDispatchPromptPath("20260429-200856-cece84b", "dispatch_specialists", undefined),
    null,
  );
  assert.equal(
    defaultDispatchPromptPath("20260429-200856-cece84b", "dispatch_specialists", ""),
    null,
  );
  assert.equal(
    defaultDispatchPromptPath("20260429-200856-cece84b", "dispatch_specialists", null),
    null,
  );
});

test("buildDispatchPromptText: standard worker — embeds prompt_body, INPUTS, OUTPUTS PATH", () => {
  const brief = {
    has_worker: true,
    state: "scan_project",
    worker: {
      role: "project-scanner",
      inputs: ["args"],
      prompt_body: "# Worker: project-scanner\n\nDo the thing.",
    },
    inputs: { args: { foo: "bar" } },
    outputs_path: "/run/dir/workers/scan_project-output.json",
  };
  const text = buildDispatchPromptText(brief);
  assert.match(text, /# Worker: project-scanner/);
  assert.match(text, /--- INPUTS \(from FSM env\) ---/);
  assert.match(text, /args = \{[\s\S]*"foo"[\s\S]*"bar"/);
  assert.match(text, /--- OUTPUTS PATH ---/);
  assert.match(text, /\/run\/dir\/workers\/scan_project-output\.json/);
});

test("buildDispatchPromptText: standard worker — embeds RESPONSE SCHEMA when brief carries one (#85)", () => {
  // Regression: previously the prompt's tail said "matching the
  // response_schema in your prompt above" but no schema was embedded,
  // and workers schema-faulted on first attempt. Lock the contract:
  // when brief.worker.response_schema is present, the staged prompt
  // emits a verbatim "--- RESPONSE SCHEMA ---" block.
  const brief = {
    has_worker: true,
    state: "scan_project",
    worker: {
      role: "project-scanner",
      inputs: ["args"],
      prompt_body: "# Worker: project-scanner",
      response_schema: {
        type: "object",
        required: ["project_profile"],
        properties: {
          project_profile: {
            type: "object",
            required: ["languages"],
            properties: {
              languages: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
    },
    inputs: { args: {} },
    outputs_path: "/run/dir/workers/scan_project-output.json",
  };
  const text = buildDispatchPromptText(brief);
  assert.match(text, /--- RESPONSE SCHEMA \(your JSON output must match this\) ---/);
  assert.match(text, /"required":\s*\[\s*"project_profile"/);
  assert.match(text, /"languages":\s*\{\s*"type":\s*"array"/);
  // OUTPUTS PATH preamble now references the schema section directly
  // (replacing the misleading "in your prompt above" wording).
  assert.match(text, /matching the RESPONSE SCHEMA above/);
  assert.doesNotMatch(text, /response_schema in your prompt above/);
});

test("buildDispatchPromptText: standard worker — falls back gracefully when brief omits response_schema", () => {
  // No FSM state today omits response_schema, but the prompt builder
  // shouldn't break if a future state intentionally goes schema-less.
  const brief = {
    has_worker: true,
    state: "future_schemaless_state",
    worker: { role: "x", inputs: [], prompt_body: "# X" },
    inputs: {},
    outputs_path: "/run/dir/workers/future-output.json",
  };
  const text = buildDispatchPromptText(brief);
  assert.match(text, /--- OUTPUTS PATH ---/);
  assert.doesNotMatch(text, /--- RESPONSE SCHEMA/);
  assert.match(text, /Write your JSON response to:/);
});

test("buildDispatchPromptText: per-specialist (no opts.filteredDiff) — emits FILTERED DIFF placeholder; checks leaf id/path/dimensions/file_globs/body, project_profile, changed_paths shape", () => {
  const brief = {
    has_worker: true,
    state: "dispatch_specialists",
    worker: {
      role: "specialist",
      inputs: ["project_profile", "changed_paths", "picked_leaves", "tool_results"],
      prompt_body: "# Worker: specialist\n\nReview blindly.",
    },
    inputs: {
      project_profile: { languages: ["javascript"] },
      changed_paths: ["src/foo.js", "tests/foo.test.js"],
      tool_results: [],
      picked_leaves: [],
    },
    outputs_path: "/run/dir/workers/dispatch_specialists-output.json",
  };
  const leaf = {
    id: "lang-javascript",
    path: "tasks-task/lang-javascript.md",
    dimensions: ["correctness"],
    file_globs: ["**/*.js", "**/*.mjs"],
    body: "# Lang JavaScript\n\nFlag use-after-await.",
  };
  // No baseSha / headSha → builder emits the "(diff unavailable…)"
  // placeholder. That preserves a stable section header for unit tests
  // without spawning git.
  const text = buildDispatchPromptText(brief, { leaf });
  assert.match(text, /# Worker: specialist/);
  assert.match(text, /--- THIS SPECIALIST ---/);
  assert.match(text, /id = lang-javascript/);
  assert.match(text, /path = tasks-task\/lang-javascript\.md/);
  assert.match(text, /dimensions = \["correctness"\]/);
  // PR for #83: file_globs surfaced inline so the specialist can see
  // exactly which paths the runner used to scope the diff. (Audit
  // surface for the per-leaf-filtered-diffs change.)
  assert.match(text, /file_globs = \["\*\*\/\*\.js","\*\*\/\*\.mjs"\]/);
  assert.match(text, /--- LEAF BODY ---/);
  assert.match(text, /Flag use-after-await/);
  assert.match(text, /--- PROJECT PROFILE ---/);
  assert.match(text, /"languages":\s*\[\s*"javascript"/);
  assert.match(text, /--- CHANGED PATHS ---/);
  assert.match(text, /"src\/foo\.js"/);
  // PR for #83: header is no longer "(orchestrator appends below)" —
  // the runner pre-computes the diff. buildDispatchPromptText is pure;
  // the side-effecting computeFilteredDiff lives in
  // writeSpecialistPromptsToDisk. When the unit test doesn't pass
  // opts.filteredDiff, the builder emits a stable placeholder.
  assert.match(text, /--- FILTERED DIFF ---/);
  assert.doesNotMatch(text, /orchestrator appends below/);
  assert.match(text, /\(diff unavailable: caller did not pre-compute the per-leaf diff\)/);
  // Per-specialist response contract: return JSON to the orchestrator,
  // do NOT write to outputs_path (the orchestrator aggregates K
  // responses and writes once). Outputs_path is mentioned in the
  // audit-context line but the instruction is "do not write to disk".
  assert.match(text, /--- RESPONSE CONTRACT ---/);
  assert.match(text, /Do NOT write to disk/);
  assert.match(text, /the orchestrator aggregates the K responses/);
});

test("defaultDispatchPromptPath: rejects unsafe state segments (path traversal guard on state)", () => {
  // Round-3 review: state was concatenated into a path without
  // validation. A tampered manifest with state="../../etc/passwd"
  // would otherwise let --print-dispatch-prompt walk outside <run_dir>.
  // Allowed state shape: ^[a-z][a-z0-9_]*$ (snake_case ascii).
  assert.equal(defaultDispatchPromptPath("20260429-200856-cece84b", "../etc/passwd"), null);
  assert.equal(defaultDispatchPromptPath("20260429-200856-cece84b", "scan/project"), null);
  assert.equal(defaultDispatchPromptPath("20260429-200856-cece84b", "scan-project"), null); // hyphen rejected
  assert.equal(defaultDispatchPromptPath("20260429-200856-cece84b", "Scan_Project"), null); // uppercase rejected
  assert.equal(defaultDispatchPromptPath("20260429-200856-cece84b", ""), null);
  assert.equal(defaultDispatchPromptPath("20260429-200856-cece84b", null), null);
  // Snake_case ascii is accepted.
  const ok = defaultDispatchPromptPath("20260429-200856-cece84b", "scan_project");
  assert.ok(ok && ok.endsWith("workers/scan_project-dispatch-prompt.md"));
});

test("writeDispatchPromptToDisk: passes through silently when no worker / dispatch_specialists / missing fields", () => {
  // None of these throw. None create any file.
  writeDispatchPromptToDisk({ has_worker: false });
  writeDispatchPromptToDisk({ has_worker: true, state: "dispatch_specialists" });
  writeDispatchPromptToDisk({ has_worker: true });
});

test("writeDispatchPromptToDisk: writes <state>-dispatch-prompt.md atomically", () => {
  const runId = "20991231-235959-aaaaaaa";
  const state = "test_state";
  const promptPath = defaultDispatchPromptPath(runId, state);
  mkdirSync(dirname(promptPath), { recursive: true });
  try {
    const brief = {
      has_worker: true,
      run_id: runId,
      state,
      worker: { role: "test", inputs: [], prompt_body: "TEST PROMPT BODY" },
      inputs: {},
      outputs_path: "/some/path.json",
    };
    writeDispatchPromptToDisk(brief);
    assert.ok(existsSync(promptPath), `expected prompt at ${promptPath}`);
    const text = readFileSync(promptPath, "utf8");
    assert.match(text, /TEST PROMPT BODY/);
    // No tmp file leftover.
    const leaks = readdirSync(dirname(promptPath)).filter((n) => n.includes(".tmp-"));
    assert.deepEqual(leaks, []);
  } finally {
    rmSync(promptPath, { force: true });
  }
});

test("writeSpecialistPromptsToDisk: writes K files, one per picked leaf", () => {
  const runId = "20991231-235959-bbbbbbb";
  const state = "dispatch_specialists";
  const leaves = [
    { id: "lang-javascript", path: "tasks-task/lang-javascript.md", body: "JS leaf body" },
    { id: "test-integration", path: "test-tests/test-integration.md", body: "Integration leaf body" },
  ];
  const dir = dirname(defaultDispatchPromptPath(runId, state, leaves[0].id));
  mkdirSync(dir, { recursive: true });

  try {
    const brief = {
      has_worker: true,
      run_id: runId,
      state,
      worker: { role: "specialist", inputs: [], prompt_body: "SPECIALIST TEMPLATE" },
      inputs: { picked_leaves: leaves, project_profile: {}, tool_results: [] },
      outputs_path: "/some/dispatch_specialists-output.json",
    };
    writeSpecialistPromptsToDisk(brief);

    for (const leaf of leaves) {
      const promptPath = defaultDispatchPromptPath(runId, state, leaf.id);
      assert.ok(existsSync(promptPath), `expected ${promptPath}`);
      const text = readFileSync(promptPath, "utf8");
      assert.match(text, /SPECIALIST TEMPLATE/);
      assert.match(text, new RegExp(`id = ${leaf.id}`));
      assert.match(text, new RegExp(leaf.body.split(" ").join("\\s+")));
    }
  } finally {
    for (const leaf of leaves) {
      rmSync(defaultDispatchPromptPath(runId, state, leaf.id), { force: true });
    }
  }
});

test("writeSpecialistPromptsToDisk: passes through silently on empty picked_leaves", () => {
  // No throw, no files.
  writeSpecialistPromptsToDisk({
    has_worker: true,
    state: "dispatch_specialists",
    run_id: "20991231-235959-ccccccc",
    inputs: { picked_leaves: [] },
  });
});
