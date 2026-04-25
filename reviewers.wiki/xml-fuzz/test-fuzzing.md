---
id: test-fuzzing
type: primary
depth_role: leaf
focus: Detect missing fuzz targets for parsers and deserializers, verify corpus management, and ensure coverage-guided fuzzing is properly configured
parents:
  - index.md
covers:
  - Parser, deserializer, or protocol handler without a fuzz target
  - "Fuzz target that does not exercise the function's error handling paths"
  - Missing or empty seed corpus for guided fuzzing
  - Crash findings not triaged or converted into regression tests
  - "Fuzz target with no coverage instrumentation (blind fuzzing)"
  - Fuzz target that exits on first error instead of continuing to explore
  - Corpus directory not version-controlled or managed
  - Fuzz target with insufficient timeout, killing long-running but valid inputs
  - Memory limits not configured, allowing OOM to crash CI
  - Fuzz findings not linked to bug tracker or security advisory
  - "Fuzz target not integrated into CI (OSS-Fuzz, ClusterFuzz, or scheduled runs)"
tags:
  - fuzzing
  - fuzz-testing
  - libfuzzer
  - afl
  - go-fuzz
  - jazzer
  - oss-fuzz
  - corpus
  - crash-triage
  - security-testing
activation:
  file_globs:
    - "**/*fuzz*"
    - "**/*Fuzz*"
    - "**/fuzz_*"
    - "**/*_fuzz*"
    - "**/corpus/**"
    - "**/testdata/fuzz/**"
    - "**/crashers/**"
    - "**/*fuzzer*"
    - "**/oss-fuzz/**"
  keyword_matches:
    - fuzz
    - Fuzz
    - FuzzTest
    - fuzzer
    - libfuzzer
    - afl
    - go-fuzz
    - jazzer
    - atheris
    - corpus
    - seed
    - crash
    - sanitizer
    - asan
    - msan
    - ubsan
    - coverage-guided
  structural_signals:
    - fuzz_target_function
    - corpus_directory
    - fuzzer_configuration
source:
  origin: file
  path: test-fuzzing.md
  hash: "sha256:5fda76da11bb352ddecac4b2f64f32b41d1bfad017310e8324f56fe05d8c4491"
---
# Fuzz Testing

## When This Activates

Activates when the diff modifies parsers, deserializers, protocol handlers, or any function that processes untrusted input, and when fuzz test infrastructure is added or changed. Fuzzing is the most effective technique for finding crashes, hangs, memory corruption, and unexpected exceptions in input-processing code. A parser without a fuzz target is a parser with unknown crash modes.

## Audit Surface

- [ ] Parser function (JSON, XML, YAML, CSV, protobuf, binary protocol) without a fuzz target
- [ ] Deserialization function (from bytes, from string, unmarshal) without a fuzz target
- [ ] Input validation function for user-supplied data without a fuzz target
- [ ] Fuzz target with empty seed corpus directory
- [ ] Fuzz target that catches all exceptions and returns success (masks crashes)
- [ ] Fuzz target not instrumented for code coverage (no -fsanitize=fuzzer, no go-fuzz, no jazzer)
- [ ] Crash reproduction directory not checked into version control
- [ ] Fuzz target with no memory limit or timeout configuration
- [ ] Fuzz findings older than 30 days not triaged or converted to regression tests
- [ ] Fuzz target not in CI or OSS-Fuzz configuration
- [ ] Corpus grows unbounded without minimization or deduplication
- [ ] Fuzz target for a function that accepts structured input but generates only random bytes

## Detailed Checks

### Missing Fuzz Targets
<!-- activation: keywords=["parse", "deserialize", "unmarshal", "decode", "fromBytes", "fromString", "read", "load", "accept", "handle", "process", "input", "request", "packet"] -->

- [ ] **Unprotected parser**: function that parses user-supplied or network input (JSON, XML, binary, custom protocol) has no fuzz target -- add a fuzz target that feeds arbitrary bytes or structured data to the parser
- [ ] **Deserialization without fuzzing**: function that converts bytes/strings to objects (unmarshal, deserialize, fromProto) lacks a fuzz target -- deserialization is the #1 source of memory corruption and DoS vulnerabilities
- [ ] **Validator without fuzzing**: input validation function is tested only with example-based tests -- fuzz the validator to find inputs that bypass validation or cause unexpected exceptions
- [ ] **Protocol handler without fuzzing**: network protocol handler (HTTP, gRPC, WebSocket, custom TCP) processes untrusted input but has no fuzz target -- protocol handlers are high-value fuzz targets
- [ ] **File format reader without fuzzing**: function that reads files in a specific format (image, document, config) lacks a fuzz target -- malformed files are a common attack vector

### Corpus Management
<!-- activation: keywords=["corpus", "seed", "testdata", "dictionary", "sample", "minimize", "merge", "deduplicate"] -->

- [ ] **Empty seed corpus**: fuzz target starts with no seed inputs -- provide at least a minimal corpus of valid and edge-case inputs to guide the fuzzer toward code coverage faster
- [ ] **No corpus minimization**: corpus grows over time without periodic `merge -merge=1` or equivalent deduplication -- bloated corpus slows fuzzing and CI
- [ ] **Corpus not versioned**: seed corpus is in .gitignore or not checked in -- new contributors and CI cannot benefit from accumulated coverage
- [ ] **No dictionary file**: fuzzer for a text-based format (JSON, XML, SQL) lacks a dictionary of format-specific tokens -- dictionaries dramatically improve coverage for structured formats
- [ ] **Random bytes for structured input**: fuzz target feeds random bytes to a function that expects structured input (JSON, protobuf) -- use structure-aware fuzzing (protobuf mutator, json grammar) for better coverage

### Crash Triage and Regression Tests
<!-- activation: keywords=["crash", "panic", "oom", "timeout", "hang", "assert", "abort", "segfault", "regression", "fix", "triage"] -->

- [ ] **Untriaged crashes**: fuzzer has found crashes (files in crashers/ directory) that have not been investigated -- each crash should be triaged, fixed, and converted to a regression test
- [ ] **No regression tests from crashes**: previous fuzz findings were fixed but the crashing input was not added to the test suite as a regression test -- the bug can silently reappear
- [ ] **Crash not linked to issue tracker**: security-relevant fuzz finding has no corresponding bug or security advisory -- track all fuzz-discovered vulnerabilities
- [ ] **Stale crash files**: crash reproduction files are older than 30 days without resolution -- set a triage SLA for fuzz findings

### Fuzzer Configuration
<!-- activation: keywords=["config", "timeout", "memory", "limit", "sanitizer", "asan", "msan", "ubsan", "coverage", "instrument", "runs", "max_len"] -->

- [ ] **No sanitizers**: fuzz target compiles without AddressSanitizer (ASan), MemorySanitizer (MSan), or UndefinedBehaviorSanitizer (UBSan) -- sanitizers are essential for detecting memory bugs that do not cause immediate crashes
- [ ] **No timeout**: fuzz target has no per-input timeout configured -- a single input that triggers an infinite loop hangs the fuzzer and CI
- [ ] **No memory limit**: fuzz target has no RSS limit -- a single input that triggers exponential allocation OOM-kills the CI machine
- [ ] **Max input length not set**: fuzz target accepts arbitrarily long inputs -- set max_len to a reasonable upper bound for the function being tested
- [ ] **State leakage between iterations**: fuzz harness accumulates state (file handles, memory, connections) across iterations without reset -- this causes OOM and resource exhaustion in long runs

### CI and Continuous Fuzzing
<!-- activation: keywords=["ci", "oss-fuzz", "clusterfuzz", "cifuzz", "continuous", "schedule", "nightly", "pipeline"] -->

- [ ] **Not in CI**: fuzz targets exist but are not executed in any CI pipeline -- they provide no ongoing protection
- [ ] **No continuous fuzzing**: fuzz targets run only for a fixed short duration in CI (e.g., 30 seconds) -- supplement with continuous fuzzing (OSS-Fuzz, ClusterFuzz, or nightly long-running jobs)
- [ ] **Fuzz target does not build**: fuzz target compiles locally but fails in CI due to missing dependencies or platform differences -- ensure fuzz targets are part of the CI build matrix
- [ ] **No coverage tracking**: fuzzing runs do not track code coverage -- coverage-guided fuzzing requires instrumentation; verify coverage is increasing over time

## Common False Positives

- **High-level API wrappers**: thin wrappers around well-fuzzed libraries (e.g., calling `json.Unmarshal` from Go's stdlib) do not need separate fuzz targets unless they add custom post-processing.
- **Test-only parsers**: parsers used only in test utilities to parse test fixtures do not process untrusted input and do not need fuzzing.
- **Already covered by OSS-Fuzz**: if the project is registered with OSS-Fuzz and the function is already a fuzz target there, a duplicate local target is unnecessary.
- **Trivial validators**: a function that checks `len(s) < 100` does not need a fuzz target. Reserve fuzzing for complex input processing.

## Severity Guidance

| Finding | Severity |
|---|---|
| Parser/deserializer for untrusted network input has no fuzz target | Critical |
| Fuzz-discovered crash not triaged or fixed after 30 days | Critical |
| Fuzz target catches all exceptions, masking real crashes | Important |
| Fuzz target has no sanitizers enabled (ASan, MSan, UBSan) | Important |
| Empty seed corpus for a complex parser fuzz target | Important |
| Fuzz target not integrated into CI or continuous fuzzing | Important |
| Corpus not minimized or version-controlled | Minor |
| No dictionary file for text-format fuzzer | Minor |
| Max input length not configured | Minor |

## See Also

- `test-property-based` -- property-based testing is complementary to fuzzing; properties verify logical correctness while fuzzing finds crashes
- `principle-fail-fast` -- fuzz targets that catch all exceptions violate fail-fast by hiding crashes
- `principle-separation-of-concerns` -- fuzz targets should call the pure parsing function, not the full I/O pipeline
- `antipattern-flaky-non-deterministic-tests` -- fuzz tests with unmanaged seeds create irreproducible failures

## Authoritative References

- [Google OSS-Fuzz -- continuous fuzzing for open source projects](https://google.github.io/oss-fuzz/)
- [LLVM libFuzzer -- coverage-guided fuzzing for C/C++](https://llvm.org/docs/LibFuzzer.html)
- [Go Fuzzing -- native fuzz testing since Go 1.18](https://go.dev/doc/security/fuzz/)
- [Jazzer -- coverage-guided fuzzing for JVM languages](https://github.com/CodeIntelligenceTesting/jazzer)
- [Michal Zalewski, *The Tangled Web* (2012) and AFL documentation](https://lcamtuf.coredump.cx/afl/)
