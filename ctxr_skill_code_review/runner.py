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
            for su in sub:
                r = _dispatch_one(su, shared, dispatch_specialist, limiter, stats,
                                  max_retries=max_retries, base_backoff=base_backoff, sleep=sleep)
                merged.extend(r.get("findings", []))
            return {"id": leaf_id, "status": "completed", "findings": merged}
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

    for _ in range(_MAX_STEPS):
        st = fsm.get_state(state_id)
        if st.kind == StateKind.terminal:
            return RunResult(verdict=env.get("verdict"), run_dir_path=env.get("run_dir_path"),
                             findings=env.get("findings", []), stats=stats)

        if st.kind == StateKind.inline:
            res = execute_inline(state=st, ctx=ctx(), args=env.get("args", {}),
                                 inputs=env, registry=reg)
            if not res.ok:
                return RunResult(stats=stats, faulted=True,
                                 fault=f"inline:{state_id}:{res.fault_reason}:{_inline_fault_detail(res)}")
            outputs = res.outputs
        elif st.kind == StateKind.loop:  # dispatch_specialists
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
        else:  # worker
            inputs = {k: env.get(k) for k in (st.worker.inputs if st.worker else [])}
            try:
                outputs = _call_worker_resilient(
                    dispatch_worker, state_id, inputs, max_retries=max_retries,
                    base_backoff=base_backoff, sleep=sleep, stats=stats)
            except (RateLimitError, ContextOverflowError) as exc:
                return RunResult(stats=stats, faulted=True,
                                 fault=f"worker:{state_id}:{type(exc).__name__}:{exc}")
            outputs = _coverage_floor(state_id, inputs, outputs, env, stats)

        adv = engine_advance(fsm, ctx(), outputs)
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
