---
id: image-deno
type: index
depth_role: subcategory
depth: 1
focus: "/tmp storage assumptions without cleanup; ADD instead of COPY -- ADD extracts tarballs and fetches URLs implicitly; Base image not pinned by digest -- mutable tag allows silent replacement; Blocking I/O on Vert.x event loop thread in Quarkus reactive routes"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: cloud-aws-lambda
    file: cloud-aws-lambda.md
    type: primary
    focus: "Detect Lambda configuration pitfalls including cold start risk, timeout/memory misconfiguration, missing dead-letter queues, secrets in environment variables, and VPC networking traps"
    tags:
      - aws
      - lambda
      - serverless
      - cold-start
      - timeout
      - memory
      - dlq
      - vpc
      - secrets
      - tracing
      - function
      - stateless
      - architecture
  - id: container-image-hardening
    file: container-image-hardening.md
    type: primary
    focus: Detect container image security and hygiene issues including running as root, unpinned base images, missing multi-stage builds, secrets in layers, and unnecessary packages
    tags:
      - container
      - docker
      - dockerfile
      - image
      - security
      - hardening
      - multi-stage
      - root
      - digest
      - CWE-250
  - id: edge-runtimes-deno-bun-node
    file: edge-runtimes-deno-bun-node.md
    type: primary
    focus: "Detect runtime-incompatible APIs, overbroad permissions, cold-start blindspots, and unpinned deps across Deno, Bun, and Node.js (including edge/isolate deployments)"
    tags:
      - deno
      - bun
      - node
      - edge-runtime
      - isolate
      - v8
      - workers
      - deno-deploy
      - cold-start
      - permissions
  - id: fw-quarkus-micronaut
    file: fw-quarkus-micronaut.md
    type: primary
    focus: Detect Quarkus and Micronaut pitfalls including GraalVM native-image reflection breakage, CDI scope misuse, event-loop blocking, missing health checks, and serialization failures that cause build-time or runtime errors invisible during JVM development.
    tags:
      - quarkus
      - micronaut
      - graalvm
      - native-image
      - cdi
      - jakarta-ee
      - reactive
      - vert-x
      - kubernetes
      - java
      - kotlin
  - id: glue-initialization-hygiene
    file: glue-initialization-hygiene.md
    type: primary
    focus: Detect configuration and dependency validation deferred past startup, missing fail-fast on required environment variables, and initialization sequences that hide broken dependencies until first request
    tags:
      - initialization
      - startup
      - fail-fast
      - config-validation
      - boot
      - health-check
      - dependency-verification
      - env-vars
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Image Deno

**Focus:** /tmp storage assumptions without cleanup; ADD instead of COPY -- ADD extracts tarballs and fetches URLs implicitly; Base image not pinned by digest -- mutable tag allows silent replacement; Blocking I/O on Vert.x event loop thread in Quarkus reactive routes

## Children

| File | Type | Focus |
|------|------|-------|
| [cloud-aws-lambda.md](cloud-aws-lambda.md) | 📄 primary | Detect Lambda configuration pitfalls including cold start risk, timeout/memory misconfiguration, missing dead-letter queues, secrets in environment variables, and VPC networking traps |
| [container-image-hardening.md](container-image-hardening.md) | 📄 primary | Detect container image security and hygiene issues including running as root, unpinned base images, missing multi-stage builds, secrets in layers, and unnecessary packages |
| [edge-runtimes-deno-bun-node.md](edge-runtimes-deno-bun-node.md) | 📄 primary | Detect runtime-incompatible APIs, overbroad permissions, cold-start blindspots, and unpinned deps across Deno, Bun, and Node.js (including edge/isolate deployments) |
| [fw-quarkus-micronaut.md](fw-quarkus-micronaut.md) | 📄 primary | Detect Quarkus and Micronaut pitfalls including GraalVM native-image reflection breakage, CDI scope misuse, event-loop blocking, missing health checks, and serialization failures that cause build-time or runtime errors invisible during JVM development. |
| [glue-initialization-hygiene.md](glue-initialization-hygiene.md) | 📄 primary | Detect configuration and dependency validation deferred past startup, missing fail-fast on required environment variables, and initialization sequences that hide broken dependencies until first request |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
