"""Tests for the two edge-case inline handlers: short_circuit_exit + stage_a_empty."""

from __future__ import annotations

from ctxr_skill_code_review.handlers import (
    handle_short_circuit_exit,
    handle_stage_a_empty,
)


def test_short_circuit_emits_go_with_empty_findings(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """short_circuit_exit returns GO + empty findings + 8 N/A gates."""
    result = handle_short_circuit_exit(make_ctx())
    assert result["verdict"] == "GO"
    assert result["findings"] == []
    assert result["severity_counts"] == {"critical": 0, "important": 0, "minor": 0}
    assert result["short_circuited"] is True
    assert len(result["gates"]) == 8
    assert all(g["status"] == "N/A" for g in result["gates"])
    assert result["coverage_matrix"] == []
    assert result["coverage_gaps"] == []


def test_stage_a_empty_emits_conditional_with_per_file_gaps(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """stage_a_empty returns CONDITIONAL + gaps for every changed file."""
    ctx = make_ctx(inputs={"changed_paths": ["a.py", "b.py", "c.py"]})
    result = handle_stage_a_empty(ctx)
    assert result["verdict"] == "CONDITIONAL"
    assert result["degraded_run"] is True
    assert result["findings"] == []
    assert sorted(result["coverage_gaps"]) == ["a.py", "b.py", "c.py"]
    matrix_files = [row["file"] for row in result["coverage_matrix"]]
    assert sorted(matrix_files) == ["a.py", "b.py", "c.py"]
    # Every coverage_matrix row has an empty reviewers list.
    assert all(row["reviewers"] == [] for row in result["coverage_matrix"])
    assert len(result["gates"]) == 8
    assert all(g["status"] == "N/A" for g in result["gates"])


def test_stage_a_empty_handles_missing_changed_paths(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """No `changed_paths` key → empty matrix + empty gaps; still CONDITIONAL."""
    result = handle_stage_a_empty(make_ctx())
    assert result["verdict"] == "CONDITIONAL"
    assert result["coverage_matrix"] == []
    assert result["coverage_gaps"] == []
