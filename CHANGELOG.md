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

### Changed

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

### Added

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
