// Smoke tests for buildReportPayload (the pure helper underlying
// writeRunArtefacts). The shape under test is the canonical contract from
// `report-format.md` (the file README.md and code-reviewer.md point users
// at): exactly { verdict, summary, methodology, issues, strengths,
// tool_results, specialists, gates, coverage } at top level — no extra
// keys. Skill-internal context (tier, routing, short_circuited) lives in
// manifest.json instead.
//
// Filesystem-level coverage of writeRunArtefacts itself lives under SC-B7.

import { test } from "node:test";
import assert from "node:assert/strict";

import { buildReportPayload } from "../../scripts/inline-states/write-run-directory.mjs";

const CANONICAL_TOP_LEVEL_KEYS = [
  "verdict",
  "summary",
  "methodology",
  "issues",
  "strengths",
  "tool_results",
  "specialists",
  "gates",
  "coverage",
];

test("buildReportPayload: top-level keys exactly match report-format.md", () => {
  const payload = buildReportPayload("run-1", {});
  assert.deepEqual(
    Object.keys(payload).sort(),
    [...CANONICAL_TOP_LEVEL_KEYS].sort(),
    "report.json must contain exactly the canonical top-level keys (no run_id, no _meta, no skill-internal extras)",
  );
});

test("buildReportPayload: full env produces canonical issues + specialists + gates", () => {
  const payload = buildReportPayload("run-1", {
    base_sha: "abc1234",
    head_sha: "def5678",
    args: { description: "Sprint B hardening" },
    findings: [
      {
        severity: "critical",
        file: "src/auth.ts",
        line: 42,
        title: "SQL injection",
        description: "string interpolation",
        impact: "data breach",
        fix: "parameterise query",
        principle: "OWASP A03",
        flagged_by: ["security"],
      },
    ],
    project_profile: { languages: ["typescript"], frameworks: ["express"] },
    changed_paths: ["src/auth.ts", "src/auth.test.ts"],
    specialist_outputs: [
      {
        id: "security",
        status: "completed",
        findings: [{ severity: "critical", title: "SQL injection" }],
      },
    ],
    gates: [
      { number: 6, name: "Security & Safety", status: "FAIL", blocker_count: 1 },
    ],
    coverage_matrix: [{ file: "src/auth.ts", reviewers: ["security", "lang-typescript"] }],
    verdict: "NO-GO",
  });

  assert.equal(payload.verdict, "NO-GO");
  assert.equal(payload.summary.range.base, "abc1234");
  assert.equal(payload.summary.range.head, "def5678");
  assert.equal(payload.summary.mode, "diff");
  assert.equal(payload.summary.files_changed, 2);
  assert.deepEqual(payload.summary.stack, ["typescript", "express"]);
  assert.equal(payload.summary.specialists_dispatched, 1);
  assert.equal(payload.summary.description, "Sprint B hardening");

  for (const k of ["SRP", "OCP", "LSP", "ISP", "DIP", "DRY", "KISS", "YAGNI"]) {
    assert.equal(payload.methodology[k], "N/A");
  }

  assert.equal(payload.issues.length, 1);
  assert.equal(payload.issues[0].id, 1);
  assert.equal(payload.issues[0].severity, "critical");
  assert.equal(payload.issues[0].specialist, "security");
  assert.equal(payload.issues[0].file, "src/auth.ts");
  assert.equal(payload.issues[0].line, 42);

  assert.equal(payload.specialists.length, 1);
  assert.equal(payload.specialists[0].id, "security");
  assert.equal(payload.specialists[0].status, "fail");
  assert.equal(payload.specialists[0].critical, 1);

  assert.deepEqual(payload.gates, [
    { number: 6, name: "Security & Safety", status: "FAIL", blockers: 1 },
  ]);

  assert.equal(payload.coverage.length, 1);
  assert.deepEqual(payload.coverage[0].reviewers, ["security", "lang-typescript"]);
});

test("buildReportPayload: scope mapping from args matches the spec", () => {
  const payload = buildReportPayload("r", {
    args: {
      "scope-dir": "src/api,src/util",
      "scope-lang": "typescript",
      "scope-severity": "important",
      "scope-gate": "1,6",
      full: true,
    },
  });
  assert.equal(payload.summary.mode, "full");
  assert.deepEqual(payload.summary.scope.dirs, ["src/api", "src/util"]);
  assert.deepEqual(payload.summary.scope.langs, ["typescript"]);
  assert.deepEqual(payload.summary.scope.frameworks, null);
  assert.deepEqual(payload.summary.scope.reviewers, null);
  assert.deepEqual(payload.summary.scope.severity_filter, ["important"]);
  assert.deepEqual(payload.summary.scope.gates_filter, ["1", "6"]);
});

test("buildReportPayload: sparse env yields canonical empty arrays + null fields", () => {
  const payload = buildReportPayload("run-empty", {});
  assert.deepEqual(payload.issues, []);
  assert.deepEqual(payload.strengths, []);
  assert.deepEqual(payload.tool_results, []);
  assert.deepEqual(payload.specialists, []);
  assert.deepEqual(payload.gates, []);
  assert.deepEqual(payload.coverage, []);
  assert.equal(payload.summary.mode, "diff");
  assert.equal(payload.summary.files_changed, 0);
  assert.deepEqual(payload.summary.stack, []);
  assert.equal(payload.summary.range.base, null);
  assert.equal(payload.summary.range.head, null);
  for (const k of ["dirs", "langs", "frameworks", "reviewers", "severity_filter", "gates_filter"]) {
    assert.equal(payload.summary.scope[k], null);
  }
  assert.equal(payload.verdict, null);
});

test("buildReportPayload: specialist row buckets findings by severity", () => {
  const payload = buildReportPayload("r", {
    specialist_outputs: [
      {
        id: "lang-typescript",
        status: "completed",
        findings: [
          { severity: "minor", title: "loose typing" },
          { severity: "important", title: "missing return type" },
        ],
      },
      {
        id: "fw-express",
        status: "skipped",
        skip_reason: "no express handler files",
        findings: [{ severity: "critical", title: "phantom" }],
      },
    ],
  });
  const ts = payload.specialists.find((s) => s.id === "lang-typescript");
  assert.equal(ts.status, "fail");
  assert.equal(ts.minor, 1);
  assert.equal(ts.important, 1);
  assert.equal(ts.critical, 0);
  assert.equal(ts.key_finding, "missing return type");

  const ex = payload.specialists.find((s) => s.id === "fw-express");
  assert.equal(ex.status, "fail");
  // Skipped specialists' findings are intentionally discarded (per the
  // pipeline contract: only completed specialists contribute findings).
  // key_finding falls through to skip_reason instead.
  assert.equal(ex.key_finding, "no express handler files");
  assert.equal(ex.critical, 0);
  assert.equal(ex.important, 0);
  assert.equal(ex.minor, 0);
});

test("buildReportPayload: tool row maps `output` to `output_summary` for canonical shape", () => {
  const payload = buildReportPayload("r", {
    tool_results: [
      { name: "tsc", status: "pass", findings: 0, output: "0 errors" },
      { name: "npm-audit", status: "skipped", reason: "not installed" },
    ],
  });
  const tsc = payload.tool_results.find((t) => t.name === "tsc");
  assert.equal(tsc.output_summary, "0 errors");
  const audit = payload.tool_results.find((t) => t.name === "npm-audit");
  assert.equal(audit.reason, "not installed");
  assert.equal(audit.status, "skipped");
});
