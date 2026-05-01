// Shared tiny YAML-ish frontmatter parser scoped to a leaf's
// `activation.file_globs[]` sub-block.
//
// Currently used by:
//   - scripts/run-review.mjs (per-leaf filtered diff staging, #83)
//
// Not yet used by:
//   - scripts/inline-states/verify-coverage.mjs — has its own
//     readLeafGlobs() with caching + symlink hardening + tri-state
//     return semantics (null vs []) that are load-bearing for its
//     broad-credit downstream logic. Migrating verify-coverage onto
//     this helper requires reconciling those semantics and is tracked
//     as follow-up scope.
//
// Keeping the parser in one place lets future call sites import it
// instead of inlining yet another regex. The corpus uses one
// canonical YAML layout — `activation:` at top level, `  file_globs:`
// indented two spaces, bullet items indented four — so a regex scan
// is sufficient and doesn't justify a runtime YAML dep.

// Split a leaf file's bytes into {frontmatter, body}. Returns null
// when the file does not start with a `---` fence followed by a
// closing `---` fence. Accepts both LF and CRLF line endings so a
// Windows checkout doesn't silently fall back to broad-diff coverage.
// `frontmatter` is the raw YAML text between the fences (a string,
// NOT a parsed object). `body` is everything after, with at most one
// leading newline trimmed for ergonomic concatenation.
export function splitFrontmatter(text) {
  if (typeof text !== "string") return null;
  const openingMatch = text.match(/^---\r?\n/);
  if (!openingMatch) return null;
  const openingLen = openingMatch[0].length;
  // Closing-fence regex allows an empty frontmatter block (`---\n---\n…`)
  // by treating the leading newline as optional when the fence sits at
  // the very start of the slice. The captured prefix-length is then 0
  // and frontmatter slices to the empty string.
  const remainder = text.slice(openingLen);
  const closingMatch = remainder.match(/(^|\r?\n)---(\r?\n|$)/);
  if (!closingMatch) return null;
  // closingMatch.index points at the start of the leading newline (or
  // at 0 when the empty-frontmatter `^` alternative matched). Slicing
  // up to that index drops the leading newline from the frontmatter
  // value, which is what callers expect.
  const fmEnd = openingLen + closingMatch.index;
  const bodyStart = openingLen + closingMatch.index + closingMatch[0].length;
  return {
    frontmatter: text.slice(openingLen, fmEnd),
    body: text.slice(bodyStart).replace(/^\r?\n/, ""),
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
  // Normalise to LF first so the rest of the parser can rely on `\n`
  // boundaries — a Windows checkout would otherwise leave \r in every
  // line and break the file_globs match.
  const normalised = yamlText.replace(/\r\n?/g, "\n");
  // Locate the activation: block. The corpus uses a canonical layout —
  // `activation:` at the top level, then `  file_globs:` indented two
  // spaces, then bullet items indented four.
  const activationIdx = normalised.search(/(^|\n)activation:\s*(\n|$)/);
  if (activationIdx < 0) return [];
  const tail = normalised.slice(activationIdx);
  const globsMatch = tail.match(/\n {2}file_globs:\s*\n((?: {4}[^\n]*\n?)*)/);
  if (!globsMatch) return [];
  return globsMatch[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim().replace(/^["']|["']$/g, ""))
    .filter((g) => g.length > 0);
}
