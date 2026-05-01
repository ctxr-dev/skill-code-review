// specialist-aggregation.test.js — unit tests for aggregateSpecialistOutputs
// and discoverLeafShards.
//
// The runner aggregates per-leaf (and per-shard) specialist output files
// into the canonical { specialist_outputs: [...] } payload that the FSM
// commits as the dispatch_specialists state's output. These tests
// exercise:
//   - non-sharded leaves (one prompt → one output)
//   - sharded leaves (N prompts → N outputs → one merged row)
//   - mixed (some sharded, some not)
//   - missing per-leaf output → synthesized "failed" row
//   - missing one shard for a sharded leaf → status reflects gap
//
// Hermetic: each test builds a fake run-dir under a per-test tempdir
// with .fsmrc.json pointing storage_root at it. No assumption about
// the real corpus.

import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

import {
  aggregateSpecialistOutputs,
  discoverLeafShards,
  defaultSpecialistOutputPath,
  defaultDispatchPromptPath,
} from "../../scripts/run-review.mjs";

// We use a fixed run-id and a synthetic storage root. The runner reads
// storage_root from .fsmrc.json (resolveStorageRoot) which is relative
// to process.cwd(); we mkdtemp + chdir for the duration of the test
// suite to avoid touching the real .skill-code-review/ tree.
let TMP_PROJECT_ROOT;
let ORIGINAL_CWD;
const RUN_ID = "20991231-235959-aaaaaaa";

before(() => {
  ORIGINAL_CWD = process.cwd();
  TMP_PROJECT_ROOT = mkdtempSync(join(tmpdir(), "specialist-agg-"));
  // .fsmrc.json points storage_root to a sibling subdir.
  writeFileSync(
    join(TMP_PROJECT_ROOT, ".fsmrc.json"),
    JSON.stringify({ fsms: [{ name: "code-reviewer", path: "fsm/code-reviewer.fsm.yaml", storage_root: ".skill-code-review" }] }),
  );
  // The fsm-validate-static workflow expects the fsm file to exist; for
  // these tests we don't actually run fsm-validate, but resolveSettings
  // does sanity-read .fsmrc.json. A fsm subdir keeps the read happy.
  mkdirSync(join(TMP_PROJECT_ROOT, "fsm"), { recursive: true });
  writeFileSync(join(TMP_PROJECT_ROOT, "fsm", "code-reviewer.fsm.yaml"), "fsm:\n  id: code-reviewer\n  version: 1\n  entry: a\n  states:\n    - id: a\n      purpose: \".\"\n      preconditions: []\n      outputs: []\n      transitions: []\n");
  process.chdir(TMP_PROJECT_ROOT);
});

after(() => {
  if (ORIGINAL_CWD) process.chdir(ORIGINAL_CWD);
  if (TMP_PROJECT_ROOT) rmSync(TMP_PROJECT_ROOT, { recursive: true, force: true });
});

// Each test starts with a clean workers dir.
beforeEach(() => {
  const workersDir = dirname(defaultSpecialistOutputPath(RUN_ID, "any-leaf"));
  rmSync(workersDir, { recursive: true, force: true });
  mkdirSync(workersDir, { recursive: true });
});

function writePrompt(leafId, shardIdx = null) {
  const path = defaultDispatchPromptPath(RUN_ID, "dispatch_specialists", leafId, shardIdx);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, "<staged prompt>\n");
}

function writeOutput(leafId, shardIdx, payload) {
  const path = defaultSpecialistOutputPath(RUN_ID, leafId, shardIdx);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(payload));
}

function specialistRow(id, overrides = {}) {
  return {
    id,
    status: "completed",
    runtime_ms: 100,
    tokens_in: 1000,
    tokens_out: 50,
    findings: [],
    ...overrides,
  };
}

function brief(pickedLeafIds) {
  return {
    run_id: RUN_ID,
    state: "dispatch_specialists",
    inputs: {
      picked_leaves: pickedLeafIds.map((id) => ({ id, path: `cluster/${id}.md`, justification: "j", dimensions: ["correctness"] })),
    },
  };
}

test("aggregateSpecialistOutputs: 3 non-sharded leaves with outputs → ordered specialist_outputs[]", () => {
  for (const id of ["leaf-alpha", "leaf-beta", "leaf-gamma"]) {
    writePrompt(id);
    writeOutput(id, null, specialistRow(id, {
      findings: [{ severity: "minor", file: "a.ts", title: `from ${id}`, description: "d", impact: "i", fix: "f" }],
    }));
  }
  const out = aggregateSpecialistOutputs(brief(["leaf-alpha", "leaf-beta", "leaf-gamma"]));
  assert.equal(out.specialist_outputs.length, 3);
  // Order matches picked_leaves order (alpha, beta, gamma).
  assert.deepEqual(out.specialist_outputs.map((r) => r.id), ["leaf-alpha", "leaf-beta", "leaf-gamma"]);
  // Findings round-tripped.
  for (const row of out.specialist_outputs) {
    assert.equal(row.findings.length, 1);
    assert.match(row.findings[0].title, /from /);
  }
});

test("aggregateSpecialistOutputs: sharded leaf merges shard findings into ONE row", () => {
  // Three shards for "split-leaf"; each contributes 1 finding.
  for (const idx of [0, 1, 2]) {
    writePrompt("split-leaf", idx);
    writeOutput("split-leaf", idx, specialistRow("split-leaf", {
      runtime_ms: 100 + idx,
      tokens_in: 1000 + idx,
      tokens_out: 50 + idx,
      findings: [{ severity: "minor", file: `f${idx}.ts`, title: `shard-${idx}-finding`, description: "d", impact: "i", fix: "f" }],
    }));
  }
  const out = aggregateSpecialistOutputs(brief(["split-leaf"]));
  assert.equal(out.specialist_outputs.length, 1);
  const row = out.specialist_outputs[0];
  assert.equal(row.id, "split-leaf");
  assert.equal(row.status, "completed");
  // Findings concatenated across shards.
  assert.equal(row.findings.length, 3);
  assert.deepEqual(row.findings.map((f) => f.title).sort(), ["shard-0-finding", "shard-1-finding", "shard-2-finding"]);
  // Timings + token counts summed across shards.
  assert.equal(row.runtime_ms, 100 + 101 + 102);
  assert.equal(row.tokens_in, 1000 + 1001 + 1002);
  assert.equal(row.tokens_out, 50 + 51 + 52);
});

test("aggregateSpecialistOutputs: missing per-leaf output → synthesized failed row with skip_reason", () => {
  // Stage a prompt but no output: simulates orchestrator never dispatching
  // (or the dispatched Agent failing silently before writing).
  writePrompt("ghost-leaf");
  const out = aggregateSpecialistOutputs(brief(["ghost-leaf"]));
  assert.equal(out.specialist_outputs.length, 1);
  const row = out.specialist_outputs[0];
  assert.equal(row.id, "ghost-leaf");
  assert.equal(row.status, "failed");
  assert.equal(row.findings.length, 0);
  assert.match(row.skip_reason, /no per-leaf output/);
});

test("aggregateSpecialistOutputs: missing ONE shard out of N → leaf marked failed with reason naming the shard", () => {
  // Stage 3 shard prompts; write outputs for shards 0 and 2 only.
  for (const idx of [0, 1, 2]) writePrompt("partial-leaf", idx);
  writeOutput("partial-leaf", 0, specialistRow("partial-leaf"));
  writeOutput("partial-leaf", 2, specialistRow("partial-leaf"));
  const out = aggregateSpecialistOutputs(brief(["partial-leaf"]));
  assert.equal(out.specialist_outputs.length, 1);
  const row = out.specialist_outputs[0];
  assert.equal(row.status, "failed");
  // skip_reason names shard 1 specifically.
  assert.match(row.skip_reason, /shard 1/);
});

test("aggregateSpecialistOutputs: leaf with no staged prompt at all → failed with 'no dispatch prompt'", () => {
  // No prompt, no output. The aggregator must still emit a row (the
  // FSM expects one entry per picked_leaf) but mark it failed.
  const out = aggregateSpecialistOutputs(brief(["unstaged-leaf"]));
  assert.equal(out.specialist_outputs.length, 1);
  const row = out.specialist_outputs[0];
  assert.equal(row.status, "failed");
  assert.match(row.skip_reason, /no dispatch prompt staged/);
});

test("aggregateSpecialistOutputs: mixed sharded + non-sharded leaves both end up in specialist_outputs[]", () => {
  // Non-sharded "narrow-leaf" + sharded "wide-leaf" with 2 shards.
  writePrompt("narrow-leaf");
  writeOutput("narrow-leaf", null, specialistRow("narrow-leaf", {
    findings: [{ severity: "minor", file: "narrow.ts", title: "narrow", description: "d", impact: "i", fix: "f" }],
  }));
  writePrompt("wide-leaf", 0);
  writePrompt("wide-leaf", 1);
  writeOutput("wide-leaf", 0, specialistRow("wide-leaf", {
    findings: [{ severity: "minor", file: "w0.ts", title: "wide-shard-0", description: "d", impact: "i", fix: "f" }],
  }));
  writeOutput("wide-leaf", 1, specialistRow("wide-leaf", {
    findings: [{ severity: "minor", file: "w1.ts", title: "wide-shard-1", description: "d", impact: "i", fix: "f" }],
  }));
  const out = aggregateSpecialistOutputs(brief(["narrow-leaf", "wide-leaf"]));
  assert.equal(out.specialist_outputs.length, 2);
  assert.deepEqual(out.specialist_outputs.map((r) => r.id), ["narrow-leaf", "wide-leaf"]);
  // wide-leaf's findings are merged across its two shards.
  const wide = out.specialist_outputs.find((r) => r.id === "wide-leaf");
  assert.equal(wide.findings.length, 2);
  assert.deepEqual(wide.findings.map((f) => f.title).sort(), ["wide-shard-0", "wide-shard-1"]);
});

test("aggregateSpecialistOutputs: stamps id authoritatively even if worker wrote a different id", () => {
  // A worker that copy-pastes a wrong id MUST NOT slip through. The
  // aggregator overwrites with the picked_leaves id so the report row
  // matches what the FSM committed as picked.
  writePrompt("good-id");
  writeOutput("good-id", null, specialistRow("WRONG-ID-FROM-WORKER", { findings: [] }));
  const out = aggregateSpecialistOutputs(brief(["good-id"]));
  assert.equal(out.specialist_outputs.length, 1);
  assert.equal(out.specialist_outputs[0].id, "good-id");
});

test("aggregateSpecialistOutputs: unparseable per-leaf JSON surfaces in skip_reason", () => {
  writePrompt("broken-json-leaf");
  const path = defaultSpecialistOutputPath(RUN_ID, "broken-json-leaf");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, "{ not valid json");
  const out = aggregateSpecialistOutputs(brief(["broken-json-leaf"]));
  assert.equal(out.specialist_outputs.length, 1);
  assert.equal(out.specialist_outputs[0].status, "failed");
  assert.match(out.specialist_outputs[0].skip_reason, /unparseable/);
});

test("aggregateSpecialistOutputs: empty picked_leaves[] returns empty specialist_outputs[]", () => {
  const out = aggregateSpecialistOutputs(brief([]));
  assert.deepEqual(out, { specialist_outputs: [] });
});

test("discoverLeafShards: returns null for non-sharded leaf (single prompt at canonical path)", () => {
  writePrompt("single-leaf");
  assert.equal(discoverLeafShards(RUN_ID, "single-leaf"), null);
});

test("discoverLeafShards: returns sorted shard indices when only sharded prompts exist", () => {
  writePrompt("sharded-leaf", 2);
  writePrompt("sharded-leaf", 0);
  writePrompt("sharded-leaf", 1);
  assert.deepEqual(discoverLeafShards(RUN_ID, "sharded-leaf"), [0, 1, 2]);
});

test("discoverLeafShards: returns empty array when neither shape is staged", () => {
  assert.deepEqual(discoverLeafShards(RUN_ID, "never-staged"), []);
});
