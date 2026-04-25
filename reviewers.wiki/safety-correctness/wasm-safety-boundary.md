---
id: wasm-safety-boundary
type: primary
depth_role: leaf
focus: "Detect host/guest trust boundary violations, unchecked memory access via guest pointers, missing fuel/instruction limits, and sandbox-escape patterns in WebAssembly embeddings"
parents:
  - index.md
covers:
  - Host function imports accepting guest pointers without bounds checking against the guest linear memory length
  - "Guest-supplied offsets and lengths used to read/write host buffers without overflow checks"
  - Untrusted wasm modules instantiated without fuel, epoch, or instruction limits -- infinite loop DoS
  - "WASI capabilities (filesystem, network, env, clocks) granted too broadly to untrusted modules"
  - "Shared mutable memory (SharedArrayBuffer, threads proposal) exposed across a trust boundary"
  - Host function ABI mismatches between guest expectations and host implementation
  - Secrets, credentials, or capability handles leaked into guest memory
  - "Missing validation of wasm module bytes (magic, version, import allowlist) before compilation"
  - Host callbacks invoked during trap unwinding leaving host state inconsistent
  - Using wasm for isolation without defining what the trust boundary actually is
  - Wasmtime Engine built without resource or compilation limits
  - Store instantiated without fuel and without epoch interruption
  - Missing wall-clock timeout for guest execution
  - WASI filesystem preopens granted without a path allowlist
  - "WASI network (wasi-sockets) enabled without an egress restriction"
  - Compilation cache grows unbounded, exhausting disk or RAM
  - Engine shared by many Stores but resource limits set only on the Engine
  - Host executor blocked by synchronous wasm call with no cancellation path
  - "wasmi / Wasmer configuration defaults silently allowing unbounded compute"
tags:
  - wasm
  - webassembly
  - wasmtime
  - wasmer
  - wasmi
  - wasi
  - sandbox
  - memory-safety
  - trust-boundary
  - host-function
  - fuel
  - epoch
  - resource-limits
  - cache
  - isolation
aliases:
  - wasm-sandboxing
activation:
  file_globs:
    - "**/*.rs"
    - "**/*.ts"
    - "**/*.js"
    - "**/*.go"
    - "**/*.py"
    - "**/*.c"
    - "**/*.cpp"
    - "**/*.java"
    - "**/*.kt"
    - "**/*.wat"
    - "**/*.wit"
    - "**/Cargo.toml"
  keyword_matches:
    - wasm
    - WebAssembly
    - Wasmtime
    - Wasmer
    - wasmi
    - wasi
    - wasm-bindgen
    - wit-bindgen
    - Linker
    - Store
    - Engine
    - func_wrap
    - "Memory::new"
    - linear_memory
    - caller.get_export
    - instance.exports
  structural_signals:
    - wasm_host_function_registration
    - guest_pointer_read
    - guest_pointer_write
    - wasm_module_instantiation_from_untrusted_source
    - wasi_context_builder
source:
  origin: file
  path: wasm-safety-boundary.md
  hash: "sha256:56a25d7b71db0de903da078ac94ae72132bc9ba8acc2c9b6f02c13765b3f85bf"
---
# WebAssembly Safety Boundary

## When This Activates

Activates on diffs that embed a WebAssembly runtime (Wasmtime, Wasmer, wasmi, V8 isolates running wasm) or define the host/guest interface for such an embedding. The defining feature of wasm is that the guest runs untrusted code inside a sandbox, and every bit of safety depends on correctly drawing the boundary. This reviewer focuses on the host side: what your host function exports let the guest do, whether guest-supplied pointers/lengths are validated against linear memory, whether resource limits prevent DoS, and whether WASI capabilities are scoped appropriately. Companion reviewers `wasm-sandboxing` covers runtime configuration depth, and `wasm-interface-types` covers the component model boundary.

## Audit Surface

- [ ] Host function import reads guest memory using a (ptr, len) from the guest without checking `ptr + len <= memory.data_size()`
- [ ] Host writes to guest memory without bounds-checking the destination offset and length
- [ ] Guest pointer arithmetic performed in host code using i32 without overflow handling
- [ ] Wasmtime Config / Wasmer Store / wasmi module instantiated without fuel, epoch_interruption, or instruction limits
- [ ] wasm module accepted from network/user input without allowlisting imports and exports
- [ ] WASI context granted dir preopens at root '/' or home directory rather than a scoped temp dir
- [ ] WASI network sockets enabled for untrusted modules without an egress allowlist
- [ ] Host function leaks references, file handles, or DB connections into guest-accessible globals
- [ ] Shared memory (threads proposal) passed between modules with different trust levels
- [ ] Host assumes guest strings are UTF-8 valid without validation before passing to Rust/Java APIs
- [ ] wasm-bindgen / wit-bindgen generated bindings used unchecked in security-critical host code
- [ ] Host function panics on bad guest input instead of returning a trap the guest can observe
- [ ] Guest code reads/writes through host-provided raw pointers rather than linear-memory offsets
- [ ] Module cache shared between tenants without isolation
- [ ] Trust boundary between host and guest is not documented
- [ ] Host function retains a reference to guest memory across an `await` that may re-grow memory
- [ ] Trap handler unwinds through destructors that assume guest invariants hold

## Detailed Checks

### Guest Pointer Validation in Host Functions
<!-- activation: keywords=["func_wrap", "Caller", "get_export", "Memory", "data_mut", "data_size", "view", "as_slice", "copy_from_slice", "WasmPtr"] -->

- [ ] **Unchecked (ptr, len) slicing**: flag host functions that receive a guest pointer and length, then `memory.data()[ptr..ptr+len]` without asserting the slice lies within the current memory. A malicious guest passes `ptr = u32::MAX, len = 4` to read past memory -- wasmtime will panic at best, leak host memory at worst on older versions.
- [ ] **Overflow in ptr + len**: flag `ptr + len` computed as `u32` without checked arithmetic. `(u32::MAX - 4) + 8` wraps to 4, passing a naive `<= memory.len()` test, and the subsequent slice escapes the guest memory.
- [ ] **Stale memory reference across await**: flag host async functions that hold a `&[u8]` into guest memory across an `.await` -- if the guest grows memory via `memory.grow`, the backing buffer is reallocated and the reference dangles. Use `WasmPtr` + re-fetch, not raw slices.
- [ ] **UTF-8 assumption on guest strings**: flag host code that calls `std::str::from_utf8_unchecked` or `String::from_utf8_unchecked` on guest bytes -- a hostile guest provides invalid UTF-8 and triggers UB in downstream Rust/Java code.

### Resource Limits for Untrusted Modules
<!-- activation: keywords=["fuel", "add_fuel", "consume_fuel", "epoch_interruption", "set_epoch_deadline", "max_memory", "max_instances", "max_tables", "instruction_limit", "StoreLimits"] -->

- [ ] **No fuel/epoch for untrusted wasm**: flag `Store::new` without `Store::set_fuel` / `Store::set_epoch_deadline` when the module origin is untrusted (user upload, plugin, third-party) -- a `loop {}` will burn CPU indefinitely and block the executor thread.
- [ ] **Engine reused across trust levels without config**: flag one `Engine` used for both system-trusted and user-supplied modules without per-Store resource limits -- the Engine caches compiled code but limits are per-Store; forgetting limits on the user Store is silent failure.
- [ ] **No `StoreLimits` for memory/tables/instances**: flag `Store::new` without `Store::limiter` when accepting arbitrary modules -- a module can request `memory.grow` to exhaust host RAM. Cap memory per Store.
- [ ] **Fuel set but never refilled and never checked**: flag patterns where fuel is added once at module init but long-running modules are expected to make progress -- either document the one-shot budget or use epoch interruption for periodic deadlines.

### WASI Capability Scoping
<!-- activation: keywords=["WasiCtxBuilder", "WasiCtx", "preopened_dir", "inherit_stdio", "inherit_env", "args", "envs", "wasi_common", "wasi-sockets", "sock_accept", "sock_connect"] -->

- [ ] **Overbroad directory preopens**: flag `WasiCtxBuilder::preopened_dir("/", "/")` or preopens of the user home directory -- WASI grants the guest full filesystem access within the preopened root. Scope to a per-invocation temp dir.
- [ ] **inherit_stdio for untrusted modules**: flag `inherit_stdio()` when the module is untrusted -- the guest can write to your host stdout/stderr, poisoning logs and observability.
- [ ] **inherit_env leaks secrets**: flag `inherit_env()` when the host process environment contains secrets -- WASI exposes all env vars to the guest. Use `envs(&[("KEY", "value")])` with an explicit allowlist.
- [ ] **wasi-sockets enabled without egress allowlist**: flag `allow_ip_name_lookup(true)` or socket capabilities on untrusted modules without a destination allowlist -- wasi-sockets is a full network capability and must be scoped at the runtime or outside (e.g. egress firewall).
- [ ] **clocks allowing high-resolution timing**: flag full clock access on modules running alongside untrusted tenants -- high-resolution timers enable Spectre-style timing side channels against co-tenants.

### Host Function Import Surface
<!-- activation: keywords=["Linker::func_wrap", "Linker::define", "add_to_linker", "wasi_snapshot_preview1", "instance.exports", "caller.data"] -->

- [ ] **Too-broad import surface**: flag `Linker` configurations that expose host functions the guest does not need -- every imported function is an attack surface. Default-deny: explicitly list imports per module class.
- [ ] **Host function holds a process-wide mutex**: flag host imports that acquire a global mutex -- a malicious guest repeatedly invokes the import to starve other tenants sharing the same host.
- [ ] **Host function panics on bad input**: flag host imports that `unwrap()` or `panic!` on invalid guest input -- a wasm trap is the correct failure mode; a host panic aborts the whole process and may indicate that Rust panic=unwind meets a C++ boundary with UB. Return `Result<_, Trap>`.
- [ ] **Leaking host handles into the guest**: flag patterns where a raw pointer, file descriptor, or DB connection handle is returned to the guest -- the guest now has a forgeable capability.

### Module Provenance and Validation
<!-- activation: keywords=["Module::new", "Module::from_binary", "validate", "wasmparser", "compile", "deserialize", "precompiled"] -->

- [ ] **Compiling user-supplied bytes with no validation layer**: flag `Module::new(engine, &user_bytes)` without first validating the wasm magic, version, and import list -- rejecting a forbidden import at compile time is cheaper than sandboxing it at runtime.
- [ ] **Deserializing precompiled artifacts across trust boundaries**: flag `Module::deserialize` applied to untrusted bytes -- deserialize skips validation and can execute attacker-controlled compiled code. Only deserialize your own cache.
- [ ] **Missing module signature / hash check**: flag loading wasm modules from network/object storage without verifying a content hash or signature from a trusted source.

### Shared Memory and Threads
<!-- activation: keywords=["SharedMemory", "memory.atomic", "threads", "wasi-threads", "SharedArrayBuffer", "Atomics"] -->

- [ ] **Shared memory across trust boundaries**: flag `SharedMemory` instances passed between modules with different trust levels -- shared memory bypasses the per-Store sandbox. Use message passing or explicit copies instead.
- [ ] **Atomics-based side channels**: flag patterns where untrusted modules use `memory.atomic.notify` / `memory.atomic.wait` against host-shared regions -- this enables high-resolution timing suitable for microarchitectural attacks.

## Common False Positives

- **Trusted first-party wasm**: a wasm module shipped inside your binary (e.g. a query engine compiled to wasm for portability) is equivalent to dynamically loaded library code. Fuel limits, import allowlists, and filesystem scoping are lower priority. Flag if the same runtime also loads user-supplied modules.
- **wasm-pack browser bindings**: browser-side wasm-bindgen code runs in the page's origin and is subject to browser sandboxing, not the server trust model. Apply `web-security` reviewers instead.
- **Host function that reads from a read-only section**: `memory.data()` into a guest-readable only region with small fixed length is safe even without the full (ptr, len) bounds-checking pattern.
- **Fuel disabled deliberately in tests**: unit tests may intentionally disable resource limits to measure performance. Flag only when the same pattern is reachable in production.

## Severity Guidance

| Finding | Severity |
|---|---|
| Host function reads guest memory using unchecked (ptr, len) | Critical |
| Untrusted wasm loaded with no fuel/epoch/memory limits | Critical |
| WASI preopen at `/` or inherit_env in a multi-tenant host | Critical |
| `Module::deserialize` on untrusted bytes | Critical |
| Host function leaks a file descriptor or DB handle to the guest | Critical |
| Stale `&[u8]` guest memory reference held across an await | Important |
| `inherit_stdio` / `inherit_env` for untrusted modules | Important |
| Host function `panic!` on guest input instead of trap | Important |
| Shared memory spanning trust levels | Important |
| Missing module provenance check (hash/signature) | Important |
| Overbroad import surface (functions exposed but unused) | Minor |
| UTF-8 unchecked on guest strings where downstream tolerates invalid bytes | Minor |
| Fuel limits missing in tests only | Minor |

## See Also

- `wasm-sandboxing` -- runtime configuration (Engine/Store/Linker) for isolation depth
- `wasm-interface-types` -- component model and WIT schemas for safer host/guest ABI
- `sec-owasp-a05-misconfiguration` -- runtime-level defaults that enable the boundary issues above
- `sec-owasp-a10-ssrf` -- WASI network capabilities can enable SSRF if not scoped
- `sec-secrets-management-and-rotation` -- guarding env/file-based secrets from guest exposure
- `perf-network-io` -- resource limits interact with egress I/O from guests

## Authoritative References

- [Wasmtime Security](https://docs.wasmtime.dev/security.html)
- [Wasmtime Resource Limiting](https://docs.wasmtime.dev/api/wasmtime/struct.StoreLimits.html)
- [WASI Capabilities](https://github.com/WebAssembly/WASI/blob/main/docs/WitInWasi.md)
- [Bytecode Alliance: Hardening Wasmtime](https://bytecodealliance.org/articles/security-and-correctness-in-wasmtime)
- [CVE-2023-26489 Wasmtime memory-access OOB](https://github.com/bytecodealliance/wasmtime/security/advisories/GHSA-ff4p-7xrq-q5r8)
- [Spectre and WebAssembly (V8)](https://v8.dev/blog/spectre)
