"""Unit tests for code_review.cost: the price table, the dependency-free token
estimator, est_cost math, envelope parsing, and the per-call cost stamp.

These pin the PROXY arithmetic that GATE-5 rides on: the same est_cost function
must price baseline and candidate identically, so the math here is the contract.
Prices are pinned from the claude-api skill (Opus $5/$25, Sonnet $3/$15 per MTok;
cache_write 1.25x input, cache_read 0.1x input)."""
from __future__ import annotations

import pytest

from code_review import cost


def test_price_table_pins_skill_prices() -> None:
    strong, cheap = cost.PRICE_TABLE["strong"], cost.PRICE_TABLE["cheap"]
    # Opus: $5 in / $25 out per MTok -> per-token.
    assert strong["in"] == 5.00 / 1_000_000
    assert strong["out"] == 25.00 / 1_000_000
    # Sonnet: $3 in / $15 out per MTok.
    assert cheap["in"] == 3.00 / 1_000_000
    assert cheap["out"] == 15.00 / 1_000_000
    # Cache multipliers on the input rate: write 1.25x, read 0.1x.
    assert strong["cache_write"] == strong["in"] * 1.25
    assert strong["cache_read"] == strong["in"] * 0.1


def test_unknown_tier_falls_back_to_cheap_never_raises() -> None:
    # dispatch defaults the model to sonnet; an unknown tier must not crash mid-review.
    assert cost.est_cost("bogus", 100, 100) == cost.est_cost("cheap", 100, 100)


def test_est_tokens_from_chars_ceil_div_4() -> None:
    assert cost.est_tokens_from_chars("") == 0
    assert cost.est_tokens_from_chars("abcd") == 1
    assert cost.est_tokens_from_chars("abcde") == 2  # ceil(5/4)
    assert cost.est_tokens_from_chars("a" * 400) == 100


def test_est_cost_math_with_cache() -> None:
    # Opus: 100 in * 5e-6 + 50 out * 25e-6 = 0.0005 + 0.00125 = 0.00175.
    # approx, not ==: 5e-6/25e-6/0.00175 are not exactly representable in IEEE 754.
    assert cost.est_cost("strong", 100, 50) == pytest.approx(0.00175, rel=1e-12)
    # Add cache: 1000 cache_write * (5e-6 * 1.25) + 2000 cache_read * (5e-6 * 0.1).
    p = cost.PRICE_TABLE["strong"]
    expect = 100 * p["in"] + 50 * p["out"] + 1000 * p["cache_write"] + 2000 * p["cache_read"]
    assert cost.est_cost("strong", 100, 50, 1000, 2000) == pytest.approx(expect, rel=1e-12)


def test_usage_from_envelope_reads_top_level_keys() -> None:
    env = {
        "result": "ignored",
        "usage": {
            "input_tokens": 3, "output_tokens": 200,
            "cache_creation_input_tokens": 18634, "cache_read_input_tokens": 11,
        },
        "total_cost_usd": 0.0699,
    }
    u = cost.usage_from_envelope(env)
    assert u is not None
    assert u["in_tokens"] == 3 and u["out_tokens"] == 200
    assert u["cache_create"] == 18634 and u["cache_read"] == 11
    assert u["cost_usd"] == 0.0699


def test_usage_from_envelope_missing_keys_returns_none() -> None:
    # A future CLI that drops usage/total_cost_usd degrades to None (char estimate),
    # never a KeyError.
    assert cost.usage_from_envelope({"result": "x"}) is None
    assert cost.usage_from_envelope({}) is None


def test_usage_from_envelope_cost_only_without_usage_block() -> None:
    u = cost.usage_from_envelope({"total_cost_usd": 0.2198})
    assert u is not None
    assert u["in_tokens"] == 0 and u["cost_usd"] == 0.2198


def test_call_cost_fields_live_usage_uses_real_tokens() -> None:
    usage = {"in_tokens": 3, "out_tokens": 200, "cache_create": 18000,
             "cache_read": 5, "cost_usd": 0.0699}
    f = cost.call_cost_fields("cheap", usage, "prompt", "response")
    assert f["tier"] == "cheap"
    assert f["tokens_in"] == 3 and f["tokens_out"] == 200
    assert f["cache_create"] == 18000 and f["cache_read"] == 5
    assert f["cost_usd"] == 0.0699
    assert f["est_cost"] == cost.est_cost("cheap", 3, 200, 18000, 5)


def test_call_cost_fields_no_usage_falls_back_to_char_estimate() -> None:
    # 40-char prompt -> 10 tokens, 80-char response -> 20 tokens.
    f = cost.call_cost_fields("strong", None, "a" * 40, "b" * 80)
    assert f["tokens_in"] == 10 and f["tokens_out"] == 20
    assert f["cache_create"] == 0 and f["cache_read"] == 0
    assert f["cost_usd"] is None  # nothing billed under the proxy
    assert f["est_cost"] == cost.est_cost("strong", 10, 20)
