---
id: author-self-review-hygiene
type: primary
depth_role: leaf
focus: Catch hygiene issues the author should have resolved before requesting review -- debug artifacts, untracked TODOs, suppressed lints, and leftover scaffolding
parents:
  - index.md
covers:
  - "TODO/FIXME/HACK comments without a ticket reference or justification"
  - Lint-suppression annotations without an adjacent justification comment
  - Skipped or disabled tests without a documented reason
  - "Dead or unused imports that the author's editor should have flagged"
  - Commented-out code blocks of 3+ lines left in the diff
  - "Debug statements (console.log, print, debugger, pp, var_dump) left in production code"
  - Merge conflict markers still present in the file
  - "Placeholder values (CHANGEME, xxx, fixme, TODO) in strings, configs, or variable names"
tags:
  - hygiene
  - self-review
  - pre-review-gate
  - debug
  - todo
  - lint-suppression
  - readability
  - clean-code
activation:
  file_globs:
    - "*"
  keyword_matches:
    - TODO
    - FIXME
    - HACK
    - XXX
    - noqa
    - nolint
    - eslint-disable
    - ts-ignore
    - Suppress
    - allow
    - skip
    - debugger
    - console.log
    - print
    - CHANGEME
  structural_signals:
    - comment_block
    - line_comment
    - import_statement
    - test_annotation
source:
  origin: file
  path: author-self-review-hygiene.md
  hash: "sha256:35242a1b3feb51906d9dd9e5a1c46cb2bb99442a9d5de54a347ca05c4cc16b18"
---
# Author Self-Review Hygiene

## When This Activates

Activates on every diff as a lightweight pre-review gate. This reviewer catches issues that the author should have resolved before requesting review. These are not design debates -- they are mechanical hygiene checks. A diff that fails this gate wastes reviewer time on trivia that automated checks or a quick self-review pass would catch. The goal is to return the diff to the author before any substantive review begins.

## Audit Surface

- [ ] TODO, FIXME, HACK, or XXX comment lacks a ticket reference (e.g., JIRA-1234, #456, GH-789)
- [ ] Lint-suppression comment (@Suppress, # noqa, @ts-ignore, eslint-disable, #[allow(...)], // nolint) has no adjacent justification explaining why the rule is suppressed
- [ ] Test is skipped or disabled (.skip, @Disabled, @pytest.mark.skip, xit, xdescribe, @Ignore, #[ignore]) without a reason string or linked ticket
- [ ] Import or require statement brings in a symbol not referenced anywhere in the file
- [ ] Commented-out code block of 3+ lines exists in the diff
- [ ] Debug/logging statement (console.log, console.debug, print, puts, pp, debugger, var_dump, System.out.println, println!, dbg!) appears in non-test production code
- [ ] Merge conflict marker (<<<<<<, ======, >>>>>>) is present in a file
- [ ] Placeholder string literal contains TODO, CHANGEME, xxx, fixme, PLACEHOLDER, or TBD in a non-comment context
- [ ] Hardcoded credential or secret placeholder (password, token, api_key) set to a dummy value
- [ ] File contains formatting-only hunks mixed with logic changes

## Detailed Checks

### Debug Artifacts and Merge Conflict Markers
<!-- activation: keywords=["console.log", "console.debug", "debugger", "print", "puts", "pp", "var_dump", "System.out.println", "println!", "dbg!", "<<<<<<", "======", ">>>>>>"] -->

- [ ] Flag `console.log`, `console.debug`, `console.warn`, `console.error` in non-test JS/TS files -- use a structured logger instead
- [ ] Flag bare `print()` or `puts` in Python/Ruby production code -- distinguish from intentional CLI output by checking if the file is a library module vs. a script entrypoint
- [ ] Flag `debugger` statements in JS/TS -- these freeze execution in browsers and crash Node without a debugger attached
- [ ] Flag `var_dump`, `dd()`, `dump()` in PHP -- these produce unstructured output in production responses
- [ ] Flag `System.out.println` or `System.err.println` in Java when a logging framework (SLF4J, Log4j) is already imported
- [ ] Flag `dbg!` or `println!` in Rust production code when the `log` or `tracing` crate is in dependencies
- [ ] Flag any line matching `<<<<<<<`, `=======`, or `>>>>>>>` -- merge conflict markers are never valid code

### TODO/FIXME and Lint Suppressions Without Justification
<!-- activation: keywords=["TODO", "FIXME", "HACK", "XXX", "noqa", "nolint", "eslint-disable", "ts-ignore", "ts-expect-error", "@Suppress", "#[allow", "NOLINT"] -->

- [ ] Flag TODO/FIXME/HACK/XXX comments that lack a ticket reference pattern (alphanumeric project key + hyphen + digits, or hash + digits) -- untracked TODOs accumulate forever
- [ ] Flag `# noqa` (Python) without a specific rule code -- blanket suppression hides multiple violations behind a single annotation
- [ ] Flag `// eslint-disable-next-line` or `/* eslint-disable */` without a rule name -- suppressing all rules is never justified for a single line
- [ ] Flag `@ts-ignore` without an adjacent comment explaining why `@ts-expect-error` (which is safer) was not used instead
- [ ] Flag `#[allow(...)]` in Rust without a `// REASON:` or equivalent comment on the preceding or same line
- [ ] Flag `// nolint` in Go without a linter name -- `// nolint:errcheck // <reason>` is the expected format
- [ ] Flag `@Suppress` or `@SuppressWarnings` in Java/Kotlin without an adjacent comment explaining the suppression

### Skipped Tests and Dead Imports
<!-- activation: keywords=["skip", ".skip", "xit", "xdescribe", "@Disabled", "@Ignore", "@pytest.mark.skip", "pending", "#[ignore", "import ", "require", "from "] -->

- [ ] Flag `.skip()`, `xit()`, `xdescribe()`, `test.skip()` in JS/TS test files without a reason string or TODO ticket
- [ ] Flag `@Disabled` (JUnit 5) or `@Ignore` (JUnit 4) without a reason parameter -- `@Disabled("JIRA-1234: flaky on CI")` is acceptable
- [ ] Flag `@pytest.mark.skip` or `@pytest.mark.skipIf` without a `reason=` argument
- [ ] Flag `#[ignore]` in Rust tests without an adjacent reason comment
- [ ] Flag imports that introduce a symbol not used anywhere in the file -- most editors and linters catch these; their presence suggests the author did not run linting

### Placeholder Values and Credential Stubs
<!-- activation: keywords=["CHANGEME", "changeme", "xxx", "PLACEHOLDER", "TBD", "fixme", "password", "token", "api_key", "secret", "12345"] -->

- [ ] Flag string literals containing "CHANGEME", "PLACEHOLDER", "TBD", "xxx", or "fixme" in non-comment, non-test contexts -- these are scaffolding that should be replaced before merge
- [ ] Flag variables named with placeholder patterns (e.g., `temp`, `foo`, `bar`, `test123`) in production code -- they signal incomplete implementation
- [ ] Flag hardcoded values for fields named `password`, `token`, `secret`, `api_key`, or `credentials` set to obvious dummies like "changeme", "12345", "password" -- even if intended as defaults, they are a security risk
- [ ] Flag URLs pointing to `localhost`, `example.com`, or `127.0.0.1` in production configuration files -- these are development placeholders

## Common False Positives

- **Intentional print in CLI tools**: Scripts and CLI entrypoints legitimately use `print`/`puts`/`console.log` for user-facing output. Check whether the file is a library module (flag) or a script/CLI handler (allow).
- **Structured logging that resembles debug prints**: Calls to a logging framework (`logger.debug`, `log.info`) are not debug artifacts even if they resemble `print`. Only flag raw print functions.
- **Skipped tests with reason strings**: `@Disabled("JIRA-1234")` or `.skip("waiting on upstream fix")` include justification and should not be flagged.
- **Lint suppressions with adjacent justification**: `// nolint:errcheck // file close errors are non-fatal here` is properly justified. Only flag bare suppressions.
- **TODOs in draft PRs**: TODOs in work-in-progress branches that the author intends to resolve before final review are acceptable. Flag only in PRs marked ready for review.
- **Test fixtures using placeholder values**: Test code may intentionally use "changeme" or dummy credentials as fixture data. Only flag placeholders in production code paths.

## Severity Guidance

| Finding | Severity |
|---|---|
| Merge conflict marker present in a file | Critical |
| Hardcoded credential placeholder in production config | Critical |
| `debugger` statement left in JS/TS production code | Important |
| TODO/FIXME without ticket reference in code marked ready for review | Important |
| Lint suppression without any justification comment | Important |
| Skipped test without reason string or ticket | Important |
| Commented-out code block of 3+ lines | Minor |
| Unused import statement | Minor |
| Placeholder string in non-critical context | Minor |
| Formatting-only changes mixed with logic changes | Minor |

## See Also

- `smell-dead-code` -- unused imports and commented-out blocks are forms of dead code this reviewer catches early
- `smell-comments-as-deodorant` -- unjustified TODOs and bare suppressions are deodorant comments masking deeper issues
- `principle-naming-and-intent` -- placeholder variable names violate naming intent
- `principle-fail-fast` -- suppressed lint rules and skipped tests defer failures that should be addressed immediately

## Authoritative References

- [Google Engineering Practices: The CL Author's Guide](https://google.github.io/eng-practices/review/developer/)
- [Conventional Comments: Annotating Code Review](https://conventionalcomments.org/)
- [Robert C. Martin, "Clean Code" (2008), Chapter 4: Comments](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)
