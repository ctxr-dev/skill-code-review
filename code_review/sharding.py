"""Deterministic content-addressed sharding for on-disk artefacts.

The skill writes many small files (run reports, manifests, cached
worker outputs) under ``<storage>/...`` trees. A single flat directory
collapses under filesystem listing pressure once the count crosses the
low thousands; a too-deep tree wastes inodes and makes ``ls`` painful.

The middle ground is a two-level shard derived from a stable sha256
prefix of a deterministic key (run uuid, worker key, leaf id):

* ``levels=(2, 5)`` — the default. First 2 hex chars index 256 buckets,
  next 5 hex chars give each bucket up to ~1M unique leaves before any
  bucket fills meaningfully. Good for run-scoped artefacts where the
  total population grows over time but per-bucket fan-out stays small.
* ``levels=(2, 2, 3)`` — three-level variant for very long-lived
  corpora (e.g. memory documents) where the total population is
  expected to reach millions and the second hop helps keep ``ls`` snappy.
* ``levels=(3, 4)`` — single-bucket-fatter variant for small, dense
  caches where 256 first-level dirs would be sparse.

The helpers are pure functions: no filesystem I/O, no time, no random.
Callers compose them with their own date/scope prefixes (see
``handlers._run_dir_path`` for the canonical example).
"""

from __future__ import annotations

from hashlib import sha256
from pathlib import Path

# sha256 produces a 64-char hex digest. Any (levels) tuple whose sum exceeds
# that is a programming error and we surface it eagerly rather than silently
# truncating.
_HEX_DIGEST_LEN = 64


def shard_segments(key: str, levels: tuple[int, ...] = (2, 5)) -> tuple[str, ...]:
    """Split ``sha256(key).hexdigest()`` into segments of the given lengths.

    >>> shard_segments("hello")  # doctest: +ELLIPSIS
    ('2c', 'f24db')

    The default ``(2, 5)`` matches the on-disk shard tree the skill has
    used since v2.5.1. Pass a different tuple to opt into a deeper or
    shallower fan-out (see module docstring).
    """
    if sum(levels) > _HEX_DIGEST_LEN:
        raise ValueError(
            f"shard_segments: sum(levels)={sum(levels)} exceeds sha256 hex "
            f"digest length ({_HEX_DIGEST_LEN}); pick smaller segments"
        )
    digest = sha256(key.encode("utf-8")).hexdigest()
    segments: list[str] = []
    cursor = 0
    for length in levels:
        segments.append(digest[cursor : cursor + length])
        cursor += length
    return tuple(segments)


def shard_path(
    root: Path,
    key: str,
    leaf_name: str,
    *,
    levels: tuple[int, ...] = (2, 5),
) -> Path:
    """Compose ``root / <shard segments> / leaf_name``.

    ``leaf_name`` is the final FILENAME (e.g. ``"manifest.json"``), not
    a directory. Callers create the parent with ``path.parent.mkdir`` —
    this helper performs no I/O.
    """
    segments = shard_segments(key, levels)
    return root.joinpath(*segments, leaf_name)
