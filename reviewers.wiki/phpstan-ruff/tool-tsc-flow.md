---
id: tool-tsc-flow
type: primary
depth_role: leaf
focus: "Detect misconfigured or under-utilized TypeScript/Flow type checking -- unjustified ts-ignore/ts-expect-error, strict mode disabled, any casts without justification, skipLibCheck hiding errors, and missing test tsconfig"
parents:
  - index.md
covers:
  - "@ts-ignore without an explanation or migration to @ts-expect-error"
  - "@ts-expect-error without an explanation comment"
  - strict mode disabled in tsconfig.json
  - as any or any cast without justification
  - "skipLibCheck: true hiding type errors in dependencies"
  - Missing tsconfig for test files
  - "Declaration files (.d.ts) not generated for library packages"
  - "Conflicting tsconfig.json files (root vs nested)"
  - $FlowFixMe without a justification or ticket
  - noImplicitAny disabled in a project with significant TypeScript
  - "Type assertion (as T) used where a type guard would be safer"
tags:
  - typescript
  - tsc
  - flow
  - type-checking
  - tsconfig
  - strict-mode
  - any
  - ts-ignore
  - declarations
activation:
  file_globs:
    - "**/tsconfig*.json"
    - "**/.flowconfig"
    - "**/*.ts"
    - "**/*.tsx"
    - "**/*.d.ts"
  keyword_matches:
    - "@ts-ignore"
    - "@ts-expect-error"
    - "@ts-nocheck"
    - as any
    - as unknown
    - $FlowFixMe
    - $FlowIssue
    - skipLibCheck
    - strict
    - noImplicitAny
  structural_signals:
    - tsconfig.json present
    - flowconfig present
    - inline ts-ignore or ts-expect-error annotation
source:
  origin: file
  path: tool-tsc-flow.md
  hash: "sha256:546911724246639fb9cd628285e071bf7b05daf20cf54875131cce3063905e6f"
---
# TypeScript (tsc) / Flow Type Checking Hygiene

## When This Activates

Activates when the repository contains TypeScript configuration (tsconfig.json), Flow configuration (.flowconfig), when @ts-ignore/@ts-expect-error/$FlowFixMe annotations appear in the diff, or when as any casts are introduced. Focuses on whether type checking is configured at an appropriate strictness level and whether type-safety escape hatches are justified.

## Audit Surface

- [ ] @ts-ignore present -- should use @ts-expect-error instead
- [ ] @ts-expect-error without an explanation comment
- [ ] tsconfig.json has strict: false or does not set strict: true
- [ ] as any cast without an adjacent justification comment
- [ ] skipLibCheck: true -- verify intentional and not hiding real errors
- [ ] No tsconfig for test files
- [ ] Declaration files (.d.ts) not configured for a library package
- [ ] noImplicitAny: false in a TypeScript project
- [ ] strictNullChecks: false -- null safety is not enforced
- [ ] $FlowFixMe without a ticket reference or explanation
- [ ] Type assertion (as T) on user input or external data without validation
- [ ] // @ts-nocheck on a file that is not auto-generated
- [ ] New @ts-expect-error or as any annotations exceed 3 in this PR
- [ ] tsconfig paths alias that shadows a node_modules package

## Detailed Checks

### Suppression Annotation Discipline
<!-- activation: keywords=["@ts-ignore", "@ts-expect-error", "@ts-nocheck", "$FlowFixMe", "$FlowIssue"] -->

- [ ] Flag every `@ts-ignore` -- TypeScript provides `@ts-expect-error` which is strictly better because it errors when the underlying issue is fixed, preventing stale suppressions
- [ ] Flag `@ts-expect-error` without an explanation comment -- the comment should describe why the type error cannot be resolved
- [ ] Flag `// @ts-nocheck` on any file that is not auto-generated -- this disables all type checking for the entire file
- [ ] Flag `$FlowFixMe` without a justification or ticket reference -- these are meant to be temporary
- [ ] Count new @ts-expect-error annotations in the PR -- more than 3 suggests a systemic type issue
- [ ] Flag suppressions on lines involving security-sensitive code (authentication, input parsing, data serialization)

### Strict Mode and Compiler Options
<!-- activation: file_globs=["**/tsconfig*.json"] -->

- [ ] Verify strict: true is set in the root tsconfig.json -- without it, noImplicitAny, strictNullChecks, strictFunctionTypes, and other checks are not enforced
- [ ] If strict is not set, check the individual flags: noImplicitAny, strictNullChecks, strictFunctionTypes, strictPropertyInitialization -- any of these being false creates type safety gaps
- [ ] Flag strictNullChecks: false specifically -- this is the single most impactful strict flag for preventing null/undefined bugs
- [ ] Flag skipLibCheck: true and verify it is intentional -- it hides type errors in .d.ts files from node_modules, which can mask real incompatibilities
- [ ] Verify test files are included in type checking -- a separate tsconfig.spec.json or tsconfig extending the root should cover test directories
- [ ] Check for composite/references setup in monorepos -- incorrect project references cause build ordering issues

### Any Type Escape Hatches
<!-- activation: keywords=["as any", "as unknown", ": any", "<any>"] -->

- [ ] Flag `as any` casts without an adjacent comment explaining why the type cannot be expressed -- as any silences all type checking downstream
- [ ] Flag function parameters or return types explicitly annotated as `any` -- prefer `unknown` for values of truly unknown type, then narrow with type guards
- [ ] Flag `as unknown as T` double-cast patterns -- these bypass type checking entirely and indicate a type system incompatibility that should be resolved
- [ ] Flag type assertions (`as T`) on data from external sources (API responses, user input, file reads) without runtime validation -- Zod, io-ts, or similar runtime validators should be used
- [ ] Flag `any` in generic type parameters (e.g., `Array<any>`, `Record<string, any>`) in public API signatures -- consumers lose type safety

### Declaration Files and Library Packaging
<!-- activation: file_globs=["**/tsconfig*.json", "**/*.d.ts", "**/package.json"] -->

- [ ] If the package is published (check package.json for "types" or "typings" field), verify declaration: true is set in tsconfig and .d.ts files are generated
- [ ] If .d.ts files are checked into the repo (not generated), verify they are in sync with the source .ts files
- [ ] Check that outDir does not pollute the source tree with .js and .d.ts files alongside .ts files
- [ ] Verify that paths aliases in tsconfig are reflected in the build output -- paths are compile-time only and need a bundler or tsconfig-paths at runtime

## Common False Positives

- **Third-party library without types**: Some npm packages lack type definitions. `as any` or @ts-expect-error at the import boundary is acceptable when @types/* does not exist and DefinitelyTyped has no entry.
- **Test mocks**: Test files using jest.mock() or sinon often require type assertions because mock types do not match the original. @ts-expect-error in test files is more acceptable.
- **JSON imports**: Importing JSON files may require skipLibCheck or type assertions depending on the tsconfig resolveJsonModule setting.
- **Migration from JavaScript**: Projects migrating from JS to TS legitimately have as any and @ts-expect-error as temporary measures. Flag only if no migration plan is documented.
- **Dynamic plugin systems**: Plugin architectures that load modules at runtime may need any at the loading boundary, with type narrowing after validation.

## Severity Guidance

| Finding | Severity |
|---|---|
| @ts-ignore present (should be @ts-expect-error) | Important |
| strict: false or strictNullChecks: false | Important |
| @ts-nocheck on non-generated file | Important |
| as any on external data without runtime validation | Important |
| @ts-expect-error without explanation | Minor |
| as any with justification comment | Minor |
| skipLibCheck: true (verify intentional) | Minor |
| Test files not covered by tsconfig | Minor |
| Declaration files missing for published package | Minor |

## See Also

- `style-guide-supremacy` -- tsc is the type authority for TypeScript; this reviewer checks its configuration health
- `author-self-review-hygiene` -- bare @ts-ignore without justification is a hygiene issue
- `principle-fail-fast` -- disabling strict mode or using as any defers type error detection to runtime
- `tool-eslint` -- ESLint with @typescript-eslint complements tsc; type-aware lint rules need parserOptions.project
- `principle-naming-and-intent` -- type annotations document intent; any erases that documentation

## Authoritative References

- [TypeScript: tsconfig.json Reference](https://www.typescriptlang.org/tsconfig)
- [TypeScript: Strict Mode](https://www.typescriptlang.org/docs/handbook/2/basic-types.html#strictness)
- [TypeScript: Type Assertions](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions)
- [Flow: Configuration](https://flow.org/en/docs/config/)
