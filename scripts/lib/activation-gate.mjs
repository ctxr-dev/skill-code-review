// activation-gate.mjs — deterministic evaluation of leaf `activation:` blocks.
//
// The current FSM tree-descender worker (Step 3) does both jobs at once:
//   (a) semantic descent through subcategory `focus` strings (LLM judgement),
//   (b) activation-gate evaluation against per-leaf `activation:` frontmatter
//       (file_globs / structural_signals / escalation_from / keyword_matches).
//
// Step (b) is purely mechanical: file globs against changed paths, set
// membership against the Project Profile, escalation chains across already-
// activated leaves. Two runs against the same diff should produce identical
// activation results — and they will, once the runner uses this module to
// pre-compute activation matches before handing the trimmed candidate set to
// the LLM step.
//
// Until @ctxr/fsm#3 (the `script:` field) lands, this module is exposed as a
// library that the runner / inline-state handlers can call. Once #3 lands a
// dedicated FSM state (`activation_gate`) can dispatch this module directly.
//
// Inputs:
//   - leaves          : { id, path, activation: { file_globs[], keyword_matches[], structural_signals[], escalation_from[] }? }[]
//   - changed_paths   : string[]
//   - project_profile : { languages[], frameworks[], monorepo, ci, container, iac, build, lint }
//   - diff_text       : string (unified diff body — optional; enables keyword_matches)
//
// Output: { activated[], descent_signals: { id → string[] } }
//   - activated:        leaves whose activation block fired (subset of input leaves), sorted by id
//   - descent_signals:  per-leaf reason map listing which signals fired
//                       (subset of {file_globs, keyword_matches, structural_signals, escalation_from})

import { minimatch } from "./minimatch-shim.mjs";

function fileGlobsMatch(globs, changedPaths) {
  if (!Array.isArray(globs) || globs.length === 0) return false;
  for (const glob of globs) {
    for (const path of changedPaths) {
      if (minimatch(path, glob)) return true;
    }
  }
  return false;
}

function keywordMatches(keywords, diffText) {
  if (!Array.isArray(keywords) || keywords.length === 0) return false;
  if (!diffText) return false;
  const lower = diffText.toLowerCase();
  return keywords.some((kw) => typeof kw === "string" && lower.includes(kw.toLowerCase()));
}

// Project Profile is a flat-ish structure with arrays per category. A
// structural_signal fires if it appears verbatim in any of the recorded
// arrays (languages / frameworks / ci / container / iac / build / lint) or
// if it equals the boolean monorepo flag spelt as a string.
function structuralSignalsMatch(signals, projectProfile) {
  if (!Array.isArray(signals) || signals.length === 0) return false;
  if (!projectProfile || typeof projectProfile !== "object") return false;
  const haystack = new Set();
  for (const key of ["languages", "frameworks", "ci", "container", "iac", "build", "lint"]) {
    const arr = projectProfile[key];
    if (Array.isArray(arr)) {
      for (const item of arr) {
        if (typeof item === "string") haystack.add(item.toLowerCase());
      }
    }
  }
  if (projectProfile.monorepo === true) haystack.add("monorepo");
  return signals.some((s) => typeof s === "string" && haystack.has(s.toLowerCase()));
}

export function evaluateActivation({ leaves, changed_paths, project_profile, diff_text } = {}) {
  const inputLeaves = Array.isArray(leaves) ? leaves : [];
  const changedPaths = Array.isArray(changed_paths) ? changed_paths : [];
  const profile = project_profile ?? {};

  const activated = new Map();
  const descentSignals = new Map();

  // First pass: file_globs / keyword_matches / structural_signals.
  for (const leaf of inputLeaves) {
    const activation = leaf?.activation ?? {};
    const fired = [];
    if (fileGlobsMatch(activation.file_globs, changedPaths)) fired.push("file_globs");
    if (keywordMatches(activation.keyword_matches, diff_text)) fired.push("keyword_matches");
    if (structuralSignalsMatch(activation.structural_signals, profile)) fired.push("structural_signals");
    if (fired.length > 0) {
      activated.set(leaf.id, leaf);
      descentSignals.set(leaf.id, fired);
    }
  }

  // Second pass: escalation_from. Iterate to fixed point — escalation can
  // chain (A escalates B; B escalates C). Bound to leaves.length iterations
  // to prevent infinite loops on cyclic frontmatter.
  let changed = true;
  let iterations = 0;
  while (changed && iterations < inputLeaves.length + 1) {
    changed = false;
    iterations++;
    for (const leaf of inputLeaves) {
      if (activated.has(leaf.id)) continue;
      const escalateFrom = leaf?.activation?.escalation_from;
      if (!Array.isArray(escalateFrom) || escalateFrom.length === 0) continue;
      const triggered = escalateFrom.some((parentId) => activated.has(parentId));
      if (triggered) {
        activated.set(leaf.id, leaf);
        descentSignals.set(leaf.id, ["escalation_from"]);
        changed = true;
      }
    }
  }

  const sorted = [...activated.values()].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );
  const signalMap = {};
  for (const id of [...descentSignals.keys()].sort()) {
    signalMap[id] = descentSignals.get(id).sort();
  }
  return { activated: sorted, descent_signals: signalMap };
}
