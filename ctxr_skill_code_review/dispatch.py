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

# Per-call wall-clock ceiling (seconds). A hung agent call surfaces as a
# RateLimitError so the runner's resilient worker / specialist retry kicks in.
# Env-tunable so a hang fails fast and retries instead of burning the full
# default — without a code change.
_CALL_TIMEOUT = int(os.environ.get("CTXR_SCR_CALL_TIMEOUT", "600"))

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
def claude_run(prompt: str, cwd: str, tier: str, timeout: int = _CALL_TIMEOUT) -> str:
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


def codex_run(prompt: str, cwd: str, tier: str, timeout: int = _CALL_TIMEOUT) -> str:
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


def cursor_run(prompt: str, cwd: str, tier: str, timeout: int = _CALL_TIMEOUT) -> str:
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
    """Extract the JSON object from an agent's final text. An empty or
    unparseable response is a TRANSIENT agent failure (claude -p occasionally
    returns an empty result), so it surfaces as RateLimitError — the runner's
    resilient worker / specialist retry then re-attempts instead of the raw
    JSONDecodeError crashing the whole review. A genuine rate-limit / overflow
    message in the text is classified first so the right backoff applies."""
    t = text.strip()
    if not t:
        raise RateLimitError("empty agent response")
    if t.startswith("```"):
        t = re.sub(r"^```[a-zA-Z]*\n?", "", t).rsplit("```", 1)[0]
    a, b = t.find("{"), t.rfind("}")
    if a >= 0 and b > a:
        t = t[a:b + 1]
    try:
        obj = json.loads(t)
    except json.JSONDecodeError as exc:
        _raise_for_signal(text)  # reclassify rate-limit / overflow phrasing
        raise RateLimitError(f"unparseable agent response: {text.strip()[:160]!r}") from exc
    return obj if isinstance(obj, dict) else {"_raw": obj}


# Leaf-list keys whose items carry verbose frontmatter (notably ``covers[]``,
# 10-20 long strings each). Sent raw, a ~130-leaf ``activated_leaves`` blows past
# any char budget and gets truncated MID-ARRAY, silently dropping the
# alphabetically-late leaves (lang-*, sec-*, footgun-* — the correctness/security
# ones). We compact for the prompt, then rehydrate full metadata from the
# deterministic source set by id. ``covers`` is schema-optional on every leaf
# list, so dropping it never breaks output validation.
_LEAF_LIST_KEYS = ("activated_leaves", "stage_a_candidates", "candidate_leaves")
_HEAVY_LEAF_KEYS = ("covers", "audit_surface")
_WORKER_INPUT_CAP = 160_000  # safety net only; compaction keeps real prompts far smaller


def _compact_leaf(leaf: dict[str, Any]) -> dict[str, Any]:
    out = {k: v for k, v in leaf.items() if k not in _HEAVY_LEAF_KEYS}
    cov = leaf.get("covers")
    if isinstance(cov, list) and cov:  # keep a thin semantic hint, not the bulk
        out["covers"] = cov[:3]
    return out


def _compact_inputs(inputs: dict[str, Any]) -> dict[str, Any]:
    out = dict(inputs)
    for k in _LEAF_LIST_KEYS:
        v = out.get(k)
        if isinstance(v, list):
            out[k] = [_compact_leaf(x) if isinstance(x, dict) else x for x in v]
    return out


def _index_by_id(leaves: Any) -> dict[str, dict[str, Any]]:
    return {lf["id"]: lf for lf in leaves
            if isinstance(lf, dict) and isinstance(lf.get("id"), str)} if isinstance(leaves, list) else {}


def _rehydrate(picked: Any, source_by_id: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    """Re-attach full leaf metadata stripped for the prompt; the LLM's own fields
    (justification, dimensions, activation_match) win over the source copy."""
    out: list[dict[str, Any]] = []
    for p in picked if isinstance(picked, list) else []:
        if not isinstance(p, dict):
            continue
        full = source_by_id.get(p.get("id", ""))
        if full:
            merged = dict(full)
            merged.update({k: v for k, v in p.items() if v not in (None, [], "")})
            out.append(merged)
        else:
            out.append(p)
    return out


_SEV_DEFAULT_CONF = {"critical": 0.9, "important": 0.7, "minor": 0.25}


def _default_conf(finding: dict[str, Any]) -> float:
    return _SEV_DEFAULT_CONF.get(str(finding.get("severity", "")).lower(), 0.5)


def _apply_rank_decisions(
    findings: list[dict[str, Any]], decisions: Any, args: dict[str, Any],
) -> dict[str, Any]:
    """Apply the ranker's compact per-index decisions to the FULL findings.

    The LLM never re-emits finding text (slow + corruptible); it returns
    {i, defect_confidence, primary, drop?} per index and the runner re-attaches
    scores here. Findings the LLM omitted keep a severity-derived default so a
    partial response never silently loses a real finding.
    """
    try:
        thr = float(args.get("primary-threshold") or 0.75)
    except (TypeError, ValueError):
        thr = 0.75
    by_i: dict[int, dict[str, Any]] = {}
    if isinstance(decisions, list):
        for d in decisions:
            if isinstance(d, dict) and isinstance(d.get("i"), int):
                by_i[d["i"]] = d
    out: list[dict[str, Any]] = []
    sev_counts = {"critical": 0, "important": 0, "minor": 0}
    for idx, f in enumerate(findings):
        d = by_i.get(idx, {})
        if d.get("drop"):
            continue
        conf = d.get("defect_confidence")
        conf = float(conf) if isinstance(conf, (int, float)) else _default_conf(f)
        nf = dict(f)
        nf["defect_confidence"] = conf
        nf["primary"] = bool(d["primary"]) if isinstance(d.get("primary"), bool) else conf >= thr
        out.append(nf)
        sev = str(nf.get("severity", "")).lower()
        if sev in sev_counts:
            sev_counts[sev] += 1
    return {"findings": out, "severity_counts": sev_counts}


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
        if state_id == "rank_findings":
            # Ranker emits COMPACT per-index decisions, not re-emitted findings
            # (the latter is a large slow generation that blew the call timeout).
            findings = inputs.get("findings") or []
            indexed = [
                {"i": idx, "severity": f.get("severity"), "file": f.get("file"),
                 "line": f.get("line"), "title": f.get("title"),
                 "description": (f.get("description") or "")[:240],
                 "flagged_by": f.get("flagged_by") or [], "corroboration": f.get("corroboration")}
                for idx, f in enumerate(findings)
            ]
            rprompt = (_load_prompt("finding-ranker")
                       + "\n\n## RUN INPUTS\n```json\n"
                       + json.dumps({"findings": indexed,
                                     "changed_paths": inputs.get("changed_paths") or [],
                                     "args": inputs.get("args") or {}}, default=str)[:_WORKER_INPUT_CAP]
                       + '\n```\n\n## OUTPUT CONTRACT\nReturn ONLY {"decisions":[...]} as '
                       + "described above — no prose, no markdown fences, no file writes.\n")
            parsed = _parse_json(run(rprompt, repo, "cheap"))
            decisions = parsed.get("decisions") if isinstance(parsed, dict) else None
            return _apply_rank_decisions(findings, decisions, inputs.get("args") or {})
        compact = _compact_inputs(inputs)
        prompt = (_load_prompt(_ROLE_BY_STATE[state_id])
                  + f"\n\n## RUN INPUTS (review base {base}..head {head} in this repo)\n"
                  + "```json\n" + json.dumps(compact, default=str)[:_WORKER_INPUT_CAP] + "\n```" + _OUTPUT_RULE)
        out = _parse_json(run(prompt, repo, "cheap"))
        # Rehydrate the heavy leaf fields we stripped for the prompt, keyed by id
        # off the deterministic source set, so downstream sees complete leaves.
        if state_id == "tree_descend" and isinstance(out.get("stage_a_candidates"), list):
            out["stage_a_candidates"] = _rehydrate(
                out["stage_a_candidates"], _index_by_id(inputs.get("activated_leaves")))
        elif state_id == "llm_trim" and isinstance(out.get("picked_leaves"), list):
            src = _index_by_id(inputs.get("stage_a_candidates"))
            out["picked_leaves"] = _rehydrate(out["picked_leaves"], src)
        return out

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
