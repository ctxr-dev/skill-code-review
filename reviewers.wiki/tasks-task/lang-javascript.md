---
id: lang-javascript
type: primary
depth_role: leaf
focus: Catch JavaScript-specific bugs, runtime pitfalls, and async anti-patterns in diffs
parents:
  - index.md
covers:
  - Prototype pollution and __proto__ access
  - this-binding bugs in callbacks and class methods
  - Promise discipline — unhandled rejections, missing await
  - Event loop blocking with synchronous operations
  - ESM vs CJS module interop gotchas
  - Closure variable capture in loops
  - WeakRef and FinalizationRegistry misuse
  - Proxy and Reflect edge cases
  - Hoisting and temporal dead zone bugs
  - Implicit type coercion pitfalls
  - Browser vs Node.js runtime API assumptions
tags:
  - javascript
  - async
  - promises
  - node
  - browser
  - event-loop
  - security
activation:
  file_globs:
    - "**/*.js"
    - "**/*.mjs"
    - "**/*.cjs"
    - "**/*.jsx"
  structural_signals:
    - JavaScript source files in diff
    - Node.js server code present
    - Browser-side JavaScript present
source:
  origin: file
  path: lang-javascript.md
  hash: "sha256:85a8dc86fac4730b6c50b57d6843cc2fe86b308ab871077fc78cf98300c45d93"
---
# JavaScript Quality Reviewer

## When This Activates

Activates when the diff contains `.js`, `.mjs`, `.cjs`, or `.jsx` files. Covers both browser and Node.js runtime contexts. Does not activate for TypeScript files (see `lang-typescript`).

## Audit Surface

- [ ] No missing `await` on async function calls (creates a dangling promise)
- [ ] All promise chains have `.catch()` or are inside `try/catch` with `await`
- [ ] No `==` comparisons — use `===` to avoid implicit type coercion
- [ ] No `for...in` on arrays (use `for...of`, `.forEach()`, or indexed loop)
- [ ] No detached method references losing `this` binding (bind or arrow function)
- [ ] No `var` declarations — use `const` by default, `let` when reassignment is needed
- [ ] No prototype pollution via unchecked `Object.assign` or spread from user input
- [ ] No `eval()` / `new Function()` with dynamic or user-controlled strings
- [ ] No `JSON.parse()` on untrusted input without `try/catch`
- [ ] No closure capturing `var` in a `for` loop (use `let` or `.forEach`)
- [ ] No `setTimeout`/`setInterval` with string first argument (implicit eval)
- [ ] No missing `error` event handler on Node.js EventEmitters and Streams
- [ ] No `innerHTML` assignment with unsanitized user content
- [ ] No synchronous `fs` operations in server request handlers
- [ ] No hardcoded secrets, API keys, or tokens in source

## Detailed Checks

### Async and Promises
<!-- activation: keywords=["async", "await", "Promise", "then", "catch", "reject"] -->

- [ ] Every `async` call is `await`-ed, stored, or explicitly fire-and-forget with `void`
- [ ] `Promise.all` / `Promise.allSettled` used for concurrent independent operations
- [ ] `Promise.allSettled` preferred over `Promise.all` when partial failures are acceptable
- [ ] No mixing of `.then()` chains and `async/await` in the same function
- [ ] `finally` or `try/catch/finally` used for cleanup in async flows
- [ ] No `async` on a function that never uses `await` (misleading — wraps return in promise)
- [ ] `for await...of` used for async iterables, not manual `.next()` loops
- [ ] `AbortController` / `AbortSignal` used for cancellable async operations
- [ ] No `new Promise()` wrapping an already-async function (unnecessary nesting)
- [ ] Error in `Promise` constructor callback is caught (reject, not throw)

### this-Binding and Closures
<!-- activation: keywords=["this", "bind", "call", "apply", "class", "prototype", "closure"] -->

- [ ] Class methods passed as callbacks are bound (`this.method.bind(this)` or arrow in constructor)
- [ ] Arrow functions used in class fields for auto-binding where appropriate
- [ ] No reliance on `this` inside a nested function that is not an arrow function
- [ ] Closures do not accidentally capture references to large objects preventing GC
- [ ] `WeakRef` and `FinalizationRegistry` are not used as primary cleanup mechanism (GC is non-deterministic)
- [ ] `Proxy` traps return correct types and handle all relevant traps (get, set, has, etc.)
- [ ] No `arguments` object used in arrow functions (it captures the enclosing scope's `arguments`)

### Module System
<!-- activation: keywords=["import", "export", "require", "module.exports", "ESM", "CJS"] -->

- [ ] No mixing of `require()` and `import` in the same file without clear CJS/ESM boundary
- [ ] `"type": "module"` in `package.json` matches the import style used in source
- [ ] Default exports used sparingly — named exports preferred for tree-shaking and refactoring
- [ ] Dynamic `import()` returns a promise — must be `await`-ed
- [ ] Circular dependencies do not cause `undefined` imports at module evaluation time
- [ ] `__dirname` / `__filename` not used in ESM — use `import.meta.url` + `fileURLToPath`
- [ ] Barrel files (`index.js` re-exports) do not inadvertently break tree-shaking

### Event Loop and Performance
<!-- activation: keywords=["setTimeout", "setInterval", "requestAnimationFrame", "performance", "blocking", "worker"] -->

- [ ] No CPU-intensive synchronous work on the main thread / event loop (> ~50ms blocks)
- [ ] Long-running computations offloaded to Web Workers (browser) or Worker threads (Node.js)
- [ ] `setInterval` callbacks check for overlap (previous invocation still running)
- [ ] No memory leaks from uncleared `setInterval` / event listeners on unmount/cleanup
- [ ] `requestAnimationFrame` used for visual updates, not `setTimeout(fn, 0)`
- [ ] `structuredClone()` used for deep cloning instead of `JSON.parse(JSON.stringify())`
- [ ] No `Array.prototype.sort()` without comparator on numbers (lexicographic by default)

### Error Handling
<!-- activation: keywords=["try", "catch", "throw", "Error", "reject"] -->

- [ ] Custom errors extend `Error` and call `super(message)` to preserve stack traces
- [ ] `catch(e)` checks error type before acting — do not assume shape of caught value
- [ ] Global `unhandledrejection` / `uncaughtException` handlers log and exit, not swallow
- [ ] `throw` always throws `Error` objects (not strings or plain objects)
- [ ] Error messages do not leak sensitive data (stack traces, connection strings)
- [ ] Node.js `process.on('uncaughtException')` is a last resort — not flow control

### Security
<!-- activation: keywords=["eval", "innerHTML", "cookie", "token", "secret", "XSS", "CSRF", "sanitize", "escape"] -->

- [ ] No `eval()`, `new Function()`, or `setTimeout(string)` with dynamic content
- [ ] No `innerHTML` / `outerHTML` with unsanitized user input — use `textContent` or a sanitizer
- [ ] No prototype pollution: validate keys before bracket-notation assignment from user data
- [ ] `Object.create(null)` or `Map` used for user-keyed lookups to avoid `__proto__` injection
- [ ] Cookies set with `HttpOnly`, `Secure`, and `SameSite` attributes
- [ ] No CORS `Access-Control-Allow-Origin: *` with credentialed requests
- [ ] CSP headers prevent inline script execution where possible
- [ ] RegExp from user input escaped with a library to prevent ReDoS
- [ ] `crypto.randomUUID()` or `crypto.getRandomValues()` for tokens — not `Math.random()`

### Testing Conventions
<!-- activation: file_globs=["**/*.test.js", "**/*.spec.js", "**/__tests__/**"] -->

- [ ] Tests assert on specific values, not just truthiness (`toBe`/`toEqual` over `toBeTruthy`)
- [ ] Async tests return the promise or use `async/await` — not fire-and-forget
- [ ] Mock cleanup happens in `afterEach` to prevent test pollution
- [ ] No test logic in `beforeAll` that should be in `beforeEach` (shared mutable state)
- [ ] Snapshot tests are reviewed for meaningful content, not auto-approved
- [ ] Timer mocks (`jest.useFakeTimers`) are restored after tests

## Common False Positives

- **`== null` for null/undefined check**: `x == null` intentionally catches both `null` and `undefined` — this is one of the few legitimate `==` uses
- **`for...in` on plain objects**: `for...in` is correct for iterating object keys; the concern is only when used on arrays
- **`async` without `await` in Express middleware**: some middleware signatures require async for the framework even if the body is synchronous
- **`var` in legacy codebases**: flagging `var` in files not being refactored adds noise; only flag in new/changed code
- **`eval` in build tools**: bundlers and code generators may legitimately use `eval`/`new Function` in build-time code, not runtime user-facing code

## Severity Guidance

| Finding | Severity |
|---|---|
| `eval` / `new Function` with user input | Critical |
| `innerHTML` XSS with unsanitized data | Critical |
| Prototype pollution from user-controlled keys | Critical |
| Hardcoded secrets in source | Critical |
| Missing `await` on async call (data loss/race) | Important |
| Unhandled promise rejection | Important |
| `this` binding lost in callback | Important |
| Missing error event handler on Stream/EventEmitter | Important |
| Sync fs operations in request handler | Important |
| `==` instead of `===` | Minor |
| `var` instead of `let`/`const` | Minor |
| Missing named exports preference | Minor |
| `JSON.parse(JSON.stringify())` for cloning | Minor |

## See Also

- `lang-typescript` — type-system-specific checks for TypeScript diffs
- `security-general` — language-agnostic security review
- `testing-quality` — test structure and coverage patterns

## Authoritative References

- [MDN JavaScript Reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference)
- [Node.js API Documentation](https://nodejs.org/docs/latest/api/)
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Scripting_Prevention_Cheat_Sheet.html)
- [JavaScript Event Loop — Jake Archibald](https://www.youtube.com/watch?v=cCOL7MC4Pl0)
- [ESLint Rules Reference](https://eslint.org/docs/latest/rules/)
- [TC39 Proposals](https://github.com/tc39/proposals)
