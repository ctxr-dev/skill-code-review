---
id: principle-fail-fast
type: primary
depth_role: leaf
focus: Verify that errors are detected and surfaced at the earliest possible point rather than propagated silently
parents:
  - index.md
covers:
  - Missing input validation at public API boundaries
  - "Null/undefined propagation through call chains"
  - Silent fallback to default values hiding upstream bugs
  - Startup-time configuration validation gaps
  - Precondition checks absent from functions with narrow valid input domains
  - Error swallowing in catch blocks without logging or re-throw
  - Late failure after expensive computation when input was invalid from the start
  - Constructor and factory methods accepting invalid state
  - Missing type narrowing after external data deserialization
  - Assertions stripped in production builds leaving invariants unchecked
tags:
  - fail-fast
  - validation
  - error-handling
  - preconditions
  - defensive-programming
activation:
  file_globs:
    - "**/*"
  keyword_matches: []
  structural_signals:
    - Any code diff
source:
  origin: file
  path: principle-fail-fast.md
  hash: "sha256:64d603be8d30a2c9e4d06cf997a6e732af22399fca46caecd5a2f9cff0343179"
---
# Fail-Fast Principle

## When This Activates

Always loaded. Every diff should be checked for silent error propagation, missing boundary validation, and late failures that could have been caught earlier. Fail-fast violations are the most common source of hard-to-diagnose production bugs.

## Audit Surface

- [ ] Public function entry points missing argument validation
- [ ] Catch blocks that swallow exceptions (empty catch, catch-and-return-null)
- [ ] Deserialized external data used without schema validation
- [ ] Null/optional values passed through multiple layers before first check
- [ ] Configuration read at request time instead of validated at startup
- [ ] Default values masking invalid or missing configuration
- [ ] Type casts or unsafe coercions without prior type guards
- [ ] Error codes returned but never checked by callers
- [ ] Boolean success flags instead of exceptions or Result types
- [ ] Invariant assumptions expressed only in comments, not in code
- [ ] Database/network calls attempted with known-invalid parameters
- [ ] Constructor that accepts partial state and defers validation to a separate init method

## Detailed Checks

### Boundary Validation
<!-- activation: keywords=["validate", "check", "guard", "require", "assert", "precondition", "input", "param"] -->

- [ ] Every public method validates its arguments before doing work -- reject invalid inputs with descriptive errors at the boundary, not deep in the call stack
- [ ] API endpoint handlers validate request shape and types before passing to service layer -- use schema validation (Zod, Pydantic, JSON Schema), not manual field checks
- [ ] Functions that accept indices, sizes, or counts verify non-negative and within-bounds before use
- [ ] String arguments with format constraints (email, URL, UUID) are validated at entry, not assumed correct
- [ ] Functions receiving external IDs (user input, URL params, message payloads) treat them as untrusted and validate before database lookups
- [ ] Environment variables and config values are validated at startup with clear error messages naming the missing/invalid key

### Error Propagation Hygiene
<!-- activation: keywords=["catch", "except", "error", "throw", "raise", "try", "finally", "rescue"] -->

- [ ] Catch blocks either handle the error meaningfully, log-and-rethrow, or convert to a domain-specific error -- never silently swallow
- [ ] Generic catch-all handlers (catch Exception, catch(...), rescue => nil) are limited to top-level boundaries; inner code catches specific types
- [ ] Error return values (Result, Either, error codes) are checked immediately by callers -- not ignored or deferred
- [ ] Functions do not return null/None/-1 as an error signal when the language has proper error types
- [ ] Promise/Future chains have explicit rejection handlers -- no unhandled rejection paths
- [ ] Finally/ensure blocks do not themselves throw, masking the original error

### Invariant Enforcement
<!-- activation: keywords=["invariant", "assume", "must", "always", "never", "impossible", "unreachable"] -->

- [ ] Assumptions stated in comments are enforced in code (assertions, type narrowing, or early returns)
- [ ] Switch/match statements cover all cases or have an explicit unreachable/exhaustive default that throws
- [ ] State machine transitions reject invalid transitions rather than silently ignoring them
- [ ] Collection operations that assume non-empty input (first, reduce without initial, array indexing) guard against empty collections
- [ ] Downcasts and type assertions are preceded by type checks -- do not rely on catch-ClassCastException
- [ ] Loop invariants that must hold are asserted in debug mode if the language supports it

### Startup vs Runtime Validation
<!-- activation: keywords=["config", "env", "init", "startup", "boot", "connect", "setup"] -->

- [ ] All required configuration (env vars, config files, feature flags) is validated at process startup, not on first request
- [ ] Database and service connections are verified (ping/health check) during initialization, with clear failure messages
- [ ] Missing optional config falls back to safe, explicit defaults documented in code -- not to null/empty that causes downstream failures
- [ ] Schema migrations or version checks run at startup rather than on first query

## Common False Positives

- **Graceful degradation by design**: Some systems intentionally fall back to defaults (e.g., circuit breakers, feature flags). Verify the fallback is documented and tested, then do not flag it.
- **Performance-critical hot paths**: Precondition checks on every call in a tight inner loop may be deliberately omitted for performance. Look for validation at the outer boundary instead.
- **Defensive retry logic**: Catching broad exceptions to retry transient failures (network, lock contention) is intentional error handling, not swallowing.
- **Optional enrichment**: If a field is truly optional and its absence is a normal case (not an error), a null check with fallback is correct, not a fail-fast violation.

## Severity Guidance

| Finding | Severity |
|---|---|
| Security-relevant input (SQL, paths, auth tokens) used without validation | Critical |
| Empty catch block around security or data-integrity operation | Critical |
| External data deserialized and used without schema validation | Important |
| Configuration validated at request time instead of startup | Important |
| Null propagated through 3+ layers before first check | Important |
| Missing exhaustive match/switch default | Minor |
| Assertion in comment but not in code for non-critical invariant | Minor |

## See Also

- `principle-least-astonishment` -- silent failures are the ultimate surprise
- `principle-command-query-separation` -- queries that silently mutate state on error violate both principles
- `principle-dry-kiss-yagni` -- duplicated validation logic drifts, leaving gaps

## Authoritative References

- [Jim Shore - Fail Fast (IEEE Software)](https://www.jamesshore.com/v2/blog/2004/fail-fast)
- [Effective Java, Item 49: Check parameters for validity](https://www.oreilly.com/library/view/effective-java/9780134686097/)
- [The Pragmatic Programmer - Dead Programs Tell No Lies](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/)
- [Michael Nygard - Release It! (Stability Patterns)](https://pragprog.com/titles/mnee2/release-it-second-edition/)
