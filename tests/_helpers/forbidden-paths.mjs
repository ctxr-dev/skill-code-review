// Shared assertions for "the dispatch prompt / shim text contains the
// FORBIDDEN PATHS contract" and for relative section ordering. Used
// by both the unit suite (tests/unit/dispatch-prompt-staging.test.js
// — exercises buildDispatchPromptText for standard-worker and
// per-specialist branches) and the integration suite
// (tests/integration/end-to-end-runner.test.js — exercises the shim
// text emitted by --print-agent-shim-prompt). Centralising here so
// the contract has one update site.

import assert from "node:assert/strict";

// Asserts the load-bearing tokens of the FORBIDDEN PATHS prohibition
// are present in the given text. Both the "FORBIDDEN PATHS" marker
// (so a structural scrambler dropping the section is caught) and the
// "NEVER write to /tmp" rule clause (so a prose rewrite that renames
// the rule is caught).
export function assertForbiddenPathsContract(text) {
  assert.match(text, /FORBIDDEN PATHS/);
  assert.match(text, /NEVER write to \/tmp/);
}

// Asserts `afterMarker` appears AFTER `beforeMarker` in `text`, or
// fails with a useful diagnostic naming both indices. Generalises
// the index-comparison ordering check that was duplicated between the
// standard-worker test (FORBIDDEN PATHS after OUTPUTS PATH) and the
// per-specialist test (FORBIDDEN PATHS after RESPONSE CONTRACT).
export function assertSectionOrder(text, beforeMarker, afterMarker) {
  const beforeIdx = text.indexOf(beforeMarker);
  const afterIdx = text.indexOf(afterMarker);
  assert.ok(beforeIdx >= 0, `expected section "${beforeMarker}" in text`);
  assert.ok(afterIdx >= 0, `expected section "${afterMarker}" in text`);
  assert.ok(
    afterIdx > beforeIdx,
    `expected "${afterMarker}" to appear after "${beforeMarker}"; got ${beforeMarker}@${beforeIdx} ${afterMarker}@${afterIdx}`,
  );
}
