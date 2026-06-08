"""Tests for ``code_review.sharding``.

Covers determinism, segment-length contracts, the upper-bound guard
(sum(levels) > 64), the leaf-name semantics of ``shard_path``, and a
collision spot-check against the live ``reviewers.wiki/`` leaf corpus
(so we know the (2, 5) default genuinely spreads our real leaf set
across many first-level buckets).
"""

from __future__ import annotations

from collections import Counter
from hashlib import sha256
from pathlib import Path

import pytest

from code_review.sharding import shard_path, shard_segments


def test_shard_segments_deterministic() -> None:
    """Same key, same call → same segments. Pure function."""
    a = shard_segments("any-key-will-do")
    b = shard_segments("any-key-will-do")
    assert a == b


def test_shard_segments_default_levels() -> None:
    """Default returns two segments of length 2 and 5."""
    out = shard_segments("hello")
    assert len(out) == 2
    assert len(out[0]) == 2
    assert len(out[1]) == 5
    # Sanity-check the actual hex against a hand-computed digest so a
    # future refactor that swaps the hash function can't drift silently.
    expected = sha256(b"hello").hexdigest()
    assert out == (expected[:2], expected[2:7])


def test_shard_segments_custom_levels() -> None:
    """A (3, 4, 5) tuple splits into three segments at the correct offsets."""
    out = shard_segments("hello", (3, 4, 5))
    digest = sha256(b"hello").hexdigest()
    assert out == (digest[:3], digest[3:7], digest[7:12])
    assert [len(s) for s in out] == [3, 4, 5]


def test_shard_segments_invalid_levels() -> None:
    """sum(levels) > 64 is a programming error and raises eagerly."""
    with pytest.raises(ValueError, match="exceeds sha256"):
        shard_segments("x", (32, 33))


def test_shard_path_combines() -> None:
    """``shard_path`` appends the leaf NAME (a file) to the segment dirs."""
    digest = sha256(b"k").hexdigest()
    p = shard_path(Path("/r"), "k", "name.json")
    assert p == Path("/r") / digest[:2] / digest[2:7] / "name.json"
    # The final component is a file name, not a directory marker.
    assert p.name == "name.json"


def test_shard_path_respects_custom_levels() -> None:
    """``levels`` is a keyword-only override; the helper honours it."""
    digest = sha256(b"k").hexdigest()
    p = shard_path(Path("/r"), "k", "leaf.bin", levels=(3, 4))
    assert p == Path("/r") / digest[:3] / digest[3:7] / "leaf.bin"


def test_no_collisions_in_wiki_corpus() -> None:
    """Spread test: every leaf id under reviewers.wiki/ hashes to a unique
    (2, 5) shard tuple, and no first-level bucket holds more than a small
    handful (smoke-test that 256 buckets aren't pathologically uneven for
    our real corpus).
    """
    wiki_root = Path(__file__).resolve().parent.parent / "reviewers.wiki"
    if not wiki_root.is_dir():
        pytest.skip(f"reviewers.wiki/ not present at {wiki_root}")
    leaf_ids = [
        child.name
        for child in sorted(wiki_root.iterdir())
        if child.is_dir() and (child / "index.md").is_file()
    ]
    assert leaf_ids, "expected at least one leaf reviewer under reviewers.wiki/"
    shards = [shard_segments(leaf_id) for leaf_id in leaf_ids]
    # Every leaf maps to a unique shard tuple (no two leaves share both
    # segments — collision would mean two leaves write to the same dir).
    assert len(set(shards)) == len(shards)
    # No first-level bucket should be wildly fuller than the rest; with
    # 256 buckets and ~100 leaves we expect at most ~4 per bucket in the
    # average tail. Use 6 as a loose ceiling — a regression that drove
    # everything into one bucket would trip it.
    first_level_counts = Counter(s[0] for s in shards)
    worst_bucket = max(first_level_counts.values())
    assert worst_bucket <= 6, (
        f"first-level bucket fan-out is unexpectedly uneven: "
        f"worst bucket holds {worst_bucket} leaves "
        f"(top 5: {first_level_counts.most_common(5)})"
    )
