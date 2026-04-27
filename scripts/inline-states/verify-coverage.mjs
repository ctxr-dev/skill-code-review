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
//   (b) picked_leaves narrowed by their on-disk `activation.file_globs[]`
//       (read from the leaf's frontmatter via leaf.path). Leaves with no
//       activation block on disk fall back to broad credit. Silence is
//       precision — a leaf with matching globs that emitted no findings
//       is still a reviewer for those files.
//   (c) coverage_rescues — each rescue maps a file → leaf that was promoted
//       precisely to lift that file's coverage.

import { readFileSync, existsSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { minimatch } from "../lib/minimatch-shim.mjs";

// Read a leaf's `activation.file_globs` from its on-disk frontmatter.
// Returns an array of strings (possibly empty) when the leaf has globs,
// or `null` when the file isn't present / doesn't carry an activation
// block (caller should fall back to broad credit).
//
// Cached per-process: the wiki is small (≤ 1k leaves) and verify-coverage
// runs once per review, so a Map keyed by absolute path keeps repeat
// lookups O(1).
const _leafGlobsCache = new Map();
function readLeafGlobs(repoRoot, leafPath) {
  if (typeof leafPath !== "string" || leafPath.length === 0) return null;
  // Resolve against repo root; reject anything that escapes the wiki. Use
  // path.relative + a `..`/absolute check rather than `abs.startsWith(wikiRoot)`
  // — the prefix check would accept `reviewers.wiki-malicious/...` because
  // it shares the leading string with `reviewers.wiki`.
  const wikiRoot = resolve(repoRoot, "reviewers.wiki");
  const abs = resolve(repoRoot, leafPath);
  const rel = relative(wikiRoot, abs);
  if (rel.startsWith("..") || rel.startsWith(sep) || rel === "") return null;
  if (_leafGlobsCache.has(abs)) return _leafGlobsCache.get(abs);
  if (!existsSync(abs)) {
    _leafGlobsCache.set(abs, null);
    return null;
  }
  let text;
  try {
    text = readFileSync(abs, "utf8");
  } catch {
    _leafGlobsCache.set(abs, null);
    return null;
  }
  // Tiny YAML-ish frontmatter parser scoped to the activation.file_globs[]
  // sub-block. Avoids pulling in a YAML dep at runtime; the corpus uses a
  // single canonical layout. If the leaf doesn't carry an activation block
  // we return null (broad credit). Bullet items can be quoted or bare;
  // strip surrounding quotes.
  const fmEnd = text.indexOf("\n---", 4);
  const fm = fmEnd > 0 ? text.slice(4, fmEnd) : text;
  const activationIdx = fm.search(/\n?activation:\s*$/m);
  if (activationIdx === -1) {
    _leafGlobsCache.set(abs, null);
    return null;
  }
  const tail = fm.slice(activationIdx);
  const fileGlobsMatch = tail.match(/\n  file_globs:\s*\n((?: {4}[^\n]+\n?)+)/);
  if (!fileGlobsMatch) {
    _leafGlobsCache.set(abs, []);
    return [];
  }
  const globs = fileGlobsMatch[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim().replace(/^["']|["']$/g, ""));
  _leafGlobsCache.set(abs, globs);
  return globs;
}

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

  // Source (b): per-leaf scope-narrowed credit. The FSM schema for
  // `picked_leaves` (Step 4 / llm_trim) carries `path` (a relative
  // reference under reviewers.wiki/), so we read each leaf's frontmatter
  // off disk and use its `activation.file_globs[]` to narrow which
  // changed files the leaf actually covers. Leaves whose frontmatter has
  // no activation block, or whose file isn't present, fall back to broad
  // credit — same default as before.
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(__dirname, "..", "..");
  for (const leaf of pickedLeaves) {
    if (!leaf.id) continue;
    const globs = readLeafGlobs(repoRoot, leaf.path);
    if (globs === null || globs.length === 0) {
      // No activation block on disk → broad credit. Silence is precision.
      for (const file of changedPaths) ensureSet(reviewersByFile, file).add(leaf.id);
      continue;
    }
    // Narrow: only files matching one of the leaf's globs.
    for (const file of changedPaths) {
      for (const g of globs) {
        if (typeof g === "string" && minimatch(file, g)) {
          ensureSet(reviewersByFile, file).add(leaf.id);
          break;
        }
      }
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
