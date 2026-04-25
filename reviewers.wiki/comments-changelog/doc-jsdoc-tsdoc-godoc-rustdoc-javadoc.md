---
id: doc-jsdoc-tsdoc-godoc-rustdoc-javadoc
type: primary
depth_role: leaf
focus: Detect missing, redundant, or stale API doc comments across language ecosystems, ensuring public interfaces are documented with meaningful content
parents:
  - index.md
covers:
  - Public API exported without doc comments
  - Doc comments that restate the function name without adding information
  - "Missing @param, @returns, or equivalent descriptions"
  - Stale doc comments that no longer match the function signature after refactoring
  - "Missing @deprecated annotations on sunset APIs"
  - Excessive doc comments on private or internal implementation details
  - "Doc comments with broken or unresolvable @link or @see references"
  - Missing module-level or package-level documentation
  - "Comments explaining *what* code does instead of *why* it does it"
  - Commented-out code blocks preserved in the source
  - "TODO/FIXME/HACK/XXX comments without ticket or issue references"
  - Comments that contradict or no longer match the code they annotate
  - Comments compensating for poor naming by restating intent the name should convey
  - "Journal or changelog comments embedded in source files (author, date, modification history)"
  - Redundant doc comments that restate the function signature in prose
  - End-of-line comments explaining a single obvious statement
  - "Section-divider comments (banners, dashes, equals signs) inside function bodies"
  - Comments apologizing for code quality or complexity instead of fixing the root cause
tags:
  - jsdoc
  - tsdoc
  - godoc
  - rustdoc
  - javadoc
  - kdoc
  - pydoc
  - doc-comments
  - api-documentation
  - public-api
  - comments
  - deodorant
  - readability
  - naming
  - dead-code
  - clean-code
  - dispensable
aliases:
  - smell-comments-as-deodorant
activation:
  file_globs:
    - "**/*.js"
    - "**/*.ts"
    - "**/*.jsx"
    - "**/*.tsx"
    - "**/*.go"
    - "**/*.rs"
    - "**/*.java"
    - "**/*.kt"
    - "**/*.py"
    - "**/*.cs"
    - "**/*.swift"
  keyword_matches:
    - "/**"
    - "///"
    - "//!"
    - "\"\"\""
    - "@param"
    - "@returns"
    - "@return"
    - "@throws"
    - "@deprecated"
    - "@see"
    - "@link"
    - "@example"
    - ":param"
    - ":returns"
    - ":raises"
    - doc
  structural_signals:
    - New exported function, method, class, or type
    - Changed function signature on a public API
    - New module or package
source:
  origin: file
  path: doc-jsdoc-tsdoc-godoc-rustdoc-javadoc.md
  hash: "sha256:566b46365c566aaebc2add657ca68a1c1794c6b4e34d74275eb71bb8b611f5ed"
---
# API Doc Comments (JSDoc / TSDoc / GoDoc / RustDoc / JavaDoc)

## When This Activates

Activates when diffs add or modify public/exported functions, methods, classes, types, or interfaces, or when doc comments are added, changed, or removed. Doc comments are the primary API documentation for library consumers and team members who use a module without reading its implementation. Missing doc comments force consumers to read source code. Redundant doc comments that restate names add noise. Stale doc comments after refactoring actively mislead. This reviewer balances documentation coverage with documentation quality.

## Audit Surface

- [ ] Exported/public function or method has no doc comment
- [ ] Exported/public class, struct, trait, or interface has no doc comment
- [ ] Doc comment restates the function name: `/** Gets the user */ getUser()`
- [ ] @param description repeats the parameter name without adding semantics
- [ ] @returns description restates the return type without explaining what it represents
- [ ] Doc comment references parameter names not in the current signature
- [ ] Doc comment describes behavior the function no longer performs
- [ ] Public API marked for removal has no @deprecated tag with migration guidance
- [ ] Doc comment on private/internal function that adds no value beyond what the name says
- [ ] @link or @see reference points to a renamed or deleted symbol
- [ ] Package or module has no top-level doc comment (package.go, mod.rs, index.ts)
- [ ] Code examples in doc comments do not compile or run (doctest failures)
- [ ] Doc comment template with unfilled placeholders (@param arg0, @returns TODO)

## Detailed Checks

### Missing Doc Comments on Public APIs
<!-- activation: keywords=["export", "public", "pub", "func", "function", "class", "struct", "trait", "interface", "module", "package"] -->

- [ ] Every exported function, method, class, struct, trait, or interface has a doc comment -- the first sentence should explain what the symbol does and why a consumer would use it
- [ ] Package-level or module-level documentation exists: Go packages need a `package.go` or leading comment in the main file; Rust crates need `//!` in `lib.rs` or `mod.rs`; TypeScript modules benefit from a JSDoc block at the top of their entry point
- [ ] Constructors and factory methods document preconditions, required parameters, and what the returned instance represents
- [ ] Enum types and their variants have doc comments explaining when each variant applies -- not just the variant name

### Redundant and Low-Value Doc Comments
<!-- activation: keywords=["@param", "@returns", "@return", ":param", ":returns", "/**", "///", '"""'] -->

- [ ] Flag doc comments that repeat the function name as a sentence: `/** Creates a user. */ createUser()` -- add what a "user" means in this context, what side effects occur, or what errors are possible
- [ ] Flag @param tags that echo the parameter name: `@param name the name` -- describe constraints (max length, format), defaults, or when the parameter is optional
- [ ] Flag @returns tags that restate the type: `@returns {string} the result` -- describe what the string contains and when it might be null/undefined/empty
- [ ] Flag doc comments on private methods that merely narrate the code: `// loops through items and filters` -- if the method name is `filterExpiredItems`, the doc adds nothing
- [ ] Flag auto-generated doc stubs with placeholder content: `@param arg0`, `@returns TODO`, `@throws Exception` with no description

### Stale Doc Comments After Refactoring
<!-- activation: keywords=["rename", "refactor", "param", "return", "throws", "deprecated"] -->

- [ ] @param tags reference parameters that exist in the current signature -- flag tags naming parameters that were renamed or removed during refactoring
- [ ] @returns description matches the actual return value -- flag when a refactor changes the return type but the doc comment still describes the old return
- [ ] @throws/@raises lists exceptions the function can actually throw -- flag documented exceptions that the function no longer raises, and undocumented exceptions it now does
- [ ] @see and @link references point to symbols that exist -- flag references to renamed or deleted classes, methods, or modules
- [ ] When a function's behavior changes in the diff, verify the doc comment is updated in the same PR

### @deprecated Annotations and Migration Guidance
<!-- activation: keywords=["deprecated", "Deprecated", "@deprecated", "sunset", "removal", "replaced", "migration"] -->

- [ ] Public APIs scheduled for removal are annotated with @deprecated (or language equivalent: `#[deprecated]` in Rust, `@Deprecated` in Java/Kotlin)
- [ ] The deprecation annotation includes a message explaining what to use instead: `@deprecated Use createUserV2() instead. Will be removed in v3.0.`
- [ ] Deprecation notices include a timeline or version for removal so consumers can plan migration
- [ ] Deprecated APIs that have been fully replaced by alternatives should be removed in a future major version, not left indefinitely

### Doc Tests and Examples
<!-- activation: keywords=["@example", "```", "doctest", "Example", "# Examples"] -->

- [ ] Code examples in doc comments are syntactically valid and match the current API signature -- stale examples that use removed parameters or old return types mislead consumers
- [ ] Rust `///` examples compile and pass as doctests (`cargo test --doc`) -- broken examples fail CI and signal unmaintained documentation
- [ ] Go `Example` functions in test files compile and produce the documented output
- [ ] Complex public APIs include at least one usage example in their doc comment -- examples are the fastest path to understanding for consumers

## Common False Positives

- **Trivial getters and setters**: `getId()`, `setName()` on data classes may not need doc comments if the property name is self-explanatory. Flag only when the accessor has non-obvious behavior (lazy loading, validation, side effects).
- **Interface implementations**: Methods implementing an interface or overriding a parent class inherit documentation. Do not flag the implementation unless it adds behavior beyond the contract.
- **Internal packages**: Code in `internal/`, `_private/`, or non-exported modules has a smaller audience. Apply lighter documentation requirements.
- **Generated code**: Protobuf-generated, OpenAPI-generated, or ORM-generated code has doc comments controlled by the generator. Fix documentation at the schema level, not in generated output.
- **Mathematical or algorithmic code**: Functions implementing well-known algorithms may reference the algorithm name and paper citation rather than explaining every parameter.

## Severity Guidance

| Finding | Severity |
|---|---|
| Public API function with no doc comment in a library consumed by other teams | Important |
| Doc comment describes behavior the function no longer performs (misleads consumers) | Important |
| @param references a parameter that does not exist in the signature | Important |
| Public API deprecated without @deprecated annotation or migration path | Important |
| Doc comment restates the function name without adding information | Minor |
| @param repeats the parameter name as its description | Minor |
| Package or module missing top-level documentation | Minor |
| Doc comment on a private method that adds no value | Minor |
| Code example in doc comment uses outdated API | Minor |

## See Also

- `smell-comments-as-deodorant` -- doc comments that restate names are a form of comment deodorant; redundancy detection overlaps
- `principle-naming-and-intent` -- well-named functions need lighter doc comments; poorly named ones need heavier ones
- `doc-openapi-asyncapi` -- API specs and doc comments serve different audiences (external consumers vs code-level consumers) but should be consistent
- `api-openapi-asyncapi-schema` -- generated API docs pull from both spec files and doc comments

## Authoritative References

- [JSDoc Reference](https://jsdoc.app/)
- [TSDoc Specification](https://tsdoc.org/)
- [Effective Go: Commentary](https://go.dev/doc/effective_go#commentary)
- [The Rustdoc Book](https://doc.rust-lang.org/rustdoc/)
- [Javadoc Tool Reference](https://docs.oracle.com/en/java/javase/21/javadoc/)
- [Google Java Style Guide: Javadoc](https://google.github.io/styleguide/javaguide.html#s7-javadoc)
- [KDoc Reference (Kotlin)](https://kotlinlang.org/docs/kotlin-doc.html)
