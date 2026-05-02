---
name: skill-code-review
description: Use when completing tasks, implementing major features, or before merging to verify work meets requirements. Runs an FSM-driven, deterministic, manifest-producing code-review pipeline via scripts/run-review.mjs. The runner stages every intermediate (brief, agent dispatch prompt, worker output) under <run_dir>/workers/. The orchestrator drives a shell loop using --print-run-dir / --print-current-state / --print-dispatch-prompt and never writes to /tmp. The LLM is a worker, not the orchestrator.
---

# skill-code-review

## Run this command first

```
node scripts/run-review.mjs --start --base <BASE> --head <HEAD> [--<key>=<value>...]
```

Defaults: `--base` is the merge-base with `origin/main` (or `HEAD~1`); `--head` is `HEAD`. Pass any other args from the table at the bottom as `--<key>=<value>`. Do not invent flags.

The runner emits one JSON object per stdout line. Loop until `{"status": "terminal", ...}`:

### On `{"status": "awaiting_worker", "run_id": "<id>", "brief": {...}}`

**The runner has staged everything you need on disk under `<run_dir>/workers/`.** You do not read worker prompt files, you do not compose prompts from `prompt_body` + inputs, and you do not reach for `python3 -c` to parse the brief. Use the `--print-X` CLIs (below) for runner state — `--print-run-dir`, `--print-current-state`, `--print-dispatch-prompt` — and reserve `jq` for the few small leaf reads the loop needs (`.run_id` from `--start`'s envelope, `.inputs.picked_leaves[].id` for the `dispatch_specialists` fan-out, `.outputs_path` if you ever need it directly). Your dispatch loop is:

```bash
# After --start, capture run_id (one short string) into a SHELL VARIABLE.
START_OUT=$(node scripts/run-review.mjs --start --base "$BASE" --head "$HEAD")
RUN_ID=$(echo "$START_OUT" | jq -r .run_id)
RUN_DIR=$(node scripts/run-review.mjs --print-run-dir --run-id "$RUN_ID")

# Loop until terminal.
while true; do
  STATE=$(node scripts/run-review.mjs --print-current-state --run-id "$RUN_ID")
  case "$STATE" in
    terminal|faulted) break ;;
  esac

  if [ "$STATE" = "dispatch_specialists" ]; then
    # Specialist dispatch is a BATCHED fan-out: at most 10 Agents in
    # flight at any moment (thread-pool model). Each specialist writes
    # its JSON output to its own per-leaf file; the runner aggregates
    # on --continue. The orchestrator no longer assembles JSON.
    # See the "Special case" section below for the full pattern.
    while true; do
      BATCH=$(node scripts/run-review.mjs --print-pending-leaf-ids --run-id "$RUN_ID")
      [ -z "$BATCH" ] && break
      # Dispatch one Agent per id in $BATCH (≤10 ids per call).
      # All Agents in a single orchestrator message run in parallel.
      # Each Agent's prompt is the small shim text from
      # --print-agent-shim-prompt; the Agent reads the full per-leaf
      # prompt from disk and writes its JSON output to the per-leaf
      # output path (both stated inside the shim).
      for ID in $BATCH; do
        SHIM=$(node scripts/run-review.mjs --print-agent-shim-prompt --run-id "$RUN_ID" --leaf-id "$ID")
        # ... dispatch Agent with $SHIM as the prompt parameter ...
      done
      # After all batch Agents return, loop to fetch the next batch.
    done
  else
    # The runner has pre-staged the agent prompt at
    # $RUN_DIR/workers/$STATE-dispatch-prompt.md. Read it as a single string
    # and dispatch via the Agent tool. The worker must write its JSON
    # response to brief.outputs_path (also stated inside the prompt, at
    # $RUN_DIR/workers/$STATE-output.json).
    PROMPT=$(node scripts/run-review.mjs --print-dispatch-prompt --run-id "$RUN_ID")
    # ... dispatch Agent with $PROMPT; agent writes its output to outputs_path ...
  fi

  # Continue. Runner reads from the canonical outputs path automatically.
  node scripts/run-review.mjs --continue --run-id "$RUN_ID"
done

# Loop exited on terminal OR faulted. Only terminal runs have a real
# report.md; faulted runs may have an incomplete or missing one.
if [ "$STATE" = "terminal" ]; then
  cat "$RUN_DIR/report.md"
  echo "Manifest: $RUN_DIR/manifest.json"
else
  # Faulted: surface the manifest's fault state to the user verbatim.
  jq . "$RUN_DIR/manifest.json"
fi
```

**The brief is at `$RUN_DIR/workers/$STATE-brief.json`** if you need to inspect any field directly (`outputs_path`, `worker.response_schema`, etc.). For non-`dispatch_specialists` states, the dispatch prompt is at `$RUN_DIR/workers/$STATE-dispatch-prompt.md` — the literal text to feed to the Agent tool. **For `dispatch_specialists` the prompt path differs** (it's per-leaf and possibly per-shard) and the orchestrator drives a batched loop via `--print-pending-leaf-ids` / `--print-agent-shim-prompt` rather than reading the brief's `picked_leaves[]` directly; see the "Special case" subsection below for the full pattern. **Both brief and prompt are canonical**; stdout is a redundant convenience.

#### Special case: `STATE === "dispatch_specialists"` — batched fan-out

Specialist dispatch is a fan-out with three runner-side guarantees that change how you drive the loop versus other worker states:

1. **Per-leaf staged prompts.** The runner stages one prompt per picked leaf at `$RUN_DIR/workers/dispatch_specialists-prompt-<leaf-id>.md` (or per-shard at `<leaf-id>--<shard-idx>.md` when a leaf's filtered diff exceeds the shard threshold; see "Diff sharding" below). Each per-leaf prompt already contains the leaf body, project profile, changed paths, tool results, and the pre-computed filtered diff for that leaf's `activation.file_globs[]`. For the rare leaf that omits `file_globs`, the runner falls back to the full diff.
2. **Per-leaf output files.** Each specialist Agent writes its JSON output to `$RUN_DIR/workers/dispatch_specialists-output-<leaf-id>.json` (or `dispatch_specialists-output-<leaf-id>--<shard-idx>.json` for shards). The runner aggregates all per-leaf outputs into `specialist_outputs[]` on `--continue`. **The orchestrator does not assemble JSON.**
3. **Concurrency cap of 10.** The runner exposes pending work via `--print-pending-leaf-ids` capped at `--batch-size 10`. The orchestrator dispatches up to 10 Agents in one parallel message, waits for the batch, then asks for the next batch. K=20 → 2 batches; K=30 → 3. **You never have more than 10 specialist Agents in flight.**

The orchestrator's loop, **preferred form** using `--print-batch-envelope` (one Node call per batch returns batch ids, shim prompts, AND progress in a single JSON envelope):

```bash
while true; do
  ENV=$(node scripts/run-review.mjs --print-batch-envelope --run-id "$RUN_ID")
  # Envelope is JSON: { batch: [...], shims: { id: prompt, ... },
  #                     remaining_after: N, total_pending: M }
  # Empty batch [] → exit the loop. (remaining_after === 0 also signals
  # "this is the final batch" if you want to log progress.)
  BATCH_LEN=$(echo "$ENV" | jq -r '.batch | length')
  [ "$BATCH_LEN" -eq 0 ] && break

  # For each id in .batch, dispatch ONE Agent with the matching shim
  # prompt from .shims. All Agents in a single orchestrator message
  # run in parallel. The shim prompt is small (≤200 tokens); the
  # Agent reads the staged dispatch prompt from disk and writes its
  # JSON output to the per-leaf output path stated inside the shim.
  for ID in $(echo "$ENV" | jq -r '.batch[]'); do
    SHIM=$(echo "$ENV" | jq -r --arg id "$ID" '.shims[$id]')
    # ... pass $SHIM as the Agent tool call's `prompt` parameter ...
  done
  # After all dispatched Agents in the batch complete, loop. The
  # next --print-batch-envelope call sees the now-written outputs
  # and returns the next pending batch (or [] when done).
done

# --continue triggers the runner-side aggregation. The runner walks
# every picked_leaf, reads the per-leaf output (or per-shard outputs
# for sharded leaves and merges them), and commits the aggregate as
# specialist_outputs[]. Missing outputs surface as `failed` rows.
node scripts/run-review.mjs --continue --run-id "$RUN_ID"
```

**Older `--print-pending-leaf-ids` + per-id `--print-agent-shim-prompt` flow** (still supported, useful when you only want plaintext ids without the JSON envelope):

```bash
while true; do
  BATCH=$(node scripts/run-review.mjs --print-pending-leaf-ids --run-id "$RUN_ID")
  [ -z "$BATCH" ] && break
  for ID in $BATCH; do
    SHIM=$(node scripts/run-review.mjs --print-agent-shim-prompt --run-id "$RUN_ID" --leaf-id "$ID")
    # ... pass $SHIM as the Agent tool call's `prompt` parameter ...
  done
done
```

**Why prefer `--print-batch-envelope`.** One Node invocation per batch instead of `1 + N` (one to list ids, plus one per id to fetch its shim). On a K=20 review that's 2 calls instead of 22 per loop iteration; the orchestrator transcript shrinks accordingly. The envelope's `total_pending` / `remaining_after` fields make progress visible without extra CLI calls.

**Concurrency cap.** Both modes return at most 10 ids per call (override with `--batch-size N`, max 50). The cap is enforced runner-side: the orchestrator cannot dispatch more than 10 specialists in one message because it is given at most 10 ids to dispatch.

**Why specialists write per-leaf instead of returning JSON.** Concurrent K specialists writing into one orchestrator-aggregated heredoc is fragile: a failed Agent loses its slot; JSON-string quoting breaks on multi-line code samples in `description` / `fix`; orchestrator-side aggregation is opaque to audit. Per-leaf files are observable on disk, resilient to orchestrator-side losses, and let the runner aggregate deterministically on `--continue`.

**Diff sharding.** When a leaf's `activation.file_globs[]` matches many changed files AND the resulting filtered diff exceeds the runner's shard threshold (default 256KB; overridable via `SPECIALIST_DIFF_SHARD_THRESHOLD_BYTES`), the runner splits the diff at file boundaries into shards: `dispatch_specialists-prompt-<leaf-id>--<shard-idx>.md` and matching output files. The default threshold is intentionally large so that most refactor PRs dispatch ONE Agent per leaf reviewing all matching files — the cross-file picture catches duplication / consistency issues that per-file shards would miss. `--print-pending-leaf-ids` and `--print-batch-envelope` return `<leaf-id>--<shard-idx>` per shard when sharding fires; each shard's Agent sees only its own subset of files. Per-shard outputs merge into one specialist row in the report. Sharding is automatic — the orchestrator doesn't need to detect or branch on it.

**No augmentation.** The staged per-leaf prompt is complete. **Do not concatenate, do not add a fresh `git diff`, do not aggregate JSON yourself.** If you find yourself running `git diff` or composing `{ specialist_outputs: [...] }` during a specialist dispatch, you are on the wrong path.

**Do NOT** dispatch a single Agent for `dispatch_specialists` to "simulate" K specialists internally — you would be re-introducing the coordinator-layer opacity that the audit in #70 (divergence #3) surfaced. The orchestrator's tool-use trace must show K real Agent dispatches across the batches.

### On `{"status": "terminal", "run_id": "<id>", "verdict": "...", "run_dir_path": "<path>"}`

1. Verify the run is real:

   ```
   node scripts/assert-fresh-run.mjs --run-id <run_id> --base <BASE> --head <HEAD>
   ```

   Exit 0 means OK. Exit non-zero means stop and surface the error.

2. Read `<run_dir_path>/report.md`.
3. **Your final response is the literal bytes of `<run_dir_path>/report.md`, followed by exactly one trailing line: `Manifest: <run_dir_path>/manifest.json`. Nothing more, nothing less.** Do not edit, paraphrase, summarise, reformat, transpose columns, drop rows, or "polish" the report. If a column or table seems redundant, that is not your call. The runner produced the report in this exact shape on purpose; your job is to surface it byte-for-byte. If `report.md` is too long for your context, link to its path instead — never edit it.

### On `{"status": "fault" | "error", ...}`

**Any** fault or error output is a stop signal — even if other output (such as a `report.md` on disk, or a Manifest line) appears valid alongside it. Surface the fault payload to the user verbatim. Do not retry silently. Do not fall back to a manual review. Do not editorialise the fault as "cosmetic" or "known": that judgement is the user's, not yours.

### Recovery: lost the awaiting_worker brief on stdout?

The runner persists every awaiting_worker brief to disk at **`<run_dir>/workers/<state>-brief.json`** AND the agent dispatch prompt at **`<run_dir>/workers/<state>-dispatch-prompt.md`** at the moment it pauses. If you lost stdout, recover by:

- `node scripts/run-review.mjs --print-current-state --run-id <run_id>` to see what state the FSM is in.
- `node scripts/run-review.mjs --print-dispatch-prompt --run-id <run_id>` to get the agent prompt.
- `cat <run_dir>/workers/<state>-brief.json` for the full brief if you need a specific field.
- Or `node scripts/run-review.mjs --resume --run-id <run_id>` to re-emit the brief on stdout in the same envelope as `--start`.

**Do not** re-run `--continue` with the previous worker's outputs to "see what happens." The FSM has already committed those outputs and advanced; a second commit will fail `output_schema_violation` against the next state's schema.

### Forbidden tools and paths during a review

These are NOT allowed during a review run:

- **Writing your own intermediates to `/tmp/*`** — never. Any orchestrator-created artifacts you control during the review loop (captured stdout, ad-hoc agent prompts, JSON extraction scratch) must live under `<run_dir>/`. The run-dir is per-project, per-run; `/tmp` is mode 1777 (world-readable on every Unix), shared across concurrent sessions, and collides under parallel development. The run-dir is gitignored, isolates parallel runs by run-id, and isolates parallel projects by `.fsmrc.json`'s `storage_root`. (The runner itself does use an OS temp dir internally for short-lived scratch files passed to `fsm-next` / `fsm-commit` — treat that as an implementation detail you do not read from or write to.)
- **`python3 -c "import json; ..."` to extract fields from a brief** — never. Anything the orchestrator routinely needs (run-dir path, current state, dispatch prompt) is exposed by a `--print-X` CLI. For the small handful of fields the loop reads directly (`.run_id` from `--start`, `.inputs.picked_leaves[].id` for specialists, `.outputs_path`), use `jq` against the on-disk brief at `<run_dir>/workers/<state>-brief.json`. `jq` is fine; ad-hoc `python3 -c` is not.
- **Inventing your own filename for the worker output** — never. Use `brief.outputs_path` from the on-disk brief, or just call `--continue --run-id <id>` without `--outputs-file` (the runner defaults to it).
- **Composing the agent prompt by concatenating `prompt_body` with inputs yourself** — never. The runner has already done that and written it to `<run_dir>/workers/<state>-dispatch-prompt.md`. Read that file (or use `--print-dispatch-prompt`).
- **Capturing `--continue` stdout into `/tmp/*` to "look at later"** — never. The brief is on disk after every pause. `--print-current-state` tells you which one.
- **Aggregating specialist outputs in the orchestrator** — never. Each specialist Agent writes its JSON to its own per-leaf path stated in the staged dispatch prompt's `--- RESPONSE CONTRACT ---` section. The runner aggregates all per-leaf outputs into `specialist_outputs[]` on `--continue`. If you find yourself building a `{ specialist_outputs: [...] }` heredoc from K Agent return values, you are on the wrong path; remove the aggregation step and let `--continue` do it.
- **Dispatching more specialist Agents than the runner returned for the current batch** — never. The runner enforces the concurrency cap by returning at most `--batch-size` ids per `--print-pending-leaf-ids` call (default 10; configurable up to 50 if you have a deliberate reason to widen the pool). Dispatch ONE Agent per id in the returned batch, all in one orchestrator message; do not pad the batch with extra Agents you weren't given ids for. The thread-pool model exists to keep observability tight: large simultaneous Agent dispatches overflow the trace window and make failures hard to attribute. The default of 10 is observable, debuggable, and produces identical findings to one big batch.
- **Running `git diff` during a specialist dispatch** — never. The runner has already pre-computed the per-leaf filtered diff (and sharded it when large). If you spawn `git diff` during specialist dispatch, you are duplicating runner work and the diff text in the prompt becomes inconsistent with what the runner used.

---

## Failure modes (READ THIS BEFORE STARTING)

If you find yourself reading any of these at the start of a review, **STOP**. You are on the wrong path:

- `code-reviewer.md`
- `docs/code-reviewer-design.md`
- `release-readiness.md`
- `report-format.md`
- `reviewers.wiki/**`

Past LLMs have read those files and re-implemented the FSM by hand: produces a plausible-looking but un-auditable, non-deterministic, no-manifest report. Run the runner instead.

If your final response does not end with `Manifest: .skill-code-review/<shard>/<run-id>/manifest.json` whose `base_sha` and `head_sha` match what the user asked for, you did not run the skill. Restart at the runner command above.

---

## Arguments

| Argument | Values | Default | Description |
|----------|--------|---------|-------------|
| help | (flag) | — | Print this argument table and exit. No review is run. |
| format | auto, markdown, json | auto | Output format. `auto`: markdown when stdout is a TTY, JSON otherwise. |
| full | (flag) | — | Review entire codebase, not just git diff. Respects scope-dir. |
| base | git SHA or ref | auto | Base commit for diff. Auto: merge-base with origin/main, fallback HEAD~1. Ignored if full. |
| head | git SHA or ref | HEAD | Head commit for diff. |
| scope-dir | comma-separated paths | all | Restrict review to these directories. |
| scope-lang | comma-separated languages | all detected | Force specific languages (e.g. typescript,python). |
| scope-framework | comma-separated frameworks | all detected | Force specific frameworks (e.g. react,prisma). |
| scope-reviewer | comma-separated reviewer IDs | auto-routed | Force specific reviewers, skip auto-routing. |
| scope-severity | critical, important, minor | all | Only report issues at or above this severity. |
| scope-gate | comma-separated gate numbers | all | Only evaluate specific release gates. |
| tools | silent, interactive, skip | silent | Tool execution mode. silent=use available. skip=no tools. |
| mode | standard, thorough | standard | Review depth. thorough=max depth, all tools, lower thresholds. |
| max-reviewers | integer 3–50 | tier-default | Override the per-tier specialist cap (3/8/20/30). |

For the canonical specification of each argument and the report shape, see `report-format.md` — but the runner already reads it for you, so you should not need to.

## When to invoke

**Mandatory:** after a feature/phase, before merge to main.
**Optional:** when stuck (fresh perspective), before a refactor (baseline), after a complex bug fix.
