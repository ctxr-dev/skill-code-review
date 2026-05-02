// Shared helpers for resolving and validating SKILL_ROOT vs PROJECT_ROOT.
//
// Centralised here so the runner (scripts/run-review.mjs) and the
// inline-state handlers (scripts/inline-states/*.mjs) all apply the
// same validation rules. Pre-#101 every site re-implemented these
// checks; post-PR #101 the duplication was flagged by the
// principle-dry-kiss-yagni and antipattern-magic-numbers-strings
// reviewers in the local skill review (closes #100 follow-up review,
// findings #4, #15, #16, #19, #24).

import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

// FSM name shared across all .fsmrc.json lookups. Pre-extraction this
// string was hardcoded in two places; the magic-numbers reviewer
// flagged it as a duplication seam waiting to drift.
export const FSM_NAME = "code-reviewer";

// Hard cap on the parent-directory walk in gitToplevelFromCwd.
// Set well above any realistic project layout to make the cap
// purely a safety net against pathological mount points or symlink
// cycles, NOT a soft limit on supported repo nesting. Pre-fix the
// cap was 64 — Copilot round-2 review on PR #103 flagged that as
// potentially misclassifying valid deep nestings (e.g. node_modules
// inside a workspace inside a monorepo). 256 is well past anything
// real (filesystems typically support ~1024 path components,
// project trees rarely exceed 30) while still bounding pathological
// shapes.
export const MAX_GIT_TOPLEVEL_WALK_DEPTH = 256;

// Validate the raw storage_root field from .fsmrc.json. Reused by
// both run-review.mjs's resolveStorageRoot and
// write-run-directory.mjs's resolveStorageRoot so a single update
// site governs the contract. Pre-extraction these two implementations
// drifted across review rounds and the principle-dry-kiss-yagni
// reviewer flagged it as an "important" finding.
//
// Returns the validated raw storage_root string. Throws Error with a
// descriptive message on any malformed input — callers can surface
// the message via fail() or re-throw.
export function validateStorageRootEntry(config, skillRoot, fsmName = FSM_NAME) {
  if (!config || !Array.isArray(config.fsms)) {
    throw new Error(
      `.fsmrc.json at ${skillRoot} is missing or has no "fsms" array; ` +
      `the skill's install dir is corrupt. Reinstall the skill.`,
    );
  }
  const fsmEntry = config.fsms.find((fsm) => fsm.name === fsmName);
  if (!fsmEntry) {
    throw new Error(
      `${fsmName} entry not found in .fsmrc.json at ${skillRoot}; ` +
      `the skill's install dir is missing or corrupt. Reinstall the skill.`,
    );
  }
  const rawStorageRoot = fsmEntry.storage_root;
  if (typeof rawStorageRoot !== "string" || rawStorageRoot.length === 0) {
    throw new Error(
      `.fsmrc.json's "storage_root" is missing or empty for the ` +
      `${fsmName} entry; expected something like ".skill-code-review".`,
    );
  }
  if (isAbsolute(rawStorageRoot)) {
    throw new Error(
      `.fsmrc.json's "storage_root" must be a relative path under the project root; ` +
      `got absolute path "${rawStorageRoot}". Reinstall the skill or fix the .fsmrc.json.`,
    );
  }
  if (rawStorageRoot.split(/[\\/]/).includes("..")) {
    throw new Error(
      `.fsmrc.json's "storage_root" must not contain ".." segments (got "${rawStorageRoot}"). ` +
      `This would let storage escape the project root. Reinstall the skill or fix the .fsmrc.json.`,
    );
  }
  return rawStorageRoot;
}

// Coerce an untrusted "project_root" value (typically pulled from
// env.args.project_root) into a validated absolute string, or fall
// back to a documented default. Returns the coerced absolute path.
//
// This unifies the validation logic that previously lived inline at
// three sites (activate-leaves.mjs, write-run-directory.mjs, plus the
// runner's discoverProjectRoot) — flagged as "minor" duplication by
// the principle-dry-kiss-yagni reviewer.
//
// Defense-in-depth: only accepts non-empty absolute strings. Anything
// else (boolean true from a bare flag, relative path, undefined,
// non-string) coerces to the fallback. Top-level env fields can be
// influenced by upstream worker outputs (some LLM-produced) so the
// strict check matters when the caller passes such a value.
export function coerceAbsoluteProjectRoot(value, fallback) {
  if (typeof value === "string" && value.length > 0 && isAbsolute(value)) {
    return value;
  }
  return fallback;
}

// Walk up `cwd` looking for a .git directory or file (worktree
// marker). Doing the walk in JS rather than spawning `git rev-parse`
// keeps the hot path off a process boundary and avoids the silent
// "git not installed" failure mode.
//
// Returns the git toplevel path on success, or null when no .git is
// found within MAX_GIT_TOPLEVEL_WALK_DEPTH parents. Two terminator
// conditions exist:
//   - dirname(dir) === dir (filesystem root reached) — the natural
//     exit, returns null because the caller's cwd is genuinely not
//     in a git repo.
//   - depth cap reached — protective only, against pathological
//     mount points or symlink cycles. Logged to stderr if the cap
//     ever bites, since hitting it on a real repo would be surprising
//     and the operator should see the signal.
//
// Both `_deps.warn` and `_deps.existsSync` are injectable so unit
// tests can deterministically reach either terminator branch
// without depending on the host filesystem layout (which on some
// hosts may have a parent .git that masks the natural-fs-root
// path).
export function gitToplevelFromCwd(cwd, _deps = {}) {
  const warn = _deps.warn ?? ((msg) => process.stderr.write(`${msg}\n`));
  const exists = _deps.existsSync ?? existsSync;
  let dir = cwd;
  for (let i = 0; i < MAX_GIT_TOPLEVEL_WALK_DEPTH; i++) {
    if (exists(join(dir, ".git"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  // Cap hit before reaching filesystem root — the only way this
  // happens in practice is a pathological mount or symlink cycle.
  // Warn so the operator sees the signal instead of silently falling
  // through to the SKILL_ROOT default.
  warn(
    `WARN: project-root discovery walked ${MAX_GIT_TOPLEVEL_WALK_DEPTH} parent dirs ` +
    `from "${cwd}" without finding a .git/ entry; falling back. ` +
    `Pass --repo-root <path> if you have a deeply-nested layout.`,
  );
  return null;
}

// Read .fsmrc.json directly without the resolveSettings layer.
// Returns the parsed object. Throws on read or parse failure with a
// message that names the path. Used by both resolveStorageRoot
// implementations so neither has to re-import @ctxr/fsm's loadConfig
// for the same purpose.
//
// `_deps.readFile` is an injection seam for tests that want to
// exercise the parse path without hitting the filesystem. Defaults
// to readFileSync. (Closes the round-2 testability finding on the
// implicit fs dependency.)
export function readFsmRcDirect(skillRoot, _deps = {}) {
  const readFile = _deps.readFile ?? readFileSync;
  const path = resolve(skillRoot, ".fsmrc.json");
  let raw;
  try {
    raw = readFile(path, "utf8");
  } catch (err) {
    throw new Error(
      `failed to read .fsmrc.json at ${path}: ${err.message}. ` +
      `The skill's install dir is missing or corrupt. Reinstall the skill.`,
    );
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `.fsmrc.json at ${path} is not valid JSON: ${err.message}. ` +
      `Reinstall the skill or fix the file.`,
    );
  }
}
