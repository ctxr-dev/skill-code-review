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

test("resolveReplayMode: defaults to live, accepts record/replay (case-insensitive)", () => {
  assert.equal(resolveReplayMode({}), "live");
  assert.equal(resolveReplayMode({ "replay-mode": "live" }), "live");
  assert.equal(resolveReplayMode({ "replay-mode": "record" }), "record");
  assert.equal(resolveReplayMode({ "replay-mode": "replay" }), "replay");
  assert.equal(resolveReplayMode({ "replay-mode": "REPLAY" }), "replay");
  assert.equal(resolveReplayMode(null), "live");
});

test("resolveReplayMode: invokes onInvalid for bare flag and unknown values", () => {
  const calls = [];
  const onInvalid = (msg) => calls.push(msg);
  assert.equal(resolveReplayMode({ "replay-mode": true }, { onInvalid }), "live");
  assert.equal(resolveReplayMode({ "replay-mode": "garbage" }, { onInvalid }), "live");
  assert.equal(calls.length, 2);
  assert.match(calls[0], /bare flag/);
  assert.match(calls[1], /must be one of/);
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

test("computeHashKey: same prompt body in CRLF and LF produces the same hash", async () => {
  // Without CRLF normalization, a Windows checkout (core.autocrlf=true)
  // would hash the same logical prompt to a different value than a
  // Linux checkout, causing systematic cross-platform replay misses.
  const { mkdirSync, writeFileSync } = await import("node:fs");
  const { join: pj } = await import("node:path");
  const lfRoot = makeTmpDir();
  const crlfRoot = makeTmpDir();
  try {
    mkdirSync(pj(lfRoot, "fsm", "workers"), { recursive: true });
    mkdirSync(pj(crlfRoot, "fsm", "workers"), { recursive: true });
    writeFileSync(pj(lfRoot, "fsm", "workers", "p.md"), "line a\nline b\nline c\n");
    writeFileSync(pj(crlfRoot, "fsm", "workers", "p.md"), "line a\r\nline b\r\nline c\r\n");
    const lfHash = computeHashKey({
      state: "s",
      promptTemplate: "fsm/workers/p.md",
      inputs: {},
      repoRoot: lfRoot,
    });
    const crlfHash = computeHashKey({
      state: "s",
      promptTemplate: "fsm/workers/p.md",
      inputs: {},
      repoRoot: crlfRoot,
    });
    assert.equal(lfHash, crlfHash, "CRLF must hash equal to LF after normalization");
  } finally {
    rmSync(lfRoot, { recursive: true, force: true });
    rmSync(crlfRoot, { recursive: true, force: true });
  }
});

test("computeHashKey: rejects traversal / absolute / UNC promptTemplate (defense in depth)", () => {
  // Even though run-review wraps paths in repoRelativePromptPath first,
  // computeHashKey is exported and could be called from tooling that
  // skips that sanitiser. Without these guards, `../../etc/passwd` (or
  // a Windows-rooted / UNC path) would fold the resolved file into the
  // hash. Cover POSIX absolute, Windows drive-letter, leading-backslash,
  // and UNC variants in one parameterised pass.
  const root = mkdtempSync(join(tmpdir(), "replay-defense-"));
  try {
    const bad = [
      "../etc/passwd",
      "/etc/passwd",
      "C:\\Windows\\System32",
      "\\Windows\\System32",
      "\\\\server\\share\\file",
    ];
    for (const promptTemplate of bad) {
      assert.throws(
        () => computeHashKey({ state: "s", promptTemplate, inputs: {}, repoRoot: root }),
        /traversal segments or absolute/,
        `expected throw for promptTemplate=${JSON.stringify(promptTemplate)}`,
      );
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("computeHashKey: throws when promptTemplate is unreadable under a given repoRoot", () => {
  // A bad promptTemplate path under a real repoRoot must surface — silent
  // empty-content fallback would mask a bug as a systematic replay miss.
  const root = mkdtempSync(join(tmpdir(), "replay-prompt-"));
  try {
    assert.throws(
      () =>
        computeHashKey({
          state: "llm_trim",
          promptTemplate: "fsm/workers/does-not-exist.md",
          inputs: {},
          repoRoot: root,
        }),
      /prompt template not readable/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  // Back-compat: without repoRoot, prompt-content hashing is opt-out;
  // a missing file does NOT throw — only the path is hashed.
  const hash = computeHashKey({
    state: "llm_trim",
    promptTemplate: "fsm/workers/does-not-exist.md",
    inputs: {},
  });
  assert.match(hash, /^[a-f0-9]{64}$/);
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

test("replayLookup: throws on corrupted JSON (distinct from cache miss)", async () => {
  // A corrupted fixture must not silently masquerade as a cache miss —
  // replay-mode needs to fault loud on stale/bad fixtures so the user
  // can re-record. Returning null here would silently regress replay.
  const { mkdirSync, writeFileSync } = await import("node:fs");
  const { dirname: dn } = await import("node:path");
  const root = makeTmpDir();
  try {
    const hashKey = "d".repeat(64);
    const path = fixturePath(root, "llm_trim", hashKey);
    mkdirSync(dn(path), { recursive: true });
    writeFileSync(path, "{not valid json", "utf8");
    assert.throws(() => replayLookup(root, "llm_trim", hashKey), /invalid JSON/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("recordOutputs: file is pretty-printed JSON with trailing newline", () => {
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

test("end-to-end: record then replay produces structurally identical output", () => {
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

    // Two replays — both must return the same parsed value. (Replay
    // returns parsed JSON; raw-byte equality of the on-disk fixture is
    // exercised by the dedicated test below.)
    const first = replayLookup(root, "llm_trim", hashKey);
    const second = replayLookup(root, "llm_trim", hashKey);
    assert.deepEqual(first, second);
    assert.deepEqual(first, fixture);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("recordOutputs: re-recording the same outputs in different key order writes byte-identical files", () => {
  // The determinism contract for the on-disk fixture is byte-level: a
  // worker that emits the same logical outputs in a different key
  // insertion order must produce the same bytes after canonicalization.
  const root = makeTmpDir();
  try {
    const hashKey = "c".repeat(64);
    const a = recordOutputs(root, {
      state: "tree_descend",
      hashKey,
      outputs: { picked: [{ id: "a", path: "a.md", dimensions: ["correctness"] }], rejected: [] },
    });
    const bytesA = readFileSync(a);
    const b = recordOutputs(root, {
      state: "tree_descend",
      hashKey,
      outputs: { rejected: [], picked: [{ dimensions: ["correctness"], path: "a.md", id: "a" }] },
    });
    const bytesB = readFileSync(b);
    assert.equal(bytesA.equals(bytesB), true, "canonicalized records must be byte-identical");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
