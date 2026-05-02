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
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
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

  // PR for #76: brief carries a canonical outputs_path under
  // <run_dir>/workers/<state>-output.json. Assert it's present and
  // shaped right.
  assert.equal(typeof firstLine.brief.outputs_path, "string");
  assert.ok(
    firstLine.brief.outputs_path.endsWith("workers/scan_project-output.json"),
    `outputs_path should end with workers/scan_project-output.json; got ${firstLine.brief.outputs_path}`,
  );

  // The FSM engine seeds the manifest at run-init with base_sha / head_sha
  // taken from --base / --head. Confirm assert-fresh-run.mjs accepts it.
  const settings = resolveSettings({ fsmName: "code-reviewer" }, REPO_ROOT);
  const storageRoot = resolve(REPO_ROOT, settings.storageRoot);
  const runDir = runDirPath(firstLine.run_id, { storageRoot });

  // PR for #76: the runner persists the brief to
  // <run_dir>/workers/<state>-brief.json on every pause. Assert the
  // file exists and matches the stdout brief byte-for-byte.
  const briefOnDiskPath = `${runDir}/workers/scan_project-brief.json`;
  assert.ok(
    existsSync(briefOnDiskPath),
    `expected on-disk brief at ${briefOnDiskPath}`,
  );
  const briefOnDisk = JSON.parse(readFileSync(briefOnDiskPath, "utf8"));
  assert.deepEqual(
    briefOnDisk,
    firstLine.brief,
    "<run_dir>/workers/scan_project-brief.json must equal the stdout brief",
  );

  // PR for #79: the runner pre-stages the agent dispatch prompt at
  // <run_dir>/workers/<state>-dispatch-prompt.md on every pause. Assert
  // it's present and contains the worker prompt body's opening header.
  const dispatchPromptOnDiskPath = `${runDir}/workers/scan_project-dispatch-prompt.md`;
  assert.ok(
    existsSync(dispatchPromptOnDiskPath),
    `expected dispatch prompt at ${dispatchPromptOnDiskPath}`,
  );
  const dispatchPromptOnDisk = readFileSync(dispatchPromptOnDiskPath, "utf8");
  assert.match(
    dispatchPromptOnDisk,
    /# Worker: project-scanner/,
    "dispatch prompt should embed the worker prompt body",
  );
  assert.match(
    dispatchPromptOnDisk,
    /--- INPUTS \(from FSM env\) ---/,
    "dispatch prompt should include the INPUTS section",
  );
  assert.match(
    dispatchPromptOnDisk,
    /--- OUTPUTS PATH ---/,
    "dispatch prompt should include the OUTPUTS PATH section",
  );
  assert.ok(
    dispatchPromptOnDisk.includes(firstLine.brief.outputs_path),
    "dispatch prompt should name the canonical outputs_path",
  );

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
  //
  // PR for #76: write to brief.outputs_path (the canonical path the
  // runner shipped), and call --continue WITHOUT --outputs-file so the
  // runner's default-path lookup is exercised.
  const outputsPath = startLine.brief.outputs_path;
  assert.equal(typeof outputsPath, "string");
  writeFileSync(
    outputsPath,
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
        // No --outputs-file: runner defaults to brief.outputs_path.
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
    // outputsPath cleanup is best-effort; the run-dir is gitignored.
  }
});

test("runner --resume: re-emits the current pause brief from disk (regression for #76)", () => {
  // Drives --start, captures the brief on disk, then runs --resume
  // and asserts the runner re-emits the same brief from
  // <run_dir>/workers/<state>-brief.json without spawning fsm-next
  // and without touching the lock.
  const baseSha = "3333333333333333333333333333333333333333";
  const headSha = "4444444444444444444444444444444444444444";

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
  const runId = startLine.run_id;
  const originalBrief = startLine.brief;

  // The runner persisted the brief to disk during the pause. Confirm
  // the file exists under <run_dir>/workers/<state>-brief.json.
  const settings = resolveSettings({ fsmName: "code-reviewer" }, REPO_ROOT);
  const storageRoot = resolve(REPO_ROOT, settings.storageRoot);
  const runDir = runDirPath(runId, { storageRoot });
  const briefOnDiskPath = `${runDir}/workers/scan_project-brief.json`;
  assert.ok(existsSync(briefOnDiskPath), `expected ${briefOnDiskPath}`);

  // --resume re-emits the brief.
  const resume = spawnSync(
    process.execPath,
    [
      "scripts/run-review.mjs",
      "--resume",
      "--run-id",
      runId,
    ],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 30_000 },
  );
  assert.equal(
    resume.status,
    0,
    `--resume exited ${resume.status}; stdout=${resume.stdout} stderr=${resume.stderr}`,
  );
  const resumeLine = JSON.parse(resume.stdout.split("\n").filter(Boolean)[0]);
  assert.equal(resumeLine.status, "awaiting_worker");
  assert.equal(resumeLine.run_id, runId);

  // The resumed brief equals the original brief from --start
  // byte-for-byte (modulo no nondeterministic fields — both come from
  // the same disk file).
  assert.deepEqual(
    resumeLine.brief,
    originalBrief,
    "--resume must re-emit the same brief --start did, byte-for-byte",
  );
});

test("runner --print-X CLIs: drive the documented orchestrator loop without /tmp (regression for #79)", () => {
  // Drives the full --print-run-dir / --print-current-state /
  // --print-dispatch-prompt loop, asserting every step works without
  // any /tmp file or python3 -c invocation. This is the canonical
  // orchestrator workflow SKILL.md documents.
  const baseSha = "7777777777777777777777777777777777777777";
  const headSha = "8888888888888888888888888888888888888888";

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
  const runId = startLine.run_id;

  // --print-run-dir: emits the absolute run-dir path.
  const printRunDir = spawnSync(
    process.execPath,
    ["scripts/run-review.mjs", "--print-run-dir", "--run-id", runId],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 5_000 },
  );
  assert.equal(printRunDir.status, 0, `--print-run-dir exited ${printRunDir.status}`);
  const runDirFromCli = printRunDir.stdout.trim();
  // Cross-check against the resolved path another way.
  const settings = resolveSettings({ fsmName: "code-reviewer" }, REPO_ROOT);
  const storageRoot = resolve(REPO_ROOT, settings.storageRoot);
  const runDirExpected = runDirPath(runId, { storageRoot });
  assert.equal(runDirFromCli, runDirExpected, "--print-run-dir output must match runDirPath()");

  // --print-current-state: emits the manifest's current_state.
  const printState = spawnSync(
    process.execPath,
    ["scripts/run-review.mjs", "--print-current-state", "--run-id", runId],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 5_000 },
  );
  assert.equal(printState.status, 0, `--print-current-state exited ${printState.status}`);
  assert.equal(
    printState.stdout.trim(),
    "scan_project",
    "--print-current-state should return the entry-state name on a fresh --start",
  );

  // --print-dispatch-prompt: emits the on-disk dispatch prompt verbatim.
  const printPrompt = spawnSync(
    process.execPath,
    ["scripts/run-review.mjs", "--print-dispatch-prompt", "--run-id", runId],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 5_000 },
  );
  assert.equal(printPrompt.status, 0, `--print-dispatch-prompt exited ${printPrompt.status}`);
  // The CLI output must equal the on-disk file byte-for-byte.
  const printedPromptPath = `${runDirExpected}/workers/scan_project-dispatch-prompt.md`;
  const printedPromptOnDisk = readFileSync(printedPromptPath, "utf8");
  assert.equal(
    printPrompt.stdout,
    printedPromptOnDisk,
    "--print-dispatch-prompt must emit the on-disk file byte-for-byte",
  );

  // Negative path: --print-dispatch-prompt without --run-id fails fast.
  const noRun = spawnSync(
    process.execPath,
    ["scripts/run-review.mjs", "--print-dispatch-prompt"],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 5_000 },
  );
  assert.notEqual(noRun.status, 0, "--print-dispatch-prompt without --run-id must hard-fail");
});

test("--print-pending-leaf-ids and --print-agent-shim-prompt: end-to-end CLI contract", () => {
  // CLI-level smoke for the two new modes (#93). The dispatch_specialists
  // brief / per-leaf prompts are constructed inline (no real diff) so we
  // exercise the args parsing and the on-disk lookup paths without
  // burning a real specialist dispatch. This proves:
  //   - --print-pending-leaf-ids emits ids only for leaves whose output
  //     file is missing AND prompt file exists
  //   - --batch-size N caps the emitted list at N
  //   - empty pending list exits 0 with empty stdout
  //   - --print-agent-shim-prompt emits the canonical shim text
  //   - bad inputs (missing --run-id, missing --leaf-id) hard-fail
  // Synthetic 40-hex refs (matching the pattern other tests in this
  // file use): the rest of this test fabricates workers/* files
  // manually rather than driving real workers, so the runner only
  // needs to record these values, not resolve them as live commits.
  // Using HEAD~1 here was nondeterministic under shallow clones
  // (actions/checkout@v4 defaults to fetch-depth=1 in this repo's
  // CI), where HEAD~1 may not exist and --start would fail.
  const baseSha = "5555555555555555555555555555555555555555";
  const headSha = "6666666666666666666666666666666666666666";
  const start = spawnSync(
    process.execPath,
    ["scripts/run-review.mjs", "--start", "--base", baseSha, "--head", headSha],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 30_000 },
  );
  assert.equal(start.status, 0, `--start exited ${start.status}; stderr: ${start.stderr}`);
  const runId = JSON.parse(start.stdout.split("\n").filter(Boolean)[0]).run_id;

  // Construct a synthetic dispatch_specialists brief + per-leaf prompts
  // under this run's workers/ dir. The runner only paused at scan_project
  // so we have to fabricate the dispatch_specialists state for the test.
  const settings = resolveSettings({ fsmName: "code-reviewer" }, REPO_ROOT);
  const storageRoot = resolve(REPO_ROOT, settings.storageRoot);
  const runDir = runDirPath(runId, { storageRoot });
  const workersDir = join(runDir, "workers");
  // Two synthetic leaves: alpha staged with prompt only (pending),
  // beta staged with prompt AND output (not pending).
  const briefShape = {
    run_id: runId,
    state: "dispatch_specialists",
    inputs: {
      picked_leaves: [
        { id: "cli-alpha", path: "x/cli-alpha.md", justification: "j", dimensions: ["correctness"] },
        { id: "cli-beta", path: "x/cli-beta.md", justification: "j", dimensions: ["correctness"] },
      ],
    },
  };
  writeFileSync(join(workersDir, "dispatch_specialists-brief.json"), JSON.stringify(briefShape));
  writeFileSync(join(workersDir, "dispatch_specialists-prompt-cli-alpha.md"), "<staged>\n");
  writeFileSync(join(workersDir, "dispatch_specialists-prompt-cli-beta.md"), "<staged>\n");
  writeFileSync(
    join(workersDir, "dispatch_specialists-output-cli-beta.json"),
    JSON.stringify({ id: "cli-beta", status: "completed", findings: [] }),
  );
  // --print-pending-leaf-ids validates manifest.current_state is
  // dispatch_specialists before reading the brief (defends against
  // stale-brief mis-reads on advanced runs). The run is actually
  // paused at scan_project; mutate the manifest in place to
  // simulate the dispatch_specialists pause for this CLI smoke test.
  const manifestPath = `${runDir}/manifest.json`;
  const realManifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  realManifest.current_state = "dispatch_specialists";
  writeFileSync(manifestPath, JSON.stringify(realManifest));

  // --print-pending-leaf-ids returns just "cli-alpha" (cli-beta has its
  // output already on disk).
  const pending = spawnSync(
    process.execPath,
    ["scripts/run-review.mjs", "--print-pending-leaf-ids", "--run-id", runId],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 5_000 },
  );
  assert.equal(pending.status, 0, `--print-pending-leaf-ids exited ${pending.status}; stderr: ${pending.stderr}`);
  const pendingIds = pending.stdout.split("\n").filter(Boolean);
  assert.deepEqual(pendingIds, ["cli-alpha"], "only un-output leaf should be pending");

  // --batch-size 1 also returns "cli-alpha" (only one is pending).
  const pendingBatch = spawnSync(
    process.execPath,
    ["scripts/run-review.mjs", "--print-pending-leaf-ids", "--run-id", runId, "--batch-size", "1"],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 5_000 },
  );
  assert.equal(pendingBatch.status, 0);
  assert.equal(pendingBatch.stdout.trim(), "cli-alpha");

  // --print-agent-shim-prompt returns the canonical shim text.
  const shim = spawnSync(
    process.execPath,
    ["scripts/run-review.mjs", "--print-agent-shim-prompt", "--run-id", runId, "--leaf-id", "cli-alpha"],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 5_000 },
  );
  assert.equal(shim.status, 0, `--print-agent-shim-prompt exited ${shim.status}; stderr: ${shim.stderr}`);
  assert.match(shim.stdout, /You are a specialist reviewer/);
  assert.match(shim.stdout, /dispatch_specialists-prompt-cli-alpha\.md/);
  assert.match(shim.stdout, /dispatch_specialists-output-cli-alpha\.json/);
  // Shim is small — under 1500 chars (plenty under the documented 200-token bound).
  assert.ok(shim.stdout.length < 1500, `shim should be small; got ${shim.stdout.length} chars`);

  // After dropping cli-alpha's output too, --print-pending-leaf-ids
  // returns empty (exit 0, no output) — orchestrator's loop terminates.
  writeFileSync(
    join(workersDir, "dispatch_specialists-output-cli-alpha.json"),
    JSON.stringify({ id: "cli-alpha", status: "completed", findings: [] }),
  );
  const noPending = spawnSync(
    process.execPath,
    ["scripts/run-review.mjs", "--print-pending-leaf-ids", "--run-id", runId],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 5_000 },
  );
  assert.equal(noPending.status, 0, "empty pending list exits 0");
  assert.equal(noPending.stdout, "", "empty pending list emits no stdout");

  // Negative paths.
  const missingRunId = spawnSync(
    process.execPath,
    ["scripts/run-review.mjs", "--print-pending-leaf-ids"],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 5_000 },
  );
  assert.notEqual(missingRunId.status, 0, "--print-pending-leaf-ids without --run-id must hard-fail");

  const missingLeaf = spawnSync(
    process.execPath,
    ["scripts/run-review.mjs", "--print-agent-shim-prompt", "--run-id", runId],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 5_000 },
  );
  assert.notEqual(missingLeaf.status, 0, "--print-agent-shim-prompt without --leaf-id must hard-fail");

  // Restore manifest to a non-dispatch_specialists state, then assert
  // BOTH --print-pending-leaf-ids AND --print-agent-shim-prompt
  // hard-fail with a state-mismatch error. Defense against
  // stale-workers/-files reads on advanced runs: workers/* is retained
  // after the FSM advances, so a CLI that didn't validate the manifest
  // could silently emit pending ids or shim text from a finished run
  // and mislead an orchestrator into re-dispatching out of phase.
  const restored = { ...realManifest, current_state: "scan_project" };
  writeFileSync(manifestPath, JSON.stringify(restored));
  const wrongState = spawnSync(
    process.execPath,
    ["scripts/run-review.mjs", "--print-pending-leaf-ids", "--run-id", runId],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 5_000 },
  );
  assert.notEqual(wrongState.status, 0, "--print-pending-leaf-ids on a non-dispatch_specialists state must hard-fail");
  // The error names the actual current_state so the orchestrator can
  // diagnose ("oh, I'm not actually paused on dispatch_specialists").
  const wrongStatePayload = JSON.parse(wrongState.stdout);
  assert.match(wrongStatePayload.message, /dispatch_specialists/);
  assert.match(wrongStatePayload.message, /scan_project/);

  // --print-agent-shim-prompt observes the same gate: even with a
  // valid leaf-id and a staged prompt file on disk, it must hard-fail
  // when manifest.current_state != dispatch_specialists.
  const wrongStateShim = spawnSync(
    process.execPath,
    ["scripts/run-review.mjs", "--print-agent-shim-prompt", "--run-id", runId, "--leaf-id", "cli-alpha"],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 5_000 },
  );
  assert.notEqual(wrongStateShim.status, 0, "--print-agent-shim-prompt on a non-dispatch_specialists state must hard-fail");
  const wrongStateShimPayload = JSON.parse(wrongStateShim.stdout);
  assert.match(wrongStateShimPayload.message, /dispatch_specialists/);
  assert.match(wrongStateShimPayload.message, /scan_project/);

  // discoverLeafShards corruption case (BOTH canonical AND sharded
  // prompts coexist on disk): --print-pending-leaf-ids must surface
  // the throw as a CLEAN structured fail() payload, NOT a generic
  // "unhandled error: <stack>" wrapper. Restore manifest to
  // dispatch_specialists and plant a corruption: cli-alpha already has
  // a canonical prompt; add a shard-suffixed prompt so both shapes
  // exist for the same leaf.
  realManifest.current_state = "dispatch_specialists";
  writeFileSync(manifestPath, JSON.stringify(realManifest));
  // Drop cli-alpha's output so it would otherwise be pending.
  rmSync(join(workersDir, "dispatch_specialists-output-cli-alpha.json"), { force: true });
  // Plant a stale shard prompt to force the both-shapes corruption.
  writeFileSync(join(workersDir, "dispatch_specialists-prompt-cli-alpha--0.md"), "stale\n");
  const corrupt = spawnSync(
    process.execPath,
    ["scripts/run-review.mjs", "--print-pending-leaf-ids", "--run-id", runId],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 5_000 },
  );
  assert.notEqual(corrupt.status, 0, "--print-pending-leaf-ids on corrupted prompt state must hard-fail");
  // The CLI must emit a parseable JSON payload (clean fail()), not a
  // generic "unhandled error: <stack>" wrapper.
  const corruptPayload = JSON.parse(corrupt.stdout);
  assert.match(corruptPayload.message, /both canonical and sharded prompt files exist/);
  assert.match(corruptPayload.message, /cli-alpha/);
  // The structured payload carries leaf_id for orchestrator diagnostics.
  assert.equal(corruptPayload.leaf_id, "cli-alpha");
  // Critically: NO stack-frame paths in the message — that would
  // signal we leaked the unhandled-error path.
  assert.doesNotMatch(corruptPayload.message, /at\s+\S+:\d+:\d+/);
});

test("--print-batch-envelope: end-to-end CLI contract (single-call batch with shims + progress)", () => {
  // The --print-batch-envelope mode collapses N×--print-agent-shim-prompt
  // calls per batch into one Node process invocation that returns a
  // JSON envelope with shims for every batch id plus progress
  // (remaining_after, pending_now). This test verifies:
  //   - happy path: envelope shape, batch ids match pending list,
  //     shims exist for every batch id, byte-equal to what
  //     --print-agent-shim-prompt would emit individually
  //   - --batch-size cap is honoured
  //   - empty pending list emits a zero-work envelope (NOT empty stdout)
  //   - manifest-state gate hard-fails on non-dispatch_specialists
  //   - progress fields are accurate
  const baseSha = "7777777777777777777777777777777777777777";
  const headSha = "8888888888888888888888888888888888888888";
  const start = spawnSync(
    process.execPath,
    ["scripts/run-review.mjs", "--start", "--base", baseSha, "--head", headSha],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 30_000 },
  );
  assert.equal(start.status, 0, `--start exited ${start.status}; stderr: ${start.stderr}`);
  const runId = JSON.parse(start.stdout.split("\n").filter(Boolean)[0]).run_id;

  const settings = resolveSettings({ fsmName: "code-reviewer" }, REPO_ROOT);
  const storageRoot = resolve(REPO_ROOT, settings.storageRoot);
  const runDir = runDirPath(runId, { storageRoot });
  const workersDir = join(runDir, "workers");
  // Three pending leaves + one already-completed leaf to verify the
  // envelope only includes pending work.
  const briefShape = {
    run_id: runId,
    state: "dispatch_specialists",
    inputs: {
      picked_leaves: [
        { id: "env-alpha", path: "x/env-alpha.md", justification: "j", dimensions: ["correctness"] },
        { id: "env-beta", path: "x/env-beta.md", justification: "j", dimensions: ["correctness"] },
        { id: "env-gamma", path: "x/env-gamma.md", justification: "j", dimensions: ["correctness"] },
        { id: "env-done", path: "x/env-done.md", justification: "j", dimensions: ["correctness"] },
      ],
    },
  };
  writeFileSync(join(workersDir, "dispatch_specialists-brief.json"), JSON.stringify(briefShape));
  writeFileSync(join(workersDir, "dispatch_specialists-prompt-env-alpha.md"), "<staged>\n");
  writeFileSync(join(workersDir, "dispatch_specialists-prompt-env-beta.md"), "<staged>\n");
  writeFileSync(join(workersDir, "dispatch_specialists-prompt-env-gamma.md"), "<staged>\n");
  writeFileSync(join(workersDir, "dispatch_specialists-prompt-env-done.md"), "<staged>\n");
  writeFileSync(
    join(workersDir, "dispatch_specialists-output-env-done.json"),
    JSON.stringify({ id: "env-done", status: "completed", findings: [] }),
  );
  const manifestPath = `${runDir}/manifest.json`;
  const realManifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  realManifest.current_state = "dispatch_specialists";
  writeFileSync(manifestPath, JSON.stringify(realManifest));

  // Happy path: envelope returns batch=3 ids, all pending, shims for each.
  const env = spawnSync(
    process.execPath,
    ["scripts/run-review.mjs", "--print-batch-envelope", "--run-id", runId],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 5_000 },
  );
  assert.equal(env.status, 0, `--print-batch-envelope exited ${env.status}; stderr: ${env.stderr}`);
  const envelope = JSON.parse(env.stdout);
  assert.deepEqual(envelope.batch, ["env-alpha", "env-beta", "env-gamma"], "batch must list pending ids in picked_leaves order");
  assert.equal(envelope.pending_now, 3, "pending_now counts pending ids only (env-done excluded)");
  // total_picked is the STABLE count of dispatch units staged for the
  // dispatch_specialists state (env-alpha, env-beta, env-gamma,
  // env-done = 4). Unlike pending_now (which shrinks as outputs land),
  // total_picked is invariant across the loop's lifetime — orchestrators
  // can use it as the Y in an "X of Y specialists complete" indicator.
  assert.equal(envelope.total_picked, 4, "total_picked counts ALL staged units (including the already-completed env-done)");
  assert.equal(envelope.remaining_after, 0, "all 3 fit in default batch size 10 → 0 remaining after");
  // shims object has one entry per batch id; each is the canonical
  // shim text the orchestrator would feed to Agent.
  assert.deepEqual(Object.keys(envelope.shims).sort(), ["env-alpha", "env-beta", "env-gamma"]);
  for (const id of envelope.batch) {
    assert.match(envelope.shims[id], /You are a specialist reviewer/);
    assert.match(envelope.shims[id], new RegExp(`dispatch_specialists-prompt-${id}\\.md`));
    assert.match(envelope.shims[id], new RegExp(`dispatch_specialists-output-${id}\\.json`));
  }

  // Byte-equal check: envelope shim must match what
  // --print-agent-shim-prompt would emit individually for the same id.
  // Guarantees orchestrators that mix the two modes always get the
  // same prompt text.
  const singleShim = spawnSync(
    process.execPath,
    ["scripts/run-review.mjs", "--print-agent-shim-prompt", "--run-id", runId, "--leaf-id", "env-alpha"],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 5_000 },
  );
  assert.equal(singleShim.status, 0);
  assert.equal(envelope.shims["env-alpha"], singleShim.stdout, "envelope shim must equal --print-agent-shim-prompt output byte-for-byte");

  // Sharded ids: --print-batch-envelope must round-trip `<leaf>--<idx>`
  // ids correctly through parseLeafIdAndShardIdx and buildShimText so
  // sharded leaves work end-to-end. Plant a sharded leaf with two
  // shard prompts and a fresh brief; the envelope must list both
  // shard ids in `batch[]`, emit a per-shard shim each, and the shim
  // text must point at the shard-suffixed prompt + output paths.
  // Without this case a regression in the envelope's shard-id parsing
  // path would slip through the plain-leaf-id happy path above.
  const shardedBrief = {
    run_id: runId,
    state: "dispatch_specialists",
    inputs: {
      picked_leaves: [
        { id: "env-shard", path: "x/env-shard.md", justification: "j", dimensions: ["correctness"] },
      ],
    },
  };
  writeFileSync(join(workersDir, "dispatch_specialists-brief.json"), JSON.stringify(shardedBrief));
  // Stage two sharded prompts (shard 0 and shard 1), no canonical prompt.
  rmSync(join(workersDir, "dispatch_specialists-prompt-env-shard.md"), { force: true });
  writeFileSync(join(workersDir, "dispatch_specialists-prompt-env-shard--0.md"), "<staged shard 0>\n");
  writeFileSync(join(workersDir, "dispatch_specialists-prompt-env-shard--1.md"), "<staged shard 1>\n");
  const shardedEnv = spawnSync(
    process.execPath,
    ["scripts/run-review.mjs", "--print-batch-envelope", "--run-id", runId],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 5_000 },
  );
  assert.equal(shardedEnv.status, 0, `sharded envelope exited ${shardedEnv.status}; stderr: ${shardedEnv.stderr}`);
  const shardedEnvelope = JSON.parse(shardedEnv.stdout);
  assert.deepEqual(shardedEnvelope.batch, ["env-shard--0", "env-shard--1"], "envelope batch must list shard-suffixed ids");
  // Each sharded shim has its own per-shard prompt + output path.
  assert.match(shardedEnvelope.shims["env-shard--0"], /dispatch_specialists-prompt-env-shard--0\.md/);
  assert.match(shardedEnvelope.shims["env-shard--0"], /dispatch_specialists-output-env-shard--0\.json/);
  assert.match(shardedEnvelope.shims["env-shard--1"], /dispatch_specialists-prompt-env-shard--1\.md/);
  assert.match(shardedEnvelope.shims["env-shard--1"], /dispatch_specialists-output-env-shard--1\.json/);
  // Byte-equal check on the sharded path: envelope shim must equal
  // --print-agent-shim-prompt's output for the same shard id.
  const shardSingleShim = spawnSync(
    process.execPath,
    ["scripts/run-review.mjs", "--print-agent-shim-prompt", "--run-id", runId, "--leaf-id", "env-shard--0"],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 5_000 },
  );
  assert.equal(shardSingleShim.status, 0);
  assert.equal(shardedEnvelope.shims["env-shard--0"], shardSingleShim.stdout,
    "sharded envelope shim must equal --print-agent-shim-prompt output byte-for-byte");

  // Restore the original brief + canonical prompt for the rest of
  // the test (the --batch-size cap and zero-work checks below assume
  // the env-alpha/beta/gamma layout).
  writeFileSync(join(workersDir, "dispatch_specialists-brief.json"), JSON.stringify(briefShape));
  rmSync(join(workersDir, "dispatch_specialists-prompt-env-shard--0.md"), { force: true });
  rmSync(join(workersDir, "dispatch_specialists-prompt-env-shard--1.md"), { force: true });
  writeFileSync(join(workersDir, "dispatch_specialists-prompt-env-alpha.md"), "<staged>\n");

  // --batch-size cap honoured: with --batch-size 2, batch=2 ids,
  // remaining_after=1 (3 pending total - 2 returned).
  const capped = spawnSync(
    process.execPath,
    ["scripts/run-review.mjs", "--print-batch-envelope", "--run-id", runId, "--batch-size", "2"],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 5_000 },
  );
  assert.equal(capped.status, 0);
  const cappedEnvelope = JSON.parse(capped.stdout);
  assert.equal(cappedEnvelope.batch.length, 2, "--batch-size 2 caps batch at 2");
  assert.equal(cappedEnvelope.remaining_after, 1, "1 pending leaf remains after a 2-of-3 batch");
  assert.equal(cappedEnvelope.pending_now, 3);
  // total_picked must match the first envelope's value — STABLE across calls
  // is the whole point of distinguishing it from pending_now.
  assert.equal(cappedEnvelope.total_picked, 4, "total_picked is stable across envelope calls within the same state");

  // Manifest-state gate: non-dispatch_specialists must hard-fail.
  realManifest.current_state = "scan_project";
  writeFileSync(manifestPath, JSON.stringify(realManifest));
  const wrongStateEnv = spawnSync(
    process.execPath,
    ["scripts/run-review.mjs", "--print-batch-envelope", "--run-id", runId],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 5_000 },
  );
  assert.notEqual(wrongStateEnv.status, 0, "--print-batch-envelope must hard-fail on non-dispatch_specialists state");
  const wrongStateEnvPayload = JSON.parse(wrongStateEnv.stdout);
  assert.match(wrongStateEnvPayload.message, /dispatch_specialists/);
  assert.match(wrongStateEnvPayload.message, /scan_project/);

  // Empty pending list: write outputs for the 3 remaining, restore
  // state, expect zero-work envelope (NOT empty stdout — the JSON
  // envelope is still emitted so a JSON-parsing orchestrator gets an
  // explicit zero-work signal).
  realManifest.current_state = "dispatch_specialists";
  writeFileSync(manifestPath, JSON.stringify(realManifest));
  for (const id of ["env-alpha", "env-beta", "env-gamma"]) {
    writeFileSync(
      join(workersDir, `dispatch_specialists-output-${id}.json`),
      JSON.stringify({ id, status: "completed", findings: [] }),
    );
  }
  const empty = spawnSync(
    process.execPath,
    ["scripts/run-review.mjs", "--print-batch-envelope", "--run-id", runId],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 5_000 },
  );
  assert.equal(empty.status, 0, "empty pending must exit 0");
  const emptyEnvelope = JSON.parse(empty.stdout);
  assert.deepEqual(emptyEnvelope.batch, [], "empty batch when no pending");
  assert.equal(emptyEnvelope.pending_now, 0);
  // total_picked stays at 4 even after every leaf is done — the four
  // staged units are still counted; pending_now=0 is what tells the
  // caller everything is complete. Done = total_picked - pending_now = 4.
  assert.equal(emptyEnvelope.total_picked, 4, "total_picked stays stable after every output is written");
  assert.equal(emptyEnvelope.remaining_after, 0);
  assert.deepEqual(emptyEnvelope.shims, {}, "no shims when no pending ids");
});

test("--print-batch-envelope: empty picked_leaves[] emits an explicit zero-work envelope", () => {
  // Distinct zero-work path from the "all outputs already written" case
  // covered above. When the brief has picked_leaves: [] (the FSM legally
  // reaches dispatch_specialists with no specialists to run, e.g. when
  // every relevant leaf was rescued by the coverage gate to a
  // changed_paths entry but no leaf actually activated), the envelope
  // must emit a zero-work payload — NOT empty stdout, since
  // JSON-parsing orchestrators need an explicit signal to terminate
  // the dispatch loop. This test locks down the explicit JSON envelope
  // returned by that branch.
  const baseSha = "9999999999999999999999999999999999999999";
  const headSha = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const start = spawnSync(
    process.execPath,
    ["scripts/run-review.mjs", "--start", "--base", baseSha, "--head", headSha],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 30_000 },
  );
  assert.equal(start.status, 0, `--start exited ${start.status}; stderr: ${start.stderr}`);
  const runId = JSON.parse(start.stdout.split("\n").filter(Boolean)[0]).run_id;
  const settings = resolveSettings({ fsmName: "code-reviewer" }, REPO_ROOT);
  const storageRoot = resolve(REPO_ROOT, settings.storageRoot);
  const runDir = runDirPath(runId, { storageRoot });
  const workersDir = join(runDir, "workers");
  // Brief with explicitly empty picked_leaves[].
  writeFileSync(join(workersDir, "dispatch_specialists-brief.json"), JSON.stringify({
    run_id: runId,
    state: "dispatch_specialists",
    inputs: { picked_leaves: [] },
  }));
  const manifestPath = `${runDir}/manifest.json`;
  const realManifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  realManifest.current_state = "dispatch_specialists";
  writeFileSync(manifestPath, JSON.stringify(realManifest));
  const env = spawnSync(
    process.execPath,
    ["scripts/run-review.mjs", "--print-batch-envelope", "--run-id", runId],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 5_000 },
  );
  assert.equal(env.status, 0, `--print-batch-envelope on empty picked_leaves[] must exit 0; stderr: ${env.stderr}`);
  // Zero-work envelope shape: every numeric field is 0, batch is [],
  // shims is {}. JSON-parsing orchestrator can break out of its loop
  // on `batch.length === 0`.
  const envelope = JSON.parse(env.stdout);
  assert.deepEqual(envelope, {
    batch: [],
    remaining_after: 0,
    pending_now: 0,
    total_picked: 0,
    shims: {},
  }, "empty picked_leaves[] envelope must have all-zero counters and empty collections");
});

test("--print-batch-envelope: degraded staging (gappy shards + unstaged leaves) reports accurate progress fields", () => {
  // Locks down progress-field accounting for the two failure modes
  // discoverLeafShards explicitly handles:
  //   1. Gappy shards: prompts at indices 0 and 2 with shard 1
  //      missing. discoverLeafShards normalises to [0, 1, 2] (so the
  //      aggregator can synth a failed row for shard 1), but shard 1
  //      was never dispatchable. Both pending_now AND total_picked
  //      must skip it: only the 2 staged shards count.
  //   2. Unstaged leaf: a picked leaf with no prompts at all (canonical
  //      OR sharded). aggregateSpecialistOutputs will emit a single
  //      failed row for it at --continue, but during dispatch the
  //      orchestrator can't dispatch what was never staged. Both
  //      pending_now AND total_picked silently skip it (contributing
  //      0 each) — accounting stays consistent so the X-of-Y formula
  //      never overshoots.
  //
  // Without this regression test, a future refactor of total_picked
  // (e.g. switching to the contiguous-range expansion) would let
  // total_picked drift away from pending_now's accounting and produce
  // an X-of-Y overshoot once pending drops to zero.
  const baseSha = "dddddddddddddddddddddddddddddddddddddddd";
  const headSha = "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
  const start = spawnSync(
    process.execPath,
    ["scripts/run-review.mjs", "--start", "--base", baseSha, "--head", headSha],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 30_000 },
  );
  assert.equal(start.status, 0);
  const runId = JSON.parse(start.stdout.split("\n").filter(Boolean)[0]).run_id;
  const settings = resolveSettings({ fsmName: "code-reviewer" }, REPO_ROOT);
  const storageRoot = resolve(REPO_ROOT, settings.storageRoot);
  const runDir = runDirPath(runId, { storageRoot });
  const workersDir = join(runDir, "workers");
  // Three picked leaves:
  //   - degraded-gappy: prompts at shards 0 and 2 (gap at 1)
  //   - degraded-unstaged: NO prompt at all (canonical or sharded)
  //   - degraded-clean: canonical prompt staged normally
  writeFileSync(join(workersDir, "dispatch_specialists-brief.json"), JSON.stringify({
    run_id: runId,
    state: "dispatch_specialists",
    inputs: {
      picked_leaves: [
        { id: "degraded-gappy", path: "x/degraded-gappy.md", justification: "j", dimensions: ["correctness"] },
        { id: "degraded-unstaged", path: "x/degraded-unstaged.md", justification: "j", dimensions: ["correctness"] },
        { id: "degraded-clean", path: "x/degraded-clean.md", justification: "j", dimensions: ["correctness"] },
      ],
    },
  }));
  writeFileSync(join(workersDir, "dispatch_specialists-prompt-degraded-gappy--0.md"), "<staged shard 0>\n");
  writeFileSync(join(workersDir, "dispatch_specialists-prompt-degraded-gappy--2.md"), "<staged shard 2>\n");
  // shard 1 deliberately missing for degraded-gappy.
  // No prompt at all for degraded-unstaged.
  writeFileSync(join(workersDir, "dispatch_specialists-prompt-degraded-clean.md"), "<staged>\n");
  const manifestPath = `${runDir}/manifest.json`;
  const realManifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  realManifest.current_state = "dispatch_specialists";
  writeFileSync(manifestPath, JSON.stringify(realManifest));

  const env = spawnSync(
    process.execPath,
    ["scripts/run-review.mjs", "--print-batch-envelope", "--run-id", runId],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 5_000 },
  );
  assert.equal(env.status, 0, `degraded-staging envelope exited ${env.status}; stderr: ${env.stderr}`);
  const envelope = JSON.parse(env.stdout);

  // batch contains only the dispatchable units:
  //   - degraded-gappy--0 (staged)
  //   - degraded-gappy--2 (staged)
  //   - degraded-clean (staged, non-sharded)
  // degraded-gappy--1 is skipped (no prompt → can't dispatch)
  // degraded-unstaged is skipped (no prompt at all)
  assert.deepEqual(
    envelope.batch.sort(),
    ["degraded-clean", "degraded-gappy--0", "degraded-gappy--2"].sort(),
    "batch must list ONLY shards/leaves with staged prompts",
  );
  // pending_now: 3 dispatchable, no outputs yet → 3.
  assert.equal(envelope.pending_now, 3);
  // total_picked: same 3, NOT 4 (must not include the gappy shard 1
  // synthesised by discoverLeafShards's contiguous-range expansion)
  // and NOT include degraded-unstaged (which has no prompt to
  // dispatch). The X-of-Y progress formula stays consistent:
  // X = total_picked - pending_now = 0 done now → 0; after all 3
  // outputs land, pending_now=0, X = 3 done = total_picked. Never
  // overshoots.
  assert.equal(envelope.total_picked, 3, "total_picked must match pending_now's accounting (skip un-dispatchable units)");
  assert.equal(envelope.remaining_after, 0);

  // Simulate completion of all 3 dispatchable units. total_picked
  // must STAY 3 (stable across calls); pending_now drops to 0.
  for (const id of envelope.batch) {
    const safe = id.replace(/--/g, "--");
    writeFileSync(
      join(workersDir, `dispatch_specialists-output-${safe}.json`),
      JSON.stringify({ id: safe.split("--")[0], status: "completed", findings: [] }),
    );
  }
  const post = spawnSync(
    process.execPath,
    ["scripts/run-review.mjs", "--print-batch-envelope", "--run-id", runId],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 5_000 },
  );
  assert.equal(post.status, 0);
  const postEnvelope = JSON.parse(post.stdout);
  assert.deepEqual(postEnvelope.batch, [], "all dispatchable units done → empty batch");
  assert.equal(postEnvelope.pending_now, 0);
  // total_picked is STABLE: still 3, even though pending_now is now 0.
  // Locks down "progress denominator does not drift across calls" —
  // the whole point of distinguishing total_picked from pending_now.
  assert.equal(postEnvelope.total_picked, 3, "total_picked is stable across the dispatch_specialists state");
});

test("--print-pending-leaf-ids and --print-batch-envelope: mutually exclusive", () => {
  // Passing both flags together is a misuse: the envelope branch wins
  // silently but error attribution would point at --print-pending-leaf-ids
  // (cliName ordering). Hard-fail with a clear message so callers fix
  // their script instead of getting a surprising payload shape.
  const baseSha = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const headSha = "cccccccccccccccccccccccccccccccccccccccc";
  const start = spawnSync(
    process.execPath,
    ["scripts/run-review.mjs", "--start", "--base", baseSha, "--head", headSha],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 30_000 },
  );
  assert.equal(start.status, 0);
  const runId = JSON.parse(start.stdout.split("\n").filter(Boolean)[0]).run_id;
  const both = spawnSync(
    process.execPath,
    [
      "scripts/run-review.mjs",
      "--print-pending-leaf-ids",
      "--print-batch-envelope",
      "--run-id", runId,
    ],
    { encoding: "utf8", cwd: REPO_ROOT, timeout: 5_000 },
  );
  assert.notEqual(both.status, 0, "passing both flags must hard-fail");
  const payload = JSON.parse(both.stdout);
  assert.match(payload.message, /mutually exclusive/);
});
