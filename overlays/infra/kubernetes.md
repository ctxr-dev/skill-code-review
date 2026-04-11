---
tools:
  - name: kube-linter
    command: "kube-linter lint . --format json"
    purpose: "Kubernetes manifest linter"
---

# Kubernetes — Review Overlay

Load this overlay for the **Security**, **Reliability**, and **Operations** specialists when Kubernetes manifests or Helm charts are being reviewed.

> **Canonical reference:** <https://kubernetes.io/docs/concepts/security/pod-security-standards/> — Pod Security Standards.

## Security — Pod and Container Hardening

- [ ] `securityContext.runAsNonRoot: true` is set on all pods; containers do not run as UID 0
- [ ] `securityContext.runAsUser` is set to a specific non-zero UID rather than relying on the image default
- [ ] `securityContext.readOnlyRootFilesystem: true` is set on containers; writable paths (tmp, cache) are mounted as explicit `emptyDir` volumes
- [ ] `securityContext.allowPrivilegeEscalation: false` is set on all containers
- [ ] `securityContext.capabilities.drop: ["ALL"]` is set; capabilities are added back only when specifically required and documented
- [ ] No container runs with `privileged: true` unless it is a node-level DaemonSet with a documented operational justification

## Security — RBAC

- [ ] Service accounts are dedicated per workload; the default service account is not used for application pods
- [ ] `automountServiceAccountToken: false` is set on pods that do not need to call the Kubernetes API
- [ ] RBAC roles follow least-privilege: no `*` verbs or resources in `ClusterRole` rules unless the workload is a cluster operator
- [ ] `ClusterRoleBinding` is not used where a namespace-scoped `RoleBinding` would suffice

## Security — Secret Management

- [ ] Application secrets are not stored in ConfigMaps or as plaintext in manifests; they are referenced from Kubernetes Secrets, external secret operators (ESO, Vault Agent), or sealed secrets
- [ ] Kubernetes Secrets are encrypted at rest in the etcd backend (`EncryptionConfiguration` is configured in the cluster)
- [ ] No `hostPath` volume mounts are used for sensitive paths (`/etc`, `/var/run/docker.sock`, `/proc`); any `hostPath` is reviewed as a security boundary violation

## Reliability — Resources and Probes

- [ ] Every container defines `resources.requests` (for scheduler placement) and `resources.limits` (for OOM protection); no unbounded containers
- [ ] CPU limits are set conservatively or omitted intentionally — CPU throttling from limits can cause latency spikes; the choice is documented
- [ ] `livenessProbe`, `readinessProbe`, and (for slow-starting containers) `startupProbe` are defined; probes test meaningful application health, not just TCP connectivity
- [ ] Liveness probe failure thresholds are generous enough to avoid restart loops during GC pauses or slow startups; they do not have the same threshold as readiness probes

## Reliability — Network and Scheduling

- [ ] `NetworkPolicy` resources restrict ingress and egress to the minimum required paths; pods are not left in the default allow-all posture
- [ ] `PodDisruptionBudget` is defined for critical workloads so that voluntary disruptions (node drains, rolling upgrades) do not take all replicas offline simultaneously
- [ ] `topologySpreadConstraints` or `podAntiAffinity` is configured for stateless services with multiple replicas to avoid all pods landing on the same node
