---
id: test-mutation
type: primary
depth_role: leaf
focus: Detect surviving mutants indicating weak assertions, ensure mutation testing is configured correctly, and enforce mutation score thresholds
parents:
  - index.md
covers:
  - Surviving mutants in critical business logic indicating tests that do not detect behavior changes
  - Mutation testing not configured or not running in CI
  - Mutation score threshold too low or absent
  - Timeout configuration too generous, allowing slow mutants to survive
  - "Mutation testing scoped too broadly (entire codebase) or too narrowly (only trivial code)"
  - Equivalent mutants inflating the survived-mutant count without indicating real weakness
  - Tests pass with mutated return values, indicating assertion-free or weak-assertion tests
  - Conditional boundary mutations surviving, indicating missing boundary tests
  - Void method call removal surviving, indicating untested side effects
  - Incremental mutation testing not configured, causing slow CI feedback
tags:
  - mutation-testing
  - pitest
  - stryker
  - mutant
  - mutation-score
  - test-quality
  - assertion-strength
activation:
  file_globs:
    - "**/pitest*"
    - "**/stryker*"
    - "**/mutation*"
    - "**/*mutant*"
    - "**/pom.xml"
    - "**/build.gradle*"
    - "**/stryker.conf*"
    - "**/package.json"
  keyword_matches:
    - mutation
    - mutant
    - pitest
    - stryker
    - mutation-testing
    - mutationTest
    - mutationScore
    - survived
    - killed
    - mutator
    - pit-maven-plugin
  structural_signals:
    - mutation_testing_config
    - mutation_report
    - pitest_configuration
source:
  origin: file
  path: test-mutation.md
  hash: "sha256:a172ce215e58e8869c3c515be0bce32012ca30cdf8213bf8fff37e3bf26583ab"
---
# Mutation Testing

## When This Activates

Activates when the diff modifies mutation testing configuration, when mutation test reports show surviving mutants, or when critical production code has high line coverage but no mutation testing. Mutation testing is the strongest available signal for assertion quality -- if mutating production code does not cause any test to fail, those tests are not actually verifying the behavior they claim to cover.

## Audit Surface

- [ ] Production code with >80% line coverage but no mutation testing configured
- [ ] Mutation test report showing >20% surviving mutants in critical modules
- [ ] Mutant that changes return value from correct to incorrect and no test fails
- [ ] Mutant that removes a conditional check (if-guard) and no test fails
- [ ] Mutant that negates a boolean expression and no test fails
- [ ] Mutant that changes a boundary condition (< to <=, > to >=) and no test fails
- [ ] Mutant that removes a void method call (logging, side effect) and no test fails
- [ ] Mutation testing configured but excluded from CI pipeline
- [ ] Mutation timeout set to >30s per mutant, allowing slow mutants to survive
- [ ] Mutation testing scoped only to trivial classes (DTOs, config) instead of business logic
- [ ] No incremental mutation testing: full codebase re-mutated on every change
- [ ] Mutation score threshold absent from CI quality gate

## Detailed Checks

### Surviving Mutant Analysis
<!-- activation: keywords=["survived", "mutant", "killed", "mutation", "score", "report", "uncovered"] -->

- [ ] **Return value mutation survives**: a mutant changes the return value of a non-void method (e.g., returns null instead of the computed result) and all tests still pass -- the test either has no assertion on the return value or asserts trivially (not-null only)
- [ ] **Conditional boundary mutation survives**: a mutant changes `<` to `<=` or `>` to `>=` and tests pass -- boundary values are not tested; add test cases at the exact boundary
- [ ] **Negated conditional survives**: a mutant flips `if (x > 0)` to `if (x <= 0)` and tests pass -- both branches of the conditional must be tested
- [ ] **Void method removal survives**: a mutant removes a call to a void method (e.g., `sendNotification()`, `auditLog()`, `cache.invalidate()`) and tests pass -- side effects must be verified via mocks or state checks
- [ ] **Math operator mutation survives**: a mutant changes `+` to `-` or `*` to `/` and tests pass -- the test does not assert on the computed value with precision sufficient to detect the change

### Configuration and Thresholds
<!-- activation: keywords=["pitest", "stryker", "config", "threshold", "score", "timeout", "mutator", "target", "exclude", "include"] -->

- [ ] **No mutation score threshold**: mutation testing runs but there is no quality gate requiring a minimum mutation score -- surviving mutants go unnoticed
- [ ] **Threshold too low**: mutation score threshold is set below 60% -- a reasonable target is 80%+ for critical modules
- [ ] **Timeout too generous**: per-mutant timeout is >30 seconds, allowing infinite loops or slow mutants to survive -- set timeout to 1.5-2x the normal test suite duration per mutant
- [ ] **Wrong scope**: mutation testing targets generated code, DTOs, or configuration classes instead of business logic, validation, and calculation modules -- focus mutation testing on high-value code
- [ ] **All mutators enabled**: every mutator type is enabled including experimental ones that produce many equivalent mutants -- start with the default/standard mutator set and add selectively

### CI Integration and Performance
<!-- activation: keywords=["ci", "pipeline", "incremental", "diff", "cache", "history", "baseline", "gradle", "maven", "npm", "build"] -->

- [ ] **Not in CI**: mutation testing runs only on developer machines -- it must run in CI to catch regressions
- [ ] **Full-codebase mutation on every PR**: the entire codebase is re-mutated for every pull request -- use incremental mutation testing (pitest with SCM integration, Stryker incremental) to mutate only changed code
- [ ] **No baseline comparison**: mutation score is computed but not compared to the previous baseline -- a score drop should fail the build
- [ ] **Mutation results not archived**: mutation reports are generated but not stored -- historical trends cannot be tracked
- [ ] **Slow feedback**: mutation testing takes >15 minutes for a typical PR -- optimize by scoping to changed classes, using incremental mode, or parallelizing mutant execution

### Equivalent Mutant Handling
<!-- activation: keywords=["equivalent", "false positive", "survived", "justify", "suppress", "ignore", "exclude"] -->

- [ ] **Equivalent mutants inflating survival rate**: some surviving mutants are semantically equivalent to the original code (e.g., changing `x >= 0` to `x > -1` for integer types) -- document or suppress known equivalent mutants rather than lowering the threshold
- [ ] **Over-suppression**: too many mutants are excluded or suppressed, defeating the purpose of mutation testing -- review suppressions periodically and ensure each has a justification
- [ ] **No triage process**: surviving mutants are ignored without investigation -- each surviving mutant in critical code should be triaged: strengthen the test, document as equivalent, or suppress with justification

## Common False Positives

- **Logging and telemetry**: mutants that remove logging or metrics calls often survive because tests do not assert on log output. This is acceptable for non-critical logging; flag only for audit-trail or compliance-required logging.
- **Equivalent mutants**: some mutations produce semantically identical code (e.g., reordering commutative operations). These are not test weaknesses.
- **Performance-only code**: code paths that exist solely for performance optimization (caching, batch processing) may survive mutation without indicating a logic bug.
- **Generated code**: code generated by ORMs, protobuf compilers, or serialization frameworks should be excluded from mutation testing scope.

## Severity Guidance

| Finding | Severity |
|---|---|
| Critical business logic (payment, auth, validation) has surviving return-value mutants | Critical |
| Mutation testing not configured for a project with >80% line coverage | Important |
| Conditional boundary mutations surviving in validation or authorization code | Important |
| Mutation testing configured but not running in CI | Important |
| Mutation score dropped below threshold without investigation | Important |
| Void method removal mutants surviving for logging or non-critical side effects | Minor |
| No incremental mutation testing causing slow CI | Minor |
| Equivalent mutants not documented or triaged | Minor |

## See Also

- `test-coverage-quality-not-quantity` -- mutation testing is the strongest tool for distinguishing meaningful from hollow coverage
- `test-unit-discipline` -- assertion-free tests are the primary cause of surviving mutants
- `test-property-based` -- property tests with strong properties kill more mutants than example-based tests
- `principle-fail-fast` -- surviving mutants in guard clauses mean the guard is untested

## Authoritative References

- [Pitest -- mutation testing for JVM (Java, Kotlin, Scala)](https://pitest.org/)
- [Stryker Mutator -- mutation testing for JS, TS, C#, Scala](https://stryker-mutator.io/)
- [Mike Papadakis et al., "Mutation Testing Advances: An Analysis and Survey" (2019)](https://doi.org/10.1016/bs.adcom.2018.03.015)
- [Henry Coles, "Mutation Testing in the Real World" (QCon 2017)](https://pitest.org/talks/)
- [Google Testing Blog, "Mutation Testing" (2018)](https://testing.googleblog.com/2018/10/mutation-testing.html)
