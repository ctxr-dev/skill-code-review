// Unit tests for scripts/validate-dimensions.mjs.

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  validateDimensions,
  runValidation,
} from "../../scripts/validate-dimensions.mjs";
import { parseReviewer } from "../../scripts/lib/parse-reviewer-src.mjs";
import { buildValid } from "./_fixtures.mjs";

describe("validate-dimensions: validateDimensions", () => {
  let tmp;
  before(() => {
    tmp = mkdtempSync(join(tmpdir(), "validate-dimensions-"));
  });
  after(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  function parse(name, content) {
    const p = join(tmp, `${name}.md`);
    writeFileSync(p, content);
    return parseReviewer(p);
  }

  it("accepts a valid subset", () => {
    const parsed = parse("ok", buildValid({ dimensions: ["correctness", "security"] }));
    const errs = validateDimensions(parsed);
    assert.deepEqual(errs, []);
  });

  it("accepts every dimension individually", () => {
    const all = ["correctness", "security", "performance", "tests", "readability", "architecture", "documentation"];
    for (const d of all) {
      const parsed = parse(`single-${d}`, buildValid({ dimensions: [d] }));
      const errs = validateDimensions(parsed);
      assert.deepEqual(errs, [], `expected no errors for ${d}`);
    }
  });

  it("rejects missing dimensions", () => {
    const parsed = parse("missing", buildValid({ drop: ["dimensions"] }));
    const errs = validateDimensions(parsed);
    assert.ok(errs[0].includes("missing 'dimensions'"));
  });

  it("rejects empty dimensions array", () => {
    const parsed = parse("empty", buildValid({ dimensions: [] }));
    const errs = validateDimensions(parsed);
    assert.ok(errs[0].includes("must not be empty"));
  });

  it("rejects unknown dimension", () => {
    const parsed = parse("bogus", buildValid({ dimensions: ["correctness", "nonsense"] }));
    const errs = validateDimensions(parsed);
    assert.ok(errs.some((e) => e.includes("unknown value 'nonsense'")));
  });

  it("rejects duplicates", () => {
    const parsed = parse("dup", buildValid({ dimensions: ["correctness", "correctness"] }));
    const errs = validateDimensions(parsed);
    assert.ok(errs.some((e) => e.includes("duplicate value 'correctness'")));
  });

  it("rejects non-array dimensions (string)", () => {
    const parsed = parse("string", buildValid({ dimensions: "correctness" }));
    const errs = validateDimensions(parsed);
    assert.ok(errs.some((e) => e.includes("must be an array")));
  });

  it("accepts all seven valid dimensions together", () => {
    const parsed = parse("all7", buildValid({
      dimensions: ["correctness", "security", "performance", "tests", "readability", "architecture", "documentation"],
    }));
    const errs = validateDimensions(parsed);
    assert.deepEqual(errs, []);
  });
});

describe("validate-dimensions: runValidation", () => {
  it("reports per-file errors", () => {
    const dir = mkdtempSync(join(tmpdir(), "vd-run-"));
    writeFileSync(join(dir, "ok.md"), buildValid({ id: "ok", dimensions: ["correctness"] }));
    writeFileSync(join(dir, "bad.md"), buildValid({ id: "bad", dimensions: [] }));

    const result = runValidation(dir);
    assert.equal(result.filesChecked, 2);
    assert.ok(result.errors.some((e) => e.includes("bad.md") && e.includes("not be empty")));
    assert.ok(!result.errors.some((e) => e.includes("ok.md")));

    rmSync(dir, { recursive: true, force: true });
  });

  it("returns error when srcDir does not exist", () => {
    const result = runValidation("/nonexistent/vd/path");
    assert.ok(result.errors[0].includes("not found"));
    assert.equal(result.filesChecked, 0);
  });
});
