/**
 * Shared parsing helper for reviewers.src/ files.
 *
 * Splits frontmatter + body, identifies H2 section boundaries, counts H3s
 * inside `## Detailed Checks`, and counts `- [ ]` checklist items inside
 * `## Audit Surface`. Pure function; no writes.
 *
 * Used by scripts/build-index-src.mjs, scripts/validate-body-shape.mjs, and
 * scripts/validate-dimensions.mjs.
 */

import { readFileSync } from "node:fs";
import matter from "gray-matter";

/**
 * Parse a reviewer source file.
 *
 * @param {string} filePath - Absolute path to the .md file.
 * @returns {{
 *   path: string,
 *   frontmatter: object,
 *   rawFrontmatterString: string,
 *   body: string,
 *   totalLines: number,
 *   sections: Array<{name: string, startLine: number, endLine: number, content: string}>,
 *   h3Count: number,
 *   auditItemCount: number,
 * }}
 * @throws {ParseError} on malformed YAML, missing frontmatter, or unreadable file.
 */
export function parseReviewer(filePath) {
  let content;
  try {
    content = readFileSync(filePath, "utf8");
  } catch (e) {
    throw new ParseError(filePath, `cannot read file: ${e.message}`);
  }

  let parsed;
  try {
    parsed = matter(content);
  } catch (e) {
    throw new ParseError(filePath, `invalid YAML frontmatter: ${e.message}`);
  }

  if (!parsed.data || Object.keys(parsed.data).length === 0) {
    throw new ParseError(filePath, "missing YAML frontmatter");
  }

  const body = parsed.content;
  const totalLines = countLines(content);
  const sections = findH2Sections(body);
  const detailedChecks = sections.find((s) => s.name === "Detailed Checks");
  const auditSurface = sections.find((s) => s.name === "Audit Surface");

  return {
    path: filePath,
    frontmatter: parsed.data,
    rawFrontmatterString: parsed.matter,
    body,
    totalLines,
    sections,
    h3Count: detailedChecks ? countH3(detailedChecks.content) : 0,
    auditItemCount: auditSurface ? countChecklistItems(auditSurface.content) : 0,
  };
}

/**
 * Custom error type so callers can distinguish parse failures from other
 * errors. Carries the offending file path for clean rendering.
 */
export class ParseError extends Error {
  constructor(filePath, message) {
    super(`${filePath}: ${message}`);
    this.name = "ParseError";
    this.filePath = filePath;
    this.detail = message;
  }
}

/**
 * Count total lines in the original file content. An empty file is 0 lines;
 * a file ending in a newline has a trailing empty string after split that we
 * ignore.
 */
function countLines(content) {
  if (content.length === 0) return 0;
  // Count newline chars + 1 for the final line (matches `wc -l`'s count + 1
  // when the file doesn't end with a newline, and matches exactly when it
  // does if we treat the trailing empty string as a real line).
  //
  // We match `wc -l` semantics (which counts newline characters, not lines)
  // so our numbers line up with `wc -l < file.md` output.
  const matches = content.match(/\n/g);
  return matches ? matches.length : 0;
}

/**
 * Walk the body and return every H2 section ("## X"). Sections are consecutive
 * — each section's content runs from the line AFTER its heading up to the line
 * BEFORE the next H2 (or EOF).
 *
 * Only matches `##` at the start of a line, not `###` or `####`.
 */
function findH2Sections(body) {
  const lines = body.split("\n");
  const headings = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // H2: starts with `## ` (two hashes and at least one space). Reject H3+
    // with a negative lookahead on the third char.
    if (line.startsWith("## ") && !line.startsWith("### ")) {
      const name = line.slice(3).trim();
      headings.push({ name, lineIndex: i });
    }
  }
  const sections = [];
  for (let k = 0; k < headings.length; k++) {
    const start = headings[k].lineIndex + 1;
    const end = k + 1 < headings.length ? headings[k + 1].lineIndex - 1 : lines.length - 1;
    const content = lines.slice(start, end + 1).join("\n");
    sections.push({
      name: headings[k].name,
      startLine: start,
      endLine: end,
      content,
    });
  }
  return sections;
}

/**
 * Count `### ` headings in a section's content. Matches at the start of a
 * line only.
 */
function countH3(sectionContent) {
  const matches = sectionContent.match(/^### [^\n]+/gm);
  return matches ? matches.length : 0;
}

/**
 * Count `- [ ]` checklist items (GitHub-flavoured-markdown task list items).
 * Matches both `- [ ]` and `- [x]` since body-shape cares about item count,
 * not state. Allows optional leading whitespace for nested items.
 */
function countChecklistItems(sectionContent) {
  const matches = sectionContent.match(/^[ \t]*-[ \t]+\[[ xX]\][ \t]+/gm);
  return matches ? matches.length : 0;
}
