"""The skill-code-review FSM spec — a 15-state pipeline declared in Python.

Port of ``fsm/code-reviewer.fsm.yaml`` from the legacy Node skill (v2.5.1)
to a Pydantic :class:`~ctxr.fsm.FsmSpec` literal. The spec preserves the
v2 behaviour 1:1:

* 5 worker states (``scan_project``, ``tree_descend``, ``llm_trim``,
  ``tool_discovery``, ``dispatch_specialists``) dispatch sub-agents
  with the prompt templates under :mod:`ctxr_skill_code_review.workers`.
* 9 inline states run server-side via registered Python callables in
  :mod:`ctxr_skill_code_review.handlers` (``risk_tier_triage``,
  ``activate_leaves``, ``collect_findings``, ``verify_coverage``,
  ``synthesize_release_readiness``, ``write_run_directory``,
  ``emit_stdout``, ``short_circuit_exit``, ``stage_a_empty``).
* 1 terminal state (``terminal``).

State ids and transition predicates match the YAML byte-for-byte; only
the predicate STRINGS are translated from the YAML's prose form
(``"tier is one of {trivial, lite, full, sensitive}"``) into the actual
predicate-DSL expressions the Python engine evaluates
(``"tier == 'trivial' OR tier == 'lite' OR …"``). The mapping is purely
mechanical and documented inline next to each ``_predicate(...)`` call.

This module is import-safe — registering the spec with a Project
requires a separate call (see :func:`ctxr_skill_code_review.install.register`).
"""

from __future__ import annotations

from enum import StrEnum
from importlib import resources
from typing import Any

from ctxr.fsm import (
    FsmSpec,
    Predicate,
    ResponseSchema,
    State,
    Transition,
    TransitionKind,
    Worker,
)

# InlineSpec hasn't been promoted to the ergonomic top-level facade yet;
# import it from ctxr.fsm.core where the W14a engine extension defines it.
from ctxr.fsm.core import InlineSpec

# ---------------------------------------------------------------------------
# Enum-discipline (W14i prospective) — closed vocabularies as StrEnums
# ---------------------------------------------------------------------------


class ReviewVerdict(StrEnum):
    """Closed verdict vocabulary emitted by the review pipeline.

    Wire-format values come straight from `release-readiness.md`. Member
    names use snake-case (Python identifier rules forbid ``-`` in
    ``NO_GO``); the StrEnum value carries the canonical ``"NO-GO"`` wire
    form so handlers / report-renderers continue to emit the v2.5.1
    bytes.
    """

    GO = "GO"
    CONDITIONAL = "CONDITIONAL"
    NO_GO = "NO-GO"


class RiskTier(StrEnum):
    """Bucket the risk-tier-triage handler assigns to the diff."""

    trivial = "trivial"
    lite = "lite"
    full = "full"
    sensitive = "sensitive"


class Severity(StrEnum):
    """Finding severity taxonomy used by collect-findings + the report."""

    critical = "critical"
    important = "important"
    minor = "minor"


class GateStatus(StrEnum):
    """Per-gate status emitted by ``synthesize_release_readiness``."""

    PASS = "PASS"
    FAIL = "FAIL"
    NA = "N/A"


# ---------------------------------------------------------------------------
# Spec id + handler ids — exported so handlers.py + install.py share them
# ---------------------------------------------------------------------------


SPEC_ID = "code-reviewer"
SPEC_VERSION = 1


class HandlerId(StrEnum):
    """Registered inline handler ids — mirrors :mod:`handlers.INLINE_HANDLERS`.

    The string values are the kebab-/snake-case ids the engine looks up
    when an inline state is reached; the InlineHandlerRegistry keys on
    ``(spec_id, handler_id)``.
    """

    risk_tier_triage = "risk_tier_triage"
    activate_leaves = "activate_leaves"
    collect_findings = "collect_findings"
    verify_coverage = "verify_coverage"
    synthesize_release_readiness = "synthesize_release_readiness"
    write_run_directory = "write_run_directory"
    emit_stdout = "emit_stdout"
    short_circuit_exit = "short_circuit_exit"
    stage_a_empty = "stage_a_empty"


# ---------------------------------------------------------------------------
# Worker prompt template loader
# ---------------------------------------------------------------------------


def _load_worker_prompt(name: str) -> str:
    """Read a worker prompt .md from the bundled :mod:`workers` package.

    The prompt files ship inside the wheel via
    ``pyproject.toml::tool.hatch.build.include`` so ``importlib.resources``
    can resolve them at runtime regardless of how the package was
    installed (editable, wheel, sdist).
    """
    return (
        resources.files("ctxr_skill_code_review.workers")
        .joinpath(f"{name}.md")
        .read_text(encoding="utf-8")
    )


# ---------------------------------------------------------------------------
# Response-schema helpers (one builder per worker state for readability)
# ---------------------------------------------------------------------------


def _project_scanner_schema() -> ResponseSchema:
    return ResponseSchema.model_validate({
        "schema": {
            "type": "object",
            "required": ["project_profile", "changed_paths", "diff_stats"],
            "properties": {
                "project_profile": {
                    "type": "object",
                    "required": ["languages", "frameworks", "monorepo"],
                    "properties": {
                        "languages": {
                            "type": "array",
                            "minItems": 1,
                            "items": {"type": "string"},
                        },
                        "frameworks": {
                            "type": "array",
                            "items": {"type": "string"},
                        },
                        "monorepo": {"type": "boolean"},
                        "ci": {"type": "array", "items": {"type": "string"}},
                        "container": {"type": "array", "items": {"type": "string"}},
                        "iac": {"type": "array", "items": {"type": "string"}},
                        "build": {"type": "array", "items": {"type": "string"}},
                        "lint": {"type": "array", "items": {"type": "string"}},
                    },
                },
                "changed_paths": {
                    "type": "array",
                    "items": {"type": "string"},
                },
                "diff_stats": {
                    "type": "object",
                    "required": ["lines_changed", "files_changed"],
                    "properties": {
                        "lines_changed": {"type": "integer", "minimum": 0},
                        "files_changed": {"type": "integer", "minimum": 0},
                    },
                },
            },
        }
    })


def _risk_tier_triage_schema() -> ResponseSchema:
    """Inline-state schema: validates risk_tier_triage outputs."""
    return ResponseSchema.model_validate({
        "schema": {
            "type": "object",
            "required": [
                "tier",
                "cap",
                "tier_rationale",
                "risk_signals",
                "scope_overrides_present",
            ],
            "properties": {
                "tier": {"type": "string", "enum": [m.value for m in RiskTier]},
                "cap": {"type": "integer", "minimum": 3, "maximum": 50},
                "tier_rationale": {"type": "string"},
                "risk_signals": {"type": "array", "items": {"type": "string"}},
                "scope_overrides_present": {"type": "boolean"},
            },
        }
    })


def _activate_leaves_schema() -> ResponseSchema:
    return ResponseSchema.model_validate({
        "schema": {
            "type": "object",
            "required": ["activated_leaves"],
            "properties": {
                "activated_leaves": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["id", "path", "activation_match"],
                        "properties": {
                            "id": {"type": "string"},
                            "path": {"type": "string"},
                            "activation_match": {
                                "type": "array",
                                "items": {"type": "string"},
                            },
                        },
                    },
                },
            },
        }
    })


def _tree_descender_schema() -> ResponseSchema:
    return ResponseSchema.model_validate({
        "schema": {
            "type": "object",
            "required": ["stage_a_candidates", "descent_path"],
            "properties": {
                "stage_a_candidates": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["id", "path", "activation_match"],
                        "properties": {
                            "id": {
                                "type": "string",
                                "pattern": "^[a-z][a-z0-9-]*$",
                            },
                            "path": {"type": "string"},
                            "activation_match": {
                                "type": "array",
                                "minItems": 1,
                                "items": {
                                    "enum": [
                                        "file_globs",
                                        "keyword_matches",
                                        "structural_signals",
                                        "escalation_from",
                                        "focus_only",
                                    ],
                                },
                            },
                            "file_globs": {
                                "type": "array",
                                "items": {"type": "string"},
                            },
                            "focus": {"type": "string"},
                            "dimensions": {
                                "type": "array",
                                "items": {"type": "string"},
                            },
                            "audit_surface": {
                                "type": "array",
                                "items": {"type": "string"},
                            },
                            "languages": {
                                "oneOf": [
                                    {"type": "string", "enum": ["all"]},
                                    {
                                        "type": "array",
                                        "items": {"type": "string"},
                                        "minItems": 1,
                                    },
                                ]
                            },
                            "tools": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "required": ["name", "purpose"],
                                    "properties": {
                                        "name": {"type": "string", "minLength": 1},
                                        "purpose": {"type": "string", "minLength": 1},
                                        "command": {"type": "string"},
                                    },
                                },
                            },
                            "tags": {
                                "type": "array",
                                "items": {"type": "string"},
                            },
                            "covers": {
                                "type": "array",
                                "items": {"type": "string"},
                            },
                            "type": {"type": "string"},
                        },
                    },
                },
                "descent_path": {
                    "type": "array",
                    "items": {"type": "string"},
                },
            },
        }
    })


def _trim_candidates_schema() -> ResponseSchema:
    return ResponseSchema.model_validate({
        "schema": {
            "type": "object",
            "required": ["picked_leaves", "rejected_leaves", "coverage_rescues"],
            "properties": {
                "picked_leaves": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["id", "path", "justification", "dimensions"],
                        "properties": {
                            "id": {"type": "string"},
                            "path": {"type": "string"},
                            "justification": {"type": "string", "minLength": 1},
                            "dimensions": {
                                "type": "array",
                                "items": {"type": "string"},
                            },
                        },
                    },
                },
                "rejected_leaves": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["id", "reason"],
                        "properties": {
                            "id": {"type": "string"},
                            "reason": {"type": "string", "minLength": 1},
                        },
                    },
                },
                "coverage_rescues": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["file", "rescued_leaf", "reason"],
                        "properties": {
                            "file": {"type": "string"},
                            "rescued_leaf": {"type": "string"},
                            "reason": {"type": "string"},
                        },
                    },
                },
            },
        }
    })


def _tool_runner_schema() -> ResponseSchema:
    # Subtle: the YAML used three oneOf variants discriminated by `status`;
    # we collapse to a single permissive schema because the JSON-schema
    # draft 2020-12 validator + the inline coverage handler already filter
    # by status — the schema's only contract is that each row carries
    # name+status+findings+output. Skipped rows additionally need `reason`,
    # enforced via an if/then schema clause.
    return ResponseSchema.model_validate({
        "schema": {
            "type": "object",
            "required": ["tool_results"],
            "properties": {
                "tool_results": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["name", "status"],
                        "properties": {
                            "name": {"type": "string"},
                            "status": {"enum": ["pass", "fail", "skipped"]},
                            "findings": {"type": "integer"},
                            "output": {"type": "string"},
                            "reason": {"type": "string"},
                            "scoped_files": {
                                "type": "array",
                                "items": {"type": "string"},
                            },
                        },
                        "if": {
                            "properties": {"status": {"const": "skipped"}},
                        },
                        "then": {"required": ["reason"]},
                    },
                },
            },
        }
    })


def _specialist_schema() -> ResponseSchema:
    return ResponseSchema.model_validate({
        "schema": {
            "type": "object",
            "required": ["specialist_outputs"],
            "properties": {
                "specialist_outputs": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "required": ["id", "status", "findings"],
                        "properties": {
                            "id": {"type": "string"},
                            "status": {"enum": ["completed", "failed", "skipped"]},
                            "runtime_ms": {"type": "integer"},
                            "tokens_in": {"type": "integer"},
                            "tokens_out": {"type": "integer"},
                            "findings": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "required": ["severity", "file", "title"],
                                    "properties": {
                                        "severity": {
                                            "enum": [m.value for m in Severity],
                                        },
                                        "file": {"type": "string"},
                                        "line": {"type": ["integer", "null"]},
                                        "title": {"type": "string"},
                                        "description": {"type": "string"},
                                        "impact": {"type": "string"},
                                        "fix": {"type": "string"},
                                    },
                                },
                            },
                            "skip_reason": {"type": "string"},
                        },
                        "if": {
                            "properties": {"status": {"const": "skipped"}},
                        },
                        "then": {"required": ["skip_reason"]},
                    },
                },
            },
        }
    })


def _collect_findings_schema() -> ResponseSchema:
    return ResponseSchema.model_validate({
        "schema": {
            "type": "object",
            "required": ["findings", "severity_counts"],
            "properties": {
                "findings": {"type": "array"},
                "severity_counts": {"type": "object"},
            },
        }
    })


def _verify_coverage_schema() -> ResponseSchema:
    return ResponseSchema.model_validate({
        "schema": {
            "type": "object",
            "required": ["coverage_matrix", "coverage_gaps", "coverage_rule_violated"],
            "properties": {
                "coverage_matrix": {"type": "array"},
                "coverage_gaps": {"type": "array"},
                "coverage_rule_violated": {"type": "boolean"},
            },
        }
    })


def _release_readiness_schema() -> ResponseSchema:
    return ResponseSchema.model_validate({
        "schema": {
            "type": "object",
            "required": ["gates", "verdict"],
            "properties": {
                "gates": {
                    "type": "array",
                    "minItems": 8,
                    "maxItems": 8,
                },
                "verdict": {
                    "type": "string",
                    "enum": [m.value for m in ReviewVerdict],
                },
            },
        }
    })


def _write_run_directory_schema() -> ResponseSchema:
    return ResponseSchema.model_validate({
        "schema": {
            "type": "object",
            "required": ["run_dir_path"],
            "properties": {"run_dir_path": {"type": "string", "minLength": 1}},
        }
    })


def _emit_stdout_schema() -> ResponseSchema:
    # The YAML declares `outputs: []` for emit_stdout, but inline states
    # with transitions MUST declare a response_schema (engine contract).
    # Use the empty-object schema so the handler can return `{}` and the
    # engine validates trivially.
    return ResponseSchema.model_validate({
        "schema": {
            "type": "object",
            "additionalProperties": True,
        }
    })


def _short_circuit_schema() -> ResponseSchema:
    return ResponseSchema.model_validate({
        "schema": {
            "type": "object",
            "required": [
                "findings",
                "severity_counts",
                "coverage_matrix",
                "coverage_gaps",
                "gates",
                "verdict",
                "short_circuited",
            ],
            "properties": {
                "findings": {"type": "array"},
                "severity_counts": {"type": "object"},
                "coverage_matrix": {"type": "array"},
                "coverage_gaps": {"type": "array"},
                "gates": {"type": "array"},
                "verdict": {"type": "string", "enum": [m.value for m in ReviewVerdict]},
                "short_circuited": {"type": "boolean"},
            },
        }
    })


def _stage_a_empty_schema() -> ResponseSchema:
    return ResponseSchema.model_validate({
        "schema": {
            "type": "object",
            "required": [
                "findings",
                "severity_counts",
                "coverage_matrix",
                "coverage_gaps",
                "gates",
                "verdict",
                "degraded_run",
            ],
            "properties": {
                "findings": {"type": "array"},
                "severity_counts": {"type": "object"},
                "coverage_matrix": {"type": "array"},
                "coverage_gaps": {"type": "array"},
                "gates": {"type": "array"},
                "verdict": {"type": "string", "enum": [m.value for m in ReviewVerdict]},
                "degraded_run": {"type": "boolean"},
            },
        }
    })


# ---------------------------------------------------------------------------
# Predicate translation helpers
# ---------------------------------------------------------------------------
#
# The YAML's post_validations were prose strings. The Python engine
# evaluates Predicate.expression against the worker's outputs dict via
# the DSL in :mod:`ctxr.fsm.core.predicates`. Each prose string is
# translated 1:1 into a DSL expression:
#
#   "tier is one of {trivial, lite, full, sensitive}"
#     → tier == 'trivial' OR tier == 'lite' OR tier == 'full'
#       OR tier == 'sensitive'
#   "cap is an integer in [3, 50]"
#     → cap >= 3 AND cap <= 50
#   "X is an array"
#     → len(X) >= 0  (truthy for any iterable; falsey only when len()
#                     raises, which the DSL captures as PredicateEvalError
#                     and surfaces as a post-validation failure)
#   "len(X) == 0"  / "verdict == 'GO'"  etc. — already DSL expressions.
#
# Predicates are written verbatim so a reader can grep across the spec
# for the predicate text and find both the YAML history and the Python
# definition.


def _in_set(field: str, values: list[str]) -> str:
    """Return a predicate expression: ``field == 'a' OR field == 'b' …``.

    The DSL has an ``in(x, h)`` function but it does substring / member
    match on a value already in scope, not enum-against-literal-list.
    Disjunctive equality keeps the expression human-readable and exactly
    matches the prose form.
    """
    return " OR ".join(f"{field} == '{value}'" for value in values)


# ---------------------------------------------------------------------------
# State factories — one per state; FsmSpec assembles them at the bottom.
# ---------------------------------------------------------------------------


def _scan_project() -> State:
    return State(
        id="scan_project",
        purpose="Build a Project Profile from manifests + repo state.",
        worker=Worker(
            role="project-scanner",
            prompt_template=_load_worker_prompt("project-scanner"),
            prompt_template_language='markdown',
            inputs=["args"],
            response_schema=_project_scanner_schema(),
        ),
        outputs=["project_profile", "changed_paths", "diff_stats"],
        post_validations=[
            # "project_profile.languages is a non-empty list"
            Predicate("len(project_profile.languages) > 0"),
            # "diff_stats.lines_changed is a non-negative integer"
            Predicate("diff_stats.lines_changed >= 0"),
        ],
        allowed_tools=[
            "Bash(git diff:*)",
            "Bash(git log:*)",
            "Bash(git status:*)",
            "Bash(git ls-files:*)",
            "Bash(cat:*)",
            "Read",
            "Glob",
        ],
        transitions=[Transition(to="risk_tier_triage", when=TransitionKind.always)],
    )


def _risk_tier_triage() -> State:
    return State(
        id="risk_tier_triage",
        purpose=(
            "Bucket the diff into trivial/lite/full/sensitive and set the specialist cap."
        ),
        preconditions=[
            "project_profile exists in run state",
            "changed_paths exists in run state",
            "diff_stats exists in run state",
        ],
        inline=InlineSpec(
            handler_id=HandlerId.risk_tier_triage.value,
            response_schema=_risk_tier_triage_schema(),
            post_validations=[
                # "tier is one of {trivial, lite, full, sensitive}"
                Predicate(_in_set("tier", [m.value for m in RiskTier])),
                # "cap is an integer in [3, 50]"
                Predicate("cap >= 3 AND cap <= 50"),
            ],
            purpose="Deterministic risk-tier bucketing + specialist cap.",
        ),
        outputs=[
            "tier",
            "cap",
            "tier_rationale",
            "risk_signals",
            "scope_overrides_present",
        ],
        transitions=[
            Transition(
                to="short_circuit_exit",
                when=Predicate(
                    "tier == 'trivial' AND len(risk_signals) == 0 "
                    "AND NOT scope_overrides_present"
                ),
            ),
            Transition(to="activate_leaves", when=TransitionKind.always),
        ],
    )


def _activate_leaves() -> State:
    return State(
        id="activate_leaves",
        purpose=(
            "Run the activation gate over every wiki leaf deterministically; "
            "produce activated_leaves[] for the tree-descender to consume."
        ),
        preconditions=[
            "project_profile exists in run state",
            "changed_paths exists in run state",
        ],
        inline=InlineSpec(
            handler_id=HandlerId.activate_leaves.value,
            response_schema=_activate_leaves_schema(),
            post_validations=[
                # "activated_leaves is an array"
                Predicate("len(activated_leaves) >= 0"),
            ],
        ),
        outputs=["activated_leaves"],
        transitions=[
            Transition(
                to="stage_a_empty",
                when=Predicate("len(activated_leaves) == 0"),
            ),
            Transition(to="tree_descend", when=TransitionKind.always),
        ],
    )


def _tree_descend() -> State:
    return State(
        id="tree_descend",
        purpose=(
            "Filter activated_leaves[] by parent subcategory focus (semantic "
            "LLM judgement); emit stage_a_candidates as the trim worker's input."
        ),
        preconditions=[
            "project_profile exists in run state",
            "tier exists in run state",
            "activated_leaves exists in run state",
        ],
        worker=Worker(
            role="tree-descender",
            prompt_template=_load_worker_prompt("tree-descender"),
            prompt_template_language='markdown',
            inputs=["project_profile", "changed_paths", "tier", "activated_leaves"],
            response_schema=_tree_descender_schema(),
        ),
        outputs=["stage_a_candidates", "descent_path"],
        post_validations=[Predicate("len(stage_a_candidates) >= 0")],
        allowed_tools=["Read"],
        transitions=[
            Transition(
                to="stage_a_empty",
                when=Predicate("len(stage_a_candidates) == 0"),
            ),
            Transition(to="llm_trim", when=TransitionKind.always),
        ],
    )


def _llm_trim() -> State:
    return State(
        id="llm_trim",
        purpose="Pick K = cap leaves from candidates with one-sentence justifications.",
        preconditions=[
            "stage_a_candidates is non-empty",
            "cap exists in run state",
        ],
        worker=Worker(
            role="trim-candidates",
            prompt_template=_load_worker_prompt("trim-candidates"),
            prompt_template_language='markdown',
            inputs=[
                "project_profile",
                "changed_paths",
                "tier",
                "cap",
                "stage_a_candidates",
            ],
            response_schema=_trim_candidates_schema(),
        ),
        outputs=["picked_leaves", "rejected_leaves", "coverage_rescues"],
        post_validations=[Predicate("len(picked_leaves) >= 0")],
        allowed_tools=[],
        transitions=[Transition(to="tool_discovery", when=TransitionKind.always)],
    )


def _tool_discovery() -> State:
    return State(
        id="tool_discovery",
        purpose="Collect external tools declared by picked leaves; run available ones.",
        preconditions=["picked_leaves is an array"],
        worker=Worker(
            role="tool-runner",
            prompt_template=_load_worker_prompt("tool-runner"),
            prompt_template_language='markdown',
            inputs=["picked_leaves", "args"],
            response_schema=_tool_runner_schema(),
        ),
        outputs=["tool_results"],
        allowed_tools=[
            "Bash(eslint:*)",
            "Bash(ruff:*)",
            "Bash(mypy:*)",
            "Bash(npm test:*)",
            "Bash(pytest:*)",
            "Bash(cargo:*)",
            "Bash(go test:*)",
            "Bash(which:*)",
            "Read",
        ],
        transitions=[Transition(to="dispatch_specialists", when=TransitionKind.always)],
    )


def _dispatch_specialists() -> State:
    return State(
        id="dispatch_specialists",
        purpose=(
            "Dispatch K picked-leaf specialists in parallel; aggregate their "
            "findings into specialist_outputs[]."
        ),
        preconditions=["picked_leaves is an array"],
        worker=Worker(
            role="specialist",
            prompt_template=_load_worker_prompt("specialist"),
            prompt_template_language='markdown',
            inputs=[
                "project_profile",
                "changed_paths",
                "picked_leaves",
                "tool_results",
            ],
            response_schema=_specialist_schema(),
        ),
        outputs=["specialist_outputs"],
        post_validations=[Predicate("len(specialist_outputs) >= 0")],
        allowed_tools=[
            "Read",
            "Grep",
            "Glob",
            "WebFetch",
            "Bash(git diff:*)",
            "Bash(git log:*)",
        ],
        transitions=[Transition(to="collect_findings", when=TransitionKind.always)],
    )


def _collect_findings() -> State:
    return State(
        id="collect_findings",
        purpose="Deduplicate findings across specialists; categorise by severity.",
        preconditions=["specialist_outputs exists in run state"],
        inline=InlineSpec(
            handler_id=HandlerId.collect_findings.value,
            response_schema=_collect_findings_schema(),
            post_validations=[Predicate("len(findings) >= 0")],
        ),
        outputs=["findings", "severity_counts"],
        transitions=[Transition(to="verify_coverage", when=TransitionKind.always)],
    )


def _verify_coverage() -> State:
    return State(
        id="verify_coverage",
        purpose="Build per-file coverage matrix; flag files reviewed by < 2 specialists.",
        preconditions=[
            "findings exists in run state",
            "picked_leaves exists in run state",
            "changed_paths exists in run state",
        ],
        inline=InlineSpec(
            handler_id=HandlerId.verify_coverage.value,
            response_schema=_verify_coverage_schema(),
            post_validations=[Predicate("len(coverage_matrix) >= 0")],
        ),
        outputs=["coverage_matrix", "coverage_gaps", "coverage_rule_violated"],
        transitions=[Transition(to="synthesize_release_readiness", when=TransitionKind.always)],
    )


def _synthesize_release_readiness() -> State:
    return State(
        id="synthesize_release_readiness",
        purpose="Aggregate findings into 8 gates by dimension/tag; compute verdict.",
        preconditions=[
            "findings exists in run state",
            "picked_leaves exists in run state",
        ],
        inline=InlineSpec(
            handler_id=HandlerId.synthesize_release_readiness.value,
            response_schema=_release_readiness_schema(),
            post_validations=[
                # "verdict is one of {GO, CONDITIONAL, NO-GO}"
                Predicate(_in_set("verdict", [m.value for m in ReviewVerdict])),
                # "gates has exactly 8 entries"
                Predicate("len(gates) == 8"),
            ],
        ),
        outputs=["gates", "verdict"],
        transitions=[Transition(to="write_run_directory", when=TransitionKind.always)],
    )


def _write_run_directory() -> State:
    return State(
        id="write_run_directory",
        purpose=(
            "Write the persistent run directory: manifest.json + report.md + report.json."
        ),
        preconditions=[
            "verdict exists in run state",
            "gates exists in run state",
        ],
        inline=InlineSpec(
            handler_id=HandlerId.write_run_directory.value,
            response_schema=_write_run_directory_schema(),
            post_validations=[Predicate("len(run_dir_path) > 0")],
        ),
        outputs=["run_dir_path"],
        transitions=[Transition(to="emit_stdout", when=TransitionKind.always)],
    )


def _emit_stdout() -> State:
    return State(
        id="emit_stdout",
        purpose="Print the report (markdown/JSON per format arg) plus manifest pointer.",
        preconditions=["run_dir_path exists in run state"],
        inline=InlineSpec(
            handler_id=HandlerId.emit_stdout.value,
            response_schema=_emit_stdout_schema(),
        ),
        outputs=[],
        transitions=[Transition(to="terminal", when=TransitionKind.always)],
    )


def _short_circuit_exit() -> State:
    return State(
        id="short_circuit_exit",
        purpose=(
            "Trivial diff with no risk signal: empty findings, GO verdict; "
            "then route through write_run_directory."
        ),
        preconditions=["tier == 'trivial'"],
        inline=InlineSpec(
            handler_id=HandlerId.short_circuit_exit.value,
            response_schema=_short_circuit_schema(),
            post_validations=[
                Predicate("verdict == 'GO'"),
                Predicate("len(findings) == 0"),
            ],
        ),
        outputs=[
            "findings",
            "severity_counts",
            "coverage_matrix",
            "coverage_gaps",
            "gates",
            "verdict",
            "short_circuited",
        ],
        transitions=[Transition(to="write_run_directory", when=TransitionKind.always)],
    )


def _stage_a_empty() -> State:
    return State(
        id="stage_a_empty",
        purpose=(
            "Non-trivial diff with empty Stage A candidates: emit CONDITIONAL; "
            "then route through write_run_directory."
        ),
        preconditions=["stage_a_candidates is empty"],
        inline=InlineSpec(
            handler_id=HandlerId.stage_a_empty.value,
            response_schema=_stage_a_empty_schema(),
            post_validations=[
                Predicate("verdict == 'CONDITIONAL'"),
                Predicate("degraded_run == true"),
            ],
        ),
        outputs=[
            "findings",
            "severity_counts",
            "coverage_matrix",
            "coverage_gaps",
            "gates",
            "verdict",
            "degraded_run",
        ],
        transitions=[Transition(to="write_run_directory", when=TransitionKind.always)],
    )


def _terminal() -> State:
    return State(
        id="terminal",
        purpose="End of FSM. The orchestrator's job is done.",
        transitions=[],
    )


# ---------------------------------------------------------------------------
# The spec
# ---------------------------------------------------------------------------


def build_spec() -> FsmSpec:
    """Construct the canonical skill-code-review FSM spec.

    Built lazily so the worker-prompt loader (which touches the
    filesystem via :func:`importlib.resources`) doesn't run at import
    time. ``fsm = build_spec()`` is published as the module-level
    convenience handle below.
    """
    return FsmSpec(
        id=SPEC_ID,
        version=SPEC_VERSION,
        entry="scan_project",
        states=[
            _scan_project(),
            _risk_tier_triage(),
            _activate_leaves(),
            _tree_descend(),
            _llm_trim(),
            _tool_discovery(),
            _dispatch_specialists(),
            _collect_findings(),
            _verify_coverage(),
            _synthesize_release_readiness(),
            _write_run_directory(),
            _emit_stdout(),
            _short_circuit_exit(),
            _stage_a_empty(),
            _terminal(),
        ],
    )


# Module-level convenience handle. Built once at import time; rebuild
# via ``build_spec()`` if a downstream tool wants a fresh copy with
# different worker prompts (none of the built-in prompts vary today).
fsm: FsmSpec = build_spec()


__all__ = [
    "SPEC_ID",
    "SPEC_VERSION",
    "GateStatus",
    "HandlerId",
    "ReviewVerdict",
    "RiskTier",
    "Severity",
    "build_spec",
    "fsm",
]


# ---------------------------------------------------------------------------
# Re-export for type-checkers that struggle with the StrEnum surface.
# ---------------------------------------------------------------------------


def get_state_ids() -> list[str]:
    """Return the spec's state ids in declared order.

    Convenience for tests that want to assert the 15-state shape
    without re-reading the spec module's internals.
    """
    return [s.id for s in fsm.states]


def get_handler_ids() -> list[str]:
    """Return the kebab-/snake-case handler ids the spec references.

    Convenience for the install / test pathway: ``register_many`` keys
    on these, and tests that drive an end-to-end run want to assert
    every id is registered before ``start_run``.
    """
    out: list[str] = []
    for state in fsm.states:
        if state.inline is not None:
            out.append(state.inline.handler_id)
    return out


# Some IDEs / static analyzers prefer typed module attributes for
# constant exports rather than the StrEnum surface. The aliases below
# are pure re-exports — they do not duplicate the source-of-truth
# StrEnum members.
ALL_HANDLER_IDS: tuple[str, ...] = tuple(m.value for m in HandlerId)


# Soft typing escape for callers that introspect the spec via dicts.
SPEC_METADATA: dict[str, Any] = {
    "id": SPEC_ID,
    "version": SPEC_VERSION,
    "state_count": len(fsm.states),
    "handler_count": len(ALL_HANDLER_IDS),
}
