import { describe, it, before, afterEach } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = join(ROOT, "scripts", "new-overlay.js");
const OVERLAYS = join(ROOT, "overlays");

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

const TEST_NAME = "test-scaffolded-overlay";
const TEST_FILE = join(OVERLAYS, "frameworks", `${TEST_NAME}.md`);

describe("new-overlay.js", () => {
  before(() => {
    if (existsSync(TEST_FILE)) rmSync(TEST_FILE);
  });

  afterEach(() => {
    if (existsSync(TEST_FILE)) rmSync(TEST_FILE);
  });

  describe("successful scaffold", () => {
    it("creates overlay file in correct category", () => {
      const { exitCode } = run(`frameworks ${TEST_NAME}`);
      assert.equal(exitCode, 0);
      assert.ok(existsSync(TEST_FILE));
    });

    it("includes H1 title with overlay suffix", () => {
      run(`frameworks ${TEST_NAME}`);
      const content = readFileSync(TEST_FILE, "utf8");
      assert.ok(content.match(/^# .+ — Review Overlay$/m), "Expected H1 with overlay suffix");
    });

    it("includes checklist placeholder", () => {
      run(`frameworks ${TEST_NAME}`);
      const content = readFileSync(TEST_FILE, "utf8");
      assert.ok(content.includes("- [ ]"));
    });

    it("prints next steps with correct category", () => {
      const { stdout } = run(`frameworks ${TEST_NAME}`);
      assert.ok(stdout.includes("overlays/index.md"));
      assert.ok(stdout.includes("Frameworks"));
    });

    it("works for languages category", () => {
      const langFile = join(OVERLAYS, "languages", `${TEST_NAME}.md`);
      run(`languages ${TEST_NAME}`);
      assert.ok(existsSync(langFile));
      rmSync(langFile);
    });

    it("works for infra category", () => {
      const infraFile = join(OVERLAYS, "infra", `${TEST_NAME}.md`);
      run(`infra ${TEST_NAME}`);
      assert.ok(existsSync(infraFile));
      rmSync(infraFile);
    });
  });

  describe("validation errors", () => {
    it("exits 1 with no arguments", () => {
      const { exitCode, stderr } = run("");
      assert.equal(exitCode, 1);
      assert.ok(stderr.includes("Usage"));
    });

    it("exits 1 with only category", () => {
      const { exitCode, stderr } = run("frameworks");
      assert.equal(exitCode, 1);
      assert.ok(stderr.includes("Usage"));
    });

    it("rejects invalid category", () => {
      const { exitCode, stderr } = run(`invalid-cat ${TEST_NAME}`);
      assert.equal(exitCode, 1);
      assert.ok(stderr.includes("Invalid category"));
    });

    it("rejects uppercase name", () => {
      const { exitCode, stderr } = run("frameworks UpperCase");
      assert.equal(exitCode, 1);
      assert.ok(stderr.includes("lowercase kebab-case"));
    });

    it("exits 1 if file already exists", () => {
      run(`frameworks ${TEST_NAME}`);
      const { exitCode, stderr } = run(`frameworks ${TEST_NAME}`);
      assert.equal(exitCode, 1);
      assert.ok(stderr.includes("already exists"));
    });
  });
});
