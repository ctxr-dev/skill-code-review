---
id: lang-cpp
type: primary
depth_role: leaf
focus: "C++ correctness, memory safety, modern idioms (C++17/20/23), and undefined behavior prevention"
parents:
  - index.md
covers:
  - RAII and deterministic resource management
  - "Rule of 0/3/5 compliance for special member functions"
  - Move semantics correctness and forwarding
  - "Smart pointer usage — no raw new/delete"
  - Const-correctness on parameters, members, and methods
  - Undefined behavior traps — signed overflow, aliasing, lifetime
  - "constexpr/consteval usage and compile-time computation"
  - "Template vs concepts constraint clarity (C++20)"
  - STL algorithm preference over raw loops
  - "Exception safety guarantees (basic, strong, nothrow)"
  - Header hygiene and include-what-you-use
tags:
  - cpp
  - c++
  - modern-cpp
  - memory-safety
  - raii
  - ub
  - templates
  - concurrency
activation:
  file_globs:
    - "**/*.cpp"
    - "**/*.cxx"
    - "**/*.cc"
    - "**/*.hpp"
    - "**/*.hxx"
    - "**/*.h"
  structural_signals:
    - C++ source or header files in diff
source:
  origin: file
  path: lang-cpp.md
  hash: "sha256:3e6eb4543f0608e93a6f53d5d61094f7a1685ee38c90a020011307baec53c689"
---
# C++ Quality Reviewer

## When This Activates

Activates when the diff contains `.cpp`, `.cxx`, `.cc`, `.hpp`, `.hxx`, or `.h` files. Applies modern C++ standards (C++17/20/23) unless the project explicitly targets an older standard. Focuses on memory safety, undefined behavior prevention, and idiomatic modern C++.

## Audit Surface

- [ ] Every owning resource wrapped in RAII (unique_ptr, shared_ptr, lock_guard, fstream)
- [ ] No raw `new`/`delete` outside allocator or placement-new contexts
- [ ] Rule of 0 preferred; if any special member declared, all five present
- [ ] Move constructors and move-assignment operators marked `noexcept`
- [ ] No implicit conversions via single-argument constructors missing `explicit`
- [ ] `const` on every parameter, local, and method that does not mutate
- [ ] No signed integer overflow, null dereference, use-after-move, dangling reference
- [ ] Templates constrained with `concepts` or `static_assert`, not SFINAE when C++20 available
- [ ] STL algorithms (`ranges::` preferred) over hand-rolled loops
- [ ] Includes minimal — no transitive-include reliance; forward declarations where possible
- [ ] Thread-shared data protected by `mutex`/`atomic` with correct memory ordering
- [ ] `string_view` for non-owning read-only string parameters
- [ ] No C-style casts — use `static_cast`/`const_cast`/`reinterpret_cast`
- [ ] No macro where `constexpr`, `inline`, or template suffices
- [ ] Exception safety documented; strong guarantee on transactional operations

## Detailed Checks

### Ownership and RAII
<!-- activation: keywords=["unique_ptr", "shared_ptr", "new", "delete", "malloc", "free", "RAII"] -->

- [ ] Every heap allocation has a single, clear owner via `unique_ptr` or equivalent RAII wrapper
- [ ] `shared_ptr` used only when genuinely shared ownership exists — not as a lazy default
- [ ] No `shared_ptr` cycles — break with `weak_ptr` where back-references exist
- [ ] `make_unique` / `make_shared` preferred over raw `new` + constructor
- [ ] Custom deleters specified when resource cleanup differs from `delete` (e.g., `fclose`, C API handles)
- [ ] No raw `delete` — if manual deallocation needed, it lives inside a RAII wrapper's destructor
- [ ] Factory functions return `unique_ptr`, not raw pointers
- [ ] No `release()` on smart pointer without immediate transfer to another owner

### Rule of 0/3/5 and Special Members
<!-- activation: keywords=["destructor", "copy", "move", "operator=", "~"] -->

- [ ] Classes that manage no resources follow Rule of 0 — no declared destructor, copy, or move
- [ ] If destructor declared, copy constructor + copy assignment also declared or `= delete`
- [ ] If any copy/move operation declared, all five special members addressed (Rule of 5)
- [ ] Move constructor and move-assignment are `noexcept` — required for `vector` reallocation efficiency
- [ ] Moved-from objects left in a valid but unspecified state — no double-free or dangling pointers
- [ ] Base class destructors are `virtual` when the class is intended for polymorphic use
- [ ] Copy assignment uses copy-and-swap idiom or equivalent for strong exception safety
- [ ] Slicing prevented — passing polymorphic objects by reference/pointer, not by value

### Const-Correctness and Type Safety
<!-- activation: keywords=["const", "mutable", "cast", "reinterpret_cast", "static_cast"] -->

- [ ] Method parameters passed by `const&` unless small/trivial (pass by value) or mutation needed
- [ ] Member functions that do not modify state are `const`-qualified
- [ ] `mutable` used only for caches/locks, never to work around const — documented when present
- [ ] No `const_cast` to strip const and then mutate — undefined behavior if original was const
- [ ] `reinterpret_cast` isolated to well-documented boundaries (serialization, hardware registers)
- [ ] `static_cast` used for numeric conversions — narrowing conversions flagged or guarded
- [ ] No `(C-style)` casts which bypass access control and combine dangerous cast types silently
- [ ] `auto` used judiciously — not on numeric types where the deduced type is ambiguous
- [ ] `enum class` preferred over plain `enum` to prevent implicit integral conversions

### Undefined Behavior Prevention
<!-- activation: keywords=["undefined", "overflow", "null", "dangling", "aliasing", "lifetime"] -->

- [ ] Signed integer arithmetic checked for overflow (use unsigned or safe-integer library in hot paths)
- [ ] No pointer dereference without null check on fallible paths (or use `optional`/`expected`)
- [ ] No use of objects after `std::move` — moved-from variables not read until reassigned
- [ ] Returning reference/pointer to local variable — compiler warns, but verify in lambdas and coroutines
- [ ] Strict aliasing not violated — no `reinterpret_cast` between unrelated types for type-punning (use `memcpy` or `bit_cast`)
- [ ] No reads of uninitialized variables — prefer initialization at declaration
- [ ] Iterator invalidation checked — no mutation of container while iterating (erase-remove idiom)
- [ ] `std::variant` access uses `std::visit` or `get_if`, not unchecked `std::get`
- [ ] Sequence points and evaluation order correct — no `i = i++` style expressions

### Templates and Concepts
<!-- activation: keywords=["template", "concept", "requires", "constexpr", "consteval", "SFINAE"] -->

- [ ] C++20 concepts used for template constraints instead of SFINAE `enable_if` patterns
- [ ] Concepts named after semantic requirements (`Hashable`, `Serializable`), not syntax (`HasFoo`)
- [ ] `constexpr` on every function that can be compile-time evaluated
- [ ] `consteval` for functions that must only run at compile time (no runtime fallback)
- [ ] `if constexpr` used for compile-time branching instead of tag-dispatch or specialization
- [ ] Template error messages tested — verify that constraint violations produce readable diagnostics
- [ ] No template code in `.cpp` files unless explicitly instantiated — keep in headers
- [ ] Variadic templates use fold expressions (C++17) over recursive unpacking

### Concurrency and Thread Safety
<!-- activation: keywords=["mutex", "thread", "atomic", "lock", "async", "future", "condition_variable"] -->

- [ ] Every shared mutable variable protected by `mutex` or `atomic` — document which mutex guards which data
- [ ] `std::lock_guard` / `std::scoped_lock` used — no manual `lock()`/`unlock()` calls
- [ ] `std::scoped_lock` used when locking multiple mutexes to prevent deadlock
- [ ] `std::atomic` memory ordering explicit — `memory_order_relaxed` only with documented justification
- [ ] `std::condition_variable` wait uses a predicate to guard against spurious wakeups
- [ ] `std::async` launch policy specified — `std::launch::async` vs `std::launch::deferred` explicit
- [ ] No data races on `std::shared_ptr` reference count (safe) vs pointed-to object (not safe)
- [ ] Thread joins or detaches before `std::thread` destructor — uncaught `std::terminate` otherwise
- [ ] `std::jthread` preferred over `std::thread` for automatic join and stop-token support (C++20)

### Performance Patterns
<!-- activation: keywords=["vector", "string", "move", "reserve", "emplace", "cache", "allocat"] -->

- [ ] `std::vector::reserve()` called when final size known — avoids repeated reallocations
- [ ] `emplace_back` used instead of `push_back` when constructing in-place
- [ ] Move semantics exploited — large objects moved, not copied, into containers and return values
- [ ] `string_view` for read-only string parameters; no `const string&` if caller may have a literal
- [ ] Small Buffer Optimization considered — `std::string`, `std::function` fit small-object threshold
- [ ] Hot loops avoid allocations — preallocate buffers, use stack-local arrays, or arenas
- [ ] `std::sort` / `ranges::sort` over hand-rolled sorts; correct comparator (strict weak ordering)
- [ ] No premature `std::unordered_map` — measure hash quality and load factor vs `std::map` for small N

### Build and Header Hygiene
<!-- activation: file_globs=["**/*.h", "**/*.hpp", "**/CMakeLists.txt", "**/*.cmake"] -->

- [ ] `#pragma once` or include guards present on every header
- [ ] Includes follow IWYU (include-what-you-use) — no reliance on transitive includes
- [ ] Forward declarations used in headers for pointer/reference-only dependencies
- [ ] No definitions (non-inline functions, non-template globals) in headers — ODR violations
- [ ] CMake targets use `target_link_libraries` with `PRIVATE`/`PUBLIC`/`INTERFACE` correctly
- [ ] Compiler warnings enabled (`-Wall -Wextra -Wpedantic`) and treated as errors in CI
- [ ] No `using namespace std;` in headers — pollutes every includer's namespace
- [ ] Precompiled headers or modules used where build time is a concern

## Common False Positives

- **`auto` usage in range-for loops** — `auto&` / `const auto&` in range-for is idiomatic, not a type-erasure concern
- **`shared_ptr` in API boundaries** — shared ownership is valid at module boundaries with documented lifetime contracts
- **Raw pointers as non-owning observers** — raw `T*` is correct for non-owning access; only owning pointers need smart wrappers
- **`reinterpret_cast` in serialization** — casting to `char*`/`std::byte*` for binary I/O is defined behavior
- **`mutable` on mutexes** — a `mutable std::mutex` inside a const method is the standard pattern for thread-safe const access
- **`std::move` on return** — NRVO handles this; explicit move on `return` can actually pessimize by preventing copy elision

## Severity Guidance

| Finding | Severity |
|---------|----------|
| Use-after-move, dangling reference, UB | Critical |
| Raw `new`/`delete` without RAII wrapper | Critical |
| Data race on shared mutable state | Critical |
| Missing `virtual` destructor on polymorphic base | Critical |
| Missing `noexcept` on move operations | Important |
| Rule of 5 violation (incomplete special members) | Important |
| Signed integer overflow in arithmetic | Important |
| C-style cast in new code | Important |
| Iterator invalidation risk | Important |
| Missing `const` on non-mutating method | Minor |
| `push_back` where `emplace_back` fits | Minor |
| `using namespace std;` in .cpp file | Minor |
| Missing `reserve()` on known-size vector | Minor |

## See Also

- `language-quality` — universal type-system and resource checks
- `performance` — cross-language performance review
- `security` — buffer overflow and injection concerns
- `concurrency-async` — cross-language concurrency patterns

## Authoritative References

- [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines)
- [cppreference.com](https://en.cppreference.com/)
- [Effective Modern C++ — Scott Meyers](https://www.oreilly.com/library/view/effective-modern-c/9781491908419/)
- [C++20 Concepts Reference](https://en.cppreference.com/w/cpp/language/constraints)
- [CERT C++ Coding Standard](https://wiki.sei.cmu.edu/confluence/pages/viewpage.action?pageId=88046682)
- [AddressSanitizer Documentation](https://clang.llvm.org/docs/AddressSanitizer.html)
