# Deterministic Orchestration via State-Machine YAML — Proposal

**Date:** 2026-04-26
**Status:** proposal — awaiting user direction before plan inclusion
**Priority:** highest (per user direction 2026-04-26)

## The problem

Large prose-orchestrators executing multi-step workflows drift. The user's report: *"sometimes during long iterations AI starts ignoring some steps that are necessary, and when I correct it — it agrees and apologises for misleading/forgetting."*

Concrete failure modes observed across LLM orchestration systems:

| # | Failure mode | What goes wrong |
|---|-------------|-----------------|
| F1 | Step skipping | LLM judges a step "unnecessary this time", silently skips. |
| F2 | Out-of-order execution | LLM does step 5 before step 3 because it has the relevant data. |
| F3 | Missing decision branch | LLM doesn't notice "if X, do Y else do Z"; takes default path always. |
| F4 | Forgotten edge case | LLM doesn't handle "what if Stage A returns 0 candidates"; keeps going. |
| F5 | Hallucinated step | LLM invents a step that isn't in spec. |
| F6 | Decision drift | Same input, different decision criteria across sessions. |
| F7 | "Sorry, you're right, I forgot" | Apologises after correction; same drift recurs next session. |

Why does it happen with prose orchestrators?

1. **Implicit current-state.** The LLM has to infer "which step am I in" from conversation history. Long context dilutes this.
2. **Interpretable instructions.** Prose admits judgement; judgement varies.
3. **No formal preconditions.** Nothing forces "step N can only run after step N-1's output exists".
4. **Scattered decision criteria.** "If X do Y, if Z do W" appears in a paragraph somewhere, easy to miss.
5. **No execution trace.** What was decided, when, on what evidence — there's no machine-readable record.
6. **Context compaction loses early instructions.** Step 1's rules can be summarised away by turn 50.

## Proposal: state-machine orchestration

Replace prose-as-orchestration with a **finite state machine (FSM) defined in YAML**, executed by the LLM via a strict structured-emit protocol.

The LLM doesn't get to "interpret" what to do at each turn. It gets a state ID, looks up the YAML definition for that state, emits a structured record proving it satisfies the preconditions, executes the action, emits the outputs and the chosen transition. The YAML is the spec; the structured records are the trace.

### Why this addresses the failure modes

| Failure | How FSM blocks it |
|---|---|
| F1 (skip) | Each state's `preconditions[]` reference earlier states' `outputs[]`. The LLM cannot enter state N+1 without producing a precondition record satisfied by state N's output. Skipping is detectable in the trace. |
| F2 (out-of-order) | Same mechanism — preconditions enforce ordering. |
| F3 (missing branch) | Each state's `transitions[]` enumerates ALL valid next states with explicit predicates. The LLM must evaluate each predicate; "I didn't notice" becomes "I evaluated predicate Q and got false". |
| F4 (edge case) | Edge cases get their own state. "Stage A returned 0 candidates" → transition to `stage_a_empty` state which has its own action. No silent fall-through. |
| F5 (hallucination) | The state set is closed. LLM transitioning to a state-id not in the FSM is a contract violation. |
| F6 (decision drift) | Predicates are fixed strings in YAML. LLM evaluates the same predicate each session. |
| F7 (apology recurrence) | Trace shows where drift happened. User says "you transitioned A→C but predicate Q was true; you should have gone A→B." Concrete correction, not vibes. |

### FSM execution protocol

At each state, the LLM emits two structured records: an **entry record** (before action) and an **exit record** (after action).

#### Entry record

```text
══ STATE-ENTRY ═══════════════════════════════════════
state: <state-id>
purpose: <one-line, copied verbatim from YAML>
preconditions:
  - <precondition-1>: SATISFIED (evidence: <pointer to where the satisfying data is>)
  - <precondition-2>: SATISFIED (evidence: ...)
inputs:
  - <input-key-1>: <value or pointer>
  - <input-key-2>: <value or pointer>
═══════════════════════════════════════════════════════
```

If any precondition is `NOT SATISFIED`, the LLM must NOT take action; it must instead emit a **fault record** describing the missing precondition and either transition to a recovery state defined in the FSM or halt with an explicit error.

#### Exit record

```text
══ STATE-EXIT ════════════════════════════════════════
state: <state-id>
outputs:
  - <output-key-1>: <value or pointer>
  - <output-key-2>: <value or pointer>
post_validations:
  - <check-1>: PASS|FAIL (evidence: ...)
transition_evaluation:
  - to <state-A>: predicate <P> → <true|false>  (evidence: ...)
  - to <state-B>: predicate <Q> → <true|false>  (evidence: ...)
transition: <chosen-state-id>
═══════════════════════════════════════════════════════
```

These records are visible in the conversation transcript and parseable. A `scripts/validate-trace.mjs` tool can re-run the trace post-hoc and flag any inconsistency (precondition reported SATISFIED but no evidence; transition to a state that wasn't in the YAML's transitions list; fabricated predicate evaluation).

### State-YAML schema

```yaml
fsm:
  id: code-reviewer
  version: 1
  entry: scan_project   # initial state when the orchestrator starts
  states:
    - id: scan_project
      purpose: "Build a Project Profile from manifests + repo state."
      preconditions: []   # entry state has no upstream preconditions
      inputs:
        - args            # parsed CLI/skill arguments
      action: |
        Execute the Phase A/B/C scan as defined in `code-reviewer.md` Step 1.
        Output a `=== PROJECT PROFILE ===` block.
      outputs:
        - project_profile
      post_validations:
        - "project_profile.languages is a non-empty list"
        - "project_profile.frameworks is present (may be empty)"
      transitions:
        - to: risk_tier_triage
          when: "always"

    - id: risk_tier_triage
      purpose: "Bucket the diff into trivial/lite/full/sensitive; set specialist cap."
      preconditions:
        - "project_profile exists"
        - "diff_stats exists (lines_changed, files_changed)"
      inputs:
        - project_profile
        - diff_stats
        - changed_paths
      action: |
        Apply the Tier rules from Step 2 (Risk-Tier Triage) deterministically.
        Compute tier, cap, rationale.
      outputs:
        - tier   # one of: trivial | lite | full | sensitive
        - cap    # integer
        - rationale
      post_validations:
        - "tier is exactly one of {trivial, lite, full, sensitive}"
        - "cap is an integer in [3, 50]"
      transitions:
        - to: short_circuit_exit
          when: "tier == 'trivial' AND no Tier-2 activation signal triggers AND no scope-* override is set"
        - to: stage_a_descent
          when: "otherwise"

    - id: stage_a_descent
      purpose: "Walk the wiki tree by focus + activation gate; produce candidate leaves."
      preconditions:
        - "project_profile exists"
        - "tier exists"
      inputs:
        - project_profile
        - changed_paths
        - changed_diff_summary
      action: |
        Execute Stage A as defined in Step 3 (Stage A — Deterministic Tree Descent).
      outputs:
        - stage_a_candidates  # list of {id, path, activation_match[]}
      post_validations:
        - "stage_a_candidates is a list"
      transitions:
        - to: stage_a_empty
          when: "stage_a_candidates is empty"
        - to: stage_b_trim
          when: "otherwise"

    - id: stage_a_empty
      purpose: "Handle the no-candidates path explicitly; do not silently fall through."
      preconditions:
        - "stage_a_candidates is empty"
      inputs:
        - tier
        - project_profile
      action: |
        If tier in {full, sensitive} and stage_a_candidates is empty, this is a routing
        anomaly — the wiki should always have *some* candidate for a non-trivial diff.
        Emit a coverage-gap warning into the manifest and proceed to a degenerate
        report-emit state with an empty findings array and a CONDITIONAL verdict
        (cannot say GO without ANY review).
      outputs:
        - degraded_run: true
      transitions:
        - to: emit_report
          when: "always"

    - id: stage_b_trim
      ...

    - id: emit_report
      purpose: "Write the persistent run directory and stdout."
      preconditions:
        - "verdict is computed (GO|NO-GO|CONDITIONAL)"
        - "manifest fields are all present"
      inputs:
        - manifest
        - findings
        - verdict
      action: |
        Execute Step 8 (Step 6.A + 6.B from current code-reviewer.md).
      outputs:
        - run_dir_path
        - exit_status
      post_validations:
        - "run_dir_path exists on disk"
        - "manifest.json validates against the manifest schema"
      transitions:
        - to: terminal
          when: "always"

    - id: terminal
      purpose: "End of the FSM. No further transitions."
      preconditions: []
      inputs: []
      action: |
        Halt. The orchestrator's job is done.
      outputs: []
      transitions: []
```

That's a sketch — the full FSM has 15-20 states covering every step of the current orchestrator plus all the edge-case states (short-circuit, stage-a-empty, judge-no-findings, coverage-rescue-failed, etc.).

### What lives where

Three layers, with strict roles:

| Layer | Format | Role |
|-------|--------|------|
| **FSM YAML** (e.g. `code-reviewer.fsm.yaml`) | YAML | Authoritative state graph. Source of truth. |
| **Step bodies** (e.g. `code-reviewer.md` sections) | Markdown | Detailed prose for each state's `action` block — the *content* of what to do. Referenced by state-id from the FSM. |
| **State validators** (`scripts/validate-fsm.mjs`, `scripts/validate-trace.mjs`) | Node.js | Static analysis (FSM well-formedness) + runtime (trace consistency). |

The FSM YAML is short — maybe 400-600 lines total covering ~20 states. The detailed prose stays in `code-reviewer.md` but each section is keyed by state-id and referenced from the FSM's `action:` field.

### Validators (what stops hallucination)

Two scripts ship with the FSM:

1. **`scripts/validate-fsm.mjs`** — static check on the YAML itself: every transition resolves to a defined state; every input has a producer (some upstream state's `outputs[]`); every precondition references an upstream output; entry state is reachable; no unreachable states; terminal state(s) exist.

2. **`scripts/validate-trace.mjs`** — runs after a review against the captured trace (entry + exit records pulled from the orchestrator's emit). Checks:
   - Every state-entry has a matching state-exit.
   - Every transition was to a state declared in the FSM.
   - Every precondition reported `SATISFIED` references evidence that actually existed at that point.
   - No state was entered without its preconditions satisfied.
   - Final state reached is a terminal.
   - Optional: predicate evaluations match a re-run of the deterministic predicates against the captured inputs.

The trace validator runs on every review. A trace failure surfaces in the manifest as `protocol_violation: <state-id>: <reason>` and downgrades the verdict to CONDITIONAL pending re-review. This is the lever that keeps the LLM honest — the trace is auditable and the audit is automatic.

### Determinism vs. judgement

Some predicates are pure deterministic (line counts, path matches). Others require LLM judgement ("is this Stage A candidate semantically relevant"). The FSM marks each predicate explicitly:

```yaml
transitions:
  - to: short_circuit_exit
    when:
      kind: deterministic
      expression: "tier == 'trivial' AND len(stage_a_candidates) == 0 AND len(scope_overrides) == 0"
  - to: stage_b_trim
    when:
      kind: judgement
      criteria: "tier is full or sensitive; OR tier is lite/trivial with at least one Stage-A activation signal."
      evidence_required: "list the signal(s) or the cap-driven path"
```

For `kind: deterministic`, the trace validator re-runs the expression and verifies the LLM's reported evaluation. For `kind: judgement`, the LLM provides evidence; the validator checks evidence is present (and structured).

This split is critical: it preserves LLM judgement where it belongs (semantic relevance) while making everything else verifiable.

### Subagent dispatch

When a state's action is "dispatch K parallel specialists", the FSM treats each specialist as a child FSM:

```yaml
- id: parallel_specialists
  action:
    kind: subagent_fanout
    fan_count: "{cap}"
    child_fsm: specialist.fsm.yaml
    aggregate_to: specialist_findings
  ...
```

The specialist FSM has its own entry → action → exit states. Children's traces flow back into the parent's manifest under `specialists[].trace`.

This means the *entire* orchestration tree (parent + children) is FSM-defined and trace-verifiable.

## Migration path

### Sprint A — Foundations (foundation only, no functional change)

- Author the orchestrator FSM YAML (`code-reviewer.fsm.yaml`) capturing the current 8-step orchestrator (Steps 0 through 6.B + risk-tier + Stage A + Stage B = ~15-18 states).
- Author the FSM schema (`scripts/lib/fsm-schema.mjs` — Zod or hand-rolled).
- Author `scripts/validate-fsm.mjs`.
- Add npm script `validate:fsm` to the validate chain.
- Author the structured-emit protocol section in `code-reviewer.md` so the LLM knows the format.
- Crucially: **do not yet require trace-validate to pass**. This sprint just establishes the substrate.

Output: deterministic FSM definition. No behaviour change for users.

### Sprint B — Live trace + soft-validate

- Author `scripts/validate-trace.mjs`.
- Update `code-reviewer.md` to require entry + exit records at every state boundary.
- Wire trace into `manifest.json` under `fsm_trace[]`.
- Trace validator runs but only **warns** on violation — manifests gain `protocol_warnings[]` field.
- One real review run end-to-end; inspect trace; iterate on FSM definition.

Output: every review captures a verifiable trace. Drift becomes visible.

### Sprint C — Strict trace + child FSMs

- Trace-validate violations downgrade the verdict to CONDITIONAL.
- Author `specialist.fsm.yaml` for the per-leaf specialist dispatch.
- Author `judge.fsm.yaml` for the verification judge (which is part of Sprint 2).
- Subagent dispatches use child-FSM contract.

Output: end-to-end deterministic orchestration. Drift becomes detectable AND consequential.

### Sprint D — Generate prose from YAML

- Build `scripts/render-orchestrator-md.mjs` that generates a human-readable section of `code-reviewer.md` from the FSM YAML (the "how the orchestrator works" sections).
- YAML becomes the single source of truth; prose is regenerated on every change.

Output: no more drift between prose and YAML.

## What this proposal does NOT solve

Honest disclosure of limits:

- **LLM can fabricate compliance.** The structured emit can lie ("PRECONDITIONS: SATISFIED" without checking). Mitigation: trace validator checks the *content* of the records, not just their presence. Determines deterministic vs. judgement predicates; for deterministic, re-runs them against captured inputs and flags mismatches.
- **LLM can fabricate evidence.** "Evidence: see line 42 of the diff" when line 42 doesn't say what's claimed. Mitigation: where the evidence is checkable (file paths, glob matches), the validator re-checks. Where it's pure judgement ("focus is semantically relevant"), we accept the evidence at face value but log it for human spot-checks.
- **Slower iteration.** YAML + structured emit + validators add overhead. Tokens per review go up ~10-15%. We accept this for the determinism gain.
- **Maintenance cost.** Two places to update (YAML + prose) until Sprint D collapses them. Mitigation: make Sprint D a hard requirement, not optional.
- **Composability with non-FSM tools.** External MCP servers and one-off scripts don't follow the protocol. Mitigation: the orchestrator wraps such calls in an FSM "external action" state with explicit input/output contracts.

## Cost-benefit summary

| Cost | Benefit |
|------|---------|
| ~600 lines of YAML to author | Drift becomes detectable on every run (manifest's `protocol_warnings[]`) |
| ~10-15% more tokens per review | Decision criteria don't change between sessions |
| Two-source-of-truth maintenance until Sprint D | Edge cases get explicit handling instead of falling through |
| Validator scripts to maintain | Apologies replaced by traceable corrections ("you transitioned A→C but predicate Q was true") |
| Slower onboarding for new contributors | Specialist sub-agents inherit the same protocol — uniform behaviour |

## Three open design choices for your call

These need your decision before Sprint A starts.

### Choice 1 — Granularity of states

How fine-grained should states be?

**Option A — One state per current orchestrator step** (what the example sketch uses): ~15-20 states. Coarse-grained. Action blocks are still substantial.

**Option B — One state per *decision point*** within each step: ~40-50 states. Fine-grained. Each transition is a small, verifiable predicate.

My pick: **A** for Sprint A; refine to B incrementally where drift happens.

### Choice 2 — Where prose lives

Three options:

**Option A — All prose stays in `code-reviewer.md`**, FSM references state-ids that map to MD section anchors.

**Option B — Prose moves into the FSM YAML's `action:` blocks** (multiline strings).

**Option C — Hybrid**: short action prose in YAML, deep prose in MD; YAML is required to reference the MD section by anchor.

My pick: **C** — short YAML for the protocol skeleton, deep prose in MD for the implementation guidance.

### Choice 3 — Failure mode on protocol violation

When the trace validator finds the LLM violated the protocol (skipped a state, fabricated evidence):

**Option A — Soft warning only** in `manifest.protocol_warnings[]`; review still produces a verdict.

**Option B — CONDITIONAL verdict downgrade** if any `kind: deterministic` violation; soft warning for `kind: judgement` violations.

**Option C — NO-GO verdict** on any violation; force re-review.

My pick: **B** — strict on deterministic predicates, lenient on judgement (where it's hard to prove drift).

## Recommendation

**Yes, the FSM idea is sound and it does address F1-F7 directly.** It's not a silver bullet (the LLM can still fabricate compliance) but it shifts the risk from "did the LLM forget" (unverifiable) to "did the LLM emit a verifiable trace" (verifiable). That's a real-quality lever.

**My recommendation: build it.** Specifically:

- Adopt as a new Sprint **A** in the v2 plan, ahead of the current Sprint 2-5.
- Make it the *substrate* for Sprint 2 onwards (every new tier defined as FSM states, not prose).
- Sequence: Sprint A (foundations) → Sprint B (live trace + soft validate) → Sprint 2 (verification judge, on FSM substrate) → Sprint C (strict trace + child FSMs) → Sprint 3-5 → Sprint D (collapse YAML/prose duplication).

This is the highest-leverage architectural decision since the wiki structure itself. If you greenlight it, the FSM substrate makes every later sprint smaller and more verifiable.

## Decision points (please answer to unlock execution)

1. **Greenlight FSM as Sprint A** — yes / no / want-changes-then-yes.
2. **Choice 1 (granularity)** — A coarse / B fine / let-me-decide-later.
3. **Choice 2 (prose location)** — A all-MD / B all-YAML / C hybrid.
4. **Choice 3 (violation policy)** — A warn-only / B strict-on-deterministic / C strict-everywhere.
5. **Anything I missed** — concerns about any specific failure mode I didn't address?
