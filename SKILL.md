---
name: skill-code-review
description: Use when completing tasks, implementing major features, or before merging to verify work meets requirements. Runs an FSM-driven, deterministic, manifest-producing code-review pipeline via scripts/run-review.mjs. The LLM is a worker, not the orchestrator.
---

# skill-code-review

## Run this command first

```
node scripts/run-review.mjs --start --base <BASE> --head <HEAD> [--<key>=<value>...]
```

Defaults: `--base` is the merge-base with `origin/main` (or `HEAD~1`); `--head` is `HEAD`. Pass any other args from the table at the bottom as `--<key>=<value>`. Do not invent flags.

The runner emits one JSON object per stdout line. Loop until `{"status": "terminal", ...}`:

### On `{"status": "awaiting_worker", "run_id": "<id>", "brief": {...}}`

The brief has this shape (only the fields you need):

```text
{
  "state":  <fsm state id, e.g. "scan_project">,
  "inputs": <map of input-name → value, populated from prior states>,
  "worker": {
    "role":             <worker name, e.g. "project-scanner">,
    "prompt_template":  <path under fsm/, e.g. "workers/project-scanner.md">,
    "prompt_body":      <bytes of the worker prompt file, shipped with the brief>,
    "response_schema":  <JSON Schema the worker output is validated against>
  }
}
```

1. Build the worker prompt by concatenating `brief.worker.prompt_body` (already provided) with the `brief.inputs` values the worker needs. **Do not** Read the file at `brief.worker.prompt_template` — the runner already shipped its bytes in `prompt_body`. **Do not** read anything else (not the wiki, not the design doc, not the gate predicates, not other workers).
2. Dispatch via the `Agent` tool. The worker must return a single JSON object satisfying `brief.worker.response_schema`.
3. Write the response to a temp file (`/tmp/worker-out-<run_id>.json` is fine), then call:

   ```
   node scripts/run-review.mjs --continue --run-id <run_id> --outputs-file <path>
   ```

4. Loop on the next stdout line.

#### Special case: `brief.state === "dispatch_specialists"`

This is the ONE state where the contract is different. Instead of dispatching a single Agent, you dispatch **K = brief.inputs.picked_leaves.length** specialists IN PARALLEL via K Agent tool calls in a single message. The runner does not aggregate for you; you aggregate the K JSON outputs into `specialist_outputs[]` and pass that as the worker output.

Step-by-step:

1. `brief.worker.prompt_body` is the per-specialist template (`fsm/workers/specialist.md`). It applies to every specialist; you concatenate it with each leaf's body to build that specialist's prompt.
2. `brief.inputs.picked_leaves[]` arrives with each leaf's `body` already baked in (the runner ships it; you don't Read leaf files).
3. For each leaf in `picked_leaves`, build a specialist prompt by concatenating: the per-specialist template (`brief.worker.prompt_body`) + that leaf's `body` + `brief.inputs.project_profile` + a filtered `git diff` (scope by the leaf's `activation.file_globs` from its frontmatter when present, else the full changed-file set) + any `tool_results` entries whose `name` matches a tool the leaf declares.
4. Emit ONE message containing K parallel `Agent` tool calls — one per leaf. Each Agent must run **blind** (no specialist sees another's output). Each returns a single JSON object matching the per-specialist response shape (id, status, runtime_ms, tokens_in, tokens_out, findings, optional skip_reason). See `fsm/workers/specialist.md` for the contract.
5. Aggregate the K responses into `{ "specialist_outputs": [<k objects>] }` (must match `brief.worker.response_schema`). Write to a temp file. `--continue` with that file.

**Why this is special:** the previous design dispatched a single coordinator-Agent that fanned out to K specialists internally. That hid whether K real Agents actually ran (the audit in #70 surfaced this as divergence #3 — "blind specialists" was unverifiable). The orchestrator-side dispatch makes the K Agent calls visible in your tool-use trace and to the runner's FSM trace.

**Do NOT** dispatch a single Agent for `dispatch_specialists` — you would be re-introducing the coordinator-layer opacity. The runner cannot tell from the JSON output alone whether you ran K Agents or simulated K specialists in one mind. Run K real Agents.

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
