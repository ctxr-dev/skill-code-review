---
id: footgun-integer-overflow-sign-extension
type: primary
depth_role: leaf
focus: "Detect unchecked arithmetic overflow, signed/unsigned confusion, narrowing casts, and integer promotion hazards"
parents:
  - index.md
covers:
  - "Unchecked arithmetic overflow wrapping silently (C/C++, Java, Go)"
  - "Signed/unsigned comparison producing counterintuitive results"
  - Narrowing cast truncating value without range check
  - Integer promotion rules widening operands unexpectedly
  - size_t vs int mismatch causing negative-to-huge-positive conversion
  - "32-bit multiplication overflow in 64-bit code (multiply before widen)"
  - User-controlled integer used for allocation size without bounds check
  - "Signed overflow is undefined behavior in C/C++"
  - Subtraction underflow on unsigned types wrapping to MAX_VALUE
  - Implicit conversion between different-width integer types
  - Undefined behaviour — signed overflow, null dereference, out-of-bounds, sequence points
  - "Integer overflow and signed/unsigned conversion pitfalls"
  - Pointer arithmetic correctness and bounds checking
  - Strict aliasing violations — type-punning through unions vs pointer casts
  - Const correctness and API contract enforcement
  - Thread safety with C11 atomics and mutexes
  - Buffer overflow prevention — stack and heap
  - Format string vulnerabilities
  - "malloc/free discipline — leaks, double-free, use-after-free"
  - "Secure coding (CERT C, MISRA C guidelines)"
tags:
  - integer-overflow
  - signed-unsigned
  - narrowing
  - type-safety
  - CWE-190
  - CWE-191
  - CWE-681
  - CWE-195
  - c
  - memory-safety
  - undefined-behaviour
  - buffer-overflow
  - pointers
  - security
aliases:
  - lang-c
activation:
  file_globs:
    - "**/*.{c,h,cpp,hpp,cc,cxx,go,rs,java,kt,cs,swift,zig}"
  keyword_matches:
    - size_t
    - uint
    - unsigned
    - int32
    - int64
    - uint32
    - uint64
    - i32
    - i64
    - u32
    - u64
    - Int32
    - Int64
    - UInt32
    - short
    - byte
    - overflow
    - underflow
    - cast
    - truncat
    - narrow
    - widen
    - atoi
    - parseInt
    - strtol
    - checked_add
    - wrapping_add
    - Math.addExact
  structural_signals:
    - Arithmetic on user-supplied integer values
    - Cast between integer types of different widths
    - Comparison of signed and unsigned integers
source:
  origin: file
  path: footgun-integer-overflow-sign-extension.md
  hash: "sha256:b0694447e6cf95c83aaa9ea53b307c57103de275e54cfcac08e022010379a961"
---
# Integer Overflow and Sign Extension Footguns

## When This Activates

Activates when diffs perform arithmetic on integers that may overflow, cast between integer types of different widths or signedness, compare signed and unsigned values, or use user-controlled integers for allocation sizes. Signed integer overflow is undefined behavior in C/C++ -- the compiler may optimize away overflow checks it deems "impossible." Unsigned overflow wraps modulo 2^N, turning a small subtraction into a near-maximum value. Java silently wraps on all integer overflow. These bugs cause buffer overflows, infinite loops, negative allocation sizes interpreted as huge allocations, and security bypasses in bounds checks.

## Audit Surface

- [ ] Arithmetic on integers from user input without overflow check
- [ ] Signed/unsigned comparison in conditional (int < size_t)
- [ ] Explicit cast narrowing integer width (long to int, int to short)
- [ ] Multiplication of two 32-bit values assigned to 32-bit before widening to 64-bit
- [ ] size_t or unsigned length used in signed arithmetic context
- [ ] User-supplied size, count, or length used to allocate memory or create array
- [ ] Subtraction on unsigned integer that could produce negative logical result
- [ ] Loop counter type mismatch with container size type
- [ ] Integer used for bit shift amount exceeding type width
- [ ] Implicit narrowing in function call argument or return value
- [ ] Comparison of signed and unsigned integers in security-sensitive check
- [ ] atoi/parseInt without range validation on external input

## Detailed Checks

### Unchecked Arithmetic Overflow (CWE-190, CWE-191)
<!-- activation: keywords=["overflow", "underflow", "+", "*", "add", "multiply", "sum", "total", "count", "size", "length", "checked_add", "Math.addExact", "wrapping_add"] -->

- [ ] **Signed overflow in C/C++ (UB)**: signed integer overflow is undefined behavior. The compiler assumes it never happens and may optimize away subsequent overflow checks. Flag `a + b` on signed integers from external input without prior range validation. Use `__builtin_add_overflow()` (GCC/Clang) or `<safe_math.h>` patterns
- [ ] **Silent wrap in Java/Go**: Java integer arithmetic wraps silently. `Integer.MAX_VALUE + 1 == Integer.MIN_VALUE`. Flag arithmetic on user-influenced values without `Math.addExact()`/`Math.multiplyExact()` which throw on overflow. Go similarly wraps; use `math.Add` or manual checks
- [ ] **Unsigned subtraction underflow**: `unsigned_a - unsigned_b` where `b > a` wraps to a huge positive value. Flag `size_t remaining = total - used` without checking `total >= used` first
- [ ] **Multiplication before widening**: `int64_t result = a * b` where `a` and `b` are `int32_t` -- the multiplication happens in 32-bit, overflows, then the truncated result is widened. Cast before multiplying: `(int64_t)a * b`

### Signed/Unsigned Confusion (CWE-195, CWE-681)
<!-- activation: keywords=["signed", "unsigned", "size_t", "ssize_t", "uint", "int", "comparison", "cast", "convert", "negative"] -->

- [ ] **Signed vs unsigned comparison**: `int i = -1; if (i < sizeof(buf))` -- `i` is implicitly converted to `size_t`, becoming a huge positive value, making the condition false. Flag comparisons between signed and unsigned types, especially in bounds checks
- [ ] **Negative value to unsigned**: a function returning `-1` as an error code, assigned to `size_t`, becomes `SIZE_MAX`. Flag signed-to-unsigned assignment where negative values are possible
- [ ] **size_t for signed arithmetic**: `size_t diff = end - start` where `end < start` wraps. Use `ptrdiff_t` or check ordering first

### Narrowing Casts (CWE-681)
<!-- activation: keywords=["cast", "(int)", "(short)", "(byte)", "static_cast", "as", "truncat", "narrow", "downcast", "int(", "Int("] -->

- [ ] **64-bit to 32-bit cast**: `int len = (int)longValue` silently truncates if the value exceeds `INT_MAX`. Flag narrowing casts without prior range check, especially on values from external sources or aggregation results (row counts, file sizes)
- [ ] **Integer to byte/short**: casting `int` to `byte` or `short` discards high bits. `(byte)256 == 0`. Flag narrowing casts in protocol encoding, serialization, or port numbers
- [ ] **Float to integer truncation**: `(int)3.9` is `3` (truncation, not rounding). `(int)NaN` is `0` in Java. Flag float-to-int casts without explicit rounding and NaN handling

### User-Controlled Size and Allocation (CWE-190)
<!-- activation: keywords=["malloc", "calloc", "new", "alloc", "array", "buffer", "size", "count", "length", "capacity", "request", "input", "parse"] -->

- [ ] **Unchecked size from input**: flag `malloc(user_count * sizeof(item))` or `new int[userSize]` where the size comes from deserialized input, HTTP parameters, or file headers without upper bound validation. An attacker can provide a huge value causing OOM or a value that overflows the multiplication to a small allocation (heap overflow)
- [ ] **atoi/parseInt without range check**: `atoi()` returns 0 on failure (indistinguishable from valid "0") and has undefined behavior on overflow. `parseInt()` in JavaScript returns `NaN` for non-numeric but silently truncates floats. Flag external input parsed to integer without validation against expected range

### Bit Shift Hazards
<!-- activation: keywords=["<<", ">>", "shift", "shl", "shr", "1 <<", "bit"] -->

- [ ] **Shift amount exceeding type width**: `1 << 32` on a 32-bit integer is undefined behavior in C/C++. `1 << n` where `n` comes from input can produce UB. Java wraps the shift amount modulo type width (`1 << 33 == 2` for int)
- [ ] **Left shift of signed negative**: `(-1) << n` is undefined behavior in C/C++ prior to C++20. Flag left shifts on signed values that may be negative
- [ ] **Missing 1L or 1ULL prefix**: `1 << 35` overflows in C if `int` is 32-bit. Use `1ULL << 35` or `(uint64_t)1 << 35`

## Common False Positives

- **Intentional wrapping arithmetic**: hash functions, checksums, and cryptographic code intentionally use wrapping arithmetic. Verify the intent before flagging.
- **Rust in non-debug mode**: Rust panics on overflow in debug mode but wraps in release by default. Flag only if `wrapping_*` or `overflowing_*` methods are not used and the wrap is unintentional.
- **Narrowing cast with prior validation**: if a range check precedes the cast (e.g., `if (longVal <= INT_MAX) { int x = (int)longVal; }`), the cast is safe.
- **Counter in bounded loop**: `for (int i = 0; i < 100; i++)` cannot overflow. Flag only when the bound is dynamic or large.

## Severity Guidance

| Finding | Severity |
|---|---|
| User-controlled size used in allocation without bounds check (CWE-190) | Critical |
| Signed overflow in C/C++ (undefined behavior) on external input | Critical |
| Signed vs unsigned comparison in security bounds check | Important |
| Narrowing cast without range check on external data | Important |
| 32-bit multiply overflow in 64-bit code path | Important |
| Unsigned subtraction that may underflow | Important |
| atoi/parseInt on external input without validation | Important |
| Shift amount from external input without bounds check | Minor |
| Loop counter type mismatch with container size (cosmetic) | Minor |

## See Also

- `footgun-resource-exhaustion-via-input` -- overflow in allocation size is a resource exhaustion vector
- `sec-owasp-a03-injection` -- integer overflow can bypass input length checks enabling injection
- `principle-fail-fast` -- overflow should be detected early, not wrapped silently
- `footgun-floating-point-comparison` -- float-to-int conversion hazards

## Authoritative References

- [CWE-190: Integer Overflow or Wraparound](https://cwe.mitre.org/data/definitions/190.html)
- [CWE-191: Integer Underflow](https://cwe.mitre.org/data/definitions/191.html)
- [CWE-681: Incorrect Conversion between Numeric Types](https://cwe.mitre.org/data/definitions/681.html)
- [CERT C: INT30-C. Ensure unsigned integer operations do not wrap](https://wiki.sei.cmu.edu/confluence/display/c/INT30-C)
- [CERT C: INT32-C. Ensure signed integer operations do not overflow](https://wiki.sei.cmu.edu/confluence/display/c/INT32-C)
- [Rust Reference: Integer Overflow](https://doc.rust-lang.org/reference/expressions/operator-expr.html#overflow)
