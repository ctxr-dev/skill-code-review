# TypeScript — Review Overlay

Load this overlay for the **Type Safety**, **Security**, and **Maintainability** specialists when TypeScript code is being reviewed.

## Compiler Strictness

- [ ] `strict: true` is enabled in `tsconfig.json`; no individual strict flags (e.g., `strictNullChecks`, `noImplicitAny`) are selectively disabled to work around typing issues
- [ ] `noUncheckedIndexedAccess` is enabled or access to array/object indices by dynamic key is explicitly null-checked at the call site
- [ ] `exactOptionalPropertyTypes` is considered for configs and option bags; `undefined` as a value is distinct from a property being absent

## Zero `any`

- [ ] No `any` type annotations in new code; use `unknown` for truly unknowable external data and narrow it before use
- [ ] `as any` casts are absent; `as T` casts have a comment justifying why the cast is safe and the runtime invariant that makes it valid
- [ ] `@ts-ignore` and `@ts-expect-error` are absent without an accompanying comment explaining the suppression and a linked issue to fix it properly
- [ ] Function parameters typed as `Function` are replaced with specific call signatures

## Type Patterns

- [ ] Discriminated unions are used for state modeling instead of optional fields with implicit coupling (`type State = { status: "loading" } | { status: "done"; data: T }`)
- [ ] `as const` is applied to literal objects and arrays used as type-level constants so that widening does not lose precision
- [ ] `satisfies` operator is used when an object should be validated against a type but retain its literal type for downstream inference
- [ ] `const` enums are avoided in library code (they are inlined at compile time and break declaration files); prefer plain `enum` or string literal unions
- [ ] `Record<K, V>` is used for homogeneous maps; named interface properties are used for heterogeneous shapes — not `{ [key: string]: any }`

## Module System

- [ ] Node built-in imports use the `node:` prefix (`import { readFile } from "node:fs/promises"`) for clarity and to avoid shadowing
- [ ] File system access uses `fs/promises` (async) rather than the synchronous `fs` API in any I/O path that runs on a server or CLI
- [ ] Path construction uses `node:path`'s `join` / `resolve` rather than string concatenation, which breaks on Windows
- [ ] `import type { T }` is used for type-only imports to guarantee they are erased at compile time and do not create circular module evaluation
- [ ] Public API modules use named exports; default exports are avoided in library code because they are harder to refactor and do not enforce naming consistency
