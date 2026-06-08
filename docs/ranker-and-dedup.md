# Finding Collection and Ranking

**What + why:** Findings flow through two consecutive states. Stage 1 (`collect_findings`) is a
deterministic inline handler that dedups, semantically merges, and runs a first selectivity pass to
cut obvious duplicates cheaply. Stage 2 (`rank_findings`) is an LLM worker that re-scores each
finding's defect-confidence from a neutral stance, adjudicates residual duplicates, and marks the
block-worthy set, then is adversarially verified. Together they are the precision lever: specialists
favour recall, these two stages control noise.

## Stage 1: `collect_findings` (deterministic)

Inline handler `handle_collect_findings` at
[handlers.py:929](../code_review/handlers.py#L929). State wiring at
[spec.py:1202](../code_review/spec.py#L1202). Output is `findings`, `severity_counts`, and
`primary_count` ([handlers.py:1019](../code_review/handlers.py#L1019)).

### Primary dedup key

The dedup key is `(file, line, normalised(title))`
([_dedup_key, handlers.py:797](../code_review/handlers.py#L797); `_normalise_title` lowercases and
collapses whitespace at [handlers.py:791](../code_review/handlers.py#L791)). On a key collision,
`_pick_winner` ([handlers.py:804](../code_review/handlers.py#L804)) chooses by severity rank
(`_SEVERITY_RANK` = critical 3, important 2, minor 1 at
[handlers.py:71](../code_review/handlers.py#L71)), tie-breaking on the earliest specialist
(`__origin`). The merge loop unions the `flagged_by` set across the colliding specialists
([handlers.py:945](../code_review/handlers.py#L945)).

### Semantic merge

The `(file, line, title)` key misses the SAME bug worded differently by different leaves, which
inflates the count. `_semantic_merge` ([handlers.py:861](../code_review/handlers.py#L861), invoked at
[handlers.py:986](../code_review/handlers.py#L986)) runs a union-find within the same file, merging two
findings when they share an exact location OR are similar: embedding cosine `>= 0.80` when the
`CTXR_SCR_EMBED_CMD` hook is configured, else token Jaccard `>= 0.5`
([handlers.py:892](../code_review/handlers.py#L892)). The representative is the highest-severity then
highest-confidence member; `flagged_by` is unioned and `confidence` is taken as the max across members
([handlers.py:908](../code_review/handlers.py#L908)).

### Selectivity gate (the `primary` flag)

The selectivity gate ([handlers.py:989](../code_review/handlers.py#L989)) sets each finding's
`corroboration` (= `len(flagged_by)`) and the `primary` (block-worthy) flag. A finding is `primary`
when `defect_confidence >= primary-threshold` (default `0.75`, from
[handlers.py:996](../code_review/handlers.py#L996)) OR `severity == critical` OR
(`severity == important` AND `corroboration >= 2`)
([handlers.py:1004](../code_review/handlers.py#L1004)). When the specialist supplied a `confidence`,
that decides; otherwise it falls back to the severity + corroboration rule.

## Stage 2: `rank_findings` (LLM second opinion)

Worker state at [spec.py:1217](../code_review/spec.py#L1217); dispatched at
[dispatch.py:308](../code_review/dispatch.py#L308). The purpose is to neutrally score each finding's
`defect_confidence` (specialist self-confidence is biased), adjudicate any residual suspected
duplicates, and re-mark the `primary` set. It is a SECOND opinion, and it is adversarially verified.

### Compact decisions, then re-attach

Re-emitting full finding text from the model is a large, slow generation that blew the call timeout, so
the dispatcher sends only a COMPACT indexed view: `id`, `severity`, `file`, `line`, `title`, a
truncated `description`, `flagged_by`, and `corroboration`
([dispatch.py:312](../code_review/dispatch.py#L312)). The worker returns compact decisions
`{i, defect_confidence, primary, drop?}`. `_apply_rank_decisions`
([dispatch.py:239](../code_review/dispatch.py#L239)) re-attaches the full finding text by index:

- A finding marked `drop` is removed ([dispatch.py:262](../code_review/dispatch.py#L262)).
- A missing `defect_confidence` falls back to a severity-based default via `_default_conf`
  (critical 0.9, important 0.7, minor 0.25, else 0.5 at
  [dispatch.py:232](../code_review/dispatch.py#L232)).
- A finding the model omitted entirely keeps that default, so a partial response never silently loses a
  real finding.
- `primary` defaults to `defect_confidence >= primary-threshold` when the model omits it
  ([dispatch.py:268](../code_review/dispatch.py#L268)).

### Adversarial verifier

The worker is gated by a verifier ([spec.py:1253](../code_review/spec.py#L1253),
[verifiers/rank_findings.md](../code_review/verifiers/rank_findings.md)). It rejects the ranking if:
no real (non-duplicate) finding was silently dropped, `primary` is inconsistent with
`defect_confidence` vs the threshold, `severity`/`file`/`title` were not preserved, or a pure
style/naming/docs nit was marked `primary`. Real bugs must be DEMOTED via low `defect_confidence` and
`primary=false`, never silently removed.

## Why two stages

`collect_findings` is deterministic: dedup, merge, and a first selectivity pass cut obvious duplicates
cheaply and reproducibly, with no model cost. `rank_findings` is the LLM second opinion that scores
confidence and trims residual noise the deterministic pass cannot catch, and it is then adversarially
verified so the trim cannot silently lose coverage. Splitting them keeps the cheap, exact work out of
the model and confines the expensive, judgment-heavy work to one verified state. This is the precision
lever (noise control) on top of the recall-favouring specialists.
