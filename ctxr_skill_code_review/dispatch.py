"""Agent-agnostic dispatch backends for :mod:`ctxr_skill_code_review.runner`.

The runner is model-agnostic; this wires the per-worker / per-specialist LLM call
to whatever agent the user has — **Claude Code, Codex, Cursor, or a raw API** —
selected by name. Prompts are NEVER hardcoded: every worker prompt is read from
``workers/<role>.md`` and each specialist also gets its leaf's
``reviewers.wiki/<path>`` body. Rate-limit / context-overflow conditions surface
as the runner's :class:`RateLimitError` / :class:`ContextOverflowError` so the
adaptive pool can react.

Backends (``--backend``): ``claude`` (claude -p), ``codex`` (codex exec),
``cursor`` (cursor-agent -p), ``anthropic`` / ``openai`` (HTTP API). A backend is
just ``run(prompt, cwd, tier) -> final_text`` where tier is ``"strong"|"cheap"``.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import tempfile
from collections.abc import Callable
from importlib import resources
from pathlib import Path
from typing import Any

from .runner import ContextOverflowError, RateLimitError, SpecialistDispatch, WorkerDispatch

AgentRun = Callable[[str, str, str], str]  # (prompt, cwd, tier) -> final text

_ROLE_BY_STATE = {
    "scan_project": "project-scanner",
    "tree_descend": "tree-descender",
    "llm_trim": "trim-candidates",
    "tool_discovery": "tool-runner",
    "rank_findings": "finding-ranker",
}
_OUTPUT_RULE = (
    "\n\n## OUTPUT CONTRACT\nReturn ONLY a single raw JSON object matching this "
    "worker's response schema as your final message — no prose, no markdown "
    "fences, no file writes.\n"
)


def _load_prompt(role: str) -> str:
    return resources.files("ctxr_skill_code_review.workers").joinpath(f"{role}.md").read_text(encoding="utf-8")


def _raise_for_signal(text: str) -> None:
    low = text.lower()
    if ("rate" in low and "limit" in low) or "429" in low or "overloaded" in low:
        raise RateLimitError(low[-200:])
    if "context" in low and ("overflow" in low or "too long" in low or "exceed" in low):
        raise ContextOverflowError(low[-200:])
    if "prompt is too long" in low or "maximum context" in low:
        raise ContextOverflowError(low[-200:])


# --------------------------------------------------------------------------- #
# backends: run(prompt, cwd, tier) -> final assistant text
# --------------------------------------------------------------------------- #
def claude_run(prompt: str, cwd: str, tier: str, timeout: int = 600) -> str:
    model = {"strong": "opus", "cheap": "sonnet"}.get(tier, "sonnet")
    cmd = ["claude", "-p", prompt, "--output-format", "json",
           "--permission-mode", "bypassPermissions", "--model", model]
    try:
        proc = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired as exc:
        raise RateLimitError("claude timeout") from exc
    if proc.returncode != 0:
        _raise_for_signal(proc.stdout + proc.stderr)
        raise RuntimeError(f"claude exit {proc.returncode}: {(proc.stderr or proc.stdout)[-300:]}")
    env = json.loads(proc.stdout)
    if env.get("is_error") or env.get("api_error_status"):
        _raise_for_signal(str(env.get("api_error_status", "")) + str(env.get("subtype", "")))
        raise RuntimeError(f"claude error: {env.get('subtype')}")
    return str(env.get("result", ""))


def codex_run(prompt: str, cwd: str, tier: str, timeout: int = 600) -> str:
    with tempfile.TemporaryDirectory() as td:
        last = Path(td) / "last.txt"
        cmd = ["codex", "exec", "-C", cwd, "-s", "read-only",
               "--skip-git-repo-check", "-o", str(last)]
        model = os.environ.get(f"CTXR_CODEX_MODEL_{tier.upper()}")
        if model:
            cmd += ["-m", model]
        cmd.append(prompt)
        try:
            proc = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
        except subprocess.TimeoutExpired as exc:
            raise RateLimitError("codex timeout") from exc
        if proc.returncode != 0:
            _raise_for_signal(proc.stdout + proc.stderr)
            raise RuntimeError(f"codex exit {proc.returncode}: {(proc.stderr or proc.stdout)[-300:]}")
        return last.read_text(encoding="utf-8") if last.exists() else proc.stdout


def cursor_run(prompt: str, cwd: str, tier: str, timeout: int = 600) -> str:
    cmd = ["cursor-agent", "-p", prompt, "--output-format", "json"]
    model = os.environ.get(f"CTXR_CURSOR_MODEL_{tier.upper()}")
    if model:
        cmd += ["--model", model]
    try:
        proc = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired as exc:
        raise RateLimitError("cursor timeout") from exc
    if proc.returncode != 0:
        _raise_for_signal(proc.stdout + proc.stderr)
        raise RuntimeError(f"cursor-agent exit {proc.returncode}: {(proc.stderr or proc.stdout)[-300:]}")
    try:
        env = json.loads(proc.stdout)
        return str(env.get("result", env.get("response", proc.stdout)))
    except json.JSONDecodeError:
        return proc.stdout


def _api_run(provider: str, prompt: str, cwd: str, tier: str) -> str:
    # cwd unused: API agents can't run tools; the prompt must be self-contained.
    if provider == "anthropic":
        import anthropic  # type: ignore[import-not-found]
        model = os.environ.get(f"CTXR_ANTHROPIC_MODEL_{tier.upper()}",
                               "claude-opus-4-8" if tier == "strong" else "claude-sonnet-4-6")
        try:
            msg = anthropic.Anthropic().messages.create(
                model=model, max_tokens=4096, messages=[{"role": "user", "content": prompt}])
            return "".join(b.text for b in msg.content if getattr(b, "type", "") == "text")
        except Exception as exc:
            _raise_for_signal(str(exc))
            raise
    import openai  # type: ignore[import-not-found]
    model = os.environ.get(f"CTXR_OPENAI_MODEL_{tier.upper()}",
                           "gpt-5.2" if tier == "strong" else "gpt-5.2-mini")
    try:
        r = openai.OpenAI().chat.completions.create(
            model=model, messages=[{"role": "user", "content": prompt}])
        return r.choices[0].message.content or ""
    except Exception as exc:
        _raise_for_signal(str(exc))
        raise


BACKENDS: dict[str, AgentRun] = {
    "claude": claude_run,
    "codex": codex_run,
    "cursor": cursor_run,
    "anthropic": lambda p, c, t: _api_run("anthropic", p, c, t),
    "openai": lambda p, c, t: _api_run("openai", p, c, t),
}


def _parse_json(text: str) -> dict[str, Any]:
    t = text.strip()
    if t.startswith("```"):
        t = re.sub(r"^```[a-zA-Z]*\n?", "", t).rsplit("```", 1)[0]
    a, b = t.find("{"), t.rfind("}")
    if a >= 0 and b > a:
        t = t[a:b + 1]
    obj = json.loads(t)
    return obj if isinstance(obj, dict) else {"_raw": obj}


def _route_tier(leaf_id: str, dimensions: list[str] | None) -> str:
    dims = dimensions or []
    if "security" in dims or "correctness" in dims:
        return "strong"
    if re.match(r"^(sec-|lang-|fw-|orm-|footgun-|reliability-|data-)", leaf_id) or leaf_id == "principle-fail-fast":
        return "strong"
    return "cheap"


def make_dispatchers(
    repo: str, wiki_root: str | Path, *, base: str, head: str,
    backend: str | AgentRun = "claude",
) -> tuple[WorkerDispatch, SpecialistDispatch]:
    """Build (dispatch_worker, dispatch_specialist) for the runner, bound to a
    repo + agent backend. ``backend`` is a name in BACKENDS or a run callable."""
    run: AgentRun = BACKENDS[backend] if isinstance(backend, str) else backend
    wiki = Path(wiki_root)

    def dispatch_worker(state_id: str, inputs: dict[str, Any]) -> dict[str, Any]:
        prompt = (_load_prompt(_ROLE_BY_STATE[state_id])
                  + f"\n\n## RUN INPUTS (review base {base}..head {head} in this repo)\n"
                  + "```json\n" + json.dumps(inputs, default=str)[:20000] + "\n```" + _OUTPUT_RULE)
        return _parse_json(run(prompt, repo, "cheap"))

    def dispatch_specialist(unit: dict[str, Any], shared: dict[str, Any]) -> dict[str, Any]:
        leaf_id = unit.get("leaf_id", "")
        picked = {lf.get("id"): lf for lf in (shared.get("picked_leaves") or [])}
        leaf = picked.get(leaf_id, {})
        wiki_path = leaf.get("path")
        leaf_body = ""
        if wiki_path and (wiki / wiki_path).exists():
            leaf_body = (wiki / wiki_path).read_text(encoding="utf-8")
        prompt = (_load_prompt("specialist")
                  + f"\n\n## YOUR LEAF: {leaf_id}\n" + leaf_body
                  + f"\n\n## REVIEW TARGET\nRun `git diff {base}..{head}` here; your files: "
                  + json.dumps(unit.get("files") or []) + ". Read import-connected files to verify.\n"
                  + "## PROJECT\n```json\n" + json.dumps(shared.get("project_profile") or {}, default=str)[:4000]
                  + "\n```" + _OUTPUT_RULE
                  + f'Return {{"id":"{leaf_id}","status":"completed","findings":[...]}}.')
        out = _parse_json(run(prompt, repo, _route_tier(leaf_id, leaf.get("dimensions"))))
        out.setdefault("id", leaf_id)
        return out

    return dispatch_worker, dispatch_specialist
