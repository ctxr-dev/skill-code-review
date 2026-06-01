"""Tests for handle_emit_stdout."""

from __future__ import annotations

import json

from ctxr_skill_code_review.handlers import (
    _apply_scope_filters,
    _parse_gate_filter,
    _parse_severity_threshold,
    _resolve_format,
    handle_emit_stdout,
)


def test_resolve_format_markdown_explicit() -> None:
    assert _resolve_format({"format": "markdown"}, is_tty=False) == "markdown"


def test_resolve_format_json_explicit() -> None:
    assert _resolve_format({"format": "json"}, is_tty=True) == "json"


def test_resolve_format_auto_tty_picks_markdown() -> None:
    assert _resolve_format({"format": "auto"}, is_tty=True) == "markdown"


def test_resolve_format_auto_non_tty_picks_json() -> None:
    assert _resolve_format({"format": "auto"}, is_tty=False) == "json"


def test_resolve_format_yaml_falls_back_to_markdown(capsys) -> None:  # type: ignore[no-untyped-def]
    assert _resolve_format({"format": "yaml"}, is_tty=True) == "markdown"
    captured = capsys.readouterr()
    assert "yaml" in captured.err.lower()


def test_severity_threshold_parses_known_levels() -> None:
    assert _parse_severity_threshold("critical") == 3
    assert _parse_severity_threshold("important") == 2
    assert _parse_severity_threshold("minor") == 1
    assert _parse_severity_threshold(None) is None
    assert _parse_severity_threshold("garbage") is None


def test_gate_filter_parses_csv_in_range() -> None:
    assert _parse_gate_filter("1,3,5") == {1, 3, 5}
    assert _parse_gate_filter("0,9,2") == {2}
    assert _parse_gate_filter(None) is None


def test_apply_scope_filters_strips_below_threshold() -> None:
    payload = {
        "issues": [
            {"severity": "critical", "title": "X"},
            {"severity": "minor", "title": "Y"},
        ],
        "gates": [{"number": 1}, {"number": 2}],
    }
    filtered = _apply_scope_filters(payload, severity_threshold=2, gate_filter=None)
    sevs = [i["severity"] for i in filtered["issues"]]
    assert sevs == ["critical"]


def test_apply_scope_filters_restricts_gates() -> None:
    payload = {
        "issues": [],
        "gates": [{"number": n} for n in range(1, 9)],
    }
    filtered = _apply_scope_filters(payload, severity_threshold=None, gate_filter={2, 4})
    assert {g["number"] for g in filtered["gates"]} == {2, 4}


def test_emit_stdout_writes_markdown_body_and_manifest(make_ctx, tmp_path, capsys) -> None:  # type: ignore[no-untyped-def]
    """Markdown format prints report.md verbatim plus a trailing manifest line."""
    run_dir = tmp_path / "run"
    run_dir.mkdir()
    (run_dir / "report.md").write_text("# Test Report\nbody\n", encoding="utf-8")
    (run_dir / "manifest.json").write_text("{}\n", encoding="utf-8")
    ctx = make_ctx(
        inputs={"run_dir_path": str(run_dir)},
        args={"format": "markdown"},
    )
    handle_emit_stdout(ctx)
    captured = capsys.readouterr()
    assert "# Test Report" in captured.out
    assert f"Manifest: {run_dir / 'manifest.json'}" in captured.out


def test_emit_stdout_writes_json_manifest_to_stderr(make_ctx, tmp_path, capsys) -> None:  # type: ignore[no-untyped-def]
    """JSON format sends manifest pointer to stderr so stdout stays JSON-clean."""
    run_dir = tmp_path / "run"
    run_dir.mkdir()
    (run_dir / "report.json").write_text(json.dumps({"verdict": "GO"}) + "\n", encoding="utf-8")
    (run_dir / "manifest.json").write_text("{}\n", encoding="utf-8")
    ctx = make_ctx(
        inputs={"run_dir_path": str(run_dir)},
        args={"format": "json"},
    )
    handle_emit_stdout(ctx)
    captured = capsys.readouterr()
    # stdout: clean JSON (the report).
    parsed = json.loads(captured.out.strip())
    assert parsed["verdict"] == "GO"
    # stderr: manifest pointer.
    assert "Manifest:" in captured.err


def test_emit_stdout_missing_run_dir_emits_warning(make_ctx, capsys) -> None:  # type: ignore[no-untyped-def]
    """No run_dir_path → warning on stderr; handler still returns {}."""
    ctx = make_ctx(inputs={}, args={})
    result = handle_emit_stdout(ctx)
    assert result == {}
    captured = capsys.readouterr()
    assert "no run_dir_path" in captured.err


def test_emit_stdout_filtered_severity_re_renders(make_ctx, tmp_path, capsys) -> None:  # type: ignore[no-untyped-def]
    """--scope-severity reads report.json, filters, re-renders markdown."""
    run_dir = tmp_path / "run"
    run_dir.mkdir()
    payload = {
        "verdict": "NO-GO",
        "summary": {
            "description": "x",
            "range": {"base": "a", "head": "b"},
            "mode": "diff",
            "files_changed": 1,
            "stack": [],
            "specialists_dispatched": 0,
            "specialists_total": 1,
        },
        "methodology": {p: "N/A" for p in ("SRP", "OCP", "LSP", "ISP", "DIP", "DRY", "KISS", "YAGNI")},
        "issues": [
            {"id": 1, "severity": "critical", "specialist": "s1", "file": "a", "line": None,
             "title": "C", "description": "", "impact": "", "fix": "", "principle": None},
            {"id": 2, "severity": "minor", "specialist": "s2", "file": "b", "line": None,
             "title": "M", "description": "", "impact": "", "fix": "", "principle": None},
        ],
        "strengths": [],
        "tool_results": [],
        "specialists": [],
        "gates": [],
        "coverage": [],
    }
    (run_dir / "report.json").write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    (run_dir / "report.md").write_text("# unfiltered\n", encoding="utf-8")
    (run_dir / "manifest.json").write_text("{}\n", encoding="utf-8")
    ctx = make_ctx(
        inputs={"run_dir_path": str(run_dir)},
        args={"format": "markdown", "scope-severity": "critical"},
    )
    handle_emit_stdout(ctx)
    captured = capsys.readouterr()
    # The filter dropped the minor row; the critical row title is the only
    # one visible in the re-rendered output.
    assert "| C |" in captured.out  # critical title cell
    assert "| M |" not in captured.out  # minor was filtered out
