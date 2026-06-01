"""Tests for handle_synthesize_release_readiness."""

from __future__ import annotations

from ctxr_skill_code_review.handlers import handle_synthesize_release_readiness


def test_no_picks_all_gates_na_verdict_go(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """No picked leaves → every gate is N/A; verdict defaults to GO."""
    ctx = make_ctx(inputs={"findings": [], "picked_leaves": []})
    result = handle_synthesize_release_readiness(ctx)
    assert len(result["gates"]) == 8
    assert all(g["status"] == "N/A" for g in result["gates"])
    assert result["verdict"] == "GO"


def test_gate_4_tests_dimension_passes_without_findings(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """A leaf with dimensions=[tests] contributes to gate 4."""
    ctx = make_ctx(
        inputs={
            "findings": [],
            "picked_leaves": [
                {"id": "test-coverage", "dimensions": ["tests"]},
            ],
        }
    )
    result = handle_synthesize_release_readiness(ctx)
    gate_4 = next(g for g in result["gates"] if g["number"] == 4)
    assert gate_4["status"] == "PASS"
    assert gate_4["contributing_leaves"] == ["test-coverage"]
    assert result["verdict"] == "GO"


def test_gate_fails_when_contributing_leaf_produced_blocker(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """A leaf with a blocker finding flips its gate to FAIL → NO-GO."""
    ctx = make_ctx(
        inputs={
            "findings": [
                {
                    "severity": "critical",
                    "file": "a.py",
                    "flagged_by": ["sec-auth"],
                    "title": "X",
                }
            ],
            "picked_leaves": [
                {"id": "sec-auth", "dimensions": ["security"]},
            ],
        }
    )
    result = handle_synthesize_release_readiness(ctx)
    gate_6 = next(g for g in result["gates"] if g["number"] == 6)
    assert gate_6["status"] == "FAIL"
    assert result["verdict"] == "NO-GO"


def test_coverage_rule_violated_forces_no_go(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """coverage_rule_violated=true alone forces NO-GO regardless of gate state."""
    ctx = make_ctx(
        inputs={
            "findings": [],
            "picked_leaves": [{"id": "test-x", "dimensions": ["tests"]}],
            "coverage_rule_violated": True,
        }
    )
    result = handle_synthesize_release_readiness(ctx)
    assert result["verdict"] == "NO-GO"


def test_handler_is_deterministic(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """Same inputs → same outputs."""
    inputs = {
        "findings": [
            {
                "severity": "important",
                "file": "a.py",
                "flagged_by": ["lang-py"],
                "title": "X",
            }
        ],
        "picked_leaves": [{"id": "lang-py", "dimensions": ["correctness"]}],
    }
    a = handle_synthesize_release_readiness(make_ctx(inputs=inputs))
    b = handle_synthesize_release_readiness(make_ctx(inputs=inputs))
    assert a == b
