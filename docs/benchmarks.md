# Benchmarks

**What + why:** This doc describes how we measure `skill-code-review`'s bug-finding quality against competing AI code reviewers on an open benchmark, the reproducible harness that drives it, and the no-regression gate that any reviewer-corpus change must clear. The point is honest, apples-to-apples measurement on the precision-recall frontier (catch real bugs, emit little noise), driven by the actual product runner rather than throwaway scripts. The numbers in the pilot snapshot below are reproducible via the harness, not committed artifacts.

## Dataset and judge

- **Dataset:** [`withmartian/code-review-benchmark`](https://github.com/code-review-benchmark) (open). Each entry is a bug-fix PR with human-verified golden comments. The pilot snapshot uses 5 PRs (one per repo): `cal.com-14943`, `discourse-1`, `grafana-80329`, `keycloak-32918`, `sentry-67876`. The benchmark's full set of 50 PRs is the **target** set for a declarative result, not a measured-and-committed one here.
- **Judge:** an Opus model, applied strictly under the Martian rule: a finding is a **true positive only if it matches a golden comment**; **every non-golden finding is a false positive**. This is a deliberately harsh precision metric. The judge input is assembled by [scripts/build_judge_input_prod.py](../scripts/build_judge_input_prod.py) and verdicts are aggregated by [scripts/score.py](../scripts/score.py).

## Harness layout (sharded tmp)

The harness lives under the gitignored `tmp/` directory (DATA only, regenerable, safe to delete). The path scheme is defined in exactly one place, [scripts/paths.py](../scripts/paths.py). A `run-id` is one variant or iteration (e.g. `prod`, `iter1`). The `shard` (written `<ab>` below) is the first 2 hex characters of `sha256(pr_id)`, so no single directory ever accumulates thousands of entries.

| Path | Holds |
|---|---|
| `tmp/repos/<ab>/<pr>/` | Materialized repo (shared across runs) |
| `tmp/runs/<run-id>/<ab>/<pr>/` | Product review output (`.skill-code-review` tree + run log) |
| `tmp/judge/<run-id>/<ab>/<pr>.json` | Judge verdict for (run-id, pr) |
| `tmp/judge/<run-id>/<ab>/_input_<pr>.json` | Judge input for (run-id, pr) |
| `tmp/results/<run-id>/` | Per-run leaderboard and metrics |

All driver scripts import `paths.py`, so the layout is never duplicated.

## How to run a pilot

Reviews are produced by the **product runner only** (`python -m code_review.cli review ...`), never by ad-hoc review scripts. The script sequence per PR:

1. **Materialize the repo** at the correct diff base via [scripts/setup_repo.py](../scripts/setup_repo.py). It clones the fork blobless and computes the true branch point as `git merge-base(base, head)` (the fork's `baseRefOid` drifts), then sanity-checks the file set against `gh pr diff --name-only`. The effective base is recorded as `base_diff`.

   ```bash
   python scripts/setup_repo.py <pr_id>
   ```

2. **Run the product review** into the run dir (compute `<ab>/<pr>` via `paths.repo_dir(pr)` / `paths.run_dir(run-id, pr)`):

   ```bash
   export GITHUB_TOKEN="$(gh auth token)"
   uv run python -m code_review.cli review \
     --repo tmp/repos/<ab>/<pr> --base <base_diff> --head <head> \
     --run-dir tmp/runs/<run-id>/<ab>/<pr> --backend claude --max-workers 8 --clean
   ```

3. **Build the judge input** from that run's `report.json` plus the committed competitor candidates, via [scripts/build_judge_input_prod.py](../scripts/build_judge_input_prod.py):

   ```bash
   python scripts/build_judge_input_prod.py <pr_id> <run-id>
   ```

4. Run the judge to produce each `tmp/judge/<run-id>/<ab>/<pr>.json` verdict, then **score** the run with [scripts/score.py](../scripts/score.py), which micro-averages precision, recall, F1, and false-positives-per-PR and writes `tmp/results/<run-id>/{metrics.json,leaderboard.md}`:

   ```bash
   python scripts/score.py <run-id>
   ```

## Competitors and skill variants

[scripts/build_judge_input_prod.py](../scripts/build_judge_input_prod.py) copies the **committed Opus-4.5 candidate sets** so every tool faces the same judge, apples-to-apples. The competitor set (see [build_judge_input_prod.py:30](../scripts/build_judge_input_prod.py#L30)) is:

`coderabbit`, `greptile-v4-1`, `bugbot`, `copilot`, `graphite`, `macroscope`, `cubic-v2`.

The skill is scored under three variants, all derived from the same product run:

- **skill-prod**: every issue the product emits (honest, false-positive-heavy headline).
- **skill-prod-primary**: only issues flagged `primary=True` by the rank stage (the selectivity gate).
- **skill-prod-scoped**: correctness/security findings whose severity is `critical` or `important`.

## Pilot snapshot (honest, reproducible)

The following is a 5-PR pilot slice. It is **reproducible via the harness above, not a committed artifact**, and it is **not** a full 50-PR result. The 5-PR slice is small, noisy, and favorable to the external leader; treat it as a current baseline, not a verdict.

On this 5-PR slice:

- **cubic-v2** (external leader): around **F1 0.83** (recall ~0.91, precision ~0.77, ~0.6 false positives per PR).
- **skill-prod-primary**: around **F1 0.46** (recall ~0.73, precision ~0.33, ~3.2 false positives per PR).

Recall is competitive; **precision/noise is the active optimization target**. Do not read this slice as a claim about the full 50 PRs.

## The no-regression gate

> **Any `reviewers.wiki` regeneration, or any corpus or structure change, MUST re-run the product reviewer on these SAME 5 codebases and confirm the result is BETTER or AT LEAST NOT WORSE on BOTH axes:**
>
> - **recall / coverage up (or equal), AND**
> - **false-positives-per-PR down (or equal).**
>
> **If either axis regresses, do NOT promote the regenerated wiki.**

This gate is **in addition to** the standing checks:

- `ruff` + `mypy` + `pytest` green.
- `skill-llm-wiki validate` reports 0 errors on the rebuilt tree.
- The standalone layout validator runs clean.
- Routing sanity holds (the strong-routed fraction is not inflated).

Corpus-wide changes (the SET or STRUCTURE of `reviewers.wiki`) are also **human-gated**: they require a written, statistically-justified proposal and explicit human confirmation before promotion.
