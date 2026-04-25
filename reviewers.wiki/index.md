---
id: reviewers.src.wiki
type: index
depth_role: category
depth: 0
focus: subtree under reviewers.src.wiki
parents: []
shared_covers: []
generator: "skill-llm-wiki/v1"
rebuild_needed: false
rebuild_reasons: []
rebuild_command: "skill-llm-wiki rebuild <wiki> --plan"
entries:
  - id: accessibility-xr
    file: "accessibility-xr/index.md"
    type: index
    focus: "Accessibility gaps introduced when customizing headless or styled components; Ambiguous button labels (OK, Submit, Yes/No without context); Anchors created but never removed when subject leaves frame; Auto-playing media without pause mechanism"
  - id: alert-chaos
    file: "alert-chaos/index.md"
    type: index
    focus: "Action items without owner or deadline; Alert definition without a runbook link; Alert on cause (high CPU) instead of symptom (elevated latency); Alert rules not configured for new or regressing errors"
  - id: aria-visual
    file: "aria-visual/index.md"
    type: index
    focus: "ARIA attributes used incorrectly (role mismatch, missing required ARIA properties); ARIA role that does not match the element's behavior (role=button on a div without keyboard handling); Abbreviated text without expansion (title or abbr element); Accessibility announcements not posted for dynamic content changes"
  - id: bomb-gas
    file: "bomb-gas/index.md"
    type: index
    focus: API endpoints without request throttling or quota enforcement; Access control — Ownable, AccessControl, custom modifiers; Authentication endpoints without rate limiting or brute-force protection; Cloud storage buckets or services configured with public access
  - id: cache-edge
    file: "cache-edge/index.md"
    type: index
    focus: "Accumulation drift: summing many float prices diverges from exact total; Build output cached across PRs (security risk from malicious PR); Cache bypass via arbitrary query string parameters; Cache invalidation missing or inconsistent across replicas"
  - id: case-dependent
    file: "case-dependent/index.md"
    type: index
    focus: Detect bidirectional text rendering hazards, locale-dependent sorting and case-folding bugs, and collation-unaware uniqueness constraints
  - id: cell-snapshot
    file: "cell-snapshot/index.md"
    type: index
    focus: "/dev/urandom vs /dev/random misuse and entropy starvation concerns; Apply family correctness (sapply type instability vs vapply); Async/await discipline and event-loop blocking; BPF ring buffer or perf buffer overflow dropping events"
  - id: circuit-slo
    file: "circuit-slo/index.md"
    type: index
    focus: Assignment not consistent across sessions or devices, breaking stratification; Availability SLO counting only server errors, ignoring client-perceived failures; Bucketing hash skewed or collides with other concurrent experiments; Circuit breaker absorbing failures silently with no alerting or logging
  - id: classes-class
    file: "classes-class/index.md"
    type: index
    focus: "4+ layers between a request and the actual work (controller-service-manager-handler-repository-adapter); API contracts that leak internal implementation details forcing tight version coupling; API endpoint handlers with identical structure differing only in the entity name; Abstract base class with a single concrete subclass"
  - id: client-server
    file: "client-server/index.md"
    type: index
    focus: "Large component files exceeding 300 lines mixing concerns; $effect without cleanup causing stacked side effects or memory leaks; API routes without authentication or authorization checks; Accessing signal value outside reactive context (reads once, never updates)"
  - id: comments-changelog
    file: "comments-changelog/index.md"
    type: index
    focus: "API spec drift from implementation (documentation perspective); Activity diagrams that no longer match the workflow in code; AsyncAPI spec not covering all published event types; Breaking change marker (!) without a BREAKING CHANGE footer"
  - id: consumer-event
    file: "consumer-event/index.md"
    type: index
    focus: "AMQP exchange type mismatch causing messages to be dropped or misrouted; Avro default values missing, blocking reader-side evolution; Bounce handling missing -- hard and soft bounces not tracked; Breaking schema change without rolling a new major message/topic"
  - id: correctness-discipline
    file: "correctness-discipline/index.md"
    type: index
    focus: "Array handling vs string-splitting pitfalls; Block, proc, and lambda semantics — correct yield, arity, and return behavior; Callback hell (deeply nested callbacks) where async/await or futures would be clearer; Channel usage patterns and deadlock risks"
  - id: csrf-missing
    file: "csrf-missing/index.md"
    type: index
    focus: SECRET_KEY hardcoded or committed to version control; .env file committed to version control; AJAX requests without anti-CSRF headers or tokens; API endpoints that bypass UI-only access restrictions
  - id: cwe-encryption
    file: "cwe-encryption/index.md"
    type: index
    focus: Access tokens with excessive scope violating principle of least privilege; Array or table indexing with secret-dependent indices enabling cache-timing attacks; Attestation not validated when required by organizational policy; Authenticator response counter not checked for cloned authenticator detection
  - id: dependencies-lockfile
    file: "dependencies-lockfile/index.md"
    type: index
    focus: Abandoned libraries from archived repos or with no recent commits; Abandoned packages still in dependencies; AppImage without embedded signature or zsync info; Build isolation disabled allowing host contamination
  - id: domain-aggregate
    file: "domain-aggregate/index.md"
    type: index
    focus: "API gateway containing business logic instead of pure routing and composition; Abbreviations or acronyms that obscure domain meaning; Aggregate boundary not aligned with true consistency boundary; Aggregate containing too many entities or value objects (god aggregate)"
  - id: entry-entity
    file: "entry-entity/index.md"
    type: index
    focus: "-0.0 == 0.0 but 1/-0.0 == -Infinity, breaking downstream math; Accumulation error: summing many small floats diverges from expected total; Balance derived from SUM query instead of maintained incrementally; Boolean parameters that control branching inside the called function"
  - id: event-saga
    file: "event-saga/index.md"
    type: index
    focus: "API key hardcoded in source or committed to version control; API key not rotated or shared across environments; API response not validated (missing choices, empty content); APNs certificate or p8 auth key expiry not monitored"
  - id: factory-interface
    file: "factory-interface/index.md"
    type: index
    focus: "Abstract classes or interfaces with only one implementation and no planned second; Abstract factory confused with service locator or dependency injection container; Abstract factory for a single product family -- no family switching ever occurs; Abstract factory interface growing with every new product type (ISP violation)"
  - id: formatter-eslint
    file: "formatter-eslint/index.md"
    type: index
    focus: "#[allow(clippy::*)] at module or crate level suppressing too broadly; #[allow(clippy::*)] without a justification comment; #[allow(unused)] hiding real dead code; @SuppressWarnings for SAST findings without justification"
  - id: functions-named
    file: "functions-named/index.md"
    type: index
    focus: "APIs that require reading implementation to use correctly; Abbreviations and acronyms not universally understood by the team; Adding a new API field propagating through DTOs, mappers, validators, and tests; Adding a new enum value requiring updates in multiple switch/match statements"
  - id: hash-certificate
    file: "hash-certificate/index.md"
    type: index
    focus: "AES-GCM nonce reuse (catastrophic -- reveals authentication key); Argon2 configured with insufficient memory parameter for the deployment environment; CN/SAN not validated against expected client identity; Certificate chain not verified to a trusted root CA"
  - id: health-missing
    file: "health-missing/index.md"
    type: index
    focus: "!pip install inside cells (non-reproducible, order-sensitive); %env or !export setting credentials in cell source; Actions referenced by mutable tag instead of full SHA pin; Agent label too broad -- any available node"
  - id: image-deno
    file: "image-deno/index.md"
    type: index
    focus: "/tmp storage assumptions without cleanup; ADD instead of COPY -- ADD extracts tarballs and fetches URLs implicitly; Base image not pinned by digest -- mutable tag allows silent replacement; Blocking I/O on Vert.x event loop thread in Quarkus reactive routes"
  - id: index-embedding
    file: "index-embedding/index.md"
    type: index
    focus: ANN index type mismatch for dataset size and recall requirements; Aggregation pipeline stages in wrong order causing full collection scans; Analyzer mismatch between index-time and search-time analysis; Chunking strategy not aligned with document structure
  - id: key-missing
    file: "key-missing/index.md"
    type: index
    focus: ACLs used instead of bucket policy for access control; ARM template without $schema validation; AWS-managed key used where customer-managed CMK is required; Asymmetric private keys committed to version control
  - id: knex-injection
    file: "knex-injection/index.md"
    type: index
    focus: "Accessing attributes on detached instances after session close; Advisory locks held across transactions without timeout or release; Async session misuse -- blocking I/O inside async session context; Batch numbering conflict from concurrent migration development"
  - id: llm-output
    file: "llm-output/index.md"
    type: index
    focus: "CLI missing --help/-h or --version/-V; Commands always exit 0 regardless of success or failure; Cross-platform compatibility — Windows vs Linux vs macOS; Destructive commands without --confirm or dry-run"
  - id: lock-numa
    file: "lock-numa/index.md"
    type: index
    focus: "ABA problem in CAS-based data structures allowing corrupted state; ARM/POWER reordering manifesting in production but not on x86 dev machines; Atomic load followed by non-atomic store (or vice versa) on the same variable; Atomic operation on wrong granularity -- atomicity needed across multiple fields but applied to one"
  - id: main-thread
    file: "main-thread/index.md"
    type: index
    focus: "@Binding passed to child but parent does not own the state; @ObservedObject recreated on parent re-render (should be @StateObject); @State used for reference types instead of @StateObject or @Observable; ARC ownership qualifiers and retain cycle prevention"
  - id: micro-css
    file: "micro-css/index.md"
    type: index
    focus: "!important overuse via Tailwind's important config or manual !important; Alias misconfiguration causing duplicate module instances in the bundle; Arbitrary values used instead of extending the theme; Barrel file re-exports defeating tree shaking in bundlers"
  - id: middleware-missing
    file: "middleware-missing/index.md"
    type: index
    focus: "@Async method called from same class bypassing proxy; @Transactional on private methods silently not proxied; API response missing hypermedia links for navigation and discoverability; Actix-web mutable App data causing data races"
  - id: migration-sql
    file: "migration-sql/index.md"
    type: index
    focus: API version deprecated without migration path for consumers; Active record pattern mixed with data mapper causing confusion; Adding a column with a volatile default locking the table; Atlas declarative mode applying destructive changes without review
  - id: partition-key
    file: "partition-key/index.md"
    type: index
    focus: ALLOW FILTERING queries performing full table scans; ANALYZE not run after significant data loads; Ack deadline too short causing duplicate delivery; Autocomplete without debounce or rate limit
  - id: path-case
    file: "path-case/index.md"
    type: index
    focus: Detect hardcoded path separators, case sensitivity assumptions, path length limits, symlink traversal, and null bytes in file paths
  - id: phi-consent
    file: "phi-consent/index.md"
    type: index
    focus: "Ad-tech integration without IAB TCF v2.2 consent string propagation; Analytics / ads / tracking scripts loading before the user grants consent; Audit bypass in admin or system-level code paths; Audit entries missing who (actor), what (action), when (timestamp), or where (resource)"
  - id: phpstan-ruff
    file: "phpstan-ruff/index.md"
    type: index
    focus: "$FlowFixMe without a justification or ticket; .golangci.yml exclusion patterns that are too broad; @phpstan-ignore or @phpstan-ignore-next-line without justification; @psalm-suppress without justification"
  - id: pii-consent
    file: "pii-consent/index.md"
    type: index
    focus: "AML/sanctions screening not integrated into onboarding or transaction flow; API responses returning more fields than the consumer needs; Analytics collecting more granular user data than needed for insights; Analytics events with granular user data beyond aggregate need"
  - id: platform-composable
    file: "platform-composable/index.md"
    type: index
    focus: "@MainActor annotation and main-thread-only API access; ARC retain cycles from strong reference closures; Access control (internal by default) and module boundaries; AnyCancellable not stored -- subscription immediately cancelled"
  - id: plural-locale
    file: "plural-locale/index.md"
    type: index
    focus: "Address format assumed US: no province, rigid postal code format, required state; Alphabetic-only name validation rejecting hyphens, apostrophes, spaces, diacritics; Antimeridian crossing not handled; BOM (byte order mark) not stripped, causing invisible leading characters"
  - id: profiling-gpu
    file: "profiling-gpu/index.md"
    type: index
    focus: "All-reduce on wrong process group; Array-of-structs layout causing cache misses in column-oriented access; Benchmark measuring cold JIT performance instead of steady-state; Benchmark not representative of production workload (wrong data size, wrong distribution)"
  - id: safety-correctness
    file: "safety-correctness/index.md"
    type: index
    focus: "32-bit multiplication overflow in 64-bit code (multiply before widen); @inbounds/@simd annotation safety and correctness; ARC/ORC memory management pitfalls — cycles, moved refs, sink semantics; Abstract vs concrete types in containers and struct fields"
  - id: sampling-benchmark
    file: "sampling-benchmark/index.md"
    type: index
    focus: Benchmark measuring wall-clock time instead of CPU time for CPU-bound operations; Benchmark not using proper warm-up phase, measuring cold-start JIT or cache behavior; Benchmark results affected by GC pauses, context switches, or other system noise; Benchmark results not compared to a stored baseline
  - id: secrets-missing
    file: "secrets-missing/index.md"
    type: index
    focus: .env files committed without .gitignore exclusion; Activity performing non-idempotent operation without idempotency key; Activity without retry policy or timeout configuration; Application targeting HEAD of default branch without revision pinning
  - id: sidecar-mesh
    file: "sidecar-mesh/index.md"
    type: index
    focus: "Ambassador introducing single point of failure between service and external dependency; Ambassador modifying request/response semantics beyond protocol-level concerns; Ambassador not transparent to the primary service -- service knows about ambassador internals; Bases referenced by URL without pinned commit or tag"
    tags:
      - kubernetes
  - id: simd-vectorization
    file: "simd-vectorization/index.md"
    type: index
    focus: "0-based vs 1-based indexing confusion across language or API boundaries; APOC procedures exposing file system or shell access; Allocations inside Update / FixedUpdate / _process / Tick causing GC spikes; Array length vs last valid index (length is last_index + 1)"
  - id: singleton-pattern
    file: "singleton-pattern/index.md"
    type: index
    focus: "Accumulator patterns replaceable with fold/reduce/map; Broken DCL variants using a boolean flag instead of checking the object reference; Builder duplicating validation logic already present in the product constructor; Builder missing validation in build() allowing invalid objects"
  - id: state-actor
    file: "state-actor/index.md"
    type: index
    focus: "Actor hierarchy too flat -- no intermediate supervisors for fault isolation; Actor mailbox with no bounded capacity, growing until OOM under sustained load; Actor performing work in constructor before supervision is established; Actor state mutated from outside the actor (shared reference leak)"
  - id: streaming-dns
    file: "streaming-dns/index.md"
    type: index
    focus: "/etc/hosts reliance in production bypassing DNS failover; AbortController/AbortSignal not wired to fetch or stream operations; Background jobs running more frequently than business need requires; Blocking read/write/accept on socket where epoll/kqueue/io_uring would scale"
  - id: tasks-task
    file: "tasks-task/index.md"
    type: index
    focus: Active object holding locks during request processing, negating the decoupling benefit; Active object proxy that exposes internal concurrency primitives to callers; Active object scheduler that silently drops requests on queue overflow; Active object servant that leaks thread-local state across unrelated requests
  - id: tenant-iam
    file: "tenant-iam/index.md"
    type: index
    focus: AKS cluster without managed identity enabled; AKS without private cluster configuration; API endpoint accessible without tenant context validation; AdministratorAccess managed policy attached to role or user
  - id: test-tests
    file: "test-tests/index.md"
    type: index
    focus: API contract assumptions not verified against the actual service; Assertions inside loops without clarity on which iteration failed; Behavior pinned by characterization test without understanding whether it is correct or a bug; Branch coverage significantly lower than line coverage indicating untested conditionals
  - id: tool-prompt
    file: "tool-prompt/index.md"
    type: index
    focus: "API error responses not following RFC 7807 Problem Details structure; Callback handlers with side effects (I/O, state mutation) in hot path; Chain or pipeline step without error handling; Complex task prompt missing few-shot examples"
  - id: unused-code
    file: "unused-code/index.md"
    type: index
    focus: "ADR consequences section missing trade-off analysis; ADR missing required sections (status, context, decision, consequences); ADR not referenced from the code it governs; ADR numbering gaps suggesting deleted or lost records"
  - id: user-injection
    file: "user-injection/index.md"
    type: index
    focus: "404 and error pages interpolating the requested path without encoding; API responses containing user content served with text/html content type; Angular [innerHTML] binding without DomSanitizer; Array parameter injection (param[]=a&param[]=b) exploiting type confusion"
  - id: websocket-turn
    file: "websocket-turn/index.md"
    type: index
    focus: Background sync without retry limits causing infinite retries; Binary and text frame confusion causing decode errors; Character set mismatch between client, connection, and table causing mojibake or index bypass; Client with no automatic reconnection logic on connection drop
  - id: xml-fuzz
    file: "xml-fuzz/index.md"
    type: index
    focus: ".NET BinaryFormatter or NetDataContractSerializer on untrusted input; .NET BinaryFormatter, SoapFormatter, NetDataContractSerializer, and ObjectStateFormatter on untrusted streams; ABR ladder not optimized for target audience; Architecture-specific assumptions (pointer size, integer width, alignment)"
children:
  - "accessibility-xr/index.md"
  - "alert-chaos/index.md"
  - "aria-visual/index.md"
  - "bomb-gas/index.md"
  - "cache-edge/index.md"
  - "case-dependent/index.md"
  - "cell-snapshot/index.md"
  - "circuit-slo/index.md"
  - "classes-class/index.md"
  - "client-server/index.md"
  - "comments-changelog/index.md"
  - "consumer-event/index.md"
  - "correctness-discipline/index.md"
  - "csrf-missing/index.md"
  - "cwe-encryption/index.md"
  - "dependencies-lockfile/index.md"
  - "domain-aggregate/index.md"
  - "entry-entity/index.md"
  - "event-saga/index.md"
  - "factory-interface/index.md"
  - "formatter-eslint/index.md"
  - "functions-named/index.md"
  - "hash-certificate/index.md"
  - "health-missing/index.md"
  - "image-deno/index.md"
  - "index-embedding/index.md"
  - "key-missing/index.md"
  - "knex-injection/index.md"
  - "llm-output/index.md"
  - "lock-numa/index.md"
  - "main-thread/index.md"
  - "micro-css/index.md"
  - "middleware-missing/index.md"
  - "migration-sql/index.md"
  - "partition-key/index.md"
  - "path-case/index.md"
  - "phi-consent/index.md"
  - "phpstan-ruff/index.md"
  - "pii-consent/index.md"
  - "platform-composable/index.md"
  - "plural-locale/index.md"
  - "profiling-gpu/index.md"
  - "safety-correctness/index.md"
  - "sampling-benchmark/index.md"
  - "secrets-missing/index.md"
  - "sidecar-mesh/index.md"
  - "simd-vectorization/index.md"
  - "singleton-pattern/index.md"
  - "state-actor/index.md"
  - "streaming-dns/index.md"
  - "tasks-task/index.md"
  - "tenant-iam/index.md"
  - "test-tests/index.md"
  - "tool-prompt/index.md"
  - "unused-code/index.md"
  - "user-injection/index.md"
  - "websocket-turn/index.md"
  - "xml-fuzz/index.md"
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Reviewers.src.wiki

**Focus:** subtree under reviewers.src.wiki

## Children

| File | Type | Focus |
|------|------|-------|
| [accessibility-xr/index.md](accessibility-xr/index.md) | 📁 index | Accessibility gaps introduced when customizing headless or styled components; Ambiguous button labels (OK, Submit, Yes/No without context); Anchors created but never removed when subject leaves frame; Auto-playing media without pause mechanism |
| [alert-chaos/index.md](alert-chaos/index.md) | 📁 index | Action items without owner or deadline; Alert definition without a runbook link; Alert on cause (high CPU) instead of symptom (elevated latency); Alert rules not configured for new or regressing errors |
| [aria-visual/index.md](aria-visual/index.md) | 📁 index | ARIA attributes used incorrectly (role mismatch, missing required ARIA properties); ARIA role that does not match the element's behavior (role=button on a div without keyboard handling); Abbreviated text without expansion (title or abbr element); Accessibility announcements not posted for dynamic content changes |
| [bomb-gas/index.md](bomb-gas/index.md) | 📁 index | API endpoints without request throttling or quota enforcement; Access control — Ownable, AccessControl, custom modifiers; Authentication endpoints without rate limiting or brute-force protection; Cloud storage buckets or services configured with public access |
| [cache-edge/index.md](cache-edge/index.md) | 📁 index | Accumulation drift: summing many float prices diverges from exact total; Build output cached across PRs (security risk from malicious PR); Cache bypass via arbitrary query string parameters; Cache invalidation missing or inconsistent across replicas |
| [case-dependent/index.md](case-dependent/index.md) | 📁 index | Detect bidirectional text rendering hazards, locale-dependent sorting and case-folding bugs, and collation-unaware uniqueness constraints |
| [cell-snapshot/index.md](cell-snapshot/index.md) | 📁 index | /dev/urandom vs /dev/random misuse and entropy starvation concerns; Apply family correctness (sapply type instability vs vapply); Async/await discipline and event-loop blocking; BPF ring buffer or perf buffer overflow dropping events |
| [circuit-slo/index.md](circuit-slo/index.md) | 📁 index | Assignment not consistent across sessions or devices, breaking stratification; Availability SLO counting only server errors, ignoring client-perceived failures; Bucketing hash skewed or collides with other concurrent experiments; Circuit breaker absorbing failures silently with no alerting or logging |
| [classes-class/index.md](classes-class/index.md) | 📁 index | 4+ layers between a request and the actual work (controller-service-manager-handler-repository-adapter); API contracts that leak internal implementation details forcing tight version coupling; API endpoint handlers with identical structure differing only in the entity name; Abstract base class with a single concrete subclass |
| [client-server/index.md](client-server/index.md) | 📁 index | Large component files exceeding 300 lines mixing concerns; $effect without cleanup causing stacked side effects or memory leaks; API routes without authentication or authorization checks; Accessing signal value outside reactive context (reads once, never updates) |
| [comments-changelog/index.md](comments-changelog/index.md) | 📁 index | API spec drift from implementation (documentation perspective); Activity diagrams that no longer match the workflow in code; AsyncAPI spec not covering all published event types; Breaking change marker (!) without a BREAKING CHANGE footer |
| [consumer-event/index.md](consumer-event/index.md) | 📁 index | AMQP exchange type mismatch causing messages to be dropped or misrouted; Avro default values missing, blocking reader-side evolution; Bounce handling missing -- hard and soft bounces not tracked; Breaking schema change without rolling a new major message/topic |
| [correctness-discipline/index.md](correctness-discipline/index.md) | 📁 index | Array handling vs string-splitting pitfalls; Block, proc, and lambda semantics — correct yield, arity, and return behavior; Callback hell (deeply nested callbacks) where async/await or futures would be clearer; Channel usage patterns and deadlock risks |
| [csrf-missing/index.md](csrf-missing/index.md) | 📁 index | SECRET_KEY hardcoded or committed to version control; .env file committed to version control; AJAX requests without anti-CSRF headers or tokens; API endpoints that bypass UI-only access restrictions |
| [cwe-encryption/index.md](cwe-encryption/index.md) | 📁 index | Access tokens with excessive scope violating principle of least privilege; Array or table indexing with secret-dependent indices enabling cache-timing attacks; Attestation not validated when required by organizational policy; Authenticator response counter not checked for cloned authenticator detection |
| [dependencies-lockfile/index.md](dependencies-lockfile/index.md) | 📁 index | Abandoned libraries from archived repos or with no recent commits; Abandoned packages still in dependencies; AppImage without embedded signature or zsync info; Build isolation disabled allowing host contamination |
| [domain-aggregate/index.md](domain-aggregate/index.md) | 📁 index | API gateway containing business logic instead of pure routing and composition; Abbreviations or acronyms that obscure domain meaning; Aggregate boundary not aligned with true consistency boundary; Aggregate containing too many entities or value objects (god aggregate) |
| [entry-entity/index.md](entry-entity/index.md) | 📁 index | -0.0 == 0.0 but 1/-0.0 == -Infinity, breaking downstream math; Accumulation error: summing many small floats diverges from expected total; Balance derived from SUM query instead of maintained incrementally; Boolean parameters that control branching inside the called function |
| [event-saga/index.md](event-saga/index.md) | 📁 index | API key hardcoded in source or committed to version control; API key not rotated or shared across environments; API response not validated (missing choices, empty content); APNs certificate or p8 auth key expiry not monitored |
| [factory-interface/index.md](factory-interface/index.md) | 📁 index | Abstract classes or interfaces with only one implementation and no planned second; Abstract factory confused with service locator or dependency injection container; Abstract factory for a single product family -- no family switching ever occurs; Abstract factory interface growing with every new product type (ISP violation) |
| [formatter-eslint/index.md](formatter-eslint/index.md) | 📁 index | #[allow(clippy::*)] at module or crate level suppressing too broadly; #[allow(clippy::*)] without a justification comment; #[allow(unused)] hiding real dead code; @SuppressWarnings for SAST findings without justification |
| [functions-named/index.md](functions-named/index.md) | 📁 index | APIs that require reading implementation to use correctly; Abbreviations and acronyms not universally understood by the team; Adding a new API field propagating through DTOs, mappers, validators, and tests; Adding a new enum value requiring updates in multiple switch/match statements |
| [hash-certificate/index.md](hash-certificate/index.md) | 📁 index | AES-GCM nonce reuse (catastrophic -- reveals authentication key); Argon2 configured with insufficient memory parameter for the deployment environment; CN/SAN not validated against expected client identity; Certificate chain not verified to a trusted root CA |
| [health-missing/index.md](health-missing/index.md) | 📁 index | !pip install inside cells (non-reproducible, order-sensitive); %env or !export setting credentials in cell source; Actions referenced by mutable tag instead of full SHA pin; Agent label too broad -- any available node |
| [image-deno/index.md](image-deno/index.md) | 📁 index | /tmp storage assumptions without cleanup; ADD instead of COPY -- ADD extracts tarballs and fetches URLs implicitly; Base image not pinned by digest -- mutable tag allows silent replacement; Blocking I/O on Vert.x event loop thread in Quarkus reactive routes |
| [index-embedding/index.md](index-embedding/index.md) | 📁 index | ANN index type mismatch for dataset size and recall requirements; Aggregation pipeline stages in wrong order causing full collection scans; Analyzer mismatch between index-time and search-time analysis; Chunking strategy not aligned with document structure |
| [key-missing/index.md](key-missing/index.md) | 📁 index | ACLs used instead of bucket policy for access control; ARM template without $schema validation; AWS-managed key used where customer-managed CMK is required; Asymmetric private keys committed to version control |
| [knex-injection/index.md](knex-injection/index.md) | 📁 index | Accessing attributes on detached instances after session close; Advisory locks held across transactions without timeout or release; Async session misuse -- blocking I/O inside async session context; Batch numbering conflict from concurrent migration development |
| [llm-output/index.md](llm-output/index.md) | 📁 index | CLI missing --help/-h or --version/-V; Commands always exit 0 regardless of success or failure; Cross-platform compatibility — Windows vs Linux vs macOS; Destructive commands without --confirm or dry-run |
| [lock-numa/index.md](lock-numa/index.md) | 📁 index | ABA problem in CAS-based data structures allowing corrupted state; ARM/POWER reordering manifesting in production but not on x86 dev machines; Atomic load followed by non-atomic store (or vice versa) on the same variable; Atomic operation on wrong granularity -- atomicity needed across multiple fields but applied to one |
| [main-thread/index.md](main-thread/index.md) | 📁 index | @Binding passed to child but parent does not own the state; @ObservedObject recreated on parent re-render (should be @StateObject); @State used for reference types instead of @StateObject or @Observable; ARC ownership qualifiers and retain cycle prevention |
| [micro-css/index.md](micro-css/index.md) | 📁 index | !important overuse via Tailwind's important config or manual !important; Alias misconfiguration causing duplicate module instances in the bundle; Arbitrary values used instead of extending the theme; Barrel file re-exports defeating tree shaking in bundlers |
| [middleware-missing/index.md](middleware-missing/index.md) | 📁 index | @Async method called from same class bypassing proxy; @Transactional on private methods silently not proxied; API response missing hypermedia links for navigation and discoverability; Actix-web mutable App data causing data races |
| [migration-sql/index.md](migration-sql/index.md) | 📁 index | API version deprecated without migration path for consumers; Active record pattern mixed with data mapper causing confusion; Adding a column with a volatile default locking the table; Atlas declarative mode applying destructive changes without review |
| [partition-key/index.md](partition-key/index.md) | 📁 index | ALLOW FILTERING queries performing full table scans; ANALYZE not run after significant data loads; Ack deadline too short causing duplicate delivery; Autocomplete without debounce or rate limit |
| [path-case/index.md](path-case/index.md) | 📁 index | Detect hardcoded path separators, case sensitivity assumptions, path length limits, symlink traversal, and null bytes in file paths |
| [phi-consent/index.md](phi-consent/index.md) | 📁 index | Ad-tech integration without IAB TCF v2.2 consent string propagation; Analytics / ads / tracking scripts loading before the user grants consent; Audit bypass in admin or system-level code paths; Audit entries missing who (actor), what (action), when (timestamp), or where (resource) |
| [phpstan-ruff/index.md](phpstan-ruff/index.md) | 📁 index | $FlowFixMe without a justification or ticket; .golangci.yml exclusion patterns that are too broad; @phpstan-ignore or @phpstan-ignore-next-line without justification; @psalm-suppress without justification |
| [pii-consent/index.md](pii-consent/index.md) | 📁 index | AML/sanctions screening not integrated into onboarding or transaction flow; API responses returning more fields than the consumer needs; Analytics collecting more granular user data than needed for insights; Analytics events with granular user data beyond aggregate need |
| [platform-composable/index.md](platform-composable/index.md) | 📁 index | @MainActor annotation and main-thread-only API access; ARC retain cycles from strong reference closures; Access control (internal by default) and module boundaries; AnyCancellable not stored -- subscription immediately cancelled |
| [plural-locale/index.md](plural-locale/index.md) | 📁 index | Address format assumed US: no province, rigid postal code format, required state; Alphabetic-only name validation rejecting hyphens, apostrophes, spaces, diacritics; Antimeridian crossing not handled; BOM (byte order mark) not stripped, causing invisible leading characters |
| [profiling-gpu/index.md](profiling-gpu/index.md) | 📁 index | All-reduce on wrong process group; Array-of-structs layout causing cache misses in column-oriented access; Benchmark measuring cold JIT performance instead of steady-state; Benchmark not representative of production workload (wrong data size, wrong distribution) |
| [safety-correctness/index.md](safety-correctness/index.md) | 📁 index | 32-bit multiplication overflow in 64-bit code (multiply before widen); @inbounds/@simd annotation safety and correctness; ARC/ORC memory management pitfalls — cycles, moved refs, sink semantics; Abstract vs concrete types in containers and struct fields |
| [sampling-benchmark/index.md](sampling-benchmark/index.md) | 📁 index | Benchmark measuring wall-clock time instead of CPU time for CPU-bound operations; Benchmark not using proper warm-up phase, measuring cold-start JIT or cache behavior; Benchmark results affected by GC pauses, context switches, or other system noise; Benchmark results not compared to a stored baseline |
| [secrets-missing/index.md](secrets-missing/index.md) | 📁 index | .env files committed without .gitignore exclusion; Activity performing non-idempotent operation without idempotency key; Activity without retry policy or timeout configuration; Application targeting HEAD of default branch without revision pinning |
| [sidecar-mesh/index.md](sidecar-mesh/index.md) | 📁 index | Ambassador introducing single point of failure between service and external dependency; Ambassador modifying request/response semantics beyond protocol-level concerns; Ambassador not transparent to the primary service -- service knows about ambassador internals; Bases referenced by URL without pinned commit or tag |
| [simd-vectorization/index.md](simd-vectorization/index.md) | 📁 index | 0-based vs 1-based indexing confusion across language or API boundaries; APOC procedures exposing file system or shell access; Allocations inside Update / FixedUpdate / _process / Tick causing GC spikes; Array length vs last valid index (length is last_index + 1) |
| [singleton-pattern/index.md](singleton-pattern/index.md) | 📁 index | Accumulator patterns replaceable with fold/reduce/map; Broken DCL variants using a boolean flag instead of checking the object reference; Builder duplicating validation logic already present in the product constructor; Builder missing validation in build() allowing invalid objects |
| [state-actor/index.md](state-actor/index.md) | 📁 index | Actor hierarchy too flat -- no intermediate supervisors for fault isolation; Actor mailbox with no bounded capacity, growing until OOM under sustained load; Actor performing work in constructor before supervision is established; Actor state mutated from outside the actor (shared reference leak) |
| [streaming-dns/index.md](streaming-dns/index.md) | 📁 index | /etc/hosts reliance in production bypassing DNS failover; AbortController/AbortSignal not wired to fetch or stream operations; Background jobs running more frequently than business need requires; Blocking read/write/accept on socket where epoll/kqueue/io_uring would scale |
| [tasks-task/index.md](tasks-task/index.md) | 📁 index | Active object holding locks during request processing, negating the decoupling benefit; Active object proxy that exposes internal concurrency primitives to callers; Active object scheduler that silently drops requests on queue overflow; Active object servant that leaks thread-local state across unrelated requests |
| [tenant-iam/index.md](tenant-iam/index.md) | 📁 index | AKS cluster without managed identity enabled; AKS without private cluster configuration; API endpoint accessible without tenant context validation; AdministratorAccess managed policy attached to role or user |
| [test-tests/index.md](test-tests/index.md) | 📁 index | API contract assumptions not verified against the actual service; Assertions inside loops without clarity on which iteration failed; Behavior pinned by characterization test without understanding whether it is correct or a bug; Branch coverage significantly lower than line coverage indicating untested conditionals |
| [tool-prompt/index.md](tool-prompt/index.md) | 📁 index | API error responses not following RFC 7807 Problem Details structure; Callback handlers with side effects (I/O, state mutation) in hot path; Chain or pipeline step without error handling; Complex task prompt missing few-shot examples |
| [unused-code/index.md](unused-code/index.md) | 📁 index | ADR consequences section missing trade-off analysis; ADR missing required sections (status, context, decision, consequences); ADR not referenced from the code it governs; ADR numbering gaps suggesting deleted or lost records |
| [user-injection/index.md](user-injection/index.md) | 📁 index | 404 and error pages interpolating the requested path without encoding; API responses containing user content served with text/html content type; Angular [innerHTML] binding without DomSanitizer; Array parameter injection (param[]=a&param[]=b) exploiting type confusion |
| [websocket-turn/index.md](websocket-turn/index.md) | 📁 index | Background sync without retry limits causing infinite retries; Binary and text frame confusion causing decode errors; Character set mismatch between client, connection, and table causing mojibake or index bypass; Client with no automatic reconnection logic on connection drop |
| [xml-fuzz/index.md](xml-fuzz/index.md) | 📁 index | .NET BinaryFormatter or NetDataContractSerializer on untrusted input; .NET BinaryFormatter, SoapFormatter, NetDataContractSerializer, and ObjectStateFormatter on untrusted streams; ABR ladder not optimized for target audience; Architecture-specific assumptions (pointer size, integer width, alignment) |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
