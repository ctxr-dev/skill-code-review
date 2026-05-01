// activate-leaves.mjs — deterministic activation-gate evaluation as an
// FSM inline state. Implements PR C of the audit in #70 (B6 reframe of
// the tree_descend worker).
//
// Before this state existed, the activation-gate was evaluated INSIDE the
// tree-descender worker (sub-agent), per the prompt at
// fsm/workers/tree-descender.md. The orchestrator could not verify the
// gate actually ran — the activation_match values in the worker's output
// could be LLM-eyeballed instead of computed. This handler runs the gate
// in the runner's process where activation evaluation is deterministic
// and visible in the FSM trace.
//
// Inputs (from env):
//   - project_profile : Step 1 output
//   - changed_paths   : Step 1 output
//   - args            : the orchestrator's arg bag (for base/head SHAs)
//
// Outputs:
//   - activated_leaves : Array<{ id, path, activation_match: string[] }>
//                        where activation_match ⊆ { file_globs, keyword_matches,
//                        structural_signals, escalation_from }, sorted by id.
//
// The downstream tree_descend worker consumes activated_leaves[] as its
// candidate set and only does focus-string semantic descent to filter.
// The boolean activation logic is no longer the worker's responsibility.

import { readdirSync, lstatSync, realpathSync, existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import matter from "gray-matter";

import { evaluateActivation } from "../lib/activation-gate.mjs";

const __thisDir = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__thisDir, "..", "..");

// Cache: avoid re-walking the wiki on repeat invocations within one
// process (tests, multi-run harnesses). Keyed by realpath of the wiki
// root so a different repo gets its own cache.
const _leavesCache = new Map();

function isInside(parent, child) {
  const rel = relative(parent, child);
  return rel !== "" && !rel.startsWith("..") && !rel.startsWith(sep) && !rel.includes(":");
}

// V2 frontmatter fields the trim worker would otherwise have to Read
// per candidate leaf. PR for #87: pre-extract these alongside
// `activation` and ship them in activated_leaves[*]. The list is
// scoped to the fields the downstream FSM and the trim prompt
// actually consume; consumer-specific authored fields beyond this set
// are NOT forwarded here (kept inside the leaf body / dispatch
// specialist prompt) to keep the activate_leaves brief small.
const V2_FIELDS = ["focus", "dimensions", "audit_surface", "languages", "tools", "tags", "covers", "type"];

// Per-field type contracts (mirrors the wiki-leaf shape declared in
// fsm/code-reviewer.fsm.yaml's stage_a_candidates response_schema and
// scripts/lib/reviewer-schema.mjs's reviewer-source validators).
// Malformed values are dropped silently rather than propagated — the
// trim worker would otherwise see weird shapes and the FSM's
// response_schema would fault post-hoc on a corpus typo. Empty arrays
// generally pass (author intent: `tools: []` means "this leaf opts
// out of tool discovery") — the exception is `languages`, where an
// empty array is meaningless (the documented values are "all" OR a
// non-empty list) and is dropped to match the wiki-leaf contract.
function isStringArray(v) {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}
// Tool entries (per docs/SCHEMA.md) carry at least `name` (string) and
// `purpose` (string); `command` is optional. When `command` is present
// it must be a string. The validator drops any tool entry missing the
// two required string fields OR carrying a non-string command.
function isToolArray(v) {
  if (!Array.isArray(v)) return false;
  return v.every(
    (t) => t !== null && typeof t === "object" && !Array.isArray(t) &&
      typeof t.name === "string" && t.name.length > 0 &&
      typeof t.purpose === "string" && t.purpose.length > 0 &&
      (t.command === undefined || typeof t.command === "string"),
  );
}
function validateV2Field(field, value) {
  switch (field) {
    case "focus":
    case "type":
      return typeof value === "string" ? value : undefined;
    case "dimensions":
    case "audit_surface":
    case "tags":
    case "covers":
      return isStringArray(value) ? value : undefined;
    case "tools":
      return isToolArray(value) ? value : undefined;
    case "languages":
      // Per docs/SCHEMA.md: either the literal string "all" or a
      // non-empty array of language identifiers. Empty arrays are
      // dropped (they don't model any author intent: they're either
      // a typo or the result of a half-finished migration).
      if (value === "all") return value;
      if (isStringArray(value) && value.length > 0) return value;
      return undefined;
    default:
      return undefined;
  }
}

function projectV2Fields(data) {
  if (!data || typeof data !== "object") return {};
  const out = {};
  for (const field of V2_FIELDS) {
    const value = data[field];
    if (value === undefined || value === null) continue;
    const validated = validateV2Field(field, value);
    if (validated === undefined) continue;
    out[field] = validated;
  }
  return out;
}

// Walk reviewers.wiki/ and parse every leaf's frontmatter. Returns an
// array of { id, path, activation } objects (path is wiki-relative;
// activation may be undefined if the leaf has no block).
//
// The wiki is small (~476 leaves today), and gray-matter is fast enough
// that a full walk is fine to run on every review. If the corpus grows
// dramatically, this becomes a candidate for a build-time index.
function enumerateWikiLeavesWithActivation(repoRoot, { useCache = true } = {}) {
  const wikiRoot = resolve(repoRoot, "reviewers.wiki");
  if (!existsSync(wikiRoot)) return [];
  let realRoot;
  try {
    realRoot = realpathSync(wikiRoot);
  } catch {
    return [];
  }
  if (useCache && _leavesCache.has(realRoot)) return _leavesCache.get(realRoot);

  const leaves = [];
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
      let lst, realFull;
      try {
        lst = lstatSync(full);
        realFull = realpathSync(full);
      } catch {
        continue;
      }
      if (!isInside(realRoot, realFull)) continue;
      if (lst.isDirectory()) {
        if (visited.has(realFull)) continue;
        visited.add(realFull);
        stack.push(realFull);
        continue;
      }
      if (!ent.name.endsWith(".md") || ent.name === "index.md") continue;
      let parsed;
      try {
        const text = readFileSync(realFull, "utf8");
        parsed = matter(text);
      } catch {
        continue;
      }
      const id = parsed?.data?.id;
      if (typeof id !== "string" || id.length === 0) continue;
      const wikiRel = relative(realRoot, realFull).split(sep).join("/");
      // PR for #87: pre-extract the v2 frontmatter fields the trim
      // worker would otherwise re-read with one Agent Read tool call
      // per candidate leaf. Only the activation gate uses `activation`;
      // the other fields flow through into activated_leaves[*] so the
      // trim worker reads them straight from its brief env.
      //
      // Missing fields are dropped (not emitted as null) so leaves
      // without v2 frontmatter don't bloat the brief. Once
      // skill-llm-wiki#27 merges and a wiki rebuild lands, every leaf
      // will carry the full v2 set.
      leaves.push({
        id,
        path: wikiRel,
        activation: parsed.data.activation ?? undefined,
        // Pre-extract the file_globs[] subset of activation so the
        // trim worker can check per-changed-file coverage without
        // opening leaf files (the bare `activation_match` signal only
        // tells trim that file_globs hit "some" path, not which).
        // Drops malformed values silently (must be string[]).
        ...(isStringArray(parsed.data?.activation?.file_globs)
          ? { file_globs: parsed.data.activation.file_globs }
          : {}),
        ...projectV2Fields(parsed.data),
      });
    }
  }

  // Sort by id for deterministic ordering. The activation gate sorts its
  // output too, but sorting input keeps escalation-pass iteration stable.
  leaves.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (useCache) _leavesCache.set(realRoot, leaves);
  return leaves;
}

// Spawn `git diff <base>..<head>` and return the unified diff body. Used
// only for keyword_matches activation. Returns "" on any failure — the
// gate then evaluates without keyword-match firing, file_globs and
// structural_signals still work. Better to under-activate keyword
// matches than to fault the run on a transient git issue.
function fetchDiffText(base, head, repoRoot) {
  if (!base || !head) return "";
  const result = spawnSync(
    "git",
    ["diff", `${base}..${head}`],
    { encoding: "utf8", cwd: repoRoot, maxBuffer: 32 * 1024 * 1024 },
  );
  if (result.status !== 0) return "";
  return result.stdout ?? "";
}

export default async function activateLeaves({ env }) {
  const projectProfile = env.project_profile ?? {};
  const changedPaths = Array.isArray(env.changed_paths) ? env.changed_paths : [];
  const args = env.args ?? {};

  // base/head come from one of two sources:
  //   1. env.base_sha / env.head_sha (seeded by @ctxr/fsm at run init from
  //      --base-sha / --head-sha CLI args).
  //   2. env.args.base / env.args.head (the orchestrator's raw arg bag).
  // Prefer the engine-seeded fields since they're authoritative for the
  // run; fall back to args for ad-hoc handlers / tests.
  const base = env.base_sha ?? args.base ?? null;
  const head = env.head_sha ?? args.head ?? null;

  const leaves = enumerateWikiLeavesWithActivation(REPO_ROOT);
  const diffText = fetchDiffText(base, head, REPO_ROOT);

  const { activated, descent_signals } = evaluateActivation({
    leaves,
    changed_paths: changedPaths,
    project_profile: projectProfile,
    diff_text: diffText,
  });

  const activatedLeaves = activated.map((leaf) => {
    // Forward the v2 fields harvested by enumerateWikiLeavesWithActivation
    // alongside the activation_match so the trim worker (and any
    // downstream consumer) reads them straight from the brief.
    const v2 = {};
    for (const field of V2_FIELDS) {
      if (leaf[field] !== undefined) v2[field] = leaf[field];
    }
    return {
      id: leaf.id,
      path: leaf.path,
      activation_match: descent_signals[leaf.id] ?? [],
      // file_globs are forwarded when present so the trim worker can
      // do per-changed-file coverage checks (activation_match alone
      // doesn't say WHICH path matched).
      ...(Array.isArray(leaf.file_globs) ? { file_globs: leaf.file_globs } : {}),
      ...v2,
    };
  });

  return { activated_leaves: activatedLeaves };
}

// Exported helpers for direct testing without spawning the full FSM driver.
export { enumerateWikiLeavesWithActivation, fetchDiffText, projectV2Fields };
