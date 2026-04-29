// Integration test: prove that scripts/run-review.mjs is invocable as a
// standalone entry point AND that --start → --continue can chain across
// subprocess boundaries (regression coverage for #67 — the session-id
// threading bug that made --continue fail with lock_not_held).
//
// The first test pins the --start brief shape (SKILL.md depends on it).
// The second test exercises a real --start → --continue round-trip with
// a worker output that drives the FSM into the trivial-tier short-circuit
// path: project-scanner → risk_tier_triage (inline) → short_circuit_exit
// → write_run_directory → emit_stdout → terminal. That hits at least one
// fsm-commit subprocess, which is exactly where the lock_not_held bug
// surfaced before #67.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveSettings, runDirPath } from "@ctxr/fsm";
import { validateRun } from "../../scripts/assert-fresh-run.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("runner --start: emits awaiting_worker JSON with project-scanner brief and writes manifest", () => {
  // Use sentinel SHA-shaped strings; the runner only validates the shape
  // (alnum / _ . / - @ ^ ~ { }, no leading dash) — it does NOT verify the
  // ref resolves against the working tree until a worker actually runs git.
  const baseSha = "0000000000000000000000000000000000000001";
  const headSha = "0000000000000000000000000000000000000002";

  const result = spawnSync(
    process.execPath,
    [
      "scripts/run-review.mjs",
      "--start",
      "--base",
      baseSha,
      "--head",
      headSha,
    ],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 30_000 },
  );

  // The runner exits 0 after emitting the awaiting_worker brief and
  // returning control to the caller (caller is responsible for dispatching
  // workers and re-invoking with --continue). Stderr may carry @ctxr/fsm
  // diagnostics; ignore for this test.
  assert.equal(
    result.status,
    0,
    `runner exited with status ${result.status}; stderr: ${result.stderr}`,
  );

  // The runner emits one or more JSON objects, one per stdout line. The
  // FIRST line MUST be the awaiting_worker brief for the entry state.
  const lines = result.stdout
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  assert.ok(lines.length > 0, "runner emitted no stdout");
  const firstLine = JSON.parse(lines[0]);

  assert.equal(firstLine.status, "awaiting_worker");
  assert.match(
    firstLine.run_id,
    /^\d{8}-\d{6}-[0-9a-f]{7}$/,
    `run_id "${firstLine.run_id}" doesn't match the documented yyyymmdd-hhmmss-hash7 shape`,
  );
  assert.ok(firstLine.brief, "missing brief object");
  assert.equal(firstLine.brief.state, "scan_project");
  assert.equal(firstLine.brief.worker?.role, "project-scanner");
  assert.equal(firstLine.brief.worker?.prompt_template, "workers/project-scanner.md");

  // PR A regression for divergence #7: the runner must ship the worker
  // prompt body inside brief.worker.prompt_body so the orchestrator does
  // not need to Read the file separately. Assert the bytes are present
  // and match the actual on-disk file.
  assert.ok(
    typeof firstLine.brief.worker?.prompt_body === "string"
      && firstLine.brief.worker.prompt_body.length > 0,
    "brief.worker.prompt_body must be a non-empty string",
  );
  const promptOnDisk = readFileSync(
    `${REPO_ROOT}/fsm/workers/project-scanner.md`,
    "utf8",
  );
  assert.equal(
    firstLine.brief.worker.prompt_body,
    promptOnDisk,
    "brief.worker.prompt_body must equal fsm/workers/project-scanner.md byte-for-byte",
  );

  // The FSM engine seeds the manifest at run-init with base_sha / head_sha
  // taken from --base / --head. Confirm assert-fresh-run.mjs accepts it.
  const settings = resolveSettings({ fsmName: "code-reviewer" }, REPO_ROOT);
  const storageRoot = resolve(REPO_ROOT, settings.storageRoot);
  const runDir = runDirPath(firstLine.run_id, { storageRoot });
  const manifestPath = `${runDir}/manifest.json`;
  assert.ok(
    existsSync(manifestPath),
    `expected manifest at ${manifestPath} after --start`,
  );

  // The manifest carries base_sha/head_sha as set by the FSM engine, so
  // assert-fresh-run.mjs's mismatch path is reachable.
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  assert.equal(manifest.base_sha, baseSha);
  assert.equal(manifest.head_sha, headSha);

  // Direct API call (avoids spawning yet another process).
  const ok = validateRun({
    runId: firstLine.run_id,
    base: baseSha,
    head: headSha,
    storageRoot,
  });
  assert.equal(ok.ok, true, `validateRun failed: ${JSON.stringify(ok)}`);

  const mismatched = validateRun({
    runId: firstLine.run_id,
    base: "wrong-sha",
    head: headSha,
    storageRoot,
  });
  assert.equal(mismatched.ok, false);
  assert.equal(mismatched.violation, "base-mismatch");
});

test("runner --start → --continue: chains across subprocesses without lock_not_held (regression for #67)", () => {
  // Drive a full --start → --continue round-trip with a worker output
  // that pushes the FSM into the trivial-tier short-circuit path. This
  // exercises at least one fsm-commit subprocess (exactly where the
  // lock_not_held bug surfaced) AND the inline-state advancement loop
  // through short_circuit_exit → write_run_directory → emit_stdout →
  // terminal.
  const baseSha = "1111111111111111111111111111111111111111";
  const headSha = "2222222222222222222222222222222222222222";

  const start = spawnSync(
    process.execPath,
    [
      "scripts/run-review.mjs",
      "--start",
      "--base",
      baseSha,
      "--head",
      headSha,
    ],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 30_000 },
  );
  assert.equal(start.status, 0, `--start exited ${start.status}; stderr: ${start.stderr}`);
  const startLine = JSON.parse(start.stdout.split("\n").filter(Boolean)[0]);
  assert.equal(startLine.status, "awaiting_worker");
  const runId = startLine.run_id;

  // Trivial-tier project-scanner output: 1 file, 1 line changed, no
  // risk-path match → risk_tier_triage emits tier=trivial → FSM jumps to
  // short_circuit_exit, writes the run dir, emits stdout, hits terminal.
  const tmpFile = `/tmp/e2e-runner-${runId}.json`;
  writeFileSync(
    tmpFile,
    JSON.stringify({
      project_profile: {
        languages: ["md"],
        frameworks: [],
        monorepo: false,
      },
      changed_paths: ["README.md"],
      diff_stats: { lines_changed: 1, files_changed: 1 },
    }),
  );

  try {
    const cont = spawnSync(
      process.execPath,
      [
        "scripts/run-review.mjs",
        "--continue",
        "--run-id",
        runId,
        "--outputs-file",
        tmpFile,
      ],
      { encoding: "utf8", cwd: REPO_ROOT, timeout: 30_000 },
    );

    // The CRITICAL assertion for #67: --continue must NOT fail with
    // lock_not_held. Before the fix, this is exactly where the runner
    // exits 1 with that error.
    assert.equal(
      /lock_not_held/.test(cont.stdout + cont.stderr),
      false,
      `--continue failed with lock_not_held; #67 regression. stdout=${cont.stdout} stderr=${cont.stderr}`,
    );
    assert.equal(
      cont.status,
      0,
      `--continue exited ${cont.status}; stdout=${cont.stdout} stderr=${cont.stderr}`,
    );

    // The runner advances all the way through the trivial-tier
    // short-circuit path: scan_project (committed) → risk_tier_triage
    // (inline, tier=trivial) → short_circuit_exit → write_run_directory
    // → emit_stdout. The report.md / report.json / manifest.json are
    // persisted under .skill-code-review/<…>/<run-id>/ and the report
    // is mirrored to stdout, with a "Manifest: <path>" trailer.
    // emit-stdout.mjs sends the Manifest: trailer to stderr when format
    // resolves to JSON (so stdout stays valid JSON for downstream parsers).
    // Non-TTY spawnSync stdout always resolves to JSON in format=auto.
    assert.match(
      cont.stderr,
      /Manifest: .*manifest\.json/,
      `--continue did not emit the Manifest trailer; stderr=${cont.stderr}`,
    );

    // PR A regression for divergence #2: the runner must NOT emit a
    // trailing fault payload after the canonical report+Manifest. The
    // pre-fix runner would dispatch the no-op `terminal` state as an
    // inline state, fail to find an `inline-states/terminal.mjs` handler,
    // and emit a spurious {"status":"fault","fault":{"state":"terminal",
    // "reason":"Inline-state handler not found..."}} AFTER the report.
    // The fix in loop() detects state==="terminal" and calls fsm-commit
    // one more time with empty outputs to get the proper terminal payload.
    assert.equal(
      /"state"\s*:\s*"terminal".*Inline-state handler not found/.test(
        cont.stdout + cont.stderr,
      ),
      false,
      `--continue trailed the no-op terminal-state fault; PR A regression. stdout=${cont.stdout} stderr=${cont.stderr}`,
    );

    // Read the canonical report.json from the run dir directly (avoids
    // parsing the multi-line pretty-printed JSON out of stdout).
    const settings = resolveSettings({ fsmName: "code-reviewer" }, REPO_ROOT);
    const storageRoot = resolve(REPO_ROOT, settings.storageRoot);
    const runDir = runDirPath(runId, { storageRoot });
    const reportJsonPath = `${runDir}/report.json`;
    assert.ok(
      existsSync(reportJsonPath),
      `expected report.json at ${reportJsonPath} after --continue`,
    );
    const report = JSON.parse(readFileSync(reportJsonPath, "utf8"));
    assert.equal(report.verdict, "GO", "trivial-tier short-circuit must produce GO");
    assert.equal(report.summary.files_changed, 1);

    // assert-fresh-run validates the manifest end-to-end.
    const ok = validateRun({ runId, base: baseSha, head: headSha, storageRoot });
    assert.equal(ok.ok, true, `validateRun failed after --continue: ${JSON.stringify(ok)}`);
  } finally {
    // tmpFile cleanup is best-effort; the test machine's /tmp gets swept.
  }
});
