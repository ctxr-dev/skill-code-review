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

export default async function writeRunDirectory({ brief, env }) {
  // `import.meta.dirname` is Node ≥ 21 only; the rest of the runner uses the
  // portable `dirname(fileURLToPath(import.meta.url))` form, so do the same
  // here for consistency and pre-21 portability.
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(__dirname, "..", "..");
  const storageRoot = resolveStorageRoot(repoRoot);
  const runId = brief.run_id;
  const dir = runDirPath(runId, { storageRoot });

  const reportPayload = {
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

  writeFileSync(`${dir}/report.json`, JSON.stringify(reportPayload, null, 2) + "\n");
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

  return { run_dir_path: dir };
}
