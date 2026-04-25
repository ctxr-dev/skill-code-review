---
id: health-missing
type: index
depth_role: subcategory
depth: 1
focus: "!pip install inside cells (non-reproducible, order-sensitive); %env or !export setting credentials in cell source; Actions referenced by mutable tag instead of full SHA pin; Agent label too broad -- any available node"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: build-nx-turbo-lerna-rush-lage
    file: build-nx-turbo-lerna-rush-lage.md
    type: primary
    focus: Detect monorepo orchestration misconfigurations including cache invalidation errors, task graph cycles, missing affected calculation, overly broad inputs, and workspace protocol misuse
    tags:
      - nx
      - turborepo
      - turbo
      - lerna
      - rush
      - lage
      - monorepo
      - cache
      - task-graph
      - workspace
      - affected
  - id: iac-chef-puppet-salt
    file: iac-chef-puppet-salt.md
    type: primary
    focus: Detect Chef, Puppet, and Salt misconfigurations including hardcoded credentials in recipes and manifests, missing test coverage, non-idempotent resources, incomplete metadata, and state ordering issues
    tags:
      - chef
      - puppet
      - salt
      - iac
      - configuration-management
      - idempotency
      - testing
      - secrets
      - recipes
      - manifests
  - id: jupyter-notebook-reproducibility
    file: jupyter-notebook-reproducibility.md
    type: primary
    focus: Detect Jupyter notebook reproducibility hazards -- out-of-order execution, missing kernel spec, unset seeds, hardcoded paths, committed outputs, leaked secrets, and absent environment pinning
    tags:
      - jupyter
      - notebook
      - ipynb
      - reproducibility
      - data-science
      - papermill
      - nbdev
      - mlops
  - id: obs-opentelemetry-sdk-discipline
    file: obs-opentelemetry-sdk-discipline.md
    type: primary
    focus: Detect OTel SDK misconfiguration including missing exporters, NOOP providers in production, broken context propagation, and missing resource attributes
    tags:
      - opentelemetry
      - otel
      - tracing
      - metrics
      - sdk
      - exporter
      - propagation
      - resource
      - batch-processor
      - observability
  - id: perf-aot-graalvm-mojo
    file: perf-aot-graalvm-mojo.md
    type: primary
    focus: Detect reflection not registered for AOT, resource files not included in native image, native image config drift, and GraalVM substitution issues
    tags:
      - aot
      - graalvm
      - native-image
      - reflection
      - resource
      - proxy
      - quarkus
      - micronaut
      - mojo
      - performance
  - id: principle-fail-fast
    file: principle-fail-fast.md
    type: primary
    focus: Verify that errors are detected and surfaced at the earliest possible point rather than propagated silently
    tags:
      - fail-fast
      - validation
      - error-handling
      - preconditions
      - defensive-programming
  - id: health-flag
    file: "health-flag/index.md"
    type: index
    focus: "Autoscaling not configured leading to over/under-provisioning; Big-bang deployment without canary, blue-green, or rolling strategy; Blue-green without traffic switching validation; Boolean flag explosion vs. strategy/enum-based configuration"
  - id: pipeline-drone
    file: "pipeline-drone/index.md"
    type: index
    focus: Actions referenced by mutable tag instead of full SHA pin; Agent label too broad -- any available node; Agent pool without capability matching for job requirements; Approval gate missing on production deployment stage
children:
  - "health-flag/index.md"
  - "pipeline-drone/index.md"
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Health Missing

**Focus:** !pip install inside cells (non-reproducible, order-sensitive); %env or !export setting credentials in cell source; Actions referenced by mutable tag instead of full SHA pin; Agent label too broad -- any available node

## Children

| File | Type | Focus |
|------|------|-------|
| [build-nx-turbo-lerna-rush-lage.md](build-nx-turbo-lerna-rush-lage.md) | 📄 primary | Detect monorepo orchestration misconfigurations including cache invalidation errors, task graph cycles, missing affected calculation, overly broad inputs, and workspace protocol misuse |
| [iac-chef-puppet-salt.md](iac-chef-puppet-salt.md) | 📄 primary | Detect Chef, Puppet, and Salt misconfigurations including hardcoded credentials in recipes and manifests, missing test coverage, non-idempotent resources, incomplete metadata, and state ordering issues |
| [jupyter-notebook-reproducibility.md](jupyter-notebook-reproducibility.md) | 📄 primary | Detect Jupyter notebook reproducibility hazards -- out-of-order execution, missing kernel spec, unset seeds, hardcoded paths, committed outputs, leaked secrets, and absent environment pinning |
| [obs-opentelemetry-sdk-discipline.md](obs-opentelemetry-sdk-discipline.md) | 📄 primary | Detect OTel SDK misconfiguration including missing exporters, NOOP providers in production, broken context propagation, and missing resource attributes |
| [perf-aot-graalvm-mojo.md](perf-aot-graalvm-mojo.md) | 📄 primary | Detect reflection not registered for AOT, resource files not included in native image, native image config drift, and GraalVM substitution issues |
| [principle-fail-fast.md](principle-fail-fast.md) | 📄 primary | Verify that errors are detected and surfaced at the earliest possible point rather than propagated silently |
| [health-flag/index.md](health-flag/index.md) | 📁 index | Autoscaling not configured leading to over/under-provisioning; Big-bang deployment without canary, blue-green, or rolling strategy; Blue-green without traffic switching validation; Boolean flag explosion vs. strategy/enum-based configuration |
| [pipeline-drone/index.md](pipeline-drone/index.md) | 📁 index | Actions referenced by mutable tag instead of full SHA pin; Agent label too broad -- any available node; Agent pool without capability matching for job requirements; Approval gate missing on production deployment stage |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
