---
id: languages
type: index
depth_role: subcategory
depth: 1
focus: "languages: Catch correctness, concurrency, and interop bugs in Clojure/ClojureScript diffs; C++ correctness, memory safety, modern idioms (C++17/20/23), and undefined behavior prevention; Nullable reference types, async/await correctness..."
parents:
  - "../index.md"
shared_covers: []
tags:
  - actors
  - adts
  - apple
  - arc
  - arc-orc
  - async
  - async-await
  - automation
  - beam
  - bioinformatics
  - borrowing
  - browser
  - bundler
  - c++
  - cabal
  - cats-effect
  - channels
  - ci-cd
  - cocoa
  - comptime
generator: "skill-llm-wiki/v1"
entries:
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
  - id: lang-erlang
    file: lang-erlang.md
    type: primary
    focus: "Erlang/OTP correctness, supervision design, message passing discipline, and BEAM runtime safety"
    tags:
      - erlang
      - beam
      - otp
      - gen_server
      - supervision
      - distributed
      - message-passing
      - elixir
      - phoenix
      - ecto
      - genserver
      - functional
  - id: lang-fsharp
    file: lang-fsharp.md
    type: primary
    focus: "F# idioms, type safety, computation expressions, async workflows, and functional-first correctness"
    tags:
      - fsharp
      - dotnet
      - functional
      - ml-family
      - discriminated-unions
      - computation-expressions
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
  - id: lang-haskell
    file: lang-haskell.md
    type: primary
    focus: Haskell correctness, purity, laziness safety, type-driven design, and ecosystem idioms
    tags:
      - haskell
      - functional
      - purity
      - laziness
      - types
      - monads
      - ghc
      - cabal
      - stack
  - id: lang-java
    file: lang-java.md
    type: primary
    focus: "Nullability, resource management, modern Java idioms (records, sealed classes, virtual threads), and type safety"
    tags:
      - java
      - nullability
      - streams
      - records
      - sealed-classes
      - virtual-threads
      - optional
      - serialization
      - kotlin
      - coroutines
      - flow
      - null-safety
      - scope-functions
      - data-classes
      - java-interop
  - id: lang-javascript
    file: lang-javascript.md
    type: primary
    focus: Catch JavaScript-specific bugs, runtime pitfalls, and async anti-patterns in diffs
    tags:
      - javascript
      - async
      - promises
      - node
      - browser
      - event-loop
      - security
  - id: lang-julia
    file: lang-julia.md
    type: primary
    focus: Catch type stability, dispatch, and performance bugs in Julia code
    tags:
      - scientific-computing
      - numerical
      - high-performance
      - jit
      - multiple-dispatch
      - hpc
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
  - id: lang-nim
    file: lang-nim.md
    type: primary
    focus: Catch memory management bugs, macro misuse, and non-idiomatic patterns in Nim code
    tags:
      - nim
      - systems
      - memory-management
      - arc-orc
      - metaprogramming
  - id: lang-objective-c
    file: lang-objective-c.md
    type: primary
    focus: Objective-C correctness, ARC memory management, Apple framework idioms, and modern syntax adoption
    tags:
      - objective-c
      - objc
      - ios
      - macos
      - apple
      - arc
      - memory-management
      - cocoa
  - id: lang-powershell
    file: lang-powershell.md
    type: primary
    focus: Catch pipeline errors, security anti-patterns, and non-idiomatic patterns in PowerShell code
    tags:
      - powershell
      - windows
      - devops
      - automation
      - scripting
      - security
  - id: lang-python
    file: lang-python.md
    type: primary
    focus: Catch Python-specific bugs, anti-patterns, type errors, and security pitfalls in diffs
    tags:
      - python
      - typing
      - async
      - security
      - packaging
  - id: lang-r
    file: lang-r.md
    type: primary
    focus: Catch correctness, reproducibility, and performance bugs in R code
    tags:
      - statistics
      - data-science
      - tidyverse
      - cran
      - reproducibility
      - bioinformatics
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
  - id: lang-rust
    file: lang-rust.md
    type: primary
    focus: Ownership, borrowing, lifetimes, error handling, unsafe usage, and idiomatic Rust patterns
    tags:
      - rust
      - ownership
      - borrowing
      - lifetimes
      - unsafe
      - async
      - tokio
      - traits
      - error-handling
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
  - id: lang-sql
    file: lang-sql.md
    type: primary
    focus: Catch correctness, security, and performance bugs in SQL queries and schema changes
    tags:
      - database
      - queries
      - schema
      - migrations
      - performance
      - injection
  - id: lang-swift
    file: lang-swift.md
    type: primary
    focus: Catch Swift-specific bugs, memory management issues, concurrency errors, and protocol misuse in diffs
    tags:
      - swift
      - ios
      - macos
      - concurrency
      - actors
      - arc
      - protocols
      - swiftui
  - id: lang-typescript
    file: lang-typescript.md
    type: primary
    focus: Catch TypeScript type-system misuse, unsound patterns, and any-leaks in diffs
    tags:
      - typescript
      - types
      - generics
      - strict-mode
      - narrowing
      - discriminated-unions
  - id: lang-zig
    file: lang-zig.md
    type: primary
    focus: Catch memory safety, comptime misuse, and non-idiomatic patterns in Zig code
    tags:
      - zig
      - systems
      - comptime
      - memory-safety
      - low-level
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Languages

**Focus:** languages: Catch correctness, concurrency, and interop bugs in Clojure/ClojureScript diffs; C++ correctness, memory safety, modern idioms (C++17/20/23), and undefined behavior prevention; Nullable reference types, async/await correctness...

## Children

| File | Type | Focus |
|------|------|-------|
| [lang-clojure.md](lang-clojure.md) | 📄 primary | Catch correctness, concurrency, and interop bugs in Clojure/ClojureScript diffs |
| [lang-cpp.md](lang-cpp.md) | 📄 primary | C++ correctness, memory safety, modern idioms (C++17/20/23), and undefined behavior prevention |
| [lang-csharp.md](lang-csharp.md) | 📄 primary | Nullable reference types, async/await correctness, IDisposable discipline, records, Span<T>, and modern C# patterns |
| [lang-erlang.md](lang-erlang.md) | 📄 primary | Erlang/OTP correctness, supervision design, message passing discipline, and BEAM runtime safety |
| [lang-fsharp.md](lang-fsharp.md) | 📄 primary | F# idioms, type safety, computation expressions, async workflows, and functional-first correctness |
| [lang-go.md](lang-go.md) | 📄 primary | Catch Go-specific bugs, concurrency errors, error handling anti-patterns, and interface misuse in diffs |
| [lang-haskell.md](lang-haskell.md) | 📄 primary | Haskell correctness, purity, laziness safety, type-driven design, and ecosystem idioms |
| [lang-java.md](lang-java.md) | 📄 primary | Nullability, resource management, modern Java idioms (records, sealed classes, virtual threads), and type safety |
| [lang-javascript.md](lang-javascript.md) | 📄 primary | Catch JavaScript-specific bugs, runtime pitfalls, and async anti-patterns in diffs |
| [lang-julia.md](lang-julia.md) | 📄 primary | Catch type stability, dispatch, and performance bugs in Julia code |
| [lang-lua.md](lang-lua.md) | 📄 primary | Catch nil pitfalls, global leaks, metatable misuse, and non-idiomatic patterns in Lua code |
| [lang-nim.md](lang-nim.md) | 📄 primary | Catch memory management bugs, macro misuse, and non-idiomatic patterns in Nim code |
| [lang-objective-c.md](lang-objective-c.md) | 📄 primary | Objective-C correctness, ARC memory management, Apple framework idioms, and modern syntax adoption |
| [lang-powershell.md](lang-powershell.md) | 📄 primary | Catch pipeline errors, security anti-patterns, and non-idiomatic patterns in PowerShell code |
| [lang-python.md](lang-python.md) | 📄 primary | Catch Python-specific bugs, anti-patterns, type errors, and security pitfalls in diffs |
| [lang-r.md](lang-r.md) | 📄 primary | Catch correctness, reproducibility, and performance bugs in R code |
| [lang-ruby.md](lang-ruby.md) | 📄 primary | Ruby idioms, metaprogramming discipline, type safety via Sorbet/RBS, and secure coding practices |
| [lang-rust.md](lang-rust.md) | 📄 primary | Ownership, borrowing, lifetimes, error handling, unsafe usage, and idiomatic Rust patterns |
| [lang-scala.md](lang-scala.md) | 📄 primary | Sealed ADTs, Option/Either discipline, effect systems (Cats Effect, ZIO), implicits/givens, and immutable-first Scala idioms |
| [lang-shell-bash.md](lang-shell-bash.md) | 📄 primary | Catch correctness, portability, and security bugs in shell and Bash scripts |
| [lang-sql.md](lang-sql.md) | 📄 primary | Catch correctness, security, and performance bugs in SQL queries and schema changes |
| [lang-swift.md](lang-swift.md) | 📄 primary | Catch Swift-specific bugs, memory management issues, concurrency errors, and protocol misuse in diffs |
| [lang-typescript.md](lang-typescript.md) | 📄 primary | Catch TypeScript type-system misuse, unsound patterns, and any-leaks in diffs |
| [lang-zig.md](lang-zig.md) | 📄 primary | Catch memory safety, comptime misuse, and non-idiomatic patterns in Zig code |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
