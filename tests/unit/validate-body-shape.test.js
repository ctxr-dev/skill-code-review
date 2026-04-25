// Unit tests for scripts/validate-body-shape.mjs.

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  validateBodyShape,
  runValidation,
} from "../../scripts/validate-body-shape.mjs";
import { parseReviewer } from "../../scripts/lib/parse-reviewer-src.mjs";
import {
  buildValid,
  buildMissingSection,
  buildOutOfOrderSections,
} from "./_fixtures.mjs";

describe("validate-body-shape: validateBodyShape", () => {
  let tmp;
  before(() => {
    tmp = mkdtempSync(join(tmpdir(), "validate-body-shape-"));
  });
  after(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  function parse(name, content) {
    const p = join(tmp, `${name}.md`);
    writeFileSync(p, content);
    return parseReviewer(p);
  }

  it("passes a valid tier-2 reviewer", () => {
    const parsed = parse("ok", buildValid({ tier: 2 }));
    const { errors, warnings } = validateBodyShape(parsed);
    assert.deepEqual(errors, []);
    assert.deepEqual(warnings, []);
  });

  it("errors when a required section is missing", () => {
    const parsed = parse("miss-sev", buildMissingSection("Severity Guidance"));
    const { errors } = validateBodyShape(parsed);
    assert.ok(errors.some((e) => e.includes("missing required H2 section '## Severity Guidance'")));
  });

  it("errors on every missing section", () => {
    const parsed = parse("miss-two", buildMissingSection("See Also"));
    const { errors } = validateBodyShape(parsed);
    assert.ok(errors.some((e) => e.includes("## See Also")));
  });

  it("errors on out-of-order sections", () => {
    const parsed = parse("outoforder", buildOutOfOrderSections());
    const { errors } = validateBodyShape(parsed);
    assert.ok(errors.some((e) => e.includes("out of order")));
  });

  it("warns (not errors) on tier-1 over line limit", () => {
    // Tier 1 max is 200. Build a reviewer with lots of extra filler.
    const parsed = parse("tier1-over", buildValid({ tier: 1, extraBodyLines: 220 }));
    const { errors, warnings } = validateBodyShape(parsed);
    assert.deepEqual(errors, []);
    assert.ok(warnings.some((w) => w.includes("line cap") && w.includes("tier 1")));
  });

  it("warns on tier-2 over line limit", () => {
    const parsed = parse("tier2-over", buildValid({ tier: 2, extraBodyLines: 520 }));
    const { errors, warnings } = validateBodyShape(parsed);
    assert.deepEqual(errors, []);
    assert.ok(warnings.some((w) => w.includes("line cap") && w.includes("tier 2")));
  });

  it("warns on tier-1 over audit cap", () => {
    const parsed = parse("tier1-audit", buildValid({
      tier: 1,
      auditItemsInBody: 15,
    }));
    const { warnings } = validateBodyShape(parsed);
    assert.ok(warnings.some((w) => w.includes("audit_surface cap")));
  });

  it("warns on tier-1 over H3 cap", () => {
    const parsed = parse("tier1-h3", buildValid({
      tier: 1,
      h3Count: 6,
    }));
    const { warnings } = validateBodyShape(parsed);
    assert.ok(warnings.some((w) => w.includes("H3 cap")));
  });

  it("tolerates tier-2 at exactly 500 lines (boundary)", () => {
    // Boundary: exactly at the cap. Must not warn.
    const target = 500;
    // Size the body so total line count = target. Start with small base and
    // iterate to grow filler until totalLines matches.
    let extra = 400;
    let parsed;
    for (let i = 0; i < 200; i++) {
      parsed = parse(`boundary-${i}`, buildValid({ tier: 2, extraBodyLines: extra }));
      if (parsed.totalLines === target) break;
      if (parsed.totalLines < target) extra++;
      else extra--;
    }
    assert.equal(parsed.totalLines, target, `expected exactly ${target} lines`);
    const { warnings } = validateBodyShape(parsed);
    assert.ok(!warnings.some((w) => w.includes("line cap")));
  });
});

describe("validate-body-shape: runValidation (directory walk)", () => {
  it("returns errors for a file with missing section", () => {
    const dir = mkdtempSync(join(tmpdir(), "vbs-run-"));
    writeFileSync(join(dir, "miss.md"), buildMissingSection("Severity Guidance"));
    writeFileSync(join(dir, "ok.md"), buildValid({ id: "ok" }));

    const result = runValidation(dir);
    assert.equal(result.filesChecked, 2);
    assert.ok(result.errors.some((e) => e.includes("miss.md")));
    assert.ok(!result.errors.some((e) => e.includes("ok.md")));

    rmSync(dir, { recursive: true, force: true });
  });

  it("skips README.md and SCHEMA.md", () => {
    const dir = mkdtempSync(join(tmpdir(), "vbs-skip-"));
    writeFileSync(join(dir, "README.md"), "# readme\n");
    writeFileSync(join(dir, "SCHEMA.md"), "# schema\n");
    writeFileSync(join(dir, "valid.md"), buildValid({ id: "valid" }));

    const result = runValidation(dir);
    assert.equal(result.filesChecked, 1);
    assert.deepEqual(result.errors, []);

    rmSync(dir, { recursive: true, force: true });
  });

  it("returns error when srcDir does not exist", () => {
    const result = runValidation("/nonexistent/vbs/path");
    assert.ok(result.errors[0].includes("not found"));
    assert.equal(result.filesChecked, 0);
  });
});
