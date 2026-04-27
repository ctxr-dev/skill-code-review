// synthesize-release-readiness.mjs — deterministic implementation of FSM state Step 9.
//
// Verdict-affecting inputs (from env):
//   - findings               : deduped findings from Step 7 (each carries `flagged_by[]`)
//   - picked_leaves          : { id, path, justification, dimensions[] }[]
//   - coverage_rule_violated : boolean (from Step 8 — degrades verdict to NO-GO when true,
//                              per B4 hard enforcement)
//
// (`coverage_gaps` from Step 8 is read upstream by `write-run-directory` for the
// report payload only; this state does not consult it. The engine-enforced
// signal is `coverage_rule_violated`.)
//
// Outputs:
//   - gates   : 8 entries each shaped { number, name, status, contributing_leaves[], blocker_count }
//   - verdict : "GO" | "CONDITIONAL" | "NO-GO"
//
// Predicates per code-reviewer.md Step 9 / release-readiness.md, bound to leaf
// frontmatter (`dimensions[]` and inferred tags from leaf id). Tags are not in
// the env today (the trim worker emits dimensions per pick but not tags); we
// approximate tags by the leaf-id prefix vocabulary used in the corpus
// (sec-, perf-, lang-, fw-, obs-, domain-, cli-, api-, antipattern-, …) plus
// any keyword in the leaf id that matches a tag-set member exactly.
//
// Gate verdict rule:
//   - PASS if every contributing leaf produced no Critical or Important finding.
//   - FAIL if any contributing leaf produced a Critical or Important finding.
//   - N/A  if no picked leaf satisfies the predicate.

const GATE_DEFINITIONS = [
  {
    number: 1,
    name: "SOLID & Clean Code",
    matches: (leaf, tagsLike) =>
      leaf.dimensions?.includes("readability") ||
      tagsLike.some((t) => ["solid", "dry", "kiss", "yagni", "clean-code", "naming", "complexity"].includes(t)),
  },
  {
    number: 2,
    name: "Error Handling & Resilience",
    matches: (leaf, tagsLike) =>
      leaf.dimensions?.includes("correctness") &&
      tagsLike.some((t) => ["error-handling", "resilience", "fault-tolerance", "retry", "circuit-breaker", "concurrency", "async"].includes(t)),
  },
  {
    number: 3,
    name: "Code Quality & Type Safety",
    matches: (leaf, tagsLike) =>
      leaf.dimensions?.includes("correctness") ||
      tagsLike.some((t) => ["type-safety", "idioms", "dead-code", "language-quality", "initialization", "startup", "shutdown"].includes(t)),
  },
  {
    number: 4,
    name: "Test Coverage",
    matches: (leaf) => leaf.dimensions?.includes("tests"),
  },
  {
    number: 5,
    name: "Architecture & Design",
    matches: (leaf, tagsLike) =>
      leaf.dimensions?.some((d) => ["architecture", "performance"].includes(d)) ||
      tagsLike.some((t) => ["api-design", "module-boundaries", "dependencies", "layering", "ddd", "microservices"].includes(t)),
  },
  {
    number: 6,
    name: "Security & Safety",
    matches: (leaf, tagsLike) =>
      leaf.dimensions?.includes("security") ||
      tagsLike.some((t) => ["hooks-safety", "supply-chain", "dependencies-security"].includes(t)),
  },
  {
    number: 7,
    name: "Documentation",
    matches: (leaf) => leaf.dimensions?.includes("documentation"),
  },
  {
    number: 8,
    name: "Domain-specific quality",
    matches: (leaf, tagsLike) =>
      tagsLike.some((t) => ["cli", "api", "observability"].includes(t)) ||
      tagsLike.some((t) => t.startsWith("domain-")) ||
      ["domain-", "obs-", "cli-", "api-"].some((p) => leaf.id?.startsWith(p)),
  },
];

function tagsLikeFromLeaf(leaf) {
  if (!leaf?.id) return [];
  // Real `tags[]` aren't in the env yet (the trim worker passes per-pick
  // dimensions but not tags); approximate by hashing the leaf id into a
  // bag of tokens. We need to cover both single-token tags ("solid", "cli")
  // AND hyphenated multi-word tags ("error-handling", "type-safety",
  // "api-design"). Emit:
  //   - the full leaf id verbatim (catches some leaf-id == tag matches),
  //   - each `-`-delimited segment (single-word matches),
  //   - every contiguous 2-, 3-, and 4-segment slide (multi-word matches).
  // Order doesn't matter for the predicate `.includes(t)` checks below.
  const tags = new Set();
  tags.add(leaf.id);
  const segments = leaf.id.split("-");
  for (let i = 0; i < segments.length; i++) {
    tags.add(segments[i]);
    for (let n = 2; n <= 4 && i + n <= segments.length; n++) {
      tags.add(segments.slice(i, i + n).join("-"));
    }
  }
  return [...tags];
}

function leafProducedBlockers(leafId, blockingFlaggedBy) {
  return blockingFlaggedBy.has(leafId);
}

export default async function synthesizeReleaseReadiness({ env }) {
  const findings = Array.isArray(env.findings) ? env.findings : [];
  const pickedLeaves = Array.isArray(env.picked_leaves) ? env.picked_leaves : [];

  const blockingFlaggedBy = new Set();
  for (const f of findings) {
    if (f.severity === "critical" || f.severity === "important") {
      for (const leafId of f.flagged_by ?? []) {
        blockingFlaggedBy.add(leafId);
      }
    }
  }

  const gates = GATE_DEFINITIONS.map((def) => {
    const contributing = pickedLeaves.filter((leaf) => {
      const tagsLike = tagsLikeFromLeaf(leaf);
      try {
        return def.matches(leaf, tagsLike);
      } catch {
        return false;
      }
    });
    if (contributing.length === 0) {
      return {
        number: def.number,
        name: def.name,
        status: "N/A",
        contributing_leaves: [],
        blocker_count: 0,
      };
    }
    const blockerCount = contributing.filter((leaf) =>
      leafProducedBlockers(leaf.id, blockingFlaggedBy),
    ).length;
    return {
      number: def.number,
      name: def.name,
      status: blockerCount === 0 ? "PASS" : "FAIL",
      contributing_leaves: contributing.map((leaf) => leaf.id).sort(),
      blocker_count: blockerCount,
    };
  });

  const anyFail = gates.some((g) => g.status === "FAIL");
  const coverageRuleViolated = Boolean(env.coverage_rule_violated);

  // B4 hard enforcement: coverage rule violation is a NO-GO by default. The
  // soft-mode downgrade (CONDITIONAL instead) lands when @ctxr/fsm#4 ships
  // run modes; until then we fail-closed because the alternative is silently
  // shipping reviews where files weren't double-covered. CONDITIONAL on the
  // happy path is reserved for the `stage_a_empty` edge state (no candidates
  // produced at all on a non-trivial diff).
  const verdict = anyFail || coverageRuleViolated ? "NO-GO" : "GO";

  return { gates, verdict };
}
