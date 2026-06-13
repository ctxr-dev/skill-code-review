"""Tests for handle_activate_leaves and the activation gate."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest

from code_review.handlers import (
    _enumerate_wiki_leaves,
    _evaluate_activation,
    _keyword_matches,
    _minimatch,
    handle_activate_leaves,
)

# ---------------------------------------------------------------------------
# Pure-function tests for the activation gate (no filesystem).
# ---------------------------------------------------------------------------


def test_minimatch_star_single_segment() -> None:
    assert _minimatch("src/a.py", "src/*") is True
    assert _minimatch("src/sub/a.py", "src/*") is False


def test_minimatch_double_star() -> None:
    assert _minimatch("src/sub/a.py", "src/**") is True
    assert _minimatch("src/sub/deep/a.py", "**/*.py") is True
    assert _minimatch("src/a.py", "**/*.py") is True


def test_minimatch_brace_alternation() -> None:
    assert _minimatch("src/a.py", "src/{a,b}.py") is True
    assert _minimatch("src/b.py", "src/{a,b}.py") is True
    assert _minimatch("src/c.py", "src/{a,b}.py") is False


def test_evaluate_activation_file_globs() -> None:
    leaves = [
        {"id": "py-leaf", "activation": {"file_globs": ["**/*.py"]}},
        {"id": "ts-leaf", "activation": {"file_globs": ["**/*.ts"]}},
    ]
    activated, signals = _evaluate_activation(
        leaves=leaves,
        changed_paths=["src/x.py"],
        project_profile={},
        diff_text="",
    )
    ids = [leaf["id"] for leaf in activated]
    assert ids == ["py-leaf"]
    assert signals["py-leaf"] == ["file_globs"]


def test_evaluate_activation_keyword_matches() -> None:
    leaves = [
        {
            "id": "sec-csrf",
            "activation": {"keyword_matches": ["csrf"]},
        }
    ]
    activated, signals = _evaluate_activation(
        leaves=leaves,
        changed_paths=[],
        project_profile={},
        diff_text="+ added CSRF token validation",
    )
    assert [leaf["id"] for leaf in activated] == ["sec-csrf"]
    assert signals["sec-csrf"] == ["keyword_matches"]


def test_evaluate_activation_structural_signals() -> None:
    leaves = [
        {
            "id": "fw-django",
            "activation": {"structural_signals": ["django"]},
        }
    ]
    activated, signals = _evaluate_activation(
        leaves=leaves,
        changed_paths=[],
        project_profile={"frameworks": ["django"]},
        diff_text="",
    )
    assert [leaf["id"] for leaf in activated] == ["fw-django"]
    assert signals["fw-django"] == ["structural_signals"]


def test_evaluate_activation_escalation_from() -> None:
    leaves = [
        {"id": "parent", "activation": {"file_globs": ["**/*.py"]}},
        {"id": "child", "activation": {"escalation_from": ["parent"]}},
    ]
    activated, signals = _evaluate_activation(
        leaves=leaves,
        changed_paths=["a.py"],
        project_profile={},
        diff_text="",
    )
    ids = sorted(leaf["id"] for leaf in activated)
    assert ids == ["child", "parent"]
    assert signals["child"] == ["escalation_from"]


def test_evaluate_activation_skips_leaves_without_id() -> None:
    leaves: list[dict[str, Any]] = [
        {"activation": {"file_globs": ["**/*.py"]}},  # no id
        {"id": "", "activation": {"file_globs": ["**/*.py"]}},  # empty id
        {"id": "ok", "activation": {"file_globs": ["**/*.py"]}},
    ]
    activated, _ = _evaluate_activation(
        leaves=leaves,
        changed_paths=["a.py"],
        project_profile={},
        diff_text="",
    )
    assert [leaf["id"] for leaf in activated] == ["ok"]


# ---------------------------------------------------------------------------
# Whole-word keyword matching: precision (no substring false-fires) while
# preserving recall (genuine whole-word / token / multi-word matches fire).
# ---------------------------------------------------------------------------


def test_keyword_no_substring_false_fires() -> None:
    """The documented substring false-fires must NOT match any more."""
    # "io" must not fire inside "integrations" (fw-scala-web on a Python diff).
    assert _keyword_matches(["io"], "+ from app.integrations import x") is False
    # "iv" must not fire inside "active" (crypto-nonce-iv-management).
    assert _keyword_matches(["iv"], "+ user.active = True") is False
    # "rp" must not fire inside "pipeline" (crypto-webauthn-passkeys).
    assert _keyword_matches(["rp"], "+ run the pipeline now") is False


def test_keyword_whole_word_still_matches() -> None:
    """A short keyword must still fire on a genuine whole-word occurrence."""
    assert _keyword_matches(["iv"], "+ iv = os.urandom(16)") is True
    # Adjacent punctuation keeps the boundary intact.
    assert _keyword_matches(["iv"], "+ cipher.update(iv;)") is True
    assert _keyword_matches(["iv"], "+ aes.encrypt(data, (iv))") is True
    # But the same keyword must reject the substring-of-a-word case.
    assert _keyword_matches(["iv"], "+ if user.active:") is False


def test_keyword_token_in_identifier_fires() -> None:
    """The keyword as a hyphen/dot/path-separated token still fires."""
    assert _keyword_matches(["io"], "+ import io.circe.parser") is True
    assert _keyword_matches(["rp"], "+ webauthn.rp.id = 'example.com'") is True


def test_keyword_multi_word_phrase_matches() -> None:
    """Multi-word phrases match with boundaries only at the two ends."""
    assert _keyword_matches(["sql injection"], "+ guard against SQL injection") is True
    # Embedded in a larger word at either end must not fire.
    assert (
        _keyword_matches(["sql injection"], "+ nosql injectionsafe helper") is False
    )


def test_keyword_case_insensitive() -> None:
    assert _keyword_matches(["csrf"], "+ added CSRF token") is True
    assert _keyword_matches(["CSRF"], "+ added csrf token") is True


def test_keyword_symbol_edge_keywords_still_match() -> None:
    """Keywords whose first/last char is a SYMBOL must keep matching where they
    actually occur in code. The alnum-boundary guard is applied per-edge ONLY on
    an alphanumeric edge; a symbol edge gets no constraint. A naive ``\\b``-style
    boundary would zero these channels (405 such keywords live in the corpus:
    annotations, method-chains, prefixes, suffixes, operators, URIs)."""
    # Leading-symbol keywords (method-chain / member-access) after an identifier.
    assert _keyword_matches([".append("], "+ result.append(item)") is True
    assert _keyword_matches([".get("], "+ val = user.get(name)") is True
    assert _keyword_matches([".unwrap()"], "+ let x = res.unwrap();") is True
    assert _keyword_matches(["?."], "+ const x = a?.b") is True
    # Annotations butted against a preceding token.
    assert _keyword_matches(["@Test"], "+ foo@Test bar") is True
    assert _keyword_matches(["@Injectable"], "+ x@Injectable()") is True
    # Trailing-symbol prefix keywords that continue into an identifier.
    assert _keyword_matches(["aria-"], '+ <div aria-hidden="true">') is True
    assert _keyword_matches(["pg_"], "+ SELECT * FROM pg_stat_activity") is True
    assert _keyword_matches(["is_"], "+ if user.is_admin:") is True
    assert _keyword_matches(["ws://"], "+ connect('ws://host:8080')") is True
    # Leading-symbol suffix keyword preceded by an identifier char.
    assert _keyword_matches(["_token"], "+ form.csrf_token = gen()") is True
    # Operator keywords flanked by alnum on both sides.
    assert _keyword_matches(["!="], "+ if a!=b:") is True
    assert _keyword_matches([">="], "+ while x>=0:") is True
    # A symbol-internal keyword with an alnum tail still anchors that tail.
    assert _keyword_matches(["c++"], "+ written in c++") is True


def test_keyword_alnum_edge_still_guarded_after_symbol_fix() -> None:
    """The per-edge rule must NOT reintroduce substring false-fires for keywords
    with alphanumeric edges: those keep the whole-word boundary on both sides."""
    assert _keyword_matches(["io"], "+ from app.integrations import x") is False
    assert _keyword_matches(["auth"], "+ use oauth2 here") is False
    assert _keyword_matches(["iv"], "+ user.active = True") is False


def test_keyword_evaluate_activation_no_false_fire() -> None:
    """Integration through the gate: a leaf does not activate on a substring."""
    leaves = [
        {"id": "fw-scala-web", "activation": {"keyword_matches": ["io"]}},
    ]
    activated, _ = _evaluate_activation(
        leaves=leaves,
        changed_paths=[],
        project_profile={},
        diff_text="+ from app.integrations import handler",
    )
    assert activated == []


# ---------------------------------------------------------------------------
# Filesystem-touching tests use the real bundled reviewers.wiki/ corpus.
# ---------------------------------------------------------------------------


def test_enumerate_wiki_leaves_against_real_corpus() -> None:
    """The skill ships with reviewers.wiki/; the walk should return >0 leaves."""
    skill_root = Path(__file__).resolve().parent.parent.parent
    leaves = _enumerate_wiki_leaves(skill_root)
    assert len(leaves) > 0
    # Every leaf has an id + path.
    for leaf in leaves[:5]:
        assert isinstance(leaf["id"], str) and leaf["id"]
        assert isinstance(leaf["path"], str) and leaf["path"]


def test_handle_activate_leaves_runs_against_real_corpus(make_ctx) -> None:  # type: ignore[no-untyped-def]
    """End-to-end smoke: handler reads the wiki, returns activated leaves."""
    ctx = make_ctx(
        inputs={
            "project_profile": {"languages": ["python"]},
            "changed_paths": ["src/auth.py"],
            "args": {},
        },
        args={},
    )
    result = handle_activate_leaves(ctx)
    assert "activated_leaves" in result
    assert isinstance(result["activated_leaves"], list)
    # Don't assert a specific count — the corpus changes over time.
    # Asserting "no crash + valid shape" is the contract.


def test_handle_activate_leaves_handles_missing_wiki(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path, make_ctx
) -> None:  # type: ignore[no-untyped-def]
    """A skill_root without reviewers.wiki/ returns an empty list, no crash."""
    from code_review import handlers as h

    monkeypatch.setattr(h, "_resolve_skill_root", lambda: tmp_path)
    ctx = make_ctx(
        inputs={
            "project_profile": {},
            "changed_paths": [],
        },
        args={},
    )
    result = handle_activate_leaves(ctx)
    assert result == {"activated_leaves": []}
