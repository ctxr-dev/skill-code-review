# reviewers.src — Wiki Source Directory

This directory contains the **flat source corpus** for skill-code-review's reviewer files.

Each `.md` file is a single reviewer with rich YAML frontmatter and a standardised body structure. These files are the input to `skill-llm-wiki build`, which produces the optimised hierarchical `reviewers.wiki/` tree.

## Rules

- **Do not hand-edit `reviewers.wiki/`** — it is generated output. Edit files here instead.
- **One reviewer per file.** The filename must match the `id` in frontmatter (kebab-case).
- **Follow the body-sectioning contract** defined in `SCHEMA.md`.
- **No manual clustering.** Files are flat; the wiki operators (MERGE/NEST/DESCEND/LIFT) handle all hierarchy.
- **Frontmatter is the source of truth** for routing, activation, and indexing.

## Rebuilding the wiki

```bash
# From the skill-llm-wiki sibling directory:
cd ../skill-llm-wiki
skill-llm-wiki build ../skill-code-review/reviewers.src \
  --layout-mode sibling \
  --target ../skill-code-review/reviewers.wiki
```

See `CONTRIBUTING.md` for the full rebuild workflow.
