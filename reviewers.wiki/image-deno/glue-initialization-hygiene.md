---
id: glue-initialization-hygiene
type: primary
depth_role: leaf
focus: Detect configuration and dependency validation deferred past startup, missing fail-fast on required environment variables, and initialization sequences that hide broken dependencies until first request
parents:
  - index.md
covers:
  - Required environment variable not validated at startup
  - Configuration read and validated only on first request instead of at boot
  - Database connectivity not verified during initialization
  - Dependency health check missing from startup sequence
  - Lazy initialization hiding a broken or unreachable dependency
  - Initialization order dependencies not documented or enforced
  - Startup taking too long without progress logging
  - Service accepting traffic before initialization completes
  - Missing fail-fast on invalid configuration values
  - Connection pool created but not tested with a probe query
tags:
  - initialization
  - startup
  - fail-fast
  - config-validation
  - boot
  - health-check
  - dependency-verification
  - env-vars
activation:
  file_globs:
    - "**/*"
  keyword_matches: []
  structural_signals:
    - Any code diff
source:
  origin: file
  path: glue-initialization-hygiene.md
  hash: "sha256:5c6cc1267f0c0187ca045554307a4a455da33043e6a8a6f5da84dcc9f976777d"
---
# Initialization Hygiene

## When This Activates

Always loaded. Every diff should be checked for initialization patterns that defer validation past startup. A service that boots successfully but fails on the first request because a required env var is missing or the database is unreachable wastes deploy time, delays incident detection, and violates fail-fast. This reviewer catches deferred configuration reads, untested connections, undocumented init ordering, and silent startup failures.

## Audit Surface

- [ ] Required env var read at request time instead of startup
- [ ] No startup validation for database or cache connectivity
- [ ] Lazy singleton initialized on first call with no fallback if it fails
- [ ] Service registers with load balancer before init completes
- [ ] Config file parsed but individual values not schema-validated at boot
- [ ] Initialization logs missing -- no way to diagnose slow or stuck startup
- [ ] Implicit ordering between init steps with no documented dependency graph
- [ ] Connection string assembled but not tested until first query
- [ ] Default value silently used when required config is missing
- [ ] Background init task failures swallowed -- main thread proceeds unaware

## Detailed Checks

### Startup Configuration Validation
<!-- activation: keywords=["env", "config", "getenv", "process.env", "os.environ", "os.Getenv", "System.getenv", "Environment", "dotenv", "ConfigurationManager", "settings", "yaml", "toml", "json"] -->

- [ ] **Env var read at request time**: flag request handlers, controller methods, or service functions that read `process.env`, `os.environ`, `os.Getenv`, or `System.getenv` directly -- required config should be read once at startup, validated, and injected as typed values
- [ ] **Missing required-var check**: flag startup code that reads an env var without checking for empty or undefined -- a missing `DATABASE_URL` should crash the process at boot, not produce a cryptic connection error on the first query
- [ ] **Default masking missing config**: flag code that provides a fallback default for a variable that has no valid default (e.g., `API_KEY || "changeme"`, `db_host or "localhost"`) -- silent defaults hide misconfigured deployments until they cause data loss or auth failures
- [ ] **No schema validation on config object**: flag parsed config (YAML, TOML, JSON, env bundle) used without schema validation (Zod, Pydantic, JSON Schema, joi, valibot) -- individual field types and constraints should be checked at load time, not assumed correct

### Dependency Connectivity at Boot
<!-- activation: keywords=["connect", "ping", "pool", "client", "connection", "database", "redis", "queue", "kafka", "rabbit", "mongo", "postgres", "mysql", "health", "ready", "init"] -->

- [ ] **Database connection not tested at startup**: flag services that create a connection pool or ORM instance but do not execute a probe query (`SELECT 1`, `PING`) during initialization -- a misconfigured connection string is only discovered when the first request arrives
- [ ] **Cache/queue not verified**: flag services that configure Redis, Memcached, Kafka, RabbitMQ, or SQS clients at boot but do not verify connectivity -- a typo in the broker URL surfaces as a mysterious timeout on the first publish or consume
- [ ] **Lazy-init hiding broken dependency**: flag lazy singletons or on-demand connection factories for critical dependencies (database, auth provider, payment gateway) -- if initialization fails, every request that triggers the lazy init will fail, and the error is reported per-request instead of once at startup
- [ ] **Connection pool created but never warmed**: flag pool configurations with `min_connections > 0` where no initial connections are actually opened -- the pool reports healthy but has not verified that connections can be established

### Init Ordering and Progress
<!-- activation: keywords=["init", "startup", "boot", "before", "after", "depends", "order", "ready", "listen", "serve", "register", "migrate"] -->

- [ ] **Traffic accepted before init completes**: flag HTTP servers that call `listen()` or register with a load balancer before all initialization steps (migrations, cache warming, config validation) have finished -- premature traffic causes 500s or stale responses
- [ ] **Undocumented init ordering**: flag initialization code with implicit ordering dependencies (e.g., cache client must be created before the service that uses it, migrations must run before ORM model registration) with no comments, dependency graph, or framework-enforced ordering
- [ ] **No startup progress logging**: flag initialization sequences longer than 3 steps that produce no log output -- when startup hangs in production, operators need to know which step stalled
- [ ] **Background init failure swallowed**: flag goroutines, threads, or async tasks spawned during startup whose errors are not propagated to the main initialization flow -- a failed background init (cache priming, schema migration) goes unnoticed while the service appears healthy

## Common False Positives

- **Feature-flag reads at request time**: feature flag values that change at runtime are intentionally read per-request, not at startup. Flag only configuration that is static for the process lifetime.
- **Optional enrichment services**: services used for non-critical enrichment (analytics, recommendations) may legitimately use lazy initialization with graceful degradation. Verify the fallback is handled.
- **Serverless cold starts**: Lambda/Cloud Functions initialize on first invocation by design. Init hygiene applies to the handler's init phase, not to the platform's cold start.
- **Hot-reload in development**: development servers intentionally re-read config on change. Flag only production startup paths.

## Severity Guidance

| Finding | Severity |
|---|---|
| Required secret or credential not validated at startup (fails on first request) | Critical |
| Service accepts traffic before database migration completes | Critical |
| Required env var silently defaults to placeholder value in production | Important |
| Database or cache connectivity not verified at boot | Important |
| Lazy singleton for critical dependency with no error handling | Important |
| Background init task failure swallowed by main thread | Important |
| No startup progress logging for multi-step initialization | Minor |
| Init ordering dependency expressed only in comments, not enforced | Minor |

## See Also

- `principle-fail-fast` -- deferred config validation is the canonical fail-fast violation
- `reliability-health-checks` -- readiness probes should not pass until initialization completes
- `principle-separation-of-concerns` -- configuration loading, validation, and dependency wiring are separate concerns that should not be mixed into request handlers
- `sec-secrets-management-and-rotation` -- secrets read at request time instead of startup may also indicate missing secrets management

## Authoritative References

- [12-Factor App: III. Config](https://12factor.net/config)
- [12-Factor App: IX. Disposability](https://12factor.net/disposability)
- [Jim Shore - Fail Fast (IEEE Software)](https://www.jamesshore.com/v2/blog/2004/fail-fast)
- [Michael Nygard, *Release It!* (2nd ed., 2018), Chapter 5: "Stability Patterns"](https://pragprog.com/titles/mnee2/release-it-second-edition/)
- [Kubernetes Documentation: Configure Liveness, Readiness and Startup Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
