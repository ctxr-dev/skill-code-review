---
name: skill-code-review
version: 3.0.0
description: |
  FSM-driven, deterministic, manifest-producing code-review pipeline.
  Powered by ctxr-fsm. The LLM is the orchestrator; ctxr-fsm runs
  inline state handlers server-side; sub-agents are dispatched only
  for worker states.
requires:
  fsm:
    mcp_server: ctxr-fsm
    min_version: 0.2.0
---

# skill-code-review

A 15-state FSM that drives a code review of a git diff to a `GO` /
`CONDITIONAL` / `NO-GO` verdict, with deterministic dedup, an 8-gate
release-readiness synthesis, and a persistent on-disk run directory
(`report.md` + `report.json` + `manifest.json`).

## Bootstrap (do this FIRST)

Before any review work, follow
[`@.ctxr-fsm/memory/bootstrap.md`](.ctxr-fsm/memory/bootstrap.md) to
ensure `ctxr-fsm` is installed, the project is initialised, the MCP
server is registered with this client, and the supervisor is running.
The bootstrap is idempotent and intended to be fast on the warm path
(around 1.5-1.8s once the supervisor and MCP server are already up).

**If the package is missing, ASK the user before running the install
command.** Print the proposed command in chat verbatim (the exact
`uv add 'ctxr-fsm[all]'` / `pipx install 'ctxr-fsm[all]'` row from the
bootstrap table) and require explicit go-ahead before proceeding. Do
not auto-install. Do not chain multiple install attempts. This is the
package-missing branch of Principle 1 (requirement pre-check, ask to
satisfy) applied to skill startup.

Then register this skill's spec + inline handlers once per project:

```bash
uv run python -m ctxr_skill_code_review.install
```

The installer prints a small JSON envelope summarising the result:

```json
{
  "db_path": ".ctxr-fsm/fsm.db",
  "handlers_registered": 9,
  "spec_created": true,
  "spec_id": "code-reviewer",
  "spec_version": 1
}
```

Paths in the envelope are relative to the project root so the artefact
survives being pushed to git or moved between machines.

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

## Tool surface per state

Each worker state pins an `allowed_tools` allowlist in the FSM spec.
The list is the exact set of harness tools a sub-agent dispatched for
that state may call. Tool ids use the Claude Code permission shape
(`Bash(<prefix>:*)` for scoped shell commands, bare tool names for
everything else); other harnesses translate at dispatch time.

| State                  | `allowed_tools`                                                                                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scan_project`         | `Bash(git diff:*)`, `Bash(git log:*)`, `Bash(git status:*)`, `Bash(git ls-files:*)`, `Bash(cat:*)`, `Read`, `Glob`                                 |
| `tree_descend`         | `Read`                                                                                                                                             |
| `llm_trim`             | _(none — pure reasoning over the brief)_                                                                                                           |
| `tool_discovery`       | `Bash(eslint:*)`, `Bash(ruff:*)`, `Bash(mypy:*)`, `Bash(npm test:*)`, `Bash(pytest:*)`, `Bash(cargo:*)`, `Bash(go test:*)`, `Bash(which:*)`, `Read` |
| `dispatch_specialists` | `Read`, `Grep`, `Glob`, `WebFetch`, `Bash(git diff:*)`, `Bash(git log:*)`                                                                          |

Inline states (`risk_tier_triage`, `activate_leaves`,
`collect_findings`, `verify_coverage`, `synthesize_release_readiness`,
`write_run_directory`, `emit_stdout`, `short_circuit_exit`,
`stage_a_empty`) and the `terminal` state have an empty allowlist —
they run server-side inside ctxr-fsm and are never dispatched to a
sub-agent.

When dispatching a sub-agent for a worker state, FORWARD this state's
`allowed_tools` verbatim into the sub-agent's tool permission shape
(Claude Code: `--allowedTools=<list>`; Codex equivalent: `--tools`;
Cursor: equivalent). Then on every non-`fsm.*` tool call your
sub-agent makes, call `fsm.observe_tool_call` so the drift detector
can audit. Violations raise `off_allowlist_tool_call` (weight 5.0);
cumulative > 10 auto-pauses the run.

## What the skill produces

A `report.md` (markdown) plus `report.json` (machine-readable) plus
`manifest.json` (skill-side run metadata) under
`<project>/.skill-code-review/<yyyy>/<mm>/<dd>/<shard>/<rest>/`. The
exact format is documented in [`report-format.md`](report-format.md).
Verdict: `GO`, `CONDITIONAL`, or `NO-GO`.

## See also

* [`code-reviewer.md`](code-reviewer.md) — the 11-step orchestrator
  design doc.
* [`release-readiness.md`](release-readiness.md) — the 8-gate
  predicate spec.
* [`report-format.md`](report-format.md) — manifest + report schema.
* [`reviewers.wiki/`](reviewers.wiki/) — the corpus of ~476 leaf
  reviewers.
* [`CHANGELOG.md`](CHANGELOG.md) — release history.
