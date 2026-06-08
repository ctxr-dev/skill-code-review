"""Tests for handle_verify_coverage."""

from __future__ import annotations

from code_review.handlers import handle_verify_coverage


def test_no_picked_leaves_no_findings_all_files_gap(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """Empty inputs produce a gap row per changed file."""
    ctx = make_ctx(
        inputs={
            "findings": [],
            "picked_leaves": [],
            "coverage_rescues": [],
            "changed_paths": ["a.py", "b.py"],
        }
    )
    result = handle_verify_coverage(ctx)
    assert result["coverage_rule_violated"] is True
    assert sorted(result["coverage_gaps"]) == ["a.py", "b.py"]


def test_findings_credit_their_flagged_by(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """Per-finding flagged_by[] adds to the file's reviewer set."""
    ctx = make_ctx(
        inputs={
            "findings": [
                {
                    "file": "a.py",
                    "flagged_by": ["sec-1", "sec-2"],
                    "severity": "critical",
                    "title": "X",
                }
            ],
            "picked_leaves": [],
            "coverage_rescues": [],
            "changed_paths": ["a.py"],
        }
    )
    result = handle_verify_coverage(ctx)
    file_row = next(row for row in result["coverage_matrix"] if row["file"] == "a.py")
    assert sorted(file_row["reviewers"]) == ["sec-1", "sec-2"]
    assert result["coverage_rule_violated"] is False


def test_finding_outside_changed_paths_ignored(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """Hallucinated paths outside changed_paths don't show up."""
    ctx = make_ctx(
        inputs={
            "findings": [
                {
                    "file": "phantom.py",
                    "flagged_by": ["sec-1"],
                    "severity": "critical",
                    "title": "X",
                }
            ],
            "picked_leaves": [],
            "coverage_rescues": [],
            "changed_paths": ["a.py"],
        }
    )
    result = handle_verify_coverage(ctx)
    files = [row["file"] for row in result["coverage_matrix"]]
    assert "phantom.py" not in files


def test_coverage_rescues_credit_the_file(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """A rescue lifts the rescued_leaf's credit on the named file."""
    ctx = make_ctx(
        inputs={
            "findings": [
                {
                    "file": "a.py",
                    "flagged_by": ["s1"],
                    "severity": "critical",
                    "title": "X",
                }
            ],
            "picked_leaves": [],
            "coverage_rescues": [
                {"file": "a.py", "rescued_leaf": "rescue-1", "reason": "coverage"},
            ],
            "changed_paths": ["a.py"],
        }
    )
    result = handle_verify_coverage(ctx)
    row = next(r for r in result["coverage_matrix"] if r["file"] == "a.py")
    assert sorted(row["reviewers"]) == ["rescue-1", "s1"]
    # Two reviewers ≥ 2 → no gap.
    assert result["coverage_rule_violated"] is False


def test_handler_is_deterministic(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """Same inputs → same outputs."""
    inputs = {
        "findings": [{"file": "a.py", "flagged_by": ["s1"], "severity": "minor", "title": "x"}],
        "picked_leaves": [],
        "coverage_rescues": [],
        "changed_paths": ["a.py", "b.py"],
    }
    a = handle_verify_coverage(make_ctx(inputs=inputs))
    b = handle_verify_coverage(make_ctx(inputs=inputs))
    assert a == b
