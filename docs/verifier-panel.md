# Adversarial Verifier Panel

The verifier panel is the gate that re-checks each worker state's committed outputs before the FSM advances. Instead of trusting a single judge, it casts several independent LLM votes per gated state and requires a quorum to pass, so a hallucinated or schema-breaking output is caught (and re-done) rather than forwarded downstream. The panel is layered on top of the engine's built-in structural verifier: when no LLM dispatcher is wired, the engine quietly falls back to that structural check, so the gate always produces a verdict. The handler lives in [verifier_handler.py](../code_review/verifier_handler.py); the gated states and quorum constants live in [spec.py](../code_review/spec.py).

## How a vote works

`llm_verifier_handler()` ([verifier_handler.py:165](../code_review/verifier_handler.py#L165)) runs `verifier.parallel_count` independent LLM votes for a gated state. Each vote is a separate dispatcher call ([verifier_handler.py:208](../code_review/verifier_handler.py#L208)) over the same rendered prompt, with the worker's `Brief` and committed `outputs` exposed through the `PromptContext` metadata dict ([verifier_handler.py:196](../code_review/verifier_handler.py#L196)).

Quorum is a majority of 2 out of 3. Every gated state uses the canonical voter built by `_verifier_for()` ([spec.py:181](../code_review/spec.py#L181)), which sets `majority_threshold=2` ([spec.py:188](../code_review/spec.py#L188)) and `parallel_count=3` ([spec.py:189](../code_review/spec.py#L189)).

Each vote must be a single JSON object matching `{"verdict": "passed"|"rejected", "reason": <=280 chars}`. Parsing is fail-closed: `_parse_vote()` ([verifier_handler.py:129](../code_review/verifier_handler.py#L129)) turns any non-JSON payload, non-object payload, or unknown `verdict` into a REJECTED vote with the error embedded in the reason, and the `reason` is truncated to 280 characters ([verifier_handler.py:149](../code_review/verifier_handler.py#L149)). A dispatcher that raises also becomes a rejected vote ([verifier_handler.py:219](../code_review/verifier_handler.py#L219)). A malformed verifier never silently bypasses the gate.

## The dispatcher hook and structural fallback

The panel does not import a concrete Agent SDK. The caller wires an LLM dispatch callable, resolved by `_get_dispatcher()` ([verifier_handler.py:79](../code_review/verifier_handler.py#L79)) in this order:

1. The module-level `_DISPATCHER` (ad-hoc test wiring).
2. The `CTXR_LLM_VERIFIER_DISPATCH` env var, resolved as a dotted `package.module:callable` path ([verifier_handler.py:69](../code_review/verifier_handler.py#L69)).
3. `None`, in which case the engine's structural verifier stays in charge.

`install_verifier_handler()` ([verifier_handler.py:239](../code_review/verifier_handler.py#L239)) is idempotent: once installed it returns early. If no dispatcher is configured it returns `False` and skips registration ([verifier_handler.py:250](../code_review/verifier_handler.py#L250)), leaving the structural fallback in place so the gate still emits a verdict. If `llm_verifier_handler()` is somehow installed without a dispatcher, it returns one rejected `no_llm_dispatcher_registered` vote per slot ([verifier_handler.py:186](../code_review/verifier_handler.py#L186)).

Prompts are loaded with `load_verifier_prompt(name)` ([verifier_handler.py:115](../code_review/verifier_handler.py#L115)), which reads `{name}.md` via `importlib.resources` anchored at the `code_review.verifiers` package ([verifier_handler.py:118](../code_review/verifier_handler.py#L118)).

## verifier_stuck: degraded completion, not hard failure

A worker and the panel can disagree systemically. The orchestrator counts consecutive `verifier_rejected` events per state; the cap is `_VERIFIER_REJECTION_LIMIT = 3` ([handlers.py:85](../code_review/handlers.py#L85)), checked by `_is_verifier_stuck()` ([handlers.py:197](../code_review/handlers.py#L197)). On the third consecutive rejection on the SAME state, the `verifier_stuck` transition predicate ([spec.py:848](../code_review/spec.py#L848)) routes the run into the inline `verifier_stuck` state ([spec.py:1395](../code_review/spec.py#L1395)) handled by `handle_verifier_stuck()` ([handlers.py:2750](../code_review/handlers.py#L2750)).

That state records the impasse, marks the leaf/batch as failed, sets `degraded_run` ([spec.py:1432](../code_review/spec.py#L1432)), and ALWAYS transitions to `synthesize_release_readiness` ([spec.py:1437](../code_review/spec.py#L1437)). The run completes with degraded coverage and a lowered verdict rather than looping forever or failing hard. The rejection counter map (`verifier_rejection_counts`) is read defensively and fails OPEN on malformed shapes ([handlers.py:161](../code_review/handlers.py#L161)) so it never triggers a spurious stuck transition.

## Gated states and their verifier files

A `verifier=` VerifierSpec is attached on five worker states via `_verifier_for()`:

| State | verifier attached | Prompt file | The verifier checks |
| --- | --- | --- | --- |
| `scan_project` | [spec.py:889](../code_review/spec.py#L889) | [scan_project.md](../code_review/verifiers/scan_project.md) | Project Profile is real: non-empty `languages`, no hallucinated frameworks (must appear in deps), `diff_stats` within 20% of `git diff --stat`, `changed_paths` are repo-relative strings. |
| `tree_descend` | [spec.py:991](../code_review/spec.py#L991) | [tree_descend.md](../code_review/verifiers/tree_descend.md) | `stage_a_candidates[]` only filters `activated_leaves[]`: every candidate has an `activation_match`, no invented ids, `descent_path` is a string array, no v2 frontmatter fields dropped. |
| `llm_trim` | [spec.py:1027](../code_review/spec.py#L1027) | [llm_trim.md](../code_review/verifiers/llm_trim.md) | Trim respects the `cap`, every picked leaf has a `justification`, picked plus rejected exactly partitions the candidates (no orphans/dupes), and `coverage_rescues` point at picked leaves. |
| `tool_discovery` | [spec.py:1059](../code_review/spec.py#L1059) | [tool_discovery.md](../code_review/verifiers/tool_discovery.md) | Only authorised tools ran (declared in `picked_leaves[].tools[]`), every skipped row has a reason, `status` stays in `{pass, fail, skipped}`, and pass/fail rows carry a `findings` integer. |
| `dispatch_specialists` | not attached (see below) | [dispatch_specialists.md](../code_review/verifiers/dispatch_specialists.md) | Every finding is traceable: `specialist_outputs[].id` was scheduled this batch, `severity` in `{critical, important, minor}`, `file` is a changed path, skipped units carry a `skip_reason`. |
| `rank_findings` | [spec.py:1253](../code_review/spec.py#L1253) | [rank_findings.md](../code_review/verifiers/rank_findings.md) | Ranking preserves coverage: `findings` is an array, no non-duplicate finding dropped, core fields kept, `primary == (defect_confidence >= threshold)`, `severity_counts` present, no style nit marked primary. |

Note on `dispatch_specialists`: a `dispatch_specialists.md` prompt file exists and the state carries the `verifier_stuck` transition predicate ([spec.py:1170](../code_review/spec.py#L1170)), but the state itself ([spec.py:1114](../code_review/spec.py#L1114)) is a `Loop` and does NOT attach a `verifier=` VerifierSpec (the `verifier` field lives on `State`, and this state omits it). The module docstring ([verifier_handler.py:6](../code_review/verifier_handler.py#L6)) likewise describes the panel as covering "five worker states". So the LLM panel actively gates the five states above; the `dispatch_specialists` verifier prompt is present but not currently wired onto its state.
