// emit-stdout.mjs — deterministic implementation of FSM state Step 11.
//
// Inputs (from env):
//   - run_dir_path : string (path written by Step 10 / write-run-directory)
//   - args         : the orchestrator's arg bag (carries `--format`,
//                    `--scope-severity`, `--scope-gate` per code-reviewer.md)
//
// Outputs: none (FSM-side `outputs: []`). Side effect: prints the report to
// stdout in the requested format, optionally filtered by scope-severity /
// scope-gate, then emits a `Manifest: <path>` pointer (per
// code-reviewer.md Step 11). For json the manifest pointer goes to stderr so
// stdout stays valid JSON for downstream parsers; for markdown it appends as
// a human-friendly trailer.
//
// Format selection: `--format` ∈ {markdown (default), json}. YAML is reserved
// for a future PR that bundles a serializer.

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { renderReportMarkdown } from "../lib/report-renderer.mjs";

const VALID_FORMATS = new Set(["markdown", "json"]);
// Severity threshold ordering: anything at or ABOVE the requested level is
// kept. Index = rank; higher = more severe.
const SEVERITY_RANK = { minor: 1, important: 2, critical: 3 };

// Format negotiation per code-reviewer.md / report-format.md:
//   markdown : human-readable (default for TTYs)
//   json     : machine-readable
//   auto     : pick json when stdout is piped, markdown otherwise
//   yaml     : reserved; no serializer bundled yet — surface a stderr
//              notice so the user knows the flag was seen but ignored,
//              and fall back to markdown rather than silently treating it
//              as the default.
export function resolveFormat(argsBag, { isTTY = process.stdout.isTTY ?? true } = {}) {
  const requested = argsBag?.format;
  if (typeof requested !== "string") return "markdown";
  const normalised = requested.toLowerCase();
  if (VALID_FORMATS.has(normalised)) return normalised;
  if (normalised === "auto") return isTTY ? "markdown" : "json";
  if (normalised === "yaml") {
    process.stderr.write(
      "(emit_stdout: --format=yaml requested but no YAML serializer is bundled — falling back to markdown)\n",
    );
    return "markdown";
  }
  return "markdown";
}

// `--scope-severity <level>` is interpreted as a threshold (per
// code-reviewer.md / report-format.md): findings AT OR ABOVE the requested
// rank are kept. Returns the minimum rank to keep, or null when no filter.
export function parseSeverityThreshold(raw) {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const rank = SEVERITY_RANK[raw.trim().toLowerCase()];
  return Number.isInteger(rank) ? rank : null;
}

export function parseGateFilter(raw) {
  if (raw === undefined || raw === null) return null;
  const tokens = String(raw)
    .split(",")
    .map((s) => Number.parseInt(s.trim(), 10))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 8);
  return tokens.length > 0 ? new Set(tokens) : null;
}

export function applyScopeFilters(payload, severityThreshold, gateFilter) {
  if (severityThreshold === null && !gateFilter) return payload;
  const filtered = { ...payload };
  if (severityThreshold !== null) {
    const kept = (payload.issues ?? payload.findings ?? []).filter(
      (f) => (SEVERITY_RANK[f.severity] ?? 0) >= severityThreshold,
    );
    if (Array.isArray(payload.issues)) filtered.issues = kept;
    if (Array.isArray(payload.findings)) filtered.findings = kept;
    // Recompute severity_counts (skill-internal _meta and any legacy
    // top-level field) so the emitted payload stays internally consistent.
    const counts = { critical: 0, important: 0, minor: 0 };
    for (const f of kept) {
      if (counts[f.severity] !== undefined) counts[f.severity]++;
    }
    if (filtered._meta) filtered._meta = { ...filtered._meta, severity_counts: counts };
    if (Object.prototype.hasOwnProperty.call(payload, "severity_counts")) {
      filtered.severity_counts = counts;
    }
  }
  if (gateFilter) {
    filtered.gates = (payload.gates ?? []).filter((g) => gateFilter.has(g.number));
  }
  return filtered;
}

function readReport(runDirPath, format) {
  if (format === "markdown") {
    const path = join(runDirPath, "report.md");
    return existsSync(path) ? readFileSync(path, "utf8") : null;
  }
  const jsonPath = join(runDirPath, "report.json");
  return existsSync(jsonPath) ? readFileSync(jsonPath, "utf8") : null;
}

export default async function emitStdout({ env }) {
  const runDirPath = env.run_dir_path;
  if (!runDirPath) {
    process.stderr.write(
      "(emit_stdout: no run_dir_path in env — Step 10 may have been skipped)\n",
    );
    return {};
  }

  const argsBag = env.args ?? {};
  const format = resolveFormat(argsBag);
  const severityThreshold = parseSeverityThreshold(argsBag["scope-severity"]);
  const gateFilter = parseGateFilter(argsBag["scope-gate"]);

  const filtersRequested = severityThreshold !== null || gateFilter;

  let body;
  if (filtersRequested) {
    // Filtering is format-agnostic: read the canonical JSON payload (the
    // single source of truth produced by Step 10), apply the filters, and
    // either emit it as JSON or re-render to markdown via the canonical
    // renderer. The pre-rendered report.md on disk is unfiltered, so reading
    // it would diverge from --scope-* semantics.
    const jsonRaw = readReport(runDirPath, "json");
    if (jsonRaw === null) {
      process.stderr.write(
        `(emit_stdout: filtered output requested but report.json not found under ${runDirPath})\n`,
      );
      return {};
    }
    let parsed;
    try {
      parsed = JSON.parse(jsonRaw);
    } catch {
      // Malformed report.json — fall back to the pre-rendered file and warn.
      process.stderr.write(
        "(emit_stdout: report.json is malformed; falling back to unfiltered output)\n",
      );
      body = readReport(runDirPath, format);
      if (body === null) return {};
      process.stdout.write(body);
      if (!body.endsWith("\n")) process.stdout.write("\n");
      return {};
    }
    const filtered = applyScopeFilters(parsed, severityThreshold, gateFilter);
    body = format === "json" ? JSON.stringify(filtered, null, 2) + "\n" : renderReportMarkdown(filtered);
  } else {
    body = readReport(runDirPath, format);
    if (body === null) {
      process.stderr.write(
        `(emit_stdout: report file for format=${format} not found under ${runDirPath})\n`,
      );
      return {};
    }
  }

  process.stdout.write(body);
  if (!body.endsWith("\n")) process.stdout.write("\n");
  // Manifest pointer line — uses the canonical "Manifest:" prefix from
  // code-reviewer.md Step 11. For markdown it goes on stdout as a human
  // trailer; for JSON it goes to stderr so the primary stdout stays parseable.
  const manifestLine = `Manifest: ${join(runDirPath, "manifest.json")}\n`;
  if (format === "markdown") {
    process.stdout.write(manifestLine);
  } else {
    process.stderr.write(manifestLine);
  }
  return {};
}
