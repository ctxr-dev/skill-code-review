---
id: footgun-unintended-recursion
type: primary
depth_role: leaf
focus: "Detect unintended or unbounded recursion and re-entrancy where a function, wrapper, getter, or cache calls its own entry point (self/this/super/public API) instead of the inner delegate, or recurses with no progress toward a base case"
parents:
  - index.md
covers:
  - Function or method that calls itself directly with no base case or no progress toward one
  - Mutual recursion A calls B calls A with no terminating condition on the cycle
  - "Wrapper, proxy, or adapter that calls its own public API (self/this) instead of the wrapped delegate"
  - Cache or memoizer whose miss path re-enters the same cache-fronting entry point, recursing forever
  - "Decorator that invokes the decorated name (now bound to the decorator) instead of the original target"
  - Property getter that reads the same property it defines, or setter that writes the same property
  - "__getattr__ / __getattribute__ that touches the same attribute it intercepts"
  - "toString / equals / hashCode / __repr__ that references self in a way that re-enters the same method"
  - "Operator overload (__eq__, __add__, operator==) that delegates back to itself"
  - super call that targets the wrong type, looping back into the same override
  - Re-entrant lock acquisition or event handler that re-triggers the event it handles
  - Framework render, effect, or reducer that updates state it depends on, re-triggering itself unboundedly
tags:
  - recursion
  - recursive
  - re-entrancy
  - infinite-loop
  - stack-overflow
  - delegate
  - base-case
  - caching
  - CWE-674
activation:
  file_globs:
    - "**/*.{py,pyi,ts,tsx,js,jsx,mjs,cjs,go,rs,java,kt,rb,swift,cs,php,cpp,cc,c,h,hpp,scala,ex,exs,erl,clj,dart,lua,r,m,sh,sql}"
  keyword_matches:
    - recursion
    - recursive
    - self
    - this
    - session
    - delegate
    - super
    - cache
    - getById
    - __getattr__
    - getattr
    - __getattribute__
    - property
    - memoize
  structural_signals:
    - A method that calls a function of the same name on the same receiver
    - "A wrapper/cache/proxy class holding a delegate field alongside same-named methods"
    - A property accessor, __getattr__, or operator overload referencing its own name
    - A decorator or higher-order wrapper invoking the symbol it wraps
    - "A framework effect/reducer that writes a value it also reads or depends on"
source:
  origin: file
  path: "footgun/footgun-unintended-recursion.md"
  hash: "sha256:ae4bfc2f1a31af000741d7351b16f2f71f5bfd7f25170e7690cce5542b3cbd07"
dimensions:
  - correctness
audit_surface:
  - "A method body calls a function with the same name and same dispatch target (self/this) on every path"
  - "A recursive call whose arguments are unchanged or do not shrink the problem (n passed through verbatim)"
  - "A recursive function with no reachable return/base-case branch before the self-call"
  - "A wrapper class field holds an inner delegate but a method calls self/this.<op> instead of delegate.<op>"
  - "A cache get(key) whose miss branch calls the same get(key) (the public, cache-fronting entry)"
  - A memoize decorator whose wrapped function invokes its own decorated name rather than the raw callee
  - "A property getter returns self.<same-name> (Python) or this.X (JS/Java) inside get X"
  - "A property setter assigns self.<same-name> = value inside set X instead of a backing field"
  - "__getattr__ or __getattribute__ uses self.<attr> / getattr(self, name) for the intercepted name"
  - "toString/__repr__/equals/hashCode interpolates or compares self/this triggering the same method"
  - "super().<m>() or super.<m>() resolves back to the same class (wrong MRO or wrong base type)"
  - "A delegating method forwards to session/manager/registry (the front) rather than the stored backend"
  - A re-entrant or non-reentrant lock acquired twice on the same path, or a handler that emits its own trigger
  - "A React/Vue effect or reducer whose body sets the very state listed in its dependency array"
  - "Mutual recursion A->B->A where neither leg has a guard that can break the cycle"
languages:
  - py
  - ts
  - js
  - go
  - rs
  - java
  - kt
  - rb
  - swift
  - cs
  - php
  - cpp
  - c
  - scala
  - ex
---

# Unintended Recursion and Re-entrancy

## When This Activates

Activates whenever a diff defines a function, method, property accessor, attribute hook, operator overload, decorator, or framework effect that could call back into itself. The signature smell is a body that references the SAME callable it is currently executing: directly by name, through `self`/`this`/`super`, or through a public facade (session, manager, registry) that fronts the very logic being defined. Recursion is correct and common, so this reviewer is about the UNINTENDED case: the call has no base case, makes no progress, or routes through the wrong target (the public entry instead of the wrapped inner delegate). The classic shape is a caching/delegating layer whose miss path calls `session.getById(...)` (the cache-fronting entry) instead of `delegate.getById(...)` (the wrapped provider), so a cache miss recurses straight back into the cache.

Engage here for control-flow self-reference (who calls whom). Defer to `footgun-null-and-missing-state` when the bug is a missing/None value rather than a call cycle, and to `footgun-destructive-query-scope` when the bug is an over-broad query or mutation scope rather than re-entry.

## Audit Surface

- [ ] A method calls a function with the same name on the same dispatch target (`self`/`this`) on every path
- [ ] A recursive call whose argument does not shrink the problem (same `n`, same key, same collection)
- [ ] A recursive function with no reachable base-case/return branch before the self-call
- [ ] A wrapper/proxy holds an inner `delegate`/`inner`/`backend` field but calls `self`/`this` instead of it
- [ ] A cache `get(key)` whose miss branch calls the same cache-fronting `get(key)` entry
- [ ] A `@memoize`/`@cache` decorator wrapping a function that invokes its own decorated name
- [ ] A property getter returns `self.<same-name>` / `this.X` from inside `get X`
- [ ] A property setter assigns `self.<same-name>` / `this.X` from inside `set X` (no backing field)
- [ ] `__getattr__`/`__getattribute__` accesses `self.<attr>` or `getattr(self, name)` for the intercepted name
- [ ] `toString`/`__repr__`/`equals`/`hashCode` references `self`/`this` in a way that re-enters the same method
- [ ] `super().<m>()` or `super.<m>()` resolves back into the same class (wrong base type or MRO)
- [ ] A delegating method forwards to the front facade (session/manager) rather than the stored backend
- [ ] A re-entrant handler emits the same event it handles, or a non-reentrant lock is taken twice on one path
- [ ] A React/Vue/Svelte effect or reducer sets the exact state it reads or lists as a dependency
- [ ] Mutual recursion `A -> B -> A` where neither leg carries a guard that can break the cycle
- [ ] An operator overload (`__eq__`, `__add__`, `operator==`) delegates to itself instead of a field/super

## Detailed Checks

### Wrapper, Cache, and Proxy Calling Its Own Front Instead of the Delegate
<!-- activation: keywords=["delegate", "inner", "backend", "wrapped", "session", "cache", "proxy", "getById", "get", "load", "fetch", "self", "this"] -->

This is the highest-value check. Trace the receiver of each call inside a wrapping layer.

- [ ] **Delegate field exists but is bypassed**: when a class stores an inner provider (`self._delegate`, `this.inner`, `private final X backend`), every forwarding method should route through THAT field. Flag any method that instead calls `self`/`this` or a same-named public facade. Trace the call target: if it resolves back to the method you are reading, it recurses.
- [ ] **Cache miss re-enters the cache**: in a cache-fronting `getById`/`get`/`load`, the miss branch must call the INNER source, not the public entry. The fix is one identifier:

  ```python
  # before (infinite recursion: the miss path calls the cache front again)
  def get_by_id(self, id):
      if id in self._cache:
          return self._cache[id]
      value = self.get_by_id(id)          # re-enters the cache front
      self._cache[id] = value
      return value

  # after (miss path goes to the wrapped delegate)
  def get_by_id(self, id):
      if id in self._cache:
          return self._cache[id]
      value = self._delegate.get_by_id(id)  # inner provider
      self._cache[id] = value
      return value
  ```

- [ ] **Facade name collision**: when the wrapper is reachable as `session.getById` and the delegate is also `getById`, a bare `getById(...)` or `session.getById(...)` inside the wrapper hits the front, not the backend. Confirm the receiver is the stored delegate, never the session/manager/registry that fronts this very class.
- [ ] **Decorator re-invokes its own name**: a `@cache`/`@retry`/`@trace` decorator must call the ORIGINAL function it received, not the module-level name (which is now bound to the wrapper). Flag `return wrapped_name(...)` where `wrapped_name` is the decorated symbol rather than the inner `fn`/`func` parameter.

### Missing or Unreachable Base Case (CWE-674)
<!-- activation: keywords=["recursion", "recursive", "return", "if", "base", "stack", "overflow", "depth", "fact", "fib", "walk", "traverse"] -->

- [ ] **No base case at all**: trace every path through a self-recursive function. If no path returns before the self-call, depth is unbounded and the stack overflows. Name it as "unbounded recursion, no terminating branch."
- [ ] **Base case unreachable**: the guard exists but the argument never reaches it (e.g., `if n == 0` but the call is `f(n)` or `f(n + 1)`). Trace the argument: each call must move strictly toward the guard.

  ```js
  // before (n never decreases: base case unreachable)
  function countdown(n) {
    if (n === 0) return;
    countdown(n);           // same n every time
  }
  // after
  function countdown(n) {
    if (n <= 0) return;
    countdown(n - 1);       // progress toward the guard
  }
  ```

- [ ] **Progress on the wrong variable**: the function shrinks a local copy but recurses on the original (or recomputes the full input). Verify the value passed down is the reduced one.
- [ ] **Float/epsilon base case that never hits exactly**: `if (x == target)` on a float that is approached but never equals the target loops forever. Use a tolerance or a max-depth guard.

### Accessors, Attribute Hooks, and Operators That Reference Themselves
<!-- activation: keywords=["property", "getter", "setter", "get", "set", "__getattr__", "__getattribute__", "getattr", "__eq__", "__hash__", "toString", "__repr__", "equals", "hashCode", "operator"] -->

- [ ] **Getter reads its own property**: a `get name()` that returns `this.name` (JS) or a `@property def name(self): return self.name` (Python) re-enters the getter forever. The body must read a DIFFERENT backing field (`this._name`, `self._name`).
- [ ] **Setter writes its own property**: symmetrically, `set name(v) { this.name = v }` recurses. Assign to the backing field instead.
- [ ] **`__getattr__`/`__getattribute__` touches the intercepted name**: inside these hooks, `self.x` or `getattr(self, name)` for the same `name` re-enters the hook. Use `object.__getattribute__(self, name)` or `self.__dict__[name]`. Note `__getattr__` only fires on MISS, so referencing an absent attribute also recurses.
- [ ] **`__repr__`/`toString` interpolates self**: `def __repr__(self): return f"{self}"` or `return "X" + this` calls the same method again. Reference specific fields, not the whole object.
- [ ] **`equals`/`__eq__`/`hashCode` delegates to itself**: `return this.equals(other)` or `__eq__` that compares `self == other` re-enters. Compare fields, or call `super`/`Objects.equals` on the components.
- [ ] **Operator overload routes back**: `__add__` returning `self + other`, or C++ `operator==` calling `*this == rhs`, recurses. Operate on the underlying value/field instead.

### Wrong super / Mutual Recursion
<!-- activation: keywords=["super", "base", "override", "MRO", "mutual", "A", "B", "this.method", "self.method"] -->

- [ ] **super targets the wrong type**: `super().method()` is meant to reach the PARENT. If the class lists itself (or a sibling) as the base, or the MRO is misordered, `super` loops back into the same override. Verify the resolved base actually defines a non-recursive implementation.
- [ ] **Mutual recursion with no guard**: trace A's body to B and B's body back to A. At least one leg must carry a condition that can stop the bounce. Flag `A -> B -> A` cycles where both legs unconditionally call the other.
- [ ] **Indirect self-call through dispatch**: a method that looks up and invokes a handler from a registry can resolve to itself if the registry maps the current key back to this method. Trace the lookup result before concluding it is non-recursive.

### Re-entrancy: Locks, Handlers, and Framework Effects
<!-- activation: keywords=["lock", "mutex", "synchronized", "acquire", "reentrant", "handler", "emit", "dispatch", "useEffect", "useState", "setState", "reducer", "watch", "effect", "render"] -->

- [ ] **Handler re-triggers its own event**: an `onChange`/`onClick`/listener whose body emits or dispatches the same event it handles creates an event-driven recursion. Confirm the action does not feed back into the same trigger.
- [ ] **Non-reentrant lock taken twice**: acquiring a plain (non-reentrant) mutex while already holding it on the same call path self-deadlocks; with a reentrant lock it merely hides re-entry. Trace the lock acquisition path for a second acquire.
- [ ] **Effect writes the state it depends on**: a React `useEffect` whose body calls `setX` while `x` is in its dependency array re-runs forever; a Vue `watch` that mutates its watched ref does the same; a reducer that re-dispatches its own action loops. Verify the write target is not also the read/dependency.
- [ ] **Recursive render**: a component that renders itself unconditionally (no depth/terminal prop) blows the render stack. Flag self-rendering trees without a base condition.

## Common False Positives

- **Legitimate recursion with a real base case and progress**: tree/graph walks, divide-and-conquer (`mergeSort`, `quickSort`), parsers, and `factorial`/`fib` are correct when a reachable guard exists AND the argument shrinks on every call. Do not flag these.
- **Reentrant locks used deliberately**: `RLock`, `ReentrantLock`, and `synchronized` on the same thread are designed for re-entry. Flag only true non-reentrant double-acquire or unbounded re-entry.
- **`super()` that correctly chains a parent**: cooperative `super().__init__()` / `super.method()` calls into a genuinely different base are the intended pattern, not recursion.
- **Getter/setter that intentionally proxies a DIFFERENT object**: `get name() { return this.delegate.name }` reads another object's property and does not recurse. Only same-object same-name access recurses.
- **Decorator calling the inner parameter**: `return fn(*args)` inside a wrapper is correct; it is the original callee. Only re-invoking the decorated module-level name recurses.
- **Tail recursion in TCO languages**: in Scala, Elixir, and (sometimes) Rust/Clojure, properly tail-recursive loops do not grow the stack. Judge by base case and progress, not by the mere presence of a self-call.
- **Trampolines / explicit stacks / Y-combinator helpers**: code that deliberately self-references to build iteration is fine when bounded by data.
- **Framework effects with correct dependency arrays**: an effect that sets state NOT in its dependency list (or guarded by a condition that eventually stops) is the normal pattern.

## Severity Guidance

| Finding | Severity |
|---|---|
| Cache/wrapper miss path calls its own front instead of the delegate (guaranteed infinite recursion) | Critical |
| Self-recursive function with no base case or unreachable base case on a hot path | Critical |
| Property getter/setter, `__getattr__`, `toString`, or operator that re-enters itself | Critical |
| Non-reentrant lock self-deadlock on a reachable path | Critical |
| `super` resolving back into the same override (loop on every call) | Critical |
| Mutual recursion `A->B->A` with no guard on either leg | Important |
| Framework effect/reducer writing the state it depends on (unbounded re-render) | Important |
| Recursion bounded only by input size with no depth cap, on attacker-controllable input | Important |
| Recursion that terminates but risks stack overflow on large but valid input (no TCO) | Minor |
| Event handler that re-triggers its event but is debounced/guarded so it converges | Minor |

## See Also

- `footgun-null-and-missing-state` -- when the defect is a missing/None/undefined value rather than a call cycle
- `footgun-destructive-query-scope` -- when the defect is an over-broad query or mutation scope rather than re-entry
- `footgun-resource-exhaustion-via-input` -- unbounded recursion driven by input is also a DoS surface
- `antipattern-exception-swallowing` -- a swallowed `RecursionError`/`StackOverflowError` hides the real cause
- `footgun-off-by-one` -- a base-case guard that is off by one can make recursion miss its terminating condition

## Authoritative References

- [CWE-674: Uncontrolled Recursion](https://cwe.mitre.org/data/definitions/674.html)
- [CWE-834: Excessive Iteration](https://cwe.mitre.org/data/definitions/834.html)
- [Python docs: customizing attribute access (__getattr__ / __getattribute__)](https://docs.python.org/3/reference/datamodel.html#object.__getattribute__)
- [MDN: get (property getters) and the recursive-accessor footgun](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get)
- [React docs: You Might Not Need an Effect (avoiding effect loops)](https://react.dev/learn/you-might-not-need-an-effect)
- [Java docs: java.util.Objects for non-recursive equals/hashCode](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Objects.html)
