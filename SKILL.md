---
name: skill-code-review
version: 3.0.0
description: |
  FSM-driven, deterministic, manifest-producing code-review pipeline.
  Powered by ctxr-fsm (Python). The LLM is the orchestrator; ctxr-fsm
  runs inline state handlers server-side; sub-agents are dispatched
  only for worker states.
requires:
  fsm:
    mcp_server: ctxr-fsm
    min_version: 0.2.0
---

# skill-code-review v3

A 15-state FSM that drives a code review of a git diff to a `GO` /
`CONDITIONAL` / `NO-GO` verdict, with deterministic dedup, an 8-gate
release-readiness synthesis, and a persistent on-disk run directory
(`report.md` + `report.json` + `manifest.json`).

This is the v3 port: the Node orchestrator is gone, replaced by a
Pydantic FsmSpec + 9 Python inline handlers + 5 worker prompt
templates, driven from the LLM side via `ctxr-fsm`'s MCP tool surface.

## Bootstrap (do this FIRST)

Before any review work, follow
[`@.ctxr-fsm/memory/bootstrap.md`](.ctxr-fsm/memory/bootstrap.md) to
ensure `ctxr-fsm` is installed, the project is initialised, the MCP
server is registered with this client, and the supervisor is running.
The bootstrap is idempotent and fast (<500ms) when everything is up.

Then register this skill's spec + inline handlers once per project:

```bash
uv run python -m ctxr_skill_code_review.install
```

The installer prints a small JSON envelope summarising the result:

```json
{
  "db_path": "/abs/path/.ctxr-fsm/fsm.db",
  "handlers_registered": 9,
  "spec_created": true,
  "spec_id": "code-reviewer",
  "spec_version": 1
}
```

Re-running the installer is a no-op when the spec body hasn't changed
(`spec_created` becomes `false`; the same version is reused). Inline
handlers always re-register so a fresh Python process picks them up.

## Run a review

Once bootstrap is complete and the spec is registered, drive a run
through the `fsm.*` MCP tool family:

1. **Start the run.** Call
   `fsm.start_run(spec_id="code-reviewer", args={"base": "<sha>", "head": "<sha>"})`.
   Add optional fields under `args` as needed: `full` (bool),
   `scope-dir`, `scope-lang`, `scope-framework`, `scope-reviewer`,
   `scope-severity`, `scope-gate`, `max-reviewers`, `format`
   (`markdown` | `json` | `auto`). Capture the returned `run_id`.

2. **Loop.** Repeatedly call `fsm.get_brief(run_id)` and react to the
   returned brief:

   * **Terminal brief.** Read `verdict` + `run_dir_path` from the
     run's last state. Print the contents of
     `<run_dir_path>/report.md` verbatim. You're done.

   * **Worker brief** (`brief.has_worker == true`). Dispatch a
     sub-agent with `prompt = brief.worker.prompt_template` and
     `inputs = brief.inputs`. The sub-agent's structured JSON response
     is the worker output. Call
     `fsm.commit_outputs(run_id, outputs=<sub-agent-response>, signature=<cosignature>)`.
     Continue the loop.

   * **Loop brief** (`brief.has_loop == true`). Same dispatch shape as
     a worker brief, with `brief.iteration_n` carrying the current
     iteration index. Commit the iteration's output; the engine
     decides whether to advance or to issue another iteration.

   * **Inline briefs.** You will NEVER see them. Inline states
     (`risk_tier_triage`, `activate_leaves`, `collect_findings`,
     `verify_coverage`, `synthesize_release_readiness`,
     `write_run_directory`, `emit_stdout`, `short_circuit_exit`,
     `stage_a_empty`) advance server-side inside ctxr-fsm. The next
     brief after a worker commit may be the brief that arrives AFTER
     one or more inline steps.

3. **Stop** when the brief is terminal OR if any commit returns an
   error envelope (see Principle 4–5 in
   `.ctxr-fsm/memory/principles.md`).

## Worker dispatch — concurrency

The `dispatch_specialists` state's worker is the only one that fans
out. Its brief carries a `batch` field listing each specialist's
leaf-id and per-leaf prompt slice. Dispatch them concurrently using
your client's parallel-tool-call mechanism (Claude Code: multiple
Bash / Agent tool calls in a single message; Codex: equivalent),
collect every output, then commit the aggregated outputs dict to
`fsm.commit_outputs` matching the worker's `response_schema`.

The cap on parallel specialists is the `cap` field from
`risk_tier_triage`: `trivial=3`, `lite=8`, `full=20`, `sensitive=30`,
overridable by `args["max-reviewers"]` (clamped to `[3, 50]`).

## What the skill produces

A `report.md` (markdown) plus `report.json` (machine-readable) plus
`manifest.json` (skill-side run metadata) under
`<project>/.skill-code-review/<yyyy>/<mm>/<dd>/<shard>/<rest>/`. The
exact format is documented in [`report-format.md`](report-format.md).
Verdict: `GO`, `CONDITIONAL`, or `NO-GO`.

## What's NEW vs. v2.5.1

* **No Node runner.** `scripts/run-review.mjs` (2,800 LOC), the 9
  inline-state `.mjs` files, the `scripts/lib/` helpers, and the
  Husky pre-commit hook are gone.
* **No `@ctxr/fsm` npm dependency.** The skill depends on `ctxr-fsm`
  (Python, PyPI distribution).
* **No `--start` / `--continue` shell loop.** Use `fsm.start_run` +
  `fsm.get_brief` + `fsm.commit_outputs` directly via the MCP tool
  surface (or HTTP-SSE fallback per `bootstrap.md`).
* **Same FSM**: 15 states, 9 inline handlers, 5 worker prompts,
  8-gate verdict synthesis, `reviewers.wiki/` corpus (~476 leaves) —
  all unchanged in behaviour. Output `report.md` is byte-identical to
  v2.5.1 for the same fixture inputs.

## See also

* [`code-reviewer.md`](code-reviewer.md) — the 11-step orchestrator
  design doc (still relevant; the steps are now driven by the FSM,
  not the Node script).
* [`release-readiness.md`](release-readiness.md) — the 8-gate
  predicate spec.
* [`report-format.md`](report-format.md) — manifest + report schema.
* [`reviewers.wiki/`](reviewers.wiki/) — the corpus of ~476 leaf
  reviewers.
* [`CHANGELOG.md`](CHANGELOG.md) — release history, including the
  v2 → v3 migration entry.
