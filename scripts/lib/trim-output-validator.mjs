// trim-output-validator.mjs — referential-integrity validator for the
// llm_trim worker's output (Sprint B B8).
//
// JSON-Schema validation only checks the SHAPE of the trim worker's output,
// not the cross-references between fields. The worker can fabricate IDs
// that don't exist in the wiki, files that aren't in the diff, or rescues
// that name leaves the worker just rejected. This module is the
// referential-integrity check that runs after schema validation, before
// the trim output is committed to the run env.
//
// Five violation classes:
//   1. picked_leaves[*].id        ∈ leaf ids in reviewers.wiki/
//   2. picked_leaves[*].path      resolves to a real wiki file
//   3. rejected_leaves[*].id      ∈ stage_a_candidates ids
//   4. coverage_rescues[*].file   ∈ changed_paths
//   5. coverage_rescues[*].rescued_leaf ∈ rejected_leaves[*].id
//
// The validator is a pure function: same `(outputs, env, opts)` →
// same `{ ok, errors[] }`. It does fs reads to enumerate the wiki when
// `opts.knownLeafIds` isn't supplied, but the result is cached per-process
// so successive validations don't re-walk the tree.
//
// Once `ctxr-dev/fsm#10` (F9 referential-integrity) lands, the FSM engine's
// declarative `referential_integrity:` schema block subsumes this; we
// migrate to the declarative form and delete the bespoke validator.

import { readdirSync, lstatSync, realpathSync, existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

// Cache keyed by realpath of `<repoRoot>/reviewers.wiki`. A single-process
// run that walks two different repos (tests, multi-repo tooling) gets a
// per-repo cache rather than reusing the first walk's result.
const _wikiIdsCache = new Map();

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
      if (
        lst.isDirectory() ||
        (lst.isSymbolicLink() && existsSync(realFull) && lstatSync(realFull).isDirectory())
      ) {
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
function leafPathExists(repoRoot, leafPath) {
  if (typeof leafPath !== "string" || leafPath.length === 0) return false;
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
    if (lstatSync(real).isFile()) return true;
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
  const repoRoot =
    opts.repoRoot ?? resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const { ids: wikiIds } = opts.knownLeafIds
    ? { ids: new Set(opts.knownLeafIds) }
    : enumerateWikiLeaves(repoRoot);

  const pickedLeaves = Array.isArray(outputs.picked_leaves) ? outputs.picked_leaves : [];
  const rejectedLeaves = Array.isArray(outputs.rejected_leaves) ? outputs.rejected_leaves : [];
  const coverageRescues = Array.isArray(outputs.coverage_rescues) ? outputs.coverage_rescues : [];
  const stageACandidateIds = new Set(
    (Array.isArray(env?.stage_a_candidates) ? env.stage_a_candidates : [])
      .map((c) => c?.id)
      .filter((id) => typeof id === "string"),
  );
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
      errors.push(`picked_leaves[id=${leaf.id}].path "${leaf.path}" does not resolve to a real wiki file`);
    }
  }

  // (3) rejected_leaves[*].id ∈ stage_a_candidates ids
  for (const leaf of rejectedLeaves) {
    if (!leaf || typeof leaf.id !== "string") {
      errors.push("rejected_leaf missing string `id`");
      continue;
    }
    if (!stageACandidateIds.has(leaf.id)) {
      errors.push(`rejected_leaves[].id "${leaf.id}" is not in stage_a_candidates`);
    }
  }

  // (4) coverage_rescues[*].file ∈ changed_paths
  for (const rescue of coverageRescues) {
    if (!rescue || typeof rescue.file !== "string") {
      errors.push("coverage_rescue missing string `file`");
      continue;
    }
    if (!changedPaths.has(rescue.file)) {
      errors.push(`coverage_rescues[].file "${rescue.file}" is not in changed_paths`);
    }
  }

  // (5) coverage_rescues[*].rescued_leaf ∈ rejected_leaves[*].id
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
