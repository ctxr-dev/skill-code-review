// stage-a-empty.mjs — deterministic implementation of FSM edge state.
//
// Reached when tree-descend produces 0 candidates on a non-trivial diff.
// Routing anomaly: the FSM cannot say GO without any review on a non-trivial
// diff, so we emit CONDITIONAL with degraded_run=true and an explicit
// coverage gap on every changed file.

const GATE_NAMES = [
  "SOLID & Clean Code",
  "Error Handling & Resilience",
  "Code Quality & Type Safety",
  "Test Coverage",
  "Architecture & Design",
  "Security & Safety",
  "Documentation",
  "Domain-specific quality",
];

export default async function stageAEmpty({ env }) {
  const changedPaths = Array.isArray(env.changed_paths) ? env.changed_paths : [];
  return {
    findings: [],
    severity_counts: { critical: 0, important: 0, minor: 0 },
    coverage_matrix: changedPaths.map((file) => ({ file, reviewers: [] })),
    coverage_gaps: [...changedPaths],
    gates: GATE_NAMES.map((name, i) => ({
      number: i + 1,
      name,
      status: "N/A",
      contributing_leaves: [],
      blocker_count: 0,
    })),
    verdict: "CONDITIONAL",
    run_dir_path: null,
    degraded_run: true,
  };
}
