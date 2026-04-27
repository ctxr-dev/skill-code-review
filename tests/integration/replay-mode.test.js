// Integration test for the B7 record/replay harness end-to-end.
//
// We exercise the harness's record→replay round-trip without a live
// runner spawn (which would require @ctxr/fsm CLIs + a worker dispatcher
// in the loop). The harness's contract is purely "given the same hash
// key, replay returns byte-identical fixture content"; this integration
// test seeds two fixtures via the public record API and asserts replay
// reproduces them across two consecutive lookups, mirroring the issue's
// acceptance criteria ("invoke the runner twice in replay mode against
// the recorded fixtures; assert identical end-state").

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  computeHashKey,
  recordOutputs,
  replayLookup,
} from "../../scripts/lib/worker-replay.mjs";

function makeTmpRepo() {
  const root = mkdtempSync(join(tmpdir(), "replay-mode-int-"));
  // Mirror just enough of the repo layout that prompt-content-hashing
  // works: write a fake prompt template under fsm/workers/.
  mkdirSync(join(root, "fsm", "workers"), { recursive: true });
  writeFileSync(
    join(root, "fsm", "workers", "trim-candidates.md"),
    "# trim-candidates\nbody v1\n",
  );
  return root;
}

test("integration: record → two replays produce byte-identical outputs", () => {
  const repoRoot = makeTmpRepo();
  const fixturesRoot = join(repoRoot, "fixtures");
  try {
    const inputs = {
      tier: "sensitive",
      cap: 30,
      stage_a_candidates: [
        { id: "lang-typescript", path: "lang-typescript.md", activation_match: ["file_globs"] },
        { id: "sec-csrf", path: "sec-csrf.md", activation_match: ["file_globs"] },
      ],
    };
    const hashKey = computeHashKey({
      state: "llm_trim",
      promptTemplate: "fsm/workers/trim-candidates.md",
      inputs,
      repoRoot,
    });

    const recordedOutputs = {
      picked_leaves: [
        { id: "lang-typescript", path: "lang-typescript.md", justification: "ts present", dimensions: ["correctness"] },
      ],
      rejected_leaves: [{ id: "sec-csrf", reason: "no http handlers in diff" }],
      coverage_rescues: [],
    };

    recordOutputs(fixturesRoot, { state: "llm_trim", hashKey, outputs: recordedOutputs });

    const a = replayLookup(fixturesRoot, "llm_trim", hashKey);
    const b = replayLookup(fixturesRoot, "llm_trim", hashKey);
    assert.deepEqual(a, b, "two replays must be byte-identical");
    assert.deepEqual(a, recordedOutputs);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("integration: prompt content edit invalidates the recorded hash", () => {
  const repoRoot = makeTmpRepo();
  const fixturesRoot = join(repoRoot, "fixtures");
  try {
    const inputs = { tier: "lite", cap: 8, stage_a_candidates: [] };
    const promptTemplate = "fsm/workers/trim-candidates.md";

    const hashV1 = computeHashKey({ state: "llm_trim", promptTemplate, inputs, repoRoot });
    recordOutputs(fixturesRoot, {
      state: "llm_trim",
      hashKey: hashV1,
      outputs: { picked_leaves: [], rejected_leaves: [], coverage_rescues: [] },
    });
    assert.ok(replayLookup(fixturesRoot, "llm_trim", hashV1));

    // Edit the prompt body — the path is the same, but the content
    // changed, so the hash MUST change. Same inputs, same state, same
    // path, different prompt body ⇒ replay-mode fixture for the old
    // prompt is no longer hit.
    writeFileSync(
      join(repoRoot, "fsm", "workers", "trim-candidates.md"),
      "# trim-candidates\nbody v2 — semantic change\n",
    );
    const hashV2 = computeHashKey({ state: "llm_trim", promptTemplate, inputs, repoRoot });
    assert.notEqual(hashV1, hashV2, "hash must change when the prompt body changes");
    assert.equal(
      replayLookup(fixturesRoot, "llm_trim", hashV2),
      null,
      "prompt drift must produce a replay miss, not a stale hit",
    );
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});

test("integration: input change → different hash → replay miss", () => {
  const repoRoot = makeTmpRepo();
  const fixturesRoot = join(repoRoot, "fixtures");
  try {
    const baseInputs = { tier: "sensitive", cap: 30, stage_a_candidates: [{ id: "a" }] };
    const promptTemplate = "fsm/workers/trim-candidates.md";

    const hashA = computeHashKey({ state: "llm_trim", promptTemplate, inputs: baseInputs, repoRoot });
    recordOutputs(fixturesRoot, {
      state: "llm_trim",
      hashKey: hashA,
      outputs: { picked_leaves: [{ id: "a" }] },
    });

    const hashB = computeHashKey({
      state: "llm_trim",
      promptTemplate,
      inputs: { ...baseInputs, tier: "full" }, // one field flipped
      repoRoot,
    });
    assert.notEqual(hashA, hashB);
    assert.equal(replayLookup(fixturesRoot, "llm_trim", hashB), null);
  } finally {
    rmSync(repoRoot, { recursive: true, force: true });
  }
});
