---
id: lang-lua
type: primary
depth_role: leaf
focus: Catch nil pitfalls, global leaks, metatable misuse, and non-idiomatic patterns in Lua code
parents:
  - index.md
covers:
  - Global variable leaks — missing local declarations
  - Nil propagation and silent failure from nil table access
  - "Metatable correctness — __index chains, __gc finalizers, rawget/rawset"
  - "Coroutine lifecycle — resume/yield pairing, error propagation"
  - LuaJIT FFI safety — cdata lifecycle, callback anchoring
  - Table-as-object patterns — method calls with colon vs dot
  - String pattern correctness vs PCRE regex assumptions
  - Module system — require caching, circular dependencies
  - Weak table usage for caches and memoization
  - Numeric precision — integer vs float in Lua 5.3+
tags:
  - lua
  - scripting
  - embedding
  - metatables
  - coroutines
  - luajit
activation:
  file_globs:
    - "**/*.lua"
    - "**/.luacheckrc"
    - "**/.luarc.json"
    - "**/rockspec"
    - "**/*.rockspec"
  structural_signals:
    - Lua source files present in diff
    - LuaRocks spec or luacheck configuration changed
source:
  origin: file
  path: lang-lua.md
  hash: "sha256:9e4fb7067ee267a50edc80234ecc11fb7477df276f3fa5068ab67092a0d2830a"
---
# Lua Quality Reviewer

## When This Activates

Activates when a diff contains `.lua` files, luacheck/luarc configuration, or LuaRocks specs. Focuses on accidental globals, nil propagation, metatable correctness, and Lua-specific idioms. Relevant for both standard Lua 5.x and LuaJIT environments.

The most dangerous Lua bugs are silent: an accidental global, a nil table access, or a `:` vs `.` method call mismatch. These cause failures far from the source. Prioritize these over stylistic concerns.

## Audit Surface

- [ ] All variables declared `local` unless intentionally global; strict mode or luacheck enforced
- [ ] Table field chains guarded against nil (e.g., `a and a.b and a.b.c` or helper function)
- [ ] Metatable `__index` chains are acyclic; `rawget` used when bypassing metamethods intentionally
- [ ] Method calls use `:` syntax; plain function calls use `.` — no `self` arg mismatch
- [ ] `coroutine.resume` return values checked; first return is `ok` boolean
- [ ] LuaJIT FFI `cdata` prevented from premature GC via anchoring or `ffi.gc`
- [ ] Lua string patterns used correctly — `%d`, `%a`, `%w` not regex syntax `\d`, `\w`
- [ ] Modules return a table; `require` call not receiving nil
- [ ] `#` operator not used on tables with gaps in numeric keys
- [ ] Untrusted inputs not passed to `loadstring`, `load`, `dofile`, or `os.execute`
- [ ] Weak tables configured with correct `__mode` and not accidentally anchored by strong refs
- [ ] Proper tail calls written as `return f()` — no extra values appended

## Detailed Checks

### Global Variable Discipline
<!-- activation: keywords=["local", "global", "strict", "_G"] -->

Lua variables are global by default — a missing `local` keyword silently creates a global that can cause action-at-a-distance bugs. This is the single most common source of Lua bugs in production.

- [ ] Every function, variable, and loop counter declared with `local`
- [ ] Intentional globals registered in `_G` explicitly or listed in `.luacheckrc` `globals` table
- [ ] `strict.lua` or equivalent required early in the application entry point
- [ ] Luacheck configured and passing — `luacheck .` shows no global warnings
- [ ] Module files do not pollute the global namespace — all module state in a local table
- [ ] `for` loop variables are automatically local — but variables set inside loops need explicit `local`
- [ ] Typos in variable names caught — without `local`, misspelled var creates a new global silently
- [ ] `rawset(_G, name, value)` used for intentional global registration; plain `name = value` flagged
- [ ] `_ENV` manipulation (Lua 5.2+) reviewed for sandboxing correctness — not accidentally leaking globals
- [ ] Local variable limit (200 per function in standard Lua) not exceeded in generated code
- [ ] `tostring` and `tonumber` return values checked — `tonumber` returns nil on failure, not error
- [ ] Upvalue capture in closures understood — closure captures the variable, not its value at creation time
- [ ] Table constructors use consistent key style — `{key = val}` for string keys, `{[expr] = val}` for computed keys
- [ ] `error()` calls include level parameter (2nd arg) to set error position in stack trace correctly
- [ ] `xpcall` with message handler used instead of `pcall` when stack traces are needed on error

### Nil Safety and Table Access
<!-- activation: keywords=["nil", "table", "index", "rawget"] -->

Lua treats `nil` as both "absent" and "no value." Accessing a missing table key returns `nil` silently, and indexing `nil` crashes. The `nil` vs `false` distinction also causes subtle boolean logic bugs.

- [ ] Nested table access uses nil guards: `local val = t and t.sub and t.sub.field`
- [ ] Functions that may return nil document this in comments; callers check return values
- [ ] `nil` used intentionally to remove keys from tables — not confused with "false"
- [ ] `rawget(t, k)` used to bypass `__index` when checking key existence on metatabled objects
- [ ] `type(x) == "table"` guard before iterating unknown values
- [ ] `next(t) == nil` used to check for empty table — not `#t == 0` (misses non-integer keys)
- [ ] Boolean false vs nil distinguished — `if x then` is false for both; use `if x ~= nil` when needed
- [ ] `select('#', ...)` used to count varargs correctly — trailing nils preserved, unlike `#{...}`
- [ ] `table.remove` shifts indices — iteration with `ipairs` during removal causes skipped elements
- [ ] Default values use `if x == nil then x = default end` — not `x = x or default` (fails when x is `false`)
- [ ] `pairs` vs `ipairs` chosen correctly — `ipairs` stops at first nil gap; `pairs` covers all keys
- [ ] Table identity comparison: `t1 == t2` compares references, not contents; use deep-equal helper for value comparison
- [ ] Lua 5.3+ integer/float distinction: `1` is integer, `1.0` is float — `type()` returns "number" for both; use `math.type()`
- [ ] `math.maxinteger` and `math.mininteger` (Lua 5.3+) used for bounds checks instead of hardcoded values
- [ ] `table.move` (Lua 5.3+) used for efficient sub-array operations instead of manual loop copying
- [ ] `table.pack` and `table.unpack` (Lua 5.2+) used for vararg manipulation — preserves trailing nils

### Metatables and OOP Patterns
<!-- activation: keywords=["setmetatable", "__index", "__newindex", "__gc", "__tostring", "self"] -->

Lua's OOP is convention-based via metatables, not built-in. The `:` vs `.` distinction for method calls is a frequent source of bugs. Metamethod implementations must avoid infinite recursion and correctly use `rawget`/`rawset`.

- [ ] `__index` set to a table (prototype) or function — not accidentally set to the object itself (infinite loop)
- [ ] `__newindex` handlers do not trigger themselves — use `rawset` inside `__newindex`
- [ ] `__gc` finalizers (Lua 5.2+) do not resurrect the object or access other finalizable objects
- [ ] Class-like patterns use `setmetatable({}, {__index = Class})` — not modifying the metatable of existing objects
- [ ] `self` parameter consistent: methods defined with `:` are called with `:`
- [ ] `__tostring` returns a string — not a number or table
- [ ] `__len` override returns an integer (Lua 5.2+); code depending on `#` is aware of override
- [ ] `__eq`, `__lt`, `__le` metamethods return boolean and handle cross-type comparison gracefully
- [ ] Prototype chain depth is bounded — deep `__index` chains cause performance degradation
- [ ] `getmetatable` returns the raw metatable — `__metatable` field set to hide implementation if needed
- [ ] Inheritance implemented via `setmetatable(Child, {__index = Parent})` with explicit `__index` on Child
- [ ] `__call` metamethod on tables documents the expected calling convention
- [ ] `__concat` metamethod handles mixed types (string .. object and object .. string)
- [ ] Metatables not shared unintentionally between instances — modifying shared metatable affects all objects
- [ ] `__index` function form used when lazy computation needed; table form used for simple prototype lookup
- [ ] `debug.setmetatable` (Lua 5.2+) not used to set metatables on strings/numbers in production code
- [ ] Object finalization order not relied upon — `__gc` metamethods run in unspecified order during GC cycle

### Coroutines
<!-- activation: keywords=["coroutine", "resume", "yield", "wrap", "create"] -->

Lua coroutines are cooperative (not preemptive) and provide asymmetric coroutine semantics. The most common bug is swallowing errors from `coroutine.resume` — it returns `false, error_message` instead of raising.

- [ ] `coroutine.resume` return value destructured: `local ok, val = coroutine.resume(co)`
- [ ] Errors inside coroutines caught — `resume` returns `false, errmsg` on error, not raising
- [ ] `coroutine.wrap` used when caller wants automatic error propagation (raises on error)
- [ ] Coroutines not resumed after they have finished (`dead` status checked)
- [ ] Yielded values from coroutines consumed correctly — extra values not silently dropped
- [ ] Coroutine-based iterators properly terminate (return nil to stop `for` loop)
- [ ] Coroutine stack size adequate for deep recursion — default is small in some Lua builds
- [ ] `coroutine.status` used to inspect state before resume — avoid resuming `running` coroutine
- [ ] Long-lived coroutines do not hold references to large temporary tables (prevents GC)
- [ ] Error messages from failed coroutines include traceback — `debug.traceback` added as error handler
- [ ] `coroutine.isyieldable()` (Lua 5.3+) checked before yield in nested call chains
- [ ] Coroutine pools reuse finished coroutines instead of creating new ones in hot loops
- [ ] Symmetric coroutine emulation (if needed) documented — Lua only provides asymmetric coroutines natively

### LuaJIT Specifics
<!-- activation: keywords=["ffi", "jit", "cdef", "metatype", "cdata"] -->

LuaJIT's FFI is extremely fast but operates outside Lua's safety net. Incorrect `ffi.cdef` declarations cause silent memory corruption. Callback GC and NYI operations in hot loops are the most common LuaJIT-specific issues.

- [ ] `ffi.cdef` declarations match C headers exactly — no truncated structs or wrong field types
- [ ] `ffi.gc` used to attach Lua finalizers to C-allocated memory
- [ ] Callback objects anchored to prevent GC: `cb = ffi.cast("callback_t", lua_func)` stored in a table
- [ ] `ffi.string` length parameter provided when source is not null-terminated
- [ ] JIT compilation not defeated by NYI (Not Yet Implemented) operations in hot loops
- [ ] `ffi.new` for VLA uses stack allocation for small sizes; explicit `ffi.C.malloc` for large
- [ ] `tonumber(cdata)` used for arithmetic with `cdata` numbers; raw cdata arithmetic can overflow silently
- [ ] `ffi.metatype` used for ctype methods — not `setmetatable` on cdata (which errors)
- [ ] `ffi.istype` used for type checking cdata, not `type()` (which returns "cdata" for all)
- [ ] Bit operations use `bit` library (LuaJIT) not Lua 5.3 operators — LuaJIT is Lua 5.1 based
- [ ] `jit.off()` used sparingly for debugging NYI issues — not left in production code
- [ ] `ffi.copy` used instead of `ffi.string` + `ffi.new` for buffer-to-buffer transfers (avoids temp Lua string)
- [ ] `ffi.typeof` cached at module level for repeated allocations — avoids repeated type resolution
- [ ] `ffi.errno()` checked after C calls that set errno — not relying on Lua error codes for C errors
- [ ] Pointer arithmetic on `cdata` uses explicit offset calculation — Lua indexing starts at 0 for C arrays, not 1
- [ ] `ffi.fill` used instead of manual loop for zeroing cdata buffers — faster and correct

### String Patterns and Text Processing
<!-- activation: keywords=["string.match", "string.find", "string.gsub", "gmatch", "pattern"] -->

Lua patterns are NOT regular expressions — they use `%` as the escape character, have no alternation operator, and use a different character class syntax. Developers coming from other languages frequently write regex syntax that compiles but matches incorrectly.

- [ ] Lua patterns use `%d`, `%a`, `%s`, `%w` — not regex `\d`, `\w` (which are literal backslash+letter)
- [ ] `%` is the escape character, not `\` — e.g., `%.` for literal dot
- [ ] No alternation operator (`|`) in Lua patterns — restructure as multiple `find` calls or use lpeg
- [ ] `string.find` with `plain = true` (4th arg) for literal substring search
- [ ] `gmatch` iterator consumes all matches — no off-by-one from forgetting anchor `^` or `$`
- [ ] Binary data processed with `string.byte` / `string.char`, not pattern matching
- [ ] `string.format` format specifiers match argument types — `%s` calls tostring, `%d` expects number
- [ ] `string.rep` with large count checked — can allocate enormous strings and OOM
- [ ] Capture groups in patterns use `()` not `\(\)` — Lua uses unescaped parentheses for captures
- [ ] `string.sub` indices are 1-based; negative indices count from end; off-by-one errors caught
- [ ] Multi-byte UTF-8 strings not processed with `string.byte`/`string.sub` by byte — use `utf8` library (Lua 5.3+)

### Security and Sandboxing
<!-- activation: keywords=["loadstring", "load", "dofile", "os.execute", "io.popen", "debug"] -->

Lua is frequently embedded as a scripting engine in applications (games, web servers, network equipment). Sandboxing untrusted Lua code requires careful removal of dangerous functions and setting resource limits.

- [ ] `loadstring` / `load` not called with untrusted input — code injection risk
- [ ] `os.execute` and `io.popen` inputs sanitized; shell injection via string concatenation caught
- [ ] `debug` library not available in production sandboxed environments (enables arbitrary access)
- [ ] `setfenv` (Lua 5.1) / `load` environment parameter used to restrict loaded code's capabilities
- [ ] `require` paths not user-controlled — malicious `package.path` modification caught
- [ ] Deserialization of Lua tables from untrusted sources uses a safe parser, not `loadstring`
- [ ] `debug.getinfo` and `debug.getlocal` not exposed to untrusted code (information disclosure)
- [ ] `string.dump` output not loaded from untrusted sources — bytecode can crash the VM
- [ ] Sandbox environments whitelist available functions explicitly; no blacklist approach
- [ ] Resource limits (memory, instruction count) enforced for untrusted code via `debug.sethook`
- [ ] `rawequal` used in sandbox to bypass `__eq` metamethod on untrusted objects
- [ ] Sandbox function whitelist reviewed each Lua version upgrade — new standard library functions may grant dangerous access
- [ ] `pcall`/`xpcall` used to contain errors from untrusted code — prevent crash of host application

### Module System and Packaging
<!-- activation: keywords=["require", "module", "package", "rockspec"] -->

Lua's module system is based on `require` which caches results in `package.loaded`. Modules should return a table of public functions. The deprecated `module()` function pollutes globals and should never be used in new code.

- [ ] Modules return a table of public functions — not using deprecated `module()` function
- [ ] `require` cache (`package.loaded`) not accidentally cleared unless reload is intentional
- [ ] Circular requires avoided — restructure with lazy require or dependency injection
- [ ] `.rockspec` specifies dependency versions; `dependencies` table not empty for non-trivial packages
- [ ] `package.path` and `package.cpath` modified only at entry point, not in libraries
- [ ] Module-level side effects (I/O, global mutations) executed once at `require` time — documented
- [ ] `package.preload` used for built-in modules; custom loaders registered via `package.searchers`
- [ ] Module table frozen after creation if immutability is desired — `setmetatable(M, {__newindex = error_fn})`
- [ ] `pcall(require, "optional_dep")` used for optional dependencies — does not crash if missing
- [ ] Module version exported as `M._VERSION` field for runtime introspection
- [ ] `package.loaded[modname] = M` set early in module load for circular dependency support
- [ ] `require` paths use dots as separators (`require "my.module"`) — not slashes or backslashes
- [ ] Module initialization errors caught at `require` time — broken module poisons `package.loaded` cache
- [ ] Module files use `local M = {}` ... `return M` pattern — the canonical Lua module idiom
- [ ] Global side effects in modules (registering signal handlers, modifying env) documented prominently
- [ ] Module local state not shared between Lua states in multi-state embeddings — each state gets own copy
- [ ] `require` return value stored in local — repeated `require` calls are cheap (cached) but the idiom is `local M = require "mod"`
- [ ] Lua version compatibility: `_VERSION` checked at runtime when code must support multiple Lua versions

## Common False Positives

- **`_` as intentional discard variable**: `local _, val = func()` is idiomatic Lua for ignoring first return value
- **Global in single-file scripts**: Tiny scripts (CLI tools, one-off) may use globals acceptably
- **`#` on dense arrays**: The length operator is reliable when the table has no gaps in integer keys starting at 1
- **`self` unused in method**: Some methods are defined with `:` for consistency with the class API even if they don't use `self`
- **`string.format` with `%s` on numbers**: Lua auto-coerces numbers to strings — this is intentional, not a type error

## Severity Guidance

| Finding | Severity |
|---|---|
| `loadstring` / `load` with untrusted input (code injection) | Critical |
| `os.execute` / `io.popen` without input sanitization (shell injection) | Critical |
| `string.dump` bytecode loaded from untrusted source (VM crash) | Critical |
| Accidental global overwriting a built-in (`table`, `string`, `math`) | Critical |
| Nil dereference in production code path (crash) | Critical |
| `debug` library exposed in sandbox (security bypass) | Critical |
| `__index` infinite loop from circular metatable chain | Important |
| Coroutine error silently swallowed (unchecked `resume`) | Important |
| LuaJIT FFI cdata GC'd while C holds reference (use-after-free) | Important |
| `#` used on sparse table (undefined result) | Important |
| Method called with `.` instead of `:` (wrong `self`) | Important |
| `x or default` pattern when `x` can be `false` (wrong default) | Important |
| Missing `local` on non-global variable (accidental global) | Minor |
| Lua pattern using regex syntax (wrong but may still work) | Minor |
| Module not returning table (returns nil implicitly) | Minor |
| `string.rep` with large count without bounds check | Minor |
| Deep metatable chain in non-critical path (performance) | Minor |

## See Also

- `lang-javascript` — Similar dynamic typing and prototype chain patterns
- `lang-python` — Comparable scripting patterns, different scoping rules

## Authoritative References

- [Lua 5.4 Reference Manual](https://www.lua.org/manual/5.4/)
- [Programming in Lua (PIL)](https://www.lua.org/pil/)
- [LuaJIT FFI Semantics](https://luajit.org/ext_ffi_semantics.html)
- [Luacheck Documentation](https://luacheck.readthedocs.io/)
- [Lua Users Wiki — Patterns Tutorial](http://lua-users.org/wiki/PatternsTutorial)
- [LPeg — Parsing Expression Grammars for Lua](http://www.inf.puc-rio.br/~roberto/lpeg/)
