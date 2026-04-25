---
id: ai-llm-tool-use-safety
type: primary
depth_role: leaf
focus: Detect tools executing arbitrary code from LLM output, tools without authorization checks, unvalidated tool output returned to the LLM, missing tool timeouts, and non-idempotent tool side effects
parents:
  - index.md
  - "../tool-prompt/index.md"
covers:
  - Tool executing arbitrary code or commands from LLM-generated arguments
  - Tool invocation without checking user authorization
  - Tool output not validated or sanitized before returning to the LLM
  - Missing timeout on tool execution
  - "Tool with side effects (write, delete, pay) not idempotent"
  - "No tool result size limit (large output consuming context window)"
  - "Tool error not handled gracefully (raw stack trace returned to LLM)"
  - No logging or audit trail for tool invocations
tags:
  - tool-use
  - function-calling
  - LLM-safety
  - authorization
  - idempotency
  - sandbox
  - agent
activation:
  file_globs:
    - "**/*tool*"
    - "**/*function*"
    - "**/*agent*"
    - "**/*action*"
    - "**/*plugin*"
    - "**/*mcp*"
  keyword_matches:
    - tool
    - function_call
    - tool_call
    - tool_use
    - execute
    - invoke
    - dispatch
    - action
    - plugin
    - handler
    - tool_choice
    - tools=
    - functions=
  structural_signals:
    - tool_executes_code
    - tool_without_auth
    - tool_output_unvalidated
source:
  origin: file
  path: ai-llm-tool-use-safety.md
  hash: "sha256:9dba56fb681d75c7198158d4e49d9f0744b6e51c4db041463c52d618cbe7e4ca"
---
# Tool-Use Safety

## When This Activates

Activates when diffs contain tool/function definitions for LLM agents, tool dispatch logic, tool result handling, or MCP server tool implementations. Tools extend LLM capabilities into the real world -- file systems, databases, APIs, payment systems. Every tool is an attack surface: the LLM decides what to call and with what arguments, so tool implementations must enforce authorization, validate arguments, limit execution time, and sanitize output.

## Audit Surface

- [ ] Tool handler executing shell commands, SQL, or eval() with LLM-provided arguments
- [ ] Tool dispatch without authorization check against current user's permissions
- [ ] Tool output passed back to LLM without size limit or sanitization
- [ ] Tool execution with no timeout or cancellation mechanism
- [ ] Tool with side effects not protected by idempotency key
- [ ] Tool error returning raw exception details to the LLM
- [ ] No audit log for tool calls
- [ ] Tool with overly broad description inviting misuse
- [ ] Tool allowing file system access outside sandbox
- [ ] Tool chain output passed to next tool without validation

## Detailed Checks

### Code Execution and Command Injection
<!-- activation: keywords=["exec", "eval", "subprocess", "shell", "command", "sql", "query", "code", "run", "execute"] -->

- [ ] **Tool executes arbitrary code**: flag tool implementations that pass LLM-generated arguments to `eval()`, `exec()`, `subprocess`, or shell commands without sandboxing -- the LLM can be manipulated to produce malicious arguments (see `sec-owasp-a03-injection`)
- [ ] **Tool executes raw SQL**: flag tools that build SQL queries from LLM-provided arguments via string concatenation -- use parameterized queries even when the caller is an LLM
- [ ] **No argument validation**: flag tool handlers that accept LLM-provided arguments without type checking, range validation, or allowlist enforcement -- validate tool arguments with the same rigor as HTTP request parameters
- [ ] **File access outside sandbox**: flag tools that accept file paths from the LLM without restricting to a designated directory -- path traversal (`../../etc/passwd`) applies to LLM-provided paths too

### Authorization and Access Control
<!-- activation: keywords=["auth", "permission", "role", "user", "allow", "deny", "scope", "capability", "authorize"] -->

- [ ] **No per-user tool authorization**: flag tool dispatch that does not check whether the current user is authorized to invoke the requested tool -- the LLM should not be able to escalate privileges by calling tools the user cannot access directly
- [ ] **Destructive tool without confirmation**: flag tools that perform write, delete, or financial operations without requiring explicit user confirmation before execution -- the LLM may hallucinate intent or be manipulated via injection
- [ ] **No tool allowlist per session**: flag agent configurations where all registered tools are available regardless of context -- restrict tools to the minimum set needed for the current task

### Tool Output Handling
<!-- activation: keywords=["result", "output", "response", "return", "content", "size", "truncate", "sanitize"] -->

- [ ] **Unbounded tool output**: flag tool results returned to the LLM without size limits -- a tool returning a 100KB database dump consumes the context window and degrades subsequent reasoning
- [ ] **Raw error in tool output**: flag tool handlers that return raw exception messages or stack traces to the LLM -- internal error details may leak sensitive information and confuse the model
- [ ] **Tool output not sanitized**: flag tool results containing HTML, JavaScript, or control characters returned to the LLM without sanitization -- if the LLM forwards this content to a user-facing output, it becomes an XSS vector

### Timeout and Idempotency
<!-- activation: keywords=["timeout", "deadline", "cancel", "idempotent", "retry", "side_effect", "write", "delete", "payment"] -->

- [ ] **No tool timeout**: flag tool execution with no timeout or cancellation mechanism -- a hung tool blocks the agent loop indefinitely (see `reliability-timeout-deadline-propagation`)
- [ ] **Non-idempotent side effects**: flag tools that perform writes, deletes, or payments without idempotency keys -- if the agent retries a tool call (common on timeout or parse failure), the side effect executes twice
- [ ] **No audit trail**: flag tool invocations with no logging of the tool name, arguments, caller identity, timestamp, and result -- audit trails are essential for debugging agent behavior and detecting misuse

## Common False Positives

- **Read-only tools**: tools that only read data (search, lookup, fetch) have lower risk than write tools. Still flag missing authorization and timeouts but at reduced severity.
- **Developer-only agents**: agent tools used only by developers in local environments do not need the same authorization rigor as user-facing agents. Note the context.
- **Sandboxed code execution**: tools using proper sandboxing (Docker containers, gVisor, Firecracker) for code execution are mitigated. Verify the sandbox before dismissing.

## Severity Guidance

| Finding | Severity |
|---|---|
| Tool executes arbitrary code/shell/eval with LLM arguments | Critical |
| Tool performs destructive action without user confirmation | Critical |
| Tool dispatch without user authorization check | Critical |
| Tool SQL query built from LLM arguments via concatenation | Critical |
| No timeout on tool execution | Important |
| Unbounded tool output consuming context window | Important |
| Non-idempotent side effect without idempotency key | Important |
| No audit logging for tool invocations | Minor |
| Raw error details returned to LLM in tool output | Minor |

## See Also

- `sec-owasp-a03-injection` -- tool arguments are an injection vector
- `ai-llm-prompt-injection-defense` -- injection can manipulate tool selection and arguments
- `ai-llm-agent-design` -- agent loops orchestrate tool calls
- `ai-llm-mcp-server-discipline` -- MCP server tools need the same safety controls
- `reliability-timeout-deadline-propagation` -- tool timeouts must respect the overall deadline

## Authoritative References

- [Anthropic, "Tool Use"](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)
- [OpenAI, "Function Calling"](https://platform.openai.com/docs/guides/function-calling)
- [OWASP Top 10 for LLM Applications -- LLM06: Excessive Agency](https://genai.owasp.org/)
- [Simon Willison, "Prompt Injection and Tool Use"](https://simonwillison.net/2023/May/2/prompt-injection-explained/)
