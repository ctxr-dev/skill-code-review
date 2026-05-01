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
// Hermeticity: `resolveStorageRoot` reads `.fsmrc.json` relative to the
// runner's REPO_ROOT (the skill-code-review repo), not process.cwd().
// We can't redirect storage_root via chdir in-process. Instead, each
// test generates its OWN unique run-id (random 7-hex date-time) so its
// run-dir under the real `.skill-code-review/` tree never collides
// with another test's. Cleanup deletes only that test's run-dir.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { dirname } from "node:path";

import {
  aggregateSpecialistOutputs,
  discoverLeafShards,
  defaultSpecialistOutputPath,
  defaultDispatchPromptPath,
} from "../../scripts/run-review.mjs";

// Generate a unique run-id matching the parseRunId regex
// `^\d{8}-\d{6}-[0-9a-f]{7}$`. We use a fixed far-future date so test
// run-dirs sort to the bottom of `.skill-code-review/` and are easy to
// identify / sweep, plus a random 7-hex tail per test invocation.
function uniqueRunId() {
  const hex = randomBytes(4).toString("hex").slice(0, 7);
  return `20991231-235959-${hex}`;
}

// Schedule cleanup of a test's full run-dir (parent of workers/). Each
// test calls this with its own runId so cleanup is scoped (no rmSync
// of another test's dir even if `node --test` runs in parallel). We
// remove the entire run-dir rather than just workers/ so the per-run
// metadata (manifest.json, fsm-trace/) — which the runner's
// resolveStorageRoot would create as side-effects of any future helper
// extension — also gets cleaned up; for these tests the runner doesn't
// create anything else, so deleting the whole dir is equivalent to
// deleting the workers/ subtree.
function scheduleCleanup(runId) {
  // Workers dir lives under `<storage_root>/yyyy/mm/dd/<2-hex>/<5-hex>/workers`.
  // defaultSpecialistOutputPath gives us a path inside it; dirname
  // takes us to the workers/ dir; dirname again to the run-dir itself.
  const samplePath = defaultSpecialistOutputPath(runId, "x");
  if (!samplePath) return;
  const runDir = dirname(dirname(samplePath));
  return () => rmSync(runDir, { recursive: true, force: true });
}

// Helper: set up a clean workers dir for the run. Returns the runId
// and a cleanup callback the test must invoke in its finally block.
function freshRun() {
  const runId = uniqueRunId();
  const samplePath = defaultSpecialistOutputPath(runId, "x");
  const workersDir = dirname(samplePath);
  mkdirSync(workersDir, { recursive: true });
  return { runId, cleanup: scheduleCleanup(runId) };
}

function writePrompt(runId, leafId, shardIdx = null) {
  const path = defaultDispatchPromptPath(runId, "dispatch_specialists", leafId, shardIdx);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, "<staged prompt>\n");
}

function writeOutput(runId, leafId, shardIdx, payload) {
  const path = defaultSpecialistOutputPath(runId, leafId, shardIdx);
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

function brief(runId, pickedLeafIds) {
  return {
    run_id: runId,
    state: "dispatch_specialists",
    inputs: {
      picked_leaves: pickedLeafIds.map((id) => ({ id, path: `cluster/${id}.md`, justification: "j", dimensions: ["correctness"] })),
    },
  };
}

test("aggregateSpecialistOutputs: 3 non-sharded leaves with outputs → ordered specialist_outputs[]", () => {
  const { runId, cleanup } = freshRun();
  try {
    for (const id of ["leaf-alpha", "leaf-beta", "leaf-gamma"]) {
      writePrompt(runId, id);
      writeOutput(runId, id, null, specialistRow(id, {
        findings: [{ severity: "minor", file: "a.ts", title: `from ${id}`, description: "d", impact: "i", fix: "f" }],
      }));
    }
    const out = aggregateSpecialistOutputs(brief(runId, ["leaf-alpha", "leaf-beta", "leaf-gamma"]));
    assert.equal(out.specialist_outputs.length, 3);
    assert.deepEqual(out.specialist_outputs.map((r) => r.id), ["leaf-alpha", "leaf-beta", "leaf-gamma"]);
    for (const row of out.specialist_outputs) {
      assert.equal(row.findings.length, 1);
      assert.match(row.findings[0].title, /from /);
    }
  } finally {
    cleanup();
  }
});

test("aggregateSpecialistOutputs: sharded leaf merges shard findings into ONE row", () => {
  const { runId, cleanup } = freshRun();
  try {
    for (const idx of [0, 1, 2]) {
      writePrompt(runId, "split-leaf", idx);
      writeOutput(runId, "split-leaf", idx, specialistRow("split-leaf", {
        runtime_ms: 100 + idx,
        tokens_in: 1000 + idx,
        tokens_out: 50 + idx,
        findings: [{ severity: "minor", file: `f${idx}.ts`, title: `shard-${idx}-finding`, description: "d", impact: "i", fix: "f" }],
      }));
    }
    const out = aggregateSpecialistOutputs(brief(runId, ["split-leaf"]));
    assert.equal(out.specialist_outputs.length, 1);
    const row = out.specialist_outputs[0];
    assert.equal(row.id, "split-leaf");
    assert.equal(row.status, "completed");
    assert.equal(row.findings.length, 3);
    assert.deepEqual(row.findings.map((f) => f.title).sort(), ["shard-0-finding", "shard-1-finding", "shard-2-finding"]);
    assert.equal(row.runtime_ms, 100 + 101 + 102);
    assert.equal(row.tokens_in, 1000 + 1001 + 1002);
    assert.equal(row.tokens_out, 50 + 51 + 52);
  } finally {
    cleanup();
  }
});

test("aggregateSpecialistOutputs: missing per-leaf output → synthesized failed row with skip_reason", () => {
  const { runId, cleanup } = freshRun();
  try {
    writePrompt(runId, "ghost-leaf");
    const out = aggregateSpecialistOutputs(brief(runId, ["ghost-leaf"]));
    assert.equal(out.specialist_outputs.length, 1);
    const row = out.specialist_outputs[0];
    assert.equal(row.id, "ghost-leaf");
    assert.equal(row.status, "failed");
    assert.equal(row.findings.length, 0);
    assert.match(row.skip_reason, /no per-leaf output/);
  } finally {
    cleanup();
  }
});

test("aggregateSpecialistOutputs: missing ONE shard out of N → leaf marked failed with reason naming the shard", () => {
  const { runId, cleanup } = freshRun();
  try {
    for (const idx of [0, 1, 2]) writePrompt(runId, "partial-leaf", idx);
    writeOutput(runId, "partial-leaf", 0, specialistRow("partial-leaf"));
    writeOutput(runId, "partial-leaf", 2, specialistRow("partial-leaf"));
    const out = aggregateSpecialistOutputs(brief(runId, ["partial-leaf"]));
    assert.equal(out.specialist_outputs.length, 1);
    const row = out.specialist_outputs[0];
    assert.equal(row.status, "failed");
    assert.match(row.skip_reason, /shard 1/);
  } finally {
    cleanup();
  }
});

test("aggregateSpecialistOutputs: leaf with no staged prompt at all → failed with 'no dispatch prompt'", () => {
  const { runId, cleanup } = freshRun();
  try {
    const out = aggregateSpecialistOutputs(brief(runId, ["unstaged-leaf"]));
    assert.equal(out.specialist_outputs.length, 1);
    const row = out.specialist_outputs[0];
    assert.equal(row.status, "failed");
    assert.match(row.skip_reason, /no dispatch prompt staged/);
  } finally {
    cleanup();
  }
});

test("aggregateSpecialistOutputs: mixed sharded + non-sharded leaves both end up in specialist_outputs[]", () => {
  const { runId, cleanup } = freshRun();
  try {
    writePrompt(runId, "narrow-leaf");
    writeOutput(runId, "narrow-leaf", null, specialistRow("narrow-leaf", {
      findings: [{ severity: "minor", file: "narrow.ts", title: "narrow", description: "d", impact: "i", fix: "f" }],
    }));
    writePrompt(runId, "wide-leaf", 0);
    writePrompt(runId, "wide-leaf", 1);
    writeOutput(runId, "wide-leaf", 0, specialistRow("wide-leaf", {
      findings: [{ severity: "minor", file: "w0.ts", title: "wide-shard-0", description: "d", impact: "i", fix: "f" }],
    }));
    writeOutput(runId, "wide-leaf", 1, specialistRow("wide-leaf", {
      findings: [{ severity: "minor", file: "w1.ts", title: "wide-shard-1", description: "d", impact: "i", fix: "f" }],
    }));
    const out = aggregateSpecialistOutputs(brief(runId, ["narrow-leaf", "wide-leaf"]));
    assert.equal(out.specialist_outputs.length, 2);
    assert.deepEqual(out.specialist_outputs.map((r) => r.id), ["narrow-leaf", "wide-leaf"]);
    const wide = out.specialist_outputs.find((r) => r.id === "wide-leaf");
    assert.equal(wide.findings.length, 2);
    assert.deepEqual(wide.findings.map((f) => f.title).sort(), ["wide-shard-0", "wide-shard-1"]);
  } finally {
    cleanup();
  }
});

test("aggregateSpecialistOutputs: stamps id authoritatively even if worker wrote a different id", () => {
  const { runId, cleanup } = freshRun();
  try {
    writePrompt(runId, "good-id");
    writeOutput(runId, "good-id", null, specialistRow("WRONG-ID-FROM-WORKER", { findings: [] }));
    const out = aggregateSpecialistOutputs(brief(runId, ["good-id"]));
    assert.equal(out.specialist_outputs.length, 1);
    assert.equal(out.specialist_outputs[0].id, "good-id");
  } finally {
    cleanup();
  }
});

test("aggregateSpecialistOutputs: unparseable per-leaf JSON surfaces in skip_reason", () => {
  const { runId, cleanup } = freshRun();
  try {
    writePrompt(runId, "broken-json-leaf");
    const path = defaultSpecialistOutputPath(runId, "broken-json-leaf");
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, "{ not valid json");
    const out = aggregateSpecialistOutputs(brief(runId, ["broken-json-leaf"]));
    assert.equal(out.specialist_outputs.length, 1);
    assert.equal(out.specialist_outputs[0].status, "failed");
    assert.match(out.specialist_outputs[0].skip_reason, /unparseable/);
  } finally {
    cleanup();
  }
});

test("aggregateSpecialistOutputs: empty picked_leaves[] returns empty specialist_outputs[]", () => {
  // No filesystem writes needed; just exercise the empty-pickedLeaves branch.
  const out = aggregateSpecialistOutputs({
    run_id: uniqueRunId(),
    state: "dispatch_specialists",
    inputs: { picked_leaves: [] },
  });
  assert.deepEqual(out, { specialist_outputs: [] });
});

test("discoverLeafShards: returns null for non-sharded leaf (single prompt at canonical path)", () => {
  const { runId, cleanup } = freshRun();
  try {
    writePrompt(runId, "single-leaf");
    assert.equal(discoverLeafShards(runId, "single-leaf"), null);
  } finally {
    cleanup();
  }
});

test("discoverLeafShards: returns sorted shard indices when only sharded prompts exist", () => {
  const { runId, cleanup } = freshRun();
  try {
    writePrompt(runId, "sharded-leaf", 2);
    writePrompt(runId, "sharded-leaf", 0);
    writePrompt(runId, "sharded-leaf", 1);
    assert.deepEqual(discoverLeafShards(runId, "sharded-leaf"), [0, 1, 2]);
  } finally {
    cleanup();
  }
});

test("discoverLeafShards: returns empty array when neither shape is staged", () => {
  const { runId, cleanup } = freshRun();
  try {
    assert.deepEqual(discoverLeafShards(runId, "never-staged"), []);
  } finally {
    cleanup();
  }
});

test("discoverLeafShards: partial staging (shards 0 and 2, gap at 1) reports the FULL contiguous range", () => {
  // Simulates atomicWriteFile swallowing shard 1's I/O error during
  // staging. discoverLeafShards must NOT pretend shard 1 doesn't
  // exist; it returns [0, 1, 2] so the aggregator looks for shard
  // 1's output (and synthesizes a failed row when missing). Without
  // this, shard 1's files would silently never be reviewed.
  const { runId, cleanup } = freshRun();
  try {
    writePrompt(runId, "partially-staged", 0);
    // shard 1 prompt deliberately omitted
    writePrompt(runId, "partially-staged", 2);
    assert.deepEqual(discoverLeafShards(runId, "partially-staged"), [0, 1, 2]);
  } finally {
    cleanup();
  }
});

test("aggregateSpecialistOutputs: partial-staged shards surface the gap as a failed leaf row", () => {
  // End-to-end: prompts staged for shards 0 and 2 (gap at 1), outputs
  // written for all three present (so the bug being closed is the
  // staging-side gap, not the output-side one). The aggregator detects
  // shard 1 has no output and marks the leaf failed.
  const { runId, cleanup } = freshRun();
  try {
    writePrompt(runId, "gappy-leaf", 0);
    writePrompt(runId, "gappy-leaf", 2);
    writeOutput(runId, "gappy-leaf", 0, specialistRow("gappy-leaf"));
    writeOutput(runId, "gappy-leaf", 2, specialistRow("gappy-leaf"));
    const out = aggregateSpecialistOutputs(brief(runId, ["gappy-leaf"]));
    assert.equal(out.specialist_outputs.length, 1);
    const row = out.specialist_outputs[0];
    assert.equal(row.status, "failed");
    // skip_reason mentions shard 1 (the missing one).
    assert.match(row.skip_reason, /shard 1/);
  } finally {
    cleanup();
  }
});
