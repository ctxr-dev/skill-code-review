---
id: ai-llm-output-validation-structured
type: primary
depth_role: leaf
focus: "Detect LLM output parsed without schema validation, JSON mode not used when available, missing retry on malformed output, lack of Pydantic/Zod validation, and raw LLM text rendered as HTML"
parents:
  - index.md
covers:
  - LLM output parsed as JSON without schema validation
  - JSON mode not requested when the API supports it
  - Missing retry or fallback on malformed LLM output
  - "Structured output consumed without Pydantic/Zod/TypeBox validation"
  - "Raw LLM text rendered as HTML without escaping (XSS)"
  - LLM output used in SQL, shell, or template without sanitization
  - No type coercion or default handling for missing fields in LLM response
  - Regex-based parsing of LLM output instead of structured output mode
tags:
  - LLM-output
  - validation
  - structured-output
  - JSON-mode
  - XSS
  - Pydantic
  - Zod
  - parsing
activation:
  file_globs:
    - "**/*llm*"
    - "**/*chat*"
    - "**/*completion*"
    - "**/*agent*"
    - "**/*chain*"
    - "**/*parse*"
  keyword_matches:
    - json.loads
    - JSON.parse
    - response_format
    - json_object
    - structured
    - parse
    - Pydantic
    - BaseModel
    - Zod
    - z.object
    - schema
    - validate
    - innerHTML
    - dangerouslySetInnerHTML
  structural_signals:
    - llm_output_parsed_without_validation
    - json_parse_without_try_catch
    - llm_text_in_html
source:
  origin: file
  path: ai-llm-output-validation-structured.md
  hash: "sha256:517869579e879b932c425bd60b9916d9b1e410ba4113a5d1f8883a8cc5a490e3"
---
# LLM Output Validation and Structured Output

## When This Activates

Activates when diffs parse LLM responses as structured data, render LLM text in UIs, or pass LLM output to downstream systems. LLM output is fundamentally untrusted -- the model can produce malformed JSON, unexpected fields, hallucinated values, or content that exploits downstream interpreters. Every LLM output must be validated with the same rigor as user input from an HTTP request.

## Audit Surface

- [ ] json.loads() or JSON.parse() on LLM response without try/catch
- [ ] Parsed LLM JSON accessed without schema validation
- [ ] Chat completion call without response_format when output is parsed as JSON
- [ ] No retry logic when LLM returns malformed or unparseable output
- [ ] LLM response text inserted into HTML via innerHTML or dangerouslySetInnerHTML
- [ ] LLM output passed to SQL query, shell command, or template engine
- [ ] Regex used to extract structured data from LLM free-text response
- [ ] Missing default values for absent fields in LLM response
- [ ] LLM response assumed to always contain expected keys
- [ ] Streaming response chunks parsed without handling partial JSON

## Detailed Checks

### Schema Validation of LLM Output
<!-- activation: keywords=["json.loads", "JSON.parse", "parse", "schema", "validate", "Pydantic", "BaseModel", "Zod", "z.object", "TypeBox", "ajv", "joi"] -->

- [ ] **JSON parsed without schema validation**: flag `json.loads(response)` or `JSON.parse(response)` on LLM output followed by direct field access without Pydantic, Zod, ajv, joi, or equivalent schema validation -- the model may omit fields, add unexpected fields, or use wrong types
- [ ] **No try/catch on parse**: flag JSON or XML parsing of LLM output without error handling -- even with JSON mode, edge cases (empty response, rate limit error body) can produce unparseable strings
- [ ] **No retry on malformed output**: flag LLM calls that parse the output and raise on failure with no retry mechanism -- a single malformed response should trigger a retry (with the same or a more constrained prompt) before failing the request

### API Structured Output Features
<!-- activation: keywords=["response_format", "json_object", "json_schema", "structured_output", "tool_choice", "function_calling"] -->

- [ ] **JSON mode not used**: flag LLM calls that parse the response as JSON but do not set `response_format: { type: "json_object" }` or equivalent when the API supports it -- JSON mode guarantees syntactically valid JSON output
- [ ] **Structured output schema not provided**: flag calls using structured output mode without providing a JSON schema when the API supports schema-constrained output -- schema-constrained mode enforces field names, types, and required fields at generation time
- [ ] **Function-calling result not validated**: flag tool/function-calling responses where the arguments object is used without schema validation -- the model may produce arguments that do not match the declared function schema

### Output as Injection Vector
<!-- activation: keywords=["innerHTML", "dangerouslySetInnerHTML", "v-html", "raw", "safe", "sql", "query", "exec", "shell", "template", "render"] -->

- [ ] **LLM text rendered as HTML (XSS)**: flag LLM response text inserted into DOM via `innerHTML`, `dangerouslySetInnerHTML`, `v-html`, or template `| safe` filter -- the model can produce `<script>` tags or event handlers, especially if its input was adversarial (see `sec-owasp-a03-injection`)
- [ ] **LLM output in SQL or shell**: flag LLM-generated text passed to SQL queries, shell commands, or template engines without parameterization or escaping -- LLM output is untrusted data and must be treated identically to user input
- [ ] **LLM output as code executed directly**: flag patterns where LLM-generated code is passed to `eval()`, `exec()`, or a subprocess without sandboxing -- this is remote code execution via the model

### Streaming and Partial Response Handling
<!-- activation: keywords=["stream", "streaming", "chunk", "delta", "partial", "SSE", "EventSource", "onToken"] -->

- [ ] **Streaming chunks parsed incrementally without buffering**: flag code that attempts to JSON-parse each streaming chunk individually rather than accumulating the full response before parsing -- partial JSON is not valid JSON
- [ ] **No error handling on stream interruption**: flag streaming consumption with no handling of mid-stream disconnection -- a partial response may be silently treated as complete

### Type Safety and Defensive Access
<!-- activation: keywords=["type", "TypedDict", "dataclass", "interface", "get(", "optional", "default", "KeyError", "TypeError"] -->

- [ ] **No type-safe access to LLM fields**: flag code accessing LLM response fields via string keys (`response["answer"]`) without type-safe wrappers (TypedDict, dataclass, Pydantic model) -- typos in key names are caught at runtime, not at lint time
- [ ] **Missing default values**: flag LLM response field access without `.get()` or default handling -- optional fields the model sometimes omits cause KeyError in production
- [ ] **No type coercion**: flag numeric or boolean fields from LLM responses used without type coercion -- the model may return `"true"` (string) instead of `true` (boolean) or `"42"` instead of `42`

## Common False Positives

- **Free-text responses not parsed programmatically**: if the LLM output is displayed as-is in a chat UI with proper HTML escaping, schema validation is not needed. Flag only when the output is parsed, rendered as HTML, or fed to downstream systems.
- **Internal developer tools**: CLI tools or notebooks that display raw LLM output for developer inspection do not need structured output validation. Flag only production code paths.
- **Framework-handled validation**: LangChain output parsers, Instructor, and similar libraries perform validation internally. Verify the framework is actually validating before skipping the flag.

## Severity Guidance

| Finding | Severity |
|---|---|
| LLM output rendered as HTML without escaping (XSS) | Critical |
| LLM output passed to SQL, shell, or eval without sanitization | Critical |
| JSON parsed from LLM without schema validation in production path | Important |
| JSON mode not used when API supports it and output is parsed | Important |
| No retry on malformed LLM output | Minor |
| Streaming response parsed without buffering complete response | Minor |

## See Also

- `sec-owasp-a03-injection` -- LLM output is an injection vector when passed to interpreters
- `ai-llm-prompt-engineering-quality` -- output format specification reduces parsing failures
- `ai-llm-prompt-injection-defense` -- adversarial input can craft malicious LLM output
- `principle-fail-fast` -- validate LLM output immediately rather than propagating invalid data downstream
- `sec-deserialization` -- LLM-generated serialized data must be validated before deserialization

## Authoritative References

- [OpenAI, "Structured Outputs"](https://platform.openai.com/docs/guides/structured-outputs)
- [Anthropic, "Tool Use and Structured Output"](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)
- [OWASP Top 10 for LLM Applications -- LLM02: Insecure Output Handling](https://genai.owasp.org/)
- [Pydantic Documentation -- Data Validation](https://docs.pydantic.dev/)
- [Zod Documentation -- Schema Validation](https://zod.dev/)
