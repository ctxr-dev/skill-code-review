---
id: lang-typescript
type: primary
depth_role: leaf
focus: Catch TypeScript type-system misuse, unsound patterns, and any-leaks in diffs
parents:
  - index.md
covers:
  - Strict mode violations and tsconfig misconfiguration
  - Type narrowing gaps and exhaustiveness failures
  - Discriminated union correctness
  - Branded and nominal type patterns
  - Generic variance and unsound covariance
  - "any/unknown leaks into public API boundaries"
  - satisfies operator usage for type validation without widening
  - Template literal type correctness
  - Declaration merging and module augmentation safety
  - "Type assertion (as) abuse instead of proper narrowing"
  - Enum pitfalls and const enum trade-offs
tags:
  - typescript
  - types
  - generics
  - strict-mode
  - narrowing
  - discriminated-unions
activation:
  file_globs:
    - "**/*.ts"
    - "**/*.tsx"
    - "**/*.d.ts"
    - "**/tsconfig*.json"
  structural_signals:
    - TypeScript source files in diff
    - TypeScript config files changed
    - Type declaration files present
source:
  origin: file
  path: lang-typescript.md
  hash: "sha256:c1cc884d1d261aeb8a147a7d8cc6bfeadcd255ed659971256c5191b7fbec5038"
---
# TypeScript Quality Reviewer

## When This Activates

Activates when the diff contains `.ts`, `.tsx`, or `.d.ts` files, or when TypeScript configuration files (`tsconfig*.json`) are modified. Complements `lang-javascript` — this reviewer focuses on type-system-specific concerns.

## Audit Surface

- [ ] No explicit `any` in public function signatures or exported types
- [ ] No `as` type assertions bypassing narrowing — use type guards or `satisfies`
- [ ] No `@ts-ignore` — use `@ts-expect-error` with a reason comment
- [ ] Discriminated unions have exhaustive `switch` with `never` default check
- [ ] `strictNullChecks` is enabled in `tsconfig.json`
- [ ] Generic type parameters have `extends` constraints where applicable
- [ ] No non-null assertion `!` where `?.` or a proper null check is safer
- [ ] `satisfies` used to validate type conformance without widening literals
- [ ] No `[key: string]: any` index signatures — use `Map` or `Record<K, V>`
- [ ] `enum` use is justified — prefer `as const` objects or union literals
- [ ] Module augmentations do not widen existing library types unsoundly
- [ ] Exported functions have explicit return type annotations
- [ ] No impossible intersection types creating silent `never`
- [ ] Conditional types tested with `never`, `any`, and union edge cases

## Detailed Checks

### Strict Mode and Configuration
<!-- activation: file_globs=["**/tsconfig*.json"] -->

- [ ] `"strict": true` is enabled (or all individual strict flags are on)
- [ ] `noUncheckedIndexedAccess` enabled for safer array/object access
- [ ] `exactOptionalPropertyTypes` enabled to distinguish `undefined` from missing
- [ ] `"skipLibCheck": true` used judiciously — catches type errors in dependencies
- [ ] `"declaration": true` and `"declarationMap": true` for library packages
- [ ] `moduleResolution` matches the target runtime (`bundler`, `node16`, `nodenext`)
- [ ] `"isolatedModules": true` enabled for compatibility with transpilers (esbuild, swc)
- [ ] `paths` aliases have corresponding entries in the bundler/runtime config

### Type Narrowing and Guards
<!-- activation: keywords=["narrowing", "type guard", "is", "asserts", "instanceof", "typeof", "in"] -->

- [ ] Custom type guards (`x is T`) return type is correct — an incorrect guard unsounds the whole program
- [ ] Assertion functions (`asserts x is T`) actually throw on the negative case
- [ ] `typeof` checks used for primitives; `instanceof` for classes; `in` for discriminants
- [ ] Narrowing persists correctly across async boundaries (re-check after `await`)
- [ ] No widening of narrowed types by accidental reassignment
- [ ] Discriminant fields are literal types (string/number literals), not `string`
- [ ] Exhaustiveness helper: `function assertNever(x: never): never { throw ... }`

### Generics and Variance
<!-- activation: keywords=["Generic", "TypeVar", "extends", "infer", "variance", "in ", "out "] -->

- [ ] Generic constraints (`<T extends Base>`) are as narrow as possible
- [ ] `in`/`out` variance annotations (TS 4.7+) used for complex generic classes
- [ ] `infer` in conditional types is constrained (`infer T extends string`) on TS 5.0+
- [ ] Generic defaults (`<T = string>`) do not hide required type information
- [ ] Higher-kinded type workarounds are documented (TypeScript lacks native HKT)
- [ ] Generic functions do not force callers to specify type parameters manually
- [ ] No unnecessary generic type parameters that are used only once (simplify to concrete)

### Type Assertions and Escape Hatches
<!-- activation: keywords=["as ", "any", "unknown", "ts-ignore", "ts-expect-error", "!."] -->

- [ ] `as` casts are avoided — prefer `satisfies`, type guards, or control flow narrowing
- [ ] `as unknown as T` double-cast is a red flag — document why it is necessary
- [ ] `any` is replaced with `unknown` at input boundaries (forces callers to narrow)
- [ ] `@ts-expect-error` includes a description of the expected error
- [ ] Non-null assertion `!` is used only when the code has verified non-nullness by other means
- [ ] No `as const` on mutable data that will be mutated (creates readonly contradiction)
- [ ] Function return types are explicit — no `any` inference from untyped dependencies

### Discriminated Unions and Pattern Matching
<!-- activation: keywords=["discriminated", "union", "switch", "kind", "type", "tag"] -->

- [ ] All union members have the discriminant property with a distinct literal type
- [ ] `switch` over discriminant covers all variants or has `never` default
- [ ] Union types are not excessively large (>20 variants — consider redesign)
- [ ] `in` operator narrowing used for structural discrimination when discriminant is absent
- [ ] Branded types use `declare const brand: unique symbol` pattern for nominal typing
- [ ] Result types (`{ ok: true, data: T } | { ok: false, error: E }`) checked before access

### Declaration Files and Module Boundaries
<!-- activation: file_globs=["**/*.d.ts"], keywords=["declare", "module", "augmentation", "ambient"] -->

- [ ] `.d.ts` files do not contain runtime code (implementation belongs in `.ts`)
- [ ] Module augmentation uses `declare module` with the exact module specifier
- [ ] Ambient declarations (`declare global`) are in a file with no imports/exports, or use `export {}`
- [ ] Third-party type patches are isolated and documented
- [ ] Package exports have correct `types` field in `package.json` (`"types"` condition)
- [ ] Dual CJS/ESM packages have correct `.d.cts` / `.d.mts` declarations

### Enum and Literal Types
<!-- activation: keywords=["enum", "const enum", "as const", "literal"] -->

- [ ] `const enum` avoided in libraries (inlined at compile time — breaks declaration consumers)
- [ ] String enums preferred over numeric enums (numeric enums allow reverse mapping to any number)
- [ ] `as const` object + `typeof` union preferred over enum for tree-shaking
- [ ] Template literal types (`\`${A}-${B}\``) do not create combinatorial explosion
- [ ] Literal types are narrow: `"success"` not `string` for discriminant fields

### Performance and Build
<!-- activation: keywords=["performance", "bundle", "build", "compile", "emit"] -->

- [ ] No circular type references that slow down the type checker
- [ ] `type`-only imports use `import type { T }` to avoid runtime imports
- [ ] Conditional types are not deeply recursive (risk of instantiation limit)
- [ ] Mapped types do not iterate over excessively large unions
- [ ] Re-export patterns do not defeat tree-shaking
- [ ] `const` type parameters (TS 5.0+) used where literal inference is desired

## Common False Positives

- **`any` in test mocks**: test files often use `any` for mock objects — lower concern than in production code
- **`as` in test assertions**: casting in test setup/assertions is often pragmatic and low risk
- **`@ts-expect-error` for testing error paths**: deliberately triggering type errors in tests is valid
- **`enum` in existing codebases**: migrating from enum to union literals is churn; only flag in new code
- **Non-null assertion after `.find()`**: when the search is known to succeed by invariant (e.g., iterating known keys), `!` is acceptable with a comment
- **`skipLibCheck` enabled**: standard practice for applications; only a concern for library packages

## Severity Guidance

| Finding | Severity |
|---|---|
| `any` in public API signature | Critical |
| Incorrect type guard (unsounds downstream code) | Critical |
| `@ts-ignore` suppressing real type error | Critical |
| `strict: false` in tsconfig | Critical |
| Missing exhaustiveness check in discriminated union | Important |
| `as` assertion bypassing narrowing | Important |
| Non-null `!` without invariant justification | Important |
| Missing return type on exported function | Important |
| `enum` instead of union literal (new code) | Minor |
| `import` instead of `import type` for types | Minor |
| Unconstrained generic parameter | Minor |
| Missing `noUncheckedIndexedAccess` | Minor |

## See Also

- `lang-javascript` — runtime JavaScript correctness (async, event loop, closures)
- `security-general` — language-agnostic security review
- `testing-quality` — test structure and coverage patterns

## Authoritative References

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [TypeScript Release Notes](https://devblogs.microsoft.com/typescript/)
- [Total TypeScript — Matt Pocock](https://www.totaltypescript.com/)
- [typescript-eslint Rules](https://typescript-eslint.io/rules/)
- [Are The Types Wrong?](https://arethetypeswrong.github.io/)
- [TypeScript Performance Wiki](https://github.com/microsoft/TypeScript/wiki/Performance)
