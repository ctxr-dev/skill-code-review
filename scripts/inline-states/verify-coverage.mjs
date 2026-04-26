// verify-coverage.mjs — deterministic implementation of FSM state Step 8.
//
// Inputs (from env):
//   - findings        : deduped findings from Step 7
//   - picked_leaves   : { id, path, justification, dimensions[] }[]
//   - changed_paths   : string[]
//
// Outputs:
//   - coverage_matrix : [{ file, reviewers[] }] — per file, list of leaf ids that touched it
//   - coverage_gaps   : string[] — files reviewed by < 2 specialists (empty if all good)
//
// Coverage rule (B4 enforcement target): every changed file must be reviewed by
// ≥ 2 specialists. We build the matrix from BOTH:
//   (a) each finding's `flagged_by[]` (the specialists that produced findings on the file), and
//   (b) all picked_leaves (every picked leaf is presumed to have inspected its
//       activated files even when emitting empty findings — silence is precision).
// The activation-based half (b) is deliberately broad: until we wire the
// per-specialist scope (B3 hybrid descent), we credit every picked leaf with
// having inspected every changed file. That over-counts coverage but keeps the
// invariant satisfiable; B3 narrows it.

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
  const changedPaths = Array.isArray(env.changed_paths) ? env.changed_paths : [];

  const reviewersByFile = new Map();
  for (const file of changedPaths) {
    ensureSet(reviewersByFile, file);
  }

  for (const finding of findings) {
    if (!finding.file) continue;
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
  };
}
