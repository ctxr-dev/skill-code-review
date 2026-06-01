# Code Review Skill (v3 — Python ctxr-fsm port)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Powered by ctxr-fsm](https://img.shields.io/badge/powered%20by-ctxr--fsm-purple)](https://github.com/ctxr-dev/fsm)

Multi-specialist code-review skill driven by a 15-state FSM and a
corpus of ~476 wiki-organised leaf reviewers. Selects specialists
that match the project profile + diff, runs them in parallel,
integrates external linters, and produces a `GO` / `CONDITIONAL` /
`NO-GO` verdict.

**v3 reshapes the runtime.** The Node orchestrator
(`scripts/run-review.mjs`) is gone. The skill is now a Python package
that hands a Pydantic `FsmSpec` + 9 inline handlers + 5 worker prompts
to [`ctxr-fsm`](https://github.com/ctxr-dev/fsm). The LLM drives the
run through `fsm.start_run` + `fsm.get_brief` + `fsm.commit_outputs`
over MCP. Behaviourally identical to v2.5.1 — same FSM, same
inline handlers, same worker prompts, same corpus, byte-identical
`report.md` for the same fixture.

## Quick start

```bash
# 1. Make sure ctxr-fsm is ready in this project (idempotent, <500ms warm).
uv run ctxr-fsm ensure --json

# 2. Register the skill's spec + inline handlers.
uv run python -m ctxr_skill_code_review.install
```

Then in your MCP-capable client (Claude Code, Codex CLI), load
[`SKILL.md`](SKILL.md) and follow its bootstrap + run procedure.

## Prerequisites

- Python ≥ 3.12 with `uv` (or `pip` + venv).
- `ctxr-fsm` ≥ 0.2.0 (Python; PyPI). The skill pulls the
  `[sqlite]` extra automatically.
- An MCP-capable client (Claude Code, Codex CLI, Cursor, …) wired to
  the `ctxr-fsm` MCP server.
- Git repository with commits to review.

## Architecture

```text
skill-code-review/
├── SKILL.md                              # Entry point — bootstrap + run loop
├── ctxr_skill_code_review/
│   ├── spec.py                           # FsmSpec literal (15 states + 8 schemas)
│   ├── handlers.py                       # 9 deterministic inline handlers
│   ├── install.py                        # register() one-shot + CLI
│   └── workers/
│       ├── project-scanner.md
│       ├── tree-descender.md
│       ├── trim-candidates.md
│       ├── tool-runner.md
│       └── specialist.md
├── reviewers.wiki/                       # ~476 leaf reviewers (unchanged from v2.x)
├── tests/                                # pytest
├── code-reviewer.md                      # 11-step orchestrator design doc
├── release-readiness.md                  # 8-gate predicate reference
├── report-format.md                      # Manifest + report schema
└── CHANGELOG.md
```

## How it works

The FSM walks 15 states; the LLM only sees the 5 worker states
(everything else advances server-side):

1. **scan_project** (worker) — Build a Project Profile from manifests + repo state.
2. **risk_tier_triage** (inline) — Bucket the diff: trivial / lite / full / sensitive → cap 3 / 8 / 20 / 30.
3. **activate_leaves** (inline) — Run the activation gate over every wiki leaf.
4. **tree_descend** (worker) — Semantic descent through subcategory focus strings.
5. **llm_trim** (worker) — Pick K = cap leaves with one-sentence justifications.
6. **tool_discovery** (worker) — Run external linters declared by picked leaves.
7. **dispatch_specialists** (worker) — Parallel fan-out, one sub-agent per leaf.
8. **collect_findings** (inline) — Deduplicate by (file, line, normalised title).
9. **verify_coverage** (inline) — Build per-file coverage matrix; flag < 2-specialist files.
10. **synthesize_release_readiness** (inline) — 8-gate predicate aggregation; verdict.
11. **write_run_directory** (inline) — Write `manifest.json` + `report.md` + `report.json`.
12. **emit_stdout** (inline) — Print the report; emit `Manifest:` pointer.
13. Two edge states: `short_circuit_exit` (trivial + no signal → GO) and
    `stage_a_empty` (no candidates on a non-trivial diff → CONDITIONAL).
14. **terminal** — End of FSM.

## Report format

Every review produces (markdown or JSON):

- **Verdict** — `GO` / `CONDITIONAL` / `NO-GO`
- **SOLID Compliance** — principle-by-principle status
- **Issues** — clickable `[file:line](file#Lline)` links, severity,
  specialist, impact, fix
- **Tool Results** — pass/fail/skipped per external linter
- **Specialist Results** — per-reviewer status with issue counts
- **Release Gates** — 8-gate assessment
- **Coverage Matrix** — files × specialists

See [`report-format.md`](report-format.md) for the full schema.

## Development

```bash
# Install editable + dev extras (sibling-links ../fsm/ via uv.sources).
uv sync --all-extras

# Run the test suite.
uv run pytest

# Lint + type-check.
uv run ruff check ctxr_skill_code_review/ tests/
uv run mypy ctxr_skill_code_review/

# Try the installer against a tmp DB.
uv run python -m ctxr_skill_code_review.install
```

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the reviewer-authoring
procedure (the `reviewers.wiki/` corpus + the `reviewers.src/`
authoring pipeline).

## v2 → v3 migration

v2.x stays reachable on npm under `@ctxr/skill-code-review`; the v2
shape continues to work for any pinned consumer. v3 is a new
distribution channel (PyPI / `ctxr-fsm`) and requires switching to
the Python install procedure documented in [`SKILL.md`](SKILL.md).
See [`CHANGELOG.md`](CHANGELOG.md#300---python-port-w14f) for the
full migration narrative.

## License

MIT — see [`LICENSE`](LICENSE).
