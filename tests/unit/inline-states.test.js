import { test } from "node:test";
import assert from "node:assert/strict";

import riskTierTriage from "../../scripts/inline-states/risk-tier-triage.mjs";
import collectFindings from "../../scripts/inline-states/collect-findings.mjs";
import verifyCoverage from "../../scripts/inline-states/verify-coverage.mjs";
import synthesizeReleaseReadiness from "../../scripts/inline-states/synthesize-release-readiness.mjs";
import shortCircuitExit from "../../scripts/inline-states/short-circuit-exit.mjs";
import stageAEmpty from "../../scripts/inline-states/stage-a-empty.mjs";

test("risk-tier-triage: trivial single-line readme bump", async () => {
  const out = await riskTierTriage({
    env: {
      changed_paths: ["README.md"],
      diff_stats: { lines_changed: 2, files_changed: 1 },
      project_profile: { iac: [] },
      args: {},
    },
  });
  assert.equal(out.tier, "trivial");
  assert.equal(out.cap, 3);
  assert.deepEqual(out.risk_signals, []);
  assert.equal(out.scope_overrides_present, false);
});

test("risk-tier-triage: sensitive when path matches risk keyword", async () => {
  const out = await riskTierTriage({
    env: {
      changed_paths: ["src/auth/oauth-handler.ts"],
      diff_stats: { lines_changed: 30, files_changed: 1 },
      project_profile: { iac: [] },
      args: {},
    },
  });
  assert.equal(out.tier, "sensitive");
  assert.equal(out.cap, 30);
  assert.ok(out.risk_signals.some((s) => s.includes("auth")));
});

test("risk-tier-triage: sensitive when Dockerfile present", async () => {
  const out = await riskTierTriage({
    env: {
      changed_paths: ["Dockerfile", "src/app.ts"],
      diff_stats: { lines_changed: 50, files_changed: 2 },
      project_profile: { iac: [] },
      args: {},
    },
  });
  assert.equal(out.tier, "sensitive");
});

test("risk-tier-triage: full when large diff and no risk signal", async () => {
  const out = await riskTierTriage({
    env: {
      changed_paths: ["src/util.ts", "src/util2.ts", "src/util3.ts", "src/util4.ts", "src/util5.ts", "src/util6.ts"],
      diff_stats: { lines_changed: 300, files_changed: 6 },
      project_profile: { iac: [] },
      args: {},
    },
  });
  assert.equal(out.tier, "full");
  assert.equal(out.cap, 20);
});

test("risk-tier-triage: lite when small non-risk diff", async () => {
  const out = await riskTierTriage({
    env: {
      changed_paths: ["src/util.ts", "src/util.test.ts"],
      diff_stats: { lines_changed: 40, files_changed: 2 },
      project_profile: { iac: [] },
      args: {},
    },
  });
  assert.equal(out.tier, "lite");
  assert.equal(out.cap, 8);
});

test("risk-tier-triage: scope-overrides flag detected", async () => {
  const out = await riskTierTriage({
    env: {
      changed_paths: ["README.md"],
      diff_stats: { lines_changed: 2, files_changed: 1 },
      project_profile: { iac: [] },
      args: { "scope-dir": "src/api" },
    },
  });
  assert.equal(out.scope_overrides_present, true);
});

test("risk-tier-triage: max-reviewers override clamps to [3, 50]", async () => {
  const lo = await riskTierTriage({
    env: {
      changed_paths: ["src/util.ts"],
      diff_stats: { lines_changed: 5, files_changed: 1 },
      project_profile: { iac: [] },
      args: { "max-reviewers": "1" },
    },
  });
  assert.equal(lo.cap, 3);

  const hi = await riskTierTriage({
    env: {
      changed_paths: ["src/util.ts"],
      diff_stats: { lines_changed: 5, files_changed: 1 },
      project_profile: { iac: [] },
      args: { "max-reviewers": "999" },
    },
  });
  assert.equal(hi.cap, 50);
});

test("collect-findings: dedup keeps higher severity", async () => {
  const out = await collectFindings({
    env: {
      specialist_outputs: [
        {
          id: "leaf-a",
          status: "completed",
          findings: [{ severity: "minor", file: "a.ts", line: 10, title: "Loose typing" }],
        },
        {
          id: "leaf-b",
          status: "completed",
          findings: [{ severity: "critical", file: "a.ts", line: 10, title: "loose typing" }],
        },
      ],
    },
  });
  assert.equal(out.findings.length, 1);
  assert.equal(out.findings[0].severity, "critical");
  assert.deepEqual(out.findings[0].flagged_by, ["leaf-a", "leaf-b"]);
  assert.equal(out.severity_counts.critical, 1);
  assert.equal(out.severity_counts.minor, 0);
});

test("collect-findings: skipped specialists do not contribute findings", async () => {
  const out = await collectFindings({
    env: {
      specialist_outputs: [
        {
          id: "leaf-a",
          status: "skipped",
          skip_reason: "no relevant files",
          findings: [{ severity: "critical", file: "x.ts", line: 1, title: "fake" }],
        },
      ],
    },
  });
  assert.equal(out.findings.length, 0);
});

test("collect-findings: deterministic ordering by severity then file then line", async () => {
  const a = await collectFindings({
    env: {
      specialist_outputs: [
        {
          id: "leaf-a",
          status: "completed",
          findings: [
            { severity: "minor", file: "b.ts", line: 5, title: "x" },
            { severity: "important", file: "a.ts", line: 1, title: "y" },
            { severity: "critical", file: "c.ts", line: 99, title: "z" },
          ],
        },
      ],
    },
  });
  const b = await collectFindings({
    env: {
      specialist_outputs: [
        {
          id: "leaf-a",
          status: "completed",
          findings: [
            { severity: "critical", file: "c.ts", line: 99, title: "z" },
            { severity: "minor", file: "b.ts", line: 5, title: "x" },
            { severity: "important", file: "a.ts", line: 1, title: "y" },
          ],
        },
      ],
    },
  });
  assert.deepEqual(
    a.findings.map((f) => f.title),
    b.findings.map((f) => f.title),
    "ordering should not depend on input order",
  );
});

test("verify-coverage: 1-leaf coverage produces gaps; 2+ leaves passes", async () => {
  const oneLeaf = await verifyCoverage({
    env: {
      findings: [],
      picked_leaves: [{ id: "leaf-a" }],
      changed_paths: ["x.ts", "y.ts"],
    },
  });
  assert.deepEqual(oneLeaf.coverage_gaps, ["x.ts", "y.ts"]);

  const twoLeaves = await verifyCoverage({
    env: {
      findings: [],
      picked_leaves: [{ id: "leaf-a" }, { id: "leaf-b" }],
      changed_paths: ["x.ts", "y.ts"],
    },
  });
  assert.deepEqual(twoLeaves.coverage_gaps, []);
});

test("synthesize-release-readiness: all PASS → GO", async () => {
  const out = await synthesizeReleaseReadiness({
    env: {
      findings: [
        { severity: "minor", file: "x.ts", flagged_by: ["leaf-a"], title: "minor thing" },
      ],
      picked_leaves: [
        { id: "lang-typescript", dimensions: ["correctness", "readability"] },
        { id: "sec-jwt-tokens", dimensions: ["security"] },
      ],
      coverage_gaps: [],
    },
  });
  assert.equal(out.verdict, "GO");
  assert.equal(out.gates.length, 8);
  for (const g of out.gates) {
    assert.notEqual(g.status, "FAIL");
  }
});

test("synthesize-release-readiness: any FAIL → NO-GO", async () => {
  const out = await synthesizeReleaseReadiness({
    env: {
      findings: [
        { severity: "critical", file: "x.ts", flagged_by: ["sec-jwt-tokens"], title: "secret leak" },
      ],
      picked_leaves: [{ id: "sec-jwt-tokens", dimensions: ["security"] }],
      coverage_gaps: [],
    },
  });
  assert.equal(out.verdict, "NO-GO");
  const gate6 = out.gates.find((g) => g.number === 6);
  assert.equal(gate6.status, "FAIL");
  assert.equal(gate6.blocker_count, 1);
});

test("synthesize-release-readiness: coverage_rule_violated → NO-GO (B4 hard rule)", async () => {
  const out = await synthesizeReleaseReadiness({
    env: {
      findings: [],
      picked_leaves: [{ id: "lang-typescript", dimensions: ["correctness"] }],
      coverage_gaps: ["x.ts"],
      coverage_rule_violated: true,
    },
  });
  assert.equal(out.verdict, "NO-GO");
});

test("synthesize-release-readiness: coverage gaps without rule_violated still GO (defensive)", async () => {
  // Defensive: if some upstream is on soft-mode, gaps without the hard flag
  // pass. Today verify-coverage always sets the flag iff gaps exist, so this
  // path is reachable only via custom env (or future soft-mode).
  const out = await synthesizeReleaseReadiness({
    env: {
      findings: [],
      picked_leaves: [{ id: "lang-typescript", dimensions: ["correctness"] }],
      coverage_gaps: ["x.ts"],
      coverage_rule_violated: false,
    },
  });
  assert.equal(out.verdict, "GO");
});

test("verify-coverage: coverage_rescues lift a 1-leaf scenario back to PASS", async () => {
  const out = await verifyCoverage({
    env: {
      findings: [],
      picked_leaves: [{ id: "leaf-a" }],
      coverage_rescues: [{ file: "x.ts", rescued_leaf: "leaf-b", reason: "rescue" }],
      changed_paths: ["x.ts"],
    },
  });
  assert.equal(out.coverage_rule_violated, false);
  assert.deepEqual(out.coverage_gaps, []);
});

test("verify-coverage: coverage_rule_violated true when gaps remain after rescues", async () => {
  const out = await verifyCoverage({
    env: {
      findings: [],
      picked_leaves: [{ id: "leaf-a" }],
      coverage_rescues: [],
      changed_paths: ["x.ts", "y.ts"],
    },
  });
  assert.equal(out.coverage_rule_violated, true);
  assert.deepEqual(out.coverage_gaps, ["x.ts", "y.ts"]);
});

test("short-circuit-exit + stage-a-empty: shape parity for downstream report rendering", async () => {
  const sc = await shortCircuitExit();
  const sae = await stageAEmpty({ env: { changed_paths: ["a.ts"] } });
  assert.equal(sc.gates.length, 8);
  assert.equal(sae.gates.length, 8);
  assert.equal(sc.verdict, "GO");
  assert.equal(sae.verdict, "CONDITIONAL");
  assert.equal(sae.degraded_run, true);
});
