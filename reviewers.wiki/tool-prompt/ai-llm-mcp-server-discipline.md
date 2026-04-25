---
id: ai-llm-mcp-server-discipline
type: primary
depth_role: leaf
focus: Detect MCP tools without input schema validation, missing tool descriptions, overly broad tool capabilities, missing error responses, transport security issues, and absent rate limiting on tool calls
parents:
  - index.md
covers:
  - MCP tool without input schema validation
  - Missing or vague tool description misleading the LLM
  - "Overly broad tool capabilities (God tool)"
  - Missing structured error responses
  - Transport layer without authentication or encryption
  - No rate limiting on tool call endpoints
  - Tool returning excessively large results
  - No tool versioning or deprecation strategy
tags:
  - MCP
  - model-context-protocol
  - tool-server
  - schema-validation
  - transport-security
  - rate-limiting
activation:
  file_globs:
    - "**/*mcp*"
    - "**/*server*"
    - "**/*tool*"
    - "**/*plugin*"
  keyword_matches:
    - MCP
    - mcp
    - McpServer
    - Server
    - tool
    - Tool
    - list_tools
    - call_tool
    - handle_call_tool
    - inputSchema
    - input_schema
    - transport
    - stdio
    - sse
    - streamable
  structural_signals:
    - mcp_tool_without_validation
    - missing_tool_description
    - no_rate_limit
source:
  origin: file
  path: ai-llm-mcp-server-discipline.md
  hash: "sha256:9160ceed405a0b752ad3493b2ec37c70b0db665d772ced9812ade00a9d8ded91"
---
# MCP Server Discipline

## When This Activates

Activates when diffs contain MCP (Model Context Protocol) server implementations, tool registrations, transport configuration, or tool handler logic. MCP servers expose capabilities to LLM agents -- every tool is an API endpoint that receives LLM-generated input. The same rigor applied to HTTP APIs (input validation, authentication, rate limiting, error handling) must apply to MCP tools.

## Audit Surface

- [ ] Tool handler accepting input without JSON schema validation
- [ ] Tool registered with empty or generic description
- [ ] Single tool performing multiple unrelated actions
- [ ] Tool handler returning raw error strings
- [ ] MCP server over network without TLS or authentication
- [ ] No rate limit on tool call frequency
- [ ] Tool response exceeding reasonable size
- [ ] Tool schema with no required fields
- [ ] No health check on server startup
- [ ] Tool side effects not documented

## Detailed Checks

### Input Schema and Validation
<!-- activation: keywords=["inputSchema", "input_schema", "schema", "validate", "required", "properties", "type", "params", "arguments"] -->

- [ ] **No input schema defined**: flag MCP tools registered without an `inputSchema` (JSON Schema) -- without a schema, the LLM has no guidance on what arguments to provide, and the handler has no validation basis
- [ ] **Schema with no required fields**: flag input schemas where all fields are optional -- this allows the LLM to call the tool with empty input, which usually produces errors
- [ ] **No runtime validation**: flag tool handlers that trust the input matches the schema without runtime validation -- the schema informs the LLM but does not guarantee conformance; validate with Pydantic, Zod, ajv, or equivalent
- [ ] **Overly permissive types**: flag input schema fields typed as `string` or `any` when a more specific type (enum, integer, URI format) would constrain input -- broad types invite unexpected arguments

### Tool Design
<!-- activation: keywords=["tool", "description", "name", "register", "add_tool", "list_tools", "capability"] -->

- [ ] **Missing or vague description**: flag tools with empty, single-word, or generic descriptions ("Processes data", "Utility function") -- the LLM uses the description to decide when and how to call the tool; poor descriptions lead to misuse
- [ ] **God tool**: flag single tools that accept a "mode" or "action" parameter to perform multiple unrelated operations -- each distinct capability should be a separate tool with its own schema and description
- [ ] **Side effects not documented**: flag tools that perform write, delete, or external API calls without documenting the side effects in the tool description -- the LLM and the user need to know what the tool will do before calling it
- [ ] **No tool versioning**: flag MCP servers with no version or deprecation mechanism for tools -- clients relying on tool schemas need to handle schema changes gracefully

### Error Handling and Response
<!-- activation: keywords=["error", "Error", "isError", "is_error", "exception", "catch", "try", "response", "result", "content"] -->

- [ ] **Raw error returned**: flag tool handlers that return raw exception messages or stack traces instead of structured MCP error responses -- raw errors leak internal details and confuse the LLM
- [ ] **Error not signaled**: flag tool handlers that return normal content when an error occurred instead of setting `isError: true` -- the LLM cannot distinguish success from failure without the error flag
- [ ] **Unbounded response size**: flag tool handlers that return large result sets (database dumps, full file contents, long API responses) without truncation or pagination -- large responses consume the LLM's context window

### Transport Security and Rate Limiting
<!-- activation: keywords=["transport", "stdio", "sse", "http", "streamable", "auth", "token", "TLS", "rate_limit", "throttle"] -->

- [ ] **Network transport without authentication**: flag MCP servers exposed over HTTP/SSE without authentication (API key, OAuth, mTLS) -- unauthenticated MCP servers allow any client to invoke tools
- [ ] **No TLS on network transport**: flag MCP servers communicating over plain HTTP without TLS -- tool inputs and outputs may contain sensitive data
- [ ] **No rate limiting**: flag MCP servers with no rate limiting on tool calls per client -- a runaway agent loop can overwhelm the server with tool calls (see `ai-llm-agent-design`)

## Common False Positives

- **stdio transport for local use**: MCP servers communicating over stdio (local process) do not need TLS or network authentication. Do not flag transport security for stdio-only servers.
- **Development and testing servers**: local development MCP servers without rate limiting are acceptable. Flag only when the server is deployed to shared or production environments.
- **Simple tools with minimal input**: tools taking a single string argument (e.g., search query) may not need a complex schema. Still flag if the input is used in security-sensitive operations.

## Severity Guidance

| Finding | Severity |
|---|---|
| Network MCP server without authentication | Critical |
| Tool handler executing code with unvalidated input | Critical |
| Tool with no input schema defined | Important |
| No rate limiting on network-exposed MCP server | Important |
| God tool doing multiple unrelated operations | Important |
| Raw error/stack trace returned to LLM | Minor |
| Missing or vague tool description | Minor |
| No tool versioning strategy | Minor |

## See Also

- `ai-llm-tool-use-safety` -- safety controls for tool execution regardless of protocol
- `ai-llm-prompt-injection-defense` -- tool inputs may carry injected instructions
- `ai-llm-agent-design` -- MCP tools are invoked within agent loops
- `sec-owasp-a03-injection` -- tool inputs are an injection vector
- `principle-fail-fast` -- validate tool inputs at the boundary

## Authoritative References

- [Model Context Protocol Specification](https://modelcontextprotocol.io/specification/)
- [MCP Documentation -- Building Servers](https://modelcontextprotocol.io/docs/concepts/servers)
- [Anthropic, "MCP" overview](https://docs.anthropic.com/en/docs/agents-and-tools/mcp)
