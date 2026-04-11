import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  cpSync,
  existsSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BUILD_SCRIPT = join(ROOT, "scripts", "build-index.js");
const FIXTURES = join(ROOT, "tests", "fixtures");

function runBuild(reviewersDir) {
  // build-index.js reads from its own ROOT/reviewers/. We can't redirect it
  // without modifying the script, so we test the actual project reviewers
  // and also create isolated test scenarios by running against temp dirs.
  // For isolation, we'll test by running the script and checking the output.
  try {
    const out = execFileSync("node", [BUILD_SCRIPT], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      cwd: ROOT,
    });
    return { stdout: out, stderr: "", exitCode: 0 };
  } catch (e) {
    return {
      stdout: e.stdout || "",
      stderr: e.stderr || "",
      exitCode: e.status,
    };
  }
}

describe("build-index.js", () => {
  describe("against actual project reviewers", () => {
    it("generates index.yaml successfully", () => {
      const { exitCode, stdout, stderr } = runBuild();
      assert.equal(exitCode, 0, `build-index.js exited ${exitCode}.\nstdout: ${stdout}\nstderr: ${stderr}`);
      assert.ok(stdout.includes("Generated"));
      // Don't hard-code count — just verify it's a positive number
      const match = stdout.match(/with (\d+) reviewers/);
      assert.ok(match && parseInt(match[1]) > 0);
    });

    it("produces valid YAML with all reviewer IDs", () => {
      runBuild();
      const index = readFileSync(
        join(ROOT, "reviewers", "index.yaml"),
        "utf8"
      );
      assert.ok(index.includes("- id: clean-code-solid"));
      assert.ok(index.includes("- id: security"));
      assert.ok(index.includes("- id: readme-quality"));
      assert.ok(index.includes("- id: hooks-safety"));
    });

    it("is idempotent — running twice produces identical output", () => {
      runBuild();
      const first = readFileSync(
        join(ROOT, "reviewers", "index.yaml"),
        "utf8"
      );
      runBuild();
      const second = readFileSync(
        join(ROOT, "reviewers", "index.yaml"),
        "utf8"
      );
      assert.equal(first, second);
    });

    it("includes activation for conditional reviewers", () => {
      runBuild();
      const index = readFileSync(
        join(ROOT, "reviewers", "index.yaml"),
        "utf8"
      );
      assert.ok(index.includes("activation:"));
      assert.ok(index.includes("file_globs:"));
    });

    it("includes auto-generated header comment", () => {
      runBuild();
      const index = readFileSync(
        join(ROOT, "reviewers", "index.yaml"),
        "utf8"
      );
      assert.ok(index.startsWith("# Auto-generated"));
    });
  });
});
