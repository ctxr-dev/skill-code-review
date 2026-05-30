"""Tests for handle_write_run_directory + the on-disk report writer."""

from __future__ import annotations

import json
import uuid
from pathlib import Path

import pytest

from ctxr_skill_code_review.handlers import (
    _legacy_run_id_for,
    build_report_payload,
    handle_write_run_directory,
    render_report_json,
    render_report_markdown,
)


def _minimal_env(project_root: Path) -> dict[str, object]:
    """Build the smallest env that satisfies write_run_directory's contract."""
    return {
        "verdict": "GO",
        "findings": [],
        "severity_counts": {"critical": 0, "important": 0, "minor": 0},
        "coverage_matrix": [],
        "coverage_gaps": [],
        "gates": [
            {
                "number": i + 1,
                "name": f"Gate {i + 1}",
                "status": "N/A",
                "blocker_count": 0,
                "contributing_leaves": [],
            }
            for i in range(8)
        ],
        "specialist_outputs": [],
        "tool_results": [],
        "picked_leaves": [],
        "changed_paths": [],
        "project_profile": {"languages": ["python"], "frameworks": []},
        "args": {"project_root": str(project_root)},
    }


def test_writes_three_files_under_storage_root(make_ctx, tmp_path) -> None:  # type: ignore[no-untyped-def]
    """The handler writes report.md, report.json, manifest.json to disk."""
    env = _minimal_env(tmp_path)
    result = handle_write_run_directory(make_ctx(inputs=env))
    run_dir = Path(result["run_dir_path"])
    assert run_dir.is_dir()
    assert (run_dir / "report.md").exists()
    assert (run_dir / "report.json").exists()
    assert (run_dir / "manifest.json").exists()
    # The path lives under <project>/.skill-code-review/.
    assert tmp_path in run_dir.parents
    assert ".skill-code-review" in run_dir.relative_to(tmp_path).parts


def test_legacy_run_id_is_deterministic() -> None:
    """The shard suffix is a stable function of the FSM run uuid string."""
    run_uuid = str(uuid.uuid4())
    a = _legacy_run_id_for(run_uuid)
    b = _legacy_run_id_for(run_uuid)
    # The 7-hex suffix is deterministic; the date prefix is wall-clock so
    # only the suffix can be asserted across calls.
    assert a[-7:] == b[-7:]


def test_invalid_verdict_raises() -> None:
    """A bad verdict on env is a contract violation that surfaces immediately."""
    with pytest.raises(ValueError):
        build_report_payload("19700101-000000-abcdef0", {"verdict": "MAYBE"})


def test_report_json_is_pretty_printed() -> None:
    """render_report_json keeps the v2.5.1 pretty-printed shape."""
    payload = {"verdict": "GO", "summary": {"description": "x", "files_changed": 0}}
    out = render_report_json(payload)
    assert out.endswith("\n")
    # 2-space indent like v2.5.1.
    assert json.dumps(payload, indent=2) + "\n" == out


def test_report_md_renders_verdict_table() -> None:
    """The markdown report carries the documented Verdict table headers."""
    payload = {
        "verdict": "GO",
        "summary": {
            "description": "test",
            "range": {"base": "abc", "head": "def"},
            "mode": "diff",
            "files_changed": 1,
            "stack": ["python"],
            "specialists_dispatched": 0,
            "specialists_total": 0,
        },
        "methodology": {p: "N/A" for p in ("SRP", "OCP", "LSP", "ISP", "DIP", "DRY", "KISS", "YAGNI")},
        "issues": [],
        "strengths": [],
        "tool_results": [],
        "specialists": [],
        "gates": [],
        "coverage": [],
    }
    md = render_report_markdown(payload)
    assert "# Code Review Report" in md
    assert "## Verdict" in md
    assert "| **Decision** | **GO** |" in md
    assert "## SOLID Compliance" in md
