"""Bundled worker prompt templates for skill-code-review.

This subpackage exists purely so :func:`importlib.resources.files`
can resolve the `.md` prompt files at runtime regardless of how the
package was installed (editable, wheel, sdist). The module itself
intentionally exposes no public API; consumers should call
:func:`code_review.spec._load_worker_prompt` to fetch a
prompt body by name.
"""

from __future__ import annotations

__all__: list[str] = []
