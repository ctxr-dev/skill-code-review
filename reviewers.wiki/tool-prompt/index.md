---
id: tool-prompt
type: index
depth_role: subcategory
depth: 1
focus: "API error responses not following RFC 7807 Problem Details structure; Callback handlers with side effects (I/O, state mutation) in hot path; Chain or pipeline step without error handling; Complex task prompt missing few-shot examples"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: ai-llm-eval-harness
    file: ai-llm-eval-harness.md
    type: primary
    focus: Detect missing evaluation before deployment, unversioned eval datasets, uncalibrated LLM-as-judge, untracked metrics over time, and evaluation not integrated into CI
    tags:
      - evaluation
      - eval
      - benchmark
      - LLM-as-judge
      - CI
      - regression
      - metrics
      - dataset
  - id: ai-llm-frameworks-langchain-llamaindex-haystack-dspy
    file: ai-llm-frameworks-langchain-llamaindex-haystack-dspy.md
    type: primary
    focus: "Detect framework abstraction hiding errors, deprecated API usage, unhandled chain/pipeline errors, unbounded conversation memory, and callback handlers with side effects"
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
  - id: ai-llm-hallucination-handling
    file: ai-llm-hallucination-handling.md
    type: primary
    focus: Detect missing grounding or citation mechanisms, output not cross-checked against source, absent user warnings about potential inaccuracy, missing confidence scores, and hallucinated URLs or references
    tags:
      - hallucination
      - grounding
      - citation
      - confidence
      - factual-accuracy
      - disclaimer
      - RAG
  - id: ai-llm-mcp-server-discipline
    file: ai-llm-mcp-server-discipline.md
    type: primary
    focus: Detect MCP tools without input schema validation, missing tool descriptions, overly broad tool capabilities, missing error responses, transport security issues, and absent rate limiting on tool calls
    tags:
      - MCP
      - model-context-protocol
      - tool-server
      - schema-validation
      - transport-security
      - rate-limiting
  - id: ai-llm-prompt-injection-defense
    file: ai-llm-prompt-injection-defense.md
    type: primary
    focus: "Detect user input concatenated into prompts without sanitization, missing input/output guardrails, extractable system prompts, tool-use without authorization, and indirect injection via retrieved documents"
    tags:
      - prompt-injection
      - LLM-security
      - guardrails
      - tool-use
      - RAG-injection
      - OWASP-LLM
      - prompt-engineering
      - LLM
      - system-prompt
      - few-shot
      - prompt-template
      - output-format
  - id: ai-llm-tool-use-safety
    type: primary
    focus: Detect tools executing arbitrary code from LLM output, tools without authorization checks, unvalidated tool output returned to the LLM, missing tool timeouts, and non-idempotent tool side effects
    tags:
      - tool-use
      - function-calling
      - LLM-safety
      - authorization
      - idempotency
      - sandbox
      - agent
    file: "../llm-output/ai-llm-tool-use-safety.md"
  - id: api-problem-json-rfc7807
    file: api-problem-json-rfc7807.md
    type: primary
    focus: Detect inconsistent API error formats, missing RFC 7807 Problem Details fields, internal detail leakage, and non-standard error response shapes
    tags:
      - error
      - error-handling
      - rfc7807
      - rfc9457
      - problem-details
      - problem-json
      - api
      - rest
      - status-code
      - security
  - id: api-rest
    file: api-rest.md
    type: primary
    focus: Detect REST convention violations including wrong HTTP methods, missing status codes, non-resource URLs, missing pagination, and inconsistent naming
    tags:
      - rest
      - api
      - http
      - http-methods
      - status-codes
      - pagination
      - naming
      - resource-design
      - idempotency
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Tool Prompt

**Focus:** API error responses not following RFC 7807 Problem Details structure; Callback handlers with side effects (I/O, state mutation) in hot path; Chain or pipeline step without error handling; Complex task prompt missing few-shot examples

## Children

| File | Type | Focus |
|------|------|-------|
| [ai-llm-eval-harness.md](ai-llm-eval-harness.md) | 📄 primary | Detect missing evaluation before deployment, unversioned eval datasets, uncalibrated LLM-as-judge, untracked metrics over time, and evaluation not integrated into CI |
| [ai-llm-frameworks-langchain-llamaindex-haystack-dspy.md](ai-llm-frameworks-langchain-llamaindex-haystack-dspy.md) | 📄 primary | Detect framework abstraction hiding errors, deprecated API usage, unhandled chain/pipeline errors, unbounded conversation memory, and callback handlers with side effects |
| [ai-llm-hallucination-handling.md](ai-llm-hallucination-handling.md) | 📄 primary | Detect missing grounding or citation mechanisms, output not cross-checked against source, absent user warnings about potential inaccuracy, missing confidence scores, and hallucinated URLs or references |
| [ai-llm-mcp-server-discipline.md](ai-llm-mcp-server-discipline.md) | 📄 primary | Detect MCP tools without input schema validation, missing tool descriptions, overly broad tool capabilities, missing error responses, transport security issues, and absent rate limiting on tool calls |
| [ai-llm-prompt-injection-defense.md](ai-llm-prompt-injection-defense.md) | 📄 primary | Detect user input concatenated into prompts without sanitization, missing input/output guardrails, extractable system prompts, tool-use without authorization, and indirect injection via retrieved documents |
| [api-problem-json-rfc7807.md](api-problem-json-rfc7807.md) | 📄 primary | Detect inconsistent API error formats, missing RFC 7807 Problem Details fields, internal detail leakage, and non-standard error response shapes |
| [api-rest.md](api-rest.md) | 📄 primary | Detect REST convention violations including wrong HTTP methods, missing status codes, non-resource URLs, missing pagination, and inconsistent naming |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
