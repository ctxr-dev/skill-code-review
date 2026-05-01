// trim-output-validator.mjs — referential-integrity validator for the
// llm_trim worker's output (Sprint B B8).
//
// JSON-Schema validation only checks the SHAPE of the trim worker's output,
// not the cross-references between fields. The worker can fabricate IDs
// that don't exist in the wiki, files that aren't in the diff, or rescues
// that name leaves the worker just rejected. This module performs ONLY
// the cross-reference checks (with minimal type guarding to make the
// individual lookups safe); it deliberately does not duplicate the
// JSON-Schema shape gate.
//
// Runner ordering on --continue: this validator runs first, then
// fsm-commit applies the declarative JSON-Schema gate. So the effective
// order is: cross-refs (here) → schema (fsm-commit) → commit. Both
// gates must pass before the trim outputs land in the run env. If
// either one fires, the run aborts with a structured error.
//
// Once `ctxr-dev/fsm#10` (F9 referential-integrity) lands, the FSM
// engine's declarative `referential_integrity:` block subsumes this;
// we migrate to the declarative form and delete the bespoke validator.
//
// Seven violation classes (the original five from #13 plus a stage-A pair check
// added in round 4 to close a subtle id/path-split fabrication path; class 7
// added by the per-leaf-coverage-gate work to make sure no changed_path
// reaches dispatch_specialists with zero specialists looking at it):
//   1. picked_leaves[*].id        ∈ leaf ids in reviewers.wiki/
//   2. picked_leaves[*].path      resolves to a real wiki file
//   3. picked_leaves[*]           matches a stage_a_candidates entry with the
//                                 same {id, path} pair (a real wiki leaf id is
//                                 not enough — the trim worker is contractually
//                                 picking FROM stage_a_candidates, not from
//                                 the entire wiki).
//   4. rejected_leaves[*].id      ∈ stage_a_candidates ids
//   5. coverage_rescues[*].file   ∈ changed_paths
//   6. coverage_rescues[*].rescued_leaf ∈ rejected_leaves[*].id
//   7. every changed_paths[*]     is matched by ≥1 picked_leaf — either via an
//                                 `activation.file_globs[]` glob OR a leaf with
//                                 no globs (broad credit; specialist receives
//                                 the full diff) OR explicit listing in
//                                 coverage_rescues[*].file. Closes the
//                                 "orphan changed_path reaches dispatch with
//                                 zero specialists" gap surfaced in the
//                                 most recent end-to-end review.
//
// The validator is a pure function: same `(outputs, env, opts)` →
// same `{ ok, errors[] }`. It does fs reads to enumerate the wiki when
// `opts.knownLeafIds` isn't supplied, but the result is cached per-process
// so successive validations don't re-walk the tree.
//

import { readdirSync, lstatSync, realpathSync, existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { splitFrontmatter, extractFileGlobs } from "./leaf-frontmatter.mjs";
import { minimatch } from "./minimatch-shim.mjs";

// Cache keyed by realpath of `<repoRoot>/reviewers.wiki`. A single-process
// run that walks two different repos (tests, multi-repo tooling) gets a
// per-repo cache rather than reusing the first walk's result.
const _wikiIdsCache = new Map();

// This module sits at scripts/lib/trim-output-validator.mjs. Walking up two
// directories lands at the repo root (scripts/lib → scripts → <repo>). Hoist
// the derivation to a named module constant so the path math isn't mistaken
// for "<repo>/scripts" by readers counting `..` segments inline.
const __thisDir = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = resolve(__thisDir, "..", "..");

// Helper: a path is "inside" parent iff `relative(parent, child)` is non-
// empty AND not the parent itself AND doesn't start with `..` AND isn't an
// absolute path. The absolute-path check matters on Windows: cross-drive
// `relative()` can return `D:\...` which neither starts with `..` nor with
// the platform separator. Without isAbsolute the boundary check would
// pass on a symlink that resolves to a different drive.
function isInside(parent, child) {
  const rel = relative(parent, child);
  if (rel === "" || rel.startsWith("..") || rel.startsWith(sep) || isAbsolute(rel)) {
    return false;
  }
  return true;
}

// Enumerate the set of leaf ids under reviewers.wiki/ at runtime. A leaf is
// a `*.md` file (excluding `index.md`) under reviewers.wiki/ whose
// frontmatter declares `id: <name>`. Symlinks must resolve to real paths
// inside the wiki — anything pointing outside is skipped.
export function enumerateWikiLeaves(repoRoot, { useCache = true } = {}) {
  const wikiRoot = resolve(repoRoot, "reviewers.wiki");
  if (!existsSync(wikiRoot)) {
    const empty = { ids: new Set() };
    return empty;
  }
  let realRoot;
  try {
    realRoot = realpathSync(wikiRoot);
  } catch {
    return { ids: new Set() };
  }
  if (useCache && _wikiIdsCache.has(realRoot)) return _wikiIdsCache.get(realRoot);
  const ids = new Set();
  const stack = [realRoot];
  const visited = new Set([realRoot]);
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      if (ent.name.startsWith(".")) continue;
      const full = join(dir, ent.name);
      let lst;
      try {
        lst = lstatSync(full);
      } catch {
        continue;
      }
      let realFull;
      try {
        realFull = realpathSync(full);
      } catch {
        continue;
      }
      if (!isInside(realRoot, realFull)) continue;
      // Determine if `realFull` is a directory we should descend into.
      // Direct directory entry → yes. Symlink that resolves to a
      // directory → yes (already inside-bounds via isInside). Wrap the
      // realFull stat in try/catch so a TOCTOU race (target disappeared
      // / unreadable between existsSync and lstatSync) doesn't crash
      // the validator; treat the entry as not-a-dir and skip.
      let isDescendable = lst.isDirectory();
      if (!isDescendable && lst.isSymbolicLink() && existsSync(realFull)) {
        try {
          isDescendable = lstatSync(realFull).isDirectory();
        } catch {
          isDescendable = false;
        }
      }
      if (isDescendable) {
        if (visited.has(realFull)) continue;
        visited.add(realFull);
        stack.push(realFull);
        continue;
      }
      if (!ent.name.endsWith(".md")) continue;
      if (ent.name === "index.md") continue;
      const id = readLeafId(realFull);
      if (id) ids.add(id);
    }
  }
  const out = { ids };
  if (useCache) _wikiIdsCache.set(realRoot, out);
  return out;
}

function readLeafId(absPath) {
  let text;
  try {
    text = readFileSync(absPath, "utf8");
  } catch {
    return null;
  }
  // The wiki's frontmatter is YAML, but the only field we need is `id:` and
  // it always appears on a single line at the top. Avoid pulling in a YAML
  // parser for one field.
  const fmEnd = text.indexOf("\n---", 4);
  const fm = fmEnd > 0 ? text.slice(4, fmEnd) : text;
  const m = fm.match(/^id:\s*([A-Za-z0-9][A-Za-z0-9_-]*)\s*$/m);
  return m ? m[1] : null;
}

// Collapse the two wiki path shapes the corpus uses (`lang-typescript.md`
// vs `reviewers.wiki/lang-typescript.md`) to a single canonical
// wiki-relative form so id↔path equality across stage_a_candidates and
// picked_leaves doesn't false-positive on a cosmetic prefix.
function normalizeWikiPath(p) {
  if (typeof p !== "string") return p;
  let out = p.replace(/^\.\/+/, "");
  if (out.startsWith("reviewers.wiki/")) out = out.slice("reviewers.wiki/".length);
  return out;
}

// Read a single leaf's `activation.file_globs[]` from disk. Returns:
//   - { found: true, globs: [...] }  when extractFileGlobs found a populated
//                                    activation.file_globs[] block.
//   - { found: true, globs: [] }     when extractFileGlobs returned [] —
//                                    EITHER the leaf has no activation block
//                                    at all, OR it has activation but no
//                                    file_globs sub-block, OR the sub-block
//                                    is explicitly empty. extractFileGlobs
//                                    deliberately collapses these three
//                                    cases (see leaf-frontmatter.mjs); the
//                                    coverage-gate semantics are identical
//                                    for all three (broad credit).
//   - { found: false }               when the leaf is unreadable / missing /
//                                    has no frontmatter fences at all.
//
// The {found, globs} shape lets callers distinguish "this leaf has empty
// globs (broad credit)" from "we couldn't read this leaf at all". For the
// pre-dispatch coverage gate, an unreadable leaf doesn't help cover any
// file (we can't reason about what it would see), so it's treated as
// no-credit. An empty-globs leaf — whatever the underlying authoring
// shape — gets broad credit, because its specialist receives the full
// diff per scripts/run-review.mjs:computeFilteredDiff.
//
// Cached per-process keyed by realpath of the wiki leaf to avoid repeat
// frontmatter reads when the same trim output is validated multiple times
// in one run (e.g., dry-run + commit).
const _leafGlobsCache = new Map();
function readLeafFileGlobs(repoRoot, leafPath) {
  if (typeof leafPath !== "string" || leafPath.length === 0) return { found: false };
  if (!leafPath.endsWith(".md")) return { found: false };
  const base = leafPath.split(/[/\\]+/).pop();
  if (!base || base === "index.md" || base.startsWith(".")) return { found: false };
  const wikiRoot = resolve(repoRoot, "reviewers.wiki");
  let realWiki;
  try {
    realWiki = realpathSync(wikiRoot);
  } catch {
    return { found: false };
  }
  let real = null;
  for (const candidate of [resolve(wikiRoot, leafPath), resolve(repoRoot, leafPath)]) {
    if (!existsSync(candidate)) continue;
    let r;
    try {
      r = realpathSync(candidate);
    } catch {
      continue;
    }
    if (!isInside(realWiki, r)) continue;
    real = r;
    break;
  }
  if (real === null) return { found: false };
  if (_leafGlobsCache.has(real)) return _leafGlobsCache.get(real);
  let text;
  try {
    text = readFileSync(real, "utf8");
  } catch {
    const result = { found: false };
    _leafGlobsCache.set(real, result);
    return result;
  }
  const parsed = splitFrontmatter(text);
  if (!parsed) {
    const result = { found: false };
    _leafGlobsCache.set(real, result);
    return result;
  }
  const globs = extractFileGlobs(parsed.frontmatter);
  const result = { found: true, globs };
  _leafGlobsCache.set(real, result);
  return result;
}

function looksLikeTrimOutput(outputs) {
  return (
    outputs &&
    typeof outputs === "object" &&
    !Array.isArray(outputs) &&
    Array.isArray(outputs.picked_leaves)
  );
}

// Resolve a wiki-relative leaf path against the wikiRoot. Mirrors
// verify-coverage's readLeafGlobs path resolution: try wiki-relative first
// then repo-relative; reject anything that escapes via realpath. Uses the
// shared isInside() helper so the Windows cross-drive case (where
// path.relative() returns an absolute path) gets rejected.
//
// "Leaf" means a wiki *leaf* markdown file. The file extension must be
// `.md`, the basename cannot be `index.md` (that's a cluster summary,
// not a leaf), and the basename can't begin with a dot (no
// `.gitignore` / metadata). Without these the picked path could
// resolve to a real-but-non-leaf file and pass class 2 even though the
// trim worker fabricated the path.
function leafPathExists(repoRoot, leafPath) {
  if (typeof leafPath !== "string" || leafPath.length === 0) return false;
  if (!leafPath.endsWith(".md")) return false;
  // Split on both POSIX `/` and Windows `\` so `cluster-a\index.md`
  // (a worker output created on Windows) still gets caught by the
  // leaf-only check. Without this, a worker on Windows could submit
  // `cluster-a\index.md` and bypass the index.md/dotfile guards.
  const base = leafPath.split(/[/\\]+/).pop();
  if (!base || base === "index.md" || base.startsWith(".")) return false;
  const wikiRoot = resolve(repoRoot, "reviewers.wiki");
  let realWiki;
  try {
    realWiki = realpathSync(wikiRoot);
  } catch {
    return false;
  }
  for (const candidate of [resolve(wikiRoot, leafPath), resolve(repoRoot, leafPath)]) {
    if (!existsSync(candidate)) continue;
    let real;
    try {
      real = realpathSync(candidate);
    } catch {
      continue;
    }
    if (!isInside(realWiki, real)) continue;
    // Same TOCTOU guard as enumerateWikiLeaves: if the entry vanished
    // between existsSync and lstatSync, treat as not-a-file and skip.
    try {
      if (lstatSync(real).isFile()) return true;
    } catch {
      // ignore — try next candidate
    }
  }
  return false;
}

export function validateTrimOutput(outputs, env, opts = {}) {
  if (!looksLikeTrimOutput(outputs)) {
    // Not a trim output — nothing to validate. Caller should only invoke
    // this when the output actually came from llm_trim.
    return { ok: true, errors: [] };
  }
  const errors = [];
  const repoRoot = opts.repoRoot ?? DEFAULT_REPO_ROOT;
  const { ids: wikiIds } = opts.knownLeafIds
    ? { ids: new Set(opts.knownLeafIds) }
    : enumerateWikiLeaves(repoRoot);

  const pickedLeaves = Array.isArray(outputs.picked_leaves) ? outputs.picked_leaves : [];
  const rejectedLeaves = Array.isArray(outputs.rejected_leaves) ? outputs.rejected_leaves : [];
  const coverageRescues = Array.isArray(outputs.coverage_rescues) ? outputs.coverage_rescues : [];
  const stageACandidates = Array.isArray(env?.stage_a_candidates) ? env.stage_a_candidates : [];
  const stageACandidateIds = new Set(
    stageACandidates.map((c) => c?.id).filter((id) => typeof id === "string"),
  );
  // Build a Set of normalized {id, path} pairs for the stage-A pair check
  // (3). The schema doesn't guarantee unique stage-A ids — Stage-A is a
  // list, not a map — so a Map keyed only by id would be order-dependent
  // (the last write wins) and could mis-match a picked leaf against the
  // wrong path. Use a Set of `<id>\u001f<normalized-path>` tokens so any
  // declared {id, path} pair from stage-A satisfies the check.
  // normalizeWikiPath collapses the two corpus shapes (wiki-relative
  // `lang-typescript.md` vs repo-relative `reviewers.wiki/lang-typescript.md`)
  // so a cosmetic prefix doesn't false-positive.
  const stageAPairs = new Set();
  const stageAPathsById = new Map(); // id → array of normalized paths, for diagnostics only
  for (const cand of stageACandidates) {
    if (cand && typeof cand.id === "string" && typeof cand.path === "string") {
      const np = normalizeWikiPath(cand.path);
      stageAPairs.add(`${cand.id}\u001f${np}`);
      const arr = stageAPathsById.get(cand.id) ?? [];
      if (!arr.includes(np)) arr.push(np);
      stageAPathsById.set(cand.id, arr);
    }
  }
  const rejectedIds = new Set(
    rejectedLeaves.map((r) => r?.id).filter((id) => typeof id === "string"),
  );
  const changedPaths = new Set(
    Array.isArray(env?.changed_paths) ? env.changed_paths : [],
  );

  // (1) picked_leaves[*].id ∈ wiki leaf ids
  for (const leaf of pickedLeaves) {
    if (!leaf || typeof leaf.id !== "string") {
      errors.push("picked_leaf missing string `id`");
      continue;
    }
    if (!wikiIds.has(leaf.id)) {
      errors.push(`picked_leaves[].id "${leaf.id}" is not a leaf in reviewers.wiki/`);
    }
  }

  // (2) picked_leaves[*].path resolves to a real wiki file
  for (const leaf of pickedLeaves) {
    if (!leaf || typeof leaf.path !== "string") {
      errors.push(`picked_leaves[id=${leaf?.id ?? "?"}].path missing or not a string`);
      continue;
    }
    if (!leafPathExists(repoRoot, leaf.path)) {
      errors.push(`picked_leaves[id=${leaf.id ?? "?"}].path "${leaf.path}" does not resolve to a real wiki file`);
    }
  }

  // (3) picked_leaves[*] must match a stage_a_candidates entry with the
  //     SAME {id, path} pair. The trim worker's contract is "select from
  //     stage_a_candidates", not "select from the entire wiki". Without
  //     this check a worker could fabricate an {id: real-leaf, path:
  //     different-real-leaf} pair where both halves pass (1) and (2)
  //     individually, but coverage scoping (which reads activation from
  //     `path`) and specialist dispatch (keyed by `id`) would diverge.
  for (const leaf of pickedLeaves) {
    if (!leaf || typeof leaf.id !== "string" || typeof leaf.path !== "string") {
      // Already flagged by (1) / (2); avoid double-reporting.
      continue;
    }
    if (!stageACandidateIds.has(leaf.id)) {
      errors.push(
        `picked_leaves[id=${leaf.id}] is not in stage_a_candidates (worker must pick from candidates, not the full wiki)`,
      );
      continue;
    }
    const got = normalizeWikiPath(leaf.path);
    if (!stageAPairs.has(`${leaf.id}\u001f${got}`)) {
      const declared = stageAPathsById.get(leaf.id) ?? [];
      errors.push(
        `picked_leaves[id=${leaf.id}].path "${leaf.path}" does not match any stage_a_candidates entry path for that id ` +
          `(declared: [${declared.map((p) => `"${p}"`).join(", ")}])`,
      );
    }
  }

  // (4) rejected_leaves[*].id ∈ stage_a_candidates ids
  for (const leaf of rejectedLeaves) {
    if (!leaf || typeof leaf.id !== "string") {
      errors.push("rejected_leaf missing string `id`");
      continue;
    }
    if (!stageACandidateIds.has(leaf.id)) {
      errors.push(`rejected_leaves[].id "${leaf.id}" is not in stage_a_candidates`);
    }
  }

  // (5) coverage_rescues[*].file ∈ changed_paths
  for (const rescue of coverageRescues) {
    if (!rescue || typeof rescue.file !== "string") {
      errors.push("coverage_rescue missing string `file`");
      continue;
    }
    if (!changedPaths.has(rescue.file)) {
      errors.push(`coverage_rescues[].file "${rescue.file}" is not in changed_paths`);
    }
  }

  // (6) coverage_rescues[*].rescued_leaf ∈ rejected_leaves[*].id
  for (const rescue of coverageRescues) {
    if (!rescue || typeof rescue.rescued_leaf !== "string") {
      errors.push("coverage_rescue missing string `rescued_leaf`");
      continue;
    }
    if (!rejectedIds.has(rescue.rescued_leaf)) {
      errors.push(
        `coverage_rescues[].rescued_leaf "${rescue.rescued_leaf}" is not in rejected_leaves`,
      );
    }
  }

  // (7) Every changed_paths[*] is matched by ≥1 picked_leaf glob OR appears
  //     in coverage_rescues[*].file. A leaf with no globs (broad credit)
  //     covers everything because its specialist receives the full diff
  //     per scripts/run-review.mjs:computeFilteredDiff. A leaf whose
  //     frontmatter is unreadable does NOT count — we can't reason about
  //     what its specialist would see, so treat as no-credit.
  //
  //     This closes the orphan-changed-path gap: under the previous five
  //     checks, the trim worker could pick K leaves whose globs covered
  //     only a subset of changed_paths and still pass validation. The
  //     missed file would never appear in any specialist's filtered
  //     diff; verify_coverage's post-dispatch check would surface it as
  //     a coverage gap, but only after specialist tokens were spent.
  //     Here we fail the trim output BEFORE dispatch.
  const rescuedFiles = new Set(
    coverageRescues
      .map((r) => (r && typeof r.file === "string" ? r.file : null))
      .filter((f) => f !== null),
  );
  // Build the broad-credit short-circuit ONCE: if any picked_leaf has
  // empty globs (or a found-but-no-globs frontmatter), every changed_path
  // is automatically covered and we skip the per-file loop entirely.
  // This keeps the common case (one broad-purpose leaf among the picks)
  // O(K) rather than O(K × len(changed_paths) × avg_globs_per_leaf).
  let hasBroadCreditLeaf = false;
  const leafGlobsByPath = new Map(); // leaf.path → string[] of globs
  for (const leaf of pickedLeaves) {
    if (!leaf || typeof leaf.path !== "string") continue;
    const result = readLeafFileGlobs(repoRoot, leaf.path);
    if (!result.found) continue; // unreadable: no credit
    if (result.globs.length === 0) {
      hasBroadCreditLeaf = true;
      break;
    }
    leafGlobsByPath.set(leaf.path, result.globs);
  }
  if (!hasBroadCreditLeaf) {
    const orphanFiles = [];
    for (const file of (Array.isArray(env?.changed_paths) ? env.changed_paths : [])) {
      if (rescuedFiles.has(file)) continue;
      let covered = false;
      for (const globs of leafGlobsByPath.values()) {
        for (const glob of globs) {
          if (minimatch(file, glob)) {
            covered = true;
            break;
          }
        }
        if (covered) break;
      }
      if (!covered) orphanFiles.push(file);
    }
    if (orphanFiles.length > 0) {
      errors.push(
        `changed_paths not covered by any picked_leaf glob and not rescued: ` +
          orphanFiles.map((f) => `"${f}"`).join(", ") +
          ` — add a coverage_rescue for each, or pick a leaf whose activation.file_globs[] matches.`,
      );
    }
  }

  return { ok: errors.length === 0, errors };
}
