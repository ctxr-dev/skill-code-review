#!/usr/bin/env python
"""Ingest measured per-stage / per-agent timing telemetry into the tracker.

The product runner measures per-FSM-state and per-specialist wall time LIVE (it
drives the FSM in-process and never writes a journal, so there is no journal to
backfill from) and persists it as a ``timings.json`` artifact next to each run's
``manifest.json``. This script walks ``tmp/runs/<run-id>/<ab>/<pr>/``, reads every
``timings.json`` it finds, and inserts ``status='measured'`` rows
(``source=runner``) into the tracker ``timings`` table via the shared
``experiments.connect()`` / ``init_db()``.

Each ``timings.json`` yields rows at three scopes (the tracker's CHECK vocabulary
is ``process | fsm_state | agent | stage``):

  * ``process`` / ``whole_review`` : one row, wall_ms = whole_review_ms, and (when
                                      the runner recorded a run-level cost block)
                                      cost = total_est_cost, the per-review PROXY
                                      cost that feeds cost_mean.
  * ``fsm_state`` / <state_id>      : the per-state stage_timings rows, aggregated
                                      by name (summed wall_ms, n_calls = row count).
  * ``agent`` / <leaf_id>           : per-specialist measured wall_ms + tokens +
                                      per-call est_cost. On the current claude -p
                                      CLI the live usage block fills tokens (cache
                                      creation dominates) and est_cost; backends
                                      with no usage block fall back to the
                                      char-estimate proxy.

cost is a PROXY for relative lever comparison (GATE-5), NEVER billed spend; the
per-review value computed here is what ``experiments.py record --cost`` should
receive as cost_mean (mean of per-review est_cost across the PR set, over the
SAME N rounds the candidate is evaluated on).

Backfill of the historical base-r* rounds is NOT possible as measured data (those
runs predate this artifact and the FSM journal does not exist). The only thing
available for them is the LLM-self-reported ``runtime_ms`` in the specialist JSON,
which is HALLUCINATED; if a ``timings.json`` ever carries a per-specialist
``runtime_ms`` it is ingested ONLY under ``--include-self-reported``, flagged
``status='self_reported'``, ``source='specialist_json'``, so it can never poison
the default measured-only ``slowest`` ranking. That path is low value and off by
default.

Usage:
  ingest_timings.py <run_id> [<run_id> ...]               # dry-run: prints rows
  ingest_timings.py <run_id> [<run_id> ...] --apply        # writes rows to the DB
  ingest_timings.py <run_id> --include-self-reported       # also self_reported rows
"""
from __future__ import annotations

import json
import logging
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))
import paths

# The tracker module owns the canonical schema + connect()/init_db(); import it
# so ingestion and the rest of the harness share one source of truth for the
# timings table shape.
sys.path.insert(0, str(paths.BENCH))
import experiments  # type: ignore[import-not-found]

logger = logging.getLogger("ingest_timings")


def _find_timings_files(run_id: str) -> list[tuple[str, Path]]:
    """Return (pr_id, timings_json_path) for every PR under tmp/runs/<run-id>/.

    The PR dir is ``tmp/runs/<run_id>/<ab>/<pr>/``; the product writes its
    artifacts (manifest.json, timings.json) under a deterministic shard tree
    rooted at ``<pr-dir>/.skill-code-review/``, so we rglob for timings.json
    under each PR dir. The PR id is the PR-dir name.
    """
    base = paths.TMP / "runs" / run_id
    if not base.is_dir():
        return []
    out: list[tuple[str, Path]] = []
    for ab_dir in sorted(p for p in base.iterdir() if p.is_dir()):
        for pr_dir in sorted(p for p in ab_dir.iterdir() if p.is_dir()):
            pr_id = pr_dir.name
            for tj in sorted(pr_dir.rglob("timings.json")):
                out.append((pr_id, tj))
    return out


def _measured_rows(
    run_id: str, pr_id: str, doc: dict[str, Any],
) -> list[dict[str, Any]]:
    """Build the measured timing rows from one timings.json document.

    fsm_state rows are aggregated by name (a state can be timed multiple times,
    e.g. an inline execute plus its engine_advance, or once per loop iteration):
    wall_ms is summed and n_calls counts the underlying rows.
    """
    rows: list[dict[str, Any]] = []

    # Run-level cost roll-up (specialists + worker calls). total_est_cost is the
    # per-review PROXY cost; it rides the process row so a single query yields the
    # per-review cost for cost_mean. A run that predates the cost block (or whose
    # runner did not record one) leaves cost None, never a fabricated 0.
    cost_block = doc.get("cost")
    review_cost = cost_block.get("total_est_cost") if isinstance(cost_block, dict) else None
    # Exclude bool (a subclass of int) so a malformed total_est_cost: true/false is
    # NOT silently coerced to 1.0/0.0 (the same guard per_review_cost applies).
    review_cost = (
        float(review_cost)
        if isinstance(review_cost, int | float) and not isinstance(review_cost, bool)
        else None
    )

    whole = doc.get("whole_review_ms")
    if isinstance(whole, int | float):
        rows.append({
            "run_id": run_id, "pr_id": pr_id, "scope": "process",
            "name": "whole_review", "wall_ms": int(whole), "cost": review_cost,
            "n_calls": 1, "status": "measured", "source": "runner",
        })

    agg: dict[str, dict[str, int]] = {}
    for st in doc.get("stage_timings") or []:
        if not isinstance(st, dict):
            continue
        name = st.get("name")
        wall = st.get("wall_ms")
        if not isinstance(name, str) or not isinstance(wall, int | float):
            continue
        bucket = agg.setdefault(name, {"wall_ms": 0, "n_calls": 0})
        bucket["wall_ms"] += int(wall)
        bucket["n_calls"] += 1
    for name, bucket in sorted(agg.items()):
        rows.append({
            "run_id": run_id, "pr_id": pr_id, "scope": "fsm_state",
            "name": name, "wall_ms": bucket["wall_ms"], "n_calls": bucket["n_calls"],
            "status": "measured", "source": "runner",
        })

    for sp in doc.get("specialists") or []:
        if not isinstance(sp, dict):
            continue
        leaf_id = sp.get("leaf_id")
        wall = sp.get("wall_ms")
        if not isinstance(leaf_id, str) or not isinstance(wall, int | float):
            continue
        tin = sp.get("tokens_in")
        tout = sp.get("tokens_out")
        est = sp.get("est_cost")
        rows.append({
            "run_id": run_id, "pr_id": pr_id, "scope": "agent", "name": leaf_id,
            "wall_ms": int(wall),
            "tokens_in": int(tin) if isinstance(tin, int | float) and not isinstance(tin, bool) else None,
            "tokens_out": int(tout) if isinstance(tout, int | float) and not isinstance(tout, bool) else None,
            "cost": float(est) if isinstance(est, int | float) and not isinstance(est, bool) else None,
            "n_calls": 1, "status": "measured", "source": "runner",
        })

    return rows


def per_review_cost(run_ids: list[str]) -> tuple[float | None, int, int]:
    """Mean per-review PROXY cost across every PR under the given run_id(s).

    Reads each timings.json's run-level total_est_cost (the same value the process
    row carries) and averages over the PRs that recorded one. This is the cost_mean
    to hand to ``experiments.py record --cost``: a PROXY for the GATE-5 ratio,
    never billed spend, and only valid when computed identically for baseline and
    candidate over the SAME N rounds. Returns (mean_or_None, n_priced, n_skipped):
    mean is None when no PR recorded a cost (so the caller never records a
    fabricated 0), and n_skipped surfaces unreadable/invalid files so a partial
    read that lost N PRs is not reported as a complete cost_mean (which would bias
    the figure toward whatever PRs happened to parse).
    """
    costs: list[float] = []
    skipped = 0
    for run_id in run_ids:
        for _pr_id, tj in _find_timings_files(run_id):
            try:
                doc = json.loads(tj.read_text(encoding="utf-8"))
            except (OSError, ValueError) as exc:
                # Never silently drop a file: a swallowed unreadable PR would bias
                # cost_mean toward whatever the readable PRs happen to be.
                skipped += 1
                logger.warning("skipping unreadable/invalid timings.json %s: %s", tj, exc)
                continue
            if not isinstance(doc, dict):
                skipped += 1
                logger.warning("skipping timings.json %s: top-level JSON is not an object", tj)
                continue
            block = doc.get("cost")
            val = block.get("total_est_cost") if isinstance(block, dict) else None
            if isinstance(val, int | float) and not isinstance(val, bool):
                costs.append(float(val))
    if not costs:
        return None, 0, skipped
    return sum(costs) / len(costs), len(costs), skipped


def _self_reported_rows(
    run_id: str, pr_id: str, doc: dict[str, Any],
) -> list[dict[str, Any]]:
    """Optional, low-value backfill: the LLM-self-reported runtime_ms per
    specialist (HALLUCINATED) when present in the artifact. Flagged
    status='self_reported', source='specialist_json' so it never poisons the
    default measured-only ranking. Off unless --include-self-reported.
    """
    rows: list[dict[str, Any]] = []
    for sp in doc.get("specialists") or []:
        if not isinstance(sp, dict):
            continue
        leaf_id = sp.get("leaf_id")
        rt = sp.get("runtime_ms")
        if not isinstance(leaf_id, str) or not isinstance(rt, int | float):
            continue
        rows.append({
            "run_id": run_id, "pr_id": pr_id, "scope": "agent",
            "name": f"{leaf_id}#self_reported", "wall_ms": int(rt), "n_calls": 1,
            "status": "self_reported", "source": "specialist_json",
        })
    return rows


def collect(
    run_ids: list[str], *, include_self_reported: bool
) -> tuple[list[dict[str, Any]], int]:
    """Walk every run's timings.json artifacts and build the timing rows.

    A file that is unreadable (OSError) or not valid JSON / not a JSON object is
    counted in the returned ``skipped`` total and logged at WARNING, never silently
    dropped: main() surfaces the skip count so an ingest that lost N of M files is
    not reported as fully successful. Returns ``(rows, skipped)`` so the count is a
    plain return value (reentrant; no module-global side channel that concurrent or
    repeated collect() calls would corrupt).
    """
    rows: list[dict[str, Any]] = []
    skipped = 0
    for run_id in run_ids:
        for pr_id, tj in _find_timings_files(run_id):
            try:
                doc = json.loads(tj.read_text(encoding="utf-8"))
            except (OSError, ValueError) as exc:
                skipped += 1
                logger.warning("skipping unreadable/invalid timings.json %s: %s", tj, exc)
                continue
            if not isinstance(doc, dict):
                skipped += 1
                logger.warning("skipping timings.json %s: top-level JSON is not an object", tj)
                continue
            rows.extend(_measured_rows(run_id, pr_id, doc))
            if include_self_reported:
                rows.extend(_self_reported_rows(run_id, pr_id, doc))
    return rows, skipped


def write_rows(rows: list[dict[str, Any]], db_path: Path | None = None) -> int:
    """Persist measured timing rows into the tracker `timings` table.

    Opens one connection, upserts every row, and owns a SINGLE commit after the
    loop (the upsert helper no longer commits per call, so a 250-row ingest is one
    transaction / one fsync instead of 250). ``db_path`` defaults to
    ``experiments.DB_PATH`` resolved at CALL time (not def time, so a None default
    keeps tests/callers able to redirect the DB via monkeypatch + reload), matching
    ``ingest_verdicts.write_rows``'s explicit db_path parameter. Returns the number
    of rows written.
    """
    if db_path is None:
        db_path = experiments.DB_PATH
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = experiments.connect(db_path)
    try:
        experiments.init_db(conn)
        for row in rows:
            experiments.upsert_timing(conn, row)
        conn.commit()
    finally:
        conn.close()
    return len(rows)


def main() -> int:
    logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(name)s: %(message)s")
    argv = sys.argv[1:]
    apply = "--apply" in argv
    include_self_reported = "--include-self-reported" in argv
    run_ids = [a for a in argv if not a.startswith("--")]
    if not run_ids:
        print("usage: ingest_timings.py <run_id> [<run_id> ...] "
              "[--apply] [--include-self-reported]")
        return 2

    rows, skipped = collect(run_ids, include_self_reported=include_self_reported)
    by_scope: dict[str, int] = {}
    for r in rows:
        sc = str(r.get("scope"))
        by_scope[sc] = by_scope.get(sc, 0) + 1
    cost_mean, n_priced, cost_skipped = per_review_cost(run_ids)
    summary = {
        "run_ids": run_ids,
        "n_rows": len(rows),
        "rows_by_scope": by_scope,
        "skipped_files": skipped,
        # PROXY per-review cost (mean total_est_cost across priced PRs). Hand this
        # to `experiments.py record --cost` as cost_mean; it is the GATE-5 ratio
        # currency, never billed spend. None when no PR recorded a cost block.
        # cost_files_skipped > 0 means the mean is over a PARTIAL set: do not trust
        # it as a complete cost_mean until the skipped files are fixed.
        "cost_mean_proxy": round(cost_mean, 6) if cost_mean is not None else None,
        "prs_priced": n_priced,
        "cost_files_skipped": cost_skipped,
        "db": str(experiments.DB_PATH),
        "applied": apply,
    }
    if apply:
        write_rows(rows)
    else:
        summary["note"] = "dry-run: pass --apply to write these rows to the DB"
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
