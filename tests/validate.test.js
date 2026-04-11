import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = join(ROOT, "scripts", "validate.js");

function runValidate() {
  try {
    const stdout = execFileSync("node", [SCRIPT], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      cwd: ROOT,
    });
    return { stdout, stderr: "", exitCode: 0 };
  } catch (e) {
    return {
      stdout: e.stdout || "",
      stderr: e.stderr || "",
      exitCode: e.status,
    };
  }
}

describe("validate.js", () => {
  it("delegates to @ctxr-dev/skills validate or local fallback", () => {
    const r = runValidate();
    const output = r.stdout + r.stderr;
    // Should produce validation output from one of the paths
    assert.ok(
      output.includes("Validation passed") || output.includes("Validating"),
      "Expected validation output"
    );
  });

  it("exits 0 on the current project (should be valid)", () => {
    const { exitCode } = runValidate();
    assert.equal(exitCode, 0);
  });
});
