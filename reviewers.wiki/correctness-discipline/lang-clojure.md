---
id: lang-clojure
type: primary
depth_role: leaf
focus: "Catch correctness, concurrency, and interop bugs in Clojure/ClojureScript diffs"
parents:
  - index.md
covers:
  - "Persistent data structure misuse (transient leaks, incorrect structural sharing assumptions)"
  - "Lazy sequence realization pitfalls (chunking surprises, holding head, unrealized side effects)"
  - "Concurrency primitive discipline (atom swap! retries, ref dosync consistency, agent error handling)"
  - core.async channel leaks, blocking in go blocks, deadlock patterns
  - spec validation coverage and generative test integration
  - Java interop type-hint discipline and reflection warnings
  - "Namespace hygiene (circular deps, refer-all abuse, require vs use)"
  - Transducer composition correctness and stateful transducer lifecycle
  - Protocol and multimethod dispatch correctness
  - REPL-driven development artifacts left in production code
  - "Macro hygiene (gensym, unquote-splice safety, inadvertent capture)"
tags:
  - jvm
  - functional
  - lisp
  - concurrency
  - persistent-data-structures
  - repl
activation:
  file_globs:
    - "**/*.clj"
    - "**/*.cljs"
    - "**/*.cljc"
    - "**/*.edn"
    - "**/deps.edn"
    - "**/project.clj"
  structural_signals:
    - Clojure source files or EDN configuration in diff
    - deps.edn or project.clj dependency changes
    - core.async require or channel operations
source:
  origin: file
  path: lang-clojure.md
  hash: "sha256:367b0ebb612d2838f196d0160f46458f150b1e7664c13568040a22da9cc3990d"
---
# Clojure Quality Reviewer

## When This Activates

Activated when the diff contains `.clj`, `.cljs`, `.cljc`, or `.edn` files, or when `deps.edn`/`project.clj` dependency manifests are modified. Covers both Clojure (JVM) and ClojureScript targets.

## Audit Surface

- [ ] `swap!` / `reset!` body contains side effects that will misbehave on CAS retry
- [ ] Lazy sequence holds head reference, risking OOM on large or infinite seqs
- [ ] `go` block contains blocking I/O (`<!!`, `>!!`, `Thread/sleep`, JDBC calls) — use `thread` instead
- [ ] Java interop calls missing type hints, causing reflective access (check `*warn-on-reflection*`)
- [ ] Transient collection escapes its creating thread or is used after `persistent!`
- [ ] `dosync` transaction body performs I/O or non-idempotent side effects
- [ ] Namespace graph contains circular dependencies
- [ ] `spec/fdef` missing for public-facing functions; no generative tests for complex specs
- [ ] Macro introduces symbol capture — `gensym` or auto-gensym (`name#`) not used
- [ ] core.async channel opened but never closed, or `go-loop` has no exit condition
- [ ] `reduce` relies on ordering over a hash map (iteration order not guaranteed)
- [ ] Unchecked `.method` call on interop without `^Type` hint causes `ClassCastException` at runtime
- [ ] `def` or `defonce` inside `defn` — creates/clobbers a global var on every invocation
- [ ] Dynamic var bindings not conveyed via `bound-fn` or `binding-conveyor-fn` when crossing thread boundaries
- [ ] Dependency versions unpinned or using `RELEASE`/`LATEST` in project.clj

## Detailed Checks

### Persistent Data Structures and Transients
<!-- activation: keywords=["transient", "persistent!", "assoc!", "conj!", "pop!", "into"] -->

- [ ] `transient` collections are only mutated in the thread that created them — they are not thread-safe
- [ ] Every `transient` eventually calls `persistent!` — the transient is not returned or stored beyond local scope
- [ ] After `persistent!`, the transient reference is never used again (undefined behavior in the Clojure runtime)
- [ ] `assoc!`, `conj!`, `pop!` return value is used — the original transient binding may be stale after internal resize; always rebind: `(let [t (transient []) t (conj! t 1)] ...)`
- [ ] `into` with large colls leverages transients implicitly — no manual transient code needed
- [ ] Structural sharing assumptions are correct: `assoc` on a vector produces a new root, the old vector is unchanged
- [ ] Large persistent map construction uses `transient` + `persistent!` instead of repeated `assoc` in a loop — fold or `into` preferred
- [ ] `subvec` returns a view sharing structure with the original — mutations to transient derived from subvec are undefined
- [ ] Sorted collections (`sorted-map`, `sorted-set`) use consistent comparators — incompatible comparators cause `ClassCastException`
- [ ] `hash-map` with mutable Java objects as keys: mutation after insertion corrupts the map because hash codes change

### Lazy Sequences and Realization
<!-- activation: keywords=["lazy-seq", "map", "filter", "take", "iterate", "range", "concat", "doall", "dorun"] -->

- [ ] Lazy seq is not held at the head while processing (e.g., `(let [s (range 1e9)] (last s))` holds head and OOMs)
- [ ] Side-effectful operations in `map`/`filter` are not relied upon — use `run!` or `doseq` instead for side effects
- [ ] Chunked lazy seq behavior is understood: `map` over a vector processes 32 elements at a time, which means side effects fire in batches not one-at-a-time
- [ ] `concat` of many lazy seqs does not build deeply nested thunks (StackOverflowError risk) — use `into` or `mapcat`
- [ ] Infinite lazy seq has a consumer that takes a finite prefix (`take`, `take-while`) — otherwise the REPL will try to print forever
- [ ] `doall` / `dorun` is used when lazy seq must be fully realized before leaving a resource scope (e.g., `with-open` around JDBC result set)
- [ ] `realized?` is not used for control flow — it only reports current state, not whether realization will succeed
- [ ] Lazy seq returned from `with-open` body: the resource closes before the seq is realized by the caller — wrap in `doall` or use a callback
- [ ] `repeatedly` and `iterate` produce infinite seqs — ensure callers always bound consumption
- [ ] `for` list comprehension is lazy — if the body has side effects, use `doseq` instead
- [ ] `sequence` with a transducer produces a lazy seq but the transducer's `init`/`completion` lifecycle is honored — verify stateful transducers (partition-by, distinct) flush correctly

### Concurrency Primitives (Atoms, Refs, Agents)
<!-- activation: keywords=["atom", "swap!", "reset!", "ref", "dosync", "alter", "commute", "agent", "send", "send-off"] -->

- [ ] `swap!` function is pure — side effects will execute multiple times on CAS contention; this includes logging, metrics emission, and network calls
- [ ] `compare-and-set!` is preferred over `swap!` when the update depends on external state that must be checked atomically
- [ ] `dosync` transactions do not contain I/O — wrap I/O in an `io!` block to detect violations early; `io!` throws if called inside a transaction
- [ ] `commute` is only used when the function is truly commutative (result is same regardless of interleaving); otherwise use `alter` for ordered execution
- [ ] `ref` validators are pure functions — they run inside the transaction and may retry; a validator that throws prevents the transaction from committing
- [ ] `agent` error handler is set via `set-error-handler!` — without it, a failed agent silently stops processing all subsequent sends
- [ ] `send` (fixed thread pool) vs `send-off` (unbounded pool): I/O-bound operations use `send-off` to avoid starving CPU-bound `send` tasks
- [ ] `await` / `await-for` is used after agent sends when subsequent code depends on agent state — but `await` cannot be called inside a `dosync` transaction
- [ ] Atom watchers (`add-watch`) do not perform heavy computation — they run synchronously inside `swap!`, blocking all other swap attempts
- [ ] `volatile!` / `vswap!` used only for single-threaded mutable state (e.g., inside transducers) — not for cross-thread coordination
- [ ] `promise` / `deliver` used correctly: delivering to an already-delivered promise is a no-op (no error), which can hide bugs

### core.async Channels and Go Blocks
<!-- activation: keywords=["core.async", "go", "go-loop", "chan", "<!!", ">!!", "<!", ">!", "alts!", "put!", "take!", "pipeline", "mult", "pub", "sub"] -->

- [ ] `go` blocks do not call `<!!` or `>!!` (blocking ops) — these block the fixed go-block thread pool and cause starvation
- [ ] `go` blocks do not call blocking Java methods (JDBC, HTTP clients, `Thread/sleep`) — use `async/thread` which gets its own real thread
- [ ] Channels are closed when no longer needed — unclosed channels are resource leaks; producers close channels when done
- [ ] `go-loop` has a termination condition — typically `(when-let [v (<! ch)] ... (recur))` exits on channel close (nil return)
- [ ] `pipeline` / `pipeline-blocking` / `pipeline-async` parallelism is tuned appropriately; `pipeline-blocking` used for I/O-bound transforms
- [ ] `alts!` with `:default` is used intentionally — it makes the operation non-blocking and returns immediately if no channel is ready
- [ ] Backpressure is designed: buffer sizes are chosen deliberately; `sliding-buffer` and `dropping-buffer` explicitly discard when full
- [ ] `put!` callback (if provided) does not perform blocking work — it runs on the core.async dispatch thread
- [ ] `mult` channels: taps are registered before values are put — values put before `tap` are lost
- [ ] `pub`/`sub` topic functions are pure and fast — they run on the publishing thread for every message
- [ ] Exception inside `go` block is silently swallowed — the go block returns a channel containing the exception; callers must check

### Java Interop Discipline
<!-- activation: keywords=[".", "..", "proxy", "reify", "gen-class", "import", "doto", "bean", "Closeable"] -->

- [ ] `*warn-on-reflection*` is set to `true` in namespaces with interop — reflection access is 100x slower and breaks GraalVM native-image
- [ ] Type hints (`^String`, `^long`, `^"[B"`) are placed on the correct element: on the argument for parameter hints, on the expression for return hints
- [ ] `proxy` / `reify` correctly handles method overloading — Clojure dispatch is by arity only, not by parameter type; use type checks inside the method body
- [ ] `.close` on `Closeable` resources uses `with-open` to guarantee cleanup — bare `.close` in try/finally is acceptable but less idiomatic
- [ ] `gen-class` is only used when AOT is strictly required (Java callback interfaces, main entry points) — prefer `reify` for implementing interfaces
- [ ] Java array type hints use correct syntax: `^bytes`, `^ints`, `^longs`, `^doubles`, or `^"[Ljava.lang.String;"` for object arrays
- [ ] Exception handling uses `ex-info` / `ex-data` for Clojure-side errors to carry structured data, not bare `(throw (Exception. msg))`
- [ ] Interop null returns are checked — Clojure treats `nil` and Java `null` identically, but chaining `.method` on a nil return causes NPE
- [ ] `doto` macro used for Java builder patterns instead of deeply nested `(.method ...)` calls
- [ ] `bean` is used cautiously — it eagerly realizes all properties and may trigger lazy-loaded fields (e.g., Hibernate proxies)

### Macro Hygiene and Metaprogramming
<!-- activation: keywords=["defmacro", "macroexpand", "syntax-quote", "gensym", "quote", "~", "~@"] -->

- [ ] Generated symbols use `gensym` or auto-gensym suffix (`x#`) to prevent variable capture by surrounding code
- [ ] `macroexpand-1` / `macroexpand` used to verify expansion during development — expansion is tested, not just the final behavior
- [ ] Macro does not do work at expansion time that should happen at runtime — no surprise compile-time HTTP calls, file reads, or DB queries
- [ ] Double evaluation is avoided — macro args bound to a `let` gensym before use when an arg appears more than once in the expansion
- [ ] Unquote-splice (`~@`) on user-provided args is safe — verify that splicing a sequence into a function call position won't produce invalid forms
- [ ] Macro is justified: could a higher-order function achieve the same result? Macros are harder to compose, debug, and tooling-support
- [ ] Reader conditionals (`.cljc`) correctly gate platform-specific macro expansions — ClojureScript macros must be in `.clj` or `.cljc` files with `:clj` reader conditional
- [ ] `&env` and `&form` used intentionally — `&env` leaks compile-time locals which can break if the macro is used in unexpected contexts
- [ ] Recursive macros terminate — macroexpansion has no stack limit protection; infinite expansion hangs the compiler

### Namespace and Dependency Management
<!-- activation: file_globs=["**/deps.edn", "**/project.clj", "**/*.clj"], keywords=["ns", "require", "import", "refer"] -->

- [ ] No `(:use ...)` or `(:require [ns :refer :all])` — prefer explicit `:refer [fn1 fn2]` or qualified alias
- [ ] Namespace aliases are short but unambiguous — `[clojure.string :as str]` is idiomatic; avoid single-letter aliases for domain namespaces
- [ ] No circular namespace dependencies — causes compilation failures, load-order surprises, and makes REPL reload fragile
- [ ] `deps.edn` pins dependency versions via SHA (git deps) or exact version string (Maven) — no version ranges
- [ ] `project.clj` does not use version ranges, `RELEASE`, or `LATEST` — these cause non-reproducible builds
- [ ] AOT compilation list in `project.clj` is minimal — over-AOT causes stale .class files that shadow source changes
- [ ] Dev-only dependencies (nREPL, test runners, REBL) are in the `:dev` profile/alias, not main deps
- [ ] `:exclusions` used to prevent transitive dependency conflicts — `lein deps :tree` or `clj -Stree` checked for conflicts
- [ ] `ns` form follows canonical ordering: `:require`, `:import`, `:refer-clojure` — clj-kondo enforces this

### Testing and REPL Artifacts
<!-- activation: file_globs=["**/*_test.clj", "**/test/**/*.clj"], keywords=["deftest", "is", "testing", "are", "with-redefs"] -->

- [ ] `with-redefs` usage is understood to be thread-unsafe — it mutates root bindings globally, affecting all threads during the test window
- [ ] `deftest` names are descriptive and follow `<fn-name>-test` or `<behavior>-test` convention
- [ ] `is` assertions use specific predicates (`=`, `thrown?`, `thrown-with-msg?`, `instance?`) — bare truthy `(is expr)` hides what failed
- [ ] REPL convenience forms (`comment`, `tap>`, `println` debugging, `prn`) are not in production paths
- [ ] `def` at top level in test files does not shadow production vars — use unique names or namespace-qualified references
- [ ] Generative tests (`test.check`) have sufficient `num-tests` for the property complexity — default 100 is often too low for complex generators
- [ ] Test fixtures (`use-fixtures :once` / `:each`) clean up state — especially DB connections, temp files, and in-memory caches
- [ ] `are` template assertions are used for table-driven tests instead of repeated `is` blocks
- [ ] Integration tests use `test.check`'s `defspec` for property-based testing of stateful systems
- [ ] `with-redefs` is not used to mock functions that are inlined by the compiler (protocol methods, primitive-hinted fns)

## Common False Positives

- **`swap!` with logging**: A `swap!` function that logs before mutating looks side-effectful, but logging on retry is often acceptable if idempotent. Flag only if it performs destructive I/O (HTTP POST, DB write, message queue publish).
- **Lazy seq in small collections**: Head-holding on a `(range 100)` is harmless. Only flag when the seq could be large or unbounded, or when the collection size is data-dependent.
- **`def` at namespace top-level in test files**: Top-level `def` in test namespaces is normal for test fixtures and helper data — only flag `def` inside `defn` or `deftest`.
- **Unchecked interop on well-typed returns**: Calling `.length` on a `String` that is provably a String from context does not need a type hint, though adding one eliminates the reflection warning.
- **`core.async` unbuffered channels**: Zero-buffer (rendezvous) channels are intentional for synchronization — not every channel needs a buffer. Only flag when the intent appears to be buffered but the buffer is missing.
- **`comment` blocks at file bottom**: Rich comment blocks at the end of a file are a Clojure convention for REPL-driven development examples. They are excluded from compilation and are not production artifacts.

## Severity Guidance

| Finding | Severity |
|---------|----------|
| `swap!` with destructive side effects (HTTP, DB, queue) | Critical |
| Blocking I/O in `go` block (thread pool starvation) | Critical |
| Transient escaping scope / used after `persistent!` | Critical |
| Circular namespace dependency | Critical |
| Exception silently swallowed in `go` block | Critical |
| Macro symbol capture (no gensym) | Important |
| Head-holding on large/infinite lazy seq | Important |
| Missing type hints on hot-path interop (reflection) | Important |
| `dosync` with I/O side effects | Important |
| Unclosed core.async channel | Important |
| `with-redefs` in concurrent test (thread-safety) | Important |
| Lazy seq escaping `with-open` resource scope | Important |
| Agent without error handler | Minor |
| `(:require :refer :all)` usage | Minor |
| Missing `spec/fdef` on internal function | Minor |
| REPL artifacts (`comment` block) in source path | Minor |
| Non-canonical `ns` form ordering | Minor |

## See Also

- `lang-java` — Java interop conventions, JVM performance patterns
- `concern-concurrency` — General concurrency anti-patterns across languages
- `concern-error-handling` — Exception strategy and error propagation

## Authoritative References

- [Clojure Reference](https://clojure.org/reference) — Official language reference
- [Clojure Style Guide](https://guide.clojure.style/) — Community style conventions
- [core.async Guide](https://clojure.org/guides/async) — Official async programming guide
- [clj-kondo](https://github.com/clj-kondo/clj-kondo) — Static analysis tool documentation
- [Clojure Applied](https://pragprog.com/titles/vmclojeco/clojure-applied/) — Production patterns reference
- [clojure.spec Guide](https://clojure.org/guides/spec) — Specification and validation
- [Transducers Reference](https://clojure.org/reference/transducers) — Transducer model and lifecycle
