// Unit tests for scripts/assert-fresh-run.mjs — the structural fail-closed
// validator that every code-review run must pass before the LLM is allowed
// to declare the review complete (per SKILL.md). The tests cover the four
// fail paths (missing args, missing manifest, base/head mismatch, stale)
// plus the happy path.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { parseArgs, validateRun } from "../../scripts/assert-fresh-run.mjs";

function makeRunDir(storageRoot, runId, manifest, mtimeOverride = null) {
  // Mirror @ctxr/fsm's runDirPath layout: <storage>/<yyyy>/<mm>/<dd>/<shard>/<rest>/
  // run-id format: yyyymmdd-hhmmss-hash7  (per fsm-storage.mjs parseRunId)
  const [datePart, _timePart, hash7] = runId.split("-");
  const yyyy = datePart.slice(0, 4);
  const mm = datePart.slice(4, 6);
  const dd = datePart.slice(6, 8);
  const shard = hash7.slice(0, 2);
  const rest = hash7.slice(2);
  const dir = join(storageRoot, yyyy, mm, dd, shard, rest);
  mkdirSync(dir, { recursive: true });
  const manifestPath = join(dir, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  if (mtimeOverride !== null) {
    utimesSync(manifestPath, mtimeOverride / 1000, mtimeOverride / 1000);
  }
  return manifestPath;
}

const RUN_ID = "20260429-001234-abc1234";

test("parseArgs: --key value pairs", () => {
  const args = parseArgs([
    "node",
    "assert-fresh-run.mjs",
    "--run-id",
    RUN_ID,
    "--base",
    "feedface",
    "--head",
    "deadbeef",
  ]);
  assert.equal(args.runId, RUN_ID);
  assert.equal(args.base, "feedface");
  assert.equal(args.head, "deadbeef");
});

test("parseArgs: --key=value syntax", () => {
  const args = parseArgs([
    "node",
    "assert-fresh-run.mjs",
    `--run-id=${RUN_ID}`,
    "--base=abc",
    "--head=def",
    "--max-age-seconds=120",
  ]);
  assert.equal(args.runId, RUN_ID);
  assert.equal(args.base, "abc");
  assert.equal(args.head, "def");
  assert.equal(args.maxAgeSeconds, 120);
});

test("validateRun: missing required args fails with violation=args", () => {
  const r = validateRun({ runId: "", base: "a", head: "b", storageRoot: "/tmp" });
  assert.equal(r.ok, false);
  assert.equal(r.violation, "args");
});

test("validateRun: manifest missing fails with violation=manifest-missing", () => {
  const storageRoot = mkdtempSync(join(tmpdir(), "afr-"));
  const r = validateRun({
    runId: RUN_ID,
    base: "a",
    head: "b",
    storageRoot,
  });
  assert.equal(r.ok, false);
  assert.equal(r.violation, "manifest-missing");
  assert.match(r.message, /manifest\.json not found/);
});

test("validateRun: base mismatch fails with violation=base-mismatch", () => {
  const storageRoot = mkdtempSync(join(tmpdir(), "afr-"));
  makeRunDir(storageRoot, RUN_ID, {
    run_id: RUN_ID,
    base_sha: "WRONG",
    head_sha: "deadbeef",
  });
  const r = validateRun({
    runId: RUN_ID,
    base: "feedface",
    head: "deadbeef",
    storageRoot,
  });
  assert.equal(r.ok, false);
  assert.equal(r.violation, "base-mismatch");
  assert.equal(r.manifest_base, "WRONG");
  assert.equal(r.requested_base, "feedface");
});

test("validateRun: head mismatch fails with violation=head-mismatch", () => {
  const storageRoot = mkdtempSync(join(tmpdir(), "afr-"));
  makeRunDir(storageRoot, RUN_ID, {
    run_id: RUN_ID,
    base_sha: "feedface",
    head_sha: "WRONG",
  });
  const r = validateRun({
    runId: RUN_ID,
    base: "feedface",
    head: "deadbeef",
    storageRoot,
  });
  assert.equal(r.ok, false);
  assert.equal(r.violation, "head-mismatch");
});

test("validateRun: stale manifest (older than max-age-seconds) fails with violation=stale", () => {
  const storageRoot = mkdtempSync(join(tmpdir(), "afr-"));
  // Backdate the manifest by 1 hour. Default max-age is 600s (10 min).
  const oneHourAgo = Date.now() - 3600 * 1000;
  makeRunDir(
    storageRoot,
    RUN_ID,
    { run_id: RUN_ID, base_sha: "feedface", head_sha: "deadbeef" },
    oneHourAgo,
  );
  const r = validateRun({
    runId: RUN_ID,
    base: "feedface",
    head: "deadbeef",
    storageRoot,
    maxAgeSeconds: 600,
  });
  assert.equal(r.ok, false);
  assert.equal(r.violation, "stale");
  assert.ok(r.age_seconds > 600);
});

test("validateRun: happy path returns ok=true with manifest_path", () => {
  const storageRoot = mkdtempSync(join(tmpdir(), "afr-"));
  const manifestPath = makeRunDir(storageRoot, RUN_ID, {
    run_id: RUN_ID,
    base_sha: "feedface",
    head_sha: "deadbeef",
  });
  const r = validateRun({
    runId: RUN_ID,
    base: "feedface",
    head: "deadbeef",
    storageRoot,
  });
  assert.equal(r.ok, true);
  assert.equal(r.manifest_path, manifestPath);
});
