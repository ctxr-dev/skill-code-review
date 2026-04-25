---
id: obs-ebpf-discipline
type: primary
depth_role: leaf
focus: Detect eBPF program safety violations including missing bounds checks, verifier non-compliance, kernel compatibility issues, map size limits, and unsafe memory access
parents:
  - index.md
covers:
  - eBPF program without bounds checking on packet or map data access
  - Verifier rejection risk from unbounded loops or complex control flow
  - Kernel version compatibility not checked before loading program
  - Map size limits not configured causing kernel memory exhaustion
  - Unsafe memory access via bpf_probe_read without null checks
  - Missing error handling for map operations and helper calls
  - Performance impact of probe placement on hot kernel paths
  - BPF ring buffer or perf buffer overflow dropping events
  - Pinned maps not cleaned up on program detach
  - "CO-RE (Compile Once Run Everywhere) not used causing kernel header dependency"
tags:
  - ebpf
  - bpf
  - kernel
  - verifier
  - safety
  - probe
  - tracepoint
  - kprobe
  - map
  - observability
  - performance
  - linux
activation:
  file_globs:
    - "**/*.bpf.c"
    - "**/*.bpf.h"
    - "**/*ebpf*"
    - "**/*bpf*"
    - "**/*probe*"
    - "**/*tracepoint*"
    - "**/*kprobe*"
    - "**/*xdp*"
    - "**/*tc_cls*"
  keyword_matches:
    - bpf
    - ebpf
    - BPF
    - bpf_map
    - bpf_probe_read
    - bpf_helper
    - "SEC("
    - BPF_MAP_TYPE
    - kprobe
    - tracepoint
    - XDP
    - tc_cls_act
    - bpf_ringbuf
    - bpf_perf_event
    - libbpf
    - cilium
    - CO-RE
    - BTF
  structural_signals:
    - bpf_program
    - map_definition
    - probe_attachment
    - verifier_annotation
source:
  origin: file
  path: obs-ebpf-discipline.md
  hash: "sha256:4ff6c1a74adea11d1e32ca03005cf37dea70774d29e6093e7de56fcbc462cd0f"
---
# eBPF Discipline

## When This Activates

Activates when the diff contains eBPF program source (`.bpf.c`), map definitions, probe attachments, or libbpf/cilium-ebpf loader code. Also activates on keywords like `bpf_map`, `bpf_probe_read`, `SEC(`, `BPF_MAP_TYPE`, `kprobe`, `tracepoint`, `XDP`, `libbpf`, `CO-RE`, `BTF`. eBPF programs run in kernel space with strict safety requirements enforced by the kernel verifier. Programs that pass the verifier are guaranteed not to crash the kernel, but they can still cause performance degradation, memory exhaustion, or silent data loss through misconfigured maps and buffers. This reviewer ensures eBPF programs are verifier-safe, portable across kernels, and operate within resource budgets.

## Audit Surface

- [ ] Packet data access without bounds check against data_end
- [ ] Map value pointer used without null check after bpf_map_lookup_elem
- [ ] Loop without provable termination bound (verifier rejection risk)
- [ ] bpf_probe_read on user-space pointer without size validation
- [ ] Map max_entries set too large for kernel memory budget
- [ ] Map max_entries set too small causing silent entry drops
- [ ] No BTF or CO-RE relocation (breaks on different kernel versions)
- [ ] Kprobe or tracepoint on hot-path function without overhead measurement
- [ ] Ring buffer or perf buffer size insufficient for event rate
- [ ] Helper function return value not checked for error
- [ ] Pinned map path in /sys/fs/bpf not cleaned up on unload
- [ ] Program attached to wrong hook type for the use case
- [ ] Tail call map not populated causing silent program termination
- [ ] Stack usage approaching 512-byte eBPF stack limit

## Detailed Checks

### Verifier Compliance and Memory Safety
<!-- activation: keywords=["bpf_probe_read", "bpf_map_lookup_elem", "data", "data_end", "bounds", "check", "null", "verifier", "reject", "complexity", "loop", "bpf_loop", "bpf_for_each"] -->

- [ ] **Missing packet bounds check**: flag XDP or TC programs that access packet data (`data + offset`) without first verifying `data + offset + size <= data_end` -- the verifier rejects programs without this check; even if it passes on one kernel version, future verifier changes may reject it
- [ ] **Null check after map lookup missing**: flag `bpf_map_lookup_elem()` calls where the return value is dereferenced without a null check -- the verifier requires this; the function returns NULL when the key is not found, and dereferencing NULL in kernel context causes a verifier rejection
- [ ] **Unbounded loop**: flag loops that do not have a compile-time provable iteration bound -- kernels before 5.3 reject all loops; kernels 5.3+ accept bounded loops but the verifier must prove termination; use `bpf_loop()` helper (5.17+) for dynamic iteration counts
- [ ] **Unsafe bpf_probe_read**: flag `bpf_probe_read_user` or `bpf_probe_read_kernel` with size derived from untrusted input without clamping to a maximum -- reading too much data overflows the eBPF stack or destination buffer
- [ ] **Stack overflow risk**: flag eBPF functions with large local variables or deep call chains -- the eBPF stack is limited to 512 bytes; large buffers must use per-CPU arrays or ring buffers instead of stack allocation

### Map Configuration
<!-- activation: keywords=["BPF_MAP_TYPE", "max_entries", "map", "hash", "array", "lru", "ringbuf", "perf_event_array", "per_cpu", "pinning", "pin"] -->

- [ ] **max_entries too large**: flag map definitions with `max_entries` exceeding what the workload requires without memory budget analysis -- a BPF_MAP_TYPE_HASH with 10M entries consumes significant kernel memory; every map entry is kernel memory that counts against system limits
- [ ] **max_entries too small**: flag map definitions where `max_entries` may be exceeded under production load -- hash maps silently reject inserts when full, and LRU maps silently evict entries; both cause silent data loss in observability pipelines
- [ ] **Pinned map not cleaned up**: flag programs that pin maps to `/sys/fs/bpf/` without corresponding cleanup logic on program detach or service shutdown -- orphaned pinned maps persist across program restarts and leak kernel memory
- [ ] **Wrong map type for access pattern**: flag `BPF_MAP_TYPE_HASH` used for integer-keyed sequential access (use ARRAY), or `BPF_MAP_TYPE_ARRAY` used for sparse, dynamic-key lookups (use HASH or LRU_HASH) -- wrong map type causes unnecessary overhead or incorrect behavior

### Kernel Compatibility and Portability
<!-- activation: keywords=["CO-RE", "BTF", "vmlinux", "kernel", "version", "compat", "relocat", "libbpf", "bpf_core_read", "BPF_CORE_READ"] -->

- [ ] **No CO-RE relocation**: flag eBPF programs that access kernel struct fields directly (e.g., `task->pid`) instead of using `BPF_CORE_READ()` or `bpf_core_field_offset()` -- direct access compiles against one kernel's struct layout and breaks on kernels with different offsets; CO-RE handles layout differences via BTF relocation
- [ ] **Missing BTF dependency**: flag libbpf-based loaders that do not check for kernel BTF availability (`/sys/kernel/btf/vmlinux`) before loading CO-RE programs -- without BTF, CO-RE relocation fails and the program cannot load
- [ ] **Kernel version assumption**: flag eBPF programs using helpers or features without checking kernel version support (e.g., `bpf_loop` requires 5.17, ring buffer requires 5.8, `bpf_get_func_ip` requires 5.17) -- the program loads successfully on the development kernel but fails in production on an older kernel
- [ ] **Hardcoded kernel struct offsets**: flag programs using numeric offsets (`*(u32 *)(ctx + 16)`) instead of named field access -- hardcoded offsets break across kernel versions and architectures

### Performance and Probe Placement
<!-- activation: keywords=["kprobe", "kretprobe", "tracepoint", "fentry", "fexit", "raw_tracepoint", "uprobe", "perf_event", "overhead", "hot", "syscall", "schedule", "network", "latency"] -->

- [ ] **Probe on hot-path function**: flag kprobes or fentry programs attached to high-frequency kernel functions (`schedule`, `do_sys_open`, `tcp_sendmsg`, `page_fault`) without documented overhead measurement -- a 1-microsecond probe on a function called 100K/sec adds 100ms/sec of overhead; use tracepoints (lower overhead) where available
- [ ] **Kprobe where tracepoint exists**: flag kprobe attachment to a function that has a stable tracepoint equivalent -- tracepoints are a stable kernel ABI with lower overhead; kprobes attach to internal functions that may change between kernel versions
- [ ] **Ring buffer too small**: flag `BPF_MAP_TYPE_RINGBUF` with size insufficient for the expected event rate -- when the ring buffer fills, `bpf_ringbuf_reserve()` returns NULL and events are silently dropped; size the buffer for peak event rate with headroom
- [ ] **Perf buffer without lost-event handling**: flag perf buffer consumers that do not check for or handle lost events -- when the user-space consumer is slow, the kernel drops events and signals loss; ignoring lost events means the observability data has undetected gaps

## Common False Positives

- **BPF skeleton auto-generated code**: libbpf skeleton files (`*.skel.h`) are auto-generated and should not be reviewed for style or structure. Review only the `.bpf.c` source and the loader code.
- **Test programs**: eBPF programs in test directories may intentionally test verifier edge cases or use simplified map sizes. Flag only in production program sources.
- **Cilium / Calico managed programs**: when using CNI plugins like Cilium, the eBPF programs are managed by the CNI and should not be modified directly. Review only custom eBPF programs.
- **BPF_MAP_TYPE_PERCPU for counters**: per-CPU maps do not need synchronization and have different memory characteristics than regular maps. Higher `max_entries` on per-CPU maps is less concerning for contention but still costs memory.

## Severity Guidance

| Finding | Severity |
|---|---|
| Packet data access without bounds check (verifier rejection) | Critical |
| Map lookup result used without null check (verifier rejection) | Critical |
| Unbounded loop in eBPF program (verifier rejection or crash risk) | Critical |
| No CO-RE relocation (breaks on different kernel versions) | Important |
| Map max_entries too large without memory budget (kernel memory exhaustion) | Important |
| Probe on hot-path function without overhead measurement | Important |
| Ring buffer too small for event rate (silent data loss) | Important |
| Helper return value not checked | Important |
| Pinned maps not cleaned up (kernel memory leak) | Minor |
| Kprobe used where stable tracepoint exists | Minor |
| Stack usage approaching 512-byte limit | Minor |
| Perf buffer consumer not handling lost events | Minor |

## See Also

- `obs-continuous-profiling-pyroscope-parca` -- Parca uses eBPF for low-overhead profiling; this reviewer covers the eBPF program discipline that Parca relies on
- `obs-opentelemetry-sdk-discipline` -- eBPF-based auto-instrumentation (e.g., Beyla) generates OTel spans; SDK discipline applies to the generated telemetry
- `sec-owasp-a09-logging-monitoring-failures` -- eBPF observability programs that silently drop events due to buffer overflows are a monitoring failure
- `obs-distributed-tracing` -- eBPF-based tracing (Pixie, Beyla) produces distributed traces subject to tracing discipline
- `principle-fail-fast` -- silent event drops from undersized buffers violate fail-fast; buffer overflow should be monitored and alerted

## Authoritative References

- [eBPF Documentation -- BPF and XDP Reference Guide](https://docs.kernel.org/bpf/)
- [Brendan Gregg -- BPF Performance Tools (2019)](https://www.brendangregg.com/bpf-performance-tools-book.html)
- [libbpf Documentation -- CO-RE](https://libbpf.readthedocs.io/en/latest/libbpf_overview.html)
- [Cilium -- BPF and XDP Reference Guide](https://docs.cilium.io/en/latest/bpf/)
- [Linux Kernel -- BPF Design Q&A](https://www.kernel.org/doc/html/latest/bpf/bpf_design_QA.html)
- [Isovalent -- Learning eBPF (Liz Rice, 2023)](https://isovalent.com/books/learning-ebpf/)
