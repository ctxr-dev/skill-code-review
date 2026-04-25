---
id: container-runtime-gvisor-kata-sysbox
type: primary
depth_role: leaf
focus: Detect sandboxed container runtime misconfigurations including workloads missing RuntimeClass, gVisor syscall compatibility gaps, Kata nested virtualization issues, and missing fallback runtime strategies
parents:
  - index.md
covers:
  - Workload running with default runc that should use sandboxed runtime
  - gVisor with unsupported syscalls -- application crashes at runtime
  - Kata containers without nested virtualization support on node
  - Missing RuntimeClass in pod spec for sensitive workloads
  - "Sysbox without proper AppArmor/seccomp profile"
  - Performance overhead not profiled for sandboxed runtime
  - GPU passthrough not configured for sandboxed runtime
  - Missing fallback runtime configuration
  - RuntimeClass handler referencing non-existent runtime on node
  - Mixed runtime cluster without node affinity for runtime-capable nodes
tags:
  - container
  - runtime
  - gvisor
  - kata
  - sysbox
  - sandbox
  - runtimeclass
  - isolation
  - security
activation:
  file_globs: []
  keyword_matches:
    - gVisor
    - gvisor
    - runsc
    - kata
    - kata-containers
    - sysbox
    - runtimeClass
    - RuntimeClass
    - handler
    - sandbox
source:
  origin: file
  path: container-runtime-gvisor-kata-sysbox.md
  hash: "sha256:59e00850a62616795f4a8711f2353e9b357cd23c60fc8295fadd88a96815b5f8"
---
# Container Runtime Sandboxing -- gVisor, Kata, Sysbox

## When This Activates

Activates on diffs referencing sandboxed container runtimes (gVisor/runsc, Kata Containers, Sysbox), RuntimeClass resources, or handler configurations. Sandboxed runtimes add an isolation layer between the container and the host kernel -- gVisor intercepts syscalls via a user-space kernel, Kata runs containers in lightweight VMs, and Sysbox enables rootless nested containers. Misconfiguring these runtimes is worse than not using them: a RuntimeClass that references a non-existent handler silently falls back to runc, gVisor rejects syscalls that the application depends on, Kata fails on nodes without hardware virtualization, and missing node selectors schedule sandboxed pods onto nodes without the runtime installed. This reviewer detects runtime selection and configuration errors that create false security confidence or runtime failures.

## Audit Surface

- [ ] Pod running untrusted workload without runtimeClassName
- [ ] Pod with runtimeClassName referencing unsupported syscalls
- [ ] Kata RuntimeClass on nodes without hardware virtualization
- [ ] Pod spec missing runtimeClassName for security-sensitive workload
- [ ] Sysbox runtime without AppArmor or seccomp profile
- [ ] Sandboxed workload without performance baseline comparison
- [ ] Pod with GPU requests using sandboxed runtime without passthrough
- [ ] Cluster without fallback RuntimeClass for scheduling failures
- [ ] RuntimeClass handler not matching installed runtime on nodes
- [ ] RuntimeClass without scheduling.nodeSelector for capable nodes
- [ ] Pod missing tolerations for runtime-specific node taints
- [ ] gVisor without appropriate network mode configuration

## Detailed Checks

### RuntimeClass Selection and Scheduling
<!-- activation: keywords=["runtimeClassName", "RuntimeClass", "handler", "scheduling", "nodeSelector", "tolerations", "overhead", "runc"] -->

- [ ] **Missing runtimeClassName on sensitive workload**: flag pods running untrusted code (CI runners, user-submitted jobs, multi-tenant workloads) without `spec.runtimeClassName` -- these workloads run with the default runc runtime, which shares the host kernel directly; a container escape compromises the host
- [ ] **RuntimeClass handler mismatch**: flag RuntimeClass resources where the `handler` name does not match any container runtime configured on the target nodes (`/etc/containerd/config.toml` or CRI-O config) -- pods using this RuntimeClass fail with a CRI error at scheduling time
- [ ] **Missing nodeSelector on RuntimeClass**: flag RuntimeClass without `scheduling.nodeSelector` when only a subset of cluster nodes have the sandboxed runtime installed -- pods may be scheduled onto nodes without the runtime, causing immediate failure
- [ ] **Missing tolerations for tainted nodes**: flag pods using a sandboxed RuntimeClass but missing tolerations for runtime-specific node taints -- nodes dedicated to sandboxed workloads are typically tainted to prevent default workloads from scheduling there
- [ ] **RuntimeClass overhead not set**: flag RuntimeClass without `overhead` fields -- the scheduler does not account for the additional memory and CPU consumed by the sandbox runtime itself, leading to overcommitted nodes

### gVisor Compatibility and Configuration
<!-- activation: keywords=["gvisor", "gVisor", "runsc", "syscall", "compatibility", "platform", "ptrace", "KVM", "systrap", "network", "passthrough"] -->

- [ ] **Unsupported syscalls**: flag workloads using gVisor that rely on syscalls outside the gVisor compatibility list (raw sockets, io_uring, specific ioctls, FUSE) -- gVisor intercepts syscalls in user space and returns ENOSYS for unsupported calls, causing application crashes that are difficult to diagnose
- [ ] **gVisor platform not specified**: flag gVisor configuration without explicit platform selection (systrap, KVM) -- the default platform (ptrace on older versions) has significant performance overhead; systrap or KVM platforms provide substantially better performance
- [ ] **gVisor network mode mismatch**: flag gVisor with `--network=sandbox` for workloads requiring low-latency networking -- the sandbox network stack adds overhead; `--network=host` or passthrough may be appropriate for performance-sensitive network workloads, with explicit acknowledgment of reduced isolation
- [ ] **Missing gVisor debug/monitoring**: flag production gVisor deployments without runtime monitoring (runsc debug, /proc/[pid]/status in gVisor) -- gVisor failures manifest as silent syscall rejections; monitoring helps diagnose compatibility issues

### Kata Containers and Virtualization
<!-- activation: keywords=["kata", "kata-containers", "kata-runtime", "QEMU", "Cloud-Hypervisor", "Firecracker", "nested", "virtualization", "virt", "vmm"] -->

- [ ] **Nested virtualization not available**: flag Kata RuntimeClass on nodes running inside virtual machines without nested virtualization enabled -- Kata runs containers inside lightweight VMs using QEMU/Cloud-Hypervisor/Firecracker, which requires hardware virtualization (VT-x/AMD-V); without it, Kata falls back to software emulation (extreme slowness) or fails entirely
- [ ] **VMM not specified**: flag Kata configuration without explicit VMM (Virtual Machine Monitor) selection -- default QEMU has higher overhead than Cloud-Hypervisor or Firecracker; choose the VMM based on workload requirements (Firecracker for fast boot, Cloud-Hypervisor for device support)
- [ ] **GPU passthrough not configured**: flag pods with GPU resource requests scheduled with Kata runtime without VFIO/GPU passthrough configuration -- GPUs are not accessible inside the Kata VM without explicit PCI passthrough, causing workload failure

### Sysbox and Security Profiles
<!-- activation: keywords=["sysbox", "sysbox-runc", "nestybox", "AppArmor", "seccomp", "rootless", "inner container", "docker-in-docker", "systemd"] -->

- [ ] **Sysbox without AppArmor**: flag Sysbox runtime without an AppArmor profile -- Sysbox allows unprivileged containers to run inner containers (Docker-in-Docker, Kubernetes-in-Docker), but without AppArmor the inner containers have a wider attack surface than necessary
- [ ] **Sysbox without seccomp**: flag Sysbox workloads without a seccomp profile -- Sysbox provides filesystem isolation for inner containers but does not restrict syscalls by default; combine with seccomp for defense in depth
- [ ] **Sysbox for non-nested workloads**: flag Sysbox RuntimeClass assigned to workloads that do not run inner containers -- Sysbox's primary value is secure nested containerization; for simple workload isolation, gVisor or Kata provide better security boundaries with less complexity

### Performance and Fallback Strategy
<!-- activation: keywords=["overhead", "performance", "latency", "throughput", "fallback", "benchmark", "baseline", "runc", "comparison"] -->

- [ ] **No performance baseline**: flag sandboxed runtime adoption without documented performance comparison against runc -- gVisor adds 2-10x syscall overhead, Kata adds VM boot time and memory overhead; workloads may experience unacceptable latency without profiling
- [ ] **Missing fallback configuration**: flag clusters with sandboxed runtimes as the only option without a fallback RuntimeClass -- if the sandboxed runtime fails (node issue, version incompatibility), workloads cannot be rescheduled; define a fallback RuntimeClass or allow runc for non-sensitive workloads

## Common False Positives

- **Development and test clusters**: sandboxed runtimes may not be needed in development environments where all workloads are trusted. Flag only production and multi-tenant clusters.
- **Managed Kubernetes sandboxing**: GKE Sandbox (gVisor-based) and AWS Fargate manage the runtime transparently. RuntimeClass configuration is handled by the platform.
- **Single-tenant clusters**: clusters running only first-party workloads from trusted CI pipelines may not need sandboxed runtimes. The risk assessment differs from multi-tenant environments.
- **System pods**: kube-system pods, CNI plugins, and monitoring agents should not use sandboxed runtimes as they need direct host kernel access.
- **Benchmarking workloads**: performance test pods may intentionally run with runc to establish baselines.

## Severity Guidance

| Finding | Severity |
|---|---|
| RuntimeClass handler not matching installed runtime (pod failure) | Critical |
| Untrusted workload without sandboxed runtime in multi-tenant cluster | Critical |
| Kata on nodes without nested virtualization (silent fallback or failure) | Important |
| Missing nodeSelector on RuntimeClass (wrong-node scheduling) | Important |
| gVisor with unsupported syscalls (application crash) | Important |
| Sysbox without AppArmor or seccomp profile | Important |
| Missing RuntimeClass overhead (node overcommit) | Minor |
| No performance baseline for sandboxed runtime | Minor |
| Missing fallback runtime configuration | Minor |
| gVisor platform not explicitly selected | Minor |

## See Also

- `k8s-pod-security-standards` -- pod security controls complementing runtime sandboxing
- `k8s-manifest-correctness` -- manifest-level checks for runtime-related pod specs
- `sec-owasp-a05-misconfiguration` -- runtime misconfiguration as security misconfiguration
- `container-image-hardening` -- image-level hardening complementing runtime isolation

## Authoritative References

- [Kubernetes Documentation: Runtime Class](https://kubernetes.io/docs/concepts/containers/runtime-class/)
- [gVisor Documentation: Compatibility](https://gvisor.dev/docs/user_guide/compatibility/)
- [gVisor Documentation: Platforms](https://gvisor.dev/docs/architecture_guide/platforms/)
- [Kata Containers Documentation: Architecture](https://katacontainers.io/docs/)
- [Sysbox Documentation: Quick Start](https://github.com/nestybox/sysbox/blob/master/docs/user-guide/quick-start.md)
