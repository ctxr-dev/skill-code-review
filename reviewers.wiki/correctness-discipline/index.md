---
id: correctness-discipline
type: index
depth_role: subcategory
depth: 1
focus: "Array handling vs string-splitting pitfalls; Block, proc, and lambda semantics — correct yield, arity, and return behavior; Callback hell (deeply nested callbacks) where async/await or futures would be clearer; Channel usage patterns and deadlock risks"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: conc-futures-promises
    file: conc-futures-promises.md
    type: primary
    focus: Detect unhandled rejections, unconsumed future results, error-swallowing promise chains, and callback-to-async migration issues.
    tags:
      - futures
      - promises
      - async-await
      - CompletableFuture
      - Task
      - unhandled-rejection
      - concurrency
  - id: lang-clojure
    file: lang-clojure.md
    type: primary
    focus: "Catch correctness, concurrency, and interop bugs in Clojure/ClojureScript diffs"
    tags:
      - jvm
      - functional
      - lisp
      - concurrency
      - persistent-data-structures
      - repl
  - id: lang-cpp
    file: lang-cpp.md
    type: primary
    focus: "C++ correctness, memory safety, modern idioms (C++17/20/23), and undefined behavior prevention"
    tags:
      - cpp
      - c++
      - modern-cpp
      - memory-safety
      - raii
      - ub
      - templates
      - concurrency
  - id: lang-csharp
    file: lang-csharp.md
    type: primary
    focus: "Nullable reference types, async/await correctness, IDisposable discipline, records, Span<T>, and modern C# patterns"
    tags:
      - csharp
      - dotnet
      - async-await
      - nullable
      - disposable
      - records
      - span
      - linq
      - pattern-matching
  - id: lang-go
    file: lang-go.md
    type: primary
    focus: Catch Go-specific bugs, concurrency errors, error handling anti-patterns, and interface misuse in diffs
    tags:
      - go
      - concurrency
      - goroutines
      - channels
      - error-handling
      - context
      - interfaces
  - id: lang-lua
    file: lang-lua.md
    type: primary
    focus: Catch nil pitfalls, global leaks, metatable misuse, and non-idiomatic patterns in Lua code
    tags:
      - lua
      - scripting
      - embedding
      - metatables
      - coroutines
      - luajit
  - id: lang-ruby
    file: lang-ruby.md
    type: primary
    focus: "Ruby idioms, metaprogramming discipline, type safety via Sorbet/RBS, and secure coding practices"
    tags:
      - ruby
      - rails
      - sorbet
      - rbs
      - metaprogramming
      - gems
      - bundler
  - id: lang-scala
    file: lang-scala.md
    type: primary
    focus: "Sealed ADTs, Option/Either discipline, effect systems (Cats Effect, ZIO), implicits/givens, and immutable-first Scala idioms"
    tags:
      - scala
      - cats-effect
      - zio
      - adts
      - implicits
      - givens
      - option
      - either
      - effect-systems
      - functional
  - id: lang-shell-bash
    file: lang-shell-bash.md
    type: primary
    focus: Catch correctness, portability, and security bugs in shell and Bash scripts
    tags:
      - shell
      - scripting
      - posix
      - devops
      - ci-cd
      - automation
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Correctness Discipline

**Focus:** Array handling vs string-splitting pitfalls; Block, proc, and lambda semantics — correct yield, arity, and return behavior; Callback hell (deeply nested callbacks) where async/await or futures would be clearer; Channel usage patterns and deadlock risks

## Children

| File | Type | Focus |
|------|------|-------|
| [conc-futures-promises.md](conc-futures-promises.md) | 📄 primary | Detect unhandled rejections, unconsumed future results, error-swallowing promise chains, and callback-to-async migration issues. |
| [lang-clojure.md](lang-clojure.md) | 📄 primary | Catch correctness, concurrency, and interop bugs in Clojure/ClojureScript diffs |
| [lang-cpp.md](lang-cpp.md) | 📄 primary | C++ correctness, memory safety, modern idioms (C++17/20/23), and undefined behavior prevention |
| [lang-csharp.md](lang-csharp.md) | 📄 primary | Nullable reference types, async/await correctness, IDisposable discipline, records, Span<T>, and modern C# patterns |
| [lang-go.md](lang-go.md) | 📄 primary | Catch Go-specific bugs, concurrency errors, error handling anti-patterns, and interface misuse in diffs |
| [lang-lua.md](lang-lua.md) | 📄 primary | Catch nil pitfalls, global leaks, metatable misuse, and non-idiomatic patterns in Lua code |
| [lang-ruby.md](lang-ruby.md) | 📄 primary | Ruby idioms, metaprogramming discipline, type safety via Sorbet/RBS, and secure coding practices |
| [lang-scala.md](lang-scala.md) | 📄 primary | Sealed ADTs, Option/Either discipline, effect systems (Cats Effect, ZIO), implicits/givens, and immutable-first Scala idioms |
| [lang-shell-bash.md](lang-shell-bash.md) | 📄 primary | Catch correctness, portability, and security bugs in shell and Bash scripts |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
