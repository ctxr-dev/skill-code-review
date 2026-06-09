#!/usr/bin/env python
"""Ingest judge verdicts into the tracker `findings` table (one row per finding).

This is the per-finding label prerequisite for calibration (plan 7.1). The judge
verdict for a skill tool records per-candidate `matched: [idx...]` (the candidate
indices that matched a golden); the judge input (built by
`build_judge_input_prod.py`) carries each skill candidate as a labelled object
`{"text", "defect_confidence", "severity", "idx"}`. Joining the two yields the
`(defect_confidence -> matched boolean)` signal the calibrator needs, which was
previously thrown away at the judge boundary.

For every (run_id, pr_id, skill-tool, candidate) it writes one row into the
DB `findings` table:

    (run_id, pr_id, tool, finding_idx, defect_confidence, severity,
     matched, golden_count)

where `matched` is `1` when `idx in verdict["matched"]` (i.e. `correct =
idx in matched`) and `0` otherwise, and `golden_count` is the number of goldens
for that PR. The DB only grows; this table is the calibrator's sole input.

Usage:
  ingest_verdicts.py <run_id> [pr_id ...]          # dry-run (default): prints rows
  ingest_verdicts.py <run_id> [pr_id ...] --apply  # writes rows to the DB

Only skill tools are ingested (competitor verdicts record `matched_golden`, a
per-golden index, not per-candidate, so they carry no per-candidate label and
are skipped). A skill tool is one whose verdict carries a `matched` key
(equivalently, a `skill-*` tool name).
"""
from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
import paths

# The tracked tracker DB. The benchmarks/ layout is owned by scripts/paths.py
# (the formal A0 helper, next to the tmp-sharding helpers) so it lives in one
# place. `benchmarks/` is tracked (committed), unlike the gitignored `tmp/`
# data, so the accumulated labels survive in git history.
BENCHMARKS = paths.BENCH
DB_PATH = paths.bench_db_path()

# Duplicated verbatim from the tracker schema (plan section 8). When
# `benchmarks/experiments.py` lands it will own the canonical CREATE TABLE; this
# definition MUST stay identical to it (same column names, order, and types) so
# either entry point can create the table and the other reads it transparently.
# `matched` is stored as an INTEGER boolean (0/1): `1` == the finding matched a
# golden (`idx in verdict["matched"]`).
FINDINGS_SCHEMA = """
CREATE TABLE IF NOT EXISTS findings (
    run_id            TEXT    NOT NULL,
    pr_id             TEXT    NOT NULL,
    tool              TEXT    NOT NULL,
    finding_idx       INTEGER NOT NULL,
    defect_confidence REAL,
    severity          TEXT,
    matched           INTEGER NOT NULL,
    golden_count      INTEGER NOT NULL
)
"""


def init_findings_table(conn: sqlite3.Connection) -> None:
    """Create the `findings` table if it does not exist (idempotent).

    Lazily imports the tracker's initializer when `benchmarks/experiments.py`
    is present so the schema has a single owner; otherwise falls back to the
    duplicated (identical) CREATE TABLE above. Either path yields the same
    table definition.
    """
    init = _tracker_init()
    if init is not None:
        init(conn)
        return
    conn.execute(FINDINGS_SCHEMA)


def _tracker_init() -> Any:
    """Return the tracker's findings-table initializer, or None if unavailable.

    Lazy import so this script does not hard-depend on `benchmarks/experiments.py`
    existing yet (it lands later in plan A0). We look for a callable named
    `init_findings_table` or `init_db` exposing the same `findings` schema.
    """
    if not (BENCHMARKS / "experiments.py").exists():
        return None
    sys.path.insert(0, str(BENCHMARKS))
    try:
        import experiments  # type: ignore[import-not-found]
    except Exception:
        return None
    for name in ("init_findings_table", "init_db"):
        fn = getattr(experiments, name, None)
        if callable(fn):
            return fn
    return None


def _is_skill_tool(name: str, verdict: dict) -> bool:
    """A skill tool records per-candidate `matched`; competitors record
    `matched_golden`. Accept either the `skill-` prefix or a `matched` key so a
    rename of the skill variants does not silently drop their labels."""
    return name.startswith("skill-") or "matched" in verdict


def _candidate_label(cand: object, idx: int) -> tuple[float | None, str | None]:
    """Pull (defect_confidence, severity) off a labelled candidate object.

    Tolerates the legacy bare-string candidate shape (returns no label) so an
    old judge-input file does not crash ingestion; such rows carry a null
    confidence and are simply uninformative to the calibrator.
    """
    if isinstance(cand, dict):
        conf = cand.get("defect_confidence")
        sev = cand.get("severity")
        return (float(conf) if isinstance(conf, int | float) else None,
                str(sev) if sev is not None else None)
    return (None, None)


def rows_for_pr(run_id: str, pr_id: str) -> list[tuple]:
    """Return the findings rows for one (run_id, pr_id), or [] if not ingestable.

    Requires BOTH the verdict and the judge input to exist; emits one row per
    skill candidate present in the input, labelled correct/incorrect by the
    verdict's `matched` candidate-index list.
    """
    verdict_path = paths.judge_path(run_id, pr_id)
    input_path = paths.judge_input_path(run_id, pr_id)
    if not verdict_path.exists() or not input_path.exists():
        return []
    verdict = json.loads(verdict_path.read_text())
    judge_input = json.loads(input_path.read_text())
    golden_count = len(judge_input.get("golden", []))
    in_tools: dict[str, list] = judge_input.get("tools", {})

    rows: list[tuple] = []
    for tool, tv in verdict.get("tools", {}).items():
        if not isinstance(tv, dict) or not _is_skill_tool(tool, tv):
            continue
        matched = {int(m) for m in tv.get("matched", [])}
        candidates = in_tools.get(tool, [])
        for idx, cand in enumerate(candidates):
            conf, sev = _candidate_label(cand, idx)
            correct = 1 if idx in matched else 0
            rows.append((run_id, pr_id, tool, idx, conf, sev, correct, golden_count))
    return rows


def collect(run_id: str, explicit: list[str]) -> list[tuple]:
    judged = dict(paths.iter_judge_files(run_id))  # pr_id -> verdict path
    pr_ids = explicit or sorted(judged)
    rows: list[tuple] = []
    for pid in pr_ids:
        rows.extend(rows_for_pr(run_id, pid))
    return rows


def write_rows(rows: list[tuple], db_path: Path = DB_PATH) -> int:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    try:
        init_findings_table(conn)
        conn.executemany(
            "INSERT INTO findings (run_id, pr_id, tool, finding_idx, "
            "defect_confidence, severity, matched, golden_count) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            rows,
        )
        conn.commit()
    finally:
        conn.close()
    return len(rows)


def main() -> None:
    argv = [a for a in sys.argv[1:] if a != "--apply"]
    apply = "--apply" in sys.argv[1:]
    if not argv:
        print("usage: ingest_verdicts.py <run_id> [pr_id ...] [--apply]")
        raise SystemExit(2)
    run_id, explicit = argv[0], argv[1:]
    rows = collect(run_id, explicit)

    n_correct = sum(r[6] for r in rows)
    by_tool: dict[str, int] = {}
    for r in rows:
        by_tool[r[2]] = by_tool.get(r[2], 0) + 1
    summary = {
        "run_id": run_id,
        "n_rows": len(rows),
        "n_correct": n_correct,
        "rows_by_tool": by_tool,
        "db": str(DB_PATH),
        "applied": apply,
    }
    if apply:
        write_rows(rows)
    else:
        summary["note"] = "dry-run: pass --apply to write these rows to the DB"
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
