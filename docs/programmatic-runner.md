# Programmatic Runner

The programmatic runner ([runner.py](../code_review/runner.py)) drives the code-reviewer's 19-state FSM in-process (the real engine plus the inline handlers, no MCP round-trips) and dispatches the per-leaf specialists through a regulated, fault-tolerant thread pool. The LLM work itself is injected via two model-agnostic hooks, so the runner owns concurrency, retries, and coverage while the caller owns "how do I actually call the model". The goal is 100% diff coverage with bounded parallelism: every planned unit is dispatched, transient failures recover, and a unit that still fails becomes an explicit `failed` output rather than a silently dropped file.

## Overview

`run_review(args, ...)` ([runner.py:340](../code_review/runner.py#L340)) loops the FSM to a terminal state, capped at `_MAX_STEPS = 512` ([runner.py:47](../code_review/runner.py#L47)). Each step reads the current state kind and acts:

- **inline** states run server-side via the registered Python handlers.
- **worker** states (scan / tree / trim / tools / rank) dispatch a single call through `dispatch_worker`.
- the **loop** state (`dispatch_specialists`) fans out one specialist call per leaf-unit through the adaptive pool.

Two hooks carry the actual model calls:

- `dispatch_worker(state_id, inputs) -> outputs` for single worker states.
- `dispatch_specialist(unit, shared_inputs) -> specialist_output` for each leaf-unit.

They are passed as kwargs, or resolved from dotted `module:function` env vars `CTXR_SCR_WORKER_DISPATCH` / `CTXR_SCR_SPECIALIST_DISPATCH` via `_resolve_env_hook` ([runner.py:322](../code_review/runner.py#L322)). If neither a kwarg nor an env hook supplies both, `run_review` raises `ValueError` ([runner.py:357](../code_review/runner.py#L357)).

Defaults: `max_workers=8`, `min_workers=1`, `max_retries=2`, `base_backoff=1.0` ([runner.py:345](../code_review/runner.py#L345)).

## Concurrency (AIMD limiter)

`_AdaptiveLimiter` ([runner.py:177](../code_review/runner.py#L177)) is an AIMD (additive-increase, multiplicative-decrease) gate that bounds live workers in `[min, max]` independently of the `ThreadPoolExecutor` ceiling:

- `acquire()` blocks on a `threading.Condition` while `_inflight >= _limit`, then increments `_inflight`.
- `release()` decrements `_inflight` and notifies waiters.
- `penalize()` halves the limit on a rate-limit signal: `_limit = max(_min, _limit // 2)`.
- `reward()` grows the limit by 1 toward `_max` on a success.

It tracks `stats_min` / `stats_max`, the observed minimum and maximum limit, which are copied into the run stats after dispatch ([runner.py:317](../code_review/runner.py#L317)).

## Fault tolerance (rate-limit + context-overflow)

Two custom exceptions signal recoverable provider conditions: `RateLimitError` and `ContextOverflowError` ([runner.py:50](../code_review/runner.py#L50)).

**Worker states** use `_call_worker_resilient` ([runner.py:147](../code_review/runner.py#L147)): on either exception it sleeps `base_backoff * 2^attempt` and retries up to `max_retries`, then re-raises so the caller can fault gracefully per-PR instead of crashing the process.

**Specialist units** use `_dispatch_one` ([runner.py:228](../code_review/runner.py#L228)), which always returns a specialist_output and never raises:

- on `RateLimitError`: release, `penalize()` the limiter, back off, retry; after `max_retries` it returns a `failed` unit ("rate-limited after retries").
- on `ContextOverflowError`: release **before** recursing (to avoid a pool deadlock), then `_split_unit` ([runner.py:216](../code_review/runner.py#L216)) halves the unit's file list and re-dispatches each half. A single-file unit that cannot be split becomes a `failed` unit ("context overflow; single file too large").
- on any other exception: back off and retry, then `failed` after retries (a bad unit must not kill the run).
- on success: release, `reward()` the limiter, and fill in default `id` / `status` / `findings`.

## Coverage floor

`_coverage_floor` ([runner.py:83](../code_review/runner.py#L83)) is an architectural invariant guarding the `llm_trim` worker: a flaky routing call must never silently zero the review. It is a no-op except when `state_id == "llm_trim"`, `picked_leaves` is empty, and the deterministic `activated_leaves` set is non-empty. In that case it scores each leaf deterministically:

- `+3` if its dimensions intersect `{security, correctness}`,
- `+2` if its id starts with one of `_FLOOR_PREFIXES` ([runner.py:80](../code_review/runner.py#L80)): `lang-`, `fw-`, `sec-`, `footgun-`, `orm-`, `reliability-`, `data-`,
- `+1` if a project language appears in its id,
- plus the count of its `activation_match` entries.

It takes the top `cap` leaves (default 20), rewrites `picked_leaves` with a "deterministic coverage floor" justification, and increments `stats.coverage_floor_used`.

## Degradable workers

`_DEGRADABLE_WORKERS` ([runner.py:75](../code_review/runner.py#L75)) is a whitelist of best-effort worker states whose absence the downstream FSM tolerates. It currently holds exactly one entry, `tool_discovery`, which degrades to `{"tool_results": []}`. When a degradable worker exhausts its retries with a rate-limit or overflow, the runner increments `stats.degraded_workers` and substitutes the fallback output instead of faulting the whole review ([runner.py:417](../code_review/runner.py#L417)). A non-degradable worker that exhausts retries faults the run.

## Stats and observability

`RunnerStats` ([runner.py:58](../code_review/runner.py#L58)) accumulates across the run:

| field | meaning |
| --- | --- |
| `dispatched` | specialist units completed successfully |
| `failed` | specialist units that became `failed` outputs |
| `retries` | specialist retry attempts |
| `rate_limit_events` | `RateLimitError` occurrences (worker + specialist) |
| `overflow_splits` | context-overflow sub-shard splits |
| `min_concurrency_seen` | lowest limiter value observed |
| `max_concurrency_seen` | highest limiter value observed |
| `coverage_floor_used` | times the `llm_trim` coverage floor fired |
| `degraded_workers` | best-effort workers that fell back |

For faulted inline states, `_inline_fault_detail` ([runner.py:128](../code_review/runner.py#L128)) surfaces schema errors, failing post-validation predicates, and any `fault_detail` so a faulted PR reports exactly what broke instead of a bare reason.

## Entry point and RunResult

`run_review` returns a `RunResult` ([runner.py:330](../code_review/runner.py#L330)). On a clean terminal exit it carries `verdict`, `run_dir_path`, `findings`, and `stats` pulled from the FSM env ([runner.py:378](../code_review/runner.py#L378)). On failure it returns `faulted=True` with a `fault` string, for example:

- `inline:<state>:<reason>:<detail>` when an inline state rejects.
- `worker:<state>:<ExceptionType>:<msg>` when a non-degradable worker exhausts retries.
- `advance:<reason>:<errors>` when the engine refuses to advance.
- `max_steps_exceeded` if the loop hits `_MAX_STEPS`.
