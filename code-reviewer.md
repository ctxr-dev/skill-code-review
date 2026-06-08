# code-reviewer (runtime contract)

> **You should not be reading this file at runtime. If the skill harness sent
> you here, restart at [`SKILL.md`](SKILL.md).** The eleven-step prose
> orchestrator that used to live here was a *design rationale*, not a runtime
> spec, and past LLMs treated it as one and re-implemented the FSM by hand,
> producing un-auditable, non-deterministic, no-manifest reports.

This skill is driven by an FSM declared in
[`code_review/spec.py`](code_review/spec.py) and
executed by [`ctxr-fsm`](https://github.com/ctxr-dev/fsm) (Python). The
runtime contract is code:

| Layer | File |
|---|---|
| State machine | [`code_review/spec.py`](code_review/spec.py) |
| Inline-state handlers | [`code_review/handlers.py`](code_review/handlers.py) |
| Worker prompts | [`code_review/workers/*.md`](code_review/workers/) |
| Installer (registers spec + handlers) | [`code_review/install.py`](code_review/install.py) |
| Report shape (consumed by code) | [`report-format.md`](report-format.md) |
| Gate predicates (consumed by code) | [`release-readiness.md`](release-readiness.md) |

LLM entry point: [`SKILL.md`](SKILL.md). Read that, follow the bootstrap, drive the run through the `fsm.*` MCP tool family, dispatch workers when the brief asks. Do not read the design doc, the wiki, or the gate predicates by hand.

Design rationale and step-by-step intent (humans only): [`docs/code-reviewer-design.md`](docs/code-reviewer-design.md).
