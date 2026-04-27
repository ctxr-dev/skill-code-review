// write-run-directory.mjs — deterministic implementation of FSM Step 10.
//
// Inputs (from env): the cumulative state outputs from every prior step.
//
// Outputs:
//   - run_dir_path : string (path to .skill-code-review/<shard>/<run-id>/)
//
// Side effects: writes manifest.json, report.md, report.json under the run dir.
// `report.json` is the canonical report payload as defined in
// `report-format.md` (the contract README + code-reviewer.md point at).
// `report.md` is the canonical markdown layout from the same file.
// `manifest.json` is a separate FSM-engine record (run id, verdict, paths)
// owned by `@ctxr/fsm` plus a couple of skill-side pointers we add here.
//
// `writeRunArtefacts` is exported so any caller that wants to materialise the
// same artefacts without going through the FSM dispatch (e.g. ad-hoc scripts)
// can reuse the writer. The two edge states (`short_circuit_exit` and
// `stage_a_empty`) now route through this state in the FSM transition graph
// rather than persisting their own artefacts, so the handlers themselves stay
// pure.

import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
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

const METHODOLOGY_PRINCIPLES = ["SRP", "OCP", "LSP", "ISP", "DIP", "DRY", "KISS", "YAGNI"];

// Canonical scope shape from report-format.md: every field present, null when
// not filtered, array of strings when filtered. Maps args → field names per
// the spec ("scope-dir → dirs", "scope-severity → severity_filter", etc).
function buildScope(argsBag = {}) {
  const splitOrNull = (raw) => {
    if (typeof raw !== "string" || raw.trim() === "") return null;
    const tokens = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return tokens.length > 0 ? tokens : null;
  };
  return {
    dirs: splitOrNull(argsBag["scope-dir"]),
    langs: splitOrNull(argsBag["scope-lang"]),
    frameworks: splitOrNull(argsBag["scope-framework"]),
    reviewers: splitOrNull(argsBag["scope-reviewer"]),
    severity_filter: splitOrNull(argsBag["scope-severity"]),
    gates_filter: splitOrNull(argsBag["scope-gate"]),
  };
}

// Canonical methodology table — eight principles, each PASS/FAIL/N/A. Today
// the FSM env doesn't carry per-principle judgements (Sprint 4 territory),
// so we either emit a caller-provided env.methodology when present, or
// default everything to N/A.
function buildMethodology(env) {
  const provided = env.methodology;
  const out = {};
  for (const p of METHODOLOGY_PRINCIPLES) {
    const v = provided?.[p];
    out[p] = v === "PASS" || v === "FAIL" || v === "N/A" ? v : "N/A";
  }
  return out;
}

// Map an internal finding (env.findings[i]) into the canonical issue shape.
// `id` is assigned by enumeration order (which is already deterministic from
// collect-findings' sort).
function buildIssue(finding, idx) {
  const flaggedBy = Array.isArray(finding.flagged_by) ? finding.flagged_by : [];
  return {
    id: idx + 1,
    severity: finding.severity ?? null,
    specialist: flaggedBy[0] ?? null,
    file: finding.file ?? null,
    line: finding.line ?? null,
    title: finding.title ?? null,
    description: finding.description ?? null,
    impact: finding.impact ?? null,
    fix: finding.fix ?? null,
    principle: finding.principle ?? null,
  };
}

function buildSpecialistRow(s) {
  const findings = Array.isArray(s.findings) ? s.findings : [];
  let critical = 0;
  let important = 0;
  let minor = 0;
  for (const f of findings) {
    if (f.severity === "critical") critical++;
    else if (f.severity === "important") important++;
    else if (f.severity === "minor") minor++;
  }
  // Canonical field is `status` ∈ {pass, fail} per the spec. Map skipped /
  // error to fail (the report still surfaces them in the worker section, but
  // they don't get to claim PASS).
  const ok = s.status === "completed" && critical === 0 && important === 0;
  return {
    id: s.id,
    status: ok ? "pass" : "fail",
    critical,
    important,
    minor,
    key_finding:
      findings.find((f) => f.severity === "critical")?.title ??
      findings.find((f) => f.severity === "important")?.title ??
      s.skip_reason ??
      null,
  };
}

function buildGateRow(g) {
  // env.gates already carries { number, name, status, blocker_count,
  // contributing_leaves[] }. Canonical shape wants { number, name, status,
  // blockers } where blockers is the integer count.
  return {
    number: g.number,
    name: g.name,
    status: g.status,
    blockers: g.blocker_count ?? 0,
  };
}

function buildToolRow(t) {
  return {
    name: t.name ?? null,
    status: t.status ?? null,
    findings: t.findings ?? null,
    specialist: t.specialist ?? null,
    output_summary: t.output_summary ?? null,
    ...(t.status === "skipped" && t.reason !== undefined ? { reason: t.reason } : {}),
  };
}

export function buildReportPayload(runId, env) {
  const findings = Array.isArray(env.findings) ? env.findings : [];
  const specialistOutputs = Array.isArray(env.specialist_outputs) ? env.specialist_outputs : [];
  const gates = Array.isArray(env.gates) ? env.gates : [];
  const coverageMatrix = Array.isArray(env.coverage_matrix) ? env.coverage_matrix : [];
  const toolResults = Array.isArray(env.tool_results) ? env.tool_results : [];
  const argsBag = env.args ?? {};

  const stack = Array.isArray(env.stack)
    ? env.stack
    : [
        ...(Array.isArray(env.project_profile?.languages) ? env.project_profile.languages : []),
        ...(Array.isArray(env.project_profile?.frameworks) ? env.project_profile.frameworks : []),
      ];

  return {
    run_id: runId,
    verdict: env.verdict ?? null,
    summary: {
      description: env.description ?? argsBag.description ?? null,
      range: {
        base: env.base_sha ?? null,
        head: env.head_sha ?? null,
      },
      mode: argsBag.full ? "full" : "diff",
      files_changed: Array.isArray(env.changed_paths) ? env.changed_paths.length : 0,
      stack,
      specialists_dispatched: specialistOutputs.length,
      specialists_total: env.specialists_total ?? null,
      scope: buildScope(argsBag),
    },
    methodology: buildMethodology(env),
    issues: findings.map(buildIssue),
    strengths: Array.isArray(env.strengths) ? env.strengths : [],
    tool_results: toolResults.map(buildToolRow),
    specialists: specialistOutputs.map(buildSpecialistRow),
    gates: gates.map(buildGateRow),
    coverage: coverageMatrix.map((row) => ({
      file: row.file,
      reviewers: Array.isArray(row.reviewers) ? row.reviewers : [],
    })),
    // Skill-internal context preserved as a sub-object so the canonical
    // top-level shape stays clean. Manifest consumers and downstream tooling
    // that want this can read it; the contract surface above is unaffected.
    _meta: {
      tier: env.tier ?? null,
      tier_cap: env.cap ?? null,
      tier_rationale: env.tier_rationale ?? null,
      short_circuited: Boolean(env.short_circuited),
      degraded_run: Boolean(env.degraded_run),
      severity_counts: env.severity_counts ?? { critical: 0, important: 0, minor: 0 },
      coverage_gaps: Array.isArray(env.coverage_gaps) ? env.coverage_gaps : [],
      routing: {
        stage_a: { candidates: env.stage_a_candidates ?? [] },
        stage_b: {
          picked: env.picked_leaves ?? [],
          rejected: env.rejected_leaves ?? [],
          coverage_rescues: env.coverage_rescues ?? [],
        },
      },
    },
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

  const reportJsonPath = join(dir, "report.json");
  const reportMdPath = join(dir, "report.md");
  writeFileSync(reportJsonPath, renderReportJson(reportPayload));
  writeFileSync(reportMdPath, renderReportMarkdown(reportPayload));

  const existingManifest = readManifest(runId, { storageRoot }) ?? {};
  writeManifest(
    runId,
    {
      ...existingManifest,
      verdict: reportPayload.verdict,
      report_path: reportMdPath,
      report_json_path: reportJsonPath,
    },
    { storageRoot },
  );

  return dir;
}

export default async function writeRunDirectory({ brief, env }) {
  const dir = writeRunArtefacts(brief.run_id, env);
  return { run_dir_path: dir };
}
