---
id: ai-llm-streaming-latency
type: primary
depth_role: leaf
focus: Detect streaming not used for user-facing responses, TTFT not measured, missing partial response handling, unhandled streaming errors, and buffering that defeats the purpose of streaming
parents:
  - index.md
covers:
  - "Streaming not used for user-facing LLM responses (waiting for full response)"
  - "Time-to-first-token (TTFT) not measured or monitored"
  - "Missing partial response handling (user sees nothing until complete)"
  - "Streaming error not handled (connection drop, timeout mid-stream)"
  - Buffering layer defeating streaming purpose
  - No backpressure handling on streaming consumers
  - Streaming response not cancelable by the user
tags:
  - streaming
  - latency
  - TTFT
  - SSE
  - WebSocket
  - buffering
  - user-experience
  - real-time
activation:
  file_globs:
    - "**/*stream*"
    - "**/*chat*"
    - "**/*llm*"
    - "**/*sse*"
    - "**/*completion*"
  keyword_matches:
    - stream
    - streaming
    - SSE
    - EventSource
    - chunk
    - delta
    - TTFT
    - time_to_first_token
    - AbortController
    - cancel
    - "text/event-stream"
    - ReadableStream
    - StreamingResponse
  structural_signals:
    - non_streaming_user_facing
    - buffered_streaming
    - no_ttft_metric
source:
  origin: file
  path: ai-llm-streaming-latency.md
  hash: "sha256:206c55854c0410841d92860165efabb567fabb84283a377dd2631653a40666a2"
---
# Streaming and Latency

## When This Activates

Activates when diffs contain user-facing LLM response handling, streaming API configuration, SSE/WebSocket endpoints for LLM output, or latency measurement code. Users perceive LLM latency through time-to-first-token (TTFT), not total response time. Streaming is the primary tool for reducing perceived latency -- but only if the entire pipeline (backend, proxy, frontend) streams without buffering.

## Audit Surface

- [ ] User-facing LLM call not using streaming API
- [ ] No TTFT metric collection
- [ ] Frontend waiting for full response before rendering
- [ ] Streaming chunks buffered before forwarding
- [ ] No error handling for mid-stream disconnection
- [ ] Streaming not cancelable by user
- [ ] Proxy or middleware buffering the stream
- [ ] No timeout on time-to-first-token
- [ ] SSE without retry or reconnection
- [ ] Streaming chunks not forwarded incrementally

## Detailed Checks

### Streaming Enablement
<!-- activation: keywords=["stream", "streaming", "stream=True", "stream=true", "createChatCompletion", "chat.completions", "messages.create"] -->

- [ ] **Non-streaming user-facing call**: flag LLM API calls on user-facing request paths that use the non-streaming API (`stream=False` or absent) when the provider supports streaming -- the user sees nothing until the full response is generated, which can take 10-30 seconds for long outputs
- [ ] **Streaming but fully buffered**: flag code that enables streaming (`stream=True`) but accumulates all chunks into a string before returning to the client -- this negates the latency benefit of streaming
- [ ] **No streaming for long outputs**: flag non-streaming calls where `max_tokens` > 500 on user-facing paths -- longer outputs benefit more from streaming due to longer total generation time

### Time-to-First-Token Measurement
<!-- activation: keywords=["TTFT", "first_token", "latency", "metric", "time", "measure", "monitor", "p50", "p99"] -->

- [ ] **TTFT not measured**: flag streaming LLM endpoints with no measurement of time from request to first token received -- TTFT is the primary user-perceived latency metric and should be tracked at p50, p95, and p99
- [ ] **No TTFT timeout**: flag streaming responses with no timeout on receiving the first token -- if the LLM API is slow or down, the user stares at a blank screen indefinitely; set a TTFT timeout and show an error
- [ ] **No TTFT alerting**: flag production streaming endpoints where TTFT is measured but has no alert threshold -- TTFT regression should trigger alerts before users report it

### End-to-End Streaming Pipeline
<!-- activation: keywords=["SSE", "EventSource", "WebSocket", "ReadableStream", "StreamingResponse", "text/event-stream", "Transfer-Encoding", "chunked", "proxy", "nginx", "cloudflare"] -->

- [ ] **Proxy buffering**: flag streaming responses routed through reverse proxies (nginx, Cloudflare, API gateways) without configuring `X-Accel-Buffering: no`, `proxy_buffering off`, or equivalent -- proxies buffer by default, accumulating chunks before forwarding
- [ ] **Frontend not rendering incrementally**: flag frontend code that awaits the full SSE stream or WebSocket response before updating the UI -- each token should be rendered as it arrives
- [ ] **SSE without reconnection**: flag Server-Sent Events endpoints without `retry:` field or client-side reconnection logic -- network interruptions should trigger automatic reconnection with the last received event ID

### Error Handling and Cancellation
<!-- activation: keywords=["error", "abort", "cancel", "AbortController", "CancellationToken", "close", "disconnect", "timeout"] -->

- [ ] **No mid-stream error handling**: flag streaming response consumption without handling connection drops, timeout errors, or malformed chunks mid-stream -- partial responses should be surfaced to the user rather than silently discarded
- [ ] **Not cancelable**: flag streaming LLM calls on user-facing paths without cancellation support (AbortController in JS, CancellationToken in .NET, context cancellation in Go) -- if the user navigates away, the stream should be cancelled to save tokens and compute
- [ ] **No partial response recovery**: flag streaming handlers that discard all received content on mid-stream error instead of displaying what was received -- partial content is better than no content for the user

### Backend Streaming Architecture
<!-- activation: keywords=["queue", "buffer", "pipe", "transform", "middleware", "gateway", "async", "generator", "yield"] -->

- [ ] **Synchronous middleware in stream path**: flag synchronous logging, authentication, or transformation middleware in the streaming response path -- synchronous middleware introduces per-chunk latency that accumulates over hundreds of chunks
- [ ] **No backpressure handling**: flag streaming pipelines where a fast producer (LLM API) can overwhelm a slow consumer (client on poor network) -- implement backpressure to pause the producer when the consumer falls behind
- [ ] **Generator not yielded incrementally**: flag Python/Node.js streaming endpoints where the LLM stream is consumed but the HTTP response uses a non-streaming return instead of yielding chunks -- the backend streams from the LLM but buffers before sending to the client

## Common False Positives

- **Backend-to-backend calls**: LLM calls between backend services that are not user-facing do not need streaming. Non-streaming is simpler for programmatic consumption.
- **Short responses**: LLM calls with `max_tokens` < 100 complete quickly enough that streaming provides minimal benefit. Do not flag for very short expected outputs.
- **Batch processing**: offline batch jobs should not use streaming. Streaming is for interactive, user-facing paths only.
- **Structured output parsing**: when the complete response is needed before parsing (e.g., JSON mode), streaming is used only for progress indication, not for incremental processing. Do not flag buffering when the use case requires the complete response.
- **Framework-managed streaming**: Vercel AI SDK, StreamingTextResponse, and similar helpers manage streaming internally. Verify the framework is not already handling the concern before flagging.

## Severity Guidance

| Finding | Severity |
|---|---|
| User-facing LLM call not streaming with max_tokens > 500 | Important |
| Streaming enabled but fully buffered before returning | Important |
| No TTFT timeout on user-facing streaming endpoint | Important |
| Proxy buffering streaming response | Important |
| TTFT not measured on production streaming endpoint | Minor |
| Streaming not cancelable by user | Minor |
| SSE endpoint without reconnection logic | Minor |

## See Also

- `ai-llm-sdk-anthropic-openai-cohere` -- SDK streaming configuration and error handling
- `ai-llm-output-validation-structured` -- streaming chunks need special parsing consideration
- `reliability-timeout-deadline-propagation` -- TTFT timeout is a deadline propagation concern

## Authoritative References

- [Anthropic, "Streaming Messages"](https://docs.anthropic.com/en/api/streaming)
- [OpenAI, "Streaming" documentation](https://platform.openai.com/docs/api-reference/streaming)
- [MDN, "Server-Sent Events"](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [Vercel AI SDK -- Streaming](https://sdk.vercel.ai/docs/ai-sdk-core/generating-text#streamtext)
