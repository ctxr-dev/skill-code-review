"""One-shot installer for the skill-code-review FSM spec + inline handlers.

The skill ships a Pydantic :class:`~ctxr.fsm.FsmSpec` in
:mod:`code_review.spec` and a dict of inline-state callables
in :mod:`code_review.handlers`. Both must be registered with
the local ctxr-fsm project DB BEFORE the first ``fsm.start_run`` call
for this spec; otherwise the engine cannot resolve worker schemas or
look up inline handlers at advance time.

:func:`register` is idempotent at both the spec-table layer (re-registering
the same spec body at the same version is a no-op) and the inline-handler
registry layer (re-registration overwrites the existing entry with the
same callable — semantically a no-op). The CLI entry
``python -m code_review.install`` calls :func:`register` once
and emits a small JSON envelope on stdout summarising what happened.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

from ctxr.fsm.core import get_default_registry
from ctxr.fsm.sqlite import Project

from code_review.handlers import INLINE_HANDLERS
from code_review.spec import SPEC_ID, fsm
from code_review.verifier_handler import install_verifier_handler


def _resolve_db_path(project_db: Path | str | None) -> Path:
    """Resolve the project DB path with the documented fallback chain.

    1. Explicit ``project_db`` argument wins when supplied.
    2. ``CTXR_FSM_DB`` env var (the ctxr-fsm convention) when set.
    3. ``$(pwd)/.ctxr-fsm/fsm.db`` (the ``ctxr-fsm init`` default).

    Returns the resolved :class:`Path`; does NOT create the file (the
    Project facade's :meth:`Project.open` handles migrations + creation).
    """
    if project_db is not None:
        return Path(project_db).expanduser().resolve()
    env_db = os.environ.get("CTXR_FSM_DB")
    if env_db:
        return Path(env_db).expanduser().resolve()
    return (Path.cwd() / ".ctxr-fsm" / "fsm.db").resolve()


def _portable_repr(path: Path, *, base: Path) -> str:
    """Render ``path`` in the most-portable form relative to ``base``.

    1. If ``path`` is under ``base`` (typically cwd) → relative path
       (e.g., ``.ctxr-fsm/fsm.db``). This is the common case and is what
       gets persisted into JSON envelopes / SKILL.md examples / stdout
       messages so the artefact survives being pushed to git or moved
       between machines.
    2. Else if under the user's home → ``~``-prefixed path.
    3. Else → absolute path. (The caller explicitly pointed at a file
       outside both cwd and home; portability is on them.)
    """
    try:
        return str(path.relative_to(base))
    except ValueError:
        pass
    home = Path.home()
    try:
        return "~/" + str(path.relative_to(home))
    except ValueError:
        return str(path)


def register(
    project_db: Path | str | None = None,
    *,
    project_slug: str = "default",
) -> dict[str, Any]:
    """Register the spec + inline handlers against the project DB.

    Parameters
    ----------
    project_db:
        Path to the ctxr-fsm SQLite DB. ``None`` (default) resolves via
        :func:`_resolve_db_path` — explicit > env > cwd default. The
        path is opened with migrations enabled so a missing schema is
        brought current automatically.
    project_slug:
        Slug under which the spec is registered. Defaults to
        ``"default"`` — the slug ``ctxr-fsm init`` uses.

    Returns
    -------
    dict[str, Any]
        Envelope with the following keys:

        * ``spec_id`` — the registered spec's user-facing id
          (``"code-reviewer"``).
        * ``spec_version`` — the integer version stamped on the DB row.
        * ``spec_created`` — ``True`` when the call inserted a new
          version, ``False`` when an existing matching version was reused.
        * ``handlers_registered`` — count of inline handlers wired into
          the process-wide :class:`~ctxr.fsm.InlineHandlerRegistry`.
        * ``db_path`` — project-relative (or ``~``-prefixed, when the
          DB lives under ``$HOME``) path to the project DB the spec was
          written to. Stays portable so callers can persist the envelope
          into JSON manifests / commit it to git without baking machine
          paths into the artefact.

    Idempotency
    -----------
    Re-running :func:`register` against the same project + spec is safe:
    the spec repo's ``register`` is content-addressed (hash-equal specs
    do not bump the version), and the registry's ``register_many`` is a
    plain dict update (idempotent in time, last-write-wins across
    processes — and there's only ever one in-process registry).
    """
    db_path = _resolve_db_path(project_db)

    with Project.open(db_path) as project:
        spec_result = project.register_spec(fsm, project_slug=project_slug)

    # Inline handlers live in process memory; they MUST be re-registered
    # in every process that drives a run for this spec (ctxr-fsm MCP
    # server, ctxr-fsm api server, ad-hoc python -m driver, pytest).
    # The handler-id key is `(SPEC_ID, handler_id)` so other specs in
    # the same process don't clash.
    registry = get_default_registry()
    registry.register_many(SPEC_ID, INLINE_HANDLERS)

    # Adversarial verifier panels: install the LLM-driven handler when a
    # dispatcher is configured (env var or ad-hoc wiring); otherwise the
    # engine's built-in structural verifier stays in charge so the gate
    # still produces a verdict. install_verifier_handler is idempotent
    # and intentionally NOT surfaced in the envelope so the JSON shape
    # consumed by the W14f smoke pipeline stays byte-stable.
    install_verifier_handler()

    return {
        "spec_id": spec_result.spec.slug,
        "spec_version": spec_result.spec.version,
        "spec_created": spec_result.created,
        "handlers_registered": len(INLINE_HANDLERS),
        "db_path": _portable_repr(db_path, base=Path.cwd()),
    }


def main(argv: list[str] | None = None) -> int:
    """CLI entry point — ``python -m code_review.install``.

    Reads no flags today; honours ``CTXR_FSM_DB`` from the environment.
    Prints the :func:`register` envelope as pretty-printed JSON for
    operators + the W14f smoke pipeline. Exit status mirrors success /
    failure (0 / 1).
    """
    del argv  # currently flag-free; reserved for a future --db flag
    try:
        result = register()
    except Exception as exc:
        sys.stderr.write(f"register failed: {exc}\n")
        return 1
    sys.stdout.write(json.dumps(result, indent=2, sort_keys=True) + "\n")
    return 0


if __name__ == "__main__":  # pragma: no cover - CLI surface
    raise SystemExit(main())
