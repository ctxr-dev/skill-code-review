---
id: wasm-interface-types
type: primary
depth_role: leaf
focus: Detect raw wasm imports where the component model is appropriate, unversioned WIT schemas, canonical ABI leakage, and expensive boundary crossings
parents:
  - index.md
covers:
  - "Raw wasm imports/exports used where a component model (WIT) boundary would be safer"
  - WIT interfaces imported without a version, breaking compatibility silently
  - "Canonical ABI details (pointers, cleanup functions) visible to application code"
  - "Large buffers copied across the JS<->wasm boundary on a hot path"
  - Host accepts WIT-typed records but does not validate invariants not expressed in WIT
  - wasm-bindgen JS glue used in a performance-critical loop
  - Missing string encoding contract between guest and host at the boundary
  - Component model world changes shipped without a compatibility story
  - Interface types used as weak validation -- trusting the type system for security
tags:
  - wasm
  - wit
  - wit-bindgen
  - wasm-bindgen
  - component-model
  - interface-types
  - canonical-abi
  - boundary
  - versioning
activation:
  file_globs:
    - "**/*.wit"
    - "**/*.rs"
    - "**/*.ts"
    - "**/*.js"
    - "**/*.go"
    - "**/*.py"
    - "**/*.c"
    - "**/Cargo.toml"
    - "**/wit/**"
  keyword_matches:
    - wit
    - wit-bindgen
    - component model
    - interface types
    - wasm-bindgen
    - wasm-pack
    - canonical ABI
    - world
    - package
    - use wit
    - "export "
    - "import "
    - JsValue
    - IntoWasmAbi
    - FromWasmAbi
  structural_signals:
    - wit_package_declaration
    - wit_world_definition
    - wasm_bindgen_extern
    - component_model_bindgen
    - js_wasm_hot_loop
source:
  origin: file
  path: wasm-interface-types.md
  hash: "sha256:25a3a0cde9345480ffe9aa6ecb772981ffea63c070616cf1f3c6ff25fb7ac9bf"
---
# WebAssembly Interface Types & Component Model

## When This Activates

Activates on diffs that define or consume a WIT (WebAssembly Interface Types) schema, use `wit-bindgen` or `wasm-bindgen`, or cross the JavaScript/host <-> wasm boundary in a typed way. The component model replaces ad-hoc `(i32, i32)` pointer/length ABIs with typed interfaces (records, variants, resources, futures, streams). This reviewer covers correctness and performance *at the boundary*: is the interface versioned? Is data copied or streamed? Are canonical-ABI mechanics leaking? Companion reviewers `wasm-safety-boundary` covers host-function safety inside a raw boundary, and `wasm-sandboxing` covers runtime configuration.

## Audit Surface

- [ ] Host imports the guest's linear memory directly where a component-model interface would fit
- [ ] WIT `import`/`export` without an explicit version on an externally evolving interface
- [ ] WIT record/variant with open-union intent lacks default / explicit enumeration
- [ ] Canonical ABI pointers/cleanup ids exposed in host code instead of hidden behind bindings
- [ ] wasm-bindgen `JsValue` round-tripped per iteration in a hot loop
- [ ] Large `Uint8Array` passed by copy where streaming chunks would suffice
- [ ] Host reads guest strings without declaring encoding (UTF-8 WIT vs UTF-16 JS)
- [ ] Guest exports functions with primitive args that should be WIT records
- [ ] Component composition has overlapping import names without disambiguation
- [ ] wit-bindgen generated code edited by hand -- regeneration will clobber changes
- [ ] Host does not validate semantic invariants beyond what WIT encodes
- [ ] JS-wasm boundary crossed per item in a large loop
- [ ] Interface returns `result<T, string>` where a typed error enum is needed
- [ ] Missing backward-compatibility tests when a WIT export changes signature
- [ ] Shared memory operations reach around the component boundary
- [ ] Async WIT future/stream used without host-side backpressure

## Detailed Checks

### Component Model vs Raw ABI
<!-- activation: keywords=["wit-bindgen", "wasm-bindgen", "extern \"C\"", "no_mangle", "canonical ABI", "linear_memory", "instance.exports", "Component::from_file"] -->

- [ ] **Raw (ptr, len) ABI where component model fits**: flag new wasm-host interfaces written as `extern "C"` with `i32` pointer/length pairs when the host toolchain supports the component model -- the component model provides typed records, variants, resources, and owned strings without manual marshaling. Reserve raw ABI for established `wasm-bindgen` or legacy-consumer cases.
- [ ] **wasm-bindgen for server-side guests**: flag `wasm-bindgen` used to expose functions from a server-side wasm module consumed by a non-browser host -- `wit-bindgen` + component model is typically more portable and avoids JS semantics leaking in. wasm-bindgen's JS-centric type mapping (`JsValue`, `js_sys::*`) is a smell in a server host.
- [ ] **Canonical ABI leakage**: flag application code that calls cleanup functions, manages post-return lifetimes, or dereferences canonical-ABI pointers directly -- these should be entirely inside generated bindings.

### WIT Schema Versioning and Stability
<!-- activation: keywords=["wit package", "interface", "world", "@", "version", "use ", "semver", "breaking"] -->

- [ ] **Unversioned package/interface**: flag `package example:foo;` without `@X.Y.Z` for any WIT published outside the current repo -- consumers cannot pin to a compatible version. Always tag versions for externally visible interfaces.
- [ ] **World change without semver bump**: flag WIT world changes (added required imports, removed exports, renamed items) without a major-version bump -- WIT is a public contract; non-additive changes break consumers.
- [ ] **Open-ended variants**: flag variants without a default or catch-all case when the guest and host can evolve independently -- pattern matching on a new case will panic the old peer. Include a forward-compat variant or document the versioning contract.
- [ ] **Resource handle leakage**: flag WIT `resource` types whose drop semantics are unclear in the binding language -- document that consumers must drop the handle, and verify generated bindings enforce this.

### String, List, and Buffer Encoding
<!-- activation: keywords=["string", "list<u8>", "Uint8Array", "TextEncoder", "TextDecoder", "UTF-8", "UTF-16", "wit-bindgen string", "byte"] -->

- [ ] **Encoding mismatch at JS boundary**: flag host JS that passes a `string` to wasm without explicit UTF-8 conversion -- WIT strings are UTF-8; JS strings are UTF-16. wit-bindgen handles this, but ad-hoc `wasm-bindgen` glue often doesn't.
- [ ] **Large buffer passed by copy**: flag `list<u8>` or `Vec<u8>` parameters larger than ~1 MiB crossed by value on a frequent call -- prefer a `stream<u8>` (async component model) or chunked transfer. Each by-value crossing is a copy both ways.
- [ ] **Per-item boundary crossings**: flag loops that invoke a wasm export per item when a batch signature (`list<T>` in, `list<U>` out) would reduce crossings -- boundary crossing is cheap but not free; 10k per request is measurable.

### Host-Side Invariant Validation
<!-- activation: keywords=["variant", "record", "u32", "u8", "range", "enum", "validate", "invariant", "guard", "assert"] -->

- [ ] **Trusting WIT types for security invariants**: flag host code that treats a WIT `u32` as 'a valid user id' without further validation -- WIT encodes shape, not meaning. Apply the same input validation you would for JSON.
- [ ] **result<T, string> where typed error needed**: flag exports returning `result<T, string>` when the caller must dispatch on error kind -- use a `variant` error enum so callers can match without parsing strings.
- [ ] **Records without required-field guarantees**: flag WIT records consumed by the host where nullable fields are used as if required -- validate presence at the boundary and reject invalid shapes with a typed error.

### Hot-Path Performance at the Boundary
<!-- activation: keywords=["JsValue", "serde_wasm_bindgen", "to_value", "from_value", "borrow", "reflect", "for each", "map", "reduce", "hot loop"] -->

- [ ] **JsValue on hot path**: flag `JsValue` constructed or destructured inside loops running per-request -- each crossing involves V8 HandleScope and reflection. Precompute native handles or batch data through typed arrays.
- [ ] **serde_wasm_bindgen on hot path**: flag `serde_wasm_bindgen::to_value` / `from_value` inside loops -- this does reflection per call. For repeated shapes, use `#[wasm_bindgen]` structs or typed arrays.
- [ ] **Boundary crossing count grows with data size**: flag algorithms that scale JS-wasm crossings with `O(n)` instead of `O(1)` -- move the inner loop into wasm and pass the array once.
- [ ] **Sync wasm in UI thread**: flag synchronous wasm calls over ~5 ms on a browser main thread -- schedule via `requestIdleCallback` or move to a Web Worker to keep input latency under 100 ms.

### Async Interfaces (future/stream)
<!-- activation: keywords=["future<", "stream<", "async", "await", "resource", "wasi-io", "wasi:io/streams"] -->

- [ ] **Stream consumed without backpressure**: flag host consumers of WIT `stream<T>` that do not bound in-flight chunks -- the guest will push as fast as it can. Apply the backpressure pattern your runtime supports (pull-based iteration, bounded channel).
- [ ] **Future never cancelled on caller drop**: flag host holders of a WIT `future<T>` that cannot be dropped when the originating request is cancelled -- the guest keeps computing. Wire a cancellation signal through the binding.

### Component Composition and Linker Discipline
<!-- activation: keywords=["wasm-tools compose", "component link", "Linker", "add_to_linker", "instantiate_async", "world compose"] -->

- [ ] **Conflicting imports at composition**: flag component compositions where two dependencies import the same interface name at different versions -- the linker silently picks one. Compose with explicit name mappings.
- [ ] **Hand-edited generated bindings**: flag changes inside files marked as `// Generated by wit-bindgen` -- regeneration will overwrite. Put local adjustments in a wrapper module, not in generated code.
- [ ] **WIT schema in repo diverges from bindings**: flag diffs that modify `*.wit` without corresponding binding regeneration -- CI should regenerate and diff; a manual WIT edit unaccompanied by binding updates is a bug.

## Common False Positives

- **wasm-bindgen in a browser app**: for browser UI that uses wasm-bindgen + wasm-pack, JsValue and JS glue are idiomatic. Flag wasm-bindgen only when targeting a non-browser host or when the hot-path cost is measurable.
- **Experimental/prototype WIT**: unversioned WIT inside a private monorepo consumed only by code in the same repo does not require version tags. Recommend versioning at publish time.
- **Small buffers (< a few KB)**: by-value `list<u8>` copies are fine for small buffers; streaming overhead would exceed copy cost.
- **Component model not yet supported by toolchain**: if the guest/host language lacks mature component model tooling (e.g. some embedded targets), raw ABI is a reasonable fallback. Document the migration plan.
- **Generated code warnings from formatting/linting**: do not treat lint complaints on `wit-bindgen`-generated files as boundary findings -- they belong to the generator, not this review.

## Severity Guidance

| Finding | Severity |
|---|---|
| Published WIT interface lacks version and consumers exist across repos | Critical |
| Component model variant change without semver / compat test | Critical |
| Host treats WIT record as validated input for security-sensitive action | Critical |
| Generated binding code edited by hand | Important |
| Large buffer (> 1 MiB) passed by copy per request where stream fits | Important |
| JsValue / serde_wasm_bindgen on a per-item hot-loop | Important |
| wasm-bindgen used for server-side guest where wit-bindgen exists | Important |
| Canonical ABI pointers visible to application code | Important |
| result<T, string> where typed variant error is needed by callers | Important |
| Encoding mismatch (UTF-16 JS passed as UTF-8 string) not converted | Important |
| Stream / future without host-side backpressure or cancellation | Important |
| Per-item boundary crossing where batched signature exists | Minor |
| Unversioned WIT used only within a single repo | Minor |
| Component composition with overlapping imports but obvious winner | Minor |

## See Also

- `wasm-safety-boundary` -- raw-ABI safety when you must use it
- `wasm-sandboxing` -- runtime configuration around component model instances
- `api-async-event` -- component model streams echo async/event patterns
- `perf-network-io` -- boundary crossings compete with I/O for latency budget
- `reliability-backpressure` -- WIT streams need the same backpressure discipline
- `data-vector-modeling` -- typed records and variants belong to the same modeling family

## Authoritative References

- [WebAssembly Component Model Specification](https://github.com/WebAssembly/component-model)
- [WIT Syntax and Semantics](https://component-model.bytecodealliance.org/design/wit.html)
- [wit-bindgen](https://github.com/bytecodealliance/wit-bindgen)
- [wasm-bindgen Guide](https://rustwasm.github.io/docs/wasm-bindgen/)
- [Canonical ABI Explainer](https://github.com/WebAssembly/component-model/blob/main/design/mvp/CanonicalABI.md)
- [Bytecode Alliance: Component Model Introduction](https://bytecodealliance.org/articles/announcing-wasmtime-14)
- [wasi:io/streams](https://github.com/WebAssembly/wasi-io)
