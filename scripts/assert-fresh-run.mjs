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
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { resolveSettings, runDirPath, readManifest } from "@ctxr/fsm";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

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

export function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--run-id") args.runId = argv[++i];
    else if (arg === "--base") args.base = argv[++i];
    else if (arg === "--head") args.head = argv[++i];
    else if (arg === "--max-age-seconds") args.maxAgeSeconds = Number(argv[++i]);
    else if (arg.startsWith("--run-id=")) args.runId = arg.slice("--run-id=".length);
    else if (arg.startsWith("--base=")) args.base = arg.slice("--base=".length);
    else if (arg.startsWith("--head=")) args.head = arg.slice("--head=".length);
    else if (arg.startsWith("--max-age-seconds="))
      args.maxAgeSeconds = Number(arg.slice("--max-age-seconds=".length));
  }
  return args;
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
  const args = parseArgs(process.argv);
  const settings = resolveSettings({ fsmName: "code-reviewer" }, REPO_ROOT);
  const storageRoot = resolve(REPO_ROOT, settings.storageRoot);

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
