// fsm-storage.test.js — unit coverage for the FSM filesystem layer.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  acquireLock,
  appendTraceFile,
  atomicWriteFile,
  atomicWriteJson,
  atomicWriteYaml,
  buildRunId,
  ensureRunDir,
  listRecentRuns,
  parseRunId,
  readLock,
  readManifest,
  readTrace,
  releaseLock,
  runDirPath,
  writeManifest,
} from "../../scripts/lib/fsm-storage.mjs";

function tmpRoot() {
  return mkdtempSync(join(tmpdir(), "fsm-storage-"));
}

// ─── buildRunId / parseRunId ────────────────────────────────────────────

test("buildRunId: produces a well-formed YYYYMMDD-HHMMSS-hash7 id", () => {
  const fixed = new Date("2026-04-26T14:30:45Z");
  const result = buildRunId({ repo: "skill-code-review", baseSha: "abc", headSha: "def", timestamp: fixed });
  assert.match(result.runId, /^\d{8}-\d{6}-[0-9a-f]{7}$/);
  assert.equal(result.yyyy, "2026");
  assert.equal(result.mm, "04");
  assert.equal(result.dd, "26");
  assert.equal(result.shard.length, 2);
});

test("buildRunId: different inputs produce different ids", () => {
  const a = buildRunId({ repo: "X", timestamp: new Date("2026-04-26T14:30:45Z") });
  const b = buildRunId({ repo: "Y", timestamp: new Date("2026-04-26T14:30:45Z") });
  assert.notEqual(a.runId, b.runId);
});

test("buildRunId: rejects missing repo", () => {
  assert.throws(() => buildRunId({}), /repo is required/);
});

test("parseRunId: returns date and shard parts", () => {
  const parsed = parseRunId("20260426-143045-a3f7c9b");
  assert.deepEqual(parsed, {
    runId: "20260426-143045-a3f7c9b",
    yyyy: "2026",
    mm: "04",
    dd: "26",
    hh: "14",
    mi: "30",
    ss: "45",
    hash7: "a3f7c9b",
    shard: "a3",
    rest: "f7c9b",
  });
});

test("parseRunId: rejects malformed ids", () => {
  assert.throws(() => parseRunId("not-a-run-id"), /malformed/);
  assert.throws(() => parseRunId("20260426-143045-ZZZ"), /malformed/);
});

// ─── runDirPath / ensureRunDir ─────────────────────────────────────────

test("runDirPath: applies date + shard sharding", () => {
  const root = tmpRoot();
  try {
    const path = runDirPath("20260426-143045-a3f7c9b", { rootDir: root });
    assert.equal(
      path,
      join(root, ".skill-code-review", "2026", "04", "26", "a3", "f7c9b"),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("ensureRunDir: creates the full tree including fsm-trace and workers subdirs", () => {
  const root = tmpRoot();
  try {
    const dir = ensureRunDir("20260426-143045-a3f7c9b", { rootDir: root });
    assert.ok(existsSync(dir));
    assert.ok(existsSync(join(dir, "fsm-trace")));
    assert.ok(existsSync(join(dir, "workers")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ─── atomicWriteJson / atomicWriteYaml ──────────────────────────────────

test("atomicWriteJson: writes a tmp file then renames to the target", () => {
  const root = tmpRoot();
  try {
    const path = join(root, "out.json");
    atomicWriteJson(path, { hello: "world" });
    const result = JSON.parse(readBytes(path));
    assert.deepEqual(result, { hello: "world" });
    // No .tmp leftovers in the directory.
    assert.deepEqual(
      readdirSync(root).filter((n) => n.includes(".tmp.")),
      [],
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("atomicWriteYaml: round-trips structured data", async () => {
  const root = tmpRoot();
  try {
    const path = join(root, "out.yaml");
    atomicWriteYaml(path, { phase: "entry", state: "scan_project" });
    const text = readBytes(path);
    assert.match(text, /phase: entry/);
    assert.match(text, /state: scan_project/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ─── manifest.json round-trip ───────────────────────────────────────────

test("readManifest: returns null when missing; writeManifest persists; readManifest returns parsed", () => {
  const root = tmpRoot();
  const runId = "20260426-143045-a3f7c9b";
  try {
    assert.equal(readManifest(runId, { rootDir: root }), null);
    writeManifest(runId, { run_id: runId, status: "in_progress" }, { rootDir: root });
    const parsed = readManifest(runId, { rootDir: root });
    assert.equal(parsed.run_id, runId);
    assert.equal(parsed.status, "in_progress");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ─── lock acquire / release / stale recovery ───────────────────────────

test("acquireLock: first acquirer wins; second is rejected with the existing lock", () => {
  const root = tmpRoot();
  const runId = "20260426-143045-a3f7c9b";
  try {
    const a = acquireLock(runId, { sessionId: "session-A", ttlMs: 60_000, rootDir: root });
    assert.equal(a.acquired, true);
    assert.equal(a.lock.session_id, "session-A");
    const b = acquireLock(runId, { sessionId: "session-B", ttlMs: 60_000, rootDir: root });
    assert.equal(b.acquired, false);
    assert.equal(b.lock.session_id, "session-A");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("acquireLock: stale lock is recovered by the next acquirer", () => {
  const root = tmpRoot();
  const runId = "20260426-143045-a3f7c9b";
  try {
    // Plant an expired lock by hand.
    const dir = ensureRunDir(runId, { rootDir: root });
    const lockPath = join(dir, "lock.json");
    writeFileSync(
      lockPath,
      JSON.stringify({
        run_id: runId,
        session_id: "crashed-session",
        pid: 9999,
        acquired_at: "2020-01-01T00:00:00.000Z",
        expires_at: "2020-01-01T01:00:00.000Z",
      }),
    );
    const result = acquireLock(runId, { sessionId: "fresh-session", ttlMs: 60_000, rootDir: root });
    assert.equal(result.acquired, true);
    assert.equal(result.stale_recovered, true);
    assert.equal(result.prior_lock.session_id, "crashed-session");
    assert.equal(result.lock.session_id, "fresh-session");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("releaseLock: removes a lock owned by the caller; refuses on session mismatch", () => {
  const root = tmpRoot();
  const runId = "20260426-143045-a3f7c9b";
  try {
    acquireLock(runId, { sessionId: "session-A", ttlMs: 60_000, rootDir: root });
    const wrong = releaseLock(runId, { sessionId: "session-B", rootDir: root });
    assert.equal(wrong.released, false);
    assert.equal(wrong.reason, "not_owner");
    assert.ok(readLock(runId, { rootDir: root }));
    const right = releaseLock(runId, { sessionId: "session-A", rootDir: root });
    assert.equal(right.released, true);
    assert.equal(readLock(runId, { rootDir: root }), null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("releaseLock: returns no_lock when there is no lock to release", () => {
  const root = tmpRoot();
  const runId = "20260426-143045-a3f7c9b";
  try {
    ensureRunDir(runId, { rootDir: root });
    const result = releaseLock(runId, { sessionId: "session-A", rootDir: root });
    assert.equal(result.released, false);
    assert.equal(result.reason, "no_lock");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ─── trace files ───────────────────────────────────────────────────────

test("appendTraceFile: numbers files monotonically; readTrace returns sorted records", () => {
  const root = tmpRoot();
  const runId = "20260426-143045-a3f7c9b";
  try {
    const a = appendTraceFile(
      runId,
      { phase: "entry", state: "scan_project", data: { inputs: { args: {} } } },
      { rootDir: root },
    );
    const b = appendTraceFile(
      runId,
      { phase: "exit", state: "scan_project", data: { outputs: { project_profile: {} } } },
      { rootDir: root },
    );
    assert.equal(a.sequence, 1);
    assert.equal(b.sequence, 2);
    assert.equal(a.fileName, "0001-entry-scan_project.yaml");
    assert.equal(b.fileName, "0002-exit-scan_project.yaml");
    const trace = readTrace(runId, { rootDir: root });
    assert.equal(trace.length, 2);
    assert.equal(trace[0].data.phase, "entry");
    assert.equal(trace[1].data.phase, "exit");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("appendTraceFile: rejects invalid phase / empty state", () => {
  const root = tmpRoot();
  const runId = "20260426-143045-a3f7c9b";
  try {
    assert.throws(
      () => appendTraceFile(runId, { phase: "invalid", state: "x", data: {} }, { rootDir: root }),
      /phase must be entry/,
    );
    assert.throws(
      () => appendTraceFile(runId, { phase: "entry", state: "", data: {} }, { rootDir: root }),
      /state must be a non-empty/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ─── listRecentRuns ────────────────────────────────────────────────────

test("listRecentRuns: walks date-sharded folders and returns matching manifests", () => {
  const root = tmpRoot();
  try {
    // Build a few runs across two days.
    const r1 = "20260426-100000-a3f7c9b";
    const r2 = "20260426-110000-b1c2d3e";
    writeManifest(r1, { run_id: r1, status: "in_progress", repo: "X", head_sha: "head1" }, { rootDir: root });
    writeManifest(r2, { run_id: r2, status: "completed", repo: "X", head_sha: "head1" }, { rootDir: root });
    const all = listRecentRuns({
      daysBack: 365,
      now: new Date("2026-04-27T00:00:00Z"),
      rootDir: root,
    });
    const ids = all.map((r) => r.manifest.run_id).sort();
    assert.deepEqual(ids, [r1, r2]);
    const inProgress = listRecentRuns({
      daysBack: 365,
      now: new Date("2026-04-27T00:00:00Z"),
      rootDir: root,
      filter: (m) => m.status === "in_progress",
    });
    assert.equal(inProgress.length, 1);
    assert.equal(inProgress[0].manifest.run_id, r1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("listRecentRuns: returns empty when root does not exist", () => {
  const root = tmpRoot();
  try {
    assert.deepEqual(listRecentRuns({ rootDir: root }), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// helpers
import { readFileSync } from "node:fs";
function readBytes(path) {
  return readFileSync(path, "utf8");
}

// ─── atomicWriteFile (low-level) ────────────────────────────────────────

test("atomicWriteFile: leaves no .tmp leftovers on success", () => {
  const root = tmpRoot();
  try {
    const path = join(root, "out.txt");
    atomicWriteFile(path, "hello");
    assert.equal(readBytes(path), "hello");
    assert.deepEqual(
      readdirSync(root).filter((n) => n.includes(".tmp.")),
      [],
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
