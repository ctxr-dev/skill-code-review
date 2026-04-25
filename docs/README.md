# skill-code-review — design docs

Reference docs for skill-code-review's architecture and authoring conventions.

## Files in this directory

- **[`SCHEMA.md`](SCHEMA.md)** — frontmatter + body schema for source corpus files in `reviewers.src/`. Authors editing the corpus follow this.
- **[`sniper-precision-review-architecture.md`](sniper-precision-review-architecture.md)** — investigation (2026-04-26) into how to use the 476-leaf `reviewers.wiki/` corpus for high-precision multi-specialist review. Synthesised from five parallel sub-agent investigations covering GitHub Copilot mechanics, SOTA AI review tools, multi-agent SE research, and an audit of our own wiki's routing surface. Defines the 6-tier orchestration architecture and the 5-sprint sequencing that drives Phase 5 of `skill-code-review-v2.md`.

## Authoring rules for `reviewers.src/`

The source corpus at `reviewers.src/` is gitignored locally — sources are authored, validated, then fed through `skill-llm-wiki build` to produce the tracked `reviewers.wiki/` tree. Authors should:

- **Never hand-edit `reviewers.wiki/`** — it is generated output. Source edits land in `reviewers.src/<id>.md`, then a wiki rebuild propagates them.
- **One reviewer per file.** Filename must match the `id` in frontmatter (kebab-case).
- **Follow the body-sectioning contract** defined in [`SCHEMA.md`](SCHEMA.md).
- **No manual clustering.** Sources are flat; the wiki operators (MERGE/NEST/DESCEND/LIFT) handle all hierarchy at build time.
- **Frontmatter is the source of truth** for routing — `activation:`, `dimensions:`, `tags:`, `tools:` all feed the orchestrator's tree descent and gate aggregation.

## Rebuilding the wiki

```bash
# From any directory; output lands at <source>.wiki by default
node ../skill-llm-wiki/scripts/cli.mjs build /absolute/path/to/skill-code-review/reviewers.src \
  --quality-mode deterministic \
  --fanout-target 6 \
  --max-depth 5 \
  --soft-dag-parents \
  --accept-dirty
```

After a successful rebuild: validate, then move the produced `reviewers.src.wiki/` over the existing `reviewers.wiki/`. See [`CONTRIBUTING.md`](../CONTRIBUTING.md) for the full workflow.
