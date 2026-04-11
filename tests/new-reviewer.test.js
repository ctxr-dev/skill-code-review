import { describe, it, before, afterEach } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = join(ROOT, "scripts", "new-reviewer.js");
const REVIEWERS = join(ROOT, "reviewers");

function run(args = "") {
  try {
    const stdout = execFileSync(
      "node",
      [SCRIPT, ...args.split(" ").filter(Boolean)],
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], cwd: ROOT }
    );
    return { stdout, stderr: "", exitCode: 0 };
  } catch (e) {
    return {
      stdout: e.stdout || "",
      stderr: e.stderr || "",
      exitCode: e.status,
    };
  }
}

const TEST_ID = "test-scaffolded-reviewer";
const TEST_FILE = join(REVIEWERS, `${TEST_ID}.md`);

describe("new-reviewer.js", () => {
  before(() => {
    if (existsSync(TEST_FILE)) rmSync(TEST_FILE);
  });

  afterEach(() => {
    if (existsSync(TEST_FILE)) rmSync(TEST_FILE);
  });

  describe("successful scaffold", () => {
    it("creates reviewer file", () => {
      const { exitCode } = run(TEST_ID);
      assert.equal(exitCode, 0);
      assert.ok(existsSync(TEST_FILE));
    });

    it("includes correct YAML frontmatter", () => {
      run(TEST_ID);
      const content = readFileSync(TEST_FILE, "utf8");
      assert.ok(content.startsWith("---\n"));
      assert.ok(content.includes(`id: ${TEST_ID}`));
      assert.ok(content.includes("type: conditional"));
      assert.ok(content.includes("audit_surface:"));
    });

    it("includes H1 title", () => {
      run(TEST_ID);
      const content = readFileSync(TEST_FILE, "utf8");
      assert.ok(content.match(/^# .+ Reviewer$/m), "Expected H1 with Reviewer suffix");
    });

    it("respects --type universal flag", () => {
      run(`${TEST_ID} --type universal`);
      const content = readFileSync(TEST_FILE, "utf8");
      assert.ok(content.includes("type: universal"));
    });

    it("prints next steps", () => {
      const { stdout } = run(TEST_ID);
      assert.ok(stdout.includes("Next steps"));
      assert.ok(stdout.includes("index:build"));
    });
  });

  describe("validation errors", () => {
    it("exits 1 with no arguments", () => {
      const { exitCode, stderr } = run("");
      assert.equal(exitCode, 1);
      assert.ok(stderr.includes("Usage"));
    });

    it("rejects uppercase ID", () => {
      const { exitCode, stderr } = run("UpperCase");
      assert.equal(exitCode, 1);
      assert.ok(stderr.includes("lowercase kebab-case"));
    });

    it("rejects ID starting with number", () => {
      const { exitCode } = run("123-invalid");
      assert.equal(exitCode, 1);
    });

    it("rejects ID with dots", () => {
      const { exitCode } = run("has.dots");
      assert.equal(exitCode, 1);
    });

    it("exits 1 if file already exists", () => {
      run(TEST_ID); // create it
      const { exitCode, stderr } = run(TEST_ID); // try again
      assert.equal(exitCode, 1);
      assert.ok(stderr.includes("already exists"));
    });

    it("rejects invalid --type value", () => {
      const { exitCode, stderr } = run(`${TEST_ID} --type invalid`);
      assert.equal(exitCode, 1);
      assert.ok(stderr.includes("Invalid type"));
    });

    it("rejects --type with no value", () => {
      const { exitCode, stderr } = run(`${TEST_ID} --type`);
      assert.equal(exitCode, 1);
      assert.ok(stderr.includes("requires a value"));
    });
  });
});
