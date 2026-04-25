---
id: ai-llm-sdk-anthropic-openai-cohere
type: primary
depth_role: leaf
focus: Detect missing API key rotation, hardcoded model names, absent retry with backoff on rate limits, missing streaming error handling, unvalidated responses, absent usage tracking, and max_tokens not set
parents:
  - index.md
covers:
  - API key hardcoded in source or committed to version control
  - Model name hardcoded without configuration or feature flag
  - "Missing retry with exponential backoff on rate limit (429) errors"
  - Streaming response consumed without error handling
  - "API response not validated (missing choices, empty content)"
  - "No token usage tracking (prompt_tokens, completion_tokens)"
  - max_tokens not set allowing unbounded generation
  - API key not rotated or shared across environments
tags:
  - SDK
  - API-key
  - Anthropic
  - OpenAI
  - Cohere
  - retry
  - rate-limit
  - streaming
  - token-usage
  - max-tokens
activation:
  file_globs:
    - "**/*llm*"
    - "**/*openai*"
    - "**/*anthropic*"
    - "**/*cohere*"
    - "**/*client*"
    - "**/*chat*"
    - "**/*completion*"
  keyword_matches:
    - openai
    - OpenAI
    - anthropic
    - Anthropic
    - cohere
    - Cohere
    - api_key
    - OPENAI_API_KEY
    - ANTHROPIC_API_KEY
    - ChatCompletion
    - chat.completions
    - messages.create
    - client.chat
    - max_tokens
    - stream
  structural_signals:
    - hardcoded_api_key
    - no_retry_on_rate_limit
    - missing_max_tokens
source:
  origin: file
  path: ai-llm-sdk-anthropic-openai-cohere.md
  hash: "sha256:ae4fd384f57e3b6372a2acac60fae1f283905dfb0891aa141a5d676658f7ec2d"
---
# LLM SDK Discipline (Anthropic, OpenAI, Cohere)

## When This Activates

Activates when diffs import or use the Anthropic, OpenAI, Cohere, or similar LLM provider SDKs directly. SDK-level code is where API keys leak, rate limits crash production, unbounded generation burns budgets, and streaming errors corrupt user experiences. This reviewer ensures SDK usage follows production-grade practices beyond what tutorials demonstrate.

## Audit Surface

- [ ] API key as string literal in source code
- [ ] Model name hardcoded without configuration
- [ ] API call without retry on rate limit errors
- [ ] Streaming response without error handling
- [ ] Response accessed without validation
- [ ] No token usage logging
- [ ] max_tokens not set on completion call
- [ ] Same API key in dev and prod environments
- [ ] No client-side rate limiting
- [ ] API client without timeout configuration

## Detailed Checks

### API Key Security
<!-- activation: keywords=["api_key", "API_KEY", "key", "secret", "token", "credential", "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "COHERE_API_KEY"] -->

- [ ] **Hardcoded API key**: flag API keys appearing as string literals in source code, default parameter values, or committed configuration files -- API keys must be loaded from environment variables or a secrets manager at runtime
- [ ] **API key in version control**: flag `.env` files, config files, or test fixtures containing API keys that are not in `.gitignore` -- even expired keys in git history are a risk
- [ ] **No key rotation strategy**: flag single API key used across all environments with no rotation mechanism -- use separate keys per environment with rotation via secrets manager

### Model Configuration
<!-- activation: keywords=["model", "gpt-4", "gpt-3.5", "claude", "command", "sonnet", "opus", "haiku"] -->

- [ ] **Hardcoded model name**: flag model identifiers as string literals (`"gpt-4o"`, `"claude-sonnet-4-20250514"`) scattered across application code instead of centralized in configuration -- model upgrades require code changes and redeployment
- [ ] **max_tokens not set**: flag chat completion calls without `max_tokens` parameter -- without a limit, the model generates until its maximum, which wastes tokens and increases latency. Set max_tokens to the minimum needed for the task
- [ ] **No temperature configuration**: flag calls using default temperature when the task requires determinism (extraction, classification) or creativity (brainstorming) -- explicitly set temperature to match the use case

### Retry and Rate Limit Handling
<!-- activation: keywords=["retry", "backoff", "rate_limit", "429", "500", "503", "RateLimitError", "APIError", "tenacity", "backoff", "exponential"] -->

- [ ] **No retry on rate limit**: flag LLM API calls without retry logic for HTTP 429 (rate limit), 500 (server error), or 503 (overloaded) -- transient failures are common; use exponential backoff with jitter
- [ ] **Retry without backoff**: flag retry logic that retries immediately without exponential backoff -- immediate retries amplify rate limit pressure and are likely to fail again
- [ ] **No client-side rate limiting**: flag applications making high-volume LLM calls without client-side rate limiting (token bucket, leaky bucket) -- exceeding the provider's rate limit causes cascading failures
- [ ] **Retry on non-retryable errors**: flag retry logic that retries on 400 (bad request) or 401 (unauthorized) -- these are permanent failures; retrying wastes time and tokens

### Streaming and Response Handling
<!-- activation: keywords=["stream", "streaming", "delta", "chunk", "SSE", "async for", "for chunk in", "content_block", "text_delta"] -->

- [ ] **Streaming without error handling**: flag streaming response consumption (`for chunk in stream`) with no try/except for connection drops, timeout, or malformed chunks -- streaming connections are long-lived and prone to interruption
- [ ] **Response not validated**: flag code that accesses `response.choices[0].message.content` or `response.content[0].text` without checking for empty choices, null content, or error responses -- API can return empty or error responses that cause IndexError or AttributeError
- [ ] **Usage not tracked**: flag API calls where the response's `usage` field (prompt_tokens, completion_tokens, total_tokens) is not logged or tracked -- without usage data, cost attribution and budget monitoring are impossible

### Client Configuration
<!-- activation: keywords=["client", "Client", "OpenAI(", "Anthropic(", "timeout", "base_url", "default_headers"] -->

- [ ] **No timeout on client**: flag SDK client instantiation without explicit `timeout` parameter -- default timeouts may be too long (10 minutes) for synchronous request paths (see `reliability-timeout-deadline-propagation`)
- [ ] **Default base_url in production**: flag production code using the SDK's default base URL without ability to override via configuration -- enterprises often route through proxies or gateways

## Common False Positives

- **SDK built-in retry**: some SDKs (e.g., OpenAI Python SDK v1+) include built-in retry with backoff. Verify the SDK version's default retry behavior before flagging.
- **Environment variable API keys**: loading API keys from environment variables via `os.environ["OPENAI_API_KEY"]` is the standard secure pattern. Do not flag unless the env var has a hardcoded default.
- **Test fixtures with mock keys**: test files using fake API keys ("sk-test-...") are acceptable if clearly fake and in test directories.

## Severity Guidance

| Finding | Severity |
|---|---|
| API key hardcoded in source code | Critical |
| API key committed to version control | Critical |
| No retry on rate limit for user-facing API | Important |
| max_tokens not set on completion call | Important |
| Streaming response consumed without error handling | Important |
| No token usage tracking | Minor |
| Model name hardcoded as string literal | Minor |
| No explicit timeout on SDK client | Minor |

## See Also

- `ai-llm-cost-token-spend-monitoring` -- token usage tracking and budget controls
- `ai-llm-streaming-latency` -- streaming-specific performance concerns
- `ai-llm-frameworks-langchain-llamaindex-haystack-dspy` -- frameworks wrap these SDKs
- `reliability-timeout-deadline-propagation` -- SDK client timeouts
- `sec-owasp-a03-injection` -- API keys are secrets that must not leak

## Authoritative References

- [Anthropic SDK Documentation](https://docs.anthropic.com/en/api/client-sdks)
- [OpenAI SDK Documentation](https://platform.openai.com/docs/api-reference)
- [Cohere SDK Documentation](https://docs.cohere.com/reference/about)
- [OpenAI, "Rate Limits and Best Practices"](https://platform.openai.com/docs/guides/rate-limits)
