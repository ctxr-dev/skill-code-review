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
    "response_schema":  <JSON Schema the worker output is validated against>
  }
}
```

1. Read **only** `fsm/<brief.worker.prompt_template>` (the worker prompt file). Do not read anything else (not the wiki, not the design doc, not the gate predicates, not other workers).
2. Build the worker prompt by concatenating the file body with the `brief.inputs` values the worker needs.
3. Dispatch via the `Agent` tool. The worker must return a single JSON object satisfying `brief.worker.response_schema`.
4. Write the response to a temp file (`/tmp/worker-out-<run_id>.json` is fine), then call:

   ```
   node scripts/run-review.mjs --continue --run-id <run_id> --outputs-file <path>
   ```

5. Loop on the next stdout line.

### On `{"status": "terminal", "run_id": "<id>", "verdict": "...", "run_dir_path": "<path>"}`

1. Verify the run is real:

   ```
   node scripts/assert-fresh-run.mjs --run-id <run_id> --base <BASE> --head <HEAD>
   ```

   Exit 0 means OK. Exit non-zero means stop and surface the error.

2. Read `<run_dir_path>/report.md`.
3. **Your final response is the contents of `report.md` followed by a literal trailing line `Manifest: <run_dir_path>/manifest.json`.** Do not paraphrase or summarise the report; surface it verbatim.

### On `{"status": "fault" | "error", ...}`

Surface the message to the user. Do not retry silently. Do not fall back to a manual review.

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
