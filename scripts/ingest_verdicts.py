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

sys.path.insert(0, str(Path(__file__).resolve().parent))
import paths

# The tracker module owns the canonical schema (plan section 8). Import it here
# (the same way scripts/ingest_timings.py does) so the `findings` table has a
# SINGLE owner: there is no second embedded CREATE TABLE to drift from it. The
# `matched` column is an INTEGER boolean (0/1): `1` == the finding matched a
# golden (`idx in verdict["matched"]`).
BENCHMARKS = paths.BENCH
DB_PATH = paths.bench_db_path()

sys.path.insert(0, str(BENCHMARKS))
import experiments  # noqa: E402  (path inserted just above)  # type: ignore[import-not-found]


def init_findings_table(conn: sqlite3.Connection) -> None:
    """Create the tracker tables (including `findings`) if they do not exist.

    Delegates to the tracker's ``experiments.init_db`` so the schema has a single
    owner and this script never carries a divergent copy of the CREATE TABLE.
    Idempotent.
    """
    experiments.init_db(conn)


def _is_skill_tool(name: str, verdict: dict) -> bool:
    """A skill tool records per-candidate `matched`; competitors record
    `matched_golden`. Accept either the `skill-` prefix or a `matched` key so a
    rename of the skill variants does not silently drop their labels."""
    return name.startswith("skill-") or "matched" in verdict


def _label_from_meta(meta_entry: object) -> tuple[float | None, str | None]:
    """Pull (defect_confidence, severity) off a `skill_meta` entry or a legacy
    inline candidate object.

    The current judge input carries skill labels OUT-OF-BAND in `skill_meta`
    (idx-aligned with the bare-string candidate list). An older judge input that
    still inlined the label object on the candidate is also accepted (same key
    names), so historical files keep ingesting. A bare string / missing entry
    yields a null label (uninformative to the calibrator), never a crash.
    """
    if isinstance(meta_entry, dict):
        conf = meta_entry.get("defect_confidence")
        sev = meta_entry.get("severity")
        return (float(conf) if isinstance(conf, int | float) else None,
                str(sev) if sev is not None else None)
    return (None, None)


def rows_for_pr(run_id: str, pr_id: str) -> list[tuple]:
    """Return the findings rows for one (run_id, pr_id), or [] if not ingestable.

    Requires BOTH the verdict and the judge input to exist; emits one row per
    skill candidate present in the input, labelled correct/incorrect by the
    verdict's `matched` candidate-index list. The per-finding confidence/severity
    labels come from the judge input's `skill_meta` side-table (idx-aligned), with
    a fallback to a legacy inline candidate object so old inputs still ingest.
    """
    verdict_path = paths.judge_path(run_id, pr_id)
    input_path = paths.judge_input_path(run_id, pr_id)
    if not verdict_path.exists() or not input_path.exists():
        return []
    verdict = json.loads(verdict_path.read_text())
    judge_input = json.loads(input_path.read_text())
    golden_count = len(judge_input.get("golden", []))
    in_tools: dict[str, list] = judge_input.get("tools", {})
    skill_meta: dict[str, list] = judge_input.get("skill_meta", {})

    rows: list[tuple] = []
    for tool, tv in verdict.get("tools", {}).items():
        if not isinstance(tv, dict) or not _is_skill_tool(tool, tv):
            continue
        matched = {int(m) for m in tv.get("matched", [])}
        candidates = in_tools.get(tool, [])
        meta = skill_meta.get(tool, [])
        for idx, cand in enumerate(candidates):
            # Prefer the out-of-band meta entry; fall back to a legacy inline
            # candidate object (older inputs that still carried the label inline).
            meta_entry = meta[idx] if idx < len(meta) else cand
            conf, sev = _label_from_meta(meta_entry)
            correct = 1 if idx in matched else 0
            rows.append((run_id, pr_id, tool, idx, conf, sev, correct, golden_count))
    return rows


def collect(run_id: str, explicit: list[str]) -> list[tuple]:
    """Gather the labelled finding rows for a run across its judged PRs.

    Uses the explicit pr_id list when given, else every judged PR under the run.
    Read-only: building the rows never creates or writes the DB. Returns the flat
    list of (run_id, pr_id, tool, finding_idx, defect_confidence, severity,
    matched, golden_count) tuples.
    """
    judged = dict(paths.iter_judge_files(run_id))  # pr_id -> verdict path
    pr_ids = explicit or sorted(judged)
    rows: list[tuple] = []
    for pid in pr_ids:
        rows.extend(rows_for_pr(run_id, pid))
    return rows


def write_rows(rows: list[tuple], db_path: Path = DB_PATH) -> int:
    """Persist the labelled finding rows into the tracker `findings` table.

    Uses the canonical tracker schema (single owner) via ``init_findings_table``
    and ``INSERT OR REPLACE`` so a re-ingest of the same (run_id, pr_id, tool,
    finding_idx) is idempotent against the table's primary key rather than raising
    a UNIQUE violation. A single executemany + one commit owns the write (no
    per-row fsync). Returns the number of rows written.
    """
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    try:
        init_findings_table(conn)
        conn.executemany(
            "INSERT OR REPLACE INTO findings (run_id, pr_id, tool, finding_idx, "
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
