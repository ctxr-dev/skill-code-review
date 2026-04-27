// Tests for the B7 worker-output replay harness. The harness is
// pure-function over a fixtures directory + filesystem. Tests use a
// temp directory per case so they don't pollute the real
// tests/fixtures/worker-responses/ tree.

import { test } from "node:test";
import assert from "node:assert/strict";

import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  computeHashKey,
  fixturePath,
  recordOutputs,
  replayLookup,
  resolveReplayMode,
  stashPendingBrief,
  readPendingBrief,
  clearPendingBrief,
} from "../../scripts/lib/worker-replay.mjs";

function makeTmpDir() {
  return mkdtempSync(join(tmpdir(), "worker-replay-test-"));
}

test("resolveReplayMode: defaults to live, accepts record/replay, ignores unknown", () => {
  assert.equal(resolveReplayMode({}), "live");
  assert.equal(resolveReplayMode({ "replay-mode": "live" }), "live");
  assert.equal(resolveReplayMode({ "replay-mode": "record" }), "record");
  assert.equal(resolveReplayMode({ "replay-mode": "replay" }), "replay");
  assert.equal(resolveReplayMode({ "replay-mode": "REPLAY" }), "replay");
  assert.equal(resolveReplayMode({ "replay-mode": "garbage" }), "live");
  assert.equal(resolveReplayMode(null), "live");
});

test("computeHashKey: same inputs → same hash; any input change → different hash", () => {
  const a = computeHashKey({
    state: "llm_trim",
    promptTemplate: "fsm/workers/trim-candidates.md",
    inputs: { tier: "sensitive", cap: 30, stage_a_candidates: [{ id: "a" }] },
  });
  const b = computeHashKey({
    state: "llm_trim",
    promptTemplate: "fsm/workers/trim-candidates.md",
    inputs: { tier: "sensitive", cap: 30, stage_a_candidates: [{ id: "a" }] },
  });
  assert.equal(a, b, "byte-identical inputs must produce identical hashes");

  // Different state → different hash
  const diffState = computeHashKey({
    state: "tree_descend",
    promptTemplate: "fsm/workers/trim-candidates.md",
    inputs: { tier: "sensitive", cap: 30, stage_a_candidates: [{ id: "a" }] },
  });
  assert.notEqual(a, diffState);

  // Different prompt template → different hash
  const diffPrompt = computeHashKey({
    state: "llm_trim",
    promptTemplate: "fsm/workers/trim-candidates-v2.md",
    inputs: { tier: "sensitive", cap: 30, stage_a_candidates: [{ id: "a" }] },
  });
  assert.notEqual(a, diffPrompt);

  // Different inputs → different hash
  const diffInputs = computeHashKey({
    state: "llm_trim",
    promptTemplate: "fsm/workers/trim-candidates.md",
    inputs: { tier: "lite", cap: 8, stage_a_candidates: [{ id: "a" }] },
  });
  assert.notEqual(a, diffInputs);
});

test("computeHashKey: input key order doesn't affect the hash (canonical JSON)", () => {
  const a = computeHashKey({
    state: "s",
    promptTemplate: "p",
    inputs: { alpha: 1, beta: 2, gamma: { x: 1, y: 2 } },
  });
  const b = computeHashKey({
    state: "s",
    promptTemplate: "p",
    inputs: { gamma: { y: 2, x: 1 }, beta: 2, alpha: 1 },
  });
  assert.equal(a, b);
});

test("fixturePath: rejects bad state / hashKey", () => {
  assert.throws(() => fixturePath("/tmp", "", "a".repeat(64)));
  assert.throws(() => fixturePath("/tmp", "x", "not-a-hex-sha256"));
  assert.throws(() => fixturePath("/tmp", "x", "abcdef"));
});

test("fixturePath: produces <root>/<state>/<hash>.json", () => {
  const p = fixturePath("/tmp/fixtures", "llm_trim", "a".repeat(64));
  assert.equal(p, join("/tmp/fixtures", "llm_trim", `${"a".repeat(64)}.json`));
});

test("recordOutputs + replayLookup: round-trip on disk", () => {
  const root = makeTmpDir();
  try {
    const hashKey = "f".repeat(64);
    const outputs = { picked_leaves: [{ id: "lang-typescript" }] };
    const written = recordOutputs(root, {
      state: "llm_trim",
      hashKey,
      outputs,
      meta: { recorded_at: "2026-04-27T00:00:00Z" },
    });
    assert.ok(existsSync(written));
    const replayed = replayLookup(root, "llm_trim", hashKey);
    assert.deepEqual(replayed, outputs);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("replayLookup: returns null on cache miss", () => {
  const root = makeTmpDir();
  try {
    const replayed = replayLookup(root, "llm_trim", "0".repeat(64));
    assert.equal(replayed, null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("recordOutputs: file is canonical-JSON pretty-printed", () => {
  const root = makeTmpDir();
  try {
    const hashKey = "1".repeat(64);
    const path = recordOutputs(root, {
      state: "tree_descend",
      hashKey,
      outputs: { stage_a_candidates: [], descent_path: [] },
    });
    const body = readFileSync(path, "utf8");
    assert.match(body, /^\{\n  "outputs": \{/, "fixture should be pretty-printed JSON");
    assert.ok(body.endsWith("\n"), "fixture should end with newline");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("stash / read / clear pending-brief lifecycle", () => {
  const dir = makeTmpDir();
  try {
    assert.equal(readPendingBrief(dir), null);
    stashPendingBrief(dir, { state: "llm_trim", hashKey: "a".repeat(64) });
    const read = readPendingBrief(dir);
    assert.equal(read.state, "llm_trim");
    assert.equal(read.hashKey, "a".repeat(64));
    clearPendingBrief(dir);
    // After clear the file is empty (not removed); reading should yield null.
    assert.equal(readPendingBrief(dir), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("end-to-end: record then replay produces byte-identical output", () => {
  const root = makeTmpDir();
  try {
    const hashKey = computeHashKey({
      state: "llm_trim",
      promptTemplate: "fsm/workers/trim-candidates.md",
      inputs: {
        tier: "sensitive",
        cap: 30,
        stage_a_candidates: [{ id: "lang-typescript", path: "lang-typescript.md", activation_match: ["file_globs"] }],
      },
    });
    const fixture = {
      picked_leaves: [{ id: "lang-typescript", path: "lang-typescript.md", justification: "ok", dimensions: ["correctness"] }],
      rejected_leaves: [],
      coverage_rescues: [],
    };
    recordOutputs(root, { state: "llm_trim", hashKey, outputs: fixture });

    // Two replays — both must return byte-identical outputs.
    const first = replayLookup(root, "llm_trim", hashKey);
    const second = replayLookup(root, "llm_trim", hashKey);
    assert.deepEqual(first, second);
    assert.deepEqual(first, fixture);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
