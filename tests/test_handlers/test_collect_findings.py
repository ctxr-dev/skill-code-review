"""Tests for handle_collect_findings."""

from __future__ import annotations

from code_review.handlers import handle_collect_findings


def test_empty_inputs(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """No specialist outputs → empty findings + zero counts."""
    result = handle_collect_findings(make_ctx(inputs={"specialist_outputs": []}))
    assert result["findings"] == []
    assert result["severity_counts"] == {"critical": 0, "important": 0, "minor": 0}


def test_skips_non_completed_specialists(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """Only `completed` specialists contribute findings."""
    ctx = make_ctx(
        inputs={
            "specialist_outputs": [
                {
                    "id": "spec-a",
                    "status": "failed",
                    "findings": [{"severity": "critical", "file": "a.py", "title": "X"}],
                },
                {
                    "id": "spec-b",
                    "status": "skipped",
                    "findings": [{"severity": "important", "file": "b.py", "title": "Y"}],
                },
            ]
        }
    )
    result = handle_collect_findings(ctx)
    assert result["findings"] == []


def test_dedup_by_file_line_normalised_title(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """Findings sharing (file, line, normalised title) collapse into one."""
    ctx = make_ctx(
        inputs={
            "specialist_outputs": [
                {
                    "id": "sec-auth",
                    "status": "completed",
                    "findings": [
                        {
                            "severity": "critical",
                            "file": "a.py",
                            "line": 10,
                            "title": "Missing CSRF",
                        }
                    ],
                },
                {
                    "id": "lang-py",
                    "status": "completed",
                    "findings": [
                        {
                            "severity": "minor",
                            "file": "a.py",
                            "line": 10,
                            "title": "missing csrf",
                        }
                    ],
                },
            ]
        }
    )
    result = handle_collect_findings(ctx)
    assert len(result["findings"]) == 1
    f = result["findings"][0]
    # Critical wins the dedup tie-break.
    assert f["severity"] == "critical"
    assert f["title"] == "Missing CSRF"
    # flagged_by accumulates both source ids, sorted.
    assert f["flagged_by"] == ["lang-py", "sec-auth"]
    # The winner field attributes the surviving fields to the right specialist.
    assert f["winner"] == "sec-auth"


def test_sort_by_severity_then_file_then_line(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """Findings are ordered: severity desc, then file asc, then line asc."""
    ctx = make_ctx(
        inputs={
            "specialist_outputs": [
                {
                    "id": "s1",
                    "status": "completed",
                    "findings": [
                        {"severity": "minor", "file": "b.py", "line": 1, "title": "m"},
                        {"severity": "important", "file": "a.py", "line": 5, "title": "i"},
                        {"severity": "critical", "file": "c.py", "line": 1, "title": "c"},
                        {"severity": "important", "file": "a.py", "line": 2, "title": "i2"},
                    ],
                }
            ]
        }
    )
    result = handle_collect_findings(ctx)
    sevs = [f["severity"] for f in result["findings"]]
    assert sevs == ["critical", "important", "important", "minor"]
    # Within the same severity, file asc + line asc.
    important = [f for f in result["findings"] if f["severity"] == "important"]
    assert (important[0]["file"], important[0]["line"]) == ("a.py", 2)
    assert (important[1]["file"], important[1]["line"]) == ("a.py", 5)


def test_severity_counts(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """severity_counts mirrors the post-dedup findings count by severity."""
    ctx = make_ctx(
        inputs={
            "specialist_outputs": [
                {
                    "id": "s1",
                    "status": "completed",
                    "findings": [
                        {"severity": "critical", "file": "a.py", "title": "1"},
                        {"severity": "critical", "file": "b.py", "title": "2"},
                        {"severity": "important", "file": "c.py", "title": "3"},
                        {"severity": "minor", "file": "d.py", "title": "4"},
                    ],
                }
            ]
        }
    )
    result = handle_collect_findings(ctx)
    assert result["severity_counts"] == {"critical": 2, "important": 1, "minor": 1}


def test_winner_falls_back_to_lex_first_flagged_by(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """When dedup origin isn't preserved, winner uses lex-first flagged_by."""
    ctx = make_ctx(
        inputs={
            "specialist_outputs": [
                {
                    "id": "zebra",
                    "status": "completed",
                    "findings": [{"severity": "important", "file": "a.py", "title": "X"}],
                },
                {
                    "id": "apple",
                    "status": "completed",
                    "findings": [{"severity": "important", "file": "a.py", "title": "x"}],
                },
            ]
        }
    )
    result = handle_collect_findings(ctx)
    assert len(result["findings"]) == 1
    f = result["findings"][0]
    # apple < zebra in the tie-break.
    assert f["winner"] == "apple"


def test_handler_is_deterministic(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """Two calls with identical inputs produce identical outputs."""
    inputs = {
        "specialist_outputs": [
            {
                "id": "alpha",
                "status": "completed",
                "findings": [{"severity": "critical", "file": "a.py", "line": 1, "title": "X"}],
            },
            {
                "id": "beta",
                "status": "completed",
                "findings": [{"severity": "minor", "file": "b.py", "line": 2, "title": "Y"}],
            },
        ]
    }
    a = handle_collect_findings(make_ctx(inputs=inputs))
    b = handle_collect_findings(make_ctx(inputs=inputs))
    assert a == b
