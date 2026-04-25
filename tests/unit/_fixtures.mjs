/**
 * Programmatic fixture builders for reviewer-src unit tests.
 *
 * Keeps fixture content close to the tests that assert on it. Each builder
 * returns a string intended to be written to disk with `writeFileSync`.
 */

/**
 * Build a valid tier-2 reviewer with the full required body section
 * structure. Overrides via `opts` replace the defaults; pass `opts.drop` to
 * remove a field entirely (for missing-field tests).
 */
export function buildValid(opts = {}) {
  const {
    id = "valid-reviewer",
    type = "conditional",
    tier = 2,
    focus = "Detect valid reviewer patterns",
    dimensions = ["correctness", "readability"],
    covers = [
      "cover item 1",
      "cover item 2",
      "cover item 3",
    ],
    audit_surface = [
      "audit item 1",
      "audit item 2",
      "audit item 3",
      "audit item 4",
      "audit item 5",
      "audit item 6",
      "audit item 7",
      "audit item 8",
      "audit item 9",
      "audit item 10",
    ],
    languages = "all",
    tags = ["test"],
    last_reviewed = "2026-04-18",
    activation = { file_globs: ["**/*.ts"] },
    extraBodyLines = 0,
    h3Count = 2,
    auditItemsInBody = 10,
    drop = [],
    title = "Valid Reviewer",
    sectionsOverride = null,
  } = opts;

  const fm = {
    id,
    type,
    tier,
    focus,
    dimensions,
    covers,
    audit_surface,
    languages,
    tags,
    last_reviewed,
    activation,
  };
  for (const k of drop) delete fm[k];

  const frontmatterYaml = yamlDump(fm);
  const auditBullets = Array.from({ length: auditItemsInBody }, (_, i) => `- [ ] audit body item ${i + 1}`).join("\n");
  const h3Subs = Array.from({ length: h3Count }, (_, i) => `### Topic ${i + 1}\n\nSubsection ${i + 1} content.`).join("\n\n");
  const filler = Array.from({ length: extraBodyLines }, (_, i) => `Extra filler line ${i + 1}.`).join("\n");

  const sections =
    sectionsOverride ??
    [
      `## When This Activates\n\nActivates on test diffs.`,
      `## Audit Surface\n\n${auditBullets}`,
      `## Detailed Checks\n\n${h3Subs}`,
      `## Common False Positives\n\nNone in test fixture.`,
      `## Severity Guidance\n\n| Finding | Severity |\n|---|---|\n| Test | low |`,
      `## See Also\n\n- other-reviewer`,
      `## Authoritative References\n\n- [Test](https://example.test)`,
    ].join("\n\n");

  return `---\n${frontmatterYaml}---\n\n# ${title}\n\n${sections}\n${filler ? "\n" + filler + "\n" : ""}`;
}

/**
 * Minimal YAML dump — only handles the shapes used in tests. Not a general
 * YAML emitter. Strings are JSON-encoded when they need quoting; arrays get
 * flow style; scalars go inline.
 */
function yamlDump(obj) {
  let out = "";
  for (const [k, v] of Object.entries(obj)) {
    out += `${k}: ${dumpValue(v, 0)}\n`;
  }
  return out;
}

function dumpValue(v, indent) {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) {
    if (v.length === 0) return "[]";
    return "\n" + v.map((item) => `${"  ".repeat(indent + 1)}- ${scalar(item)}`).join("\n");
  }
  if (typeof v === "object") {
    let s = "";
    for (const [k, vv] of Object.entries(v)) {
      s += `\n${"  ".repeat(indent + 1)}${k}: ${dumpValue(vv, indent + 1)}`;
    }
    return s;
  }
  return scalar(v);
}

function scalar(v) {
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  // Always quote strings with double quotes + JSON.stringify to handle
  // punctuation predictably.
  return JSON.stringify(String(v));
}

/**
 * Build a reviewer with frontmatter only (no body).
 */
export function buildFrontmatterOnly(opts = {}) {
  const base = buildValid(opts);
  return base.split(/\n# /)[0] + "\n";
}

/**
 * Build a reviewer with the body sections in the wrong order.
 */
export function buildOutOfOrderSections() {
  return buildValid({
    sectionsOverride: [
      `## Audit Surface\n\n` + Array.from({ length: 10 }, (_, i) => `- [ ] item ${i + 1}`).join("\n"),
      `## When This Activates\n\nActivates on test diffs.`,
      `## Detailed Checks\n\n### Topic\n\nContent.`,
      `## Common False Positives\n\nNone.`,
      `## Severity Guidance\n\nOK.`,
      `## See Also\n\nOK.`,
      `## Authoritative References\n\nOK.`,
    ].join("\n\n"),
  });
}

/**
 * Build a reviewer missing one H2 section.
 */
export function buildMissingSection(sectionName) {
  return buildValid({
    sectionsOverride: [
      `## When This Activates\n\nActivates on test diffs.`,
      `## Audit Surface\n\n` + Array.from({ length: 10 }, (_, i) => `- [ ] item ${i + 1}`).join("\n"),
      `## Detailed Checks\n\n### Topic\n\nContent.`,
      `## Common False Positives\n\nNone.`,
      `## Severity Guidance\n\nOK.`,
      `## See Also\n\nOK.`,
      `## Authoritative References\n\nOK.`,
    ]
      .filter((s) => !s.startsWith(`## ${sectionName}`))
      .join("\n\n"),
  });
}

/**
 * Build a reviewer without any frontmatter.
 */
export function buildNoFrontmatter() {
  return `# Some Reviewer\n\n## When This Activates\n\nContent.\n`;
}

/**
 * Build a reviewer with intentionally broken YAML.
 */
export function buildMalformedYaml() {
  return `---\nid: bad-yaml\n  type: [unclosed\n---\n\n# Bad\n\n## When This Activates\n\nContent.\n`;
}
