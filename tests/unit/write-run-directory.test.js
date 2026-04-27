// Smoke tests for buildReportPayload (the pure helper underlying
// writeRunArtefacts). Full filesystem-level coverage of writeRunArtefacts
// lives under SC-B7's record/replay harness; these tests pin the payload
// shape so report.json and the report.md renderer keep agreeing on field
// names.

import { test } from "node:test";
import assert from "node:assert/strict";

import { buildReportPayload } from "../../scripts/inline-states/write-run-directory.mjs";

test("buildReportPayload: passes through verdict-affecting env fields", () => {
  const payload = buildReportPayload("run-1", {
    repo: "ctxr-dev/skill-code-review",
    base_sha: "aaa",
    head_sha: "bbb",
    args: { format: "markdown" },
    tier: "sensitive",
    cap: 30,
    tier_rationale: "auth keyword",
    findings: [{ severity: "critical", file: "x.ts" }],
    severity_counts: { critical: 1, important: 0, minor: 0 },
    coverage_matrix: [{ file: "x.ts", reviewers: ["sec-jwt-tokens", "lang-typescript"] }],
    coverage_gaps: [],
    gates: [{ number: 6, name: "Security & Safety", status: "FAIL" }],
    verdict: "NO-GO",
  });

  assert.equal(payload.run_id, "run-1");
  assert.equal(payload.repo, "ctxr-dev/skill-code-review");
  assert.equal(payload.tier, "sensitive");
  assert.equal(payload.tier_cap, 30);
  assert.equal(payload.verdict, "NO-GO");
  assert.equal(payload.findings.length, 1);
  assert.equal(payload.severity_counts.critical, 1);
  assert.equal(payload.degraded_run, false);
});

test("buildReportPayload: defaults nullable fields when env is sparse", () => {
  const payload = buildReportPayload("run-2", {});
  assert.equal(payload.run_id, "run-2");
  assert.equal(payload.repo, null);
  assert.equal(payload.base_sha, null);
  assert.equal(payload.head_sha, null);
  assert.equal(payload.tier, null);
  assert.equal(payload.tier_cap, null);
  assert.deepEqual(payload.args, {});
  assert.deepEqual(payload.findings, []);
  assert.deepEqual(payload.severity_counts, { critical: 0, important: 0, minor: 0 });
  assert.deepEqual(payload.coverage_matrix, []);
  assert.deepEqual(payload.coverage_gaps, []);
  assert.deepEqual(payload.gates, []);
  assert.equal(payload.verdict, null);
  assert.equal(payload.degraded_run, false);
  assert.equal(payload.short_circuited, false);
});

test("buildReportPayload: reduces specialist outputs to summary entries", () => {
  const payload = buildReportPayload("run-3", {
    specialist_outputs: [
      {
        id: "lang-typescript",
        status: "completed",
        runtime_ms: 120,
        tokens_in: 1500,
        tokens_out: 200,
        findings: [{ severity: "minor" }, { severity: "important" }],
      },
      {
        id: "fw-express",
        status: "skipped",
        skip_reason: "no express handler files",
        findings: [{ severity: "critical", title: "phantom" }],
      },
    ],
  });

  assert.equal(payload.specialists.length, 2);
  const ts = payload.specialists.find((s) => s.id === "lang-typescript");
  assert.equal(ts.status, "completed");
  assert.equal(ts.finding_count, 2);
  assert.equal(ts.tokens_in, 1500);
  const ex = payload.specialists.find((s) => s.id === "fw-express");
  assert.equal(ex.status, "skipped");
  assert.equal(ex.finding_count, 1);
  assert.equal(ex.skip_reason, "no express handler files");
});

test("buildReportPayload: short_circuited and degraded_run booleans coerce", () => {
  const sc = buildReportPayload("r", { short_circuited: true });
  assert.equal(sc.short_circuited, true);
  assert.equal(sc.degraded_run, false);

  const dg = buildReportPayload("r", { degraded_run: true });
  assert.equal(dg.degraded_run, true);
  assert.equal(dg.short_circuited, false);
});

test("buildReportPayload: routing block carries stage_a + stage_b verbatim", () => {
  const payload = buildReportPayload("r", {
    stage_a_candidates: [{ id: "a", path: "a.md", activation_match: ["file_globs"] }],
    picked_leaves: [{ id: "a", dimensions: ["correctness"] }],
    rejected_leaves: [{ id: "b", reason: "low signal" }],
    coverage_rescues: [{ file: "x.ts", rescued_leaf: "lang-typescript", reason: "rescue" }],
  });
  assert.equal(payload.routing.stage_a.candidates.length, 1);
  assert.equal(payload.routing.stage_b.picked.length, 1);
  assert.equal(payload.routing.stage_b.rejected.length, 1);
  assert.equal(payload.routing.stage_b.coverage_rescues.length, 1);
});
