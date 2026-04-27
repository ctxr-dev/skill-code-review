// write-run-directory.mjs — deterministic implementation of FSM Step 10.
//
// Inputs (from env): the cumulative state outputs from every prior step.
//
// Outputs:
//   - run_dir_path : string (path to .skill-code-review/<shard>/<run-id>/)
//
// Side effects: writes manifest.json, report.md, report.json under the run dir.
// The directory itself is provisioned by `@ctxr/fsm`'s storage helpers when
// the run started; we only fill in the report files. The trace + lock files
// already live there from earlier states.
//
// `writeRunArtefacts` is exported so any caller that wants to materialise the
// same artefacts without going through the FSM dispatch (e.g. ad-hoc scripts)
// can reuse the writer. The two edge states (`short_circuit_exit` and
// `stage_a_empty`) now route through this state in the FSM transition graph
// rather than persisting their own artefacts, so the handlers themselves stay
// pure.

import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadConfig,
  resolveSettings,
  runDirPath,
  readManifest,
  writeManifest,
} from "@ctxr/fsm";

import { renderReportMarkdown, renderReportJson } from "../lib/report-renderer.mjs";

function resolveStorageRoot(repoRoot) {
  const config = loadConfig({ cwd: repoRoot });
  const settings = resolveSettings(config, { fsmName: "code-reviewer" });
  return resolve(repoRoot, settings.storage_root);
}

function buildReportPayload(runId, env) {
  return {
    run_id: runId,
    repo: env.repo ?? null,
    base_sha: env.base_sha ?? null,
    head_sha: env.head_sha ?? null,
    args: env.args ?? {},
    tier: env.tier ?? null,
    tier_cap: env.cap ?? null,
    tier_rationale: env.tier_rationale ?? null,
    short_circuited: Boolean(env.short_circuited),
    routing: {
      stage_a: { candidates: env.stage_a_candidates ?? [] },
      stage_b: {
        picked: env.picked_leaves ?? [],
        rejected: env.rejected_leaves ?? [],
        coverage_rescues: env.coverage_rescues ?? [],
      },
    },
    specialists: (env.specialist_outputs ?? []).map((s) => ({
      id: s.id,
      status: s.status,
      runtime_ms: s.runtime_ms ?? null,
      tokens_in: s.tokens_in ?? null,
      tokens_out: s.tokens_out ?? null,
      finding_count: Array.isArray(s.findings) ? s.findings.length : 0,
      skip_reason: s.skip_reason ?? null,
    })),
    tool_results: env.tool_results ?? [],
    findings: env.findings ?? [],
    severity_counts: env.severity_counts ?? { critical: 0, important: 0, minor: 0 },
    coverage_matrix: env.coverage_matrix ?? [],
    coverage_gaps: env.coverage_gaps ?? [],
    gates: env.gates ?? [],
    verdict: env.verdict ?? null,
    degraded_run: Boolean(env.degraded_run),
  };
}

// Shared writer reused by Step 10 and by the two short-circuit edge states.
// Returns the run-dir path that was materialised.
export function writeRunArtefacts(runId, env) {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(__dirname, "..", "..");
  const storageRoot = resolveStorageRoot(repoRoot);
  const dir = runDirPath(runId, { storageRoot });

  const reportPayload = buildReportPayload(runId, env);

  writeFileSync(`${dir}/report.json`, renderReportJson(reportPayload));
  writeFileSync(`${dir}/report.md`, renderReportMarkdown(reportPayload));

  const existingManifest = readManifest(runId, { storageRoot }) ?? {};
  writeManifest(
    runId,
    {
      ...existingManifest,
      verdict: reportPayload.verdict,
      report_path: `${dir}/report.md`,
      report_json_path: `${dir}/report.json`,
    },
    { storageRoot },
  );

  return dir;
}

export default async function writeRunDirectory({ brief, env }) {
  const dir = writeRunArtefacts(brief.run_id, env);
  return { run_dir_path: dir };
}
