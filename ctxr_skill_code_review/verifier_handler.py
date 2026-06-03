"""LLM-driven verifier panel handler for the skill-code-review FSM spec.

The W12 verifier surface (see :mod:`ctxr.fsm.core.verifier`) ships with
a built-in *structural* fallback that re-checks the worker's response
schema. This module layers an adversarial *LLM panel* on top of that
fallback for the five worker states: each state's
:class:`~ctxr.fsm.core.models.VerifierSpec` carries a
``prompt_template`` (rendered against the worker's brief + outputs) and
asks the same Agent harness the workers themselves use to cast
``parallel_count`` independent votes.

Design notes
------------

* The handler signature mirrors :data:`ctxr.fsm.core.verifier.VerifierHandler`
  exactly so :func:`set_verifier_handler` can install it as a drop-in
  replacement for the structural fallback.
* When the dispatch primitive is unavailable (test env without an LLM
  bridge, CI box without API creds), :func:`install_verifier_handler`
  skips registration so the engine continues to use the structural
  fallback. This preserves Principle 1 (require, don't improvise) while
  keeping the surface always-live.
* The CALLER is responsible for wiring an LLM dispatch callable through
  the ``CTXR_LLM_VERIFIER_DISPATCH`` plug-in (see :func:`_get_dispatcher`).
  We do NOT import a concrete Agent SDK here — that would couple the
  skill to a specific harness and break the cross-harness model the
  workers themselves follow.
"""

from __future__ import annotations

import json
import os
from collections.abc import Callable
from importlib import import_module, resources
from typing import Any

from ctxr.fsm.core.models import Brief, VerifierSpec, VerifierVerdict
from ctxr.fsm.core.prompts import PromptContext, PromptRenderer
from ctxr.fsm.core.verifier import VerifierVote, set_verifier_handler

__all__ = [
    "install_verifier_handler",
    "llm_verifier_handler",
    "load_verifier_prompt",
]


# ---------------------------------------------------------------------------
# Dispatcher resolution
# ---------------------------------------------------------------------------


LlmDispatcher = Callable[[str, dict[str, Any]], str]
"""Dispatch primitive: ``(prompt, context) -> raw_json_string``.

The orchestrator (or test harness) installs an instance of this type
either by setting the ``CTXR_LLM_VERIFIER_DISPATCH`` env var to a
dotted ``package.module:callable`` path, or by importing
:mod:`ctxr_skill_code_review.verifier_handler` and assigning
:data:`_DISPATCHER` directly. The returned string MUST be parseable as
JSON matching ``{"verdict": "passed"|"rejected", "reason": str}``.
"""


_DISPATCHER: LlmDispatcher | None = None


def _resolve_dotted(path: str) -> Any:
    module_path, _, attr = path.partition(":")
    if not module_path or not attr:
        raise ValueError(
            f"CTXR_LLM_VERIFIER_DISPATCH must be 'package.module:callable', got {path!r}"
        )
    module = import_module(module_path)
    return getattr(module, attr)


def _get_dispatcher() -> LlmDispatcher | None:
    """Return the configured LLM dispatcher, or ``None`` if unavailable.

    Resolution order:

    1. The module-level :data:`_DISPATCHER` set by ad-hoc test wiring.
    2. The ``CTXR_LLM_VERIFIER_DISPATCH`` env var, resolved as a dotted
       ``package.module:callable`` path.
    3. ``None`` — the caller (typically :func:`install_verifier_handler`)
       falls back to the engine's structural verifier.
    """
    if _DISPATCHER is not None:
        return _DISPATCHER
    env = os.environ.get("CTXR_LLM_VERIFIER_DISPATCH")
    if env:
        candidate = _resolve_dotted(env)
        if callable(candidate):
            return candidate  # type: ignore[no-any-return]
    return None


# ---------------------------------------------------------------------------
# Prompt loader + renderer
# ---------------------------------------------------------------------------


_RENDERER: PromptRenderer | None = None


def _get_renderer() -> PromptRenderer:
    global _RENDERER
    if _RENDERER is None:
        _RENDERER = PromptRenderer(allow_model_import=False)
    return _RENDERER


def load_verifier_prompt(name: str) -> str:
    """Read a verifier prompt ``.md`` from the bundled :mod:`verifiers` package."""
    return (
        resources.files("ctxr_skill_code_review.verifiers")
        .joinpath(f"{name}.md")
        .read_text(encoding="utf-8")
    )


# ---------------------------------------------------------------------------
# Vote parsing
# ---------------------------------------------------------------------------


def _parse_vote(raw: str) -> VerifierVote:
    """Parse a dispatcher response into a :class:`VerifierVote`.

    Any parse failure (non-JSON, missing keys, unknown verdict) becomes
    a *rejected* vote with the error embedded in the reason. We fail
    closed: a malformed verifier MUST NOT silently bypass the gate.
    """
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        return VerifierVote(
            verdict=VerifierVerdict.rejected,
            reason=f"verifier_response_not_json: {exc}",
        )
    if not isinstance(payload, dict):
        return VerifierVote(
            verdict=VerifierVerdict.rejected,
            reason=f"verifier_response_not_object: {type(payload).__name__}",
        )
    verdict_raw = payload.get("verdict")
    reason = str(payload.get("reason", ""))[:280]
    if verdict_raw == VerifierVerdict.passed.value:
        return VerifierVote(verdict=VerifierVerdict.passed, reason=reason)
    if verdict_raw == VerifierVerdict.rejected.value:
        return VerifierVote(verdict=VerifierVerdict.rejected, reason=reason)
    return VerifierVote(
        verdict=VerifierVerdict.rejected,
        reason=f"unknown_verdict: {verdict_raw!r}",
    )


# ---------------------------------------------------------------------------
# Handler
# ---------------------------------------------------------------------------


def llm_verifier_handler(
    verifier: VerifierSpec,
    brief: Brief,
    outputs: dict[str, Any],
) -> list[VerifierVote]:
    """Dispatch ``verifier.parallel_count`` LLM votes and return them.

    Each vote is an independent LLM call. The prompt is rendered with
    the worker's :class:`Brief` and committed ``outputs`` exposed via
    the :class:`PromptContext` ``metadata`` dict so the templates can
    use ``{{ metadata.get("brief", {}) | json }}`` /
    ``{{ metadata.get("outputs", {}) | json }}`` markers that survive
    register-time smoke validation (which runs against an empty
    ``PromptContext``).

    Falls back to a single rejected vote (``no_llm_dispatcher``) if no
    dispatcher is wired AND this handler was somehow installed anyway;
    the well-trodden path is for :func:`install_verifier_handler` to
    skip registration entirely so the engine's structural fallback runs.
    """
    dispatcher = _get_dispatcher()
    if dispatcher is None:
        return [
            VerifierVote(
                verdict=VerifierVerdict.rejected,
                reason="no_llm_dispatcher_registered",
            )
            for _ in range(verifier.parallel_count)
        ]

    renderer = _get_renderer()
    context = PromptContext(
        state_id=brief.state,
        state_kind="verifier",
        metadata={
            "brief": brief.model_dump(mode="json"),
            "outputs": outputs,
            "verifier_role": verifier.role,
        },
    )
    rendered_prompt = renderer.render(verifier.prompt_template, context)

    votes: list[VerifierVote] = []
    for slot in range(verifier.parallel_count):
        try:
            raw = dispatcher(
                rendered_prompt,
                {
                    "role": verifier.role,
                    "slot": slot,
                    "state_id": brief.state,
                    "run_id": str(brief.run_id),
                },
            )
        except Exception as exc:
            votes.append(
                VerifierVote(
                    verdict=VerifierVerdict.rejected,
                    reason=f"dispatcher_raised: {type(exc).__name__}: {exc}"[:280],
                )
            )
            continue
        votes.append(_parse_vote(raw))
    return votes


# ---------------------------------------------------------------------------
# Installer
# ---------------------------------------------------------------------------


_INSTALLED: bool = False


def install_verifier_handler() -> bool:
    """Install :func:`llm_verifier_handler` as the process-wide handler.

    Idempotent: subsequent calls are no-ops (the handler is already in
    place). Returns ``True`` if a handler was installed (or was already
    installed), ``False`` if no LLM dispatcher is configured and the
    engine's structural fallback was left in place.
    """
    global _INSTALLED
    if _INSTALLED:
        return True
    if _get_dispatcher() is None:
        # No LLM bridge — leave the structural fallback in charge so
        # the gate still produces a verdict instead of erroring out.
        return False
    set_verifier_handler(llm_verifier_handler)
    _INSTALLED = True
    return True
