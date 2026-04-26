# Deterministic Orchestration via State-Machine YAML — Proposal v2

**Date:** 2026-04-26 (v1: same date; revised after user direction)
**Status:** proposal — awaiting final greenlight before Sprint A starts
**Priority:** highest (P0) — substrate for every later sprint

This is v2 of the proposal. v1 introduced the FSM idea; user directives on 2026-04-26 reshaped the architecture. The major shifts:

- **Hub-and-spoke**: main session delegates ALL FSM work to a single subagent (the "FSM Orchestrator"); workers report up; only the FSM Orchestrator mutates state.
- **Script-driven, not LLM-driven**: AI agents NEVER read FSM YAML directly. A script parses the YAML, returns a structured brief, validates outputs, advances state.
- **SQLite outbox + state files on disk** with date-sharded paths and lock-aware concurrency.
- **Paranoid context budget**: every non-trivial step runs as a worker subagent; FSM Orchestrator self-checkpoints and re-spawns when its own context approaches 70%.
- **Edge-case lifecycle**: explicit abandon / pause / pivot / stale-cleanup commands.

The v1 sketch with `══ STATE-ENTRY ═══` decoration and inline AI YAML reads is superseded by this v2.

## The problem (unchanged from v1)

Large prose-orchestrators executing multi-step workflows drift. The user's report: "sometimes during long iterations AI starts ignoring some steps that are necessary, and when I correct it — it agrees and apologises for misleading/forgetting."

| # | Failure mode | What goes wrong |
|---|-------------|-----------------|
| F1 | Step skipping | LLM judges a step "unnecessary this time", silently skips. |
| F2 | Out-of-order execution | LLM does step 5 before step 3. |
| F3 | Missing decision branch | LLM doesn't notice "if X, do Y else do Z". |
| F4 | Forgotten edge case | LLM doesn't handle "what if Stage A returns 0 candidates". |
| F5 | Hallucinated step | LLM invents a step not in spec. |
| F6 | Decision drift | Same input, different decision criteria across sessions. |
| F7 | Apology recurrence | "Sorry, you're right, I forgot" — same drift recurs next session. |

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
                    │  FSM Orchestrator   │  (subagent — the only state mutator)
                    └──┬──────────────────┘
                       │ spawns workers
                       │ via Agent tool;
                       │ collects responses
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
| **Main Session** | Receives user request; spawns FSM Orchestrator; monitors; handles re-spawn on context pressure; surfaces final result. | No |
| **FSM Orchestrator** | Calls `fsm-next` / `fsm-commit` scripts; spawns workers per state; validates worker responses against schema; never reads FSM YAML directly. | No (state lives on disk) |
| **Worker subagent** | Executes one bounded task (scan, descend, trim, dispatch specialist). Returns a structured JSON response that conforms to the state's declared response schema. Never mutates state. | No |
| **Scripts** (`fsm-*.mjs`) | Parse FSM YAML, manage SQLite outbox, write state files to disk, enforce invariants. | Yes — they write |
| **SQLite + disk state files** | Single source of truth. SQLite indexes runs + holds locks. State files on disk hold the per-step trace records. | Yes |

### What's never allowed

- AI agents reading FSM YAML files directly.
- Workers writing state files.
- Main Session calling FSM scripts directly (it delegates to FSM Orchestrator).
- Two FSM Orchestrators advancing the same run-id (SQLite lock prevents).
- Free-form worker outputs (every response validates against the state's declared schema).

## Disk layout

```text
.skill-code-review/
  index.sqlite                      ← run index + locks + audit log
  2026/                             ← year folder
    04/                             ← month folder
      26/                           ← day folder (human navigation)
        a3/                         ← first 2 hex of run-id hash (256 shards)
          f7c9b/                    ← rest of run-id hash
            manifest.json
            report.md
            report.json
            fsm-trace/              ← state record files
              001-entry-scan_project.yaml
              002-exit-scan_project.yaml
              003-entry-risk_tier_triage.yaml
              ...
            workers/                ← worker prompt + response logs
              001-tree-descend.input.md
              001-tree-descend.output.json
              ...
fsm/
  code-reviewer.fsm.yaml            ← top-level orchestrator FSM
  specialist.fsm.yaml               ← specialist subagent FSM
  judge.fsm.yaml                    ← verification judge FSM (Sprint 2)
  workers/
    project-scanner.md              ← worker prompt template
    tree-descender.md
    trim-candidates.md
    ...
scripts/
  fsm-next.mjs                      ← read next-state brief from disk
  fsm-commit.mjs                    ← write state-exit + advance
  fsm-resume.mjs                    ← list resumable runs
  fsm-pause.mjs                     ← pause an in-progress run
  fsm-abandon.mjs                   ← abandon an in-progress run
  fsm-pivot.mjs                     ← user-driven mid-stream pivot
  fsm-stale-cleanup.mjs             ← TTL sweep for stale runs
  fsm-inspect.mjs                   ← debug: inspect a run's state
  fsm-validate-static.mjs           ← static FSM YAML well-formedness
  fsm-validate-trace.mjs            ← trace audit (re-runs deterministic preds)
```

### Why each path component

- `<yyyy>/<mm>/<dd>/`: human navigation — "show me everything from 2026-04-26".
- `<ab>/<rest>/`: hash-shard within day for filesystem performance — APFS / ext4 directory lookup degrades around ~10k flat entries; 256 shards × ~40 entries/day max keeps lookups fast even at high volume.
- Per-run subdirectory: all artifacts for one run colocated; trivially deletable, archivable, or `git add -f`-ed.
- SQLite at top: O(1) queries for "what's in-progress", "is this run-id locked", "find stale runs".

## SQLite schema

```sql
CREATE TABLE runs (
  run_id            TEXT PRIMARY KEY,
  parent_run_id     TEXT REFERENCES runs(run_id),  -- NULL for top-level
  forked_from       TEXT REFERENCES runs(run_id),  -- set when this run was a pivot from another
  fsm_id            TEXT NOT NULL,                  -- 'code-reviewer' | 'specialist' | 'judge' | ...
  fsm_yaml_hash     TEXT NOT NULL,                  -- frozen at run-start; detect FSM mutations
  status            TEXT NOT NULL,                  -- enum below
  current_state     TEXT,                           -- last-completed state's exit OR last-entered state's id
  next_state        TEXT,                           -- computed by fsm-commit; null if terminal
  started_at        TEXT NOT NULL,                  -- ISO 8601
  last_update_at    TEXT NOT NULL,
  ended_at          TEXT,                           -- NULL while not terminal
  paused_at         TEXT,
  pause_reason      TEXT,
  abandoned_at      TEXT,
  abandon_reason    TEXT,
  repo              TEXT NOT NULL,
  base_sha          TEXT,
  head_sha          TEXT,
  args_json         TEXT NOT NULL,
  verdict           TEXT,                           -- 'GO' | 'CONDITIONAL' | 'NO-GO' | NULL
  run_dir_path      TEXT NOT NULL UNIQUE
);

-- status enum:
--   in_progress  - actively executing
--   paused       - user-paused; resumable via fsm-resume
--   completed    - reached terminal state
--   faulted      - hit unrecoverable fault; not resumable without manual intervention
--   abandoned    - user explicitly abandoned; not resumable
--   stale        - last_update_at older than TTL (default 7 days); needs explicit revive
--   superseded   - this run was forked-into; older runs marked superseded automatically

CREATE TABLE state_transitions (
  run_id            TEXT NOT NULL REFERENCES runs(run_id),
  sequence          INTEGER NOT NULL,                -- monotonic per run
  state             TEXT NOT NULL,
  phase             TEXT NOT NULL,                   -- 'entry' | 'exit' | 'fault'
  timestamp         TEXT NOT NULL,
  trace_file_path   TEXT NOT NULL,                   -- relative to run_dir_path
  PRIMARY KEY (run_id, sequence)
);

CREATE TABLE locks (
  run_id            TEXT PRIMARY KEY REFERENCES runs(run_id),
  locked_by_pid     INTEGER NOT NULL,
  locked_by_session TEXT NOT NULL,                   -- session identifier
  locked_at         TEXT NOT NULL,
  expires_at        TEXT NOT NULL                    -- TTL so a crashed session doesn't permablock
);

CREATE TABLE audit_log (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp         TEXT NOT NULL,
  run_id            TEXT REFERENCES runs(run_id),
  event             TEXT NOT NULL,                   -- 'created' | 'state_advanced' | 'paused' | ...
  details_json      TEXT
);

CREATE INDEX idx_runs_status ON runs(status);
CREATE INDEX idx_runs_last_update ON runs(last_update_at);
CREATE INDEX idx_runs_repo_head ON runs(repo, head_sha);
CREATE INDEX idx_state_transitions_run ON state_transitions(run_id, sequence);
```

The schema covers Q2's edge cases:

- **Abandonment** → `status = 'abandoned'`, `abandoned_at`, `abandon_reason` set by `fsm-abandon` script.
- **Pause / resume** → `status = 'paused'` and `paused_at` / `pause_reason`. `fsm-resume` can revive.
- **Pivot** → user starts a new run; if it forks from an old run, `forked_from` is set; the old run's status becomes `superseded` automatically.
- **TTL / stale** → `fsm-stale-cleanup` script runs at session start; flips `in_progress` runs older than TTL to `stale`.
- **Plan changes mid-run** → `fsm_yaml_hash` is captured at run-start and verified at every `fsm-next` call. If it diverges, the FSM Orchestrator surfaces a fault asking the user to pause+abandon, fork-pivot, or override.
- **Concurrent sessions** → `locks` table; `locked_by_session` + `expires_at` TTL.

## Lifecycle scenarios

### Scenario 1 — Happy path

```text
1. User: "review my PR"
2. Main Session: spawn FSM Orchestrator with args
3. FSM Orchestrator: bash("node scripts/fsm-next.mjs --new-run --args '{...}'")
   ← script: creates run-id, writes initial state, returns first-state brief as JSON
4. FSM Orchestrator: parses brief; sees state="scan_project"; spawns project-scanner worker
5. Project-scanner subagent: returns JSON {project_profile: {...}}
6. FSM Orchestrator: validates JSON against scan_project's response schema
7. FSM Orchestrator: bash("node scripts/fsm-commit.mjs --run-id X --outputs '...'")
   ← script: writes state-exit YAML; computes next state; returns next-state brief
8. Repeat for each state until terminal
9. FSM Orchestrator: returns to Main Session with final manifest path + verdict
10. Main Session: surfaces report to user
```

### Scenario 2 — Resume after compaction or new session

```text
User opens a new Claude session in the same repo.
1. Main Session: bash("node scripts/fsm-resume.mjs --repo X --head Y")
   ← script: queries SQLite for in_progress / paused runs matching repo + head_sha
2. If matches found:
   Main Session asks user: "Resume run X (started 2026-04-26 14:30, currently at state Y) or start new?"
3. User picks resume.
4. Main Session: spawns FSM Orchestrator with --resume <run-id>
5. FSM Orchestrator: bash("node scripts/fsm-next.mjs --resume <run-id>")
   ← script: validates fsm_yaml_hash unchanged (or surfaces fault), returns the brief for the
            next state to execute (the one after the last-completed exit)
6. FSM Orchestrator continues from there.
```

### Scenario 3 — User abandons mid-flow

```text
User: "stop, this is wrong, abandon this review"
Main Session: bash("node scripts/fsm-abandon.mjs --run-id <id> --reason 'user halt'")
  ← script: sets status='abandoned', releases lock, surfaces final state
Main Session: tells user "abandoned. Run state preserved at <run-dir-path>."
FSM Orchestrator subagent: receives signal, exits cleanly without further action.
```

### Scenario 4 — User pauses to come back later

```text
User: "pause, I'll come back tomorrow"
Main Session: bash("node scripts/fsm-pause.mjs --run-id <id> --reason 'user pause'")
  ← script: sets status='paused', releases lock, preserves trace
Tomorrow: scenario 2.
```

### Scenario 5 — User pivots mid-flow (changes plan)

```text
User: "actually, I want to scope this to security only"
Main Session detects: this is new args; the current run is at state Y mid-flow.
Main Session asks: "Current run at state Y. Options:
   (a) Pause this run, start new with new scope. Old run resumable.
   (b) Abandon this run, start new with new scope. Old run unrecoverable.
   (c) Override args mid-flow (risky — may invalidate completed states).
   (d) Cancel pivot, continue current run as-is."
User: picks (a).
Main Session: bash("node scripts/fsm-pivot.mjs --run-id <old-id> --new-args '{...}'")
  ← script: pauses old run; creates new run with forked_from=<old-id>; old becomes 'superseded'
            in the audit log; returns new-run-id
Main Session: spawns fresh FSM Orchestrator with the new run-id.
```

### Scenario 6 — Plan (FSM YAML) changed mid-flow

```text
User edits fsm/code-reviewer.fsm.yaml between sessions.
On resume:
1. fsm-next checks current YAML hash vs run's recorded fsm_yaml_hash
2. Mismatch → script returns fault
3. FSM Orchestrator: surfaces to Main Session: "FSM YAML changed since this run started.
   Options: (a) continue with frozen FSM (re-load original from git history if available),
   (b) fork-pivot to new FSM (status=superseded on old; new run-id with new hash),
   (c) abandon."
4. User picks. Action proceeds.
```

## Context-budget management (option C — dedicated fresh subagent)

The user picked option C: when context fills, a dedicated "context-cleanup" subagent gets spawned. It's fresh, unbiased, single-purpose. The implementation:

```text
FSM Orchestrator monitors its own token usage at every fsm-next/fsm-commit cycle.
At 70% of context budget:
  1. fsm-commit current state
  2. Spawn a context-cleanup worker subagent.
  3. Cleanup worker reads:
       - The current run's recent state-transitions (from disk)
       - The current run's manifest
     and produces a TIGHT compact summary suitable for handing to a fresh
     FSM Orchestrator.
  4. FSM Orchestrator returns to Main Session with:
        status: paused-for-context
        next-state: <id>
        compact-summary: <text from cleanup worker>
  5. Main Session: spawns a fresh FSM Orchestrator with --resume <run-id>
     and the compact summary as priming context.
  6. Fresh FSM Orchestrator: hits fsm-next, picks up.
```

The cleanup worker has its own context, it's not contaminated by the parent FSM Orchestrator's accumulated state. It produces unbiased compaction. The fresh FSM Orchestrator inherits ONLY the compact summary + disk state.

**Why this works:**

- Disk is the truth; in-memory FSM Orchestrator state is ephemeral.
- Re-spawn is cheap because the script returns a complete state brief.
- The cleanup worker's output is a parseable compact-summary YAML that the fresh FSM Orchestrator can consume without re-deriving anything.

**Why option B (hard-stop + fresh session) is the fallback:**

If even the cleanup-and-respawn cycle fills context (extreme cases), the FSM Orchestrator returns `status: paused-for-context-hard`. Main Session surfaces "context limit hit; please start a new session and run `--resume <run-id>`". This is the safety net.

## Worker response contracts

Every state that dispatches a worker declares an explicit response schema in the FSM YAML:

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
          items:
            type: string
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

The FSM Orchestrator workflow per state:

1. `fsm-next` returns the brief: state-id, prompt-template path, input data, response schema.
2. FSM Orchestrator reads the prompt template (Markdown), renders inputs into it.
3. Spawns the worker subagent via Agent tool.
4. Receives JSON response.
5. Validates against `response_schema`. If invalid: ONE retry with corrective prompt; second failure → fault state.
6. `fsm-commit` writes state-exit YAML and advances.

**Why JSON Schema validation is non-negotiable:** The worker's output IS the next state's input. A malformed worker output corrupts the rest of the run silently. Schema validation catches malformed output at the boundary.

**MCP migration (deferred):** v2 ships using the Agent tool with structured prompts and JSON-schema response validation. A future migration to an MCP server (each worker as an MCP tool) is feasible but not in scope for Sprint A. The contract shape is identical either way; only the transport changes.

## State YAML structure

The FSM YAML defines states. Each state declares:

```yaml
fsm:
  id: code-reviewer
  version: 1
  entry: scan_project
  states:
    - id: scan_project
      purpose: "Build a Project Profile from manifests and repo state."
      preconditions: []     # entry state — no upstream
      worker:
        role: project-scanner
        prompt_template: fsm/workers/project-scanner.md
        inputs:
          - args
        response_schema: { ... }
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

**The `phase:` field on emitted state files** distinguishes record types — no ASCII decoration:

```yaml
# fsm-trace/001-entry-scan_project.yaml
phase: entry
state: scan_project
sequence: 1
timestamp: "2026-04-26T14:30:15.234Z"
preconditions: []   # no upstream — entry state
inputs:
  args:
    base: auto
    head: HEAD
    scope-dir: null
```

```yaml
# fsm-trace/002-exit-scan_project.yaml
phase: exit
state: scan_project
sequence: 2
timestamp: "2026-04-26T14:30:42.812Z"
worker_run:
  prompt_path: workers/001-project-scanner.input.md
  response_path: workers/001-project-scanner.output.json
  response_validation: passed
outputs:
  project_profile: { languages: [...], frameworks: [...], ... }
  changed_paths: ["src/api/auth.ts", ...]
  diff_stats: { lines_changed: 142, files_changed: 6 }
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

These files are written by `fsm-commit`, not by the AI. The AI never authors YAML.

## Scripts (CLI, multiple binaries — Q1 option A)

Each script does one thing. All return JSON to stdout for the FSM Orchestrator to parse. Errors go to stderr with non-zero exit code.

| Script | Purpose | Key inputs | Key outputs |
|--------|---------|------------|-------------|
| `fsm-next.mjs` | Read disk state; return next-state brief. | `--run-id` (or `--new-run` + `--args`) | JSON brief: state-id, purpose, prompt template, inputs, schema, transitions |
| `fsm-commit.mjs` | Validate worker output; write state-exit; advance. | `--run-id`, `--outputs` (JSON) | JSON: next-state brief OR `status: terminal` |
| `fsm-resume.mjs` | List resumable runs (in_progress / paused) matching filters. | `--repo`, `--head-sha` (optional) | JSON list of runs |
| `fsm-pause.mjs` | Pause an in-progress run. | `--run-id`, `--reason` | JSON status |
| `fsm-abandon.mjs` | Abandon an in-progress run. | `--run-id`, `--reason` | JSON status |
| `fsm-pivot.mjs` | Pause old run + create new run forked_from old. | `--old-run-id`, `--new-args` | JSON: new-run-id |
| `fsm-stale-cleanup.mjs` | TTL sweep — mark stale runs. | `--ttl-days` (default 7) | JSON: list of swept run-ids |
| `fsm-inspect.mjs` | Debug: dump run + transition history. | `--run-id` | JSON dump |
| `fsm-validate-static.mjs` | Static check on FSM YAML well-formedness. | `<fsm-yaml-path>` | JSON validation report |
| `fsm-validate-trace.mjs` | Re-run deterministic predicates against trace. | `--run-id` | JSON validation report |

## When the AI reads YAML directly — never

The AI never reads:

- `fsm/code-reviewer.fsm.yaml`
- `fsm/specialist.fsm.yaml`
- `fsm-trace/*.yaml` files

The script always parses these and returns structured JSON to the AI.

The AI does read:

- Worker prompt templates (`fsm/workers/<role>.md`) — when the FSM Orchestrator builds a worker prompt.
- Reviewer leaf bodies (`reviewers.wiki/<path>/<id>.md`) — when a specialist worker is dispatched.
- The script's stdout — every step.

The AI's only YAML interaction is consuming script JSON output. There's no YAML parser in the AI's loop.

## Validators (what stops hallucination)

Two validators run at different cadences:

### `fsm-validate-static.mjs` (every commit, pre-merge)

Static check on FSM YAML:

- Every transition resolves to a defined state.
- Every input has a producer (some upstream state's `outputs[]`).
- Every precondition references an upstream output.
- Entry state is reachable.
- No unreachable states.
- Terminal state(s) exist.
- Every state's worker references a prompt template that exists on disk.
- Every state's `response_schema` is a valid JSON Schema.

Wired into `npm run validate:src` chain.

### `fsm-validate-trace.mjs` (every run, after terminal OR on demand)

Runtime check on the captured trace:

- Every state-entry has a matching state-exit.
- Every transition was to a state declared in the FSM.
- Every `kind: deterministic` predicate's reported result matches a re-run on the captured inputs.
- Every `kind: judgement` predicate has structured evidence.
- Every worker response passed schema validation.
- Final state reached is a terminal.

Per Q5 (option B chosen for violation policy in the v1 vote, kept in v2): a trace-validation failure on a deterministic predicate downgrades the verdict to CONDITIONAL with `protocol_violation` set in the manifest. Judgement predicate violations log a warning but don't downgrade.

## Migration path

### Sprint A — Foundations (no behavioural change)

- Author top-level `fsm/code-reviewer.fsm.yaml` capturing the 11-step orchestrator.
- Author worker prompt templates for each state needing a worker (`fsm/workers/project-scanner.md`, `tree-descender.md`, `trim-candidates.md`, `tool-runner.md`, `coverage-verifier.md`, `gate-aggregator.md`).
- Author SQLite schema + migration script.
- Author `fsm-next`, `fsm-commit`, `fsm-validate-static`, `fsm-inspect`. (Other scripts deferred.)
- Add `validate:fsm` to the validate chain.
- Update `code-reviewer.md` to describe the FSM Orchestrator role and the script-based protocol.
- Static FSM validates clean.
- Critical — no live use yet. Sprint A is foundation only.

### Sprint B — Live execution + soft-validate

- Author `fsm-resume`, `fsm-pause`, `fsm-abandon`, `fsm-pivot`, `fsm-stale-cleanup`, `fsm-validate-trace`.
- Wire FSM Orchestrator subagent into actual code-review flows.
- Run end-to-end on a real PR; capture trace; iterate FSM definition.
- Trace validation runs but only WARNS on violations (manifests gain `protocol_warnings[]`).
- Implement context-budget self-checkpointing with the dedicated cleanup worker.

### Sprint C — Strict trace + child FSMs + Sprint 2 integration

- Trace-validate violations on deterministic predicates downgrade verdict to CONDITIONAL.
- Author `fsm/specialist.fsm.yaml` for the per-leaf specialist worker.
- Author `fsm/judge.fsm.yaml` for the verification judge (Sprint 2's deliverable).
- Specialist Coordinator subagent runs the specialist FSM (one per dispatched leaf, parallel).

### Sprint D — YAML/prose collapse

- Build `scripts/fsm-render-md.mjs` that regenerates the relevant sections of `code-reviewer.md` from the FSM YAML.
- YAML becomes single source of truth; MD is generated.

## Cost-benefit

| Cost | Benefit |
|------|---------|
| ~1500 lines of new code (scripts) + SQLite schema | Drift becomes detectable on every run; trace validator surfaces it automatically |
| ~10-15% more tokens per review | Decision criteria are immutable across sessions |
| Two-source-of-truth maintenance until Sprint D collapses YAML/MD | Edge cases get explicit handling instead of falling through |
| One extra subagent layer (FSM Orchestrator) | Main Session never bloats; clean re-spawn on context pressure |
| Initial implementation effort: ~2 weeks of focused work | Subagent dispatch is now uniformly contracted via JSON Schema |
| Workers must be authored as prompt templates with explicit response schemas | Apologies replaced by traceable corrections referencing specific state-id and predicate |

## What this still doesn't solve

- **AI can fabricate evidence on judgement predicates.** "Focus is semantically relevant" is hard to validate post-hoc. Mitigation: log all judgement evidence; periodic human spot-check.
- **AI can return malformed JSON from a worker.** Mitigation: schema validation at the boundary, one retry with corrective prompt, then fault.
- **Plan changes mid-run** require explicit user action (fork-pivot or abandon). Not seamless, but at least the script flags it instead of silently running stale.
- **Race conditions between concurrent sessions on different repos** are NOT a problem (different run-ids; SQLite handles isolation). Race conditions on the SAME run-id are blocked by the locks table.
- **MCP migration** is deferred. v2 uses Agent tool with JSON-schema-validated responses; that's enough for Sprint A and B. MCP becomes an optimisation in Sprint C+ if measured to add value.

## Sprint A deliverables (concrete)

When Sprint A ships, the repo contains:

- `fsm/code-reviewer.fsm.yaml` — top-level FSM definition (~600 lines).
- `fsm/workers/*.md` — ~7 worker prompt templates.
- `scripts/fsm-next.mjs`, `fsm-commit.mjs`, `fsm-validate-static.mjs`, `fsm-inspect.mjs`.
- `scripts/lib/fsm-schema.mjs` — schema for the FSM YAML (Zod).
- `scripts/lib/fsm-storage.mjs` — disk + SQLite I/O helpers.
- SQLite migration scripts in `scripts/lib/migrations/`.
- Updated `code-reviewer.md` describing the FSM Orchestrator role.
- New section in `CONTRIBUTING.md` covering FSM authoring + worker template authoring.
- New tests in `tests/unit/` covering: FSM static validation, SQLite migration, fsm-next/commit cycle (with mocked worker output).
- `validate:fsm` npm script wired into `validate:src` chain.

When Sprint A ships, no real reviews go through the FSM yet — that's Sprint B. Sprint A is substrate.

## Decisions locked in (2026-04-26 user-confirmed)

| Aspect | Decision |
|--------|----------|
| Script CLI shape | Multiple single-purpose binaries (Q1 = A) |
| AI reads FSM YAML directly | Never |
| Run-dir path | `<yyyy>/<mm>/<dd>/<ab>/<rest>/` |
| Resume model | Context-aware: match repo+head, ask user (Q3 = C) |
| Subagent boundary | Paranoid — every non-trivial step is a worker (Q4) |
| Context-cleanup | Dedicated fresh worker subagent (Q5 = C) |
| State mutation | Sole responsibility of FSM Orchestrator subagent (Q6) |
| Worker → Orchestrator transport | Agent tool with JSON-schema-validated responses (MCP deferred) |
| Edge cases | Explicit pause / abandon / pivot / stale CLI commands (Q2) |
| State trace decoration | None — clean YAML files with `phase:` field |
| Violation policy | Deterministic violations → CONDITIONAL; judgement violations → warning |

## What I still don't know

These are non-blocking for Sprint A but worth surfacing:

- **Subagent observability:** The Agent tool returns final output but not in-flight token usage. The FSM Orchestrator's "context budget self-monitoring" relies on its OWN tokens (which it can estimate from emitted text length); it can't see worker subagent budgets. Workers are bounded by the Agent tool's own context, not ours. This is fine — workers are narrow-task, naturally bounded.

- **SQLite WAL mode and crash safety:** Should we use `PRAGMA journal_mode=WAL`? Yes for concurrency. There's a small read-after-write delay risk on macOS / NFS but acceptable. Sprint A will include WAL configuration.

- **Migrations across FSM YAML versions:** `fsm_yaml_hash` detects mismatches. But what's the upgrade path when we deliberately change FSM v1 → v2? Sprint A defers this; we'll only have v1 for a while. When we cut v2, write a migration script that walks in-flight runs and either marks them superseded or migrates state if compatible.

## Recommendation

**Build it.** All architectural choices are user-confirmed except MCP transport (which I'm deferring as an optimisation). Sprint A is ~2 weeks of focused work; Sprint B another week to get live. Combined Sprint A+B unlocks Sprint 2 (verification judge) on a deterministic substrate.

If there's any architectural choice I should revisit before authoring the FSM YAML and scripts, say so. Otherwise I'll start Sprint A immediately on the next turn.
