// reproducibility.test.js — Sprint B B5 golden-fixture gate.
//
// Caps Sprint B's deterministic-pipeline hardening: every inline-state handler
// AND the activation-gate library AND the full inline pipeline composed
// end-to-end must produce byte-identical structured output across two runs
// against the same env. Drift here means a regression in determinism — exactly
// the failure mode B1–B4 set out to eliminate.
//
// Pickling rule: outputs are compared via `JSON.stringify(out)` string equality.
// Run-id and timestamps live in `write-run-directory.mjs` only; that handler is
// excluded here because its output is stateful by design (it persists files
// keyed by run-id). Every other deterministic state is pure-in/pure-out.
//
// Fixture choice (per issue #10 implementation pointers): a synthetic sensitive
// diff covering `src/api/auth.ts`, `src/api/auth.test.ts`, `src/util/jwt.ts`,
// `package.json`. The auth/jwt path keywords push risk-tier-triage into the
// `sensitive` tier (cap 30), the auth + auth.test pair exercises the
// language/test/security gate predicates downstream, and seeding two
// specialists who flag the same (file, line, normalised_title) exercises
// collect-findings dedup with cross-validation.

import { test } from "node:test";
import assert from "node:assert/strict";

import riskTierTriage from "../../scripts/inline-states/risk-tier-triage.mjs";
import collectFindings from "../../scripts/inline-states/collect-findings.mjs";
import verifyCoverage from "../../scripts/inline-states/verify-coverage.mjs";
import synthesizeReleaseReadiness from "../../scripts/inline-states/synthesize-release-readiness.mjs";
import shortCircuitExit from "../../scripts/inline-states/short-circuit-exit.mjs";
import stageAEmpty from "../../scripts/inline-states/stage-a-empty.mjs";
import { evaluateActivation } from "../../scripts/lib/activation-gate.mjs";

const SENSITIVE_FIXTURE = Object.freeze({
  changed_paths: [
    "src/api/auth.ts",
    "src/api/auth.test.ts",
    "src/util/jwt.ts",
    "package.json",
  ],
  diff_stats: { lines_changed: 87, files_changed: 4 },
  diff_text: [
    "+import jwt from 'jsonwebtoken';",
    "+const token = jwt.sign(payload, process.env.JWT_SECRET);",
    "+if (jwt.verify(token, process.env.JWT_SECRET)) { /* ... */ }",
  ].join("\n"),
  project_profile: {
    languages: ["typescript"],
    frameworks: ["express"],
    iac: [],
    ci: ["github-actions"],
  },
  args: {},
});

const PIPELINE_LEAVES = Object.freeze([
  {
    id: "lang-typescript",
    path: "lang-typescript.md",
    dimensions: ["correctness", "readability"],
    activation: { file_globs: ["**/*.ts"] },
  },
  {
    id: "sec-jwt-tokens",
    path: "sec-jwt-tokens.md",
    dimensions: ["security"],
    activation: { keyword_matches: ["jwt.sign", "jwt.verify"] },
  },
  {
    id: "test-typescript",
    path: "test-typescript.md",
    dimensions: ["tests"],
    activation: { file_globs: ["**/*.test.ts"] },
  },
  {
    id: "fw-express",
    path: "fw-express.md",
    dimensions: ["architecture"],
    activation: { structural_signals: ["express"] },
  },
  // Negative control: must not activate against this fixture.
  {
    id: "lang-python",
    path: "lang-python.md",
    dimensions: ["correctness"],
    activation: { file_globs: ["**/*.py"] },
  },
]);

const SEEDED_SPECIALIST_OUTPUTS = Object.freeze([
  {
    id: "lang-typescript",
    status: "completed",
    findings: [
      { severity: "minor", file: "src/api/auth.ts", line: 12, title: "Loose typing on token payload" },
      { severity: "important", file: "src/util/jwt.ts", line: 7, title: "Missing return type annotation" },
    ],
  },
  {
    id: "sec-jwt-tokens",
    status: "completed",
    findings: [
      // Same (file, line, normalised_title) as lang-typescript above with
      // higher severity → exercises dedup keep-higher rule.
      { severity: "critical", file: "src/api/auth.ts", line: 12, title: "loose typing on token payload" },
      { severity: "critical", file: "src/util/jwt.ts", line: 22, title: "JWT secret read from env without validation" },
    ],
  },
  {
    id: "test-typescript",
    status: "completed",
    findings: [
      { severity: "important", file: "src/api/auth.test.ts", line: 3, title: "Missing negative-path coverage" },
    ],
  },
  {
    id: "fw-express",
    status: "skipped",
    skip_reason: "no express handler files in diff",
    findings: [
      // Skipped specialist's findings must be discarded — protects the dedup
      // contract end-to-end.
      { severity: "critical", file: "src/api/auth.ts", line: 99, title: "phantom finding" },
    ],
  },
]);

function pickle(value) {
  return JSON.stringify(value);
}

async function twiceIdentical(label, runOnce) {
  const first = await runOnce();
  const second = await runOnce();
  assert.equal(
    pickle(first),
    pickle(second),
    `${label}: outputs diverged across two runs of the same input — determinism regression.`,
  );
  return first;
}

test("reproducibility: risk-tier-triage twice on sensitive fixture", async () => {
  await twiceIdentical("risk-tier-triage", () => riskTierTriage({ env: SENSITIVE_FIXTURE }));
});

test("reproducibility: collect-findings twice on seeded specialist outputs", async () => {
  await twiceIdentical("collect-findings", () =>
    collectFindings({ env: { specialist_outputs: SEEDED_SPECIALIST_OUTPUTS } }),
  );
});

test("reproducibility: verify-coverage twice on synthetic findings + leaves", async () => {
  const env = {
    findings: [
      { severity: "critical", file: "src/api/auth.ts", line: 12, flagged_by: ["lang-typescript", "sec-jwt-tokens"] },
      { severity: "critical", file: "src/util/jwt.ts", line: 22, flagged_by: ["sec-jwt-tokens"] },
    ],
    picked_leaves: [{ id: "lang-typescript" }, { id: "sec-jwt-tokens" }, { id: "test-typescript" }],
    coverage_rescues: [],
    changed_paths: SENSITIVE_FIXTURE.changed_paths,
  };
  await twiceIdentical("verify-coverage", () => verifyCoverage({ env }));
});

test("reproducibility: synthesize-release-readiness twice on seeded inputs", async () => {
  const env = {
    findings: [
      { severity: "critical", file: "src/api/auth.ts", line: 12, flagged_by: ["sec-jwt-tokens"], title: "Loose typing on token payload" },
    ],
    picked_leaves: PIPELINE_LEAVES.filter((l) => l.id !== "lang-python"),
    coverage_gaps: [],
    coverage_rule_violated: false,
  };
  await twiceIdentical("synthesize-release-readiness", () => synthesizeReleaseReadiness({ env }));
});

test("reproducibility: short-circuit-exit twice (no env)", async () => {
  await twiceIdentical("short-circuit-exit", () => shortCircuitExit());
});

test("reproducibility: stage-a-empty twice on changed_paths", async () => {
  await twiceIdentical("stage-a-empty", () =>
    stageAEmpty({ env: { changed_paths: SENSITIVE_FIXTURE.changed_paths } }),
  );
});

test("reproducibility: activation-gate twice on full leaf set", async () => {
  await twiceIdentical("activation-gate", () =>
    Promise.resolve(
      evaluateActivation({
        leaves: PIPELINE_LEAVES,
        changed_paths: SENSITIVE_FIXTURE.changed_paths,
        project_profile: SENSITIVE_FIXTURE.project_profile,
        diff_text: SENSITIVE_FIXTURE.diff_text,
      }),
    ),
  );
});

// Full inline pipeline: composes risk-tier-triage → activation-gate →
// collect-findings → verify-coverage → synthesize-release-readiness against
// the sensitive fixture and seeded worker outputs. Two runs must produce a
// byte-identical aggregated manifest.
async function runFullInlinePipeline() {
  const triage = await riskTierTriage({ env: SENSITIVE_FIXTURE });

  const activation = evaluateActivation({
    leaves: PIPELINE_LEAVES,
    changed_paths: SENSITIVE_FIXTURE.changed_paths,
    project_profile: SENSITIVE_FIXTURE.project_profile,
    diff_text: SENSITIVE_FIXTURE.diff_text,
  });
  const pickedLeaves = activation.activated.slice(0, triage.cap);

  // Filter the seeded specialist outputs to only those whose id corresponds
  // to an activated + picked leaf — the pipeline never collects findings from
  // a specialist that wasn't dispatched. Skipped status is a per-worker
  // decision AFTER dispatch (e.g., "no relevant files in diff"), so picked
  // leaves can legitimately appear with status="skipped" — collect-findings
  // is responsible for discarding any findings they emit.
  const pickedIds = new Set(pickedLeaves.map((l) => l.id));
  const dispatched = SEEDED_SPECIALIST_OUTPUTS.filter((s) => pickedIds.has(s.id));

  const collected = await collectFindings({ env: { specialist_outputs: dispatched } });

  const coverage = await verifyCoverage({
    env: {
      findings: collected.findings,
      picked_leaves: pickedLeaves,
      coverage_rescues: [],
      changed_paths: SENSITIVE_FIXTURE.changed_paths,
    },
  });

  const readiness = await synthesizeReleaseReadiness({
    env: {
      findings: collected.findings,
      picked_leaves: pickedLeaves,
      coverage_gaps: coverage.coverage_gaps,
      coverage_rule_violated: coverage.coverage_rule_violated,
    },
  });

  return {
    triage,
    activation: {
      activated_ids: activation.activated.map((l) => l.id),
      descent_signals: activation.descent_signals,
    },
    picked_leaves: pickedLeaves.map((l) => l.id),
    collected,
    coverage,
    readiness,
  };
}

test("reproducibility: full inline pipeline twice on sensitive fixture", async () => {
  const manifest = await twiceIdentical("full inline pipeline", runFullInlinePipeline);

  // Sanity assertions on the manifest itself — these guard against the test
  // passing trivially (two empty objects are also byte-identical).
  assert.equal(manifest.triage.tier, "sensitive", "fixture must trip sensitive tier");
  assert.equal(manifest.triage.cap, 30);
  assert.ok(
    manifest.activation.activated_ids.includes("lang-typescript"),
    "lang-typescript must activate via file_globs",
  );
  assert.ok(
    manifest.activation.activated_ids.includes("sec-jwt-tokens"),
    "sec-jwt-tokens must activate via keyword_matches against the diff text",
  );
  assert.ok(
    manifest.activation.activated_ids.includes("test-typescript"),
    "test-typescript must activate via *.test.ts file_globs",
  );
  assert.ok(
    manifest.activation.activated_ids.includes("fw-express"),
    "fw-express must activate via structural_signals against project_profile.frameworks",
  );
  assert.ok(
    !manifest.activation.activated_ids.includes("lang-python"),
    "lang-python must NOT activate against a TypeScript-only diff",
  );

  // Dedup proof: the (src/api/auth.ts, line 12) finding appears in two
  // specialists at different severities; collect-findings must keep one row,
  // pick critical, and credit both flaggers.
  const dupRow = manifest.collected.findings.find(
    (f) => f.file === "src/api/auth.ts" && f.line === 12,
  );
  assert.ok(dupRow, "deduped row for auth.ts:12 must exist");
  assert.equal(dupRow.severity, "critical", "dedup must keep the higher severity");
  assert.deepEqual(
    dupRow.flagged_by,
    ["lang-typescript", "sec-jwt-tokens"],
    "dedup must record both specialists as flaggers",
  );

  // Skipped-specialist contract: fw-express's phantom finding must NOT appear.
  const phantom = manifest.collected.findings.find((f) => f.title === "phantom finding");
  assert.equal(phantom, undefined, "skipped specialist findings must be discarded");

  // Critical finding from sec-jwt-tokens flips Gate 6 and the verdict.
  assert.equal(manifest.readiness.verdict, "NO-GO");
  const gate6 = manifest.readiness.gates.find((g) => g.number === 6);
  assert.equal(gate6.status, "FAIL");
});
