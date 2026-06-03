"""The 9 deterministic inline state handlers for skill-code-review.

Each function in this module is a faithful Python port of one
``scripts/inline-states/<name>.mjs`` file from the legacy Node skill
(v2.5.1). Functions are pure:

* They read only from the :class:`~ctxr.fsm.InlineContext` envelope
  (``ctx.args`` + ``ctx.inputs``).
* They return a plain ``dict[str, Any]`` matching the corresponding
  state's :attr:`~ctxr.fsm.core.models.InlineSpec.response_schema`.
* They emit no events, perform no I/O beyond ``write_run_directory``'s
  explicit report writes, and never call back into the engine.

Determinism is critical — the W14h consistency battery asserts that
every run of the skill against the same fixture produces a byte-
identical ``report.md``. JSON serialisation uses
``sort_keys=True, separators=(",", ":")`` where canonical form is
required (currently the manifest writer's stable hashing — the user-
facing report.json is pretty-printed with ``indent=2`` to match v2.5.1).

The :data:`INLINE_HANDLERS` mapping at the bottom is what
:mod:`ctxr_skill_code_review.install` hands to
:meth:`~ctxr.fsm.InlineHandlerRegistry.register_many`.
"""

from __future__ import annotations

import json
import re
from collections.abc import Iterable
from datetime import UTC, datetime
from hashlib import sha256
from pathlib import Path
from secrets import token_hex
from typing import Any

import frontmatter
from ctxr.fsm.core import InlineContext, InlineHandler

from .sharding import shard_path, shard_segments

# ---------------------------------------------------------------------------
# Shared constants — kept module-local; promoted to spec.StrEnums where they
# represent closed vocabularies that flow across handler boundaries.
# ---------------------------------------------------------------------------


_GATE_NAMES: tuple[str, ...] = (
    "SOLID & Clean Code",
    "Error Handling & Resilience",
    "Code Quality & Type Safety",
    "Test Coverage",
    "Architecture & Design",
    "Security & Safety",
    "Documentation",
    "Domain-specific quality",
)

_METHODOLOGY_PRINCIPLES: tuple[str, ...] = (
    "SRP",
    "OCP",
    "LSP",
    "ISP",
    "DIP",
    "DRY",
    "KISS",
    "YAGNI",
)

_SEVERITY_RANK: dict[str, int] = {"critical": 3, "important": 2, "minor": 1}

_VALID_VERDICTS: frozenset[str] = frozenset({"GO", "NO-GO", "CONDITIONAL"})

_VALID_SEVERITIES: frozenset[str] = frozenset({"critical", "important", "minor"})


# PR5 — verifier retry cap. Three consecutive verifier_rejected events on
# the SAME state mean the panel and the worker disagree systemically;
# rather than letting the run loop forever (or until max_iterations),
# we transition into the verifier_stuck inline state which records the
# impasse, marks the leaf/batch as failed in env, and continues the
# pipeline with degraded coverage so synthesize_release_readiness can
# lower the verdict accordingly.
_VERIFIER_REJECTION_LIMIT: int = 3

# PR5 — aggregate-size guard for handle_merge_specialist_outputs. Sum of
# every per-unit JSON payload across all iterations must stay below this
# threshold or the merger truncates the lowest-priority unit (lowest-
# severity findings) until it fits. We NEVER drop a whole leaf — only
# trim findings on the longest one — so the planner-vs-merger union
# invariant continues to hold.
_AGGREGATE_OUTPUT_BUDGET_BYTES: int = 100 * 1024 * 1024  # 100 MB


# ---------------------------------------------------------------------------
# Tiny helpers
# ---------------------------------------------------------------------------


def _ensure_list(value: Any) -> list[Any]:
    """Return ``value`` when it is a list, otherwise an empty list.

    The .mjs handlers leaned on ``Array.isArray(x) ? x : []``; this
    is the Python equivalent and keeps every handler defensive against
    malformed upstream env values without bloating the call sites with
    ``isinstance`` checks.
    """
    return value if isinstance(value, list) else []


def _ensure_dict(value: Any) -> dict[str, Any]:
    """Return ``value`` when it is a dict, otherwise an empty dict."""
    return value if isinstance(value, dict) else {}


def _ensure_str(value: Any, default: str = "") -> str:
    """Return ``value`` when it is a non-empty string, otherwise ``default``."""
    return value if isinstance(value, str) and value else default


def _env_from_ctx(ctx: InlineContext) -> dict[str, Any]:
    """Merge a run's ``args`` + ``inputs`` into the env dict handlers expect.

    The .mjs handlers read everything from a flat ``env`` object that
    folded both the run's startup args and the cumulative state
    outputs. The Python engine separates those into ``ctx.args`` (the
    startup args verbatim) and ``ctx.inputs`` (the resolved
    prior-state outputs per the state's declared inputs). We fold them
    back into a single dict so the port stays line-for-line faithful;
    inputs win on key conflicts because the engine threads more
    specific values through ``inputs``.
    """
    env: dict[str, Any] = dict(ctx.inputs)
    # Mirror the original .mjs handlers' `env.args` pointer.
    env.setdefault("args", dict(ctx.args))
    return env


# ---------------------------------------------------------------------------
# Verifier-rejection accounting (PR5)
# ---------------------------------------------------------------------------
#
# Every handler that participates in the verifier-gated pipeline reads
# the ``verifier_rejection_counts`` map (state_id -> int) out of env on
# the way in and stamps an updated copy onto its outputs on the way out.
# The orchestrator is responsible for INCREMENTING the count when a
# commit returns ``error: verifier_rejected`` — at that point it should
# re-dispatch the worker carrying the bumped counter through args (the
# .args bag is the orchestrator's natural channel). Inline handlers
# don't observe the verifier directly; their job is simply to thread
# the counter forward + expose it as part of the state envelope so a
# downstream transition predicate can fire on it.
#
# We keep this surface as a tiny helper to make the env update path
# explicit at each handler call site (audit trail for the W12 panel
# integration) rather than burying it inside ``_env_from_ctx`` where a
# reader would lose track of who wrote the counter.


def _read_verifier_rejection_counts(env: dict[str, Any]) -> dict[str, int]:
    """Defensively read the per-state verifier rejection counter map.

    The counter lives in ``env["verifier_rejection_counts"]``. Any
    malformed entry is dropped silently — we treat unknown shapes as
    "no rejections yet" so the gate fails OPEN (i.e. the run continues)
    rather than triggering a spurious verifier_stuck transition.
    """
    raw = env.get("verifier_rejection_counts")
    if not isinstance(raw, dict):
        return {}
    out: dict[str, int] = {}
    for key, value in raw.items():
        if isinstance(key, str) and isinstance(value, int) and value >= 0:
            out[key] = value
    return out


def _bump_verifier_rejection_counts(
    counts: dict[str, int], state_id: str | None
) -> dict[str, int]:
    """Return a NEW dict with ``state_id``'s counter incremented by 1.

    Pure: never mutates the input. Callers that have just observed a
    verifier_rejected event use this to produce the dict they thread
    into the next handler's env. The orchestrator (commit pipeline)
    typically does the bump; handlers themselves call this only on
    paths where they synthesise a rejection internally (none today).
    """
    if not state_id:
        return dict(counts)
    bumped = dict(counts)
    bumped[state_id] = bumped.get(state_id, 0) + 1
    return bumped


def _is_verifier_stuck(counts: dict[str, int], state_id: str | None) -> bool:
    """True iff ``state_id`` has reached the consecutive-rejection cap."""
    if not state_id:
        return False
    return counts.get(state_id, 0) >= _VERIFIER_REJECTION_LIMIT


# ===========================================================================
# Handler 1 — risk_tier_triage
# ===========================================================================
#
# Port of scripts/inline-states/risk-tier-triage.mjs (153 LOC).
# Pure: reads env.changed_paths, env.diff_stats, env.project_profile, env.args;
# returns { tier, cap, tier_rationale, risk_signals, scope_overrides_present }.


_RISK_KEYWORDS: tuple[str, ...] = (
    "auth",
    "crypto",
    "secret",
    "password",
    "token",
    "infra",
    "deploy",
    "migration",
    "migrate",
    "iam",
    "rbac",
    "oauth",
    "jwt",
    "session",
    "key",
    "tls",
    "ssl",
    "cert",
    "kms",
    "vault",
)


# The .mjs file used JS regex literals; translate to Python `re` patterns.
# Each entry pairs (compiled-pattern, original-source-string-for-signal-id)
# so the emitted `path:<source>` signal id matches the v2.5.1 wire format.
def _build_high_risk_patterns() -> list[tuple[re.Pattern[str], str]]:
    raw_patterns: list[str] = [
        r"(^|/)Dockerfile($|\.|/)",
        r"\.tf$",
        r"(^|/)k8s/",
        r"(^|/)kubernetes/",
        r"(^|/)helm/",
        r"\.cdk\.ts$",
        r"(^|/)serverless\.ya?ml$",
        r"(^|/)Pulumi\.ya?ml$",
        r"(^|/)\.github/workflows/",
        r"(^|/)\.gitlab-ci\.ya?ml$",
        r"(^|/)migrations/",
        r"(^|/)prisma/migrations/",
        r"(^|/)alembic/",
        r"(^|/)flyway/",
        r"(^|/)atlas/",
    ]
    return [(re.compile(p), p) for p in raw_patterns]


_HIGH_RISK_PATTERNS: list[tuple[re.Pattern[str], str]] = _build_high_risk_patterns()


_SCOPE_OVERRIDE_KEYS: tuple[str, ...] = (
    "scope-dir",
    "scope-lang",
    "scope-framework",
    "scope-reviewer",
    "scope-severity",
    "scope-gate",
)


_TIER_CAPS: dict[str, int] = {
    "trivial": 3,
    "lite": 8,
    "full": 20,
    "sensitive": 30,
}


def _detect_risk_signals(
    changed_paths: list[Any],
    project_profile: dict[str, Any],
) -> list[str]:
    signals: set[str] = set()
    for path in changed_paths:
        if not isinstance(path, str):
            continue
        lower = path.lower()
        for kw in _RISK_KEYWORDS:
            if kw in lower:
                signals.add(f"keyword:{kw}")
        for pattern, source in _HIGH_RISK_PATTERNS:
            if pattern.search(path):
                signals.add(f"path:{source}")
                break
    iac = project_profile.get("iac")
    if isinstance(iac, list) and len(iac) > 0:
        signals.add("profile:iac-present")
    return sorted(signals)


def _detect_scope_overrides(args_bag: dict[str, Any]) -> bool:
    return any(args_bag.get(key) is not None for key in _SCOPE_OVERRIDE_KEYS)


def _clamp_cap(value: float) -> int:
    return max(3, min(50, int(value)))


def handle_risk_tier_triage(ctx: InlineContext) -> dict[str, Any]:
    """Port of risk-tier-triage.mjs."""
    env = _env_from_ctx(ctx)
    changed_paths = _ensure_list(env.get("changed_paths"))
    diff_stats = _ensure_dict(env.get("diff_stats")) or {
        "lines_changed": 0,
        "files_changed": 0,
    }
    project_profile = _ensure_dict(env.get("project_profile"))
    args_bag = _ensure_dict(env.get("args"))

    risk_signals = _detect_risk_signals(changed_paths, project_profile)
    scope_overrides_present = _detect_scope_overrides(args_bag)

    lines_changed = int(diff_stats.get("lines_changed", 0) or 0)
    files_changed = int(diff_stats.get("files_changed", 0) or 0)

    if risk_signals:
        tier = "sensitive"
        head = ", ".join(risk_signals[:3])
        rationale = f"Risk signals fired: {head}."
    elif lines_changed > 100 or files_changed > 5:
        tier = "full"
        rationale = (
            f"Large diff ({lines_changed} lines across {files_changed} files)."
        )
    elif lines_changed <= 10 and files_changed == 1:
        tier = "trivial"
        # Keep the `≤` glyph to match v2.5.1's report wording byte-for-byte.
        rationale = "Single-file change ≤ 10 lines, no risk path."
    else:
        tier = "lite"
        rationale = (
            f"Small diff ({lines_changed} lines across {files_changed} files), "
            "no risk path."
        )

    cap = _TIER_CAPS[tier]
    max_reviewers_override = args_bag.get("max-reviewers")
    if max_reviewers_override is not None:
        n: float | None
        try:
            n = float(max_reviewers_override)
        except (TypeError, ValueError):
            n = None
        # NaN check via self-comparison; NaN is the only float that fails it.
        if n is not None and n == n:
            cap = _clamp_cap(n)
            rationale = f"{rationale} Cap overridden to {cap} via --max-reviewers."

    return {
        "tier": tier,
        "cap": cap,
        "tier_rationale": rationale,
        "risk_signals": risk_signals,
        "scope_overrides_present": bool(scope_overrides_present),
    }


# ===========================================================================
# Handler 2 — activate_leaves
# ===========================================================================
#
# Port of scripts/inline-states/activate-leaves.mjs (290 LOC) +
# scripts/lib/activation-gate.mjs (143 LOC) +
# scripts/lib/minimatch-shim.mjs (73 LOC). The Python port keeps the wiki
# walk, the v2-frontmatter projection, and the activation predicates
# (file_globs, keyword_matches, structural_signals, escalation_from).


_V2_FIELDS: tuple[str, ...] = (
    "focus",
    "dimensions",
    "audit_surface",
    "languages",
    "tools",
    "tags",
    "covers",
    "type",
)


def _is_string_array(value: Any) -> bool:
    return isinstance(value, list) and all(isinstance(x, str) for x in value)


def _is_tool_array(value: Any) -> bool:
    if not isinstance(value, list):
        return False
    for entry in value:
        if not isinstance(entry, dict):
            return False
        name = entry.get("name")
        purpose = entry.get("purpose")
        command = entry.get("command", "")
        if not isinstance(name, str) or not name:
            return False
        if not isinstance(purpose, str) or not purpose:
            return False
        if command is not None and not isinstance(command, str):
            return False
    return True


def _validate_v2_field(field: str, value: Any) -> Any:
    """Match validateV2Field in activate-leaves.mjs."""
    if field in {"focus", "type"}:
        return value if isinstance(value, str) else None
    if field in {"dimensions", "audit_surface", "tags", "covers"}:
        return value if _is_string_array(value) else None
    if field == "tools":
        return value if _is_tool_array(value) else None
    if field == "languages":
        if value == "all":
            return value
        if _is_string_array(value) and len(value) > 0:
            return value
        return None
    return None


def _project_v2_fields(data: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for field in _V2_FIELDS:
        value = data.get(field)
        if value is None:
            continue
        validated = _validate_v2_field(field, value)
        if validated is None:
            continue
        out[field] = validated
    return out


# Translate the minimatch shim's grammar (*, **, ?, {a,b}) into a real
# Python regex. Anchored to full path; case-sensitive — same as POSIX.
_GLOB_CACHE: dict[str, re.Pattern[str]] = {}


def _compile_glob(glob: str) -> re.Pattern[str]:
    if glob in _GLOB_CACHE:
        return _GLOB_CACHE[glob]
    regex_parts: list[str] = []
    i = 0
    while i < len(glob):
        ch = glob[i]
        # **/ — zero or more path segments incl. the trailing /
        if ch == "*" and glob[i + 1 : i + 2] == "*" and glob[i + 2 : i + 3] == "/":
            regex_parts.append("(?:.*/)?")
            i += 3
            continue
        # ** at end — match anything (incl. /).
        if ch == "*" and glob[i + 1 : i + 2] == "*":
            regex_parts.append(".*")
            i += 2
            continue
        if ch == "*":
            regex_parts.append("[^/]*")
            i += 1
            continue
        if ch == "?":
            regex_parts.append("[^/]")
            i += 1
            continue
        if ch == "{":
            close = glob.find("}", i)
            if close == -1:
                regex_parts.append(re.escape(ch))
                i += 1
                continue
            choices = glob[i + 1 : close].split(",")
            regex_parts.append("(?:" + "|".join(re.escape(c) for c in choices) + ")")
            i = close + 1
            continue
        regex_parts.append(re.escape(ch))
        i += 1
    pattern = re.compile("^" + "".join(regex_parts) + "$")
    _GLOB_CACHE[glob] = pattern
    return pattern


def _minimatch(path: str, glob: str) -> bool:
    return _compile_glob(glob).match(path) is not None


def _file_globs_match(globs: Any, changed_paths: list[Any]) -> bool:
    if not isinstance(globs, list) or not globs:
        return False
    for glob in globs:
        if not isinstance(glob, str) or not glob:
            continue
        for path in changed_paths:
            if not isinstance(path, str):
                continue
            if _minimatch(path, glob):
                return True
    return False


def _keyword_matches(keywords: Any, diff_text: str) -> bool:
    if not isinstance(keywords, list) or not keywords:
        return False
    if not diff_text:
        return False
    lower = diff_text.lower()
    for kw in keywords:
        if not isinstance(kw, str):
            continue
        norm = kw.strip()
        if not norm:
            continue
        if norm.lower() in lower:
            return True
    return False


def _structural_signals_match(
    signals: Any, project_profile: dict[str, Any]
) -> bool:
    if not isinstance(signals, list) or not signals:
        return False
    if not isinstance(project_profile, dict):
        return False
    haystack: set[str] = set()
    for key in ("languages", "frameworks", "ci", "container", "iac", "build", "lint"):
        arr = project_profile.get(key)
        if isinstance(arr, list):
            for item in arr:
                if isinstance(item, str):
                    haystack.add(item.lower())
    if project_profile.get("monorepo") is True:
        haystack.add("monorepo")
    return any(
        isinstance(s, str) and s.lower() in haystack for s in signals
    )


def _evaluate_activation(
    leaves: list[dict[str, Any]],
    changed_paths: list[Any],
    project_profile: dict[str, Any],
    diff_text: str,
) -> tuple[list[dict[str, Any]], dict[str, list[str]]]:
    """Direct port of evaluateActivation() in activation-gate.mjs."""
    activated: dict[str, dict[str, Any]] = {}
    descent_signals: dict[str, list[str]] = {}

    # First pass: file_globs / keyword_matches / structural_signals.
    for leaf in leaves:
        leaf_id = leaf.get("id")
        if not isinstance(leaf_id, str) or not leaf_id:
            continue
        activation = leaf.get("activation") or {}
        fired: list[str] = []
        if _file_globs_match(activation.get("file_globs"), changed_paths):
            fired.append("file_globs")
        if _keyword_matches(activation.get("keyword_matches"), diff_text):
            fired.append("keyword_matches")
        if _structural_signals_match(
            activation.get("structural_signals"), project_profile
        ):
            fired.append("structural_signals")
        if fired:
            activated[leaf_id] = leaf
            descent_signals[leaf_id] = fired

    # Second pass: escalation_from. Iterate to fixed point.
    changed = True
    iterations = 0
    cap = len(leaves) + 1
    while changed and iterations < cap:
        changed = False
        iterations += 1
        for leaf in leaves:
            leaf_id = leaf.get("id")
            if not isinstance(leaf_id, str) or not leaf_id:
                continue
            if leaf_id in activated:
                continue
            activation = leaf.get("activation") or {}
            escalate_from = activation.get("escalation_from")
            if not isinstance(escalate_from, list) or not escalate_from:
                continue
            triggered = any(
                isinstance(parent_id, str) and parent_id in activated
                for parent_id in escalate_from
            )
            if triggered:
                activated[leaf_id] = leaf
                descent_signals[leaf_id] = ["escalation_from"]
                changed = True

    sorted_activated = sorted(activated.values(), key=lambda x: x["id"])
    sorted_signal_map = {
        leaf_id: sorted(descent_signals[leaf_id])
        for leaf_id in sorted(descent_signals)
    }
    return sorted_activated, sorted_signal_map


def _enumerate_wiki_leaves(skill_root: Path) -> list[dict[str, Any]]:
    """Walk reviewers.wiki/ and parse every leaf's frontmatter.

    Returns leaves sorted by id with v2 fields projected alongside the
    raw ``activation`` block. Mirrors enumerateWikiLeavesWithActivation
    in activate-leaves.mjs.
    """
    wiki_root = skill_root / "reviewers.wiki"
    if not wiki_root.exists():
        return []
    try:
        real_root = wiki_root.resolve(strict=True)
    except (OSError, RuntimeError):
        return []

    leaves: list[dict[str, Any]] = []
    visited: set[Path] = {real_root}
    stack: list[Path] = [real_root]
    while stack:
        current = stack.pop()
        try:
            entries = sorted(current.iterdir())
        except OSError:
            continue
        for entry in entries:
            if entry.name.startswith("."):
                continue
            try:
                real_full = entry.resolve(strict=True)
            except (OSError, RuntimeError):
                continue
            # Reject anything escaping the wiki via symlink.
            try:
                rel_to_root = real_full.relative_to(real_root)
            except ValueError:
                continue
            if not str(rel_to_root):  # the root itself; skip
                continue
            if entry.is_dir():
                if real_full in visited:
                    continue
                visited.add(real_full)
                stack.append(real_full)
                continue
            if not entry.name.endswith(".md") or entry.name == "index.md":
                continue
            try:
                parsed = frontmatter.load(real_full)
            except (OSError, ValueError):
                continue
            data: dict[str, Any] = dict(parsed.metadata)
            leaf_id = data.get("id")
            if not isinstance(leaf_id, str) or not leaf_id:
                continue
            wiki_rel = str(rel_to_root).replace("\\", "/")
            leaf_entry: dict[str, Any] = {
                "id": leaf_id,
                "path": wiki_rel,
                "activation": data.get("activation"),
            }
            activation = data.get("activation")
            if isinstance(activation, dict) and _is_string_array(
                activation.get("file_globs")
            ):
                leaf_entry["file_globs"] = activation["file_globs"]
            leaf_entry.update(_project_v2_fields(data))
            leaves.append(leaf_entry)

    leaves.sort(key=lambda x: x["id"])
    return leaves


def _fetch_diff_text(base: str | None, head: str | None, project_root: Path) -> str:
    """Best-effort `git diff <base>..<head>` body for keyword_matches.

    Returns "" on any failure — keyword_matches simply doesn't fire, but
    file_globs + structural_signals still work. Mirrors fetchDiffText
    in activate-leaves.mjs.
    """
    if not base or not head:
        return ""
    import subprocess  # local import — only needed when fetching diff

    try:
        result = subprocess.run(
            ["git", "diff", f"{base}..{head}"],
            cwd=str(project_root),
            capture_output=True,
            text=True,
            check=False,
            timeout=60,
        )
    except (OSError, subprocess.TimeoutExpired):
        return ""
    if result.returncode != 0:
        return ""
    return result.stdout or ""


def _resolve_skill_root() -> Path:
    """The skill's installation directory — where reviewers.wiki/ ships.

    The .mjs port computed this via ``fileURLToPath(import.meta.url)``
    walking up two levels from the inline-state file. Python's
    ``__file__`` gives us the same fixpoint: this module lives at
    ``ctxr_skill_code_review/handlers.py``; the skill root is its
    grandparent.
    """
    return Path(__file__).resolve().parent.parent


def _coerce_absolute_project_root(value: Any, fallback: Path) -> Path:
    """Defensive: only accept a non-empty absolute string; else fallback.

    Mirrors coerceAbsoluteProjectRoot in project-root.mjs — the user's
    env.args.project_root can be influenced by upstream worker outputs
    (some LLM-produced), so the strict check matters.
    """
    if isinstance(value, str) and value and Path(value).is_absolute():
        return Path(value)
    return fallback


def handle_activate_leaves(ctx: InlineContext) -> dict[str, Any]:
    """Port of activate-leaves.mjs."""
    env = _env_from_ctx(ctx)
    project_profile = _ensure_dict(env.get("project_profile"))
    changed_paths = _ensure_list(env.get("changed_paths"))
    args = _ensure_dict(env.get("args"))

    base = env.get("base_sha") or args.get("base") or None
    head = env.get("head_sha") or args.get("head") or None

    skill_root = _resolve_skill_root()
    project_root_for_diff = _coerce_absolute_project_root(
        args.get("project_root"), skill_root
    )

    leaves = _enumerate_wiki_leaves(skill_root)
    diff_text = _fetch_diff_text(
        base if isinstance(base, str) else None,
        head if isinstance(head, str) else None,
        project_root_for_diff,
    )

    activated, descent_signals = _evaluate_activation(
        leaves=leaves,
        changed_paths=changed_paths,
        project_profile=project_profile,
        diff_text=diff_text,
    )

    activated_leaves: list[dict[str, Any]] = []
    for leaf in activated:
        v2: dict[str, Any] = {}
        for field in _V2_FIELDS:
            if leaf.get(field) is not None:
                v2[field] = leaf[field]
        entry: dict[str, Any] = {
            "id": leaf["id"],
            "path": leaf["path"],
            "activation_match": descent_signals.get(leaf["id"], []),
        }
        file_globs = leaf.get("file_globs")
        if isinstance(file_globs, list):
            entry["file_globs"] = file_globs
        entry.update(v2)
        activated_leaves.append(entry)

    return {"activated_leaves": activated_leaves}


# ===========================================================================
# Handler 3 — collect_findings
# ===========================================================================
#
# Port of scripts/inline-states/collect-findings.mjs (125 LOC).


def _normalise_title(title: Any) -> str:
    if not isinstance(title, str):
        return ""
    return re.sub(r"\s+", " ", title.strip().lower())


def _dedup_key(finding: dict[str, Any]) -> str:
    file = finding.get("file") or ""
    line_val = finding.get("line")
    line = "" if line_val is None else str(line_val)
    return f"{file}::{line}::{_normalise_title(finding.get('title'))}"


def _pick_winner(a: dict[str, Any], b: dict[str, Any]) -> dict[str, Any]:
    a_sev = _SEVERITY_RANK.get(a.get("severity", ""), 0)
    b_sev = _SEVERITY_RANK.get(b.get("severity", ""), 0)
    if a_sev != b_sev:
        return a if a_sev > b_sev else b
    a_origin = a.get("__winner") or a.get("__origin") or ""
    b_origin = b.get("__winner") or b.get("__origin") or ""
    return a if a_origin <= b_origin else b


def handle_collect_findings(ctx: InlineContext) -> dict[str, Any]:
    """Port of collect-findings.mjs."""
    env = _env_from_ctx(ctx)
    specialist_outputs = _ensure_list(env.get("specialist_outputs"))

    merged: dict[str, dict[str, Any]] = {}
    for specialist in specialist_outputs:
        if not isinstance(specialist, dict):
            continue
        if specialist.get("status") != "completed":
            continue
        findings = _ensure_list(specialist.get("findings"))
        specialist_id = specialist.get("id", "")
        for finding in findings:
            if not isinstance(finding, dict):
                continue
            key = _dedup_key(finding)
            existing = merged.get(key)
            source_ids: set[str] = set(existing.get("flagged_by") or []) if existing else set()
            source_ids.add(specialist_id)
            f_stamped: dict[str, Any] = {**finding, "__origin": specialist_id}
            winner = _pick_winner(existing, f_stamped) if existing else f_stamped
            if existing is not None and winner is existing:
                winner_origin = existing.get("__winner") or existing.get("__origin")
            else:
                winner_origin = specialist_id
            winner_out = {
                k: v for k, v in winner.items() if k not in {"__origin", "__winner"}
            }
            merged[key] = {
                **winner_out,
                "flagged_by": sorted(source_ids),
                "__winner": winner_origin or specialist_id,
            }

    findings_out: list[dict[str, Any]] = []
    for record in merged.values():
        winner = record.pop("__winner", None)
        rest = {k: v for k, v in record.items()}
        if winner is not None:
            rest["winner"] = winner
        findings_out.append(rest)

    def _sort_key(f: dict[str, Any]) -> tuple[int, str, int, str]:
        sev = -_SEVERITY_RANK.get(f.get("severity", ""), 0)
        file = f.get("file") or ""
        line = f.get("line")
        line_int = int(line) if isinstance(line, int) else 0
        title = _normalise_title(f.get("title"))
        return (sev, file, line_int, title)

    findings_out.sort(key=_sort_key)

    severity_counts = {"critical": 0, "important": 0, "minor": 0}
    for f in findings_out:
        sev = f.get("severity")
        if sev in severity_counts:
            severity_counts[sev] += 1

    return {"findings": findings_out, "severity_counts": severity_counts}


# ===========================================================================
# Handler 4 — verify_coverage
# ===========================================================================
#
# Port of scripts/inline-states/verify-coverage.mjs (210 LOC).
# Reads picked_leaves[].path frontmatter to scope per-leaf credit by
# activation.file_globs[]; falls back to broad credit when the leaf
# carries no activation block.

_LEAF_GLOBS_CACHE: dict[Path, list[str] | None] = {}


def _read_leaf_globs(skill_root: Path, leaf_path: Any) -> list[str] | None:
    if not isinstance(leaf_path, str) or not leaf_path:
        return None
    wiki_root = skill_root / "reviewers.wiki"
    try:
        real_wiki = wiki_root.resolve(strict=True)
    except (OSError, RuntimeError):
        return None
    candidates = [wiki_root / leaf_path, skill_root / leaf_path]
    abs_path: Path | None = None
    for candidate in candidates:
        if not candidate.exists():
            continue
        try:
            real_candidate = candidate.resolve(strict=True)
        except (OSError, RuntimeError):
            continue
        try:
            rel = real_candidate.relative_to(real_wiki)
        except ValueError:
            continue
        if not str(rel) or str(rel) == ".":
            continue
        abs_path = real_candidate
        break
    if abs_path is None:
        return None
    if abs_path in _LEAF_GLOBS_CACHE:
        return _LEAF_GLOBS_CACHE[abs_path]
    try:
        parsed = frontmatter.load(abs_path)
    except (OSError, ValueError):
        _LEAF_GLOBS_CACHE[abs_path] = None
        return None
    data: dict[str, Any] = dict(parsed.metadata)
    activation = data.get("activation")
    if not isinstance(activation, dict):
        _LEAF_GLOBS_CACHE[abs_path] = None
        return None
    file_globs = activation.get("file_globs")
    if file_globs is None:
        # Activation block exists but no file_globs key — the .mjs
        # returned [] for this branch (empty list, NOT None) so the
        # caller's "explicit empty file_globs" path runs.
        _LEAF_GLOBS_CACHE[abs_path] = []
        return []
    if not isinstance(file_globs, list):
        _LEAF_GLOBS_CACHE[abs_path] = []
        return []
    out = [g for g in file_globs if isinstance(g, str)]
    _LEAF_GLOBS_CACHE[abs_path] = out
    return out


def handle_verify_coverage(ctx: InlineContext) -> dict[str, Any]:
    """Port of verify-coverage.mjs."""
    env = _env_from_ctx(ctx)
    findings = _ensure_list(env.get("findings"))
    picked_leaves = _ensure_list(env.get("picked_leaves"))
    coverage_rescues = _ensure_list(env.get("coverage_rescues"))
    changed_paths = _ensure_list(env.get("changed_paths"))

    reviewers_by_file: dict[str, set[str]] = {}
    changed_path_set: set[str] = {p for p in changed_paths if isinstance(p, str)}
    for changed_file in changed_path_set:
        reviewers_by_file.setdefault(changed_file, set())

    # Source (a): per-finding flagged_by[].
    for finding in findings:
        if not isinstance(finding, dict):
            continue
        finding_file = finding.get("file")
        if not isinstance(finding_file, str):
            continue
        if finding_file not in changed_path_set:
            continue
        bucket = reviewers_by_file.setdefault(finding_file, set())
        for leaf_id in finding.get("flagged_by") or []:
            if isinstance(leaf_id, str):
                bucket.add(leaf_id)

    # Source (b): per-leaf scope-narrowed credit.
    skill_root = _resolve_skill_root()
    for leaf in picked_leaves:
        if not isinstance(leaf, dict):
            continue
        leaf_id_raw = leaf.get("id")
        if not isinstance(leaf_id_raw, str) or not leaf_id_raw:
            continue
        globs = _read_leaf_globs(skill_root, leaf.get("path"))
        if globs is None:
            # No activation block / unreadable — fall back to broad credit.
            for credited_file in changed_path_set:
                reviewers_by_file.setdefault(credited_file, set()).add(leaf_id_raw)
            continue
        if not globs:
            # Explicit empty file_globs — keyword-only activation; no
            # per-file credit, source (a) / (c) may still earn it.
            continue
        for matched_file in changed_path_set:
            if any(isinstance(g, str) and _minimatch(matched_file, g) for g in globs):
                reviewers_by_file.setdefault(matched_file, set()).add(leaf_id_raw)

    # Source (c): coverage_rescues.
    for rescue in coverage_rescues:
        if not isinstance(rescue, dict):
            continue
        rescue_file = rescue.get("file")
        rescued = rescue.get("rescued_leaf")
        if not isinstance(rescue_file, str) or not isinstance(rescued, str):
            continue
        if rescue_file not in changed_path_set:
            continue
        reviewers_by_file.setdefault(rescue_file, set()).add(rescued)

    coverage_matrix: list[dict[str, Any]] = sorted(
        (
            {"file": fname, "reviewers": sorted(reviewers)}
            for fname, reviewers in reviewers_by_file.items()
        ),
        key=lambda row: str(row["file"]),
    )
    coverage_gaps = [
        str(row["file"]) for row in coverage_matrix if len(row["reviewers"]) < 2
    ]

    return {
        "coverage_matrix": coverage_matrix,
        "coverage_gaps": coverage_gaps,
        "coverage_rule_violated": len(coverage_gaps) > 0,
    }


# ===========================================================================
# Handler 5 — synthesize_release_readiness
# ===========================================================================
#
# Port of scripts/inline-states/synthesize-release-readiness.mjs (167 LOC).
# Eight predicate-defined gates; verdict is GO unless any gate FAILs or the
# coverage rule was violated upstream.


def _tags_like_from_leaf(leaf: dict[str, Any]) -> list[str]:
    leaf_id = leaf.get("id")
    if not isinstance(leaf_id, str) or not leaf_id:
        return []
    tags: set[str] = {leaf_id}
    segments = leaf_id.split("-")
    for i in range(len(segments)):
        tags.add(segments[i])
        for n in range(2, 5):
            if i + n > len(segments):
                break
            tags.add("-".join(segments[i : i + n]))
    return sorted(tags)


def _gate_matches(
    number: int,
    leaf: dict[str, Any],
    tags_like: list[str],
) -> bool:
    dims = leaf.get("dimensions") or []
    leaf_id = leaf.get("id", "")
    if number == 1:
        return "readability" in dims or any(
            t in {"solid", "dry", "kiss", "yagni", "clean-code", "naming", "complexity"}
            for t in tags_like
        )
    if number == 2:
        return "correctness" in dims and any(
            t
            in {
                "error-handling",
                "resilience",
                "fault-tolerance",
                "retry",
                "circuit-breaker",
                "concurrency",
                "async",
            }
            for t in tags_like
        )
    if number == 3:
        return "correctness" in dims or any(
            t
            in {
                "type-safety",
                "idioms",
                "dead-code",
                "language-quality",
                "initialization",
                "startup",
                "shutdown",
            }
            for t in tags_like
        )
    if number == 4:
        return "tests" in dims
    if number == 5:
        return any(d in {"architecture", "performance"} for d in dims) or any(
            t
            in {
                "api-design",
                "module-boundaries",
                "dependencies",
                "layering",
                "ddd",
                "microservices",
            }
            for t in tags_like
        )
    if number == 6:
        return "security" in dims or any(
            t in {"hooks-safety", "supply-chain", "dependencies-security"}
            for t in tags_like
        )
    if number == 7:
        return "documentation" in dims
    if number == 8:
        return (
            any(t in {"cli", "api", "observability"} for t in tags_like)
            or any(t.startswith("domain-") for t in tags_like)
            or any(leaf_id.startswith(p) for p in ("domain-", "obs-", "cli-", "api-"))
        )
    return False


def handle_synthesize_release_readiness(ctx: InlineContext) -> dict[str, Any]:
    """Port of synthesize-release-readiness.mjs."""
    env = _env_from_ctx(ctx)
    findings = _ensure_list(env.get("findings"))
    picked_leaves = _ensure_list(env.get("picked_leaves"))

    blocking_flagged_by: set[str] = set()
    for f in findings:
        if not isinstance(f, dict):
            continue
        if f.get("severity") in {"critical", "important"}:
            for leaf_id in f.get("flagged_by") or []:
                if isinstance(leaf_id, str):
                    blocking_flagged_by.add(leaf_id)

    gates: list[dict[str, Any]] = []
    for idx, name in enumerate(_GATE_NAMES, start=1):
        contributing: list[dict[str, Any]] = []
        for leaf in picked_leaves:
            if not isinstance(leaf, dict):
                continue
            tags_like = _tags_like_from_leaf(leaf)
            try:
                if _gate_matches(idx, leaf, tags_like):
                    contributing.append(leaf)
            except Exception:
                continue
        if not contributing:
            gates.append(
                {
                    "number": idx,
                    "name": name,
                    "status": "N/A",
                    "contributing_leaves": [],
                    "blocker_count": 0,
                }
            )
            continue
        blocker_count = sum(
            1
            for leaf in contributing
            if isinstance(leaf.get("id"), str) and leaf["id"] in blocking_flagged_by
        )
        gates.append(
            {
                "number": idx,
                "name": name,
                "status": "PASS" if blocker_count == 0 else "FAIL",
                "contributing_leaves": sorted(
                    leaf["id"]
                    for leaf in contributing
                    if isinstance(leaf.get("id"), str)
                ),
                "blocker_count": blocker_count,
            }
        )

    any_fail = any(g["status"] == "FAIL" for g in gates)
    coverage_rule_violated = bool(env.get("coverage_rule_violated"))
    verdict = "NO-GO" if (any_fail or coverage_rule_violated) else "GO"

    return {"gates": gates, "verdict": verdict}


# ===========================================================================
# Handler 6 — write_run_directory
# ===========================================================================
#
# Port of scripts/inline-states/write-run-directory.mjs (406 LOC).
# The Python ctxr-fsm doesn't ship a runDirPath/manifest helper — runs
# live in SQLite. We materialise the user-facing artefacts (report.md,
# report.json, manifest.json) on disk under a deterministic shard tree
# rooted at $PROJECT/.skill-code-review/. Manifest carries the skill-side
# metadata; the FSM run record lives in the SQLite event journal.


def _utc_now_iso() -> str:
    return datetime.now(tz=UTC).strftime("%Y%m%d-%H%M%S")


def _resolve_storage_root(project_root: Path) -> Path:
    """Return the on-disk root for skill run artefacts.

    The legacy code read this from ``.fsmrc.json::fsms[code-reviewer].storage_root``
    (always ``.skill-code-review``). The Python port hard-codes the same
    default — there's no .fsmrc.json equivalent in the v3 surface and
    every existing v2 install used ``.skill-code-review`` anyway. If a
    future use-case needs to override, the user passes ``args.storage_root``.
    """
    return project_root / ".skill-code-review"


def _legacy_run_id_for(run_uuid_str: str) -> str:
    """Build a v2.5.1-shaped run id (``YYYYMMDD-HHMMSS-<7hex>``).

    The Python ctxr-fsm uses UUIDv7 strings as canonical run ids. The
    legacy ``.skill-code-review`` shard tree expects the date+hash7
    shape so the on-disk layout stays familiar. We derive the 7-hex
    suffix from the FSM run uuid so the same run always lands in the
    same shard across re-invocations of write_run_directory (idempotent).
    """
    digest = sha256(run_uuid_str.encode("utf-8")).hexdigest()
    return f"{_utc_now_iso()}-{digest[:7]}"


def _run_dir_path(run_id: str, storage_root: Path, *, shard_key: str | None = None) -> Path:
    """Deterministic shard tree: ``<storage>/<yyyy>/<mm>/<dd>/<ab>/<rest5>/``.

    The date prefix is parsed from ``run_id`` (the v2.5.1-shaped
    ``YYYYMMDD-HHMMSS-<7hex>``). The shard segments come from
    :func:`sharding.shard_segments` over ``shard_key`` (typically the
    FSM run uuid string). When ``shard_key`` is omitted we fall back to
    the 7-hex suffix of ``run_id`` so existing v2.5.1 ids that didn't
    carry a separate uuid still produce a byte-identical path.
    """
    match = re.fullmatch(r"(\d{4})(\d{2})(\d{2})-\d{6}-([0-9a-f]{7})", run_id)
    if not match:
        raise ValueError(
            f"_run_dir_path: malformed run_id {run_id!r} "
            "(expected YYYYMMDD-HHMMSS-<7 hex>)"
        )
    yyyy, mm, dd, hash7 = match.groups()
    if shard_key is not None:
        first, rest = shard_segments(shard_key, (2, 5))
    else:
        first, rest = hash7[:2], hash7[2:]
    return storage_root / yyyy / mm / dd / first / rest


def _atomic_write_text(path: Path, contents: str) -> None:
    """tmp + rename atomic write (POSIX-safe). Caller ensures parent exists."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + f".tmp.{token_hex(4)}")
    tmp.write_text(contents, encoding="utf-8")
    tmp.replace(path)


def _build_scope(args_bag: dict[str, Any]) -> dict[str, Any]:
    """Canonical scope dict per report-format.md."""

    def split_or_null(raw: Any) -> list[str] | None:
        if not isinstance(raw, str) or not raw.strip():
            return None
        tokens = [s.strip() for s in raw.split(",") if s.strip()]
        return tokens if tokens else None

    return {
        "dirs": split_or_null(args_bag.get("scope-dir")),
        "langs": split_or_null(args_bag.get("scope-lang")),
        "frameworks": split_or_null(args_bag.get("scope-framework")),
        "reviewers": split_or_null(args_bag.get("scope-reviewer")),
        "severity_filter": split_or_null(args_bag.get("scope-severity")),
        "gates_filter": split_or_null(args_bag.get("scope-gate")),
    }


def _build_methodology(env: dict[str, Any]) -> dict[str, str]:
    provided = env.get("methodology") if isinstance(env.get("methodology"), dict) else {}
    out: dict[str, str] = {}
    for principle in _METHODOLOGY_PRINCIPLES:
        value = provided.get(principle) if isinstance(provided, dict) else None
        out[principle] = value if value in {"PASS", "FAIL", "N/A"} else "N/A"
    return out


def _build_issue(finding: dict[str, Any], idx: int) -> dict[str, Any]:
    flagged_by = finding.get("flagged_by") or []
    if not isinstance(flagged_by, list):
        flagged_by = []
    sorted_flagged = sorted(s for s in flagged_by if isinstance(s, str))
    severity = finding.get("severity")
    if severity not in _VALID_SEVERITIES:
        raise ValueError(
            f"buildIssue: finding.severity must be one of "
            f"{sorted(_VALID_SEVERITIES)}; got: {severity!r} (idx {idx})"
        )
    return {
        "id": idx + 1,
        "severity": severity,
        "specialist": finding.get("winner") or (sorted_flagged[0] if sorted_flagged else None),
        "file": finding.get("file"),
        "line": finding.get("line"),
        "title": finding.get("title"),
        "description": finding.get("description"),
        "impact": finding.get("impact"),
        "fix": finding.get("fix"),
        "principle": finding.get("principle"),
    }


def _build_specialist_row(specialist: dict[str, Any]) -> dict[str, Any]:
    is_completed = specialist.get("status") == "completed"
    findings = specialist.get("findings") if is_completed else []
    if not isinstance(findings, list):
        findings = []
    critical = sum(1 for f in findings if isinstance(f, dict) and f.get("severity") == "critical")
    important = sum(1 for f in findings if isinstance(f, dict) and f.get("severity") == "important")
    minor = sum(1 for f in findings if isinstance(f, dict) and f.get("severity") == "minor")
    ok = is_completed and critical == 0 and important == 0

    def first_with(severity: str) -> str | None:
        for f in findings:
            if isinstance(f, dict) and f.get("severity") == severity:
                title = f.get("title")
                if isinstance(title, str):
                    return title
        return None

    key_finding = (
        first_with("critical")
        or first_with("important")
        or specialist.get("skip_reason")
        or None
    )

    return {
        "id": specialist.get("id"),
        "status": "pass" if ok else "fail",
        "critical": critical,
        "important": important,
        "minor": minor,
        "key_finding": key_finding,
    }


def _build_gate_row(gate: dict[str, Any]) -> dict[str, Any]:
    return {
        "number": gate.get("number"),
        "name": gate.get("name"),
        "status": gate.get("status"),
        "blockers": gate.get("blocker_count", 0),
    }


def _build_tool_row(tool: dict[str, Any]) -> dict[str, Any]:
    row: dict[str, Any] = {
        "name": tool.get("name"),
        "status": tool.get("status"),
        "findings": tool.get("findings"),
        "specialist": tool.get("specialist"),
        "output_summary": tool.get("output_summary") or tool.get("output"),
    }
    if tool.get("status") == "skipped" and tool.get("reason") is not None:
        row["reason"] = tool.get("reason")
    return row


def _count_wiki_leaves(skill_root: Path) -> int:
    wiki_root = skill_root / "reviewers.wiki"
    if not wiki_root.exists():
        return 0
    try:
        real_root = wiki_root.resolve(strict=True)
    except (OSError, RuntimeError):
        return 0
    count = 0
    visited: set[Path] = {real_root}
    stack: list[Path] = [real_root]
    while stack:
        current = stack.pop()
        try:
            entries = list(current.iterdir())
        except OSError:
            continue
        for entry in entries:
            if entry.name.startswith("."):
                continue
            try:
                real_full = entry.resolve(strict=True)
            except (OSError, RuntimeError):
                continue
            try:
                real_full.relative_to(real_root)
            except ValueError:
                continue
            if entry.is_dir():
                if real_full in visited:
                    continue
                visited.add(real_full)
                stack.append(real_full)
                continue
            if not entry.name.endswith(".md") or entry.name == "index.md":
                continue
            if entry.is_file():
                count += 1
    return count


# Per-process cache for the wiki-leaves count.
_WIKI_LEAVES_COUNT: int | None = None


def _specialists_total(skill_root: Path) -> int:
    global _WIKI_LEAVES_COUNT
    if _WIKI_LEAVES_COUNT is None:
        _WIKI_LEAVES_COUNT = _count_wiki_leaves(skill_root)
    return _WIKI_LEAVES_COUNT


def build_report_payload(run_id: str, env: dict[str, Any]) -> dict[str, Any]:
    """Port of buildReportPayload in write-run-directory.mjs."""
    if env.get("verdict") not in _VALID_VERDICTS:
        raise ValueError(
            f"build_report_payload: env.verdict must be one of "
            f"{sorted(_VALID_VERDICTS)}; got: {env.get('verdict')!r}"
        )
    findings = _ensure_list(env.get("findings"))
    specialist_outputs = _ensure_list(env.get("specialist_outputs"))
    gates = _ensure_list(env.get("gates"))
    coverage_matrix = _ensure_list(env.get("coverage_matrix"))
    tool_results = _ensure_list(env.get("tool_results"))
    args_bag = _ensure_dict(env.get("args"))

    project_profile = _ensure_dict(env.get("project_profile"))
    stack = env.get("stack")
    if not isinstance(stack, list):
        stack = []
        if isinstance(project_profile.get("languages"), list):
            stack.extend(project_profile["languages"])
        if isinstance(project_profile.get("frameworks"), list):
            stack.extend(project_profile["frameworks"])

    skill_root = _resolve_skill_root()

    return {
        "verdict": env["verdict"],
        "summary": {
            "description": env.get("description") or args_bag.get("description") or "",
            "range": {
                "base": env.get("base_sha"),
                "head": env.get("head_sha"),
            },
            "mode": "full" if args_bag.get("full") else "diff",
            "files_changed": (
                len(env["changed_paths"])
                if isinstance(env.get("changed_paths"), list)
                else 0
            ),
            "stack": stack,
            "specialists_dispatched": (
                len(env["picked_leaves"])
                if isinstance(env.get("picked_leaves"), list)
                else len(specialist_outputs)
            ),
            "specialists_total": _specialists_total(skill_root),
            "scope": _build_scope(args_bag),
        },
        "methodology": _build_methodology(env),
        "issues": [_build_issue(f, i) for i, f in enumerate(findings) if isinstance(f, dict)],
        "strengths": env["strengths"] if isinstance(env.get("strengths"), list) else [],
        "tool_results": [
            _build_tool_row(t) for t in tool_results if isinstance(t, dict)
        ],
        "specialists": [
            _build_specialist_row(s) for s in specialist_outputs if isinstance(s, dict)
        ],
        "gates": [_build_gate_row(g) for g in gates if isinstance(g, dict)],
        "coverage": [
            {
                "file": row.get("file"),
                "reviewers": row.get("reviewers") if isinstance(row.get("reviewers"), list) else [],
            }
            for row in coverage_matrix
            if isinstance(row, dict)
        ],
    }


def _mdcell(value: Any) -> str:
    if value is None:
        return "—"
    text = str(value)
    return text.replace("\\", "\\\\").replace("|", "\\|").replace("\r\n", " ").replace("\n", " ")


def _file_link(file: Any, line: Any) -> str:
    if not file:
        return "—"
    if not isinstance(file, str):
        return "—"
    from urllib.parse import quote

    encoded = "/".join(quote(seg, safe="") for seg in file.split("/"))
    if line is None:
        return f"`{file}`"
    return f"[{file}:{line}](../../../{encoded}#L{line})"


def _render_verdict_table(payload: dict[str, Any]) -> list[str]:
    counts = {"critical": 0, "important": 0, "minor": 0}
    for issue in payload.get("issues") or []:
        sev = issue.get("severity") if isinstance(issue, dict) else None
        if sev in counts:
            counts[sev] += 1
    blocking = (
        f"{counts['critical']} critical, {counts['important']} important"
        if counts["critical"] > 0 or counts["important"] > 0
        else "none"
    )
    summary = payload.get("summary") or {}
    rng = summary.get("range") or {}
    if rng.get("base") and rng.get("head"):
        range_str = f"{rng['base']}..{rng['head']}"
    elif rng.get("head"):
        range_str = rng["head"]
    else:
        range_str = "—"
    stack = ", ".join(summary.get("stack") or []) or "—"
    dispatched = summary.get("specialists_dispatched", 0)
    total = summary.get("specialists_total", "?")

    lines: list[str] = [
        "## Verdict",
        "",
        "| | |",
        "|---|---|",
        f"| **Decision** | **{payload.get('verdict') or '(unknown)'}** |",
        f"| **Blocking** | {blocking} |",
    ]
    description = summary.get("description")
    if description not in (None, "", []):
        lines.append(f"| **Reviewed** | {_mdcell(description)} |")
    lines.append(f"| **Range** | {range_str} |")
    lines.append(f"| **Files** | {summary.get('files_changed', 0)} files changed |")
    lines.append(f"| **Stack** | {stack} |")
    lines.append(f"| **Mode** | {summary.get('mode', 'diff')} |")
    lines.append(f"| **Specialists** | {dispatched} of {total} dispatched |")
    lines.append("")
    return lines


def _render_methodology(payload: dict[str, Any]) -> list[str]:
    m = payload.get("methodology") or {}
    lines = [
        "## SOLID Compliance",
        "",
        "| Principle | Status | Finding |",
        "|-----------|--------|---------|",
    ]
    for p in _METHODOLOGY_PRINCIPLES:
        lines.append(f"| {p} | {m.get(p, 'N/A')} | — |")
    lines.append("")
    return lines


def _render_issues(issues: list[Any]) -> list[str]:
    if not issues:
        return []
    buckets: dict[str, list[dict[str, Any]]] = {"critical": [], "important": [], "minor": []}
    for issue in issues:
        if isinstance(issue, dict) and issue.get("severity") in buckets:
            buckets[issue["severity"]].append(issue)
    out: list[str] = ["## Issues", ""]
    if buckets["critical"]:
        out.extend(["### Critical — Blocks Merge", ""])
        out.append("| # | Specialist | Location | Title | Impact | Fix |")
        out.append("|---|-----------|----------|-------|--------|-----|")
        for issue in buckets["critical"]:
            out.append(
                "| "
                + " | ".join(
                    [
                        str(issue.get("id", "")),
                        _mdcell(issue.get("specialist")),
                        _file_link(issue.get("file"), issue.get("line")),
                        _mdcell(issue.get("title")),
                        _mdcell(issue.get("impact")),
                        _mdcell(issue.get("fix")),
                    ]
                )
                + " |"
            )
        out.append("")
    if buckets["important"]:
        out.extend(["### Important — Should Fix Before Merge", ""])
        out.append("| # | Specialist | Location | Title | Impact | Fix |")
        out.append("|---|-----------|----------|-------|--------|-----|")
        for issue in buckets["important"]:
            out.append(
                "| "
                + " | ".join(
                    [
                        str(issue.get("id", "")),
                        _mdcell(issue.get("specialist")),
                        _file_link(issue.get("file"), issue.get("line")),
                        _mdcell(issue.get("title")),
                        _mdcell(issue.get("impact")),
                        _mdcell(issue.get("fix")),
                    ]
                )
                + " |"
            )
        out.append("")
    if buckets["minor"]:
        out.extend(["### Minor — Advisory", ""])
        out.append("| # | Specialist | Location | Title | Fix |")
        out.append("|---|-----------|----------|-------|-----|")
        for issue in buckets["minor"]:
            out.append(
                "| "
                + " | ".join(
                    [
                        str(issue.get("id", "")),
                        _mdcell(issue.get("specialist")),
                        _file_link(issue.get("file"), issue.get("line")),
                        _mdcell(issue.get("title")),
                        _mdcell(issue.get("fix")),
                    ]
                )
                + " |"
            )
        out.append("")
    return out


def _render_strengths(strengths: list[Any]) -> list[str]:
    if not strengths:
        return []
    out = ["## Strengths", ""]
    for s in strengths:
        if not isinstance(s, dict):
            continue
        out.append(f"- **[{s.get('specialist') or '—'}]** {s.get('description') or ''}")
    out.append("")
    return out


def _render_tool_results(tools: list[Any]) -> list[str]:
    if not tools:
        return []
    out = [
        "## Tool Results",
        "",
        "| Tool | Status | Findings | Specialist |",
        "|------|--------|----------|-----------|",
    ]
    for t in tools:
        if not isinstance(t, dict):
            continue
        status = t.get("status") or ""
        if status == "skipped" and t.get("reason"):
            status_str = f"SKIP ({t['reason']})"
        else:
            status_str = (status or "—").upper()
        out.append(
            f"| {_mdcell(t.get('name'))} | {_mdcell(status_str)} | "
            f"{t.get('findings') if t.get('findings') is not None else '—'} | "
            f"{_mdcell(t.get('specialist'))} |"
        )
    out.append("")
    return out


def _render_specialists(specialists: list[Any]) -> list[str]:
    if not specialists:
        return []
    out = [
        "## Specialist Results",
        "",
        "| Specialist | Status | C | I | M | Key Finding |",
        "|-----------|--------|---|---|---|-------------|",
    ]
    for s in specialists:
        if not isinstance(s, dict):
            continue
        status = (s.get("status") or "—").upper()
        out.append(
            f"| {_mdcell(s.get('id'))} | {status} | "
            f"{s.get('critical', 0)} | {s.get('important', 0)} | {s.get('minor', 0)} | "
            f"{_mdcell(s.get('key_finding'))} |"
        )
    out.append("")
    return out


def _render_gates(gates: list[Any]) -> list[str]:
    if not gates:
        return []
    out = [
        "## Release Gates",
        "",
        "| # | Gate | Status | Blockers |",
        "|---|------|--------|----------|",
    ]
    for g in gates:
        if not isinstance(g, dict):
            continue
        out.append(
            f"| {g.get('number')} | {g.get('name')} | {g.get('status')} | "
            f"{g.get('blockers', 0)} |"
        )
    out.append("")
    return out


def _render_coverage(coverage: list[Any]) -> list[str]:
    if not coverage:
        return []
    out = ["## Coverage", "", "| File | Reviewed By |", "|------|-----------|"]
    for row in coverage:
        if not isinstance(row, dict):
            continue
        reviewers = ", ".join(row.get("reviewers") or []) or "—"
        out.append(f"| {_mdcell(row.get('file'))} | {_mdcell(reviewers)} |")
    out.append("")
    return out


def render_report_json(payload: dict[str, Any]) -> str:
    return json.dumps(payload, indent=2) + "\n"


def render_report_markdown(payload: dict[str, Any]) -> str:
    lines: list[str] = ["# Code Review Report", ""]
    lines.extend(_render_verdict_table(payload))
    lines.extend(_render_methodology(payload))
    lines.extend(_render_issues(payload.get("issues") or []))
    lines.extend(_render_strengths(payload.get("strengths") or []))
    lines.extend(_render_tool_results(payload.get("tool_results") or []))
    lines.extend(_render_specialists(payload.get("specialists") or []))
    lines.extend(_render_gates(payload.get("gates") or []))
    lines.extend(_render_coverage(payload.get("coverage") or []))
    return "\n".join(lines) + "\n"


def write_run_artefacts(
    run_uuid_str: str, env: dict[str, Any]
) -> Path:
    """Materialise the on-disk report artefacts for a run.

    Returns the run-dir path that was written. Used by the
    write_run_directory inline state and exposed so ad-hoc tools can
    materialise the same artefacts without going through the FSM.
    """
    args_bag = _ensure_dict(env.get("args"))
    skill_root = _resolve_skill_root()
    project_root = _coerce_absolute_project_root(args_bag.get("project_root"), skill_root)
    storage_root = _resolve_storage_root(project_root)
    legacy_run_id = _legacy_run_id_for(run_uuid_str)
    run_dir = _run_dir_path(legacy_run_id, storage_root, shard_key=run_uuid_str)

    report_payload = build_report_payload(legacy_run_id, env)
    _atomic_write_text(run_dir / "report.json", render_report_json(report_payload))
    _atomic_write_text(run_dir / "report.md", render_report_markdown(report_payload))

    # manifest.json paths are stored RELATIVE to the run_dir itself so
    # the artefact stays portable: pushing .skill-code-review/ to git, or
    # archiving / re-mounting it on another machine, doesn't bake an
    # absolute filesystem path into the manifest. Consumers reading the
    # manifest resolve via os.path.join(manifest_dir, report_path).
    manifest = {
        "run_id": legacy_run_id,
        "fsm_run_id": run_uuid_str,
        "verdict": report_payload["verdict"],
        "report_path": "report.md",
        "report_json_path": "report.json",
        "tier": env.get("tier"),
        "tier_cap": env.get("cap"),
        "tier_rationale": env.get("tier_rationale"),
        "short_circuited": bool(env.get("short_circuited")),
        "degraded_run": bool(env.get("degraded_run")),
        "severity_counts": env.get("severity_counts")
        or {"critical": 0, "important": 0, "minor": 0},
        "coverage_gaps": (
            env["coverage_gaps"] if isinstance(env.get("coverage_gaps"), list) else []
        ),
        "routing": {
            "stage_a": {"candidates": env.get("stage_a_candidates") or []},
            "stage_b": {
                "picked": env.get("picked_leaves") or [],
                "rejected": env.get("rejected_leaves") or [],
                "coverage_rescues": env.get("coverage_rescues") or [],
            },
        },
    }
    _atomic_write_text(
        run_dir / "manifest.json",
        json.dumps(manifest, indent=2) + "\n",
    )
    return run_dir


def handle_write_run_directory(ctx: InlineContext) -> dict[str, Any]:
    """Port of write-run-directory.mjs."""
    env = _env_from_ctx(ctx)
    run_dir = write_run_artefacts(str(ctx.run_id), env)
    # Persist a project-relative path when run_dir lives under cwd; this
    # is what downstream handlers (emit_stdout) and consumers of the
    # terminal brief see. Falls back to the absolute form only when the
    # run_dir is genuinely outside cwd (rare, requires explicit operator
    # override of the storage root).
    try:
        portable = str(run_dir.relative_to(Path.cwd()))
    except ValueError:
        portable = str(run_dir)
    return {"run_dir_path": portable}


# ===========================================================================
# Handler 7 — emit_stdout
# ===========================================================================
#
# Port of scripts/inline-states/emit-stdout.mjs (184 LOC).


_VALID_FORMATS: frozenset[str] = frozenset({"markdown", "json"})


def _resolve_format(args_bag: dict[str, Any], *, is_tty: bool) -> str:
    raw = args_bag.get("format")
    requested = raw.lower() if isinstance(raw, str) else "auto"
    if requested in _VALID_FORMATS:
        return requested
    if requested == "auto":
        return "markdown" if is_tty else "json"
    if requested == "yaml":
        import sys as _sys

        _sys.stderr.write(
            "(emit_stdout: --format=yaml requested but no YAML serializer is "
            "bundled — falling back to markdown)\n"
        )
        return "markdown"
    return "markdown" if is_tty else "json"


def _parse_severity_threshold(raw: Any) -> int | None:
    if not isinstance(raw, str) or not raw.strip():
        return None
    return _SEVERITY_RANK.get(raw.strip().lower())


def _parse_gate_filter(raw: Any) -> set[int] | None:
    if raw is None:
        return None
    tokens: list[int] = []
    for tok in str(raw).split(","):
        try:
            n = int(tok.strip())
        except (TypeError, ValueError):
            continue
        if 1 <= n <= 8:
            tokens.append(n)
    return set(tokens) if tokens else None


def _apply_scope_filters(
    payload: dict[str, Any],
    severity_threshold: int | None,
    gate_filter: set[int] | None,
) -> dict[str, Any]:
    if severity_threshold is None and not gate_filter:
        return payload
    filtered = dict(payload)
    if severity_threshold is not None:
        source = payload.get("issues") or payload.get("findings") or []
        kept = [
            f
            for f in source
            if isinstance(f, dict)
            and _SEVERITY_RANK.get(f.get("severity", ""), 0) >= severity_threshold
        ]
        if isinstance(payload.get("issues"), list):
            filtered["issues"] = kept
        if isinstance(payload.get("findings"), list):
            filtered["findings"] = kept
        counts = {"critical": 0, "important": 0, "minor": 0}
        for f in kept:
            sev = f.get("severity")
            if sev in counts:
                counts[sev] += 1
        meta = filtered.get("_meta")
        if isinstance(meta, dict):
            filtered["_meta"] = {**meta, "severity_counts": counts}
        if "severity_counts" in payload:
            filtered["severity_counts"] = counts
    if gate_filter:
        filtered["gates"] = [
            g
            for g in (payload.get("gates") or [])
            if isinstance(g, dict) and g.get("number") in gate_filter
        ]
    return filtered


def _read_report_text(run_dir: Path, fmt: str) -> str | None:
    target = run_dir / ("report.md" if fmt == "markdown" else "report.json")
    if not target.exists():
        return None
    try:
        return target.read_text(encoding="utf-8")
    except OSError:
        return None


def handle_emit_stdout(ctx: InlineContext) -> dict[str, Any]:
    """Port of emit-stdout.mjs."""
    import sys as _sys

    env = _env_from_ctx(ctx)
    run_dir_path = env.get("run_dir_path")
    if not isinstance(run_dir_path, str) or not run_dir_path:
        _sys.stderr.write(
            "(emit_stdout: no run_dir_path in env — write_run_directory "
            "may have been skipped)\n"
        )
        return {}

    args_bag = _ensure_dict(env.get("args"))
    fmt = _resolve_format(args_bag, is_tty=bool(_sys.stdout.isatty()))
    severity_threshold = _parse_severity_threshold(args_bag.get("scope-severity"))
    gate_filter = _parse_gate_filter(args_bag.get("scope-gate"))
    filters_requested = severity_threshold is not None or gate_filter is not None
    run_dir = Path(run_dir_path)

    body: str | None = None
    if filters_requested:
        json_raw = _read_report_text(run_dir, "json")
        if json_raw is None:
            _sys.stderr.write(
                f"(emit_stdout: filtered output requested but report.json not "
                f"found under {run_dir_path})\n"
            )
        else:
            try:
                parsed = json.loads(json_raw)
            except json.JSONDecodeError:
                _sys.stderr.write(
                    "(emit_stdout: report.json is malformed; falling back to "
                    "unfiltered output)\n"
                )
                body = _read_report_text(run_dir, fmt)
            else:
                filtered = _apply_scope_filters(parsed, severity_threshold, gate_filter)
                body = (
                    json.dumps(filtered, indent=2) + "\n"
                    if fmt == "json"
                    else render_report_markdown(filtered)
                )
    else:
        body = _read_report_text(run_dir, fmt)
        if body is None:
            _sys.stderr.write(
                f"(emit_stdout: report file for format={fmt} not found under "
                f"{run_dir_path})\n"
            )

    if body is not None:
        _sys.stdout.write(body)
        if not body.endswith("\n"):
            _sys.stdout.write("\n")

    # Print the manifest pointer in its most-portable shape: relative
    # to cwd when run_dir is under the project root (the common case
    # for the YYYY/MM/DD/<shard> layout under .skill-code-review/),
    # else the absolute form. The LLM consumer reads this line; an
    # absolute path here would be a portability bug — the consumer
    # might persist it into the session log, paste it into a commit
    # message, or share it with another agent running on a different
    # machine.
    manifest_path = run_dir / "manifest.json"
    try:
        manifest_repr = str(manifest_path.relative_to(Path.cwd()))
    except ValueError:
        manifest_repr = str(manifest_path)
    manifest_line = f"Manifest: {manifest_repr}\n"
    if fmt == "markdown" and body is not None:
        _sys.stdout.write(manifest_line)
    else:
        _sys.stderr.write(manifest_line)
    return {}


# ===========================================================================
# Handler 8 — short_circuit_exit
# ===========================================================================
#
# Port of scripts/inline-states/short-circuit-exit.mjs (36 LOC).


def handle_short_circuit_exit(ctx: InlineContext) -> dict[str, Any]:
    """Port of short-circuit-exit.mjs."""
    del ctx  # intentionally unused — handler is pure
    return {
        "findings": [],
        "severity_counts": {"critical": 0, "important": 0, "minor": 0},
        "coverage_matrix": [],
        "coverage_gaps": [],
        "gates": [
            {
                "number": i + 1,
                "name": name,
                "status": "N/A",
                "contributing_leaves": [],
                "blocker_count": 0,
            }
            for i, name in enumerate(_GATE_NAMES)
        ],
        "verdict": "GO",
        "short_circuited": True,
    }


# ===========================================================================
# Handler 9 — stage_a_empty
# ===========================================================================
#
# Port of scripts/inline-states/stage-a-empty.mjs (39 LOC).


def handle_stage_a_empty(ctx: InlineContext) -> dict[str, Any]:
    """Port of stage-a-empty.mjs."""
    env = _env_from_ctx(ctx)
    changed_paths = _ensure_list(env.get("changed_paths"))
    safe_paths: list[str] = [p for p in changed_paths if isinstance(p, str)]
    return {
        "findings": [],
        "severity_counts": {"critical": 0, "important": 0, "minor": 0},
        "coverage_matrix": [{"file": file, "reviewers": []} for file in safe_paths],
        "coverage_gaps": list(safe_paths),
        "gates": [
            {
                "number": i + 1,
                "name": name,
                "status": "N/A",
                "contributing_leaves": [],
                "blocker_count": 0,
            }
            for i, name in enumerate(_GATE_NAMES)
        ],
        "verdict": "CONDITIONAL",
        "degraded_run": True,
    }


# ===========================================================================
# Handler 10 — plan_specialist_batches
# ===========================================================================
#
# PR4: deterministic planner that turns picked_leaves into a sequence of
# batches and (where a single leaf would overflow the context window)
# non-overlapping sub-batches. The loop refactor of dispatch_specialists
# walks this plan one batch per iteration so the pipeline never silently
# drops a file when the diff is big.


# Tier-driven default batch sizes. The full tier gets the largest batch
# because a full review already implies the operator wants depth.
_TIER_BATCH_SIZE: dict[str, int] = {
    "trivial": 3,
    "lite": 4,
    "full": 5,
    "sensitive": 3,
}

# Per-leaf token budget. A leaf whose estimated tokens exceed this gets
# split into sub-batches, each carrying a slice of the leaf's files.
# 80k tokens leaves headroom under the typical sub-agent context budget
# once we add the diff body, the leaf's instructions, and the system
# preamble.
_DEFAULT_MAX_LEAF_TOKENS: int = 80_000

# Token estimation heuristic: every file the leaf reviews costs ~500
# tokens on average (the diff lines for that file plus the leaf's own
# checklist scan). The .mjs port refined this with file-size-aware
# tokenisation; the Python port keeps the cheap heuristic because the
# planner is deterministic and the sub-batch threshold is a soft cap —
# overshooting by 1 sub-batch costs nothing but underbatching can drop
# files, which is the bug this whole PR fixes.
_TOKENS_PER_FILE: int = 500


def _math_ceil(num: int, den: int) -> int:
    if den <= 0:
        return 0
    return -(-num // den)


def _leaf_file_set(
    leaf: dict[str, Any], changed_paths: list[str]
) -> list[str]:
    """Return the files this leaf should review.

    Activation rule:
    * If the leaf has `activation.file_globs`, intersect with `changed_paths`.
    * Otherwise (keyword-only / structural-only activation), assign the
      full `changed_paths` set — those leaves run against everything
      that landed in the diff.
    """
    globs: Any = None
    activation = leaf.get("activation")
    if isinstance(activation, dict):
        globs = activation.get("file_globs")
    # Some upstream shapes hoist file_globs onto the leaf directly.
    if globs is None:
        globs = leaf.get("file_globs")
    if not isinstance(globs, list) or not globs:
        # Keyword-only / structural-only: full diff scope.
        return list(changed_paths)
    matched: list[str] = []
    seen: set[str] = set()
    for path in changed_paths:
        if not isinstance(path, str):
            continue
        for glob in globs:
            if not isinstance(glob, str) or not glob:
                continue
            if _minimatch(path, glob) and path not in seen:
                matched.append(path)
                seen.add(path)
                break
    return matched


def handle_plan_specialist_batches(ctx: InlineContext) -> dict[str, Any]:
    """Plan batches + sub-batches for the dispatch_specialists loop."""
    env = _env_from_ctx(ctx)
    args_bag = _ensure_dict(env.get("args"))
    picked_leaves = _ensure_list(env.get("picked_leaves"))
    changed_paths_raw = _ensure_list(env.get("changed_paths"))
    changed_paths: list[str] = [p for p in changed_paths_raw if isinstance(p, str)]
    tier = env.get("tier")

    batch_size_raw = args_bag.get("batch_size")
    if isinstance(batch_size_raw, int) and batch_size_raw > 0:
        batch_size = batch_size_raw
    else:
        batch_size = _TIER_BATCH_SIZE.get(
            tier if isinstance(tier, str) else "", 4
        )

    max_leaf_tokens_raw = args_bag.get("max_leaf_tokens")
    if isinstance(max_leaf_tokens_raw, int) and max_leaf_tokens_raw > 0:
        max_leaf_tokens = max_leaf_tokens_raw
    else:
        max_leaf_tokens = _DEFAULT_MAX_LEAF_TOKENS

    # Build units. Each unit is one (leaf_id, sub_index) slice of files.
    units: list[dict[str, Any]] = []
    union_files: set[str] = set()
    for leaf in picked_leaves:
        if not isinstance(leaf, dict):
            continue
        leaf_id = leaf.get("id")
        if not isinstance(leaf_id, str) or not leaf_id:
            continue
        files = _leaf_file_set(leaf, changed_paths)
        if not files:
            # No files matched this leaf; emit a single empty unit so the
            # merger sees it (and the sub-agent can return status=skipped
            # with a "no files in scope" reason).
            units.append({
                "leaf_id": leaf_id,
                "sub_index": 1,
                "total_subs": 1,
                "files": [],
            })
            continue
        estimated_tokens = len(files) * _TOKENS_PER_FILE
        if estimated_tokens > max_leaf_tokens:
            sub_count = _math_ceil(estimated_tokens, max_leaf_tokens)
            chunk_size = _math_ceil(len(files), sub_count)
            for sub_idx in range(sub_count):
                slice_start = sub_idx * chunk_size
                slice_end = min(slice_start + chunk_size, len(files))
                if slice_start >= len(files):
                    break
                slice_files = files[slice_start:slice_end]
                units.append({
                    "leaf_id": leaf_id,
                    "sub_index": sub_idx + 1,
                    "total_subs": sub_count,
                    "files": slice_files,
                })
                union_files.update(slice_files)
        else:
            units.append({
                "leaf_id": leaf_id,
                "sub_index": 1,
                "total_subs": 1,
                "files": files,
            })
            union_files.update(files)

    # Pack units into batches of size <= batch_size.
    batches: list[dict[str, Any]] = []
    for i in range(0, len(units), batch_size):
        batch_units = units[i : i + batch_size]
        batches.append({
            "batch_index": len(batches) + 1,
            "units": batch_units,
        })

    total_files_planned = len(union_files)

    return {
        "specialist_batches": batches,
        "total_batches": len(batches),
        "total_files_planned": total_files_planned,
    }


# ===========================================================================
# Handler 11 — merge_specialist_outputs
# ===========================================================================
#
# PR4: fold the loop's per-iteration iter_outputs[] back into the legacy
# specialist_outputs[] shape that collect_findings consumes. Persist one
# JSON shard per (leaf_id, sub_index) so a partial-batch retry doesn't
# lose history; assert the planner-vs-merger file-union invariant.


class MissedFileError(RuntimeError):
    """Raised by merge_specialist_outputs when planned files are missing.

    The loop refactor exists to guarantee that every file the planner
    assigned to a unit reaches a specialist. If the merger's union of
    unit.files[] disagrees with the planner's total_files_planned, the
    invariant is broken — fail loudly so the failure surfaces as a
    post_validation rather than a silently-shrunk review.
    """


def _resolve_iteration_payloads(env: dict[str, Any]) -> list[dict[str, Any]]:
    """Defensively pull the per-iteration payloads out of the env.

    The engine's exposed key for loop iteration outputs is still in
    flux (see :func:`ctxr.fsm.core.aggregate_loop_outputs` for the
    canonical fold). The merger accepts any of the following shapes,
    in priority order:

    1. ``specialist_outputs_by_iter`` — explicit per-iteration list.
    2. ``loop_iters`` — generic loop iterations list (per the engine
       roadmap).
    3. ``iteration_outputs`` — alias used by some engine versions.

    Each element is expected to be ``{batch_index, iter_outputs[], loop_done}``.
    Falls back to wrapping a single-iteration top-level payload when the
    env carries only the LAST iteration's outputs.
    """
    for key in ("specialist_outputs_by_iter", "loop_iters", "iteration_outputs"):
        value = env.get(key)
        if isinstance(value, list):
            return [v for v in value if isinstance(v, dict)]
    if isinstance(env.get("iter_outputs"), list):
        return [{
            "batch_index": env.get("batch_index", 1),
            "iter_outputs": env["iter_outputs"],
            "loop_done": bool(env.get("loop_done", True)),
        }]
    return []


def _serialised_size(payload: Any) -> int:
    """Length of the canonical JSON encoding of ``payload`` in UTF-8 bytes.

    Helper for the aggregate-size guard in
    :func:`handle_merge_specialist_outputs`. We use the SAME serialisation
    options the shard writer uses (``indent=2, sort_keys=True``) so the
    accounting matches what we actually persist to disk.
    """
    try:
        return len(
            (json.dumps(payload, indent=2, sort_keys=True) + "\n").encode("utf-8")
        )
    except (TypeError, ValueError):
        # Non-serialisable payload — treat as zero so it doesn't dominate
        # the budget calculation. The shard writer will skip it anyway.
        return 0


def _severity_rank(finding: Any) -> int:
    """Return a numeric severity rank for sort ordering.

    Higher rank = more severe. Unknown / non-string severities collapse
    to 0 so they sort BELOW even minor findings (= dropped first when
    the aggregate-size guard trims).
    """
    if not isinstance(finding, dict):
        return 0
    sev = finding.get("severity")
    if isinstance(sev, str):
        return _SEVERITY_RANK.get(sev.lower(), 0)
    return 0


def _trim_lowest_priority_unit(
    specialist_outputs: list[dict[str, Any]],
    units_by_id: dict[str, dict[str, Any]],
) -> tuple[bool, int]:
    """Drop the single lowest-severity finding from the largest unit.

    The guard's contract is "never drop a leaf entirely" — we always
    preserve at least the unit envelope (``{id, status, findings: []}``)
    so the planner-vs-merger union invariant continues to hold. Returns
    ``(trimmed_anything, bytes_freed)``; the caller iterates while the
    aggregate still exceeds the budget.
    """
    if not specialist_outputs:
        return False, 0

    # Pick the unit with the largest serialised payload — it dominates
    # the aggregate, so trimming there yields the biggest win per drop.
    target = max(specialist_outputs, key=_serialised_size)
    findings = target.get("findings")
    if not isinstance(findings, list) or not findings:
        return False, 0

    # Sort findings by severity rank ASCENDING; lowest severity at the
    # head is the one we drop first. Stable sort keeps repeated-severity
    # ties in insertion order so trimming is deterministic across runs.
    before_size = _serialised_size(target)
    sorted_findings = sorted(findings, key=_severity_rank)
    target["findings"] = sorted_findings[1:]
    after_size = _serialised_size(target)
    # If we somehow grew the payload (sort changed key ordering), undo.
    if after_size >= before_size:
        target["findings"] = findings
        return False, 0
    return True, before_size - after_size


def handle_merge_specialist_outputs(ctx: InlineContext) -> dict[str, Any]:
    """Flatten loop outputs + persist shards + enforce no-missed-file.

    PR5 tightens the planner-vs-merger invariant from equality to
    ``len(union_files) >= total_files_planned`` (a unit allowed to
    review a superset of its planned files is still OK; only DROPPED
    files are a bug). Also adds an aggregate-size guard: when the sum
    of serialised per-unit outputs exceeds
    :data:`_AGGREGATE_OUTPUT_BUDGET_BYTES` (100 MB), we trim the
    lowest-priority findings from the largest unit until we fit — but
    we NEVER drop a leaf entirely, so the union invariant still holds.
    """
    env = _env_from_ctx(ctx)
    args_bag = _ensure_dict(env.get("args"))
    specialist_batches = _ensure_list(env.get("specialist_batches"))
    total_files_planned = env.get("total_files_planned")
    if not isinstance(total_files_planned, int):
        total_files_planned = 0

    iter_payloads = _resolve_iteration_payloads(env)

    # Dedupe iter outputs by (leaf_id, sub_index) keeping the LAST
    # occurrence. Later iterations win because retries replay a batch
    # with fresh outputs that should overwrite the earlier attempt.
    deduped: dict[tuple[str, int], dict[str, Any]] = {}
    for iter_n_zero, payload in enumerate(iter_payloads):
        iter_n = iter_n_zero + 1
        iter_outputs = payload.get("iter_outputs")
        if not isinstance(iter_outputs, list):
            continue
        for unit_out in iter_outputs:
            if not isinstance(unit_out, dict):
                continue
            leaf_id = unit_out.get("leaf_id")
            sub_index = unit_out.get("sub_index")
            if not isinstance(leaf_id, str) or not isinstance(sub_index, int):
                continue
            key = (leaf_id, sub_index)
            # Stamp the iter_n so the sharded filename preserves history.
            deduped[key] = {**unit_out, "__iter_n": iter_n}

    # Materialise one shard per (leaf_id, sub_index). The shard root lives
    # under the run directory (project_root/.skill-code-review/specialists/).
    # We use the content-addressed shard_path helper trunk introduced so
    # the directory tree stays sub-1000-entries per node even when leaf
    # counts grow into the thousands across many runs.
    skill_root = _resolve_skill_root()
    project_root = _coerce_absolute_project_root(
        args_bag.get("project_root"), skill_root
    )
    storage_root = _resolve_storage_root(project_root)
    specialists_root = storage_root / "specialists"

    union_files: set[str] = set()
    specialist_outputs: list[dict[str, Any]] = []
    units_by_id: dict[str, dict[str, Any]] = {}
    pending_writes: list[tuple[Path, dict[str, Any]]] = []
    for (leaf_id, sub_index), unit_out in deduped.items():
        iter_n = unit_out.get("__iter_n", 0)
        specialist_output = unit_out.get("specialist_output")
        if not isinstance(specialist_output, dict):
            continue
        # Stamp leaf_id back onto the specialist output if the sub-agent
        # forgot — the legacy collect_findings handler keys on id.
        if not isinstance(specialist_output.get("id"), str):
            specialist_output = {**specialist_output, "id": leaf_id}
        # Track which files this unit reviewed so we can enforce the
        # planner-vs-merger union invariant.
        for batch in specialist_batches:
            if not isinstance(batch, dict):
                continue
            for unit in batch.get("units") or []:
                if (
                    isinstance(unit, dict)
                    and unit.get("leaf_id") == leaf_id
                    and unit.get("sub_index") == sub_index
                ):
                    for file in unit.get("files") or []:
                        if isinstance(file, str):
                            union_files.add(file)
        # Defer the on-disk write until AFTER the aggregate-size guard
        # has had a chance to trim oversized units in-memory. Otherwise
        # we'd persist payloads we're about to mutate.
        unit_key = f"{leaf_id}/{sub_index}"
        filename = f"{leaf_id}__sub{sub_index}__iter{iter_n}.json"
        shard = shard_path(specialists_root, unit_key, filename)
        pending_writes.append((shard, specialist_output))
        specialist_outputs.append(specialist_output)
        units_by_id[f"{leaf_id}#{sub_index}"] = specialist_output

    # PR5 — aggregate-size guard. Sum the serialised size of every
    # specialist_output and, while we exceed the 100 MB budget, trim
    # the lowest-severity finding from the LARGEST unit. The leaf
    # envelope itself is never removed (the union invariant still
    # holds). We cap the loop at len(findings) total iterations as a
    # final safety net against a pathological payload that can't be
    # shrunk further.
    aggregate_bytes = sum(_serialised_size(out) for out in specialist_outputs)
    if aggregate_bytes > _AGGREGATE_OUTPUT_BUDGET_BYTES:
        import logging  # local import — only when the guard actually fires

        log = logging.getLogger(__name__)
        log.warning(
            "merge_specialist_outputs: aggregate output %d bytes exceeds "
            "budget of %d bytes; trimming lowest-priority findings "
            "(no leaf will be fully dropped)",
            aggregate_bytes,
            _AGGREGATE_OUTPUT_BUDGET_BYTES,
        )
        max_passes = sum(
            len(out.get("findings") or []) for out in specialist_outputs
        )
        passes = 0
        while (
            aggregate_bytes > _AGGREGATE_OUTPUT_BUDGET_BYTES
            and passes < max_passes
        ):
            trimmed, freed = _trim_lowest_priority_unit(
                specialist_outputs, units_by_id
            )
            if not trimmed or freed == 0:
                break
            aggregate_bytes -= freed
            passes += 1

    # Persist the (possibly trimmed) shards. Writing AFTER the trim
    # keeps the on-disk record consistent with the in-memory state we
    # return — the manifest + report pipeline reads the in-memory list,
    # but the shards are the durable replay surface for a re-run.
    for shard, specialist_output in pending_writes:
        shard.parent.mkdir(parents=True, exist_ok=True)
        shard.write_text(
            json.dumps(specialist_output, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )

    # Enforce the no-missed-file invariant. The merger's union must
    # be at least the planner's total — if smaller, the loop body
    # dropped units; if larger, a sub-agent reviewed extras (allowed).
    if len(union_files) < total_files_planned:
        raise MissedFileError(
            f"merge_specialist_outputs: union of unit files "
            f"({len(union_files)}) is below planner's "
            f"total_files_planned ({total_files_planned}); the loop "
            f"body dropped one or more planned units"
        )

    return {"specialist_outputs": specialist_outputs}


# ===========================================================================
# Handler 12 — verifier_stuck (PR5)
# ===========================================================================
#
# Reached when the same worker state has rejected the verifier panel
# _VERIFIER_REJECTION_LIMIT times in a row. Records the impasse so the
# audit trail explains why the run is degraded, marks the relevant
# leaf/batch as failed in env, and lets the pipeline continue. The
# synthesize_release_readiness handler already lowers the verdict when
# coverage is partial — verifier_stuck simply ensures we GET to that
# handler instead of looping until the engine's max_iterations cap.


def handle_verifier_stuck(ctx: InlineContext) -> dict[str, Any]:
    """Record a verifier-rejection impasse and degrade the run.

    The handler is intentionally tiny: it does NOT re-dispatch the
    worker, does NOT mutate findings, and does NOT try to "fix" the
    rejected outputs. Its single job is to:

    1. Emit a structured ``verifier_stuck`` record (stuck_state +
       rejection_count) so reviewers can see exactly which gate gave
       up at audit time.
    2. Mark ``degraded_run=True`` so downstream handlers know coverage
       is incomplete (synthesize_release_readiness consumes this).
    3. Reset the rejection counter for the stuck state so a later
       retry — should the operator manually resume the run — starts
       from a clean slate.

    Inputs (all optional, defensive defaults):

    * ``verifier_rejection_counts`` (dict[str, int]) — per-state count
      of consecutive rejections.
    * ``stuck_state_id`` (str) — explicit override of which state is
      stuck; falls back to scanning the counts dict for the first
      entry at or above the limit.
    * ``current_leaf_id`` (str) / ``current_batch_index`` (int) — the
      leaf or batch that owned the rejected commit; surfaced in the
      record so downstream tools can render a useful error.

    Outputs:

    * ``verifier_stuck`` (dict) — the structured impasse record.
    * ``degraded_run`` (bool) — always True.
    * ``verifier_rejection_counts`` (dict[str, int]) — the counter map
      with the stuck state reset to 0.
    * ``failed_units`` (list) — the leaf/batch markers the orchestrator
      uses to skip re-dispatching the same unit on resume.
    """
    env = _env_from_ctx(ctx)
    counts = _read_verifier_rejection_counts(env)

    explicit_stuck = env.get("stuck_state_id")
    stuck_state_id: str | None = None
    if isinstance(explicit_stuck, str) and explicit_stuck:
        stuck_state_id = explicit_stuck
    else:
        for state_id, count in counts.items():
            if count >= _VERIFIER_REJECTION_LIMIT:
                stuck_state_id = state_id
                break

    rejection_count = counts.get(stuck_state_id or "", 0)

    failed_units: list[dict[str, Any]] = []
    current_leaf = env.get("current_leaf_id")
    if isinstance(current_leaf, str) and current_leaf:
        failed_units.append({"leaf_id": current_leaf, "reason": "verifier_stuck"})
    current_batch = env.get("current_batch_index")
    if isinstance(current_batch, int):
        failed_units.append(
            {"batch_index": current_batch, "reason": "verifier_stuck"}
        )

    # Reset the counter for the stuck state so a manual resume gets a
    # clean slate. Other states keep their counts untouched.
    reset_counts = dict(counts)
    if stuck_state_id is not None:
        reset_counts[stuck_state_id] = 0

    return {
        "verifier_stuck": {
            "stuck_state_id": stuck_state_id or "",
            "rejection_count": rejection_count,
            "limit": _VERIFIER_REJECTION_LIMIT,
        },
        "degraded_run": True,
        "verifier_rejection_counts": reset_counts,
        "failed_units": failed_units,
    }


# ---------------------------------------------------------------------------
# Public dispatch table
# ---------------------------------------------------------------------------


INLINE_HANDLERS: dict[str, InlineHandler] = {
    "risk_tier_triage": handle_risk_tier_triage,
    "activate_leaves": handle_activate_leaves,
    "plan_specialist_batches": handle_plan_specialist_batches,
    "merge_specialist_outputs": handle_merge_specialist_outputs,
    "collect_findings": handle_collect_findings,
    "verify_coverage": handle_verify_coverage,
    "synthesize_release_readiness": handle_synthesize_release_readiness,
    "write_run_directory": handle_write_run_directory,
    "emit_stdout": handle_emit_stdout,
    "short_circuit_exit": handle_short_circuit_exit,
    "stage_a_empty": handle_stage_a_empty,
    "verifier_stuck": handle_verifier_stuck,
}


__all__ = [
    "INLINE_HANDLERS",
    "MissedFileError",
    "build_report_payload",
    "handle_activate_leaves",
    "handle_collect_findings",
    "handle_emit_stdout",
    "handle_merge_specialist_outputs",
    "handle_plan_specialist_batches",
    "handle_risk_tier_triage",
    "handle_short_circuit_exit",
    "handle_stage_a_empty",
    "handle_synthesize_release_readiness",
    "handle_verifier_stuck",
    "handle_verify_coverage",
    "handle_write_run_directory",
    "render_report_json",
    "render_report_markdown",
    "write_run_artefacts",
]


# Silence "unused import" warnings for re-exports that are still useful
# during typing across modules.
del Iterable
