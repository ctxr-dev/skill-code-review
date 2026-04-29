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
      leaves.push({
        id,
        path: wikiRel,
        activation: parsed.data.activation ?? undefined,
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

  const activatedLeaves = activated.map((leaf) => ({
    id: leaf.id,
    path: leaf.path,
    activation_match: descent_signals[leaf.id] ?? [],
  }));

  return { activated_leaves: activatedLeaves };
}

// Exported helpers for direct testing without spawning the full FSM driver.
export { enumerateWikiLeavesWithActivation, fetchDiffText };
