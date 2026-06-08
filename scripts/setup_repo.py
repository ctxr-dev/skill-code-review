#!/usr/bin/env python
"""Materialize a benchmark PR's repo so `git diff BASE..HEAD` == the PR diff
the competitors actually reviewed (the three-dot / merge-base diff).

Approach (see OBSERVATIONS #8): the fork's baseRefOid drifts ahead, so we
deepen the head branch by its PR-commit count and use BASE = head~n_commits
(the branch point). We sanity-check the resulting file set against
`gh pr diff --name-only`; on mismatch we deepen further, then flag it.

Writes the effective diff base back into bench-index.json as `base_diff`
(+ `n_commits`, `diff_ok`) so the driver passes the correct base.
"""
from __future__ import annotations
import json, subprocess, sys, shutil
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import paths  # noqa: E402

ROOT = paths.TMP
INDEX = ROOT / "bench-index.json"


def run(cmd, cwd=None, timeout=300):
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout)


def gh_json(fork_pr_url, fields):
    r = run(["gh", "pr", "view", fork_pr_url, "--json", fields])
    return json.loads(r.stdout) if r.returncode == 0 else {}


def gh_diff_files(fork_pr_url):
    r = run(["gh", "pr", "diff", fork_pr_url, "--name-only"], timeout=120)
    return sorted(x for x in r.stdout.splitlines() if x.strip()) if r.returncode == 0 else []


def main() -> int:
    pr_id = sys.argv[1]
    idx = json.loads(INDEX.read_text())
    e = idx[pr_id]
    fork_repo, head, fork_pr = e["fork_repo"], e["head"], e["fork_pr_url"]
    url = f"https://github.com/code-review-benchmark/{fork_repo}.git"
    dest = paths.repo_dir(pr_id)
    if dest.exists():
        shutil.rmtree(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)

    base_oid = e["base"]  # fork's drifted base tip; merge-base corrects it
    n_commits = len(gh_json(fork_pr, "commits").get("commits", [])) or 1
    authoritative = gh_diff_files(fork_pr)

    # Blobless clone carries the full commit/tree graph (no blobs) -> merge-base works.
    r = run(["git", "clone", "--filter=blob:none", "--no-checkout", url, str(dest)])
    if r.returncode != 0:
        print(json.dumps({"pr_id": pr_id, "error": "clone failed", "stderr": r.stderr[-300:]}))
        return 1
    run(["git", "fetch", "--filter=blob:none", "--no-tags", "origin", head, base_oid], cwd=dest)

    mb = run(["git", "merge-base", base_oid, head], cwd=dest)
    base = mb.stdout.strip() if mb.returncode == 0 and mb.stdout.strip() else None
    if base is None:
        # fallback: full unshallow blobless, retry merge-base
        run(["git", "fetch", "--filter=blob:none", "--unshallow", "origin", head, base_oid], cwd=dest)
        mb = run(["git", "merge-base", base_oid, head], cwd=dest)
        base = mb.stdout.strip() if mb.returncode == 0 else base_oid
    run(["git", "checkout", "--detach", head], cwd=dest)

    got = run(["git", "diff", "--name-only", f"{base}..{head}"], cwd=dest)
    got_files = sorted(x for x in got.stdout.splitlines() if x.strip())
    diff_ok = bool(authoritative) and set(got_files) == set(authoritative)

    got = run(["git", "diff", "--name-only", f"{base}..{head}"], cwd=dest)
    changed = sorted(x for x in got.stdout.splitlines() if x.strip())
    stat = run(["git", "diff", "--shortstat", f"{base}..{head}"], cwd=dest)
    du = run(["du", "-sh", str(dest)])

    # Write per-PR meta (NOT the shared index) to avoid a read-modify-write race
    # when many setup_repo processes run in parallel. merge_meta.py folds these
    # into bench-index.json single-threaded.
    meta = {"pr_id": pr_id, "base_diff": base, "n_commits": n_commits,
            "diff_ok": diff_ok, "authoritative_files": authoritative,
            "changed_files": changed}
    (dest / "_meta.json").write_text(json.dumps(meta, indent=2))

    print(json.dumps({
        "pr_id": pr_id, "repo_path": str(dest), "lang": e["lang"],
        "base_diff": base, "head": head, "n_commits": n_commits,
        "diff_ok": diff_ok, "n_changed": len(changed),
        "n_authoritative": len(authoritative),
        "changed_files": changed, "shortstat": stat.stdout.strip(),
        "disk": du.stdout.split()[0] if du.stdout else "?",
        "n_golden": e["n_golden"],
    }, indent=2))
    return 0 if diff_ok else 3


if __name__ == "__main__":
    raise SystemExit(main())
