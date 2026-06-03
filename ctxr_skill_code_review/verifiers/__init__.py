"""Verifier prompt templates for the skill-code-review FSM spec.

Each ``.md`` file in this package is a Jinja2-rendered prompt that the
verifier panel handler (see :mod:`ctxr_skill_code_review.verifier_handler`)
dispatches in parallel against a worker state's committed outputs.

The templates use ``{{ metadata.get("brief", {}) | json }}`` and
``{{ metadata.get("outputs", {}) | json }}`` so register-time smoke
validation (empty :class:`~ctxr.fsm.core.prompts.PromptContext`) succeeds
while runtime renders fill the placeholders with the worker's brief +
outputs payload.
"""
