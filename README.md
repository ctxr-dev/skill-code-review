# skill-code-review

An AI code-review skill built to solve the problem every reviewer trades against:
**catch the real bugs (recall) without burying them in noise (precision).** It
does this with a deterministic state machine that routes a diff to the few
specialist reviewers that matter, runs them in parallel, collects their findings
algorithmically, and lets a neutral ranker decide the block-worthy few — producing
a `GO` / `CONDITIONAL` / `NO-GO` verdict.

## Why it works

Most reviewers are one prompt over a whole diff: they either over-report (noise) or
miss bugs outside their attention. This skill separates the concerns:

- **Wiki-routed expertise.** A corpus of ~470 leaf reviewers (`reviewers.wiki/`),
  each an expert on one concern (a language, framework, security class, footgun,
  reliability pattern). A diff activates only the relevant leaves, so every line is
  reviewed by a specialist that knows what to look for — not a generalist.
- **100% coverage, in parallel.** Every changed file is sharded into review units
  and dispatched concurrently through an adaptive thread pool. Ten files or a
  thousand — all reviewed; a failed unit is recorded, never silently dropped.
- **Deterministic collection + neutral ranking.** Findings are merged
  algorithmically (location + embedding dedup), then a neutral ranker — which has no
  stake in any finding — scores each by defect confidence and marks the
  block-worthy `primary` set. Recall lives in the specialists; precision lives in
  the ranker. Selectivity, not suppression: secondary findings stay as advisory.
- **Fault-tolerant + agent-agnostic.** Rate-limits, timeouts, and context overflow
  retry/back-off or degrade gracefully; the same review runs on Claude, Codex,
  Cursor, or a raw Anthropic/OpenAI API.

## How it works

A diff flows through a 19-state FSM (the [`ctxr-fsm`](https://github.com/ctxr-dev/fsm)
engine). Deterministic steps run as inline Python; the reasoning steps are LLM
workers; the specialist fan-out is a parallel loop:

`scan project` → `triage risk tier` → `activate leaves` (deterministic gate over
the corpus) → `tree-descend` + `trim` (pick the relevant leaves from metadata) →
`tool discovery` (optional linters) → **`dispatch specialists`** (parallel, one
sub-agent per leaf-unit, 100% file coverage) → `collect findings` (dedup) →
**`rank findings`** (neutral confidence + `primary` selection) → `verify coverage`
→ `synthesize verdict` (8 release gates) → write report.

The orchestration (FSM driving + adaptive `ThreadPoolExecutor` + agent dispatch)
lives in the Python package; every reviewer/worker prompt lives in a `.md` file.
See [`SKILL.md`](SKILL.md) for the full state choreography.

## Run a review

```bash
# In the repo you want to review:
python -m code_review.cli review \
  --repo . --base <base-sha> --head <head-sha> \
  --run-dir . --backend claude
```

`--backend` is one of `claude` (default), `codex`, `cursor`, `anthropic`, `openai`.
Useful flags: `--max-workers N` (concurrency), `--tools silent|skip` (external
linters), `--clean` (fresh run). The report is written under
`<run-dir>/.skill-code-review/…` and printed to stdout.

Alternatively, drive it from an MCP-capable client via [`SKILL.md`](SKILL.md)
(bootstrap `ctxr-fsm`, `install`, then the FSM run loop).

## How it compares (benchmark)

Measured on the open [`withmartian/code-review-benchmark`](https://github.com/withmartian/code-review-benchmark)
(50 bug-fix PRs across 5 repos/languages, ~136 human-verified "golden" bugs). The
judge is strict: a finding counts only if it matches a golden bug, and **every
non-golden finding is a false positive** — so this rewards catching real bugs while
staying quiet. Full-50 numbers (committed competitor sets, same judge):

| reviewer | recall | precision | F1 |
|---|---|---|---|
| Cubic (leader) | 0.69 | 0.56 | **0.62** |
| Qodo-extended | 0.61 | 0.55 | 0.58 |
| Augment | 0.61 | 0.47 | 0.54 |
| Macroscope | 0.44 | 0.48 | 0.46 |
| Bugbot | 0.44 | 0.47 | 0.45 |
| Greptile | 0.48 | 0.40 | 0.44 |
| CodeRabbit | 0.40 | 0.35 | 0.40 |

**What this means.** No tool is both high-recall and high-precision — that is the
unsolved compromise. The leader, Cubic, sits at F1 0.62 by being *balanced* (~3.5
findings/PR), not by being conservative. This skill targets the same frontier:
on a 5-PR pilot its `primary` set reaches **recall 0.73 / precision 0.57** —
second only to Cubic on recall and ahead of CodeRabbit, Copilot, Greptile, and
Bugbot — with the headline gap to Cubic being precision, much of which is the
skill surfacing *real bugs the golden set simply does not list* (the harsh metric
penalises thoroughness). A full-50 head-to-head is the definitive test and is the
next milestone; the optimization loop that drives it is the
[`scr-benchmark-optimizer`](.agents/skills/scr-benchmark-optimizer/SKILL.md) skill.

## Report

Each review emits markdown + JSON: the verdict, findings by severity with clickable
`file:line` links (title, impact, fix, originating specialist, `primary` flag),
external tool results, per-specialist results, the 8 release gates, and a
file×specialist coverage matrix. Schema: [`report-format.md`](report-format.md).

## More

- [`SKILL.md`](SKILL.md) — entry point: bootstrap + the FSM run loop.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — dev setup, FSM authoring, the reviewer
  corpus pipeline.
- Extending the reviewer corpus — the
  [`scr-reviewers-wiki-authoring`](.agents/skills/scr-reviewers-wiki-authoring/SKILL.md)
  skill (frontmatter, activation, build/validate, what makes a good leaf).

MIT — see [`LICENSE`](LICENSE).
