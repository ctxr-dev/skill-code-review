---
id: tool-phpstan-psalm-phan
type: primary
depth_role: leaf
focus: "Detect misconfigured or under-utilized PHP static analysis -- unjustified @phpstan-ignore annotations, growing baselines without review, missing strict mode progression, and unresolved mixed types"
parents:
  - index.md
covers:
  - "@phpstan-ignore or @phpstan-ignore-next-line without justification"
  - "@psalm-suppress without justification"
  - Baseline file growing without periodic review or reduction plan
  - "Missing strict mode progression (stuck at low analysis level)"
  - mixed types leaking into public API signatures
  - Missing return type declarations on public methods
  - "PHPStan/Psalm level set below 5 for a mature project"
  - Custom PHPStan rules or extensions without tests
  - Conflicting PHPStan and Psalm configurations
  - "Missing PHPStan extensions for frameworks (Larastan, phpstan-doctrine)"
  - strict_types declaration and type system usage
  - PSR-4 autoloading and PSR-12 code style compliance
  - Composer dependency hygiene and lock file management
  - "PHPStan/Psalm baseline discipline and level progression"
  - Readonly properties, enums, fibers, and modern PHP features
  - Named arguments — usage correctness and BC implications
  - Type unions, intersections, and DNF types
  - SQL injection via string interpolation in queries
  - Deserialization safety — unserialize on untrusted data
  - Error handling — exceptions vs error codes, throwable hierarchy
tags:
  - phpstan
  - psalm
  - phan
  - php
  - static-analysis
  - type-checking
  - baseline
  - strict-mode
  - composer
  - psr
  - laravel
  - symfony
  - strict-types
aliases:
  - lang-php
activation:
  file_globs:
    - "**/phpstan.neon*"
    - "**/phpstan.dist.neon"
    - "**/psalm.xml"
    - "**/psalm.xml.dist"
    - "**/.phan/config.php"
    - "**/composer.json"
  keyword_matches:
    - "@phpstan-ignore"
    - "@phpstan-ignore-next-line"
    - "@psalm-suppress"
    - "@psalm-import-type"
    - phpstan
    - psalm
    - phan
    - mixed
  structural_signals:
    - phpstan or psalm config file present
    - "inline phpstan/psalm suppression annotation"
source:
  origin: file
  path: tool-phpstan-psalm-phan.md
  hash: "sha256:d8fc6a6df512e25bd0e9f3f3bef10f917b2f777d0c262698a0af799e3a497974"
---
# PHPStan / Psalm / Phan Configuration and Suppression Hygiene

## When This Activates

Activates when the repository contains PHPStan, Psalm, or Phan configuration files, when @phpstan-ignore or @psalm-suppress annotations appear in the diff, or when PHP source files are present with these tools in composer.json. Focuses on whether static analysis is configured at an appropriate strictness level and whether suppressions are justified.

## Audit Surface

- [ ] @phpstan-ignore-next-line without a justification comment
- [ ] @phpstan-ignore without a specific error identifier
- [ ] @psalm-suppress without a justification comment
- [ ] Baseline file (phpstan-baseline.neon) has grown since the last release
- [ ] PHPStan level is below 5 for a project with more than 6 months of development
- [ ] Public method missing a return type declaration
- [ ] Public method parameter typed as mixed without a reason
- [ ] PHPStan or Psalm not running in CI
- [ ] Framework-specific extension missing (Larastan, phpstan-doctrine)
- [ ] Custom PHPStan rule class without a test
- [ ] Psalm running in a mode less strict than the project's stated goal
- [ ] Type annotations in docblocks contradict actual parameter types
- [ ] Unresolved TODO in baseline file
- [ ] Multiple static analysis tools with conflicting type interpretations

## Detailed Checks

### Suppression Discipline
<!-- activation: keywords=["@phpstan-ignore", "@phpstan-ignore-next-line", "@psalm-suppress", "@phan-suppress"] -->

- [ ] Flag `@phpstan-ignore-next-line` without a comment explaining why the error is a false positive or intentional
- [ ] Flag `@phpstan-ignore` without a specific error identifier -- blanket ignores hide multiple distinct issues
- [ ] Flag `@psalm-suppress` without a justification comment on the same or preceding line
- [ ] Flag suppression of security-related Psalm findings (taint analysis) without strong justification
- [ ] Count new suppression annotations in the PR -- more than 3 warrants discussion about whether the code or config should change
- [ ] Flag suppressions that have been copy-pasted across multiple methods -- this suggests a systemic type issue that should be fixed at the source

### Strictness Level and Progression
<!-- activation: file_globs=["**/phpstan.neon*", "**/phpstan.dist.neon", "**/psalm.xml*"] -->

- [ ] Check PHPStan level -- level 0-4 catches only basic errors; mature projects should target level 6+ for meaningful type safety
- [ ] If the project has been at the same PHPStan level for multiple releases without a documented plan to increase it, flag the stagnation
- [ ] Check Psalm's totallyTyped or strictMode configuration -- if the project aims for strict types but Psalm is not enforcing it, the goal is aspirational only
- [ ] Verify that strict_types declaration (declare(strict_types=1)) is present in new PHP files -- without it, type coercion hides bugs even at high analysis levels
- [ ] Check that the analysis includes all source directories, not just a subset -- partial analysis gives false confidence

### Baseline Management
<!-- activation: file_globs=["**/phpstan-baseline.neon", "**/psalm-baseline.xml"] -->

- [ ] If the baseline file exists, check whether it has grown in this PR -- new baseline entries should be temporary and accompanied by a plan to resolve them
- [ ] Flag baseline entries older than 6 months without a linked ticket for resolution
- [ ] Verify that the baseline is regenerated periodically -- stale baselines may suppress errors that no longer exist while failing to capture new structural issues
- [ ] Check that the baseline does not suppress errors in newly created files -- new code should meet the current analysis level, not be grandfathered in

### Framework Extensions and Type Coverage
<!-- activation: keywords=["Larastan", "phpstan-doctrine", "phpstan-symfony", "phpstan-phpunit", "mixed"] -->

- [ ] If the project uses Laravel, verify Larastan (phpstan/larastan) is installed and configured
- [ ] If the project uses Doctrine ORM, verify phpstan-doctrine is installed -- it resolves entity metadata that PHPStan cannot infer
- [ ] If the project uses Symfony, verify phpstan-symfony is installed for container-aware analysis
- [ ] Flag public method parameters or return types declared as `mixed` in non-framework-boundary code -- mixed defeats the purpose of static analysis
- [ ] Flag missing return type declarations on public methods -- these create mixed-type propagation through the codebase

## Common False Positives

- **Framework magic methods**: Laravel facades, Eloquent models, and Symfony container calls use magic methods that static analyzers cannot resolve without extensions. Extension absence, not the suppression, is the issue.
- **Legacy code in baseline**: Established projects legitimately have a baseline for pre-existing issues. Only flag baseline growth, not its existence.
- **Dynamic method calls via __call**: PHP's dynamic dispatch legitimately requires @phpstan-ignore for unresolvable method calls. Verify the class actually uses __call.
- **Test doubles and mocks**: PHPUnit mock objects trigger type errors that are expected in test code. Psalm and PHPStan have test-specific extensions.
- **Mixed types at system boundaries**: Code that reads from external sources (HTTP input, database results without mapping) legitimately handles mixed types before validation.

## Severity Guidance

| Finding | Severity |
|---|---|
| PHPStan/Psalm not running in CI | Important |
| Suppression of taint analysis finding without justification | Important |
| Baseline file growing with new code (not legacy) entries | Important |
| @phpstan-ignore without specific error identifier | Important |
| @phpstan-ignore-next-line without justification | Minor |
| PHPStan level below 5 for mature project | Minor |
| Mixed type in public API without reason | Minor |
| Framework extension missing | Minor |
| Missing return type declaration on public method | Minor |

## See Also

- `style-guide-supremacy` -- PHPStan and Psalm enforce type correctness beyond style; this reviewer checks their configuration health
- `author-self-review-hygiene` -- bare @phpstan-ignore without justification is a hygiene issue
- `principle-fail-fast` -- suppressed type errors defer failure detection; strict_types and higher levels enforce fail-fast
- `tool-sonarqube-semgrep-codeql` -- SonarQube and Semgrep complement PHPStan/Psalm with security-focused analysis
- `principle-naming-and-intent` -- return type declarations are a form of intent documentation

## Authoritative References

- [PHPStan: Getting Started](https://phpstan.org/user-guide/getting-started)
- [PHPStan: Rule Levels](https://phpstan.org/user-guide/rule-levels)
- [Psalm: Configuration](https://psalm.dev/docs/running_psalm/configuration/)
- [Larastan](https://github.com/larastan/larastan)
