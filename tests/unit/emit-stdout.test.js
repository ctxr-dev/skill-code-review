// Smoke tests for the pure helpers underlying emit-stdout.mjs (Step 11).
// Filesystem-level coverage of the handler default-export — reading
// report.{md,json} from a real run dir and routing stdout / stderr — lands
// under SC-B7's record/replay harness; these tests pin the in-process
// transformations so the documented contract (format negotiation, scope
// thresholding, gate filtering, severity-count recompute) can't drift.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  resolveFormat,
  parseSeverityThreshold,
  parseGateFilter,
  applyScopeFilters,
} from "../../scripts/inline-states/emit-stdout.mjs";

test("resolveFormat: missing format → auto routing (TTY → markdown, pipe → json)", () => {
  assert.equal(resolveFormat({}, { isTTY: true }), "markdown");
  assert.equal(resolveFormat({}, { isTTY: false }), "json");
  assert.equal(resolveFormat(null, { isTTY: true }), "markdown");
  assert.equal(resolveFormat(null, { isTTY: false }), "json");
});

test("resolveFormat: explicit values override auto routing, normalise case", () => {
  assert.equal(resolveFormat({ format: "markdown" }, { isTTY: false }), "markdown");
  assert.equal(resolveFormat({ format: "json" }, { isTTY: true }), "json");
  assert.equal(resolveFormat({ format: "JSON" }, { isTTY: true }), "json");
});

test("resolveFormat: auto picks json when stdout is not a TTY", () => {
  assert.equal(resolveFormat({ format: "auto" }, { isTTY: false }), "json");
  assert.equal(resolveFormat({ format: "auto" }, { isTTY: true }), "markdown");
});

test("resolveFormat: yaml falls back to markdown (no serializer bundled)", () => {
  // resolveFormat writes a stderr notice for yaml; assert the return value
  // rather than the side effect.
  assert.equal(resolveFormat({ format: "yaml" }), "markdown");
});

test("parseSeverityThreshold: returns the rank floor for valid levels", () => {
  assert.equal(parseSeverityThreshold("minor"), 1);
  assert.equal(parseSeverityThreshold("important"), 2);
  assert.equal(parseSeverityThreshold("critical"), 3);
  assert.equal(parseSeverityThreshold("CRITICAL"), 3);
  assert.equal(parseSeverityThreshold(" important "), 2);
});

test("parseSeverityThreshold: returns null for missing / empty / unknown", () => {
  assert.equal(parseSeverityThreshold(undefined), null);
  assert.equal(parseSeverityThreshold(""), null);
  assert.equal(parseSeverityThreshold("   "), null);
  assert.equal(parseSeverityThreshold("blocker"), null);
});

test("parseGateFilter: parses comma-separated gate numbers, drops out-of-range", () => {
  assert.deepEqual([...(parseGateFilter("1,3,8") ?? [])].sort(), [1, 3, 8]);
  assert.deepEqual([...(parseGateFilter("0,9,7") ?? [])].sort(), [7]);
  assert.deepEqual([...(parseGateFilter("garbage,2") ?? [])].sort(), [2]);
});

test("parseGateFilter: returns null for missing / all-invalid input", () => {
  assert.equal(parseGateFilter(undefined), null);
  assert.equal(parseGateFilter(null), null);
  assert.equal(parseGateFilter("garbage,99"), null);
});

test("applyScopeFilters: severity threshold keeps at-or-above", () => {
  const payload = {
    findings: [
      { severity: "minor", file: "a.ts" },
      { severity: "important", file: "b.ts" },
      { severity: "critical", file: "c.ts" },
    ],
    severity_counts: { critical: 1, important: 1, minor: 1 },
  };
  const filtered = applyScopeFilters(payload, 2, null);
  assert.equal(filtered.findings.length, 2);
  assert.deepEqual(
    filtered.findings.map((f) => f.severity).sort(),
    ["critical", "important"],
  );
  // severity_counts must reflect the kept set, not the original.
  assert.deepEqual(filtered.severity_counts, { critical: 1, important: 1, minor: 0 });
});

test("applyScopeFilters: gate filter keeps only requested gates", () => {
  const payload = {
    findings: [],
    severity_counts: { critical: 0, important: 0, minor: 0 },
    gates: [
      { number: 1, name: "SOLID & Clean Code", status: "PASS" },
      { number: 6, name: "Security & Safety", status: "FAIL" },
      { number: 8, name: "Domain-specific quality", status: "N/A" },
    ],
  };
  const filtered = applyScopeFilters(payload, null, new Set([6, 8]));
  assert.equal(filtered.gates.length, 2);
  assert.deepEqual(filtered.gates.map((g) => g.number).sort(), [6, 8]);
});

test("applyScopeFilters: no filters returns the same payload object", () => {
  const payload = { findings: [], gates: [] };
  const result = applyScopeFilters(payload, null, null);
  assert.equal(result, payload, "must short-circuit when no filters requested");
});

test("applyScopeFilters: severity threshold of `critical` keeps only critical", () => {
  const payload = {
    findings: [
      { severity: "minor" },
      { severity: "important" },
      { severity: "critical" },
    ],
    severity_counts: { critical: 1, important: 1, minor: 1 },
  };
  const filtered = applyScopeFilters(payload, 3, null);
  assert.equal(filtered.findings.length, 1);
  assert.equal(filtered.findings[0].severity, "critical");
  assert.deepEqual(filtered.severity_counts, { critical: 1, important: 0, minor: 0 });
});
