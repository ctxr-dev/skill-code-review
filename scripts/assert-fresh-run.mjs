#!/usr/bin/env node
// assert-fresh-run.mjs — fail-closed validator that a code-review run actually
// happened, matches the requested base/head, and is recent.
//
// Usage:
//   node scripts/assert-fresh-run.mjs --run-id <id> --base <ref> --head <ref> [--max-age-seconds 600]
//
// Exit 0 silently on pass (prints the manifest path on stdout).
// Exit 1 with a structured stderr message on fail.
//
// This script is the last gate the LLM is instructed to run before
// declaring a review complete (per SKILL.md). Its purpose is structural:
// if an LLM fabricated a manifest path, made up a run id, or summarised a
// stale run from a previous invocation, this validator catches it.

import { existsSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { runDirPath, readManifest } from "@ctxr/fsm";

import {
  coerceAbsoluteProjectRoot,
  gitToplevelFromCwd,
  readFsmRcDirect,
  validateStorageRootEntry,
} from "./lib/project-root.mjs";

// SKILL_ROOT is the install dir of this skill (for .fsmrc.json
// reads). PROJECT_ROOT is the project being reviewed (where the
// run-dir lives, post-#101). Pre-fix this script hardcoded a single
// REPO_ROOT to SKILL_ROOT, so when the runner anchored storage at
// PROJECT_ROOT (the v2.3.x default) the validator looked under the
// wrong tree and reported "manifest-missing" on every real run.
// (Closes the eval-time bug found while running the v2.3.1 review on
// PR #101.)
const SKILL_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const VIOLATION = {
  ARGS: "args",
  MANIFEST_MISSING: "manifest-missing",
  BASE_MISMATCH: "base-mismatch",
  HEAD_MISMATCH: "head-mismatch",
  STALE: "stale",
};

function fail(violation, message, extra = {}) {
  const payload = { ok: false, violation, message, ...extra };
  process.stderr.write(JSON.stringify(payload) + "\n");
  process.exit(1);
}

// Pull the value for a flag that consumes the next argv token. Bare
// flags (no value) and flags that consume the next flag (`--repo-root
// --base abc` reads `--base` as the value) both surface as a value
// that's either undefined or starts with `--`. Both forms are
// rejected — same fail-fast contract the runner enforces for its own
// `--repo-root`. (Closes the round-2 principle-fail-fast finding.)
// Per-flag remediation hints. `consumeValue` formats one error
// shape ("requires a value") but each flag gets a flag-appropriate
// example so operators see the right kind of value, not "absolute
// path" for every flag. Closes the Copilot finding that the
// generic "Pass an absolute path" hint was wrong for --run-id /
// --base / --head / --max-age-seconds.
const FLAG_REMEDIATION_HINTS = {
  "--run-id": "a run-id, e.g. --run-id 20260503-123456-abcdef0",
  "--base": "a git ref or SHA, e.g. --base abc123",
  "--head": "a git ref or SHA, e.g. --head HEAD",
  "--max-age-seconds": "an integer, e.g. --max-age-seconds 600",
  "--repo-root": "an absolute path, e.g. --repo-root /path/to/project",
};

function consumeValue(argv, i, flag) {
  const value = argv[i + 1];
  if (value === undefined || value.startsWith("--")) {
    const hint = FLAG_REMEDIATION_HINTS[flag] ?? `a value for ${flag}`;
    throw new Error(
      `${flag} requires a value (got ${value === undefined ? "bare flag" : `next flag "${value}"`}). Pass ${hint}.`,
    );
  }
  return value;
}

// Parse a numeric flag and reject NaN. Pre-fix `Number(...)` silently
// returned NaN for non-numeric values; downstream comparisons against
// NaN are always false, effectively disabling the freshness gate.
// Closes finding #19 from the v2.4 round-3 review.
function parseNumericValue(rawValue, flag) {
  const numericValue = Number(rawValue);
  if (!Number.isFinite(numericValue)) {
    throw new Error(
      `${flag}: expected a finite number, got "${rawValue}". ` +
      `Use ${flag} <integer-seconds>.`,
    );
  }
  return numericValue;
}

export function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--run-id") { args.runId = consumeValue(argv, i, arg); i++; }
    else if (arg === "--base") { args.base = consumeValue(argv, i, arg); i++; }
    else if (arg === "--head") { args.head = consumeValue(argv, i, arg); i++; }
    else if (arg === "--max-age-seconds") {
      args.maxAgeSeconds = parseNumericValue(consumeValue(argv, i, arg), arg);
      i++;
    }
    else if (arg === "--repo-root") { args.repoRoot = consumeValue(argv, i, arg); i++; }
    else if (arg.startsWith("--run-id=")) args.runId = arg.slice("--run-id=".length);
    else if (arg.startsWith("--base=")) args.base = arg.slice("--base=".length);
    else if (arg.startsWith("--head=")) args.head = arg.slice("--head=".length);
    else if (arg.startsWith("--max-age-seconds="))
      args.maxAgeSeconds = parseNumericValue(arg.slice("--max-age-seconds=".length), "--max-age-seconds");
    else if (arg.startsWith("--repo-root=")) args.repoRoot = arg.slice("--repo-root=".length);
  }
  return args;
}

// Resolve PROJECT_ROOT for storage anchoring. Mirrors the runner's
// discovery order: explicit --repo-root, then process.cwd()'s git
// toplevel, then SKILL_ROOT as a documented fallback. Validates
// that --repo-root, when given, is an absolute path to a directory
// containing .git/ — same contract the runner enforces.
export function resolveProjectRootForAssertion(args, { cwd = process.cwd() } = {}) {
  if (args.repoRoot !== undefined) {
    if (typeof args.repoRoot !== "string" || args.repoRoot.length === 0) {
      throw new Error("--repo-root requires a non-empty string value");
    }
    if (!isAbsolute(args.repoRoot)) {
      throw new Error(`--repo-root requires an absolute path (got "${args.repoRoot}")`);
    }
    if (!existsSync(args.repoRoot)) {
      throw new Error(`--repo-root: path does not exist: "${args.repoRoot}"`);
    }
    if (!existsSync(join(args.repoRoot, ".git"))) {
      throw new Error(
        `--repo-root: "${args.repoRoot}" is not a git repository (no .git/ entry)`,
      );
    }
    return args.repoRoot;
  }
  return coerceAbsoluteProjectRoot(gitToplevelFromCwd(cwd), SKILL_ROOT);
}

// Resolve the absolute storage root the runner used to write the
// run-dir. Reads .fsmrc.json from SKILL_ROOT but anchors the
// resolved path at PROJECT_ROOT — same logic as the runner's
// resolveStorageRoot, kept here so the validator doesn't need to
// import it from run-review.mjs (which would pull in the entire
// runner).
export function resolveAssertionStorageRoot(projectRoot) {
  const cfg = readFsmRcDirect(SKILL_ROOT);
  const rawStorageRoot = validateStorageRootEntry(cfg, SKILL_ROOT);
  return resolve(projectRoot, rawStorageRoot);
}

export function validateRun({
  runId,
  base,
  head,
  maxAgeSeconds = 600,
  storageRoot,
  now = Date.now(),
}) {
  if (!runId || !base || !head) {
    return {
      ok: false,
      violation: VIOLATION.ARGS,
      message: "--run-id, --base, and --head are all required",
    };
  }

  let runDir;
  try {
    runDir = runDirPath(runId, { storageRoot });
  } catch (e) {
    return {
      ok: false,
      violation: VIOLATION.ARGS,
      message: `runDirPath failed: ${e.message}`,
    };
  }

  const manifestPath = join(runDir, "manifest.json");
  if (!existsSync(manifestPath)) {
    return {
      ok: false,
      violation: VIOLATION.MANIFEST_MISSING,
      message: `manifest.json not found for run-id "${runId}"`,
      manifest_path: manifestPath,
    };
  }

  const manifest = readManifest(runId, { storageRoot });
  if (!manifest) {
    return {
      ok: false,
      violation: VIOLATION.MANIFEST_MISSING,
      message: `readManifest returned null for run-id "${runId}"`,
      manifest_path: manifestPath,
    };
  }

  if (manifest.base_sha !== base) {
    return {
      ok: false,
      violation: VIOLATION.BASE_MISMATCH,
      message: `manifest base_sha "${manifest.base_sha}" does not match requested --base "${base}"`,
      manifest_path: manifestPath,
      manifest_base: manifest.base_sha,
      requested_base: base,
    };
  }

  if (manifest.head_sha !== head) {
    return {
      ok: false,
      violation: VIOLATION.HEAD_MISMATCH,
      message: `manifest head_sha "${manifest.head_sha}" does not match requested --head "${head}"`,
      manifest_path: manifestPath,
      manifest_head: manifest.head_sha,
      requested_head: head,
    };
  }

  const ageSeconds = (now - statSync(manifestPath).mtimeMs) / 1000;
  if (ageSeconds > maxAgeSeconds) {
    return {
      ok: false,
      violation: VIOLATION.STALE,
      message: `manifest is ${Math.round(ageSeconds)}s old, exceeds --max-age-seconds=${maxAgeSeconds}`,
      manifest_path: manifestPath,
      age_seconds: Math.round(ageSeconds),
      max_age_seconds: maxAgeSeconds,
    };
  }

  return { ok: true, manifest_path: manifestPath };
}

function isMain() {
  return process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isMain()) {
  // parseArgs may throw on bare-flag / next-flag-consumed cases.
  // Convert to the same structured fail() the rest of the script
  // uses so operators see one consistent error shape. (Closes the
  // round-2 principle-fail-fast finding.)
  let args;
  try {
    args = parseArgs(process.argv);
  } catch (err) {
    fail(VIOLATION.ARGS, err.message);
  }
  // Use a closure rather than a temp variable that could be
  // `undefined` if fail() ever returned (defensive against a future
  // fail() refactor that swaps exit-process for a recoverable throw).
  const storageRoot = (() => {
    try {
      const projectRoot = resolveProjectRootForAssertion(args);
      return resolveAssertionStorageRoot(projectRoot);
    } catch (err) {
      fail(VIOLATION.ARGS, err.message);
      // Unreachable in normal flow (fail() exits the process).
      return undefined;
    }
  })();

  const result = validateRun({
    runId: args.runId,
    base: args.base,
    head: args.head,
    maxAgeSeconds: args.maxAgeSeconds,
    storageRoot,
  });

  if (!result.ok) {
    fail(result.violation, result.message, result);
  }

  process.stdout.write(result.manifest_path + "\n");
  process.exit(0);
}
