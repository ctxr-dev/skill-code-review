# Changelog

This project's release history lives primarily as annotated git tags
(`v<MAJOR>.<MINOR>.<PATCH>`) and squash-merged release commits on
`main`. Each release commit carries the change summary in its body
and on the corresponding GitHub Release.

This file lists the user-facing changes per version, formatted per
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
following [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
For the full diff, see the linked PR and tag on GitHub.

## [Unreleased]

### Fixed

- **`gray-matter` is now a runtime dependency.** It was listed under
  `devDependencies` in v2.2.x but is imported at runtime by
  `scripts/inline-states/activate-leaves.mjs`. Standard
  `npm install --omit=dev` of the published v2.2.x tarball faulted
  the first `--continue` with `Cannot find package 'gray-matter'`.
  Closes #100, eval finding #1.
- **Skill works when installed outside its own repo.** v2.2.x
  hardcoded `REPO_ROOT = resolve(__dirname, "..")` and used it for
  both bundled-asset paths (correct: `reviewers.wiki/`,
  `node_modules/.bin/`) AND `git diff` cwd / run-dir storage
  (incorrect when the skill is installed under
  `~/.claude/skills/`). Every per-leaf dispatch prompt embedded
  `(diff unavailable: git diff exited 1: error: Could not access
  '...')` and every specialist returned `failed`/`skipped`. The
  runner now splits these into:
  - **`SKILL_ROOT`** — bundled-asset root (unchanged).
  - **`PROJECT_ROOT`** — the project being reviewed; resolved
    eagerly via the new discovery walk: `--repo-root <path>` if
    given, else the git toplevel of `process.cwd()`, else
    `SKILL_ROOT` (preserves existing in-repo test behaviour).
  Closes #100, eval finding #2.

### Added

- **New `--repo-root <path>` CLI flag.** Explicit override for the
  auto-discovered project root. Pass this when running the
  globally-installed skill against an arbitrary checkout.
- **Run-dirs now live with the project being reviewed.** Per-run
  state (`<run_dir>/manifest.json`, `<run_dir>/workers/`, etc.)
  goes under `<PROJECT_ROOT>/.skill-code-review/...`, not the
  skill's install tree. The `--storage-root` arg is supplied
  explicitly to `fsm-next` / `fsm-commit` so this works regardless
  of where the runner's `cwd` happens to land.
- **`FilteredDiffError` fault-fast.** When the runner's
  `computeFilteredDiff` cannot produce a clean diff (git non-zero
  exit, signal kill, project root misconfigured), the runner now
  throws `FilteredDiffError` and the caller in
  `handleWorkerStateBrief` converts it to a structured
  `{status: "fault"}` payload BEFORE any specialist is dispatched.
  v2.2.x silently shipped `(diff unavailable: ...)` placeholders to
  K specialists; operators only learned of the misconfig after K
  Agent dispatches returned skipped.

- **New `--- FORBIDDEN PATHS ---` section in dispatch prompts.** The
  runner now injects an explicit prohibition on `/tmp/*` writes (and
  any path outside the run-dir) into every staged dispatch prompt and
  every shim emitted by `--print-agent-shim-prompt`. Closes a
  real-world regression where dispatched sub-Agents wrote scratch
  files (`/tmp/tree-descend/build.js`,
  `/tmp/worker-out-*.json`) — the skill's SKILL.md prohibition applied
  only to the orchestrator, not to dispatched workers.
- **New exports from `scripts/run-review.mjs`.** Two string constants
  describe the FORBIDDEN PATHS contract:
  - `FORBIDDEN_PATHS_NOTICE_FULL` — long-form rationale embedded in
    dispatch prompts.
  - `FORBIDDEN_PATHS_NOTICE_SHIM` — compact one-liner used in shim
    output (kept under the documented ~200-token bound).
  Both are kept in lockstep on load-bearing tokens by a unit test.

### Changed

- **`scripts/inline-states/activate-leaves.mjs` uses
  `env.project_root`.** The runner seeds `project_root` into the
  args bag at `--start`, so the activation gate's `git diff` cwd
  matches the project being reviewed (not the skill's install
  dir). Wiki enumeration still reads from `SKILL_ROOT/reviewers.wiki/`.
- **`scripts/inline-states/write-run-directory.mjs` follows the same
  PROJECT_ROOT-anchored storage as `run-review.mjs`.** Pre-fix,
  Step 10 (`writeRunArtefacts`) computed `storage_root` relative to
  `SKILL_ROOT` while the runner's `runFsmNextStart` used a
  PROJECT_ROOT-anchored `--storage-root`, so `report.md` /
  `manifest.json` would have landed under the skill's install tree
  on a fresh project run. Now resolves through `env.args.project_root`.
- **`--repo-root` validates absolute path + git toplevel.** Reject
  relative paths and non-git directories up front so a typo'd flag
  fails at startup instead of producing an opaque downstream
  `git diff exited 128`.
- **FilteredDiffError fault-fast in record/replay modes too.**
  Centralised the staging + fault conversion in
  `stagePromptsOrFault()`; live, record, and replay modes now fail
  closed identically when `computeFilteredDiff` throws.
- **`setProjectRootForTesting(null)` clears the memoized discovery
  cache.** Pre-fix, a test that read `projectRoot()` then reset the
  override would silently keep the cached value forever; the reset
  helper now invalidates the cache too.
- **Hardened `--continue` error handling for `dispatch_specialists`.**
  Replaced the silent `try { JSON.parse(brief) } catch { brief = null }`
  swallow with a structured `fail()` that names the brief path and the
  parse error, mirroring the contract `--print-batch-envelope` already
  uses on the same brief. Replaced the silent
  `manifest?.current_state ?? null` degradation in the explicit
  `--outputs-file` branch with hard-fails on missing manifest and
  missing `current_state`. Operators no longer see misleading "outputs
  file not found" errors when the underlying cause is brief or
  manifest corruption.

## [2.2.1] - 2026-05-02

Release commit: [`797603f`](../../commit/797603f) — see PR #97 for
the underlying fix (forbid `/tmp` writes by dispatched workers; harden
`--continue` error handling).

## Older

For releases v2.2.0 and earlier, see the git tags and corresponding
release commits on `main`. Each `release: vX.Y.Z (#N)` commit links
to the PR whose body documents the change set.

[Unreleased]: https://github.com/ctxr-dev/skill-code-review/compare/v2.2.1...HEAD
[2.2.1]: https://github.com/ctxr-dev/skill-code-review/compare/v2.2.0...v2.2.1
