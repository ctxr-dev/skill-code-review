"""Tests for handle_risk_tier_triage."""

from __future__ import annotations

from ctxr_skill_code_review.handlers import handle_risk_tier_triage


def test_trivial_single_file_small_diff_no_risk(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """≤ 10 lines, 1 file, no risk keyword → tier=trivial, cap=3."""
    ctx = make_ctx(
        inputs={
            "project_profile": {"languages": ["python"], "frameworks": []},
            "changed_paths": ["src/util.py"],
            "diff_stats": {"lines_changed": 5, "files_changed": 1},
        },
    )
    result = handle_risk_tier_triage(ctx)
    assert result["tier"] == "trivial"
    assert result["cap"] == 3
    assert result["risk_signals"] == []
    assert result["scope_overrides_present"] is False
    # The v2.5.1 wording uses the ≤ glyph; preserve byte-for-byte.
    assert "≤ 10 lines" in result["tier_rationale"]


def test_lite_small_diff_no_risk(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """≤ 100 lines, ≤ 5 files, no risk → tier=lite, cap=8."""
    ctx = make_ctx(
        inputs={
            "project_profile": {"languages": ["python"], "frameworks": []},
            "changed_paths": ["a.py", "b.py", "c.py"],
            "diff_stats": {"lines_changed": 40, "files_changed": 3},
        },
    )
    result = handle_risk_tier_triage(ctx)
    assert result["tier"] == "lite"
    assert result["cap"] == 8


def test_full_large_diff_no_risk(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """> 100 lines OR > 5 files → tier=full, cap=20."""
    ctx = make_ctx(
        inputs={
            "project_profile": {"languages": ["python"]},
            "changed_paths": ["x.py"],
            "diff_stats": {"lines_changed": 250, "files_changed": 1},
        },
    )
    result = handle_risk_tier_triage(ctx)
    assert result["tier"] == "full"
    assert result["cap"] == 20


def test_sensitive_risk_keyword(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """A keyword match (e.g. "auth") promotes to tier=sensitive, cap=30."""
    ctx = make_ctx(
        inputs={
            "project_profile": {"languages": ["python"]},
            "changed_paths": ["src/auth/login.py"],
            "diff_stats": {"lines_changed": 5, "files_changed": 1},
        },
    )
    result = handle_risk_tier_triage(ctx)
    assert result["tier"] == "sensitive"
    assert result["cap"] == 30
    assert "keyword:auth" in result["risk_signals"]


def test_sensitive_high_risk_path_pattern(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """A high-risk path pattern (e.g. /migrations/) fires path:* signal."""
    ctx = make_ctx(
        inputs={
            "project_profile": {"languages": ["python"]},
            "changed_paths": ["app/migrations/0001_init.py"],
            "diff_stats": {"lines_changed": 5, "files_changed": 1},
        },
    )
    result = handle_risk_tier_triage(ctx)
    assert result["tier"] == "sensitive"
    assert any(s.startswith("path:") for s in result["risk_signals"])


def test_iac_profile_signal(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """A non-empty `project_profile.iac` array fires profile:iac-present."""
    ctx = make_ctx(
        inputs={
            "project_profile": {"languages": ["go"], "iac": ["terraform"]},
            "changed_paths": ["server.go"],
            "diff_stats": {"lines_changed": 5, "files_changed": 1},
        },
    )
    result = handle_risk_tier_triage(ctx)
    assert "profile:iac-present" in result["risk_signals"]
    assert result["tier"] == "sensitive"


def test_scope_overrides_detected(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """Any scope-* arg flips scope_overrides_present."""
    ctx = make_ctx(
        inputs={
            "project_profile": {"languages": ["python"]},
            "changed_paths": ["a.py"],
            "diff_stats": {"lines_changed": 5, "files_changed": 1},
        },
        args={"scope-dir": "src/"},
    )
    result = handle_risk_tier_triage(ctx)
    assert result["scope_overrides_present"] is True


def test_max_reviewers_override(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """args[max-reviewers] overrides the tier cap, clamped to [3, 50]."""
    ctx = make_ctx(
        inputs={
            "project_profile": {"languages": ["python"]},
            "changed_paths": ["a.py"],
            "diff_stats": {"lines_changed": 5, "files_changed": 1},
        },
        args={"max-reviewers": "7"},
    )
    result = handle_risk_tier_triage(ctx)
    assert result["cap"] == 7
    assert "Cap overridden to 7" in result["tier_rationale"]


def test_max_reviewers_clamped_high(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """Override > 50 clamps to 50."""
    ctx = make_ctx(
        inputs={
            "project_profile": {"languages": ["python"]},
            "changed_paths": ["a.py"],
            "diff_stats": {"lines_changed": 5, "files_changed": 1},
        },
        args={"max-reviewers": "9999"},
    )
    result = handle_risk_tier_triage(ctx)
    assert result["cap"] == 50


def test_max_reviewers_clamped_low(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """Override < 3 clamps to 3."""
    ctx = make_ctx(
        inputs={
            "project_profile": {"languages": ["python"]},
            "changed_paths": ["a.py"],
            "diff_stats": {"lines_changed": 5, "files_changed": 1},
        },
        args={"max-reviewers": "1"},
    )
    result = handle_risk_tier_triage(ctx)
    assert result["cap"] == 3


def test_handler_is_deterministic(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """Same inputs → byte-identical outputs across calls."""
    inputs = {
        "project_profile": {
            "languages": ["python"],
            "iac": ["terraform"],
        },
        "changed_paths": ["src/auth.py", "migrations/0001.py"],
        "diff_stats": {"lines_changed": 80, "files_changed": 4},
    }
    a = handle_risk_tier_triage(make_ctx(inputs=inputs))
    b = handle_risk_tier_triage(make_ctx(inputs=inputs))
    assert a == b
