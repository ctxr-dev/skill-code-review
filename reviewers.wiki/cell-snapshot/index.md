---
id: cell-snapshot
type: index
depth_role: subcategory
depth: 1
focus: "/dev/urandom vs /dev/random misuse and entropy starvation concerns; Apply family correctness (sapply type instability vs vapply); Async/await discipline and event-loop blocking; BPF ring buffer or perf buffer overflow dropping events"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: arch-cell-based
    file: arch-cell-based.md
    type: primary
    focus: Detect cell boundary violations, missing cell-level isolation, uncontained blast radius, and missing cell routing
    tags:
      - cell-based
      - cell
      - isolation
      - blast-radius
      - routing
      - architecture
      - resilience
  - id: footgun-rng-csprng
    file: footgun-rng-csprng.md
    type: primary
    focus: Detect use of insecure PRNGs for security tokens, predictable seeds, insufficient entropy, UUID misuse, and random value truncation
    tags:
      - randomness
      - PRNG
      - CSPRNG
      - entropy
      - token
      - CWE-330
      - CWE-338
      - cryptography
      - token-generation
      - key-generation
  - id: footgun-toctou-race
    file: footgun-toctou-race.md
    type: primary
    focus: Detect check-then-act patterns without atomicity -- file existence checks before open, permission checks before access, balance checks before debit
    tags:
      - toctou
      - race-condition
      - atomicity
      - check-then-act
      - CWE-367
      - CWE-377
      - CWE-362
  - id: lang-python
    file: lang-python.md
    type: primary
    focus: Catch Python-specific bugs, anti-patterns, type errors, and security pitfalls in diffs
    tags:
      - python
      - typing
      - async
      - security
      - packaging
  - id: lang-r
    file: lang-r.md
    type: primary
    focus: Catch correctness, reproducibility, and performance bugs in R code
    tags:
      - statistics
      - data-science
      - tidyverse
      - cran
      - reproducibility
      - bioinformatics
  - id: obs-ebpf-discipline
    file: obs-ebpf-discipline.md
    type: primary
    focus: Detect eBPF program safety violations including missing bounds checks, verifier non-compliance, kernel compatibility issues, map size limits, and unsafe memory access
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
  - id: snapshot-build
    file: "snapshot-build/index.md"
    type: index
    focus: Build environment not isolated or ephemeral; Build parameters not captured in provenance; FROM targets not pinned to digest; Golden files not version-controlled or stored outside the repository
children:
  - "snapshot-build/index.md"
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Cell Snapshot

**Focus:** /dev/urandom vs /dev/random misuse and entropy starvation concerns; Apply family correctness (sapply type instability vs vapply); Async/await discipline and event-loop blocking; BPF ring buffer or perf buffer overflow dropping events

## Children

| File | Type | Focus |
|------|------|-------|
| [arch-cell-based.md](arch-cell-based.md) | 📄 primary | Detect cell boundary violations, missing cell-level isolation, uncontained blast radius, and missing cell routing |
| [footgun-rng-csprng.md](footgun-rng-csprng.md) | 📄 primary | Detect use of insecure PRNGs for security tokens, predictable seeds, insufficient entropy, UUID misuse, and random value truncation |
| [footgun-toctou-race.md](footgun-toctou-race.md) | 📄 primary | Detect check-then-act patterns without atomicity -- file existence checks before open, permission checks before access, balance checks before debit |
| [lang-python.md](lang-python.md) | 📄 primary | Catch Python-specific bugs, anti-patterns, type errors, and security pitfalls in diffs |
| [lang-r.md](lang-r.md) | 📄 primary | Catch correctness, reproducibility, and performance bugs in R code |
| [obs-ebpf-discipline.md](obs-ebpf-discipline.md) | 📄 primary | Detect eBPF program safety violations including missing bounds checks, verifier non-compliance, kernel compatibility issues, map size limits, and unsafe memory access |
| [snapshot-build/index.md](snapshot-build/index.md) | 📁 index | Build environment not isolated or ephemeral; Build parameters not captured in provenance; FROM targets not pinned to digest; Golden files not version-controlled or stored outside the repository |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
