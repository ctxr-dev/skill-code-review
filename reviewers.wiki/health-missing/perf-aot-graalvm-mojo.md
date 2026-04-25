---
id: perf-aot-graalvm-mojo
type: primary
depth_role: leaf
focus: Detect reflection not registered for AOT, resource files not included in native image, native image config drift, and GraalVM substitution issues
parents:
  - index.md
covers:
  - "Reflection usage not registered in reflect-config.json or @RegisterForReflection"
  - Resource file not included in resource-config.json for native image
  - JNI call not registered in jni-config.json
  - Dynamic proxy not registered in proxy-config.json
  - Native image configuration drifting from actual code usage
  - "GraalVM substitution (@TargetClass) not updated when target class changes"
  - Serialization class not registered for native image
  - Class initialization at build time vs run time mismatch
  - Conditional feature detection breaking in AOT-compiled binary
tags:
  - aot
  - graalvm
  - native-image
  - reflection
  - resource
  - proxy
  - quarkus
  - micronaut
  - mojo
  - performance
activation:
  file_globs:
    - "**/reflect-config.json"
    - "**/resource-config.json"
    - "**/proxy-config.json"
    - "**/jni-config.json"
    - "**/serialization-config.json"
    - "**/native-image.properties"
    - "**/application.properties"
    - "**/*Feature*"
    - "**/GraalVM*"
    - "**/*.java"
    - "**/*.kt"
  keyword_matches:
    - native-image
    - GraalVM
    - graalvm
    - reflect-config
    - resource-config
    - proxy-config
    - RegisterForReflection
    - Introspected
    - TargetClass
    - Substitute
    - AutomaticFeature
    - initialize-at-build-time
    - Class.forName
    - forName
    - native
  structural_signals:
    - reflection_usage
    - resource_access
    - dynamic_proxy
    - jni_call
    - native_image_config
source:
  origin: file
  path: perf-aot-graalvm-mojo.md
  hash: "sha256:a51dd680c5c6ccdab644e0edf23135381503a2b773260d87c4a3dfc3df757599"
---
# AOT Compilation and GraalVM Native Image

## When This Activates

Activates on diffs modifying GraalVM native image configuration files, reflection-heavy code in AOT-compiled projects (Quarkus, Micronaut, Spring Native, Helidon), or substitution classes. AOT (ahead-of-time) compilation produces fast-starting native binaries but requires explicit registration of all reflective, resource, proxy, JNI, and serialization usage. The most common AOT failure mode is a `ClassNotFoundException` or `NoSuchMethodException` at runtime because a reflection target was not registered at build time. This reviewer detects configuration gaps that compile successfully but fail at runtime.

## Audit Surface

- [ ] Class.forName(), Method.invoke(), or Field.get() without reflect-config.json entry
- [ ] getResource() or getResourceAsStream() for file not in resource-config.json
- [ ] Proxy.newProxyInstance() without proxy-config.json entry
- [ ] JNI native method without jni-config.json entry
- [ ] New class added to reflection-heavy framework (Jackson, GSON) without AOT registration
- [ ] Serialization (ObjectInputStream/ObjectOutputStream) of class not in serialization-config.json
- [ ] @TargetClass substitution referencing class that has been refactored or removed
- [ ] --initialize-at-build-time for class with runtime-dependent static initializer
- [ ] GraalVM native-image build with --no-fallback but missing registrations
- [ ] Feature class (@AutomaticFeature) with stale or incomplete registration logic
- [ ] Quarkus @RegisterForReflection missing on DTO used in JSON serialization
- [ ] Micronaut @Introspected missing on bean used in reflection-based binding

## Detailed Checks

### Missing Reflection Registration
<!-- activation: keywords=["reflect", "Class.forName", "forName", "getMethod", "getDeclaredMethod", "getField", "invoke", "newInstance", "reflect-config", "RegisterForReflection", "Introspected", "TypeHint"] -->

- [ ] **Unregistered reflection target**: flag `Class.forName()`, `clazz.getMethod()`, `clazz.getDeclaredField()`, or `Constructor.newInstance()` on classes not listed in reflect-config.json or annotated with @RegisterForReflection / @Introspected -- these calls succeed on JVM but throw at runtime in native image
- [ ] **New DTO without serialization registration**: flag new data classes, records, or DTOs used with Jackson, GSON, or Moshi that lack reflection registration -- JSON (de)serialization uses reflection by default; register or use compile-time code generation
- [ ] **Config drift from code**: flag reflect-config.json entries referencing classes that have been renamed, moved, or deleted -- stale entries are harmless but indicate the config is not maintained; missing entries for new classes are the real risk

### Missing Resource Registration
<!-- activation: keywords=["resource", "getResource", "getResourceAsStream", "ClassLoader", "classpath", "resource-config", "META-INF", "properties", "template", "sql", "xml"] -->

- [ ] **Unregistered resource file**: flag `getResource()` or `getResourceAsStream()` for classpath resources not listed in resource-config.json -- native images do not include unreferenced resources; the call returns null at runtime
- [ ] **Glob pattern too narrow**: flag resource-config.json patterns that include specific files but miss newly added resources in the same directory -- use glob patterns (`{"pattern": "META-INF/.*"}`) for directories with dynamic content

### Proxy and JNI Registration
<!-- activation: keywords=["Proxy", "proxy", "newProxyInstance", "InvocationHandler", "proxy-config", "JNI", "jni", "native ", "System.loadLibrary", "jni-config"] -->

- [ ] **Unregistered dynamic proxy**: flag `Proxy.newProxyInstance()` or framework-generated proxies (Spring AOP, Hibernate lazy proxies) for interfaces not in proxy-config.json -- the proxy class cannot be generated at runtime in native image
- [ ] **Missing JNI registration**: flag JNI native method declarations or `System.loadLibrary()` calls without corresponding jni-config.json entries -- JNI lookups fail without explicit registration

### Build-Time vs Run-Time Initialization
<!-- activation: keywords=["initialize-at-build-time", "initialize-at-run-time", "static", "clinit", "class initialization", "Instant.now", "System.getProperty", "System.getenv", "Random"] -->

- [ ] **Runtime-dependent static init at build time**: flag classes marked `--initialize-at-build-time` whose static initializers call `System.currentTimeMillis()`, `System.getenv()`, `Random()`, or `Instant.now()` -- these values are captured at build time and baked into the binary, not computed at runtime
- [ ] **Excessive build-time initialization**: flag `--initialize-at-build-time` applied broadly (entire packages) instead of specific classes -- broad build-time init risks capturing runtime-dependent state and increases image build time

### Substitution and Feature Maintenance
<!-- activation: keywords=["TargetClass", "Substitute", "AutomaticFeature", "Feature", "beforeAnalysis", "duringSetup", "substitution"] -->

- [ ] **Stale substitution**: flag `@TargetClass` annotations referencing classes that have been renamed, refactored, or removed -- the substitution silently becomes a no-op or compilation error
- [ ] **Feature with incomplete registration**: flag `@AutomaticFeature` classes that register a subset of reflection/resource needs -- cross-reference with actual reflection usage in the codebase

## Common False Positives

- **Framework-managed registration**: Quarkus, Micronaut, and Spring Native automatically register many reflection targets. Verify that the framework does not already handle the registration before flagging.
- **Test-only reflection**: reflection used only in test code does not need native image registration. Flag only production code paths.
- **Native image agent output**: if the project uses the native-image agent to generate config files, the configs may be comprehensive. Flag only when code changes are not re-traced.
- **JVM-only deployments**: if the service is deployed only on JVM (not native image), reflection registration is unnecessary. Confirm the deployment target before flagging.

## Severity Guidance

| Finding | Severity |
|---|---|
| Reflection target not registered (runtime ClassNotFoundException) | Critical |
| Resource file not in resource-config.json (null at runtime) | Critical |
| Runtime-dependent static init captured at build time | Critical |
| Dynamic proxy not registered (runtime UnsupportedOperationException) | Important |
| Stale @TargetClass substitution referencing removed class | Important |
| reflect-config.json drift from codebase (stale entries) | Minor |
| Broad --initialize-at-build-time on entire package | Minor |
| Missing JNI registration for native method | Important |

## See Also

- `perf-jit-warmup` -- AOT eliminates JIT warmup but introduces registration requirements
- `perf-startup-cold-start` -- native images have near-zero cold start, the primary motivation for AOT
- `antipattern-premature-optimization` -- switching to AOT for startup time should be justified by measurement
- `perf-profiling-discipline` -- profile both JVM and native image modes to compare steady-state throughput

## Authoritative References

- [GraalVM Documentation, "Native Image Reference" -- reflection, resource, proxy, and JNI configuration](https://www.graalvm.org/latest/reference-manual/native-image/)
- [Quarkus Guides, "Writing Native Applications" -- @RegisterForReflection and build-time initialization](https://quarkus.io/guides/writing-native-applications-tips)
- [Micronaut Documentation, "GraalVM Native Image" -- @Introspected and compile-time DI](https://docs.micronaut.io/latest/guide/index.html#graal)
- [Spring Native Documentation, "GraalVM Native Image Support" -- TypeHint, AotProxyHint, and native configuration](https://docs.spring.io/spring-boot/docs/current/reference/html/native-image.html)
