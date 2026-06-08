---
id: reviewers.src.wiki
type: index
depth_role: category
depth: 0
focus: "reviewers.src.wiki: ai-ml: Detect unbounded agent loops, missing maximum iterations, absent human-in-the-loop for destructive actions, lost agent state on crash, missing reflection steps, and uncoordinated multi-agent systems; Detect PII..."
parents: []
shared_covers: []
tags:
  - "503"
  - 60fps
  - "a/b-test"
  - a06
  - a07
  - a08
  - a09
  - a10
  - a11y
  - aaa-pattern
  - ab-testing
  - aba
  - abac
  - abortcontroller
  - abr
  - abstract-factory
  - abstraction
  - accept-language
  - acceptance-test
  - access-control
generator: "skill-llm-wiki/v1"
rebuild_needed: false
rebuild_reasons: []
rebuild_command: "skill-llm-wiki rebuild <wiki> --plan"
entries:
  - id: ai-ml
    file: "ai-ml/index.md"
    type: index
    focus: "ai-ml: Detect unbounded agent loops, missing maximum iterations, absent human-in-the-loop for destructive actions, lost agent state on crash, missing reflection steps, and uncoordinated multi-agent systems; Detect PII in training data or..."
    tags:
      - agent
      - airflow
      - alerting
      - ann
      - anthropic
      - api-key
      - authorization
      - benchmark
      - bias
      - buffering
      - callback
      - chain
      - checkpoint
      - chromadb
      - chunking
      - ci
      - citation
      - cohere
      - confidence
      - content-filtering
  - id: antipatterns-smells
    file: "antipatterns-smells/index.md"
    type: index
    focus: "antipatterns-smells: Detect excessive fine-grained interactions between components that should communicate through coarser-grained interfaces; Detect copy-pasted code blocks that introduce duplication, divergence risk, and latent bugs fr..."
    tags:
      - abstraction
      - alternative-classes
      - anti-pattern
      - api-design
      - architecture
      - architecture-astronaut
      - batch
      - bidirectional-dependency
      - bloater
      - blob
      - bug
      - callback-hell
      - catch
      - change-preventer
      - chatty
      - clean-code
      - clone
      - code-smell
      - complexity
      - concurrency
  - id: api-networking
    file: "api-networking/index.md"
    type: index
    focus: "api-networking: Detect GraphQL Federation issues including subgraph boundary violations, entity resolution failures, shared type conflicts, and composition errors; Detect API gateway and BFF anti-patterns including business logic in the ..."
    tags:
      - acknowledgment
      - aggregation
      - algolia
      - alpn
      - alt-svc
      - amqp
      - analyzer
      - api
      - api-gateway
      - apns
      - apollo
      - architecture
      - authentication
      - authorization
      - backend-for-frontend
      - backlog
      - backpressure
      - backward-compatibility
      - bff
      - bm25
  - id: architecture
    file: "architecture/index.md"
    type: index
    focus: "architecture: Detect cell boundary violations, missing cell-level isolation, uncontained blast radius, and missing cell routing; Detect dependency rule violations where inner rings import outer rings, use cases contain framework code, or..."
    tags:
      - acl
      - adapter
      - aggregate
      - aggregate-root
      - anemic-domain
      - anemic-domain-model
      - anti-corruption-layer
      - anti-pattern
      - application-service
      - architecture
      - behavioral-pattern
      - big-ball-of-mud
      - blast-radius
      - boundaries
      - bounded-context
      - caching
      - cell
      - cell-based
      - chatty
      - clean-architecture
  - id: cicd-build
    file: "cicd-build/index.md"
    type: index
    focus: "cicd-build: Detect Bazel, Buck, and Pants misconfigurations including non-hermetic builds, missing BUILD files, unpinned external dependencies, remote cache security issues, and overly broad genrule scripts; Detect Bundler misconfigurati..."
    tags:
      - activity
      - affected
      - akamai
      - approval-gate
      - architecture
      - argo-workflows
      - artifacts
      - attestation
      - attribution
      - author-discipline
      - autoload
      - automation
      - azure-devops
      - background-jobs
      - bazel
      - beam
      - binary
      - blue-green
      - bom
      - branch-protection
  - id: cloud
    file: "cloud/index.md"
    type: index
    focus: "cloud: Detect API Gateway misconfigurations including missing authorizers, absent WAF integration, permissive CORS, missing throttling, and request validation gaps; Detect DynamoDB design pitfalls including hot partition keys, missing GS..."
    tags:
      - acl
      - aks
      - api-gateway
      - architecture
      - aurora
      - authorizer
      - autoscaling
      - aws
      - azure
      - backup
      - bucket
      - caching
      - capacity
      - cloud-functions
      - cloud-run
      - cloud-security
      - cloudflare
      - cmk
      - cold-start
      - concurrency
  - id: compliance-privacy
    file: "compliance-privacy/index.md"
    type: index
    focus: "compliance-privacy: Detect consent lifecycle and data retention gaps including no consent record before processing, non-granular consent, no re-consent on purpose change, data retained beyond stated period, no automated retention enforce..."
    tags:
      - access-control
      - aicpa
      - analytics
      - annex-a
      - asset-classification
      - audit
      - audit-records
      - audit-trail
      - availability
      - boundary-protection
      - business-continuity
      - caching
      - california-privacy
      - cardholder-data
      - ccpa
      - change-management
      - clinical
      - compliance
      - consent
      - consumer-rights
  - id: concurrency
    file: "concurrency/index.md"
    type: index
    focus: "concurrency: Detect unbounded mailboxes, shared mutable state between actors, blocking inside actors, and missing supervision in actor-based systems.; Detect missing cancellation propagation, ignored cancel tokens, resource leaks on canc..."
    tags:
      - aba
      - abortcontroller
      - actor
      - actor-model
      - akka
      - async
      - async-await
      - atomic
      - atomically
      - atomicity
      - atomics
      - barrier
      - cancellation
      - cancellationtoken
      - cas
      - channels
      - communicating-sequential-processes
      - compare-and-swap
      - completablefuture
      - composability
  - id: correctness-footguns
    file: "correctness-footguns/index.md"
    type: index
    focus: "correctness-footguns: Detect bidirectional text rendering hazards, locale-dependent sorting and case-folding bugs, and collation-unaware uniqueness constraints; Detect destructive data operations (DELETE, UPDATE, bulk write via ORM or ra..."
    tags:
      - addresses
      - argon2
      - atomicity
      - authentication
      - backtracking
      - base-case
      - bcrypt
      - bidi
      - bom
      - boundary
      - buffer-overflow
      - bulk-mutation
      - byte-order
      - c
      - caching
      - case-folding
      - check-then-act
      - collation
      - collision-resistance
      - comparison
  - id: data-architecture
    file: "data-architecture/index.md"
    type: index
    focus: "data-architecture: Detect missing backup strategies, untested restore procedures, undefined RPO/RTO, missing point-in-time recovery, and absent cross-region replication for disaster recovery; Detect CDC lag risks, missing ordering guaran..."
    tags:
      - aggregate
      - architecture
      - arrays
      - async
      - audit-trail
      - backfill
      - backup
      - cdc
      - change-data-capture
      - consistency
      - constraints
      - cqrs
      - cross-region
      - data-architecture
      - data-loss
      - data-types
      - ddd
      - ddl
      - debezium
      - deploy-ordering
  - id: data-stores
    file: "data-stores/index.md"
    type: index
    focus: "data-stores: Detect BigQuery pitfalls around slot usage, clustering, partitioning, wildcard tables, DML quotas, streaming inserts vs batch loading, and cost control; Detect Cassandra and ScyllaDB pitfalls around partition key design, tom..."
    tags:
      - advisory-lock
      - aggregation
      - alembic
      - allow-filtering
      - analyze
      - analyzer
      - aof
      - apoc
      - atlas
      - autogenerate
      - aws
      - baseline
      - bb8
      - big-key
      - bigquery
      - branch
      - brin
      - bulk-insert
      - bulk-operations
      - busy-timeout
  - id: design-patterns
    file: "design-patterns/index.md"
    type: index
    focus: "design-patterns: Detect misuse, over-application, and absence of the Abstract Factory pattern when creating families of related objects.; Detect misuse, over-application, and absence of the Active Object pattern in asynchronous decouplin..."
    tags:
      - abstract-factory
      - access-control
      - action
      - active-object
      - actor
      - aggregator
      - algorithm
      - api-design
      - ast
      - async
      - base-class
      - behavioral-pattern
      - behavioural-pattern
      - builder
      - caching
      - callback
      - canonical
      - chain-of-responsibility
      - checkpoint
      - clone
  - id: documentation
    file: "documentation/index.md"
    type: index
    focus: "documentation: Catch hygiene issues the author should have resolved before requesting review -- debug artifacts, untracked TODOs, suppressed lints, and leftover scaffolding; Enforce Conventional Commits message structure, subject line di..."
    tags:
      - activity-diagram
      - adr
      - api-documentation
      - api-reference
      - api-spec
      - architecture
      - architecture-decision-record
      - architecture-diagram
      - asyncapi
      - badges
      - c4-model
      - changelog
      - ci-validation
      - class-diagram
      - clean-code
      - comments
      - commit-messages
      - container-diagram
      - contract
      - contributing
  - id: domains
    file: "domains/index.md"
    type: index
    focus: "domains: Detect reentrancy, access control gaps, oracle manipulation, gas pitfalls, front-running, and upgrade storage collisions in smart contracts; Detect inventory race conditions, stale cart prices at checkout, client-side tax calcul..."
    tags:
      - "a/b-test"
      - abr
      - access-control
      - accounting
      - aimbot
      - als
      - aml
      - anti-cheat
      - audio
      - automerge
      - blockchain
      - cart
      - cheat
      - checkout
      - coap
      - codec
      - cold-start
      - collaborative
      - collaborative-filtering
      - compliance
  - id: frameworks
    file: "frameworks/index.md"
    type: index
    focus: "frameworks: Detect Angular-specific pitfalls in change detection, RxJS subscription management, template security, and module architecture.; Detect ASP.NET Core and Blazor pitfalls including missing authorization attributes, input valida..."
    tags:
      - action
      - activerecord
      - actix-web
      - actuator
      - admin
      - akka-http
      - angular
      - anti-forgery
      - api
      - app-router
      - architecture
      - aspnetcore
      - astro
      - async
      - authentication
      - authorization
      - axum
      - backend
      - backpressure
      - blade
  - id: frontend
    file: "frontend/index.md"
    type: index
    focus: "frontend: Detect incorrect ARIA roles, misuse of aria-hidden on focusable elements, missing aria-live for dynamic content, redundant ARIA on native elements, and aria-label without visible label.; Detect missing focus indicators, broken ..."
    tags:
      - a11y
      - accept-language
      - accessibility
      - accessibilitylabel
      - alt-text
      - android
      - animation
      - antd
      - apollo
      - ar
      - arcore
      - aria
      - aria-live
      - arkit
      - assistive-technology
      - atomic-css
      - avif
      - axe
      - background-sync
      - barrel-files
  - id: infrastructure
    file: "infrastructure/index.md"
    type: index
    focus: "infrastructure: Detect Docker Compose pitfalls including missing healthchecks, unguarded depends_on, host path mounts without read-only, secrets in environment, missing resource limits, and privileged mode; Detect container image securit..."
    tags:
      - admission
      - ambassador
      - ansible
      - apparmor
      - applicationset
      - architecture
      - argocd
      - arm
      - audit
      - authorization
      - aws
      - azure
      - base
      - bicep
      - binary-authorization
      - cache
      - capabilities
      - cdk
      - cel
      - chart
  - id: languages
    file: "languages/index.md"
    type: index
    focus: "languages: Catch correctness, concurrency, and interop bugs in Clojure/ClojureScript diffs; C++ correctness, memory safety, modern idioms (C++17/20/23), and undefined behavior prevention; Nullable reference types, async/await correctness..."
    tags:
      - actors
      - adts
      - apple
      - arc
      - arc-orc
      - async
      - async-await
      - automation
      - beam
      - bioinformatics
      - borrowing
      - browser
      - bundler
      - c++
      - cabal
      - cats-effect
      - channels
      - ci-cd
      - cocoa
      - comptime
  - id: mobile-platform
    file: "mobile-platform/index.md"
    type: index
    focus: "mobile-platform: Detect embedded / RTOS hazards -- ISR misuse, watchdog omissions, stack sizing, priority inversion, DMA memory placement, missing volatile, and MMIO / memory-barrier bugs; Detect Room queries on the main thread, missing ..."
    tags:
      - 60fps
      - actor
      - android
      - appimage
      - apple
      - async
      - async-await
      - autolayout
      - background-work
      - bare-metal
      - battery
      - boundary
      - bridge
      - build
      - cache
      - caching
      - cancellable
      - cancellation
      - canonical-abi
      - chocolatey
  - id: observability
    file: "observability/index.md"
    type: index
    focus: "observability: Detect analytics event-schema gaps including inconsistent naming conventions, no event registry, PII in event properties, high-cardinality dimensions, unversioned payload changes, duplicated events, missing identify-on-aut..."
    tags:
      - a09
      - ab-testing
      - alert-fatigue
      - alerting
      - amplitude
      - analytics
      - audit
      - audit-log
      - audit-trail
      - availability
      - batch-processor
      - blameless
      - bpf
      - bugsnag
      - burn-rate
      - cardinality
      - chaos-engineering
      - compliance
      - config
      - configuration
  - id: performance
    file: "performance/index.md"
    type: index
    focus: "performance: Detect reflection not registered for AOT, resource files not included in native image, native image config drift, and GraalVM substitution issues; Detect O(n^2) or worse algorithmic complexity in hot paths where a more effic..."
    tags:
      - affinity
      - algorithm
      - alignment
      - allocation
      - anti-pattern
      - aos-soa
      - aot
      - async
      - auto-vectorization
      - benchmark
      - benchmarking
      - big-o
      - boxing
      - cache-line
      - cache-locality
      - closure
      - cold-start
      - complexity
      - container
      - continuous-profiling
  - id: principles
    file: "principles/index.md"
    type: index
    focus: "principles: Verify that functions either perform an action (command) or return data (query) but do not mix both responsibilities; Detect inappropriate inheritance hierarchies and promote delegation/composition as the default reuse mechan..."
    tags:
      - access-control
      - anemic-domain
      - api-design
      - architecture
      - behavior-colocation
      - clean-architecture
      - clean-code
      - cohesion
      - command
      - composition
      - concurrency
      - consistency
      - convention
      - coupling
      - cqs
      - defensive-copy
      - defensive-programming
      - delegation
      - dependencies
      - design-patterns
  - id: reliability
    file: "reliability/index.md"
    type: index
    focus: "reliability: Detect unbounded queues, missing flow control between producer and consumer, and message loss under load; Detect shared resource pools, missing isolation between dependencies, and resource exhaustion cascading across unrelat..."
    tags:
      - "503"
      - ack
      - admission-control
      - architecture
      - at-least-once
      - at-most-once
      - backoff
      - backpressure
      - bounded
      - budget
      - bulkhead
      - cancellation
      - capacity
      - cascading
      - cascading-failure
      - cdc
      - choreography
      - circuit-breaker
      - command
      - compensation
  - id: security
    file: "security/index.md"
    type: index
    focus: "security: Detect cookie consent and tracking-pixel compliance gaps including tracking scripts loading before consent, missing or asymmetric consent banner, uncategorized consent, ad-tech pixels firing pre-consent, missing IAB TCF v2.2 in..."
    tags:
      - a07
      - a08
      - a10
      - abac
      - access-control
      - adtech
      - algorithm
      - allowlist
      - artifact
      - attack-surface
      - attestation
      - authenticated-encryption
      - authentication
      - authorization
      - billion-laughs
      - binaryformatter
      - bola
      - browser-security
      - business-logic
      - cache-deception
  - id: testing
    file: "testing/index.md"
    type: index
    focus: "testing: Detect unbounded cloud resource scaling, missing cost alerts, expensive queries without optimization, unused provisioned resources, excessive logging verbosity, and missing cost-allocation tags; Detect aggregated maintainability..."
    tags:
      - aaa-pattern
      - acceptance-test
      - afl
      - api-contract
      - approval-test
      - approval-testing
      - assertion-quality
      - assertion-strength
      - assertions
      - assets
      - baseline
      - batch
      - benchmark
      - blast-radius
      - branch-coverage
      - budget
      - caching
      - change-amplification
      - chaos-engineering
      - characterization-test
  - id: tooling
    file: "tooling/index.md"
    type: index
    focus: "tooling: Detect schema-evolution hazards in binary serialization formats -- reused field numbers, missing reserved markers, enum reordering, required fields added, and schema-registry integration gaps; Detect CLI/TUI ergonomics failures ..."
    tags:
      - a06
      - abstraction
      - adapter
      - aggregator
      - agpl
      - allow
      - anti-pattern
      - any
      - any-type
      - api
      - api-surface
      - api-versioning
      - attribution
      - avro
      - backfill
      - backward-compatibility
      - baseline
      - biome
      - black
      - blue-green
children:
  - "ai-ml/index.md"
  - "antipatterns-smells/index.md"
  - "api-networking/index.md"
  - "architecture/index.md"
  - "cicd-build/index.md"
  - "cloud/index.md"
  - "compliance-privacy/index.md"
  - "concurrency/index.md"
  - "correctness-footguns/index.md"
  - "data-architecture/index.md"
  - "data-stores/index.md"
  - "design-patterns/index.md"
  - "documentation/index.md"
  - "domains/index.md"
  - "frameworks/index.md"
  - "frontend/index.md"
  - "infrastructure/index.md"
  - "languages/index.md"
  - "mobile-platform/index.md"
  - "observability/index.md"
  - "performance/index.md"
  - "principles/index.md"
  - "reliability/index.md"
  - "security/index.md"
  - "testing/index.md"
  - "tooling/index.md"
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Reviewers.src.wiki

**Focus:** reviewers.src.wiki: ai-ml: Detect unbounded agent loops, missing maximum iterations, absent human-in-the-loop for destructive actions, lost agent state on crash, missing reflection steps, and uncoordinated multi-agent systems; Detect PII...

## Children

| File | Type | Focus |
|------|------|-------|
| [ai-ml/index.md](ai-ml/index.md) | 📁 index | ai-ml: Detect unbounded agent loops, missing maximum iterations, absent human-in-the-loop for destructive actions, lost agent state on crash, missing reflection steps, and uncoordinated multi-agent systems; Detect PII in training data or... |
| [antipatterns-smells/index.md](antipatterns-smells/index.md) | 📁 index | antipatterns-smells: Detect excessive fine-grained interactions between components that should communicate through coarser-grained interfaces; Detect copy-pasted code blocks that introduce duplication, divergence risk, and latent bugs fr... |
| [api-networking/index.md](api-networking/index.md) | 📁 index | api-networking: Detect GraphQL Federation issues including subgraph boundary violations, entity resolution failures, shared type conflicts, and composition errors; Detect API gateway and BFF anti-patterns including business logic in the ... |
| [architecture/index.md](architecture/index.md) | 📁 index | architecture: Detect cell boundary violations, missing cell-level isolation, uncontained blast radius, and missing cell routing; Detect dependency rule violations where inner rings import outer rings, use cases contain framework code, or... |
| [cicd-build/index.md](cicd-build/index.md) | 📁 index | cicd-build: Detect Bazel, Buck, and Pants misconfigurations including non-hermetic builds, missing BUILD files, unpinned external dependencies, remote cache security issues, and overly broad genrule scripts; Detect Bundler misconfigurati... |
| [cloud/index.md](cloud/index.md) | 📁 index | cloud: Detect API Gateway misconfigurations including missing authorizers, absent WAF integration, permissive CORS, missing throttling, and request validation gaps; Detect DynamoDB design pitfalls including hot partition keys, missing GS... |
| [compliance-privacy/index.md](compliance-privacy/index.md) | 📁 index | compliance-privacy: Detect consent lifecycle and data retention gaps including no consent record before processing, non-granular consent, no re-consent on purpose change, data retained beyond stated period, no automated retention enforce... |
| [concurrency/index.md](concurrency/index.md) | 📁 index | concurrency: Detect unbounded mailboxes, shared mutable state between actors, blocking inside actors, and missing supervision in actor-based systems.; Detect missing cancellation propagation, ignored cancel tokens, resource leaks on canc... |
| [correctness-footguns/index.md](correctness-footguns/index.md) | 📁 index | correctness-footguns: Detect bidirectional text rendering hazards, locale-dependent sorting and case-folding bugs, and collation-unaware uniqueness constraints; Detect destructive data operations (DELETE, UPDATE, bulk write via ORM or ra... |
| [data-architecture/index.md](data-architecture/index.md) | 📁 index | data-architecture: Detect missing backup strategies, untested restore procedures, undefined RPO/RTO, missing point-in-time recovery, and absent cross-region replication for disaster recovery; Detect CDC lag risks, missing ordering guaran... |
| [data-stores/index.md](data-stores/index.md) | 📁 index | data-stores: Detect BigQuery pitfalls around slot usage, clustering, partitioning, wildcard tables, DML quotas, streaming inserts vs batch loading, and cost control; Detect Cassandra and ScyllaDB pitfalls around partition key design, tom... |
| [design-patterns/index.md](design-patterns/index.md) | 📁 index | design-patterns: Detect misuse, over-application, and absence of the Abstract Factory pattern when creating families of related objects.; Detect misuse, over-application, and absence of the Active Object pattern in asynchronous decouplin... |
| [documentation/index.md](documentation/index.md) | 📁 index | documentation: Catch hygiene issues the author should have resolved before requesting review -- debug artifacts, untracked TODOs, suppressed lints, and leftover scaffolding; Enforce Conventional Commits message structure, subject line di... |
| [domains/index.md](domains/index.md) | 📁 index | domains: Detect reentrancy, access control gaps, oracle manipulation, gas pitfalls, front-running, and upgrade storage collisions in smart contracts; Detect inventory race conditions, stale cart prices at checkout, client-side tax calcul... |
| [frameworks/index.md](frameworks/index.md) | 📁 index | frameworks: Detect Angular-specific pitfalls in change detection, RxJS subscription management, template security, and module architecture.; Detect ASP.NET Core and Blazor pitfalls including missing authorization attributes, input valida... |
| [frontend/index.md](frontend/index.md) | 📁 index | frontend: Detect incorrect ARIA roles, misuse of aria-hidden on focusable elements, missing aria-live for dynamic content, redundant ARIA on native elements, and aria-label without visible label.; Detect missing focus indicators, broken ... |
| [infrastructure/index.md](infrastructure/index.md) | 📁 index | infrastructure: Detect Docker Compose pitfalls including missing healthchecks, unguarded depends_on, host path mounts without read-only, secrets in environment, missing resource limits, and privileged mode; Detect container image securit... |
| [languages/index.md](languages/index.md) | 📁 index | languages: Catch correctness, concurrency, and interop bugs in Clojure/ClojureScript diffs; C++ correctness, memory safety, modern idioms (C++17/20/23), and undefined behavior prevention; Nullable reference types, async/await correctness... |
| [mobile-platform/index.md](mobile-platform/index.md) | 📁 index | mobile-platform: Detect embedded / RTOS hazards -- ISR misuse, watchdog omissions, stack sizing, priority inversion, DMA memory placement, missing volatile, and MMIO / memory-barrier bugs; Detect Room queries on the main thread, missing ... |
| [observability/index.md](observability/index.md) | 📁 index | observability: Detect analytics event-schema gaps including inconsistent naming conventions, no event registry, PII in event properties, high-cardinality dimensions, unversioned payload changes, duplicated events, missing identify-on-aut... |
| [performance/index.md](performance/index.md) | 📁 index | performance: Detect reflection not registered for AOT, resource files not included in native image, native image config drift, and GraalVM substitution issues; Detect O(n^2) or worse algorithmic complexity in hot paths where a more effic... |
| [principles/index.md](principles/index.md) | 📁 index | principles: Verify that functions either perform an action (command) or return data (query) but do not mix both responsibilities; Detect inappropriate inheritance hierarchies and promote delegation/composition as the default reuse mechan... |
| [reliability/index.md](reliability/index.md) | 📁 index | reliability: Detect unbounded queues, missing flow control between producer and consumer, and message loss under load; Detect shared resource pools, missing isolation between dependencies, and resource exhaustion cascading across unrelat... |
| [security/index.md](security/index.md) | 📁 index | security: Detect cookie consent and tracking-pixel compliance gaps including tracking scripts loading before consent, missing or asymmetric consent banner, uncategorized consent, ad-tech pixels firing pre-consent, missing IAB TCF v2.2 in... |
| [testing/index.md](testing/index.md) | 📁 index | testing: Detect unbounded cloud resource scaling, missing cost alerts, expensive queries without optimization, unused provisioned resources, excessive logging verbosity, and missing cost-allocation tags; Detect aggregated maintainability... |
| [tooling/index.md](tooling/index.md) | 📁 index | tooling: Detect schema-evolution hazards in binary serialization formats -- reused field numbers, missing reserved markers, enum reordering, required fields added, and schema-registry integration gaps; Detect CLI/TUI ergonomics failures ... |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
