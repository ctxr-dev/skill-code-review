---
id: api-grpc
type: primary
depth_role: leaf
focus: Detect protobuf design issues, backward compatibility violations, streaming misuse, incorrect error codes, missing deadline propagation, and oversized messages
parents:
  - index.md
covers:
  - Proto field removed or renumbered breaking backward compatibility
  - Wrong gRPC status code for the error condition
  - "Missing deadline/timeout propagation across service boundaries"
  - Streaming RPC used where unary would suffice or vice versa
  - Large message payloads exceeding recommended gRPC size limits
  - Missing field presence tracking -- zero values conflated with unset
  - Proto package or service namespace collisions across teams
  - Enum without UNSPECIFIED zero value
  - Breaking change in proto without version bump
  - Missing server reflection or health check service
  - Streaming RPC without flow control or backpressure causing OOM on slow consumers
  - Missing deadline propagation on streaming RPCs
  - New gRPC channel created per call instead of reusing a shared channel
  - Missing interceptors for authentication, logging, or metrics
  - Server streaming without handling client cancellation
  - Large messages sent without chunking exceeding default size limits
  - Missing keepalive configuration causing silent connection death
  - INTERNAL status code returned for client-caused errors
  - Missing retry policy on transient failures
  - Metadata not forwarded in proxy or gateway services
tags:
  - grpc
  - protobuf
  - proto
  - api
  - backward-compatibility
  - streaming
  - deadline
  - status-codes
  - message-size
  - flow-control
  - backpressure
  - channel
  - interceptor
  - keepalive
  - metadata
  - retry
aliases:
  - net-grpc-streaming
activation:
  file_globs:
    - "**/*.proto"
    - "**/*grpc*"
    - "**/*_pb2*"
    - "**/*_grpc*"
    - "**/*pb.go"
    - "**/*_pb.ts"
    - "**/*_pb.js"
    - "**/*GrpcService*"
    - "**/*Grpc*"
  keyword_matches:
    - grpc
    - gRPC
    - proto
    - protobuf
    - rpc
    - service
    - message
    - streaming
    - unary
    - deadline
    - metadata
    - channel
    - stub
  structural_signals:
    - Proto message or service definition
    - gRPC client or server instantiation
    - gRPC interceptor or middleware
source:
  origin: file
  path: api-grpc.md
  hash: "sha256:4d5062e7f577ad8f365eb1ecbf7dd5ce975dac003a3a914c049c838651cb37c4"
---
# gRPC API Design

## When This Activates

Activates when diffs touch protobuf definitions, gRPC service implementations, client stubs, interceptors, or gRPC server configuration. gRPC provides a strongly-typed, high-performance RPC framework -- but its wire format (protobuf) imposes strict backward compatibility rules, its status codes have specific semantics different from HTTP, and its streaming primitives have distinct performance profiles. This reviewer detects proto design mistakes, compatibility violations, error handling gaps, and misuse of streaming that lead to production incidents.

## Audit Surface

- [ ] Proto field number reused, removed, or changed type
- [ ] gRPC handler returning generic INTERNAL or UNKNOWN instead of specific status code
- [ ] Outbound gRPC call with no deadline or context timeout set
- [ ] Server-streaming RPC for a small, bounded response set
- [ ] Unary RPC returning a repeated field that can grow unbounded
- [ ] Message payload exceeding 4 MB without chunking or streaming strategy
- [ ] Proto field using required (proto2) or no optional marker when absence is meaningful
- [ ] Enum missing zero value named *_UNSPECIFIED
- [ ] Proto package name colliding with another team's namespace
- [ ] Proto file with no syntax version declaration
- [ ] gRPC service without health check endpoint (grpc.health.v1)
- [ ] Deadline not propagated from incoming request context to outbound call
- [ ] Proto reserved fields or numbers not declared for removed fields
- [ ] Client not handling UNAVAILABLE with retry/backoff

## Detailed Checks

### Proto Backward Compatibility
<!-- activation: keywords=["message", "field", "number", "type", "reserved", "oneof", "enum", "optional", "repeated", "map", "deprecated", "removed"] -->

- [ ] **Reused field number**: flag proto changes where a previously used field number is assigned to a new field -- old clients still send/receive the old field type on that number, causing silent data corruption
- [ ] **Removed field without reserved**: flag proto fields removed without adding the number and name to `reserved` -- without reservation, future developers may accidentally reuse the number
- [ ] **Changed field type**: flag proto fields whose type changed (e.g., `int32` to `string`, `string` to `bytes`) -- wire format incompatibility causes deserialization failures in running clients
- [ ] **Enum zero value missing**: flag proto enums without a zero-value entry named `*_UNSPECIFIED` or `*_UNKNOWN` -- proto3 uses 0 as the default; without a meaningful zero value, unset fields silently map to the first enum value
- [ ] **Breaking oneof change**: flag fields moved into or out of a `oneof` group -- this changes the wire format and breaks existing clients

### gRPC Status Codes
<!-- activation: keywords=["status", "code", "error", "Status", "INTERNAL", "UNKNOWN", "NOT_FOUND", "INVALID_ARGUMENT", "PERMISSION_DENIED", "UNAUTHENTICATED", "UNAVAILABLE", "DEADLINE_EXCEEDED"] -->

- [ ] **Generic INTERNAL for all errors**: flag handlers returning `INTERNAL` or `UNKNOWN` for errors that have specific codes -- use `NOT_FOUND` (resource missing), `INVALID_ARGUMENT` (bad input), `PERMISSION_DENIED` (authz), `UNAUTHENTICATED` (authn), `ALREADY_EXISTS` (duplicate)
- [ ] **UNAVAILABLE for permanent errors**: flag handlers returning `UNAVAILABLE` (transient, should retry) for permanent errors -- clients with automatic retry will loop indefinitely
- [ ] **HTTP status in gRPC error**: flag handlers mapping HTTP status codes directly to gRPC error messages -- gRPC has its own status code semantics (e.g., 404 maps to NOT_FOUND, not the integer 404 in a message)
- [ ] **Missing error details**: flag gRPC errors with no detail message or structured error detail -- clients cannot provide useful error messages to users without context

### Deadline Propagation
<!-- activation: keywords=["deadline", "timeout", "context", "ctx", "cancel", "WithTimeout", "WithDeadline", "timeout_sec", "deadline_ms"] -->

- [ ] **No deadline on outbound call**: flag gRPC client calls made without a deadline or context timeout -- a hung downstream service blocks the caller's resources indefinitely. Every outbound gRPC call must have a deadline
- [ ] **Deadline not propagated**: flag service handlers that make downstream gRPC calls using a fresh context instead of the incoming request's context -- the downstream call should inherit the remaining deadline from the original request
- [ ] **Overly generous deadline**: flag deadlines set to minutes or more on gRPC calls in the hot path -- gRPC deadlines should reflect the expected response time plus margin, not a "just in case" value
- [ ] **Missing DEADLINE_EXCEEDED handling**: flag clients that do not handle DEADLINE_EXCEEDED distinctly from other errors -- deadline expiration is a signal to fail fast, not retry. See `principle-fail-fast`

### Streaming Misuse
<!-- activation: keywords=["stream", "streaming", "ServerStream", "ClientStream", "BidiStream", "BiDi", "send", "recv", "onNext", "onCompleted", "StreamObserver"] -->

- [ ] **Streaming for small responses**: flag server-streaming RPCs where the response is a small, bounded set that fits in a single unary response -- streaming adds complexity (connection management, flow control) without benefit for small payloads
- [ ] **Unary for large unbounded data**: flag unary RPCs returning a repeated field that can grow to thousands of items -- use server streaming or pagination to avoid exceeding the default 4 MB message size limit
- [ ] **Missing flow control**: flag bidirectional streaming implementations with no backpressure mechanism -- a fast producer can overwhelm a slow consumer, causing OOM
- [ ] **Stream without cancellation handling**: flag streaming RPCs that do not check for client cancellation or context deadline -- abandoned streams continue consuming server resources

### Message Size and Design
<!-- activation: keywords=["size", "max", "limit", "bytes", "payload", "repeated", "map", "nested", "chunk", "batch"] -->

- [ ] **Oversized message**: flag proto messages with repeated fields or map fields that could realistically exceed 4 MB (the default gRPC max message size) -- use streaming, pagination, or chunking for large data
- [ ] **Deeply nested messages**: flag proto messages nested more than 4 levels deep -- deep nesting complicates generated code, increases serialization cost, and makes schemas hard to evolve
- [ ] **Missing proto syntax version**: flag proto files without `syntax = "proto3"` declaration -- proto2 has different default value semantics and backward compatibility rules

## Common False Positives

- **Buf or protolock enforcing compatibility**: if the project uses `buf breaking` or protolock in CI, backward compatibility is already checked automatically. Verify the check runs on the changed proto files.
- **Internal-only protos**: proto files used only within a single service for internal serialization may have relaxed compatibility requirements. Flag only if the proto is part of a published API.
- **Streaming for real-time data**: server-streaming for real-time feeds (metrics, logs, events) is appropriate even for small individual messages -- the stream represents a continuous flow, not a bounded response.
- **Large messages with configured limits**: services that explicitly set `MaxRecvMsgSize` and `MaxSendMsgSize` above the default have acknowledged the large message size. Verify the limit is reasonable.
- **Status code conventions by framework**: some frameworks (Connect, grpc-gateway) have their own status code mapping conventions that differ from raw gRPC. Verify against the framework's documentation.

## Severity Guidance

| Finding | Severity |
|---|---|
| Proto field number reused for a different type | Critical |
| Changed proto field type on a published API | Critical |
| No deadline on outbound gRPC call in production service | Critical |
| All errors returned as INTERNAL with no specificity | Important |
| Removed field without reserved declaration | Important |
| Unary response with unbounded repeated field | Important |
| Missing deadline propagation from incoming to outgoing context | Important |
| Enum missing zero-value UNSPECIFIED entry | Minor |
| Server-streaming RPC for small bounded response | Minor |
| Proto file missing syntax version declaration | Minor |

## See Also

- `principle-fail-fast` -- deadline propagation ensures requests fail fast instead of waiting indefinitely
- `principle-solid` -- proto service definitions should follow Single Responsibility; one service per domain concept
- `principle-coupling-cohesion` -- proto packages should encapsulate cohesive domain concepts
- `api-versioning-deprecation` -- proto field deprecation and service versioning strategies
- `api-openapi-asyncapi-schema` -- schema management applies to protobuf as well as OpenAPI
- `sec-rate-limit-and-dos` -- missing deadlines and oversized messages are DoS vectors

## Authoritative References

- [Protocol Buffers Language Guide (proto3)](https://protobuf.dev/programming-guides/proto3/)
- [gRPC Status Codes](https://grpc.github.io/grpc/core/md_doc_statuscodes.html)
- [Google API Design Guide -- Errors](https://cloud.google.com/apis/design/errors)
- [Buf -- Protobuf Best Practices](https://buf.build/docs/best-practices/style-guide/)
- [gRPC Performance Best Practices](https://grpc.io/docs/guides/performance/)
- [Google API Design Guide -- Design Patterns](https://cloud.google.com/apis/design/design_patterns)
