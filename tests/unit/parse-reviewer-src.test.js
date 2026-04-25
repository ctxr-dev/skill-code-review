// Unit tests for scripts/lib/parse-reviewer-src.mjs.

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseReviewer, ParseError } from "../../scripts/lib/parse-reviewer-src.mjs";
import {
  buildValid,
  buildFrontmatterOnly,
  buildNoFrontmatter,
  buildMalformedYaml,
  buildMissingSection,
} from "./_fixtures.mjs";

describe("parse-reviewer-src", () => {
  let tmp;
  before(() => {
    tmp = mkdtempSync(join(tmpdir(), "parse-reviewer-src-"));
  });
  after(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  function writeFixture(name, content) {
    const p = join(tmp, `${name}.md`);
    writeFileSync(p, content);
    return p;
  }

  it("parses a valid reviewer", () => {
    const p = writeFixture("valid", buildValid());
    const r = parseReviewer(p);
    assert.equal(r.frontmatter.id, "valid-reviewer");
    assert.equal(r.frontmatter.tier, 2);
    assert.equal(r.frontmatter.type, "conditional");
    assert.equal(r.sections.length, 7);
    assert.equal(r.sections[0].name, "When This Activates");
    assert.equal(r.sections[6].name, "Authoritative References");
  });

  it("counts H3 subsections only inside Detailed Checks", () => {
    const p = writeFixture("h3", buildValid({ h3Count: 5 }));
    const r = parseReviewer(p);
    assert.equal(r.h3Count, 5);
  });

  it("counts - [ ] checklist items inside Audit Surface", () => {
    const p = writeFixture("audit", buildValid({ auditItemsInBody: 12 }));
    const r = parseReviewer(p);
    assert.equal(r.auditItemCount, 12);
  });

  it("counts both - [ ] and - [x] as checklist items", () => {
    const content = buildValid({
      sectionsOverride: [
        `## When This Activates\n\nContent.`,
        `## Audit Surface\n\n- [ ] item 1\n- [x] item 2\n- [X] item 3`,
        `## Detailed Checks\n\n### Topic\n\nContent.`,
        `## Common False Positives\n\nNone.`,
        `## Severity Guidance\n\nOK.`,
        `## See Also\n\nOK.`,
        `## Authoritative References\n\nOK.`,
      ].join("\n\n"),
    });
    const p = writeFixture("mixed", content);
    const r = parseReviewer(p);
    assert.equal(r.auditItemCount, 3);
  });

  it("counts total lines matching wc -l semantics", () => {
    // Content with 5 newlines = 5 "lines" per wc -l (newline count).
    const p = writeFixture("lines", "line 1\nline 2\nline 3\nline 4\nline 5\n");
    // Raise expected error since no frontmatter; but test lines-counting on
    // raw parser helper — use a minimal valid reviewer and compare to its
    // newline count.
    const content = buildValid({ extraBodyLines: 10 });
    const p2 = writeFixture("lines2", content);
    const r = parseReviewer(p2);
    const expectedLines = (content.match(/\n/g) || []).length;
    assert.equal(r.totalLines, expectedLines);
  });

  it("throws ParseError on missing frontmatter", () => {
    const p = writeFixture("nofm", buildNoFrontmatter());
    assert.throws(
      () => parseReviewer(p),
      (err) => err instanceof ParseError && err.detail.includes("missing YAML frontmatter"),
    );
  });

  it("throws ParseError on malformed YAML", () => {
    const p = writeFixture("badyaml", buildMalformedYaml());
    assert.throws(
      () => parseReviewer(p),
      (err) => err instanceof ParseError,
    );
  });

  it("throws ParseError on unreadable file", () => {
    assert.throws(
      () => parseReviewer(join(tmp, "does-not-exist.md")),
      (err) => err instanceof ParseError && err.detail.includes("cannot read file"),
    );
  });

  it("handles frontmatter-only input (no body sections)", () => {
    const p = writeFixture("fmonly", buildFrontmatterOnly());
    const r = parseReviewer(p);
    assert.equal(r.sections.length, 0);
    assert.equal(r.h3Count, 0);
    assert.equal(r.auditItemCount, 0);
  });

  it("ignores H3 headings outside Detailed Checks", () => {
    const content = buildValid({
      sectionsOverride: [
        `## When This Activates\n\n### Not counted 1\n\n### Not counted 2\n`,
        `## Audit Surface\n\n${Array.from({ length: 10 }, (_, i) => `- [ ] item ${i + 1}`).join("\n")}`,
        `## Detailed Checks\n\n### Real 1\n\n### Real 2\n\n### Real 3`,
        `## Common False Positives\n\n### Also not counted`,
        `## Severity Guidance\n\nOK.`,
        `## See Also\n\nOK.`,
        `## Authoritative References\n\nOK.`,
      ].join("\n\n"),
    });
    const p = writeFixture("h3scope", content);
    const r = parseReviewer(p);
    assert.equal(r.h3Count, 3);
  });

  it("correctly slices section content between H2 boundaries", () => {
    const p = writeFixture("sections", buildValid());
    const r = parseReviewer(p);
    const whenSection = r.sections.find((s) => s.name === "When This Activates");
    assert.ok(whenSection);
    assert.ok(whenSection.content.includes("Activates on test diffs"));
    assert.ok(!whenSection.content.includes("audit body item"));
  });

  it("does not confuse H3 with H2", () => {
    const content =
      `---\nid: h3only\ntype: conditional\ntier: 2\nfocus: "x"\n---\n\n# Title\n\n### Not an H2\n\nBody.\n`;
    const p = writeFixture("h3only", content);
    const r = parseReviewer(p);
    assert.equal(r.sections.length, 0);
  });

  it("missing-section fixture produces incomplete section list", () => {
    const p = writeFixture("miss", buildMissingSection("Severity Guidance"));
    const r = parseReviewer(p);
    const names = r.sections.map((s) => s.name);
    assert.ok(!names.includes("Severity Guidance"));
    assert.equal(names.length, 6);
  });
});
