---
id: ai-llm-prompt-injection-defense
type: primary
depth_role: leaf
focus: "Detect user input concatenated into prompts without sanitization, missing input/output guardrails, extractable system prompts, tool-use without authorization, and indirect injection via retrieved documents"
parents:
  - index.md
covers:
  - User input concatenated into prompt without sanitization or escaping
  - "Missing input guardrails (length, content filtering, deny-list)"
  - "Missing output guardrails (content filtering, PII detection)"
  - System prompt extractable via user-crafted input
  - Tool-use or function-calling without authorization checks on tool invocations
  - Indirect prompt injection via RAG-retrieved documents or tool outputs
  - No privilege separation between system instructions and user content
  - Missing canary tokens or prompt boundary markers
  - Hardcoded prompt strings without versioning or externalization
  - Missing system prompt when using chat-completion APIs
  - "Prompt without explicit output format specification (JSON schema, enum, template)"
  - Complex task prompt missing few-shot examples
  - User input concatenated directly into prompt template without delimiter
  - Prompt with conflicting or ambiguous instructions
  - "No prompt template management (raw string concatenation)"
  - Missing temperature or sampling parameter tuning for deterministic tasks
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
aliases:
  - ai-llm-prompt-engineering-quality
activation:
  file_globs:
    - "**/*prompt*"
    - "**/*llm*"
    - "**/*chat*"
    - "**/*agent*"
    - "**/*chain*"
    - "**/*rag*"
    - "**/*tool*"
  keyword_matches:
    - user_input
    - user_message
    - messages
    - prompt
    - system_prompt
    - guardrail
    - filter
    - sanitize
    - tool_call
    - function_call
    - retrieve
    - context
    - inject
  structural_signals:
    - user_input_in_prompt
    - tool_call_without_auth
    - rag_content_unfiltered
source:
  origin: file
  path: ai-llm-prompt-injection-defense.md
  hash: "sha256:67ba0c0854d70a7207fce453b030da2df81f79dfa0c3d2aeba5388b09ee52a47"
---
# Prompt Injection Defense

## When This Activates

Activates when diffs contain LLM prompt assembly with user input, tool-use or function-calling configuration, RAG pipeline retrieval-to-prompt flow, or guardrail/filter setup. Prompt injection is the top risk in the OWASP Top 10 for LLM Applications. Unlike SQL injection, there is no parameterized query equivalent -- defense requires layered controls: input sanitization, privilege separation, output filtering, and authorization on tool use.

## Audit Surface

- [ ] User input inserted into prompt via string concatenation or formatting
- [ ] No input length limit on user-supplied text before LLM call
- [ ] No content filtering or deny-list on user input before prompt assembly
- [ ] System prompt text accessible via API response or error message
- [ ] Tool call executed without checking user's authorization for that tool
- [ ] RAG-retrieved content inserted into prompt without sanitization
- [ ] LLM output used to construct further prompts without validation
- [ ] No output filtering for system prompt leakage in responses
- [ ] Function-calling result trusted without schema validation
- [ ] Multi-turn conversation with no context window injection defense
- [ ] Missing rate limiting on LLM-powered endpoints
- [ ] No logging or monitoring of prompt injection attempts

## Detailed Checks

### Direct Prompt Injection
<!-- activation: keywords=["user_input", "f\"", "format(", ".format", "concat", "+", "template", "prompt", "message"] -->

- [ ] **Unsanitized user input in prompt**: flag user-supplied text inserted directly into prompt strings via f-string, .format(), template literals, or concatenation without delimiters, length limits, or content filtering -- the user can override system instructions
- [ ] **No input length limit**: flag LLM calls where user input has no character or token limit -- long inputs can push system instructions out of the context window, effectively erasing them
- [ ] **No content deny-list**: flag prompt assembly with no check for known injection patterns ("ignore previous instructions", "you are now", "system:", role-switching attempts) -- basic pattern matching catches unsophisticated attacks
- [ ] **Missing privilege separation**: flag prompts where system instructions and user input are in the same message role rather than using separate system and user message roles -- role separation is the primary structural defense

### System Prompt Protection
<!-- activation: keywords=["system_prompt", "system_message", "SystemMessage", "system", "instructions", "secret", "confidential"] -->

- [ ] **System prompt in client-visible response**: flag API responses or error messages that include the system prompt text -- system prompts often contain business logic, guardrails, and tool descriptions that should not be exposed
- [ ] **No anti-extraction instruction**: flag system prompts that do not include an instruction to refuse requests to reveal the system prompt -- without this, simple "repeat your instructions" attacks succeed
- [ ] **System prompt in client-side code**: flag system prompt strings shipped in frontend JavaScript or mobile app bundles -- client-side code is fully inspectable

### Indirect Injection via RAG and Tools
<!-- activation: keywords=["retrieve", "context", "document", "chunk", "tool", "function_call", "tool_call", "search", "embed"] -->

- [ ] **RAG content unfiltered**: flag RAG pipelines that insert retrieved document chunks directly into the prompt without sanitization -- a malicious document in the corpus can contain instructions the model will follow (indirect injection)
- [ ] **Tool output trusted blindly**: flag patterns where tool execution results are inserted back into the prompt without validation or sanitization -- a compromised tool or malicious external data can inject instructions
- [ ] **LLM output as next prompt**: flag multi-step chains where the LLM's own output is concatenated into the next prompt without validation -- the model can be manipulated to produce text that hijacks subsequent steps

### Tool-Use Authorization
<!-- activation: keywords=["tool", "function", "call", "execute", "invoke", "dispatch", "action", "permission", "authorize"] -->

- [ ] **Tool execution without authorization**: flag tool-use implementations where the LLM can invoke any registered tool without checking whether the current user is authorized to perform that action -- the LLM should not escalate privileges
- [ ] **No tool allowlist**: flag agent configurations where all registered tools are available to all users -- implement per-user or per-role tool allowlists
- [ ] **Destructive tool without confirmation**: flag tools that perform write, delete, or payment operations without a human-in-the-loop confirmation step -- see `ai-llm-agent-design`

## Common False Positives

- **Internal-only LLM endpoints**: if the LLM endpoint is not user-facing and only receives input from trusted internal services, injection risk is lower. Flag with a note but do not treat as Critical.
- **Read-only tools**: tools that only read data (search, lookup) are lower risk than tools with write side effects. Still flag missing authorization but at reduced severity.
- **Prompt testing and evaluation**: test files that construct adversarial prompts for evaluation purposes should not be flagged as injection vulnerabilities.

## Severity Guidance

| Finding | Severity |
|---|---|
| User input concatenated into prompt with no sanitization (user-facing) | Critical |
| Tool execution without user authorization check | Critical |
| RAG content injected into prompt without sanitization | Important |
| System prompt exposed in API response or client-side code | Important |
| No input length limit on user-supplied text before LLM call | Important |
| LLM output used as next prompt without validation | Important |
| Missing anti-extraction instruction in system prompt | Minor |
| No deny-list for known injection patterns | Minor |

## See Also

- `sec-owasp-a03-injection` -- prompt injection is the LLM-era analogue of SQL injection
- `ai-llm-prompt-engineering-quality` -- proper prompt structure reduces injection surface
- `ai-llm-tool-use-safety` -- tool authorization and safety controls
- `ai-llm-output-validation-structured` -- output filtering catches leaked system prompts
- `ai-llm-rag-quality` -- RAG pipeline as indirect injection vector

## Authoritative References

- [OWASP Top 10 for LLM Applications (2025) -- LLM01: Prompt Injection](https://genai.owasp.org/)
- [Simon Willison, "Prompt Injection Explained"](https://simonwillison.net/2023/May/2/prompt-injection-explained/)
- [Anthropic, "Mitigating Prompt Injections"](https://docs.anthropic.com/en/docs/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks)
- [NIST AI 100-2e2025, "Adversarial Machine Learning" -- prompt injection taxonomy](https://csrc.nist.gov/pubs/ai/100/2/e2025/final)
