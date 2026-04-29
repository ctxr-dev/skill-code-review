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
    # Specialist dispatch is a fan-out: K leaves, K parallel Agents.
    # --print-dispatch-prompt requires --leaf-id in this state. The
    # orchestrator must also append the filtered diff per leaf — see
    # the "Special case" section below for the full pattern.
    BRIEF_PATH="$RUN_DIR/workers/$STATE-brief.json"
    for LEAF_ID in $(jq -r '.inputs.picked_leaves[].id' "$BRIEF_PATH"); do
      PROMPT=$(node scripts/run-review.mjs --print-dispatch-prompt --run-id "$RUN_ID" --leaf-id "$LEAF_ID")
      # ... append filtered diff for this leaf, dispatch K Agents in ONE
      # parallel message, aggregate K JSON responses into specialist_outputs[],
      # write to $(jq -r .outputs_path "$BRIEF_PATH"). See full pattern below.
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

**The brief is at `$RUN_DIR/workers/$STATE-brief.json`** if you need to inspect any field directly (`outputs_path`, `worker.response_schema`, `inputs.picked_leaves[]` for `dispatch_specialists`, etc.). The dispatch prompt is at `$RUN_DIR/workers/$STATE-dispatch-prompt.md` — the literal text to feed to the Agent tool. **Both are canonical**; stdout is a redundant convenience.

#### Special case: `STATE === "dispatch_specialists"`

The runner stages K per-leaf prompts at `$RUN_DIR/workers/dispatch_specialists-prompt-<leaf-id>.md` — one per picked specialist. Each per-leaf prompt already contains the leaf body, project profile, changed paths, and tool results. Dispatch K Agents in **one parallel message** (K Agent tool calls in a single LLM turn). Each Agent runs blind (no specialist sees another's output).

**One required augmentation:** the staged per-leaf prompt has a `--- FILTERED DIFF (orchestrator appends below) ---` section. The runner does not pre-compute per-leaf diffs (that would require parsing each leaf's `activation.file_globs` from frontmatter at brief-build time; tracked separately). Before dispatching, append the filtered diff body for each specialist:

```bash
# Get the picked leaf ids from the on-disk brief.
LEAF_IDS=$(jq -r '.inputs.picked_leaves[].id' "$RUN_DIR/workers/dispatch_specialists-brief.json")
BASE_SHA=$(jq -r .base_sha "$RUN_DIR/manifest.json")
HEAD_SHA=$(jq -r .head_sha "$RUN_DIR/manifest.json")

# For each leaf id:
#   1. PROMPT=$(node scripts/run-review.mjs --print-dispatch-prompt --run-id "$RUN_ID" --leaf-id "$LEAF_ID")
#   2. Determine the leaf's activation.file_globs from leaf.body (which is
#      already in the prompt). If the leaf has globs, run:
#        DIFF=$(git diff "$BASE_SHA".."$HEAD_SHA" -- <globs...>)
#      Otherwise (no globs), use the full diff:
#        DIFF=$(git diff "$BASE_SHA".."$HEAD_SHA")
#   3. Concatenate: FULL_PROMPT="$PROMPT"$'\n'"$DIFF"
#   4. Pass FULL_PROMPT as the Agent tool call's prompt.

# Dispatch K Agents in ONE message (K parallel Agent tool calls).
# Aggregate the K JSON responses into:
#   { "specialist_outputs": [<k objects>] }
# Write to: $(jq -r .outputs_path "$RUN_DIR/workers/dispatch_specialists-brief.json")
# Then --continue.
```

The filtered-diff append is **the only allowed form of prompt augmentation.** Every other piece of context — the leaf body, project profile, tool results, response contract — is already in the staged prompt. Do not add anything else.

**Do NOT** dispatch a single Agent for `dispatch_specialists` — you would be re-introducing the coordinator-layer opacity that the audit in #70 (divergence #3) surfaced. The runner cannot tell from the JSON output alone whether you ran K Agents or simulated K specialists in one mind. Run K real Agents in one parallel-tool-call message.

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

- **`/tmp/*`** — never. Every intermediate must live under `<run_dir>/`. The run-dir is per-project, per-run; `/tmp` is mode 1777 (world-readable on every Unix), shared across concurrent sessions, and collides under parallel development. The run-dir is gitignored, isolates parallel runs by run-id, and isolates parallel projects by `.fsmrc.json`'s `storage_root`.
- **`python3 -c "import json; ..."` to extract fields from a brief** — never. Anything the orchestrator routinely needs (run-dir path, current state, dispatch prompt) is exposed by a `--print-X` CLI. For the small handful of fields the loop reads directly (`.run_id` from `--start`, `.inputs.picked_leaves[].id` for specialists, `.outputs_path`), use `jq` against the on-disk brief at `<run_dir>/workers/<state>-brief.json`. `jq` is fine; ad-hoc `python3 -c` is not.
- **Inventing your own filename for the worker output** — never. Use `brief.outputs_path` from the on-disk brief, or just call `--continue --run-id <id>` without `--outputs-file` (the runner defaults to it).
- **Composing the agent prompt by concatenating `prompt_body` with inputs yourself** — never. The runner has already done that and written it to `<run_dir>/workers/<state>-dispatch-prompt.md`. Read that file (or use `--print-dispatch-prompt`).
- **Capturing `--continue` stdout into `/tmp/*` to "look at later"** — never. The brief is on disk after every pause. `--print-current-state` tells you which one.

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
