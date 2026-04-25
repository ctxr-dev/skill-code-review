---
id: cicd-buildkite-drone-tekton
type: primary
depth_role: leaf
focus: Detect Buildkite, Drone, and Tekton pipeline security and reliability issues including unpinned plugins, secrets in config, missing timeouts, and insufficient step isolation
parents:
  - index.md
covers:
  - Buildkite plugins referenced without version pin or SHA
  - Drone secrets hardcoded in .drone.yml instead of drone secret store
  - Tekton Tasks without timeout
  - Pipeline-level timeout missing across all three platforms
  - "Step isolation insufficient (shared workspace, volume mounts)"
  - Drone trusted mode enabled unnecessarily
  - Tekton PipelineRun without resource limits on TaskRun pods
  - Buildkite agent without queue restriction for privileged steps
  - Missing RBAC on Tekton pipeline service accounts
  - Drone clone step without depth limit
tags:
  - buildkite
  - drone
  - tekton
  - ci-cd
  - pipeline
  - plugins
  - secrets
  - timeout
  - CWE-829
  - CWE-798
activation:
  file_globs:
    - "**/.buildkite/**"
    - "**/pipeline.yml"
    - "**/.drone.yml"
    - "**/.drone.jsonnet"
    - "**/tekton/**"
    - "**/*task*.yaml"
    - "**/*pipeline*.yaml"
  keyword_matches:
    - buildkite
    - "plugins:"
    - drone
    - tekton
    - taskRef
    - pipelineRef
    - PipelineRun
    - TaskRun
    - "steps:"
    - "agents:"
    - "queue:"
    - "trusted:"
  structural_signals:
    - Buildkite pipeline configuration change
    - Drone CI configuration change
    - Tekton Task or Pipeline manifest change
source:
  origin: file
  path: cicd-buildkite-drone-tekton.md
  hash: "sha256:d3d2b3d259a7b8c79f93ea3f7b7c3df54ed6a567ece3bfa40a3bf7533ca71125"
---
# Buildkite, Drone, and Tekton Pipeline Security

## When This Activates

Activates when diffs touch Buildkite pipeline definitions (`.buildkite/`), Drone CI configuration (`.drone.yml`), or Tekton Task/Pipeline manifests. These CI/CD platforms each have distinct security models: Buildkite agents run on your infrastructure with plugin extensibility, Drone provides container-native pipelines with a secrets store, and Tekton runs as Kubernetes-native tasks with RBAC. This reviewer detects platform-specific patterns that lead to supply chain compromise via unpinned plugins, secrets leakage, resource exhaustion from missing timeouts, and privilege escalation from insufficient isolation.

## Audit Surface

- [ ] Buildkite plugin without version pin
- [ ] Hardcoded secret in .drone.yml
- [ ] Tekton Task spec without timeout
- [ ] Pipeline without top-level timeout
- [ ] Steps sharing workspace without isolation need
- [ ] Drone pipeline with trusted: true
- [ ] Tekton TaskRun without resource limits
- [ ] Buildkite step without agents: queue restriction
- [ ] Tekton Pipeline with overly privileged service account
- [ ] Drone clone with full history fetch
- [ ] Buildkite artifact upload including sensitive files
- [ ] Tekton workspace PVC persisting across runs

## Detailed Checks

### Buildkite Plugin Pinning and Agent Security
<!-- activation: keywords=["plugins:", "buildkite", "agents:", "queue:", "artifact", "#v"] -->

- [ ] **Unpinned Buildkite plugin**: flag plugins referenced without a version pin (`org/plugin` or `org/plugin#main`) -- plugins execute arbitrary code on the agent. Pin to a specific version or SHA: `org/plugin#v3.2.1` or `org/plugin#abc123`. The plugin code can change between builds if only a branch is referenced
- [ ] **Third-party plugin from untrusted source**: flag plugins from unknown organizations that access environment variables, secrets, or perform network operations. Audit third-party plugins before use and consider forking critical plugins into your organization
- [ ] **Agent without queue restriction**: flag Buildkite steps performing privileged operations (deployment, secret access, registry push) without `agents: { queue: "deploy" }` or equivalent -- without queue targeting, the step runs on any available agent including shared or untrusted agents
- [ ] **Artifact upload with sensitive files**: flag `buildkite-agent artifact upload` patterns that include broad globs (`*`, `**/*`) or paths likely containing credentials -- artifacts are accessible to anyone with build read access

### Drone Secrets and Trusted Mode
<!-- activation: keywords=["drone", ".drone.yml", "trusted:", "from_secret:", "secret", "clone:"] -->

- [ ] **Secrets in .drone.yml**: flag `.drone.yml` containing hardcoded passwords, tokens, or API keys in `environment:` blocks -- use Drone's secret store with `from_secret:` references instead. Pipeline files are committed to version control
- [ ] **Trusted mode enabled**: flag `trusted: true` in Drone pipeline -- trusted mode disables clone restrictions and allows volume mounts including the Docker socket. Only enable for pipelines that genuinely require host access, and restrict which repositories can use trusted mode
- [ ] **Missing from_secret for sensitive variables**: flag environment variables with credential-like names (`*_TOKEN`, `*_PASSWORD`, `*_KEY`, `*_SECRET`) that are not using `from_secret:` -- these values should come from Drone's encrypted secret store
- [ ] **Clone without depth limit**: flag Drone pipelines without `clone: depth: N` -- full history clone wastes bandwidth and time. Set `depth: 1` for most pipelines unless git history is needed for versioning

### Tekton Task Security and Resource Limits
<!-- activation: keywords=["tekton", "taskRef", "pipelineRef", "TaskRun", "PipelineRun", "serviceAccountName", "resources:", "timeout:"] -->

- [ ] **Task without timeout**: flag Tekton Task specs without `timeout:` -- tasks without timeout run indefinitely, consuming cluster resources. Set timeouts on both Tasks and the overall Pipeline
- [ ] **Pipeline without timeout**: flag Tekton Pipeline or PipelineRun without a top-level `timeout:` or `timeouts:` field -- without a pipeline timeout, individual task timeouts are the only safeguard, and a missing task timeout means unbounded execution
- [ ] **Missing resource limits**: flag Tekton TaskRun step containers without `resources: { limits: { cpu:, memory: } }` -- unbounded resource usage can starve other workloads on the cluster and lead to OOM kills
- [ ] **Overly privileged service account**: flag Tekton Pipelines or Tasks using `serviceAccountName: default` with broad ClusterRole bindings or a custom service account with `cluster-admin` privileges -- apply least-privilege RBAC to Tekton service accounts

### Step Isolation and Workspace Security
<!-- activation: keywords=["workspace", "volume", "mount", "isolation", "securityContext", "runAsUser", "privileged"] -->

- [ ] **Shared workspace without isolation**: flag Tekton workspaces using PersistentVolumeClaims that persist across PipelineRuns -- artifacts and credentials from previous runs may be accessible to subsequent runs. Use `emptyDir` or VolumeClaimTemplates for ephemeral workspaces
- [ ] **Privileged step container**: flag Tekton step containers with `securityContext: { privileged: true }` -- privileged containers have full host access. Use unprivileged containers and specific Linux capabilities instead
- [ ] **Buildkite docker plugin with privileged mode**: flag Buildkite docker plugin configuration with `privileged: true` or volume mounts of `/var/run/docker.sock` -- this grants the step container full host access
- [ ] **Missing securityContext on Tekton steps**: flag Tekton Task steps without `securityContext: { runAsNonRoot: true }` -- containers default to running as root, expanding the blast radius of container escape vulnerabilities

## Common False Positives

- **Buildkite plugins in organization namespace**: plugins hosted in your own organization's GitHub namespace with verified commit processes have lower supply chain risk. Still recommend pinning but reduce severity.
- **Drone trusted mode for DinD builds**: pipelines that build Docker images legitimately need trusted mode for Docker socket access. Flag only when trusted is used for non-Docker-build pipelines.
- **Tekton Task in development namespace**: tasks in development or sandbox namespaces may legitimately use broader permissions during iteration. Flag only for production namespaces.
- **Full clone for versioning**: pipelines that derive version numbers from git tags or commit count need full clone history. `clone: depth: 0` is valid in this case.

## Severity Guidance

| Finding | Severity |
|---|---|
| Hardcoded secret in .drone.yml or Buildkite pipeline | Critical |
| Tekton Pipeline with cluster-admin service account | Critical |
| Unpinned Buildkite plugin accessing secrets or deploying | Important |
| Drone trusted mode on non-Docker-build pipeline | Important |
| Tekton Task without timeout (unbounded execution) | Important |
| Privileged step container without justification | Important |
| Buildkite step without queue restriction for deploys | Important |
| Missing resource limits on Tekton TaskRun | Minor |
| Drone clone without depth limit | Minor |
| Shared Tekton workspace PVC across runs | Minor |
| Buildkite artifact upload with broad glob | Minor |

## See Also

- `sec-supply-chain-sbom-slsa-sigstore` -- plugin pinning as supply chain control
- `sec-secrets-management-and-rotation` -- secrets in CI/CD pipelines
- `cicd-pipeline-secrets-discipline` -- cross-platform CI secrets hygiene
- `container-image-hardening` -- container security context and privilege controls
- `cicd-deploy-strategies` -- deployment safety and rollback mechanisms

## Authoritative References

- [Buildkite Security Best Practices](https://buildkite.com/docs/pipelines/security)
- [Buildkite Plugins](https://buildkite.com/docs/plugins)
- [Drone CI Secrets](https://docs.drone.io/secret/)
- [Tekton Pipelines Security](https://tekton.dev/docs/pipelines/auth/)
- [Tekton Pipeline Timeouts](https://tekton.dev/docs/pipelines/pipelineruns/#configuring-a-failure-timeout)
- [OWASP CI/CD Security Top 10](https://owasp.org/www-project-top-10-ci-cd-security-risks/)
