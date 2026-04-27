// trim-output-validator.mjs — referential-integrity validator for the
// llm_trim worker's output (Sprint B B8).
//
// JSON-Schema validation only checks the SHAPE of the trim worker's output,
// not the cross-references between fields. The worker can fabricate IDs
// that don't exist in the wiki, files that aren't in the diff, or rescues
// that name leaves the worker just rejected. This module is the
// referential-integrity check the runner invokes BEFORE `fsm-commit`
// (which is where the FSM engine's JSON-Schema validation runs); both
// gates must pass before the trim outputs land in the run env. So the
// effective order is: shape (here, then in fsm-commit) → cross-refs
// (here) → commit. Once `ctxr-dev/fsm#10` (F9 referential-integrity)
// lands, the FSM engine's declarative `referential_integrity:` block
// subsumes this; we migrate to the declarative form and delete the
// bespoke validator.
//
// Six violation classes (the original five from #13 plus a stage-A pair check
// added in round 4 to close a subtle id/path-split fabrication path):
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
//
// The validator is a pure function: same `(outputs, env, opts)` →
// same `{ ok, errors[] }`. It does fs reads to enumerate the wiki when
// `opts.knownLeafIds` isn't supplied, but the result is cached per-process
// so successive validations don't re-walk the tree.
//

import { readdirSync, lstatSync, realpathSync, existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

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
  const base = leafPath.split("/").pop();
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
  // Build an id → normalized-path index for the stage-A pair check (3).
  // Stage-A entries can carry either a wiki-relative path
  // (`lang-typescript.md`) or a repo-relative one (`reviewers.wiki/lang-
  // typescript.md`); normalizeWikiPath collapses both shapes so the
  // comparison doesn't false-positive on a cosmetic prefix difference.
  const stageAPathById = new Map();
  for (const cand of stageACandidates) {
    if (cand && typeof cand.id === "string" && typeof cand.path === "string") {
      stageAPathById.set(cand.id, normalizeWikiPath(cand.path));
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
    const expected = stageAPathById.get(leaf.id);
    const got = normalizeWikiPath(leaf.path);
    if (expected !== undefined && expected !== got) {
      errors.push(
        `picked_leaves[id=${leaf.id}].path "${leaf.path}" does not match stage_a_candidates entry path "${expected}"`,
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

  return { ok: errors.length === 0, errors };
}
