---
id: ai-llm-frameworks-langchain-llamaindex-haystack-dspy
type: primary
depth_role: leaf
focus: "Detect framework abstraction hiding errors, deprecated API usage, unhandled chain/pipeline errors, unbounded conversation memory, and callback handlers with side effects"
parents:
  - index.md
covers:
  - Framework abstraction hiding LLM errors or swallowing exceptions
  - Deprecated API usage in LangChain, LlamaIndex, Haystack, or DSPy
  - Chain or pipeline step without error handling
  - "Conversation memory growing without bound (no summarization or truncation)"
  - "Callback handlers with side effects (I/O, state mutation) in hot path"
  - Framework defaults used without explicit configuration
  - Mixing framework versions with incompatible APIs
tags:
  - LangChain
  - LlamaIndex
  - Haystack
  - DSPy
  - framework
  - chain
  - pipeline
  - memory
  - callback
  - deprecation
activation:
  file_globs:
    - "**/*chain*"
    - "**/*agent*"
    - "**/*pipeline*"
    - "**/*llm*"
    - "**/*rag*"
    - "**/*index*"
  keyword_matches:
    - langchain
    - LangChain
    - llamaindex
    - LlamaIndex
    - haystack
    - Haystack
    - dspy
    - DSPy
    - chain
    - pipeline
    - memory
    - ConversationBufferMemory
    - ChatMessageHistory
    - callback
    - BaseCallbackHandler
    - invoke
    - query_engine
  structural_signals:
    - chain_without_error_handling
    - deprecated_import
    - unbounded_memory
source:
  origin: file
  path: ai-llm-frameworks-langchain-llamaindex-haystack-dspy.md
  hash: "sha256:5f9b09ee2fee12724040f76654a914c2f6b52b3d645c4db8f107a8554352e0ab"
---
# LLM Framework Discipline (LangChain, LlamaIndex, Haystack, DSPy)

## When This Activates

Activates when diffs import or use LangChain, LlamaIndex, Haystack, DSPy, or similar LLM orchestration frameworks. These frameworks accelerate development but introduce risks: deep abstraction stacks hide errors, deprecated APIs break silently on upgrade, and unbounded conversation memory causes context window overflow. This reviewer ensures framework usage follows best practices rather than copy-pasted tutorial code.

## Audit Surface

- [ ] Chain or pipeline call without try/except or error handling
- [ ] Deprecated framework imports or API calls
- [ ] Conversation memory with no token limit or summarization
- [ ] Callback handler with side effects in hot path
- [ ] Pipeline step silently returning None on failure
- [ ] Framework version mismatch between packages
- [ ] DSPy module without assertions
- [ ] Haystack pipeline without output validation
- [ ] No explicit model configuration (relying on defaults)
- [ ] Framework-specific retry/fallback not configured

## Detailed Checks

### Error Handling in Chains and Pipelines
<!-- activation: keywords=["invoke", "run", "call", "query", "chain", "pipeline", "execute", "arun", "ainvoke", "acall"] -->

- [ ] **Chain call without error handling**: flag `chain.invoke()`, `chain.run()`, `agent.run()`, or `query_engine.query()` without try/except -- LLM API errors (rate limits, timeouts, invalid responses), parsing failures, and tool errors all propagate as exceptions
- [ ] **Silent failure in pipeline step**: flag pipeline components that return `None`, empty strings, or default values on failure without logging or raising -- silent failures propagate corrupted state through the pipeline
- [ ] **No fallback chain**: flag production chains with no fallback model or degraded response path when the primary LLM fails -- use `chain.with_fallbacks([fallback_chain])` in LangChain or equivalent

### Deprecated API Usage
<!-- activation: keywords=["from langchain import", "from langchain.", "LLMChain", "ConversationChain", "SequentialChain", "initialize_agent", "load_tools", "langchain.llms"] -->

- [ ] **Deprecated LangChain imports**: flag imports from `langchain` top-level package instead of `langchain_core`, `langchain_community`, or provider-specific packages (e.g., `langchain_openai`) -- the LangChain ecosystem restructured in v0.2; old imports are deprecated and will be removed
- [ ] **Deprecated chain classes**: flag use of `LLMChain`, `ConversationChain`, `SequentialChain`, or `initialize_agent` -- these are replaced by LCEL (LangChain Expression Language) and the new agent APIs
- [ ] **Framework version pinning**: flag requirements files with unpinned LLM framework versions (`langchain>=0.1`) -- these frameworks have frequent breaking changes; pin to specific versions

### Conversation Memory Management
<!-- activation: keywords=["memory", "ConversationBufferMemory", "ConversationSummaryMemory", "ChatMessageHistory", "history", "messages", "context_window", "max_token_limit", "buffer"] -->

- [ ] **Unbounded conversation memory**: flag `ConversationBufferMemory` or equivalent that stores all messages without a `max_token_limit`, sliding window, or summarization step -- conversation history grows until it exceeds the context window, causing truncation or API errors
- [ ] **No memory persistence**: flag conversation memory stored only in-process memory (Python dict, in-memory list) for user-facing applications -- memory is lost on restart; use Redis, a database, or a file-backed store
- [ ] **Token counting not aligned with model**: flag memory truncation using character count instead of the model's tokenizer -- character-based truncation is inaccurate and may still overflow the context window

### Callback Handlers and Observability
<!-- activation: keywords=["callback", "BaseCallbackHandler", "CallbackHandler", "on_llm_start", "on_tool_start", "on_chain_start", "tracer", "tracing"] -->

- [ ] **Callback with side effects in hot path**: flag callback handlers (on_llm_start, on_tool_end, on_chain_error) that perform synchronous I/O (database writes, HTTP calls, file writes) -- these block the chain execution and add latency to every LLM call
- [ ] **No observability**: flag LLM chains or agents with no tracing, logging, or callback handlers -- without observability, debugging multi-step agent failures is impossible
- [ ] **Callback error not handled**: flag callback handlers that can raise exceptions without try/except -- an error in a callback should not crash the chain

### DSPy and Haystack Specifics
<!-- activation: keywords=["dspy", "DSPy", "Signature", "Module", "ChainOfThought", "Predict", "Assert", "Suggest", "haystack", "Pipeline", "Component", "run"] -->

- [ ] **DSPy module without assertions**: flag DSPy modules (`dspy.Module`) that do not use `dspy.Assert` or `dspy.Suggest` to validate outputs -- assertions enable DSPy's self-refinement; without them, the optimizer has no signal to improve on
- [ ] **Haystack pipeline output not validated**: flag Haystack `Pipeline.run()` calls where the output dictionary is accessed without checking for expected component outputs -- missing components produce `None` values that propagate silently
- [ ] **Framework mixing without justification**: flag code that imports multiple LLM frameworks (LangChain + LlamaIndex, DSPy + LangChain) for overlapping functionality -- each framework adds dependencies, abstraction overhead, and maintenance burden; choose one for each concern

## Common False Positives

- **Tutorial and example code**: copy-pasted tutorial code using deprecated APIs is expected in prototypes. Flag with reduced severity for non-production paths.
- **Single-turn applications**: applications with no conversation history do not need memory management. Do not flag missing memory for one-shot query-response patterns.
- **Async callbacks**: callback handlers using async I/O (aiohttp, async database drivers) do not block the chain. Verify the handler is truly async before flagging.

## Severity Guidance

| Finding | Severity |
|---|---|
| Chain/pipeline call with no error handling in production path | Important |
| Unbounded conversation memory with no token limit | Important |
| Deprecated LangChain imports (pre-v0.2 structure) | Minor |
| Callback handler with synchronous I/O in hot path | Minor |
| No observability on multi-step agent | Minor |
| Framework version unpinned in requirements | Minor |

## See Also

- `ai-llm-agent-design` -- agent loop controls built on top of framework agent executors
- `ai-llm-sdk-anthropic-openai-cohere` -- SDK-level concerns beneath the framework layer
- `ai-llm-cost-token-spend-monitoring` -- frameworks often hide token usage details
- `perf-memory-gc` -- unbounded conversation memory is a memory leak pattern
- `principle-separation-of-concerns` -- framework abstractions should not hide error handling responsibility

## Authoritative References

- [LangChain Documentation -- Migration Guide](https://python.langchain.com/docs/versions/migrating_chains/)
- [LlamaIndex Documentation](https://docs.llamaindex.ai/en/stable/)
- [Haystack Documentation](https://docs.haystack.deepset.ai/docs/intro)
- [DSPy Documentation](https://dspy.ai/)
