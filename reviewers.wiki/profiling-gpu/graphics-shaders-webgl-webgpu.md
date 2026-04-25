---
id: graphics-shaders-webgl-webgpu
type: primary
depth_role: leaf
focus: Detect GPU hazards in shaders and graphics pipelines -- warp divergence, CPU-GPU sync stalls, missing precision, unfiltered textures, and undiagnosed errors in WebGL and WebGPU code
parents:
  - index.md
covers:
  - "Branching on non-uniform / uniform data causing warp divergence"
  - Uniform uploads per-frame stalling the GPU pipeline
  - "Textures used without mipmaps (cache thrash, aliasing)"
  - "Missing precision qualifier in GLSL ES (undefined behavior)"
  - "readPixels / mapAsync on hot path forcing GPU-CPU sync"
  - "Shader recompilation at runtime (stutter)"
  - "WebGL extension / WebGPU feature used without feature detection"
  - WebGPU pipelines without error scopes or validation layers
  - Compute pipelines missing resource barriers between passes
  - "Shadow maps without filtering (PCF / bilinear) producing aliasing"
  - "Overdraw / fill-rate not measured"
tags:
  - graphics
  - shaders
  - webgl
  - webgpu
  - glsl
  - wgsl
  - hlsl
  - gpu
  - rendering
activation:
  file_globs:
    - "**/*.glsl"
    - "**/*.vert"
    - "**/*.frag"
    - "**/*.wgsl"
    - "**/*.hlsl"
    - "**/*.metal"
    - "**/*.compute"
    - "**/*shader*"
    - "**/*.js"
    - "**/*.ts"
  keyword_matches:
    - shader
    - vertex
    - fragment
    - uniform
    - texture
    - WebGL
    - WebGPU
    - THREE.js
    - GPUDevice
    - createShaderModule
    - glUniform
    - glDraw
    - texImage
    - drawArrays
    - drawElements
    - pipeline
    - bindGroup
  structural_signals:
    - shader_branching
    - per_frame_uniform_upload
    - missing_mipmap
    - missing_error_scope
source:
  origin: file
  path: graphics-shaders-webgl-webgpu.md
  hash: "sha256:e3e09ac9d2a3cb7ab71d1955710b2625ab8a9809b0833bcd7111eecd8a0215db"
---
# Graphics Shaders (WebGL, WebGPU)

## When This Activates

Activates on diffs touching GLSL / WGSL / HLSL / Metal shader files or JavaScript / TypeScript that drives WebGL or WebGPU. Shader and pipeline mistakes are almost invisible in code review -- they surface as stutter, flicker, or "works on my GPU" bugs in production. This reviewer flags the classic GPU pitfalls: divergent branches, per-frame uploads that stall the pipeline, missing precision and mipmaps, readback patterns that force CPU-GPU sync, and missing error diagnostics.

## Audit Surface

- [ ] Fragment shader branches on varying / interpolated input (warp divergence)
- [ ] Uniform uploaded each frame for value that rarely changes
- [ ] Texture created without mipmaps or mipLevelCount
- [ ] GLSL ES shader missing precision qualifier
- [ ] readPixels / mapAsync / getMappedRange inside render loop
- [ ] createShaderModule / compileShader called per frame
- [ ] Shader variant explosion with no budget / tracking
- [ ] WebGL extension used without getExtension null check
- [ ] WebGPU without pushErrorScope / popErrorScope or device.lost handler
- [ ] Compute -> render transition missing barrier / pipeline sync
- [ ] Shadow map sampled with NEAREST instead of comparison / LINEAR sampler
- [ ] No overdraw or GPU time query for profiling
- [ ] Render target resize leaks previous GPU buffer / texture
- [ ] Many small uniform writes instead of one batched write
- [ ] Texture format oversized (RGBA32F where RGBA8 works)
- [ ] Depth buffer sampled as texture without layout transition
- [ ] Shader source built from user-controlled string concatenation
- [ ] Missing #version directive / mismatched GLSL profile
- [ ] Bind groups / VAOs recreated per draw call instead of cached
- [ ] No fallback when required WebGPU limit / feature unavailable

## Detailed Checks

### Shader Divergence and Hot Math
<!-- activation: keywords=["if", "discard", "loop", "for", "while", "branch", "varying", "in ", "out "] -->

- [ ] **Branch on non-uniform varying**: flag `if (v_worldPos.x > 0.0)` style branches on interpolated or per-fragment values where both sides do expensive work -- adjacent pixels take different paths and the GPU executes both (warp divergence); use `mix()` or flatten where possible
- [ ] **discard in early fragment stages**: flag liberal `discard` / `clip()` without comment -- breaks early-Z on many GPUs and doubles shading cost; acceptable when truly alpha-testing but must be conscious
- [ ] **Transcendental / division per pixel**: flag `pow`, `sin`, `tan`, `normalize` inside fragment shader tight loop where a LUT or approximation would do -- high ALU cost at fill-rate scales
- [ ] **Dependent texture reads**: flag texture sample whose coordinate depends on a prior texture sample -- disables texture prefetch; measure and document when intentional

### Uniform / Buffer Upload Patterns
<!-- activation: keywords=["glUniform", "writeBuffer", "writeTexture", "bindBufferBase", "updateBuffer", "setUniform"] -->

- [ ] **Uniform uploaded each frame for constant-ish value**: flag `gl.uniform*` or `queue.writeBuffer` called every frame for values that change rarely (e.g., viewport size, material constants) -- either upload only on change or pack into a UBO written once
- [ ] **Many small uniform writes instead of batch**: flag sequential `uniform1f` / `writeBuffer` calls each pushing a few bytes -- coalesce into one struct / UBO write
- [ ] **Uniform uploaded inside a draw loop**: flag per-object uniform update inside a for-loop over N objects with no instancing consideration -- prefer instancing or dynamic offsets

### CPU-GPU Sync Hazards
<!-- activation: keywords=["readPixels", "mapAsync", "getMappedRange", "fence", "finish", "flush", "waitSync"] -->

- [ ] **readPixels / mapAsync in render loop**: flag any pixel / buffer readback inside the per-frame path -- forces the CPU to wait for the GPU; move to async double-buffered readback and accept N-frame latency
- [ ] **gl.finish() / gl.flush() in hot path**: flag explicit synchronizing calls each frame -- only legitimate in specific measurement / screenshot paths, must be commented
- [ ] **Synchronous shader compile at runtime**: flag `createShaderModule` / `compileShader` inside any function called after initial load -- warm up shaders during load / first-frame and cache pipeline objects

### Precision, Mipmaps, and Sampling
<!-- activation: keywords=["precision", "highp", "mediump", "lowp", "mipmap", "generateMipmap", "mipLevelCount", "sampler", "texture2D", "textureLod"] -->

- [ ] **Missing precision qualifier in GLSL ES fragment**: flag fragment shaders without a default `precision mediump float;` (or explicit per-variable precision) -- ES spec makes it undefined, and desktop-to-mobile ports silently break
- [ ] **Texture used without mipmaps**: flag `texImage2D` / `GPUTextureDescriptor` without `generateMipmap` / `mipLevelCount > 1` when the texture is sampled at varying distances -- causes aliasing and texture-cache thrash
- [ ] **Shadow map sampled with NEAREST**: flag shadow texture sampled with `TEXTURE_MIN_FILTER=NEAREST` and no PCF -- produces aliased shadow edges; use a comparison sampler (sampler2DShadow / compare-function)
- [ ] **Oversized texture format**: flag RGBA32F / RGBA16F used for diffuse / UI textures where RGBA8 / SRGB8A8 suffices -- 4x-16x bandwidth for no visual benefit

### WebGL / WebGPU Feature Detection and Error Handling
<!-- activation: keywords=["getExtension", "requestAdapter", "requestDevice", "pushErrorScope", "popErrorScope", "onuncapturederror", "device.lost"] -->

- [ ] **WebGL extension without null check**: flag `gl.getExtension('EXT_...')` whose return value is used without `if (ext)` / fallback -- extensions are optional and may be null on some browsers / drivers
- [ ] **WebGPU without error scopes**: flag `device.createBuffer` / pipeline creation without `device.pushErrorScope('validation')` around it -- validation errors are silent otherwise in non-Chrome-flags builds
- [ ] **Missing device.lost / uncapturederror handler**: flag WebGPU app with no `device.lost.then(...)` and no `device.addEventListener('uncapturederror', ...)` -- GPU context loss is survivable but only if handled
- [ ] **Feature requested without fallback**: flag `requiredFeatures: ['timestamp-query']` (or similar) without a code path when the adapter lacks the feature

### Pipeline, Barriers, and Resource Lifetime
<!-- activation: keywords=["computePass", "renderPass", "barrier", "transition", "layout", "createPipeline", "bindGroup"] -->

- [ ] **Compute followed by render without sync**: in Vulkan / WebGPU, flag a compute pass writing to a buffer / texture then a render pass reading it without an explicit barrier / `commandEncoder` pass boundary -- undefined ordering and visual corruption
- [ ] **Render target resize leaks old GPU resource**: flag framebuffer / texture recreation on canvas resize without `.destroy()` / `gl.deleteTexture` on the previous handle -- GPU memory leak, noticeable after minutes of resizing
- [ ] **Bind group / VAO rebuilt per draw**: flag `gl.bindBuffer` + `vertexAttribPointer` chain executed per-draw for a static mesh -- create a VAO / bind group once and reuse

### Shader Variants and Recompilation
<!-- activation: keywords=["#define", "#ifdef", "variant", "preprocessor", "compileShader", "createShaderModule"] -->

- [ ] **Unbounded shader variant explosion**: flag shader generated from N independent `#define` toggles (materials, features) with no variant budget / tracking -- NxM compiled programs balloon memory and driver compile time
- [ ] **Shader source built from user input**: flag `createShaderModule({ code: userStr + fragmentTemplate })` -- compile-time injection; sanitize or template strictly
- [ ] **Missing #version / profile directive**: flag GLSL file without `#version` -- defaults to 100, not 300 es; produces silent wrong compilation on some drivers

### Profiling and Overdraw Visibility
<!-- activation: keywords=["EXT_disjoint_timer_query", "timestamp-query", "GPU", "profile", "overdraw"] -->

- [ ] **No GPU timing in new render pass**: flag new expensive render pass added without `EXT_disjoint_timer_query` / `timestamp-query` around it -- regressions invisible until GPU-bound frames appear
- [ ] **Overdraw not measured**: flag UI / particle systems added with no overdraw view / stencil-count check -- transparent layers stack silently

## Common False Positives

- **One-time resource upload**: uniform writes / texture uploads during load or scene init are not "per-frame" violations even if the call site looks similar.
- **Offline / editor tools**: screenshot utilities, thumbnail generators, and baking tools legitimately use `readPixels` and `gl.finish()`.
- **Intentional precision choice**: `highp` everywhere on desktop is fine; only flag missing qualifier or `mediump` on values that demonstrably overflow.
- **Debug / dev builds**: missing timestamp-query fallback is fine if feature is gated on `__DEV__`.
- **Small texture atlases**: mipmaps for UI atlases sampled at 1:1 pixel ratio are unnecessary and waste memory.

## Severity Guidance

| Finding | Severity |
|---|---|
| readPixels / mapAsync in render loop causing frame stall | Important |
| Shader source built from user-controlled string (injection) | Important |
| WebGPU without any error scope / device.lost handler | Important |
| Uniform uploaded per-frame for constant-ish value | Minor |
| Texture without mipmaps causing aliasing | Minor |
| Missing precision qualifier in GLSL ES | Minor |
| Shader variant explosion without budget | Minor |
| No GPU timing around new render pass | Minor |

## See Also

- `perf-hot-path-allocations` -- CPU-side render-loop allocations
- `perf-memory-gc` -- JavaScript GC around GPU buffer management
- `sec-owasp-a03-injection` -- for user-controlled shader source injection

## Authoritative References

- [Khronos, "OpenGL ES Shading Language Specification"](https://registry.khronos.org/OpenGL/specs/es/3.2/GLSL_ES_Specification_3.20.pdf)
- [W3C, "WebGPU"](https://www.w3.org/TR/webgpu/)
- [W3C, "WebGPU Shading Language (WGSL)"](https://www.w3.org/TR/WGSL/)
- [Khronos, "WebGL 2 Specification"](https://registry.khronos.org/webgl/specs/latest/2.0/)
- [NVIDIA, "Optimizing Shaders: Branching and Divergence"](https://developer.nvidia.com/content/understanding-structured-buffer-performance)
- [Google, "WebGPU Best Practices"](https://toji.dev/webgpu-best-practices/)
