# Gate Predicates and the Release-Readiness Verdict

The reviewer turns a flat list of findings into a structured release-readiness
verdict by routing each picked reviewer leaf into one of 8 named gates, then
checking whether any leaf that contributes to a gate also raised a blocking
finding. This exists so a single GO / NO-GO answer can be derived
deterministically (no model judgement) from two facts the pipeline already
produced: which leaves were picked, and which leaves flagged critical or
important findings. The whole computation lives in one function,
[handle_synthesize_release_readiness](../code_review/handlers.py#L1266).

## The 8 gates

Gate names are fixed in
[`_GATE_NAMES`](../code_review/handlers.py#L49). A leaf contributes to a gate
when [`_gate_matches`](../code_review/handlers.py#L1195) returns true for that
gate number. Triggers are evaluated against the leaf's `dimensions[]` (the
closed set, see below) and against `tags_like` (n-grams of the leaf id, see
[How leaves map to gates](#how-leaves-map-to-gates)).

| # | Name | Dimension trigger | Tag triggers (any of) |
|---|------|-------------------|------------------------|
| 1 | SOLID & Clean Code | `readability` | `solid`, `dry`, `kiss`, `yagni`, `clean-code`, `naming`, `complexity` |
| 2 | Error Handling & Resilience | `correctness` (**AND** a tag) | `error-handling`, `resilience`, `fault-tolerance`, `retry`, `circuit-breaker`, `concurrency`, `async` |
| 3 | Code Quality & Type Safety | `correctness` | `type-safety`, `idioms`, `dead-code`, `language-quality`, `initialization`, `startup`, `shutdown` |
| 4 | Test Coverage | `tests` | (none; dimension only) |
| 5 | Architecture & Design | `architecture` or `performance` | `api-design`, `module-boundaries`, `dependencies`, `layering`, `ddd`, `microservices` |
| 6 | Security & Safety | `security` | `hooks-safety`, `supply-chain`, `dependencies-security` |
| 7 | Documentation | `documentation` | (none; dimension only) |
| 8 | Domain-specific quality | (none) | `cli`, `api`, `observability`; or any tag starting `domain-`; or leaf id starting `domain-` / `obs-` / `cli-` / `api-` |

Notes on the two irregular gates:

- **Gate 2** is the only **AND** gate: the leaf must carry the `correctness`
  dimension *and* match one resilience tag
  ([handlers.py:1207](../code_review/handlers.py#L1207)).
- **Gate 8** ignores dimensions entirely. It matches on tags, on a `domain-`
  tag prefix, or on the raw leaf id prefix
  ([handlers.py:1257](../code_review/handlers.py#L1257)).

## How leaves map to gates

Tag matching does not read a leaf's `tags[]` field. Instead
[`_tags_like_from_leaf`](../code_review/handlers.py#L1180) expands the leaf `id`
into a set of n-grams: the full id, each kebab segment, and every contiguous
2-, 3-, and 4-gram of segments. So a leaf id `error-handling-async` yields
`error-handling`, `handling-async`, `error-handling-async`, `error`,
`handling`, `async`, and so on. `_gate_matches` then tests those n-grams
against each gate's tag set.

Consequence: gate routing is driven by a leaf's **id and `dimensions[]`**, not
its free-form `tags[]`. A leaf only lands in a gate if its id segments happen to
form one of the listed tag tokens, or its dimensions match. Choosing accurate
ids and dimensions on `reviewers.src` leaves is what controls gating.

The per-gate loop is in
[handle_synthesize_release_readiness](../code_review/handlers.py#L1282): for
each gate number 1..8 it walks every `picked_leaf`, computes `tags_like`, and
collects the leaves for which `_gate_matches` is true. A leaf can contribute to
more than one gate.

## From findings to verdict

1. **Blocking leaves.** Scan `findings`; for every finding with `severity` in
   `{critical, important}`, add each leaf id in its `flagged_by[]` to the
   blocking set ([handlers.py:1272](../code_review/handlers.py#L1272)). `minor`
   findings never block.

2. **Per-gate status** ([handlers.py:1293](../code_review/handlers.py#L1293)):
   - **N/A** if no picked leaf contributes to the gate.
   - Otherwise `blocker_count` = number of contributing leaves whose id is in
     the blocking set.
   - **PASS** if `blocker_count == 0`, **FAIL** if `> 0`.

   Status values come from
   [`GateStatus`](../code_review/spec.py#L86) (`PASS` / `FAIL` / `N/A`).

3. **Final verdict** ([handlers.py:1323](../code_review/handlers.py#L1323)):
   **NO-GO** if any gate is FAIL **or** the upstream `coverage_rule_violated`
   flag is true; otherwise **GO**. (N/A gates never force NO-GO.) This handler
   emits only `GO` or `NO-GO` from [`ReviewVerdict`](../code_review/spec.py#L54).

The output is `{"gates": [...8...], "verdict": "GO" | "NO-GO"}`, and the schema
pins the array to exactly 8 entries
([spec.py:678](../code_review/spec.py#L678)).

## Why dimensions and tags matter

Because routing keys off `dimensions[]` and the leaf id, a reviewer leaf that
declares the wrong dimension (or whose id does not contain a recognised tag
token) will silently fall outside the gate you expect, and its findings will
not be able to FAIL that gate. The `dimensions` vocabulary is closed to
`[architecture, correctness, documentation, performance, readability, security,
tests]`, enforced by the frontmatter contract in
[`reviewers.layout.yaml`](../reviewers.layout.yaml#L31). Get the dimensions and
id right when authoring leaves. See [SCHEMA.md](./SCHEMA.md) for the full leaf
frontmatter contract.
