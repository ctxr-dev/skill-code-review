---
id: k8s-service-mesh-istio-linkerd-consul
type: primary
depth_role: leaf
focus: Detect service mesh misconfigurations including permissive mTLS, missing authorization policies, absent timeouts and circuit breakers, unenforced sidecar injection, and mesh bypass vectors
parents:
  - index.md
covers:
  - mTLS not enforced -- PERMISSIVE mode allows plaintext connections
  - Missing AuthorizationPolicy -- all traffic allowed by default in mesh
  - VirtualService without timeout or retry configuration
  - Circuit breaker not configured in DestinationRule
  - Missing rate limiting on ingress or per-service
  - Sidecar injection not enforced via namespace label
  - ServiceEntry for external services without TLS origination
  - Excessive sidecar resource consumption not bounded
  - Missing access logging for audit trail
  - Mesh bypass via hostNetwork pods skipping sidecar proxy
  - Gateway without TLS termination or invalid certificate
  - Missing peer authentication at namespace or mesh level
  - Sidecar containing business rules, domain logic, or application-level workflow
  - Ambassador not transparent to the primary service -- service knows about ambassador internals
  - Sidecar resource consumption not justified by the cross-cutting concern it handles
  - Sidecar lifecycle not coupled to primary service lifecycle
  - "Ambassador modifying request/response semantics beyond protocol-level concerns"
  - Sidecar duplicating functionality already in the service mesh
  - "Service directly depending on sidecar's internal API instead of standard protocol"
  - Sidecar with no health check or readiness probe
  - Ambassador introducing single point of failure between service and external dependency
  - Excessive number of sidecars per pod increasing memory and CPU overhead
tags:
  - kubernetes
  - service-mesh
  - istio
  - linkerd
  - consul
  - mtls
  - authorization
  - circuit-breaker
  - sidecar
  - envoy
  - ambassador
  - proxy
  - cross-cutting
  - architecture
aliases:
  - arch-sidecar-ambassador
activation:
  file_globs:
    - "**/*.yaml"
    - "**/*.yml"
    - "**/k8s/**"
    - "**/kubernetes/**"
    - "**/istio/**"
    - "**/linkerd/**"
    - "**/consul/**"
  keyword_matches:
    - Istio
    - istio
    - Linkerd
    - linkerd
    - Consul
    - consul
    - VirtualService
    - DestinationRule
    - ServiceEntry
    - Gateway
    - PeerAuthentication
    - AuthorizationPolicy
    - TrafficPolicy
    - sidecar
    - envoy
    - proxy
    - mesh
    - mTLS
  structural_signals:
    - "apiVersion: networking.istio.io"
    - "apiVersion: security.istio.io"
    - "apiVersion: linkerd.io"
    - "kind: VirtualService"
    - "kind: DestinationRule"
source:
  origin: file
  path: k8s-service-mesh-istio-linkerd-consul.md
  hash: "sha256:46befdb7a00dd0b6304ffc43d5592746e4666a4186b6cd544364d5e274769b13"
---
# Kubernetes Service Mesh (Istio / Linkerd / Consul)

## When This Activates

Activates on diffs touching service mesh configuration resources (Istio VirtualService, DestinationRule, PeerAuthentication, AuthorizationPolicy; Linkerd ServiceProfile, Server, ServerAuthorization; Consul service-defaults, service-intentions). A service mesh adds a sidecar proxy to every pod for mTLS, observability, and traffic management -- but misconfiguration negates these benefits. PERMISSIVE mTLS mode allows plaintext connections, missing AuthorizationPolicy means any pod can call any service, absent timeouts cause cascading failures, and pods with hostNetwork bypass the sidecar entirely. This reviewer detects mesh configurations that create a false sense of security or miss reliability controls.

## Audit Surface

- [ ] PeerAuthentication with mtls.mode: PERMISSIVE
- [ ] Namespace without AuthorizationPolicy (implicit allow-all)
- [ ] VirtualService route without timeout field
- [ ] VirtualService route without retries configuration
- [ ] DestinationRule without connectionPool or outlierDetection
- [ ] No rate limiting configuration
- [ ] Namespace without sidecar injection label/annotation
- [ ] ServiceEntry for external services without TLS origination
- [ ] Sidecar container without resource requests/limits
- [ ] Mesh without access logging configured
- [ ] Pod with hostNetwork: true bypassing sidecar proxy
- [ ] Gateway without TLS mode configured
- [ ] PeerAuthentication not defined at mesh or namespace scope

## Detailed Checks

### mTLS Enforcement
<!-- activation: keywords=["PeerAuthentication", "mtls", "PERMISSIVE", "STRICT", "DISABLE", "mTLS", "tls", "plaintext", "mutual"] -->

- [ ] **PERMISSIVE mTLS mode**: flag PeerAuthentication resources with `mtls.mode: PERMISSIVE` -- this accepts both mTLS and plaintext connections; an attacker with network access can send unencrypted traffic and bypass mutual authentication. Set to STRICT after confirming all clients have sidecars
- [ ] **No mesh-wide PeerAuthentication**: flag absence of a mesh-wide PeerAuthentication (namespace: istio-system for Istio) -- without a mesh-level default, each namespace must individually enforce mTLS, and new namespaces default to PERMISSIVE
- [ ] **Port-level mTLS exception**: flag PeerAuthentication with portLevelMtls overriding STRICT to DISABLE or PERMISSIVE on specific ports -- ensure the exception is documented and the port genuinely cannot support mTLS (e.g., health check from non-mesh load balancer)
- [ ] **Linkerd without Server/ServerAuthorization**: flag Linkerd meshes without Server resources defining mTLS requirements -- Linkerd enables mTLS by default for meshed pods but does not enforce it as mandatory for incoming connections without explicit Server configuration

### Authorization Policies
<!-- activation: keywords=["AuthorizationPolicy", "action", "ALLOW", "DENY", "CUSTOM", "rules", "source", "operation", "principals", "namespaces"] -->

- [ ] **No AuthorizationPolicy in namespace**: flag namespaces with meshed workloads but no AuthorizationPolicy -- Istio defaults to allow-all when no policy exists; any pod in the mesh can call any service
- [ ] **Missing deny-by-default**: flag namespaces with ALLOW AuthorizationPolicies but no DENY policy or default-deny -- without a deny baseline, unmatched traffic is allowed through
- [ ] **Overly broad principal match**: flag AuthorizationPolicy with `principals: ["*"]` or `namespaces: ["*"]` in source rules -- this matches any service account or namespace, effectively allowing all traffic
- [ ] **Consul intentions without default-deny**: flag Consul Connect deployments without a default-deny intention -- Consul defaults to allow-all; create a deny-all intention and add specific allow intentions per service pair

### Traffic Resilience
<!-- activation: keywords=["VirtualService", "timeout", "retries", "retryOn", "perTryTimeout", "DestinationRule", "connectionPool", "outlierDetection", "circuitBreaker", "maxConnections", "maxRetries"] -->

- [ ] **VirtualService without timeout**: flag VirtualService routes without a `timeout` field -- without a timeout, a slow downstream holds connections indefinitely, exhausting connection pools and causing cascading failures
- [ ] **Missing retry configuration**: flag VirtualService routes without `retries` -- retries with appropriate conditions (5xx, connect-failure, retriable-4xx) and limits improve resilience against transient failures
- [ ] **No circuit breaker**: flag DestinationRules without `outlierDetection` -- without circuit breaking, requests continue flowing to unhealthy endpoints, amplifying failures; configure consecutive5xxErrors, interval, and baseEjectionTime
- [ ] **Missing connection pool limits**: flag DestinationRules without `connectionPool` -- unbounded connection pools allow a single caller to exhaust resources on the target service; set maxConnections, maxRequestsPerConnection, and http2MaxRequests
- [ ] **Retry without per-try timeout**: flag retries configuration without `perTryTimeout` -- without it, retries use the overall route timeout, and a single slow retry can consume the entire budget

### Sidecar Injection and Bypass
<!-- activation: keywords=["injection", "inject", "sidecar", "istio-injection", "linkerd.io/inject", "hostNetwork", "label", "annotation", "namespace"] -->

- [ ] **Namespace without injection label**: flag application namespaces without `istio-injection: enabled` (Istio) or `linkerd.io/inject: enabled` (Linkerd) -- pods in these namespaces run without sidecars, bypassing mTLS, authorization, and observability
- [ ] **hostNetwork pod in mesh namespace**: flag pods with `hostNetwork: true` in sidecar-injected namespaces -- hostNetwork pods bypass the sidecar proxy entirely because traffic does not flow through the pod network namespace; mTLS and AuthorizationPolicy do not apply
- [ ] **Sidecar injection disabled per pod**: flag pods with `sidecar.istio.io/inject: "false"` annotation -- explicitly opting out of sidecar injection bypasses all mesh controls for that pod; ensure there is a documented reason
- [ ] **Sidecar resource limits not set**: flag sidecar proxy containers (istio-proxy, linkerd-proxy) without resource requests/limits -- sidecar proxies consume CPU and memory for every request; unbounded sidecars compete with application containers and can trigger OOM kills

### External Service Communication
<!-- activation: keywords=["ServiceEntry", "external", "MESH_EXTERNAL", "resolution", "DNS", "tls", "origination", "destinationRule", "trafficPolicy"] -->

- [ ] **ServiceEntry without TLS origination**: flag ServiceEntry resources for external HTTPS services without a corresponding DestinationRule with `tls.mode: SIMPLE` or `ISTIO_MUTUAL` -- without TLS origination, traffic from the sidecar to the external service may be sent as plaintext
- [ ] **Unregistered external access**: flag mesh configurations with `outboundTrafficPolicy.mode: ALLOW_ANY` -- this allows pods to reach any external endpoint without declaring ServiceEntry resources; use REGISTRY_ONLY to enforce explicit external service registration
- [ ] **External service without connection limits**: flag ServiceEntry + DestinationRule for external services without connection pool limits -- external services have finite capacity and no mesh-level circuit breaking by default

### Observability
<!-- activation: keywords=["accessLog", "accessLogFile", "accessLogEncoding", "telemetry", "metrics", "tracing", "logging"] -->

- [ ] **Missing access logging**: flag mesh configurations without access logging enabled (Istio: `meshConfig.accessLogFile` or Telemetry API accessLogging) -- access logs are essential for security incident investigation and compliance audit trails
- [ ] **Missing distributed tracing integration**: flag mesh deployments without tracing headers propagation configured -- the mesh can inject tracing headers (b3, w3c traceparent) but the application must propagate them; verify trace context is preserved

## Common False Positives

- **PERMISSIVE mode during migration**: teams migrating to service mesh legitimately use PERMISSIVE mode to allow both mesh and non-mesh traffic during rollout. Flag only if the migration period appears indefinite.
- **Non-mesh namespaces**: infrastructure namespaces (monitoring, logging, CI/CD) may intentionally opt out of mesh injection. Verify the namespace is not handling sensitive workload traffic.
- **Gateway listeners**: Istio IngressGateway and Gateway resources handle external traffic that is not mTLS by design -- mTLS applies to east-west traffic within the mesh.
- **gRPC services with built-in retries**: services using gRPC retry policies at the application layer may not need mesh-level retries. Verify that retry budgets are not doubled.
- **Linkerd automatic mTLS**: Linkerd enables mTLS by default for all meshed pods without explicit PeerAuthentication-style resources. Do not flag missing mTLS config for Linkerd unless Server resources are needed for authorization.

## Severity Guidance

| Finding | Severity |
|---|---|
| mTLS PERMISSIVE mode in production on sensitive services | Critical |
| No AuthorizationPolicy -- mesh-wide allow-all | Critical |
| hostNetwork pod bypassing all mesh controls | Critical |
| Missing timeout on VirtualService (cascading failure risk) | Important |
| No circuit breaker in DestinationRule | Important |
| Namespace without sidecar injection label | Important |
| ServiceEntry without TLS origination to external service | Important |
| ALLOW_ANY outbound traffic policy | Important |
| Sidecar proxy without resource limits | Minor |
| Missing access logging in mesh | Minor |
| Missing rate limiting configuration | Minor |
| Missing distributed tracing integration | Minor |

## See Also

- `k8s-network-policies` -- NetworkPolicies complement mesh-level authorization for defense in depth
- `k8s-pod-security-standards` -- hostNetwork: true bypasses both NetworkPolicy and mesh controls
- `reliability-circuit-breaker` -- circuit breaker patterns applicable to mesh DestinationRules
- `reliability-timeout-deadline-propagation` -- timeout propagation across mesh-managed services
- `reliability-health-checks` -- mesh health checks interact with Kubernetes probes
- `sec-owasp-a05-misconfiguration` -- mesh misconfiguration falls under security misconfiguration

## Authoritative References

- [Istio Documentation: Security Best Practices](https://istio.io/latest/docs/ops/best-practices/security/)
- [Istio Documentation: Traffic Management](https://istio.io/latest/docs/concepts/traffic-management/)
- [Linkerd Documentation: Authorization Policy](https://linkerd.io/2/reference/authorization-policy/)
- [Consul Documentation: Service Mesh Intentions](https://developer.hashicorp.com/consul/docs/connect/intentions)
- [Envoy Documentation: Circuit Breaking](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/circuit_breaking)
