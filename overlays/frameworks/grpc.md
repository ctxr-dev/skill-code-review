# gRPC — Review Overlay

Load this overlay for the **Security**, **Reliability**, and **API Design** specialists when gRPC / protobuf usage is detected.

> **Canonical reference:** <https://developers.google.com/protocol-buffers/docs/style> — Protobuf style guide.

## API Design — Protobuf Schema

- [ ] Field numbers are never reused after a field has been removed from a proto definition — removed fields must be listed under `reserved` with both the number and name
- [ ] Reserved field numbers and names are declared explicitly: `reserved 5; reserved "old_field_name";`
- [ ] Field types are not changed in a backward-incompatible way (e.g., `string` → `int32`); only wire-compatible changes (e.g., `int32` → `int64`) are permitted without a major version bump
- [ ] Enums include an explicit `0` value (e.g., `UNKNOWN = 0`) as the proto3 default; relying on meaningful semantics for the zero value causes deserialization surprises
- [ ] `oneof` fields are not extended with types that break existing generated code in deployed clients

## Security — Exposure and Auth

- [ ] The reflection API (`grpc.reflection.v1alpha`) is disabled or restricted in production; it exposes the full service schema to unauthenticated callers
- [ ] mTLS or token-based auth (e.g., JWT in metadata) is enforced on all public-facing gRPC endpoints; plaintext channels are not used outside local dev
- [ ] Auth interceptors run before any handler logic; handlers do not duplicate auth checks
- [ ] Metadata keys used to carry auth tokens follow the `authorization` (not custom ad-hoc) convention; binary metadata uses the `-bin` suffix

## Reliability — Deadlines and Errors

- [ ] All outbound gRPC calls set an explicit deadline or timeout; no call is made without `withDeadline()` / `withTimeout()` or an equivalent context deadline
- [ ] Incoming context deadlines are propagated to downstream calls; child calls respect the parent context and are not given a longer deadline than the parent
- [ ] Status codes are chosen semantically: `INVALID_ARGUMENT` for bad client input, `NOT_FOUND` for missing resources, `INTERNAL` for server bugs — not `UNKNOWN` as a catch-all
- [ ] Interceptor chains (client and server) handle errors at every stage; an interceptor that swallows errors makes debugging impossible
- [ ] Retry policies (if configured) are limited to idempotent methods and exclude `INTERNAL` and `DATA_LOSS` status codes

## Reliability — Streaming

- [ ] Server-streaming and bidirectional streaming handlers respect backpressure — the server does not produce messages faster than the client can consume, and `send()` errors are checked
- [ ] Client-streaming handlers process messages incrementally rather than buffering the entire stream into memory before responding
- [ ] Streaming RPCs have an explicit cancel or end condition; infinite streams are intentional and documented
- [ ] Goroutine / thread lifetime for streaming handlers is bounded — the handler returns when the context is cancelled or the stream is closed

## Observability

- [ ] gRPC status codes are surfaced in metrics and traces; HTTP 200 with a non-OK gRPC status inside the body is a common monitoring blind spot
- [ ] Trace context (e.g., W3C `traceparent`) is propagated through metadata on both client send and server extract sides
