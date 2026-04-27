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

import { writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
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

// Count actual leaf .md files under reviewers.wiki/ at runtime (per
// report-format.md: "queried at runtime — do not hard-code"). A leaf is a
// .md file that isn't `index.md`. Walks the tree synchronously; the wiki
// is small (≤ 1000 files) and this runs once per report.
function countWikiLeaves(repoRoot) {
  const root = resolve(repoRoot, "reviewers.wiki");
  if (!existsSync(root)) return 0;
  let count = 0;
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      if (ent.name.startsWith(".")) continue;
      const full = join(dir, ent.name);
      if (ent.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (!ent.isFile() && !ent.isSymbolicLink()) continue;
      if (!ent.name.endsWith(".md")) continue;
      if (ent.name === "index.md") continue;
      try {
        if (statSync(full).isFile()) count++;
      } catch {
        // unreadable entry — skip
      }
    }
  }
  return count;
}

// Always derive from the wiki at runtime per report-format.md; we
// deliberately do NOT honour env.specialists_total so a caller cannot
// emit a non-canonical / stale value through the report. The result is
// cached per-process for repeated report writes.
let _wikiLeavesCache = null;
function specialistsTotal() {
  if (_wikiLeavesCache !== null) return _wikiLeavesCache;
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(__dirname, "..", "..");
  _wikiLeavesCache = countWikiLeaves(repoRoot);
  return _wikiLeavesCache;
}

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
const VALID_SEVERITIES = new Set(["critical", "important", "minor"]);

function buildIssue(finding, idx) {
  const flaggedBy = Array.isArray(finding.flagged_by) ? finding.flagged_by : [];
  // Specialist attribution: prefer the dedup `winner` (the specialist whose
  // finding fields actually won — they own the severity / title / impact /
  // fix that we're surfacing). Fall back to the lex-first flagged_by entry
  // (sort defensively here — collect-findings already sorts on write but
  // a hand-crafted finding might not) when winner isn't carried.
  const sortedFlagged = [...flaggedBy].sort();
  // report-format.md requires issues[].severity ∈ {critical, important, minor}.
  // Anything else is a contract violation upstream — fail fast rather than
  // emit a non-canonical issue row.
  if (!VALID_SEVERITIES.has(finding.severity)) {
    throw new Error(
      `buildIssue: finding.severity must be one of ${[...VALID_SEVERITIES].join(", ")}; got: ${JSON.stringify(finding.severity)} (idx ${idx})`,
    );
  }
  return {
    id: idx + 1,
    severity: finding.severity,
    specialist: finding.winner ?? sortedFlagged[0] ?? null,
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
  // Skipped / errored specialists do NOT contribute findings to the report
  // surface (per the pipeline contract: only completed specialists' findings
  // flow through collect-findings). Zero out their counts to avoid leaking
  // phantom severities into the report's specialist summary even when a
  // worker stub left a `findings: [...]` array on a non-completed status.
  const isCompleted = s.status === "completed";
  const findings = isCompleted && Array.isArray(s.findings) ? s.findings : [];
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
  const ok = isCompleted && critical === 0 && important === 0;
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
  // Canonical fields per report-format.md JSON Schema:
  // { name, status, findings, specialist, output_summary?, reason? }.
  // The FSM tool_discovery worker emits `output` (not output_summary) and
  // does not currently emit a `specialist` association — accept both shapes
  // and surface them under the canonical names so the report stays portable
  // regardless of which worker produced the row.
  return {
    name: t.name ?? null,
    status: t.status ?? null,
    findings: t.findings ?? null,
    specialist: t.specialist ?? null,
    output_summary: t.output_summary ?? t.output ?? null,
    ...(t.status === "skipped" && t.reason !== undefined ? { reason: t.reason } : {}),
  };
}

const VALID_VERDICTS = new Set(["GO", "NO-GO", "CONDITIONAL"]);

export function buildReportPayload(runId, env) {
  // verdict MUST be one of GO | NO-GO | CONDITIONAL per report-format.md.
  // The FSM precondition for write_run_directory is "verdict exists in run
  // state", so reaching here without one is a contract violation upstream.
  // Fail fast rather than emitting a non-canonical report.json.
  if (!VALID_VERDICTS.has(env.verdict)) {
    throw new Error(
      `buildReportPayload: env.verdict must be one of ${[...VALID_VERDICTS].join(", ")}; got: ${JSON.stringify(env.verdict)}`,
    );
  }
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

  // Strict canonical top level per report-format.md JSON Schema: exactly
  // { verdict, summary, methodology, issues, strengths, tool_results,
  // specialists, gates, coverage }. No additional keys (run_id lives in
  // manifest.json; skill-internal context like tier / routing /
  // short_circuited belongs in the FSM trace, not the canonical report).
  return {
    verdict: env.verdict,
    summary: {
      // report-format.md JSON Schema rules: description is a string,
      // specialists_total is an integer. Default to "" / 0 rather than
      // null so downstream consumers that string-format / numeric-compare
      // these fields don't trip on a type mismatch.
      description: env.description ?? argsBag.description ?? "",
      range: {
        base: env.base_sha ?? null,
        head: env.head_sha ?? null,
      },
      mode: argsBag.full ? "full" : "diff",
      files_changed: Array.isArray(env.changed_paths) ? env.changed_paths.length : 0,
      stack,
      // specialists_dispatched is the count of leaves PICKED for this run
      // (Step 4 / llm_trim → picked_leaves). Falls back to
      // specialist_outputs.length when picked_leaves isn't in env (legacy
      // / partial runs), but the canonical answer is the picked-leaves
      // size, not however many workers happened to report back.
      specialists_dispatched: Array.isArray(env.picked_leaves)
        ? env.picked_leaves.length
        : specialistOutputs.length,
      specialists_total: specialistsTotal(),
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

  // The manifest carries the run_id, the engine-side execution record, and
  // the skill-internal context that report.json deliberately does NOT carry
  // (per the canonical report-format.md JSON Schema).
  const existingManifest = readManifest(runId, { storageRoot }) ?? {};
  writeManifest(
    runId,
    {
      ...existingManifest,
      run_id: runId,
      verdict: reportPayload.verdict,
      report_path: reportMdPath,
      report_json_path: reportJsonPath,
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
    { storageRoot },
  );

  return dir;
}

export default async function writeRunDirectory({ brief, env }) {
  const dir = writeRunArtefacts(brief.run_id, env);
  return { run_dir_path: dir };
}
