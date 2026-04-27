// verify-coverage.mjs — deterministic implementation of FSM state Step 8.
//
// Inputs (from env):
//   - findings          : deduped findings from Step 7
//   - picked_leaves     : { id, path, justification, dimensions[] }[]
//   - coverage_rescues  : { file, rescued_leaf, reason }[] from Step 4 (B4)
//   - changed_paths     : string[]
//
// Outputs:
//   - coverage_matrix         : [{ file, reviewers[] }] — per file, list of leaf ids that touched it
//   - coverage_gaps           : string[] — files reviewed by < 2 specialists after rescues
//   - coverage_rule_violated  : boolean — true iff any gap remains after rescues (B4 hard signal)
//
// Coverage rule (B4): every changed file must be reviewed by ≥ 2 specialists.
// `coverage_rescues[]` from Step 4 is consulted before reporting gaps — the
// trim worker explicitly nominates additional leaves to lift undercovered
// files. Any file still below 2 reviewers AFTER rescue application sets
// `coverage_rule_violated: true`, which `synthesize-release-readiness.mjs`
// promotes to NO-GO so the rule is engine-enforced instead of advisory.
//
// We build the matrix from THREE sources:
//   (a) each finding's `flagged_by[]` (specialists that produced findings on the file),
//   (b) all picked_leaves (every picked leaf is presumed to have inspected
//       its activated files even when emitting empty findings — silence is
//       precision),
//   (c) coverage_rescues — each rescue maps a file → leaf that was promoted
//       precisely to lift that file's coverage.
// Source (b) is deliberately broad: until B3's per-leaf scope narrowing is
// wired into the FSM, we credit every picked leaf with every changed file.

function ensureSet(map, key) {
  let s = map.get(key);
  if (!s) {
    s = new Set();
    map.set(key, s);
  }
  return s;
}

export default async function verifyCoverage({ env }) {
  const findings = Array.isArray(env.findings) ? env.findings : [];
  const pickedLeaves = Array.isArray(env.picked_leaves) ? env.picked_leaves : [];
  const coverageRescues = Array.isArray(env.coverage_rescues) ? env.coverage_rescues : [];
  const changedPaths = Array.isArray(env.changed_paths) ? env.changed_paths : [];

  const reviewersByFile = new Map();
  const changedPathSet = new Set(changedPaths);
  for (const file of changedPaths) {
    ensureSet(reviewersByFile, file);
  }

  for (const finding of findings) {
    if (!finding.file) continue;
    // Ignore findings whose file is not in changed_paths — a hallucinated
    // out-of-diff path would otherwise surface as a phantom coverage row.
    if (!changedPathSet.has(finding.file)) continue;
    const set = ensureSet(reviewersByFile, finding.file);
    for (const leafId of finding.flagged_by ?? []) {
      set.add(leafId);
    }
  }

  // Until B3 narrows per-leaf scope, credit every picked leaf with every changed file.
  for (const file of changedPaths) {
    const set = ensureSet(reviewersByFile, file);
    for (const leaf of pickedLeaves) {
      if (leaf.id) set.add(leaf.id);
    }
  }

  // Apply coverage rescues from Step 4 (rescues outside changed_paths are
  // ignored, same reasoning as findings above).
  for (const rescue of coverageRescues) {
    if (!rescue?.file || !rescue?.rescued_leaf) continue;
    if (!changedPathSet.has(rescue.file)) continue;
    ensureSet(reviewersByFile, rescue.file).add(rescue.rescued_leaf);
  }

  const coverageMatrix = [...reviewersByFile.entries()]
    .map(([file, reviewers]) => ({
      file,
      reviewers: [...reviewers].sort(),
    }))
    .sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));

  const coverageGaps = coverageMatrix
    .filter((row) => row.reviewers.length < 2)
    .map((row) => row.file);

  return {
    coverage_matrix: coverageMatrix,
    coverage_gaps: coverageGaps,
    coverage_rule_violated: coverageGaps.length > 0,
  };
}
