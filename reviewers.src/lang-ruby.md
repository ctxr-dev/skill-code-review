---
id: lang-ruby
type: primary
focus: Ruby idioms, metaprogramming discipline, type safety via Sorbet/RBS, and secure coding practices
parents:
- index.md
covers:
- Block, proc, and lambda semantics — correct yield, arity, and return behavior
- Metaprogramming discipline — define_method over method_missing, audit surface limited
- Sorbet/RBS type annotations on public API boundaries
- Frozen string literal pragma and mutation safety
- Gemfile hygiene — pinned versions, no git refs in production
- Enumerable usage over manual loops and index arithmetic
- Rails-isms leaking into non-Rails code (ActiveSupport monkeypatches)
- Exception hierarchy — StandardError subclasses, not bare rescue
- Thread safety in multi-threaded servers (Puma, Sidekiq)
- Safe constant lookup and autoloading (Zeitwerk conventions)
- Secure deserialization — no YAML.load, no Marshal.load on untrusted data
dimensions:
- correctness
- security
audit_surface:
- No bare `rescue` without exception class — always `rescue StandardError` or narrower
- No `method_missing` without `respond_to_missing?` — prefer `define_method` over `method_missing` entirely
- 'Frozen string literals enabled (`# frozen_string_literal: true`) in all new files'
- Gemfile pins major versions — no floating `gem 'foo'` without version constraint
- No `eval`, `instance_eval`, or `class_eval` with user-controlled strings
- No `YAML.unsafe_load` or `YAML.load` on untrusted input — use `YAML.safe_load`
- No `Marshal.load` on untrusted data — deserialization is arbitrary code execution
- Sorbet `sig` blocks on public methods or RBS type signatures maintained alongside code
- Enumerable methods (`map`, `select`, `reduce`) preferred over `each` + manual accumulator mutation
- No Rails-specific monkey-patches (`blank?`, `present?`, `try`) in gem/library code
- Thread-local state uses `Thread.current[]` or `RequestStore` — not global variables or class variables
- Hash access uses `fetch` with default or `dig` — not bare `[]` that silently returns `nil`
languages:
- ruby
tags:
- ruby
- rails
- sorbet
- rbs
- metaprogramming
- gems
- bundler
activation:
  file_globs:
  - '**/*.rb'
  - '**/*.rake'
  - '**/Gemfile'
  - '**/*.gemspec'
  - '**/Rakefile'
  structural_signals:
  - Ruby source files in diff
  - Gemfile or gemspec changes
tools:
- name: rubocop
  purpose: Ruby lint
---

# Ruby Quality Reviewer

## When This Activates

Activates when the diff contains `.rb`, `.rake`, `.gemspec` files, `Gemfile`, or `Rakefile`. Covers Ruby idioms, metaprogramming safety, type layer adoption, Gem dependency hygiene, and security-sensitive patterns. Applies to both Rails and non-Rails Ruby code.

## Audit Surface

- [ ] No bare `rescue` without exception class — always `rescue StandardError` or narrower
- [ ] No `method_missing` without `respond_to_missing?` — prefer `define_method` over `method_missing` entirely
- [ ] Frozen string literals enabled (`# frozen_string_literal: true`) in all new files
- [ ] Gemfile pins major versions — no floating `gem 'foo'` without version constraint
- [ ] No `eval`, `instance_eval`, or `class_eval` with user-controlled strings
- [ ] No `YAML.unsafe_load` or `YAML.load` on untrusted input — use `YAML.safe_load`
- [ ] No `Marshal.load` on untrusted data — deserialization is arbitrary code execution
- [ ] Sorbet `sig` blocks on public methods or RBS type signatures maintained alongside code
- [ ] Enumerable methods (`map`, `select`, `reduce`) preferred over `each` + manual accumulator mutation
- [ ] No Rails-specific monkey-patches (`blank?`, `present?`, `try`) in gem/library code
- [ ] Thread-local state uses `Thread.current[]` or `RequestStore` — not global variables or class variables
- [ ] Hash access uses `fetch` with default or `dig` — not bare `[]` that silently returns `nil`

## Detailed Checks

### Blocks, Procs & Lambdas
<!-- activation: keywords=["yield", "proc", "lambda", "->", "&block", "Proc.new"] -->

- [ ] `yield` used only when a block is always expected — `block_given?` checked when block is optional
- [ ] Lambda (`->`) preferred over `Proc.new` — lambdas enforce arity and `return` scoping
- [ ] `&block` parameter captured only when the block must be stored or forwarded — `yield` is faster for single-use
- [ ] `return` inside a proc vs lambda understood — proc `return` exits the enclosing method (often a bug)
- [ ] Block passed to `define_method` is a closure — captured variables do not cause unintended sharing
- [ ] No `proc` where `lambda` is intended — arity mismatch silently ignored by procs
- [ ] `Proc#call` or `.()` used consistently — not mixing `proc.call`, `proc.()`, and `proc[]`

### Metaprogramming Discipline
<!-- activation: keywords=["define_method", "method_missing", "const_missing", "class_eval", "instance_eval", "send", "respond_to"] -->

- [ ] `define_method` preferred over `method_missing` — methods are visible in `instance_methods` and stack traces
- [ ] Every `method_missing` has a matching `respond_to_missing?` — otherwise `respond_to?` lies
- [ ] `send` not used to bypass `private`/`protected` — use `public_send` for dispatching
- [ ] `class_eval`/`instance_eval` with string form avoided — block form is safer and debuggable
- [ ] `const_missing` used sparingly — prefer explicit autoloading (Zeitwerk) over magic constant resolution
- [ ] Metaprogrammed methods documented with YARD `@!method` annotations — IDE and docs can discover them
- [ ] Dynamic method generation bounded — no unbounded `define_method` in loops from user input

### Sorbet / RBS Type Layer
<!-- activation: keywords=["sig", "T.", "T::", "typed:", "rbs", "Sorbet", ".rbi"] -->

- [ ] `# typed: strict` or higher on new files — at minimum `# typed: true` for sig enforcement
- [ ] `sig` blocks on all public methods — return type and parameter types specified
- [ ] `T.nilable` used explicitly — not `T.untyped` as a cop-out for nullable values
- [ ] `T.untyped` count not increasing — each new usage justified (e.g., FFI boundary)
- [ ] `T::Struct` / `T::Enum` preferred for value objects — not raw hashes with implicit schemas
- [ ] RBI files for gems regenerated after version bumps — stale signatures cause false safety
- [ ] `T.let`, `T.cast`, `T.must` used at boundaries — not scattered through business logic

### Exception Handling
<!-- activation: keywords=["rescue", "raise", "begin", "ensure", "retry"] -->

- [ ] `rescue => e` always specifies a class — bare `rescue` catches `StandardError` but reads as catching everything
- [ ] Custom exceptions inherit from `StandardError` — not `Exception` (which includes `SignalException`, `SystemExit`)
- [ ] `ensure` blocks do not raise — a raising `ensure` masks the original exception
- [ ] `retry` has a counter or backoff — unbounded `retry` creates infinite loops
- [ ] Exception message includes context — not just `raise "error"` without diagnostic info
- [ ] `rescue` in method body uses postfix form only for simple one-liners — complex handling gets `begin`/`rescue`/`end`

### Gemfile & Dependency Hygiene
<!-- activation: file_globs=["**/Gemfile", "**/*.gemspec", "**/Gemfile.lock"] -->

- [ ] Every gem has a version constraint — at minimum pessimistic (`~>`) or exact
- [ ] No `git:` or `github:` refs in production Gemfile — these bypass the Rubygems audit pipeline
- [ ] `Gemfile.lock` committed for applications — not committed for gems (`.gemspec` controls deps)
- [ ] `require: false` used for gems only needed in specific contexts (Rake tasks, generators)
- [ ] Security-sensitive gems (`bcrypt`, `jwt`, crypto) pinned to exact versions
- [ ] `gemspec` metadata includes `allowed_push_host` and `rubygems_mfa_required`

### Enumerable & Collection Idioms
<!-- activation: keywords=["each", "map", "select", "reject", "reduce", "inject", "flat_map", "group_by"] -->

- [ ] `map` used instead of `each` + `push` into array — declarative over imperative
- [ ] `select`/`reject` instead of `each` + conditional `push`
- [ ] `reduce`/`inject` with explicit initial value — no implicit first-element confusion
- [ ] `flat_map` instead of `map` + `flatten` — single pass
- [ ] `any?`/`all?`/`none?` with block instead of `select` + `empty?` — short-circuits
- [ ] `each_with_object` preferred over `reduce` when building a mutable accumulator (Hash/Array)
- [ ] Chained enumerables on large collections use `lazy` to avoid intermediate array allocation

### Security Pitfalls
<!-- activation: keywords=["eval", "send", "system", "exec", "open", "URI", "Net::HTTP", "Kernel"] -->

- [ ] No `Kernel#open` with user input — use `File.open` or `URI.open` explicitly (avoids pipe command injection)
- [ ] No `system`/backticks/`exec` with string interpolation from user input — use array form: `system("cmd", arg)`
- [ ] No `constantize` or `safe_constantize` on user input — arbitrary class instantiation
- [ ] `SecureRandom` used instead of `rand` for tokens, secrets, nonces
- [ ] `Regexp` from user input wrapped in `Regexp.timeout` (Ruby 3.2+) — prevents ReDoS
- [ ] HTTP responses set `Content-Type` explicitly — no sniffing-based XSS
- [ ] Passwords compared with `ActiveSupport::SecurityUtils.secure_compare` — timing-safe

### Thread Safety & Concurrency
<!-- activation: keywords=["Thread", "Mutex", "Queue", "Ractor", "@@", "Concurrent::"] -->

- [ ] No class variables (`@@`) — they are shared across inheritance and not thread-safe; use class-level instance variables with mutex
- [ ] Global state (`$var`) not mutated at request time — only set at boot
- [ ] `Mutex` or `Monitor` protects shared mutable state — not relying on GIL (GIL does not guarantee atomicity of Ruby-level operations)
- [ ] `Concurrent::Hash`/`Concurrent::Map` from concurrent-ruby used for shared collections
- [ ] Lazy-initialized constants use `Mutex` or frozen values — `||=` is not thread-safe for complex initialization
- [ ] Sidekiq jobs are stateless — no instance variable carryover between invocations
- [ ] Database connections returned to pool — no connection leaks in threaded workers

## Common False Positives

- **`rescue => e` in top-level error handlers** — broad rescue at the outermost layer (middleware, job wrapper) is intentional as a catch-all
- **`method_missing` in well-known DSL builders** (e.g., `Builder::XmlMarkup`) — established libraries that predate `define_method` patterns
- **`each` for pure side-effect iteration** — `each` is correct when the goal is side effects (logging, I/O); `map` would allocate a useless array
- **Unfrozen string literals in files requiring mutation** — some files legitimately mutate strings; the pragma is a default, not a mandate
- **`T.untyped` in generated RBI files** — auto-generated signatures may use `T.untyped`; the source of truth is the gem, not the shim

## Severity Guidance

| Finding | Severity |
|---------|----------|
| `YAML.load` / `Marshal.load` on untrusted input | Critical |
| `eval` / `class_eval` with user-controlled string | Critical |
| `Kernel#open` with user input (command injection) | Critical |
| `system`/backticks with interpolated user input | Critical |
| Bare `rescue` catching `Exception` (swallows `SignalException`) | Critical |
| Class variable (`@@`) mutated at request time in threaded server | Important |
| `method_missing` without `respond_to_missing?` | Important |
| Gemfile dependency without version constraint | Important |
| `Proc.new` where lambda semantics are needed (arity/return) | Important |
| Missing Sorbet `sig` on new public method | Important |
| `each` + accumulator instead of `map`/`select` | Minor |
| Missing `# frozen_string_literal: true` pragma | Minor |
| `Hash#[]` instead of `Hash#fetch` or `Hash#dig` | Minor |

## See Also

- `language-quality` — universal type system, resource management, and concurrency checks
- `security` — cross-language security patterns (injection, auth, secrets)
- `dependency-supply-chain` — cross-language dependency hygiene
- `test-quality` — RSpec/Minitest conventions and test design
- `concurrency-async` — cross-language threading and async patterns

## Authoritative References

- [Ruby Style Guide](https://rubystyle.guide/) — community-maintained style guide
- [RuboCop Documentation](https://docs.rubocop.org/) — linter rules reference
- [Sorbet Documentation](https://sorbet.org/docs/overview) — gradual typing for Ruby
- [Ruby Security Best Practices](https://ruby-doc.org/stdlib/libdoc/openssl/rdoc/OpenSSL.html) — stdlib security docs
- [Bundler Best Practices](https://bundler.io/guides/best_practices.html) — Gemfile conventions
- [Ruby Concurrency](https://ruby-concurrency.github.io/concurrent-ruby/) — concurrent-ruby library docs