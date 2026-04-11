# Zod — Review Overlay

Load this overlay for the **data-validation**, **api-design**, and **test-quality** specialists when `zod` is detected in project dependencies.

---

## Schema Completeness

- [ ] Zod schemas exist at all trust boundaries: API request bodies, URL query params, environment variables, external API responses, and localStorage/cookie reads — raw data is never used before parsing
- [ ] `z.object()` schemas use `.strict()` at ingress boundaries to reject unexpected keys rather than silently stripping them (prefer explicit allowlisting over implicit passthrough)
- [ ] `z.string()` fields that represent specific formats include the appropriate refinement: `.email()`, `.url()`, `.uuid()`, `.min(1)` (to reject empty strings), `.max(n)` (to cap length)
- [ ] Enum-like string fields use `z.enum([...])` or `z.nativeEnum(MyEnum)` rather than bare `z.string()`, so invalid values are caught at the boundary

## Type Sync

- [ ] `z.infer<typeof MySchema>` is used as the TypeScript type wherever the schema is the source of truth — hand-written parallel interfaces that can drift from the schema are flagged
- [ ] Schemas are exported alongside their inferred types so consumers can import both from a single location rather than duplicating type definitions
- [ ] When a schema is updated (fields added, renamed, or removed), all callsites that reference `z.infer<typeof ThatSchema>` are verified to still compile correctly

## Transform and Refinement Safety

- [ ] `.transform()` is used only for shape/type conversion (string to Date, trimming whitespace, coercing primitives) — business logic with side effects (DB calls, API requests) does not live inside transforms
- [ ] `.refine()` and `.superRefine()` provide actionable error messages via the `message` option, not generic strings like `"Invalid"` — the message tells the user what is wrong and how to fix it
- [ ] `.refine()` predicates are pure functions with no side effects and do not throw — thrown errors inside refinements bypass Zod's error collection
- [ ] `.pipe()` is used for layered validation (e.g., parse string → validate as email) rather than nesting `.transform()` inside `.transform()`

## Coercion

- [ ] `z.coerce.*` is used explicitly only when the data source is known to produce the wrong type (e.g., query params are always strings) — it is not applied universally as a workaround for type mismatches
- [ ] `z.coerce.number()` on user input is reviewed carefully: it accepts `""` → `0` and `null` → `0`, which may be semantically incorrect; use `.min(1)` or `.positive()` if zero is invalid

## Union and Optional Semantics

- [ ] `z.discriminatedUnion("type", [...])` is used instead of `z.union([...])` when the union variants share a discriminant field — it provides better error messages and faster parsing
- [ ] `.optional()` and `.nullable()` are used deliberately and not interchangeably — `optional()` means the key may be absent, `nullable()` means the key is present but its value may be `null`
- [ ] Fields that are both optional and nullable use `.optional().nullable()` (or `z.nullish()`) explicitly; the choice is documented so reviewers understand the intent

## Safety and Reuse

- [ ] `.catch(fallback)` is only used where a safe, meaningful fallback exists and silently swallowing a parse error is intentional and documented — avoid masking validation failures
- [ ] Schemas for the same domain concept are defined once and imported where needed; duplicated schema definitions that can drift are refactored into a shared module
- [ ] `z.brand<"UserId">()` or similar nominal branding is used for primitive types that should not be interchangeable at the type level (user IDs vs order IDs both being strings)
- [ ] `safeParse` is used at boundaries where the caller needs to handle errors gracefully (user-facing validation); `parse` (which throws) is used only in contexts where a schema failure is truly unexpected and should crash fast
