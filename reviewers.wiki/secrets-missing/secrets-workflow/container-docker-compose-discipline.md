---
id: container-docker-compose-discipline
type: primary
depth_role: leaf
focus: Detect Docker Compose pitfalls including missing healthchecks, unguarded depends_on, host path mounts without read-only, secrets in environment, missing resource limits, and privileged mode
parents:
  - index.md
covers:
  - Missing healthcheck on services -- no way to detect unhealthy containers
  - "depends_on without condition (service_healthy) -- startup race conditions"
  - Hardcoded ports conflicting with host
  - Volumes mounting host paths without read-only flag
  - Secrets in environment variables instead of Docker secrets
  - Missing restart policy -- containers stay down after failure
  - Build context too broad -- sending entire repo to daemon
  - Privileged mode enabled without justification
  - "No resource limits (deploy.resources) -- unbounded consumption"
  - "network_mode: host without justification -- bypasses container isolation"
  - Missing named volumes -- data loss on docker compose down
  - Missing .env file for variable substitution
tags:
  - docker
  - compose
  - docker-compose
  - healthcheck
  - volumes
  - secrets
  - restart
  - networking
  - CWE-250
activation:
  file_globs:
    - "**/docker-compose*.yml"
    - "**/docker-compose*.yaml"
    - "**/compose*.yml"
    - "**/compose*.yaml"
  keyword_matches:
    - docker-compose
    - compose
    - services
    - volumes
    - networks
    - depends_on
    - healthcheck
    - deploy
    - restart
source:
  origin: file
  path: container-docker-compose-discipline.md
  hash: "sha256:5817ad878243f4ed70d8bf5a9d22d64a7c47fe8c72a8ceaccb882c019a5030fa"
---
# Docker Compose Discipline

## When This Activates

Activates on diffs touching Docker Compose files (docker-compose.yml, compose.yaml, and variants). Docker Compose is the de facto standard for multi-container local development and staging environments, but misconfigurations in compose files frequently escape into production-adjacent environments. Missing healthchecks mean depends_on provides no startup ordering guarantee, host path mounts without read-only grant containers write access to the host, secrets in environment blocks are visible via `docker inspect`, and missing restart policies leave services down after transient failures. This reviewer detects compose-level pitfalls that cause data loss, security exposure, and unreliable service orchestration.

## Audit Surface

- [ ] Service definition without healthcheck block
- [ ] depends_on without condition: service_healthy
- [ ] Service with ports mapping to privileged host ports (<1024)
- [ ] Volume mount of host path without :ro suffix
- [ ] Environment block containing password, secret, token, or key values
- [ ] Service without restart policy
- [ ] Build context set to . without .dockerignore
- [ ] Service with privileged: true
- [ ] Service without deploy.resources.limits
- [ ] Service with network_mode: host
- [ ] Volume using anonymous volume (no named volume)
- [ ] Variable substitution without default value
- [ ] Service exposing ports with 0.0.0.0 binding
- [ ] Multiple services sharing the same host port

## Detailed Checks

### Healthchecks and Dependency Ordering
<!-- activation: keywords=["healthcheck", "depends_on", "condition", "service_healthy", "service_started", "service_completed_successfully", "test", "interval", "timeout", "retries"] -->

- [ ] **Missing healthcheck**: flag services without a `healthcheck` block -- without healthchecks, Docker has no way to determine if the process inside the container is actually ready; `depends_on` ordering is meaningless without health status
- [ ] **depends_on without condition**: flag `depends_on` entries that list service names without `condition: service_healthy` -- without the condition, Docker only waits for the container to start (process running), not for the service to be ready; databases, message brokers, and APIs need healthcheck-based ordering
- [ ] **Healthcheck test using CMD-SHELL without proper check**: flag healthcheck tests that only check process existence (e.g., `pgrep`) instead of service readiness (e.g., `curl localhost/health`, `pg_isready`) -- a running process does not mean the service accepts connections
- [ ] **Overly aggressive healthcheck**: flag healthcheck with interval under 5s and retries under 3 -- aggressive healthchecks on slow-starting services (databases, JVM apps) cause premature unhealthy status and dependent service failure

### Secrets and Environment Variables
<!-- activation: keywords=["environment", "env_file", "secrets", "password", "token", "key", "credential", "POSTGRES_PASSWORD", "MYSQL_ROOT_PASSWORD", "API_KEY"] -->

- [ ] **Secrets in environment block**: flag environment variables with names containing password, secret, token, key, or credential that have literal values -- environment variables are visible via `docker inspect` and in process listings; use Docker secrets, env_file with .gitignored files, or external secret management
- [ ] **Missing .env file for substitution**: flag compose files using `${VARIABLE}` syntax without a corresponding .env file or env_file directive -- variable substitution silently resolves to empty string when the variable is not set, causing misconfigured services
- [ ] **Variable without default**: flag `${VARIABLE}` without `${VARIABLE:-default}` or `${VARIABLE:?error}` syntax -- missing variables resolve to empty strings silently; use `:-` for defaults or `:?` to fail fast on missing required variables
- [ ] **Sensitive env_file committed**: flag env_file references pointing to files that are not in .gitignore -- the env_file likely contains secrets that should not be in version control

### Volume Mounts and Data Persistence
<!-- activation: keywords=["volumes", "bind", "mount", "named", "anonymous", "ro", "read_only", "tmpfs", "driver", "host"] -->

- [ ] **Host path mount without read-only**: flag bind mounts (host:container paths) without the `:ro` suffix when the service only needs to read the data -- writable host mounts allow the container to modify or delete files on the host filesystem, including source code and configuration
- [ ] **Anonymous volumes**: flag volume mounts using container paths without corresponding entries in the top-level `volumes:` section -- anonymous volumes are recreated on `docker compose down && up`, causing data loss for databases and stateful services
- [ ] **Missing named volumes for databases**: flag database services (postgres, mysql, mongo, redis) without named volumes for their data directories -- data is stored in anonymous volumes or container layers and is lost on recreation
- [ ] **Mounting Docker socket**: flag volume mounts of `/var/run/docker.sock` -- this grants the container full control over the Docker daemon, equivalent to root access on the host; only use for explicitly authorized management tools

### Networking and Port Exposure
<!-- activation: keywords=["ports", "expose", "network_mode", "networks", "host", "bridge", "0.0.0.0", "127.0.0.1"] -->

- [ ] **network_mode: host**: flag services using `network_mode: host` -- this bypasses Docker networking entirely, eliminating network isolation between the container and host; the service binds directly to host interfaces and conflicts with other host services
- [ ] **Ports bound to 0.0.0.0**: flag port mappings without explicit host binding (e.g., `8080:8080` instead of `127.0.0.1:8080:8080`) -- the default binds to all interfaces, exposing development services to the network; bind to 127.0.0.1 for local-only access
- [ ] **Port conflicts**: flag multiple services mapping to the same host port -- only one service can bind a host port; the second service fails silently or causes a startup error depending on the compose version
- [ ] **Privileged ports**: flag services mapping to host ports below 1024 without justification -- privileged ports require root on the host and may conflict with system services

### Resource Limits and Restart Policy
<!-- activation: keywords=["deploy", "resources", "limits", "reservations", "cpus", "memory", "restart", "unless-stopped", "always", "on-failure", "privileged"] -->

- [ ] **Missing restart policy**: flag services without a `restart` directive -- when the container crashes or the host reboots, the service stays down; use `unless-stopped` or `on-failure` for production-adjacent environments
- [ ] **Missing resource limits**: flag services without `deploy.resources.limits` (memory, cpus) -- a runaway process consumes all host memory or CPU, affecting all other services in the compose stack
- [ ] **Privileged mode enabled**: flag services with `privileged: true` -- this disables all container security mechanisms and grants the container full host access; almost no workload needs privileged mode in compose environments
- [ ] **Broad build context**: flag `build.context: .` at repository root without a .dockerignore -- the entire repository (including .git history, node_modules, test data) is sent to the build daemon, slowing builds and risking secret inclusion

## Common False Positives

- **Local development environments**: development compose files may intentionally use host mounts, skip resource limits, and bind to 0.0.0.0 for developer convenience. Flag only if the compose file is used in CI/staging/production paths.
- **Docker-in-Docker CI runners**: CI compose files may legitimately mount the Docker socket and use privileged mode for build agents. Verify the use case is CI-only.
- **Single-developer projects**: restart policies and resource limits may be overkill for personal projects. Apply severity based on context.
- **Infrastructure services**: monitoring tools (Prometheus, Grafana) and reverse proxies (nginx, traefik) may legitimately bind to privileged ports and use host networking.
- **Init services**: short-lived init containers (migrations, seed data) do not need healthchecks or restart policies.

## Severity Guidance

| Finding | Severity |
|---|---|
| Secrets in plain text in environment block | Critical |
| Privileged mode on workload service | Critical |
| Docker socket mounted without justification | Critical |
| depends_on without service_healthy condition | Important |
| Host path mount without read-only flag | Important |
| Missing healthcheck on dependency service | Important |
| Anonymous volumes for database data (data loss) | Important |
| network_mode: host without justification | Important |
| Ports bound to 0.0.0.0 in non-dev context | Minor |
| Missing restart policy | Minor |
| Missing resource limits | Minor |
| Variable substitution without default | Minor |

## See Also

- `container-image-hardening` -- Dockerfile-level checks complementing compose-level discipline
- `sec-owasp-a05-misconfiguration` -- compose misconfigurations as security misconfiguration class
- `k8s-manifest-correctness` -- Kubernetes manifest checks for compose-to-k8s migration validation
- `principle-fail-fast` -- missing healthchecks and silent empty variables violate fail-fast

## Authoritative References

- [Docker Compose Specification](https://docs.docker.com/compose/compose-file/)
- [Docker Documentation: Compose Healthcheck](https://docs.docker.com/compose/compose-file/05-services/#healthcheck)
- [Docker Documentation: Secrets in Compose](https://docs.docker.com/compose/use-secrets/)
- [CIS Docker Benchmark v1.6](https://www.cisecurity.org/benchmark/docker)
