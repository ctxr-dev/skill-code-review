# Deterministic Orchestration via State-Machine YAML — Proposal

**Date:** 2026-04-26
**Status:** proposal — awaiting final greenlight before Sprint A starts
**Priority:** highest (P0) — substrate for every later sprint

## Architectural decisions (locked)

| Aspect | Decision |
|--------|----------|
| Top-level role split | Main Session spawns ONE FSM Orchestrator subagent; FSM Orchestrator is the sole state mutator |
| AI reading FSM YAML | Never — scripts parse YAML and return structured JSON briefs |
| State storage | File-only — `manifest.json` + sequential `fsm-trace/*.yaml` files; no database |
| Cross-session locks | POSIX `O_EXCL` per-run lock files with embedded `expires_at` TTL |
| Run-dir path | `.skill-code-review/<yyyy>/<mm>/<dd>/<ab>/<rest>/` (date folders + 2-hex shard) |
| Resume model | Match repo + head_sha; ask user when in-progress runs found |
| Subagent boundary | Paranoid — every non-trivial step is a worker subagent |
| Context-cleanup | At 70% context, FSM Orchestrator spawns dedicated fresh cleanup worker, returns paused-for-context to Main Session, which re-spawns a fresh FSM Orchestrator with the compact summary |
| Worker → Orchestrator transport | Agent tool with JSON-Schema-validated responses (MCP server transport deferred) |
| State trace decoration | Clean YAML files with `phase` field set to `entry`, `exit`, or `fault`. No ASCII separators. AI never authors them |
| Edge-case lifecycle | Explicit `fsm-pause`, `fsm-abandon`, `fsm-pivot` scripts; `fsm-stale-cleanup` TTL sweep |
| Violation policy | Deterministic-predicate violations downgrade verdict to CONDITIONAL; judgement-predicate violations log warning only |

## The problem

Long prose orchestrators executing multi-step workflows drift. The user's report: "sometimes during long iterations AI starts ignoring some steps that are necessary, and when I correct it — it agrees and apologises for misleading/forgetting."

Seven concrete failure modes:

| # | Failure mode | What goes wrong |
|---|-------------|-----------------|
| F1 | Step skipping | LLM judges a step "unnecessary this time", silently skips. |
| F2 | Out-of-order execution | LLM does step 5 before step 3. |
| F3 | Missing decision branch | LLM doesn't notice "if X, do Y else do Z". |
| F4 | Forgotten edge case | LLM doesn't handle "what if Stage A returns 0 candidates". |
| F5 | Hallucinated step | LLM invents a step not in spec. |
| F6 | Decision drift | Same input, different decision criteria across sessions. |
| F7 | Apology recurrence | "Sorry, you're right, I forgot" — same drift recurs next session. |

## How the FSM addresses each failure

| Failure | Mechanism that blocks it |
|---|---|
| F1 (skip) | Each state's `preconditions[]` reference earlier states' `outputs[]`. The state-advance script refuses to enter state N+1 until N's outputs are persisted on disk. |
| F2 (out-of-order) | Same mechanism — preconditions enforce ordering. |
| F3 (missing branch) | Each state's `transitions[]` enumerates ALL valid next states with explicit predicates. The script evaluates every predicate on captured inputs; AI cannot bypass. |
| F4 (edge case) | Edge cases get their own state. `stage_a_empty`, `judge_no_findings`, etc. — explicit transitions, no silent fall-through. |
| F5 (hallucination) | The state set is closed. The script rejects transitions to undefined state-ids. |
| F6 (decision drift) | Predicates are fixed strings in YAML. The script (not the AI) evaluates them. AI cannot "interpret differently". |
| F7 (apology recurrence) | Trace files on disk show every transition + evidence. Concrete correction, not vibes. |

## Architecture overview

```text
                            User
                              │
                              ▼
                       ┌──────────────┐
                       │ Main Session │  (Claude Code)
                       └──────┬───────┘
                              │ spawn 1 subagent
                              ▼
                    ┌─────────────────────┐
                    │  FSM Orchestrator   │  (subagent — sole state mutator)
                    └──┬──────────────────┘
                       │ spawns workers via Agent tool;
                       │ collects schema-validated JSON responses;
                       │ calls fsm-* scripts for state I/O
        ┌──────────────┼──────────────┬─────────────────┐
        ▼              ▼              ▼                 ▼
  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌──────────────┐
  │ Worker:  │  │ Worker:  │  │ Specialist   │  │ Worker:      │
  │ project- │  │ tree-    │  │ Coordinator  │  │ context-     │
  │ scan     │  │ descend  │  │  (sub-fsm)   │  │ cleanup      │
  └──────────┘  └──────────┘  └──────┬───────┘  └──────────────┘
                                     │
                            ┌────────┼────────┬─────────┐
                            ▼        ▼        ▼         ▼
                     ┌─────────┐  ┌─────────┐  ...   ┌─────────┐
                     │Specialist│  │Specialist│       │Specialist│
                     │   1     │  │   2     │        │   K     │
                     └─────────┘  └─────────┘        └─────────┘
```

### Roles

| Component | What it does | Persists state? |
|-----------|--------------|-----------------|
| **Main Session** | Receives user request; spawns FSM Orchestrator; monitors for `paused-for-context` and re-spawns fresh; surfaces final verdict. | No |
| **FSM Orchestrator** | Calls `fsm-next` / `fsm-commit` scripts; spawns workers per state; validates worker responses against the state's response schema; returns paused-for-context when its own usage hits 70%. Never reads FSM YAML directly. | No (state lives on disk) |
| **Worker subagent** | Executes one bounded task (scan, descend, trim, dispatch a specialist). Returns a JSON response that conforms to the state's response schema. Never mutates state. | No |
| **Specialist Coordinator** | Sub-orchestrator for parallel specialist dispatch. Spawns K specialists concurrently, aggregates their JSON outputs, returns one structured payload to FSM Orchestrator. | No |
| **Scripts** (`fsm-*.mjs`) | Parse FSM YAML. Read and write state files atomically. Acquire and release locks. Validate worker output. The scripts ARE the state machine engine. | Yes — they write |
| **State files on disk** | `manifest.json` per run + `fsm-trace/NNN-*.yaml` per state transition + `lock.json` for in-progress runs. Atomic writes via tmp-then-rename. | Canonical truth |

### What's never allowed

- AI agents reading FSM YAML files directly.
- Workers writing state files.
- Main Session calling FSM scripts directly (it delegates to FSM Orchestrator).
- Two FSM Orchestrators advancing the same run-id concurrently (per-run `lock.json` blocks this).
- Free-form worker outputs (every response validates against the state's declared schema).

## Disk layout

```text
.skill-code-review/
  2026/                             ← year folder
    04/                             ← month folder
      26/                           ← day folder (human navigation)
        a3/                         ← first 2 hex chars of run-id hash (256 shards)
          f7c9b/                    ← rest of run-id hash → unique run dir
            manifest.json           ← run summary + status (atomic via tmp+rename)
            lock.json               ← present while a session holds the run lock
            report.md
            report.json
            fsm-trace/              ← state transition records, sequential
              001-entry-scan_project.yaml
              002-exit-scan_project.yaml
              003-entry-risk_tier_triage.yaml
              ...
            workers/                ← worker prompt + response artifacts
              001-tree-descender.input.md
              001-tree-descender.output.json
              ...
            sub-runs/               ← child runs from sub-orchestrators (specialist coordinator, judge)
              <child-run-id>/...
fsm/
  code-reviewer.fsm.yaml            ← top-level orchestrator FSM
  specialist.fsm.yaml               ← per-leaf specialist FSM
  judge.fsm.yaml                    ← verification judge FSM (Sprint 2)
  workers/
    project-scanner.md              ← worker prompt template
    tree-descender.md
    trim-candidates.md
    tool-runner.md
    coverage-verifier.md
    gate-aggregator.md
    context-cleanup.md
scripts/
  fsm-next.mjs                      ← read disk state; return next-state brief
  fsm-commit.mjs                    ← validate worker output; write state-exit; advance
  fsm-resume.mjs                    ← list resumable runs (status: in_progress | paused)
  fsm-pause.mjs                     ← pause an in-progress run
  fsm-abandon.mjs                   ← mark a run abandoned
  fsm-pivot.mjs                     ← pause old run + create new with forked_from
  fsm-stale-cleanup.mjs             ← TTL sweep for stale runs
  fsm-inspect.mjs                   ← debug: dump a run's state and trace
  fsm-validate-static.mjs           ← static FSM YAML well-formedness check
  fsm-validate-trace.mjs            ← runtime trace audit; re-runs deterministic predicates
```

### Why each path component

- `<yyyy>/<mm>/<dd>/`: human navigation — `ls .skill-code-review/2026/04/26/` shows everything from one day.
- `<ab>/<rest>/`: filesystem-perf shard within day. APFS / ext4 directory lookups degrade around 10k flat entries. With 256 shards × ≤40 entries/day, lookups stay fast at any plausible volume.
- Per-run subdirectory: all artifacts colocated; trivial to archive, share, or `git add -f`.

## File schemas

### `manifest.json` — top-level run summary

Atomic updates via write-tmp-then-rename. The FSM Orchestrator never edits this directly; the `fsm-commit` script does.

```json
{
  "run_id": "20260426-001512-a3f7c9b",
  "parent_run_id": null,
  "forked_from": null,
  "fsm_id": "code-reviewer",
  "fsm_yaml_hash": "sha256:abc123...",
  "fsm_yaml_version": 1,
  "status": "in_progress",
  "current_state": "stage_a_descent",
  "next_state": "stage_b_trim",
  "started_at": "2026-04-26T00:15:12.345Z",
  "last_update_at": "2026-04-26T00:18:42.812Z",
  "ended_at": null,
  "paused_at": null,
  "pause_reason": null,
  "abandoned_at": null,
  "abandon_reason": null,
  "repo": "skill-code-review",
  "base_sha": "9f1823e",
  "head_sha": "4b54db5",
  "args": { "...": "..." },
  "verdict": null,
  "transitions_count": 5
}
```

**Status enum:**

- `in_progress` — actively executing; expect a `lock.json` alongside.
- `paused` — explicitly paused; resumable via `fsm-resume`.
- `completed` — reached terminal state; verdict populated.
- `faulted` — hit unrecoverable fault; not resumable without manual intervention.
- `abandoned` — explicitly abandoned; not resumable.
- `stale` — `last_update_at` older than TTL (default 7 days); needs explicit revive.
- `superseded` — this run was forked-from; status set when a new run with `forked_from = this.run_id` is created.

### `lock.json` — per-run lock with TTL

Created via `O_EXCL` open. Removed on graceful exit or on stale acquisition by another session.

```json
{
  "run_id": "20260426-001512-a3f7c9b",
  "session_id": "claude-code-session-X",
  "pid": 41928,
  "acquired_at": "2026-04-26T00:18:42.812Z",
  "expires_at": "2026-04-26T01:18:42.812Z"
}
```

**Acquisition algorithm** (in `fsm-next` and `fsm-commit`):

1. Try `open(lock.json, O_CREAT | O_EXCL | O_WRONLY)`. On success, write contents, hold lock.
2. On `EEXIST`, read existing lock. If `expires_at < now`, the lock is stale: delete and retry from step 1.
3. If still active, refuse with structured error: `{ error: "run_locked", lock: { ... } }`.
4. On graceful exit (after `fsm-commit` advances or terminates), unlink `lock.json`.

This gives us atomic single-writer guarantees without a database.

### `fsm-trace/NNN-{entry|exit|fault}-<state>.yaml` — sequential transition records

Each state transition writes one or two trace files:

- Entry record: written when `fsm-next` returns the brief for state X.
- Exit record: written when `fsm-commit` validates outputs and advances past state X.
- Fault record: written when a precondition fails or a worker output fails schema validation; replaces the exit.

```yaml
# 001-entry-scan_project.yaml
phase: entry
state: scan_project
sequence: 1
timestamp: "2026-04-26T00:15:12.345Z"
preconditions: []     # entry state — no upstream
inputs:
  args:
    base: auto
    head: HEAD
    scope-dir: null
```

```yaml
# 002-exit-scan_project.yaml
phase: exit
state: scan_project
sequence: 2
timestamp: "2026-04-26T00:15:42.812Z"
worker_run:
  prompt_path: workers/001-project-scanner.input.md
  response_path: workers/001-project-scanner.output.json
  response_validation: passed
outputs:
  project_profile:
    languages: ["typescript", "python"]
    frameworks: ["react", "django"]
    monorepo: false
  changed_paths: ["src/api/auth.ts"]
  diff_stats:
    lines_changed: 142
    files_changed: 6
post_validations:
  - check: "project_profile.languages is a non-empty list"
    result: pass
  - check: "diff_stats.lines_changed is a non-negative integer"
    result: pass
transition_evaluation:
  - to: risk_tier_triage
    when: "always"
    result: true
transition: risk_tier_triage
```

The AI never authors these. `fsm-commit` writes them after validating the worker's JSON response.

## State YAML structure

Each state in `fsm/code-reviewer.fsm.yaml`:

```yaml
fsm:
  id: code-reviewer
  version: 1
  entry: scan_project
  states:
    - id: scan_project
      purpose: "Build a Project Profile from manifests and repo state."
      preconditions: []
      worker:
        role: project-scanner
        prompt_template: fsm/workers/project-scanner.md
        inputs:
          - args
        response_schema:
          type: object
          required: [project_profile, changed_paths, diff_stats]
          properties:
            project_profile:
              type: object
              required: [languages, frameworks, monorepo]
              properties:
                languages:
                  type: array
                  minItems: 1
                  items: { type: string }
                frameworks:
                  type: array
                  items: { type: string }
                monorepo: { type: boolean }
            changed_paths:
              type: array
              items: { type: string }
            diff_stats:
              type: object
              required: [lines_changed, files_changed]
              properties:
                lines_changed: { type: integer, minimum: 0 }
                files_changed: { type: integer, minimum: 0 }
      outputs:
        - project_profile
        - changed_paths
        - diff_stats
      post_validations:
        - "project_profile.languages is a non-empty list"
        - "diff_stats.lines_changed is a non-negative integer"
      transitions:
        - to: risk_tier_triage
          when:
            kind: deterministic
            expression: "always"
```

### Predicate kinds

Some predicates are pure deterministic computation; others require LLM judgement. The FSM marks each explicitly:

```yaml
transitions:
  - to: short_circuit_exit
    when:
      kind: deterministic
      expression: "tier == 'trivial' AND len(stage_a_candidates) == 0 AND len(scope_overrides) == 0"
  - to: stage_b_trim
    when:
      kind: judgement
      criteria: "tier is full or sensitive; OR tier is lite/trivial with at least one Stage-A activation signal."
      evidence_required: "list the activation signals or the cap-driven path"
```

For `kind: deterministic`, `fsm-commit` re-runs the expression on captured inputs. If the orchestrator's reported result disagrees with the re-run, that's a deterministic-predicate violation.

For `kind: judgement`, the orchestrator provides structured evidence; `fsm-commit` checks the evidence is non-empty and structured but doesn't re-run the judgement.

## Lifecycle scenarios

### Scenario 1 — Happy path

```text
1. User: "review my PR"
2. Main Session: spawns FSM Orchestrator with args
3. FSM Orchestrator: bash("node scripts/fsm-next.mjs --new-run --args '{...}'")
   ← script: chooses run-id, creates run dir, acquires lock, writes 001-entry-scan_project.yaml,
            returns the entry brief as JSON.
4. FSM Orchestrator: parses brief; sees state="scan_project"; spawns project-scanner worker
5. Worker subagent returns JSON {project_profile, changed_paths, diff_stats}
6. FSM Orchestrator: bash("node scripts/fsm-commit.mjs --run-id <id> --outputs '...'")
   ← script: validates JSON against state's response schema, runs post_validations,
            evaluates transition predicates, writes 002-exit-scan_project.yaml,
            updates manifest.json (current_state, next_state, last_update_at),
            writes 003-entry-<next>.yaml, returns next-state brief
7. FSM Orchestrator: repeats for each state until terminal
8. Final fsm-commit returns { status: "terminal", verdict, run_dir_path }
9. FSM Orchestrator: returns to Main Session
10. Main Session: surfaces report.md to user
```

### Scenario 2 — Resume after compaction or new session

```text
User opens a new Claude session in the same repo.
1. Main Session: bash("node scripts/fsm-resume.mjs --repo X --head Y")
   ← script: walks recent date folders (last 30 days by default),
            reads each manifest.json, filters status in {in_progress, paused}
            AND repo + head_sha match.
            Returns matching runs as JSON.
2. If matches found:
   Main Session asks user: "Resume run X (started 2026-04-26 14:30, currently at state Y) or start new?"
3. User picks resume.
4. Main Session: spawns FSM Orchestrator with --resume <run-id>
5. FSM Orchestrator: bash("node scripts/fsm-next.mjs --resume <run-id>")
   ← script: validates fsm_yaml_hash unchanged (or surfaces fault per scenario 6),
            acquires lock (handling stale-lock recovery),
            reads next-state from manifest.json,
            returns entry brief for that state
6. FSM Orchestrator continues the happy path from there.
```

### Scenario 3 — User abandons mid-flow

```text
User: "stop, abandon this review"
Main Session: bash("node scripts/fsm-abandon.mjs --run-id <id> --reason 'user halt'")
  ← script: updates manifest.json (status='abandoned', abandoned_at, abandon_reason),
            removes lock.json, preserves the trace files
Main Session: tells user "abandoned. Run state preserved at <run-dir-path>."
FSM Orchestrator: receives signal from Main Session, exits cleanly without further fsm-* calls.
```

### Scenario 4 — User pauses to come back later

```text
User: "pause, I'll come back tomorrow"
Main Session: bash("node scripts/fsm-pause.mjs --run-id <id> --reason 'user pause'")
  ← script: updates manifest.json (status='paused', paused_at, pause_reason),
            removes lock.json, preserves trace
Tomorrow: scenario 2.
```

### Scenario 5 — User pivots mid-flow

```text
User: "actually, scope this to security only"
Main Session detects: new args; current run is at state Y mid-flow.
Main Session asks: "Current run at state Y. Options:
   (a) Pause this run, start new with new scope. Old run resumable later.
   (b) Abandon this run, start new with new scope.
   (c) Override args mid-flow (risky — may invalidate completed states).
   (d) Cancel pivot, continue current run as-is."
User picks (a).
Main Session: bash("node scripts/fsm-pivot.mjs --old-run-id <old> --new-args '{...}'")
  ← script: pauses old run (manifest.json status='paused'),
            creates new run dir + manifest.json with forked_from=<old>,
            sets old run's status='superseded' (still resumable but flagged),
            returns new-run-id
Main Session: spawns fresh FSM Orchestrator with the new run-id (scenario 1 from there).
```

### Scenario 6 — Plan (FSM YAML) changed mid-flow

```text
User edits fsm/code-reviewer.fsm.yaml between sessions.
On resume:
1. fsm-next compares current YAML hash vs the run's recorded fsm_yaml_hash.
2. Mismatch → script returns { error: "fsm_yaml_changed", current_hash, run_hash, current_state }
3. FSM Orchestrator surfaces to Main Session, which asks user:
   (a) Continue with frozen FSM (re-load original fsm.yaml at run-start hash via git)
   (b) Fork-pivot to new FSM (status='superseded' on old; new run-id with current hash)
   (c) Abandon
4. User picks. Action proceeds.
```

### Scenario 7 — Concurrent sessions on the same run-id

```text
Session A holds lock.json on run X (acquired 14:30, expires 15:30).
Session B (different Claude window) tries fsm-next --resume <X>.
fsm-next: reads existing lock.json. expires_at > now. Returns:
   { error: "run_locked", locked_by_session: "...", expires_at: "..." }
Session B's Main Session surfaces: "Run X is currently locked by session Y until 15:30.
   Wait, or pick a different run-id?"
If Session A crashes without releasing the lock:
   At 15:30, expires_at is in the past. Session B's next fsm-next attempt sees stale lock,
   removes it, acquires fresh, proceeds.
```

## Context-budget management

Per Q5 decision: when FSM Orchestrator's context approaches 70%, spawn a dedicated fresh cleanup worker.

```text
FSM Orchestrator monitors its emitted token count at every fsm-next/fsm-commit cycle.
At 70% of context budget:
  1. fsm-commit current state (state on disk is up to date).
  2. Spawn a context-cleanup worker subagent.
     - Cleanup worker reads:
         - current run's recent state-transitions (from disk)
         - current run's manifest.json
       and produces a TIGHT compact summary suitable for handing to a fresh
       FSM Orchestrator.
  3. Cleanup worker returns the compact summary as JSON.
  4. FSM Orchestrator returns to Main Session with:
        status: "paused-for-context"
        next_state: <id>
        compact_summary: <string from cleanup worker>
        run_id: <id>
  5. Main Session: ends current FSM Orchestrator subagent;
                   spawns fresh FSM Orchestrator with --resume <run-id>
                   and the compact summary as priming context.
  6. Fresh FSM Orchestrator: hits fsm-next, picks up.
```

The cleanup worker has its own context, unbiased by the parent FSM Orchestrator's accumulated state. The fresh FSM Orchestrator inherits ONLY the compact summary + disk state.

**Why this works without a database:** the cleanup worker reads disk files directly (recent trace files + manifest). The fresh FSM Orchestrator reads disk files via `fsm-next --resume`. The handoff is filesystem-mediated; in-memory state is ephemeral.

**Hard fallback:** if cleanup-and-respawn still leaves context exhausted, FSM Orchestrator returns `status: "paused-for-context-hard"`. Main Session surfaces "context limit hit; please start a new Claude session and run `--resume <run-id>`."

## Worker response contracts

Every state that dispatches a worker declares an explicit response schema:

```yaml
- id: tree_descend
  purpose: "Walk the wiki tree by focus + activation gate; produce candidate leaves."
  preconditions:
    - "project_profile exists in run state"
    - "tier exists in run state"
  worker:
    role: tree-descender
    prompt_template: fsm/workers/tree-descender.md
    inputs:
      - project_profile
      - changed_paths
      - changed_diff_summary
    response_schema:
      type: object
      required: [candidates, descent_path]
      properties:
        candidates:
          type: array
          items:
            type: object
            required: [id, path, activation_match]
            properties:
              id:
                type: string
                pattern: "^[a-z][a-z0-9-]*$"
              path:
                type: string
              activation_match:
                type: array
                items:
                  enum: [file_globs, keyword_matches, structural_signals, escalation_from]
                minItems: 1
        descent_path:
          type: array
          items: { type: string }
          description: "Top-level subcategories visited during descent (for audit)"
  outputs:
    - stage_a_candidates
  transitions:
    - to: stage_a_empty
      when:
        kind: deterministic
        expression: "len(stage_a_candidates) == 0"
    - to: stage_b_trim
      when:
        kind: deterministic
        expression: "len(stage_a_candidates) > 0"
```

FSM Orchestrator workflow per state with a worker:

1. `fsm-next` returns the brief: state-id, prompt-template path, input data, response schema.
2. FSM Orchestrator reads the prompt template (markdown), renders inputs into it.
3. Spawns the worker subagent via Agent tool.
4. Receives JSON response from the worker.
5. Validates against `response_schema` locally OR via `fsm-commit --validate-only`. On schema violation: ONE retry with corrective prompt; second failure → fault state.
6. `fsm-commit` writes state-exit YAML and advances.

**Why JSON Schema validation is non-negotiable:** the worker's output is the next state's input. A malformed worker output corrupts the rest of the run silently. Schema validation catches malformed output at the boundary.

**MCP migration deferred:** Sprint A ships using the Agent tool with structured prompts and JSON-schema response validation. Future migration to an MCP server (each worker as an MCP tool) is feasible but not in scope. The contract shape is identical either way; only the transport changes.

## Scripts

Each script does one thing. All return JSON to stdout. Errors go to stderr with non-zero exit code.

| Script | Purpose | Key inputs | Key outputs |
|--------|---------|------------|-------------|
| `fsm-next.mjs` | Acquire lock; read disk state; return next-state brief. | `--run-id` (or `--new-run` + `--args`) | JSON brief: state-id, purpose, prompt template, inputs, schema, transitions |
| `fsm-commit.mjs` | Validate worker output against schema; run post_validations; evaluate transitions; write state-exit; advance. | `--run-id`, `--outputs <json>` | JSON: next-state brief OR `{ status: "terminal", verdict }` |
| `fsm-resume.mjs` | List resumable runs (status in {in_progress, paused}) matching filters. | `--repo`, `--head-sha` (optional), `--days-back` (default 30) | JSON list of runs |
| `fsm-pause.mjs` | Pause an in-progress run. | `--run-id`, `--reason` | JSON status |
| `fsm-abandon.mjs` | Mark a run abandoned. | `--run-id`, `--reason` | JSON status |
| `fsm-pivot.mjs` | Pause old run + create new run with `forked_from`. | `--old-run-id`, `--new-args` | JSON: new-run-id |
| `fsm-stale-cleanup.mjs` | TTL sweep — mark in_progress runs older than TTL as stale. | `--ttl-days` (default 7) | JSON: list of swept run-ids |
| `fsm-inspect.mjs` | Debug: dump a run's manifest + transition history + lock status. | `--run-id` | JSON dump |
| `fsm-validate-static.mjs` | Static check on FSM YAML well-formedness. | `<fsm-yaml-path>` | JSON validation report |
| `fsm-validate-trace.mjs` | Re-run deterministic predicates against trace; verify integrity. | `--run-id` | JSON validation report |

Implementation notes:

- All filesystem writes use `write tmp + fsync + atomic rename` for crash safety.
- `fsm-next` and `fsm-commit` always re-acquire the lock (or verify they hold it) before writing. If the lock is held by another session, return error and exit non-zero.
- Cross-run queries (e.g. `fsm-resume`) walk only recent date folders (last 30 days by default) to bound the scan. Beyond that, runs are considered archived.
- All scripts share `scripts/lib/fsm-storage.mjs` for filesystem I/O + lock management, and `scripts/lib/fsm-schema.mjs` for FSM YAML + worker-response schema validation.

## When AI reads YAML — never

The AI never reads:

- `fsm/code-reviewer.fsm.yaml`
- `fsm/specialist.fsm.yaml`
- `fsm/judge.fsm.yaml`
- `fsm-trace/*.yaml` files

The script always parses these and returns structured JSON.

The AI does read:

- Worker prompt templates (`fsm/workers/<role>.md`) — when the FSM Orchestrator builds a worker prompt.
- Reviewer leaf bodies (`reviewers.wiki/<path>/<id>.md`) — when a specialist worker is dispatched.
- The script's stdout — every step.

The AI's only structured-data interaction is consuming script JSON output. There's no YAML parser in the AI's loop.

## Validators

### `fsm-validate-static.mjs` — every commit, pre-merge

Static check on FSM YAML:

- Every transition resolves to a defined state.
- Every input has a producer (some upstream state's `outputs[]`).
- Every precondition references an upstream output.
- Entry state is reachable.
- No unreachable states.
- Terminal state(s) exist.
- Every state's worker references a prompt template that exists on disk.
- Every state's `response_schema` is a valid JSON Schema.

Wired into `npm run validate:src`.

### `fsm-validate-trace.mjs` — per-run, after terminal OR on demand

Runtime check on the captured trace:

- Every state-entry has a matching state-exit (or fault, for fault paths).
- Every transition was to a state declared in the FSM.
- Every `kind: deterministic` predicate's reported result matches a re-run on captured inputs.
- Every `kind: judgement` predicate has structured evidence.
- Every worker response passed schema validation.
- Final state reached is a terminal.
- Lock was released cleanly (no orphan `lock.json` for completed/abandoned runs).

A trace-validation failure on a deterministic predicate downgrades the verdict to CONDITIONAL with `protocol_violation` set in the manifest. Judgement-predicate violations log a warning.

## Migration path

### Sprint A — Foundations (P0; no behavioural change)

- Author top-level `fsm/code-reviewer.fsm.yaml` capturing the 11-step orchestrator.
- Author worker prompt templates: `fsm/workers/{project-scanner,tree-descender,trim-candidates,tool-runner,coverage-verifier,gate-aggregator,context-cleanup}.md`.
- Author `scripts/fsm-next.mjs`, `fsm-commit.mjs`, `fsm-validate-static.mjs`, `fsm-inspect.mjs`. Other scripts deferred to Sprint B.
- Author `scripts/lib/fsm-schema.mjs` (Zod schema) and `scripts/lib/fsm-storage.mjs` (filesystem I/O + lock management).
- Add `validate:fsm` to the validate chain.
- Update `code-reviewer.md` to describe the FSM Orchestrator role and the script-based protocol.
- Static FSM validates clean against the FSM YAML.
- Unit tests for: FSM YAML schema validation, lock acquire/release with stale-lock recovery, trace file write atomicity, transition-predicate evaluation.
- No live use yet. Sprint A is foundation only.

### Sprint B — Live execution + soft-validate (P0)

- Author `fsm-resume`, `fsm-pause`, `fsm-abandon`, `fsm-pivot`, `fsm-stale-cleanup`, `fsm-validate-trace`.
- Wire FSM Orchestrator subagent into actual code-review flows.
- Run end-to-end on a real PR; capture trace; iterate FSM definition.
- Trace validation runs but only WARNS on violations (manifests gain `protocol_warnings[]`).
- Implement context-budget self-checkpointing with the dedicated cleanup worker.

### Sprint C — Strict trace + child FSMs + Sprint 2 integration (P1)

- Trace-validate violations on deterministic predicates downgrade verdict to CONDITIONAL.
- Author `fsm/specialist.fsm.yaml` for the per-leaf specialist worker.
- Author `fsm/judge.fsm.yaml` for the verification judge (Sprint 2's deliverable).
- Specialist Coordinator subagent runs the specialist FSM (one per dispatched leaf, parallel).

### Sprint D — YAML/MD collapse (P3)

- Build `scripts/fsm-render-md.mjs` that regenerates the relevant sections of `code-reviewer.md` from the FSM YAML.
- YAML becomes single source of truth; MD is generated.

## Sprint A deliverables (concrete checklist)

- [ ] `fsm/code-reviewer.fsm.yaml` (~600 lines) — 11 happy-path states + edge-case states (`stage_a_empty`, `short_circuit_exit`, `worker_fault`, `terminal`).
- [ ] `fsm/workers/*.md` — 7 worker prompt templates.
- [ ] `scripts/fsm-next.mjs`.
- [ ] `scripts/fsm-commit.mjs`.
- [ ] `scripts/fsm-validate-static.mjs`.
- [ ] `scripts/fsm-inspect.mjs`.
- [ ] `scripts/lib/fsm-schema.mjs` — Zod schema for FSM YAML; helpers for response-schema validation.
- [ ] `scripts/lib/fsm-storage.mjs` — filesystem helpers (atomic write, lock acquire / release, trace-file numbering).
- [ ] `scripts/lib/fsm-predicates.mjs` — predicate parser + evaluator for `kind: deterministic` expressions.
- [ ] Updated `code-reviewer.md` describing the FSM Orchestrator role.
- [ ] New `CONTRIBUTING.md` section on FSM authoring + worker template authoring.
- [ ] Unit tests in `tests/unit/`: FSM static validation, atomic-write helpers, lock acquire/release with stale-lock recovery, predicate evaluation.
- [ ] `validate:fsm` npm script wired into `validate:src` chain.

## What this still doesn't solve

- **AI can fabricate evidence on judgement predicates.** Mitigation: log all judgement evidence; periodic human spot-check.
- **AI can return malformed JSON from a worker.** Mitigation: schema validation at the boundary, one retry with corrective prompt, then fault.
- **Plan changes mid-run** require explicit user action (fork-pivot or abandon). Not seamless, but the script flags it instead of silently running stale.
- **Race conditions on the SAME run-id** are blocked by `lock.json`. Race conditions on DIFFERENT run-ids are not a problem (each session has its own lock-free run dir).
- **MCP migration** is deferred. Sprint A uses Agent tool with JSON-schema-validated responses; sufficient for Sprint A and B.
- **Cross-run analytics** (e.g. dashboards) require either filesystem walks or a separately-built index. Not currently in scope; can be added later as a derived index without changing the canonical truth (filesystem).

## Decision points

The following are locked. If any need revisiting, say so before Sprint A starts.

| Aspect | Decision |
|--------|----------|
| Greenlight FSM as Sprint A | YES (user direction 2026-04-26) |
| Granularity | Coarse-then-refine: ~20 states (11 happy-path + 9 edge-case) at Sprint A; split states only if observed drift demands it |
| Prose location | Hybrid: short YAML for protocol skeleton, deep prose in MD referenced by anchor |
| Violation policy | Strict on deterministic predicates (CONDITIONAL downgrade); warn-only on judgement predicates |
| Storage backend | File-only (`manifest.json` + sequential `fsm-trace/*.yaml`) |
| Locking | Per-run `lock.json` via POSIX `O_EXCL` with TTL |
| Worker transport | Agent tool + JSON-Schema validation (MCP deferred) |

## Recommendation

Build Sprint A. The file-only design is correct for the single-writer FSM-Orchestrator pattern: crash safety via atomic-rename, concurrency safety via `O_EXCL` lock files. Start with FSM YAML + scripts + storage helpers + tests on a feature branch; commit iteratively.
