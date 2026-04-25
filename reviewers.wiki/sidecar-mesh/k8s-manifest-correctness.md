---
id: k8s-manifest-correctness
type: primary
depth_role: leaf
focus: Detect Kubernetes manifest misconfigurations including missing resource limits, absent probes, insecure securityContext, missing disruption budgets, and image hygiene issues
parents:
  - index.md
covers:
  - Container without resource requests or limits -- unbounded resource consumption
  - Missing liveness or readiness probe -- orchestrator cannot detect unhealthy pods
  - Missing startupProbe for slow-starting applications -- killed during initialization
  - securityContext not set -- container runs as root with full privileges
  - Missing PodDisruptionBudget -- voluntary evictions can cause full outage
  - "Image tag :latest or missing tag -- non-reproducible deployments"
  - imagePullPolicy not set or set to Always without digest pinning
  - hostNetwork, hostPID, or hostIPC enabled -- breaks pod isolation boundary
  - emptyDir volume without sizeLimit -- unbounded disk usage can evict node
  - Manifest missing namespace -- silently deploys to default namespace
  - Missing labels or annotations for observability and ownership
  - Privileged container -- full host access from within the pod
tags:
  - kubernetes
  - k8s
  - manifest
  - resources
  - probes
  - security-context
  - pdb
  - image
  - correctness
activation:
  file_globs:
    - "**/*.yaml"
    - "**/*.yml"
    - "**/k8s/**"
    - "**/kubernetes/**"
    - "**/manifests/**"
  keyword_matches:
    - apiVersion
    - kind
    - metadata
    - spec
    - containers
    - resources
    - limits
    - requests
    - livenessProbe
    - readinessProbe
    - startupProbe
    - securityContext
    - replicas
  structural_signals:
    - "kind: Deployment"
    - "kind: StatefulSet"
    - "kind: DaemonSet"
    - "kind: Pod"
    - "kind: CronJob"
source:
  origin: file
  path: k8s-manifest-correctness.md
  hash: "sha256:f4d85f55bcf5961ed0c55eadaa71e253224b268f988586c0a0675e3bb523a47b"
---
# Kubernetes Manifest Correctness

## When This Activates

Activates on diffs touching Kubernetes YAML manifests that define workloads (Deployment, StatefulSet, DaemonSet, Pod, CronJob, Job). Kubernetes applies generous defaults that are almost never correct for production: no resource limits means a single pod can starve a node, no probes means the orchestrator routes traffic to broken pods, no securityContext means containers run as root with writable filesystems. This reviewer detects manifest-level misconfigurations that are invisible at the application layer but cause outages, security breaches, and resource contention in production.

## Audit Surface

- [ ] Container spec without resources.requests defined
- [ ] Container spec without resources.limits defined
- [ ] Pod spec without livenessProbe on any container
- [ ] Pod spec without readinessProbe on any container
- [ ] Slow-starting app without startupProbe
- [ ] Container without securityContext block
- [ ] runAsNonRoot not set or set to false
- [ ] readOnlyRootFilesystem not set or set to false
- [ ] allowPrivilegeEscalation not set to false
- [ ] No PodDisruptionBudget matching the Deployment
- [ ] Image reference using :latest tag or missing tag entirely
- [ ] imagePullPolicy absent on non-digest-pinned image
- [ ] hostNetwork: true, hostPID: true, or hostIPC: true on pod
- [ ] emptyDir volume without sizeLimit field
- [ ] Manifest missing metadata.namespace field
- [ ] Missing standard labels (app.kubernetes.io/name, version, component)
- [ ] Container with securityContext.privileged: true

## Detailed Checks

### Resource Requests and Limits
<!-- activation: keywords=["resources", "requests", "limits", "cpu", "memory", "ephemeral-storage", "LimitRange", "ResourceQuota"] -->

- [ ] **Missing resource requests**: flag containers without resources.requests -- the scheduler cannot make informed placement decisions, leading to overcommitted nodes and OOM kills
- [ ] **Missing resource limits**: flag containers without resources.limits -- a memory leak or CPU spin in one pod can starve all other pods on the node; without limits, the kubelet cannot enforce QoS boundaries
- [ ] **Requests exceeding limits**: flag resources.requests.cpu or memory exceeding the corresponding limits value -- this is invalid and will be rejected by the API server
- [ ] **Extremely low CPU requests**: flag CPU requests below 10m -- pods with very low CPU requests are Burstable QoS and risk throttling under contention; ensure the value matches actual baseline consumption
- [ ] **Memory limit without request**: flag memory limit set but memory request absent -- Kubernetes defaults the request to the limit, potentially overcommitting the node if the pod rarely uses that much

### Liveness, Readiness, and Startup Probes
<!-- activation: keywords=["livenessProbe", "readinessProbe", "startupProbe", "httpGet", "tcpSocket", "exec", "initialDelaySeconds", "periodSeconds", "failureThreshold", "timeoutSeconds"] -->

- [ ] **Missing readinessProbe**: flag pods without readinessProbe -- without it, the pod receives traffic immediately upon starting, before it can serve requests; Service endpoints include unready pods
- [ ] **Missing livenessProbe**: flag pods without livenessProbe -- without it, a deadlocked or hung process stays running forever, consuming resources and returning errors to clients
- [ ] **Missing startupProbe for slow starters**: flag pods for JVM, .NET, ML model-loading, or cache-warming applications that have a livenessProbe but no startupProbe -- the liveness check kills the pod during initialization before it finishes starting
- [ ] **Liveness probe too aggressive**: flag livenessProbe with failureThreshold * periodSeconds under 30 seconds -- aggressive liveness probes cause unnecessary restarts during transient slowness (GC pauses, temporary load)
- [ ] **Same endpoint for liveness and readiness**: flag when livenessProbe and readinessProbe use the same path and port with the same thresholds -- liveness should check process health (lightweight), readiness should check dependency connectivity (heavier)

### Security Context
<!-- activation: keywords=["securityContext", "runAsNonRoot", "runAsUser", "readOnlyRootFilesystem", "allowPrivilegeEscalation", "privileged", "capabilities", "drop", "add"] -->

- [ ] **Missing securityContext entirely**: flag containers or pods with no securityContext block -- Kubernetes defaults are insecure: root user, writable filesystem, privilege escalation allowed
- [ ] **runAsNonRoot not enforced**: flag containers without runAsNonRoot: true or runAsUser set to a non-zero UID -- root in a container can exploit kernel vulnerabilities for container escape
- [ ] **readOnlyRootFilesystem missing**: flag containers without readOnlyRootFilesystem: true -- writable root filesystems allow attackers to drop binaries, modify configs, or install backdoors inside the container
- [ ] **allowPrivilegeEscalation not disabled**: flag containers without allowPrivilegeEscalation: false -- this allows setuid binaries inside the container to gain additional privileges
- [ ] **Privileged container**: flag securityContext.privileged: true -- privileged containers have unrestricted host access; this should never appear in workload manifests

### Image Hygiene
<!-- activation: keywords=["image", "tag", "latest", "digest", "sha256", "imagePullPolicy", "Always", "IfNotPresent", "Never"] -->

- [ ] **:latest tag or missing tag**: flag image references using :latest or with no tag at all -- :latest is mutable, meaning different rollouts deploy different code; pin to a specific version tag or digest
- [ ] **Missing imagePullPolicy**: flag containers without imagePullPolicy when using a mutable tag -- Kubernetes defaults to IfNotPresent for non-latest tags, which means cached stale images may run instead of the intended version
- [ ] **No digest pinning for critical workloads**: flag production manifests using tags without @sha256 digest -- tags can be overwritten in the registry; digest pinning guarantees the exact image binary

### Pod Disruption and Scheduling
<!-- activation: keywords=["PodDisruptionBudget", "pdb", "minAvailable", "maxUnavailable", "replicas", "topologySpreadConstraints", "affinity", "anti-affinity"] -->

- [ ] **Missing PodDisruptionBudget**: flag Deployments or StatefulSets with replicas > 1 that have no corresponding PodDisruptionBudget -- without a PDB, cluster upgrades and node drains can evict all replicas simultaneously, causing an outage
- [ ] **PDB minAvailable equals replicas**: flag PDB with minAvailable set to the same value as replicas -- this prevents any voluntary eviction, blocking node drains and cluster upgrades entirely
- [ ] **Single replica with no PDB strategy**: flag Deployments with replicas: 1 and no explanation -- single-replica workloads have zero availability during voluntary disruptions

### Host Namespace and Volume Risks
<!-- activation: keywords=["hostNetwork", "hostPID", "hostIPC", "hostPath", "emptyDir", "sizeLimit", "volumes", "volumeMounts"] -->

- [ ] **Host namespace access**: flag hostNetwork: true, hostPID: true, or hostIPC: true -- these break the pod isolation boundary; hostNetwork bypasses NetworkPolicy, hostPID allows process inspection across the node
- [ ] **emptyDir without sizeLimit**: flag emptyDir volumes without sizeLimit -- without a limit, a container can fill the node's disk, triggering eviction of all pods on that node
- [ ] **hostPath mount**: flag hostPath volumes -- they expose the node filesystem to the pod, enabling container escape and data access across pod boundaries; use PersistentVolumeClaim or CSI drivers instead

## Common False Positives

- **System namespace workloads**: kube-system, kube-proxy, and CNI plugin pods legitimately require hostNetwork, privileged mode, or host namespace access. Only flag workloads in application namespaces.
- **Init containers with elevated privileges**: init containers may need temporary elevated permissions (sysctl tuning, file ownership changes). Flag only if the main container also runs with elevated privileges.
- **CronJob and Job probes**: short-lived batch Jobs and CronJobs often omit liveness and readiness probes by design since they are not serving traffic. Flag only if the Job runs a server.
- **Operator-managed resources**: Operators (Prometheus, cert-manager) generate manifests with their own conventions. Verify the operator's documentation before flagging missing fields.
- **Helm template variables**: unrendered Helm templates may show `{{ .Values.resources }}` instead of concrete values. The check applies to rendered output, not template source.

## Severity Guidance

| Finding | Severity |
|---|---|
| Privileged container in workload namespace | Critical |
| hostNetwork or hostPID enabled on workload pod | Critical |
| Missing resource limits on production workload | Critical |
| Container running as root (runAsNonRoot absent) | Important |
| Missing readinessProbe -- traffic routed to unready pods | Important |
| Missing livenessProbe -- hung processes not restarted | Important |
| Image using :latest tag in production | Important |
| allowPrivilegeEscalation not disabled | Important |
| Missing PodDisruptionBudget for multi-replica Deployment | Important |
| emptyDir without sizeLimit | Minor |
| Missing startupProbe for slow-starting app | Minor |
| Missing metadata.namespace (defaults to default) | Minor |
| Missing standard Kubernetes labels | Minor |

## See Also

- `reliability-health-checks` -- detailed probe design patterns and anti-patterns
- `sec-owasp-a05-misconfiguration` -- general misconfiguration patterns applicable to manifests
- `k8s-pod-security-standards` -- deeper pod security enforcement via PSA labels
- `k8s-rbac` -- RBAC controls complementing workload-level securityContext
- `cloud-gcp-gke` -- GKE-specific manifest requirements
- `cloud-azure-managed-identity-aks` -- AKS-specific manifest requirements
- `principle-fail-fast` -- missing probes violate fail-fast by hiding broken state

## Authoritative References

- [Kubernetes Documentation: Managing Resources for Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes Documentation: Configure Liveness, Readiness and Startup Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Kubernetes Documentation: Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Kubernetes Documentation: Specifying a Disruption Budget](https://kubernetes.io/docs/tasks/run-application/configure-pdb/)
- [NSA/CISA Kubernetes Hardening Guide](https://media.defense.gov/2022/Aug/29/2003066362/-1/-1/0/CTR_KUBERNETES_HARDENING_GUIDANCE_1.2_20220829.PDF)
