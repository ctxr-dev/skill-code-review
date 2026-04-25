---
id: footgun-floating-point-comparison
type: primary
depth_role: leaf
focus: Detect equality comparison of floats, accumulation error in loops, NaN propagation, negative zero semantics, and catastrophic cancellation
parents:
  - index.md
covers:
  - "Equality comparison of floats (== instead of epsilon or ULP-based comparison)"
  - "Accumulation error: summing many small floats diverges from expected total"
  - "NaN != NaN surprise: condition is always false when operand is NaN"
  - "-0.0 == 0.0 but 1/-0.0 == -Infinity, breaking downstream math"
  - "Catastrophic cancellation: subtracting nearly equal floats loses all significant digits"
  - Float-to-int truncation instead of rounding
  - Infinity propagation through arithmetic chains
  - "Float as hash map key: NaN is unfindable, -0.0 and 0.0 collide"
tags:
  - floating-point
  - IEEE-754
  - NaN
  - epsilon
  - precision
  - comparison
  - CWE-682
activation:
  file_globs:
    - "**/*.{c,h,cpp,hpp,java,kt,py,rs,go,js,ts,cs,swift,scala}"
  keyword_matches:
    - float
    - double
    - Float
    - Double
    - f32
    - f64
    - NaN
    - isNaN
    - isnan
    - Infinity
    - POSITIVE_INFINITY
    - epsilon
    - EPSILON
    - ulp
    - fabs
    - abs
    - Math.abs
    - Number.isNaN
    - Float.compare
    - Double.compare
    - isFinite
    - isinf
  structural_signals:
    - Equality comparison of floating-point variables
    - Loop accumulating floating-point sum
    - Floating-point value used as map key or set element
source:
  origin: file
  path: footgun-floating-point-comparison.md
  hash: "sha256:29c72b07afdca4de2aa380a97f2cda2c6a68f2e55f49c18a5807d73bf2a260dc"
---
# Floating-Point Comparison Footguns

## When This Activates

Activates when diffs compare floating-point values for equality, accumulate sums in loops, use floats as map keys, cast floats to integers, or perform subtractions on nearly-equal values. IEEE 754 floating-point arithmetic is approximate: `0.1 + 0.2 == 0.30000000000000004` in every language. NaN is not equal to itself (`NaN != NaN` is true). Negative zero equals positive zero (`-0.0 == 0.0`) but produces different results in division. These semantics cause silent logic errors in conditionals, sorting, hashing, and accumulation that pass all tests with "nice" numbers and fail on real data.

## Audit Surface

- [ ] Equality (==) or inequality (!=) comparison of floating-point values
- [ ] Loop accumulating sum of floats without compensated summation
- [ ] Conditional branch on float result that may be NaN
- [ ] Float used as dictionary/map key or set element
- [ ] Subtraction of nearly-equal float values in numeric computation
- [ ] Float cast to integer without explicit rounding function
- [ ] Division that may produce Infinity or -Infinity without guard
- [ ] Float comparison in sorting that does not handle NaN
- [ ] Threshold comparison using absolute epsilon on large values
- [ ] Float used for loop termination condition
- [ ] Serialization of float losing precision
- [ ] Float comparison for equality after arithmetic

## Detailed Checks

### Equality Comparison (CWE-682)
<!-- activation: keywords=["==", "!=", "equals", "Equal", "compare", "epsilon", "tolerance", "threshold", "delta", "close"] -->

- [ ] **Direct == on floats**: flag `a == b` or `a != b` where both operands are `float`/`double`. After arithmetic, results rarely land on exact values. Use `Math.abs(a - b) < epsilon` with an appropriate epsilon, or ULP-based comparison for scientific code
- [ ] **Absolute epsilon on large values**: `Math.abs(a - b) < 1e-9` fails for large floats where the representational gap between adjacent values exceeds epsilon. Use relative epsilon: `Math.abs(a - b) <= epsilon * Math.max(Math.abs(a), Math.abs(b))` or ULP comparison
- [ ] **Float loop termination**: `for (double x = 0.0; x != 1.0; x += 0.1)` never terminates because 0.1 is not exactly representable and the accumulation never exactly reaches 1.0. Use integer loop counter or `<=` with tolerance
- [ ] **Switch/match on float**: flag `switch` or pattern match on floating-point values. The exact bit pattern required for case matching makes this unreliable after any computation

### NaN Propagation
<!-- activation: keywords=["NaN", "isNaN", "isnan", "nan", "not a number", "Number.isNaN", "Float.isNaN", "Double.isNaN", "math.isnan"] -->

- [ ] **NaN in conditional always false**: `if (x > threshold)` is false when `x` is NaN. `if (x <= threshold)` is also false. NaN is not greater than, less than, or equal to anything. Flag conditionals on floats that do not handle NaN explicitly
- [ ] **NaN propagation through chain**: any arithmetic with NaN produces NaN. A single NaN in an array corrupts the entire `sum()`, `max()`, `min()`. Flag aggregation functions on float arrays without NaN filtering
- [ ] **NaN != NaN breaks equality checks**: `x == x` is false when x is NaN. This means `Set.contains(NaN)` and `Map.get(NaN)` may fail or produce surprising behavior depending on language
- [ ] **JavaScript NaN pitfalls**: `typeof NaN === "number"` is true. `NaN === NaN` is false. Use `Number.isNaN()` (not global `isNaN()` which coerces). Flag `x === NaN` or `x !== NaN` patterns

### Negative Zero and Infinity
<!-- activation: keywords=["-0", "negative zero", "Infinity", "POSITIVE_INFINITY", "NEGATIVE_INFINITY", "inf", "isinf", "isFinite", "isInfinite", "divide"] -->

- [ ] **-0.0 vs 0.0 equality**: `-0.0 == 0.0` is true, but `1.0 / -0.0 == -Infinity` while `1.0 / 0.0 == Infinity`. Flag division by a variable that may be -0.0 if the sign of infinity matters
- [ ] **Float as map key**: `{0.0: "a", -0.0: "b"}` -- in most languages -0.0 and 0.0 are equal as keys, so the second overwrites the first. NaN as a key is unretrievable in Java (`HashMap`) because `NaN.equals(NaN)` is false. Flag float-keyed collections
- [ ] **Infinity in arithmetic**: `Infinity - Infinity == NaN`, `Infinity / Infinity == NaN`, `0 * Infinity == NaN`. Flag arithmetic chains where intermediate Infinity values can propagate to NaN

### Accumulation Error
<!-- activation: keywords=["sum", "total", "accumulate", "reduce", "aggregate", "loop", "Kahan", "compensat", "fsum", "pairwise"] -->

- [ ] **Naive float summation**: summing 10,000 values of `0.1` in a loop gives `999.9999999999831`, not `1000.0`. Flag loop-based summation of many float values without compensated summation. Use Kahan summation, `math.fsum()` (Python), or `StableSum` patterns
- [ ] **Reduce/fold accumulation order**: `[1e20, 1.0, -1e20].reduce((a, b) => a + b)` returns `0.0` instead of `1.0` because `1.0` is lost to the magnitude of `1e20`. Sorting by magnitude before summation or using pairwise summation helps

### Catastrophic Cancellation
<!-- activation: keywords=["subtract", "cancel", "precision", "significant", "digits", "loss", "quadratic", "formula", "discriminant"] -->

- [ ] **Subtracting nearly-equal values**: `a - b` where `a ≈ b` can lose most significant digits. If `a = 1.0000001` and `b = 1.0000000` (stored as floats), the result may have only 1-2 correct digits instead of 7. Flag subtraction of values known to be close in magnitude in scientific/financial computation
- [ ] **Quadratic formula naive implementation**: `(-b - sqrt(b*b - 4*a*c)) / (2*a)` suffers catastrophic cancellation when `b > 0` and `4ac` is small relative to `b*b`. Use the numerically stable alternative

### Float-to-Integer Conversion
<!-- activation: keywords=["(int)", "int(", "Integer", "truncat", "round", "floor", "ceil", "Math.round", "Math.floor", "as i32", "as u32"] -->

- [ ] **Truncation vs rounding**: `(int)3.99` is `3`, not `4`. Flag float-to-int casts without explicit `Math.round()`, `Math.floor()`, or `Math.ceil()` when the intent is rounding
- [ ] **NaN to int**: `(int)Double.NaN` is `0` in Java, undefined behavior in C/C++. Flag float-to-int conversion without NaN guard
- [ ] **Large float to int overflow**: `(int)1e18` overflows 32-bit int. `(long)1e20` overflows 64-bit long. Flag float-to-int conversion without range check

## Common False Positives

- **Exact float constants**: comparing a float to a compile-time constant assigned without arithmetic (e.g., `if (x == 0.0)` where x is set to `0.0` or `1.0` without computation) is exact and safe.
- **Bitwise float comparison for serialization**: using `Float.floatToIntBits()` or `memcmp` for exact bit-pattern comparison in serialization/deserialization is intentional.
- **NaN sentinel value**: some algorithms intentionally use NaN as a sentinel for "no value" and check with `isNaN()`. This is a valid pattern.
- **GPU/shader code**: GPU programming has different precision expectations and conventions. Float comparison thresholds are domain-specific.

## Severity Guidance

| Finding | Severity |
|---|---|
| Float equality in financial or billing computation | Critical |
| NaN propagation silently corrupting aggregation results | Important |
| Float used as hash map key in production code | Important |
| Naive float summation in accounting or scientific code | Important |
| Float loop termination using == | Important |
| Conditional branch not handling NaN case | Minor |
| Absolute epsilon on potentially large float values | Minor |
| Float-to-int cast without explicit rounding | Minor |
| Catastrophic cancellation in numeric algorithm | Minor |

## See Also

- `footgun-money-decimals-precision` -- monetary-specific float consequences
- `footgun-integer-overflow-sign-extension` -- float-to-int conversion overflow
- `principle-fail-fast` -- NaN should be detected early, not propagated silently

## Authoritative References

- [IEEE 754-2019 Standard for Floating-Point Arithmetic](https://ieeexplore.ieee.org/document/8766229)
- [David Goldberg: What Every Computer Scientist Should Know About Floating-Point Arithmetic](https://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html)
- [CWE-682: Incorrect Calculation](https://cwe.mitre.org/data/definitions/682.html)
- [Kahan Summation Algorithm (Wikipedia)](https://en.wikipedia.org/wiki/Kahan_summation_algorithm)
