# CLI and Agent-Agnostic Dispatch

The `review` CLI ([cli.py](../code_review/cli.py)) is the single entry point that runs a code review: it resolves paths, builds the two dispatcher callables, and hands them to the FSM runner. The dispatch layer ([dispatch.py](../code_review/dispatch.py)) keeps the runner model-agnostic: it wires each per-worker and per-specialist LLM call to whatever agent the user has (Claude Code, Codex, Cursor, or a raw Anthropic/OpenAI API), loads every prompt from disk (never hardcoded), routes each call to a strong or cheap model tier, compacts oversized inputs before sending, and normalises rate-limit / context-overflow conditions into the runner's typed errors so the adaptive thread pool can react.

## The `review` CLI

Invoke as `python -m code_review.cli review ...` ([cli.py:52](../code_review/cli.py#L52)). `cmd_review` ([cli.py:22](../code_review/cli.py#L22)) resolves `--repo` and `--run-dir` to absolute paths, optionally cleans, builds dispatchers, and calls `run_review`. The `--repo` is the diff cwd / project root (so `git diff base..head` runs there); artefacts land under `<run-dir>/.skill-code-review`, leaving the repo pristine ([cli.py:33](../code_review/cli.py#L33)).

| Flag | Required | Default | Notes |
| --- | --- | --- | --- |
| `--repo` | yes | (none) | Path to the repo under review; resolved to absolute ([cli.py:24](../code_review/cli.py#L24)). |
| `--base` | yes | (none) | Diff base ref/sha. |
| `--head` | yes | (none) | Diff head ref/sha. |
| `--run-dir` | yes | (none) | Artefact storage root; resolved to absolute ([cli.py:25](../code_review/cli.py#L25)). |
| `--backend` | no | `claude` | One of `claude`, `codex`, `cursor`, `anthropic`, `openai` (choices come from `sorted(BACKENDS)`, [cli.py:57](../code_review/cli.py#L57)). |
| `--max-workers` | no | `8` | Adaptive pool ceiling ([cli.py:59](../code_review/cli.py#L59)). |
| `--min-workers` | no | `1` | Adaptive pool floor ([cli.py:60](../code_review/cli.py#L60)). |
| `--tools` | no | `silent` | Passed through into runner args ([cli.py:35](../code_review/cli.py#L35)). |
| `--clean` | no | off | Wipes `<run-dir>/.skill-code-review` before running, for a fresh cache-free run ([cli.py:26](../code_review/cli.py#L26)). |

The backend is wired in via `make_dispatchers(repo, wiki, base=..., head=..., backend=a.backend)` ([cli.py:29](../code_review/cli.py#L29)). On exit `cmd_review` prints a JSON summary and returns `2` if the run faulted, else `0` ([cli.py:46](../code_review/cli.py#L46)).

## Agent-agnostic backends

A backend is just a callable `run(prompt, cwd, tier) -> final_text`, where `tier` is `"strong"` or `"cheap"` ([dispatch.py:29](../code_review/dispatch.py#L29)). The `BACKENDS` registry maps each name to its run function ([dispatch.py:149](../code_review/dispatch.py#L149)); `make_dispatchers` accepts either a name in `BACKENDS` or a run callable directly ([dispatch.py:304](../code_review/dispatch.py#L304)).

| Backend | Transport | strong tier | cheap tier |
| --- | --- | --- | --- |
| `claude` | `claude -p <prompt> --output-format json --permission-mode bypassPermissions --model <m>` ([dispatch.py:68](../code_review/dispatch.py#L68)) | `opus` | `sonnet` |
| `codex` | `codex exec -C <cwd> -s read-only --skip-git-repo-check -o <last>` ([dispatch.py:86](../code_review/dispatch.py#L86)) | env `CTXR_CODEX_MODEL_STRONG` | env `CTXR_CODEX_MODEL_CHEAP` |
| `cursor` | `cursor-agent -p <prompt> --output-format json` ([dispatch.py:105](../code_review/dispatch.py#L105)) | env `CTXR_CURSOR_MODEL_STRONG` | env `CTXR_CURSOR_MODEL_CHEAP` |
| `anthropic` | Anthropic Messages API ([dispatch.py:126](../code_review/dispatch.py#L126), wrapped at [dispatch.py:153](../code_review/dispatch.py#L153)) | `CTXR_ANTHROPIC_MODEL_STRONG` or `claude-opus-4-8` | `CTXR_ANTHROPIC_MODEL_CHEAP` or `claude-sonnet-4-6` |
| `openai` | OpenAI Chat Completions API ([dispatch.py:137](../code_review/dispatch.py#L137), wrapped at [dispatch.py:154](../code_review/dispatch.py#L154)) | `CTXR_OPENAI_MODEL_STRONG` or `gpt-5.2` | `CTXR_OPENAI_MODEL_CHEAP` or `gpt-5.2-mini` |

For the `claude` backend, `opus` is used for `"strong"` and `sonnet` for `"cheap"` (default `sonnet` for any unknown tier, [dispatch.py:69](../code_review/dispatch.py#L69)). The `anthropic` / `openai` API backends do not run tools: `cwd` is unused, so the prompt must be self-contained ([dispatch.py:125](../code_review/dispatch.py#L125)).

Every subprocess call is bounded by `_CALL_TIMEOUT`, read from env `CTXR_SCR_CALL_TIMEOUT` (default `600` seconds) ([dispatch.py:35](../code_review/dispatch.py#L35)); a `TimeoutExpired` surfaces as `RateLimitError` so the resilient retry kicks in ([dispatch.py:74](../code_review/dispatch.py#L74)).

## Prompt loading

Prompts are never hardcoded. `_load_prompt(role)` reads `code_review/workers/<role>.md` via `importlib.resources` ([dispatch.py:51](../code_review/dispatch.py#L51)). The worker role per FSM state comes from `_ROLE_BY_STATE` ([dispatch.py:37](../code_review/dispatch.py#L37)).

- General worker dispatch ([dispatch.py:307](../code_review/dispatch.py#L307)): `prompt = worker_prompt + "## RUN INPUTS" + compact JSON + _OUTPUT_RULE` ([dispatch.py:330](../code_review/dispatch.py#L330)). The output rule forbids prose, markdown fences, and file writes, demanding a single raw JSON object ([dispatch.py:44](../code_review/dispatch.py#L44)).
- `rank_findings` is special-cased ([dispatch.py:308](../code_review/dispatch.py#L308)): instead of re-emitting findings (a large, slow, corruptible generation), it sends compact per-index entries and expects `{"decisions":[...]}`, then re-attaches scores deterministically. See the ranker-and-dedup doc.
- Specialist dispatch ([dispatch.py:344](../code_review/dispatch.py#L344)): `prompt = specialist_prompt + the leaf body + review-target files + project profile + output rule`. The leaf body is the literal file at `reviewers.wiki/<leaf.path>` ([dispatch.py:350](../code_review/dispatch.py#L350)).

## Tier routing

`_route_tier(leaf_id, dimensions)` ([dispatch.py:289](../code_review/dispatch.py#L289)) picks the model tier for each specialist. It returns `"strong"` when:

- `"security"` or `"correctness"` is in the leaf's `dimensions`, OR
- `leaf_id` matches `^(sec-|lang-|fw-|orm-|footgun-|reliability-|data-)`, OR
- `leaf_id == "principle-fail-fast"`.

Otherwise it returns `"cheap"` ([dispatch.py:295](../code_review/dispatch.py#L295)). The chosen tier is passed to `run(...)` at [dispatch.py:359](../code_review/dispatch.py#L359). All worker (non-specialist) calls run on the `"cheap"` tier ([dispatch.py:326](../code_review/dispatch.py#L326), [dispatch.py:333](../code_review/dispatch.py#L333)).

## Input compaction and rehydration

Leaf lists carry verbose frontmatter (notably `covers[]` and `audit_surface`). Sent raw, a ~130-leaf list blows past any char budget and gets truncated mid-array, silently dropping alphabetically-late leaves (the `lang-*` / `sec-*` / `footgun-*` correctness and security ones) ([dispatch.py:181](../code_review/dispatch.py#L181)).

- `_compact_inputs` walks the leaf-list keys (`activated_leaves`, `stage_a_candidates`, `candidate_leaves`) and strips the heavy keys (`covers`, `audit_surface`), keeping only a thin 3-item `covers` hint ([dispatch.py:188](../code_review/dispatch.py#L188), [dispatch.py:193](../code_review/dispatch.py#L193)).
- The serialised prompt is also hard-capped at `_WORKER_INPUT_CAP` (160k chars) as a safety net ([dispatch.py:190](../code_review/dispatch.py#L190), [dispatch.py:332](../code_review/dispatch.py#L332)).
- After dispatch, `_rehydrate` re-attaches full leaf metadata from the deterministic source set, keyed by `id`; the LLM's own fields (justification, dimensions, activation_match) win over the source copy ([dispatch.py:215](../code_review/dispatch.py#L215)). This runs for `tree_descend` (`stage_a_candidates`) and `llm_trim` (`picked_leaves`) ([dispatch.py:336](../code_review/dispatch.py#L336)).

## Error classification

`_raise_for_signal(text)` inspects response text and raises the runner's typed errors ([dispatch.py:55](../code_review/dispatch.py#L55)):

- `"rate"` + `"limit"`, or `"429"`, or `"overloaded"` -> `RateLimitError`.
- `"context"` plus one of `"overflow"` / `"too long"` / `"exceed"` (also `"prompt is too long"` / `"maximum context"`) -> `ContextOverflowError`.

`_parse_json(text)` extracts the JSON object from an agent's final text ([dispatch.py:158](../code_review/dispatch.py#L158)). It tolerates markdown code fences, then takes the substring between the first `{` and the last `}` ([dispatch.py:168](../code_review/dispatch.py#L168)). An empty response raises `RateLimitError` ([dispatch.py:167](../code_review/dispatch.py#L167)); a `JSONDecodeError` is first re-run through `_raise_for_signal` (to reclassify rate-limit / overflow phrasing) and otherwise becomes a `RateLimitError` ([dispatch.py:175](../code_review/dispatch.py#L175)). Both empty and unparseable responses are treated as transient agent failures so the runner's resilient retry re-attempts instead of crashing the whole review.

Specialist outputs are run through `_strip_nulls` before return ([dispatch.py:361](../code_review/dispatch.py#L361)): LLMs often emit optional fields as `null`, which the merge schema rejects, so dropping null keys is the schema-safe normalisation ([dispatch.py:276](../code_review/dispatch.py#L276)).
