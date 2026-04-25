// Unit tests for scripts/build-index-src.mjs (frontmatter validation).

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildIndex,
  validateFrontmatter,
  serializeIndex,
} from "../../scripts/build-index-src.mjs";
import { parseReviewer } from "../../scripts/lib/parse-reviewer-src.mjs";
import { buildValid, buildNoFrontmatter } from "./_fixtures.mjs";

describe("build-index-src: validateFrontmatter", () => {
  let tmp;
  before(() => {
    tmp = mkdtempSync(join(tmpdir(), "build-index-src-"));
  });
  after(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  function parse(name, content) {
    const p = join(tmp, `${name}.md`);
    writeFileSync(p, content);
    return parseReviewer(p);
  }

  it("accepts a valid reviewer", () => {
    const parsed = parse("ok", buildValid());
    const errs = validateFrontmatter(parsed, "ok");
    // 'ok' is the expected id here — but buildValid defaults id to
    // "valid-reviewer". Test mismatch branch separately; fix the id for this
    // positive case.
    const parsed2 = parse("valid-reviewer", buildValid({ id: "valid-reviewer" }));
    const errs2 = validateFrontmatter(parsed2, "valid-reviewer");
    assert.deepEqual(errs2, []);
  });

  it("rejects id mismatch with filename", () => {
    const parsed = parse("mismatch", buildValid({ id: "different-id" }));
    const errs = validateFrontmatter(parsed, "mismatch");
    assert.ok(errs.some((e) => e.includes("does not match filename")));
  });

  it("rejects non-kebab-case id", () => {
    const parsed = parse("bad_id", buildValid({ id: "bad_id" }));
    const errs = validateFrontmatter(parsed, "bad_id");
    assert.ok(errs.some((e) => e.includes("kebab-case")));
  });

  it("rejects missing required fields", () => {
    const parsed = parse("missing", buildValid({ id: "missing", drop: ["dimensions", "covers"] }));
    const errs = validateFrontmatter(parsed, "missing");
    assert.ok(errs.some((e) => e.includes("dimensions")));
    assert.ok(errs.some((e) => e.includes("covers")));
  });

  it("rejects unknown type", () => {
    const parsed = parse("badtype", buildValid({ id: "badtype", type: "bogus" }));
    const errs = validateFrontmatter(parsed, "badtype");
    assert.ok(errs.some((e) => e.includes("type must be")));
  });

  it("rejects tier outside {1,2,3}", () => {
    const parsed = parse("badtier", buildValid({ id: "badtier", tier: 5 }));
    const errs = validateFrontmatter(parsed, "badtier");
    assert.ok(errs.some((e) => e.includes("tier must be")));
  });

  it("rejects conditional without activation", () => {
    const parsed = parse("condnoactivation", buildValid({
      id: "condnoactivation",
      type: "conditional",
      drop: ["activation"],
    }));
    const errs = validateFrontmatter(parsed, "condnoactivation");
    assert.ok(errs.some((e) => e.includes("conditional reviewer must have 'activation'")));
  });

  it("rejects empty covers", () => {
    const parsed = parse("nocov", buildValid({ id: "nocov", covers: [] }));
    const errs = validateFrontmatter(parsed, "nocov");
    assert.ok(errs.some((e) => e.includes("covers has 0 items")));
  });

  it("rejects covers below minimum (2 items)", () => {
    const parsed = parse("fewcov", buildValid({ id: "fewcov", covers: ["one", "two"] }));
    const errs = validateFrontmatter(parsed, "fewcov");
    assert.ok(errs.some((e) => e.includes("covers has 2 items")));
  });

  it("rejects covers above maximum (16 items)", () => {
    const parsed = parse("manycov", buildValid({
      id: "manycov",
      covers: Array.from({ length: 16 }, (_, i) => `item ${i + 1}`),
    }));
    const errs = validateFrontmatter(parsed, "manycov");
    assert.ok(errs.some((e) => e.includes("covers has 16 items")));
  });

  it("rejects audit_surface below minimum", () => {
    const parsed = parse("fewaudit", buildValid({
      id: "fewaudit",
      audit_surface: ["one", "two", "three"],
    }));
    const errs = validateFrontmatter(parsed, "fewaudit");
    assert.ok(errs.some((e) => e.includes("audit_surface has 3 items")));
  });

  it("rejects non-array audit_surface", () => {
    const parsed = parse("stringaudit", buildValid({
      id: "stringaudit",
      audit_surface: "just a string",
    }));
    const errs = validateFrontmatter(parsed, "stringaudit");
    assert.ok(errs.some((e) => e.includes("audit_surface must be an array")));
  });

  it("rejects unknown dimension value", () => {
    const parsed = parse("baddim", buildValid({ id: "baddim", dimensions: ["bogus"] }));
    const errs = validateFrontmatter(parsed, "baddim");
    assert.ok(errs.some((e) => e.includes("unknown value 'bogus'")));
  });

  it("rejects duplicate dimensions", () => {
    const parsed = parse("dupdim", buildValid({
      id: "dupdim",
      dimensions: ["correctness", "correctness"],
    }));
    const errs = validateFrontmatter(parsed, "dupdim");
    assert.ok(errs.some((e) => e.includes("duplicate value 'correctness'")));
  });

  it("accepts languages: all", () => {
    const parsed = parse("alllangs", buildValid({ id: "alllangs", languages: "all" }));
    const errs = validateFrontmatter(parsed, "alllangs");
    assert.deepEqual(errs, []);
  });

  it("accepts languages as array", () => {
    const parsed = parse("somelangs", buildValid({
      id: "somelangs",
      languages: ["python", "go"],
    }));
    const errs = validateFrontmatter(parsed, "somelangs");
    assert.deepEqual(errs, []);
  });

  it("rejects empty languages array", () => {
    const parsed = parse("emptylangs", buildValid({ id: "emptylangs", languages: [] }));
    const errs = validateFrontmatter(parsed, "emptylangs");
    assert.ok(errs.some((e) => e.includes("languages must be")));
  });

  it("accepts last_reviewed as YYYY-MM-DD", () => {
    const parsed = parse("validdate", buildValid({ id: "validdate", last_reviewed: "2026-04-18" }));
    const errs = validateFrontmatter(parsed, "validdate");
    assert.deepEqual(errs, []);
  });

  it("rejects last_reviewed in wrong format", () => {
    const parsed = parse("baddate", buildValid({ id: "baddate", last_reviewed: "04/18/2026" }));
    const errs = validateFrontmatter(parsed, "baddate");
    assert.ok(errs.some((e) => e.includes("last_reviewed must match YYYY-MM-DD")));
  });
});

describe("build-index-src: buildIndex (directory walk)", () => {
  let tmp;
  before(() => {
    tmp = mkdtempSync(join(tmpdir(), "build-index-src-dir-"));
  });
  after(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("collects valid reviewers and skips README.md / SCHEMA.md", () => {
    const dir = mkdtempSync(join(tmpdir(), "bi-valid-"));
    writeFileSync(join(dir, "alpha.md"), buildValid({ id: "alpha" }));
    writeFileSync(join(dir, "beta.md"), buildValid({ id: "beta" }));
    writeFileSync(join(dir, "README.md"), "# readme\n");
    writeFileSync(join(dir, "SCHEMA.md"), "# schema\n");

    const { errors, records } = buildIndex(dir);
    assert.deepEqual(errors, []);
    assert.equal(records.length, 2);
    assert.deepEqual(records.map((r) => r.id).sort(), ["alpha", "beta"]);

    rmSync(dir, { recursive: true, force: true });
  });

  it("reports errors per file", () => {
    const dir = mkdtempSync(join(tmpdir(), "bi-err-"));
    writeFileSync(join(dir, "good.md"), buildValid({ id: "good" }));
    writeFileSync(join(dir, "bad.md"), buildNoFrontmatter());

    const { errors, records } = buildIndex(dir);
    assert.equal(records.length, 1);
    assert.ok(errors.length > 0);
    assert.ok(errors.some((e) => e.includes("bad.md")));

    rmSync(dir, { recursive: true, force: true });
  });

  it("returns error when srcDir does not exist", () => {
    const { errors, records } = buildIndex("/nonexistent/path/does/not/exist");
    assert.ok(errors[0].includes("not found"));
    assert.equal(records.length, 0);
  });
});

describe("build-index-src: serializeIndex", () => {
  it("emits deterministic YAML", () => {
    const yaml = serializeIndex([
      { file: "a.md", id: "a", type: "universal", tier: 1, focus: "f1", dimensions: ["correctness"], languages: "all" },
      { file: "b.md", id: "b", type: "conditional", tier: 2, focus: "f2", dimensions: ["security"], languages: ["python"] },
    ]);
    assert.ok(yaml.includes("- id: a"));
    assert.ok(yaml.includes("- id: b"));
    assert.ok(yaml.includes("tier: 1"));
    assert.ok(yaml.includes("tier: 2"));
    assert.ok(yaml.includes("languages: all"));
    assert.ok(yaml.includes("languages: [python]"));
  });
});
