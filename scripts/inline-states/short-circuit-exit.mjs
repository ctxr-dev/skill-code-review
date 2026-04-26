// short-circuit-exit.mjs — deterministic implementation of FSM edge state.
//
// Reached when risk-tier-triage detects a trivial diff with no risk signal AND
// no scope override. Skips Steps 3-9 entirely; emits empty findings + GO.

export default async function shortCircuitExit() {
  return {
    findings: [],
    severity_counts: { critical: 0, important: 0, minor: 0 },
    coverage_matrix: [],
    coverage_gaps: [],
    gates: Array.from({ length: 8 }, (_, i) => ({
      number: i + 1,
      name: GATE_NAMES[i],
      status: "N/A",
      contributing_leaves: [],
      blocker_count: 0,
    })),
    verdict: "GO",
    run_dir_path: null,
  };
}

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
