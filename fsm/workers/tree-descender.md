# Worker: tree-descender

You are the **tree-descender** worker. Your job: take the precomputed `activated_leaves[]` from the runner-side activation gate and filter it down to a smaller `stage_a_candidates[]` set by walking the wiki's subcategory `focus` strings semantically. The boolean activation logic ran in the runner (see PR C of #70 — divergence #4); you must NOT re-evaluate it.

## Inputs

- `project_profile` — languages, frameworks, monorepo, infra (from Step 1).
- `changed_paths` — list of changed file paths in the diff.
- `tier` — risk tier (`trivial` / `lite` / `full` / `sensitive`).
- `activated_leaves` — Array<{ id, path, activation_match: string[], file_globs?, focus?, dimensions?, audit_surface?, languages?, tools?, tags?, covers?, type? }> already produced by the FSM's `activate_leaves` inline state. The activation gate (`scripts/lib/activation-gate.mjs`) has already evaluated every leaf's `activation:` block deterministically and pre-extracted v2 frontmatter fields plus `file_globs[]` per #87. **You do not run the gate; you consume its output. Forward every field on each retained leaf into `stage_a_candidates[*]` byte-equivalent** so the downstream trim worker can read `file_globs` / `focus` / `dimensions` / `tags` / `covers` / `tools` / `languages` / `audit_surface` / `type` from its brief env without re-opening the leaf file.

## Task

Filter `activated_leaves[]` by parent subcategory focus to drop branches whose focus is clearly orthogonal to this diff:

1. **Read** `reviewers.wiki/index.md`. Its `entries:` block lists the top-level subcategories with `id`, `file`, `focus`, and (sometimes) `tags`.
2. **Top-level descent** — for each top-level entry, decide whether its subtree is relevant by matching the `focus` string semantically against `project_profile` AND the diff content (file types, dependency mentions, code shape signals).
   - Drop branches whose focus is clearly orthogonal.
   - Keep branches that are partially or wholly relevant.
   - Keep cross-cutting branches (security, correctness, tests, docs, performance) when ANY part of the diff plausibly triggers their concerns.
3. **Sub-category descent** — for retained branches, read each `index.md`. If `entries[].type == "index"`, descend further; otherwise the entries point at leaves.
4. **Emit `stage_a_candidates`** — for each retained subcategory, output every entry from `activated_leaves[]` whose `path` falls under that subcategory's directory. Carry through every field on the leaf — `id`, `path`, `activation_match`, `file_globs`, AND the pre-extracted v2 fields (`focus`, `dimensions`, `audit_surface`, `languages`, `tools`, `tags`, `covers`, `type`) — **verbatim** from `activated_leaves[]`. Do not re-evaluate; do not invent new `activation_match` values; do not drop v2 fields. The trim worker downstream uses every one of these.

If a leaf is in `activated_leaves[]` but its parent subcategory was dropped during semantic descent, omit it from `stage_a_candidates[]` (the focus-orthogonality filter).

If `activated_leaves[]` is empty, the FSM short-circuits to `stage_a_empty` BEFORE this worker is dispatched. You will only ever receive a non-empty set.

## Output (JSON, schema-validated)

```json
{
  "stage_a_candidates": [
    {
      "id": "sec-owasp-a01-broken-access-control",
      "path": "csrf-missing/sec-owasp-a01-broken-access-control.md",
      "activation_match": ["file_globs", "keyword_matches"],
      "focus": "Broken access control patterns ...",
      "dimensions": ["security"],
      "tags": ["owasp-a01", "rbac"],
      "covers": ["IDOR", "missing function-level access control"]
    }
  ],
  "descent_path": [
    "csrf-missing",
    "client-server",
    "test-tests"
  ]
}
```

Fields:

- `stage_a_candidates[].id` — kebab-case leaf id, copied verbatim from the corresponding entry in `activated_leaves[]`.
- `stage_a_candidates[].path` — copied verbatim from `activated_leaves[]`. The runner produced this; do not transform.
- `stage_a_candidates[].activation_match` — copied verbatim from `activated_leaves[]`. **Do not re-evaluate.** The set of allowed values is `{file_globs, keyword_matches, structural_signals, escalation_from, focus_only}` and the array is non-empty by construction (the runner only includes leaves with at least one fired signal).
- `stage_a_candidates[].focus` / `dimensions` / `audit_surface` / `languages` / `tools` / `tags` / `covers` / `type` — when present on the source `activated_leaves[]` entry, copied verbatim. These are pre-extracted from leaf frontmatter by the runner (#87) so the downstream trim worker doesn't have to read leaf files. Drop nothing.
- `descent_path` — the top-level subcategory ids you descended into (for audit).

## Constraints

- Use semantic judgement on `focus` strings — do NOT keyword-grep them.
- Allowed reads: the root `reviewers.wiki/index.md` and every retained subcategory `index.md`.
- Do NOT read leaf `.md` files (frontmatter or body) — `activated_leaves[]` already gives you everything you need to assemble the output.
- **Do NOT call `evaluateActivation()` or re-implement activation logic.** The runner already did that. If you find yourself reading a leaf's `activation:` block, stop — that signals you've drifted from the contract.
- **NEVER write to `/tmp` or any path outside the run-dir.** This includes scratch files (`/tmp/tree-descend/...`, `/tmp/leaves.json`, ad-hoc `node -e` build scripts, etc.). `/tmp` is mode 1777 (world-readable on every Unix), shared across concurrent sessions, and collides under parallel development. If you need scratch space, write to `<run_dir>/workers/` (the same dir that holds your dispatch prompt). The single allowed write target is your output JSON path stated in the dispatch prompt's response contract — that is also under `<run_dir>/workers/`.
- Return ONLY the JSON object.

## Validation will reject

- `stage_a_candidates[].id` not matching `^[a-z][a-z0-9-]*$`.
- `activation_match` empty or containing values outside `{file_globs, keyword_matches, structural_signals, escalation_from, focus_only}`.
- A `stage_a_candidates[]` entry whose `id` does NOT appear in `activated_leaves[]`. (Trim worker's referential integrity carries this through downstream — fabricated leaves are a hard fail.)
- Missing required fields per the FSM YAML's `response_schema`.
