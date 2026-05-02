// diff-shard.test.js — unit tests for the shardFilteredDiff helper.
//
// Sharding kicks in when one leaf's pre-computed filtered diff exceeds
// SPECIALIST_DIFF_SHARD_THRESHOLD_BYTES (default 256KB; the env var
// overrides per-run for cost-sensitive batches that prefer many cheap
// Agents over a few expensive ones). The runner stages one prompt per
// shard so the dispatched specialist sees a focused per-file slice
// rather than a multi-hundred-KB blob. These tests lock down the
// partitioning contract: split on `^diff --git a/<path>` markers,
// never split inside a file, byte-equal concatenation across shards,
// trivial passthrough below threshold.

import { test } from "node:test";
import assert from "node:assert/strict";

import { shardFilteredDiff } from "../../scripts/run-review.mjs";

// Minimal `git diff` body for one file. Real diffs include
// `index <hash>..<hash>` and `---`/`+++` lines, but for partitioning the
// only required marker is `diff --git a/<path> b/<path>`.
function makeFileDiff(path, body = "@@ -1 +1 @@\n-old\n+new") {
  return `diff --git a/${path} b/${path}\nindex 0000..1111 100644\n--- a/${path}\n+++ b/${path}\n${body}\n`;
}

test("shardFilteredDiff: empty input returns one empty shard", () => {
  const out = shardFilteredDiff("");
  assert.equal(out.length, 1);
  assert.equal(out[0].shardIdx, 0);
  assert.deepEqual(out[0].files, []);
  assert.equal(out[0].diffText, "");
});

test("shardFilteredDiff: diff under threshold returns one shard with all files", () => {
  const text = makeFileDiff("a.js") + makeFileDiff("b.ts");
  const out = shardFilteredDiff(text, { threshold: 1024 * 1024 });
  assert.equal(out.length, 1);
  assert.deepEqual(out[0].files, ["a.js", "b.ts"]);
  assert.equal(out[0].diffText, text);
});

test("shardFilteredDiff: diff over threshold splits on file boundaries", () => {
  // Three files, each ~150 bytes. Threshold = 200 → first file fits in
  // shard 0; adding second pushes us over → flush, file 2 starts shard 1
  // alone (also still under threshold so file 3 packs with it).
  // Actually shard packing is greedy: the test asserts each file appears
  // in exactly one shard and concatenation round-trips.
  const fileA = makeFileDiff("a.js", "@@ -1 +1 @@\n-aaa\n+aaa-changed");
  const fileB = makeFileDiff("b.ts", "@@ -1 +1 @@\n-bbb\n+bbb-changed");
  const fileC = makeFileDiff("c.go", "@@ -1 +1 @@\n-ccc\n+ccc-changed");
  const text = fileA + fileB + fileC;
  const out = shardFilteredDiff(text, { threshold: 250 });
  assert.ok(out.length >= 2, `expected ≥2 shards, got ${out.length}`);
  // Every file appears in exactly one shard.
  const seen = new Set();
  for (const shard of out) {
    for (const f of shard.files) {
      assert.ok(!seen.has(f), `file ${f} appears in two shards`);
      seen.add(f);
    }
  }
  assert.deepEqual([...seen].sort(), ["a.js", "b.ts", "c.go"]);
  // Concatenation across shards in order yields the original.
  const recombined = out.map((s) => s.diffText).join("");
  assert.equal(recombined, text);
  // Shard indices are 0..N-1 ascending.
  assert.deepEqual(out.map((s) => s.shardIdx), out.map((_, i) => i));
});

test("shardFilteredDiff: a single file larger than threshold goes alone in its own shard", () => {
  // We never split inside a file — a 100KB single-file diff with a 32KB
  // threshold should still produce one shard (containing just that file)
  // rather than mid-file fragmentation.
  const huge = makeFileDiff("huge.json", "@@ -1 +1 @@\n" + "x".repeat(100_000));
  const out = shardFilteredDiff(huge, { threshold: 32 * 1024 });
  assert.equal(out.length, 1);
  assert.deepEqual(out[0].files, ["huge.json"]);
  assert.equal(out[0].diffText, huge);
});

test("shardFilteredDiff: input without git markers returns a single shard", () => {
  // A "(diff unavailable: ...)" placeholder or any non-git-formatted
  // text shouldn't crash — emit one shard and let the dispatched
  // specialist see the placeholder verbatim.
  const out = shardFilteredDiff("(diff unavailable: base/head shas unavailable)");
  assert.equal(out.length, 1);
  assert.deepEqual(out[0].files, []);
  assert.match(out[0].diffText, /diff unavailable/);
});

test("shardFilteredDiff: leading text before first diff --git marker attaches to first shard", () => {
  // git diff sometimes emits a header / commit-summary line before the
  // first `diff --git` (e.g. when invoked via `git format-patch`). The
  // partitioner must preserve that header and not lose it on shard split.
  const header = "From abc123\nSubject: example\n\n";
  const a = makeFileDiff("a.js");
  const b = makeFileDiff("b.ts", "@@ -1 +1 @@\n" + "x".repeat(500));
  const text = header + a + b;
  const out = shardFilteredDiff(text, { threshold: 600 });
  assert.ok(out.length >= 1);
  // The header sits in shard 0's diffText.
  assert.ok(out[0].diffText.startsWith(header), `expected header at shard 0 start, got: ${out[0].diffText.slice(0, 50)}`);
  // Re-concatenation still round-trips.
  assert.equal(out.map((s) => s.diffText).join(""), text);
});

test("shardFilteredDiff: default threshold (256KB) packs files that the previous 32KB default would have split", () => {
  // Locks down the round-30 behaviour change: the default threshold
  // bumped from 32KB to 256KB so that a leaf with file_globs="**/*.js"
  // matching N mid-sized changed files is dispatched as ONE Agent
  // reviewing all N files, instead of being split across multiple
  // shard Agents under the old default. (shardFilteredDiff packs
  // files greedily — under 32KB it could produce anywhere from 2 to
  // N shards depending on file sizes; under 256KB the same fixture
  // typically fits in 1.) Modern Claude models comfortably handle
  // 200-400KB of prompt; sharding now only fires for genuinely
  // large filtered diffs.
  //
  // To actually distinguish the new 256KB default from the previous
  // 32KB default, the synthetic diff must straddle 32KB (so the old
  // default WOULD have split it) while staying under 256KB (so the
  // new default keeps it in one shard). Six ~10KB files = ~60KB
  // total — well above 32KB, well below 256KB. Asserting both
  // (out.length === 1 under default AND out.length > 1 under
  // explicit threshold = 32KB) catches a regression that accidentally
  // restores the old default value.
  const filler = "+ // ".repeat(2000); // ~10KB per file
  const fileDiffs = [];
  for (let i = 0; i < 6; i++) {
    fileDiffs.push(makeFileDiff(`file-${i}.js`, `@@ -1 +1 @@\n-old\n${filler}`));
  }
  const text = fileDiffs.join("");
  // The synthetic diff is intentionally above the previous 32KB
  // default and below the new 256KB default — that's the regression
  // band we're locking down.
  assert.ok(
    text.length > 32 * 1024 && text.length < 256 * 1024,
    `test fixture must straddle the old/new threshold band; got ${text.length} bytes`,
  );
  const outDefault = shardFilteredDiff(text); // no opts → 256KB default
  assert.equal(outDefault.length, 1, "256KB default must pack the 6×10KB files into one shard");
  assert.equal(outDefault[0].files.length, 6);
  assert.equal(outDefault[0].diffText, text);
  // Under the OLD 32KB threshold (passed explicitly), the same fixture
  // splits — which is exactly the bug the new default is meant to fix.
  // If a future change accidentally restores 32KB as the default,
  // outDefault.length above would jump to >1 and this test would fail.
  const outOld = shardFilteredDiff(text, { threshold: 32 * 1024 });
  assert.ok(outOld.length > 1, `32KB threshold must split the same fixture; got ${outOld.length} shard(s)`);
});

test("shardFilteredDiff: env var SPECIALIST_DIFF_SHARD_THRESHOLD_BYTES overrides default", () => {
  const original = process.env.SPECIALIST_DIFF_SHARD_THRESHOLD_BYTES;
  process.env.SPECIALIST_DIFF_SHARD_THRESHOLD_BYTES = "100";
  try {
    const text = makeFileDiff("a.js") + makeFileDiff("b.ts") + makeFileDiff("c.go");
    const out = shardFilteredDiff(text); // no opts.threshold → use env
    assert.ok(out.length >= 2, `expected env var to lower threshold; got ${out.length} shard(s)`);
  } finally {
    if (original === undefined) delete process.env.SPECIALIST_DIFF_SHARD_THRESHOLD_BYTES;
    else process.env.SPECIALIST_DIFF_SHARD_THRESHOLD_BYTES = original;
  }
});

test("shardFilteredDiff: handles paths with spaces (git's quoted form)", () => {
  // git diff emits `diff --git "a/path with space" "b/path with space"`
  // when paths contain spaces (or when core.quotepath surfaces non-
  // ASCII via backslash escapes). The shard partitioner must extract
  // the b-side path from the quoted shape, not silently skip the
  // header (which would leave the whole diff in shard 0's leading
  // header chunk and defeat sharding).
  const quoted = `diff --git "a/dir with space/file.txt" "b/dir with space/file.txt"\n--- "a/dir with space/file.txt"\n+++ "b/dir with space/file.txt"\n@@ -1 +1 @@\n-old\n+new\n`;
  const out = shardFilteredDiff(quoted, { threshold: 1024 * 1024 });
  assert.equal(out.length, 1);
  assert.deepEqual(out[0].files, ["dir with space/file.txt"]);
});

test("shardFilteredDiff: mixed bare + quoted headers extract files correctly", () => {
  // Real-world diff: one file with spaces (quoted), one without
  // (bare). The partitioner must recognise both shapes.
  const bare = `diff --git a/normal.txt b/normal.txt\nindex 0000..1111 100644\n--- a/normal.txt\n+++ b/normal.txt\n@@ -1 +1 @@\n-x\n+y\n`;
  const quoted = `diff --git "a/path with space.md" "b/path with space.md"\nindex 0000..1111 100644\n--- "a/path with space.md"\n+++ "b/path with space.md"\n@@ -1 +1 @@\n-x\n+y\n`;
  const out = shardFilteredDiff(bare + quoted, { threshold: 50 });
  // Both files are seen; concat round-trips.
  const allFiles = out.flatMap((s) => s.files).sort();
  assert.deepEqual(allFiles, ["normal.txt", "path with space.md"].sort());
  assert.equal(out.map((s) => s.diffText).join(""), bare + quoted);
});

test("shardFilteredDiff: invalid threshold falls back to default", () => {
  // Negative or non-integer threshold options are ignored; the helper
  // uses the default rather than crashing or producing zero shards.
  const text = makeFileDiff("a.js");
  const negative = shardFilteredDiff(text, { threshold: -1 });
  assert.equal(negative.length, 1);
  const fractional = shardFilteredDiff(text, { threshold: 1.5 });
  assert.equal(fractional.length, 1);
});

test("shardFilteredDiff: tolerates CRLF line endings (Windows-encoded diffs)", () => {
  // Repro: a CRLF-encoded diff (legitimate output from Windows
  // toolchains, or a fixture authored on Windows) would silently fail
  // every header match because the `...$`-anchored regexes in
  // parseDiffGitHeader don't match the trailing `\r`. Without CRLF
  // tolerance, shardFilteredDiff would emit a single shard with no
  // files[], defeating sharding for the whole leaf. With the fix
  // (single trailing \r is stripped before regex match), CRLF input
  // partitions identically to LF input.
  const lf = makeFileDiff("a.js") + makeFileDiff("b.ts");
  const crlf = lf.replace(/\n/g, "\r\n");
  const out = shardFilteredDiff(crlf, { threshold: 1024 * 1024 });
  assert.equal(out.length, 1);
  assert.deepEqual(out[0].files, ["a.js", "b.ts"], "files[] must be extracted from CRLF headers");
  // Round-trip preserved: concatenation across shards equals the input.
  assert.equal(out.map((s) => s.diffText).join(""), crlf);
});
