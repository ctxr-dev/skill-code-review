---
id: test-property-based
type: primary
depth_role: leaf
focus: Detect missing property-based tests for large input spaces and ensure property tests are well-configured with meaningful properties
parents:
  - index.md
covers:
  - Functions with large or combinatorial input spaces tested only with example-based tests
  - Parsers, serializers, and encoders without roundtrip property tests
  - Missing shrinking configuration making failures hard to diagnose
  - "Generators that do not cover edge cases (empty, max-size, unicode, negative)"
  - "Properties that are tautological (too weak to catch real bugs)"
  - Missing seed logging or replay mechanism for reproducing failures
  - Custom generators that produce biased or incomplete distributions
  - Property test with too few iterations to be meaningful
  - Stateful property tests missing for stateful APIs
  - Property tests not integrated into CI pipeline
tags:
  - property-based-testing
  - quickcheck
  - hypothesis
  - fast-check
  - generators
  - shrinking
  - fuzzing-lite
activation:
  file_globs:
    - "**/*property*"
    - "**/*prop_test*"
    - "**/*PropTest*"
    - "**/*test*"
    - "**/*spec*"
    - "**/*Test*"
  keyword_matches:
    - property
    - forAll
    - forall
    - arbitrary
    - Gen.
    - gen.
    - generator
    - shrink
    - hypothesis
    - given
    - "@given"
    - fast-check
    - fc.property
    - QuickCheck
    - prop
    - jqwik
    - kotest
    - proptest
    - Arb.
    - sample
    - strategy
  structural_signals:
    - property_test_function
    - generator_definition
    - arbitrary_instance
source:
  origin: file
  path: test-property-based.md
  hash: "sha256:f1702d8313570b44204f501cd90b41b4b5492ebc8115c3f177ecb3932ead27e5"
---
# Property-Based Testing

## When This Activates

Activates when the diff modifies or adds functions with large input spaces (parsers, validators, codecs, mathematical operations, data transformations) or when property-based test files are modified. Property-based tests explore the input space far more thoroughly than hand-picked examples; their absence for input-rich functions is a coverage gap that example-based tests cannot close.

## Audit Surface

- [ ] Parser, serializer, or codec function without a roundtrip (encode-decode) property test
- [ ] Sorting or ordering function without an idempotency or ordering-preserved property
- [ ] Mathematical function (arithmetic, financial) without algebraic property tests (commutativity, associativity)
- [ ] Data validation function with >5 input dimensions tested only with 3-4 examples
- [ ] Custom generator that never produces empty strings, empty lists, negative numbers, or zero
- [ ] Property that asserts only 'does not throw' -- too weak to detect logic bugs
- [ ] Hypothesis/QuickCheck/fast-check test with maxExamples or numTests set below 100
- [ ] Property test failure not reproducible because seed is not logged
- [ ] Shrinking disabled or custom shrinker not defined for complex generators
- [ ] Stateful API (stack, queue, cache, FSM) without model-based / stateful property test
- [ ] Property test running locally but excluded from CI
- [ ] Generator uses only ASCII strings when the function accepts unicode

## Detailed Checks

### Missing Property Tests
<!-- activation: keywords=["parse", "serialize", "encode", "decode", "format", "validate", "sort", "filter", "transform", "convert", "calculate", "compute"] -->

- [ ] **Roundtrip absence**: function has both encode/serialize and decode/deserialize but no test asserts `decode(encode(x)) == x` -- this is the most valuable property test for codecs and should be the first written
- [ ] **No oracle property**: a function reimplements known behavior (sorting, searching, math) but is not compared against a reference implementation -- use a simple reference as a test oracle
- [ ] **Invariant not tested**: function has documented invariants (output length equals input length, result is always positive, idempotent) but no property test verifies them across random inputs
- [ ] **Large input space with examples only**: function accepts multiple parameters with wide ranges, tested by 2-3 hardcoded examples -- the combinatorial space dwarfs the example coverage; add a property test with appropriate generators
- [ ] **Stateful API without model test**: API with mutable state (cache, connection pool, state machine) is tested only with scripted sequences -- use stateful property testing (Hypothesis stateful, fast-check modelRun) to explore state transition combinations

### Weak and Tautological Properties
<!-- activation: keywords=["property", "forAll", "forall", "assert", "expect", "should", "invariant", "always", "never"] -->

- [ ] **Does-not-throw property**: property asserts only that the function does not raise an exception -- this catches crashes but not logic bugs; add assertions on the output value or structure
- [ ] **Identity property**: property asserts `f(x) == f(x)` or `typeof result === 'object'` -- tautologically true for any implementation; strengthen with domain-specific assertions
- [ ] **Property mirrors implementation**: property recalculates the expected value using the same algorithm as production code -- this tests nothing; use an independent specification or algebraic law
- [ ] **Insufficient iterations**: test runs only 10-50 iterations (maxExamples=10, numTests=50) -- this is too few to find edge cases; use at least 100, preferably 1000 for critical functions
- [ ] **Over-constrained preconditions**: property uses `assume()` or `filter()` to discard >50% of generated inputs -- the effective iteration count is much lower; redesign the generator to produce valid inputs directly

### Generator Quality
<!-- activation: keywords=["Gen", "gen", "arbitrary", "Arb", "strategy", "from", "generate", "build", "composite", "oneOf", "frequency", "map", "flatMap", "filter"] -->

- [ ] **Missing edge cases**: custom generator does not produce boundary values (empty string, empty list, zero, negative, max int, NaN, unicode, null) -- property tests are most valuable at boundaries
- [ ] **ASCII-only strings**: generator produces `[a-zA-Z0-9]` strings but the function accepts full unicode -- unicode-specific bugs (surrogate pairs, zero-width characters, RTL) are missed
- [ ] **Single-type generator**: generator for a union or variant type produces only one variant -- all branches of the function's pattern match are not exercised
- [ ] **Biased distribution**: generator heavily favors small values or common cases -- use `frequency` or `weighted` to ensure rare-but-valid inputs are generated
- [ ] **No negative numbers**: generator for numeric input produces only non-negative values when the function accepts negatives -- negative inputs often trigger different code paths

### Shrinking and Reproducibility
<!-- activation: keywords=["shrink", "seed", "replay", "reproduce", "minimal", "counterexample", "failing", "example_database", "replay_from_seed"] -->

- [ ] **Shrinking disabled**: property test framework's shrinking is disabled or overridden with a no-op shrinker -- failing cases will be large and hard to diagnose; enable shrinking
- [ ] **No custom shrinker for complex types**: custom generator for a complex type does not define a corresponding shrinker -- the framework cannot minimize failing cases
- [ ] **Seed not logged**: property test failure does not log the seed used for random generation -- the failure cannot be reproduced; ensure the seed is printed on failure
- [ ] **No replay mechanism**: the project has no way to re-run a property test with a specific seed from CI logs -- add seed replay support via command-line argument or configuration
- [ ] **Example database not persisted**: Hypothesis example database or fast-check seed store is gitignored and not shared -- discovered failures are lost when CI containers are ephemeral

## Common False Positives

- **Functions with trivial input spaces**: a function that takes a boolean and an enum with 3 values has only 6 input combinations -- example-based tests cover the entire space and property tests add no value.
- **UI event handlers**: property-based tests are rarely useful for event handlers with complex side effects. Integration or E2E tests are more appropriate.
- **Performance-sensitive code**: property tests with large iteration counts may be too slow for CI. Running fewer iterations is acceptable if supplemented by periodic deeper runs.
- **External API wrappers**: thin wrappers around external APIs cannot be property-tested meaningfully without the external service. Use contract tests instead.

## Severity Guidance

| Finding | Severity |
|---|---|
| Parser/serializer/codec without roundtrip property test | Important |
| Property that asserts only 'does not throw' for complex logic | Important |
| Custom generator missing edge cases (empty, zero, negative, unicode) | Important |
| Property test failure not reproducible (no seed logging) | Important |
| Large input space tested by <5 example-based tests and no property tests | Minor |
| Shrinking disabled for custom generator | Minor |
| Property test with <100 iterations in CI | Minor |
| Stateful API without model-based property test | Minor |

## See Also

- `test-unit-discipline` -- property tests complement example-based unit tests; both should follow AAA structure
- `test-fuzzing` -- fuzzing is a complementary technique for crash detection; property tests verify logical correctness
- `test-mutation` -- surviving mutants may indicate properties are too weak
- `antipattern-flaky-non-deterministic-tests` -- property tests without seed logging create irreproducible failures
- `principle-fail-fast` -- does-not-throw properties delay failure detection

## Authoritative References

- [Fred Hebert, *Property-Based Testing with PropEr, Erlang, and Elixir* (2019)](https://pragprog.com/titles/fhproper/property-based-testing-with-proper-erlang-and-elixir/)
- [Hypothesis Documentation -- strategies, stateful testing, health checks](https://hypothesis.readthedocs.io/)
- [fast-check Documentation -- arbitraries, model-based testing](https://fast-check.dev/)
- [John Hughes, "QuickCheck: A Lightweight Tool for Random Testing of Haskell Programs" (ICFP 2000)](https://www.cs.tufts.edu/~nr/cs257/archive/john-hughes/quick.pdf)
- [Scott Wlaschin, "An Introduction to Property-Based Testing" (F# for Fun and Profit)](https://fsharpforfunandprofit.com/posts/property-based-testing/)
