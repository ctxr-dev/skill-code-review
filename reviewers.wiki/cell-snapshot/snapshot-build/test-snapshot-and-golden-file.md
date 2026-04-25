---
id: test-snapshot-and-golden-file
type: primary
depth_role: leaf
focus: Detect oversized snapshots, unreviewed snapshot updates, non-deterministic snapshot content, and golden file management issues
parents:
  - index.md
covers:
  - Snapshot files too large to meaningfully review in a diff
  - Snapshot updated via --update-snapshot without reviewing the change
  - "Snapshot of non-deterministic output (timestamps, UUIDs, random values, memory addresses)"
  - Golden files not version-controlled or stored outside the repository
  - Snapshot testing used as a substitute for behavioral assertions
  - "Snapshot format includes irrelevant details (whitespace, comments, ordering) causing noisy diffs"
  - No review process for snapshot updates in PRs
  - Snapshot of generated or compiled output that changes on every build
  - Too many snapshot files making the test suite slow and diffs unreadable
  - Snapshot serializer not configured for deterministic output
tags:
  - snapshot-testing
  - golden-file
  - jest-snapshot
  - inline-snapshot
  - approval-testing
  - determinism
activation:
  file_globs:
    - "**/*.snap"
    - "**/*.snap.shot"
    - "**/__snapshots__/**"
    - "**/golden/**"
    - "**/testdata/**"
    - "**/*.golden"
    - "**/*.approved.*"
    - "**/*.expected.*"
  keyword_matches:
    - toMatchSnapshot
    - toMatchInlineSnapshot
    - matchSnapshot
    - snapshot
    - golden
    - approval
    - approved
    - expected
    - baseline
    - updateSnapshot
    - "--update-snapshot"
    - "-u"
  structural_signals:
    - snapshot_assertion
    - golden_file_comparison
    - approval_test
source:
  origin: file
  path: test-snapshot-and-golden-file.md
  hash: "sha256:108c9201fa3de46bd5478d24e471da2a87fb2db70978b56d6dda866a81af21d8"
---
# Snapshot and Golden File Testing

## When This Activates

Activates when the diff adds or updates snapshot files (.snap, .golden, .approved), modifies snapshot test assertions, or changes production code that affects existing snapshots. Snapshot tests are powerful for detecting unintended changes in complex output, but they degrade quickly without discipline: oversized snapshots become unreadable, non-deterministic content causes flakiness, and rubber-stamped updates defeat the purpose of the test.

## Audit Surface

- [ ] Snapshot file >500 lines committed in the diff
- [ ] Diff updates a .snap, .snap.shot, or golden file with no corresponding test logic change
- [ ] Snapshot contains timestamps, UUIDs, random values, or build-specific paths
- [ ] toMatchSnapshot() used where toMatchInlineSnapshot() or specific assertions would be clearer
- [ ] Golden file stored outside the test directory or not tracked in version control
- [ ] Snapshot update commit message is 'update snapshots' with no explanation of what changed
- [ ] Snapshot test for a UI component includes non-visible attributes (data attributes, event handlers)
- [ ] Snapshot includes the entire object graph when only a subset is relevant
- [ ] Non-deterministic map/set serialization producing different snapshot content across runs
- [ ] Golden file for a generated artifact (compiled output, build manifest) that changes on every build
- [ ] Test file uses toMatchSnapshot() for >10 snapshots in a single file
- [ ] Snapshot of error messages or log output that varies across environments

## Detailed Checks

### Snapshot Size and Scope
<!-- activation: keywords=["snapshot", "toMatchSnapshot", "matchSnapshot", "snap", "golden", "approval", "baseline"] -->

- [ ] **Oversized snapshot**: snapshot file is >500 lines or >50KB -- large snapshots are never actually reviewed; break into smaller, focused snapshots or switch to targeted assertions
- [ ] **Entire object graph captured**: snapshot includes deeply nested objects, database IDs, internal metadata, and irrelevant fields -- use a custom serializer or snapshot only the relevant subset
- [ ] **Too many snapshots per file**: a single test file has >10 `toMatchSnapshot()` calls, making it hard to know which snapshot failed and what it was verifying -- consolidate or use inline snapshots
- [ ] **Snapshot as substitute for assertion**: test snapshots the entire return value instead of asserting on the specific fields that matter -- if only 3 fields are important, assert on those 3 fields
- [ ] **Redundant snapshots**: multiple tests snapshot the same or near-identical output with trivial variations -- extract the common structure and test variations with specific assertions

### Non-Deterministic Snapshot Content
<!-- activation: keywords=["timestamp", "date", "time", "uuid", "random", "hash", "address", "port", "pid", "path", "build", "version"] -->

- [ ] **Timestamps in snapshot**: snapshot contains `2026-04-16T10:30:00Z` or similar timestamps that change on every run -- mock the clock or use a snapshot serializer that replaces timestamps with placeholders
- [ ] **UUIDs or random IDs**: snapshot includes generated UUIDs or random identifiers -- replace with deterministic IDs in test setup or configure the serializer to mask them
- [ ] **File paths or temp directories**: snapshot contains absolute file paths or temp directory names that vary across machines -- normalize paths in the serializer
- [ ] **Build-specific values**: snapshot includes build numbers, git SHAs, or version strings that change on every commit -- exclude or mask these values
- [ ] **Map/set ordering**: snapshot of a HashMap, dictionary, or set depends on iteration order -- sort keys before serialization or use an ordered collection for test output

### Snapshot Update Discipline
<!-- activation: keywords=["update", "-u", "--update-snapshot", "updateSnapshot", "accept", "approve", "rewrite", "regenerate"] -->

- [ ] **Bulk update without review**: commit updates many snapshot files with a message like "update snapshots" and no explanation of what changed or why -- each snapshot update should be reviewed as carefully as a code change
- [ ] **Update triggered by refactoring**: snapshot changed because of an internal refactoring that should not affect output -- investigate whether the output change is intentional or a regression
- [ ] **Stale snapshot**: test was deleted or renamed but the snapshot file remains -- orphaned snapshots clutter the repository and confuse future reviewers
- [ ] **No CI check for outdated snapshots**: CI does not fail when snapshots are out of date -- add `--ci` flag (Jest) or equivalent to fail the build when snapshots need updating

### Golden File Management
<!-- activation: keywords=["golden", "expected", "approved", "baseline", "reference", "testdata", "fixture"] -->

- [ ] **Golden file not in version control**: golden file is stored in a temp directory or .gitignored -- golden files must be versioned to detect changes
- [ ] **Binary golden file without diff tool**: binary golden file (image, PDF, protobuf) updated without a human-reviewable diff mechanism -- use a tool that produces visual diffs or text summaries
- [ ] **Golden file for volatile output**: golden file captures output of a generator, compiler, or build tool that changes with every version -- pin the tool version or exclude volatile sections
- [ ] **No regeneration script**: golden files must be updated manually by copying output -- provide a script or make target that regenerates golden files from the current code

## Common False Positives

- **Intentional output change**: when the production code intentionally changes its output (new field, formatting change), the snapshot update is expected and correct. The reviewer should verify the change is intentional, not flag the update itself.
- **Inline snapshots**: `toMatchInlineSnapshot()` keeps the expected value in the test file, making it self-reviewing. These are generally healthier than external snapshot files.
- **Approval testing workflow**: some teams use approval testing (ApprovalTests, Verify) with an explicit approval step. The approval replaces the PR review for the snapshot.
- **Compiler output golden files**: compiler or code generator projects legitimately use golden files for their output. Flag only when the golden file is volatile or unreviewed.

## Severity Guidance

| Finding | Severity |
|---|---|
| Snapshot contains non-deterministic content (timestamps, UUIDs) causing flaky tests | Important |
| Bulk snapshot update with no review or explanation | Important |
| Snapshot file >500 lines with no evidence of review | Important |
| Snapshot used as substitute for specific behavioral assertions on critical logic | Important |
| Orphaned snapshot file for deleted or renamed test | Minor |
| Golden file not in version control | Minor |
| Too many snapshots (>10) in a single test file | Minor |
| Snapshot includes irrelevant fields (internal metadata, data attributes) | Minor |

## See Also

- `test-unit-discipline` -- snapshot tests should still follow AAA structure; the snapshot is the assertion phase
- `antipattern-flaky-non-deterministic-tests` -- non-deterministic snapshot content is a direct cause of flakiness
- `test-visual-regression` -- visual snapshots (Percy, Chromatic) are a specialized form of snapshot testing for UI
- `principle-dry-kiss-yagni` -- oversized snapshots that capture everything violate KISS

## Authoritative References

- [Jest Snapshot Testing -- best practices and when to use](https://jestjs.io/docs/snapshot-testing)
- [Effective Snapshot Testing (Kent C. Dodds, 2018)](https://kentcdodds.com/blog/effective-snapshot-testing)
- [ApprovalTests -- approval testing across languages](https://approvaltests.com/)
- [Golden File Testing in Go -- testdata/ convention](https://pkg.go.dev/testing#hdr-Testdata)
- [Justin Searls, "Don't Make Everything a Snapshot Test" (2017)](https://blog.testdouble.com/)
