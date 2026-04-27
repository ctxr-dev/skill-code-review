import { test } from "node:test";
import assert from "node:assert/strict";

import { evaluateActivation } from "../../scripts/lib/activation-gate.mjs";
import { minimatch } from "../../scripts/lib/minimatch-shim.mjs";

test("minimatch: basic wildcard matches single segment", () => {
  assert.equal(minimatch("src/auth.ts", "src/*.ts"), true);
  assert.equal(minimatch("src/api/auth.ts", "src/*.ts"), false);
});

test("minimatch: ** matches any number of segments", () => {
  assert.equal(minimatch("src/api/auth.ts", "**/*.ts"), true);
  assert.equal(minimatch("auth.ts", "**/*.ts"), true);
  assert.equal(minimatch("src/api/auth/handler.ts", "src/**/*.ts"), true);
});

test("minimatch: ? matches single char", () => {
  assert.equal(minimatch("src/foo.ts", "src/fo?.ts"), true);
  assert.equal(minimatch("src/food.ts", "src/fo?.ts"), false);
});

test("minimatch: brace alternation", () => {
  assert.equal(minimatch("src/auth.ts", "src/{auth,login}.ts"), true);
  assert.equal(minimatch("src/login.ts", "src/{auth,login}.ts"), true);
  assert.equal(minimatch("src/oauth.ts", "src/{auth,login}.ts"), false);
});

test("activation-gate: file_globs match flags the leaf", () => {
  const result = evaluateActivation({
    leaves: [
      {
        id: "lang-typescript",
        activation: { file_globs: ["**/*.ts"] },
      },
    ],
    changed_paths: ["src/api/auth.ts"],
    project_profile: { languages: [] },
  });
  assert.equal(result.activated.length, 1);
  assert.deepEqual(result.descent_signals["lang-typescript"], ["file_globs"]);
});

test("activation-gate: structural_signals match against project_profile arrays", () => {
  const result = evaluateActivation({
    leaves: [
      {
        id: "fw-react",
        activation: { structural_signals: ["react"] },
      },
    ],
    changed_paths: ["src/App.tsx"],
    project_profile: { frameworks: ["react", "vite"] },
  });
  assert.equal(result.activated.length, 1);
  assert.deepEqual(result.descent_signals["fw-react"], ["structural_signals"]);
});

test("activation-gate: keyword_matches against diff text", () => {
  const result = evaluateActivation({
    leaves: [
      {
        id: "sec-jwt-tokens",
        activation: { keyword_matches: ["jwt.sign", "jwt.verify"] },
      },
    ],
    changed_paths: ["src/auth.ts"],
    project_profile: {},
    diff_text: "+const token = jwt.sign(payload, secret);",
  });
  assert.equal(result.activated.length, 1);
  assert.deepEqual(result.descent_signals["sec-jwt-tokens"], ["keyword_matches"]);
});

test("activation-gate: escalation_from chain is followed to fixed point", () => {
  const result = evaluateActivation({
    leaves: [
      {
        id: "sec-jwt-tokens",
        activation: { keyword_matches: ["jwt.sign"] },
      },
      {
        id: "sec-jwt-rotation",
        activation: { escalation_from: ["sec-jwt-tokens"] },
      },
      {
        id: "sec-key-management",
        activation: { escalation_from: ["sec-jwt-rotation"] },
      },
    ],
    changed_paths: ["src/auth.ts"],
    project_profile: {},
    diff_text: "+const token = jwt.sign(...);",
  });
  assert.equal(result.activated.length, 3);
  assert.deepEqual(result.descent_signals["sec-jwt-rotation"], ["escalation_from"]);
  assert.deepEqual(result.descent_signals["sec-key-management"], ["escalation_from"]);
});

test("activation-gate: orthogonal leaves are dropped", () => {
  const result = evaluateActivation({
    leaves: [
      {
        id: "fw-django-rails",
        activation: { structural_signals: ["django", "rails"], file_globs: ["**/*.py", "**/*.rb"] },
      },
    ],
    changed_paths: ["src/index.tsx"],
    project_profile: { frameworks: ["react"], languages: ["typescript"] },
  });
  assert.equal(result.activated.length, 0);
});

test("activation-gate: deterministic ordering of activated[] (sorted by id)", () => {
  const result = evaluateActivation({
    leaves: [
      { id: "z-leaf", activation: { file_globs: ["**/*.ts"] } },
      { id: "a-leaf", activation: { file_globs: ["**/*.ts"] } },
      { id: "m-leaf", activation: { file_globs: ["**/*.ts"] } },
    ],
    changed_paths: ["src/x.ts"],
    project_profile: {},
  });
  assert.deepEqual(
    result.activated.map((l) => l.id),
    ["a-leaf", "m-leaf", "z-leaf"],
  );
});

test("activation-gate: no activation block + no signals => not activated", () => {
  const result = evaluateActivation({
    leaves: [{ id: "no-activation-leaf" }],
    changed_paths: ["src/x.ts"],
    project_profile: {},
  });
  assert.equal(result.activated.length, 0);
});

test("activation-gate: cyclic escalation_from doesn't infinite-loop", () => {
  const result = evaluateActivation({
    leaves: [
      { id: "a", activation: { escalation_from: ["b"] } },
      { id: "b", activation: { escalation_from: ["a"] } },
    ],
    changed_paths: [],
    project_profile: {},
  });
  // No primary signal fires, so neither activates — and the loop terminates.
  assert.equal(result.activated.length, 0);
});

test("activation-gate: reproducibility — same inputs produce identical outputs", () => {
  const inputs = {
    leaves: [
      { id: "a", activation: { file_globs: ["**/*.ts"] } },
      { id: "b", activation: { structural_signals: ["react"] } },
    ],
    changed_paths: ["src/index.ts"],
    project_profile: { frameworks: ["react"] },
  };
  const r1 = evaluateActivation(inputs);
  const r2 = evaluateActivation(inputs);
  assert.deepEqual(r1, r2);
});
