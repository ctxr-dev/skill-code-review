# Changelog

This project's release history lives primarily as annotated git tags
(`v<MAJOR>.<MINOR>.<PATCH>`) and squash-merged release commits on
`main`. Each release commit carries the change summary in its body
and on the corresponding GitHub Release.

This file lists the user-facing changes per version, formatted per
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
following [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
For the full diff, see the linked PR and tag on GitHub.

## Versioning Note

**v2.3.0 contained breaking changes that were shipped under a minor
version bump.** The `BREAKING:` markers in the `[2.3.0]` section
below were added retroactively in v2.4.0 once a code review surfaced
the semver violation. The two breaking changes are:

1. Run-dir storage location moved from SKILL_ROOT to PROJECT_ROOT
   (consumers using globally-installed skill against arbitrary
   projects MUST update tooling that expected the old location;
   see the Migration Guide under [2.3.0] below).
2. `computeFilteredDiff` now throws `FilteredDiffError` instead of
   returning a `(diff unavailable: ...)` placeholder string for git
   failures (consumers that pattern-matched the placeholder must
   now handle the structured fault payload).

Going forward, the project commits to a stricter semver discipline:
any change that alters per-run state location, throws-vs-returns
contracts on exported functions, or removes/renames public CLI
flags will rev the MAJOR version. Mechanical refactors, additive
flags, and bug fixes will rev MINOR / PATCH respectively. v2.4.0
contains no further breaking changes; consumers on v2.3.x can
upgrade to v2.4.x without any code changes.

## [Unreleased]

## [2.4.0] - 2026-05-03

### Added

- **`scripts/lib/project-root.mjs`** — shared helpers for the
  SKILL_ROOT vs PROJECT_ROOT split and `.fsmrc.json` validation,
  used by both `run-review.mjs` and the inline-state handlers.
  Centralises `FSM_NAME`, `MAX_GIT_TOPLEVEL_WALK_DEPTH`,
  `validateStorageRootEntry`, `coerceAbsoluteProjectRoot`,
  `gitToplevelFromCwd` (with optional `_deps.warn` and
  `_deps.existsSync` injection seams),
  and `readFsmRcDirect` (with optional `_deps.readFile` injection
  seam) so the contract has one update site and each branch can be
  unit-tested deterministically.
- **`scripts/run-review.mjs` exports `projectRoot()`** so unit
  tests can verify the `setProjectRootForTesting` override is
  observably honoured (instead of relying on assertion-free
  round-trip tests).
- **`scripts/assert-fresh-run.mjs --repo-root <path>`** — accept
  the same flag as the runner so the validator can find the
  manifest under PROJECT_ROOT (was hardcoded to SKILL_ROOT
  pre-fix, leaving every project review unverifiable).
- **`engines` field in `package.json`** (`"node": ">=20"`) matches
  the `tests:` `node --test` runtime requirement, now that
  `gray-matter` is a runtime dependency.
- **`tests/unit/project-root-lib.test.js`** — 30 direct unit tests
  for the new shared module's public API (every error branch in
  `validateStorageRootEntry`, both terminator paths in
  `gitToplevelFromCwd`, the parse / read-fail / default-reader
  branches in `readFsmRcDirect`, and parseArgs + helpers in
  `assert-fresh-run.mjs`).

### Changed

- **`enrichBriefWithPromptBody` no longer swallows errors silently.**
  The bare `} catch { return brief; }` now binds the error and
  emits a `WARN:` line to stderr before falling back. Best-effort
  enrichment still succeeds — the brief flows untouched if the
  prompt body can't be loaded — but the failure is now visible.
- **`discoverProjectRoot` warns on SKILL_ROOT fallback.** Pre-fix,
  a misconfigured run with no `--repo-root` and a non-git cwd
  silently used the skill's install dir as the project root,
  reproducing the #100 failure mode. Now emits a `WARN:` line to
  stderr.
- **`gitToplevelFromCwd` warns on the depth-cap exit.** The 64-
  parent-walk cap is named (`MAX_GIT_TOPLEVEL_WALK_DEPTH`) and
  hitting it (only possible under pathological mount points or
  symlink cycles) now logs to stderr instead of silently returning
  null. The cap and warn callback are both injectable for testing.
- **`runTrimValidationGate`'s `_deps.repoRoot` renamed to
  `_deps.skillRoot`.** Aligns the local vocabulary with the
  `SKILL_ROOT` rename the rest of the runner adopted in v2.3.0.
  The deprecated `repoRoot` alias was removed.
- **`gray-matter` listed under both `Fixed` and `Changed`.** The
  promotion to `dependencies` in v2.3.0 was a bug fix AND a
  runtime-footprint shift; downstream dependency-growth audits
  benefit from seeing it under `Changed` too.
- **DRY: shared helpers extracted.** `validateStorageRootEntry`,
  `coerceAbsoluteProjectRoot`, `readFsmRcDirect`, `FSM_NAME`,
  `MAX_GIT_TOPLEVEL_WALK_DEPTH` — previously lived inline at three
  sites with subtly drifting checks. Centralised in
  `scripts/lib/project-root.mjs`.

### Fixed

- **`scripts/assert-fresh-run.mjs` works against PROJECT_ROOT-
  anchored storage.** Pre-fix it hardcoded `REPO_ROOT = SKILL_ROOT`
  (same bug class PR #101 fixed in `run-review.mjs`); the validator
  failed to locate manifests for every real project review under
  v2.3.x.
- **`scripts/assert-fresh-run.mjs` rejects bare and next-flag-
  consumed `--repo-root`.** Pre-fix `argv[++i]` silently consumed
  `undefined` or the next flag (`--repo-root --base abc` read
  `--base` as the value), which then bypassed the existing
  validator. Now hard-fails at parse time with a clear message.
- **`resolveStorageRoot`'s try/catch defends against future
  `fail()` returning.** Pre-fix the success path computed
  `resolve(projectRoot(), undefined)` if `fail()` ever returned
  (an opaque downstream TypeError); now the try-block returns
  directly, foreclosing the foot-gun.
- **Five `if (observedError)` conditional-assertion patterns** in
  `tests/unit/project-root-discovery.test.js` that let the tests
  pass vacuously when no exception was thrown. Replaced with
  positive filesystem-state assertions or moved to direct unit
  tests of the underlying pure helpers.
- **Two zero-assertion tests** in the same file (the
  `setProjectRootForTesting` round-trip and cache-clearing tests)
  that the comments themselves admitted weren't testing anything.
  Now assert behaviourally via the newly-exported `projectRoot()`.
- **Test-file constant `REPO_ROOT` renamed to `SKILL_ROOT`** to
  match the production rename.
- **Magic SHA literals extracted** to named constants
  (`UNREACHABLE_BASE_SHA`, `ALT_BASE_SHA`, etc.).
- **`makeFreshGitRepo` checks `git init` exit status.** A silent
  failure (e.g. git missing in CI) previously masqueraded as a
  runner bug; now throws a self-describing error.
- **Brittle `git diff exited 1` assertion in the FilteredDiffError
  fault-fast test tightened** to assert only on the runner's own
  contract (FilteredDiffError class name + bound message +
  `--repo-root` remediation hint), dropping the upstream-git
  wording dependency.
- **Self-contained the `args.project_root` test** (formerly coupled
  to the host repo's VCS layout): now spawns a fresh `git init`'d
  tmpdir.
- **`writeRunArtefacts` brittle storage-path tests deleted.** The
  same contract is verified at the helper level by
  `tests/unit/project-root-lib.test.js`'s
  `coerceAbsoluteProjectRoot` and `validateStorageRootEntry` tests
  (positive assertions, no filesystem coupling).
- **Async test arrow with no `await` body** changed to a sync
  arrow.
- **Dead `warned` variable** in `gitToplevelFromCwd: returns null
  ...` test deleted.
- **Hardcoded date components** in stub-manifest path replaced by
  helper-level testing (no date drift possible).
- **Per-input split** for `setProjectRootForTesting` and parseArgs
  bare-flag tests so each input case reports independently.

## [2.3.1] - 2026-05-02

Release commit: [`babab9e`](../../commit/babab9e).

### Changed

- (No code changes; release-only commit bumping `package.json` /
  `package-lock.json` from 2.3.0.)

## [2.3.0] - 2026-05-02

Release commit: [`a49b5a7`](../../commit/a49b5a7) — see PR #101.

### Migration Guide (2.2.x → 2.3.x / 2.4.x)

**Run-dir storage moved.** Pre-2.3.0, when the skill was installed
under `~/.claude/skills/`, per-run state landed at
`~/.claude/skills/ctxr-skill-code-review/.skill-code-review/<shard>/<run-id>/`
regardless of which project the runner was reviewing. From 2.3.0
onward, run-dirs land at `<PROJECT_ROOT>/.skill-code-review/...`
where `<PROJECT_ROOT>` resolves via:

1. `--repo-root <abs-path>` if passed on the runner CLI;
2. else the git toplevel walked up from `process.cwd()`;
3. else SKILL_ROOT (in-skill test path; emits a `WARN:` to stderr).

**Action required for 2.2.x → 2.3.x+ upgrades:**

- If your CI / tooling globs the skill's install dir for run
  artefacts, switch to globbing `<PROJECT>/.skill-code-review/...`
  instead. Add `.skill-code-review` to the project's `.gitignore`
  if you don't want the run-dirs committed.
- If you invoke the runner from a directory outside the project
  being reviewed, pass `--repo-root /path/to/project` explicitly.
- The `assert-fresh-run.mjs` validator now also accepts
  `--repo-root` for the same reason.

**`computeFilteredDiff` throws on git failures.** Pre-2.3.0, git
non-zero exit / signal kill / spawn failure all produced the
string `"(diff unavailable: ...)"` baked into per-leaf prompts.
From 2.3.0 onward, those cases throw `FilteredDiffError` and the
runner's staging seam converts it to a structured
`{status: "fault", run_id, fault: {...}}` payload BEFORE any
specialist is dispatched.

**Action required:** consumers that programmatically inspected
the placeholder string in dispatch prompts must now handle the
structured fault payload from the runner instead. The two cases
that still return placeholders by design are missing-SHA and
ENOBUFS (filtered diff exceeds 32MB cap).

### Added

- **New `--repo-root <path>` CLI flag** on `scripts/run-review.mjs`.
  Explicit override for the auto-discovered project root. Pass
  this when running the globally-installed skill against an
  arbitrary checkout.
- **Run-dirs now live with the project being reviewed.** Per-run
  state (`<run_dir>/manifest.json`, `<run_dir>/workers/`, etc.)
  lands under `<PROJECT_ROOT>/.skill-code-review/...`, not the
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
- **New `--- FORBIDDEN PATHS ---` section in dispatch prompts.**
  The runner injects an explicit prohibition on `/tmp/*` writes
  (and any path outside the run-dir) into every staged dispatch
  prompt and every shim emitted by `--print-agent-shim-prompt`.
  Closes a real-world regression where dispatched sub-Agents
  wrote scratch files (`/tmp/tree-descend/build.js`,
  `/tmp/worker-out-*.json`).
- **New exports from `scripts/run-review.mjs`.** Two string
  constants describe the FORBIDDEN PATHS contract:
  - `FORBIDDEN_PATHS_NOTICE_FULL` — long-form rationale embedded
    in dispatch prompts.
  - `FORBIDDEN_PATHS_NOTICE_SHIM` — compact one-liner used in
    shim output (kept under the documented ~200-token bound).

### Changed

- **BREAKING: run-dir storage location moved from SKILL_ROOT to
  PROJECT_ROOT.** Per-run state used to land under
  `~/.claude/skills/.skill-code-review/...` when the skill was
  installed globally; it now lands under
  `<project>/.skill-code-review/...`. Existing tooling that
  expected the old location must be updated. See the `--repo-root`
  flag for the operator-facing knob.
- **BREAKING: `computeFilteredDiff` now throws on git failures.**
  v2.2.x silently returned a `(diff unavailable: ...)` placeholder
  string for every git failure mode; v2.3.0 throws `FilteredDiffError`
  on non-zero exit / signal kill / spawn failure (only the missing-
  SHA and ENOBUFS branches still return a placeholder by design).
  The runner's staging seam catches this and emits a structured
  `{status: "fault"}` before dispatching K specialists with broken
  prompts. Downstream consumers that treated the placeholder as a
  soft signal must now handle the fault payload.
- **`scripts/inline-states/activate-leaves.mjs` uses
  `env.args.project_root`.** The runner seeds `project_root` into
  the args bag at `--start`. The activation gate's `git diff` cwd
  honours **only** that runner-controlled channel (top-level
  `env.project_root` is rejected — it can be set by upstream
  worker outputs and would be a path-redirection vector).
- **Hardened `--continue` error handling for `dispatch_specialists`.**
  Replaced the silent
  `try { JSON.parse(brief) } catch { brief = null }` swallow with a
  structured `fail()` that names the brief path and the parse error.
  Replaced the silent `manifest?.current_state ?? null` degradation
  in the explicit `--outputs-file` branch with hard-fails on missing
  manifest and missing `current_state`.

### Fixed

- **`gray-matter` is now a runtime dependency.** Listed under
  `devDependencies` in v2.2.x but imported at runtime by
  `scripts/inline-states/activate-leaves.mjs`. Standard
  `npm install --omit=dev` of the v2.2.x tarball faulted the first
  `--continue` with `Cannot find package 'gray-matter'`.
- **Skill works when installed outside its own repo.** v2.2.x
  hardcoded `REPO_ROOT = resolve(__dirname, "..")` and used it for
  both bundled-asset paths AND `git diff` cwd / run-dir storage.
  Split into `SKILL_ROOT` (bundled assets, unchanged) and
  `PROJECT_ROOT` (project being reviewed; resolved via
  `--repo-root` then git toplevel of `process.cwd()` then
  SKILL_ROOT fallback).

## [2.2.2] - 2026-05-02

Release commit: [`964d000`](../../commit/964d000) — automated
release-only commit (bumped `package.json` / `package-lock.json`
from 2.2.1; no source changes).

## [2.2.1] - 2026-05-02

Release commit: [`797603f`](../../commit/797603f) — see PR #97.

### Fixed

- Forbid `/tmp` writes by dispatched workers (real-world regression
  observed pre-fix: `/tmp/tree-descend/build.js`, etc.).
- Hardened `--continue` error handling.

## Older

For releases v2.2.0 and earlier, see the git tags and corresponding
release commits on `main`. Each `release: vX.Y.Z (#N)` commit links
to the PR whose body documents the change set.

[Unreleased]: https://github.com/ctxr-dev/skill-code-review/compare/v2.4.0...HEAD
[2.4.0]: https://github.com/ctxr-dev/skill-code-review/compare/v2.3.1...v2.4.0
[2.3.1]: https://github.com/ctxr-dev/skill-code-review/compare/v2.3.0...v2.3.1
[2.3.0]: https://github.com/ctxr-dev/skill-code-review/compare/v2.2.2...v2.3.0
[2.2.2]: https://github.com/ctxr-dev/skill-code-review/compare/v2.2.1...v2.2.2
[2.2.1]: https://github.com/ctxr-dev/skill-code-review/compare/v2.2.0...v2.2.1
