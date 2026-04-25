---
id: perf-numa-awareness
type: primary
depth_role: leaf
focus: Detect cross-NUMA memory access, missing thread-to-core affinity, and memory allocation policies ignoring NUMA topology
parents:
  - index.md
covers:
  - Cross-NUMA memory access -- thread accessing memory allocated on remote NUMA node
  - Thread-to-core affinity not set for latency-sensitive workloads
  - Memory allocation policy defaulting to local node regardless of consumer thread
  - Thread pool with threads migrating across NUMA nodes without binding
  - Large allocation interleaved across NUMA nodes when locality would be better
  - JVM NUMA-aware GC not enabled on multi-socket servers
  - Database buffer pool not partitioned by NUMA node
tags:
  - numa
  - memory
  - affinity
  - topology
  - multi-socket
  - latency
  - thread-binding
  - performance
activation:
  file_globs:
    - "**/*.c"
    - "**/*.cpp"
    - "**/*.rs"
    - "**/*.go"
    - "**/*.java"
    - "**/*.py"
    - "**/Dockerfile"
    - "**/*deploy*"
    - "**/*config*"
  keyword_matches:
    - NUMA
    - numa
    - numactl
    - mbind
    - set_mempolicy
    - mmap
    - affinity
    - taskset
    - cpuset
    - sched_setaffinity
    - pthread_setaffinity
    - UseNUMA
    - socket
    - topology
    - node
    - interleave
  structural_signals:
    - large_allocation_no_numa
    - thread_pool_no_affinity
    - multi_socket_deployment
source:
  origin: file
  path: perf-numa-awareness.md
  hash: "sha256:88a900e14867d100c915c5300f65064c26212a981e2f760151e09f4f8bbb9b66"
---
# NUMA Awareness

## When This Activates

Activates on diffs involving large memory allocations, thread pool configuration, deployment to multi-socket servers, or low-latency systems code. On NUMA (Non-Uniform Memory Access) architectures -- any multi-socket server and some single-socket systems with chiplets -- accessing memory on a remote node costs 1.5-3x the latency of local access. A thread pool that migrates threads across NUMA nodes, or a large buffer allocated on one node but accessed by threads on another, can lose 30-50% throughput compared to NUMA-aware placement. This reviewer detects code and configuration patterns that ignore NUMA topology on systems where it matters.

## Audit Surface

- [ ] Large memory allocation (buffer pool, cache, heap) without NUMA placement policy
- [ ] Thread pool or executor without CPU affinity or NUMA binding
- [ ] malloc/mmap for large allocation without mbind, set_mempolicy, or numactl
- [ ] JVM on multi-socket server without -XX:+UseNUMA or -XX:+UseNUMAInterleaving
- [ ] Process pinning (taskset, cpuset) not applied for latency-sensitive service
- [ ] Memory-mapped file without NUMA-aware mapping
- [ ] Worker threads accessing shared data structure allocated on single NUMA node
- [ ] Database or cache instance on multi-socket server without NUMA-aware configuration
- [ ] Interrupt affinity not set (network IRQs processed on different node than application)
- [ ] NUMA topology not checked in deployment or startup validation

## Detailed Checks

### Memory Allocation Policy
<!-- activation: keywords=["malloc", "mmap", "alloc", "allocate", "buffer", "pool", "heap", "memory", "mbind", "set_mempolicy", "numactl", "interleave", "bind", "preferred"] -->

- [ ] **Large allocation without NUMA policy**: flag `malloc`, `mmap`, `new byte[]`, or equivalent allocations of large buffers (>1MB) without NUMA-aware placement -- by default, memory is allocated on the node where the allocating thread runs (first-touch policy); if consumer threads run on different nodes, every access is remote
- [ ] **First-touch without initialization awareness**: flag large array allocation followed by initialization on one thread and consumption by a different thread pool -- the first-touch policy binds pages to the initializing thread's node; initialize from the same threads that will consume the data
- [ ] **Missing interleave for shared data**: flag large shared data structures (caches, lookup tables) accessed equally by all NUMA nodes without interleave policy -- `numactl --interleave=all` or `MPOL_INTERLEAVE` distributes pages across nodes for uniform average latency

### Thread Affinity and Binding
<!-- activation: keywords=["thread", "pool", "executor", "worker", "affinity", "bind", "pin", "taskset", "cpuset", "sched_setaffinity", "pthread_setaffinity", "isolcpus", "cgroup"] -->

- [ ] **Thread pool without affinity**: flag thread pools or executor services on multi-socket systems without CPU affinity binding -- OS thread migration across NUMA nodes causes remote memory access for all thread-local and recently touched data
- [ ] **Latency-sensitive thread not pinned**: flag latency-critical threads (network I/O, order processing, signal handling) without explicit core affinity -- thread migration adds microseconds of cache warm-up penalty on each migration
- [ ] **Interrupt and application on different nodes**: flag network-intensive services where NIC interrupt affinity is not set to the same NUMA node as the application threads -- cross-node interrupt delivery adds latency for every packet

### JVM and Runtime NUMA Support
<!-- activation: keywords=["JVM", "java", "UseNUMA", "UseNUMAInterleaving", "GC", "G1", "ZGC", "Shenandoah", "heap", "-Xmx", "-Xms", "ergonomics"] -->

- [ ] **JVM without NUMA flag**: flag JVM deployments on multi-socket servers without `-XX:+UseNUMA` (G1 GC) -- without this flag, the JVM does not consider NUMA topology for young-generation allocation; threads get remote memory
- [ ] **Large JVM heap on NUMA system**: flag JVM heap sizes >32GB on multi-socket systems without NUMA-aware GC configuration -- GC threads and application threads may be on different nodes, causing remote access during collection

### Deployment and Configuration
<!-- activation: keywords=["deploy", "kubernetes", "docker", "container", "topology", "socket", "cpu", "cpuset", "resource", "request", "limit"] -->

- [ ] **No NUMA topology awareness in deployment**: flag deployment configurations (Kubernetes, Docker, systemd) for latency-sensitive services on multi-socket servers without NUMA-aware scheduling (Topology Manager, cpuset constraints) -- Kubernetes default scheduling ignores NUMA boundaries
- [ ] **Database on multi-socket without NUMA config**: flag database instances (PostgreSQL, MySQL, Redis) on multi-socket servers without NUMA-aware configuration -- databases benefit significantly from NUMA-local buffer pool access

## Common False Positives

- **Single-socket servers**: NUMA awareness is irrelevant on single-socket single-die systems. Verify the deployment target before flagging. Note that some modern CPUs (AMD EPYC, Apple M-series) have NUMA-like topology even on a single socket.
- **Small working sets**: if the entire working set fits in L3 cache, NUMA effects are minimal. Flag only when the working set exceeds per-node L3 cache capacity.
- **Cloud VMs with single NUMA node**: most cloud VM types (up to medium sizes) expose a single NUMA node. Flag only for large metal instances or dedicated hosts.
- **Short-lived processes**: NUMA optimization matters for long-running servers and batch jobs, not for CLI tools or scripts that run for seconds.

## Severity Guidance

| Finding | Severity |
|---|---|
| Latency-sensitive service on multi-socket without any NUMA awareness | Critical |
| Large shared buffer allocated on one node, consumed by all nodes | Important |
| JVM on multi-socket without -XX:+UseNUMA | Important |
| Thread pool without affinity on multi-socket system | Important |
| Database on multi-socket without NUMA config | Important |
| Missing interleave policy for shared lookup table | Minor |
| Kubernetes deployment without Topology Manager for latency service | Minor |
| Interrupt affinity not co-located with application threads | Minor |

## See Also

- `perf-cache-locality-false-sharing` -- cache-line effects operate within a NUMA node; NUMA adds cross-node latency
- `perf-io-multiplexing-epoll-kqueue-io-uring` -- I/O multiplexing performance depends on interrupt and thread NUMA placement
- `perf-profiling-discipline` -- hardware counters (node-load-misses) validate NUMA problems before optimizing
- `perf-simd-vectorization` -- SIMD throughput depends on local memory bandwidth, which NUMA placement affects

## Authoritative References

- [Ulrich Drepper, "What Every Programmer Should Know About Memory" (2007), Section 5: "NUMA" -- definitive treatment of NUMA architecture and programming](https://people.freebsd.org/~lstewart/articles/cpumemory.pdf)
- [Linux man page, `numa(7)` -- NUMA policy, mbind, set_mempolicy, and numactl](https://man7.org/linux/man-pages/man7/numa.7.html)
- [Brendan Gregg, *Systems Performance*, 2nd ed. (2020), Chapter 6: "CPUs" -- NUMA profiling and analysis](https://www.brendangregg.com/systems-performance-2nd-edition-book.html)
- [Kubernetes, "Topology Manager" -- NUMA-aware pod scheduling](https://kubernetes.io/docs/tasks/administer-cluster/topology-manager/)
