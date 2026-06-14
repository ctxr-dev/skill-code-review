"""Per-call cost capture for the code-reviewer dispatch layer.

Pure, dependency-free helpers. Two layers of cost telemetry ride alongside the
EXISTING ``wall_ms`` stamp on each dispatch output; nothing here touches the
review behaviour (no prompt change, no extra API call, no branch on a token
value), so the findings a review produces are byte-identical with capture on or
off. This module is the one swappable home for the price table and the token
estimator.

HONESTY CLAUSE (load-bearing, mirrored in benchmarks/STATE.md). Under the flat
``claude -p`` subscription NO per-review dollar is actually billed. The CLI's
``total_cost_usd`` is a LIST-PRICE imputation (the CLI computes it from public
per-token prices), and ``est_cost`` below is a deterministic PROXY built from
the same price table. Both exist ONLY for RELATIVE lever comparison
(benchmark GATE-5: candidate_cost <= 1.25x baseline_cost). The RATIO is what
matters, not the absolute dollar figure: because ``est_cost`` is computed by one
identical function for baseline and candidate, systematic bias cancels in the
ratio WHEN both sides share the same telemetry path (both priced from a live
usage block, or both from the char estimate). It does NOT cancel if you mix a
retroactive char-estimate baseline with live-usage candidates: the char estimate
omits cache-creation tokens (which dominate live usage), so a mixed ratio is
biased. Always anchor GATE-5 on a fresh same-path baseline. ``cost_mean`` must
always be labelled a proxy, never billed spend.

PRICE SOURCE. Per-MTok USD pinned from the ``claude-api`` skill pricing
reference (cached 2026-06-04), NOT from memory:

  * Opus 4.x   (tier "strong"): input $5.00 / output $25.00 per MTok
  * Sonnet 4.6 (tier "cheap") : input $3.00 / output $15.00 per MTok

Cache pricing follows the documented multipliers on the INPUT rate:
cache_write ~= 1.25x input (5-minute TTL), cache_read ~= 0.1x input.
Source: claude-api skill, shared/prompt-caching.md (cached 2026-06-04).
"""
from __future__ import annotations

import math
from typing import Any

# Per-token USD (per-MTok price / 1e6). Named constants with the dated source so
# a future price change is a one-line edit here, not a hunt through dispatch.py.
# Source: claude-api skill (cached 2026-06-04). Do NOT invent these from memory.
_PER_MTOK = 1_000_000.0
_OPUS_IN_PER_MTOK = 5.00
_OPUS_OUT_PER_MTOK = 25.00
_SONNET_IN_PER_MTOK = 3.00
_SONNET_OUT_PER_MTOK = 15.00
# Cache multipliers on the INPUT rate (shared/prompt-caching.md, 2026-06-04).
_CACHE_WRITE_MULT = 1.25  # 5-minute TTL write premium
_CACHE_READ_MULT = 0.1    # cache-read discount
# Chars-per-token ratio for the dependency-free estimate (no tokenizer vendored).
# A rough English/code average; the estimator is a PROXY and swappable behind one
# function, so this lives next to the other named constants rather than as a bare
# literal in est_tokens_from_chars.
_CHARS_PER_TOKEN_ESTIMATE = 4


def _row(in_per_mtok: float, out_per_mtok: float) -> dict[str, float]:
    in_tok = in_per_mtok / _PER_MTOK
    out_tok = out_per_mtok / _PER_MTOK
    return {
        "in": in_tok,
        "out": out_tok,
        "cache_write": in_tok * _CACHE_WRITE_MULT,
        "cache_read": in_tok * _CACHE_READ_MULT,
    }


# Per-tier $/token table. "strong" routes to Opus, "cheap" to Sonnet, matching
# dispatch._route_tier and claude_run's tier->model map. An unknown tier falls
# back to the cheap row (the dispatch default model is sonnet), so a typo never
# raises mid-review.
PRICE_TABLE: dict[str, dict[str, float]] = {
    "strong": _row(_OPUS_IN_PER_MTOK, _OPUS_OUT_PER_MTOK),
    "cheap": _row(_SONNET_IN_PER_MTOK, _SONNET_OUT_PER_MTOK),
}


def _price(tier: str) -> dict[str, float]:
    return PRICE_TABLE.get(tier, PRICE_TABLE["cheap"])


def est_tokens_from_chars(text: str) -> int:
    """Dependency-free token estimate: ceil(chars / 4).

    tiktoken / anthropic are NOT vendored (absent from system python and the
    project .venv) and adding a runtime dep violates the repo zero-new-runtime-dep
    rule, so ceil(chars/4) is the honest dependency-free proxy. It is rough for
    code/JSON-heavy text, but it is a PROXY by design and is swappable behind this
    one function if a real tokenizer is ever allowed. ``in_tokens`` and
    ``out_tokens`` estimated this way feed the SAME ``est_cost`` used for both
    baseline and candidate, so the estimator bias cancels in the GATE-5 ratio.
    """
    return math.ceil(len(text) / _CHARS_PER_TOKEN_ESTIMATE) if text else 0


def est_cost(
    tier: str,
    in_tokens: int,
    out_tokens: int,
    cache_write: int = 0,
    cache_read: int = 0,
) -> float:
    """Proxy cost in USD for one call, from token counts and the tier price row.

    This is the COMPARISON CURRENCY: it is computed identically for baseline and
    candidate (and for every backend), so systematic bias cancels in the GATE-5
    ratio. When a live usage block is present the cache_* counts come from it;
    when it is absent (codex/cursor, or any retroactive estimate) they are 0 and
    in/out come from the char estimate. Never a billed figure.
    """
    p = _price(tier)
    return (
        in_tokens * p["in"]
        + out_tokens * p["out"]
        + cache_write * p["cache_write"]
        + cache_read * p["cache_read"]
    )


def _as_int(value: Any) -> int | None:
    return int(value) if isinstance(value, (int, float)) and not isinstance(value, bool) else None


def usage_from_envelope(env: dict[str, Any]) -> dict[str, Any] | None:
    """Parse the live usage block out of a ``claude -p --output-format json``
    envelope (already ``json.loads``-ed in dispatch.claude_run). Returns a flat
    usage dict or ``None`` when the keys are absent (a future CLI rename, or a
    backend that does not emit usage) so the caller degrades to the char-estimate
    proxy instead of crashing.

    Reads the ALIAS-AGNOSTIC top-level ``env["usage"]`` and ``env["total_cost_usd"]``
    (NOT ``modelUsage[<alias>]``: the CLI resolves ``--model opus/sonnet`` to the
    RESOLVED id, e.g. ``claude-opus-4-8``, so indexing modelUsage by the alias
    KeyErrors). cache_creation_input_tokens DOMINATES on this CLI (single-digit
    input_tokens vs tens of thousands of cache-creation), which is why we capture
    every field rather than just input/output.
    """
    if not isinstance(env, dict):
        return None
    usage = env.get("usage")
    cost = env.get("total_cost_usd")
    if not isinstance(usage, dict) and not isinstance(cost, (int, float)):
        return None
    u = usage if isinstance(usage, dict) else {}
    return {
        "in_tokens": _as_int(u.get("input_tokens")) or 0,
        "out_tokens": _as_int(u.get("output_tokens")) or 0,
        "cache_create": _as_int(u.get("cache_creation_input_tokens")) or 0,
        "cache_read": _as_int(u.get("cache_read_input_tokens")) or 0,
        # CLI list-price imputation (a proxy, see HONESTY CLAUSE). May be None if
        # only the usage block was present without total_cost_usd.
        "cost_usd": float(cost) if isinstance(cost, (int, float)) and not isinstance(cost, bool) else None,
    }


def call_cost_fields(
    tier: str,
    usage: dict[str, Any] | None,
    prompt: str,
    response_text: str,
) -> dict[str, Any]:
    """Build the per-call cost stamp added next to the EXISTING ``wall_ms`` on a
    dispatch output. Pure: reads token counts, never changes the review.

    With a live usage block (claude backend on the current CLI): real token
    counts + the CLI-billed ``cost_usd`` (list-price imputation), plus an
    ``est_cost`` computed from the SAME price table over those same live tokens so
    the proxy currency is comparable across backends.

    Without a usage block (codex/cursor, or a CLI that dropped the keys): tokens
    come from the char estimate (ceil(chars/4)) over the reconstructed prompt and
    the response text; ``cost_usd`` stays None and ``est_cost`` is the proxy.
    """
    if usage is not None:
        # Coerce via _as_int (excludes bool, returns None on non-numeric) so a
        # malformed usage value degrades to 0 rather than raising in int(...) and
        # crashing dispatch: the dispatch layer is meant to drop only cost telemetry
        # on bad shapes, never hard-fail the review.
        in_tok = _as_int(usage.get("in_tokens")) or 0
        out_tok = _as_int(usage.get("out_tokens")) or 0
        cache_create = _as_int(usage.get("cache_create")) or 0
        cache_read = _as_int(usage.get("cache_read")) or 0
        # cost_usd is a billed float (kept None when absent); validate it is numeric
        # and not bool, else drop it rather than stamping a non-numeric value.
        cu = usage.get("cost_usd")
        cost_usd = float(cu) if isinstance(cu, (int, float)) and not isinstance(cu, bool) else None
        # A usage dict can be present yet carry NO token counts: usage_from_envelope
        # returns a dict whenever total_cost_usd is present even if the usage block
        # itself was absent. All-zero tokens against a non-empty prompt/response is
        # missing token telemetry, not a free call; estimating est_cost at 0 there
        # would make a real call look free and pull total_est_cost toward 0. Fall
        # back to the char estimate for the token counts (PRESERVING the CLI-billed
        # cost_usd if it was provided) so est_cost stays a positive proxy.
        if in_tok == 0 and out_tok == 0 and cache_create == 0 and cache_read == 0 and (prompt or response_text):
            in_tok = est_tokens_from_chars(prompt)
            out_tok = est_tokens_from_chars(response_text)
    else:
        in_tok = est_tokens_from_chars(prompt)
        out_tok = est_tokens_from_chars(response_text)
        cache_create = 0
        cache_read = 0
        cost_usd = None
    return {
        "tier": tier,
        "tokens_in": in_tok,
        "tokens_out": out_tok,
        "cache_create": cache_create,
        "cache_read": cache_read,
        "cost_usd": cost_usd,
        "est_cost": est_cost(tier, in_tok, out_tok, cache_create, cache_read),
    }
