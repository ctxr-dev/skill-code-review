# Reviewer Source File Schema

Every `.md` file in `reviewers.src/` must conform to this v2 schema. Two validators enforce it: the standalone [scripts/validate_layout.py](../scripts/validate_layout.py) (the shape + frontmatter contract) and the sibling `skill-llm-wiki validate` pass (corpus + build invariants).

## Frontmatter (YAML)

```yaml
---
id: <kebab-case, matches filename without .md>
type: primary | overlay | universal
focus: <one sentence, narrowest possible scope>
dimensions:                         # closed set, at least one
  - correctness
  - security                        # any of: architecture, correctness, documentation,
  - ...                             #         performance, readability, security, tests
covers:                             # 3 to 15 granular bullets (used for similarity matching)
  - "..."
audit_surface:                      # 10 to 20 high-signal review items
  - "..."
languages: all                      # the scalar string "all", OR a non-empty list like [python, typescript]
tags: [<topical tags>]              # topical routing tags, at least one
activation:                         # how the orchestrator decides to load this reviewer
  file_globs: ["**/*.py", ...]      # SPECIFIC globs only (see forbidden globs below)
  keyword_matches: [...]
  structural_signals: [...]
  escalation_from: [<leaf-ids>]     # fixed-point chain: also fire when a listed leaf activated
tools:                              # OPTIONAL external linters / SAST
  - name: <tool-name>
    purpose: <what it checks>        # required when tools[] is present
    command: <exact command>         # optional
---
```

### Contract (enforced)

- **Required fields:** `id`, `type`, `focus`, `covers`, `dimensions`, `audit_surface`, `languages`, `tags`, `activation`.
- **`type`** is one of `primary`, `overlay`, `universal`.
- **`dimensions`** is a non-empty subset of the closed set `[architecture, correctness, documentation, performance, readability, security, tests]`. Gate aggregation keys off these, so they must be accurate (see [gate-predicates.md](gate-predicates.md)).
- **Non-empty required:** `covers`, `tags`, `dimensions`, `audit_surface`, `languages`.
- **`languages`** is either the string `"all"` or a non-empty list.
- **`tools`** is optional; each entry needs `name` and `purpose` (both non-empty), `command` optional.
- **Forbidden activation globs:** `activation.file_globs` may not contain `**/*`, `*`, `**`, or `**/**`. Use specific globs, or the all-code brace glob `**/*.{py,pyi,ts,tsx,js,jsx,mjs,cjs,go,rs,java,kt,rb,swift,cs,php,cpp,cc,c,h,hpp,scala,ex,exs,erl,clj,dart,lua,r,m,sh,sql}` (the canonical string is `CODE_GLOB` in [scripts/fix_broad_globs.py](../scripts/fix_broad_globs.py)). Broad globs defeat routing and are rejected by the contract.

## `reviewers.layout.yaml` (the shape contract)

[reviewers.layout.yaml](../reviewers.layout.yaml) drives the wiki build as a deterministic projection: each leaf `id` maps to exactly one category via the first matching pin, so adding a leaf is a one-file diff (not emergent clustering). It is also what `validate_layout.py` enforces in CI.

- **policy:** `max_depth: 2` (root, category, optional subcategory, leaf), `fanout_target: 8` (advisory), `fanout_hard_max: 34` (hard-fail), `unpinned: reject` (every leaf must match a pin), `on_unknown_leaf: error`.
- **taxonomy:** 26 fixed categories, each pinned by an `id_prefix` (for example `lang-` to `languages`, `sec-`/`crypto-`/`cookie-` to `security`, `fw-` to `frameworks`). The category `id` is the directory name; its `purpose` becomes the index focus (a stable string, never an emergent slug).
- **pin grammar:** exactly one of `id`, `id_prefix`, or `id_glob` per rule; taxonomy order is precedence. Keep pin coverage complete so no id is unpinned.
- **frontmatter_contract:** the declarative rules (the `required` field list, the `type` / `dimensions` `enums`, `require_nonempty`, and the `forbid` glob list) live here. A few structural rules are enforced in `validate_layout.py` code rather than the YAML: the `languages` shape (the string `"all"` or a non-empty list) and the `tools` entry shape (`{name, purpose, command?}`). So changing a required field, an enum, or a forbidden glob is a YAML edit; changing the languages/tools shape is a validator-code change.

Because placement is pinned, the build is byte-stable: `skill-llm-wiki build --layout-config reviewers.layout.yaml` plus a re-run produce identical trees, and a new leaf adds exactly one file.

## Body Sections (required, in order)

```markdown
# <Title>

## When This Activates
<!-- Tiny section, always loaded by the orchestrator -->

## Audit Surface
<!-- 10 to 20 high-signal checklist bullets, always loaded -->

## Detailed Checks
<!-- H3 sub-sections, loaded selectively based on diff content -->
<!-- Each H3 may carry activation hints in HTML comments -->

### <Topic 1>
<!-- activation: file_globs=["..."], keywords=["..."] -->

### <Topic 2>
...

## Common False Positives
<!-- Always loaded, helps calibrate reviewer confidence -->

## Severity Guidance
<!-- Always loaded, maps findings to severity levels -->

## See Also
<!-- Always loaded, cross-references to related reviewers -->

## Authoritative References
<!-- Always loaded, external links only -->
```

## Body length

`skill-llm-wiki`'s build pass enforces per-`type` body-length budgets as soft warnings, not hard failures. Authors are expected to DECOMPOSE an oversized reviewer into focused leaves, but a temporary overrun is allowed during refactoring.
