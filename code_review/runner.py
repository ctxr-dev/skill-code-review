"""Programmatic runner for the code-reviewer FSM.

Drives the FSM in-process (engine + the real inline handlers) and dispatches the
per-leaf specialists through a **regulated, fault-tolerant thread pool**:

* bounded parallelism via an adaptive concurrency limit (AIMD): the limit shrinks
  on rate-limit signals and grows back on sustained success, between
  ``min_workers`` and ``max_workers``;
* **rate-limit** tolerance: a unit that raises :class:`RateLimitError` triggers a
  multiplicative back-off + retry, and shrinks the pool;
* **context-overflow** tolerance: a unit that raises :class:`ContextOverflowError` is
  sub-sharded (its files split in half) and re-dispatched, so a too-big slice is
  never dropped; an unsplittable single-file overflow becomes a ``failed`` unit;
* 100% coverage: every planned unit is dispatched; a unit that still fails after
  retries becomes a ``status: "failed"`` specialist output (the merge stage
  enforces the no-missed-file invariant) — files are never silently skipped.

The LLM work itself is injected (model-agnostic), mirroring the verifier-dispatch
hook: callers pass ``dispatch_worker`` (single worker states) and
``dispatch_specialist`` (one per leaf-unit), or set the env dotted-path hooks
``CTXR_SCR_WORKER_DISPATCH`` / ``CTXR_SCR_SPECIALIST_DISPATCH``.
"""
from __future__ import annotations

import importlib
import os
import threading
import time
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from typing import Any

from ctxr.fsm.core.engine import advance as engine_advance
from ctxr.fsm.core.engine import execute_inline
from ctxr.fsm.core.inline_registry import InlineHandlerRegistry
from ctxr.fsm.core.models import RunCtx, StateKind

from .handlers import INLINE_HANDLERS
from .spec import SPEC_ID, fsm

# Hooks. dispatch_worker(state_id, inputs) -> outputs dict.
# dispatch_specialist(unit, shared_inputs) -> specialist_output dict.
WorkerDispatch = Callable[[str, dict[str, Any]], dict[str, Any]]
SpecialistDispatch = Callable[[dict[str, Any], dict[str, Any]], dict[str, Any]]

_MAX_STEPS = 512


class RateLimitError(Exception):
    """Raised by a dispatch hook when the provider rate-limits the call."""


class ContextOverflowError(Exception):
    """Raised by a dispatch hook when the unit's input exceeds the context window."""


@dataclass
class RunnerStats:
    dispatched: int = 0
    failed: int = 0
    retries: int = 0
    rate_limit_events: int = 0
    overflow_splits: int = 0
    min_concurrency_seen: int = 0
    max_concurrency_seen: int = 0
    coverage_floor_used: int = 0
    degraded_workers: int = 0
    # Forward timing telemetry. The product runner drives the FSM in-process and
    # never persists a journal, so per-state timing is measured LIVE here. Each
    # stage_timings row is {scope, name, iteration_n, wall_ms}: scope is the FSM
    # state kind (inline/loop/worker/advance), name is the FSM state_id, and
    # wall_ms is real perf_counter wall-clock. total_wall_ms brackets the whole
    # run_review body.
    total_wall_ms: int = 0
    stage_timings: list[dict[str, Any]] = field(default_factory=list)
    # Cost telemetry, summed across every dispatched LLM call (specialists AND
    # worker calls: scanner / tree-descender / trim / ranker). dispatch.py stamps
    # per-call tokens/cost next to wall_ms; these accumulate them so cli.py can
    # surface a run-level total and benchmarks can compute cost_mean. Both
    # total_cost_usd (CLI list-price imputation) and total_est_cost (the
    # dependency-free PROXY) are tracked: est_cost is the GATE-5 comparison
    # currency (one identical estimator for baseline + candidate, so bias cancels
    # in the ratio); cost_usd is the live billed figure where a backend reports it.
    total_in_tokens: int = 0
    total_out_tokens: int = 0
    total_cost_usd: float = 0.0
    total_est_cost: float = 0.0


# Serialises the read-modify-write on the shared RunnerStats cost totals.
# _accumulate_cost runs from the specialist thread-pool workers (_dispatch_one),
# so the plain `+=` on a float/int attribute is a non-atomic load-add-store that
# could lose an update under GIL hand-off. The lock makes the roll-up exact, so
# the cost_mean a benchmark reads is deterministic across concurrent dispatch.
_COST_LOCK = threading.Lock()


def _accumulate_cost(stats: RunnerStats, out: dict[str, Any]) -> None:
    """Fold one dispatch output's per-call cost stamp into the run totals. Reads
    the same keys dispatch.py stamps (tokens_in/out, cost_usd, est_cost); a stamp
    missing (e.g. a degraded worker fallback or a test spec that bypasses
    dispatch.py) contributes 0. Thread-safe (worker threads call this); pure
    accounting that never reads or changes findings."""
    if not isinstance(out, dict):
        return
    ti, to = out.get("tokens_in"), out.get("tokens_out")
    cu, ec = out.get("cost_usd"), out.get("est_cost")
    with _COST_LOCK:
        if isinstance(ti, (int, float)) and not isinstance(ti, bool):
            stats.total_in_tokens += int(ti)
        if isinstance(to, (int, float)) and not isinstance(to, bool):
            stats.total_out_tokens += int(to)
        if isinstance(cu, (int, float)) and not isinstance(cu, bool):
            stats.total_cost_usd += float(cu)
        if isinstance(ec, (int, float)) and not isinstance(ec, bool):
            stats.total_est_cost += float(ec)


def _num(value: Any) -> float | None:
    """Coerce a cost-stamp field to float, excluding bool (a subclass of int)."""
    return float(value) if isinstance(value, (int, float)) and not isinstance(value, bool) else None


def _sum_cost_stamp(results: list[dict[str, Any]]) -> dict[str, Any]:
    """Sum the per-call cost stamp (wall_ms + token/cost fields) across the
    sub-dispatches of one overflow-split leaf, so the merged result carries a stamp
    consistent with what _accumulate_cost already folded into the run totals.

    A field is summed only over sub-results that actually carry it; if NO sub-result
    carried a numeric value the field stays None (never a fabricated 0), matching the
    fail-closed convention the ingest layer reads. tier is taken from the first
    sub-result that has one (the split shares the routed tier)."""
    keys = ("wall_ms", "tokens_in", "tokens_out", "cost_usd", "est_cost")
    stamp: dict[str, Any] = {}
    for key in keys:
        vals = [n for r in results if (n := _num(r.get(key))) is not None]
        if vals:
            stamp[key] = int(sum(vals)) if key in ("wall_ms", "tokens_in", "tokens_out") else sum(vals)
    for r in results:
        if r.get("tier") is not None:
            stamp["tier"] = r["tier"]
            break
    return stamp


# Best-effort worker states: a transient outage degrades to a safe fallback
# output and the review continues, rather than faulting the whole PR. Only
# stages whose absence the downstream FSM tolerates belong here. tool_discovery
# is explicitly best-effort (tools=silent skips missing toolchains anyway).
_DEGRADABLE_WORKERS: dict[str, Callable[[dict[str, Any]], dict[str, Any]]] = {
    "tool_discovery": lambda _env: {"tool_results": []},
}


_FLOOR_PREFIXES = ("lang-", "fw-", "sec-", "footgun-", "orm-", "reliability-", "data-")


def _coverage_floor(
    state_id: str, inputs: dict[str, Any], outputs: dict[str, Any],
    env: dict[str, Any], stats: RunnerStats,
) -> dict[str, Any]:
    """Architectural invariant: a flaky LLM routing worker must never silently
    zero the review. If ``llm_trim`` returns no picked leaves while the
    deterministic ``activated_leaves`` set was non-empty, select deterministically
    from it (bias to correctness/security + project languages) so 100% diff
    coverage holds. No-op on the happy path.
    """
    if state_id != "llm_trim":
        return outputs
    if outputs.get("picked_leaves"):
        return outputs
    activated = env.get("activated_leaves") or inputs.get("stage_a_candidates") or []
    if not isinstance(activated, list) or not activated:
        return outputs
    cap = int(env.get("cap") or env.get("tier_cap") or 20)
    langs = {str(x) for x in (env.get("project_profile") or {}).get("languages") or []}

    def score(leaf: dict[str, Any]) -> int:
        dims = set(leaf.get("dimensions") or [])
        lid = str(leaf.get("id", ""))
        s = 3 if dims & {"security", "correctness"} else 0
        s += 2 if lid.startswith(_FLOOR_PREFIXES) else 0
        s += 1 if any(lang and lang in lid for lang in langs) else 0
        return s + len(leaf.get("activation_match") or [])

    ranked = sorted((lf for lf in activated if isinstance(lf, dict)), key=score, reverse=True)[:cap]
    picked = [
        {"id": lf["id"], "path": lf["path"],
         "justification": "deterministic coverage floor (LLM trim returned empty)",
         "dimensions": lf.get("dimensions") or []}
        for lf in ranked if lf.get("id") and lf.get("path")
    ]
    if not picked:
        return outputs
    stats.coverage_floor_used += 1
    merged = dict(outputs)
    merged["picked_leaves"] = picked
    merged.setdefault("rejected_leaves", [])
    merged.setdefault("coverage_rescues", [])
    return merged


def _inline_fault_detail(res: Any) -> str:
    """Human-readable cause for an inline-state fault. The bare fault_reason
    ('validation_failed') is useless in a 50-PR batch — surface the schema errors
    / failing predicates / detail so a faulted PR says exactly what broke."""
    parts: list[str] = []
    val = getattr(res, "validation", None)
    if val is not None and getattr(val, "errors", None):
        parts.append("schema: " + "; ".join(str(e) for e in val.errors[:5]))
    pv = getattr(res, "post_validations", None)
    if pv is not None and not getattr(pv, "valid", True):
        failed = [e for e in getattr(pv, "results", []) if not getattr(e, "result", True)]
        parts.append("predicate: " + "; ".join(
            f"{getattr(e, 'expression', '?')}({getattr(e, 'error', '') or 'False'})" for e in failed[:5]))
    detail = getattr(res, "fault_detail", None)
    if detail:
        parts.append(str(detail))
    return " | ".join(parts)[:600] or "(no detail)"


def _call_worker_resilient(
    dispatch_worker: WorkerDispatch, state_id: str, inputs: dict[str, Any], *,
    max_retries: int, base_backoff: float, sleep: Callable[[float], None],
    stats: RunnerStats,
) -> dict[str, Any]:
    """Worker-state dispatch with the rate-limit / context-overflow resilience the
    specialist pool already has. Worker states (scan/tree/trim/tools/rank) are
    sequential and single-shot, so without this a transient rate-limit, overload,
    or claude-side timeout on ONE worker call crashes the entire review. Retries
    with exponential back-off; re-raises only after retries are exhausted so the
    caller can fault gracefully (per-PR) instead of the process dying.
    """
    attempt = 0
    while True:
        try:
            return dispatch_worker(state_id, inputs)
        except RateLimitError:
            stats.rate_limit_events += 1
            if attempt >= max_retries:
                raise
            sleep(base_backoff * (2 ** attempt))
            attempt += 1
        except ContextOverflowError:
            stats.overflow_splits += 1
            if attempt >= max_retries:
                raise
            sleep(base_backoff * (2 ** attempt))
            attempt += 1


class _AdaptiveLimiter:
    """AIMD concurrency limiter: additive-increase on success, multiplicative
    (halving) decrease on rate-limit. Bounds the live worker count in [min, max]
    independent of the ThreadPoolExecutor's own ceiling."""

    def __init__(self, limit: int, minimum: int) -> None:
        self._limit = limit
        self._max = limit
        self._min = max(1, minimum)
        self._inflight = 0
        self._cond = threading.Condition()
        self.stats_min = limit
        self.stats_max = limit

    def acquire(self) -> None:
        with self._cond:
            while self._inflight >= self._limit:
                self._cond.wait()
            self._inflight += 1

    def release(self) -> None:
        with self._cond:
            self._inflight -= 1
            self._cond.notify_all()

    def penalize(self) -> None:
        with self._cond:
            self._limit = max(self._min, self._limit // 2)
            self.stats_min = min(self.stats_min, self._limit)
            self._cond.notify_all()

    def reward(self) -> None:
        with self._cond:
            if self._limit < self._max:
                self._limit += 1
                self.stats_max = max(self.stats_max, self._limit)
            self._cond.notify_all()


def _split_unit(unit: dict[str, Any]) -> list[dict[str, Any]] | None:
    """Halve a unit's file list for context-overflow recovery. Returns None when
    the unit cannot be split further (<= 1 file)."""
    files = unit.get("files") or []
    if len(files) <= 1:
        return None
    mid = len(files) // 2
    a = {**unit, "files": files[:mid]}
    b = {**unit, "files": files[mid:]}
    return [a, b]


def _dispatch_one(
    unit: dict[str, Any],
    shared: dict[str, Any],
    dispatch_specialist: SpecialistDispatch,
    limiter: _AdaptiveLimiter,
    stats: RunnerStats,
    *,
    max_retries: int,
    base_backoff: float,
    sleep: Callable[[float], None],
) -> dict[str, Any]:
    """Dispatch a single leaf-unit with rate-limit back-off, overflow sub-shard,
    and bounded retries. Always returns a specialist_output (never raises)."""
    leaf_id = unit.get("leaf_id", "")

    def failed(reason: str) -> dict[str, Any]:
        stats.failed += 1
        return {"id": leaf_id, "status": "failed", "findings": [], "skip_reason": reason}

    attempt = 0
    while True:
        limiter.acquire()  # one acquire per loop iteration; released on every path below
        try:
            out = dispatch_specialist(unit, shared)
        except RateLimitError:
            limiter.release()
            stats.rate_limit_events += 1
            limiter.penalize()
            attempt += 1
            stats.retries += 1
            if attempt > max_retries:
                return failed("rate-limited after retries")
            sleep(base_backoff * (2 ** (attempt - 1)))
            continue
        except ContextOverflowError:
            limiter.release()  # release BEFORE recursing to avoid pool deadlock
            sub = _split_unit(unit)
            if sub is None:
                return failed("context overflow; single file too large")
            stats.overflow_splits += 1
            merged: list[Any] = []
            sub_results: list[dict[str, Any]] = []
            for su in sub:
                r = _dispatch_one(su, shared, dispatch_specialist, limiter, stats,
                                  max_retries=max_retries, base_backoff=base_backoff, sleep=sleep)
                merged.extend(r.get("findings", []))
                sub_results.append(r)
            # Each sub-dispatch already folded its own cost into the run totals via
            # _accumulate_cost, so the run-level rollup is correct. But the merged
            # result must ALSO carry the summed cost stamp, else _per_specialist_timings
            # records est_cost:null for this leaf while the rollup counts it, an
            # inconsistency between the per-specialist row and the run total. Sum the
            # stamps (NOT a re-accumulate; this only labels the merged row).
            overflow_out: dict[str, Any] = {
                "id": leaf_id, "status": "completed", "findings": merged,
            }
            overflow_out.update(_sum_cost_stamp(sub_results))
            return overflow_out
        except Exception as exc:  # a bad unit must not kill the run
            limiter.release()
            attempt += 1
            stats.retries += 1
            if attempt > max_retries:
                return failed(f"error after retries: {type(exc).__name__}")
            sleep(base_backoff * (2 ** (attempt - 1)))
            continue
        else:
            limiter.release()
            limiter.reward()
            stats.dispatched += 1
            _accumulate_cost(stats, out)
            out.setdefault("id", leaf_id)
            out.setdefault("status", "completed")
            out.setdefault("findings", [])
            return out


def _dispatch_units(
    units: list[dict[str, Any]],
    shared: dict[str, Any],
    dispatch_specialist: SpecialistDispatch,
    *,
    max_workers: int,
    min_workers: int,
    max_retries: int,
    base_backoff: float,
    sleep: Callable[[float], None],
    stats: RunnerStats,
) -> dict[tuple[str, int], dict[str, Any]]:
    """Dispatch every unit in parallel via an adaptive thread pool. Returns a
    map (leaf_id, sub_index) -> specialist_output for ALL units (100% coverage)."""
    limiter = _AdaptiveLimiter(max_workers, min_workers)
    results: dict[tuple[str, int], dict[str, Any]] = {}
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {
            pool.submit(_dispatch_one, u, shared, dispatch_specialist, limiter, stats,
                        max_retries=max_retries, base_backoff=base_backoff, sleep=sleep):
            (u.get("leaf_id", ""), int(u.get("sub_index", 1)))
            for u in units
        }
        for fut, key in futures.items():
            results[key] = fut.result()
    stats.min_concurrency_seen = limiter.stats_min
    stats.max_concurrency_seen = limiter.stats_max
    return results


def _resolve_env_hook(var: str) -> Any:
    spec_str = os.environ.get(var)
    if not spec_str or ":" not in spec_str:
        return None
    mod, _, attr = spec_str.partition(":")
    return getattr(importlib.import_module(mod), attr)


def _record_stage(
    stats: RunnerStats, scope: str, name: str, iteration_n: int | None, t0: float,
) -> None:
    """Append one measured per-state timing row. Wall time is real perf_counter
    elapsed since ``t0``, rounded to whole milliseconds. There is no FSM journal
    to backfill from, so this is the only place per-state timing is captured."""
    stats.stage_timings.append({
        "scope": scope,
        "name": name,
        "iteration_n": iteration_n,
        "wall_ms": int((time.perf_counter() - t0) * 1000),
    })


def _per_specialist_timings(
    unit_results: dict[tuple[str, int], dict[str, Any]],
) -> list[dict[str, Any]]:
    """Collect the per-specialist measured wall_ms + cost stamp (both stamped by
    dispatch.py on each specialist output) keyed by leaf_id. On the current
    claude -p CLI the live usage block fills the token counts (cache_creation
    dominates) and cost_usd carries the CLI list-price imputation; backends with
    no usage block fall back to the char-estimate proxy, so est_cost is always
    present while tokens_in/tokens_out reflect the estimate. A result that never
    went through dispatch.py (e.g. a test spec) leaves these None/absent."""
    out: list[dict[str, Any]] = []
    for (leaf_id, _sub), result in sorted(unit_results.items()):
        out.append({
            "leaf_id": leaf_id,
            "wall_ms": result.get("wall_ms"),
            "tokens_in": result.get("tokens_in"),
            "tokens_out": result.get("tokens_out"),
            "cost_usd": result.get("cost_usd"),
            "est_cost": result.get("est_cost"),
            "tier": result.get("tier"),
        })
    return out


def _timings_artifact(
    stats: RunnerStats, unit_results: dict[tuple[str, int], dict[str, Any]],
    run_t0: float,
) -> dict[str, Any]:
    """Assemble the structured timings payload the write_run_directory handler
    persists as timings.json. ``whole_review_ms`` is the elapsed-so-far at the
    moment the artifact is built (write_run_directory runs near the end of the
    run, so this captures the bulk of the wall time even though total_wall_ms is
    only finalised in run_review's finally)."""
    return {
        "whole_review_ms": int((time.perf_counter() - run_t0) * 1000),
        "stage_timings": [dict(row) for row in stats.stage_timings],
        "specialists": _per_specialist_timings(unit_results),
        # Run-level cost roll-up (specialists + worker calls). A PROXY for relative
        # lever comparison, never billed spend: est_cost is the deterministic
        # comparison currency, cost_usd the CLI list-price imputation where present.
        "cost": {
            "total_in_tokens": stats.total_in_tokens,
            "total_out_tokens": stats.total_out_tokens,
            "total_cost_usd": stats.total_cost_usd,
            "total_est_cost": stats.total_est_cost,
        },
    }


@dataclass
class RunResult:
    verdict: Any = None
    run_dir_path: Any = None
    findings: list[Any] = field(default_factory=list)
    stats: RunnerStats = field(default_factory=RunnerStats)
    faulted: bool = False
    fault: str | None = None


def run_review(
    args: dict[str, Any],
    *,
    dispatch_worker: WorkerDispatch | None = None,
    dispatch_specialist: SpecialistDispatch | None = None,
    max_workers: int = 8,
    min_workers: int = 1,
    max_retries: int = 2,
    base_backoff: float = 1.0,
    sleep: Callable[[float], None] = time.sleep,
    registry: InlineHandlerRegistry | None = None,
) -> RunResult:
    """Drive the code-reviewer FSM to terminal, dispatching specialists through
    the adaptive thread pool. ``dispatch_worker`` / ``dispatch_specialist`` are
    the model-agnostic LLM hooks (or set via CTXR_SCR_*_DISPATCH env vars)."""
    dispatch_worker = dispatch_worker or _resolve_env_hook("CTXR_SCR_WORKER_DISPATCH")
    dispatch_specialist = dispatch_specialist or _resolve_env_hook("CTXR_SCR_SPECIALIST_DISPATCH")
    if dispatch_worker is None or dispatch_specialist is None:
        raise ValueError("run_review needs dispatch_worker + dispatch_specialist "
                         "(args or CTXR_SCR_WORKER_DISPATCH / CTXR_SCR_SPECIALIST_DISPATCH)")
    reg = registry or InlineHandlerRegistry()
    reg.register_many(SPEC_ID, INLINE_HANDLERS)
    import uuid as _uuid

    run_id = _uuid.uuid4()
    env: dict[str, Any] = {"args": dict(args), "loop_iters": []}
    state_id = fsm.entry
    iteration_n: int | None = None
    unit_results: dict[tuple[str, int], dict[str, Any]] = {}
    stats = RunnerStats()

    def ctx() -> RunCtx:
        return RunCtx(run_id=run_id, fsm_id=SPEC_ID, current_state=state_id,
                      iteration_n=iteration_n, env=env)

    # Bracket the whole run_review body for total_wall_ms. Every RunResult below
    # carries this same `stats` object by reference, so stamping total_wall_ms in
    # the finally is reflected on whichever RunResult was returned.
    _run_t0 = time.perf_counter()
    try:
        for _ in range(_MAX_STEPS):
            st = fsm.get_state(state_id)
            if st.kind == StateKind.terminal:
                return RunResult(verdict=env.get("verdict"), run_dir_path=env.get("run_dir_path"),
                                 findings=env.get("findings", []), stats=stats)

            if st.kind == StateKind.inline:
                # Refresh the live timing snapshot before every inline state so the
                # write_run_directory handler can read env["timings"] off a generic
                # channel rather than this dispatcher special-casing one state name.
                # The product runner never writes an FSM journal, so this in-process
                # channel is the only way the persisted artifact sees per-state /
                # per-specialist wall time. Assembling it is a cheap dict build over
                # the stats / unit_results already in hand.
                env["timings"] = _timings_artifact(stats, unit_results, _run_t0)
                _t0 = time.perf_counter()
                res = execute_inline(state=st, ctx=ctx(), args=env.get("args", {}),
                                     inputs=env, registry=reg)
                _record_stage(stats, "inline", state_id, iteration_n, _t0)
                if not res.ok:
                    return RunResult(stats=stats, faulted=True,
                                     fault=f"inline:{state_id}:{res.fault_reason}:{_inline_fault_detail(res)}")
                outputs = res.outputs
            elif st.kind == StateKind.loop:  # dispatch_specialists
                _t0 = time.perf_counter()
                if not unit_results:
                    units = [u for b in (env.get("specialist_batches") or []) for u in b.get("units", [])]
                    shared = {k: env.get(k) for k in ("project_profile", "changed_paths",
                                                      "tool_results", "picked_leaves", "args")}
                    unit_results = _dispatch_units(
                        units, shared, dispatch_specialist, max_workers=max_workers,
                        min_workers=min_workers, max_retries=max_retries,
                        base_backoff=base_backoff, sleep=sleep, stats=stats)
                batch_index = iteration_n or 1
                batches = env.get("specialist_batches") or []
                batch = batches[batch_index - 1] if batch_index - 1 < len(batches) else {"units": []}
                iter_outputs = [
                    {"leaf_id": u["leaf_id"], "sub_index": u["sub_index"],
                     "specialist_output": unit_results.get(
                         (u["leaf_id"], int(u["sub_index"])),
                         {"id": u["leaf_id"], "status": "failed", "findings": [],
                          "skip_reason": "no result"})}
                    for u in batch.get("units", [])
                ]
                outputs = {"batch_index": batch_index, "iter_outputs": iter_outputs,
                           "loop_done": batch_index == env.get("total_batches", batch_index)}
                env["loop_iters"].append(outputs)
                _record_stage(stats, "loop", state_id, iteration_n, _t0)
            else:  # worker
                _t0 = time.perf_counter()
                inputs = {k: env.get(k) for k in (st.worker.inputs if st.worker else [])}
                try:
                    outputs = _call_worker_resilient(
                        dispatch_worker, state_id, inputs, max_retries=max_retries,
                        base_backoff=base_backoff, sleep=sleep, stats=stats)
                except (RateLimitError, ContextOverflowError) as exc:
                    fallback = _DEGRADABLE_WORKERS.get(state_id)
                    if fallback is None:
                        _record_stage(stats, "worker", state_id, iteration_n, _t0)
                        return RunResult(stats=stats, faulted=True,
                                         fault=f"worker:{state_id}:{type(exc).__name__}:{exc}")
                    # Best-effort worker (e.g. tool_discovery): degrade, don't fault the
                    # whole review on a transient outage of a non-critical stage.
                    stats.degraded_workers += 1
                    outputs = fallback(env)
                # Worker calls (scanner / tree-descender / trim / ranker) are real
                # LLM calls with real cost; fold their stamp into the run totals so
                # cost_mean covers worker AND specialist cost (the GATE-5 ratio
                # stays apples-to-apples across baseline and candidate). A degraded
                # fallback carries no stamp and contributes 0.
                _accumulate_cost(stats, outputs)
                outputs = _coverage_floor(state_id, inputs, outputs, env, stats)
                _record_stage(stats, "worker", state_id, iteration_n, _t0)

            _adv_t0 = time.perf_counter()
            adv = engine_advance(fsm, ctx(), outputs)
            _record_stage(stats, "advance", state_id, iteration_n, _adv_t0)
            if adv.kind == "fault":
                return RunResult(stats=stats, faulted=True,
                                 fault=f"advance:{adv.reason}:{adv.errors}")
            if adv.kind == "loop_continue":
                iteration_n = adv.iteration_n
                env = {**env, **outputs}
                continue
            env = {**env, **outputs}
            if adv.kind == "terminal":
                state_id = "terminal"
                continue
            state_id = adv.next_state or "terminal"
            iteration_n = None

        return RunResult(stats=stats, faulted=True, fault="max_steps_exceeded")
    finally:
        stats.total_wall_ms = int((time.perf_counter() - _run_t0) * 1000)
