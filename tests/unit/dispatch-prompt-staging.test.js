// Unit tests for the dispatch-prompt staging helpers (#79):
//   - defaultDispatchPromptPath              — canonical path computation
//   - buildDispatchPromptText                — pure text composition
//   - writeDispatchPromptToDisk              — atomic single-file write
//   - writeSpecialistPromptsToDisk           — K-files-per-pause for dispatch_specialists

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import {
  defaultDispatchPromptPath,
  defaultSpecialistOutputPath,
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

test("defaultDispatchPromptPath: rejects leaf-ids ending in --<digits> (shard-suffix collision guard)", () => {
  // A leaf id ending in `--<digits>` would collide on disk with the
  // shard-suffix scheme: `dispatch_specialists-prompt-foo--1.md`
  // could be either leaf "foo--1" (non-sharded) OR shard 1 of leaf
  // "foo". The dispatch prompt-path helper must reject the
  // ambiguous shape so the corpus authoring rule is enforced
  // structurally, not just by convention.
  assert.equal(
    defaultDispatchPromptPath("20260429-200856-cece84b", "dispatch_specialists", "foo--1"),
    null,
  );
  assert.equal(
    defaultDispatchPromptPath("20260429-200856-cece84b", "dispatch_specialists", "lang-typescript--12"),
    null,
  );
  // Single-hyphen ids are still fine.
  assert.ok(
    defaultDispatchPromptPath("20260429-200856-cece84b", "dispatch_specialists", "lang-typescript"),
    "single-hyphen leaf-id should be accepted",
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
  // Per-specialist response contract (post-per-leaf-output-files refactor):
  // specialist writes JSON to the per-leaf output path; the runner
  // aggregates on --continue. Without opts.outputPath the builder emits
  // a stable placeholder.
  assert.match(text, /--- RESPONSE CONTRACT ---/);
  assert.match(text, /Write your JSON output to:/);
  assert.match(
    text,
    /\(output path unavailable: caller did not pre-compute the per-leaf output path\)/,
  );
  assert.match(text, /Do NOT return JSON to the orchestrator inline/);
  assert.match(text, /aggregates all per-leaf outputs into specialist_outputs/);
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

test("buildDispatchPromptText: per-specialist with opts.shard emits --- THIS SHARD --- section", () => {
  // When opts.shard is provided, the prompt text gains a shard-scoped
  // section that names this shard's index and files. The leaf body and
  // project profile remain identical across a leaf's shards.
  const brief = {
    has_worker: true,
    state: "dispatch_specialists",
    worker: { role: "specialist", inputs: [], prompt_body: "TEMPLATE" },
    inputs: { project_profile: {}, changed_paths: [], tool_results: [], picked_leaves: [] },
    outputs_path: "/run/dir/workers/dispatch_specialists-output.json",
  };
  const leaf = {
    id: "lang-javascript",
    path: "tasks-task/lang-javascript.md",
    dimensions: ["correctness"],
    file_globs: ["**/*.js"],
    body: "Lang JavaScript body",
  };
  const text = buildDispatchPromptText(brief, {
    leaf,
    shard: { shardIdx: 1, files: ["src/api/auth.js", "src/util/jwt.js"], diffText: "<this shard's diff>" },
    outputPath: "/run/dir/workers/dispatch_specialists-output-lang-javascript--1.json",
  });
  assert.match(text, /--- THIS SHARD ---/);
  assert.match(text, /shard_idx = 1/);
  assert.match(text, /files_in_this_shard = \["src\/api\/auth\.js","src\/util\/jwt\.js"\]/);
  // Shard's diffText replaces the per-leaf filtered diff.
  assert.match(text, /--- FILTERED DIFF ---\n<this shard's diff>/);
  // Output path is the shard-suffixed one.
  assert.match(text, /dispatch_specialists-output-lang-javascript--1\.json/);
});

test("writeSpecialistPromptsToDisk: re-staging from wide to narrow shard set removes stale higher-index shard prompts (#93 round-15)", async () => {
  // Threshold change wide → narrow case: a previous staging produced
  // shards 0..4; a later staging produces fewer shards (or non-sharded).
  // Without cleaning up ALL existing prompts (not just the opposite
  // shape), stale --3.md and --4.md prompts would survive and
  // discoverLeafShards would route them as live shards.
  //
  // Simulate by planting shards 0..4, then re-staging via the
  // single-shard path (placeholder diff) and asserting all 5 stale
  // shard prompts are gone.
  const { randomBytes } = await import("node:crypto");
  const runId = `20991231-235959-${randomBytes(4).toString("hex").slice(0, 7)}`;
  const state = "dispatch_specialists";
  const leafId = "wide-to-narrow-leaf";
  const canonicalPath = defaultDispatchPromptPath(runId, state, leafId);
  const dir = dirname(canonicalPath);
  const runDir = dirname(dir);
  mkdirSync(dir, { recursive: true });
  try {
    for (let i = 0; i < 5; i++) {
      const p = defaultDispatchPromptPath(runId, state, leafId, i);
      writeFileSync(p, `stale shard ${i}\n`);
    }
    writeSpecialistPromptsToDisk({
      has_worker: true,
      run_id: runId,
      state,
      worker: { role: "specialist", inputs: [], prompt_body: "T" },
      inputs: { picked_leaves: [{ id: leafId, path: "x/y.md", body: "body", file_globs: ["**/*"] }] },
    });
    assert.ok(existsSync(canonicalPath), "canonical prompt should be staged after re-stage");
    for (let i = 0; i < 5; i++) {
      const p = defaultDispatchPromptPath(runId, state, leafId, i);
      assert.ok(!existsSync(p), `stale shard ${i} prompt must be removed`);
    }
  } finally {
    rmSync(runDir, { recursive: true, force: true });
  }
});

test("writeSpecialistPromptsToDisk: re-staging after threshold change removes stale OPPOSITE-shape PROMPT files but preserves OUTPUT files (#93 round-14)", async () => {
  // Repro the threshold-change race: stale shard-suffixed prompts
  // would otherwise coexist with the new canonical prompt and
  // confuse discoverLeafShards. Cleanup removes ONLY prompt files;
  // output files (specialist findings) are preserved as audit
  // artifacts even when their shape no longer matches the staged
  // prompts. Re-dispatch will produce new outputs under the new
  // shape; the orphan outputs from the old shape live alongside
  // them harmlessly (the aggregator only reads outputs whose paths
  // match the current prompt shape).
  const { randomBytes } = await import("node:crypto");
  const runId = `20991231-235959-${randomBytes(4).toString("hex").slice(0, 7)}`;
  const state = "dispatch_specialists";
  const leafId = "restage-leaf";
  const canonicalPath = defaultDispatchPromptPath(runId, state, leafId);
  const shardPath0 = defaultDispatchPromptPath(runId, state, leafId, 0);
  const shardPath1 = defaultDispatchPromptPath(runId, state, leafId, 1);
  // The output files we want PRESERVED across re-staging. Use the
  // runner's exported defaultSpecialistOutputPath helper rather than
  // hand-rolling the filename: keeps the test in lockstep with the
  // production path contract so any future rename or layout change
  // (e.g. dispatch_specialists-output- prefix evolution) propagates
  // automatically.
  const dir = dirname(canonicalPath);
  const shardOutputPath0 = defaultSpecialistOutputPath(runId, leafId, 0);
  const shardOutputPath1 = defaultSpecialistOutputPath(runId, leafId, 1);
  const runDir = dirname(dir);
  mkdirSync(dir, { recursive: true });
  try {
    // Plant a stale sharded layout (prompts AND outputs, simulating
    // a previous staging pass that ran to completion with a low
    // threshold).
    writeFileSync(shardPath0, "stale shard 0 prompt\n");
    writeFileSync(shardPath1, "stale shard 1 prompt\n");
    writeFileSync(shardOutputPath0, '{"id":"restage-leaf","status":"completed","findings":[]}');
    writeFileSync(shardOutputPath1, '{"id":"restage-leaf","status":"completed","findings":[]}');
    // Re-stage. Single-shard now (placeholder diff under threshold)
    // → cleanup should remove stale shard PROMPTS but PRESERVE
    // shard outputs (audit-trail principle).
    writeSpecialistPromptsToDisk({
      has_worker: true,
      run_id: runId,
      state,
      worker: { role: "specialist", inputs: [], prompt_body: "T" },
      inputs: { picked_leaves: [{ id: leafId, path: "x/y.md", body: "body", file_globs: ["**/*"] }] },
    });
    // Canonical present; stale shard prompts gone; stale shard
    // outputs preserved.
    assert.ok(existsSync(canonicalPath), "canonical prompt should be staged");
    assert.ok(!existsSync(shardPath0), "stale shard 0 prompt should be removed");
    assert.ok(!existsSync(shardPath1), "stale shard 1 prompt should be removed");
    assert.ok(existsSync(shardOutputPath0), "stale shard 0 output must be preserved (audit-trail)");
    assert.ok(existsSync(shardOutputPath1), "stale shard 1 output must be preserved (audit-trail)");
  } finally {
    rmSync(runDir, { recursive: true, force: true });
  }
});

test("writeSpecialistPromptsToDisk: single-shard output keeps the canonical non-sharded prompt path", async () => {
  // When shardFilteredDiff returns a single shard (the small-diff /
  // placeholder case), writeSpecialistPromptsToDisk emits the
  // non-sharded prompt at the canonical
  // dispatch_specialists-prompt-<leaf-id>.md path, NOT
  // dispatch_specialists-prompt-<leaf-id>--0.md. This preserves
  // backward compatibility with --print-dispatch-prompt --leaf-id <id>
  // (no shard suffix needed) and matches the >99% real-world case
  // where the per-leaf filtered diff fits in one shard.
  //
  // We don't exercise multi-shard staging here because the unit-test
  // invocation has no git refs so computeFilteredDiff returns a
  // placeholder string that's always well under threshold. The
  // integration tests downstream cover the real-spawn-git case.
  // Use a unique random run-id so this test doesn't collide with stale
  // state from other tests (or other local runs) that might have
  // staged prompts under the same path. node --test runs files in
  // parallel; sharing a fixed runId across tests is unsafe.
  const { randomBytes } = await import("node:crypto");
  const runId = `20991231-235959-${randomBytes(4).toString("hex").slice(0, 7)}`;
  const state = "dispatch_specialists";
  const leafId = "single-shard-leaf";
  const promptPath = defaultDispatchPromptPath(runId, state, leafId);
  const shardedPath = defaultDispatchPromptPath(runId, state, leafId, 0);
  // The whole run-dir is unique per test invocation; cleanup removes it
  // entirely so neither the canonical nor any shard-suffixed prompts
  // can leak across runs.
  const runDir = dirname(dirname(promptPath));
  mkdirSync(dirname(promptPath), { recursive: true });
  try {
    writeSpecialistPromptsToDisk({
      has_worker: true,
      run_id: runId,
      state,
      worker: { role: "specialist", inputs: [], prompt_body: "T" },
      inputs: { picked_leaves: [{ id: leafId, path: "x/y.md", body: "body", file_globs: ["**/*"] }] },
    });
    assert.ok(existsSync(promptPath), `expected ${promptPath} for single-shard (non-sharded) leaf`);
    assert.ok(!existsSync(shardedPath), "single-shard leaf must not produce shard-suffixed prompts");
  } finally {
    rmSync(runDir, { recursive: true, force: true });
  }
});
