// Smoke tests for buildReportPayload (the pure helper underlying
// writeRunArtefacts). The shape under test is the canonical contract from
// `report-format.md` (the file README.md and code-reviewer.md point users
// at). Skill-internal context is preserved under `_meta` so the top-level
// report stays canonical for downstream tools.
//
// Filesystem-level coverage of writeRunArtefacts itself lives under SC-B7.

import { test } from "node:test";
import assert from "node:assert/strict";

import { buildReportPayload } from "../../scripts/inline-states/write-run-directory.mjs";

test("buildReportPayload: top-level shape matches report-format.md contract", () => {
  const payload = buildReportPayload("run-1", {
    base_sha: "abc1234",
    head_sha: "def5678",
    args: { format: "markdown", description: "Sprint B hardening" },
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

  // Top-level fields per the contract
  assert.equal(payload.verdict, "NO-GO");
  assert.equal(payload.summary.range.base, "abc1234");
  assert.equal(payload.summary.range.head, "def5678");
  assert.equal(payload.summary.mode, "diff");
  assert.equal(payload.summary.files_changed, 2);
  assert.deepEqual(payload.summary.stack, ["typescript", "express"]);
  assert.equal(payload.summary.specialists_dispatched, 1);
  assert.equal(payload.summary.description, "Sprint B hardening");

  // Methodology defaults to all N/A when env doesn't carry SOLID judgements
  for (const k of ["SRP", "OCP", "LSP", "ISP", "DIP", "DRY", "KISS", "YAGNI"]) {
    assert.equal(payload.methodology[k], "N/A");
  }

  // Issues mapped from findings, with id assigned by enumeration order
  assert.equal(payload.issues.length, 1);
  assert.equal(payload.issues[0].id, 1);
  assert.equal(payload.issues[0].severity, "critical");
  assert.equal(payload.issues[0].specialist, "security");
  assert.equal(payload.issues[0].file, "src/auth.ts");
  assert.equal(payload.issues[0].line, 42);

  // Specialists row: status maps completed-no-blockers → pass; counts
  // reflect findings buckets.
  assert.equal(payload.specialists.length, 1);
  assert.equal(payload.specialists[0].id, "security");
  assert.equal(payload.specialists[0].status, "fail"); // critical present
  assert.equal(payload.specialists[0].critical, 1);

  // Gates → canonical { number, name, status, blockers }
  assert.deepEqual(payload.gates, [
    { number: 6, name: "Security & Safety", status: "FAIL", blockers: 1 },
  ]);

  // Coverage carries the matrix forward
  assert.equal(payload.coverage.length, 1);
  assert.deepEqual(payload.coverage[0].reviewers, ["security", "lang-typescript"]);

  // _meta preserves skill-internal context (tier, routing) without polluting
  // the canonical top level.
  assert.ok(payload._meta);
  assert.equal(payload._meta.short_circuited, false);
  assert.equal(payload._meta.degraded_run, false);
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

test("buildReportPayload: defaults to canonical empty arrays + null fields when env is sparse", () => {
  const payload = buildReportPayload("run-empty", {});

  // Required arrays must be present (no omission per the spec).
  assert.deepEqual(payload.issues, []);
  assert.deepEqual(payload.strengths, []);
  assert.deepEqual(payload.tool_results, []);
  assert.deepEqual(payload.specialists, []);
  assert.deepEqual(payload.gates, []);
  assert.deepEqual(payload.coverage, []);

  // Summary defaults
  assert.equal(payload.summary.mode, "diff");
  assert.equal(payload.summary.files_changed, 0);
  assert.deepEqual(payload.summary.stack, []);
  assert.equal(payload.summary.range.base, null);
  assert.equal(payload.summary.range.head, null);
  for (const k of ["dirs", "langs", "frameworks", "reviewers", "severity_filter", "gates_filter"]) {
    assert.equal(payload.summary.scope[k], null);
  }

  assert.equal(payload.verdict, null);
  assert.equal(payload._meta.short_circuited, false);
  assert.equal(payload._meta.degraded_run, false);
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
  assert.equal(ts.status, "fail"); // important present → fail
  assert.equal(ts.minor, 1);
  assert.equal(ts.important, 1);
  assert.equal(ts.critical, 0);
  // key_finding picks the highest-severity title available
  assert.equal(ts.key_finding, "missing return type");

  const ex = payload.specialists.find((s) => s.id === "fw-express");
  assert.equal(ex.status, "fail"); // skipped → fail (status ≠ completed)
  assert.equal(ex.key_finding, "phantom");
});

test("buildReportPayload: short_circuited and degraded_run flow into _meta", () => {
  const sc = buildReportPayload("r", { short_circuited: true });
  assert.equal(sc._meta.short_circuited, true);
  assert.equal(sc._meta.degraded_run, false);

  const dg = buildReportPayload("r", { degraded_run: true });
  assert.equal(dg._meta.degraded_run, true);
  assert.equal(dg._meta.short_circuited, false);
});

test("buildReportPayload: routing block preserved under _meta for skill consumers", () => {
  const payload = buildReportPayload("r", {
    stage_a_candidates: [{ id: "a", path: "a.md", activation_match: ["file_globs"] }],
    picked_leaves: [{ id: "a", dimensions: ["correctness"] }],
    rejected_leaves: [{ id: "b", reason: "low signal" }],
    coverage_rescues: [{ file: "x.ts", rescued_leaf: "lang-typescript", reason: "rescue" }],
  });
  assert.equal(payload._meta.routing.stage_a.candidates.length, 1);
  assert.equal(payload._meta.routing.stage_b.picked.length, 1);
  assert.equal(payload._meta.routing.stage_b.rejected.length, 1);
  assert.equal(payload._meta.routing.stage_b.coverage_rescues.length, 1);
});
