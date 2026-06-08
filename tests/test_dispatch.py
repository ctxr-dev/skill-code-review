"""Tests for the agent-agnostic dispatch helpers: leaf compaction (so a large
activated_leaves set is never truncated mid-array) and rehydration of the heavy
fields stripped for the prompt."""
from __future__ import annotations

import json

import pytest

from code_review.dispatch import (
    _apply_rank_decisions,
    _compact_inputs,
    _index_by_id,
    _parse_json,
    _rehydrate,
    _route_tier,
    _strip_nulls,
)
from code_review.runner import ContextOverflowError, RateLimitError


def test_strip_nulls_drops_null_optional_fields() -> None:
    """A completed specialist emitting skip_reason: null must not fault the merge
    (schema wants string-or-absent). Nulls are dropped recursively."""
    out = _strip_nulls({
        "id": "lang-python", "status": "completed", "skip_reason": None,
        "findings": [{"severity": "important", "file": "a.py", "title": "x",
                      "line": None, "fix": None, "impact": "boom"}],
    })
    assert "skip_reason" not in out
    f = out["findings"][0]
    assert "line" not in f and "fix" not in f  # null optionals dropped
    assert f["impact"] == "boom" and f["severity"] == "important"  # real values kept


def test_parse_json_empty_or_garbage_is_retryable_not_crash() -> None:
    """An empty / unparseable agent response must surface as a retryable
    RateLimitError (the runner retries it), NOT a raw JSONDecodeError that
    crashes the whole review (the grafana pilot failure)."""
    with pytest.raises(RateLimitError):
        _parse_json("")
    with pytest.raises(RateLimitError):
        _parse_json("   \n ")
    with pytest.raises(RateLimitError):
        _parse_json("I could not complete this request.")


def test_parse_json_reclassifies_overflow_phrasing() -> None:
    with pytest.raises(ContextOverflowError):
        _parse_json("Error: prompt is too long for the model context window")


def test_parse_json_extracts_object_through_fences_and_prose() -> None:
    assert _parse_json('```json\n{"a": 1}\n```')["a"] == 1
    assert _parse_json('here you go: {"x": [1,2]} done')["x"] == [1, 2]


def test_apply_rank_decisions_attaches_scores_drops_dupes_defaults_missing() -> None:
    findings = [
        {"severity": "critical", "file": "a.py", "line": 1, "title": "real bug",
         "description": "d", "impact": "i", "fix": "f"},   # 0: scored high
        {"severity": "minor", "file": "b.py", "line": 2, "title": "style"},      # 1: scored low
        {"severity": "important", "file": "a.py", "line": 1, "title": "dup of 0"},  # 2: dropped dup
        {"severity": "critical", "file": "c.py", "line": 3, "title": "unscored"},   # 3: omitted -> default
    ]
    decisions = [
        {"i": 0, "defect_confidence": 0.95, "primary": True},
        {"i": 1, "defect_confidence": 0.2, "primary": False},
        {"i": 2, "defect_confidence": 0.9, "primary": True, "drop": True, "merge_into": 0},
    ]
    out = _apply_rank_decisions(findings, decisions, {"primary-threshold": 0.75})
    titles = [f["title"] for f in out["findings"]]
    assert titles == ["real bug", "style", "unscored"]  # dup dropped, others kept
    assert out["findings"][0]["defect_confidence"] == 0.95 and out["findings"][0]["primary"] is True
    assert out["findings"][1]["primary"] is False
    # omitted finding keeps a severity-derived default, primary via threshold
    assert out["findings"][2]["defect_confidence"] == 0.9 and out["findings"][2]["primary"] is True
    # full fields preserved (ranker never re-emits them, so they can't be lost)
    assert out["findings"][0]["impact"] == "i" and out["findings"][0]["fix"] == "f"
    assert out["severity_counts"] == {"critical": 2, "important": 0, "minor": 1}


def test_apply_rank_decisions_none_keeps_all_with_defaults() -> None:
    """A malformed/empty ranker response must NOT lose findings."""
    findings = [{"severity": "critical", "file": "a.py", "line": 1, "title": "t"}]
    out = _apply_rank_decisions(findings, None, {})
    assert len(out["findings"]) == 1
    assert out["findings"][0]["defect_confidence"] == 0.9  # critical default
    assert out["findings"][0]["primary"] is True


def _big_leaf(i: int) -> dict:
    return {
        "id": f"leaf-{i:03d}", "path": f"x/leaf-{i:03d}.md",
        "activation_match": ["file_globs"], "focus": "f" * 120,
        "dimensions": ["security"] if i % 2 else ["readability"],
        "covers": [f"covers item {j} " * 8 for j in range(18)],  # the bulk
        "audit_surface": ["a" * 200], "tags": ["t1", "t2", "t3"],
    }


def test_compaction_keeps_every_leaf_and_shrinks_payload() -> None:
    """The whole point: compaction must NOT drop leaves (truncation did), only
    slim each one. A 130-leaf raw payload that would exceed any char cap fits."""
    leaves = [_big_leaf(i) for i in range(130)]
    inputs = {"activated_leaves": leaves, "changed_paths": ["a.py"]}
    raw_len = len(json.dumps(inputs, default=str))
    compact = _compact_inputs(inputs)
    comp_len = len(json.dumps(compact, default=str))
    # Same leaf COUNT (no array truncation) ...
    assert len(compact["activated_leaves"]) == 130
    # ... and the alphabetically-late, security leaves survive (the regression).
    ids = [lf["id"] for lf in compact["activated_leaves"]]
    assert "leaf-129" in ids and "leaf-001" in ids
    # ... but materially smaller (covers trimmed to 3, audit_surface dropped).
    assert comp_len < raw_len * 0.5
    assert all("audit_surface" not in lf for lf in compact["activated_leaves"])
    assert all(len(lf.get("covers", [])) <= 3 for lf in compact["activated_leaves"])
    # Non-leaf keys pass through untouched.
    assert compact["changed_paths"] == ["a.py"]


def test_rehydrate_reattaches_stripped_fields_llm_fields_win() -> None:
    source = _index_by_id([_big_leaf(1), _big_leaf(2)])
    picked = [{"id": "leaf-001", "justification": "real bug surface",
               "dimensions": ["correctness"]}]  # LLM output, no covers/path
    out = _rehydrate(picked, source)
    assert len(out) == 1
    # full metadata re-attached from source ...
    assert out[0]["path"] == "x/leaf-001.md"
    assert len(out[0]["covers"]) == 18  # source covers restored
    # ... but the LLM's own fields win.
    assert out[0]["justification"] == "real bug surface"
    assert out[0]["dimensions"] == ["correctness"]


def test_rehydrate_keeps_unknown_ids() -> None:
    out = _rehydrate([{"id": "ghost", "path": "p"}], {})
    assert out == [{"id": "ghost", "path": "p"}]


def test_route_tier_correctness_security_to_strong() -> None:
    assert _route_tier("sec-csrf", ["security"]) == "strong"
    assert _route_tier("lang-python", None) == "strong"
    assert _route_tier("antipattern-copy-paste", ["readability"]) == "cheap"
