---
id: footgun-null-and-missing-state
type: primary
depth_role: leaf
focus: "Detect a possibly-unset value (from session, cache, optional config, a prior pipeline step, a map key, or env) read and then dereferenced, indexed, compared, or passed on without a null/None/nil/undefined or presence guard"
parents:
  - index.md
covers:
  - "Value read from session/cache/optional-config/pipeline-step/env then dereferenced with no guard"
  - "Chained access a.b.c where an intermediate (a or a.b) may be null/None/nil/undefined"
  - "Dictionary or map key assumed present, accessed with [] instead of a guarded get"
  - ".get(key) or getattr(obj, name) whose missing-default is not provided, then used as if found"
  - "Optional/Maybe/Result unwrapped (! , .unwrap(), force-unwrap) without a presence check"
  - Partially-initialized object whose field is read before it is assigned on some path
  - "env/getenv returning null/None when the variable is unset, then split/parse/index"
  - "Equality or ordering comparison against None/null where the operand can itself be null"
  - Function returning T-or-null whose null branch the caller never handles
  - "Metadata or payload field (for example sender, user, login) assumed to exist on every event shape"
  - "Async/await result or fetched state used before the not-found case is branched"
  - "Collection .first()/.find()/[0] on a possibly-empty result, then field access on the element"
tags:
  - null-safety
  - none
  - missing-state
  - npe
  - keyerror
  - optional
  - guard-clause
  - CWE-476
  - CWE-252
activation:
  file_globs:
    - "**/*.{py,pyi,ts,tsx,js,jsx,mjs,cjs,go,rs,java,kt,rb,swift,cs,php,cpp,cc,c,h,hpp,scala,ex,exs,erl,clj,dart,lua,r,m,sh,sql}"
  keyword_matches:
    - None
    - "null"
    - nil
    - undefined
    - getattr
    - ".get("
    - optional
    - Optional
    - default
    - session
    - cache
    - metadata
    - env
    - getenv
    - fetch_state
    - "?."
    - "!."
  structural_signals:
    - Chained member access two or more levels deep with no intervening guard
    - "Map/dict subscript or .get()/getattr() on a key not proven present"
    - "Optional/Maybe force-unwrap or non-null assertion"
    - "Value read from session/cache/env/prior-step then immediately used"
    - "Equality comparison against None/null/undefined"
source:
  origin: file
  path: "footgun/footgun-null-and-missing-state.md"
  hash: "sha256:a9bed819b41cc39b94c8d3378bd946ba653999402bf8cd0093d475a6f7581d69"
dimensions:
  - correctness
audit_surface:
  - "A value sourced from session, cache, config, a prior step, a map, or env is read and used with no preceding null/presence check"
  - "Chained member access a.b.c.d where any segment can be null (no ?. , no guard, no Optional chaining)"
  - "Map or dict accessed with map[key] / dict[key] where the key is not guaranteed to be present"
  - ".get(key) called without a default, result then dereferenced, indexed, or arithmetic-applied"
  - "getattr(obj, name) without a third default arg, result then called or attribute-accessed"
  - "Optional/Maybe unwrapped via ! , !! , .unwrap(), .get(), or force-cast with no isPresent/isSome check"
  - "Swift/Kotlin force unwrap (value! , value!!) on an optional that a code path can leave nil"
  - "os.getenv / process.env.X / System.getenv used directly in split/parse/index with no unset fallback"
  - "A variable compared with == None / == null / === undefined where the same variable may itself be the absent sentinel of another type"
  - "A function with a documented or inferable null/None/nil return whose call site has no none-branch"
  - Object constructed in one place but a required field set in a separate later step, read in between
  - "Result of .find / .first / .filter(...).head / arr[0] on a possibly-empty collection used without an empty check"
  - "Event/webhook/message metadata field (sender, user, payload, headers) indexed without verifying the parent object and key exist"
  - "A guard exists for one branch (early return on null) but a sibling branch reaches the same use unprotected"
  - "Destructuring const {a} = obj / val (a, b) = pair where obj/pair can be null/None"
  - "await fetchState() / load() result passed onward before its not-found (null) case is handled"
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
  - sql
---

# Null and Missing-State Footguns

## When This Activates

Engage when a diff reads a value that is NOT guaranteed to be populated on every code path and then USES it: a dereference, an index, a method call, a comparison, or passing it onward to code that dereferences it. The high-signal sources are ambient or deferred state: session objects, caches, optional config, an upstream pipeline or middleware step, a dict/map key, and environment variables. These are dangerous precisely because the value is present in the common case (so tests and the happy path pass) and absent only on a particular path: an unauthenticated request, a cold cache, a missing env var, an event shape that omits a field.

Defer to a sibling when the root cause is elsewhere: if the value comes back unexpectedly because a function calls itself, that is `footgun-unintended-recursion`; if a possibly-null value is fed into a query whose scope then becomes unbounded (a missing WHERE, a delete touching every row), the scope bug belongs to `footgun-destructive-query-scope` even though the trigger is a null. Stay focused on the read-then-use-without-guard shape and the resulting null/None/nil/undefined dereference, NullPointerException, KeyError, "undefined is not a function", or wrong null-equality.

## Audit Surface

- [ ] A value from session, cache, config, a prior step, a map, or env is read and used with no preceding null/presence check
- [ ] Chained member access a.b.c.d where any segment can be null and there is no ?. , Optional chaining, or guard
- [ ] Map or dict accessed with map[key] where the key is not guaranteed present (no contains/in check, no try)
- [ ] .get(key) called with no default, result then dereferenced, indexed, or arithmetic-applied
- [ ] getattr(obj, name) with no third default argument, result then called or attribute-accessed
- [ ] Optional/Maybe/Result unwrapped via ! , !! , .unwrap(), .get(), or force-cast with no isPresent/isSome check
- [ ] os.getenv / process.env.X / System.getenv used directly in split/parse/index with no unset fallback
- [ ] A variable compared with == None / == null / === undefined where the variable may itself be the wrong absent sentinel
- [ ] A function with a null/None/nil return whose call site has no none-branch
- [ ] A required field set in a step separate from construction, read in the gap before it is assigned
- [ ] Result of .find / .first / arr[0] on a possibly-empty collection used without an empty check
- [ ] Event/webhook/message metadata field indexed without verifying both the parent object and the key exist
- [ ] A guard exists on one branch (early return on null) but a sibling branch reaches the same use unprotected
- [ ] Destructuring const {a} = obj or val (a, b) = pair where obj/pair can be null/None
- [ ] await load()/fetchState() result passed onward before its not-found (null) case is handled

## Detailed Checks

### Trace the Read Back to Its Source (CWE-476)
<!-- activation: keywords=["session", "cache", "metadata", "context", "ctx", "state", "fetch_state", "pipeline", "step", "request", "req"] -->

The core technique is a backward trace: at the dereference site, follow the value to where it was set, and ask "is there a path that reaches this use with the value still empty?"

- [ ] **State read from session/cache/pipeline, then used**: a value like a fetched authenticated user, a cached entity, or a key written by a prior middleware/pipeline step is read and immediately dereferenced or compared. Trace its setter: if any path (unauthenticated request, cache miss, skipped step) leaves it unset, the read returns the absent sentinel and the use throws. Before: `user = session["user"]; name = user.login`. After: `user = session.get("user"); if user is None: return ...; name = user.login`.
- [ ] **The happy path sets it, the error path does not**: a try block (or an early-return success branch) assigns the variable, but an exception/early branch reaches the same downstream use with it unset or still at its initial null. Name the exact path that skips the assignment.
- [ ] **Default value is itself the sentinel**: `x = cache.get(key) or 0` looks guarded, but if `0` (or `""`, or `[]`) is a legitimate stored value, the `or` silently rewrites it. Conversely `x = cache.get(key)` with no default returns None and the next line indexes it.
- [ ] **Both operands of a guard comparison are nullable (fail-open security defect)**: a one-line guard or security check of the shape `fetch_state(X) != obj[k]` (or `==`, or any single-line comparison) hides TWO independent nullable reads, and BOTH must be checked. The right side `obj[k]` can KeyError; the left side `fetch_state(X)` (a session/pipeline/cache read) returns None whenever that state was never bound on this path. The trap is that a None on the LEFT does not crash, it just compares unequal (or equal) to the other operand, so the comparison silently evaluates the wrong way and the guard is defeated. Reviewers fixate on the RIGHT operand's KeyError (a loud crash) and miss the LEFT operand: a missing-state read that quietly inverts an authorization or identity check is fail-open, which is a real correctness AND security defect, not advisory. Trace the setter of the LEFT operand: if any path reaches this comparison without binding `X` (a skipped login step, an out-of-order pipeline view, a replayed request), the check passes or fails wrongly. Before: `if pipeline.fetch_state("authenticated_user") != integration.metadata["sender"]["login"]: return error()`. After: `actual = pipeline.fetch_state("authenticated_user"); if actual is None: return error(); expected = integration.metadata.get("sender", {}).get("login"); if actual != expected: return error()`. A both-operands-nullable one-line comparison is TWO SEPARATE defects and yields TWO SEPARATE findings, never one: (1) the RIGHT-operand index/KeyError (the missing-key crash on `obj[k]`, here `metadata["sender"]["login"]`), with its own fix (guard the parent key, switch the subscript to a guarded `.get`) and its own severity, and (2) the LEFT-operand missing-state fail-open (the nullable `fetch_state(X)` that silently defeats the guard), with its own fix (None-check the left read before comparing) and its own, typically higher, severity. Report BOTH. The fail-open narrative is ADDITIVE: it must NOT merge with, replace, absorb, or stand in for the standalone right-operand index/KeyError finding. Even when both live on the same physical line, emit the index/KeyError as its own finding exactly as you would if the left operand were a plain non-nullable literal, then emit the fail-open as a second, independent finding. Do not let recognizing the richer left-operand bug suppress the simpler right-operand one.

### Chained Access and Intermediate Nulls (CWE-476)
<!-- activation: keywords=[".", "?.", "&.", "->", "[]", "getOrNull", "Optional", "flatMap", "chain"] -->

- [ ] **a.b.c where b can be null**: only the LAST segment is usually scrutinized; the middle ones are the trap. `order.customer.address.city` throws if `customer` OR `address` is null. Trace each intermediate's nullability independently. Before: `city = order.customer.address.city`. After (TS): `city = order.customer?.address?.city ?? UNKNOWN`.
- [ ] **Metadata/payload field assumed present**: indexing nested event data such as `metadata['sender']['login']` assumes `'sender'` exists in `metadata`. If a webhook variant omits `sender`, `metadata['sender']` raises KeyError before `['login']` even runs. Guard the parent key first: `sender = metadata.get('sender'); login = sender and sender.get('login')`, or check `'sender' in metadata`.
- [ ] **Optional chaining short-circuits to undefined, not to a value**: `a?.b.c` in TS/JS guards `a` but NOT `b`; if `a` is non-null and `b` is null, `.c` still throws. The `?.` must sit on every nullable hop.

### Map/Dict Keys and Lookups (CWE-252, CWE-476)
<!-- activation: keywords=[".get(", "getattr", "[]", "in", "contains", "containsKey", "has", "ContainsKey", "KeyError", "Map", "dict"] -->

- [ ] **Subscript on an unproven key**: `config["timeout"]` (Python KeyError), `map["k"]!!` (Kotlin), `dict[key]` raise or return null when the key is absent. Confirm the key is provably present (literal just inserted, validated upstream) or switch to a guarded `.get` with an explicit, non-sentinel-colliding default.
- [ ] **.get / getattr without a default, then used**: `d.get("k").strip()` and `getattr(o, "n").run()` both crash when missing, because `.get`/`getattr` return None which is then dereferenced. Either supply a default that the next operation tolerates, or branch on None first.
- [ ] **Go two-value comma-ok dropped**: `v := m[key]` discards the presence boolean; `v, ok := m[key]` then `if !ok { ... }` is the guard. A single-value map read in Go yields the zero value, which downstream code may misread as a real entry.

### Optionals, Unwraps, and Null-Returns (CWE-252)
<!-- activation: keywords=["unwrap", "!", "!!", "force", "Optional", "Maybe", "Some", "None", "orElse", "expect", "as!"] -->

- [ ] **Force-unwrap on a path-dependent optional**: Swift `value!`, Kotlin `value!!`, Rust `opt.unwrap()`/`.expect()`, TS `value!`, Java `optional.get()`. Each assumes presence. Trace whether some path produces the empty optional; if so, the unwrap panics/throws. Before (Rust): `let u = find_user(id).unwrap();`. After: `let Some(u) = find_user(id) else { return Err(NotFound); };`.
- [ ] **Caller ignores a null/None return**: a function whose body has a `return None`/`return null`/`return nil` branch (not found, parse failed) is called and its result used directly. The not-found branch was never handled at the call site. Flag the call site, citing the return statement that produces null.
- [ ] **Unwrap guarded for one variant only**: `if a.is_some() { use(b.unwrap()) }` checks `a` but unwraps `b`. Match the guard to the value actually being unwrapped.

### Env Vars and Comparisons (CWE-476)
<!-- activation: keywords=["getenv", "process.env", "System.getenv", "os.environ", "==", "===", "is None", "!= null"] -->

- [ ] **env var assumed set**: `os.getenv("URL").split(",")`, `process.env.PORT.trim()`, `System.getenv("X").length()` all NPE/throw when the variable is unset (getenv returns None/undefined/null). Require a fallback or a fail-fast presence check at startup.
- [ ] **Wrong null-equality semantics**: comparing against None/null/undefined where the operand can itself be that sentinel inverts logic. In JS, `x == null` matches both null and undefined (sometimes intended), but `x === undefined` misses an explicit null. In Python, `if not user:` treats an empty-but-present object the same as None; use `if user is None:` when only absence matters.
- [ ] **Equality routed through a possibly-null operand**: `a.equals(b)` (Java) throws if `a` is null; `Objects.equals(a, b)` or a null-first `b.equals(a)` on a known-non-null literal is safe. Trace which side can be null.

## Common False Positives

- **Provably-present keys**: a key inserted on the line above, or guaranteed by a validated schema / type system, is safe to subscript. Do not flag `m[k]` when `m[k] = v` precedes it with no intervening mutation.
- **Already guarded earlier in scope**: an `if x is None: return` (or early throw, or `assert x is not None`) above the use makes the later dereference safe. Trace upward before flagging; the guard may be several lines up or in a decorator/precondition.
- **Non-null types in a sound type system**: in Kotlin, Rust, or strict-null TS, a value typed as non-nullable (`String`, not `String?`) cannot be null; flagging it contradicts the compiler. Only flag the nullable (`?`) types or `any`/`Object`/dynamic escapes.
- **Total functions and safe accessors**: `dict.get(k)` used in a context that explicitly handles None, `Optional.map(...).orElse(default)`, `arr.firstOrNull()?.let { ... }`, and Elixir pattern matches with a fallback clause are correct null-handling, not omissions.
- **Sentinel intentionally meaningful**: code that deliberately treats `None`/`null` as a domain state (tri-state flag, "not yet computed") and branches on it is correct; do not demand a guard that is already the branch.
- **Force-unwrap after a proven invariant**: `opt.unwrap()` immediately after `if opt.is_none() { return }`, or a `!!` after a verified non-null assignment, is safe. The unwrap is annotating an invariant the reader can check locally.

## Severity Guidance

| Finding | Severity |
|---|---|
| Unguarded deref of session/auth/pipeline state on a reachable unauthenticated or error path | Critical |
| KeyError / NPE on a request-driven map or metadata field reachable from external input | Critical |
| Force-unwrap (! , !! , .unwrap()) on an optional a known code path leaves empty | Important |
| Chained a.b.c with a nullable intermediate, no guard, in non-trivial control flow | Important |
| .get()/getattr without default whose None result is dereferenced | Important |
| env var dereferenced with no unset fallback (crashes only when misconfigured) | Important |
| Wrong null-equality semantics that mis-handles an edge value | Minor |
| Missing guard on a path the type system already proves non-null | Minor |

## See Also

- `footgun-unintended-recursion` -- when the unexpected value originates from a function re-entering itself rather than from absent state
- `footgun-destructive-query-scope` -- when a null or missing filter widens a query/delete scope instead of merely crashing
- `antipattern-exception-swallowing` -- a swallowed exception often leaves a variable null, surfacing here as the downstream dereference
- `footgun-off-by-one` -- empty-collection edge cases (size - 1, [0] on empty) overlap with missing-element reads

## Authoritative References

- [CWE-476: NULL Pointer Dereference](https://cwe.mitre.org/data/definitions/476.html)
- [CWE-252: Unchecked Return Value](https://cwe.mitre.org/data/definitions/252.html)
- [CWE-690: Unchecked Return Value to NULL Pointer Dereference](https://cwe.mitre.org/data/definitions/690.html)
- [Python docs: dict.get and KeyError](https://docs.python.org/3/library/stdtypes.html#dict.get)
- [MDN: Optional chaining (?.)](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Optional_chaining)
- [Kotlin: Null safety](https://kotlinlang.org/docs/null-safety.html)
- [Rust: Option and the perils of unwrap](https://doc.rust-lang.org/std/option/enum.Option.html)
