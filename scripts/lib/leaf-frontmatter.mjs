// Shared tiny YAML-ish frontmatter parser scoped to a leaf's
// `activation.file_globs[]` sub-block. Used by both:
//   - scripts/run-review.mjs (per-leaf filtered diff staging, #83)
//   - scripts/inline-states/verify-coverage.mjs (coverage narrowing)
//
// Keeping the parser here avoids drift if the corpus frontmatter format
// evolves: two slightly different inline parsers (Copilot review on PR
// #84) is one too many. The corpus uses one canonical YAML layout —
// `activation:` at top level, `  file_globs:` indented two spaces,
// bullet items indented four — so a regex scan is sufficient.

// Split a leaf file's bytes into {frontmatter, body}. Returns null when
// the file does not start with a `---\n` fence followed by a closing
// `\n---` fence. `frontmatter` is the raw YAML text between the fences
// (a string, NOT a parsed object). `body` is everything after, with
// at most one leading newline trimmed for ergonomic concatenation.
export function splitFrontmatter(text) {
  if (typeof text !== "string" || !text.startsWith("---\n")) return null;
  const end = text.indexOf("\n---", 4);
  if (end < 0) return null;
  return {
    frontmatter: text.slice(4, end),
    body: text.slice(end + 4).replace(/^\n/, ""),
  };
}

// Extract `activation.file_globs[]` as an array of strings from a leaf's
// raw YAML frontmatter text. Returns:
//   - [] when the leaf carries an `activation:` block but no `file_globs:`
//     sub-block (the rare empty-globs case in the corpus).
//   - [] when there is no `activation:` block at all (the caller can
//     decide whether to treat that as "broad credit" or "skip" — the
//     parser doesn't editorialise).
//   - [<globs>] otherwise, with surrounding `"`/`'` quotes stripped.
//
// Bullet items can be quoted or bare. Items beyond the indented block
// (a deindent or a sibling key) terminate the match. The corpus uses
// 4-space-indent bullets exclusively.
export function extractFileGlobs(yamlText) {
  if (typeof yamlText !== "string") return [];
  // Locate the activation: block. The corpus uses a canonical layout —
  // `activation:` at the top level, then `  file_globs:` indented two
  // spaces, then bullet items indented four.
  const activationIdx = yamlText.search(/(^|\n)activation:\s*(\n|$)/);
  if (activationIdx < 0) return [];
  const tail = yamlText.slice(activationIdx);
  const globsMatch = tail.match(/\n {2}file_globs:\s*\n((?: {4}[^\n]*\n?)*)/);
  if (!globsMatch) return [];
  return globsMatch[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim().replace(/^["']|["']$/g, ""))
    .filter((g) => g.length > 0);
}
