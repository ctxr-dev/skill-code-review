---
id: k8s-pod-security-standards
type: primary
depth_role: leaf
focus: Detect pods violating Kubernetes Pod Security Standards including running as root, privileged mode, missing seccomp profiles, undropped capabilities, and absent PSA namespace labels
parents:
  - index.md
covers:
  - Pod running as root -- runAsNonRoot not set or set to false
  - "Privileged: true granting unrestricted host access"
  - Missing seccomp profile -- no syscall filtering on container
  - "Capabilities not dropped (drop: ALL) -- unnecessary kernel capabilities retained"
  - "allowPrivilegeEscalation: true or not explicitly disabled"
  - hostPath mounts exposing node filesystem to pod
  - "Proc mount unmasked -- /proc exposed enabling container escape"
  - Writable root filesystem -- attackers can drop binaries in container
  - Missing Pod Security Admission labels on namespace
  - SYS_ADMIN capability added -- near-equivalent to privileged mode
  - Unsafe sysctl parameters enabled on pod
  - SELinux or AppArmor profile not configured
  - GKE Standard without node auto-provisioning or Autopilot consideration
  - Missing Workload Identity -- pods using node default service account
  - Missing network policy allowing unrestricted pod-to-pod traffic
  - Binary authorization not enabled for container image verification
  - Workloads deployed to default namespace
  - Missing resource quotas per namespace
  - "Missing pod security admission (PSA) enforcement"
  - Shielded nodes not enabled
  - Release channel not configured -- manual upgrade burden
  - Missing monitoring and logging agent configuration
tags:
  - kubernetes
  - pod-security
  - psa
  - pss
  - seccomp
  - capabilities
  - apparmor
  - selinux
  - hardening
  - CWE-250
  - gcp
  - gke
  - workload-identity
  - network-policy
  - binary-authorization
aliases:
  - cloud-gcp-gke
activation:
  file_globs:
    - "**/*.yaml"
    - "**/*.yml"
    - "**/k8s/**"
    - "**/kubernetes/**"
    - "**/manifests/**"
  keyword_matches:
    - PodSecurity
    - pod-security.kubernetes.io
    - securityContext
    - runAsNonRoot
    - runAsUser
    - fsGroup
    - seccompProfile
    - AppArmor
    - SELinux
    - capabilities
    - privileged
    - allowPrivilegeEscalation
  structural_signals:
    - "kind: Namespace"
    - "kind: Deployment"
    - "kind: Pod"
    - "securityContext:"
    - "capabilities:"
source:
  origin: file
  path: k8s-pod-security-standards.md
  hash: "sha256:cdbed3f6614884bd0555a78eb79a7c0ab9b50f0c91589975b4fdcab2ecd2cea5"
---
# Kubernetes Pod Security Standards

## When This Activates

Activates on diffs touching pod specifications, container securityContext, namespace labels for Pod Security Admission, or capability/seccomp/AppArmor configurations. Kubernetes Pod Security Standards define three profiles -- Privileged (unrestricted), Baseline (prevents known privilege escalation), and Restricted (hardened). Without explicit enforcement via Pod Security Admission (PSA) labels, any pod configuration is accepted, and Kubernetes defaults are insecure: containers run as root, capabilities are inherited, privilege escalation is allowed, and no syscall filtering is applied. This reviewer detects pods that violate Baseline or Restricted profiles and namespaces that lack PSA enforcement.

## Audit Surface

- [ ] Container without runAsNonRoot: true
- [ ] Container with runAsUser: 0 (explicit root)
- [ ] Container with securityContext.privileged: true
- [ ] Container without seccompProfile (RuntimeDefault or Localhost)
- [ ] Container without capabilities drop: ['ALL']
- [ ] Container with allowPrivilegeEscalation: true or not set
- [ ] Pod with hostPath volume mounts
- [ ] Container with procMount: Unmasked
- [ ] Container without readOnlyRootFilesystem: true
- [ ] Namespace without pod-security.kubernetes.io/enforce label
- [ ] Namespace with enforce: privileged (no restriction)
- [ ] Container adding SYS_ADMIN, NET_ADMIN, or SYS_PTRACE capability
- [ ] Pod with unsafe sysctl parameters
- [ ] Container without AppArmor or SELinux profile

## Detailed Checks

### User and Group Identity
<!-- activation: keywords=["runAsNonRoot", "runAsUser", "runAsGroup", "fsGroup", "supplementalGroups", "root", "uid", "gid", "0"] -->

- [ ] **Running as root by default**: flag containers without `runAsNonRoot: true` at either pod or container level -- Kubernetes defaults to running as whatever user the container image specifies, which is typically root (UID 0)
- [ ] **Explicit root user**: flag `runAsUser: 0` -- even with runAsNonRoot set at the pod level, a container-level `runAsUser: 0` overrides it; root in a container can exploit kernel vulnerabilities (CVE-2019-5736, CVE-2022-0185) for escape
- [ ] **Missing runAsGroup**: flag containers with runAsUser set but runAsGroup absent -- the container may run as non-root user but primary group 0 (root), which grants access to root-group-owned files
- [ ] **fsGroup not set**: flag pods with PersistentVolumeClaims but no fsGroup -- volume files may be owned by root, causing permission denied errors for the non-root container process

### Privileged Mode and Capabilities
<!-- activation: keywords=["privileged", "capabilities", "drop", "add", "ALL", "SYS_ADMIN", "NET_ADMIN", "SYS_PTRACE", "NET_RAW", "DAC_OVERRIDE"] -->

- [ ] **Privileged container**: flag `privileged: true` -- this disables all security boundaries; the container has full access to the host's devices, filesystem, and network; it is equivalent to running outside the container
- [ ] **Capabilities not dropped**: flag containers without `capabilities.drop: ["ALL"]` -- by default, containers receive a set of Linux capabilities (NET_RAW, DAC_OVERRIDE, SETUID, etc.) that enable attacks; drop all and add back only what is needed
- [ ] **SYS_ADMIN capability added**: flag `capabilities.add` containing SYS_ADMIN -- this capability is nearly equivalent to privileged mode, allowing mount operations, namespace manipulation, and BPF access
- [ ] **NET_RAW capability retained**: flag containers that have not dropped NET_RAW -- NET_RAW allows ARP spoofing and packet crafting inside the cluster network; most applications do not need it
- [ ] **NET_ADMIN added without justification**: flag NET_ADMIN capability -- it allows network configuration changes, iptables manipulation, and interface modification; only network-management pods should have it

### Seccomp and Mandatory Access Control
<!-- activation: keywords=["seccompProfile", "RuntimeDefault", "Localhost", "Unconfined", "AppArmor", "apparmor", "SELinux", "seLinuxOptions"] -->

- [ ] **Missing seccomp profile**: flag containers without `seccompProfile.type: RuntimeDefault` or `Localhost` -- without seccomp, all ~300+ Linux syscalls are available, including dangerous ones like `ptrace`, `mount`, and `bpf`
- [ ] **Seccomp set to Unconfined**: flag `seccompProfile.type: Unconfined` -- this explicitly disables syscall filtering; even RuntimeDefault blocks 40+ dangerous syscalls
- [ ] **Missing AppArmor profile**: flag containers on AppArmor-enabled nodes without the `container.apparmor.security.beta.kubernetes.io` annotation -- AppArmor restricts file access, network access, and capability usage beyond what seccomp provides
- [ ] **SELinux context not set**: flag containers on SELinux-enabled nodes without `seLinuxOptions` -- SELinux provides mandatory access control that prevents container-to-host file access even if the container escapes seccomp restrictions

### Filesystem and Mount Restrictions
<!-- activation: keywords=["readOnlyRootFilesystem", "hostPath", "procMount", "Unmasked", "volumeMounts", "subPath", "mountPropagation"] -->

- [ ] **Writable root filesystem**: flag containers without `readOnlyRootFilesystem: true` -- a writable filesystem allows attackers to modify binaries, drop web shells, or install cryptominers; use emptyDir or tmpfs for writable paths
- [ ] **hostPath volumes**: flag pods mounting hostPath volumes -- this exposes the node's filesystem to the container, enabling reads of /etc/shadow, kubelet credentials, and other pod secrets; use PersistentVolumeClaim or CSI drivers instead
- [ ] **procMount Unmasked**: flag `procMount: Unmasked` -- the default Masked value hides sensitive /proc entries that reveal host information and enable escape vectors; Unmasked is only needed for nested containers
- [ ] **Bidirectional mountPropagation**: flag volumeMounts with `mountPropagation: Bidirectional` -- this allows mount events to propagate from container to host, enabling container escape via mount manipulation

### Pod Security Admission Labels
<!-- activation: keywords=["pod-security.kubernetes.io", "enforce", "audit", "warn", "baseline", "restricted", "privileged", "namespace", "labels"] -->

- [ ] **Namespace without PSA enforce label**: flag namespaces lacking `pod-security.kubernetes.io/enforce` -- without this label, no pods are rejected regardless of their security posture; at minimum, enforce the `baseline` profile
- [ ] **Enforce set to privileged**: flag namespaces with `pod-security.kubernetes.io/enforce: privileged` -- this disables all checks; only kube-system and infrastructure namespaces should use the privileged profile
- [ ] **Audit/warn without enforce**: flag namespaces that have `audit` or `warn` labels but not `enforce` -- audit and warn modes only log or annotate violations; they do not prevent insecure pods from running
- [ ] **PSA version not pinned**: flag PSA labels without a version (e.g., `enforce: restricted` without `enforce-version: v1.28`) -- unpinned versions may introduce unexpected enforcement changes on cluster upgrades

### Dangerous Pod-Level Settings
<!-- activation: keywords=["sysctl", "hostNetwork", "hostPID", "hostIPC", "shareProcessNamespace"] -->

- [ ] **Unsafe sysctls**: flag pods with sysctls outside the safe set (kernel.shm_rmid_forced, net.ipv4.ip_local_port_range, net.ipv4.tcp_syncookies, net.ipv4.ping_group_range, net.ipv4.ip_unprivileged_port_start) -- unsafe sysctls can affect the node and other containers
- [ ] **shareProcessNamespace enabled**: flag `shareProcessNamespace: true` without justification -- this allows containers in the pod to see and signal each other's processes, which may leak sensitive process arguments

## Common False Positives

- **System and infrastructure pods**: kube-proxy, CNI plugins, CSI drivers, and log collectors legitimately require privileged mode, host namespaces, or hostPath mounts. Flag only workload namespaces.
- **Init containers with elevated privileges**: init containers may need temporary privilege for sysctl tuning or file permission setup. Accept if the main container is properly restricted.
- **Nested container workloads**: container-in-container use cases (CI runners, Kaniko builds) may need procMount: Unmasked and certain capabilities. Verify the use case is documented.
- **GKE Autopilot and managed platforms**: some managed Kubernetes platforms enforce pod security at the platform level and may not require explicit PSA labels.
- **Security scanning agents**: tools like Falco, Sysdig, and Datadog agents need host access for monitoring. Verify the agent runs in a dedicated infrastructure namespace.

## Severity Guidance

| Finding | Severity |
|---|---|
| Privileged container in workload namespace | Critical |
| SYS_ADMIN capability added to workload container | Critical |
| hostPath mount exposing sensitive node paths | Critical |
| Container running as root without runAsNonRoot | Important |
| Capabilities not dropped (drop: ALL missing) | Important |
| allowPrivilegeEscalation not set to false | Important |
| Missing seccomp profile (RuntimeDefault) | Important |
| Namespace without PSA enforce label | Important |
| Writable root filesystem | Important |
| procMount: Unmasked on workload container | Important |
| PSA enforce set to privileged on workload namespace | Minor |
| Missing AppArmor/SELinux profile | Minor |
| Unsafe sysctls configured | Minor |

## See Also

- `k8s-manifest-correctness` -- resource limits, probes, and image hygiene complement pod security
- `k8s-rbac` -- RBAC and service account controls complement pod-level restrictions
- `sec-owasp-a05-misconfiguration` -- pod security misconfigurations fall under general misconfiguration
- `cloud-gcp-gke` -- GKE-specific PSA enforcement and Autopilot built-in restrictions
- `principle-fail-fast` -- PSA enforce mode fails fast on insecure pod submissions

## Authoritative References

- [Kubernetes Documentation: Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Kubernetes Documentation: Pod Security Admission](https://kubernetes.io/docs/concepts/security/pod-security-admission/)
- [Kubernetes Documentation: Configure a Security Context](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/)
- [NSA/CISA Kubernetes Hardening Guide -- Pod Security](https://media.defense.gov/2022/Aug/29/2003066362/-1/-1/0/CTR_KUBERNETES_HARDENING_GUIDANCE_1.2_20220829.PDF)
- [Docker Documentation: Seccomp Security Profiles](https://docs.docker.com/engine/security/seccomp/)
