# skill-code-review design docs

Reference docs for the architecture, the runtime subsystems, and the reviewer-corpus conventions.

## Architecture

- [code-reviewer-design.md](code-reviewer-design.md): the orchestration narrative and the complete 19-state FSM map. Start here.

## Runtime subsystems

- [programmatic-runner.md](programmatic-runner.md): the in-process runner (AIMD concurrency, fault tolerance, coverage floor, degradable workers).
- [cli-and-dispatch.md](cli-and-dispatch.md): the `review` CLI and the agent-agnostic backends (claude / codex / cursor / anthropic / openai), prompt loading, tier routing.
- [ranker-and-dedup.md](ranker-and-dedup.md): the two-stage `collect_findings` + `rank_findings` design (the precision lever).
- [verifier-panel.md](verifier-panel.md): the adversarial verifier panel and `verifier_stuck`.
- [gate-predicates.md](gate-predicates.md): the eight release-readiness gates and the GO / NO-GO verdict.
- [benchmarks.md](benchmarks.md): benchmark methodology, the sharded harness, and the no-regression gate.

## Reviewer corpus

- [SCHEMA.md](SCHEMA.md): the v2 frontmatter + body contract for `reviewers.src/<id>.md`, and the `reviewers.layout.yaml` taxonomy that drives a deterministic wiki build.

The corpus has two layers: hand-authored sources at `reviewers.src/` (tracked) and the generated tree at `reviewers.wiki/` produced by the sibling `skill-llm-wiki`. Authors edit only the source layer; never hand-edit `reviewers.wiki/`. Each leaf carries the full v2 frontmatter (`id`, `type`, `focus`, `covers`, `dimensions`, `audit_surface`, `languages`, `tags`, `activation`, `tools`), which is the source of truth for tree descent and gate aggregation. Activation globs must be specific: the broad globs `**/*`, `*`, `**`, `**/**` are forbidden by the layout contract.

For the end-to-end authoring and rebuild workflow (validate, build via `skill-llm-wiki --layout-config reviewers.layout.yaml`, validate the rebuilt tree, promote, then benchmark-verify), see [CONTRIBUTING.md](../CONTRIBUTING.md) and the `scr-reviewers-wiki-authoring` skill.
