// Unit tests for the shared leaf-frontmatter parser (PR #84, follow-up
// from Copilot round-3 review on PR #84):
//   - splitFrontmatter: LF + CRLF tolerance
//   - extractFileGlobs: scoped activation.file_globs[] extraction

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  splitFrontmatter,
  extractFileGlobs,
} from "../../scripts/lib/leaf-frontmatter.mjs";

test("splitFrontmatter: returns null on non-string / no-fence inputs", () => {
  assert.equal(splitFrontmatter(null), null);
  assert.equal(splitFrontmatter(undefined), null);
  assert.equal(splitFrontmatter(""), null);
  assert.equal(splitFrontmatter("no fence here"), null);
  // Opening fence without a closing fence: still null.
  assert.equal(splitFrontmatter("---\nincomplete frontmatter"), null);
});

test("splitFrontmatter: LF-only input round-trips frontmatter and body", () => {
  const text = "---\nid: foo\n---\n\n# Body\nsome content\n";
  const out = splitFrontmatter(text);
  assert.ok(out, "expected a result");
  assert.equal(out.frontmatter, "id: foo");
  assert.equal(out.body, "# Body\nsome content\n");
});

test("splitFrontmatter: CRLF input is parsed identically (Windows checkout)", () => {
  // Regression: PR #84 round-3 review flagged that splitFrontmatter
  // recognised only `---\n`, so a Windows checkout with CRLF would
  // silently fall back to broad-diff coverage. Lock CRLF support down.
  const text = "---\r\nid: foo\r\n---\r\n\r\n# Body\r\nsome content\r\n";
  const out = splitFrontmatter(text);
  assert.ok(out, "expected a result on CRLF input");
  // Frontmatter retains its internal CRLFs; body has at most one
  // leading newline trimmed.
  assert.equal(out.frontmatter, "id: foo");
  assert.equal(out.body, "# Body\r\nsome content\r\n");
});

test("extractFileGlobs: returns empty when no activation block / no file_globs", () => {
  assert.deepEqual(extractFileGlobs(null), []);
  assert.deepEqual(extractFileGlobs(""), []);
  assert.deepEqual(extractFileGlobs("id: foo\n"), []);
  assert.deepEqual(extractFileGlobs("activation:\n  keyword_matches:\n    - foo\n"), []);
});

test("extractFileGlobs: parses canonical layout (LF)", () => {
  const yaml = [
    "id: foo",
    "activation:",
    "  file_globs:",
    "    - \"**/*.js\"",
    "    - **/*.mjs",
    "    - '**/*.cjs'",
  ].join("\n");
  assert.deepEqual(
    extractFileGlobs(yaml),
    ["**/*.js", "**/*.mjs", "**/*.cjs"],
  );
});

test("extractFileGlobs: handles CRLF input (Windows checkout)", () => {
  const yaml = [
    "id: foo",
    "activation:",
    "  file_globs:",
    "    - \"**/*.js\"",
    "    - **/*.mjs",
  ].join("\r\n");
  assert.deepEqual(extractFileGlobs(yaml), ["**/*.js", "**/*.mjs"]);
});

test("extractFileGlobs: stops at deindent (sibling key after globs)", () => {
  const yaml = [
    "activation:",
    "  file_globs:",
    "    - \"**/*.js\"",
    "  keyword_matches:",
    "    - other",
  ].join("\n");
  assert.deepEqual(extractFileGlobs(yaml), ["**/*.js"]);
});
