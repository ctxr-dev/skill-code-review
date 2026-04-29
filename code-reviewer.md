# code-reviewer (runtime contract)

> **You should not be reading this file at runtime. If the skill harness sent
> you here, restart at [`SKILL.md`](SKILL.md).** The eleven-step prose
> orchestrator that used to live here was a *design rationale*, not a runtime
> spec, and past LLMs treated it as one and re-implemented the FSM by hand,
> producing un-auditable, non-deterministic, no-manifest reports.

This skill is driven by [`scripts/run-review.mjs`](scripts/run-review.mjs). The runtime contract is code:

| Layer | File |
|---|---|
| State machine | [`fsm/code-reviewer.fsm.yaml`](fsm/code-reviewer.fsm.yaml) |
| Runner | [`scripts/run-review.mjs`](scripts/run-review.mjs) |
| Inline-state handlers | [`scripts/inline-states/*.mjs`](scripts/inline-states/) |
| Worker prompts | [`fsm/workers/*.md`](fsm/workers/) |
| Activation gate | [`scripts/lib/activation-gate.mjs`](scripts/lib/activation-gate.mjs) |
| Trim-output validator | [`scripts/lib/trim-output-validator.mjs`](scripts/lib/trim-output-validator.mjs) |
| Run-directory schema | [`scripts/inline-states/write-run-directory.mjs`](scripts/inline-states/write-run-directory.mjs) |
| Report shape (consumed by code) | [`report-format.md`](report-format.md) |
| Gate predicates (consumed by code) | [`release-readiness.md`](release-readiness.md) |

LLM entry point: [`SKILL.md`](SKILL.md). Read that, run the command, dispatch workers as the runner asks. Do not read the design doc, the wiki, or the gate predicates by hand.

Design rationale and step-by-step intent (humans only): [`docs/code-reviewer-design.md`](docs/code-reviewer-design.md).
